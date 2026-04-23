/**
 * scripts/elevate-user.ts
 * Promote a user's role in user_profile via the service-role client.
 *
 * Usage:
 *   npx tsx scripts/elevate-user.ts <email> <role>
 *   npx tsx scripts/elevate-user.ts mark@regalbloodstock.com operator
 *
 * Valid roles: buyer | syndicator | operator
 *
 * The user MUST already exist in auth.users (i.e. they have logged in at least
 * once and a user_profile row exists). This script does NOT create auth.users
 * rows — that is Supabase's responsibility.
 *
 * Requires in .env.local:
 *   NEXT_PUBLIC_SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 */

import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';
import { createClient } from '@supabase/supabase-js';

// ── Load .env.local ──────────────────────────────────────────────────────────
function loadDotEnv(path: string) {
  if (!existsSync(path)) return;
  const lines = readFileSync(path, 'utf-8').split('\n');
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIdx = trimmed.indexOf('=');
    if (eqIdx < 0) continue;
    const key = trimmed.slice(0, eqIdx).trim();
    const val = trimmed.slice(eqIdx + 1).trim().replace(/^["']|["']$/g, '');
    if (key && !(key in process.env)) {
      process.env[key] = val;
    }
  }
}

loadDotEnv(resolve(process.cwd(), '.env.local'));
loadDotEnv(resolve(process.cwd(), '.env'));

// ── Args ─────────────────────────────────────────────────────────────────────
const [, , emailArg, roleArg] = process.argv;

const VALID_ROLES = ['buyer', 'syndicator', 'operator'] as const;
type UserRole = typeof VALID_ROLES[number];

function usage(): never {
  console.error(
    'Usage: npx tsx scripts/elevate-user.ts <email> <role>\n' +
    'Valid roles: buyer | syndicator | operator',
  );
  process.exit(1);
}

if (!emailArg || !roleArg) usage();
if (!(VALID_ROLES as readonly string[]).includes(roleArg)) {
  console.error(`Invalid role "${roleArg}". Valid: ${VALID_ROLES.join(', ')}`);
  usage();
}

const email = emailArg.toLowerCase().trim();
const role  = roleArg as UserRole;

// ── Service client ───────────────────────────────────────────────────────────
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey  = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceKey) {
  console.error(
    'NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set in .env.local',
  );
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

// ── Main ─────────────────────────────────────────────────────────────────────
async function main() {
  console.log(`Looking up user: ${email}`);

  // Resolve auth.users by email using the admin API.
  const {
    data: { users },
    error: listErr,
  } = await supabase.auth.admin.listUsers({ perPage: 1000 });

  if (listErr) {
    throw new Error(`auth.admin.listUsers failed: ${listErr.message}`);
  }

  const authUser = users.find(
    (u) => u.email?.toLowerCase() === email,
  );

  if (!authUser) {
    console.error(
      `No auth.users row found for "${email}".\n` +
      'The user must log in via the app at least once before being elevated.',
    );
    process.exit(1);
  }

  console.log(`Found auth user: ${authUser.id} (${authUser.email})`);

  // Fetch current profile.
  const { data: current, error: fetchErr } = await supabase
    .from('user_profile')
    .select('id, role')
    .eq('id', authUser.id)
    .single();

  if (fetchErr || !current) {
    console.error(
      `user_profile row not found for id=${authUser.id}.\n` +
      'Has the user completed their first login? (auth callback creates the profile)',
    );
    process.exit(1);
  }

  const previousRole = current.role;
  console.log(`Current role:  ${previousRole}`);
  console.log(`New role:      ${role}`);

  if (previousRole === role) {
    console.log('No change needed — role already matches. Exiting.');
    return;
  }

  // Update the role.
  const { data: updated, error: updateErr } = await supabase
    .from('user_profile')
    .update({ role })
    .eq('id', authUser.id)
    .select('id, role')
    .single();

  if (updateErr || !updated) {
    throw new Error(
      `Failed to update role: ${updateErr?.message ?? 'unknown error'}`,
    );
  }

  console.log('');
  console.log(`Role elevated: ${previousRole} → ${updated.role}`);
  console.log(`User ID: ${updated.id}`);
  console.log('Done.');
}

main().catch((err) => {
  console.error('Elevation failed:', err.message ?? err);
  process.exit(1);
});
