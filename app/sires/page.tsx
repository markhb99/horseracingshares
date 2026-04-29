import Link from 'next/link';
import type { Metadata } from 'next';
import { createServiceClient } from '@/lib/supabase/service';
import { H1, Lead, Small, Caption } from '@/components/typography';

export const metadata: Metadata = {
  title: 'Browse by Sire | Horse Racing Shares',
  description:
    'Find racehorse syndication shares by sire line. Browse Australia\'s leading sires and discover available shares in their progeny.',
};

function sireToSlug(sire: string): string {
  return sire
    .toLowerCase()
    .replace(/['''`]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

interface SireRow {
  sire: string;
  count: number;
}

export default async function SiresPage() {
  const db = createServiceClient();

  // Fetch distinct sires from active horses, with count
  const { data: rows } = await db
    .from('horse')
    .select('sire')
    .eq('status', 'active')
    .is('deleted_at', null);

  // Aggregate client-side (no GROUP BY in Supabase select shorthand)
  const countMap: Record<string, number> = {};
  for (const row of rows ?? []) {
    countMap[row.sire] = (countMap[row.sire] ?? 0) + 1;
  }

  const sires: SireRow[] = Object.entries(countMap)
    .map(([sire, count]) => ({ sire, count }))
    .sort((a, b) => b.count - a.count || a.sire.localeCompare(b.sire));

  return (
    <main className="min-h-svh bg-paper pb-24">
      <div className="border-b border-fog bg-white px-[var(--container-pad)] py-10">
        <div className="mx-auto max-w-[var(--container-max)]">
          <H1 className="text-midnight">Browse by Sire</H1>
          <Lead className="mt-3 max-w-2xl">
            Discover available syndication shares in horses by Australia&apos;s
            leading sire lines.
          </Lead>
        </div>
      </div>

      <div className="mx-auto max-w-[var(--container-max)] px-[var(--container-pad)] py-10">
        {sires.length === 0 ? (
          <p className="text-charcoal-soft">No active listings yet.</p>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
            {sires.map(({ sire, count }) => (
              <Link
                key={sire}
                href={`/sires/${sireToSlug(sire)}`}
                className="group flex flex-col gap-1 rounded-xl border border-fog bg-white p-4 hover:border-midnight/40 hover:shadow-sm transition-[border-color,box-shadow] duration-150"
              >
                <Small className="font-semibold text-midnight group-hover:text-midnight leading-snug">
                  {sire}
                </Small>
                <Caption className="text-charcoal-soft">
                  {count} {count === 1 ? 'horse' : 'horses'} available
                </Caption>
              </Link>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
