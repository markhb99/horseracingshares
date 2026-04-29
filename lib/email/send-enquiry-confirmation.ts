import * as React from 'react';
import EnquiryConfirmationEmail, {
  getSubject,
  getPlainText,
  type EnquiryConfirmationProps,
} from '@/emails/enquiry-confirmation';
import { resend, FROM } from '@/lib/email/resend';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://horseracingshares.com';

export async function sendEnquiryConfirmation(params: {
  to: string;
  recipientName: string;
  horseName: string;
  horseSlug: string;
  syndicatorName: string;
  shareSize: number | null;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const props: EnquiryConfirmationProps = {
    ...params,
    siteUrl: SITE_URL,
    unsubscribeUrl: `${SITE_URL}/account/preferences`,
  };

  const { data, error } = await resend.emails.send({
    from: FROM,
    to: params.to,
    subject: getSubject(props),
    react: React.createElement(EnquiryConfirmationEmail, props),
    text: getPlainText(props),
  });

  if (error) return { ok: false, error: error.message };
  if (!data) return { ok: false, error: 'No response from Resend' };
  return { ok: true };
}
