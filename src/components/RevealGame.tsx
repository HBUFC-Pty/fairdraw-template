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
import { Confetti } from './Confetti';

type Props = { style: 'scratch' | 'spin' | 'coin'; ticket: number; competition: string; prize: string | null };

const ACTION = { scratch: 'Scratch to reveal', spin: 'Spin the wheel', coin: 'Drop the coin' } as const;

/**
 * Reveals whether a ticket the player has already bought won an instant prize. The result was fixed when the ticket was
 * entered (src/lib/competitions/instant.ts): the scratch card, wheel or coin only shows it. It is never a separate game.
 */
export function RevealGame({ style, ticket, competition, prize }: Props) {
  const [stage, setStage] = useState<'ready' | 'playing' | 'done'>('ready');
  const won = prize !== null;
  const finish = () => setStage('done');
  return (
    <div className={`reveal reveal-${style} ${stage} ${won ? 'is-win' : 'is-lose'}`}>
      <p className="reveal-ticket">
        Ticket <strong className="num">{ticket}</strong> <span className="muted">in {competition}</span>
      </p>
      <div className="reveal-stage" aria-hidden="true">
        {style === 'scratch' ? (
          <div className="scratch-card">
            <span className="scratch-under">{won ? 'WIN' : 'NO WIN'}</span>
            <span className="scratch-foil" onAnimationEnd={finish} />
          </div>
        ) : null}
        {style === 'spin' ? (
          <div className="wheel-wrap">
            <span className="wheel-pointer" />
            <svg className="wheel" viewBox="-100 -100 200 200" onAnimationEnd={finish}>
              {Array.from({ length: 8 }, (_, i) => (
                <path key={i} className={i % 2 === 0 ? 'seg-win' : 'seg-try'} d={`M0 0 L${Math.sin(((i - 0.5) * Math.PI) / 4) * 95} ${-Math.cos(((i - 0.5) * Math.PI) / 4) * 95} A95 95 0 0 1 ${Math.sin(((i + 0.5) * Math.PI) / 4) * 95} ${-Math.cos(((i + 0.5) * Math.PI) / 4) * 95} Z`} />
              ))}
              {Array.from({ length: 8 }, (_, i) => (
                <text key={`t${i}`} className="seg-label" transform={`rotate(${i * 45}) translate(0 -62)`} textAnchor="middle">{i % 2 === 0 ? 'WIN' : 'TRY'}</text>
              ))}
              <circle r="14" className="wheel-hub" />
            </svg>
          </div>
        ) : null}
        {style === 'coin' ? (
          <div className="coin-box">
            <span className="coin" onAnimationEnd={finish} />
            <span className="coin-slot" />
          </div>
        ) : null}
      </div>
      {stage === 'ready' ? (
        <button type="button" onClick={() => setStage('playing')}>{ACTION[style]}</button>
      ) : null}
      <p className="reveal-result" aria-live="polite">
        {stage === 'done' ? (won ? <><strong>You won {prize}!</strong> It is in your account.</> : <>No instant prize on this ticket. It is still in the main draw.</>) : null}
      </p>
      {stage === 'playing' ? (
        <button type="button" className="secondary reveal-skip" onClick={finish}>Show the result now</button>
      ) : null}
      {stage === 'done' && won ? <Confetti /> : null}
    </div>
  );
}
