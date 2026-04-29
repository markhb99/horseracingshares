import { notFound } from 'next/navigation';
import { H1, Small } from '@/components/typography';
import { EditHorseForm } from '@/components/admin/EditHorseForm';
import type { HorseEditData } from '@/components/admin/EditHorseForm';
import { requireRole } from '@/lib/auth/role';
import { createServerClient } from '@/lib/supabase/server';
import { createServiceClient } from '@/lib/supabase/service';

export const metadata = { title: 'Edit horse' };

export default async function EditHorsePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireRole(['operator'], '/admin');
  const { id } = await params;

  const supabase = await createServerClient();
  const db = createServiceClient();

  // Fetch the horse — use service client to bypass RLS
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: horse } = await (db as any)
    .from('horse')
    .select(
      'id, name, sire, dam, dam_sire, sex, foal_date, colour, location_state, location_postcode, description, vet_xray_clear, vet_scope_clear, ongoing_cost_cents_per_pct_per_week, share_listings, pds_url, pds_dated, pedigree_json, syndicator_id',
    )
    .eq('id', id)
    .is('deleted_at', null)
    .single();

  if (!horse) notFound();

  // Fetch syndicator name for display
  const { data: syndicator } = await supabase
    .from('syndicator')
    .select('name')
    .eq('id', horse.syndicator_id)
    .single();

  const editData: HorseEditData = {
    id: horse.id,
    name: horse.name,
    sire: horse.sire,
    dam: horse.dam,
    dam_sire: horse.dam_sire,
    sex: horse.sex,
    foal_date: horse.foal_date,
    colour: horse.colour,
    location_state: horse.location_state,
    location_postcode: horse.location_postcode,
    description: horse.description,
    vet_xray_clear: horse.vet_xray_clear,
    vet_scope_clear: horse.vet_scope_clear,
    ongoing_cost_cents_per_pct_per_week: horse.ongoing_cost_cents_per_pct_per_week,
    share_listings: horse.share_listings ?? [],
    pds_url: horse.pds_url,
    pds_dated: horse.pds_dated,
    pedigree_json: horse.pedigree_json ?? {},
    hero_image_path: null,
  };

  return (
    <main className="min-h-svh bg-background px-6 py-12">
      <div className="mx-auto w-full max-w-2xl flex flex-col gap-8">
        <div>
          <H1>Edit horse</H1>
          <Small className="text-muted-foreground mt-1 block">
            {horse.name ?? `${horse.sire} × ${horse.dam}`}
            {syndicator ? ` — ${syndicator.name}` : ''}
          </Small>
        </div>
        <EditHorseForm horse={editData} />
      </div>
    </main>
  );
}
