'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

const schema = z.object({
  email: z.string().email('Please enter a valid email address.'),
});

type FormValues = z.infer<typeof schema>;

export function NewsletterForm() {
  const [submitted, setSubmitted] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
  });

  async function onSubmit(values: FormValues) {
    setServerError(null);
    try {
      const res = await fetch('/api/newsletter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: values.email }),
      });
      if (!res.ok) {
        const data = (await res.json()) as { error?: string };
        setServerError(data.error ?? 'Something went wrong. Please try again.');
        return;
      }
      setSubmitted(true);
    } catch {
      setServerError('Something went wrong. Please try again.');
    }
  }

  if (submitted) {
    return (
      <p className="text-small-type font-medium text-paper/90 text-center">
        You&rsquo;re on the list. We&rsquo;ll see you Sunday morning.
      </p>
    );
  }

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      noValidate
      className="flex flex-col sm:flex-row items-start gap-3 w-full max-w-md mx-auto"
    >
      <div className="flex-1 w-full">
        <Input
          type="email"
          placeholder="your@email.com"
          autoComplete="email"
          aria-label="Email address"
          aria-invalid={!!errors.email}
          className="h-10 bg-paper/10 border-paper/30 text-paper placeholder:text-paper/40 focus-visible:border-paper/60 focus-visible:ring-paper/20"
          {...register('email')}
        />
        {errors.email && (
          <p className="mt-1 text-caption-type text-paper/70">
            {errors.email.message}
          </p>
        )}
        {serverError && (
          <p className="mt-1 text-caption-type text-paper/70">{serverError}</p>
        )}
      </div>
      <Button
        type="submit"
        disabled={isSubmitting}
        className="h-10 shrink-0 rounded-full bg-brass text-charcoal hover:bg-brass-light px-5 font-medium"
      >
        {isSubmitting ? 'Subscribing…' : 'Subscribe'}
      </Button>
    </form>
  );
}
