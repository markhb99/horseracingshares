/**
 * /list/submit — Multi-step listing submission form.
 * RSC shell: fetches syndicator details, then renders SubmitStepper (client).
 */

import type { Metadata } from 'next';
import { Suspense } from 'react';
import { redirect } from 'next/navigation';
import { H2, Caption } from '@/components/typography';
import { SubmitStepper } from '@/components/list/SubmitStepper';
import { requireRole } from '@/lib/auth/role';
import { createServerClient } from '@/lib/supabase/server';

export const metadata: Metadata = {
  title: 'List a horse | Horse Racing Shares',
};

export default async function SubmitPage() {
  const profile = await requireRole(['syndicator', 'operator'], '/list/submit');

  const supabase = await createServerClient();

  type SyndicatorUserWithSyndicator = {
    syndicator_id: string;
    syndicator: { id: string; name: string; afsl_number: string | null; afsl_status: string } | null;
  };

  // Fetch syndicator_user + syndicator for this user
  const { data: syndicatorUserRaw } = await supabase
    .from('syndicator_user')
    .select('syndicator_id, syndicator:syndicator_id(id, name, afsl_number, afsl_status)')
    .eq('user_id', profile.id)
    .single();

  const syndicatorUser = syndicatorUserRaw as SyndicatorUserWithSyndicator | null;

  if (!syndicatorUser?.syndicator) {
    return (
      <main className="min-h-svh bg-background px-6 py-16">
        <div className="mx-auto max-w-xl text-center space-y-4">
          <H2>No syndicator account found</H2>
          <Caption className="text-charcoal-soft">
            You don&rsquo;t have a syndicator account.{' '}
            <a href="/contact" className="underline underline-offset-2">
              Contact us
            </a>{' '}
            to get set up.
          </Caption>
        </div>
      </main>
    );
  }

  const syn = syndicatorUser.syndicator;

  return (
    <main className="min-h-svh bg-background px-6 py-12">
      <div className="mx-auto max-w-2xl">
        <div className="mb-8 space-y-1">
          <H2>Submit a listing</H2>
          <Caption className="text-charcoal-soft">
            Listing as: <strong>{syn.name}</strong>
          </Caption>
        </div>

        <Suspense fallback={<div className="py-12 text-center text-sm text-charcoal-soft">Loading…</div>}>
          <SubmitStepper
            syndicator={{
              id: syn.id,
              name: syn.name,
              afsl_number: syn.afsl_number,
              afsl_status: syn.afsl_status,
            }}
          />
        </Suspense>
      </div>
    </main>
  );
}
