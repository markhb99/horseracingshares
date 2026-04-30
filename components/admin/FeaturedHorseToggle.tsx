'use client';

import { useState } from 'react';
import { Star } from 'lucide-react';

export type FeaturedHorseRow = {
  id: string;
  name: string | null;
  sire: string;
  dam: string;
  syndicator_name: string;
  is_featured: boolean;
};

export function FeaturedHorseToggle({ initialHorses }: { initialHorses: FeaturedHorseRow[] }) {
  const [horses, setHorses] = useState(initialHorses);
  const [loading, setLoading] = useState<string | null>(null);

  async function handleSelect(id: string) {
    if (loading) return;
    setLoading(id);
    try {
      const res = await fetch(`/api/admin/horses/${id}/featured`, { method: 'PATCH' });
      if (res.ok) {
        setHorses((prev) => prev.map((h) => ({ ...h, is_featured: h.id === id })));
      } else {
        alert('Failed to update featured horse.');
      }
    } catch {
      alert('Network error.');
    } finally {
      setLoading(null);
    }
  }

  if (horses.length === 0) {
    return <p className="text-sm text-muted-foreground">No active horses to feature.</p>;
  }

  return (
    <div className="overflow-x-auto rounded-xl ring-1 ring-foreground/10">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border bg-muted/40">
            <th className="px-4 py-3 text-left font-medium text-muted-foreground">Horse</th>
            <th className="px-4 py-3 text-left font-medium text-muted-foreground">Syndicator</th>
            <th className="px-4 py-3 text-left font-medium text-muted-foreground">Featured</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border bg-card">
          {horses.map((h) => {
            const label = h.name ?? `${h.sire} × ${h.dam}`;
            return (
              <tr key={h.id} className={h.is_featured ? 'bg-amber-50/40' : ''}>
                <td className="px-4 py-3 font-medium">{label}</td>
                <td className="px-4 py-3 text-muted-foreground">{h.syndicator_name}</td>
                <td className="px-4 py-3">
                  <button
                    onClick={() => handleSelect(h.id)}
                    disabled={loading === h.id || h.is_featured}
                    aria-label={h.is_featured ? 'Currently featured' : `Set ${label} as featured`}
                    className={`flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium transition-colors disabled:opacity-50 ${
                      h.is_featured
                        ? 'bg-amber-100 text-amber-800 cursor-default'
                        : 'bg-muted text-muted-foreground hover:bg-amber-100 hover:text-amber-800'
                    }`}
                  >
                    <Star size={12} className={h.is_featured ? 'fill-amber-500 text-amber-500' : ''} />
                    {h.is_featured ? 'Featured' : 'Set as featured'}
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
