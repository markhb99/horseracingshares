/**
 * Zod schema for the filter_json payload stored in saved_search.filter_json
 * and used by the /browse page filter rail.
 *
 * All fields are optional — an empty object means "show everything active".
 * See docs/search/saved-search.md §2.
 */

import { z } from 'zod';

const HorseSex = z.enum(['colt', 'filly', 'gelding', 'mare', 'stallion']);

const HorseColour = z.enum([
  'bay',
  'brown',
  'chestnut',
  'grey',
  'black',
  'roan',
]);

const AgeCategory = z.enum([
  'weanling',
  'yearling',
  '2yo',
  '3yo',
  'older',
]);

const LocationState = z.enum([
  'NSW',
  'VIC',
  'QLD',
  'SA',
  'WA',
  'TAS',
  'ACT',
  'NT',
]);

const HorseStatus = z.enum(['active', 'sold']);

export const FilterJsonSchema = z.object({
  sire:           z.array(z.string()).optional(),
  dam:            z.array(z.string()).optional(),
  dam_sire:       z.array(z.string()).optional(),
  sex:            z.array(HorseSex).optional(),
  colour:         z.array(HorseColour).optional(),
  age_category:   z.array(AgeCategory).optional(),
  location_state: z.array(LocationState).optional(),
  bonus_schemes:  z.array(z.string()).optional(),
  share_pcts:     z.array(z.number()).optional(),
  trainer:        z.array(z.string()).optional(),
  price_min_cents: z.number().int().min(0).optional(),
  price_max_cents: z.number().int().min(0).optional(),
  status:         z.array(HorseStatus).optional(),
});

export type FilterJson = z.infer<typeof FilterJsonSchema>;

/**
 * Parse and validate an unknown input against FilterJsonSchema.
 * Throws a ZodError if the input is invalid.
 */
export function parseFilterJson(input: unknown): FilterJson {
  return FilterJsonSchema.parse(input);
}
