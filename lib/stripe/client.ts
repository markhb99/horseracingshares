/**
 * Stripe singleton — server-only.
 * Never import in client components.
 * Lazy-initialised so build-time page-data collection doesn't fail when
 * STRIPE_SECRET_KEY is absent from the build environment.
 */
import Stripe from 'stripe';

let _stripe: Stripe | null = null;

export function getStripe(): Stripe {
  if (!_stripe) {
    if (!process.env.STRIPE_SECRET_KEY) {
      throw new Error('STRIPE_SECRET_KEY is not set');
    }
    _stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: '2026-04-22.dahlia' as const,
    });
  }
  return _stripe;
}

/** Convenience re-export for code that just does `import { stripe }` */
export const stripe = new Proxy({} as Stripe, {
  get(_target, prop) {
    return (getStripe() as unknown as Record<string | symbol, unknown>)[prop];
  },
});
