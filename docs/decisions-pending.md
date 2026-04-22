# Decisions Pending — your working sheet

> Mark up, strike out, scribble beside. Return it when you're done and I'll update the design system + tasks.md accordingly.
> Ordered by decide-first. Each item: question, options + consequence, my recommendation + one-line reason.

---

## BLOCKING — builder cannot start Phase 1 without these

### 1. Hero palette —  Paddock Green / Midnight Navy / Warm Putty\
**Q:** Which colour anchors the brand?  Midnight Navy
**Options:**
- **Paddock Green `#0B3D2E`** → ships the system as written; distinctive vs rhownership's blue.
- **Midnight Navy `#0E1E3A`** → safer for a financially-cautious buyer; Brass + Clay accents unchanged; 10-minute token swap.
- **Warm Putty `#D7CFC0`** → lightest option, editorial-magazine feel; requires a new hero-shade for contrast.
**Rec:** Run the 5-buyer paper test this week; if skipping, ship **Midnight Navy**.
 

### 2. Tagline lock — "The Australian home of racehorse shares"
**Q:** Do we ship this line in the homepage hero and header meta?  Yes
**Options:**
- **Approve as written** → every page can render.
- **Swap to** *"Your name on the papers"* / *"Ownership starts here."* / *"Share the paddock."* / *"Every horse, every share, one place."* → rebuild of hero copy, SEO meta, OG tags.
- **Write your own** → send me the draft.
**Rec:** **Approve as written**.
**Why:** its job is to classify the site in one second for a cold visitor; the others are marketing secondaries.

### 3. Logo direction — pick one for designer to execute
**Q:** Which of the three directions in §1.1 do we brief the designer on? Silks tile + wordmark
**Options:**
- **A — Silks tile + wordmark** → four flat colour quadrants + Fraunces wordmark; seasonally variable; works at favicon size.
- **B — Finish post + wordmark** → minimalist vertical bar + horizontal strike; quieter, less racing-native.
- **C — Pure wordmark (no mark)** → requires a real type designer; highest upside, highest downside.
**Rec:** **A — Silks tile**.
**Why:** maximum brand flexibility at minimum execution risk; any competent designer can deliver it.

### 4. Colour token names — approve or rename  Approve
**Q:** Are these the names that go into `globals.css` (and every PR from here on)?
*Paddock, Brass, Paper, Paper Dim, Charcoal, Charcoal Soft, Fog, Leaf (success), Amber (warning), Clay (destructive).*
**Options:**
- **Approve** → builder wires them in as written.
- **Rename any** → note beside the token and I'll global-replace.
**Rec:** **Approve**.
**Why:** racing-native, non-generic, and renaming later is a find-replace not a redesign.

---

## NEAR-TERM — decide within 2 weeks

### 5. Racing Australia form-record partnership
**Q:** Where do we source the per-horse race record that powers FormLink?Racing Australia
**Options:**
- ** (paid or free)** → canonical source, premium signal.
- **Racing.com** → available, some ad noise on linked pages.
- **Punters** → readily available, lowest brand fit.
- **Defer** → ship FormLink disabled with *"form record coming soon"* placeholder until a partner is signed.
**Rec:** **Book the RA commercial call this week; fall back to Racing.com if RA is slow or paid-only.**
**Why:** FormLink is Phase 4 scope but partnership conversations take 2–3 weeks and the premium tier is the one we want.

### 6. Custom SVG icon commission — budget + designer
**Q:** Who draws the six custom icons (SilksQuadrant, HorseshoeU, FinishPost, Pedigree, PdsDocument, AfslShield) and when? Placeholder on Fontello/lucide-substitutes, commission in Phase 3
**Options:**
- **Commission now (~$600–$1,200)** → IncentiveBadges and compliance badges ship finalised in Phase 1.
- **Placeholder on Fontello/lucide-substitutes, commission in Phase 3** → Phase 1 ships with lookalikes that get replaced before launch.
- **Skip custom icons entirely** → use lucide-only; lose the silks-tile logo mark.
**Rec:** **Commission now**.
**Why:** icons are on the critical path for launch trust signals and a custom set is one of the cheapest premium-reading moves on the site.

### 7. Legal counsel engagement (Addisons or equivalent)
**Q:** Do we engage counsel now for the pre-launch compliance review? no
**Options:**
- **Engage now, scoped to Phase 9 review** → counsel has time to scope; they'll review PDS handling, Regal disclosure, consent flow, consent drawer copy.
- **Wait until Phase 8** → compressed timeline, risk of rework on disclosure components already built.
**Rec:** **Engage now**.
**Why:** blueprint rule #1 (Part 5) was "legal work is load-bearing — do it before the first line of code"; we're already late.

### 8. Fraunces Windows sub-18px rendering
**Q:** Who verifies Fraunces renders cleanly on Windows Chromium at 15–17px before the type scale locks?Builder verifies in Phase 1
**Options:**
- **Builder verifies in Storybook during Phase 1; swap Source Serif 4 for body if fuzzy** → zero-risk fallback.
- **Skip the check; ship Fraunces universally** → risk of a post-launch type swap touching every page.
**Rec:** **Builder verifies in Phase 1**.
**Why:** automatic test as part of component setup; clean fallback already specified.

---

## NICE-TO-HAVE — decide before Phase 5 or later

### 9. Photography commission — scope and budget
**Q:** How much of the 5-shot list do we commission pre-launch?
**Options:**
- **All 5 shots (~$12k–$18k)** → every editorial surface is bespoke at launch.
- **Shot 1 only — dawn gallop video + hero still (~$4k–$6k)** → hero is premium, rest uses tasteful stock + owner-supplied stills.
- **Zero commission; AI-generated + owner-supplied for MVP** → cheapest, riskiest to brand.
**Rec:** **Shot 1 only at launch; rest post-launch as revenue supports**.
**Why:** one premium shot on the homepage hero carries the brand further than five mediocre ones.

### 10. AFSL verification v1 — manual vs ASIC API
**Q:** How does a syndicator get verified before their listing goes live?Manual for first 20 syndicators; revisit at volume
**Options:**
- **Manual review by the operator, 24-hour SLA** → zero engineering; operator-time bottleneck at volume.
- **ASIC register scrape or API** → engineering time; brittle if ASIC changes format; no SLA guarantee.
**Rec:** **Manual for first 20 syndicators; revisit at volume**.
**Why:** the blueprint's 90-day KPI is 10 syndicators signed — manual clears that bar and gives us observation time on edge cases.

### 11. Trust-strip logo permissions
**Q:** Do we chase formal permission from Racing Victoria, Racing NSW, SEN, Racenet, ATC, and TBA for homepage logo display? Hybrid — chase now, plain-text fallback ready
**Options:**
- **Request permission from all six now** → 2–6 weeks of back-and-forth; launch-adjacent risk.
- **Use plain-text list at launch** *(e.g., "Listings approved against Racing Victoria and Racing NSW syndicator registers")* → no permission required; less visually strong.
- **Start chasing; use plain-text fallback if any refuse** → hybrid.
**Rec:** **Hybrid — chase now, plain-text fallback ready**.
**Why:** logo strip earns trust instantly; the fallback removes it as a launch blocker.

---

## Quick-fire — things that are not decisions but I need you to do

- [ ] Schedule the 5-buyer paper-prototype test (Decision 1).
- [ ] Send me your pick on Decisions 2, 3, 4 in a reply — those can be done without any external input.
- [ ] Approve budget envelopes for Decisions 6 (icons) and 9 (photography).

Once Decisions 1–4 are locked, Phase 1 builder work can start the same day.
