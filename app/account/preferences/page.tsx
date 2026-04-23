import { redirect } from 'next/navigation';
import Link from 'next/link';
import { createServerClient } from '@/lib/supabase/server';
import { getCurrentConsent, ALL_CONSENT_TYPES } from '@/lib/auth/consent';
import { H1, Lead, Caption } from '@/components/typography';
import ConsentToggles, { type InitialConsent } from '@/components/account/ConsentToggles';

export const metadata = {
  title: 'Your preferences',
};

export default async function PreferencesPage() {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login?next=/account/preferences');
  }

  const consentMap = await getCurrentConsent(user.id);

  // Serialise the Map to a plain object for the client island
  const initialConsent = Object.fromEntries(
    ALL_CONSENT_TYPES.map((type) => [type, consentMap.get(type)!]),
  ) as InitialConsent;

  return (
    <main className="min-h-svh bg-background px-6 py-16">
      <div className="mx-auto w-full max-w-xl flex flex-col gap-8">
        <div className="flex flex-col gap-3">
          <H1>Your preferences</H1>
          <Lead className="text-muted-foreground">
            Control what we send you and who your enquiries reach. Change these any time — we keep
            a full history.
          </Lead>
        </div>

        <ConsentToggles initialConsent={initialConsent} />

        <Caption>
          Horse Racing Shares is owned by Regal Bloodstock.{' '}
          <Link href="/about" className="underline underline-offset-4">
            Read about the relationship.
          </Link>
        </Caption>
      </div>
    </main>
  );
}
