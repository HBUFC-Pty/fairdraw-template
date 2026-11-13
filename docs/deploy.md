# Deploying to a UK VPS

This guide runs the site on one Linux server with Docker Compose: the app, a worker for scheduled closes, draws,
refunds and retention, PostgreSQL 16 with a persistent volume, and Caddy for automatic HTTPS.

> **Test on a staging server first.** The Docker, Compose and Caddy files have been checked for syntax but have not
> been run end to end by the template's authors. Do a full rehearsal (sign-up, payment in test mode, close, draw,
> backup and restore) on a staging server before taking real entries.

Commands assume Ubuntu or Debian. Replace `example.co.uk` with your domain.

## 1. Choose a server

- Pick a provider with a **UK or EU region** and put the server there, so personal data stays in the UK or EEA (record
  this in your privacy notice and ROPA). Sign the provider's data processing agreement.
- 2 vCPU, 4 GB RAM and 40 GB disk is plenty to start.
- Turn on the provider's snapshots if offered (in addition to the backups below, not instead).

## 2. DNS

Create an `A` record (and `AAAA` if the server has IPv6) for `example.co.uk` and `www.example.co.uk` pointing at the
server. Wait for it to resolve before starting Caddy, or certificate issuance will fail.

## 3. First login: a non-root user

```sh
ssh root@SERVER_IP
adduser deploy
usermod -aG sudo deploy
mkdir -p /home/deploy/.ssh && cp ~/.ssh/authorized_keys /home/deploy/.ssh/
chown -R deploy:deploy /home/deploy/.ssh && chmod 700 /home/deploy/.ssh && chmod 600 /home/deploy/.ssh/authorized_keys
```

Log in as `deploy` in a new terminal and check `sudo` works before continuing.

## 4. Harden SSH

Create `/etc/ssh/sshd_config.d/10-hardening.conf`:

```
PermitRootLogin no
PasswordAuthentication no
KbdInteractiveAuthentication no
PubkeyAuthentication yes
```

Then `sudo sshd -t && sudo systemctl reload ssh`. Keep your current session open until you have tested a new login.

## 5. Firewall

```sh
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow 22/tcp
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw allow 443/udp   # HTTP/3
sudo ufw enable
```

Note: Docker publishes ports by writing its own iptables rules, which bypass ufw. The Compose file publishes only
Caddy's ports 80 and 443; Postgres and the app are not published. Keep it that way.

## 6. Automatic security updates

```sh
sudo apt update && sudo apt install -y unattended-upgrades
sudo dpkg-reconfigure -plow unattended-upgrades
```

Reboot when `/var/run/reboot-required` exists (check weekly, or enable automatic reboots at a quiet time in
`/etc/apt/apt.conf.d/50unattended-upgrades`).

## 7. Install Docker

Install Docker Engine and the Compose plugin from Docker's official apt repository, following
https://docs.docker.com/engine/install/ for your distribution. Then `sudo usermod -aG docker deploy` and log in again.

## 8. Get the code and configure

```sh
git clone https://github.com/YOUR-ORG/YOUR-SITE.git site && cd site
cp .env.example .env
chmod 600 .env
```

Fill in every value in `.env` (each is documented in the file). Generate each secret separately:

```sh
openssl rand -hex 32
```

Use different values for `APP_SECRET`, `ENTRY_CODE_SECRET` and the database password. Set `APP_URL` to
`https://example.co.uk`, your company details exactly as at Companies House, `PAYMENT_PROCESSOR_NAME`, the postal
entry address and your SMTP provider. `PAYMENT_PROVIDER=test` is refused in production.

Keep a copy of `.env` in your password manager. Losing `APP_SECRET` disables everyone's two-factor login; losing
`ENTRY_CODE_SECRET` changes every entry code.

## 9. Start

```sh
docker compose up -d --build
docker compose ps
docker compose logs -f app
```

- The app container runs the database migrations (`dist/migrate.mjs`) every time it starts, before serving.
- The `worker` service runs the scheduled jobs: expiring unpaid orders, closing competitions and publishing
  commitments, making draws at the advertised time, sending refunds, and the daily retention job.
- Caddy obtains and renews TLS certificates automatically. Visit `https://example.co.uk` to check.

## 10. Create the first owner and turn on 2FA

Sign up on the website with your own email address and click the confirmation link in the email. Then make that
account the owner:

```sh
docker compose exec app node dist/create-owner.mjs you@example.co.uk
```

Log in again. Staff accounts must set up two-factor authentication (TOTP) before the admin area opens. Store the
authenticator on a phone you control, and make a second account an owner too (Admin, Staff and roles) so you are not
locked out.

## 11. Backups (encrypted, nightly, off-site)

Create `/home/deploy/backup.sh` (uses [age](https://github.com/FiloSottile/age) for encryption; `gpg --symmetric`
works too):

```sh
#!/bin/sh
set -eu
cd /home/deploy/site
STAMP=$(date -u +%Y%m%dT%H%M%SZ)
OUT=/home/deploy/backups/fairdraw-$STAMP.sql.gz.age
mkdir -p /home/deploy/backups
docker compose exec -T postgres pg_dump -U fairdraw -d fairdraw --format=plain --no-owner \
  | gzip -9 \
  | age -r "$(cat /home/deploy/backup-recipient.txt)" > "$OUT"
# Copy off-site (any S3-compatible store or another server in the UK or EU), then prune local copies.
rclone copy "$OUT" offsite:fairdraw-backups/
find /home/deploy/backups -name 'fairdraw-*.age' -mtime +30 -delete
```

Generate the key pair on your own computer (`age-keygen -o backup-key.txt`), put only the public recipient on the
server in `backup-recipient.txt`, and keep the private key offline. Configure the off-site store to delete objects after
30 days. Run nightly with cron (`crontab -e`):

```
15 2 * * * /home/deploy/backup.sh >> /home/deploy/backup.log 2>&1
```

**Take a backup before every update** by running the script by hand.

### Monthly restore test

A backup you have not restored is not a backup. Once a month, on your own computer or a spare server:

```sh
age -d -i backup-key.txt fairdraw-YYYYMMDDTHHMMSSZ.sql.gz.age | gunzip > restore.sql
docker run -d --name restore-test -e POSTGRES_PASSWORD=test postgres:16
sleep 5
docker exec -i restore-test psql -U postgres -c 'CREATE DATABASE fairdraw'
docker exec -i restore-test psql -U postgres -d fairdraw -v ON_ERROR_STOP=1 < restore.sql
docker exec -i restore-test psql -U postgres -d fairdraw -c 'SELECT count(*) FROM draws; SELECT max(id) FROM audit_log;'
docker rm -f restore-test && rm restore.sql
```

Record the date, the backup used and the counts. Delete the restored data afterwards: it contains personal data.

## 12. Logs

- Container logs use Docker's `json-file` driver with rotation set in `docker-compose.yml` (`max-size` and
  `max-file`), so they cannot fill the disk. Adjust to keep roughly [30] days.
- System logs: set `SystemMaxUse=500M` and `MaxRetentionSec=30day` in `/etc/systemd/journald.conf`, then
  `sudo systemctl restart systemd-journald`.
- Logs contain IP addresses and can contain emails in errors: keep them only as long as your privacy notice says.

## 13. Monitoring

`GET /api/health` returns 200 when the app can reach the database (Docker's own healthcheck uses this).
`GET /api/health?worker=1` also returns 503 when the scheduled worker has not run in the last 5 minutes. Point an
uptime monitor at `https://example.co.uk/api/health?worker=1` and alert yourself by email or SMS. A stopped worker
means competitions do not close or draw on time.

## 14. Updating

```sh
cd ~/site
/home/deploy/backup.sh              # always back up first
git fetch --tags && git checkout vX.Y.Z   # or git pull on your release branch
docker compose build
docker compose up -d
docker compose logs -f app          # watch the migrations and start-up
```

Check the release notes for new `.env` variables first.

## 15. Rolling back

```sh
git checkout vPREVIOUS
docker compose build && docker compose up -d
```

Database migrations only go forward. If the release you are undoing ran a migration that the old code cannot work
with, restore the backup you took before updating (stop `app` and `worker`, restore into the `postgres` service, start
again). Never edit migration files that have already run.

## 16. Development only: Mailpit

`docker compose --profile dev up` adds Mailpit, which catches all outgoing email at http://localhost:8025. Set
`SMTP_HOST=mailpit`, `SMTP_PORT=1025` and `SMTP_REQUIRE_TLS=false` while using it. Never run the dev profile in
production. For working on the code with `pnpm dev`, see the quickstart in README.md, which also uses
`docker-compose.dev.yml` to publish Postgres on 127.0.0.1 only.
