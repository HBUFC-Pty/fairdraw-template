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
import { env } from '@/lib/env';

export const metadata = { title: 'Free entry by post' };

export default function FreeEntryPage() {
  const e = env();
  return (
    <article>
      <h1>Free entry by post</h1>
      <p>You can enter any of our competitions for free. A free entry has exactly the same chance of winning as a paid one.</p>
      <ol>
        <li>Write your full name, postal address, email address and phone number on a piece of paper.</li>
        <li>Add the name of the competition, and your answer if it asks a question.</li>
        <li>Post it, with the correct postage, to: <strong>{e.POSTAL_ENTRY_ADDRESS}</strong></li>
        <li>It must arrive before the competition closes. One entry per envelope.</li>
      </ol>
      <p>
        You do not need an account, and you do not need to buy anything. Free entries count towards the same per-person maximum as paid ones. When we record
        your entry it is given a ticket number picked at random from the unsold numbers, and it appears in the public entry list (as a number and a code,
        never your name). If you have an account with the same email address, you will see the ticket in your account.
      </p>
      <p><Link href="/terms">Full terms</Link>.</p>
    </article>
  );
}
