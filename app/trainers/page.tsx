/**
 * /trainers — Trainer directory.
 * Server component. Lists all trainers who have at least one active horse.
 */

import { createServerClient } from '@/lib/supabase/server';
import { H1, Lead, Small } from '@/components/typography';
import { TrainerCard } from '@/components/syndicator/TrainerCard';

// ─── Metadata ─────────────────────────────────────────────────────

export const metadata = {
  title: 'Trainers | Horse Racing Shares',
  description:
    'Browse racehorse syndication shares by trainer. Find horses trained by your favourite Australian racing stable.',
};

// ─── TrainersPage ─────────────────────────────────────────────────

export default async function TrainersPage() {
  const supabase = await createServerClient();

  // Fetch trainers with at least one active horse, ordered by horse count desc then name.
  // We query active horses and group client-side (no RPC required).
  const { data: activeHorses } = await supabase
    .from('horse')
    .select('primary_trainer_id')
    .eq('status', 'active')
    .is('deleted_at', null)
    .not('primary_trainer_id', 'is', null);

  // Build trainer_id -> count map
  const countMap: Record<string, number> = {};
  for (const row of activeHorses ?? []) {
    if (row.primary_trainer_id) {
      countMap[row.primary_trainer_id] =
        (countMap[row.primary_trainer_id] ?? 0) + 1;
    }
  }

  const trainerIds = Object.keys(countMap);

  if (trainerIds.length === 0) {
    return (
      <main className="min-h-svh bg-paper pb-24">
        <div className="border-b border-fog bg-white px-[var(--container-pad)] py-10">
          <div className="mx-auto max-w-[var(--container-max)]">
            <H1 className="text-midnight">Trainers</H1>
            <Lead className="mt-3 max-w-2xl">
              Browse horses by trainer. Filter by location on the browse page.
            </Lead>
          </div>
        </div>
        <div className="mx-auto max-w-[var(--container-max)] px-[var(--container-pad)] py-24 text-center">
          <Small>No trainers with active listings yet.</Small>
        </div>
      </main>
    );
  }

  const { data: trainers } = await supabase
    .from('trainer')
    .select('id, slug, name, stable_name, state')
    .in('id', trainerIds);

  // Sort by horse count desc, then name asc
  const sorted = (trainers ?? []).slice().sort((a, b) => {
    const diff = (countMap[b.id] ?? 0) - (countMap[a.id] ?? 0);
    if (diff !== 0) return diff;
    return a.name.localeCompare(b.name, 'en-AU');
  });

  return (
    <main className="min-h-svh bg-paper pb-24">
      {/* Page header */}
      <div className="border-b border-fog bg-white px-[var(--container-pad)] py-10">
        <div className="mx-auto max-w-[var(--container-max)]">
          <H1 className="text-midnight">Trainers</H1>
          <Lead className="mt-3 max-w-2xl">
            Browse horses by trainer. Filter by location on the browse page.
          </Lead>
        </div>
      </div>

      {/* Grid */}
      <div className="mx-auto max-w-[var(--container-max)] px-[var(--container-pad)] py-10">
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
          {sorted.map((t) => (
            <TrainerCard
              key={t.id}
              id={t.id}
              slug={t.slug}
              name={t.name}
              stable_name={t.stable_name ?? null}
              location_state={t.state ?? null}
              horse_count={countMap[t.id] ?? 0}
            />
          ))}
        </div>
      </div>
    </main>
  );
}
