'use client';

/**
 * SubmitStepper — 4-step horse listing form.
 * Step 1: Horse details
 * Step 2: Shares & pricing
 * Step 3: Compliance (PDS + AFSL confirmation)
 * Step 4: Choose tier + pay
 *
 * On Step 4 "Pay and submit", POSTs to /api/list/create-checkout and
 * redirects to the returned Stripe URL.
 */

import * as React from 'react';
import { useState, useEffect, useRef } from 'react';
import { createBrowserSupabaseClient } from '@/lib/supabase/browser';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useSearchParams } from 'next/navigation';
import { Check, Plus, Trash2, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Caption } from '@/components/typography';
import { ListingTierTable } from '@/components/list/ListingTierTable';
import { cn } from '@/lib/utils';

// ─── Types ────────────────────────────────────────────────────────────────────

interface SyndicatorInfo {
  id: string;
  name: string;
  afsl_number: string | null;
  afsl_status: string;
}

interface SubmitStepperProps {
  syndicator: SyndicatorInfo;
}

// ─── Zod schemas per step ────────────────────────────────────────────────────

const step1Schema = z.object({
  name: z.string().trim().max(120).optional(),
  sire: z.string().trim().min(1, 'Sire is required').max(120),
  dam: z.string().trim().min(1, 'Dam is required').max(120),
  dam_sire: z.string().trim().max(120).optional(),
  sex: z.enum(['colt', 'filly', 'gelding', 'mare', 'stallion'], {
    error: () => ({ message: 'Please select a sex' }),
  }),
  foal_date: z.string().optional(),
  colour: z.enum(['bay', 'brown', 'chestnut', 'grey', 'black', 'roan', 'other', '']).optional(),
  location_state: z.enum(['NSW', 'VIC', 'QLD', 'SA', 'WA', 'TAS', 'ACT', 'NT'], {
    error: () => ({ message: 'Please select a state' }),
  }),
  location_postcode: z
    .string()
    .trim()
    .regex(/^\d{4}$/, 'Must be a 4-digit postcode')
    .optional()
    .or(z.literal('')),
  primary_trainer_name: z.string().trim().max(120).optional(),
  description: z.string().trim().max(2000).optional(),
  bonus_schemes: z.array(z.string()).optional(),
  vet_xray_clear: z.boolean().optional(),
  vet_scope_clear: z.boolean().optional(),
  vet_checked_at: z.string().optional(),
  ongoing_cost_dollars: z.string().optional(),
});

const shareRowSchema = z.object({
  share_pct: z
    .number({ error: 'Enter a share percentage' })
    .min(0.5, 'Minimum 0.5%')
    .max(25, 'Maximum 25% per row'),
  price_dollars: z
    .number({ error: 'Enter a price' })
    .positive('Price must be positive'),
  available: z.boolean(),
});

const step2Schema = z.object({
  share_listings: z
    .array(shareRowSchema)
    .min(1, 'Add at least one share size')
    .refine(
      (rows) => {
        const total = rows.reduce((sum, r) => sum + (r.share_pct || 0), 0);
        return total <= 100;
      },
      { message: 'Total share percentage cannot exceed 100%' },
    ),
});

const step3Schema = z.object({
  pds_url: z.string().url('Please enter a valid URL').max(2000),
  pds_dated: z.string().optional(),
  afsl_confirmed: z.literal(true, {
    error: () => ({ message: 'You must confirm AFSL compliance to continue' }),
  }),
});

type Step1Values = z.infer<typeof step1Schema>;
type Step2Values = z.infer<typeof step2Schema>;
type Step3Values = z.infer<typeof step3Schema>;

// ─── Helper: input class ─────────────────────────────────────────────────────

function inputClass(hasError = false): string {
  return [
    'w-full rounded-lg border bg-white px-3 py-2.5 text-sm text-charcoal',
    'placeholder:text-charcoal/40 outline-none',
    'focus:ring-2 focus:ring-midnight/30 focus:border-midnight',
    'transition-[border-color,box-shadow] duration-150',
    hasError ? 'border-destructive ring-1 ring-destructive/20' : 'border-fog',
  ].join(' ');
}

// ─── FieldWrapper ────────────────────────────────────────────────────────────

function FieldWrapper({
  label,
  error,
  required,
  hint,
  children,
}: {
  label: string;
  error?: string;
  required?: boolean;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1">
      <label className="block text-sm font-medium text-charcoal">
        {label}
        {required && (
          <span className="ml-0.5 text-destructive" aria-hidden="true">
            *
          </span>
        )}
      </label>
      {hint && <p className="text-xs text-charcoal-soft">{hint}</p>}
      {children}
      {error && (
        <p className="text-xs text-destructive" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}

// ─── Step indicator ──────────────────────────────────────────────────────────

const STEP_LABELS = [
  'Horse details',
  'Shares & pricing',
  'Compliance',
  'Choose tier & pay',
];

function StepIndicator({ currentStep }: { currentStep: number }) {
  return (
    <nav aria-label="Form progress" className="mb-8">
      <ol className="flex items-center gap-0">
        {STEP_LABELS.map((label, idx) => {
          const stepNum = idx + 1;
          const isCompleted = stepNum < currentStep;
          const isCurrent = stepNum === currentStep;

          return (
            <React.Fragment key={label}>
              <li className="flex flex-col items-center gap-1 flex-1">
                <div
                  className={cn(
                    'flex h-8 w-8 items-center justify-center rounded-full text-sm font-semibold border-2',
                    isCompleted
                      ? 'border-midnight bg-midnight text-paper'
                      : isCurrent
                        ? 'border-midnight bg-paper text-midnight'
                        : 'border-fog bg-paper text-charcoal-soft',
                  )}
                  aria-current={isCurrent ? 'step' : undefined}
                >
                  {isCompleted ? (
                    <Check size={14} aria-label={`Step ${stepNum} complete`} />
                  ) : (
                    stepNum
                  )}
                </div>
                <span
                  className={cn(
                    'hidden sm:block text-xs text-center',
                    isCurrent ? 'font-semibold text-midnight' : 'text-charcoal-soft',
                  )}
                >
                  {label}
                </span>
              </li>
              {idx < STEP_LABELS.length - 1 && (
                <div
                  className={cn(
                    'h-px flex-1 mb-5',
                    stepNum < currentStep ? 'bg-midnight' : 'bg-fog',
                  )}
                  aria-hidden="true"
                />
              )}
            </React.Fragment>
          );
        })}
      </ol>
    </nav>
  );
}

// ─── Photo upload ─────────────────────────────────────────────────────────────

interface UploadedPhoto {
  path: string;
  url: string;
  name: string;
}

const MAX_PHOTOS = 5;
const MAX_BYTES = 8 * 1024 * 1024;
const ALLOWED_MIME = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];

function PhotoUploadBox({
  value,
  onChange,
}: {
  value: UploadedPhoto[];
  onChange: (photos: UploadedPhoto[]) => void;
}) {
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const sessionIdRef = useRef<string | undefined>(undefined);
  if (!sessionIdRef.current) sessionIdRef.current = crypto.randomUUID();

  async function handleFiles(files: FileList) {
    const slots = MAX_PHOTOS - value.length;
    const incoming = Array.from(files).slice(0, slots);
    if (incoming.length === 0) return;

    setUploadError(null);
    setUploading(true);

    const supabase = createBrowserSupabaseClient();
    const results: UploadedPhoto[] = [];

    for (const file of incoming) {
      if (!ALLOWED_MIME.includes(file.type)) {
        setUploadError('Only JPEG, PNG, and WebP images are supported.');
        continue;
      }
      if (file.size > MAX_BYTES) {
        setUploadError(`${file.name} exceeds the 8 MB limit.`);
        continue;
      }
      const ext = file.name.split('.').pop() ?? 'jpg';
      const path = `pending/${sessionIdRef.current}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from('horse-photos')
        .upload(path, file, { contentType: file.type, upsert: false });
      if (upErr) {
        setUploadError(`Upload failed: ${upErr.message}`);
        continue;
      }
      const { data: { publicUrl } } = supabase.storage.from('horse-photos').getPublicUrl(path);
      results.push({ path, url: publicUrl, name: file.name });
    }

    setUploading(false);
    if (results.length > 0) onChange([...value, ...results]);
  }

  async function removePhoto(photo: UploadedPhoto) {
    const supabase = createBrowserSupabaseClient();
    await supabase.storage.from('horse-photos').remove([photo.path]);
    onChange(value.filter((p) => p.path !== photo.path));
  }

  return (
    <div className="space-y-3">
      {value.length > 0 && (
        <div className="flex flex-wrap gap-3">
          {value.map((photo) => (
            <div
              key={photo.path}
              className="relative group h-24 w-24 rounded-lg overflow-hidden border border-fog bg-paper-dim flex-shrink-0"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={photo.url} alt={photo.name} className="h-full w-full object-cover" />
              <button
                type="button"
                onClick={() => removePhoto(photo)}
                className="absolute inset-0 flex items-center justify-center bg-midnight/60 text-paper opacity-0 group-hover:opacity-100 transition-opacity"
                aria-label={`Remove ${photo.name}`}
              >
                <Trash2 size={16} aria-hidden />
              </button>
            </div>
          ))}
        </div>
      )}

      {value.length < MAX_PHOTOS && (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          className={cn(
            'w-full rounded-lg border-2 border-dashed px-4 py-6 text-center transition-colors',
            uploading
              ? 'border-fog bg-paper-dim text-charcoal-soft cursor-wait'
              : 'border-fog bg-paper hover:border-midnight/40 hover:bg-paper-dim cursor-pointer',
          )}
        >
          {uploading ? (
            <span className="flex items-center justify-center gap-2 text-sm text-charcoal-soft">
              <Loader2 size={16} className="animate-spin" aria-hidden />
              Uploading…
            </span>
          ) : (
            <span className="text-sm text-charcoal-soft">
              Click to upload photos{' '}
              <span className="text-xs">(JPEG, PNG, WebP · max 8 MB · up to {MAX_PHOTOS})</span>
            </span>
          )}
        </button>
      )}

      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/jpg,image/png,image/webp"
        multiple
        className="sr-only"
        onChange={(e) => {
          if (e.target.files?.length) {
            handleFiles(e.target.files);
            e.target.value = '';
          }
        }}
      />

      {uploadError && <p className="text-xs text-destructive">{uploadError}</p>}
    </div>
  );
}

// ─── Bonus scheme options ────────────────────────────────────────────────────

const BONUS_SCHEMES = ['BOBS', 'VOBIS', 'QTIS', 'MMRS', 'Magic Millions', 'Inglis Classic'];

// ─── Step 1 ──────────────────────────────────────────────────────────────────

function Step1Form({
  defaultValues,
  defaultPhotos,
  onNext,
}: {
  defaultValues: Partial<Step1Values>;
  defaultPhotos: UploadedPhoto[];
  onNext: (data: Step1Values, photos: UploadedPhoto[]) => void;
}) {
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<Step1Values>({
    resolver: zodResolver(step1Schema),
    defaultValues: {
      bonus_schemes: [],
      vet_xray_clear: false,
      vet_scope_clear: false,
      ...defaultValues,
    },
  });

  const [photos, setPhotos] = useState<UploadedPhoto[]>(defaultPhotos);

  const vetXray = watch('vet_xray_clear');
  const vetScope = watch('vet_scope_clear');
  const showVetDate = vetXray || vetScope;
  const bonusSchemes = watch('bonus_schemes') ?? [];

  const toggleScheme = (scheme: string) => {
    const current = bonusSchemes;
    const updated = current.includes(scheme)
      ? current.filter((s) => s !== scheme)
      : [...current, scheme];
    setValue('bonus_schemes', updated);
  };

  return (
    <form onSubmit={handleSubmit((data) => onNext(data, photos))} noValidate className="space-y-5">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <FieldWrapper label="Horse name (if named)" error={errors.name?.message}>
          <input
            type="text"
            placeholder="e.g. Flying Eagle"
            className={inputClass(!!errors.name)}
            {...register('name')}
          />
        </FieldWrapper>

        <FieldWrapper label="Sire" required error={errors.sire?.message}>
          <input
            type="text"
            placeholder="e.g. I Am Invincible"
            className={inputClass(!!errors.sire)}
            {...register('sire')}
          />
        </FieldWrapper>

        <FieldWrapper label="Dam" required error={errors.dam?.message}>
          <input
            type="text"
            placeholder="e.g. Flying Diva"
            className={inputClass(!!errors.dam)}
            {...register('dam')}
          />
        </FieldWrapper>

        <FieldWrapper label="Dam's sire" error={errors.dam_sire?.message}>
          <input
            type="text"
            placeholder="e.g. Lonhro"
            className={inputClass(!!errors.dam_sire)}
            {...register('dam_sire')}
          />
        </FieldWrapper>

        <FieldWrapper label="Sex" required error={errors.sex?.message}>
          <select className={inputClass(!!errors.sex)} {...register('sex')}>
            <option value="">Select sex</option>
            <option value="colt">Colt</option>
            <option value="filly">Filly</option>
            <option value="gelding">Gelding</option>
            <option value="mare">Mare</option>
            <option value="stallion">Stallion</option>
          </select>
        </FieldWrapper>

        <FieldWrapper label="Foal date" error={errors.foal_date?.message}>
          <input
            type="month"
            className={inputClass(!!errors.foal_date)}
            {...register('foal_date')}
          />
        </FieldWrapper>

        <FieldWrapper label="Colour" error={errors.colour?.message}>
          <select className={inputClass(!!errors.colour)} {...register('colour')}>
            <option value="">Select colour (optional)</option>
            <option value="bay">Bay</option>
            <option value="brown">Brown</option>
            <option value="chestnut">Chestnut</option>
            <option value="grey">Grey</option>
            <option value="black">Black</option>
            <option value="roan">Roan</option>
            <option value="other">Other</option>
          </select>
        </FieldWrapper>

        <FieldWrapper label="State" required error={errors.location_state?.message}>
          <select
            className={inputClass(!!errors.location_state)}
            {...register('location_state')}
          >
            <option value="">Select state</option>
            {['NSW', 'VIC', 'QLD', 'SA', 'WA', 'TAS', 'ACT', 'NT'].map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </FieldWrapper>

        <FieldWrapper label="Postcode" error={errors.location_postcode?.message}>
          <input
            type="text"
            maxLength={4}
            placeholder="e.g. 3000"
            className={inputClass(!!errors.location_postcode)}
            {...register('location_postcode')}
          />
        </FieldWrapper>

        <FieldWrapper label="Trainer name" error={errors.primary_trainer_name?.message}>
          <input
            type="text"
            placeholder="e.g. Chris Waller"
            className={inputClass(!!errors.primary_trainer_name)}
            {...register('primary_trainer_name')}
          />
        </FieldWrapper>

        <FieldWrapper
          label="Weekly training cost per 1% share (AUD)"
          error={errors.ongoing_cost_dollars?.message}
        >
          <input
            type="number"
            min="0"
            step="0.01"
            placeholder="e.g. 45.00"
            className={inputClass(!!errors.ongoing_cost_dollars)}
            {...register('ongoing_cost_dollars')}
          />
        </FieldWrapper>
      </div>

      <FieldWrapper label="Listing description" error={errors.description?.message}>
        <textarea
          rows={4}
          maxLength={2000}
          placeholder="Describe the horse, syndication terms, and any notable qualities…"
          className={inputClass(!!errors.description) + ' resize-none'}
          {...register('description')}
        />
      </FieldWrapper>

      {/* Bonus schemes */}
      <div className="space-y-2">
        <p className="text-sm font-medium text-charcoal">Bonus schemes (select all that apply)</p>
        <div className="flex flex-wrap gap-2">
          {BONUS_SCHEMES.map((scheme) => (
            <button
              key={scheme}
              type="button"
              onClick={() => toggleScheme(scheme)}
              className={cn(
                'rounded-full border px-3 py-1 text-sm transition-colors',
                bonusSchemes.includes(scheme)
                  ? 'border-midnight bg-midnight text-paper'
                  : 'border-fog bg-paper text-charcoal hover:border-midnight/50',
              )}
            >
              {scheme}
            </button>
          ))}
        </div>
      </div>

      {/* Vet checks */}
      <div className="space-y-2">
        <p className="text-sm font-medium text-charcoal">Vet checks</p>
        <div className="flex flex-wrap gap-4">
          <label className="flex items-center gap-2 cursor-pointer text-sm text-charcoal">
            <input
              type="checkbox"
              className="h-4 w-4 rounded border-fog accent-midnight"
              {...register('vet_xray_clear')}
            />
            X-rays clear
          </label>
          <label className="flex items-center gap-2 cursor-pointer text-sm text-charcoal">
            <input
              type="checkbox"
              className="h-4 w-4 rounded border-fog accent-midnight"
              {...register('vet_scope_clear')}
            />
            Scope clear
          </label>
        </div>
        {showVetDate && (
          <FieldWrapper label="Vet check date" error={errors.vet_checked_at?.message}>
            <input
              type="date"
              className={inputClass(!!errors.vet_checked_at)}
              {...register('vet_checked_at')}
            />
          </FieldWrapper>
        )}
      </div>

      <FieldWrapper label="Photos (optional)" hint="Up to 5 photos. First photo will be the hero image on your listing.">
        <PhotoUploadBox value={photos} onChange={setPhotos} />
      </FieldWrapper>

      <div className="flex justify-end">
        <Button type="submit" className="rounded-full bg-midnight text-paper hover:bg-midnight/90">
          Next: Shares &amp; pricing →
        </Button>
      </div>
    </form>
  );
}

// ─── Step 2 ──────────────────────────────────────────────────────────────────

function Step2Form({
  defaultValues,
  onNext,
  onBack,
}: {
  defaultValues: Partial<Step2Values>;
  onNext: (data: Step2Values) => void;
  onBack: () => void;
}) {
  const {
    register,
    handleSubmit,
    control,
    watch,
    formState: { errors },
  } = useForm<Step2Values>({
    resolver: zodResolver(step2Schema),
    defaultValues: {
      share_listings: defaultValues.share_listings ?? [
        { share_pct: 5, price_dollars: 5000, available: true },
      ],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'share_listings',
  });

  const watchedListings = watch('share_listings');
  const totalPct = (watchedListings ?? []).reduce(
    (sum, r) => sum + (Number(r?.share_pct) || 0),
    0,
  );

  return (
    <form onSubmit={handleSubmit(onNext)} noValidate className="space-y-6">
      <div className="space-y-3">
        {fields.map((field, idx) => {
          const rowErrors = errors.share_listings?.[idx];
          return (
            <div
              key={field.id}
              className="flex flex-wrap items-end gap-3 rounded-lg border border-fog bg-paper p-4"
            >
              <FieldWrapper
                label="Share size (%)"
                error={rowErrors?.share_pct?.message}
              >
                <input
                  type="number"
                  min="0.5"
                  max="25"
                  step="0.5"
                  placeholder="e.g. 5"
                  className={cn(inputClass(!!rowErrors?.share_pct), 'w-28')}
                  {...register(`share_listings.${idx}.share_pct`, {
                    valueAsNumber: true,
                  })}
                />
              </FieldWrapper>

              <FieldWrapper
                label="Price (AUD)"
                error={rowErrors?.price_dollars?.message}
              >
                <input
                  type="number"
                  min="1"
                  step="1"
                  placeholder="e.g. 5000"
                  className={cn(inputClass(!!rowErrors?.price_dollars), 'w-36')}
                  {...register(`share_listings.${idx}.price_dollars`, {
                    valueAsNumber: true,
                  })}
                />
              </FieldWrapper>

              <FieldWrapper label="Available" error={undefined}>
                <div className="flex items-center h-[42px]">
                  <label className="flex items-center gap-2 cursor-pointer text-sm text-charcoal">
                    <input
                      type="checkbox"
                      className="h-4 w-4 rounded border-fog accent-midnight"
                      {...register(`share_listings.${idx}.available`)}
                    />
                    Available
                  </label>
                </div>
              </FieldWrapper>

              {fields.length > 1 && (
                <button
                  type="button"
                  aria-label="Remove share size"
                  onClick={() => remove(idx)}
                  className="mb-1 flex h-9 w-9 items-center justify-center rounded-lg border border-fog text-charcoal-soft hover:border-destructive hover:text-destructive"
                >
                  <Trash2 size={15} aria-hidden />
                </button>
              )}
            </div>
          );
        })}

        {/* Array-level error */}
        {errors.share_listings?.root?.message && (
          <p className="text-xs text-destructive" role="alert">
            {errors.share_listings.root.message}
          </p>
        )}
        {typeof errors.share_listings?.message === 'string' && (
          <p className="text-xs text-destructive" role="alert">
            {errors.share_listings.message}
          </p>
        )}
      </div>

      {/* Total */}
      <div className="flex items-center gap-2 text-sm">
        <span className="text-charcoal-soft">Total allocated:</span>
        <span
          className={cn(
            'font-semibold tabular-nums',
            totalPct > 100 ? 'text-destructive' : 'text-midnight',
          )}
        >
          {totalPct.toFixed(1)}%
        </span>
        {totalPct > 100 && (
          <span className="text-xs text-destructive">Exceeds 100%</span>
        )}
      </div>

      {fields.length < 5 && (
        <button
          type="button"
          onClick={() =>
            append({ share_pct: 5, price_dollars: 5000, available: true })
          }
          className="flex items-center gap-1.5 text-sm font-medium text-midnight hover:underline underline-offset-2"
        >
          <Plus size={14} aria-hidden />
          Add another share size
        </button>
      )}

      <div className="flex justify-between gap-3">
        <Button
          type="button"
          variant="outline"
          onClick={onBack}
          className="rounded-full"
        >
          ← Back
        </Button>
        <Button
          type="submit"
          className="rounded-full bg-midnight text-paper hover:bg-midnight/90"
        >
          Next: Compliance →
        </Button>
      </div>
    </form>
  );
}

// ─── Step 3 ──────────────────────────────────────────────────────────────────

function Step3Form({
  defaultValues,
  syndicator,
  onNext,
  onBack,
}: {
  defaultValues: Partial<Step3Values>;
  syndicator: SyndicatorInfo;
  onNext: (data: Step3Values) => void;
  onBack: () => void;
}) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<Step3Values>({
    resolver: zodResolver(step3Schema),
    defaultValues,
  });

  const isAfslPending = syndicator.afsl_status !== 'verified';

  return (
    <form onSubmit={handleSubmit(onNext)} noValidate className="space-y-5">
      {/* AFSL display */}
      <div className="rounded-lg border border-fog bg-paper p-4 space-y-2">
        <p className="text-sm font-medium text-charcoal">Your AFSL details</p>
        <div className="flex flex-wrap items-center gap-3">
          <span className="text-sm text-charcoal-soft">
            AFSL number:{' '}
            <strong className="text-charcoal">
              {syndicator.afsl_number ?? 'Not on file'}
            </strong>
          </span>
          <Badge
            variant={
              syndicator.afsl_status === 'verified'
                ? 'default'
                : syndicator.afsl_status === 'pending'
                  ? 'secondary'
                  : 'outline'
            }
          >
            {syndicator.afsl_status}
          </Badge>
        </div>
        {isAfslPending && (
          <p className="mt-1 rounded bg-yellow-50 border border-yellow-200 px-3 py-2 text-sm text-yellow-800">
            Your AFSL is pending verification. Your listing will be held in draft until verification is complete.
          </p>
        )}
      </div>

      <FieldWrapper
        label="PDS URL (publicly accessible PDF link)"
        required
        error={errors.pds_url?.message}
        hint="The PDS must be publicly accessible — upload it to your website or provide a direct link."
      >
        <input
          type="url"
          placeholder="https://example.com/pds-2026.pdf"
          className={inputClass(!!errors.pds_url)}
          {...register('pds_url')}
        />
      </FieldWrapper>

      <FieldWrapper label="PDS date" error={errors.pds_dated?.message}>
        <input
          type="date"
          className={inputClass(!!errors.pds_dated)}
          {...register('pds_dated')}
        />
      </FieldWrapper>

      {/* AFSL confirmation */}
      <div className="space-y-1">
        <label className="flex items-start gap-2.5 cursor-pointer">
          <input
            type="checkbox"
            className="mt-0.5 h-4 w-4 shrink-0 rounded border-fog accent-midnight"
            {...register('afsl_confirmed')}
          />
          <span className="text-sm text-charcoal leading-snug">
            I confirm that <strong>{syndicator.name}</strong> holds a valid AFSL or is an Authorised Representative of an AFSL holder, and that this listing complies with our{' '}
            <a href="/legal" className="underline underline-offset-2 hover:text-midnight" target="_blank" rel="noopener noreferrer">
              Terms of Service
            </a>.
          </span>
        </label>
        {errors.afsl_confirmed?.message && (
          <p className="text-xs text-destructive pl-6" role="alert">
            {errors.afsl_confirmed.message}
          </p>
        )}
      </div>

      <div className="flex justify-between gap-3">
        <Button
          type="button"
          variant="outline"
          onClick={onBack}
          className="rounded-full"
        >
          ← Back
        </Button>
        <Button
          type="submit"
          className="rounded-full bg-midnight text-paper hover:bg-midnight/90"
        >
          Next: Choose tier →
        </Button>
      </div>
    </form>
  );
}

// ─── Step 4 ──────────────────────────────────────────────────────────────────

function Step4Form({
  initialTierCode,
  onBack,
  onSubmit,
  loading,
  error,
}: {
  initialTierCode?: string;
  onBack: () => void;
  onSubmit: (tierCode: string) => void;
  loading: boolean;
  error: string | null;
}) {
  const [selectedTier, setSelectedTier] = useState(initialTierCode ?? 'listed');

  // Launch offer check: today < 2026-07-01
  const showLaunchOffer = new Date() < new Date('2026-07-01');

  return (
    <div className="space-y-6">
      {showLaunchOffer && (
        <div className="rounded-lg bg-brass/20 border border-brass px-4 py-3 text-sm font-medium text-midnight">
          Launch offer: first 90 days free for any listing. Offer ends 30 June 2026.
        </div>
      )}

      <ListingTierTable
        compact
        selectedCode={selectedTier}
        onSelect={setSelectedTier}
      />

      {error && (
        <p className="rounded bg-destructive/10 px-3 py-2 text-sm text-destructive" role="alert">
          {error}
        </p>
      )}

      <div className="flex justify-between gap-3">
        <Button
          type="button"
          variant="outline"
          onClick={onBack}
          disabled={loading}
          className="rounded-full"
        >
          ← Back
        </Button>
        <Button
          onClick={() => onSubmit(selectedTier)}
          disabled={loading || !selectedTier}
          className="rounded-full bg-brass text-midnight hover:bg-brass/90 min-w-[160px]"
        >
          {loading ? (
            <span className="flex items-center gap-2">
              <Loader2 size={15} className="animate-spin" aria-hidden />
              Redirecting…
            </span>
          ) : (
            'Pay and submit →'
          )}
        </Button>
      </div>

      <Caption className="text-charcoal-soft text-center">
        You will be taken to Stripe to complete payment. Your listing will be reviewed within 24 hours.
      </Caption>
    </div>
  );
}

// ─── Accumulated form data ────────────────────────────────────────────────────

interface AccumulatedData {
  step1?: Step1Values;
  step2?: Step2Values;
  step3?: Step3Values;
  photos?: UploadedPhoto[];
}

// ─── SubmitStepper ───────────────────────────────────────────────────────────

export function SubmitStepper({ syndicator }: SubmitStepperProps) {
  const searchParams = useSearchParams();
  const initialTier = searchParams.get('tier') ?? 'listed';
  const wasCancelled = searchParams.get('cancelled') === '1';

  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState<AccumulatedData>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (wasCancelled) {
      setError('Payment was cancelled — you can try again.');
    }
  }, [wasCancelled]);

  const handleStep1 = (data: Step1Values, photos: UploadedPhoto[]) => {
    setFormData((prev) => ({ ...prev, step1: data, photos }));
    setStep(2);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleStep2 = (data: Step2Values) => {
    setFormData((prev) => ({ ...prev, step2: data }));
    setStep(3);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleStep3 = (data: Step3Values) => {
    setFormData((prev) => ({ ...prev, step3: data }));
    setStep(4);
    setError(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleStep4Submit = async (tierCode: string) => {
    if (!formData.step1 || !formData.step2 || !formData.step3) return;

    setLoading(true);
    setError(null);

    try {
      const { step1, step2, step3 } = formData;

      // Convert dollars → cents for ongoing cost
      const ongoing_cost_cents =
        step1.ongoing_cost_dollars
          ? Math.round(parseFloat(step1.ongoing_cost_dollars) * 100)
          : null;

      // Convert share dollars → cents
      const share_listings = step2.share_listings.map((row) => ({
        pct: row.share_pct,
        price_cents: Math.round(row.price_dollars * 100),
        available: row.available,
      }));

      const body = {
        // Step 1
        name: step1.name || null,
        sire: step1.sire,
        dam: step1.dam,
        dam_sire: step1.dam_sire || null,
        sex: step1.sex,
        foal_date: step1.foal_date || null,
        colour: step1.colour || null,
        location_state: step1.location_state,
        location_postcode: step1.location_postcode || null,
        primary_trainer_name: step1.primary_trainer_name || null,
        description: step1.description || null,
        bonus_schemes: step1.bonus_schemes ?? [],
        vet_xray_clear: step1.vet_xray_clear ?? false,
        vet_scope_clear: step1.vet_scope_clear ?? false,
        vet_checked_at: step1.vet_checked_at || null,
        ongoing_cost_cents_per_pct_per_week: ongoing_cost_cents,
        // Step 2
        share_listings,
        // Step 3
        pds_url: step3.pds_url,
        pds_dated: step3.pds_dated || null,
        // Step 4
        tier_code: tierCode,
        // Photos
        photo_paths: (formData.photos ?? []).map((p) => p.path),
      };

      const res = await fetch('/api/list/create-checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        throw new Error(json.error ?? `Server error ${res.status}`);
      }

      const { url } = await res.json();
      window.location.href = url;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong. Please try again.');
      setLoading(false);
    }
  };

  return (
    <div>
      <StepIndicator currentStep={step} />

      {/* Cancelled message shown above step indicator */}
      {wasCancelled && step < 4 && (
        <div className="mb-6 rounded-lg bg-yellow-50 border border-yellow-200 px-4 py-3 text-sm text-yellow-800">
          Payment was cancelled — you can try again.
        </div>
      )}

      {step === 1 && (
        <Step1Form
          defaultValues={formData.step1 ?? {}}
          defaultPhotos={formData.photos ?? []}
          onNext={handleStep1}
        />
      )}
      {step === 2 && (
        <Step2Form
          defaultValues={formData.step2 ?? {}}
          onNext={handleStep2}
          onBack={() => setStep(1)}
        />
      )}
      {step === 3 && (
        <Step3Form
          defaultValues={formData.step3 ?? {}}
          syndicator={syndicator}
          onNext={handleStep3}
          onBack={() => setStep(2)}
        />
      )}
      {step === 4 && (
        <Step4Form
          initialTierCode={initialTier}
          onBack={() => setStep(3)}
          onSubmit={handleStep4Submit}
          loading={loading}
          error={error}
        />
      )}
    </div>
  );
}
