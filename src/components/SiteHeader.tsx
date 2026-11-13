import Link from 'next/link';
import { env } from '@/lib/env';
import type { Brand } from '@/brand';

export function BrandMark({ brand }: { brand: Brand }) {
  const name = env().SITE_NAME;
  return (
    <Link className="brand-mark" href="/">
      {brand.logo ? <img src={brand.logo.src} alt={brand.logo.showName ? '' : brand.logo.alt} /> : null}
      {!brand.logo || brand.logo.showName ? <span>{name}</span> : null}
    </Link>
  );
}

/** Header: "simple" or "centred" (brand.layout.header, styled through the data-header attribute on <body>). */
export function SiteHeader({ brand, loggedIn, staff }: { brand: Brand; loggedIn: boolean; staff: boolean }) {
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
