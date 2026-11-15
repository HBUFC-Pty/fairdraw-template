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
import type { Metadata } from 'next';
import './fonts.css';
import './globals.css';
import './styles/tokens.css';
import './styles/progress.css';
import './styles/stage.css';
import './styles/home.css';
import './styles/motion.css';
import { env } from '@/lib/env';
import { currentSession, isStaff } from '@/lib/web/session';
import { SiteFooter } from '@/components/SiteFooter';
import { SiteHeader } from '@/components/SiteHeader';
import { DemoBanner } from '@/components/DemoBanner';
import { cspNonce } from '@/lib/web/request';
import { basketCount } from '@/lib/public/basket-count';
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
  const basket = s ? await basketCount(s.user.id) : 0;
  return (
    <html lang="en-GB">
      <head>
        {/* Design tokens compiled from config/brand.json (validated and contrast-checked at start-up). */}
        <style nonce={nonce}>{brandCss(brand)}</style>
      </head>
      <body {...brandAttributes(brand)}>
        <a className="skip" href="#main">Skip to content</a>
        <DemoBanner />
        <SiteHeader brand={brand} loggedIn={Boolean(s)} staff={Boolean(s && isStaff(s.user.role))} basket={basket} />
        <main id="main" className="wrap">{children}</main>
        <SiteFooter style={brand.layout.footer} brand={brand} />
      </body>
    </html>
  );
}
