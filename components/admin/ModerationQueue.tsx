'use client';

import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Body, Caption } from '@/components/typography';

export interface ModerationHorse {
  id: string;
  name: string | null;
  sire: string;
  dam: string;
  sex: string;
  location_state: string;
  pds_url: string | null;
  listing_tier_code: string | null;
  submitted_at: string | null;
  syndicator_name: string;
  syndicator_afsl_number: string | null;
  syndicator_afsl_status: string;
}

function fmtDate(iso: string | null | undefined): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-AU', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

type BadgeVariant = 'default' | 'secondary' | 'outline' | 'destructive';

function afslVariant(status: string): BadgeVariant {
  const map: Record<string, BadgeVariant> = {
    verified: 'default',
    pending: 'secondary',
    unverified: 'outline',
    suspended: 'destructive',
    expired: 'destructive',
  };
  return map[status] ?? 'outline';
}

function HorseRow({
  horse,
  onApprove,
  onReject,
}: {
  horse: ModerationHorse;
  onApprove: (id: string) => Promise<void>;
  onReject: (id: string, reason: string) => Promise<void>;
}) {
  const [busy, setBusy] = useState(false);
  const [rejectMode, setRejectMode] = useState(false);
  const [reason, setReason] = useState('');
  const [done, setDone] = useState<'approved' | 'rejected' | null>(null);
  const [error, setError] = useState<string | null>(null);

  const horseName = horse.name ?? `${horse.sire} × ${horse.dam}`;

  async function handleApprove() {
    setBusy(true);
    setError(null);
    try {
      await onApprove(horse.id);
      setDone('approved');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to approve');
    } finally {
      setBusy(false);
    }
  }

  async function handleReject() {
    if (!reason.trim()) return;
    setBusy(true);
    setError(null);
    try {
      await onReject(horse.id, reason.trim());
      setDone('rejected');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to reject');
    } finally {
      setBusy(false);
    }
  }

  if (done) {
    return (
      <tr>
        <td colSpan={7} className="px-4 py-3 text-sm text-charcoal-soft italic">
          {horseName} — {done === 'approved' ? 'Approved ✓' : 'Rejected ✓'}
        </td>
      </tr>
    );
  }

  return (
    <tr className="align-top">
      <td className="px-4 py-3">
        <p className="font-medium text-sm">{horseName}</p>
        <Caption className="text-charcoal-soft">{horse.sex} · {horse.location_state}</Caption>
      </td>
      <td className="px-4 py-3 text-sm">
        <p>{horse.syndicator_name}</p>
        <Caption className="text-charcoal-soft">{horse.syndicator_afsl_number ?? '—'}</Caption>
      </td>
      <td className="px-4 py-3">
        <Badge variant={afslVariant(horse.syndicator_afsl_status)}>
          {horse.syndicator_afsl_status}
        </Badge>
      </td>
      <td className="px-4 py-3 text-sm text-charcoal-soft">
        {horse.listing_tier_code ?? '—'}
      </td>
      <td className="px-4 py-3">
        {horse.pds_url ? (
          <a
            href={horse.pds_url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-midnight underline underline-offset-2"
          >
            View PDS ↗
          </a>
        ) : (
          <span className="text-sm text-destructive">No PDS</span>
        )}
      </td>
      <td className="px-4 py-3 text-sm text-charcoal-soft whitespace-nowrap">
        {fmtDate(horse.submitted_at)}
      </td>
      <td className="px-4 py-3">
        {rejectMode ? (
          <div className="flex flex-col gap-1.5 min-w-[200px]">
            <textarea
              rows={2}
              maxLength={500}
              placeholder="Rejection reason…"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full rounded border border-fog px-2 py-1.5 text-sm text-charcoal placeholder:text-charcoal/40 focus:border-midnight focus:outline-none focus:ring-2 focus:ring-midnight/20"
            />
            <div className="flex gap-1.5">
              <Button
                size="sm"
                variant="destructive"
                disabled={busy || !reason.trim()}
                onClick={handleReject}
                className="text-xs"
              >
                Confirm reject
              </Button>
              <Button
                size="sm"
                variant="outline"
                disabled={busy}
                onClick={() => setRejectMode(false)}
                className="text-xs"
              >
                Cancel
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex gap-1.5">
            <Button
              size="sm"
              disabled={busy}
              onClick={handleApprove}
              className="bg-midnight text-paper hover:bg-midnight/90 text-xs"
            >
              Approve
            </Button>
            <Button
              size="sm"
              variant="outline"
              disabled={busy}
              onClick={() => setRejectMode(true)}
              className="text-xs"
            >
              Reject
            </Button>
          </div>
        )}
        {error && <p className="mt-1 text-xs text-destructive">{error}</p>}
      </td>
    </tr>
  );
}

export function ModerationQueue({ pendingHorses }: { pendingHorses: ModerationHorse[] }) {
  async function approve(id: string) {
    const res = await fetch(`/api/admin/horses/${id}/approve`, { method: 'POST' });
    if (!res.ok) {
      const json = await res.json().catch(() => ({}));
      throw new Error(json.error ?? `Error ${res.status}`);
    }
  }

  async function reject(id: string, reason: string) {
    const res = await fetch(`/api/admin/horses/${id}/reject`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reason }),
    });
    if (!res.ok) {
      const json = await res.json().catch(() => ({}));
      throw new Error(json.error ?? `Error ${res.status}`);
    }
  }

  if (pendingHorses.length === 0) {
    return <Body className="text-muted-foreground">No listings awaiting approval.</Body>;
  }

  return (
    <div className="overflow-x-auto rounded-xl ring-1 ring-foreground/10">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border bg-muted/40">
            {['Horse', 'Syndicator', 'AFSL', 'Tier', 'PDS', 'Submitted', 'Actions'].map((h) => (
              <th key={h} className="px-4 py-3 text-left font-medium text-muted-foreground">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-border bg-card">
          {pendingHorses.map((horse) => (
            <HorseRow
              key={horse.id}
              horse={horse}
              onApprove={approve}
              onReject={reject}
            />
          ))}
        </tbody>
      </table>
    </div>
  );
}
