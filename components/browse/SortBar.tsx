'use client';

import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

const SORT_OPTIONS = [
  { value: '_text_match:desc,has_final_shares:desc,created_at_unix:desc', label: 'Newest first' },
  { value: 'price_min_cents:asc', label: 'Price: low to high' },
  { value: 'price_max_cents:desc', label: 'Price: high to low' },
  { value: 'has_final_shares:desc,created_at_unix:desc', label: 'Final shares first' },
  { value: 'view_count:desc,created_at_unix:desc', label: 'Most viewed' },
] as const;

export type SortValue = (typeof SORT_OPTIONS)[number]['value'];

export const DEFAULT_SORT = SORT_OPTIONS[0].value;

interface SortBarProps {
  found: number;
  currentSort: string;
}

export function SortBar({ found, currentSort }: SortBarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function handleSortChange(value: string) {
    const params = new URLSearchParams(searchParams.toString());
    params.set('sort', value);
    params.delete('page');
    router.push(`${pathname}?${params.toString()}`);
  }

  const activeSort = SORT_OPTIONS.find((o) => o.value === currentSort)
    ? currentSort
    : DEFAULT_SORT;

  return (
    <div className="flex items-center justify-between py-3">
      <p className="text-small-type text-charcoal-soft">
        {found === 1 ? '1 horse' : `${found.toLocaleString('en-AU')} horses`}
      </p>

      <Select value={activeSort} onValueChange={handleSortChange}>
        <SelectTrigger className="h-8 w-auto min-w-[11rem] border-fog bg-white text-charcoal">
          <SelectValue />
        </SelectTrigger>
        <SelectContent align="end">
          {SORT_OPTIONS.map((opt) => (
            <SelectItem key={opt.value} value={opt.value}>
              {opt.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
