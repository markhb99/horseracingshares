'use client';

import * as React from 'react';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Loader2 } from 'lucide-react';

interface VerifyAfslDialogProps {
  syndicatorId: string;
  syndicatorName: string;
  currentAfslNumber: string | null;
}

export function VerifyAfslDialog({
  syndicatorId,
  syndicatorName,
  currentAfslNumber,
}: VerifyAfslDialogProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [afslNumber, setAfslNumber] = useState(currentAfslNumber ?? '');
  const [verifiedAt, setVerifiedAt] = useState(
    new Date().toISOString().slice(0, 10),
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!afslNumber.trim()) { setError('AFSL number is required'); return; }
    setLoading(true);
    setError(null);

    const res = await fetch(`/api/admin/syndicators/${syndicatorId}/verify-afsl`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        afsl_number: afslNumber.trim(),
        afsl_verified_at: new Date(verifiedAt).toISOString(),
      }),
    });

    setLoading(false);

    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setError(body.error ?? 'Verification failed');
      return;
    }

    setOpen(false);
    router.refresh();
  }

  return (
    <>
      <Button size="sm" onClick={() => setOpen(true)}>
        Verify AFSL
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Verify AFSL — {syndicatorName}</DialogTitle>
            <DialogDescription>
              Confirm the AFSL number from the ASIC register before saving.
              This enables the syndicator to publish active listings.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4 pt-2">
            <div className="space-y-1">
              <label className="block text-sm font-medium text-charcoal">
                AFSL number <span className="text-destructive">*</span>
              </label>
              <input
                type="text"
                value={afslNumber}
                onChange={(e) => setAfslNumber(e.target.value)}
                placeholder="e.g. 123456"
                maxLength={20}
                className="w-full rounded-lg border border-fog bg-white px-3 py-2.5 text-sm text-charcoal outline-none focus:ring-2 focus:ring-midnight/30 focus:border-midnight transition-[border-color,box-shadow]"
              />
            </div>

            <div className="space-y-1">
              <label className="block text-sm font-medium text-charcoal">
                Verification date
              </label>
              <input
                type="date"
                value={verifiedAt}
                onChange={(e) => setVerifiedAt(e.target.value)}
                className="w-full rounded-lg border border-fog bg-white px-3 py-2.5 text-sm text-charcoal outline-none focus:ring-2 focus:ring-midnight/30 focus:border-midnight transition-[border-color,box-shadow]"
              />
            </div>

            {error && (
              <p className="text-sm text-destructive">{error}</p>
            )}

            <DialogFooter className="gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setOpen(false)}
                disabled={loading}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? (
                  <>
                    <Loader2 size={14} className="mr-2 animate-spin" />
                    Saving…
                  </>
                ) : (
                  'Confirm verification'
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
