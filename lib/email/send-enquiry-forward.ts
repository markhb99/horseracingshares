/**
 * Forwards a captured enquiry to the syndicator's contact email.
 * Called from the enquiry API route via next/server `after()` so it
 * does not block the 201 response to the buyer.
 *
 * Returns { ok: true } on success or { ok: false; error: string } on failure.
 * The caller is responsible for writing the outcome back to the DB.
 */

import { createServiceClient } from '@/lib/supabase/service';
import { resend, FROM } from '@/lib/email/resend';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnySupabase = any;

// ─── Escape helper ────────────────────────────────────────────────────────────

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// ─── Row shapes ───────────────────────────────────────────────────────────────

interface EnquiryRow {
  id: string;
  contact_name: string;
  contact_email: string;
  contact_phone: string | null;
  message: string | null;
  share_size_interested_pct: number | null;
  consent_share_at_submit: boolean;
  created_at: string;
  horse: {
    id: string;
    slug: string;
    name: string | null;
    sire: string;
    dam: string;
    location_state: string;
  } | null;
  syndicator: {
    id: string;
    name: string;
    contact_email: string;
    contact_name: string;
  } | null;
}

// ─── Main export ─────────────────────────────────────────────────────────────

export async function sendEnquiryForward(
  enquiryId: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = createServiceClient() as AnySupabase;

  // Fetch the enquiry with related horse + syndicator in one query.
  const { data, error: fetchError } = await supabase
    .from('enquiry')
    .select(
      `id, contact_name, contact_email, contact_phone, message,
       share_size_interested_pct, consent_share_at_submit, created_at,
       horse:horse_id(id, slug, name, sire, dam, location_state),
       syndicator:syndicator_id(id, name, contact_email, contact_name)`,
    )
    .eq('id', enquiryId)
    .single();

  if (fetchError || !data) {
    return {
      ok: false,
      error: fetchError?.message ?? 'Enquiry not found',
    };
  }

  const row = data as unknown as EnquiryRow;

  if (!row.syndicator?.contact_email) {
    return { ok: false, error: 'Syndicator has no contact email' };
  }

  if (!row.consent_share_at_submit) {
    // Buyer did not consent — do not forward.
    // Mark as forwarded so it does not get retried.
    await supabase
      .from('enquiry')
      .update({
        forwarded_to_syndicator_at: new Date().toISOString(),
        status: 'forwarded',
      })
      .eq('id', enquiryId);
    return { ok: true };
  }

  const horseName =
    row.horse?.name ??
    (row.horse ? `${row.horse.sire} × ${row.horse.dam}` : 'Unknown horse');

  const shareText = row.share_size_interested_pct
    ? `${row.share_size_interested_pct}%`
    : 'Not specified';

  const htmlBody = `
<!DOCTYPE html>
<html lang="en-AU">
<head><meta charset="utf-8"><title>New enquiry — Horse Racing Shares</title></head>
<body style="font-family:sans-serif;color:#1A1A1A;max-width:600px;margin:auto;padding:24px">
  <h2 style="font-family:Georgia,serif;color:#0E1E3A;">
    New enquiry for ${escapeHtml(horseName)}
  </h2>
  <p style="color:#2D2D2D;font-size:14px;">
    A prospective owner has submitted an enquiry through Horse Racing Shares.
  </p>
  <table style="width:100%;border-collapse:collapse;margin:16px 0;font-size:14px;">
    <tr>
      <th style="text-align:left;padding:8px 12px;background:#E8E4DC;width:180px;">Name</th>
      <td style="padding:8px 12px;border-bottom:1px solid #E8E4DC;">${escapeHtml(row.contact_name)}</td>
    </tr>
    <tr>
      <th style="text-align:left;padding:8px 12px;background:#E8E4DC;">Email</th>
      <td style="padding:8px 12px;border-bottom:1px solid #E8E4DC;">
        <a href="mailto:${escapeHtml(row.contact_email)}">${escapeHtml(row.contact_email)}</a>
      </td>
    </tr>
    ${row.contact_phone ? `<tr>
      <th style="text-align:left;padding:8px 12px;background:#E8E4DC;">Mobile</th>
      <td style="padding:8px 12px;border-bottom:1px solid #E8E4DC;">${escapeHtml(row.contact_phone)}</td>
    </tr>` : ''}
    <tr>
      <th style="text-align:left;padding:8px 12px;background:#E8E4DC;">Horse</th>
      <td style="padding:8px 12px;border-bottom:1px solid #E8E4DC;">${escapeHtml(horseName)}${row.horse?.location_state ? ` (${escapeHtml(row.horse.location_state)})` : ''}</td>
    </tr>
    <tr>
      <th style="text-align:left;padding:8px 12px;background:#E8E4DC;">Share size interested</th>
      <td style="padding:8px 12px;border-bottom:1px solid #E8E4DC;">${escapeHtml(shareText)}</td>
    </tr>
    ${row.message ? `<tr>
      <th style="text-align:left;padding:8px 12px;background:#E8E4DC;vertical-align:top;">Message</th>
      <td style="padding:8px 12px;border-bottom:1px solid #E8E4DC;white-space:pre-wrap;">${escapeHtml(row.message)}</td>
    </tr>` : ''}
  </table>
  <p style="font-size:12px;color:#6B7280;margin-top:24px;">
    This enquiry was submitted on ${new Date(row.created_at).toLocaleString('en-AU', { timeZone: 'Australia/Melbourne' })} AEST via
    <a href="https://horseracingshares.com">horseracingshares.com</a>.
    The prospect consented to you contacting them about this enquiry.
  </p>
  <p style="font-size:11px;color:#9CA3AF;margin-top:8px;">
    This is an automated notification from Horse Racing Shares. Do not reply to this email —
    contact the prospect directly using the details above.
  </p>
</body>
</html>`;

  const { error: sendError } = await resend.emails.send({
    from: FROM,
    to: [row.syndicator.contact_email],
    replyTo: row.contact_email,
    subject: `New enquiry: ${horseName} — Horse Racing Shares`,
    html: htmlBody,
  });

  if (sendError) {
    // Record failure on the enquiry row.
    await supabase
      .from('enquiry')
      .update({
        status: 'failed',
        forward_failed_at: new Date().toISOString(),
        forward_error: sendError.message,
      })
      .eq('id', enquiryId);
    return { ok: false, error: sendError.message };
  }

  // Mark as forwarded.
  await supabase
    .from('enquiry')
    .update({
      forwarded_to_syndicator_at: new Date().toISOString(),
      status: 'forwarded',
    })
    .eq('id', enquiryId);

  return { ok: true };
}
