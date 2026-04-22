# Racehorse Share Marketplace — Strategic Blueprint

**Prepared for:** Regal Bloodstock
**Objective:** Build a public share-listing marketplace that (a) generates modest revenue from trainers & syndicators and (b) builds a high-intent buyer database to feed Regal Bloodstock's own syndication pipeline.
**Competitive Targets:** rhownership.com, buyaracehorse.com.au

---

## PART 1 — The Perfect Research Prompt

Use this prompt whenever you want to benchmark a competitor site (or reuse on rhownership/buyaracehorse quarterly to track their evolution). Run it with **Claude Opus 4.7** for the best output; Sonnet 4.6 is fine if cost matters. Paste it into a Claude.ai conversation with web search enabled, or drop it into a Claude Code session.

```text
ROLE
You are a senior digital-product strategist with deep expertise in (a) two-sided
online marketplaces, (b) thoroughbred racehorse syndication in Australia, and
(c) lead-generation funnels for ASIC-licensed financial product promoters.

CONTEXT
My business, Regal Bloodstock, is a Melbourne-based licensed racehorse syndicator
(AFS authorised). I am building a public marketplace website that allows any
Australian trainer or syndicator to list racehorse shares for sale. The site has
two goals, in order of priority:
  1. Capture a qualified, first-party email + phone database of prospects who
     are actively in-market for a racehorse share.
  2. Generate modest listing-fee revenue to offset operating cost.
The captured database is the real asset — it will be used to market
Regal Bloodstock's own syndicates to the highest-intent segment.

TARGET SITES FOR DEEP RESEARCH
  - https://rhownership.com/      (active, modern, powered by miStable SaaS)
  - https://buyaracehorse.com.au/ (older, lower activity)

RESEARCH TASKS
For EACH site, deliver the following, using direct fetches of at least the
home page, a category/search page, an individual horse detail page, a
"list with us / sell" page, and the FAQ/about page:

  A. BUSINESS MODEL
     - How do they make money? (listing fees, subscription, commission, ads,
       upsell to owned software, lead-gen to their own syndicate?)
     - Pricing tiers if any, with exact dollar figures.
     - Volume of current live listings.

  B. BUYER EXPERIENCE (UX)
     - Homepage hero and conversion path.
     - Search & filter capabilities (what can / cannot be filtered).
     - Listing card information density.
     - Detail page layout, media richness, call-to-action patterns.
     - Trust signals (licenses shown, testimonials, syndicator vetting).
     - Mobile experience assessment.

  C. SELLER (TRAINER / SYNDICATOR) EXPERIENCE
     - Onboarding funnel length.
     - Data fields captured per horse.
     - Listing management tools.
     - Required legal documents referenced (PDS, AFSL, etc).

  D. LEAD CAPTURE & CRM
     - At what points is a user asked for an email/phone?
     - Is buyer intent captured (preferred price, pedigree, trainer)?
     - Are inquiries handled on-platform or passed straight to the seller?
     - Newsletter / retargeting signals visible.

  E. CONTENT & SEO
     - Blog, guides, "how to become an owner" educational content.
     - Pedigree database, sire search, race incentive explainers.
     - Schema markup, page titles, sitemap structure (use tools or inspect).

  F. TECH & BRAND
     - Platform (WordPress, custom, etc).
     - Visual quality relative to premium bloodstock brands (Inglis,
       Australian Bloodstock, Coolmore).
     - Performance red flags (slow pages, broken links, dead internal pages).

  G. STRATEGIC VULNERABILITIES
     - What would a well-funded entrant exploit within 90 days?

OUTPUT FORMAT
  1. One-paragraph executive summary per site.
  2. A matrix comparing the two across all criteria above.
  3. A prioritised list of 10 exploitable gaps.
  4. Three "killer features" absent from both sites that would, if built,
     measurably accelerate lead capture for a licensed syndicator.
  5. A red-team critique of any assumption I (the client) appear to be making.

CONSTRAINTS
  - Do not invent facts. If something cannot be verified via a live fetch or
    a reliable third-party source, mark it "UNVERIFIED".
  - Flag any ASIC / Racing Australia / AFSL compliance issues you observe.
  - Be blunt. I want to beat these sites, not be polite about them.
```

---

## PART 2 — Research Findings

### 2.1 rhownership.com (Racehorse Ownership Opportunities)

**Executive Summary.** rhownership is a reasonably modern, WordPress-based listing marketplace run by an operator (Anthony) and — critically — **powered by and funnelling leads into "miStable," a horse-management SaaS platform**. The site offers three paid listing tiers ($49 / $65 / $79 per horse, 90-day listings), a steady inventory of ~30+ live thoroughbred yearlings and weanlings plus a harness section, and a "miStable 3-month free trial" upsell on every seller interaction. Most listings are sourced from a handful of repeat syndicators (Elite Thoroughbreds, Monarch Racing, Group One Thoroughbreds, Rising Sun, Ready 2 Race). It is the current market leader in Australian racehorse share listings by activity level.

**Strengths**
- **Credible syndicator mix.** Listings include horses with Gai Waterhouse, Ciaron Maher, Peter Snowden, Tony McEvoy — the Group 1 trainer names are a strong trust signal.
- **Rich listing detail.** Detail pages include pedigree narrative, x-ray/scope status, bonus-scheme eligibility (BOBS, MMRS, QTIS, VOBIS, Inglis Xtra), share-price tiers, payment plans, ongoing cost estimates, and a direct phone/email for the syndicator.
- **Incentive iconography.** Visual badges on each listing for BOBS, Magic Millions, Inglis, VOBIS, QTIS — fast scannable info.
- **Multi-tier share pricing shown upfront** (2%, 2.5%, 5%, 10%) on many listings.
- **Sell-side simplicity.** Three clear paid tiers, self-serve WooCommerce checkout, "Bulk Listings" for high-volume syndicators.
- **Dual vertical.** Both thoroughbred and harness, widening addressable market.
- **Social proof of traction.** Live stream page, strong sponsor logos (SEN Track, Hygain, Prydes, Black Horse Naturals) signal a real audience.

**Weaknesses (these are your attack surface)**
- **The database belongs to the seller, not the platform.** Every listing ends with "Contact Jeremy at 1800 998 652" — the buyer calls the syndicator directly. rhownership is **not capturing the buyer-intent record**, which is exactly the asset you want.
- **Generic enquiry CTA that goes nowhere coherent.** The "Enquire Now" button opens a basic form with no qualification fields (budget, preferred trainer, pedigree preference, location).
- **No buyer account / wishlist logged in.** No personalised alerts when a new horse matching their criteria is listed.
- **Weak search.** No filtering by sire, price range, location, trainer, gender, age range, or race-incentive scheme on the listing grid. Users scroll through ~30+ cards linearly.
- **SEO is leaving money on the table.** Page titles are generic ("Shares For Sale - Thoroughbred"). No sire-specific landing pages ("Shares in Capitalist yearlings"), no trainer hub pages, no bonus-scheme pages.
- **Zero educational content for new owners.** No "first-time owner guide", no glossary, no "what does 2.5% really cost over 3 years" calculator. This is the single biggest miss — new owners are the bulk of the addressable market and they have questions.
- **Horse names are literal placeholders.** "Un-named (Capitalist – Frolic)" — functional but loses emotional hook. A better platform could let syndicators submit a working name, nickname, or "pedigree hero" story anchor.
- **Platform dependency.** The site is "Version 5.0 | Powered by miStable" — rhownership is essentially a miStable lead-gen tool. Listings likely flow in through miStable's trainer-facing product. If you build independently, you compete against both simultaneously.
- **Mobile experience is decent but not optimised.** No PWA, no tap-to-call shortcuts, long scroll on mobile.
- **No transparent "Sold" history / track record.** Buyers can't see which horses listed here have since won races. Missing social proof.
- **Compliance posture is reactive.** Disclaimers ("seller's sole responsibility") but no visible vetting of syndicator AFSL status. A fake or unlicensed listing could slip through.
- **Advertising on own detail pages.** SEN, Hygain, Black Horse Naturals banners leak buyer attention away.
- **Single operator brand.** Anthony is the face; the brand has no institutional weight.

**Traffic Signals (UNVERIFIED — needs SimilarWeb/Ahrefs pull before you pitch backers).**

---

### 2.2 buyaracehorse.com.au

**Executive Summary.** buyaracehorse.com.au is an older (copyright 2016), increasingly abandoned-looking marketplace. Live inventory is thin (under 10 listings when researched, several marked "Sold" months ago), the advertise page is **404**, the homepage "Horse of the Week" shows a sold horse, and the "About Us" blog interview quotes an owner from multiple years back. They operate a "1% share" model (micro-shares) and have an unusual commitment: **"buyaracehorse.com.au does not earn a commission on the sale of a racehorse share"** — positioning themselves as neutral. There's a sister property "Buyaracehorse Exchange" that appears equally quiet.

**Strengths**
- **Unique 1% share position.** Clearly articulate the 1% / micro-share value proposition and the legal consequences (listed with Racing Australia, racecourse entry, prizemoney to your account).
- **Educational FAQ** that actually answers new-owner questions (raceday guest rules, racebook listing rules, monthly fee ranges).
- **Advanced search UI exists** — filters for Sire, Distance, Gender, Age, Dam Sire, Status, Colour, Bonus Schemes. In principle more filters than rhownership.
- **Clean card layout** on the listings grid (colour-coded, consistent).
- **Independent / "neutral" framing.** The "no commission" positioning is a trust play.

**Weaknesses**
- **The site is dying.** Homepage "Horse of the Week" is a sold horse. Latest listings page has sold horses mixed with live. A buyer's first impression is "is this still a business?"
- **Broken pages.** Advertise → 404. Sister property Buyaracehorse Exchange appears mostly dormant.
- **Thin inventory.** Under 10 live listings visible vs. 30+ on rhownership.
- **No premium trainers visible.** Where rhownership shows Waterhouse/Maher/Snowden, BARH shows mostly lower-profile trainers — which matters for both buyer trust and average share value.
- **No buyer account functionality.** "Wish List" button appears but tied to a login flow that is not compelling to register for.
- **Dated visual design.** Typography, button treatments, and photography quality read as circa-2016.
- **No blog activity.** Blog exists but latest-dated posts appear old; no content-marketing engine running.
- **Search UI is over-engineered for the inventory.** Advanced search filters over <10 listings feels like a broken promise.
- **Weak seller pitch.** Signup/seller flow requires creating an account before seeing any pricing or value prop. Conversion-killer.
- **Indifferent to mobile.** Layout cramps on small screens; some tap targets undersized.
- **"Independently owned" framing conflicts with any upgrade path to monetisation.** If you can't take a commission and your listing fee isn't compelling enough, you starve.

---

### 2.3 Consolidated Strengths/Weaknesses Matrix

| Dimension | rhownership.com | buyaracehorse.com.au | Your opportunity |
|---|---|---|---|
| Inventory size (live listings) | ~30+ thoroughbred + harness | <10, many sold | Win on volume via aggressive syndicator outreach + free launch tier |
| Syndicator caliber | High (Waterhouse, Maher, Snowden) | Low-mid tier | Must match or exceed — a premium brand is built on premium horses |
| Listing detail quality | Strong (pedigree narrative, x-rays, incentives, share tiers) | Basic | Match quality; add video walkthrough standard |
| Search & filter | Weak (linear scroll) | UI exists but inventory too thin | Best-in-class faceted search + saved searches + alerts |
| Buyer account / personalisation | None | Wishlist only | Mandatory account gate for any enquiry → captures data |
| Lead intelligence captured | None (pipes straight to seller) | Minimal | **Capture structured intent on every enquiry** — this is the whole point |
| Educational content | None | Some FAQ, dated blog | Build the definitive Australian owner's guide hub |
| SEO posture | Generic | Stagnant | Own sire pages, trainer hubs, bonus-scheme pages, suburb pages |
| Visual brand | Functional | Dated | Premium, editorial, race-day cinematic |
| Mobile | Adequate | Poor | Mobile-first PWA, tap-to-call, Apple Pay deposits |
| Compliance posture | Reactive disclaimer | Reactive | Proactive — verify each syndicator's AFSL before listing |
| Trust signals | Sponsor logos, trainer names | Faded | Sold/success archive, winner stories, verified owner testimonials |
| Monetisation | Listing fees ($49–$79) + miStable upsell | Listing fees (not disclosed) | Tiered listings + promoted placements + Regal Bloodstock own-horse slots |
| Hidden agenda | miStable SaaS funnel | None (to their cost) | Regal Bloodstock syndicate funnel (the real play) |

---

## PART 3 — The Strategic Opportunity

You are not building a marketplace. You are building a **lead-intelligence engine dressed as a marketplace.**

Both competitors fundamentally misunderstand what the asset is. rhownership passes every buyer straight to the syndicator's phone line — their database is a list of people who once clicked a form. buyaracehorse has abandoned the opportunity altogether. The prize sitting on the table: **every buyer who visits is a first-party, high-intent, named prospect for a financial product (racehorse share)** that Regal Bloodstock is licensed to sell. An email list of 5,000 people who have clicked "Enquire" on a share this year is worth more to Regal than any listing fee revenue.

The business model is therefore:

1. **Front door (public):** a beautiful, useful, best-in-category marketplace that attracts both syndicators (supply) and prospective owners (demand) because it's genuinely the best tool for the job in Australia.
2. **Hidden engine (private):** every buyer interaction — enquiry, filter saved, wishlist add, price-alert set, newsletter open, share viewed three times — is logged against a profile with explicit consent. This profile is scored.
3. **Monetisation Tier 1 — listing fees:** covers operating cost. Match rhownership on price but offer more value per tier.
4. **Monetisation Tier 2 — Regal Bloodstock placement:** Regal's own horses appear in the marketplace like any other, with identical UX, but get first-position placement and are promoted via email to matching buyer profiles. You are effectively **market-making on your own product**.
5. **Monetisation Tier 3 — warm lead sales/sharing (optional, disclose):** qualified leads that don't match a Regal horse can, with consent, be passed to partner syndicators as warm intros.

### Critical Compliance Caveat
In Australia, offering shares in racehorses to the public requires an **AFSL** (Australian Financial Services Licence) held by the syndicator, or operation as an Authorised Representative of one. Your marketplace is *not* the issuer — it is a classifieds/advertising platform. However:

- Every listing must have a visible PDS (Product Disclosure Statement) link and the syndicator's AFSL number. Build verification into the listing-submission flow so unlicensed listings can't go live.
- Do **not** take payment for shares through your platform. Shares must be purchased from the syndicator directly under their PDS. Your platform only handles the listing-fee payment from the syndicator.
- You can lawfully take listing fees, display advertising, and capture enquiries. You cannot give personal financial product advice. General informational content is fine.
- Obvious disclaimer throughout: "Shares are issued by the listed syndicator under their own PDS and AFSL. [Marketplace name] is an advertising platform, not an issuer of financial products."
- Get this reviewed by a racing-industry lawyer (Addisons or similar) **before launch**, not after.

---

## PART 4 — The Perfect Website Build

### 4.1 Positioning & Brand
**Working name:** "The Paddock" / "Stableshare" / "OwnTheHorse" — run a trademark and domain check. For this document I'll use **"Stableshare"** as placeholder.

**Brand pillars:**
1. **Premium but accessible** — editorial photography, race-day cinema, but the language is plain English for new owners.
2. **Independent** — visually and verbally distinct from Regal Bloodstock. (Regal is *one of* the syndicators listed, not the operator. This is critical to trust.) Legal ownership disclosure lives in the footer.
3. **Transparent** — every listing shows the AFSL number, PDS download, and full cost disclosure (share price + ongoing fees modelled over 3 years). Build trust by being the most honest site in the market.
4. **Useful** — the owner's-guide hub and cost calculator give people a reason to visit before they're ready to buy.

### 4.2 Information Architecture

```
/
├── /browse                      (faceted search, the core page)
│   ├── ?sire=Capitalist
│   ├── ?trainer=Maher
│   ├── ?price=under-5000
│   └── ?incentives=BOBS
├── /horse/[slug]                (detail page)
├── /syndicators                 (directory of licensed syndicators)
│   └── /syndicators/[slug]
├── /trainers                    (directory of trainers with horses listed)
│   └── /trainers/[slug]
├── /sires                       (sire landing pages — SEO gold)
│   └── /sires/[sire-name]
├── /learn                       (owner's guide hub)
│   ├── /learn/how-it-works
│   ├── /learn/cost-calculator
│   ├── /learn/glossary
│   ├── /learn/bonus-schemes     (BOBS, VOBIS, QTIS, MMRS explained)
│   ├── /learn/your-first-horse
│   └── /learn/blog
├── /sell                        (trainer/syndicator listing flow)
│   ├── /sell/pricing
│   ├── /sell/submit
│   └── /sell/dashboard
├── /account                     (buyer account)
│   ├── /account/alerts
│   ├── /account/wishlist
│   └── /account/enquiries
├── /about
├── /contact
└── /legal (terms, privacy, compliance)
```

### 4.3 Page-by-Page Blueprint

**Homepage.**
- Hero: 10-second cinematic race-finish video loop, muted. Overlaid: headline "Own a racehorse. From 1%." Two CTAs: *Browse 47 horses* / *How it works*.
- Below fold: 6 featured horses (paid Platinum slots; one is always a Regal horse).
- Strip: trusted logos (Racing Victoria, Racing NSW approved syndicators, SEN, racing.com).
- Three-up: "New to ownership? Start here" / "Cost calculator" / "What's a syndicate?"
- Winner reel: recent horses listed on Stableshare that have since won — with dates and prize money.
- Final CTA: email capture with "Get 3 hand-picked shares in your inbox each Sunday".

**Browse page (the money page).**
- Left rail filters, desktop; bottom-sheet filters, mobile. Filters: price range, share size (1%/2%/5%/10%), age, sex, colour, trainer, sire, dam sire, location (state + postcode radius), bonus schemes, distance aptitude, syndicator, status (for sale / nearly full / sold).
- Sort: recency, price asc/desc, popularity (view count).
- Card: hero image, sire × dam, trainer, state, share-price starting, incentive badges, "X% filled" progress bar (this is borrowed from crowdfunding — creates urgency).
- Saved search button: prominent, triggers email capture with *clear value prop* ("We'll email you the moment a new Capitalist colt is listed").

**Horse detail page.**
- Gallery: 6–12 images + walking video (required for Premium listing) + breeze-up video (optional).
- Above-fold vitals: sire/dam, age, sex, colour, location, trainer, share prices, progress bar, countdown if closing soon.
- Full pedigree tree (interactive, 4 generations).
- Bonus-scheme eligibility with tooltip explainers and prize pool amounts.
- Vet status: x-ray clean ✓, scope clean ✓, insurance details.
- Full cost breakdown: table showing share size × upfront × 12-month ongoing × 3-year total estimate.
- "What you get" checklist: racecourse entry, prizemoney bank transfer, weekly video updates, stable visits, etc.
- Syndicator block: AFSL number, PDS download button, contact form (not phone number — force the form so we capture the lead).
- Enquiry form: name, email, phone, share size interested in, budget range, preferred contact time, "Have you owned a racehorse before?" — this data is gold.
- Related horses: 4 by same sire, 4 by same trainer.
- Social: share to X/Facebook, copy link.

**Cost calculator (the SEO honey trap).**
Interactive tool: user picks share %, upfront price, weekly ongoing, race start estimate. Outputs 3-year total cost, breakeven prizemoney needed, typical Australian owner outcomes (with citation). Lives at `/learn/cost-calculator`. Massively shareable, accumulates backlinks, captures email at result stage ("Email me this calculation").

**Sell/List page (seller acquisition).**
- Three tiers, price them to beat rhownership:
  - **Basic** — $39/listing, 90 days, up to 4 photos, one video. Match their $49 tier at lower price.
  - **Premium** — $79/listing, 90 days, 12 photos, walking video + breeze video, top-of-search for sire/trainer filters. Match their $65.
  - **Platinum** — $149/listing, 90 days, everything in Premium + homepage featured + guaranteed newsletter mention + social post. Match their $79 at higher price point because you're giving more.
  - **Syndicator Partner** — $499/month, unlimited listings, dedicated account manager, API access, co-branded content. This is the Kurrinda / Monarch / Elite tier — enterprise.
- Launch promo: **first 90 days free for any listing**. Fill the marketplace.
- Seller flow: submit AFSL number → auto-verified against a list you maintain (or against ASIC register via API if feasible) → create listing → pay → goes live within 2 hours after moderation.
- Transparent "How our audience is growing" counter (registered buyers, monthly visitors) — rebuild trust each time a prospective seller lands.

**Owner's guide hub (`/learn`).**
This is your SEO moat. 30 cornerstone articles written by someone who actually knows Australian racing:
- "How much does it really cost to own 2.5% of a racehorse in Australia?"
- "BOBS vs QTIS vs VOBIS vs MMRS explained"
- "What is a PDS and why you should read it"
- "Picking a trainer: the 12 questions to ask"
- "Understanding the Racing Australia owner registration"
- "Your first raceday as an owner — what to expect"
- "When a horse wins: how prizemoney is paid to you"
- "Tax treatment of racehorse ownership in Australia"
- One per major current sire (Capitalist, Snitzel, Zoustar, I Am Invincible, etc) — updated annually.
- One per state with ownership incentives.

Each article ends with email capture + three live horse listings matching the article topic.

### 4.4 Data Model (core)

```
User
  - id, email, phone, state, postcode, created_at
  - owner_experience: enum(none, 1-2 horses, 3+)
  - consent_marketing: bool
  - consent_share_with_partners: bool
  - lead_score: int  (calculated)
  - preferences: {budget_min, budget_max, preferred_sires[], trainers[],
                  share_sizes[], distance_preferences[]}

Syndicator
  - id, name, afsl_number, afsl_verified_at, afsl_expires_at
  - authorised_rep_of (string, nullable)
  - tier: enum(basic, premium, platinum, partner)
  - contact_name, email, phone

Horse
  - id, slug, status (draft, active, sold, withdrawn)
  - syndicator_id, trainer_name, trainer_id
  - sire, dam, dam_sire, pedigree_json
  - sex, colour, foal_date, country, location_state, location_postcode
  - share_tiers: [{pct: 2.5, price: 6500, available: true}, ...]
  - ongoing_cost_weekly_per_pct: decimal
  - bonus_schemes: [BOBS, MMRS, ...]
  - incentive_badges: [url,...]
  - vet_clear: {xray, scope, date_checked}
  - images[], videos[]
  - pds_url, insurance_details
  - view_count, enquiry_count, wishlist_count
  - filled_pct (for progress bar)
  - sold_at, sold_to (nullable, obviously not displayed)

Enquiry
  - id, user_id, horse_id, syndicator_id
  - message, share_size_interested, budget_range, preferred_contact_time
  - created_at, forwarded_to_syndicator_at
  - outcome: enum(no_response, contacted, share_purchased, rejected)

SavedSearch
  - id, user_id, filter_json, email_frequency

WinnerArchive
  - horse_id, race_name, race_date, prizemoney, position, track
```

Track *everything*. This is the asset.

### 4.5 Tech Stack (opinionated, deploy-Friday-ready)

| Layer | Choice | Why |
|---|---|---|
| Frontend | **Next.js 15** (App Router, React Server Components) | SEO, speed, Vercel-native. Beats WordPress decisively. |
| Styling | Tailwind + shadcn/ui | Fast, modern, clean |
| Backend | Next.js API routes + **Supabase** (Postgres + Auth + Storage) | One stack, built-in auth, row-level security for seller dashboards |
| Search | **Typesense** or **Meilisearch** (self-hosted on Fly.io) | Faceted search with <50ms response on every filter combo |
| Email | **Resend** + **Loops** (or Customer.io for scoring) | Transactional + marketing + lead scoring in one |
| Payments | **Stripe** (for listing fees only — *never* for share purchases) | Standard |
| Analytics | **PostHog** | Product analytics + session replay + feature flags |
| Video hosting | **Mux** | Cheap, fast, streams on mobile |
| CDN/hosting | **Vercel** (front) + **Fly.io** (search, workers) | Scales automatically |
| CMS for blog | Supabase + MDX, or Sanity if non-devs will author | Your call |
| Compliance doc storage | Supabase Storage (private bucket) | PDS files, AFSL certificates |

### 4.6 Build Plan — Claude Code with Opus 4.7 + Sonnet 4.6

This is the part that directly answers your Opus/Sonnet split question. The right tool for this is **Claude Code** running in your terminal. Opus handles strategy + architecture + hard debugging. Sonnet does bulk execution. Here's how to wire it up:

**Setup (one-time):**
```bash
# Install Claude Code
npm install -g @anthropic-ai/claude-code

# In your project root, create a CLAUDE.md file (project memory)
# and an .claude/ folder for agent configs
```

**CLAUDE.md (project brief the model reads every session):**
```markdown
# Stableshare
Two-sided racehorse share marketplace for Australia.

## Stack
Next.js 15 App Router, TypeScript, Supabase, Tailwind, shadcn/ui,
Typesense, Resend, Stripe, Mux.

## Conventions
- All money in cents, stored as integers.
- All dates ISO 8601 UTC.
- Server components by default; mark 'use client' only where needed.
- Row-level security on every Supabase table.
- No share purchases through the platform — listing fees only.

## Compliance
Every horse listing must have syndicator.afsl_number and horse.pds_url
before status can be set to 'active'. Enforce in DB check constraint
AND in the API route.
```

**Model routing — use sub-agents:**

Drop this in `.claude/agents/`:

```yaml
# .claude/agents/architect.md
---
name: architect
model: claude-opus-4-7
description: Use for architecture decisions, data modelling, auth/security design, compliance-sensitive flows, complex bug diagnosis.
---
You are the senior engineer on Stableshare. Think deeply before writing.
Flag any ASIC/AFSL implications of proposed changes.
```

```yaml
# .claude/agents/builder.md
---
name: builder
model: claude-sonnet-4-6
description: Use for implementing well-specified features — CRUD pages, form components, styling, writing tests, drafting copy.
---
You implement cleanly and quickly. If requirements feel ambiguous, stop
and hand back to the architect rather than guess.
```

```yaml
# .claude/agents/content.md
---
name: content
model: claude-sonnet-4-6
description: Use for writing blog posts, horse-listing copy polish, SEO meta tags, email sequences.
---
You write in plain Australian English for first-time racehorse owners.
No jargon without a tooltip. Optimistic but compliant — never promise
returns on a racehorse share.
```

**Typical build session:**
```
You: "Architect — design the listing submission flow including AFSL verification."
  → Opus returns schema, API contract, edge cases, compliance notes.

You: "Builder — implement the /sell/submit page per the architect's spec."
  → Sonnet writes the React component, Zod schema, API route, tests.

You: "Content — write 8 owner-guide articles on bonus schemes."
  → Sonnet drafts in your voice.

You: "Architect — I'm seeing a race condition on concurrent share purchases. Diagnose."
  → Opus reasons through the transaction boundary.
```

This split gives you Opus-quality judgement where it matters (≈15–20% of tokens) and Sonnet-quality throughput everywhere else (≈80%). On a project this size, rough cost split is $400–600 architect + $1,500–2,500 builder across an 8-week MVP sprint.

### 4.7 The Regal Bloodstock Funnel (the actual objective)

Every 48 hours, a background job runs:

1. Pull all new/updated `User` profiles with `consent_marketing = true`.
2. Score each: recency, listings viewed, enquiries sent, budget declared, preferred trainers/sires, repeat visits.
3. Segment:
   - **Hot (score > 80):** Has enquired in last 14 days, budget > $5k, multiple views.
   - **Warm (50–80):** Saved searches active, opens newsletter, has not yet enquired.
   - **Cold (< 50):** Newsletter subscriber only.
4. For each of Regal Bloodstock's currently-live horses, match against hot/warm preferences.
5. Send personalised email from a Regal rep (not from Stableshare): *"Sarah, I noticed you've been looking at Capitalist yearlings in NSW. We have one you haven't seen yet — here's the PDS."* Use a human name and phone, not a marketing blast.
6. Record the outcome. Feed back into scoring.

**Crucial:** Regal's listings should appear on Stableshare *exactly like any other listing* — same template, same CTA, same syndicator contact details. The only differences invisible to users: Regal pays zero listing fee internally, gets first priority in tiebreaks, and gets the hot-lead email matching. Full disclosure of the Regal ownership relationship lives in `/about` and `/legal` — don't hide it, just don't advertise it.

### 4.8 Launch Sequence (12 weeks)

| Week | Focus | Lead model |
|---|---|---|
| 0 | Legal review (Addisons or equivalent), domain + brand work, write CLAUDE.md | You + lawyer |
| 1–2 | Architecture, data model, Supabase schema, auth, Typesense setup | Opus 4.7 (architect) |
| 3–4 | Browse + detail + homepage pages, seed 20 test listings | Sonnet 4.6 (builder) |
| 5 | Seller submission flow, AFSL verification, Stripe for listing fees | Opus 4.7 for flow, Sonnet for components |
| 6 | Buyer account, saved searches, wishlist, email alerts | Sonnet 4.6 |
| 7 | Cost calculator, owner's-guide hub (15 seed articles) | Sonnet 4.6 (content) |
| 8 | Admin dashboard for moderation + lead scoring job | Opus 4.7 |
| 9 | Pre-launch: outreach to 40 syndicators with 90-day free listing offer | You |
| 10 | Private beta with 5 friendly syndicators | You + Opus for bug triage |
| 11 | Public soft launch + first email blast + racing press outreach | You |
| 12 | Iterate on conversion | Sonnet for tweaks, Opus for surprises |

**Soft-launch KPIs (first 90 days):**
- 40 active listings
- 800 registered buyers
- 150 qualified enquiries
- 30 hot leads passed to Regal Bloodstock
- 2 share sales attributable to Regal's matched-email campaign

Hit those and you have a business.

---

## PART 5 — Red-Team Critique

Things I'd push back on if I were advising you:

1. **"Little money" + "greater objective" is a split-brain strategy.** Running two objectives simultaneously (marketplace revenue + Regal lead-gen) will pull the product in opposite directions. Every tradeoff — should we show syndicator phone numbers? should we force account creation? should Regal's horses get priority? — has a right answer for one objective and a wrong answer for the other. **Pick a primary.** I'd pick Regal-lead-gen and tune the marketplace to be genuinely useful enough that syndicators stay.

2. **Conflict-of-interest risk is real.** If you're widely perceived as "Regal's listing site pretending to be independent," competitor syndicators will refuse to list and tell their clients why. Disclose the relationship clearly. Alternatively, spin Stableshare out as a genuinely independent subsidiary with its own ABN, board, and public accounts. Friction with Regal's brand is a feature, not a bug, if the marketplace is to have credibility.

3. **rhownership is not standing still.** They're coupled to miStable — a SaaS that's growing. Expect them to close the UX gaps you exploit within 18 months. Your moat can't be features; it has to be (a) the audience relationship (email list, brand trust) and (b) content SEO that takes years to dislodge. Prioritise those, not feature parity.

4. **Content SEO is a 12-month investment with a 24-month payoff.** Don't launch expecting organic traffic in month 3. Budget for paid acquisition (Meta + Google ads targeting "how to own a racehorse" and racing publication partnerships) until the SEO compounds.

5. **The legal work is load-bearing.** One ASIC complaint could end this. Do the lawyer review before the first line of code, not after.

---

*End of blueprint. Questions, counter-arguments, and revisions welcome.*
