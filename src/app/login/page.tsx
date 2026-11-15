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
import { FlashMessage } from '@/components/Flash';
import { loginAction, resendVerificationAction } from '../actions/auth';
import { AuthArt } from '@/components/AuthArt';

export const metadata = { title: 'Log in' };

export default async function LoginPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const sp = await searchParams;
  return (
    <div className="auth-page">
      <AuthArt />
      <div className="auth-panel">
        <h1>Log in</h1>
        <FlashMessage searchParams={sp} />
        <form className="stack" action={loginAction}>
          <label>Email<input name="email" type="email" autoComplete="email" required maxLength={254} /></label>
          <label>Password<input name="password" type="password" autoComplete="current-password" required maxLength={256} /></label>
          <button type="submit">Log in</button>
        </form>
        <p className="auth-alt"><Link href="/forgot-password">Forgotten your password?</Link> · <Link href="/signup">Sign up</Link></p>
        {sp.resend ? (
          <form className="stack" action={resendVerificationAction}>
            <label>Send a new confirmation link to<input name="email" type="email" required maxLength={254} /></label>
            <button type="submit" className="secondary">Send link</button>
          </form>
        ) : null}
      </div>
    </div>
  );
}
