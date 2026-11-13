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
import { resetPasswordAction } from '../actions/auth';

export const metadata = { title: 'Choose a new password' };

export default async function ResetPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const sp = await searchParams;
  const token = typeof sp.token === 'string' ? sp.token : '';
  return (
    <>
      <h1>Choose a new password</h1>
      <FlashMessage searchParams={sp} />
      <form className="stack" action={resetPasswordAction}>
        <input type="hidden" name="token" value={token} />
        <label>New password<span className="hint">At least 12 characters.</span><input name="password" type="password" autoComplete="new-password" required minLength={12} maxLength={256} /></label>
        <label>Confirm new password<input name="confirm" type="password" autoComplete="new-password" required minLength={12} maxLength={256} /></label>
        <button type="submit">Change password</button>
      </form>
    </>
  );
}
