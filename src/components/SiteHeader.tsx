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
import { env } from '@/lib/env';
import type { Brand } from '@/brand';
import { Account, Basket, Close, LogoTicket, Menu } from './icons';
import { MenuDetails, NavLink } from './HeaderNav';

/**
 * The site name or logo, linking home. Under the bar header and display type a brand with no logo gets the ticket
 * monogram beside its name.
 */
export function BrandMark({ brand, monogramId }: { brand: Brand; monogramId?: string }) {
  const name = env().SITE_NAME;
  return (
    <Link className="brand-mark" href="/">
      {brand.logo ? <img src={brand.logo.src} alt={brand.logo.showName ? '' : brand.logo.alt} /> : monogramId ? <LogoTicket gradientId={monogramId} /> : null}
      {!brand.logo || brand.logo.showName ? <span className="brand-name">{name}</span> : null}
    </Link>
  );
}

const NAV = [
  ['/', 'Competitions'],
  ['/results', 'Results'],
  ['/fairness', 'How draws work'],
] as const;

/** The compact sticky header (brand.layout.header "bar"): icons, a basket count and a menu on small screens. */
function BarHeader({ brand, loggedIn, staff, basket }: { brand: Brand; loggedIn: boolean; staff: boolean; basket: number }) {
  const basketLabel = `Basket, ${basket} ${basket === 1 ? 'ticket' : 'tickets'}`;
  return (
    <header className="site bar">
      <div className="wrap bar-inner">
        <BrandMark brand={brand} monogramId="logo-grad-header" />
        <nav className="bar-nav" aria-label="Main">
          <ul>
            {NAV.map(([href, label]) => <li key={href}><NavLink href={href}>{label}</NavLink></li>)}
          </ul>
        </nav>
        <div className="bar-actions">
          {loggedIn ? (
            <>
              {staff ? <Link className="bar-admin wide-only" href="/admin">Admin</Link> : null}
              <Link className="icon-btn" href="/basket" aria-label={basketLabel}>
                <Basket />
                {basket > 0 ? <span className="count-badge num" aria-hidden="true">{basket > 99 ? '99+' : basket}</span> : null}
              </Link>
              <Link className="icon-btn wide-only" href="/account" aria-label="Account"><Account /></Link>
            </>
          ) : (
            <>
              <Link className="button secondary sm wide-only" href="/login">Log in</Link>
              <Link className="button sm wide-only" href="/signup">Sign up</Link>
            </>
          )}
          <MenuDetails summary={<summary className="icon-btn" aria-label="Menu"><Menu className="ic-open" /><Close className="ic-close" /></summary>}>
            <div className="menu-panel">
              <ul>
                {NAV.map(([href, label]) => <li key={href}><NavLink href={href}>{label}</NavLink></li>)}
                {loggedIn ? (
                  <>
                    <li><NavLink href="/basket">Basket</NavLink></li>
                    <li><NavLink href="/account">Account</NavLink></li>
                    {staff ? <li><NavLink href="/admin">Admin</NavLink></li> : null}
                  </>
                ) : null}
              </ul>
              {loggedIn ? null : (
                <p className="menu-auth">
                  <Link className="button secondary" href="/login">Log in</Link>
                  <Link className="button" href="/signup">Sign up</Link>
                </p>
              )}
            </div>
          </MenuDetails>
        </div>
      </div>
    </header>
  );
}

/** Header: "simple", "centred" (styled through the data-header attribute on <body>) or "bar" (brand.layout.header). */
export function SiteHeader({ brand, loggedIn, staff, basket = 0 }: { brand: Brand; loggedIn: boolean; staff: boolean; basket?: number }) {
  if (brand.layout.header === 'bar') return <BarHeader brand={brand} loggedIn={loggedIn} staff={staff} basket={basket} />;
  return (
    <header className="site">
      <div className="wrap">
        <BrandMark brand={brand} />
        <nav className="main" aria-label="Main">
          <ul>
            <li><Link href="/">Competitions</Link></li>
            <li><Link href="/results">Results</Link></li>
            <li><Link href="/fairness">How draws work</Link></li>
            {loggedIn ? (
              <>
                <li><Link href="/basket">Basket</Link></li>
                <li><Link href="/account">Account</Link></li>
                {staff ? <li><Link href="/admin">Admin</Link></li> : null}
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
  );
}
