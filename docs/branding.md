# Branding your site

Sites built from this template should look like their own business, not like each other. Everything visual comes from
one file, `config/brand.json`, so you can change the whole look without touching code, and the fairness features stay
exactly the same whatever the brand.

## What the brand file controls

| Setting | Choices | What it changes |
| --- | --- | --- |
| `colours.light`, `colours.dark` | 16 colours each | Page, cards, text, links and buttons, focus rings, success, warning and error, in light and dark mode |
| `fonts` | `modern`, `editorial`, `friendly`, `bold`, `classic`, `outdoors`, `geometric`, `premium`, `playful`, `accessible`, `system`, `stage` | Heading and body fonts (see `src/brand/fonts.ts`). `stage` is Barlow Condensed headings with Figtree body |
| `radius` | `none`, `small`, `medium`, `large` | Corner rounding |
| `density` | `compact`, `comfortable`, `spacious` | Spacing |
| `shadow` | `none`, `soft`, `crisp`, `glow` | Card shadows (`glow` adds a soft halo in your primary colour) |
| `buttons` | `solid`, `outline`, `pill`, `square` | Button style |
| `cards` | `bordered`, `elevated`, `flat` | Card style |
| `layout.home` | `hero`, `grid`, `featured`, `showcase` | Home page: a big lead prize, a grid, a carousel you move yourself (it never moves on its own), or `showcase`: a prize carousel, the live grid with filters, instant prizes, recent winners, the next draw, how it works and the proof band |
| `layout.card` | `classic`, `compact`, `poster`, `tile` | How each competition appears in lists (`tile`: a compact square card, two to a row on phones) |
| `layout.header` | `simple`, `centred`, `bar` | Logo beside or above the menu, or `bar`: a slim sticky header with a basket count and a menu button on phones |
| `layout.footer` | `columns`, `minimal` | Footer arrangement |
| `logo` | path in `public/brand/`, alt text, whether to show the site name too | Header logo |
| `favicon` | path in `public/brand/` or `null` | Browser tab icon (a monogram in your colours is generated otherwise) |
| `tone` | summary, words, do, avoid | How UI copy should sound (used by AI assistants writing copy) |
| `extras.countdown` | `true` or `false` (default) | A live countdown to the close on each competition card |
| `extras.badges` | `true` or `false` (default) | Factual badges on cards: "Ending soon" (within 24 hours of the close), "Almost sold out" (80% of the maximum or more), "Sold out", "New" (opened in the last 24 hours), "Coming soon". Never invented: each follows from the competition's own times and counts |
| `extras.glow` | `true` or `false` (default) | A soft glow and lift on competition cards (still for people who prefer reduced motion) |
| `typeScale` | `standard` (default) or `display` | `display` sets headings, prices and buttons in condensed capitals on a larger scale |
| `extras.motion` | `true` or `false` (default) | Hero autoplay (with a pause button), card lifts, sheen, scroll entrances, stage lights that come up as the page opens, and confetti when an instant win is revealed. All of it is off for people who prefer reduced motion |
| `extras.ticker` | `true` or `false` (default) | A strip of recent winners on the home page, from real results only (names only with the winner's consent) |

The social sharing image and the default favicon are drawn from your colours and site name automatically.

Prize images are shown square and cropped to fill: upload square images, 1200 by 1200 pixels, with no text near the edges.

## How it works

`src/brand/css.ts` compiles the brand into CSS custom properties (design tokens) such as `--c-primary` and
`--font-heading`. `src/app/globals.css` and every component use only those variables. A test fails if anyone puts a
hex colour or a font name anywhere else, so the brand file stays the single source of truth.

Fonts are served from this site (the `@fontsource` packages, all under the SIL Open Font License). There are no calls
to Google Fonts or any other third party, so nothing about your visitors leaks and no consent is needed for fonts.

## Accessibility guardrails

Every text and background pair, in light and dark mode, must meet WCAG 2.2 AA: 4.5:1 for text, 3:1 for form field
outlines and focus rings. Check with:

```sh
pnpm brand:check                                  # config/brand.json
pnpm brand:check config/brand-presets/meadow.json # any other brand file
```

If a pair fails, the check says which, by how much, and suggests the nearest colour that passes. The site refuses to
start with a brand that fails. Animations and smooth scrolling are switched off for visitors who ask for reduced
motion, and the carousel never moves by itself.

## Trying brands side by side

Run `pnpm dev` and open `/brand-preview`. It shows every component in the current brand in light and dark mode. Add
`?preset=<name>` to preview any file in `config/brand-presets/` (five example directions ship with the template:
harbour, meadow, velvet, carnival and showtime, the bold dark look many prize-competition sites use). The page is only
available in development (or with `BRAND_PREVIEW=true`).

To run a whole site in a preset without copying it to `config/brand.json`, set `BRAND_PRESET=<name>` (the public demo
uses `showtime`). A new preset file must also be added to `BRAND_PRESETS` in `src/brand/index.ts`.

## With an AI assistant

AGENTS.md has a brand identity interview: the assistant asks about your business, your players and the feeling you
want, proposes three different directions as preset files, lets you compare them in the preview, then writes your
choice to `config/brand.json` and runs the contrast check. It will not copy another company's logo, name or look.

## What never changes with the brand

The "Draw checks by FairDraw" link, the draw records and verify pages, the entry lists without names, the free entry
route, caps, spend limits and every rule in the terms look and work the same under every brand. Only use logos,
photos and fonts you own or are licensed to use.
