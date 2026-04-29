/**
 * /syndicators — Licensed syndicator directory.
 * Server component. Lists all AFSL-verified syndicators.
 */

import { createServerClient } from '@/lib/supabase/server';
import { H1, Lead, Small } from '@/components/typography';
import { SyndicatorCard } from '@/components/syndicator/SyndicatorCard';

// ─── Metadata ─────────────────────────────────────────────────────

export const metadata = {
  title: 'Licensed Syndicators | Horse Racing Shares',
  description:
    'Every syndicator on Horse Racing Shares holds an Australian Financial Services Licence or is an authorised representative.',
};

// ─── SyndicatorDirectory ──────────────────────────────────────────

export default async function SyndicatorsPage() {
  const supabase = await createServerClient();

  // Fetch all AFSL-verified syndicators + their active horse count.
  // logo_url and location_state are optional columns (may be null if not yet added).
  const { data: syndicators } = await supabase
    .from('syndicator')
    .select(
      'id, slug, name, tier, logo_url, afsl_number, afsl_verified_at, location_state, about',
    )
    .not('afsl_verified_at', 'is', null)
    .is('deleted_at', null)
    .order('tier', { ascending: false })
    .order('name', { ascending: true });

  // Fetch active horse counts grouped by syndicator_id.
  const { data: horseCounts } = await supabase
    .from('horse')
    .select('syndicator_id')
    .eq('status', 'active')
    .is('deleted_at', null);

  // Build a lookup: syndicator_id -> count
  const countMap: Record<string, number> = {};
  for (const row of horseCounts ?? []) {
    countMap[row.syndicator_id] = (countMap[row.syndicator_id] ?? 0) + 1;
  }

  const rows = syndicators ?? [];

  return (
    <main className="min-h-svh bg-paper pb-24">
      {/* Page header */}
      <div className="border-b border-fog bg-white px-[var(--container-pad)] py-10">
        <div className="mx-auto max-w-[var(--container-max)]">
          <H1 className="text-midnight">Licensed Syndicators</H1>
          <Lead className="mt-3 max-w-2xl">
            Every syndicator on Horse Racing Shares holds an Australian
            Financial Services Licence or is an authorised representative.
          </Lead>
        </div>
      </div>

      {/* Grid */}
      <div className="mx-auto max-w-[var(--container-max)] px-[var(--container-pad)] py-10">
        {rows.length === 0 ? (
          <div className="flex flex-col items-center py-24 text-center">
            <Small>No syndicators listed yet.</Small>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
            {rows.map((s) => (
              <SyndicatorCard
                key={s.id}
                id={s.id}
                slug={s.slug}
                name={s.name}
                tier={s.tier}
                logo_url={s.logo_url ?? null}
                afsl_number={s.afsl_number ?? null}
                afsl_verified_at={s.afsl_verified_at ?? null}
                location_state={s.location_state ?? null}
                horse_count={countMap[s.id] ?? 0}
              />
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
