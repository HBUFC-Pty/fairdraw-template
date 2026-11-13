# The licence in plain English

> This is a summary to help you, not legal advice. The licence itself is in [LICENSE](../LICENSE) and is what
> counts. If anything here seems to differ from it, the licence wins.

The template is licensed under the **Common Public Attribution License Version 1.0 (CPAL-1.0)**, an open source
licence approved by the Open Source Initiative (https://opensource.org/license/CPAL-1.0). It is the Mozilla Public
License 1.1 with two extra sections: one asks for a small attribution on screen, the other treats running the software
as a public website the same as handing out copies.

The FairDraw draw code in `src/lib/fairdraw/` is under the **MIT licence** instead (see [NOTICE](../NOTICE)). It can be
used for anything, as long as its copyright notice and licence text stay with it.

## What you must do

1. **Show the attribution.** Every site built from the template shows **"Draw checks by FairDraw"** linking to
   **https://fairdraw.partyofone.quest**, on the pages people use. The footer already does this on every page, in every
   footer style, and results pages repeat it. Keep it. If you show credits for anyone else (a design agency, a
   payments badge), the FairDraw attribution must be no less prominent than theirs. This applies to your whole site
   (a "Larger Work" in the licence's terms), not only to the template's own files.
2. **Keep the notices.** Leave the licence notice at the top of each source file (`node scripts/licence-headers.mjs`
   adds it to new template files), keep `LICENSE` and `NOTICE`, and keep the MIT credit comments in
   `src/lib/fairdraw/`.
3. **If you run a modified copy as a public website, publish the source of the template files you changed.** That
   means any file from the template you edited, and any new file that contains part of a template file. The simplest
   way: keep your site in a public Git repository (on GitHub, GitLab or similar), or publish a public repository that
   contains just the template files you changed, and link to it from your site (for example in the footer or on your
   "about" page). Keep each published version available for at least 12 months, or 6 months after you publish a newer
   one (section 3.2).
4. **Say what you changed.** Keep a short changelog file in that repository listing what you changed and when, and
   state that your version is derived from the FairDraw operator template by Harrison Jones (section 3.3). Your Git
   history plus a line in your README covers this.

## What you do not have to do

- **Publish your own new files.** Code you write from scratch in separate files (your own pages, your own payment
  adapter, your own components) that contains no part of the template's files is yours. You can keep it private.
- **Publish your content or data.** Your text, images, logo, brand file, configuration, secrets (`.env`) and database
  are not source code of the template. Never publish secrets.
- **Pay anything.** The licence costs nothing and there are no royalties.
- **Use the FairDraw name for anything else.** The attribution is the only use of the name the licence asks for; it does
  not give you permission to use FairDraw's name or logo in other ways (section 14(d)).

## Why: the licence's own words

Section 14 (attribution) lets the original developer require "a prominent display of the Original Developer's
Attribution Information" on "the graphic user interface employed by the end user", limited to "a copyright notice", "a
word or one phrase (not exceeding 10 words)", "one graphic image" and "a URL". It adds that if you credit other
parties, the original developer's attribution "shall be no less prominent". Exhibit B in [LICENSE](../LICENSE) sets the
phrase to "Draw checks by FairDraw", the URL to https://fairdraw.partyofone.quest, no image, and says display is
required in Larger Works.

Section 15 (network use) says that making the code "available as an application intended for use over a network" is an
"External Deployment", which you "must treat ... as a distribution under section 3.1 and make Source Code available
under Section 3.2". That is why running a modified copy as a website means publishing the changed template files.

The quotation marks above use straight quotes; the licence text itself uses curly quotes.

## Who wrote it

The Initial Developer of the template is Harrison Jones (Copyright (c) 2026 Harrison Jones). Exhibit A leaves the
"Original Developer" line blank, which by the licence's own wording means the Original Developer is the Initial
Developer, so the attribution in section 14 is his.
