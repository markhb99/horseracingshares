'use client';

/**
 * EnquiryForm — react-hook-form + zod.
 *
 * Submits to POST /api/enquiries.
 * Includes honeypot field, marketing consent, and syndicator-share consent.
 * Shows success/dedup/error states after submission.
 */

import * as React from 'react';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Caption } from '@/components/typography';

// ─── Schema ───────────────────────────────────────────────────────────────────

const EnquiryFormSchema = z.object({
  full_name: z.string().trim().min(2, 'Please enter your full name').max(120),
  email: z.string().email('Please enter a valid email address').max(254),
  mobile: z
    .string()
    .trim()
    .refine(
      (v) => /^(\+?61|0)4\d{8}$/.test(v.replace(/\s+/g, '')),
      'Please enter a valid Australian mobile (e.g. 0412 345 678)',
    ),
  share_size_pct: z
    .number()
    .positive('Must be greater than 0')
    .max(100, 'Cannot exceed 100%'),
  message: z.string().trim().max(2000).optional(),
  marketing_consent: z.boolean(),
  syndicator_share_consent: z.boolean(),
  // Honeypot — must stay empty
  website: z.string().max(0, 'Unexpected input'),
});

type EnquiryFormValues = z.infer<typeof EnquiryFormSchema>;

// ─── Props ────────────────────────────────────────────────────────────────────

export interface EnquiryFormProps {
  horseId: string;
  horseSlug: string;
  horseName: string;
  syndicatorName: string;
  availableSharePcts: number[];
}

// ─── Component ────────────────────────────────────────────────────────────────

export function EnquiryForm({
  horseId,
  horseSlug,
  horseName,
  syndicatorName,
  availableSharePcts,
}: EnquiryFormProps) {
  const [status, setStatus] = useState<
    'idle' | 'loading' | 'success' | 'deduped' | 'error'
  >('idle');
  const [errorMessage, setErrorMessage] = useState('');

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
  } = useForm<EnquiryFormValues>({
    resolver: zodResolver(EnquiryFormSchema),
    defaultValues: {
      share_size_pct: availableSharePcts[0] ?? undefined,
      marketing_consent: false,
      syndicator_share_consent: true,
      website: '',
    },
  });

  const onSubmit = async (values: EnquiryFormValues) => {
    // Honeypot check
    if (values.website) return;

    setStatus('loading');
    values.mobile = values.mobile.replace(/\s+/g, '');
    setErrorMessage('');

    try {
      const res = await fetch('/api/enquiries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          horse_id: horseId,
          horse_slug: horseSlug,
          full_name: values.full_name,
          email: values.email,
          mobile: values.mobile,
          share_size_pct: values.share_size_pct,
          message: values.message ?? '',
          marketing_consent: values.marketing_consent,
          syndicator_share_consent: values.syndicator_share_consent,
        }),
      });

      if (res.status === 201) {
        setStatus('success');
      } else if (res.status === 200) {
        setStatus('deduped');
      } else {
        const body = await res.json().catch(() => ({}));
        setErrorMessage(body.error ?? 'Something went wrong. Please try again.');
        setStatus('error');
      }
    } catch {
      setErrorMessage('Network error. Please check your connection and try again.');
      setStatus('error');
    }
  };

  if (status === 'success') {
    return (
      <div className="bg-paper rounded-lg border border-fog p-6 text-center space-y-3">
        <p className="text-[15px] font-medium text-charcoal">
          Your enquiry has been sent to {syndicatorName}. They will contact you directly.
        </p>
        <Caption className="text-charcoal-soft">
          We&rsquo;ve also saved your details so you can track all your enquiries from your account.
        </Caption>
      </div>
    );
  }

  if (status === 'deduped') {
    return (
      <div className="bg-paper rounded-lg border border-fog p-6 text-center space-y-3">
        <p className="text-[15px] font-medium text-charcoal">
          We already have your enquiry on file.
        </p>
        <Caption className="text-charcoal-soft">
          {syndicatorName} will be in touch shortly.
        </Caption>
      </div>
    );
  }

  return (
    <div className="bg-paper rounded-lg border border-fog p-6 space-y-4">
      <div className="space-y-0.5">
        <h3 className="font-heading font-semibold text-[16px] text-midnight">
          Enquire about {horseName}
        </h3>
        <Caption className="text-charcoal-soft">
          No obligation. Your details go to {syndicatorName} only.
        </Caption>
      </div>

      <form
        onSubmit={handleSubmit(onSubmit, (errs) => console.warn('[EnquiryForm] validation errors', errs))}
        noValidate
        className="space-y-4"
      >
        {/* Honeypot — visually hidden */}
        <div
          aria-hidden="true"
          style={{ position: 'absolute', left: '-9999px', top: 'auto', width: '1px', height: '1px', overflow: 'hidden' }}
        >
          <label htmlFor="website">Website</label>
          <input
            id="website"
            type="text"
            tabIndex={-1}
            autoComplete="off"
            {...register('website')}
          />
        </div>

        {/* Full name */}
        <FieldWrapper label="Full name" error={errors.full_name?.message} required>
          <input
            type="text"
            autoComplete="name"
            placeholder="Jane Smith"
            className={inputClass(!!errors.full_name)}
            {...register('full_name')}
          />
        </FieldWrapper>

        {/* Email */}
        <FieldWrapper label="Email" error={errors.email?.message} required>
          <input
            type="email"
            autoComplete="email"
            placeholder="jane@example.com"
            className={inputClass(!!errors.email)}
            {...register('email')}
          />
        </FieldWrapper>

        {/* Mobile */}
        <FieldWrapper label="Mobile" error={errors.mobile?.message} required>
          <input
            type="tel"
            autoComplete="tel"
            placeholder="04XX XXX XXX"
            className={inputClass(!!errors.mobile)}
            {...register('mobile')}
          />
        </FieldWrapper>

        {/* Share size */}
        <FieldWrapper
          label="Share size interested in (%)"
          error={errors.share_size_pct?.message}
          required
        >
          {availableSharePcts.length > 0 ? (
            <select
              className={inputClass(!!errors.share_size_pct)}
              defaultValue={availableSharePcts[0]}
              onChange={(e) =>
                setValue('share_size_pct', parseFloat(e.target.value), {
                  shouldValidate: true,
                })
              }
            >
              {availableSharePcts.map((pct) => (
                <option key={pct} value={pct}>
                  {pct}%
                </option>
              ))}
              <option value="other">Other (specify below)</option>
            </select>
          ) : (
            <input
              type="number"
              min="0.01"
              max="100"
              step="0.01"
              placeholder="e.g. 5"
              className={inputClass(!!errors.share_size_pct)}
              onChange={(e) =>
                setValue('share_size_pct', parseFloat(e.target.value), {
                  shouldValidate: true,
                })
              }
            />
          )}
        </FieldWrapper>

        {/* Message */}
        <FieldWrapper label="Message (optional)" error={errors.message?.message}>
          <textarea
            rows={3}
            placeholder="Any questions for the syndicator?"
            className={inputClass(!!errors.message) + ' resize-none'}
            {...register('message')}
          />
        </FieldWrapper>

        {/* Consent checkboxes */}
        <div className="space-y-3 pt-1">
          <CheckboxField
            id="syndicator_share_consent"
            label={`Forward my details to ${syndicatorName} for this enquiry`}
            {...register('syndicator_share_consent')}
            error={errors.syndicator_share_consent?.message}
          />
          <CheckboxField
            id="marketing_consent"
            label="Email me about horses matching my preferences"
            {...register('marketing_consent')}
            error={errors.marketing_consent?.message}
          />
        </div>

        {/* Error banner */}
        {status === 'error' && (
          <p className="rounded bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {errorMessage}
          </p>
        )}

        <Button
          type="submit"
          disabled={status === 'loading'}
          className="w-full rounded-full bg-midnight text-paper hover:bg-midnight/90"
        >
          {status === 'loading' ? 'Sending…' : 'Send enquiry'}
        </Button>

        <Caption className="text-charcoal-soft text-center">
          Shares are offered by {syndicatorName} under their own PDS and AFSL.
          Horse Racing Shares is an advertising platform only.
        </Caption>
      </form>
    </div>
  );
}

// ─── Field helpers ────────────────────────────────────────────────────────────

function inputClass(hasError: boolean): string {
  return [
    'w-full rounded-lg border bg-white px-3 py-2.5 text-sm text-charcoal',
    'placeholder:text-charcoal/40 outline-none',
    'focus:ring-2 focus:ring-midnight/30 focus:border-midnight',
    'transition-[border-color,box-shadow] duration-150',
    hasError ? 'border-destructive ring-1 ring-destructive/20' : 'border-fog',
  ].join(' ');
}

interface FieldWrapperProps {
  label: string;
  error?: string;
  required?: boolean;
  children: React.ReactNode;
}

function FieldWrapper({ label, error, required, children }: FieldWrapperProps) {
  return (
    <div className="space-y-1">
      <label className="block text-sm font-medium text-charcoal">
        {label}
        {required && <span className="ml-0.5 text-destructive" aria-hidden="true">*</span>}
      </label>
      {children}
      {error && (
        <p className="text-xs text-destructive" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}

interface CheckboxFieldProps extends React.InputHTMLAttributes<HTMLInputElement> {
  id: string;
  label: string;
  error?: string;
}

const CheckboxField = React.forwardRef<HTMLInputElement, CheckboxFieldProps>(
  ({ id, label, error, ...props }, ref) => (
    <div className="space-y-1">
      <label className="flex items-start gap-2.5 cursor-pointer">
        <input
          ref={ref}
          id={id}
          type="checkbox"
          className="mt-0.5 h-4 w-4 shrink-0 rounded border-fog text-midnight accent-midnight"
          {...props}
        />
        <span className="text-sm text-charcoal leading-snug">{label}</span>
      </label>
      {error && (
        <p className="text-xs text-destructive pl-6" role="alert">
          {error}
        </p>
      )}
    </div>
  ),
);
CheckboxField.displayName = 'CheckboxField';
