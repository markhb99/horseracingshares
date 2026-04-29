export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createServerClient } from '@/lib/supabase/server';

const bodySchema = z.object({ horse_id: z.string().uuid() });

async function getUser() {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  return { supabase, user };
}

/** GET /api/wishlist?horse_id=<uuid> — check if the current user has wishlisted a horse */
export async function GET(req: NextRequest) {
  const horseId = req.nextUrl.searchParams.get('horse_id');
  if (!horseId) return NextResponse.json({ wishlisted: false });

  const { supabase, user } = await getUser();
  if (!user) return NextResponse.json({ wishlisted: false });

  const { data } = await supabase
    .from('wishlist')
    .select('id')
    .eq('user_id', user.id)
    .eq('horse_id', horseId)
    .maybeSingle();

  return NextResponse.json({ wishlisted: !!data });
}

/** POST /api/wishlist — add a horse to the current user's wishlist */
export async function POST(req: NextRequest) {
  const { supabase, user } = await getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });

  const parsed = bodySchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: 'horse_id required' }, { status: 422 });

  const { error } = await supabase
    .from('wishlist')
    .insert({ user_id: user.id, horse_id: parsed.data.horse_id });

  // Duplicate (already wishlisted) is not an error
  if (error && !error.message.includes('duplicate')) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}

/** DELETE /api/wishlist — remove a horse from the current user's wishlist */
export async function DELETE(req: NextRequest) {
  const { supabase, user } = await getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });

  const parsed = bodySchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: 'horse_id required' }, { status: 422 });

  await supabase
    .from('wishlist')
    .delete()
    .eq('user_id', user.id)
    .eq('horse_id', parsed.data.horse_id);

  return NextResponse.json({ ok: true });
}
