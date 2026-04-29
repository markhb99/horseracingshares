'use client';

import { useState } from 'react';
import { Caption } from '@/components/typography';
import { Button } from '@/components/ui/button';
import { Trash2, Download } from 'lucide-react';

export type EnquiryRow = {
  id: string;
  created_at: string;
  contact_name: string;
  contact_email: string;
  contact_phone: string | null;
  share_size_interested_pct: number | null;
  message: string | null;
  status: string | null;
  forwarded_to_syndicator_at: string | null;
  horse_name: string;
  syndicator_name: string;
};

function fmtDate(s: string | null) {
  if (!s) return '—';
  return new Date(s).toLocaleDateString('en-AU', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit', timeZone: 'Australia/Melbourne',
  });
}

function exportCsv(rows: EnquiryRow[]) {
  const headers = ['Date', 'Name', 'Email', 'Phone', 'Horse', 'Syndicator', 'Share %', 'Message', 'Status', 'Forwarded At'];
  const escape = (v: string | null | undefined) => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const lines = [
    headers.join(','),
    ...rows.map((e) => [
      escape(fmtDate(e.created_at)),
      escape(e.contact_name),
      escape(e.contact_email),
      escape(e.contact_phone),
      escape(e.horse_name),
      escape(e.syndicator_name),
      escape(e.share_size_interested_pct?.toString()),
      escape(e.message),
      escape(e.status),
      escape(fmtDate(e.forwarded_to_syndicator_at)),
    ].join(',')),
  ];
  const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `enquiries-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export function EnquiryTable({ initialRows }: { initialRows: EnquiryRow[] }) {
  const [rows, setRows] = useState(initialRows);
  const [deleting, setDeleting] = useState<string | null>(null);

  async function handleDelete(id: string) {
    if (!confirm('Delete this enquiry? This cannot be undone.')) return;
    setDeleting(id);
    try {
      const res = await fetch(`/api/admin/enquiries/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setRows((prev) => prev.filter((r) => r.id !== id));
      } else {
        alert('Failed to delete enquiry.');
      }
    } catch {
      alert('Network error.');
    } finally {
      setDeleting(null);
    }
  }

  if (rows.length === 0) {
    return <p className="text-sm text-muted-foreground">No enquiries yet.</p>;
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex justify-end">
        <Button variant="outline" size="sm" onClick={() => exportCsv(rows)}>
          <Download size={14} className="mr-1.5" />
          Export CSV
        </Button>
      </div>
      <div className="overflow-x-auto rounded-xl ring-1 ring-foreground/10">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/40">
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Date</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Prospect</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Horse</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Syndicator</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Share</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Status</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-border bg-card">
            {rows.map((e) => {
              const statusColour =
                e.status === 'forwarded' ? 'text-success' :
                e.status === 'failed' ? 'text-destructive' : 'text-muted-foreground';
              return (
                <tr key={e.id}>
                  <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">{fmtDate(e.created_at)}</td>
                  <td className="px-4 py-3">
                    <div className="font-medium">{e.contact_name}</div>
                    <Caption className="text-muted-foreground">{e.contact_email}</Caption>
                    {e.contact_phone && <Caption className="text-muted-foreground">{e.contact_phone}</Caption>}
                  </td>
                  <td className="px-4 py-3 max-w-[160px] truncate">{e.horse_name}</td>
                  <td className="px-4 py-3 text-muted-foreground">{e.syndicator_name}</td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {e.share_size_interested_pct ? `${e.share_size_interested_pct}%` : '—'}
                  </td>
                  <td className={`px-4 py-3 font-medium capitalize ${statusColour}`}>
                    {e.status ?? 'pending'}
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => handleDelete(e.id)}
                      disabled={deleting === e.id}
                      className="text-muted-foreground hover:text-destructive transition-colors disabled:opacity-40"
                      aria-label="Delete enquiry"
                    >
                      <Trash2 size={15} />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
