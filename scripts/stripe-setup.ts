/**
 * scripts/stripe-setup.ts
 *
 * Creates Stripe Products + one-time Prices for the three paid listing tiers
 * and seeds the listing_tier table with all four tiers (incl. Partner at $0).
 *
 * Run once per environment:
 *   npx tsx scripts/stripe-setup.ts
 *
 * Requires in environment (or .env.local):
 *   STRIPE_SECRET_KEY
 *   NEXT_PUBLIC_SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 */

import 'dotenv/config';
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

// ─── Validate env ─────────────────────────────────────────────────────────────

const requiredEnvVars = [
  'STRIPE_SECRET_KEY',
  'NEXT_PUBLIC_SUPABASE_URL',
  'SUPABASE_SERVICE_ROLE_KEY',
] as const;

for (const key of requiredEnvVars) {
  if (!process.env[key]) {
    console.error(`Missing required environment variable: ${key}`);
    process.exit(1);
  }
}

// ─── Clients ──────────────────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const stripe = new (Stripe as any)(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2026-04-22.dahlia',
}) as Stripe;

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } },
);

// ─── Tier definitions ─────────────────────────────────────────────────────────

interface TierDefinition {
  code: string;
  name: string;
  description: string;
  price_cents: number; // 0 = no Stripe product
  features: string[];
}

const TIERS: TierDefinition[] = [
  {
    code: 'basic',
    name: 'Basic',
    description: 'Standard 90-day listing with 1 photo',
    price_cents: 14900,
    features: [
      '90-day listing',
      '1 photo',
      'Standard placement',
      'Enquiry capture + forwarding',
      'AFSL badge displayed',
    ],
  },
  {
    code: 'premium',
    name: 'Premium',
    description: 'Featured 90-day listing with 10 photos and priority placement',
    price_cents: 29900,
    features: [
      '90-day listing',
      '10 photos',
      'Featured badge',
      'Priority placement',
      'Enquiry capture + forwarding',
      'AFSL badge displayed',
    ],
  },
  {
    code: 'elite',
    name: 'Elite',
    description: 'Premium 90-day listing with unlimited photos, homepage feature slot, and matched-buyer email campaign',
    price_cents: 49900,
    features: [
      '90-day listing',
      'Unlimited photos',
      'Homepage feature slot',
      'Matched-buyer email campaign',
      'Featured badge',
      'Enquiry capture + forwarding',
      'AFSL badge displayed',
    ],
  },
];

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log('=== Horse Racing Shares — Stripe setup ===\n');

  const results: Record<string, { productId: string; priceId: string }> = {};

  // 1. Create (or retrieve existing) Stripe Products and Prices
  for (const tier of TIERS) {
    console.log(`Processing tier: ${tier.name} ($${(tier.price_cents / 100).toFixed(2)} AUD)...`);

    // Check if a product with matching metadata already exists
    const existingProducts = await stripe.products.search({
      query: `metadata['tier_code']:'${tier.code}'`,
    });

    let product: Stripe.Product;

    if (existingProducts.data.length > 0) {
      product = existingProducts.data[0];
      console.log(`  Found existing product: ${product.id}`);
    } else {
      product = await stripe.products.create({
        name: `Horse Racing Shares — ${tier.name} Listing`,
        description: tier.description,
        metadata: {
          tier_code: tier.code,
          platform: 'horseracingshares',
        },
      });
      console.log(`  Created product: ${product.id}`);
    }

    // Check if a price for this product already exists
    const existingPrices = await stripe.prices.list({
      product: product.id,
      active: true,
    });

    let price: Stripe.Price;

    if (existingPrices.data.length > 0) {
      price = existingPrices.data[0];
      console.log(`  Found existing price: ${price.id}`);
    } else {
      price = await stripe.prices.create({
        product: product.id,
        unit_amount: tier.price_cents,
        currency: 'aud',
        metadata: {
          tier_code: tier.code,
        },
      });
      console.log(`  Created price: ${price.id}`);
    }

    results[tier.code] = { productId: product.id, priceId: price.id };
  }

  // 2. Upsert listing_tier rows in Supabase
  console.log('\nUpserting listing_tier rows in Supabase...');

  const tierRows = [
    ...TIERS.map((t) => ({
      code: t.code,
      name: t.name,
      price_cents_per_month: 0,
      price_cents_per_listing: t.price_cents,
      max_active_horses: null,
      stripe_price_id: results[t.code].priceId,
      features_json: buildFeaturesJson(t),
      is_active: true,
    })),
    // Partner tier — internal, no Stripe product
    {
      code: 'partner',
      name: 'Partner',
      price_cents_per_month: 0,
      price_cents_per_listing: 0,
      max_active_horses: null,
      stripe_price_id: null,
      features_json: {
        photos_max: null,
        placement: 'homepage',
        featured_badge: true,
        homepage_feature: true,
        buyer_email_campaign: true,
        regal_owned: true,
        duration_days: 90,
      },
      is_active: true,
    },
  ];

  for (const row of tierRows) {
    // listing_tier is not in the generated Database type
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase as any)
      .from('listing_tier')
      .upsert(row, { onConflict: 'code' });

    if (error) {
      console.error(`  Error upserting tier '${row.code}':`, error.message);
    } else {
      console.log(`  Upserted tier: ${row.code}`);
    }
  }

  // 3. Print summary
  console.log('\n=== Done ===\n');
  console.log('Add these to .env.local (Stripe Price IDs):');
  for (const [code, ids] of Object.entries(results)) {
    console.log(`  STRIPE_PRICE_ID_${code.toUpperCase()}=${ids.priceId}`);
  }

  console.log('\nStripe Product IDs (for reference):');
  for (const [code, ids] of Object.entries(results)) {
    console.log(`  ${code}: product=${ids.productId} price=${ids.priceId}`);
  }
}

function buildFeaturesJson(tier: TierDefinition): Record<string, unknown> {
  const base: Record<string, unknown> = {
    placement: 'standard',
    featured_badge: false,
    homepage_feature: false,
    buyer_email_campaign: false,
    duration_days: 90,
  };

  if (tier.code === 'basic') {
    return { ...base, photos_max: 1 };
  }
  if (tier.code === 'premium') {
    return { ...base, photos_max: 10, placement: 'priority', featured_badge: true };
  }
  if (tier.code === 'elite') {
    return {
      ...base,
      photos_max: null,
      placement: 'homepage',
      featured_badge: true,
      homepage_feature: true,
      buyer_email_campaign: true,
    };
  }
  return base;
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
