import { NextResponse } from 'next/server'
import { z } from 'zod'
import { sendSavedSearchDigest } from '@/lib/email/send-saved-search-digest'
import type { SavedSearchDigestMatch } from '@/emails/saved-search-digest'

const RequestSchema = z.object({
  to: z.string().email(),
})

const MOCK_MATCHES: SavedSearchDigestMatch[] = [
  {
    id: 'mock-1',
    slug: 'golden-gallop',
    name: 'Golden Gallop',
    sire: 'Snitzel',
    dam: 'Lady Luck',
    sex: 'Colt',
    age_category: '2YO',
    location_state: 'VIC',
    primary_trainer_name: 'Chris Waller',
    price_min_cents: 550000,
    share_pcts_available: [5, 10],
    has_final_shares: false,
    bonus_schemes: ['VOBIS'],
    hero_image_path: null,
    matched_searches: ['Snitzel colts', 'VIC under $10k'],
  },
  {
    id: 'mock-2',
    slug: 'crimson-star',
    name: 'Crimson Star',
    sire: 'I Am Invincible',
    dam: 'Stardust Belle',
    sex: 'Filly',
    age_category: '2YO',
    location_state: 'NSW',
    primary_trainer_name: 'Gai Waterhouse',
    price_min_cents: 750000,
    share_pcts_available: [5],
    has_final_shares: false,
    bonus_schemes: ['BOBS'],
    hero_image_path: null,
    matched_searches: ['2YO fillies'],
  },
  {
    id: 'mock-3',
    slug: 'midnight-runner',
    name: 'Midnight Runner',
    sire: 'Fastnet Rock',
    dam: 'Night Whisper',
    sex: 'Gelding',
    age_category: '3YO',
    location_state: 'QLD',
    primary_trainer_name: null,
    price_min_cents: 300000,
    share_pcts_available: [10, 20],
    has_final_shares: true,
    bonus_schemes: [],
    hero_image_path: null,
    matched_searches: ['QLD horses'],
  },
]

export async function POST(req: Request) {
  if (process.env.NODE_ENV !== 'development') {
    return new Response('Not Found', { status: 404 })
  }

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const parsed = RequestSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Validation failed', issues: parsed.error.issues },
      { status: 422 },
    )
  }

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'

  const result = await sendSavedSearchDigest({
    to: parsed.data.to,
    props: {
      recipientName: 'Mark',
      matches: MOCK_MATCHES,
      totalMatchCount: 5,
      unsubscribeUrl: `${siteUrl}/account/saved-searches/unsubscribe?token=test`,
      manageUrl: `${siteUrl}/account/saved-searches`,
      siteUrl,
    },
  })

  if ('error' in result) {
    return NextResponse.json({ error: result.error }, { status: 500 })
  }

  return NextResponse.json({ messageId: result.messageId })
}
