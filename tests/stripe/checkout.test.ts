/**
 * Unit tests for /api/stripe/checkout and /api/stripe/webhook route logic.
 *
 * Uses top-level vi.mock + module-level state variables (vi.mock is hoisted
 * so closures over local variables inside tests do not work).
 *
 * No live network calls — Supabase and Stripe are fully mocked.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// ─── Module-level mock state ──────────────────────────────────────────────────
// These are mutated inside each test via the exposed setters.

let _mockUser: { id: string; email?: string } | null = null;
let _tierRow: Record<string, unknown> | null = null;
let _syndicatorUserRow: { syndicator_id: string } | null = null;
let _paymentInsertError: { message: string } | null = null;
let _stripeSessionUrl: string | null = 'https://checkout.stripe.com/pay/cs_test';
let _stripeCreateError: Error | null = null;
let _webhookConstructError: Error | null = null;
let _webhookEvent: Record<string, unknown> | null = null;

// ─── Top-level mocks (hoisted by Vitest) ─────────────────────────────────────

vi.mock('@/lib/supabase/server', () => ({
  createServerClient: () =>
    Promise.resolve({
      auth: {
        getUser: () =>
          Promise.resolve({ data: { user: _mockUser }, error: null }),
      },
      from: vi.fn(),
    }),
}));

vi.mock('@/lib/supabase/service', () => ({
  createServiceClient: () => {
    let callIndex = 0;
    const makeChain = () => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockImplementation(() => {
        callIndex++;
        if (callIndex === 1) {
          return Promise.resolve({ data: _tierRow, error: _tierRow ? null : { message: 'not found' } });
        }
        return Promise.resolve({
          data: _syndicatorUserRow,
          error: _syndicatorUserRow ? null : { message: 'not found' },
        });
      }),
      insert: vi.fn().mockImplementation(() =>
        Promise.resolve({ error: _paymentInsertError }),
      ),
    });

    return { from: vi.fn().mockImplementation(() => makeChain()) };
  },
}));

vi.mock('@/lib/stripe/client', () => ({
  getStripe: () => ({
    checkout: {
      sessions: {
        create: vi.fn().mockImplementation(() => {
          if (_stripeCreateError) throw _stripeCreateError;
          return Promise.resolve({ url: _stripeSessionUrl });
        }),
      },
    },
    webhooks: {
      constructEvent: vi.fn().mockImplementation(() => {
        if (_webhookConstructError) throw _webhookConstructError;
        return _webhookEvent;
      }),
    },
  }),
}));

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeCheckoutRequest(body: unknown): Request {
  return new Request('http://localhost:3000/api/stripe/checkout', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

function makeWebhookRequest(body: unknown, sig = 'fake-sig'): Request {
  return new Request('http://localhost:3000/api/stripe/webhook', {
    method: 'POST',
    headers: { 'stripe-signature': sig },
    body: JSON.stringify(body),
  });
}

// ─── Checkout tests ───────────────────────────────────────────────────────────

describe('POST /api/stripe/checkout', () => {
  beforeEach(() => {
    vi.stubEnv('STRIPE_SECRET_KEY', 'sk_test_fake');
    vi.stubEnv('NEXT_PUBLIC_SITE_URL', 'http://localhost:3000');
    // Reset state
    _mockUser = { id: 'user-1', email: 'test@example.com' };
    _tierRow = {
      id: 'tier-1',
      code: 'premium',
      name: 'Premium',
      price_cents_per_listing: 29900,
      stripe_price_id: 'price_premium123',
    };
    _syndicatorUserRow = { syndicator_id: 'synd-1' };
    _paymentInsertError = null;
    _stripeSessionUrl = 'https://checkout.stripe.com/pay/cs_test_abc';
    _stripeCreateError = null;
    _webhookConstructError = null;
    _webhookEvent = null;
  });

  it('returns 401 when user is not logged in', async () => {
    _mockUser = null;
    const { POST } = await import('@/app/api/stripe/checkout/route');
    const res = await POST(makeCheckoutRequest({ tier_code: 'premium' }) as never);
    expect(res.status).toBe(401);
    const json = await res.json();
    expect(json.error).toMatch(/unauthorised/i);
  });

  it('returns 400 when body is invalid JSON', async () => {
    const { POST } = await import('@/app/api/stripe/checkout/route');
    const req = new Request('http://localhost:3000/api/stripe/checkout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: 'not-json!!',
    });
    const res = await POST(req as never);
    expect(res.status).toBe(400);
  });

  it('returns 400 when tier_code is missing', async () => {
    const { POST } = await import('@/app/api/stripe/checkout/route');
    const res = await POST(makeCheckoutRequest({}) as never);
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toMatch(/invalid/i);
  });

  it('returns 400 when tier_code is "partner"', async () => {
    const { POST } = await import('@/app/api/stripe/checkout/route');
    const res = await POST(makeCheckoutRequest({ tier_code: 'partner' }) as never);
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toMatch(/partner.*checkout/i);
  });

  it('returns 404 when tier is not found in DB', async () => {
    _tierRow = null;
    const { POST } = await import('@/app/api/stripe/checkout/route');
    const res = await POST(makeCheckoutRequest({ tier_code: 'nonexistent' }) as never);
    expect(res.status).toBe(404);
  });

  it('returns 422 when tier has no stripe_price_id', async () => {
    _tierRow = { id: 'tier-1', code: 'basic', name: 'Basic', price_cents_per_listing: 14900, stripe_price_id: null };
    const { POST } = await import('@/app/api/stripe/checkout/route');
    const res = await POST(makeCheckoutRequest({ tier_code: 'basic' }) as never);
    expect(res.status).toBe(422);
  });

  it('returns 422 when user is not linked to a syndicator', async () => {
    _syndicatorUserRow = null;
    const { POST } = await import('@/app/api/stripe/checkout/route');
    const res = await POST(makeCheckoutRequest({ tier_code: 'premium' }) as never);
    expect(res.status).toBe(422);
    const json = await res.json();
    expect(json.error).toMatch(/syndicator/i);
  });

  it('returns { url } on success with correct Stripe params', async () => {
    const { POST } = await import('@/app/api/stripe/checkout/route');
    const res = await POST(makeCheckoutRequest({ tier_code: 'premium' }) as never);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.url).toBe('https://checkout.stripe.com/pay/cs_test_abc');
  });

  it('returns 502 when Stripe session create throws', async () => {
    _stripeCreateError = new Error('Stripe network failure');
    const { POST } = await import('@/app/api/stripe/checkout/route');
    const res = await POST(makeCheckoutRequest({ tier_code: 'premium' }) as never);
    expect(res.status).toBe(502);
  });
});

// ─── Webhook tests ────────────────────────────────────────────────────────────

describe('POST /api/stripe/webhook', () => {
  beforeEach(() => {
    vi.stubEnv('STRIPE_SECRET_KEY', 'sk_test_fake');
    vi.stubEnv('STRIPE_WEBHOOK_SECRET', 'whsec_fake');
    _webhookConstructError = null;
    _paymentInsertError = null;
    _tierRow = { name: 'Premium', price_cents_per_listing: 29900 };
    _webhookEvent = {
      type: 'checkout.session.completed',
      data: {
        object: {
          id: 'cs_test_123',
          amount_total: 29900,
          payment_intent: 'pi_test_abc',
          metadata: { tier_code: 'premium', syndicator_id: 'synd-1', user_id: 'u1' },
        },
      },
    };
  });

  it('returns 400 when stripe-signature header is missing', async () => {
    const { POST } = await import('@/app/api/stripe/webhook/route');
    const req = new Request('http://localhost:3000/api/stripe/webhook', {
      method: 'POST',
      body: '{}',
      // No stripe-signature header
    });
    const res = await POST(req as never);
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toMatch(/signature/i);
  });

  it('returns 400 when signature verification fails', async () => {
    _webhookConstructError = new Error('signature mismatch');
    const { POST } = await import('@/app/api/stripe/webhook/route');
    const res = await POST(makeWebhookRequest({}) as never);
    expect(res.status).toBe(400);
  });

  it('returns 200 with received:true on valid checkout.session.completed', async () => {
    const { POST } = await import('@/app/api/stripe/webhook/route');
    const res = await POST(makeWebhookRequest({}) as never);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.received).toBe(true);
  });

  it('returns 200 even when payment DB insert fails (prevents Stripe retry)', async () => {
    _paymentInsertError = { message: 'DB constraint violation' };
    const { POST } = await import('@/app/api/stripe/webhook/route');
    const res = await POST(makeWebhookRequest({}) as never);
    // Must return 200 to prevent Stripe from retrying the webhook
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.received).toBe(true);
  });

  it('returns 200 for unknown event types (graceful no-op)', async () => {
    _webhookEvent = { type: 'payment_intent.created', data: { object: {} } };
    const { POST } = await import('@/app/api/stripe/webhook/route');
    const res = await POST(makeWebhookRequest({}) as never);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.received).toBe(true);
  });
});
