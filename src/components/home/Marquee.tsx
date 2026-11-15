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
import { Pause, Play } from '../icons';

/**
 * A strip that scrolls sideways on its own (brands with extras.motion, four or more items). The list is in the track
 * twice so it loops; the second copy is hidden from assistive technology and inert. It pauses on hover, on focus inside
 * and with the visible pause button. With reduced motion it is a still row that scrolls by hand (motion.css).
 */
export function Marquee({ label, moving, count, children }: { label: string; moving: boolean; count: number; children: React.ReactNode }) {
  const [paused, setPaused] = useState(false);
  const speed = `mq-n${Math.min(20, Math.max(7, count))}`;
  return (
    <div className={['marquee', moving ? `is-moving ${speed}` : '', paused ? 'is-paused' : ''].filter(Boolean).join(' ')}>
      <div className="mq-viewport" tabIndex={moving ? undefined : 0} role="region" aria-label={`${label}, list`}>
        <div className="mq-track">
          <ul className="mq-list">{children}</ul>
          {moving ? <ul className="mq-list mq-copy" aria-hidden="true" inert>{children}</ul> : null}
        </div>
      </div>
      {moving ? (
        <button type="button" className="icon-btn mq-pause" onClick={() => setPaused((p) => !p)} aria-label={paused ? 'Play recent winners' : 'Pause recent winners'}>
          {paused ? <Play /> : <Pause />}
        </button>
      ) : null}
    </div>
  );
}
