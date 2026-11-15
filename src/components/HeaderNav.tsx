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
'use client';

import { useEffect, useRef } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

/** A header link that marks the current page with aria-current="page" (styled as the underline bar). */
export function NavLink({ href, children, className }: { href: string; children: React.ReactNode; className?: string }) {
  const path = usePathname() ?? '';
  const current = href === '/' ? path === '/' : path === href || path.startsWith(`${href}/`);
  return (
    <Link href={href} className={className} aria-current={current ? 'page' : undefined}>
      {children}
    </Link>
  );
}

/**
 * The small-screen menu: a native <details>, so it opens and closes with the keyboard and works without JavaScript.
 * With JavaScript it also closes after a link is followed and when Escape is pressed.
 */
export function MenuDetails({ summary, children }: { summary: React.ReactNode; children: React.ReactNode }) {
  const ref = useRef<HTMLDetailsElement>(null);
  const path = usePathname();
  useEffect(() => {
    if (ref.current) ref.current.open = false;
  }, [path]);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && el.open) {
        el.open = false;
        el.querySelector('summary')?.focus();
      }
    };
    const onClick = (e: MouseEvent) => {
      if (e.target instanceof Element && e.target.closest('a')) el.open = false;
    };
    el.addEventListener('keydown', onKey);
    el.addEventListener('click', onClick);
    return () => {
      el.removeEventListener('keydown', onKey);
      el.removeEventListener('click', onClick);
    };
  }, []);
  return (
    <details className="menu" ref={ref}>
      {summary}
      {children}
    </details>
  );
}
