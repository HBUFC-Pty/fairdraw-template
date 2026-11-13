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

import { useState } from 'react';
import { fairdrawEntriesHash, fairdrawVerify, FAIRDRAW_DRAND_CHAIN, type FairdrawRecord } from '@/lib/fairdraw/draw';

type Step = { label: string; ok: boolean | null; detail?: string };

export function VerifyDraw({ slug, relays }: { slug: string; relays: string[] }) {
  const [steps, setSteps] = useState<Step[]>([]);
  const [running, setRunning] = useState(false);

  async function run() {
    setRunning(true);
    const out: Step[] = [];
    const push = (s: Step) => {
      out.push(s);
      setSteps([...out]);
    };
    try {
      const record = (await (await fetch(`/draws/${slug}/record.json`, { cache: 'no-store' })).json()) as FairdrawRecord;
      const text = await (await fetch(`/draws/${slug}/tickets.txt`, { cache: 'no-store' })).text();
      const tickets = text.split(/[\s,]+/).filter(Boolean).map(Number);
      push({ label: `Downloaded the record and ${tickets.length} tickets`, ok: true });
      const hash = await fairdrawEntriesHash(tickets);
      push({ label: 'Ticket list matches the fingerprint published at the close', ok: hash === record.entries_hash, detail: hash });
      push({ label: 'Record uses the drand quicknet chain', ok: record.drand_chain === FAIRDRAW_DRAND_CHAIN });
      const answers: string[] = [];
      for (const relay of relays) {
        try {
          const b = (await (await fetch(`${relay.replace(/\/$/, '')}/${FAIRDRAW_DRAND_CHAIN}/public/${record.drand_round}`)).json()) as { randomness?: string };
          if (b.randomness) answers.push(b.randomness);
          push({ label: `drand relay ${new URL(relay).host} gives round ${record.drand_round}`, ok: b.randomness === record.randomness, detail: b.randomness });
        } catch {
          push({ label: `drand relay ${new URL(relay).host} did not answer`, ok: null });
        }
      }
      const beacon = answers.length ? answers[0]! : null;
      const result = await fairdrawVerify(record, tickets, beacon);
      push({
        label: result.ok ? `Re-run gives the same winners: ${result.winners.join(', ') || 'none'}` : `Problem: ${result.problems.join('; ')}`,
        ok: result.ok && answers.length > 0,
      });
    } catch (e) {
      push({ label: `Could not complete the check: ${(e as Error).message}`, ok: false });
    }
    setRunning(false);
  }

  return (
    <section aria-live="polite">
      <button type="button" onClick={run} disabled={running}>{running ? 'Checking...' : 'Verify this draw now'}</button>
      <ol>
        {steps.map((s, i) => (
          <li key={i}>
            <span className={s.ok === true ? 'verify-ok' : s.ok === false ? 'verify-bad' : 'muted'}>{s.ok === true ? 'OK' : s.ok === false ? 'FAILED' : 'SKIPPED'}</span>{' '}
            {s.label}
            {s.detail ? <><br /><code>{s.detail}</code></> : null}
          </li>
        ))}
      </ol>
    </section>
  );
}
