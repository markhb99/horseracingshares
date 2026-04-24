'use client';

import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import Link from 'next/link';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Field, FieldLabel, FieldError } from '@/components/ui/field';
import type { FilterJson } from '@/lib/search/filter-schema';

// ─── Types ────────────────────────────────────────────────────────

export interface SavedSearchModalProps {
  open: boolean;
  onClose: () => void;
  filterJson: FilterJson;
  q: string;
  resultCount: number;
  isLoggedIn: boolean;
}

// ─── Helpers ──────────────────────────────────────────────────────

function deriveSearchName(filterJson: FilterJson, q: string): string {
  const parts: string[] = [];

  if (q.trim()) parts.push(q.trim());
  if (filterJson.sire?.length) parts.push(filterJson.sire.slice(0, 2).join('/'));
  if (filterJson.sex?.length) parts.push(filterJson.sex.map((s) => s + 's').join('/'));
  if (filterJson.age_category?.length) parts.push(filterJson.age_category.join('/'));
  if (filterJson.location_state?.length) {
    parts.push(filterJson.location_state.slice(0, 3).join('/'));
  }
  if (filterJson.trainer?.length) {
    parts.push(filterJson.trainer.slice(0, 1).join(''));
  }
  if (
    filterJson.price_min_cents != null ||
    filterJson.price_max_cents != null
  ) {
    const min = filterJson.price_min_cents
      ? `$${Math.round(filterJson.price_min_cents / 100).toLocaleString('en-AU')}`
      : '';
    const max = filterJson.price_max_cents
      ? `$${Math.round(filterJson.price_max_cents / 100).toLocaleString('en-AU')}`
      : '';
    parts.push(min && max ? `${min}–${max}` : min || max);
  }

  if (!parts.length) return 'My saved search';

  const label = parts.join(' ');
  return label.charAt(0).toUpperCase() + label.slice(1);
}

// ─── Form schema ──────────────────────────────────────────────────

const schema = z.object({
  name: z.string().min(1, 'Name is required').max(100, 'Max 100 characters'),
  frequency: z.enum(['off', 'daily', 'weekly']),
});

type FormValues = z.infer<typeof schema>;

// ─── SavedSearchModal ─────────────────────────────────────────────

export function SavedSearchModal({
  open,
  onClose,
  filterJson,
  q,
  resultCount,
  isLoggedIn,
}: SavedSearchModalProps) {
  const [saving, setSaving] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: deriveSearchName(filterJson, q),
      frequency: 'weekly',
    },
  });

  useEffect(() => {
    if (open) {
      reset({
        name: deriveSearchName(filterJson, q),
        frequency: 'weekly',
      });
    }
  }, [open, filterJson, q, reset]);

  async function onSubmit(values: FormValues) {
    setSaving(true);
    try {
      const res = await fetch('/api/saved-searches', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: values.name,
          filter_json: filterJson,
          q: q || undefined,
          frequency: values.frequency,
        }),
      });

      if (!res.ok) {
        const json = (await res.json()) as { error?: string };
        throw new Error(json.error ?? 'Failed to save search');
      }

      onClose();
      toast.success("Search saved! We'll email you when new horses match.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setSaving(false);
    }
  }

  const frequencyValue = watch('frequency');

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="bg-paper sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-h5">Save this search</DialogTitle>
          <DialogDescription className="text-small-type text-charcoal-soft">
            Get email alerts when new horses match.{' '}
            <span className="text-charcoal">
              Currently {resultCount.toLocaleString('en-AU')} horse
              {resultCount !== 1 ? 's' : ''} match.
            </span>
          </DialogDescription>
        </DialogHeader>

        {!isLoggedIn ? (
          <div className="py-4 text-center">
            <p className="mb-4 text-small-type text-charcoal">
              Sign in to save searches and receive alerts.
            </p>
            <Button asChild className="bg-midnight text-paper hover:bg-midnight-light">
              <Link href="/login">Sign in</Link>
            </Button>
          </div>
        ) : (
          <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4 pt-2">
            <Field>
              <FieldLabel htmlFor="saved-search-name">Search name</FieldLabel>
              <Input
                id="saved-search-name"
                {...register('name')}
                className="border-fog bg-white"
                disabled={saving}
              />
              <FieldError errors={[errors.name]} />
            </Field>

            <Field>
              <FieldLabel htmlFor="saved-search-frequency">Alert frequency</FieldLabel>
              <Select
                value={frequencyValue}
                onValueChange={(v) =>
                  setValue('frequency', v as FormValues['frequency'], {
                    shouldValidate: true,
                  })
                }
                disabled={saving}
              >
                <SelectTrigger id="saved-search-frequency" className="border-fog bg-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="weekly">Weekly (Monday mornings)</SelectItem>
                  <SelectItem value="daily">Daily (every morning)</SelectItem>
                  <SelectItem value="off">Off (save without alerts)</SelectItem>
                </SelectContent>
              </Select>
            </Field>

            <Button
              type="submit"
              disabled={saving}
              className="w-full bg-midnight text-paper hover:bg-midnight-light"
            >
              {saving ? 'Saving…' : 'Save search'}
            </Button>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
