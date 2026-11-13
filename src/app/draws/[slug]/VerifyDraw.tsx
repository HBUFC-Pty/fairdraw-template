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
