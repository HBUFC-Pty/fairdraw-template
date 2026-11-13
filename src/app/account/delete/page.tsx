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
import { FlashMessage } from '@/components/Flash';
import { DELETION_RETAINED } from '@/lib/account/service';
import { deleteAccountAction } from '../../actions/account';

export const metadata = { title: 'Delete your account' };

export default async function DeletePage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  await requireUser();
  return (
    <>
      <h1>Delete your account</h1>
      <FlashMessage searchParams={await searchParams} />
      <p>
        This erases your name, email address, date of birth, password, limits and sessions, and logs you out. It cannot be undone. Any tickets you hold in
        competitions that have not been drawn yet stay in those draws, but we will have no way to contact you if you win.
      </p>
      <h2>What we have to keep, and why</h2>
      <ul>{DELETION_RETAINED.map((r) => <li key={r}>{r}</li>)}</ul>
      <form className="stack" action={deleteAccountAction}>
        <label>Your password<input name="password" type="password" autoComplete="current-password" required maxLength={256} /></label>
        <label><input type="checkbox" name="confirm" value="yes" required /> I understand my account will be deleted permanently</label>
        <button type="submit" className="danger">Delete my account</button>
      </form>
    </>
  );
}
