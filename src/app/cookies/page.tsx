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
