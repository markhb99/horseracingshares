# PedigreeTree — implementation spec

> **Status:** v1 (Phase 4 [OPUS]).
> **Audience:** builder implementing the component.
> **References:** `docs/design-system.md` §3.2 item 4 and §4.3; `docs/db/schema.md` §3.5 (`horse.pedigree_json`); `tasks.md` line 84.
> **Scope:** the PedigreeTree organism on `/horse/[slug]` (Pedigree tab). It renders a 4-generation chart, honours Inglis black-type typography, supports hover path-highlighting, and opens a drawer on click. Everything else about the detail page is out of scope here.

---

## 1. Data shape

### 1.1 `pedigree_json` column

Already defined on `horse.pedigree_json JSONB` (schema.md §3.5). This spec locks the JSON shape.

**4 generations = 30 ancestor nodes total**, excluding the subject horse:

| Generation | Ancestor count | Positions |
|---|---|---|
| Gen 1 | 2 | sire, dam |
| Gen 2 | 4 | sire's sire, sire's dam, dam's sire, dam's dam |
| Gen 3 | 8 | eight great-grandparents |
| Gen 4 | 16 | sixteen great-great-grandparents |

The subject horse itself lives on the `horse` row (`horse.name`, `horse.sire`, `horse.dam`, etc.); `pedigree_json` stores only the ancestors. Rendering combines the two.

> **Clarification on the task brief.** The brief mentions "the subject horse + parents + grandparents + great-grandparents + great-great-grandparents" and then says "15 ancestors total". That is internally inconsistent. For this spec: **4 generations of ancestors = 30 nodes** (Inglis convention). 15 would only be 3 generations + subject. Go with 30.

### 1.2 TypeScript types — `types/pedigree.ts`

```ts
// Country codes are ISO 3166-1 alpha-3 uppercased to match horse.country (CHECK ~ '^[A-Z]{3}$').
// Use 'AUS' | 'USA' | 'GBR' | 'IRE' | 'NZ_' for common cases; we widen to string to stay tolerant
// of less-common origins while the canonical set lives in a follow-up.
export type CountryCode = string;

export type Sex = 'sire' | 'dam';

/**
 * A single ancestor node in the pedigree.
 *
 * Black-type flags are independent booleans, not an enum, because a single horse
 * can be both a stakes winner AND a stakes producer. The rendering layer decides
 * precedence (Group 1 beats bold-italic beats italic-§).
 *
 * `is_dam_line` is derived, not authored: it is true iff the node is reached
 * from the subject by at least one dam step. Stored on the node so the renderer
 * doesn't need to re-derive it per cell. The seed script sets it correctly; the
 * builder's renderer trusts it.
 */
export interface PedigreeNode {
  /** Registered name. Rendered in Fraunces italic/bold-italic per flags. */
  name: string;
  /** Year of birth. Integer, 4 digits. `null` for unknown historical ancestors. */
  yob: number | null;
  /** ISO 3166-1 alpha-3 country of registration. Rendered in small caps. */
  country: CountryCode;
  /** 'sire' or 'dam' — which role this node plays relative to its descendant. */
  sex: Sex;
  /** True if the node won a black-type (Listed or Group) race. */
  is_stakes_winner: boolean;
  /** True if the node has produced at least one black-type runner (dams). */
  is_stakes_producer: boolean;
  /** True if the node is a Group 1 winner (strict subset of stakes winners). */
  is_group1_winner: boolean;
  /** True if the node sits on the dam line of the subject horse. */
  is_dam_line: boolean;
}

/**
 * The full 30-ancestor tree stored on `horse.pedigree_json`.
 *
 * Keys follow the canonical bloodstock shorthand:
 *   s   = sire
 *   d   = dam
 *   ss  = sire's sire     sd  = sire's dam
 *   ds  = dam's sire      dd  = dam's dam
 *   sss = sire's sire's sire   … and so on
 *
 * Every key is optional at the type level so partial pedigrees render gracefully
 * (historical horses with incomplete records). The renderer shows an em-dash
 * cell for missing nodes.
 */
export interface PedigreeJson {
  // Gen 1 — parents
  s?: PedigreeNode;
  d?: PedigreeNode;

  // Gen 2 — grandparents
  ss?: PedigreeNode;  sd?: PedigreeNode;
  ds?: PedigreeNode;  dd?: PedigreeNode;

  // Gen 3 — great-grandparents
  sss?: PedigreeNode; ssd?: PedigreeNode;
  sds?: PedigreeNode; sdd?: PedigreeNode;
  dss?: PedigreeNode; dsd?: PedigreeNode;
  dds?: PedigreeNode; ddd?: PedigreeNode;

  // Gen 4 — great-great-grandparents
  ssss?: PedigreeNode; sssd?: PedigreeNode;
  ssds?: PedigreeNode; ssdd?: PedigreeNode;
  sdss?: PedigreeNode; sdsd?: PedigreeNode;
  sdds?: PedigreeNode; sddd?: PedigreeNode;
  dsss?: PedigreeNode; dssd?: PedigreeNode;
  dsds?: PedigreeNode; dsdd?: PedigreeNode;
  ddss?: PedigreeNode; ddsd?: PedigreeNode;
  ddds?: PedigreeNode; dddd?: PedigreeNode;
}

/** All valid slot keys, in render order (top-to-bottom within each generation). */
export type SlotKey =
  | 's'  | 'd'
  | 'ss' | 'sd' | 'ds' | 'dd'
  | 'sss'| 'ssd'| 'sds'| 'sdd'| 'dss'| 'dsd'| 'dds'| 'ddd'
  | 'ssss'|'sssd'|'ssds'|'ssdd'|'sdss'|'sdsd'|'sdds'|'sddd'
  | 'dsss'|'dssd'|'dsds'|'dsdd'|'ddss'|'ddsd'|'ddds'|'dddd';
```

### 1.3 Slot naming convention (UI labels)

Rendered under the ancestor name as `Small` caption, charcoal-soft. Gen 1 omits the label; Gen 2+ shows it.

| Slot | Label |
|---|---|
| `s` | (no label — sire is obvious from position) |
| `d` | (no label — dam is obvious from position) |
| `ss` | Sire's sire |
| `sd` | Sire's dam |
| `ds` | Dam's sire |
| `dd` | Dam's dam |
| `sss` | Sire's sire's sire |
| `ssd` | Sire's sire's dam |
| `sds` | Sire's dam's sire |
| `sdd` | Sire's dam's dam |
| `dss` | Dam's sire's sire |
| `dsd` | Dam's sire's dam |
| `dds` | Dam's dam's sire |
| `ddd` | Dam's dam's dam |
| Gen 4 | Compose from slot key: `ssss` → "Sire's sire's sire's sire", etc. |

Helper `labelForSlot(key: SlotKey): string` lives in `types/pedigree.ts` next to the types.

---

## 2. Tree structure and slot-to-position mapping

The tree is drawn **horizontally, left-to-right**: subject horse on the left, Gen 1 immediately right of it, Gen 4 on the far right. **Sire branches occupy the upper half, dam branches occupy the lower half.** This is Inglis catalogue convention.

Total grid:
- Rows: 16 (one per Gen 4 slot).
- Columns: 5 (subject + 4 generations).

Column 0 holds the subject horse cell (spans all 16 rows vertically, centred).
Column 1 (Gen 1): `s` spans rows 0–7, `d` spans rows 8–15.
Column 2 (Gen 2): `ss` spans 0–3, `sd` spans 4–7, `ds` spans 8–11, `dd` spans 12–15.
Column 3 (Gen 3): each node spans 2 rows.
Column 4 (Gen 4): each node spans 1 row.

A cell's vertical centre is its row-span's centre. The cell height is fixed 64px; the row height is `64px`, so a Gen 1 cell is visually centred over its 8-row span by absolute positioning (`top = spanStart * 64 + (spanLen * 64 - 64) / 2`).

### 2.1 Deterministic slot-to-row map

```ts
// One row per Gen 4 slot, in render order (upper-to-lower).
const GEN4_ORDER: SlotKey[] = [
  'ssss','sssd','ssds','ssdd','sdss','sdsd','sdds','sddd',
  'dsss','dssd','dsds','dsdd','ddss','ddsd','ddds','dddd',
];

// Returns { rowStart, rowSpan } for any slot.
function slotPosition(key: SlotKey): { rowStart: number; rowSpan: number } {
  const depth = key.length;                    // 1..4
  const rowSpan = 2 ** (4 - depth);            // 8, 4, 2, 1
  // First Gen 4 descendant of this slot:
  const firstDescendant = (key + 'sss'.slice(0, 4 - depth)) as SlotKey;
  const rowStart = GEN4_ORDER.indexOf(firstDescendant);
  return { rowStart, rowSpan };
}
```

The renderer uses `slotPosition` to place every cell absolutely inside a `position: relative` container. No CSS grid — grid's subgrid story is not worth the browser-support cost and the layout is algorithmic enough that absolute positioning is cleaner to connect with SVG.

---

## 3. Desktop layout algorithm

### 3.1 Dimensions

- Cell size: **200 × 64 px**.
- Vertical gap between sibling cells (within a generation column): **8 px**.
- Horizontal gap between generation columns: **48 px** (room for the SVG elbow connector).
- Subject-horse cell sits in its own column, 240 × 80 px (slightly larger; Fraunces H4 for the name), with 64 px right gap before Gen 1.

### 3.2 Computed container dimensions

```
rows             = 16                           (Gen 4 slots)
rowPitch         = 64 + 8 = 72 px               (cell height + vertical gap)
gridHeight       = rows * rowPitch - 8 = 1144 px   (no trailing gap)

colWidth         = 200 px
colGap           = 48 px
subjectWidth     = 240 px
subjectGap       = 64 px

gridWidth        = subjectWidth + subjectGap + 4 * colWidth + 3 * colGap
                 = 240 + 64 + 800 + 144 = 1248 px
```

1248 × 1144 fits within the 1280 container. A horizontal scroll inside the Pedigree tab is acceptable only at viewport < 1024; at ≥ 1024 the tree must fit.

### 3.3 Cell positioning

For slot `key` in column `c` (1..4):

```
x(c)           = subjectWidth + subjectGap + (c - 1) * (colWidth + colGap)
{ rowStart, rowSpan } = slotPosition(key)
spanCentrePx   = rowStart * rowPitch + (rowSpan * rowPitch - 8) / 2
y(key)         = spanCentrePx - 32           // 32 = half of 64px cell height
```

Subject cell: `x = 0, y = gridHeight / 2 - 40` (vertically centred, half of 80px).

### 3.4 SVG connectors

One full-size SVG overlay at `z-index: 0` behind the cells. Cells are `z-index: 1`. The SVG is `<svg width={gridWidth} height={gridHeight} className="pointer-events-none absolute inset-0">`.

For each parent→children connection (e.g. `s → ss, sd`), draw an **elbow path**:

```
M  parentRightX, parentCentreY
H  midX
V  upperChildCentreY         (first child)
H  childLeftX
M  midX, upperChildCentreY   (no-op move to segment break)
V  lowerChildCentreY         (second child)
H  childLeftX
```

In practice, emit one `<path>` per parent with the combined elbow:

```jsx
<path
  d={`
    M ${parentRightX} ${upperChildCentreY}
    H ${midX}
    V ${lowerChildCentreY}
    M ${midX} ${parentCentreY}
    H ${parentRightX + 0}        // no-op; keeps the single path self-consistent
  `}
  stroke="var(--color-fog)"
  strokeWidth={1}
  fill="none"
/>
```

Cleaner: emit **three paths per parent** — one horizontal stub from parent to midX, two elbow paths (midX→upper child and midX→lower child). Easier to reason about, trivially tree-shakable when highlighting the hover path (§6).

`midX = parentRightX + colGap / 2` (i.e. the midpoint of the horizontal gap between two generation columns).

**Stroke colour:** `var(--color-fog)` at rest. When part of a highlighted path (§6), `var(--color-midnight)` at `strokeWidth=1.5`. No dashed lines, no animation.

### 3.5 Rendering order in markup

```
<div className="pedigree-root relative" style={{ width: gridWidth, height: gridHeight }}>
  <svg …>                    {/* connectors — z-0 */}
    {connectors.map(...)}
  </svg>
  <PedigreeSubjectCell horseName={horseName} … />
  {(['s','d', …] as SlotKey[]).map(key => (
    <PedigreeCell key={key} node={pedigreeJson[key]} slot={key} … />
  ))}
</div>
```

---

## 4. Mobile layout

At viewport `< md` (768px) the horizontal tree collapses to a **vertical accordion**.

### 4.1 Structure

A single column of sections, top-to-bottom:

1. **Subject horse header** (not collapsible) — name in Fraunces italic-bold, dam-sire line beneath.
2. **Generation 1** — expanded by default. Shows `s` and `d` as two stacked PedigreeCells, 100% width of the tab container minus 32 px gutter.
3. **Generation 2** — expanded by default. Shows 4 cells in order `ss, sd, ds, dd`, each with its slot label as a small caption above the cell.
4. **Generation 3** — collapsed by default. Accordion header: "Great-grandparents (8)". On expand, shows 8 cells in slot order with labels.
5. **Generation 4** — collapsed by default. Accordion header: "Great-great-grandparents (16)". On expand, shows 16 cells.

### 4.2 Expand/collapse behaviour

- Use shadcn `Accordion` with `type="multiple"` so users can have Gen 3 and Gen 4 both open at once.
- Animation: shadcn default slide-down, 280 ms (matches the design-system motion rule §5 for the first hero micro-interaction).
- **Only one action per tap**: tapping the accordion trigger expands; tapping a cell inside opens the drawer. Don't nest affordances.
- No horizontal scrolling. Confirmed in the design system (§3.2 #4): "Horizontal scroll is not acceptable".

### 4.3 Collapsed state content

Each collapsed accordion header shows the section title and a count, nothing else. No preview of the first ancestor. If a buyer wants to see Gen 3, they open Gen 3.

---

## 5. Typography rules

Design-system.md §3.2 #4 specifies the Inglis conventions. Mapping to Tailwind tokens (Tailwind v4 reads the CSS vars from `app/globals.css`):

| Rule | Typography | Tailwind classes |
|---|---|---|
| Default ancestor (not stakes-flagged, sire-line) | Fraunces 600 roman | `font-heading font-semibold not-italic` |
| Dam-line ancestor (default) | Fraunces 600 italic | `font-heading font-semibold italic` |
| Stakes winner | Fraunces 700 bold-italic | `font-heading font-bold italic` |
| Stakes producer (dams only) | Fraunces 600 italic + `§` glyph | `font-heading font-semibold italic` + append `<span aria-label="stakes producer"> §</span>` |
| Group 1 winner | Stakes-winner treatment + brass bullet | `font-heading font-bold italic` prefixed by `<span aria-label="Group 1" className="inline-block w-1.5 h-1.5 rounded-full bg-[color:var(--color-brass)] mr-1.5 align-middle" />` |

### 5.1 Precedence

A single node can combine flags. Resolve in this order (most specific wins for the name styling):

1. If `is_group1_winner`: bold-italic + brass dot.
2. Else if `is_stakes_winner`: bold-italic.
3. Else if `is_stakes_producer`: italic + `§`.
4. Else: italic if `is_dam_line`, roman otherwise.

Country code on the second line is always `font-body text-[13px] uppercase tracking-wider text-[color:var(--color-charcoal-soft)]`. Year of birth is separated by a middle dot: `(AUS · 2017)`.

### 5.2 Accessibility

- Brass dot and `§` glyph must have `aria-label` as shown above. Screen readers otherwise skip them silently.
- Italic for dam-line is purely visual; it must not be the only signal — the `Small` slot label ("Sire's dam") supplies the semantic.

---

## 6. Hover path highlight

On `onMouseEnter` of a `PedigreeCell`, highlight the chain of cells + connectors from that cell **back to the subject horse**. On `onMouseLeave`, clear.

### 6.1 Path computation

For slot `key`, the ancestor path is the set of proper prefixes of `key`:

```ts
function highlightedSlots(key: SlotKey): SlotKey[] {
  const out: SlotKey[] = [];
  for (let i = 1; i <= key.length; i++) {
    out.push(key.slice(0, i) as SlotKey);
  }
  return out;
}
// highlightedSlots('ssdd') -> ['s', 'ss', 'ssd', 'ssdd']
```

The subject horse is always highlighted when any cell is hovered.

### 6.2 State management

**Local `useState<string | null>(null)` in `PedigreeTree`**. No Zustand, no context, no URL state. The hovered slot key lives on the organism; cells read from it via props.

```tsx
'use client';
const [hoveredSlot, setHoveredSlot] = useState<SlotKey | null>(null);
const highlightSet = useMemo(
  () => (hoveredSlot ? new Set(highlightedSlots(hoveredSlot)) : new Set<SlotKey>()),
  [hoveredSlot],
);
```

Pass `isHighlighted` to each cell, and the same set to the SVG connector renderer. Connectors check whether their `parent` slot is the hovered slot's direct ancestor; a connector from `s → ss` is highlighted iff `ss` (or any prefix extension) is hovered.

### 6.3 Visual treatment

Highlighted cell: `ring-1 ring-[color:var(--color-midnight)]` replaces the default `border border-[color:var(--color-fog)]`.
Highlighted connector: `stroke="var(--color-midnight)"`, `strokeWidth=1.5`.
Unhighlighted cells when any is hovered: `opacity-60`. Clear to full opacity on `onMouseLeave`.
Transition: `transition-[opacity,stroke] duration-200 ease-[cubic-bezier(0.2,0,0.2,1)]`.

Mobile: the hover path is disabled entirely. Tap-to-open-drawer is the interaction model; a stray tap must not visually commit a highlight state.

---

## 7. Click → drawer

Clicking a `PedigreeCell` opens a `PedigreeDrawer` (shadcn `Sheet`, `side="right"` on desktop, `side="bottom"` on mobile).

### 7.1 Data the drawer shows

Driven **entirely from the `PedigreeNode` fields available in `pedigree_json`** — no extra API call, no network round-trip. We are not loading a remote pedigree database for v1.

Drawer content (top-to-bottom):

1. **Ancestor name** — Fraunces italic-bold (or per flags), `--text-h3`.
2. **Slot label** — `labelForSlot(key)` in Small caption, charcoal-soft.
3. **Meta line** — `yob` + `country` + sex (`Stallion` for `sex: 'sire'`, `Mare` for `sex: 'dam'`). Em-dash for missing parts.
4. **Black-type status line** — one of:
   - "Group 1 winner" (brass dot prefix)
   - "Stakes winner"
   - "Stakes producer"
   - "Unraced / no black type on record" (fallback when no flags are true)
5. **FormLink** — the existing `FormLink` atom (Phase 1). Points to Racing Australia form guide using the ancestor's `name`. Pass-through props: `horseName={node.name}`, `country={node.country}`. If Racing Australia commercial talks are unresolved at build time (see tasks.md line 65), `FormLink` itself handles the fallback; no conditional logic in the drawer.
6. **Compliance microcopy** (only if flags present): `--text-caption` charcoal-soft — *"Black-type status recorded at listing submission. Provenance: Racing Australia catalogue or syndicator declaration."*
7. **Close** — standard `SheetClose` (top-right X + escape key).

No progeny list, no race-win list, no sire-of-dams note. The task brief explicitly says "Keep it simple". These would require a pedigree data provider we don't have.

### 7.2 State management

Drawer open/close and `selectedSlot` live in `PedigreeTree` state — same component as the hover state, different state slot:

```tsx
const [selectedSlot, setSelectedSlot] = useState<SlotKey | null>(null);
```

Cells call `onClick={() => setSelectedSlot(key)}`. `SheetContent` receives `open={selectedSlot !== null}` and `onOpenChange={(o) => !o && setSelectedSlot(null)}`.

---

## 8. Seed data format

One complete example for dev seed (`supabase/seed.sql` or the dev-seed TS script). The subject horse: a 2yo by Capitalist × Sweet Stella (Frankel) — one real Australian cross, black-type flags plausibly populated.

```json
{
  "s": {
    "name": "Capitalist",
    "yob": 2014,
    "country": "AUS",
    "sex": "sire",
    "is_stakes_winner": true,
    "is_stakes_producer": false,
    "is_group1_winner": true,
    "is_dam_line": false
  },
  "d": {
    "name": "Sweet Stella",
    "yob": 2015,
    "country": "AUS",
    "sex": "dam",
    "is_stakes_winner": false,
    "is_stakes_producer": true,
    "is_group1_winner": false,
    "is_dam_line": true
  },
  "ss": {
    "name": "Written Tycoon",
    "yob": 2002, "country": "AUS", "sex": "sire",
    "is_stakes_winner": true, "is_stakes_producer": false, "is_group1_winner": false,
    "is_dam_line": false
  },
  "sd": {
    "name": "Kipling Park",
    "yob": 2007, "country": "AUS", "sex": "dam",
    "is_stakes_winner": false, "is_stakes_producer": true, "is_group1_winner": false,
    "is_dam_line": true
  },
  "ds": {
    "name": "Frankel",
    "yob": 2008, "country": "GBR", "sex": "sire",
    "is_stakes_winner": true, "is_stakes_producer": false, "is_group1_winner": true,
    "is_dam_line": false
  },
  "dd": {
    "name": "Bright Star",
    "yob": 2009, "country": "AUS", "sex": "dam",
    "is_stakes_winner": false, "is_stakes_producer": true, "is_group1_winner": false,
    "is_dam_line": true
  },

  "sss": { "name": "Iglesia", "yob": 1997, "country": "AUS", "sex": "sire",
           "is_stakes_winner": true, "is_stakes_producer": false, "is_group1_winner": true, "is_dam_line": false },
  "ssd": { "name": "Scandinavia", "yob": 1995, "country": "AUS", "sex": "dam",
           "is_stakes_winner": false, "is_stakes_producer": true, "is_group1_winner": false, "is_dam_line": true },
  "sds": { "name": "Redoute's Choice", "yob": 1996, "country": "AUS", "sex": "sire",
           "is_stakes_winner": true, "is_stakes_producer": false, "is_group1_winner": true, "is_dam_line": false },
  "sdd": { "name": "Miss Kipling", "yob": 2000, "country": "AUS", "sex": "dam",
           "is_stakes_winner": false, "is_stakes_producer": false, "is_group1_winner": false, "is_dam_line": true },
  "dss": { "name": "Galileo", "yob": 1998, "country": "IRE", "sex": "sire",
           "is_stakes_winner": true, "is_stakes_producer": false, "is_group1_winner": true, "is_dam_line": false },
  "dsd": { "name": "Kind", "yob": 2001, "country": "IRE", "sex": "dam",
           "is_stakes_winner": true, "is_stakes_producer": true, "is_group1_winner": false, "is_dam_line": true },
  "dds": { "name": "Encosta de Lago", "yob": 1993, "country": "AUS", "sex": "sire",
           "is_stakes_winner": true, "is_stakes_producer": false, "is_group1_winner": true, "is_dam_line": false },
  "ddd": { "name": "Morning Star", "yob": 2001, "country": "AUS", "sex": "dam",
           "is_stakes_winner": false, "is_stakes_producer": true, "is_group1_winner": false, "is_dam_line": true }
  // Gen 4 — 16 nodes; for brevity the seed can stub them with shared defaults and
  // real names lifted from the same pedigree (Danehill, Sadler's Wells, etc.).
  // The builder must populate all 16 in the seed so the component renders fully.
}
```

**Dev seed helper.** Provide a `buildPedigreeJson()` factory in the seed script that:

1. Accepts a partial object keyed by slot.
2. Auto-derives `is_dam_line` from the slot key (true if any character is `d`).
3. Fills missing slots with `undefined` (not placeholder nodes) so the renderer's missing-cell branch exercises.
4. Validates the final object with a zod schema derived from `PedigreeJson` (generated by `zod-from-ts` or written by hand in `lib/db/pedigree-schema.ts`).

---

## 9. Component interface

### 9.1 `PedigreeTree`

```tsx
// components/horse/PedigreeTree.tsx
'use client';

import type { PedigreeJson } from '@/types/pedigree';

export interface PedigreeTreeProps {
  pedigreeJson: PedigreeJson;
  horseName: string;
}

export function PedigreeTree(props: PedigreeTreeProps): JSX.Element;
```

- Client component (hover + drawer state).
- No data fetching; all data comes via props.
- Fetched server-side on the horse detail page: `SELECT pedigree_json FROM horse WHERE slug = $1`, passed down.

### 9.2 `PedigreeCell`

```tsx
// components/horse/PedigreeCell.tsx
import type { PedigreeNode, SlotKey } from '@/types/pedigree';

export interface PedigreeCellProps {
  node: PedigreeNode | undefined;     // undefined → em-dash "unknown" state
  slot: SlotKey;
  isHighlighted: boolean;
  isDimmed: boolean;                  // true when another cell is hovered
  onMouseEnter: () => void;
  onMouseLeave: () => void;
  onClick: () => void;
  variant: 'tree' | 'accordion';      // desktop tree vs mobile list context
}

export function PedigreeCell(props: PedigreeCellProps): JSX.Element;
```

Empty state (node `undefined`): renders an 80%-opacity cell with name replaced by `—` and no meta line. Not interactive (no hover, no click).

### 9.3 `PedigreeDrawer`

```tsx
// components/horse/PedigreeDrawer.tsx
import type { PedigreeNode, SlotKey } from '@/types/pedigree';

export interface PedigreeDrawerProps {
  node: PedigreeNode | null;          // null when closed
  slot: SlotKey | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function PedigreeDrawer(props: PedigreeDrawerProps): JSX.Element;
```

Wraps shadcn `Sheet`. Content per §7.1.

### 9.4 Re-exports from `types/pedigree.ts`

```ts
export type { PedigreeNode, PedigreeJson, SlotKey, CountryCode, Sex };
export { labelForSlot, highlightedSlots, slotPosition, GEN4_ORDER };
```

---

## 10. Files to create

| Path | Purpose |
|---|---|
| `types/pedigree.ts` | `PedigreeNode`, `PedigreeJson`, `SlotKey` types + `labelForSlot`, `highlightedSlots`, `slotPosition`, `GEN4_ORDER` helpers. |
| `components/horse/PedigreeTree.tsx` | Organism. Desktop tree + mobile accordion branching; owns hover and drawer state. |
| `components/horse/PedigreeCell.tsx` | Atom-ish cell. Renders name + meta + black-type typography. Props-driven. |
| `components/horse/PedigreeDrawer.tsx` | shadcn Sheet wrapper + content. |
| `lib/db/pedigree-schema.ts` *(optional but recommended)* | Zod schema for `PedigreeJson` for use by the listing-submission API route and the dev-seed factory. |

### 10.1 Tests

- `types/pedigree.test.ts` — unit tests for `slotPosition`, `highlightedSlots`, `labelForSlot`. Vitest.
- `components/horse/PedigreeTree.test.tsx` — renders with a full seed; hovering a Gen 4 cell highlights four ancestors plus the subject; clicking opens the drawer; missing slot renders em-dash. Vitest + `@testing-library/react`.
- Playwright smoke in Phase 4's E2E pass: `/horse/[slug]` → click Pedigree tab → hover a cell → drawer opens on click → Escape closes.

---

## 11. Acceptance criteria

1. At viewport ≥ 1024 px, the tree renders in a single 1248 × 1144 block. No horizontal scroll inside the Pedigree tab.
2. At viewport < 768 px, the tree renders as an accordion; Gen 1 and Gen 2 are expanded on mount.
3. Every non-empty cell renders name, country code (uppercase), YoB, and slot label (Gen 2+).
4. Typography rules §5 apply correctly for all flag combinations on the seed data. Specifically: Capitalist renders bold-italic with a brass dot; Sweet Stella renders italic with `§`; a plain sire renders roman-600.
5. Hovering a cell highlights the correct 1..4 ancestor chain plus the subject; leaving clears it within 200 ms.
6. Clicking any non-empty cell opens the drawer with the correct ancestor details and a working `FormLink`.
7. Lighthouse accessibility audit on the Pedigree tab scores ≥ 95 (no missing labels on the brass dot and `§` glyph; keyboard navigation cycles cells in visual order; drawer traps focus while open).
8. A pedigree with all 30 ancestors present renders in < 50 ms (React profiler mean across 5 runs on an M1 / equivalent dev laptop). No measurable layout thrash on hover.

---

## 12. Failure modes and mitigations

| Mode | Mitigation |
|---|---|
| `pedigree_json` is missing for a horse (column NULL). | Server component passes `pedigreeJson={}`. Tree renders all cells as "unknown" em-dash, subject cell still renders. No runtime error. Tab shows an inline `EmptyState` molecule: "Pedigree not yet recorded. Contact the syndicator for more detail." |
| `pedigree_json` has malformed shape (a node missing `is_dam_line` etc.). | Optional: at API boundary (listing-submission route), validate with the zod schema in `lib/db/pedigree-schema.ts`. Reject on submit with a 422. On the render path, treat unknown shape defensively — missing boolean flags default to `false`; missing `name` → render as em-dash. Never throw. |
| Fraunces fails to load (network). | `next/font/google` already ships Georgia as fallback. Typography flags still distinguish via italic/weight; the rendering is legible. |
| Hovering a cell during the open animation of the drawer. | Drawer is a portal and captures focus; hover state on the tree continues to update harmlessly. No shared lock needed. |
| Pedigree with ≤ 2 generations (early 1900s ancestor). | Gen 3 / Gen 4 slots are `undefined` and render as em-dashes. Accordion headers on mobile still show "Great-grandparents (0 recorded)" — but this is a known edge. Seed data should prefer complete trees for any dev horse. |
| Screen reader user wants to navigate the tree. | Render cells in document order `s, d, ss, sd, …, dddd` so tab traversal reads "Sire: Capitalist" then "Dam: Sweet Stella" then the generations in bloodstock-canonical order. Add `aria-label` per cell: `${labelForSlot(slot)}: ${node.name}, ${node.country} ${node.yob}`. |
| RSC/CSR split: tree is client-side due to hover/drawer; pedigree data should not force the parent page off RSC. | Parent horse detail page is a Server Component, fetches `pedigree_json`, passes as prop into the client `PedigreeTree`. No dynamic import needed. |
| XSS via `pedigree_json.name`. | React text interpolation escapes it. No `dangerouslySetInnerHTML` anywhere in this component tree. The listing-submission API route must still sanitise — covered in the listing-submission spec, not here. |

---

## 13. Handoff to builder

Implement in this order so you can validate incrementally:

1. `types/pedigree.ts` — types + helpers + `labelForSlot` + `slotPosition` + `highlightedSlots`. Unit-test helpers first.
2. Dev seed factory updated to produce a full 30-node pedigree for at least two horses.
3. `PedigreeCell.tsx` — render a single cell with typography rules. Storybook story cycling through the four flag combinations and the empty state.
4. `PedigreeTree.tsx` desktop branch — absolute-positioned cells + SVG connectors. No hover / drawer yet. Confirm dimensions match §3.2.
5. Add hover path highlighting (§6).
6. `PedigreeDrawer.tsx` + wire click→open. Confirm `FormLink` integration.
7. Mobile accordion branch (§4). Confirm on 375 px viewport.
8. Tests (§10.1).

Do not expand scope beyond §10 files. If a requirement is ambiguous after reading this doc, bounce back to the architect before guessing — particularly on the `is_dam_line` derivation or any black-type flag precedence.

*— architect, 2026-04-25*
