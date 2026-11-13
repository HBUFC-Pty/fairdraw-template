import type { Metadata } from 'next';
import './fonts.css';
import './globals.css';
import { env } from '@/lib/env';
import { currentSession, isStaff } from '@/lib/web/session';
import { SiteFooter } from '@/components/SiteFooter';
import { SiteHeader } from '@/components/SiteHeader';
import { cspNonce } from '@/lib/web/request';
import { brand, brandAttributes, brandCss } from '@/brand';

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: { default: env().SITE_NAME, template: `%s | ${env().SITE_NAME}` },
    description: 'Prize competitions with draws anyone can check.',
    ...(brand.favicon ? { icons: { icon: brand.favicon } } : {}),
  };
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const nonce = await cspNonce(); // reading the request makes every page dynamic, which the per-request CSP nonce needs
  const s = await currentSession();
  return (
    <html lang="en-GB">
      <head>
        {/* Design tokens compiled from config/brand.json (validated and contrast-checked at start-up). */}
        <style nonce={nonce}>{brandCss(brand)}</style>
      </head>
      <body {...brandAttributes(brand)}>
        <a className="skip" href="#main">Skip to content</a>
        <SiteHeader brand={brand} loggedIn={Boolean(s)} staff={Boolean(s && isStaff(s.user.role))} />
        <main id="main" className="wrap">{children}</main>
        <SiteFooter style={brand.layout.footer} />
      </body>
    </html>
  );
}
