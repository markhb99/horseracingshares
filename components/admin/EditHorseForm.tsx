'use client';

import * as React from 'react';
import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { createBrowserSupabaseClient } from '@/lib/supabase/browser';
import { Plus, Trash2, Loader2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { PedigreeExtractUpload } from '@/components/admin/PedigreeExtractUpload';
import type { ExtractedPedigree } from '@/components/admin/PedigreeExtractUpload';

// ─── Schema ───────────────────────────────────────────────────────────────────

const formSchema = z.object({
  name: z.string().trim().max(120).optional(),
  sire: z.string().trim().min(1, 'Required').max(120),
  dam: z.string().trim().min(1, 'Required').max(120),
  dam_sire: z.string().trim().max(120).optional(),
  ped_ss: z.string().trim().max(120).optional(),
  ped_sd: z.string().trim().max(120).optional(),
  ped_ds: z.string().trim().max(120).optional(),
  ped_dd: z.string().trim().max(120).optional(),
  ped_sss: z.string().trim().max(120).optional(),
  ped_ssd: z.string().trim().max(120).optional(),
  ped_sds: z.string().trim().max(120).optional(),
  ped_sdd: z.string().trim().max(120).optional(),
  ped_dss: z.string().trim().max(120).optional(),
  ped_dsd: z.string().trim().max(120).optional(),
  ped_dds: z.string().trim().max(120).optional(),
  ped_ddd: z.string().trim().max(120).optional(),
  ped_ssss: z.string().trim().max(120).optional(),
  ped_sssd: z.string().trim().max(120).optional(),
  ped_ssds: z.string().trim().max(120).optional(),
  ped_ssdd: z.string().trim().max(120).optional(),
  ped_sdss: z.string().trim().max(120).optional(),
  ped_sdsd: z.string().trim().max(120).optional(),
  ped_sdds: z.string().trim().max(120).optional(),
  ped_sddd: z.string().trim().max(120).optional(),
  ped_dsss: z.string().trim().max(120).optional(),
  ped_dssd: z.string().trim().max(120).optional(),
  ped_dsds: z.string().trim().max(120).optional(),
  ped_dsdd: z.string().trim().max(120).optional(),
  ped_ddss: z.string().trim().max(120).optional(),
  ped_ddsd: z.string().trim().max(120).optional(),
  ped_ddds: z.string().trim().max(120).optional(),
  ped_dddd: z.string().trim().max(120).optional(),
  sex: z.enum(['colt', 'filly', 'gelding', 'mare', 'stallion'], { error: 'Select a sex' }),
  foal_date: z.string().optional(),
  colour: z.enum(['bay', 'brown', 'chestnut', 'grey', 'black', 'roan', 'other', '']).optional(),
  location_state: z.enum(['NSW', 'VIC', 'QLD', 'SA', 'WA', 'TAS', 'ACT', 'NT'], { error: 'Select a state' }),
  location_postcode: z.string().trim().regex(/^\d{4}$/, 'Must be 4 digits').optional().or(z.literal('')),
  description: z.string().trim().max(2000).optional(),
  vet_xray_clear: z.boolean().optional(),
  vet_scope_clear: z.boolean().optional(),
  ongoing_cost_dollars: z.string().optional(),
  share_listings: z
    .array(
      z.object({
        share_pct: z.number({ error: 'Enter a %' }).positive().max(25),
        price_dollars: z.number({ error: 'Enter a price' }).positive(),
        available: z.boolean(),
      }),
    )
    .min(1, 'Add at least one share size'),
  pds_url: z.string().url('Enter a valid URL').max(2000),
  pds_dated: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

// ─── Props ────────────────────────────────────────────────────────────────────

export interface HorseEditData {
  id: string;
  name: string | null;
  sire: string;
  dam: string;
  dam_sire: string | null;
  sex: string;
  foal_date: string | null;
  colour: string | null;
  location_state: string;
  location_postcode: string | null;
  description: string | null;
  vet_xray_clear: boolean | null;
  vet_scope_clear: boolean | null;
  ongoing_cost_cents_per_pct_per_week: number | null;
  share_listings: Array<{ pct: number; price_cents: number; available: boolean }>;
  pds_url: string;
  pds_dated: string | null;
  pedigree_json: Record<string, { name: string }>;
  hero_image_path: string | null;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function inputCls(err = false) {
  return cn(
    'w-full rounded-lg border bg-white px-3 py-2.5 text-sm text-charcoal',
    'placeholder:text-charcoal/40 outline-none',
    'focus:ring-2 focus:ring-midnight/30 focus:border-midnight',
    'transition-[border-color,box-shadow] duration-150',
    err ? 'border-destructive ring-1 ring-destructive/20' : 'border-fog',
  );
}

function Field({
  label, required, hint, error, children,
}: {
  label: string; required?: boolean; hint?: string; error?: string; children: React.ReactNode;
}) {
  return (
    <div className="space-y-1">
      <label className="block text-sm font-medium text-charcoal">
        {label}
        {required && <span className="ml-0.5 text-destructive" aria-hidden>*</span>}
      </label>
      {hint && <p className="text-xs text-charcoal-soft">{hint}</p>}
      {children}
      {error && <p className="text-xs text-destructive" role="alert">{error}</p>}
    </div>
  );
}

function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="text-sm font-semibold text-charcoal uppercase tracking-wider pt-2 border-t border-fog">
      {children}
    </h3>
  );
}

function pedName(pedigree: Record<string, { name: string }>, slot: string): string {
  return pedigree[slot]?.name ?? '';
}

// ─── Photo upload ─────────────────────────────────────────────────────────────

interface UploadedPhoto { path: string; url: string; name: string }

function PhotoUploadBox({ value, onChange }: { value: UploadedPhoto[]; onChange: (p: UploadedPhoto[]) => void }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  async function handleFiles(files: FileList | null) {
    if (!files?.length) return;
    if (value.length + files.length > 10) { setUploadError('Maximum 10 photos'); return; }
    setUploading(true);
    setUploadError(null);
    const supabase = createBrowserSupabaseClient();
    const sessionId = Date.now().toString(36);
    const newPhotos: UploadedPhoto[] = [...value];
    for (const file of Array.from(files)) {
      if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) { setUploadError('Only JPEG, PNG or WebP'); continue; }
      const path = `pending/${sessionId}/${file.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
      const { error } = await supabase.storage.from('horse-photos').upload(path, file, { upsert: true });
      if (error) { setUploadError(error.message); continue; }
      const { data: { publicUrl } } = supabase.storage.from('horse-photos').getPublicUrl(path);
      newPhotos.push({ path, url: publicUrl, name: file.name });
    }
    onChange(newPhotos);
    setUploading(false);
  }

  async function remove(idx: number) {
    const supabase = createBrowserSupabaseClient();
    await supabase.storage.from('horse-photos').remove([value[idx].path]);
    onChange(value.filter((_, i) => i !== idx));
  }

  return (
    <div className="space-y-3">
      <div
        className="border-2 border-dashed border-fog rounded-lg p-6 text-center cursor-pointer hover:border-midnight/40 transition-colors"
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => { e.preventDefault(); handleFiles(e.dataTransfer.files); }}
      >
        {uploading ? (
          <Loader2 className="mx-auto h-5 w-5 animate-spin text-charcoal-soft" />
        ) : (
          <p className="text-sm text-charcoal-soft">Click or drag to add photos (JPEG / PNG / WebP)</p>
        )}
        <input ref={inputRef} type="file" accept="image/jpeg,image/png,image/webp" multiple className="hidden" onChange={(e) => handleFiles(e.target.files)} />
      </div>
      {uploadError && <p className="text-xs text-destructive">{uploadError}</p>}
      {value.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {value.map((p, idx) => (
            <div key={p.path} className="relative group">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={p.url} alt={p.name} className="h-20 w-20 rounded-lg object-cover border border-fog" />
              {idx === 0 && <span className="absolute bottom-1 left-1 rounded bg-midnight/70 px-1 text-[10px] text-paper">Hero</span>}
              <button type="button" onClick={() => remove(idx)} className="absolute -top-1.5 -right-1.5 hidden group-hover:flex h-5 w-5 items-center justify-center rounded-full bg-destructive text-white">
                <X size={10} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Main form ────────────────────────────────────────────────────────────────

export function EditHorseForm({ horse }: { horse: HorseEditData }) {
  const router = useRouter();
  const [photos, setPhotos] = useState<UploadedPhoto[]>([]);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const foalDateValue = horse.foal_date
    ? horse.foal_date.slice(0, 7) // "YYYY-MM-DD" → "YYYY-MM"
    : undefined;

  const { register, control, handleSubmit, setValue, formState: { errors, isSubmitting } } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: horse.name ?? '',
      sire: horse.sire,
      dam: horse.dam,
      dam_sire: horse.dam_sire ?? '',
      ped_ss: pedName(horse.pedigree_json, 'ss'),
      ped_sd: pedName(horse.pedigree_json, 'sd'),
      ped_ds: pedName(horse.pedigree_json, 'ds'),
      ped_dd: pedName(horse.pedigree_json, 'dd'),
      ped_sss: pedName(horse.pedigree_json, 'sss'),
      ped_ssd: pedName(horse.pedigree_json, 'ssd'),
      ped_sds: pedName(horse.pedigree_json, 'sds'),
      ped_sdd: pedName(horse.pedigree_json, 'sdd'),
      ped_dss: pedName(horse.pedigree_json, 'dss'),
      ped_dsd: pedName(horse.pedigree_json, 'dsd'),
      ped_dds: pedName(horse.pedigree_json, 'dds'),
      ped_ddd: pedName(horse.pedigree_json, 'ddd'),
      ped_ssss: pedName(horse.pedigree_json, 'ssss'),
      ped_sssd: pedName(horse.pedigree_json, 'sssd'),
      ped_ssds: pedName(horse.pedigree_json, 'ssds'),
      ped_ssdd: pedName(horse.pedigree_json, 'ssdd'),
      ped_sdss: pedName(horse.pedigree_json, 'sdss'),
      ped_sdsd: pedName(horse.pedigree_json, 'sdsd'),
      ped_sdds: pedName(horse.pedigree_json, 'sdds'),
      ped_sddd: pedName(horse.pedigree_json, 'sddd'),
      ped_dsss: pedName(horse.pedigree_json, 'dsss'),
      ped_dssd: pedName(horse.pedigree_json, 'dssd'),
      ped_dsds: pedName(horse.pedigree_json, 'dsds'),
      ped_dsdd: pedName(horse.pedigree_json, 'dsdd'),
      ped_ddss: pedName(horse.pedigree_json, 'ddss'),
      ped_ddsd: pedName(horse.pedigree_json, 'ddsd'),
      ped_ddds: pedName(horse.pedigree_json, 'ddds'),
      ped_dddd: pedName(horse.pedigree_json, 'dddd'),
      sex: horse.sex as FormValues['sex'],
      foal_date: foalDateValue,
      colour: (horse.colour ?? '') as FormValues['colour'],
      location_state: horse.location_state as FormValues['location_state'],
      location_postcode: horse.location_postcode ?? '',
      description: horse.description ?? '',
      vet_xray_clear: horse.vet_xray_clear ?? false,
      vet_scope_clear: horse.vet_scope_clear ?? false,
      ongoing_cost_dollars: horse.ongoing_cost_cents_per_pct_per_week
        ? (horse.ongoing_cost_cents_per_pct_per_week / 100).toFixed(2)
        : '',
      share_listings: horse.share_listings.map((s) => ({
        share_pct: s.pct,
        price_dollars: s.price_cents / 100,
        available: s.available,
      })),
      pds_url: horse.pds_url,
      pds_dated: horse.pds_dated ?? '',
    },
  });

  const { fields, append, remove } = useFieldArray({ control, name: 'share_listings' });

  function handleExtracted(pedigree: ExtractedPedigree) {
    const slotToField: Record<string, keyof FormValues> = {
      ss: 'ped_ss', sd: 'ped_sd', ds: 'ped_ds', dd: 'ped_dd',
      sss: 'ped_sss', ssd: 'ped_ssd', sds: 'ped_sds', sdd: 'ped_sdd',
      dss: 'ped_dss', dsd: 'ped_dsd', dds: 'ped_dds', ddd: 'ped_ddd',
      ssss: 'ped_ssss', sssd: 'ped_sssd', ssds: 'ped_ssds', ssdd: 'ped_ssdd',
      sdss: 'ped_sdss', sdsd: 'ped_sdsd', sdds: 'ped_sdds', sddd: 'ped_sddd',
      dsss: 'ped_dsss', dssd: 'ped_dssd', dsds: 'ped_dsds', dsdd: 'ped_dsdd',
      ddss: 'ped_ddss', ddsd: 'ped_ddsd', ddds: 'ped_ddds', dddd: 'ped_dddd',
    };
    for (const [slot, field] of Object.entries(slotToField)) {
      if (pedigree[slot]?.name) setValue(field, pedigree[slot].name);
    }
  }

  async function onSubmit(values: FormValues) {
    setSubmitError(null);

    const shareCents = values.share_listings.map((s) => ({
      pct: s.share_pct,
      price_cents: Math.round(s.price_dollars * 100),
      available: s.available,
    }));

    const pedigreeJson: Record<string, unknown> = {};
    if (values.sire) pedigreeJson['s'] = { name: values.sire, yob: null, country: 'AUS', sex: 'sire', is_stakes_winner: false, is_stakes_producer: false, is_group1_winner: false, is_dam_line: false };
    if (values.dam) pedigreeJson['d'] = { name: values.dam, yob: null, country: 'AUS', sex: 'mare', is_stakes_winner: false, is_stakes_producer: false, is_group1_winner: false, is_dam_line: false };

    const pedSlots: Array<[string, string | undefined, 'sire' | 'mare']> = [
      ['ss', values.ped_ss, 'sire'], ['sd', values.ped_sd, 'mare'],
      ['ds', values.ped_ds, 'sire'], ['dd', values.ped_dd, 'mare'],
      ['sss', values.ped_sss, 'sire'], ['ssd', values.ped_ssd, 'mare'],
      ['sds', values.ped_sds, 'sire'], ['sdd', values.ped_sdd, 'mare'],
      ['dss', values.ped_dss, 'sire'], ['dsd', values.ped_dsd, 'mare'],
      ['dds', values.ped_dds, 'sire'], ['ddd', values.ped_ddd, 'mare'],
    ];
    for (const [slot, name, sex] of pedSlots) {
      if (name) pedigreeJson[slot] = { name, yob: null, country: 'AUS', sex, is_stakes_winner: false, is_stakes_producer: false, is_group1_winner: false, is_dam_line: false };
    }
    const gen4: Array<[string, string, 'sire' | 'mare']> = [
      ['ssss', values.ped_ssss ?? '', 'sire'], ['sssd', values.ped_sssd ?? '', 'mare'],
      ['ssds', values.ped_ssds ?? '', 'sire'], ['ssdd', values.ped_ssdd ?? '', 'mare'],
      ['sdss', values.ped_sdss ?? '', 'sire'], ['sdsd', values.ped_sdsd ?? '', 'mare'],
      ['sdds', values.ped_sdds ?? '', 'sire'], ['sddd', values.ped_sddd ?? '', 'mare'],
      ['dsss', values.ped_dsss ?? '', 'sire'], ['dssd', values.ped_dssd ?? '', 'mare'],
      ['dsds', values.ped_dsds ?? '', 'sire'], ['dsdd', values.ped_dsdd ?? '', 'mare'],
      ['ddss', values.ped_ddss ?? '', 'sire'], ['ddsd', values.ped_ddsd ?? '', 'mare'],
      ['ddds', values.ped_ddds ?? '', 'sire'], ['dddd', values.ped_dddd ?? '', 'mare'],
    ];
    for (const [slot, name, sex] of gen4) {
      if (name) pedigreeJson[slot] = { name, yob: null, country: 'AUS', sex, is_stakes_winner: false, is_stakes_producer: false, is_group1_winner: false, is_dam_line: false };
    }

    const res = await fetch(`/api/admin/horses/${horse.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: values.name || null,
        sire: values.sire,
        dam: values.dam,
        dam_sire: values.dam_sire || null,
        sex: values.sex,
        foal_date: values.foal_date || null,
        colour: values.colour || null,
        location_state: values.location_state,
        location_postcode: values.location_postcode || null,
        description: values.description || null,
        bonus_schemes: [],
        vet_xray_clear: values.vet_xray_clear ?? false,
        vet_scope_clear: values.vet_scope_clear ?? false,
        ongoing_cost_cents_per_pct_per_week: values.ongoing_cost_dollars
          ? Math.round(parseFloat(values.ongoing_cost_dollars) * 100)
          : null,
        share_listings: shareCents,
        pds_url: values.pds_url,
        pds_dated: values.pds_dated || null,
        pedigree_json: Object.keys(pedigreeJson).length > 0 ? pedigreeJson : {},
      }),
    });

    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setSubmitError(body.error ?? 'Failed to save');
      return;
    }

    router.push('/admin');
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 max-w-2xl">

      {/* ── Horse details ──────────────────────────────────────────────────── */}
      <SectionHeading>Horse details</SectionHeading>

      <div className="grid grid-cols-2 gap-4">
        <Field label="Registered name" hint="Leave blank if unnamed">
          <input {...register('name')} placeholder="e.g. Winx" className={inputCls()} />
        </Field>
        <Field label="Sex" required error={errors.sex?.message}>
          <select {...register('sex')} className={inputCls(!!errors.sex)}>
            <option value="">— select —</option>
            {['colt', 'filly', 'gelding', 'mare', 'stallion'].map((s) => (
              <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
            ))}
          </select>
        </Field>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Field label="Sire" required error={errors.sire?.message}>
          <input {...register('sire')} className={inputCls(!!errors.sire)} />
        </Field>
        <Field label="Dam" required error={errors.dam?.message}>
          <input {...register('dam')} className={inputCls(!!errors.dam)} />
        </Field>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Field label="Dam's sire">
          <input {...register('dam_sire')} className={inputCls()} />
        </Field>
        <Field label="Foal date">
          <input {...register('foal_date')} type="month" className={inputCls()} />
        </Field>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Field label="Colour">
          <select {...register('colour')} className={inputCls()}>
            <option value="">— select —</option>
            {['bay', 'brown', 'chestnut', 'grey', 'black', 'roan', 'other'].map((c) => (
              <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>
            ))}
          </select>
        </Field>
        <Field label="State" required error={errors.location_state?.message}>
          <select {...register('location_state')} className={inputCls(!!errors.location_state)}>
            <option value="">— select —</option>
            {['NSW', 'VIC', 'QLD', 'SA', 'WA', 'TAS', 'ACT', 'NT'].map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </Field>
      </div>

      <Field label="Postcode" error={errors.location_postcode?.message}>
        <input {...register('location_postcode')} maxLength={4} className={inputCls(!!errors.location_postcode)} />
      </Field>

      <Field label="Description">
        <textarea {...register('description')} rows={4} className={inputCls()} />
      </Field>

      {/* ── Pedigree ───────────────────────────────────────────────────────── */}
      <details className="group" open>
        <summary className="cursor-pointer select-none list-none flex items-center gap-2 text-sm font-semibold text-charcoal uppercase tracking-wider pt-2 border-t border-fog">
          <span className="transition-transform group-open:rotate-90" aria-hidden="true">&#9658;</span>
          Pedigree
        </summary>

        <div className="mt-4 space-y-4">
          <PedigreeExtractUpload onExtracted={handleExtracted} />

          <p className="text-xs font-medium text-charcoal-soft uppercase tracking-wide">Grandparents</p>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Sire's sire (SS)">
              <input {...register('ped_ss')} className={inputCls()} />
            </Field>
            <Field label="Sire's dam (SD)">
              <input {...register('ped_sd')} className={inputCls()} />
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Dam's sire (DS)">
              <input {...register('ped_ds')} className={inputCls()} />
            </Field>
            <Field label="Dam's dam (DD)">
              <input {...register('ped_dd')} className={inputCls()} />
            </Field>
          </div>

          <p className="text-xs font-medium text-charcoal-soft uppercase tracking-wide pt-2">Great-grandparents</p>
          <div className="grid grid-cols-2 gap-4">
            <Field label="SS's sire (SSS)"><input {...register('ped_sss')} className={inputCls()} /></Field>
            <Field label="SS's dam (SSD)"><input {...register('ped_ssd')} className={inputCls()} /></Field>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Field label="SD's sire (SDS)"><input {...register('ped_sds')} className={inputCls()} /></Field>
            <Field label="SD's dam (SDD)"><input {...register('ped_sdd')} className={inputCls()} /></Field>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Field label="DS's sire (DSS)"><input {...register('ped_dss')} className={inputCls()} /></Field>
            <Field label="DS's dam (DSD)"><input {...register('ped_dsd')} className={inputCls()} /></Field>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Field label="DD's sire (DDS)"><input {...register('ped_dds')} className={inputCls()} /></Field>
            <Field label="DD's dam (DDD)"><input {...register('ped_ddd')} className={inputCls()} /></Field>
          </div>

          <p className="text-xs font-medium text-charcoal-soft uppercase tracking-wide pt-2">Great-great-grandparents</p>
          <div className="grid grid-cols-2 gap-4">
            <Field label="SSS's sire (SSSS)"><input {...register('ped_ssss')} className={inputCls()} /></Field>
            <Field label="SSS's dam (SSSD)"><input {...register('ped_sssd')} className={inputCls()} /></Field>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Field label="SSD's sire (SSDS)"><input {...register('ped_ssds')} className={inputCls()} /></Field>
            <Field label="SSD's dam (SSDD)"><input {...register('ped_ssdd')} className={inputCls()} /></Field>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Field label="SDS's sire (SDSS)"><input {...register('ped_sdss')} className={inputCls()} /></Field>
            <Field label="SDS's dam (SDSD)"><input {...register('ped_sdsd')} className={inputCls()} /></Field>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Field label="SDD's sire (SDDS)"><input {...register('ped_sdds')} className={inputCls()} /></Field>
            <Field label="SDD's dam (SDDD)"><input {...register('ped_sddd')} className={inputCls()} /></Field>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Field label="DSS's sire (DSSS)"><input {...register('ped_dsss')} className={inputCls()} /></Field>
            <Field label="DSS's dam (DSSD)"><input {...register('ped_dssd')} className={inputCls()} /></Field>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Field label="DSD's sire (DSDS)"><input {...register('ped_dsds')} className={inputCls()} /></Field>
            <Field label="DSD's dam (DSDD)"><input {...register('ped_dsdd')} className={inputCls()} /></Field>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Field label="DDS's sire (DDSS)"><input {...register('ped_ddss')} className={inputCls()} /></Field>
            <Field label="DDS's dam (DDSD)"><input {...register('ped_ddsd')} className={inputCls()} /></Field>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Field label="DDD's sire (DDDS)"><input {...register('ped_ddds')} className={inputCls()} /></Field>
            <Field label="DDD's dam (DDDD)"><input {...register('ped_dddd')} className={inputCls()} /></Field>
          </div>
        </div>
      </details>

      {/* ── Vet & costs ────────────────────────────────────────────────────── */}
      <SectionHeading>Vet & ongoing costs</SectionHeading>

      <div className="flex gap-6">
        <label className="flex items-center gap-2 text-sm text-charcoal cursor-pointer">
          <input {...register('vet_xray_clear')} type="checkbox" className="rounded" />
          X-ray clear
        </label>
        <label className="flex items-center gap-2 text-sm text-charcoal cursor-pointer">
          <input {...register('vet_scope_clear')} type="checkbox" className="rounded" />
          Scope clear
        </label>
      </div>

      <Field label="Estimated ongoing cost" hint="Per 1% share per week (AUD). Leave blank if unknown.">
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-charcoal-soft">$</span>
          <input {...register('ongoing_cost_dollars')} type="number" min="0" step="0.01" placeholder="0.00" className={cn(inputCls(), 'pl-7')} />
        </div>
      </Field>

      {/* ── Shares & pricing ───────────────────────────────────────────────── */}
      <SectionHeading>Shares & pricing</SectionHeading>

      <div className="space-y-3">
        {fields.map((field, idx) => (
          <div key={field.id} className="flex items-start gap-2">
            <Field label={idx === 0 ? 'Share %' : ''} error={errors.share_listings?.[idx]?.share_pct?.message}>
              <input {...register(`share_listings.${idx}.share_pct`, { valueAsNumber: true })} type="number" min="0.5" max="25" step="0.5" placeholder="5" className={cn(inputCls(!!errors.share_listings?.[idx]?.share_pct), 'w-24')} />
            </Field>
            <Field label={idx === 0 ? 'Price (AUD)' : ''} error={errors.share_listings?.[idx]?.price_dollars?.message}>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-charcoal-soft">$</span>
                <input {...register(`share_listings.${idx}.price_dollars`, { valueAsNumber: true })} type="number" min="1" step="1" placeholder="5000" className={cn(inputCls(!!errors.share_listings?.[idx]?.price_dollars), 'pl-7 w-36')} />
              </div>
            </Field>
            <div className={cn('flex items-center gap-1', idx === 0 ? 'mt-6' : 'mt-0.5')}>
              <label className="flex items-center gap-1.5 text-sm text-charcoal cursor-pointer">
                <input {...register(`share_listings.${idx}.available`)} type="checkbox" className="rounded" />
                Available
              </label>
              {fields.length > 1 && (
                <button type="button" onClick={() => remove(idx)} className="ml-2 rounded p-1 text-charcoal-soft hover:text-destructive">
                  <Trash2 size={14} />
                </button>
              )}
            </div>
          </div>
        ))}
        <Button type="button" variant="outline" size="sm" onClick={() => append({ share_pct: 5, price_dollars: 0, available: true })}>
          <Plus size={14} className="mr-1" /> Add share size
        </Button>
      </div>

      {/* ── Compliance ─────────────────────────────────────────────────────── */}
      <SectionHeading>Compliance</SectionHeading>

      <Field label="PDS URL" required error={errors.pds_url?.message} hint="Direct link to the Product Disclosure Statement PDF.">
        <input {...register('pds_url')} type="url" className={inputCls(!!errors.pds_url)} />
      </Field>

      <Field label="PDS dated">
        <input {...register('pds_dated')} type="date" className={inputCls()} />
      </Field>

      {/* ── New photos ─────────────────────────────────────────────────────── */}
      <SectionHeading>Add photos</SectionHeading>
      <PhotoUploadBox value={photos} onChange={setPhotos} />

      {/* ── Submit ─────────────────────────────────────────────────────────── */}
      {submitError && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          {submitError}
        </div>
      )}

      <div className="flex items-center gap-4 pt-2">
        <Button type="submit" disabled={isSubmitting} className="min-w-[140px]">
          {isSubmitting ? <><Loader2 size={14} className="mr-2 animate-spin" />Saving…</> : 'Save changes'}
        </Button>
        <Button type="button" variant="ghost" onClick={() => router.push('/admin')}>
          Cancel
        </Button>
      </div>

    </form>
  );
}
