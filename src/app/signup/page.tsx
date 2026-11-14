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
import { signUpAction } from '../actions/auth';
import { siteConfig } from '@/lib/site-config';
import { demoMode, DEMO_NO_EMAIL } from '@/lib/demo';

export const metadata = { title: 'Sign up' };

export default async function SignUpPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  if (demoMode()) {
    return (
      <>
        <h1>Sign up</h1>
        <p className="notice warn">{DEMO_NO_EMAIL}</p>
        <p><Link href="/login">Log in with the demo account</Link></p>
      </>
    );
  }
  return (
    <>
      <h1>Sign up</h1>
      <FlashMessage searchParams={await searchParams} />
      <p>You must be 18 or over. We ask for your date of birth to check this.</p>
      <form className="stack" action={signUpAction}>
        <label>First name<input name="firstName" autoComplete="given-name" required maxLength={80} /></label>
        <label>Last name<input name="lastName" autoComplete="family-name" required maxLength={80} /></label>
        <label>Email<input name="email" type="email" autoComplete="email" required maxLength={254} /></label>
        <label>Date of birth<input name="dateOfBirth" type="date" autoComplete="bday" required /></label>
        <label>
          Password<span className="hint">At least 12 characters. A few random words works well.</span>
          <input name="password" type="password" autoComplete="new-password" required minLength={12} maxLength={256} />
        </label>
        <label>Confirm password<input name="confirm" type="password" autoComplete="new-password" required minLength={12} maxLength={256} /></label>
        <label>
          Monthly spend limit (optional)
          <span className="hint">In pounds. You can set daily and weekly limits too, or change this later. Lowering a limit takes effect at once.</span>
          <input name="monthlyLimit" inputMode="decimal" maxLength={12} defaultValue={siteConfig.defaults.suggestedMonthlyLimitPounds ?? ''} />
        </label>
        <label><input type="checkbox" name="over18" value="yes" required /> I am 18 or over</label>
        <label><input type="checkbox" name="terms" value="yes" required /> I accept the <Link href="/terms">terms</Link> and have read the <Link href="/privacy">privacy notice</Link></label>
        <button type="submit">Create account</button>
      </form>
      <p>Already signed up? <Link href="/login">Log in</Link>.</p>
    </>
  );
}
