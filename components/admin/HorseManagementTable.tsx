'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Caption } from '@/components/typography';

export interface HorseManagementRow {
  id: string;
  slug: string;
  name: string | null;
  sire: string;
  dam: string;
  status: string;
  syndicator_name: string;
  location_state: string;
  created_at: string;
}

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-AU', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

function statusBadge(status: string) {
  const styles: Record<string, string> = {
    active: 'bg-emerald-100 text-emerald-700',
    pending_review: 'bg-amber-100 text-amber-700',
    withdrawn: 'bg-fog text-charcoal-soft',
    sold: 'bg-midnight/10 text-midnight',
    draft: 'bg-fog text-charcoal-soft',
  };
  return (
    <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${styles[status] ?? 'bg-fog text-charcoal-soft'}`}>
      {status.replace('_', ' ')}
    </span>
  );
}

function WithdrawDialog({ horse, onDone }: { horse: HorseManagementRow; onDone: () => void }) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  async function handleWithdraw() {
    setLoading(true);
    setError(null);
    const res = await fetch(`/api/admin/horses/${horse.id}/withdraw`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reason: reason.trim() || undefined }),
    });
    setLoading(false);
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setError(body.error ?? 'Failed to withdraw');
      return;
    }
    setOpen(false);
    onDone();
    router.refresh();
  }

  if (horse.status === 'withdrawn' || horse.status === 'sold') return null;

  return (
    <>
      <Button
        size="sm"
        variant="outline"
        className="text-destructive hover:text-destructive border-destructive/30 hover:border-destructive/60"
        onClick={() => setOpen(true)}
      >
        Withdraw
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Withdraw listing</DialogTitle>
            <DialogDescription>
              <span className="font-medium">{horse.name ?? `${horse.sire} × ${horse.dam}`}</span> will
              be removed from browse and search immediately. This can be reversed by re-approving.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-1 pt-1">
            <label className="block text-sm font-medium text-charcoal">
              Reason <span className="text-charcoal-soft font-normal">(optional)</span>
            </label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
              placeholder="e.g. Horse sold privately, listing request from syndicator..."
              className="w-full rounded-lg border border-fog bg-white px-3 py-2.5 text-sm text-charcoal outline-none focus:ring-2 focus:ring-midnight/30 focus:border-midnight transition-[border-color,box-shadow]"
              maxLength={500}
            />
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setOpen(false)} disabled={loading}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleWithdraw} disabled={loading}>
              {loading ? <Loader2 size={14} className="mr-2 animate-spin" /> : null}
              Withdraw listing
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

export function HorseManagementTable({ horses }: { horses: HorseManagementRow[] }) {
  const [withdrawn, setWithdrawn] = useState<Set<string>>(new Set());

  if (horses.length === 0) {
    return <p className="text-sm text-charcoal-soft">No horses yet.</p>;
  }

  return (
    <div className="overflow-x-auto rounded-xl ring-1 ring-foreground/10">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border bg-muted/40">
            <th className="px-4 py-3 text-left font-medium text-muted-foreground">Horse</th>
            <th className="px-4 py-3 text-left font-medium text-muted-foreground">Syndicator</th>
            <th className="px-4 py-3 text-left font-medium text-muted-foreground">State</th>
            <th className="px-4 py-3 text-left font-medium text-muted-foreground">Listed</th>
            <th className="px-4 py-3 text-left font-medium text-muted-foreground">Status</th>
            <th className="px-4 py-3 text-left font-medium text-muted-foreground">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border bg-card">
          {horses.map((h) => (
            <tr key={h.id} className={withdrawn.has(h.id) ? 'opacity-50' : ''}>
              <td className="px-4 py-3">
                <Link
                  href={`/horse/${h.slug}`}
                  className="font-medium text-midnight hover:underline underline-offset-2"
                >
                  {h.name ?? `${h.sire} × ${h.dam}`}
                </Link>
                <Caption className="text-charcoal-soft block">
                  {h.sire} × {h.dam}
                </Caption>
              </td>
              <td className="px-4 py-3 text-charcoal-soft">{h.syndicator_name}</td>
              <td className="px-4 py-3 text-charcoal-soft">{h.location_state}</td>
              <td className="px-4 py-3 text-charcoal-soft">{fmtDate(h.created_at)}</td>
              <td className="px-4 py-3">{statusBadge(h.status)}</td>
              <td className="px-4 py-3">
                <div className="flex items-center gap-2">
                  <Link
                    href={`/admin/horses/${h.id}/edit`}
                    className="inline-flex items-center rounded-md border border-fog px-2.5 py-1 text-xs font-medium text-charcoal hover:bg-fog/60 transition-colors"
                  >
                    Edit
                  </Link>
                  <WithdrawDialog
                    horse={h}
                    onDone={() => setWithdrawn((s) => new Set(s).add(h.id))}
                  />
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
