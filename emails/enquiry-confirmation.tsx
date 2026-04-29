import {
  Body,
  Button,
  Container,
  Head,
  Hr,
  Html,
  Preview,
  Section,
  Text,
} from '@react-email/components';
import * as React from 'react';

export interface EnquiryConfirmationProps {
  recipientName: string;
  horseName: string;
  horseSlug: string;
  syndicatorName: string;
  shareSize: number | null;
  siteUrl: string;
  unsubscribeUrl: string;
}

const base = {
  fontFamily: 'Arial, sans-serif',
  color: '#1A1A1A',
  fontSize: '14px',
  lineHeight: '1.6',
};

export function getSubject(props: EnquiryConfirmationProps): string {
  return `Your enquiry for ${props.horseName} has been sent`;
}

export function getPlainText(props: EnquiryConfirmationProps): string {
  return [
    `Hi ${props.recipientName},`,
    '',
    `Your enquiry for ${props.horseName} has been sent to ${props.syndicatorName}.`,
    '',
    props.shareSize ? `Share size interested: ${props.shareSize}%` : '',
    '',
    `They will be in touch shortly. In the meantime, you can view the listing:`,
    `${props.siteUrl}/horse/${props.horseSlug}`,
    '',
    `Or browse more horses: ${props.siteUrl}/browse`,
    '',
    '— The Horse Racing Shares team',
    '',
    `Manage preferences: ${props.unsubscribeUrl}`,
  ].filter(Boolean).join('\n');
}

export default function EnquiryConfirmationEmail({
  recipientName,
  horseName,
  horseSlug,
  syndicatorName,
  shareSize,
  siteUrl,
  unsubscribeUrl,
}: EnquiryConfirmationProps) {
  return (
    <Html lang="en">
      <Head />
      <Preview>Your enquiry for {horseName} has been sent to {syndicatorName}</Preview>
      <Body style={{ backgroundColor: '#F5F1E8', margin: 0, padding: '32px 0' }}>
        <Container style={{ maxWidth: '560px', margin: '0 auto', backgroundColor: '#FDFAF4', borderRadius: '12px', overflow: 'hidden' }}>

          {/* Header */}
          <Section style={{ backgroundColor: '#0E1E3A', padding: '28px 40px' }}>
            <Text style={{ fontFamily: 'Georgia, serif', fontSize: '22px', fontWeight: 700, color: '#FDFAF4', margin: 0, letterSpacing: '-0.5px' }}>
              Horse Racing Shares
            </Text>
          </Section>

          {/* Body */}
          <Section style={{ padding: '40px 40px 24px' }}>
            <Text style={{ ...base, fontSize: '20px', fontFamily: 'Georgia, serif', fontWeight: 700, color: '#0E1E3A', margin: '0 0 16px' }}>
              Enquiry sent
            </Text>

            <Text style={{ ...base, margin: '0 0 16px' }}>
              Hi {recipientName}, your enquiry for <strong>{horseName}</strong> has been forwarded to{' '}
              <strong>{syndicatorName}</strong>. They will be in touch shortly using your contact details.
            </Text>

            {/* Summary box */}
            <Section style={{ backgroundColor: '#F5F1E8', borderRadius: '8px', padding: '16px 20px', margin: '0 0 24px' }}>
              <Text style={{ ...base, fontWeight: 700, margin: '0 0 8px', color: '#0E1E3A' }}>Enquiry summary</Text>
              <Text style={{ ...base, margin: '0 0 4px' }}>
                <span style={{ color: '#6B7280' }}>Horse: </span>
                {horseName}
              </Text>
              <Text style={{ ...base, margin: '0 0 4px' }}>
                <span style={{ color: '#6B7280' }}>Syndicator: </span>
                {syndicatorName}
              </Text>
              {shareSize && (
                <Text style={{ ...base, margin: 0 }}>
                  <span style={{ color: '#6B7280' }}>Share size: </span>
                  {shareSize}%
                </Text>
              )}
            </Section>

            <Text style={{ ...base, margin: '0 0 24px', color: '#4A4A4A' }}>
              You can view the listing or browse more horses while you wait to hear back.
            </Text>

            <Section style={{ display: 'flex', gap: '12px', margin: '0 0 8px' }}>
              <Button
                href={`${siteUrl}/horse/${horseSlug}`}
                style={{
                  backgroundColor: '#0E1E3A',
                  color: '#FDFAF4',
                  padding: '12px 24px',
                  borderRadius: '100px',
                  fontWeight: 700,
                  fontSize: '14px',
                  textDecoration: 'none',
                  display: 'inline-block',
                  marginRight: '12px',
                }}
              >
                View listing
              </Button>
              <Button
                href={`${siteUrl}/browse`}
                style={{
                  backgroundColor: 'transparent',
                  color: '#0E1E3A',
                  padding: '12px 24px',
                  borderRadius: '100px',
                  fontWeight: 700,
                  fontSize: '14px',
                  textDecoration: 'none',
                  display: 'inline-block',
                  border: '1.5px solid #0E1E3A',
                }}
              >
                Browse more horses
              </Button>
            </Section>
          </Section>

          <Hr style={{ borderColor: '#E8E4DC', margin: '0 40px' }} />

          {/* Footer */}
          <Section style={{ padding: '24px 40px', backgroundColor: '#F5F1E8' }}>
            <Text style={{ ...base, fontSize: '12px', color: '#6B7280', margin: '0 0 8px' }}>
              Horse Racing Shares is an advertising platform. Shares are issued by the listed syndicator under
              their own Product Disclosure Statement and AFSL. We do not provide personal financial advice.
            </Text>
            <Text style={{ ...base, fontSize: '12px', color: '#9CA3AF', margin: 0 }}>
              <a href={unsubscribeUrl} style={{ color: '#9CA3AF' }}>Manage preferences</a>
              {' · '}
              <a href={`${siteUrl}/legal`} style={{ color: '#9CA3AF' }}>Terms &amp; Privacy</a>
            </Text>
          </Section>

        </Container>
      </Body>
    </Html>
  );
}
