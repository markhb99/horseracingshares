export const runtime = 'nodejs';
export const maxDuration = 60;

import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { createServerClient } from '@/lib/supabase/server';

const PROMPT = `You are extracting a horse pedigree from an Australian thoroughbred auction catalogue page or pedigree document.

The pedigree is structured as a binary tree. The subject horse is on the left. Going right, each column is one generation back:
- Gen 1 (s/d): sire and dam of the subject horse
- Gen 2 (ss/sd/ds/dd): grandparents
- Gen 3 (sss/ssd/sds/sdd/dss/dsd/dds/ddd): great-grandparents
- Gen 4 (ssss/sssd/ssds/ssdd/sdss/sdsd/sdds/sddd/dsss/dssd/dsds/dsdd/ddss/ddsd/ddds/dddd): great-great-grandparents

Slot key convention: each character is 's' (sire/male) or 'd' (dam/female), reading from the subject outward.
Example: 'ssd' = subject's sire's sire's dam.

In the rightmost column, "by X" means X is the sire of the Gen 3 horse to its left. This gives you Gen 4 sire slots.

Return a JSON object. Include ONLY slots where you found a horse name. For each slot:
{
  "name": "Horse Name",
  "yob": 1999,            // year of birth as integer, or null if unknown
  "country": "AUS",       // AUS, USA, GB, IRE, FR, NZ, GER, etc. Extract from parenthetical e.g. "(Ire)" → "IRE", "(USA)" → "USA". Default "AUS" if no parenthetical.
  "sex": "sire",          // "sire" for male (slots ending in 's'), "dam" for female (slots ending in 'd')
  "is_group1_winner": false,   // true if the horse won a Group 1 / Grade 1 race
  "is_stakes_winner": false,   // true if the horse won any Group/Grade/Listed race
  "is_stakes_producer": false, // true if it is a dam that produced stakes winners
  "is_dam_line": false         // true for dams (slots ending in 'd'), false for sires
}

Important:
- Do NOT include the subject horse itself (the unnamed foal/yearling being syndicated) — only its ancestors.
- Gen 1 's' = the named SIRE breed line at the top of the pedigree table, Gen 1 'd' = the named DAM.
- Bold text in the catalogue often indicates Group 1 winners or notable horses — use this as a signal.
- Strip country suffixes from the name field (e.g. "Danehill (USA)" → name: "Danehill", country: "USA").
- Return ONLY the raw JSON object. No markdown, no explanation.`;

export async function POST(req: NextRequest) {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });

  const { data: profile } = await supabase
    .from('user_profile').select('role').eq('id', user.id).single();
  if (profile?.role !== 'operator') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: 'ANTHROPIC_API_KEY not configured' }, { status: 503 });
  }

  let fileUrl: string;
  let fileType: string;
  try {
    const body = await req.json();
    fileUrl = body.file_url;
    fileType = body.file_type;
    if (!fileUrl || !fileType) throw new Error('missing fields');
  } catch {
    return NextResponse.json({ error: 'Expected { file_url, file_type }' }, { status: 400 });
  }

  // Download the file from Supabase Storage
  let base64: string;
  try {
    const res = await fetch(fileUrl);
    if (!res.ok) throw new Error(`fetch failed: ${res.status}`);
    const buf = await res.arrayBuffer();
    base64 = Buffer.from(buf).toString('base64');
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: `Could not download file: ${msg}` }, { status: 422 });
  }

  const client = new Anthropic({ apiKey });

  // Build the message content based on file type
  type ImageMediaType = 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp';
  const isPdf = fileType === 'application/pdf';
  const messageContent: Anthropic.MessageParam['content'] = isPdf
    ? [
        {
          type: 'document' as const,
          source: { type: 'base64' as const, media_type: 'application/pdf' as const, data: base64 },
        },
        { type: 'text' as const, text: PROMPT },
      ]
    : [
        {
          type: 'image' as const,
          source: { type: 'base64' as const, media_type: fileType as ImageMediaType, data: base64 },
        },
        { type: 'text' as const, text: PROMPT },
      ];

  let responseText: string;
  try {
    const message = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 2048,
      messages: [{ role: 'user', content: messageContent }],
    });
    responseText = message.content[0].type === 'text' ? message.content[0].text : '';
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: `Claude API error: ${msg}` }, { status: 502 });
  }

  // Parse the JSON from Claude's response
  const jsonMatch = responseText.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    return NextResponse.json(
      { error: 'Could not parse pedigree from response', raw: responseText.slice(0, 500) },
      { status: 422 },
    );
  }

  try {
    const pedigree = JSON.parse(jsonMatch[0]);
    return NextResponse.json({ pedigree });
  } catch {
    return NextResponse.json(
      { error: 'Invalid JSON in Claude response', raw: jsonMatch[0].slice(0, 500) },
      { status: 422 },
    );
  }
}
