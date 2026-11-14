#!/usr/bin/env bash
# The contents of this file are subject to the Common Public Attribution License Version 1.0 (the “License”); you may
# not use this file except in compliance with the License. You may obtain a copy of the License at
# https://opensource.org/license/CPAL-1.0. The License is based on the Mozilla Public License Version 1.1 but Sections
# 14 and 15 have been added to cover use of software over a computer network and provide for limited attribution for
# the Original Developer. In addition, Exhibit A has been modified to be consistent with Exhibit B.
# Software distributed under the License is distributed on an “AS IS” basis, WITHOUT WARRANTY OF ANY KIND, either
# express or implied. See the License for the specific language governing rights and limitations under the License.
# The Original Code is FairDraw operator template.
# The Initial Developer of the Original Code is Harrison Jones. All portions of the code written by Harrison Jones are
# Copyright (c) 2026 Harrison Jones. All Rights Reserved.
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
# shellcheck disable=SC2029 # $REV is meant to expand here, on this computer
git archive --format=tar.gz "$REV" | ssh "$HOST" "site-deploy $REV"
