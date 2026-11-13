import type { Metadata } from 'next';
import Link from 'next/link';
import './globals.css';
import { env } from '@/lib/env';
import { currentSession, isStaff } from '@/lib/web/session';
import { SiteFooter } from '@/components/SiteFooter';
import { cspNonce } from '@/lib/web/request';

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: { default: env().SITE_NAME, template: `%s | ${env().SITE_NAME}` },
    description: 'Prize competitions with draws anyone can check.',
  };
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  await cspNonce(); // reading the request makes every page dynamic, which the per-request CSP nonce needs
  const s = await currentSession();
  return (
    <html lang="en-GB">
      <body>
        <a className="skip" href="#main">Skip to content</a>
        <header className="site">
          <div className="wrap">
            <Link className="brand" href="/">{env().SITE_NAME}</Link>
            <nav className="main" aria-label="Main">
              <ul>
                <li><Link href="/">Competitions</Link></li>
                <li><Link href="/results">Results</Link></li>
                <li><Link href="/fairness">How draws work</Link></li>
                {s ? (
                  <>
                    <li><Link href="/basket">Basket</Link></li>
                    <li><Link href="/account">Account</Link></li>
                    {isStaff(s.user.role) ? <li><Link href="/admin">Admin</Link></li> : null}
                  </>
                ) : (
                  <>
                    <li><Link href="/login">Log in</Link></li>
                    <li><Link href="/signup">Sign up</Link></li>
                  </>
                )}
              </ul>
            </nav>
          </div>
        </header>
        <main id="main" className="wrap">{children}</main>
        <SiteFooter />
      </body>
    </html>
  );
}
