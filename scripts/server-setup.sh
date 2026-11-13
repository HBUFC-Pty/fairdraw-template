#!/usr/bin/env bash
# First-time server setup for a fresh Ubuntu LTS server. Run ONCE as root (it is safe to run again).
#
# From your own computer (only the PUBLIC key is passed in; the private key never leaves your machine):
#   scp scripts/server-setup.sh root@SERVER_IP:/root/
#   ssh root@SERVER_IP "bash /root/server-setup.sh '$(cat ~/.ssh/mysite_deploy.pub)'"
# Windows PowerShell: the same two lines, with $(Get-Content $HOME\.ssh\mysite_deploy.pub) for the key.
# On Amazon Lightsail, log in as ubuntu and use sudo:  ssh ubuntu@SERVER_IP "sudo bash ..."
# docs/start-here.md walks through this step by step.
#
# What it does:
#   - creates a non-root "deploy" user and installs your public key for it
#   - disables root login and password login over SSH (only after the deploy user has a key)
#   - firewall (ufw): allows SSH, HTTP and HTTPS only
#   - automatic security updates (unattended-upgrades) and fail2ban for SSH
#   - Docker Engine and the Compose plugin from Docker's official apt repository
#   - a 2 GB swap file when the server has less than 4 GB of memory
#   - /srv/site for releases and the server-only .env, and /usr/local/bin/site-deploy (used by scripts/deploy.sh)
#
# Before you close your root session, check in a NEW terminal that `ssh deploy@SERVER_IP` works.
set -euo pipefail

PUBKEY="${1:-}"
DEPLOY_USER=deploy
SITE_DIR=/srv/site

say() { printf '\n==> %s\n' "$*"; }
die() { printf 'ERROR: %s\n' "$*" >&2; exit 1; }

[ "$(id -u)" -eq 0 ] || die "run as root (or with sudo)"
[ -r /etc/os-release ] && . /etc/os-release
[ "${ID:-}" = "ubuntu" ] || die "this script supports Ubuntu LTS only (found ${ID:-unknown})"
case "$PUBKEY" in
  ssh-ed25519\ *|ecdsa-sha2-nistp256\ *|ssh-rsa\ *) ;;
  *) die "pass your PUBLIC key (the contents of the .pub file) as the first argument" ;;
esac
case "$PUBKEY" in *PRIVATE*) die "that looks like a private key. Only ever send the .pub file." ;; esac

export DEBIAN_FRONTEND=noninteractive

say "Updating packages"
apt-get update -y
apt-get upgrade -y
apt-get install -y ca-certificates curl gnupg ufw fail2ban unattended-upgrades git

say "Creating the $DEPLOY_USER user"
if ! id "$DEPLOY_USER" >/dev/null 2>&1; then
  adduser --disabled-password --gecos "" "$DEPLOY_USER"
fi
install -d -m 700 -o "$DEPLOY_USER" -g "$DEPLOY_USER" "/home/$DEPLOY_USER/.ssh"
AUTH="/home/$DEPLOY_USER/.ssh/authorized_keys"
touch "$AUTH"
KEY_BODY=$(printf '%s' "$PUBKEY" | awk '{print $2}')
if ! grep -qF "$KEY_BODY" "$AUTH"; then
  printf '%s\n' "$PUBKEY" >> "$AUTH"
fi
chown "$DEPLOY_USER:$DEPLOY_USER" "$AUTH"
chmod 600 "$AUTH"

say "Hardening SSH (keys only, no root login)"
cat > /etc/ssh/sshd_config.d/10-site-hardening.conf <<'CONF'
PermitRootLogin no
PasswordAuthentication no
KbdInteractiveAuthentication no
PubkeyAuthentication yes
X11Forwarding no
MaxAuthTries 4
CONF
sshd -t
systemctl reload ssh 2>/dev/null || systemctl reload sshd

say "Firewall"
ufw default deny incoming
ufw default allow outgoing
ufw allow OpenSSH
ufw allow 80/tcp
ufw allow 443/tcp
ufw allow 443/udp
ufw --force enable

say "Automatic security updates"
cat > /etc/apt/apt.conf.d/20auto-upgrades <<'CONF'
APT::Periodic::Update-Package-Lists "1";
APT::Periodic::Unattended-Upgrade "1";
APT::Periodic::AutocleanInterval "7";
CONF
systemctl enable --now unattended-upgrades

say "fail2ban for SSH"
cat > /etc/fail2ban/jail.d/sshd.local <<'CONF'
[sshd]
enabled = true
maxretry = 5
findtime = 10m
bantime = 1h
CONF
systemctl enable --now fail2ban
systemctl restart fail2ban

say "Docker Engine from Docker's official repository"
if ! command -v docker >/dev/null 2>&1; then
  install -m 0755 -d /etc/apt/keyrings
  curl -fsSL https://download.docker.com/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc
  chmod a+r /etc/apt/keyrings/docker.asc
  CODENAME="${UBUNTU_CODENAME:-$VERSION_CODENAME}"
  echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/ubuntu $CODENAME stable" \
    > /etc/apt/sources.list.d/docker.list
  apt-get update -y
  apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
fi
systemctl enable --now docker
# Membership of the docker group is equivalent to root on this server. Only the deploy user gets it.
usermod -aG docker "$DEPLOY_USER"

say "Swap"
MEM_KB=$(awk '/MemTotal/ {print $2}' /proc/meminfo)
if [ "$MEM_KB" -lt 4000000 ] && ! swapon --show | grep -q '/swapfile'; then
  if [ ! -f /swapfile ]; then
    fallocate -l 2G /swapfile
    chmod 600 /swapfile
    mkswap /swapfile
  fi
  swapon /swapfile
  grep -q '^/swapfile ' /etc/fstab || echo '/swapfile none swap sw 0 0' >> /etc/fstab
fi

say "Site directories"
install -d -m 755 -o "$DEPLOY_USER" -g "$DEPLOY_USER" "$SITE_DIR" "$SITE_DIR/releases" "$SITE_DIR/backups"
install -d -m 700 -o "$DEPLOY_USER" -g "$DEPLOY_USER" "$SITE_DIR/shared"

say "Installing /usr/local/bin/site-deploy"
cat > /usr/local/bin/site-deploy <<'DEPLOY'
#!/usr/bin/env bash
# Receives a release from scripts/deploy.sh (a tar.gz on stdin), builds it, starts it and checks its health.
# Rolls back to the previous image automatically if the new one is not healthy. Usable as a forced SSH command:
#   command="/usr/local/bin/site-deploy",restrict ssh-ed25519 AAAA... deploy-key
set -euo pipefail
SITE_DIR=/srv/site
ARG="${1:-${SSH_ORIGINAL_COMMAND:-}}"
REV="${ARG##* }"
[[ "$REV" =~ ^[0-9a-f]{12,40}$ ]] || { echo "usage: site-deploy <git commit id> < release.tar.gz" >&2; exit 2; }
[ "$(id -un)" = "deploy" ] || { echo "run as the deploy user" >&2; exit 2; }

REL="$SITE_DIR/releases/$REV"
TMP=$(mktemp -d "$SITE_DIR/releases/.incoming.XXXXXX")
trap 'rm -rf "$TMP"' EXIT
head -c 200000000 | tar -xzf - -C "$TMP"
rm -rf "$REL"
mv "$TMP" "$REL"
trap - EXIT

if [ ! -f "$SITE_DIR/shared/.env" ]; then
  echo "No $SITE_DIR/shared/.env yet. Create it on the server first:"
  echo "  bash $REL/scripts/make-env.sh"
  echo "then run the deploy again."
  exit 3
fi
ln -sfn "$SITE_DIR/shared/.env" "$REL/.env"
cd "$REL"

IMAGE=fairdraw-template-app
HAD_PREVIOUS=no
if docker image inspect "$IMAGE:latest" >/dev/null 2>&1; then
  docker tag "$IMAGE:latest" "$IMAGE:previous"
  HAD_PREVIOUS=yes
fi

if docker compose ps --status running --services 2>/dev/null | grep -qx postgres; then
  STAMP=$(date -u +%Y%m%dT%H%M%SZ)
  echo "==> Backing up the database before deploying ($SITE_DIR/backups/pre-deploy-$STAMP.sql.gz)"
  docker compose exec -T postgres pg_dump -U fairdraw -d fairdraw --no-owner | gzip -9 > "$SITE_DIR/backups/pre-deploy-$STAMP.sql.gz"
  chmod 600 "$SITE_DIR/backups/pre-deploy-$STAMP.sql.gz"
  ls -1t "$SITE_DIR"/backups/pre-deploy-*.sql.gz 2>/dev/null | tail -n +11 | xargs -r rm -f
fi

echo "==> Building $REV"
docker compose build app
echo "==> Starting (migrations run as the app starts)"
docker compose up -d --remove-orphans

healthy() {
  local id status
  for _ in $(seq 1 60); do
    id=$(docker compose ps -q app)
    status=$(docker inspect --format '{{.State.Health.Status}}' "$id" 2>/dev/null || echo starting)
    [ "$status" = healthy ] && return 0
    [ "$status" = unhealthy ] && return 1
    sleep 5
  done
  return 1
}

if healthy; then
  ln -sfn "$REL" "$SITE_DIR/current.new" && mv -T "$SITE_DIR/current.new" "$SITE_DIR/current"
  echo "$REV" > "$SITE_DIR/DEPLOYED"
  ls -1dt "$SITE_DIR"/releases/*/ | tail -n +6 | xargs -r rm -rf
  docker image prune -f >/dev/null
  echo "==> Deployed $REV and healthy"
  exit 0
fi

echo "==> The new release is NOT healthy. Recent app logs:" >&2
docker compose logs --tail 80 app >&2 || true
if [ "$HAD_PREVIOUS" = yes ] && [ -e "$SITE_DIR/current" ]; then
  echo "==> Rolling back to the previous image" >&2
  docker tag "$IMAGE:previous" "$IMAGE:latest"
  cd "$SITE_DIR/current"
  docker compose up -d --no-build --remove-orphans
  echo "Rolled back. If the failed release ran a database migration, see docs/deploy.md (restore the pre-deploy backup)." >&2
fi
exit 1
DEPLOY
chmod 755 /usr/local/bin/site-deploy

say "Done"
echo "Next: in a NEW terminal on your computer, check you can log in as the deploy user:"
echo "  ssh deploy@$(hostname -I | awk '{print $1}')"
echo "Root and password logins are now disabled."
