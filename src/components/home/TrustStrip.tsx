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
import Link from 'next/link';
import { Dice, Envelope, ShieldCheck, Clock } from '../icons';

const ITEMS = [
  { href: '/free-entry', label: 'Free entry by post', Icon: Envelope },
  { href: '/fairness', label: 'Drawn on time, whatever sells', Icon: Clock },
  { href: '/fairness', label: 'Public randomness', Icon: Dice },
  { href: '/results', label: 'Check any draw', Icon: ShieldCheck },
] as const;

/** Four short, true promises right under the hero. A row on wide screens, a snap row on phones. */
export function TrustStrip() {
  return (
    <ul className="trust-strip" aria-label="How our draws stay fair">
      {ITEMS.map(({ href, label, Icon }) => (
        <li key={label}>
          <Link href={href}><Icon className="ic-primary" />{label}</Link>
        </li>
      ))}
    </ul>
  );
}
