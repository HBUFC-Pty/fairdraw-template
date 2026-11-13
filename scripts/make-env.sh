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
# Creates or updates the server-only secrets file /srv/site/shared/.env. Run it ON THE SERVER as the deploy user:
#   ssh -t mysite bash /srv/site/releases/<commit>/scripts/make-env.sh            (first time)
#   ssh -t mysite bash /srv/site/current/scripts/make-env.sh set STRIPE_SECRET_KEY (change one value)
#
# You type secrets here yourself; they are never shown on screen, never stored in the repository and never need to be
# given to an AI assistant. Random secrets (APP_SECRET, ENTRY_CODE_SECRET, POSTGRES_PASSWORD) are generated for you.
# Non-secret settings (company details, contact addresses, branding) live in config/site.json instead.
set -euo pipefail
umask 077
ENV_FILE=/srv/site/shared/.env
mkdir -p "$(dirname "$ENV_FILE")"
touch "$ENV_FILE"
chmod 600 "$ENV_FILE"

get() { grep -E "^$1=" "$ENV_FILE" | tail -n 1 | cut -d= -f2- || true; }
put() {
  local key=$1 value=$2 tmp
  tmp=$(mktemp "$ENV_FILE.XXXXXX")
  grep -vE "^$key=" "$ENV_FILE" > "$tmp" || true
  printf '%s=%s\n' "$key" "$value" >> "$tmp"
  mv "$tmp" "$ENV_FILE"
  chmod 600 "$ENV_FILE"
}
ask() { # ask KEY "question" [secret]
  local key=$1 q=$2 secret=${3:-} value
  if [ -n "$secret" ]; then read -r -s -p "$q: " value; echo; else read -r -p "$q: " value; fi
  [ -n "$value" ] && put "$key" "$value"
}
random() { openssl rand -hex 32; }

if [ "${1:-}" = "set" ] && [ -n "${2:-}" ]; then
  [[ "$2" =~ ^[A-Z0-9_]+$ ]] || { echo "invalid variable name" >&2; exit 2; }
  ask "$2" "New value for $2 (hidden)" secret
  echo "Saved. Restart to apply: cd /srv/site/current && docker compose up -d"
  exit 0
fi

for k in APP_SECRET ENTRY_CODE_SECRET POSTGRES_PASSWORD; do
  [ -n "$(get "$k")" ] || put "$k" "$(random)"
done

echo "Answer each question; press Enter to keep the current value."
[ -n "$(get SITE_DOMAIN)" ] || ask SITE_DOMAIN "Your domain, for example competitions.example.co.uk"
DOMAIN=$(get SITE_DOMAIN)
[ -n "$DOMAIN" ] && { [ -n "$(get APP_URL)" ] || put APP_URL "https://$DOMAIN"; }
[ -n "$(get ACME_EMAIL)" ] || ask ACME_EMAIL "Email for TLS certificate notices"
[ -n "$(get PAYMENT_PROVIDER)" ] || put PAYMENT_PROVIDER stripe
[ -n "$(get STRIPE_SECRET_KEY)" ] || ask STRIPE_SECRET_KEY "Stripe secret key (use sk_test_ until launch) (hidden)" secret
[ -n "$(get STRIPE_WEBHOOK_SECRET)" ] || ask STRIPE_WEBHOOK_SECRET "Stripe webhook signing secret, whsec_... (hidden)" secret
[ -n "$(get SMTP_HOST)" ] || ask SMTP_HOST "SMTP server host from your email provider"
[ -n "$(get SMTP_PORT)" ] || ask SMTP_PORT "SMTP port (usually 587)"
[ -n "$(get SMTP_USER)" ] || ask SMTP_USER "SMTP user name"
[ -n "$(get SMTP_PASSWORD)" ] || ask SMTP_PASSWORD "SMTP password or API token (hidden)" secret

echo
echo "Saved $ENV_FILE (readable only by you). Variables set:"
cut -d= -f1 "$ENV_FILE" | sort | tr '\n' ' '
echo
