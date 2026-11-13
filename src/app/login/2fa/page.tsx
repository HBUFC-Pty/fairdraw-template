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
import { FlashMessage } from '@/components/Flash';
import { requirePasswordSession } from '@/lib/web/session';
import { redirect } from 'next/navigation';
import { totpLoginAction } from '../../actions/auth';

export const metadata = { title: 'Two-factor code' };

export default async function TotpPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const s = await requirePasswordSession();
  if (!s.user.totpEnabledAt) redirect('/account/security');
  return (
    <>
      <h1>Enter your code</h1>
      <FlashMessage searchParams={await searchParams} />
      <form className="stack" action={totpLoginAction}>
        <label>
          6-digit code from your authenticator app
          <input name="code" inputMode="numeric" pattern="[0-9]{6}" autoComplete="one-time-code" required maxLength={6} />
        </label>
        <button type="submit">Continue</button>
      </form>
    </>
  );
}
