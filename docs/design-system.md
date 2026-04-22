# Horse Racing Shares — Design System

> **Status:** v3 (locked post-decisions-pending, 2026-04-22). Supersedes v2. Folds in operator decisions on palette, logo, icons, photography, counsel timing, AFSL verification, and trust-strip logos.
> **Audience:** the operator (Mark), the logo designer executing directions, the builder agent implementing tokens, the photographer receiving shot briefs, and any counsel reviewing compliance copy.
> **Scope lock:** this document designs the agreed scope in `blueprint.md`. It does not add features.

## v3 decisions folded in

The operator resolved all 11 items in `decisions-pending.md` on 2026-04-22. Changes applied in this revision:

- **Hero colour locked to Midnight Navy `#0E1E3A`.** Token family renamed `--color-paddock*` → `--color-midnight*`. Brass, Paper, Charcoal, Fog, Leaf, Amber, Clay unchanged. Shadows re-tinted from paddock-green rgba to navy rgba.
- **Silks tile + wordmark logo direction locked** (Direction A). Hero quadrants: two Midnight, two Brass, with charcoal hairline cross.
- **Custom icons deferred to Phase 3.** Phase 1 ships with lucide-react placeholders mapped per §1.4; a single Phase 3 task commissions the final set.
- **Legal counsel deferred to Phase 8.** Risk note appended to §Decisions still owed — this is against my recommendation and against blueprint Part 5, but the operator has called the trade-off and we document it.
- **Photography budget locked to Shot 1 only** (dawn gallop video + hero still, $4k–$6k). Shots 2–5 become post-launch backlog.
- **AFSL verification v1 is manual** for the first 20 syndicators — operator-performed, 24-hour SLA. §6 and §10 updated with the operational note.
- **Trust-strip logos ship hybrid** — chase permission from the six bodies in parallel; plain-text fallback ready for any who refuse or delay. §4.1 reflects both states.
- **Racing Australia locked as form-record partner target.** Racing.com and Punters remain documented fallbacks if the RA commercial conversation stalls.
- **Fraunces Windows sub-18px render check** assigned to builder in Phase 1 Storybook; Source Serif 4 fallback remains ready.

## v2 reconciliation summary

The v1 draft was 80% right and 20% borrowed from the wrong category. The critique flagged eight items for change and five tonal notes. v2 folds the structural changes in; two items are flagged pending external input.

**Accepted and applied in v2:**

- **Homepage Hero Horse of the Week** replaces the 6-up featured rotator (P0.1).
- **Primary CTAs are Midnight-dark, not red** (P0.2). Red is demoted to destructive-only and renamed Clay.
- **Share availability shown as a status line, not a progress bar** (P0.3). Kickstarter-style scarcity visuals removed across the system.
- **Dam line given equal weight to sire** on cards and detail pages; dam sire surfaced as a second line; black-type emphasis baked into PedigreeTree cells, not hidden in a drawer (P0.4).
- **FilterRail defaults to 6 groups** with "More filters" revealing the remaining 5 (P1.2).
- **Winner Reel replaced with Owner Stories** strip — first-person quotes, not prizemoney (P1.3).
- **EnquiryForm split into a 5-field Quick Enquiry and a post-success Profile** card (P1.4).
- **Sort tiebreak removed entirely; guaranteed rotator slot removed**. Regal now retains only two favouring affordances, both transparently disclosed (P1.5).
- **IncentiveBadges are monochrome at rest**; colour returns only in the hover tooltip (P1.7).
- **Compliance strip and SyndicatorPanel de-duplicated** — strip is the primary scannable signal, panel references it rather than repeating it (P2.2).
- **Cost calculator moved from top-level nav to `/handbook/the-numbers`** (P2.3).
- **FormLink component added** to HorseCard and detail page — outbound to Racing Australia / Racing.com (P1.6 new scope).

**Flagged pending external input (now resolved in v3):**

- Hero colour — resolved in v3 to **Midnight Navy `#0E1E3A`** (P1.1).
- Fraunces sub-18px rendering on Windows Chromium — builder verifies in Phase 1 Storybook; Source Serif 4 remains the fallback for body sizes if rendering fails (P2.5).

**Noted and deferred (revisit at launch):**

- "The Sunday Shortlist" naming (P2.1) — keep for v1 brand, revisit after first 6 months of send data.
- Photography — in v3, **Shot 1 only** (dawn gallop video + hero still, $4k–$6k) is commissioned pre-launch. Shots 2–5 move to the post-launch backlog (P2.4).

**Retained without change:**

The eight items the critique explicitly called "do not change" — dawn-gallop hero loop, voice samples, My Stable / The Handbook names, tier ladder, compliance-first architecture, CSS tokens, sticky EnquiryPanel on desktop, SavedSearchBuilder dialog — all ship as written in v1.

The rest of this document is the design system in its reconciled form. Where a v1 decision has been replaced, the replacement is in place; there is no `~~strikethrough~~` or `(changed from v1)` annotation — the doc must read clean for the builder.

---

A preface on the single strategic question underneath every design decision below:

> **A 55-year-old accountant in Toorak who has been to the Caulfield Cup five times and has $20,000 he'd "quite like to put into a horse" arrives at horseracingshares.com after a friend mentioned it. He has 90 seconds of attention. What does the site need to look and feel like, in that 90 seconds, for him to create an account?**

That person is the design brief. Premium but approachable. Credible enough that his accountant brain isn't scanning for red flags. Editorial enough that it doesn't feel like gambling. Plain enough that he doesn't feel stupid. Everything below serves him.

Tagline candidates (generated, five):

1. *"The Australian home of racehorse shares."*
2. *"Your name on the papers."*
3. *"Ownership starts here."*
4. *"Share the paddock."*
5. *"Every horse, every share, one place."*

**Pick: "The Australian home of racehorse shares."** — I'm choosing it over the more evocative *"Your name on the papers"* (which I'd keep as a marketing secondary) because the primary tagline's job on a cold homepage visit is to **classify the site**, not to poetise it. A 55-year-old first-time buyer needs to understand, inside one second, *what this is*. "The Australian home of racehorse shares" is category-defining — it plants the flag that this is *the* place, not *a* place. "Your name on the papers" earns its keep in an email subject line or a paid ad where context is already set.

---

## 1. Brand Identity System

### 1.1 Logo concept

**The domain is the wordmark.** That is the single most important brand decision in this document. We own `horseracingshares.com`. Literally spelling out what the business is, in the URL bar and in the masthead, is free category leadership — we do not give it away to a clever name. "HRS" exists as a compact shortform (favicon, app icon, mobile nav puck) but the full wordmark appears everywhere it fits.

**Direction locked: "Silks tile + editorial wordmark"** (Direction A from v1). Brief the designer on this only; B and C are documented below as background, not alternatives to explore.

- A 1:1 tile mark built of four quadrants, reminiscent of racing silks — **two quadrants in Midnight Navy `#0E1E3A`, two in Brass `#B8893E`**, with a 1-unit charcoal hairline cross. The tile is clean, flat, graphic; not a realistic silks illustration.
- The wordmark "Horse Racing Shares" sits beside or below the tile, in Fraunces ExtraBold at the lower end of the weight axis, tight tracking, sentence-spaced as two lines: *Horse Racing* / *Shares*. In favicon form, the tile runs alone with a subtle "hrs" monogram overlaid.
- Why this wins: the silks motif is instantly legible to any racing audience (it *is* racing), but abstracted to four flat colour blocks it reads modern and graphic — not kitsch, not stable-heraldic. It scales from a 16×16 favicon to a trackside 4m banner. It gives the brand a flexible chassis for seasonal variation (Spring Carnival silks, Autumn Carnival silks) without redesigning the logo.

**Directions not taken** (documented for completeness; do not brief):

- **Direction B — "The finish post".** A minimalist mark: a vertical bar with a single horizontal strike, evoking the winning post. Quieter, less racing-native. Leaves brand equity on the table.
- **Direction C — "Pure wordmark".** No symbol. Requires an experienced type designer; high upside, high downside. Not the right first move.

Brief for the designer (Direction A only): execute as monochrome lock-ups first, at favicon / header / footer / large-format sizes. Lock-up must work on both paper-warm and midnight-navy backgrounds.

### 1.2 Colour palette

The palette is **editorial, not equestrian-cliché**. Nobody builds a premium brand with the navy-and-gold that every syndicator on earth has already used. We ground this in a deep, desaturated Midnight Navy (the hour after last race, the members' stand at dusk) with Brass as the warm accent and paper-warm neutrals that read editorial rather than sterile. **There is no red in the primary palette** — red reads as payday-lender, as Groupon-panic, as emergency signal. A premium racing brand does not ask for attention with red; it earns attention by being the only interesting thing on the page.

| Role | Name | Hex | Reasoning |
|---|---|---|---|
| Hero | Midnight | `#0E1E3A` | Deep desaturated navy. Reads as established, editorial, financially-serious without tipping institutional. Passes WCAG AA for white text at 16px+. |
| Hero tint | Midnight Light | `#1C3560` | Hover states, large fills that need air. |
| Hero shade | Midnight Dark | `#07122A` | Footers, heavy sections, inverted surfaces. |
| Primary CTA | Midnight | `#0E1E3A` | Default filled button. Paper type on midnight fill. |
| CTA hover | Midnight Light | `#1C3560` | Hover/active state on the primary button. |
| Secondary | Brass | `#B8893E` | Stirrup leather, racebook gilt. Pairs with Midnight without competing. Also used as a tonal accent on hover, on ribbons, on Headline-tier indicators. |
| Secondary tint | Brass Light | `#D4A55C` | Editorial pull-quotes, tier badges. |
| Neutral | Paper | `#FAF7F2` | Warm off-white page background. Not sterile. Racebook paper, not medical report. |
| Neutral | Paper Dim | `#F2EEE6` | Alternating stripe, section wash. |
| Neutral | Charcoal | `#1A1A1A` | Body text. Not pure black — black on warm paper looks harsh. |
| Neutral | Charcoal Soft | `#2D2D2D` | Secondary body, captions. |
| Neutral | Fog | `#E8E4DC` | Borders, dividers, disabled states. |
| Semantic — success | Leaf | `#2E7D4F` | AFSL verified ticks, confirmation toasts. The one deliberate touch of green — restricted to "this has been verified". |
| Semantic — warning | Amber | `#D97706` | "Final shares available" status lines (rare, earned). |
| Semantic — destructive | Clay | `#B91C1C` | **The only red in the system.** Destructive actions only: delete listing, remove from stable, cancel enquiry. Never a CTA background. Never a badge fill at rest. |

**On Midnight over Paddock Green (the v1 pick):** v1 argued for racing green on the reasoning that navy is what every financial-services competitor already uses. That instinct is right at 80%, but the operator tested the v1 palette against five first-time-syndicate customers and a financially-cautious Toorak reader reliably parses racing green as "country gentleman / Barbour" before they parse it as "racing". Midnight Navy at this specific hex — `#0E1E3A`, desaturated, edged toward black — does not read as retail-bank navy (too dark, too warm) but does land as serious, editorial, composed. It borrows the *seriousness* of financial branding without the *generic-ness*. Brass + Paper + Leaf verified ticks do the rest of the racing work.

The risk we accept: a navy-first palette must fight harder to distinguish from the competitor set on colour alone. That fight is won by typography (Fraunces), by the silks-tile logo (where racing green could live later as a seasonal quadrant variant), and by photography. Colour is one of four differentiators, not the whole of it.

### 1.3 Typography

| Role | Face | Fallback | Source |
|---|---|---|---|
| Heading | Fraunces (variable, 400–900, opsz 9–144) | Georgia, serif | Google Fonts |
| Body | Inter (variable, 400–700) | system-ui, sans-serif | Google Fonts |
| Monospace (data) | JetBrains Mono | Consolas, monospace | Google Fonts |

**I'm choosing Fraunces over Playfair/Source Serif/Canela because:** Fraunces has an unusual tonal range for a free face — you can drop the `opsz` axis for display sizes and the letterforms get thicker, more editorial; push it up for body copy and it steadies. This matters because we will use serif headings at wildly different sizes — a 56px H1 on the homepage, a 20px sire × dam cross in a horse card — and Fraunces keeps its character across that range. Inter body is non-controversial; it's the best free workhorse sans-serif and it renders cleanly on Windows, which 40% of our desktop traffic will use. JetBrains Mono earns its place for cost-calculator numerics and share price tables.

Load: self-host WOFF2 via `next/font/google` with `display: swap` and `preload: true` for the two primary weights. No FOUT on the homepage.

**Type scale (mobile-first; desktop scales up at `md:` breakpoint):**

| Token | Mobile | Desktop | Line-height | Weight | Use |
|---|---|---|---|---|---|
| `--text-display` | 2.75rem (44px) | 3.75rem (60px) | 1.05 | 700 | Homepage hero only |
| `--text-h1` | 2.25rem (36px) | 3rem (48px) | 1.1 | 700 | Page titles |
| `--text-h2` | 1.75rem (28px) | 2.25rem (36px) | 1.15 | 650 | Section heads |
| `--text-h3` | 1.375rem (22px) | 1.625rem (26px) | 1.25 | 600 | Card titles, subsections |
| `--text-h4` | 1.125rem (18px) | 1.25rem (20px) | 1.3 | 600 | Inline emphasis, sire × dam on cards |
| `--text-h5` | 1rem (16px) | 1.0625rem (17px) | 1.4 | 600 | UI labels |
| `--text-body` | 1rem (16px) | 1.0625rem (17px) | 1.6 | 400 | Body copy. 16px floor. |
| `--text-small` | 0.875rem (14px) | 0.9375rem (15px) | 1.5 | 400 | Meta, helper text |
| `--text-caption` | 0.75rem (12px) | 0.8125rem (13px) | 1.45 | 500 | Compliance fineprint, timestamps |

Sire × dam crosses (e.g. "Capitalist × Frolic") are always set in Fraunces italic. This is a small deliberate choice that makes horse listings feel like editorial, not SKUs.

### 1.4 Iconography

**Library: lucide-react.** Not open to debate for this project — it's the shadcn default, it has 1,400+ icons, the stroke system is consistent, and it tree-shakes cleanly under Turbopack. Using anything else is a tax we do not need to pay.

- Stroke: `1.5px` (lucide default — do not override globally).
- Corner radius: 2px (lucide default).
- Sizes: 16 / 20 / 24 / 32. Never arbitrary.
- Colour: inherits `currentColor`. Never hard-coded in markup.

**Custom icons are deferred to Phase 3.** Phase 1 ships with lucide-react placeholders so the builder is unblocked and the initial surfaces look coherent; a single Phase 3 task commissions the final six bespoke SVGs (~$600–$1,200 budget envelope) and swaps them in before launch.

**Phase 1 lucide-placeholder mapping:**

| Final icon (Phase 3) | Use | Lucide placeholder (Phase 1) |
|---|---|---|
| `SilksQuadrant` | Logo mark | CSS 2×2 div grid (Midnight / Brass quadrants + charcoal hairline cross) — not a lucide icon |
| `HorseshoeU` | Saved / wishlist state | `bookmark` (filled on save) |
| `FinishPost` | Sold / closed badge | `flag` |
| `Pedigree` | Horse detail page tab | `git-branch` |
| `PdsDocument` | PDS download icon | `file-text` |
| `AfslShield` | AFSL-verified badge | `shield-check` |

The placeholders share lucide's 1.5px stroke and 2px corner radius, so when the custom set replaces them in Phase 3 it is a one-component swap — no layout, spacing, or alignment work. The SilksQuadrant logo mark is built as a CSS grid in Phase 1 rather than a lucide icon, because the logo is brand-load-bearing and a generic lucide mark in the header would read wrong; the CSS version is ≈ 20 lines of markup and is trivially replaceable.

Everything else — filters, forms, navigation — uses lucide straight from day one.

### 1.5 Photography direction

The photography brief is the single biggest opportunity to look premium on a budget. Stock photography kills the brand instantly. Even one commissioned shoot (half-day at a Melbourne stable, golden hour) will outclass everything rhownership has.

**Direction:**

- **Subject matter:** trackwork at dawn (silhouettes, steam off the horses); stable moments (grooming, strapping, the quiet pre-race); close-up horse portraits (eye, mane, halter); owner raceday moments (hands holding a racebook, binoculars resting, the back of heads in members' stand — *never* faces of identifiable people unless released); the paddock walk from a respectful distance.
- **Lighting:** natural. Golden hour at both ends of the day. Overcast is acceptable (and forgiving). Never flash.
- **Treatment:** minimal colour grading. Lifted blacks slightly for a warm editorial tone. No Instagram filters. No fake film grain. The horse is always in sharp focus; backgrounds fall off.
- **What to avoid:** finish-line celebrations with cash/cheques visible (implies return); jockey-action hero shots (image rights and whip-rule aesthetics problem); stock photography of any kind; the "silhouette-and-sunset-cliché" that every syndicate brochure uses; people giving a thumbs-up.

**Five shot-list briefs to hand to a photographer:**

1. **"The dawn gallop"** — one horse, one rider, cantering away from camera along the inside rail at first light. Steam rising. Horse's hindquarters and rider's back are the subject. 3:2 landscape, wide negative space top-right for hero text overlay. **Use:** homepage hero. Alt: 10-second muted video loop.
2. **"The hand on the neck"** — close-crop of a hand resting on a horse's crest, showing the muscle and coat detail. No face visible. **Use:** /learn articles about the relationship between owner and horse, "what you get" imagery on horse detail pages.
3. **"The racebook on the armrest"** — overhead shot of an open racebook on a wooden members' stand armrest, a set of binoculars beside it, a glass of sparkling in soft focus behind. **Use:** /learn raceday-experience articles, homepage three-up tile.
4. **"The eye"** — extreme macro of a horse's eye, lashes, skin texture. Shallow depth. **Use:** editorial pull in /about and in guide articles. Deeply premium when one image.
5. **"The strapper walking"** — rear three-quarter of a horse being led by a strapper along a stable corridor. Motion blur on the strapper's legs, horse sharp. **Use:** /syndicators directory page, general stock.

Each shoot must produce deliverables at 2400×1600, 1600×1066, and 800×533 at WebP quality 82. No image over 180kB in production.

### 1.6 Voice & tone

**Principles:**

- Plain Australian English. Not "Aussie" — we do not say mate, arvo, or punt. Professional.
- Declarative. One clause per sentence where possible.
- Specific nouns, active verbs.
- Never promise what we cannot deliver. No "returns", "profits", "investment", "exciting journey", "unlock ownership".
- Explain a racing term the first time it's used, then use it freely.

**Three sample paragraphs:**

*Homepage hero, under the tagline:*

> Browse the latest shares for sale in Australian racehorses — from 1% micro-shares to 10% stakes. Every listing is backed by a licensed syndicator and a Product Disclosure Statement. Enquiry goes through us, so you can compare before you commit.

*Horse listing description, sire × dam head:*

> A strong, forward-going bay colt by Capitalist out of the black-type producer Frolic, trained at Caulfield by Ciaron Maher. Vet-clear on x-rays and scopes, eligible for BOBS and Inglis Xtra. Shares available from 2.5% to 10%. First trial expected early winter.

*Compliance disclosure — at the foot of a horse detail page:*

> Shares in this horse are issued by [Syndicator Name], holder of AFSL 123456, under their Product Disclosure Statement dated 14 March 2026. Horse Racing Shares operates this listing on behalf of the syndicator and is not itself an issuer of financial products. We do not provide personal financial advice. Please read the PDS before you decide.

Voice rules that will live in the builder's `content.md` agent config and in every brief to a copywriter.

---

## 2. Design System Tokens (CSS variables)

Drop this into `apps/web/app/globals.css` at the top of the file. Tailwind v4's `@theme` directive will consume these via `@theme inline`.

```css
@layer base {
  :root {
    /* ─── Colour ─── */
    --color-midnight:        #0E1E3A;
    --color-midnight-light:  #1C3560;
    --color-midnight-dark:   #07122A;

    --color-brass:          #B8893E;
    --color-brass-light:    #D4A55C;
    --color-brass-dark:     #8F6B2E;

    --color-paper:          #FAF7F2;
    --color-paper-dim:      #F2EEE6;
    --color-charcoal:       #1A1A1A;
    --color-charcoal-soft:  #2D2D2D;
    --color-fog:            #E8E4DC;
    --color-fog-dark:       #C9C3B8;

    --color-success:        #2E7D4F;
    --color-warning:        #D97706;
    --color-clay:           #B91C1C;   /* destructive-only, never a CTA */

    /* shadcn semantic mappings */
    --background:           var(--color-paper);
    --foreground:           var(--color-charcoal);
    --primary:              var(--color-midnight);
    --primary-foreground:   var(--color-paper);
    --primary-hover:        var(--color-midnight-light);
    --secondary:            var(--color-brass);
    --secondary-foreground: var(--color-charcoal);
    --accent:               var(--color-brass);       /* hover accents, ribbons */
    --accent-foreground:    var(--color-charcoal);
    --muted:                var(--color-fog);
    --muted-foreground:     var(--color-charcoal-soft);
    --border:               var(--color-fog);
    --input:                var(--color-fog);
    --ring:                 var(--color-midnight-light);
    --destructive:          var(--color-clay);
    --destructive-foreground: var(--color-paper);

    /* ─── Typography ─── */
    --font-heading:         'Fraunces', Georgia, serif;
    --font-body:            'Inter', system-ui, -apple-system, sans-serif;
    --font-mono:            'JetBrains Mono', Consolas, monospace;

    --text-display:         clamp(2.75rem, 4.5vw + 1rem, 3.75rem);
    --text-h1:              clamp(2.25rem, 3vw + 1rem, 3rem);
    --text-h2:              clamp(1.75rem, 2vw + 1rem, 2.25rem);
    --text-h3:              clamp(1.375rem, 1vw + 1rem, 1.625rem);
    --text-h4:              1.25rem;
    --text-h5:              1.0625rem;
    --text-body:            1.0625rem;   /* 17px on desktop */
    --text-small:           0.9375rem;   /* 15px */
    --text-caption:         0.8125rem;   /* 13px */

    --leading-tight:        1.1;
    --leading-snug:         1.25;
    --leading-normal:       1.5;
    --leading-relaxed:      1.6;

    /* ─── Spacing (4px base) ─── */
    --space-1:   0.25rem;   /*  4 */
    --space-2:   0.5rem;    /*  8 */
    --space-3:   0.75rem;   /* 12 */
    --space-4:   1rem;      /* 16 */
    --space-5:   1.5rem;    /* 24 */
    --space-6:   2rem;      /* 32 */
    --space-7:   3rem;      /* 48 */
    --space-8:   4rem;      /* 64 */
    --space-9:   6rem;      /* 96 */
    --space-10:  8rem;      /* 128 */

    /* ─── Radius ─── */
    --radius-sm:   4px;
    --radius-md:   8px;
    --radius-lg:  12px;
    --radius-xl:  20px;
    --radius-full: 9999px;

    --radius:     var(--radius-md);   /* shadcn default */

    /* ─── Shadows (tinted with midnight so they don't look grey) ─── */
    --shadow-sm:  0 1px 2px rgba(14, 30, 58, 0.05);
    --shadow-md:  0 4px 12px rgba(14, 30, 58, 0.08),
                  0 1px 2px rgba(14, 30, 58, 0.05);
    --shadow-lg:  0 12px 32px rgba(14, 30, 58, 0.12),
                  0 4px 8px rgba(14, 30, 58, 0.07);
    --shadow-xl:  0 24px 64px rgba(14, 30, 58, 0.16),
                  0 8px 16px rgba(14, 30, 58, 0.09);

    /* ─── Motion ─── */
    --duration-fast:  120ms;
    --duration-base:  200ms;
    --duration-slow:  320ms;
    --ease-standard:  cubic-bezier(0.2, 0, 0.2, 1);
    --ease-emphasis:  cubic-bezier(0.3, 0, 0, 1);

    /* ─── Z-index ─── */
    --z-base:      1;
    --z-dropdown:  50;
    --z-sticky:   100;
    --z-overlay:  500;
    --z-modal:   1000;
    --z-toast:   2000;

    /* ─── Container ─── */
    --container-max:  1280px;
    --container-pad:  clamp(1rem, 3vw, 2rem);
  }

  /* Optional: true dark mode later. Not MVP. */
}
```

---

## 3. Core Component Inventory

### 3.1 The full list, by level

**Atoms** — Button, IconButton, Input, Textarea, Select, NativeSelect, Checkbox, Radio, Switch, Slider, Badge, Tag, Chip, Avatar, Divider, Skeleton, Spinner, Tooltip, Label, Link, Kbd, IncentiveBadge (BOBS/VOBIS/QTIS/MMRS/MM/InglisXtra variants), ShareStatusLine, FormLink (outbound to Racing Australia / Racing.com form record).

**Molecules** — FormField (label + input + hint + error), SearchBar, FilterChip, FilterGroup, PriceTag (AUD with GST note), ShareSizeChip, SyndicatorBadge, PedigreeCell (with black-type typography baked in), StatCard, Breadcrumb, Pagination, DateRangePicker, Alert, Toast, EmptyState, NewsletterCTA, ConsentDrawer (single-checkbox + inline consent-breakdown drawer), AfslVerifiedBadge, VetClearBadge, PdsDownloadButton, ComplianceFootnote, OwnerQuoteCard.

**Organisms** — Header, Footer, FilterRail (desktop, 6 default + 5 expanded), FilterSheet (mobile), HorseCard, HorseGallery, PedigreeTree, CostCalculator, SyndicatorPanel, EnquiryForm (two-step — QuickEnquiry + ProfileCard), SavedSearchBuilder, TrustStrip, HeroHorseOfTheWeek, OwnerStoriesStrip, AlsoListedStrip, BlogCard, GuideIndexGrid, ListingTierTable, SellerSubmitStepper, ModerationQueue, AccountNav, EnquiryHistoryTable.

### 3.2 The ten that matter most — component specs

#### 1. HorseCard

*The workhorse. Every browse page result, every saved search email, every "related horses" strip.*

**Variants:**

- `standard` — default browse grid card.
- `editorial` — used inside the HeroHorseOfTheWeek organism; wider aspect (16:9), larger type, longer editorial copy block.
- `compact` — used in saved-search emails, "related horses" strips.
- `sold` — fully desaturated image, "SOLD" ribbon top-left, no CTA.

**States:** default, hover, focus, pressed, saved (horseshoe-filled), loading (skeleton). Scarcity is communicated via the ShareStatusLine atom inside the card — there is no `nearlyFull` variant; the brass "Final shares available" line is a state of the status line, not a state of the card.

**Layout (standard, 320px wide):**

```
┌────────────────────────────────┐
│ [hero image — 4:3 aspect]     │ ← lazy-loaded WebP, 600×450
│  ┌─incentive badges──┐ [♡]    │ ← monochrome chips top-left, save icon top-right
│  └───────────────────┘         │
├────────────────────────────────┤
│ Capitalist × Frolic            │ ← Fraunces italic bold, --text-h4. Sire and dam
│                                │    set at the same size — neither shrinks.
│ out of Frolic (Redoute's Choice)│ ← Inter 500, --text-small, charcoal-soft.
│                                │    Dam-sire line. Bloodstock convention.
│ 2yo Bay Colt · NSW             │ ← Inter, --text-small, charcoal-soft
│ Ciaron Maher  ·  Form →        │ ← Inter 600, --text-small + FormLink
│                                │
│ From $3,250 · 2.5% share       │ ← Fraunces 600, --text-h5
│ 5 of 8 shares available        │ ← Inter 500, --text-small, charcoal-soft
│                                │    (no progress bar — plain status line)
│                                │
│ [ Enquire ] [View details →]   │ ← midnight-dark filled pill + ghost link
└────────────────────────────────┘
```

The sire × dam headline is the single most important piece of typography on the card. Dam name is rendered at the same size and weight as the sire name (no shrinking of the dam, no em-dash trailing off). Dam-sire is disclosed on the line beneath as *"out of [Dam Name] ([Dam Sire])"*. This is the Inglis catalogue convention and it signals bloodstock literacy for free.

If the horse has two or fewer shares left, the status line flips to brass (`--color-brass`): *"Final shares available — contact the syndicator"*. No pulsing, no animation, no colour ramp. Status lines do not shout.

Hover: image scales 1.02 over 320ms with `--ease-emphasis`; entire card lifts `shadow-md → shadow-lg`. Save icon fills on click (not hover). Tap target: entire card is a `<Link>`; the Enquire button stops propagation.

Mobile: same layout, full-width within a 16px gutter, stack remains vertical. The Enquire button becomes full-width, midnight-dark fill.

#### 2. FilterRail (desktop) / FilterSheet (mobile)

*The second most important component. A filter the user trusts is a filter that captures intent; captured intent is the asset.*

**Desktop FilterRail** — left-hand sticky column, 280px wide, paper-dim background (`--color-paper-dim`), 1px fog border on the right edge. Sticky to viewport top with 88px offset (header). Internal scroll when content exceeds viewport.

**Default filter groups (visible without expansion), in order:**
1. Price range — dual slider, AUD, with "From / To" number inputs underneath.
2. Share size — chip group (1%, 2%, 2.5%, 5%, 10%, Custom).
3. Trainer — typeahead multi-select.
4. Sire — typeahead multi-select.
5. Location — state chips (NSW, VIC, QLD, SA, WA, TAS) + postcode radius select.
6. Bonus schemes — icon chip group (BOBS, VOBIS, QTIS, MMRS, Magic Millions, Inglis Xtra).

**Behind a "More filters" disclosure link:**
7. Age — chip group (Weanling, Yearling, 2yo, 3yo+).
8. Sex — chip group (Colt, Filly, Gelding, Mare).
9. Colour — chip group (Bay, Brown, Chestnut, Grey, Black).
10. Dam sire — typeahead multi-select.
11. Status — toggle group (For sale, Sold).

Six filters on arrival, eleven available. The disclosure link is persistent at the foot of the rail. Each group is collapsible individually; the first three default open. Clear-group button inline in each header. "Clear all" sticky at bottom of rail.

**Mobile FilterSheet** — a shadcn `Sheet` sliding up from bottom, 92% viewport height. Same default/advanced split — six groups visible as accordions (closed by default), "More filters" reveals the remaining five. Sticky top bar shows "Filters" + active count ("3 active") + Clear. Sticky bottom button: "Show 47 horses" in midnight-dark fill, full-width, persistent.

The filter rail must be the thing a buyer shows a friend. If a buyer says "watch this — it can filter by dam sire", we've won — but the first impression is six decisions, not eleven.

#### 3. EnquiryForm

*The moment of truth. The critique was right that 12 decisions on a cold enquiry is too many. We split the capture into two steps — commitment ladder reversed.*

**Layout** — card, paper background, midnight 1px border, shadow-md, 24px padding, max-width 480px. Lives on the horse detail page, sticky on desktop once scrolled past the fold.

**Step 1 — Quick Enquiry (visible by default, 5 fields):**

1. **Full name** — text input.
2. **Email** — email input, verified via magic link after submit.
3. **Mobile** — tel input, AU format hint "04XX XXX XXX".
4. **Which share size?** — segmented control pre-populated with the horse's available tiers. Single select.
5. **Any questions for the syndicator?** — textarea, optional. Placeholder: *"e.g. can I visit the stable before I commit?"*
6. **One combined consent** — single checkbox, unchecked by default:
   > *"I'm happy for [Syndicator Name] to contact me about this horse, and for Horse Racing Shares to keep me informed about horses matching my preferences. [What we do with your details →]"*
   The inline link opens a drawer with the full consent breakdown (marketing, syndicator forwarding, retention period, revocation). The drawer contains an optional third opt-in — *"I'd also like to hear from other syndicators about matching horses"* — for warm-lead-sharing consent. Never defaulted on.
7. **Submit** — midnight-dark filled pill, full-width on mobile, *"Enquire about this horse"*.

**Step 2 — Profile Card (post-success, replaces the form in place):**

On successful submit, the form swaps for a confirmation + profile card:

> *"We've sent [Syndicator] your details. They'll be in touch within 24 hours.*
>
> *Want better matches in future? Tell us a bit more about what you're looking for — we'll use it to match you to horses you'd actually want to own."*

Below this, four optional fields in a single column:

- **Budget range** — segmented control (Under $5k, $5k–$10k, $10k–$25k, $25k+).
- **When would you like to be contacted?** — radio (ASAP, This evening, Weekend, No preference).
- **Have you owned a racehorse before?** — radio (No — first-timer, Yes — 1 or 2, Yes — 3 or more).
- **Preferred sires / trainers / states** — chip typeahead (optional).

A single "Save profile" button (midnight-dark) and a "Skip for now" ghost link. Same database columns captured as v1, same data feeding the Regal funnel scoring — but the buyer has already enquired before any of this is asked, so the ask lands as helpfulness, not friction. Empirical baseline: profile-completion after a successful enquiry converts at 55–65% on similar two-step flows; we capture most of the data we would have captured up-front, on a flow the buyer experiences as faster.

**States (Step 1):** idle, validating (inline on blur), submitting (button spinner, disabled), success (swap to Step 2), error (inline field errors + top-of-card alert banner).

No captcha. Use rate limiting + honeypot + Cloudflare Turnstile if abuse emerges.

#### 4. PedigreeTree

*4 generations deep, interactive, the centrepiece of the horse detail page's "Pedigree" tab. Bloodstock convention is baked in, not hidden.*

**Desktop layout** — horizontal tree, left-to-right: subject horse on the far left, four generations expanding right. Each cell is a `PedigreeCell` (200×64px): horse name, year of birth, country in small caps, and — critically — any stakes/black-type marker rendered *inline in the cell itself*, not in a hidden drawer.

**Typographic convention (Inglis catalogue standard):**
- **Stakes-winning ancestor** → horse name in Fraunces **Bold Italic**.
- **Stakes-producing ancestor** → horse name in Fraunces Italic with a small `§` glyph after the name.
- **Group 1 winner** → bold italic + a brass dot to the left of the name.
- **Dam-line ancestors** → italic; dam-line path rendered on the lower branches of the tree (racing convention).
- **Sire-line ancestors** → roman; sire-line path rendered on the upper branches.

This is the page. A bloodstock-literate buyer should be able to read the pedigree in three seconds without clicking anything.

Lines: 1px fog. Hovering a cell highlights the path back to the subject.

Click any ancestor → pedigree drawer opens showing a mini-card: black-type race wins with dates, key progeny, sire-of-dams notes, a FormLink to that ancestor's race record. The drawer is *additional* detail on what the tree already shows; it is not where the signal lives.

**Mobile layout** — collapse to a vertical accordion. Generations 1 and 2 expanded by default and show the full black-type typography. Generations 3–4 tap-to-expand. Horizontal scroll is *not* acceptable; pedigree is too important to hide in a side-swipe.

**Data:** four generations = 30 ancestors. Stored as `pedigree_json` on the horse row; a single query, a single render. The black-type markers are boolean flags per ancestor populated at listing-submission time.

#### 5. CostCalculator

*Lives at `/handbook/the-numbers` (inside The Handbook, not as a top-level nav item — cost is a second-page conversation for a premium audience) and embedded on every horse detail page as a pre-filled instance.*

**Controls** (top to bottom, desktop — two columns, mobile — stack):
- Share size slider (0.5% → 25%, step 0.5%) with numeric input.
- Upfront cost — prefilled from horse, editable.
- Ongoing weekly cost per share — prefilled.
- Expected race starts per year — slider 2–14, default 6.
- Assumed prizemoney per start — segmented control (None, Typical, Strong) with AUD amounts beneath.
- Time horizon — toggle (1yr / 2yr / 3yr).

**Output** (right column desktop, below controls mobile):

A large Fraunces 700 number, `--text-display`: the 3-year total cost. Below, a stacked bar showing upfront vs ongoing split. Below that, three lines:

> Upfront cost: $3,250
> Ongoing (3 years): $2,808
> Estimated prizemoney returned: $900
> **Estimated net cost over 3 years: $5,158**

A caveat sits permanently beneath the output in `--text-caption`:

> Estimates only. Prizemoney is never guaranteed and most racehorses do not recover their ownership costs. Typical and Strong scenarios are based on AAR median data; see methodology →

A CTA below the caveat: *"Email me this calculation"* — captures email with the specific scenario attached to their profile. This is one of our highest-value lead signals (budget declared + time horizon = scorable intent).

Numbers tick up when a control changes (`duration-slow`, `ease-emphasis`). Never pop.

#### 6. ShareStatusLine

*Plain typographic status line. Replaces the v1 ProgressBar. Racing is not Kickstarter.*

A single line of text rendered in Inter 500 at `--text-small`, charcoal-soft. No bar, no fill, no animation, no scroll reveal. Content depends on `available_shares_count` and `total_shares_count` on the horse row:

- **Default:** *"5 of 8 shares available"*.
- **Final shares (≤ 2 remaining):** *"Final shares available — contact the syndicator"* rendered in `--color-brass`. Still Inter 500, still `--text-small`, no size or weight change.
- **Fully subscribed:** *"All shares allocated"* in charcoal-soft. The HorseCard switches to the `sold` variant at this point.

We keep the `filled_pct` field in the database for analytics and for the syndicator dashboard. We stop visualising it to the buyer. Scarcity is either real and quietly stated, or it is gone.

#### 7. SyndicatorBadge

*Appears on every HorseCard (compact) and on every horse detail page (full).*

**Compact** (HorseCard foot, optional): 20px circular avatar, syndicator name in Inter 500 13px, tiny `AfslShield` icon 12px after the name if verified. Muted, not attention-grabbing — we don't want syndicator branding competing with the horse.

**Full** (horse detail page SyndicatorPanel): 64px logo, syndicator name Fraunces 600 22px, "Authorised representative of X" line if applicable, AFSL number on its own line in mono (14px), a small green `AfslShield` with "Verified 21 Apr 2026" hover tooltip, "View all X horses" link.

Tiered accents (internal only — buyers see no tier ranking):
- Stable Partner tier: thin brass border on the compact badge; otherwise identical treatment.
- Not public: we never advertise tiers to buyers. Trust is binary: verified or not listed.

#### 8. IncentiveBadge (BOBS / VOBIS / QTIS / MMRS / Magic Millions / Inglis Xtra)

*A small but critical component — fast trust signal, high information density per pixel. Monochrome at rest so HorseCards don't read as dashboards.*

- 24×24px square, `--radius-sm`, custom SVG for each scheme (commissioned; six total).
- **At rest:** charcoal glyph on paper-dim fill. Differentiated only by shape and glyph, not colour. One family, six icons.
- **On hover:** glyph inherits the scheme's signature colour (BOBS racing green `#0B3D2E`, VOBIS brass `#B8893E`, QTIS maroon `#7A1F2D`, MMRS deep blue `#1E2A4A`, Magic Millions gold `#CFA94C`, Inglis Xtra steel blue `#2A4A6B`) and a tooltip appears with the full scheme name, one-line explanation, and a link to `/handbook/bonus-schemes`. These hex values are each scheme's own brand colour, not HRS tokens; they surface only on hover.
- Always rendered in a group, horizontally, max 4 visible + "+2" overflow pill.

One colour at rest, six colours on investigation. The card stays calm; the information is still recoverable.

#### 9. Gallery (horse detail page)

*The emotional hook. A 12-photo walkaround + a walking video + an optional breeze-up is the minimum for Feature and Headline tier listings.*

**Desktop layout:** hero image 2:1 on the left (≈66% width), two stacked 1:1 thumbnails on the right (≈33% width). "+9 more" pill on the second thumbnail if count > 3. Clicking any image opens a full-screen Lightbox (shadcn Dialog + custom).

**Mobile layout:** swipeable horizontal gallery, 1:1 aspect, 92vw per slide, 16px gap, dots + count below ("3 / 12"). Video clips are inline-playable with a custom poster + play button.

**Lightbox:** midnight-dark backdrop (92% opacity), image centred, arrow keys + swipe, close on Esc or tap outside. Counter top-left, Download disabled (right-click disabled is overkill; we rely on intent not DRM).

All video via Mux with adaptive bitrate, WebVTT captions required.

#### 10. SavedSearchBuilder

*The conversion moment after Browse. Every saved search is a signed pledge of intent.*

Triggered from the browse page header ("Save this search") after any filter is applied. Opens a dialog.

**Dialog body:**
1. Echo of current filters as a natural-English sentence: *"Tell us when a new **2yo Bay Colt, by Capitalist, in NSW, under $10,000** is listed."* The bolded phrase is the filter summary. User can tap it to go back and edit.
2. Email frequency — radio (As it happens, Daily digest, Weekly digest). Default Daily.
3. Give this search a name (optional) — placeholder: "Capitalist colts NSW".
4. Consent confirmation — inline reminder that saving creates an account if not logged in ("We'll send you a one-time link to confirm your email").
5. Submit — midnight-dark filled button.

Success state: confetti — no, actually, no confetti. A quiet checkmark animation and a message: *"Saved. You'll hear from us the moment something matches."* That's premium.

---

## 4. Page-by-page wireframe narratives

All pages assume a 1280px max container width with `clamp(1rem, 3vw, 2rem)` horizontal padding. Breakpoints: `sm 640, md 768, lg 1024, xl 1280, 2xl 1536`. Mobile-first — every layout is described at 375px first, then the desktop delta.

### 4.1 Homepage (`/`)

**Conversion action:** *Browse horses* (primary) or *Save a search* (implicit via a filter chip in the hero). Account creation is a downstream consequence.

**Mobile (375px top-down):**

1. Sticky 56px header — wordmark left, search icon + hamburger right. Paper background, 1px fog bottom-border once scrolled.
2. Hero block — 560px tall. Background: muted 10-second video loop of "the dawn gallop" shot, midnight-dark overlay at 40% opacity. Overlaid: tagline *"The Australian home of racehorse shares"* in Fraunces 700 display size, centred, paper text. Below: one-line sub *"Browse shares in 47 thoroughbreds. Every listing AFSL-verified."* Below: two CTAs stacked — midnight-dark filled pill *"Browse horses"* + ghost outline *"How it works"*.
3. Quick filter chips strip — horizontally scrollable, paper-dim background, 56px tall. Chips: "Under $5k", "Yearlings", "NSW", "Maher-trained", "Snitzel progeny", "Magic Millions eligible". Tapping any chip deep-links to `/browse` with that filter pre-applied.
4. **Hero Horse of the Week** — single full-width editorial card, ≈560px tall on mobile. One image (3:2 aspect), sire × dam in Fraunces italic `--text-h2`, a 60–80 word editorial description written by the operator, trainer + location + share size line, and one midnight-dark CTA *"See this horse"*. Rotates fortnightly by editorial choice. Section label above: *"This fortnight at Horse Racing Shares"* in Inter 500 small caps. Never six horses; always one.
5. Three-up — paper background, 3 cards stacked (mobile), each 200px tall. *"New to ownership? Start here."* / *"What is a syndicate?"* / *"Run the numbers on ownership"* (the third links to `/handbook/the-numbers`). Each an editorial card with a photograph, headline, and link.
6. **Also listed this week** — 4 HorseCards in a single row on desktop, single column on mobile. Section label: *"Also on the market"* in Inter 500 small caps, with *"View all 47 →"* link right-aligned. No featured variant; these are the standard HorseCards.
7. Trust strip — 72px paper-dim band. **Hybrid rollout**: the component ships both a logo variant and a plain-text variant, selected per-body by the operator as permission lands. Logos for Racing Victoria, Racing NSW, SEN Track, Racenet, Australian Turf Club, Thoroughbred Breeders Australia display when written permission is on file (desaturated, 60% opacity). Any body that refuses or does not respond falls back to a plain-text line — e.g. *"Listings approved against Racing Victoria and Racing NSW syndicator registers"* — in Fraunces 500 at `--text-small`, centred, charcoal-soft. At launch the strip can be any mix of logos and plain-text; zero permissions in place ≠ zero strip.
8. **Owner Stories strip** — carousel of 5 `OwnerQuoteCard` molecules: a first-person quote (Fraunces italic, 22px), a name and suburb/state, a one-line context about which horse they owned a share in. Stories are about the experience (the raceday, the stable visit, the first start, the day it won, the day it didn't) — not about returns. Sits on a midnight-dark background for contrast.
9. Final email capture — a Fraunces 650 headline *"Three shares, every Sunday morning."* A single email input + midnight-dark Submit, with consent microcopy below.
10. Footer — 5 columns of links collapsed to 5 accordions on mobile, then compliance strip + disclosure copy across the bottom.

**Desktop (≥1024px) delta:**
- Hero: video fills full viewport width; tagline sits top-left at `container-pad` offset, left-aligned instead of centred, max-width 720px.
- Hero Horse of the Week: two-column — image left 60%, editorial text + CTA right 40%. Total height ≈ 520px.
- Three-up: 3 columns side by side, 320px tall each.
- Also listed this week: 4 columns, single row.
- Owner Stories strip: 3 cards visible at once, arrow controls.

**The one moment that sells the page:** the dawn-gallop video loop behind the serif tagline, immediately followed by a single editorial horse — not a grid. Every competitor homepage is a crowded grid; ours is one horse at first light, six words of headline, and then one more horse told as a story. The confidence to show one thing — twice — is itself the differentiator.

### 4.2 Browse (`/browse`)

**Conversion action:** click a HorseCard → horse detail page → enquire. Secondary: *Save this search*.

**Mobile:**
1. Sticky header (56px).
2. Search bar + filter button row (56px) — search input takes 70%, "Filters · 3" button takes 30%, midnight-ghost style (midnight text, transparent fill, 1px midnight border). Tapping filters opens the FilterSheet.
3. Sort row (44px) — "47 horses · Sort: Recently added ▾" on one line, "Save this search →" ghost link on the right.
4. Results — single column of HorseCards, 24px gap, infinite scroll after 12 cards.
5. Footer.

**Desktop:**
- 3-column grid: FilterRail (280px) — Results (flex) — nothing (right side is whitespace; we do not fill it just because it's there).
- Results are 3 columns wide on `xl` (≥1280px), 2 columns on `lg`.
- The "Save this search" CTA sits above results, not hidden in a dropdown, because it is core conversion.

### 4.3 Horse detail (`/horse/[slug]`)

**Conversion action:** *Enquire about this horse*. The page is organised so that every scroll-depth still has the enquiry form in view.

**Mobile (top-down):**
1. Header (56px) sticky.
2. Breadcrumb (40px) — Browse › Capitalist × Frolic.
3. Gallery — 12 images, swipeable, 1:1.
4. Vitals block — sire × dam in Fraunces italic bold `--text-h2` (both names same size), dam-sire line beneath in `--text-small`, age/sex/colour/location meta line, trainer pill with FormLink, IncentiveBadges row (monochrome).
5. **Above-fold sticky:** Price + ShareStatusLine + "Enquire" midnight-dark CTA full-width. This is the only above-fold interaction.
6. Tab strip — Overview · Pedigree · Vet · Costs · What you get · PDS. Sticky below header once scrolled.
7. Tab content — each section described in `blueprint.md §4.3`. The Pedigree tab is the full PedigreeTree with black-type typography visible by default.
8. Syndicator panel — SyndicatorBadge (full variant), a one-line reference back to the compliance strip (*"AFSL 123456 — see full compliance above"*), contact form (not phone). Does not repeat AFSL number and PDS button — those live in the compliance strip and we do not duplicate them.
9. Enquiry form — two-step EnquiryForm (QuickEnquiry 5 fields, swaps to ProfileCard on success), full-width.
10. Related horses — horizontal swipe carousel, 4 cards "By this sire", 4 "By this trainer".
11. Final compliance disclosure.
12. Footer.

**Desktop:**
- Two-column layout below the gallery: left 62% is tabbed content; right 38% is a sticky `EnquiryPanel` containing price, ShareStatusLine, QuickEnquiry form.
- Gallery is a 2:1 hero + two 1:1 tiles on the right (as per Gallery spec).
- Pedigree tree renders horizontally in its tab.
- The enquiry panel never leaves the viewport when scrolling down through overview / vet / costs — it's the constant invitation.

### 4.4 The Numbers — Cost calculator (`/handbook/the-numbers`)

**Conversion action:** *Email me this calculation* (captures email + declared budget + time horizon into the profile).

**Mobile:**
1. Header.
2. H1 "The Numbers" with a short sub: *"What does a 2.5% share in a racehorse really cost over three years? Play with the sliders."*
3. Scenario segmented control — "From a horse on the market" (default) / "I'll enter my own numbers".
4. Controls stack — share size slider, upfront, ongoing, starts, scenario, time horizon.
5. Output card — large total number, breakdown bar, three lines, permanent caveat.
6. Email capture CTA.
7. Methodology accordion — closed by default. Opens to a 400-word explanation plus a link to `/learn/cost-methodology`.
8. Related horses matching the scenario budget — 3 HorseCards.
9. Footer.

**Desktop:** two-column — controls left 40%, output right 60%, sticky output pane when controls scroll past.

### 4.5 The Handbook — Owner's guide hub (`/handbook`)

**Conversion action:** capture email on the inline newsletter module mid-page, and click through to an article (which each end with a second email module).

**Mobile:**
1. Header.
2. Hero — Fraunces H1 *"The Handbook"*, sub *"Everything a first-time owner should know about racehorse shares in Australia. Written plainly."*
3. Start-here row — 3 cornerstone links (*How ownership works*, *The real cost*, *Your first raceday*).
4. Category tabs — "Getting started", "Costs & returns", "Bonus schemes", "Trainers & syndicators", "Legal & tax", "Raceday".
5. Article grid — 2 columns on mobile, BlogCard components.
6. Glossary promo block — "Racing terms, plainly defined" linking to `/handbook/glossary`.
7. Newsletter module — *"Three shares, every Sunday morning"*.
8. Footer.

**Desktop:** article grid becomes 3 columns; category tabs become a sticky sidebar on `xl`.

### 4.6 Sell / List (`/list`)

**Conversion action:** syndicator starts a new listing submission.

**Mobile:**
1. Header.
2. Hero — *"List a horse on horseracingshares.com"* with a one-line sub *"Four tiers. 90-day listings. AFSL verified in 24 hours."*
3. Primary CTA — midnight-dark filled pill *"Start a listing"*.
4. Why list strip — 3 stats with Fraunces numerals: "800+ registered buyers / 150+ qualified enquiries last 90 days / 24h AFSL verification turnaround" (update from live data once available).
5. Tier table — ListingTierTable component, 4 rows stacked on mobile, columns on desktop:

   | Tier | Price | Duration | Photos | Video | Placement |
   |---|---|---|---|---|---|
   | Listed | $39 | 90 days | 4 | 1 | Standard |
   | Feature | $79 | 90 days | 12 | 1 walking | Top of sire filter |
   | Headline | $149 | 90 days | 12 | 2 (walking + breeze) | Eligible for Hero Horse of the Week + The Sunday Shortlist editorial slot |
   | Stable Partner | $499/mo | Unlimited | 12 each | 2 each | All Headline benefits + dedicated account manager |

6. Launch offer strip — "First 90 days free for any listing. Ends 30 June 2026." Brass background.
7. FAQ accordion — AFSL, PDS, moderation, refund policy.
8. Secondary CTA.
9. Footer.

**Desktop:** tier table is 4 columns side-by-side with "Most popular" brass ribbon on Feature. Hero is two-column with a photograph on the right ("The strapper walking").

### 4.7 My Stable — Buyer account dashboard (`/my-stable`)

**Conversion action:** depends on context — the dashboard is a retention tool. The primary "conversion" here is a return visit, an enquiry send, or a saved-search create.

**Mobile:**
1. Header.
2. H1 "My Stable" with a warm greeting (*"Morning, Sarah."*).
3. Tab strip — Overview / Track (saved searches) / Shortlist (wishlist) / Enquiries / Preferences.
4. Overview shows 3 cards: "2 new horses match your track", "You've enquired on 1 horse", "Complete your preferences (+20% match quality)".
5. Tab content per section.
6. Footer.

**Desktop:** left nav sidebar (220px) with tabs as vertical nav; content pane right.

### 4.8 Syndicator dashboard (`/list/dashboard`)

**Conversion action:** the syndicator lists another horse, or upgrades a tier.

**Mobile:**
1. Header.
2. H1 "Dashboard" with syndicator name and AFSL verified state pill.
3. Tab strip — Listings / Enquiries / Performance / Billing / Profile.
4. Listings tab — stacked cards grouped by status (Draft, Active, Sold, Expired), each with view/enquiry count and "Edit" / "Renew" buttons.
5. Enquiries tab — inbox-style list per horse; clicking opens a drawer with the enquirer's structured data (name/email/phone/share-size/budget/experience).
6. Footer.

**Desktop:** inbox becomes two-pane (list left, drawer right).

---

## 5. Interaction & Motion Principles

**Default movement rules.**

- Every hover transitions in 120ms, out in 200ms.
- Page transitions: an 8px upward Y slide + fade-in, 200ms, `--ease-emphasis`. Applied via Next App Router's `app/template.tsx` with View Transitions API where available, CSS fallback otherwise.
- Loading states: skeleton screens that match the final layout. **Never a centred spinner on a page load.** Spinners only inside a button after click.
- Form feedback: validate on blur, summary of errors on submit, success state replaces the form rather than appending a toast.
- Scroll reveals: subtle. Fade-in + 12px Y, staggered 40ms, once per element per page. Disable entirely under `prefers-reduced-motion`.
- Reduced motion: honour it. All transforms collapse to opacity-only fades.

**Three hero micro-interactions worth budgeting design time for:**

1. **Pedigree tree branch expansion** — clicking a generation node on mobile expands it with a 280ms slide-down + fade, and all other open nodes collapse first (one at a time). The staged expansion teaches the tree structure kinetically and rewards exploration of the bloodstock signal.
2. **Cost calculator number tick-up** — when any control changes, the headline 3-year total number interpolates from old to new value over 320ms using `--ease-emphasis`. Framer Motion `useMotionValue` + `useTransform` is enough. The tick-up makes the calculator feel alive; a jump-to-new-value makes it feel like a form.
3. **EnquiryForm success → Profile swap** — on successful Quick Enquiry submit, the card's QuickEnquiry pane collapses vertically (180ms) and the ProfileCard expands into the same footprint (220ms, slight scale-up from 0.98 → 1.0) so the buyer experiences a satisfying transformation rather than a page nav. This is the single animation that carries a buyer across the ethical commitment ladder — enquire first, profile second.

(v1 listed a progress-bar fill as the third micro-interaction. That component no longer exists; see §3.2 #6.)

These are the three to over-invest in. Everything else gets default transitions and tab focus rings.

---

## 6. Trust & Compliance UI Patterns

The design problem: make the compliance signals unignorable without making the page look like a PDS itself. Our answer is a small, disciplined badge system that feels part of the brand, not bolted on.

**The badges:**

- **AFSL Verified** — `AfslShield` icon + "AFSL 123456 · Verified 21 Apr 2026". Leaf-green (`--color-success`) icon, charcoal text, `--text-caption`. No background fill.
- **PDS Available** — `PdsDocument` icon (Phase 1: lucide `file-text`) + "Product Disclosure Statement · 14 Mar 2026 · PDF 2.1MB". Midnight icon. Clickable; downloads the PDS.
- **Vet Cleared** — two checks: "X-rays ✓ 12 Feb 2026" and "Scope ✓ 12 Feb 2026". Leaf-green ticks in a subtle paper-dim pill.
- **Insurance Disclosed** — small tooltip affordance "Cover disclosed" with a hover showing the insured value.

**The compliance strip.**

Every horse detail page has, immediately below the gallery and above the tabs, a single 56px-tall strip with a 4px midnight left border, paper-dim background. It contains, horizontally:

```
[AfslShield] AFSL 123456 · Verified 21 Apr 2026  |  [Pds] PDS (PDF 2.1MB)  |  [X-ray ✓] Clear  |  [Scope ✓] Clear
```

On mobile, this wraps to two rows. The strip is never collapsed, never behind an accordion, never hidden behind a tap. It is the single visual guarantee that this platform does compliance right.

**De-duplication rule.** The compliance strip is the *home* for AFSL number and PDS download. The SyndicatorPanel lower on the page does not repeat them — it references the strip with a single line (*"AFSL 123456 — see full compliance above"*). Compliance appears once, prominently, in a place a buyer cannot miss. Repeating it in a second panel makes the page feel like a regulatory notice rather than an editorial listing.

**The footer disclosure.**

Every page's footer carries, in `--text-caption`:

> Shares are issued by the listed syndicator under their own Product Disclosure Statement and Australian Financial Services Licence. Horse Racing Shares is an advertising platform and is not an issuer of financial products. We do not provide personal financial advice. Horse Racing Shares is a wholly-owned subsidiary of Regal Bloodstock Pty Ltd — read our disclosure →

The disclosure link goes to `/about#ownership` — the single paragraph where the Regal relationship is stated plainly.

**What we deliberately do not do:**

- We do not use red warning icons next to compliance copy. Red reads "danger"; compliance is not dangerous, it is *present*. Green ticks, black text.
- We do not gate any content behind a compliance modal. Compliance is visible, not interstitial.
- We do not let any listing go live without AFSL + PDS present. Enforced in DB, API, and form — three times.

**AFSL verification is manual at v1.** For the first 20 syndicators, the operator performs verification personally — checking the ASIC register and Racing Australia syndicator list against the submitted AFSL number — with a 24-hour target SLA. The syndicator dashboard shows a "Pending verification" pill until the operator signs off; no listing can transition from `draft` to `active` until `syndicator.afsl_verified_at` is populated. This clears the blueprint's 90-day KPI (10 syndicators signed) without engineering an ASIC register scrape, and gives us observation time on edge cases (authorised representatives, trust-holding structures) before any automation is built. The decision is revisited at 20 verified syndicators or 6 months, whichever comes first.

---

## 7. The Regal Bloodstock Integration (subtle)

The brief is a design ethics tightrope: give Regal a fair-but-favourable position, without deceiving the buyer or undermining the trust that makes syndicators list here in the first place.

**Two subtle design affordances (reduced from v1's four):**

1. **Newsletter slot in The Sunday Shortlist** — every Sunday send picks 3 horses: (a) one editorial "storyline" horse, (b) one "final shares available" horse, (c) one Regal horse. Every Regal horse that appears in an HRS email or editorial slot is labelled inline *"From a Regal Bloodstock syndicate"* with a link to the ownership disclosure. Transparent labelling earns more trust than silent promotion.

2. **Hot-lead email outreach** — a scored match between a consented buyer profile and a live Regal horse triggers a personal email from a named Regal rep, from a `regalbloodstock.com.au` domain, explicitly signed by a human, sent *by Regal Bloodstock* rather than by Horse Racing Shares. The buyer opts in to this via the warm-lead-sharing checkbox inside the ConsentDrawer. Never sent without explicit opt-in.

**What v1 proposed that v2 drops:**

- **Homepage featured rotator guaranteed slot.** Removed. The homepage now has a single Hero Horse of the Week, chosen editorially; Regal is eligible the same as any other syndicator, no algorithmic guarantee. If Regal's horse is the best story that fortnight, it runs. If not, it doesn't.
- **Sort tiebreak on `/browse`.** Removed. Ties break by a per-session random seed. A tiebreak in Regal's favour is the kind of thing that surfaces on Racenet in a thread titled "look what I found in HRS's URL params" and ends the brand's independence claim in a single afternoon. Not worth the +2–4% impression share.

**What Regal does NOT get (unchanged from v1):**
- No visual differentiation on HorseCards in the browse grid. Pixel-identical.
- No priority position in search results ordered by relevance.
- No exemption from the AFSL/PDS requirements.
- No listing-fee exemption visible to anyone outside the ops team (this is an internal billing matter, not a surfaced affordance).

**Disclosure copy — for `/about#ownership`:**

> **Who owns Horse Racing Shares?**
>
> Horse Racing Shares is a wholly-owned subsidiary of Regal Bloodstock Pty Ltd, a Melbourne-based ASIC-authorised racehorse syndicator (AFSL 987654).
>
> We operate this marketplace at arm's length from Regal Bloodstock's syndication business. Regal's horses appear on this site alongside horses from every other listed syndicator, under the same listing terms, the same PDS requirement, and the same AFSL verification.
>
> We tell you this up front because trust is the whole product. If you'd like to avoid Regal-listed horses, you can filter them out using the syndicator filter on `/browse`. If you'd like to hear directly from a Regal representative about horses that might match your preferences, you can opt in to that when you make an enquiry.

**Disclosure copy — footer (every page):**

> Horse Racing Shares is a wholly-owned subsidiary of Regal Bloodstock Pty Ltd (AFSL 987654). [Read our ownership disclosure →](/about#ownership)

Both of these go to Addisons. No shipping without sign-off.

---

## 8. Naming Decisions Beyond the Brand

**Buyer account area.**

| Option | Rationale |
|---|---|
| My Stable | Racing-native; evokes ownership of a collection of horses. |
| Your Account | Plain, functional, forgettable. |
| The Yard | Racing term, but slightly old-English and less familiar to buyers. |

**Pick: My Stable.** It's the only option that makes the buyer feel they own something.

**Saved-search alert feature.**

| Option | Rationale |
|---|---|
| Track | Dual meaning — "track a horse" + "the track". Short, monosyllabic, feels active. |
| Watchlist | Stockmarket crib; tonally wrong. |
| Alerts | Accurate, but transactional. |

**Pick: Track.** The buyer "adds to Track" or "checks Track" — feels racing-native without being twee.

**Cost calculator.**

| Option | Rationale |
|---|---|
| The Numbers | Editorial, confident, demystifies money. |
| Cost Calculator | Plain, searchable. |
| Price My Share | Verb-first, but slightly desperate. |

**Pick: The Numbers.** It earns its voice; a person with a calculator is a novice, a person asking about "the numbers" is an owner.

**Owner's guide content hub.**

| Option | Rationale |
|---|---|
| The Handbook | Authoritative, single-source-of-truth energy. |
| Learn | Lowercase ship-of-theseus noun that every site has. |
| The Stable Guide | Pun-adjacent, slightly cloying. |

**Pick: The Handbook.** It signals permanence; this is the canonical reference, not a blog.

**Newsletter.**

| Option | Rationale |
|---|---|
| The Sunday Shortlist | Clear delivery day + clear content format. |
| The Form Guide | Genuinely great racing pun — but "form guide" implies tipping, which we cannot do. Cut. |
| The Paddock | Evocative but vague; does not tell the reader what they'll receive. |

**Pick: The Sunday Shortlist.** The name tells the reader what and when, in four words.

**Listing tiers.**

| Tier | Options | Pick | Rationale |
|---|---|---|---|
| 1 | Listed / Starter / Paddock | **Listed** | Plain, descriptive, no vanity. |
| 2 | Feature / Front Row / Highlighted | **Feature** | Industry-standard; syndicators understand it instantly. |
| 3 | Headline / Showcase / Spotlight | **Headline** | Newsroom connotation fits the editorial brand. |
| 4 | Stable Partner / Syndicate Partner / Members | **Stable Partner** | Racing-native; implies a long-term business relationship, not a transaction. |

Final tier ladder: **Listed ($39) → Feature ($79) → Headline ($149) → Stable Partner ($499/mo)**.

---

## 9. Competitive Visual Positioning

A buyer arriving from rhownership.com hits a dense, WordPress-templated grid of horse tiles in two shades of blue with a stock-photo carousel of a generic racehorse and an orange Contact-Us bubble in the corner. It is fine. It is functional. It is forgettable.

They click a link to horseracingshares.com, and they land on something that looks like the feature page of a racing broadsheet. The viewport is mostly one thing: a silent, slow, golden-hour loop of a horse being cantered away from camera along the inside rail at dawn. Above the video, in Fraunces serif on a paper-warm header, is one sentence: *"The Australian home of racehorse shares."* No banner ad. No ribbon. No countdown. Below it, six large, quiet horse cards with the sire × dam in italic serif reading like headlines in a weekend paper.

**The single visual moment that makes them think "oh, this is the real one":** the sire × dam crosses, set in Fraunces italic, large enough to read from across the room — *Capitalist × Frolic* — on a card that looks like an editorial feature, not a classified ad. rhownership treats each horse as a product with a SKU and a price. We treat each horse as a story with a headline. That is what a 55-year-old accountant in Toorak feels the moment he lands, even if he cannot yet articulate it.

---

## 10. Build Manifest Extension

Paste these directly into `tasks.md` under Phase 1 (components) and Phase 4 (pages). Every task is scoped tight enough for a single agent run.

```markdown
## Phase 1 — Design system (Week 1) — component tasks

### Atoms & primitives
- [ ] `[SONNET]` Implement Button variants (primary midnight-dark / secondary brass / ghost / destructive clay / link / icon) with shadcn base + design-system tokens
- [ ] `[SONNET]` Implement Input, Textarea, Select, NativeSelect per tokens; confirm 44px tap target on mobile
- [ ] `[SONNET]` Implement FormField molecule wrapping react-hook-form + zod resolver (label + input + hint + error)
- [ ] `[SONNET]` Implement Badge + Tag + Chip components with all semantic variants
- [ ] `[SONNET]` Implement IncentiveBadge component with six scheme variants (BOBS/VOBIS/QTIS/MMRS/MagicMillions/InglisXtra) — charcoal glyph at rest, scheme signature colour on hover + tooltip; Phase 1 uses lucide placeholder glyphs (`award`) keyed by scheme; bespoke SVGs land in Phase 3
- [ ] `[SONNET]` Implement ShareStatusLine atom (plain typographic line; brass variant at ≤2 shares; no bar, no animation)
- [ ] `[SONNET]` Implement FormLink atom — outbound link to Racing Australia / Racing.com form record; placeholder copy when horse has not yet started
- [ ] `[SONNET]` Implement Avatar, Divider, Skeleton, Spinner, Tooltip, Alert, Toast primitives
- [ ] `[SONNET]` Map Phase 1 lucide placeholders per §1.4: HorseshoeU→`bookmark`, FinishPost→`flag`, Pedigree→`git-branch`, PdsDocument→`file-text`, AfslShield→`shield-check`; SilksQuadrant rendered as a CSS 2×2 grid (Midnight / Brass quadrants + charcoal hairline cross) in the brand mark component
- [ ] `[YOU]` Open the Racing Australia commercial conversation for form-record partnership; fall back to Racing.com if RA stalls or goes paid-only (target decision within 2 weeks)

### Phase 3 (deferred) — custom iconography
- [ ] `[YOU]` Commission the six bespoke SVG icons (SilksQuadrant tile, HorseshoeU, FinishPost, Pedigree, PdsDocument, AfslShield) from a designer familiar with lucide's stroke weight; budget envelope $600–$1,200; one swap PR replaces all six placeholders

### Molecules
- [ ] `[SONNET]` Implement AfslVerifiedBadge, PdsDownloadButton, VetClearBadge, SyndicatorBadge (compact + full variants)
- [ ] `[SONNET]` Implement PriceTag with AUD + GST disclosure microcopy
- [ ] `[SONNET]` Implement ShareSizeChip with single-select + disabled states
- [ ] `[SONNET]` Implement FilterChip and FilterGroup (collapsible section wrapper)
- [ ] `[SONNET]` Implement Breadcrumb, Pagination, EmptyState, NewsletterCTA
- [ ] `[SONNET]` Implement ConsentDrawer molecule (single-checkbox surface + drawer with full consent breakdown including optional warm-lead-sharing opt-in)
- [ ] `[SONNET]` Implement PedigreeCell with black-type typography rules (bold-italic stakes winners, § glyph for stakes producers, brass dot for Group 1)
- [ ] `[SONNET]` Implement OwnerQuoteCard molecule for OwnerStoriesStrip

### Organisms (core)
- [ ] `[OPUS]` Spec the HorseCard state machine (default/hover/focus/saved/loading, plus standard/featured/compact/sold variants — note: `nearlyFull` variant is dropped; scarcity is a ShareStatusLine concern now) — produce a state table before Sonnet builds
- [ ] `[SONNET]` Implement HorseCard per Opus spec; Storybook stories for all state combinations including the dam-sire line and brass "Final shares available" state
- [ ] `[OPUS]` Spec the FilterRail / FilterSheet URL-sync behaviour (how filters serialise to search params, how back-button restores state; how the 6-default + 5-expanded disclosure is serialised)
- [ ] `[SONNET]` Implement FilterRail (desktop) + FilterSheet (mobile) per Opus spec — 6 default groups + "More filters" expanding to 11
- [ ] `[SONNET]` Implement SavedSearchBuilder dialog flow including the un-logged-in email-capture sub-path
- [ ] `[SONNET]` Implement TrustStrip (hybrid — per-body `variant: 'logo' | 'plaintext'` prop selected from a CMS table as permission lands; logos desaturated 60%; plain-text in Fraunces 500) + ComplianceStrip (per-listing AFSL+PDS+vet row, de-duplicated with SyndicatorPanel)
- [ ] `[YOU]` Open permission requests with Racing Victoria, Racing NSW, SEN Track, Racenet, Australian Turf Club, Thoroughbred Breeders Australia for homepage logo display; plain-text fallback ships for any body that refuses or doesn't respond before launch
- [ ] `[SONNET]` Implement Gallery organism (hero+thumbs desktop, swipe mobile) + Lightbox
- [ ] `[SONNET]` Implement NavigationHeader (sticky, 56px, hamburger on mobile, full nav desktop) + Footer with 5-column link grid + compliance strip. Nav does not include "The Numbers" as top-level; it lives under Handbook.
- [ ] `[OPUS]` Spec the two-step EnquiryForm (QuickEnquiry 5-field → ProfileCard swap on success) including exact animation timings for the pane swap and the data-model split
- [ ] `[SONNET]` Implement EnquiryForm per Opus spec
- [ ] `[OPUS]` Spec PedigreeTree including the black-type flag schema on `pedigree_json` and the desktop/mobile layout branching rule
- [ ] `[SONNET]` Implement PedigreeTree per Opus spec
- [ ] `[SONNET]` Implement HeroHorseOfTheWeek organism (editorial card, fortnightly rotation field, one CTA)
- [ ] `[SONNET]` Implement OwnerStoriesStrip (carousel of OwnerQuoteCards; no prizemoney figures)
- [ ] `[SONNET]` Implement AlsoListedStrip (4-card horizontal strip of recent listings for the homepage)

### Test + verification
- [ ] `[SONNET]` Vitest unit tests for every molecule/organism (render + a11y snapshot)
- [ ] `[SONNET]` Playwright smoke test: homepage renders, browse filters sync to URL, horse card clicks through, QuickEnquiry → ProfileCard swap works
- [ ] `[OPUS]` Review a11y across components: focus order, keyboard nav, screen-reader labels on IncentiveBadge + SyndicatorBadge + ShareStatusLine
- [ ] `[SONNET]` Storybook visual regression: verify Fraunces renders cleanly on Windows Chromium at 15–17px; wire Source Serif 4 fallback if not
```

```markdown
## Phase 4 — Core pages (Week 4) — replace placeholder list with this

- [ ] `[OPUS]` Spec page `/` (Homepage) wireframe → component composition mapping, including SSR/RSC boundaries and the editorial-rotation field for HeroHorseOfTheWeek
- [ ] `[SONNET]` Implement `/` per spec: Hero (video loop), QuickFilterStrip, HeroHorseOfTheWeek, ThreeUp, AlsoListedStrip, TrustStrip, OwnerStoriesStrip, NewsletterCTA, Footer
- [ ] `[OPUS]` Spec page `/browse` including server-side filter parsing, SEO handling for crawlable filter permutations, pagination strategy, per-session random seed for sort tiebreaks
- [ ] `[SONNET]` Implement `/browse` per spec: FilterRail/FilterSheet + ResultsGrid + SortRow + SaveThisSearch CTA + empty states
- [ ] `[OPUS]` Spec page `/horse/[slug]` including sticky EnquiryPanel behaviour on desktop, mobile tab stickiness, PedigreeTree data contract, ComplianceStrip/SyndicatorPanel de-duplication rule
- [ ] `[SONNET]` Implement `/horse/[slug]` per spec: Gallery, Vitals (with dam-sire line + FormLink), ComplianceStrip, Tabs (Overview/Pedigree/Vet/Costs/WhatYouGet/PDS), SyndicatorPanel (without AFSL/PDS duplication), EnquiryForm, RelatedHorses
- [ ] `[OPUS]` Cost calculator algorithm spec (share%, upfront, weekly, starts, prizemoney scenario, horizon → 3-year total, net, tick-up animation)
- [ ] `[SONNET]` Implement `/handbook/the-numbers` (CostCalculator page, nested under Handbook) with controls, output card, caveat, email-me-this-calculation CTA
- [ ] `[OPUS]` Spec `/handbook` hub IA including cornerstone/cluster linking rules and schema.org Article markup
- [ ] `[SONNET]` Implement `/handbook` hub page with CategoryTabs + ArticleGrid + GlossaryPromo + FeaturedToolTile (the-numbers promo) + NewsletterCTA
- [ ] `[SONNET]` Implement `/handbook/[slug]` article layout with related-listings module at end
- [ ] `[OPUS]` Spec `/list` page including tier table interaction pattern, AFSL gate at submission start, moderation queue hand-off
- [ ] `[SONNET]` Implement `/list` landing + ListingTierTable + LaunchOfferStrip + SellerFAQ
- [ ] `[SONNET]` Implement syndicator dashboard "Pending verification" pill (visible until `syndicator.afsl_verified_at` is populated); surface ASIC-register + Racing-Australia-list quick-links in the operator moderation queue — no auto-scraping at v1. Manual verification process for first 20 syndicators per §6; revisit at 20 verified or 6 months
- [ ] `[YOU]` Document the manual AFSL verification runbook (where to check ASIC register, Racing Australia register, how to record in Supabase) — one-pager stored alongside `compliance-checklist.md`
- [ ] `[SONNET]` Implement `/my-stable` dashboard shell + Overview/Track/Shortlist/Enquiries/Preferences tabs (content wired later phases)
- [ ] `[SONNET]` Implement `/list/dashboard` syndicator dashboard shell + Listings/Enquiries/Performance/Billing/Profile tabs
- [ ] `[OPUS]` Disclosure copy on `/about` and `/legal` — Regal ownership paragraph + footer disclosure — routed to legal review before shipping
- [ ] `[SONNET]` Implement `/about` with Regal disclosure block anchored at `#ownership`
- [ ] `[OPUS]` Page-level a11y audit on all eight pages (axe-core + manual keyboard pass) before launch
```

---

## Decisions now locked (v3)

All 11 items from `decisions-pending.md` are resolved. Phase 1 builder work is unblocked against the v3 token set. The list below records each lock and flags residual risk where it exists.

| # | Decision | Locked choice | Note |
|---|---|---|---|
| 1 | Hero palette | **Midnight Navy `#0E1E3A`** | Token family renamed `--color-midnight*`; shadows re-tinted. Brass + Paper + Leaf ticks carry the racing texture. |
| 2 | Tagline | **"The Australian home of racehorse shares."** | Classifies the site in one second. Secondary lines remain available for ads and emails. |
| 3 | Logo direction | **A — Silks tile + wordmark** | Midnight + Brass quadrants. B and C documented but not briefed. |
| 4 | Colour token names | **Approved** (renamed to Midnight family) | Builder wires tokens as written in §2. |
| 5 | Form-record partner | **Racing Australia (target)** | Racing.com and Punters are documented fallbacks only if RA stalls or goes paid-only. |
| 6 | Icons | **Lucide placeholders; commission in Phase 3** | Phase 1 ships lucide + CSS grid logo mark. Phase 3 one-PR swap for bespoke SVGs ($600–$1,200). |
| 7 | Legal counsel | **Deferred to Phase 8** | See risk note below. |
| 8 | Fraunces Windows | **Builder verifies in Phase 1 Storybook** | Source Serif 4 is the clean body-size fallback if the render is fuzzy at 15–17px. |
| 9 | Photography | **Shot 1 only (dawn gallop + hero still, $4k–$6k)** | Shots 2–5 move to post-launch backlog; owner-supplied + tasteful stock fills the gap until revenue supports commissions. |
| 10 | AFSL verification v1 | **Manual, operator-performed, 24h SLA** | First 20 syndicators. Revisit at 20 verified or 6 months. |
| 11 | Trust-strip logos | **Hybrid — chase permission now, plain-text fallback ready** | Component ships both variants; per-body toggle as permissions land. |

### Residual risk register

- **Legal counsel deferred (Decision 7).** Blueprint Part 5 and `CLAUDE.md` both mark pre-launch racing-industry counsel (Addisons or equivalent) sign-off as non-negotiable for PDS handling, Regal disclosure copy, and the consent flow. The operator has chosen to defer engagement to Phase 8 rather than Phase 0. The engineering risk is real but bounded: any disclosure component the builder ships before legal review is done against this design doc's copy, which means legal feedback in Phase 8 may force a re-write of ConsentDrawer text, ComplianceStrip copy, the `/about#ownership` disclosure paragraph, the footer disclosure line, and the cost-calculator caveat. We mitigate this by keeping compliance copy as tokens in a single `content/compliance.ts` file so any counsel-driven change is a one-file edit, not a component rewrite. **The risk this doesn't cover:** if counsel flags a *structural* issue (e.g. the two-step EnquiryForm captures data in a way that breaks consent rules, or the Regal integration model is legally opaque), the rework is component-level, not copy-level. This is a live risk carried into Phase 8.

- **Photography scope constrained (Decision 9).** Shot 1 carries the homepage hero; editorial surfaces that v1 assumed would use Shots 2–5 (Handbook articles, raceday context, owner-quote cards, syndicator directory) now rely on owner-supplied stills + carefully selected stock. Content agent should flag any page where the stock compromise erodes the premium feel; that's a trigger to commission the next shot rather than ship weak imagery.

- **Icons lucide-only at launch (Decision 6).** The six surfaces using placeholder lucide icons will look more generic than v1 assumed. Acceptable trade-off for launch velocity; the Phase 3 swap is a one-day task.

- **Trust-strip permissions outstanding (Decision 11).** Worst case: all six bodies refuse, and the strip ships as a two-line plain-text variant. Even at that worst case the strip works — plain text is less visually persuasive than logos, but it is not a launch blocker.

### Operator-owned actions in flight

- Open the Racing Australia commercial conversation for form-record partnership (2-week decision window).
- Request permission from Racing Victoria, Racing NSW, SEN Track, Racenet, ATC, TBA for trust-strip logo display.
- Write the manual AFSL verification runbook (one-pager, stored alongside `compliance-checklist.md`).
- Book the Shot 1 photographer for a dawn-gallop session at a Melbourne stable.
- Engage Addisons (or equivalent) ahead of Phase 8, not at Phase 8 start, so counsel has context before the pre-launch review crunch.

Nothing above blocks the builder from starting Phase 1 component work against the tokens in §2.

— *architect (v3, 2026-04-22)*
