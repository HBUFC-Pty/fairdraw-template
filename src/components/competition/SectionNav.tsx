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

import type { MouseEvent } from 'react';

/**
 * In-page links to the sections under the buy box. A plain list of anchors; with JavaScript on, following one to a
 * closed <details> panel also opens it.
 */
export function SectionNav({ items }: { items: { id: string; label: string }[] }) {
  const open = (e: MouseEvent<HTMLAnchorElement>) => {
    const id = e.currentTarget.hash.slice(1);
    const el = document.getElementById(id);
    // The id sits on the panel's <section>; its <details> is inside (or, for older markup, the element itself).
    const details = el instanceof HTMLDetailsElement ? el : el?.querySelector(':scope > details');
    if (details instanceof HTMLDetailsElement) details.open = true;
  };
  return (
    <nav className="section-nav" aria-label="On this page">
      <ul>
        {items.map((i) => (
          <li key={i.id}>
            <a href={`#${i.id}`} onClick={open}>{i.label}</a>
          </li>
        ))}
      </ul>
    </nav>
  );
}
