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
import { verifyEmailAction } from '../actions/auth';

export const metadata = { title: 'Confirm your email' };

/* The link in the email lands here; the confirmation itself is a POST so that link scanners cannot use the token. */
export default async function VerifyEmailPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const token = (await searchParams).token;
  return (
    <>
      <h1>Confirm your email</h1>
      {typeof token === 'string' ? (
        <form action={verifyEmailAction}>
          <input type="hidden" name="token" value={token} />
          <button type="submit">Confirm my email address</button>
        </form>
      ) : (
        <p>This link is incomplete. Open the link from your email again.</p>
      )}
    </>
  );
}
