'use client';

import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Caption } from '@/components/typography';
import { cn } from '@/lib/utils';

export interface EnquiryRow {
  id: string;
  created_at: string;
  contact_name: string;
  contact_email: string;
  contact_phone: string | null;
  share_size_interested_pct: number | null;
  message: string | null;
  consent_share_at_submit: boolean;
  forwarded_to_syndicator_at: string | null;
  forward_failed_at: string | null;
  status: string;
  horse_name: string | null;
  horse_slug: string;
  horse_sire: string;
  horse_dam: string;
}

function fmtDate(iso: string | null | undefined): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-AU', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

function forwardBadge(row: EnquiryRow) {
  if (row.forward_failed_at) return <Badge variant="destructive">Forward failed</Badge>;
  if (row.forwarded_to_syndicator_at) return <Badge variant="default">Forwarded</Badge>;
  return <Badge variant="secondary">Received</Badge>;
}

function EnquiryDetail({ enquiry }: { enquiry: EnquiryRow }) {
  const horseName = enquiry.horse_name ?? `${enquiry.horse_sire} × ${enquiry.horse_dam}`;
  return (
    <div className="space-y-4 p-4">
      <div>
        <p className="text-xs text-charcoal-soft uppercase tracking-wide mb-1">Horse</p>
        <a
          href={`/horse/${enquiry.horse_slug}`}
          className="text-sm font-medium text-midnight hover:underline underline-offset-2"
          target="_blank"
          rel="noopener noreferrer"
        >
          {horseName}
        </a>
      </div>

      <div className="grid grid-cols-2 gap-3 text-sm">
        <div>
          <p className="text-xs text-charcoal-soft uppercase tracking-wide mb-0.5">Name</p>
          <p className="font-medium">{enquiry.contact_name}</p>
        </div>
        <div>
          <p className="text-xs text-charcoal-soft uppercase tracking-wide mb-0.5">Received</p>
          <p>{fmtDate(enquiry.created_at)}</p>
        </div>
        <div>
          <p className="text-xs text-charcoal-soft uppercase tracking-wide mb-0.5">Email</p>
          <a href={`mailto:${enquiry.contact_email}`} className="text-midnight underline underline-offset-2">
            {enquiry.contact_email}
          </a>
        </div>
        <div>
          <p className="text-xs text-charcoal-soft uppercase tracking-wide mb-0.5">Phone</p>
          <p>{enquiry.contact_phone ?? '—'}</p>
        </div>
        <div>
          <p className="text-xs text-charcoal-soft uppercase tracking-wide mb-0.5">Share size</p>
          <p>{enquiry.share_size_interested_pct != null ? `${enquiry.share_size_interested_pct}%` : '—'}</p>
        </div>
        <div>
          <p className="text-xs text-charcoal-soft uppercase tracking-wide mb-0.5">Status</p>
          {forwardBadge(enquiry)}
        </div>
      </div>

      {enquiry.message && (
        <div>
          <p className="text-xs text-charcoal-soft uppercase tracking-wide mb-1">Message</p>
          <p className="text-sm text-charcoal bg-paper-dim rounded-lg p-3 whitespace-pre-wrap">
            {enquiry.message}
          </p>
        </div>
      )}

      <div className="rounded-lg border border-fog bg-paper p-3 text-xs text-charcoal-soft space-y-1">
        <p>
          <span className="font-medium">Shared data consent:</span>{' '}
          {enquiry.consent_share_at_submit ? 'Yes — buyer consented to share data with syndicator' : 'No'}
        </p>
        {enquiry.forwarded_to_syndicator_at && (
          <p>
            <span className="font-medium">Forwarded:</span> {fmtDate(enquiry.forwarded_to_syndicator_at)}
          </p>
        )}
        {enquiry.forward_failed_at && (
          <p className="text-destructive">
            <span className="font-medium">Forward failed:</span> {fmtDate(enquiry.forward_failed_at)}
          </p>
        )}
      </div>
    </div>
  );
}

export function EnquiryPane({ enquiries }: { enquiries: EnquiryRow[] }) {
  const [selected, setSelected] = useState<EnquiryRow | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);

  const handleSelect = (e: EnquiryRow) => {
    setSelected(e);
    setSheetOpen(true);
  };

  if (enquiries.length === 0) {
    return <p className="text-sm text-charcoal-soft py-6 text-center">No enquiries yet.</p>;
  }

  return (
    <>
      {/* Desktop: two-pane */}
      <div className="hidden lg:flex gap-0 border border-fog rounded-xl overflow-hidden">
        {/* Left: list */}
        <div className="w-72 shrink-0 border-r border-fog divide-y divide-fog overflow-y-auto max-h-[600px]">
          {enquiries.map((e) => {
            const horseName = e.horse_name ?? `${e.horse_sire} × ${e.horse_dam}`;
            return (
              <button
                key={e.id}
                onClick={() => setSelected(e)}
                className={cn(
                  'w-full text-left px-4 py-3 hover:bg-paper-dim transition-colors',
                  selected?.id === e.id && 'bg-paper-dim border-l-2 border-l-midnight',
                )}
              >
                <p className="text-sm font-medium truncate">{e.contact_name}</p>
                <p className="text-xs text-charcoal-soft truncate">{horseName}</p>
                <div className="flex items-center justify-between mt-1">
                  <Caption className="text-charcoal-soft">{fmtDate(e.created_at)}</Caption>
                  {forwardBadge(e)}
                </div>
              </button>
            );
          })}
        </div>

        {/* Right: detail */}
        <div className="flex-1 min-w-0">
          {selected ? (
            <EnquiryDetail enquiry={selected} />
          ) : (
            <p className="text-sm text-charcoal-soft p-6">Select an enquiry to view details.</p>
          )}
        </div>
      </div>

      {/* Mobile: list + sheet */}
      <div className="lg:hidden divide-y divide-fog border border-fog rounded-xl overflow-hidden">
        {enquiries.map((e) => {
          const horseName = e.horse_name ?? `${e.horse_sire} × ${e.horse_dam}`;
          return (
            <button
              key={e.id}
              onClick={() => handleSelect(e)}
              className="w-full text-left px-4 py-3 hover:bg-paper-dim transition-colors"
            >
              <p className="text-sm font-medium">{e.contact_name}</p>
              <p className="text-xs text-charcoal-soft">{horseName}</p>
              <div className="flex items-center justify-between mt-1">
                <Caption className="text-charcoal-soft">{fmtDate(e.created_at)}</Caption>
                {forwardBadge(e)}
              </div>
            </button>
          );
        })}
      </div>

      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent side="bottom" className="max-h-[90dvh] overflow-y-auto rounded-t-2xl">
          <SheetHeader className="px-4 pt-4 pb-2 border-b border-fog">
            <SheetTitle className="text-base">{selected?.contact_name}</SheetTitle>
          </SheetHeader>
          {selected && <EnquiryDetail enquiry={selected} />}
        </SheetContent>
      </Sheet>
    </>
  );
}
