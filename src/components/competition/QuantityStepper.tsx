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

import { useState, type ReactNode } from 'react';
import { priceFor } from '@/lib/competitions/bundles';
import type { TicketBundle } from '@/lib/db/schema';

type Props = { cap: number; unitPence: number; bundles: readonly TicketBundle[]; points: boolean; note?: string; children?: ReactNode };

function formatTotal(pence: number, points: boolean): string {
  if (points) return `${new Intl.NumberFormat('en-GB').format(pence)} ${pence === 1 ? 'point' : 'points'}`;
  return new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP' }).format(pence / 100);
}

/**
 * The number of tickets: a plain number input (name "quantity", min 1, max the per-person cap) that works with
 * JavaScript off, with minus and plus buttons and the live total once the page is running. The total uses the same
 * bundle maths as checkout (priceFor), so it never differs from what the basket charges. `children` (the submit button)
 * sits on the same row.
 */
export function QuantityStepper({ cap, unitPence, bundles, points, note, children }: Props) {
  const [value, setValue] = useState('1');
  const n = Number(value);
  const valid = value !== '' && Number.isInteger(n) && n >= 1 && n <= cap;
  const step = (by: number) => setValue(String(Math.min(cap, Math.max(1, (Number.isInteger(n) ? n : 1) + by))));
  return (
    <div className="stepper-field">
      <div className="stepper-head">
        <label className="micro-label" htmlFor="qty">Tickets</label>
        <p className="step-total num" aria-live="polite">
          {valid ? <><span className="micro-label">Total</span> {formatTotal(priceFor(n, unitPence, bundles), points)}</> : null}
        </p>
      </div>
      <div className="stepper-row">
        <div className="stepper">
          <button type="button" className="step-btn bare" aria-label="One ticket fewer" aria-controls="qty" disabled={valid ? n <= 1 : false} onClick={() => step(-1)}>
            <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" focusable="false"><path d="M6 12h12" /></svg>
          </button>
          <input
            id="qty"
            className="step-input num"
            name="quantity"
            type="number"
            inputMode="numeric"
            min={1}
            max={cap}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            aria-describedby="qty-hint"
            required
          />
          <button type="button" className="step-btn bare" aria-label="One ticket more" aria-controls="qty" disabled={valid ? n >= cap : false} onClick={() => step(1)}>
            <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" focusable="false"><path d="M6 12h12M12 6v12" /></svg>
          </button>
        </div>
        {children}
      </div>
      <p className="micro-hint" id="qty-hint">Up to {cap.toLocaleString('en-GB')} per person, free entries included.{note ? ` ${note}` : ''}</p>
    </div>
  );
}
