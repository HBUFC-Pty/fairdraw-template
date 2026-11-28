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

import Link from 'next/link';
import { useEffect, useState, useSyncExternalStore } from 'react';
import { Countdown } from '../Countdown';

const POLL_MS = 5000;
const GIVE_UP_MS = 30 * 60_000;

function subscribe(onTick: () => void) {
  const t = setInterval(onTick, 1000);
  return () => clearInterval(t);
}
const nowMs = () => Math.floor(Date.now() / 1000) * 1000;
const onServer = () => null;

/**
 * The draw, live, on a closed competition's page. It only watches: it counts down to the advertised draw time, then
 * waits for the committed drand round and reads the public draw record (/draws/[slug]/record.json) until the worker
 * has made the draw, shows the winning tickets and reloads the page into the full result. It cannot start, speed up
 * or change a draw: those happen only in the worker, once the round exists (src/lib/draw/service.ts). Without
 * JavaScript the commitment text above it says the same thing and a reload shows the result.
 */
export function LiveDraw({ slug, drawAt, round, fallback }: { slug: string; drawAt: string; round: number; fallback: string }) {
  const now = useSyncExternalStore(subscribe, nowMs, onServer);
  const due = now !== null && now >= new Date(drawAt).getTime();
  const [winning, setWinning] = useState<number[] | null>(null);
  const [gaveUp, setGaveUp] = useState(false);

  useEffect(() => {
    if (!due || winning) return;
    let stop = false;
    const started = Date.now();
    let timer: ReturnType<typeof setTimeout> | undefined;
    const poll = async () => {
      try {
        const res = await fetch(`/draws/${slug}/record.json`, { cache: 'no-store' });
        if (res.ok) {
          const record = (await res.json()) as { winning_tickets?: unknown };
          const w = Array.isArray(record.winning_tickets) ? record.winning_tickets.filter((n): n is number => Number.isInteger(n)) : [];
          if (!stop) {
            setWinning(w);
            // Let the reveal be seen, then show the full result (names with consent, both times, verify button).
            timer = setTimeout(() => window.location.reload(), 6000);
          }
          return;
        }
      } catch {
        // A network blip: try again on the next tick.
      }
      if (stop) return;
      if (Date.now() - started > GIVE_UP_MS) setGaveUp(true);
      else timer = setTimeout(poll, POLL_MS);
    };
    void poll();
    return () => {
      stop = true;
      if (timer) clearTimeout(timer);
    };
  }, [due, winning, slug]);

  if (winning) {
    return (
      <div className="live-draw is-drawn" aria-live="polite">
        <p className="micro-label">Drawn with drand round {round}</p>
        {winning.length ? (
          <p className="win-tickets num live-reveal">
            <span className="sr-only">Winning ticket{winning.length === 1 ? '' : 's'}: </span>
            {winning.join(', ')}
          </p>
        ) : (
          <p className="win-none live-reveal">No entries, so no winner</p>
        )}
        <p><Link href={`/draws/${slug}`}>Verify this draw</Link></p>
      </div>
    );
  }
  if (!due) {
    return (
      <div className="live-draw">
        <p className="micro-label">Draw in</p>
        <Countdown to={drawAt} label="Draw in" variant="segments" fallback={fallback} />
      </div>
    );
  }
  return (
    <div className="live-draw is-waiting" aria-live="polite">
      <p className="micro-label"><span className="live-dot" aria-hidden="true" />Drawing now</p>
      <p>
        {gaveUp
          ? 'The draw is taking longer than usual. It still uses the same committed round, so the result cannot change: reload this page later.'
          : `Waiting for drand round ${round}. The draw runs as soon as two drand relays agree on its randomness, usually within a minute, and the winning ticket appears here.`}
      </p>
    </div>
  );
}
