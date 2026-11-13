#!/usr/bin/env bash
# Deploy a committed revision to your server, from your own computer:
#   scripts/deploy.sh <ssh host alias> [git revision, default HEAD]
#   scripts/deploy.sh mysite
#
# Sends `git archive` of the revision over SSH to /usr/local/bin/site-deploy (installed by scripts/server-setup.sh),
# which builds it, runs the migrations, checks the health endpoint and rolls back to the previous image if the new
# release is not healthy. Your SSH key is used through ssh-agent; this script never reads it.
# Windows: run it from Git Bash or WSL.
set -euo pipefail

HOST="${1:-}"
REF="${2:-HEAD}"
[ -n "$HOST" ] || { echo "usage: scripts/deploy.sh <ssh host alias> [git revision]" >&2; exit 2; }
[[ "$HOST" =~ ^[A-Za-z0-9._@-]+$ ]] || { echo "invalid host alias" >&2; exit 2; }
cd "$(git rev-parse --show-toplevel)"

REV=$(git rev-parse --verify "$REF^{commit}")
if [ "$REF" = "HEAD" ] && [ -n "$(git status --porcelain)" ]; then
  echo "Note: you have uncommitted changes. Only committed work is deployed ($REV)." >&2
fi
echo "Checks before deploying..."
pnpm check:dashes >/dev/null
echo "Deploying $REV to $HOST"
git archive --format=tar.gz "$REV" | ssh "$HOST" "site-deploy $REV"
