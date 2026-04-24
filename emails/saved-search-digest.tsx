import {
  Body,
  Button,
  Container,
  Font,
  Head,
  Hr,
  Html,
  Img,
  Link,
  Preview,
  Row,
  Column,
  Section,
  Text,
} from '@react-email/components'
import * as React from 'react'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface SavedSearchDigestMatch {
  id: string
  slug: string
  name: string
  sire: string
  dam: string
  sex: string
  age_category: string
  location_state: string
  primary_trainer_name: string | null
  price_min_cents: number
  share_pcts_available: number[]
  has_final_shares: boolean
  bonus_schemes: string[]
  hero_image_path: string | null
  matched_searches: string[]
}

export interface SavedSearchDigestProps {
  recipientName: string
  matches: SavedSearchDigestMatch[]
  totalMatchCount: number
  unsubscribeUrl: string
  manageUrl: string
  siteUrl: string
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const aud = new Intl.NumberFormat('en-AU', {
  style: 'currency',
  currency: 'AUD',
  maximumFractionDigits: 0,
})

function formatPrice(match: SavedSearchDigestMatch): string {
  const pct = match.share_pcts_available.length > 0
    ? Math.min(...match.share_pcts_available)
    : null
  const price = aud.format(match.price_min_cents / 100)
  return pct !== null ? `${price} for ${pct}%` : price
}

function mostCommonSire(matches: SavedSearchDigestMatch[]): string {
  const counts: Record<string, number> = {}
  for (const m of matches) {
    counts[m.sire] = (counts[m.sire] ?? 0) + 1
  }
  return Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? ''
}

// ─── Subject line ─────────────────────────────────────────────────────────────

export function getSubject(props: SavedSearchDigestProps): string {
  const n = props.totalMatchCount
  if (n === 1) {
    const m = props.matches[0]
    return `New: ${m.name} (${m.sire} × ${m.dam}) matches your search`
  }
  if (n <= 5) {
    return `${n} new horses match your saved search`
  }
  return `${n} new horses match your saved search — ${mostCommonSire(props.matches)} and more`
}

// ─── Plain text ───────────────────────────────────────────────────────────────

export function getPlainText(props: SavedSearchDigestProps): string {
  const { recipientName, matches, totalMatchCount, siteUrl, manageUrl, unsubscribeUrl } = props
  const horseWord = totalMatchCount === 1 ? 'horse' : 'horses'
  const shown = matches.slice(0, 3)

  const lines: string[] = [
    `Hi ${recipientName},`,
    '',
    `Your saved search has ${totalMatchCount} new ${horseWord}.`,
    '',
    `We found ${totalMatchCount} new listings that match your saved search since your last alert.`,
    '',
    '─────────────────────────────────────────',
  ]

  for (const m of shown) {
    lines.push(
      '',
      m.name,
      `${m.sire} × ${m.dam}`,
      `Price: ${formatPrice(m)}`,
      `Location: ${m.location_state}`,
      ...(m.bonus_schemes.length > 0 ? [`Bonus schemes: ${m.bonus_schemes.join(', ')}`] : []),
      `View: ${siteUrl}/horses/${m.slug}`,
      '',
      '─────────────────────────────────────────',
    )
  }

  if (totalMatchCount > 3) {
    lines.push(
      '',
      `… and ${totalMatchCount - 3} more. View all matches: ${siteUrl}/browse`,
      '',
    )
  }

  lines.push(
    '',
    'Shares are issued by the listed syndicator under their own PDS and AFSL. Horse Racing Shares is an advertising platform only.',
    '',
    `Manage saved searches: ${manageUrl}`,
    `Unsubscribe from alerts: ${unsubscribeUrl}`,
  )

  return lines.join('\n')
}

// ─── Colours ──────────────────────────────────────────────────────────────────

const C = {
  midnight: '#0E1E3A',
  brass: '#B8893E',
  paper: '#FAF7F2',
  fog: '#E8E4DC',
  charcoal: '#1A1A1A',
  charcoalSoft: '#2D2D2D',
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function HorseCard({ match, siteUrl }: { match: SavedSearchDigestMatch; siteUrl: string }) {
  const horseUrl = `${siteUrl}/horses/${match.slug}`

  return (
    <Section style={{ paddingTop: '20px', paddingBottom: '20px' }}>
      <Row>
        {match.hero_image_path && (
          <Column style={{ width: '80px', verticalAlign: 'top', paddingRight: '16px' }}>
            <Img
              src={match.hero_image_path}
              width={80}
              height={60}
              alt={match.name}
              style={{ borderRadius: '4px', objectFit: 'cover', display: 'block' }}
            />
          </Column>
        )}
        <Column style={{ verticalAlign: 'top' }}>
          <Text
            style={{
              margin: '0 0 2px 0',
              fontSize: '16px',
              fontWeight: '700',
              color: C.charcoal,
              lineHeight: '1.3',
            }}
          >
            {match.name}
          </Text>
          <Text
            style={{
              margin: '0 0 8px 0',
              fontSize: '13px',
              fontStyle: 'italic',
              color: C.charcoalSoft,
              lineHeight: '1.4',
            }}
          >
            {match.sire} × {match.dam}
          </Text>
          <Row>
            <Column>
              <Text
                style={{
                  margin: '0 0 6px 0',
                  fontSize: '14px',
                  fontWeight: '600',
                  color: C.midnight,
                }}
              >
                {formatPrice(match)}
              </Text>
            </Column>
          </Row>
          <Row>
            <Column>
              <span
                style={{
                  display: 'inline-block',
                  backgroundColor: C.fog,
                  color: C.charcoalSoft,
                  fontSize: '11px',
                  fontWeight: '500',
                  padding: '2px 8px',
                  borderRadius: '12px',
                  marginRight: '6px',
                }}
              >
                {match.location_state}
              </span>
              {match.bonus_schemes.map((scheme) => (
                <span
                  key={scheme}
                  style={{
                    display: 'inline-block',
                    backgroundColor: C.brass,
                    color: '#ffffff',
                    fontSize: '11px',
                    fontWeight: '600',
                    padding: '2px 8px',
                    borderRadius: '12px',
                    marginRight: '6px',
                  }}
                >
                  {scheme}
                </span>
              ))}
            </Column>
          </Row>
          <Text style={{ margin: '10px 0 0 0' }}>
            <Link
              href={horseUrl}
              style={{
                color: C.midnight,
                fontSize: '13px',
                fontWeight: '600',
                textDecoration: 'underline',
              }}
            >
              View horse →
            </Link>
          </Text>
        </Column>
      </Row>
    </Section>
  )
}

// ─── Email template ───────────────────────────────────────────────────────────

export default function SavedSearchDigestEmail(props: SavedSearchDigestProps) {
  const {
    recipientName,
    matches,
    totalMatchCount,
    unsubscribeUrl,
    manageUrl,
    siteUrl,
  } = props

  const shown = matches.slice(0, 3)
  const remainder = totalMatchCount - shown.length
  const horseWord = totalMatchCount === 1 ? 'horse' : 'horses'
  const browseUrl = `${siteUrl}/browse`

  return (
    <Html lang="en">
      <Head>
        <Font
          fontFamily="Fraunces"
          fallbackFontFamily="Georgia"
          webFont={{
            url: 'https://fonts.gstatic.com/s/fraunces/v31/6NUu8FyLNQOQZAnv9ZwNjucMHVn85Ni7emAe9lKqZTnDiw.woff2',
            format: 'woff2',
          }}
          fontWeight={700}
          fontStyle="normal"
        />
        <Font
          fontFamily="Inter"
          fallbackFontFamily="Arial"
          webFont={{
            url: 'https://fonts.gstatic.com/s/inter/v19/UcCO3FwrK3iLTeHuS_nVMrMxCp50SjIw2boKoduKmMEVuLyfAZ9hiA.woff2',
            format: 'woff2',
          }}
          fontWeight={400}
          fontStyle="normal"
        />
      </Head>
      <Preview>
        {String(totalMatchCount)} new {horseWord} match your saved search on Horse Racing Shares
      </Preview>
      <Body
        style={{
          backgroundColor: C.paper,
          fontFamily: 'Inter, Arial, sans-serif',
          margin: '0',
          padding: '0',
        }}
      >
        {/* Header */}
        <Section style={{ backgroundColor: C.midnight, padding: '24px 0' }}>
          <Container style={{ maxWidth: '600px', margin: '0 auto', padding: '0 24px' }}>
            <Text
              style={{
                margin: '0',
                fontSize: '18px',
                fontWeight: '700',
                color: C.brass,
                letterSpacing: '0.02em',
              }}
            >
              Horse Racing Shares
            </Text>
          </Container>
        </Section>

        {/* Body */}
        <Container style={{ maxWidth: '600px', margin: '0 auto', padding: '0 24px' }}>
          {/* Greeting + heading */}
          <Section style={{ paddingTop: '32px', paddingBottom: '8px' }}>
            <Text
              style={{
                margin: '0 0 4px 0',
                fontSize: '13px',
                color: C.charcoalSoft,
              }}
            >
              Hi {recipientName},
            </Text>
            <Text
              style={{
                margin: '0 0 12px 0',
                fontSize: '24px',
                fontFamily: 'Fraunces, Georgia, serif',
                fontWeight: '700',
                color: C.midnight,
                lineHeight: '1.25',
              }}
            >
              Your saved search has {totalMatchCount} new {horseWord}.
            </Text>
            <Text
              style={{
                margin: '0 0 8px 0',
                fontSize: '15px',
                color: C.charcoalSoft,
                lineHeight: '1.6',
              }}
            >
              We found {totalMatchCount} new listings that match your saved search since your last
              alert.
            </Text>
          </Section>

          <Hr style={{ borderColor: C.fog, margin: '8px 0 0 0' }} />

          {/* Horse cards */}
          {shown.map((match, idx) => (
            <React.Fragment key={match.id}>
              <HorseCard match={match} siteUrl={siteUrl} />
              {idx < shown.length - 1 && (
                <Hr style={{ borderColor: C.fog, margin: '0' }} />
              )}
            </React.Fragment>
          ))}

          {/* "… and N more" */}
          {remainder > 0 && (
            <Section style={{ paddingTop: '16px', paddingBottom: '8px' }}>
              <Hr style={{ borderColor: C.fog, margin: '0 0 16px 0' }} />
              <Text
                style={{
                  margin: '0 0 12px 0',
                  fontSize: '14px',
                  color: C.charcoalSoft,
                }}
              >
                … and {remainder} more.{' '}
                <Link
                  href={browseUrl}
                  style={{ color: C.midnight, fontWeight: '600', textDecoration: 'underline' }}
                >
                  View all matches on site →
                </Link>
              </Text>
            </Section>
          )}

          {/* CTA button */}
          <Section style={{ paddingTop: '8px', paddingBottom: '32px' }}>
            <Button
              href={manageUrl}
              style={{
                backgroundColor: C.midnight,
                color: '#ffffff',
                fontSize: '14px',
                fontWeight: '600',
                padding: '12px 24px',
                borderRadius: '4px',
                textDecoration: 'none',
                display: 'inline-block',
              }}
            >
              Manage saved searches
            </Button>
          </Section>
        </Container>

        {/* Footer */}
        <Section style={{ backgroundColor: C.fog, padding: '24px 0' }}>
          <Container style={{ maxWidth: '600px', margin: '0 auto', padding: '0 24px' }}>
            <Text
              style={{
                margin: '0 0 12px 0',
                fontSize: '11px',
                color: C.charcoalSoft,
                lineHeight: '1.6',
              }}
            >
              Shares are issued by the listed syndicator under their own PDS and AFSL. Horse
              Racing Shares is an advertising platform and is not an issuer of financial products.
              We do not provide personal financial advice.
            </Text>
            <Text
              style={{
                margin: '0',
                fontSize: '11px',
                color: C.charcoalSoft,
              }}
            >
              <Link href={manageUrl} style={{ color: C.charcoalSoft, textDecoration: 'underline' }}>
                Manage saved searches
              </Link>
              {' · '}
              <Link
                href={`${manageUrl}#frequency`}
                style={{ color: C.charcoalSoft, textDecoration: 'underline' }}
              >
                Change frequency
              </Link>
              {' · '}
              <Link
                href={unsubscribeUrl}
                style={{ color: C.charcoalSoft, textDecoration: 'underline' }}
              >
                Unsubscribe from alerts
              </Link>
            </Text>
          </Container>
        </Section>
      </Body>
    </Html>
  )
}
