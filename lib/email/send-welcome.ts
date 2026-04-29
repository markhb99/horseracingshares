import * as React from 'react';
import WelcomeEmail, { getSubject, getPlainText } from '@/emails/welcome';
import { resend, FROM } from '@/lib/email/resend';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://horseracingshares.com';

export async function sendWelcomeEmail(params: {
  to: string;
  recipientName: string | null;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const props = {
    recipientName: params.recipientName,
    siteUrl: SITE_URL,
    unsubscribeUrl: `${SITE_URL}/account/preferences`,
  };

  const { data, error } = await resend.emails.send({
    from: FROM,
    to: params.to,
    subject: getSubject(),
    react: React.createElement(WelcomeEmail, props),
    text: getPlainText(props),
  });

  if (error) return { ok: false, error: error.message };
  if (!data) return { ok: false, error: 'No response from Resend' };
  return { ok: true };
}
