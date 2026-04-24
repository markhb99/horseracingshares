import http from 'node:http'
import postgres from 'postgres'
import { createClient, SupabaseClient } from '@supabase/supabase-js'
import { Client as TypesenseClient } from 'typesense'

// ─── Types ────────────────────────────────────────────────────────────────────

interface OutboxRow {
  id: number
  document_id: string
  op: 'upsert' | 'delete'
  reason: string
  attempt_count: number
}

interface HorseSearchDoc {
  id: string
  slug: string
  name: string | null
  status: string
  sire: string
  dam: string
  dam_sire: string | null
  sex: string
  colour: string | null
  foal_date: string | null
  foal_year: number | null
  age_category: string
  location_state: string
  location_postcode: string | null
  syndicator_id: string
  syndicator_slug: string
  syndicator_name: string
  syndicator_tier: string
  is_regal_owned: boolean
  primary_trainer_id: string | null
  primary_trainer_name: string | null
  price_min_cents: number
  price_max_cents: number
  price_per_pct_cents: number | null
  price_bucket: string
  share_pcts_available: number[] | null
  ongoing_cost_cents_per_pct_per_week: number | null
  total_shares_remaining: number
  has_final_shares: boolean
  bonus_schemes: string[] | null
  vet_xray_clear: boolean | null
  vet_scope_clear: boolean | null
  created_at_unix: number
  submitted_at_unix: number | null
  view_count: number
  enquiry_count: number
  hero_image_path: string | null
  description: string | null
}

// ─── State shared with /healthz ───────────────────────────────────────────────

let lastProcessedAt: string | null = null
let typesenseOk = false

// ─── Client builders ──────────────────────────────────────────────────────────

function buildTypesenseClient(): TypesenseClient {
  return new TypesenseClient({
    nodes: [{
      host: process.env.TYPESENSE_HOST!,
      port: Number(process.env.TYPESENSE_PORT ?? 8108),
      protocol: (process.env.TYPESENSE_PROTOCOL ?? 'http') as 'http' | 'https',
    }],
    apiKey: process.env.TYPESENSE_API_KEY!,
    connectionTimeoutSeconds: 10,
  })
}

function buildSupabaseClient(): SupabaseClient {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  )
}

function buildPostgresClient(): postgres.Sql {
  const connStr = process.env.DATABASE_URL ?? buildConnectionString()
  return postgres(connStr, { max: 3 })
}

function buildConnectionString(): string {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  if (!url) throw new Error('NEXT_PUBLIC_SUPABASE_URL is not set')
  const projectRef = new URL(url).hostname.split('.')[0]
  const password = process.env.SUPABASE_SERVICE_ROLE_KEY
  return `postgresql://postgres:${password}@db.${projectRef}.supabase.co:5432/postgres`
}

// ─── Startup checks ──────────────────────────────────────────────────────────

async function checkTypesenseHealth(tsClient: TypesenseClient): Promise<void> {
  try {
    const result = await tsClient.health.retrieve()
    if (!result.ok) {
      console.log(JSON.stringify({ event: 'indexer.startup_failed', reason: 'typesense_health_not_ok' }))
      process.exit(1)
    }
  } catch (err) {
    console.log(JSON.stringify({ event: 'indexer.startup_failed', reason: 'typesense_health_check_failed', error: String(err) }))
    process.exit(1)
  }
  typesenseOk = true
}

async function checkHorsesCollection(tsClient: TypesenseClient): Promise<void> {
  try {
    await tsClient.collections('horses').retrieve()
  } catch {
    console.log(JSON.stringify({
      event: 'indexer.startup_failed',
      reason: 'horses_collection_missing',
      hint: 'Run: npx tsx scripts/typesense-provision.ts',
    }))
    process.exit(1)
  }
}

async function getPendingCount(sql: postgres.Sql): Promise<number> {
  try {
    const rows = await sql<[{ count: string }]>`
      SELECT COUNT(*)::text AS count
        FROM search_outbox
       WHERE processed_at IS NULL AND failed_at IS NULL
    `
    return parseInt(rows[0].count, 10)
  } catch {
    return -1
  }
}

// ─── Document builder ─────────────────────────────────────────────────────────

function buildTypesenseDoc(row: HorseSearchDoc): Record<string, unknown> {
  const doc: Record<string, unknown> = {
    id: row.id,
    slug: row.slug,
    status: row.status,
    sire: row.sire,
    dam: row.dam,
    sex: row.sex,
    age_category: row.age_category,
    location_state: row.location_state,
    syndicator_id: row.syndicator_id,
    syndicator_slug: row.syndicator_slug,
    syndicator_name: row.syndicator_name,
    syndicator_tier: row.syndicator_tier,
    is_regal_owned: row.is_regal_owned,
    price_min_cents: row.price_min_cents,
    price_max_cents: row.price_max_cents,
    price_bucket: row.price_bucket,
    total_shares_remaining: row.total_shares_remaining,
    has_final_shares: row.has_final_shares,
    created_at_unix: row.created_at_unix,
    view_count: row.view_count,
    enquiry_count: row.enquiry_count,
  }

  if (row.name !== null) doc.name = row.name
  if (row.dam_sire !== null) doc.dam_sire = row.dam_sire
  if (row.colour !== null) doc.colour = row.colour
  if (row.foal_date !== null) doc.foal_date = row.foal_date
  if (row.foal_year !== null) doc.foal_year = row.foal_year
  if (row.location_postcode !== null) doc.location_postcode = row.location_postcode
  if (row.primary_trainer_id !== null) doc.primary_trainer_id = row.primary_trainer_id
  if (row.primary_trainer_name !== null) doc.primary_trainer_name = row.primary_trainer_name
  if (row.price_per_pct_cents !== null) doc.price_per_pct_cents = row.price_per_pct_cents
  if (row.share_pcts_available !== null && row.share_pcts_available.length > 0) doc.share_pcts_available = row.share_pcts_available
  if (row.ongoing_cost_cents_per_pct_per_week !== null) doc.ongoing_cost_cents_per_pct_per_week = row.ongoing_cost_cents_per_pct_per_week
  if (row.bonus_schemes !== null && row.bonus_schemes.length > 0) doc.bonus_schemes = row.bonus_schemes
  if (row.vet_xray_clear !== null) doc.vet_xray_clear = row.vet_xray_clear
  if (row.vet_scope_clear !== null) doc.vet_scope_clear = row.vet_scope_clear
  if (row.submitted_at_unix !== null) doc.submitted_at_unix = row.submitted_at_unix
  if (row.hero_image_path !== null) doc.hero_image_path = row.hero_image_path
  if (row.description !== null) doc.description = row.description

  return doc
}

// ─── Retry helpers ───────────────────────────────────────────────────────────

async function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

async function upsertWithRetry(
  tsClient: TypesenseClient,
  jsonlBody: string,
  attempt = 1,
): Promise<{ failures: number }> {
  try {
    const results = await tsClient.collections('horses').documents().import(jsonlBody, { action: 'upsert' })
    let failures = 0
    for (const line of results.split('\n')) {
      if (!line.trim()) continue
      try {
        const parsed = JSON.parse(line) as { success: boolean }
        if (!parsed.success) failures++
      } catch {
        failures++
      }
    }
    return { failures }
  } catch (err: unknown) {
    const status = (err as { httpStatus?: number }).httpStatus ?? 0
    if (status >= 400 && status < 500) throw err
    if (attempt >= 5) throw err
    await sleep(Math.pow(2, attempt) * 1000)
    return upsertWithRetry(tsClient, jsonlBody, attempt + 1)
  }
}

async function deleteWithRetry(
  tsClient: TypesenseClient,
  ids: string[],
  attempt = 1,
): Promise<void> {
  try {
    const filterBy = `id:=[${ids.join(',')}]`
    await tsClient.collections('horses').documents().delete({ filter_by: filterBy })
  } catch (err: unknown) {
    const status = (err as { httpStatus?: number }).httpStatus ?? 0
    if (status >= 400 && status < 500) throw err
    if (attempt >= 5) throw err
    await sleep(Math.pow(2, attempt) * 1000)
    return deleteWithRetry(tsClient, ids, attempt + 1)
  }
}

// ─── Batch processing ─────────────────────────────────────────────────────────

async function processBatch(
  sql: postgres.Sql,
  supabase: SupabaseClient,
  tsClient: TypesenseClient,
): Promise<void> {
  const start = Date.now()

  // 1. Claim rows with FOR UPDATE SKIP LOCKED inside a transaction
  const outboxRows: OutboxRow[] = await sql.begin(async (tx) => {
    return tx<OutboxRow[]>`
      SELECT id, document_id, op, reason, attempt_count
        FROM search_outbox
       WHERE processed_at IS NULL AND failed_at IS NULL
       ORDER BY enqueued_at ASC
       LIMIT 100
       FOR UPDATE SKIP LOCKED
    `
  })

  if (outboxRows.length === 0) return

  // 2. De-duplicate: per document_id keep the last row (highest id = latest enqueued).
  const deduped = new Map<string, OutboxRow>()
  for (const row of outboxRows) {
    const existing = deduped.get(row.document_id)
    if (!existing || row.id > existing.id) {
      deduped.set(row.document_id, row)
    }
  }

  const allClaimedIds = outboxRows.map((r) => r.id)
  const upsertDocIds: string[] = []
  const deleteDocIds: string[] = []

  for (const [docId, row] of deduped) {
    if (row.op === 'upsert') {
      upsertDocIds.push(docId)
    } else {
      deleteDocIds.push(docId)
    }
  }

  let failures = 0
  const failedOutboxIds: number[] = []

  // 3. Handle upserts
  if (upsertDocIds.length > 0) {
    const { data: docs, error: viewErr } = await supabase
      .from('horse_search_doc')
      .select('*')
      .in('id', upsertDocIds)

    if (viewErr) {
      console.log(JSON.stringify({ event: 'indexer.view_error', error: viewErr.message }))
    } else if (docs && docs.length > 0) {
      const jsonlBody = (docs as HorseSearchDoc[])
        .map((d) => JSON.stringify(buildTypesenseDoc(d)))
        .join('\n')

      try {
        const result = await upsertWithRetry(tsClient, jsonlBody)
        failures += result.failures
        typesenseOk = true
      } catch (err: unknown) {
        typesenseOk = false
        failures += upsertDocIds.length
        const errorMsg = err instanceof Error ? err.message : String(err)
        console.log(JSON.stringify({ event: 'indexer.upsert_failed', error: errorMsg }))
        const failedDocSet = new Set(upsertDocIds)
        for (const row of outboxRows) {
          if (failedDocSet.has(row.document_id)) failedOutboxIds.push(row.id)
        }
        await sql`
          UPDATE search_outbox
             SET failed_at = now(), error_message = ${errorMsg}
           WHERE id = ANY(${sql.array(failedOutboxIds)})
        `
      }
    }
  }

  // 4. Handle deletes
  if (deleteDocIds.length > 0) {
    try {
      await deleteWithRetry(tsClient, deleteDocIds)
      typesenseOk = true
    } catch (err: unknown) {
      typesenseOk = false
      failures += deleteDocIds.length
      const errorMsg = err instanceof Error ? err.message : String(err)
      console.log(JSON.stringify({ event: 'indexer.delete_failed', error: errorMsg }))
      const failedDocSet = new Set(deleteDocIds)
      const ids: number[] = []
      for (const row of outboxRows) {
        if (failedDocSet.has(row.document_id)) ids.push(row.id)
      }
      failedOutboxIds.push(...ids)
      await sql`
        UPDATE search_outbox
           SET failed_at = now(), error_message = ${errorMsg}
         WHERE id = ANY(${sql.array(ids)})
      `
    }
  }

  // 5. Mark successful rows as processed
  const successIds = allClaimedIds.filter((id) => !failedOutboxIds.includes(id))
  if (successIds.length > 0) {
    await sql`
      UPDATE search_outbox
         SET processed_at = now()
       WHERE id = ANY(${sql.array(successIds)})
    `
    lastProcessedAt = new Date().toISOString()
  }

  const duration = Date.now() - start
  console.log(JSON.stringify({
    event: 'indexer.batch',
    count: deduped.size,
    duration_ms: duration,
    failures,
  }))
}

// ─── /healthz server ──────────────────────────────────────────────────────────

function startHealthServer(sql: postgres.Sql): void {
  const server = http.createServer(async (_req, res) => {
    if (_req.url !== '/healthz') {
      res.writeHead(404)
      res.end()
      return
    }
    const pendingCount = await getPendingCount(sql)
    const body = JSON.stringify({
      ok: true,
      pending_count: pendingCount,
      last_processed_at: lastProcessedAt,
      typesense_ok: typesenseOk,
    })
    res.writeHead(200, { 'Content-Type': 'application/json' })
    res.end(body)
  })
  server.listen(8200, () => {
    console.log(JSON.stringify({ event: 'indexer.healthz_listening', port: 8200 }))
  })
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  const tsClient = buildTypesenseClient()
  const supabase = buildSupabaseClient()
  const sql = buildPostgresClient()

  await checkTypesenseHealth(tsClient)
  await checkHorsesCollection(tsClient)

  const pendingCount = await getPendingCount(sql)
  console.log(JSON.stringify({ event: 'indexer.ready', pending_count: pendingCount }))

  startHealthServer(sql)

  let shuttingDown = false

  const shutdown = () => {
    console.log(JSON.stringify({ event: 'indexer.shutdown_signal' }))
    shuttingDown = true
  }
  process.on('SIGTERM', shutdown)
  process.on('SIGINT', shutdown)

  while (!shuttingDown) {
    try {
      await processBatch(sql, supabase, tsClient)
    } catch (err) {
      console.log(JSON.stringify({ event: 'indexer.batch_error', error: String(err) }))
    }
    if (!shuttingDown) {
      await sleep(2000)
    }
  }

  console.log(JSON.stringify({ event: 'indexer.stopped' }))
  await sql.end()
  process.exit(0)
}

main().catch((err) => {
  console.log(JSON.stringify({ event: 'indexer.fatal', error: String(err) }))
  process.exit(1)
})
