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
import { requireUser } from '@/lib/web/session';
import { getDb } from '@/lib/db';
import { getLimits, PERIOD_LABEL, spentInPeriod, SPEND_PERIODS } from '@/lib/limits/spend';
import { FlashMessage } from '@/components/Flash';
import { formatPence } from '@/lib/money';
import { formatUk } from '@/lib/time';
import { cancelIncreaseAction, setLimitAction } from '../../actions/account';

export const metadata = { title: 'Spend limits' };

export default async function LimitsPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const s = await requireUser();
  const limits = await getLimits(getDb(), s.user.id);
  const spent = Object.fromEntries(await Promise.all(SPEND_PERIODS.map(async (p) => [p, await spentInPeriod(getDb(), s.user.id, p)] as const)));
  return (
    <>
      <h1>Spend limits</h1>
      <FlashMessage searchParams={await searchParams} />
      <p>
        Set how much you can spend in a rolling day, week and month. Any amount down to £0. Lowering a limit, or setting one, takes effect at once. Raising
        or removing a limit takes effect after 24 hours, and you can cancel it in that time.
      </p>
      {SPEND_PERIODS.map((p) => {
        const l = limits[p];
        return (
          <section className="card" key={p} aria-labelledby={`h-${p}`}>
            <h2 id={`h-${p}`}>{PERIOD_LABEL[p]}</h2>
            <p>
              Current limit: <strong>{l.limitPence === null ? 'none' : formatPence(l.limitPence)}</strong>. Spent in this period: {formatPence(spent[p] ?? 0)}.
            </p>
            {l.pending ? (
              <form action={cancelIncreaseAction}>
                <p className="notice warn">
                  Pending change to {l.pending.limitPence === null ? 'no limit' : formatPence(l.pending.limitPence)}, from {formatUk(l.pending.effectiveAt)}.
                </p>
                <input type="hidden" name="period" value={p} />
                <button type="submit" className="secondary">Cancel this increase</button>
              </form>
            ) : null}
            <form className="stack" action={setLimitAction}>
              <input type="hidden" name="period" value={p} />
              <label>New limit in pounds<span className="hint">Leave blank to remove the limit (takes 24 hours).</span><input name="amount" inputMode="decimal" maxLength={12} /></label>
              <button type="submit">Save</button>
            </form>
          </section>
        );
      })}
    </>
  );
}
