import Typesense from 'typesense'

const client = new Typesense.Client({
  nodes: [{
    host: process.env.TYPESENSE_HOST!,
    port: Number(process.env.TYPESENSE_PORT ?? 8108),
    protocol: (process.env.TYPESENSE_PROTOCOL ?? 'http') as 'http' | 'https',
  }],
  apiKey: process.env.TYPESENSE_API_KEY!,
  connectionTimeoutSeconds: 10,
})

const schema = {
  name: 'horses',
  enable_nested_fields: true,
  default_sorting_field: 'created_at_unix',
  fields: [
    { name: 'id',           type: 'string' },
    { name: 'slug',         type: 'string' },
    { name: 'name',         type: 'string', optional: true, infix: true },
    { name: 'status',       type: 'string', facet: true },

    { name: 'sire',         type: 'string', facet: true, infix: true },
    { name: 'dam',          type: 'string', facet: true, infix: true },
    { name: 'dam_sire',     type: 'string', facet: true, optional: true },

    { name: 'sex',          type: 'string', facet: true },
    { name: 'colour',       type: 'string', facet: true, optional: true },
    { name: 'foal_date',    type: 'string', optional: true },
    { name: 'foal_year',    type: 'int32',  facet: true, optional: true },
    { name: 'age_category', type: 'string', facet: true },

    { name: 'location_state',    type: 'string', facet: true },
    { name: 'location_postcode', type: 'string', optional: true },

    { name: 'syndicator_id',        type: 'string', facet: true },
    { name: 'syndicator_slug',      type: 'string' },
    { name: 'syndicator_name',      type: 'string', facet: true },
    { name: 'syndicator_tier',      type: 'string', facet: true },
    { name: 'is_regal_owned',       type: 'bool',   facet: true },

    { name: 'primary_trainer_id',   type: 'string', facet: true, optional: true },
    { name: 'primary_trainer_name', type: 'string', facet: true, optional: true },

    { name: 'price_min_cents',      type: 'int64', sort: true },
    { name: 'price_max_cents',      type: 'int64', sort: true },
    { name: 'price_per_pct_cents',  type: 'int64', sort: true, optional: true },
    { name: 'price_bucket',         type: 'string', facet: true },
    { name: 'share_pcts_available', type: 'float[]', facet: true },
    { name: 'ongoing_cost_cents_per_pct_per_week', type: 'int32', sort: true, optional: true },

    { name: 'total_shares_remaining', type: 'float', sort: true },
    { name: 'has_final_shares',       type: 'bool',  facet: true },

    { name: 'bonus_schemes',  type: 'string[]', facet: true, optional: true },

    { name: 'vet_xray_clear',  type: 'bool', facet: true, optional: true },
    { name: 'vet_scope_clear', type: 'bool', facet: true, optional: true },

    { name: 'created_at_unix',   type: 'int64', sort: true },
    { name: 'submitted_at_unix', type: 'int64', sort: true, optional: true },
    { name: 'view_count',        type: 'int32', sort: true },
    { name: 'enquiry_count',     type: 'int32', sort: true },

    { name: 'hero_image_path', type: 'string', optional: true, index: false },
    { name: 'description',     type: 'string', optional: true, index: false },
  ] as object[],
}

const synonyms = [
  { id: 'age-2yo',     root: '2yo',     synonyms: ['two year old', 'two-year-old', 'two years old'] },
  { id: 'age-3yo',     root: '3yo',     synonyms: ['three year old', 'three-year-old', 'three years old'] },
  { id: 'age-yearling',root: 'yearling',synonyms: ['weanling'] },
  { id: 'sex-colt',    root: 'colt',    synonyms: ['c'] },
  { id: 'sex-filly',   root: 'filly',   synonyms: ['f'] },
  { id: 'sex-gelding', root: 'gelding', synonyms: ['g'] },
  { id: 'sex-mare',    root: 'mare',    synonyms: ['m'] },
  { id: 'bonus-bobs',  root: 'BOBS',    synonyms: ['Breeder Owner Bonus Scheme', 'bobs'] },
  { id: 'bonus-vobis', root: 'VOBIS',   synonyms: ['Super VOBIS', 'vobis'] },
  { id: 'bonus-qtis',  root: 'QTIS',    synonyms: ['Queensland Thoroughbred Incentive', 'qtis'] },
  { id: 'bonus-mm',    root: 'MM',      synonyms: ['Magic Millions', 'magic millions'] },
  { id: 'bonus-inglis',root: 'Inglis Xtra', synonyms: ['Inglis Race Series'] },
  { id: 'sire-redoutes', root: "Redoute's Choice", synonyms: ['Redoutes Choice', 'redoute choice'] },
]

async function provision() {
  console.log('Connecting to Typesense at', process.env.TYPESENSE_HOST)

  // 1. Create or validate collection
  let exists = false
  try {
    await client.collections('horses').retrieve()
    exists = true
    console.log('Collection "horses" already exists — skipping create')
  } catch {
    // 404 — not found
  }

  if (!exists) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await client.collections().create(schema as any)
    console.log('Collection "horses" created')
  }

  // 2. Upsert synonyms
  for (const syn of synonyms) {
    const { id, ...body } = syn
    await client.collections('horses').synonyms().upsert(id, body)
  }
  console.log(`${synonyms.length} synonyms upserted`)

  // 3. Create scoped search-only key (idempotent by description lookup)
  const existingKeys = await client.keys().retrieve()
  const searchKeyDesc = 'horses-search-only'
  const already = existingKeys.keys?.find((k: { description?: string }) => k.description === searchKeyDesc)

  if (already) {
    console.log('Search key already exists — skipping create')
    console.log('Re-run with SHOW_KEYS=1 to print existing key value (requires key ID lookup)')
  } else {
    const searchKey = await client.keys().create({
      description: searchKeyDesc,
      actions: ['documents:search'],
      collections: ['horses'],
    })
    console.log('\nNEXT_PUBLIC_TYPESENSE_SEARCH_KEY=' + searchKey.value)
    console.log('Add this to .env.local and Vercel environment variables\n')
  }

  console.log('Done.')
}

provision().catch((err) => {
  console.error(err)
  process.exit(1)
})
