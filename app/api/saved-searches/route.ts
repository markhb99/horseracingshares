import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createServerClient } from '@/lib/supabase/server';
import { FilterJsonSchema } from '@/lib/search/filter-schema';

const RequestSchema = z.object({
  name: z.string().min(1).max(100),
  filter_json: FilterJsonSchema,
  q: z.string().optional(),
  frequency: z.enum(['off', 'daily', 'weekly']),
});

export async function POST(request: NextRequest) {
  const supabase = await createServerClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const parsed = RequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Validation failed', issues: parsed.error.issues },
      { status: 422 },
    );
  }

  const { name, filter_json, frequency } = parsed.data;

  const { data, error } = await supabase
    .from('saved_search')
    .insert({
      user_id: user.id,
      name,
      filter_json: filter_json as Record<string, unknown>,
      frequency,
      last_sent_at: null,
      last_match_count: 0,
    })
    .select('id, name')
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data, { status: 201 });
}
