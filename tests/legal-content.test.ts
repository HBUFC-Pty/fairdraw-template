import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { createElement, Fragment } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { fillPlaceholders, renderMarkdown } from '../src/lib/content/markdown';

const root = path.resolve(import.meta.dirname, '..');
const html = (md: string) => renderToStaticMarkup(createElement(Fragment, null, renderMarkdown(md)));
const terms = fs.readFileSync(path.join(root, 'content/terms.md'), 'utf8');

describe('markdown renderer for the legal pages', () => {
  it('renders the supported subset', () => {
    const out = html('# Title\n\nA **bold** [link](https://example.com) and `code`.\n\n- one\n- two\n\n1. first\n2. second\n\n> quoted');
    expect(out).toContain('<h1 id="title">Title</h1>');
    expect(out).toContain('<strong>bold</strong>');
    expect(out).toContain('<a href="https://example.com" rel="noopener">link</a>');
    expect(out).toContain('<ul><li>one</li><li>two</li></ul>');
    expect(out).toContain('<ol><li>first</li><li>second</li></ol>');
    expect(out).toContain('<blockquote><p>quoted</p></blockquote>');
  });

  it('cannot inject HTML, scripts or unsafe links, and drops comments', () => {
    const out = html('<script>alert(1)</script> <img src=x onerror=alert(1)>\n\n[bad](javascript:alert(1)) [ok](/terms)\n\n<!-- operator note -->');
    expect(out).not.toContain('<script');
    expect(out).not.toContain('<img');
    expect(out).toContain('&lt;script&gt;');
    expect(out).not.toContain('href="javascript');
    expect(out).toContain('<a href="/terms">ok</a>');
    expect(out).not.toContain('operator note');
  });

  it('fills known placeholders and leaves unknown ones visible', () => {
    expect(fillPlaceholders('{{A}} and {{B}}', { A: 'x' })).toBe('x and {{B}}');
  });
});

describe('competition terms (content/terms.md)', () => {
  it('has a clause for every CAP 8.17 and 8.28 significant condition, each naming its rule', () => {
    const rules = ['8.17.1', '8.17.2', '8.17.3', '8.17.4', '8.17.5', '8.17.6', '8.17.7', '8.17.8', '8.17.9', '8.28.1', '8.28.2', '8.28.3', '8.28.4', '8.28.5', '8.28.6', '8.28.9'];
    for (const r of rules) expect(terms, r).toMatch(new RegExp(`<!--[^>]*CAP[^>]*${r.replace(/\./g, '\\.')}`));
  });

  it('keeps the fairness promises', () => {
    expect(terms).toContain('drawn at its\nadvertised time for the full prize, however many tickets are sold.');
    expect(terms).toMatch(/free by post/);
    expect(terms).toMatch(/18 or over/);
    expect(terms).toMatch(/same maximum per person/);
    expect(terms).toContain('https://fairdraw.partyofone.quest/guides/getting-to-10.html#draw');
  });

  it('quotes the DCMS code with the Open Government Licence attribution', () => {
    expect(terms).toContain('Contains public sector information licensed under the Open Government Licence v3.0.');
    expect(terms).toMatch(/^> 2\.5 Operators should promptly provide the winning player/m);
  });

  it('uses only placeholders the site can fill, and starts with the template notice', () => {
    const known = ['SITE_NAME', 'OPERATOR_LEGAL_NAME', 'OPERATOR_COMPANY_NUMBER', 'OPERATOR_REGISTERED_ADDRESS', 'OPERATOR_ICO_NUMBER', 'CONTACT_EMAIL', 'PRIVACY_EMAIL', 'POSTAL_ENTRY_ADDRESS', 'PAYMENT_PROCESSOR_NAME'];
    for (const f of ['terms.md', 'privacy.md']) {
      const text = fs.readFileSync(path.join(root, 'content', f), 'utf8');
      const shown = text.replace(/<!--[\s\S]*?-->/g, ''); // comments never reach the page
      for (const [, k] of shown.matchAll(/\{\{([A-Z0-9_]+)\}\}/g)) expect(known, `${f}: {{${k}}}`).toContain(k);
      expect(text.slice(0, 400), f).toMatch(/TEMPLATE, NOT LEGAL ADVICE|Template, not legal advice/i);
    }
  });
});
