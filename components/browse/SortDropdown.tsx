'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  SORT_OPTIONS,
  DEFAULT_SORT_PARAM,
  type SortParam,
} from '@/lib/search/sort';

export { sortParamToTypesense } from '@/lib/search/sort';

// ─── SortDropdown ─────────────────────────────────────────────────

interface SortDropdownProps {
  /** Current sort param value from the URL (e.g. "price_asc"). */
  currentSort: string;
}

export function SortDropdown({ currentSort }: SortDropdownProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const activeSort = SORT_OPTIONS.some((o) => o.value === currentSort)
    ? (currentSort as SortParam)
    : DEFAULT_SORT_PARAM;

  function handleChange(value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value === DEFAULT_SORT_PARAM) {
      params.delete('sort');
    } else {
      params.set('sort', value);
    }
    params.delete('page');
    router.push(`/browse?${params.toString()}`);
  }

  return (
    <Select value={activeSort} onValueChange={handleChange}>
      <SelectTrigger className="h-9 w-auto min-w-[10rem] rounded-full border-fog bg-white text-charcoal">
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
  );
}
