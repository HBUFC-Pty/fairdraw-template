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
#
# Calls a serverless site's scheduled work (POST /api/cron/tick) only when something is due: a close, a draw, an
# unpaid order expiring, or every 6 hours anyway (sell-outs, payment retries, the nightly retention job). Between
# events the database is left alone, so a free plan that sleeps when idle (Neon Free) stays within its compute hours.
# A caller that ticks every 5 minutes, such as .github/workflows/tick.yml, keeps such a database awake all month.
#
# Run it every 5 minutes from cron on any always-on Linux machine. Keep the settings in a private file:
#
#   install -m 600 /dev/null ~/.config/my-site-tick.env    # then add two lines:
#   TICK_URL=https://competitions.example.co.uk
#   CRON_SECRET=<the same value as the site's CRON_SECRET>
#
#   crontab -e
#   */5 * * * * TICK_ENV=$HOME/.config/my-site-tick.env /path/to/scripts/tick.sh >> $HOME/.cache/my-site-tick.log 2>&1
#
# Needs bash, curl and GNU date. The secret is sent on standard input, never on the command line.
set -euo pipefail

: "${TICK_ENV:?set TICK_ENV to the private settings file}"
# shellcheck disable=SC1090
. "$TICK_ENV"
: "${TICK_URL:?TICK_URL missing from $TICK_ENV}"
: "${CRON_SECRET:?CRON_SECRET missing from $TICK_ENV}"
STATE="${TICK_STATE:-${TICK_ENV%.env}.state}"
HEARTBEAT=$((6 * 3600))

now=$(date +%s)
next=0
last=0
if [ -f "$STATE" ]; then read -r next last < "$STATE" || true; fi
if [ "$now" -lt "${next:-0}" ] && [ $((now - ${last:-0})) -lt "$HEARTBEAT" ]; then exit 0; fi

if ! resp=$(printf 'Authorization: Bearer %s\n' "$CRON_SECRET" | curl -fsS --max-time 70 -X POST -H @- "$TICK_URL/api/cron/tick"); then
  echo "$(date -u +%FT%TZ) tick failed; retrying on the next run"
  exit 1
fi

due=$(printf '%s' "$resp" | sed -n 's/.*"next_due_at":"\([^"]*\)".*/\1/p')
ran=$(printf '%s' "$resp" | sed -n 's/.*"ran":\(true\|false\).*/\1/p')
if [ "$ran" = "false" ]; then
  next=$now # another cycle held the lock: try again on the next run
elif [ -n "$due" ]; then
  next=$(date -d "$due" +%s)
else
  next=$((now + HEARTBEAT))
fi
printf '%s %s\n' "$next" "$now" > "$STATE"
echo "$(date -u +%FT%TZ) ran=$ran next_due=${due:-none}"
