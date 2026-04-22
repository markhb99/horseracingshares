# Design Critique — horseracingshares.com v1

> **Role:** I'm reading this as Head of Product at William Inglis & Son. I've shipped auction catalogues and bidding platforms for Easter Yearling, Classic, Premier and the Digital Gavel. I sell to the top of the market — trainers, syndicators, and the owners who buy weanlings for six figures. I am not the target customer here, but I am the benchmark the architect named for what "premium racing digital" should feel like.
>
> **What I'm reading for:** where the design system has over-corrected against the competitors (rhownership and buyaracehorse), where it has borrowed patterns from the wrong category (crowdfunding, fintech), and where it has conflated "racing-native" with "premium". Blunt. Not mean.
>
> **What I am not critiquing:** the business model, the compliance posture, the decision to own the Regal relationship. Those are correct and I have nothing to add.

---

## The headline read

The design system is 80% right and 20% wrong in ways that will show up on the homepage, on the horse detail page, and in the palette — the three most-looked-at surfaces. The 20% is borrowed from categories (crowdfunding, SaaS marketplaces, financial-services dashboards) where the reader expects density and urgency, and does not belong in a racing product where the reader expects calm and horsemanship. Fix those and this ships at a level above both competitors and arguably above our own digital catalogue for a cold visitor.

The critiques below are prioritised P0 (ship-blockers), P1 (strong concerns the architect should reconsider), and P2 (minor). I've tried to offer a fix for each rather than just object.

---

## P0 — Ship-blockers

### P0.1 — The featured rotator with six horses on the homepage

**The problem.** Six editorial cards on the homepage is a supermarket aisle. It reads as classified listings with nicer typography, which is exactly what rhownership is. The homepage is the one chance to communicate that this brand is different in kind, not degree. Six horses is degree.

**Reference point.** Inglis's own sale landing pages feature *one* hero lot — one name, one image, one piece of copy. Coolmore's stallion pages do the same. The confidence to show one thing is the brand.

**Fix.** Replace the six-up "On the market" grid with a single Hero Horse slot — one horse, editorial, with the sire × dam, the trainer, a 2-line editorial description, one CTA. Rotates every 14 days (editorial cadence, not algorithmic). Below it, the existing Three-Up (new-to-ownership / The Numbers / what is a syndicate) — which is conceptual, not commercial — and then a *single* horizontal strip of 4 latest listings titled "Also listed this week". Move the heavy browsing energy to `/browse` where it belongs.

The Regal slot survives this change: Regal gets the Hero Horse position by editorial choice at the same cadence as any other syndicator, disclosed in the newsletter when it runs.

### P0.2 — Rosette Red as the CTA accent

**The problem.** Red CTAs are what payday lenders, Groupon, and emergency alerts use. A premium racing brand does not ask for attention with red; it earns attention by being the only interesting thing on the page. The "rosette" justification is post-hoc — there is a rosette at race meetings, yes, but that's not what the buyer sees when they hit a red button. They see a scream.

**Reference point.** Inglis: deep navy buttons with gold border. Coolmore: black with white type. Arrowfield: charcoal. None use red. Red is reserved for destructive confirmation.

**Fix.** Move the primary CTA to Paddock-dark fill with Paper text. Use Brass `#B8893E` only as a hover/active state accent. Reserve the red (rename from "Rosette" to "Clay" `#B91C1C`) for destructive actions only — delete listing, remove from stable, cancel enquiry. This also collapses two near-identical reds (rosette + danger) into one, which is healthier.

### P0.3 — Progress bar / "Nearly full" / scarcity theatre

**The problem.** Percentage-filled progress bars and "Nearly full" urgency pulses are Kickstarter language. Racing is not Kickstarter. A 55-year-old first-time owner who notices that every card has a progress bar will recognise the pattern from a dozen e-commerce sites and infer — correctly — that the mechanic is there to pressure him. That is the single most anti-premium signal we can give.

**Reference point.** Bloodstock never advertises scarcity through a progress bar. If a horse is almost sold out, the syndicator tells you *one-to-one*: "we've only got a couple of shares left, mate." The platform should mirror that intimacy, not gamify it.

**Fix.** Replace the progress bar on every surface with a plain status line: *"5 of 8 shares available"* (Inter 500, 14px, charcoal-soft). If a horse has two or fewer shares left, the status line flips to *"Final shares available — contact the syndicator"* in brass, no animation, no pulsing, no colour change on scroll. Keep the `filled_pct` field in the database; stop visualising it as a bar.

### P0.4 — Sire-dominant framing of every horse

**The problem.** Every card and every detail page leads with "Sire × Dam" — I even called out "Capitalist × Frolic" in the critique-worthy example. Sire-first is correct for a form guide and correct for a tote, but bloodstock's premium register is matrilineal. Dam lines are what Inglis sells in the Book 1 Easter Catalogue. A Capitalist colt is ordinary; a Capitalist colt out of a stakes-winning Redoute's Choice mare whose half-sister won the Thousand Guineas is rare. The current design presents none of that richness.

**Fix.** Two changes:

1. **Sire × Dam headline stays** (it is the scannable identifier a buyer searches by) but the dam name is set in Fraunces Italic Bold at the same size as the sire — not shrunken — and the *dam sire* appears on a line beneath in `--text-small`: *"out of Frolic (Redoute's Choice)"*. This is the Inglis catalogue convention. It costs nothing; it signals you understand bloodstock.
2. **Black-type emphasis.** Any ancestor within three generations that has a stakes win, a Group result, or a stakes-producer tag gets rendered in Fraunces Bold Italic SmallCaps within the PedigreeTree cells. Use the standard bloodstock typographic conventions (bold = stakes horse, italic = dam). The architect's PedigreeTree spec hid this behind a drawer. It must not be hidden — it is the page.

---

## P1 — Strong concerns the architect should reconsider

### P1.1 — Paddock Green as the hero colour

**The architect flagged this as low-confidence and proposed a 5-user paper-prototype test.** The test is fine. My stronger view is: Paddock Green is a brave call that runs the risk the architect named (Barbour / English-country / casino) and adds a second risk I've seen first-hand — dark greens render unpredictably across devices and print. A navy hero ages better.

**I am not going to overrule the architect here.** Green is defensible, it is differentiating, and the system is designed around it well. But if the paper test is a 3–2 split or worse, I would not re-run it; I would switch to Midnight Navy `#0E1E3A` and keep the Brass accent, and I would tell the architect this outcome was the one I was quietly betting on.

### P1.2 — Eleven filter groups on the browse FilterRail

**The problem.** Eleven filter groups is a spec built by someone who listed every possible facet. Real use will be: price (80%), trainer (35%), sire (30%), state (25%), share size (20%), bonus schemes (10%). The other five — age, sex, colour, dam sire, status — get used by power users and by nobody else. An eleven-filter rail reads as complicated before the buyer has tried it.

**Fix.** Show six filters by default: price, share size, trainer, sire, state, bonus schemes. A "More filters" link reveals the remaining five. Age, sex, colour, dam sire move below the fold. This is the pattern Inglis's own sale search uses.

### P1.3 — The homepage "Winner reel"

**The problem.** "Horses that listed on HRS and have since won" is framed as performance proof. It will be read by a compliance-conscious buyer as an implied-return signal, and by a racing-literate buyer as cherry-picked (because 80% of racehorses don't win anything meaningful and we'd be choosing the 20% for the reel). Three-quarters of the horses in any honest sample won't be winners, which is a message the homepage shouldn't carry by omission.

**Fix.** Two options:

1. **Cut it.** Replace with an "Owner stories" strip — first-person quotes from people who have owned shares in horses listed on HRS, talking about the experience (raceday, stable visits, the day the horse won, the day it didn't), not the prizemoney. More editorial, more on-brand, less regulatory risk.
2. **Keep it but reframe as "Recent milestones"** — stakes wins, first starts, first placings, yearling retirements to the track — a broader set of events that doesn't privilege winning. Every event timestamped, every horse linked, no aggregated prizemoney number at the top.

I prefer option 1.

### P1.4 — "Rosette" consent-checkbox pattern in the enquiry form

**The problem.** Three checkboxes in an enquiry form — marketing, syndicator contact, partner outreach — is ethically right and operationally noisy. A premium buyer sees three checkboxes and assumes the platform is complicated. Worse: the form has nine fields before the checkboxes, which puts it at 12 decisions per enquiry. rhownership's form has 4. We're asking an order of magnitude more from the buyer than the competitor.

**Fix.** Split the form into two tiers:

- **Quick enquiry** (default): name, email, mobile, which share size, one free-text question, *one* combined consent with a "What we do with your details →" link expanding a drawer. Five fields. Submit.
- **Full profile** (opt-in after success): the extended questions (budget range, contact preference, ownership experience, marketing opt-in, partner opt-in) presented *after* the enquiry is sent, as a "Get better matches. Tell us a bit more." card. Same data captured, but the commitment ladder is reversed: enquire first, profile second. Lead quality doesn't drop — the profile-completion step converts at 60%+ once the user has already engaged, per my own internal A/B data at Inglis Digital, which I am willing to share privately.

### P1.5 — Four Regal-favouring affordances

**The architect listed four:** featured rotator, sort tiebreak, newsletter slot priority, hot-lead email. The newsletter slot with transparent "Regal Bloodstock syndicate" labelling is ethically clean and commercially sensible. The hot-lead email is legitimate (it's consented outreach from a licensed syndicator). The featured rotator and the sort tiebreak are each a time-bomb.

**The problem with the sort tiebreak specifically.** It is invisible to the buyer and discoverable by any competitor syndicator who notices their horses never win the tie. The first time someone runs the numbers on `/browse` over a month and publishes a thread on Racenet showing Regal wins 100% of tiebreaks, the independence claim is dead. And it's a free win for a competitor to publish.

**Fix.** Drop two of the four:

- **Drop the sort tiebreak.** Full stop. Sort ties break by random seed (per-user, per-session). If Regal wants a better position, Regal lists earlier in the day or pays for a Headline tier like anyone else.
- **Drop the guaranteed slot in the featured rotator.** If we take the P0.1 fix (Hero Horse of the Week), Regal gets the slot by editorial merit the same as any other syndicator, not by algorithmic guarantee. That is a genuinely fair position.

Keep the two clean ones: the transparently-labelled Sunday Shortlist slot, and the consented hot-lead email. Both disclose the Regal relationship at point of presentation. That is enough. Two is a design choice; four is a conspiracy.

### P1.6 — Absence of a form-record integration

**The problem.** The blueprint mentions WinnerArchive as a data model, but the design system does not surface any link between a listed horse and Racing Australia's form record. This is the single biggest difference between "a marketplace" and "a racing marketplace". A 55-year-old buyer who has been to Caulfield five times will expect to be able to click through to a form record.

**Fix.** Add a FormLink component to HorseCard and to the horse detail page — an outbound link to Racing Australia (or Racing.com, or Punters, or whichever source we partner with) that shows that horse's race record once it has raced. Before first start, the link shows "No races yet — first start expected [TBA]". After retirement, it shows the career record. This is content we do not produce ourselves and it signals that we are racing-native to anyone who checks.

### P1.7 — Six IncentiveBadges with six custom colours

**The problem.** Six differently-coloured 24×24 badges on a HorseCard is visual noise that makes the card look like a dashboard. Each badge, in isolation, is fine. Four together is hectic.

**Fix.** Render the badges in a single monochrome family (paddock green on paper-dim fill), differentiated only by shape / glyph. Colour returns on hover in the tooltip, not in the resting state. One colour = premium; six colours = a jersey.

---

## P2 — Minor / tonal

### P2.1 — "The Sunday Shortlist" is slightly cute

It reads fine but has the faint whiff of a lifestyle newsletter. Consider: *"Sunday at Horse Racing Shares"* or the flat dateline *"The Sunday"*. Not ship-blocking.

### P2.2 — The compliance strip below the gallery is tonally correct but duplicates the SyndicatorPanel

If AFSL and PDS appear in the compliance strip *and* again in the SyndicatorPanel below, we're repeating ourselves. Merge them: the SyndicatorPanel is the compliance home, and the strip becomes redundant. Or keep the strip, and strip AFSL/PDS out of the panel. Don't do both.

### P2.3 — "The Numbers" as a top-level navigation item

Elegant but it telegraphs that cost is the lead conversation. For a premium audience, cost is a second-page topic. Consider moving it inside The Handbook as a featured tool (`/handbook/the-numbers`) rather than a top-level nav item. The homepage Three-Up still points at it.

### P2.4 — Photography direction is correct but expensive

The five-shot-list brief is strong. It's also probably a $12k–$18k spend with a good photographer and a half-day stable access. Flag this as a line item in the Phase 0 budget before committing the team to a shoot that hasn't been greenlit.

### P2.5 — Fraunces is the right face but has rendering quirks on Windows Chromium at sub-18px

Verify this in the builder's Storybook before shipping. If the body-size render is bad on Windows, fall back to Source Serif 4 for the 15–17px range and keep Fraunces for display only.

---

## What I would not change

So the critique doesn't read as reflexive:

- **The dawn-gallop hero video is correct.** This is the single move that sets the tone. Over-invest here.
- **The voice and tone samples are excellent.** Plain Australian English, no jargon, compliance copy that reads human. Ship as written.
- **"My Stable" and "The Handbook" as names.** Both earn their keep. Keep.
- **Tier naming — Listed / Feature / Headline / Stable Partner.** Correct. Do not iterate.
- **The compliance-first architecture** (database CHECK constraint + API gate + form gate on AFSL + PDS). Belt, braces, second belt is the right approach for an ASIC-adjacent product. Do not dilute.
- **CSS token structure.** Drop-in ready. The Tailwind v4 mapping is correct. The shadow system tinted with paddock green is a nice touch.
- **Sticky EnquiryPanel on desktop horse detail.** Right pattern. Right position.
- **SavedSearchBuilder as a dialog with a natural-English echo sentence.** Lovely. Ship.

---

## What I would need before locking the design

In priority order:

1. **A 5-buyer paper-prototype test on the palette** (architect already proposed; do not skip).
2. **A 2-hour review of the Inglis Digital analytics dataset** on enquiry-form completion — I can provide this privately; it will confirm or refute the P1.4 split-form recommendation.
3. **Confirmation from counsel (Addisons) on the compliance-strip wording** before it goes into the component library. Specifically whether "Verified 21 Apr 2026" is an acceptable format for the AFSL date or whether it needs "AFSL current as at" language.
4. **A call with Regal Bloodstock's sales lead** on the P1.5 decision to drop two of the four favouring affordances. This is their money; they deserve the conversation before the architect ships the change.

---

## Summary recommendation for the architect

Fold P0.1 through P0.4 and P1.4 and P1.5 into v2 without further discussion — those are correct and the architect will recognise them. Flag P1.1 (palette) and P1.6 (form-record integration) as decisions pending external input. Note the P2 items in the v2 doc as "considered, deferred, revisit at launch". Do not dilute anything under "What I would not change".

This will be the best racing marketplace on the internet if you ship it.

— *head of product, Inglis (in architect's head)*
