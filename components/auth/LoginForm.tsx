'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';

import { sendMagicLink } from '@/lib/auth/actions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Field,
  FieldLabel,
  FieldDescription,
  FieldError,
} from '@/components/ui/field';

// ─── Schema ──────────────────────────────────────────────────────────────────

const schema = z.object({
  email: z.string().email('Please enter a valid email address.'),
  password: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

// ─── Props ────────────────────────────────────────────────────────────────────

interface LoginFormProps {
  /** The path to redirect to after successful sign-in. */
  next?: string;
}

// ─── Component ───────────────────────────────────────────────────────────────

export function LoginForm({ next }: LoginFormProps) {
  const [showPassword, setShowPassword] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
  });

  async function onSubmit(values: FormValues) {
    try {
      await sendMagicLink({ email: values.email, next });
      setSubmitted(true);
      toast.success('Check your inbox — a sign-in link is on its way.');
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Something went wrong. Please try again.';
      toast.error(message);
    }
  }

  if (submitted) {
    return (
      <p className="text-body-type text-center">
        We&apos;ve sent a sign-in link to your email address. Check your inbox (and
        your junk folder, just in case).
      </p>
    );
  }

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      noValidate
      className="flex w-full flex-col gap-5"
    >
      {/* Email field */}
      <Field data-invalid={!!errors.email || undefined}>
        <FieldLabel htmlFor="email">Email address</FieldLabel>
        <Input
          id="email"
          type="email"
          autoComplete="email"
          placeholder="you@example.com"
          aria-invalid={!!errors.email}
          {...register('email')}
        />
        {errors.email && (
          <FieldError errors={[errors.email]} />
        )}
      </Field>

      {/* Progressive disclosure: password field */}
      {showPassword && (
        <Field data-invalid={!!errors.password || undefined}>
          <FieldLabel htmlFor="password">Password</FieldLabel>
          <Input
            id="password"
            type="password"
            autoComplete="current-password"
            aria-invalid={!!errors.password}
            {...register('password')}
          />
          <FieldDescription>
            No password set? Use the magic link instead.
          </FieldDescription>
          {errors.password && (
            <FieldError errors={[errors.password]} />
          )}
        </Field>
      )}

      {/* Submit */}
      <Button
        type="submit"
        size="lg"
        className="w-full"
        disabled={isSubmitting}
      >
        {isSubmitting ? 'Sending…' : 'Send magic link'}
      </Button>

      {/* Toggle password */}
      <button
        type="button"
        onClick={() => setShowPassword((v) => !v)}
        className="text-sm text-muted-foreground underline-offset-4 hover:underline self-center"
      >
        {showPassword ? 'Use magic link instead' : 'Use password instead'}
      </button>
    </form>
  );
}
