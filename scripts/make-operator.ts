/**
 * One-time script: create markhb99@gmail.com as an operator.
 * Usage: npx tsx scripts/make-operator.ts
 */

import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';
import { createClient } from '@supabase/supabase-js';

function loadDotEnv(p: string) {
  if (!existsSync(p)) return;
  for (const line of readFileSync(p, 'utf-8').split('\n')) {
    const t = line.trim();
    if (!t || t.startsWith('#')) continue;
    const eq = t.indexOf('=');
    if (eq < 0) continue;
    const k = t.slice(0, eq).trim();
    const v = t.slice(eq + 1).trim().replace(/^["']|["']$/g, '');
    if (k && !(k in process.env)) process.env[k] = v;
  }
}
loadDotEnv(resolve(process.cwd(), '.env.local'));

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !key) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local');
  process.exit(1);
}

const sb = createClient(url, key, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const EMAIL = 'markhb99@gmail.com';
const TEMP_PASSWORD = 'TempPass123!';

async function main() {
  // 1. Find or create auth user
  let userId: string;

  const { data: list, error: listErr } = await sb.auth.admin.listUsers({ perPage: 1000 });
  if (listErr) throw new Error(`listUsers failed: ${listErr.message}`);

  const existing = list?.users?.find(u => u.email?.toLowerCase() === EMAIL);

  if (existing) {
    userId = existing.id;
    console.log(`Found existing auth user: ${userId}`);
  } else {
    const { data: created, error: createErr } = await sb.auth.admin.createUser({
      email: EMAIL,
      email_confirm: true,
      user_metadata: { display_name: 'Mark' },
    });
    if (createErr || !created?.user) throw new Error(`createUser failed: ${createErr?.message}`);
    userId = created.user.id;
    console.log(`Created auth user: ${userId}`);
  }

  // 2. Set password so you can log in
  const { error: pwErr } = await sb.auth.admin.updateUserById(userId, {
    password: TEMP_PASSWORD,
    email_confirm: true,
  });
  if (pwErr) throw new Error(`setPassword failed: ${pwErr.message}`);
  console.log('Password set.');

  // 3. Upsert user_profile with operator role
  const { error: upErr } = await sb.from('user_profile').upsert(
    { id: userId, display_name: 'Mark', role: 'operator' },
    { onConflict: 'id' },
  );
  if (upErr) throw new Error(`user_profile upsert failed: ${upErr.message}`);
  console.log('user_profile set to operator.');

  console.log('');
  console.log('=== Done ===');
  console.log(`Email:    ${EMAIL}`);
  console.log(`Password: ${TEMP_PASSWORD}`);
  console.log('Role:     operator');
  console.log('');
  console.log('Change your password after first login.');
}

main().catch(err => {
  console.error('Failed:', err.message ?? err);
  process.exit(1);
});
