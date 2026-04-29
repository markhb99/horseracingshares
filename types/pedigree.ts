export type CountryCode = string;
export type Sex = 'sire' | 'dam';

export interface PedigreeNode {
  name: string;
  yob: number | null;
  country: CountryCode;
  sex: Sex;
  is_stakes_winner: boolean;
  is_stakes_producer: boolean;
  is_group1_winner: boolean;
  is_dam_line: boolean;
}

export interface PedigreeJson {
  s?: PedigreeNode; d?: PedigreeNode;
  ss?: PedigreeNode; sd?: PedigreeNode; ds?: PedigreeNode; dd?: PedigreeNode;
  sss?: PedigreeNode; ssd?: PedigreeNode; sds?: PedigreeNode; sdd?: PedigreeNode;
  dss?: PedigreeNode; dsd?: PedigreeNode; dds?: PedigreeNode; ddd?: PedigreeNode;
  ssss?: PedigreeNode; sssd?: PedigreeNode; ssds?: PedigreeNode; ssdd?: PedigreeNode;
  sdss?: PedigreeNode; sdsd?: PedigreeNode; sdds?: PedigreeNode; sddd?: PedigreeNode;
  dsss?: PedigreeNode; dssd?: PedigreeNode; dsds?: PedigreeNode; dsdd?: PedigreeNode;
  ddss?: PedigreeNode; ddsd?: PedigreeNode; ddds?: PedigreeNode; dddd?: PedigreeNode;
}

export type SlotKey =
  | 's' | 'd'
  | 'ss' | 'sd' | 'ds' | 'dd'
  | 'sss' | 'ssd' | 'sds' | 'sdd' | 'dss' | 'dsd' | 'dds' | 'ddd'
  | 'ssss' | 'sssd' | 'ssds' | 'ssdd' | 'sdss' | 'sdsd' | 'sdds' | 'sddd'
  | 'dsss' | 'dssd' | 'dsds' | 'dsdd' | 'ddss' | 'ddsd' | 'ddds' | 'dddd';

// ─── Gen-4 row ordering ──────────────────────────────────────────────────────

export const GEN4_ORDER: SlotKey[] = [
  'ssss', 'sssd', 'ssds', 'ssdd',
  'sdss', 'sdsd', 'sdds', 'sddd',
  'dsss', 'dssd', 'dsds', 'dsdd',
  'ddss', 'ddsd', 'ddds', 'dddd',
];

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Returns the CSS grid row-start (0-indexed) and rowSpan for a slot key,
 * aligned against the 16-row Gen-4 grid.
 */
export function slotPosition(key: SlotKey): { rowStart: number; rowSpan: number } {
  const depth = key.length; // 1..4
  const rowSpan = Math.pow(2, 4 - depth); // 8, 4, 2, 1
  // The first Gen-4 descendant of this slot is obtained by appending 's'
  // until we reach length 4.
  const padding = 's'.repeat(4 - depth);
  const firstDescendant = (key + padding) as SlotKey;
  const rowStart = GEN4_ORDER.indexOf(firstDescendant);
  return { rowStart, rowSpan };
}

/**
 * Returns all slot keys on the ancestry path from the root to the given slot
 * (inclusive). Used to highlight cells when a cell is hovered.
 *
 * e.g. highlightedSlots('ssd') → ['s', 'ss', 'ssd']
 */
export function highlightedSlots(key: SlotKey): SlotKey[] {
  const out: SlotKey[] = [];
  for (let i = 1; i <= key.length; i++) {
    out.push(key.slice(0, i) as SlotKey);
  }
  return out;
}

/**
 * Returns a human-readable label for a slot key.
 *
 * key `'s'`    → `''`  (the subject's parent — no label needed at Gen 1)
 * key `'ss'`   → `"Sire's sire"`
 * key `'sd'`   → `"Sire's dam"`
 * key `'ds'`   → `"Dam's sire"`
 * key `'sssd'` → `"Sire's sire's sire's dam"`
 */
export function labelForSlot(key: SlotKey): string {
  if (key.length === 0) return '';
  if (key.length === 1) return '';

  // Build possessive chain from all chars except the last, then add noun.
  const chars = key.split('');
  const noun = chars[chars.length - 1] === 's' ? 'sire' : 'dam';

  const possessives: string[] = [];
  for (let i = 0; i < chars.length - 1; i++) {
    const isFirst = i === 0;
    if (chars[i] === 's') {
      possessives.push(isFirst ? "Sire's" : "sire's");
    } else {
      possessives.push(isFirst ? "Dam's" : "dam's");
    }
  }

  return `${possessives.join(' ')} ${noun}`.trim();
}
