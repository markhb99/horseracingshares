import {
  Body,
  Button,
  Container,
  Font,
  Head,
  Hr,
  Html,
  Preview,
  Section,
  Text,
} from '@react-email/components';
import * as React from 'react';

export interface WelcomeEmailProps {
  recipientName: string | null;
  siteUrl: string;
  unsubscribeUrl: string;
}

const base = {
  fontFamily: 'Arial, sans-serif',
  color: '#1A1A1A',
  fontSize: '14px',
  lineHeight: '1.6',
};

export function getSubject(): string {
  return 'Welcome to Horse Racing Shares';
}

export function getPlainText(props: WelcomeEmailProps): string {
  const name = props.recipientName ?? 'there';
  return [
    `Hi ${name},`,
    '',
    `Welcome to Horse Racing Shares — Australia's dedicated marketplace for racehorse syndication shares.`,
    '',
    'You can now:',
    '• Browse available shares from licensed syndicators',
    '• Save your favourite horses to your wishlist',
    '• Set up alerts so you never miss a horse that matches your criteria',
    '• Enquire directly about any listing',
    '',
    `Start browsing: ${props.siteUrl}/browse`,
    '',
    '— The Horse Racing Shares team',
    '',
    `Manage preferences: ${props.siteUrl}/account/preferences`,
  ].join('\n');
}

export default function WelcomeEmail({ recipientName, siteUrl, unsubscribeUrl }: WelcomeEmailProps) {
  const name = recipientName ?? 'there';

  return (
    <Html lang="en">
      <Head>
        <Font
          fontFamily="Georgia"
          fallbackFontFamily="serif"
          webFont={{ url: 'https://fonts.gstatic.com/s/fraunces/v24/6NUu8FyLNQOQZAnv9ZwNjucMHVn85Ni7emAe9lKqZTnDpToK.woff2', format: 'woff2' }}
          fontWeight={700}
          fontStyle="normal"
        />
      </Head>
      <Preview>Welcome to Horse Racing Shares — start browsing shares from licensed syndicators</Preview>
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
            <Text style={{ ...base, fontSize: '22px', fontFamily: 'Georgia, serif', fontWeight: 700, color: '#0E1E3A', margin: '0 0 16px' }}>
              Welcome, {name}
            </Text>

            <Text style={{ ...base, margin: '0 0 16px' }}>
              You&rsquo;re now part of Australia&rsquo;s dedicated marketplace for racehorse syndication shares.
              Every listing comes from a verified AFSL-licensed syndicator.
            </Text>

            <Text style={{ ...base, margin: '0 0 24px' }}>
              Here&rsquo;s what you can do:
            </Text>

            {[
              ['Browse active listings', 'Filter by sire, trainer, location, bonus schemes, and price'],
              ['Save to your wishlist', 'Bookmark horses you like and compare them later'],
              ['Set up search alerts', 'Get emailed when new horses match your criteria'],
              ['Enquire directly', 'Your message goes to the syndicator and we keep a record on your behalf'],
            ].map(([title, desc]) => (
              <Section key={title} style={{ marginBottom: '16px', paddingLeft: '16px', borderLeft: '3px solid #C9A84C' }}>
                <Text style={{ ...base, fontWeight: 700, margin: '0 0 2px', color: '#0E1E3A' }}>{title}</Text>
                <Text style={{ ...base, margin: 0, color: '#4A4A4A' }}>{desc}</Text>
              </Section>
            ))}

            <Section style={{ textAlign: 'center', margin: '32px 0' }}>
              <Button
                href={`${siteUrl}/browse`}
                style={{
                  backgroundColor: '#C9A84C',
                  color: '#0E1E3A',
                  padding: '14px 32px',
                  borderRadius: '100px',
                  fontWeight: 700,
                  fontSize: '15px',
                  textDecoration: 'none',
                  display: 'inline-block',
                }}
              >
                Browse horses now →
              </Button>
            </Section>
          </Section>

          <Hr style={{ borderColor: '#E8E4DC', margin: '0 40px' }} />

          {/* Footer */}
          <Section style={{ padding: '24px 40px', backgroundColor: '#F5F1E8' }}>
            <Text style={{ ...base, fontSize: '12px', color: '#6B7280', margin: '0 0 8px' }}>
              Horse Racing Shares is owned by Regal Bloodstock Pty Ltd, an ASIC-authorised racehorse syndicator.{' '}
              Shares are issued by the listed syndicator under their own Product Disclosure Statement and Australian
              Financial Services Licence. Horse Racing Shares is an advertising platform and is not an issuer of
              financial products. We do not provide personal financial advice.
            </Text>
            <Text style={{ ...base, fontSize: '12px', color: '#9CA3AF', margin: 0 }}>
              <a href={unsubscribeUrl} style={{ color: '#9CA3AF' }}>Manage your email preferences</a>
              {' · '}
              <a href={`${siteUrl}/legal`} style={{ color: '#9CA3AF' }}>Terms &amp; Privacy</a>
            </Text>
          </Section>

        </Container>
      </Body>
    </Html>
  );
}
