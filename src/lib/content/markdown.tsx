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
/**
 * A deliberately small Markdown renderer for the legal pages in content/ (terms and privacy). It builds React
 * elements, never raw HTML, so nothing in a content file can inject script or style. Supported: # to #### headings,
 * paragraphs, "-" and "1." lists, "> " quotes, **bold**, `code`, [links](https://...) and HTML comments (removed,
 * so templates can carry notes for the operator that never reach the page). Anything else shows as plain text.
 */
import { Fragment, type ReactNode } from 'react';

export function fillPlaceholders(text: string, values: Record<string, string>): string {
  return text.replace(/\{\{([A-Z0-9_]+)\}\}/g, (m, k: string) => values[k] ?? m);
}

function safeHref(href: string): string | null {
  if (/^https:\/\/[^\s]+$/.test(href) || /^mailto:[^\s@]+@[^\s@]+$/.test(href)) return href;
  if (/^\/(?!\/)[^\s]*$/.test(href) || /^#[a-z0-9-]+$/.test(href)) return href;
  return null;
}

let keySeq = 0;
const k = () => `md${keySeq++}`;

export function inline(text: string): ReactNode[] {
  const out: ReactNode[] = [];
  const re = /\*\*(.+?)\*\*|`([^`]+)`|\[([^\]]+)\]\(([^)\s]+)\)/g;
  let last = 0;
  for (let m = re.exec(text); m; m = re.exec(text)) {
    if (m.index > last) out.push(text.slice(last, m.index));
    if (m[1] !== undefined) out.push(<strong key={k()}>{inline(m[1])}</strong>);
    else if (m[2] !== undefined) out.push(<code key={k()}>{m[2]}</code>);
    else {
      const href = safeHref(m[4]!);
      out.push(href ? <a key={k()} href={href} rel={href.startsWith('http') ? 'noopener' : undefined}>{inline(m[3]!)}</a> : m[0]);
    }
    last = m.index + m[0].length;
  }
  if (last < text.length) out.push(text.slice(last));
  return out;
}

export function slug(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

export function renderMarkdown(source: string): ReactNode {
  const lines = source.replace(/<!--[\s\S]*?-->/g, '').replace(/\r\n/g, '\n').split('\n');
  const blocks: ReactNode[] = [];
  let i = 0;
  while (i < lines.length) {
    const line = lines[i]!;
    if (!line.trim()) {
      i++;
      continue;
    }
    const h = /^(#{1,4})\s+(.*)$/.exec(line);
    if (h) {
      const level = h[1]!.length;
      const Tag = (['h1', 'h2', 'h3', 'h4'] as const)[level - 1]!;
      blocks.push(<Tag key={k()} id={slug(h[2]!)}>{inline(h[2]!)}</Tag>);
      i++;
      continue;
    }
    if (/^\s*[-*]\s+/.test(line) || /^\s*\d+\.\s+/.test(line)) {
      const ordered = /^\s*\d+\.\s+/.test(line);
      const items: string[] = [];
      while (i < lines.length && (ordered ? /^\s*\d+\.\s+/ : /^\s*[-*]\s+/).test(lines[i]!)) {
        let item = lines[i]!.replace(ordered ? /^\s*\d+\.\s+/ : /^\s*[-*]\s+/, '');
        i++;
        while (i < lines.length && /^\s{2,}\S/.test(lines[i]!) && !/^\s*([-*]|\d+\.)\s+/.test(lines[i]!)) item += ' ' + lines[i++]!.trim();
        items.push(item);
      }
      const children = items.map((it) => <li key={k()}>{inline(it)}</li>);
      blocks.push(ordered ? <ol key={k()}>{children}</ol> : <ul key={k()}>{children}</ul>);
      continue;
    }
    if (/^>\s?/.test(line)) {
      const quote: string[] = [];
      while (i < lines.length && /^>\s?/.test(lines[i]!)) quote.push(lines[i++]!.replace(/^>\s?/, ''));
      blocks.push(<blockquote key={k()}>{renderMarkdown(quote.join('\n'))}</blockquote>);
      continue;
    }
    const para: string[] = [];
    while (i < lines.length && lines[i]!.trim() && !/^(#{1,4}\s|>\s?|\s*[-*]\s+|\s*\d+\.\s+)/.test(lines[i]!)) para.push(lines[i++]!.trim());
    blocks.push(<p key={k()}>{inline(para.join(' '))}</p>);
  }
  return <Fragment>{blocks}</Fragment>;
}
