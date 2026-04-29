'use client';

import { useState } from 'react';
import { Caption, Small } from '@/components/typography';

export function HandbookNewsletter({ source }: { source: string }) {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    try {
      const res = await fetch('/api/newsletter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, source }),
      });
      if (res.ok) {
        setSent(true);
      } else {
        setError('Please enter a valid email address.');
      }
    } catch {
      setError('Something went wrong. Please try again.');
    }
  }

  if (sent) {
    return (
      <Small className="text-charcoal">
        You&apos;re subscribed. Check your inbox for a confirmation.
      </Small>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-3 max-w-md">
      <input
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="your@email.com"
        required
        className="flex-1 rounded-lg border border-fog px-3 py-2.5 text-small-type text-charcoal placeholder:text-charcoal-soft focus:outline-none focus:ring-2 focus:ring-midnight"
      />
      <button
        type="submit"
        className="rounded-lg bg-midnight px-5 py-2.5 text-small-type font-medium text-paper hover:bg-midnight-light transition-colors whitespace-nowrap"
      >
        Subscribe
      </button>
      {error && <Caption className="text-red-600 w-full">{error}</Caption>}
    </form>
  );
}
