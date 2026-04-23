'use client';

import { useState, useTransition } from 'react';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Caption } from '@/components/typography';
import { toggleConsent } from '@/lib/auth/consent-actions';
import type { ConsentType } from '@/lib/auth/consent';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ConsentRow {
  granted: boolean;
  grantedAt: string | null;
}

export type InitialConsent = Record<ConsentType, ConsentRow>;

// ─── Copy ─────────────────────────────────────────────────────────────────────

interface ConsentMeta {
  title: string;
  description: string;
  extraDescription?: string;
}

const CONSENT_META: Record<ConsentType, ConsentMeta> = {
  marketing_email: {
    title: 'Weekly Shortlist & offers',
    description:
      'Curated horses matched to what you\'ve been looking at, plus occasional promotional emails. Unsubscribe any time.',
  },
  marketing_sms: {
    title: 'SMS alerts',
    description: 'Urgent listing alerts and account security only. No marketing.',
  },
  share_with_syndicator_on_enquiry: {
    title: 'Share enquiries with syndicators',
    description:
      'When you enquire about a horse, we forward your name, email, phone, and message to the listing syndicator. Required at enquiry time. Turning this off here means future enquiries will ask again.',
  },
  share_with_regal_partner_matches: {
    title: 'Regal Bloodstock partner matches',
    description:
      'Horse Racing Shares is owned by Regal Bloodstock. If this is on, Regal may email you horses from their own stable that match your interests. Read more about the relationship at /about.',
  },
  analytics_session_replay: {
    title: 'Session replay for UX research',
    description:
      'An anonymised recording of your clicks on the site. Never sold or shared with third parties.',
  },
};

const CONSENT_ORDER: ConsentType[] = [
  'marketing_email',
  'marketing_sms',
  'share_with_syndicator_on_enquiry',
  'share_with_regal_partner_matches',
  'analytics_session_replay',
];

// ─── Date formatting ──────────────────────────────────────────────────────────

function formatDate(iso: string): string {
  return new Intl.DateTimeFormat('en-AU', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(new Date(iso));
}

// ─── Component ────────────────────────────────────────────────────────────────

interface Props {
  initialConsent: InitialConsent;
}

export default function ConsentToggles({ initialConsent }: Props) {
  // Local state mirrors the server-loaded consent state
  const [consent, setConsent] = useState<InitialConsent>(initialConsent);
  // Track which type is currently pending so we can disable its switch
  const [pendingType, setPendingType] = useState<ConsentType | null>(null);
  const [, startTransition] = useTransition();

  function handleToggle(consentType: ConsentType, nextGranted: boolean) {
    // Capture the previous state so we can revert on failure
    const previous = consent[consentType];

    // Optimistic update
    setConsent((prev) => ({
      ...prev,
      [consentType]: {
        granted: nextGranted,
        grantedAt: new Date().toISOString(),
      },
    }));
    setPendingType(consentType);

    startTransition(async () => {
      try {
        const result = await toggleConsent({ consentType, granted: nextGranted });

        if (!result.ok) {
          // Revert on server error
          setConsent((prev) => ({ ...prev, [consentType]: previous }));
          toast.error('Could not update preferences. Please try again.');
          return;
        }

        // Update grantedAt from the server's confirmed timestamp
        setConsent((prev) => ({
          ...prev,
          [consentType]: {
            granted: nextGranted,
            grantedAt: result.grantedAt,
          },
        }));

        toast.success('Preferences updated.');
      } catch {
        // Revert on unexpected error
        setConsent((prev) => ({ ...prev, [consentType]: previous }));
        toast.error('Could not update preferences. Please try again.');
      } finally {
        setPendingType(null);
      }
    });
  }

  return (
    <div className="flex flex-col gap-4">
      {CONSENT_ORDER.map((type) => {
        const meta = CONSENT_META[type];
        const state = consent[type];
        const isPending = pendingType === type;

        return (
          <Card key={type}>
            <CardHeader>
              <CardTitle>{meta.title}</CardTitle>
              <CardDescription>{meta.description}</CardDescription>
            </CardHeader>
            <CardContent className="flex items-center justify-between gap-4">
              <div>
                {state.grantedAt && (
                  <Caption>Last changed {formatDate(state.grantedAt)}</Caption>
                )}
              </div>
              <Switch
                checked={state.granted}
                onCheckedChange={(checked) => handleToggle(type, checked)}
                disabled={isPending}
                aria-label={meta.title}
              />
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
