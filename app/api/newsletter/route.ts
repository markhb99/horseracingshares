import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

const SubscribeSchema = z.object({
  email: z.string().email(),
});

export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const parsed = SubscribeSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'A valid email address is required.' },
      { status: 422 },
    );
  }

  // TODO: integrate Loops — POST to https://app.loops.so/api/v1/contacts/create
  // with the consented email and source="homepage_newsletter".

  return NextResponse.json({ ok: true }, { status: 200 });
}
