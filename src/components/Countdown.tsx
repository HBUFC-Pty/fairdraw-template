/*
 * The contents of this file are subject to the Common Public Attribution License Version 1.0 (the “License”); you may
 * not use this file except in compliance with the License. You may obtain a copy of the License at
 * https://opensource.org/license/CPAL-1.0. The License is based on the Mozilla Public License Version 1.1 but Sections
 * 14 and 15 have been added to cover use of software over a computer network and provide for limited attribution for
 * the Original Developer. In addition, Exhibit A has been modified to be consistent with Exhibit B.
 * Software distributed under the License is distributed on an “AS IS” basis, WITHOUT WARRANTY OF ANY KIND, either
 * express or implied. See the License for the specific language governing rights and limitations under the License.
 * The Original Code is FairDraw operator template.
 * The Initial Developer of the Original Code is Harrison Jones. All portions of the code written by Harrison Jones are
 * Copyright (c) 2026 Harrison Jones. All Rights Reserved.
 */
'use client';

import { useSyncExternalStore } from 'react';

function two(n: number) {
  return String(n).padStart(2, '0');
}

// One tick a second. The snapshot is the current whole second, so it stays the same between ticks.
function subscribe(onTick: () => void) {
  const t = setInterval(onTick, 1000);
  return () => clearInterval(t);
}
const nowSeconds = () => Math.floor(Date.now() / 1000);
const onServer = () => null;

/**
 * A live countdown to a real time (the close or the draw), for brands with extras.countdown. Renders nothing on the
 * server and in the first browser render, so they agree; the card already shows the time in words.
 */
export function Countdown({ to, label }: { to: string; label: string }) {
  const now = useSyncExternalStore(subscribe, nowSeconds, onServer);
  const target = Math.floor(new Date(to).getTime() / 1000);
  if (now === null || now >= target) return null;
  const s = target - now;
  const d = Math.floor(s / 86400);
  return (
    <p className="countdown" role="timer" aria-live="off">
      <span className="countdown-label">{label}</span>{' '}
      <span className="num">{d > 0 ? `${d}d ` : ''}{two(Math.floor((s % 86400) / 3600))}:{two(Math.floor((s % 3600) / 60))}:{two(s % 60)}</span>
    </p>
  );
}
