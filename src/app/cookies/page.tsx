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
export const metadata = { title: 'Cookies' };

/* Fuller statement, including what changes if you add analytics: docs/gdpr/cookie-statement.md. */
export default function CookiesPage() {
  return (
    <article>
      <h1>Cookies</h1>
      <p>This site sets one cookie, and only when you log in:</p>
      <div className="table-wrap">
        <table>
          <thead><tr><th scope="col">Name</th><th scope="col">Purpose</th><th scope="col">Lasts</th></tr></thead>
          <tbody>
            <tr><td><code>__Host-fd_session</code></td><td>Keeps you logged in. Strictly necessary, so it does not need consent.</td><td>30 days for players, 12 hours for staff, or until you log out</td></tr>
          </tbody>
        </table>
      </div>
      <p>We use no analytics, advertising or tracking cookies, and no similar technologies. That is why there is no cookie banner.</p>
    </article>
  );
}
