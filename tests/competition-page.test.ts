/** Showtime v2 stage 3: the competition page keeps every legal text visible and the entry form posts the same fields. */
import { describe, expect, it } from 'vitest';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { CompetitionView, type CompetitionViewProps } from '../src/components/competition/CompetitionView';
import { INSTANT_WIN_CARD_NOTICE } from '../src/components/competition/BuyBox';
import { QuantityStepper } from '../src/components/competition/QuantityStepper';
import type { Draw } from '../src/components/competition/BuyBox';
import type { Competition } from '../src/lib/public/queries';

const now = new Date('2026-11-15T12:00:00Z');
const ADDRESS = 'Free Entry, PO Box 123, Testtown, TT1 2AB';
const STATEMENT = 'for the full prize, however many tickets are sold.';
const FREE_ENTRY = 'you can enter for free by post, with exactly the same chance of winning as a paid entry.';

const comp = (over: Partial<Competition> = {}): Competition =>
  ({
    id: '6f1d2c3b-1111-4222-8333-944455556666',
    slug: 'sample',
    title: 'A prize',
    summary: 'A short summary.',
    prizeDescription: 'The prize, described.',
    prizeValuePence: 10_000,
    images: [{ url: '/images/demo-lakes.svg', alt: 'Lakes' }],
    ticketPricePence: 299,
    maxTickets: 200,
    perPersonCap: 20,
    winnerCount: 1,
    opensAt: new Date('2026-11-10T12:00:00Z'),
    closesAt: new Date('2026-11-16T19:45:00Z'),
    drawAt: new Date('2026-11-16T19:45:00Z'),
    instantPrizes: [],
    isInstantWin: false,
    skillQuestion: null,
    bundles: [],
    status: 'live',
    ...over,
  }) as Competition;

function render(over: Partial<CompetitionViewProps> = {}) {
  const props: CompetitionViewProps = {
    c: comp(),
    sold: 46,
    draw: null,
    winners: [],
    inst: null,
    now,
    open: true,
    loggedIn: false,
    badges: true,
    postalAddress: ADDRESS,
    promoter: 'Example Promotions Ltd',
    action: async () => {},
    ...over,
  };
  return renderToStaticMarkup(createElement(CompetitionView, props));
}

/** True when `needle` appears in the HTML outside every <details> element (so it is visible without opening anything). */
function visibleOutsideDetails(html: string, needle: string): boolean {
  let from = 0;
  for (;;) {
    const at = html.indexOf(needle, from);
    if (at < 0) return false;
    const before = html.slice(0, at);
    const open = (before.match(/<details[\s>]/g) ?? []).length - (before.match(/<\/details>/g) ?? []).length;
    if (open === 0) return true;
    from = at + needle.length;
  }
}

/** The opening tag of the form control with this name. */
function controlTag(html: string, name: string): string | undefined {
  return html.match(new RegExp(`<(?:input|button|select|textarea)[^>]*name="${name}"[^>]*>`))?.[0];
}

describe('competition page: legal texts stay visible', () => {
  it('shows the free entry route with the postal address, and the draw statement, outside any closed panel', () => {
    for (const loggedIn of [false, true]) {
      const html = render({ loggedIn });
      expect(visibleOutsideDetails(html, FREE_ENTRY)).toBe(true);
      expect(visibleOutsideDetails(html, ADDRESS)).toBe(true);
      expect(visibleOutsideDetails(html, STATEMENT)).toBe(true);
      expect(visibleOutsideDetails(html, 'href="#free-entry"')).toBe(true);
      expect(visibleOutsideDetails(html, 'href="/competitions/sample/entries"')).toBe(true);
      expect(visibleOutsideDetails(html, 'Promoter: Example Promotions Ltd.')).toBe(true);
      expect(html).not.toMatch(/style=/);
    }
  });

  it('shows the instant win credit card notice on instant win competitions, and only there', () => {
    const instant = render({ c: comp({ isInstantWin: true }) });
    expect(visibleOutsideDetails(instant, INSTANT_WIN_CARD_NOTICE)).toBe(true);
    expect(render()).not.toContain(INSTANT_WIN_CARD_NOTICE);
  });

  it('keeps the free entry note and the draw statement after the close', () => {
    const html = render({ c: comp({ status: 'closed' }), open: false });
    expect(visibleOutsideDetails(html, 'free postal entries were accepted until the close')).toBe(true);
    expect(visibleOutsideDetails(html, STATEMENT)).toBe(true);
  });

  it('shows the real close time, price and exact share sold in the buy box', () => {
    const html = render();
    expect(html).toContain('£2.99');
    expect(html).toContain('Closes Tomorrow 19:45');
    expect(html).toContain('23% sold');
    expect(html).toContain('154 left');
    expect(html).toContain('class="pc23"');
  });
});

describe('competition page: entry form', () => {
  it('posts the same field names as before (competitionId, slug, quantity, quick, numbers, answer)', () => {
    const c = comp({
      bundles: [{ quantity: 10, pricePence: 2500 }],
      skillQuestion: { question: 'Which is a colour?', options: ['Red', 'Seven'], correctIndex: 0 },
    } as Partial<Competition>);
    const html = render({ c, loggedIn: true });
    expect(controlTag(html, 'competitionId')).toContain(`value="${c.id}"`);
    expect(controlTag(html, 'slug')).toContain('value="sample"');
    expect(controlTag(html, 'quantity')).toBeDefined();
    expect(controlTag(html, 'numbers')).toBeDefined();
    const quick = (html.match(/<button[^>]*>/g) ?? []).filter((t) => t.includes('name="quick"') && t.includes('type="submit"'));
    expect(quick.some((t) => t.includes('value="10"'))).toBe(true);
    expect(quick.some((t) => t.includes('value="5"'))).toBe(true);
    expect(html.match(/<input[^>]*type="radio"[^>]*name="answer"[^>]*>/g)).toHaveLength(2);
    expect(html).toContain('Add to basket');
    expect(html).not.toContain('25 tickets');
  });

  it('has no own-number field when the competition has instant prizes', () => {
    const html = render({ c: comp({ instantPrizes: [{ title: 'Small', valuePence: 100, count: 2 }] }), loggedIn: true });
    expect(controlTag(html, 'numbers')).toBeUndefined();
    expect(html).toContain('Numbers are always picked at random');
  });

  it('asks a logged out visitor to log in or sign up, with no form', () => {
    const html = render();
    expect(html).toContain('href="/login"');
    expect(html).toContain('href="/signup"');
    expect(controlTag(html, 'quantity')).toBeUndefined();
  });

  it('uses a plain number input for the quantity, so it works with JavaScript off', () => {
    const html = renderToStaticMarkup(createElement(QuantityStepper, { cap: 20, unitPence: 299, bundles: [], points: false }));
    const tag = controlTag(html, 'quantity')!;
    expect(tag).toContain('type="number"');
    expect(tag).toContain('min="1"');
    expect(tag).toContain('max="20"');
    expect(tag).toContain('value="1"');
    expect(tag).toContain('required');
    expect(html).toContain('Up to 20 per person');
    expect(html).toContain('£2.99');
    // The step buttons never submit the form.
    expect(html.match(/<button[^>]*type="button"/g)).toHaveLength(2);
  });
});

describe('competition page: drawn and closed', () => {
  const draw = {
    competitionId: 'x',
    closeUnix: Math.floor(new Date('2026-11-14T19:45:00Z').getTime() / 1000),
    ticketsSold: 46,
    maxTickets: 200,
    drandRound: 12345,
    scheduledDrawAt: new Date('2026-11-14T19:45:00Z'),
    drawnAt: new Date('2026-11-14T19:45:04Z'),
    randomness: 'ab',
  } as unknown as Draw;

  it('shows the winning tickets, both draw times, the checks and the FairDraw link in view', () => {
    const html = render({ c: comp({ status: 'drawn' }), open: false, draw, winners: [{ position: 1, ticket: 128, name: 'Robin K.' }] });
    expect(html).toContain('128');
    expect(html).toContain('Robin K.');
    expect(visibleOutsideDetails(html, 'Draw checks by FairDraw')).toBe(true);
    expect(visibleOutsideDetails(html, 'href="/draws/sample"')).toBe(true);
    expect(visibleOutsideDetails(html, 'href="/competitions/sample/entries"')).toBe(true);
    expect(visibleOutsideDetails(html, '19:45:00 GMT')).toBe(true);
    expect(visibleOutsideDetails(html, '19:45:04 GMT')).toBe(true);
    expect(html).not.toContain('Add to basket');
  });

  it('shows the commitment text with its links once closed', () => {
    const html = render({ c: comp({ status: 'closed' }), open: false, draw: { ...draw, drawnAt: null, randomness: null } as Draw });
    expect(visibleOutsideDetails(html, 'The list of 46 tickets was frozen at')).toBe(true);
    expect(visibleOutsideDetails(html, 'href="/draws/sample/commitment.json"')).toBe(true);
    expect(html).toContain('drand round 12345');
  });
});
