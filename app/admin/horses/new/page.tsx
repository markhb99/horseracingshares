import type { Metadata } from 'next';
import Link from 'next/link';
import { requireRole } from '@/lib/auth/role';
import { createServerClient } from '@/lib/supabase/server';
import { H1, Small } from '@/components/typography';
import { AddHorseForm } from '@/components/admin/AddHorseForm';

export const metadata: Metadata = { title: 'Add horse — Operator console' };

export default async function AdminAddHorsePage() {
  await requireRole(['operator'], '/admin/horses/new');

  const supabase = await createServerClient();
  const { data: syndicators } = await supabase
    .from('syndicator')
    .select('id, name, afsl_status')
    .is('deleted_at', null)
    .order('name', { ascending: true });

  return (
    <main className="min-h-svh bg-background px-6 py-12">
      <div className="mx-auto w-full max-w-3xl flex flex-col gap-8">

        <div className="flex items-center gap-3">
          <Link
            href="/admin"
            className="text-sm text-charcoal-soft hover:text-charcoal transition-colors"
          >
            ← Admin
          </Link>
        </div>

        <div>
          <H1>Add horse</H1>
          <Small className="text-charcoal-soft mt-1">
            Horse goes live immediately — no moderation step.
            Syndicator must be AFSL-verified.
          </Small>
        </div>

        <AddHorseForm syndicators={syndicators ?? []} />

      </div>
    </main>
  );
}
