import postgres from 'postgres'

async function main(): Promise<void> {
  const connectionString = process.env.DATABASE_URL ?? buildConnectionString()

  const sql = postgres(connectionString, { max: 1 })

  try {
    const result = await sql`
      INSERT INTO search_outbox (document_id, op, reason)
      SELECT id, 'upsert', 'nightly_rebuild'
        FROM horse
       WHERE status = 'active' AND deleted_at IS NULL
      ON CONFLICT DO NOTHING
    `
    console.log(JSON.stringify({
      event: 'rebuild.done',
      inserted: result.count,
    }))
  } finally {
    await sql.end()
  }
}

function buildConnectionString(): string {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  if (!url) throw new Error('NEXT_PUBLIC_SUPABASE_URL is not set')

  // Supabase exposes Postgres on port 5432 at db.<project-ref>.supabase.co
  // The URL is https://<project-ref>.supabase.co — extract the project ref.
  const projectRef = new URL(url).hostname.split('.')[0]
  const password = process.env.SUPABASE_SERVICE_ROLE_KEY
  return `postgresql://postgres:${password}@db.${projectRef}.supabase.co:5432/postgres`
}

main().catch((err) => {
  console.log(JSON.stringify({ event: 'rebuild.fatal', error: String(err) }))
  process.exit(1)
})
