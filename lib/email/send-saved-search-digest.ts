import * as React from 'react'
import SavedSearchDigestEmail, {
  getSubject,
  getPlainText,
  type SavedSearchDigestProps,
} from '@/emails/saved-search-digest'
import { resend, FROM } from '@/lib/email/resend'

export async function sendSavedSearchDigest(params: {
  to: string
  props: SavedSearchDigestProps
}): Promise<{ messageId: string } | { error: string }> {
  const { to, props } = params

  const { data, error } = await resend.emails.send({
    from: FROM,
    to,
    subject: getSubject(props),
    react: React.createElement(SavedSearchDigestEmail, props),
    text: getPlainText(props),
  })

  if (error) {
    return { error: error.message }
  }

  if (!data) {
    return { error: 'No response data from Resend' }
  }

  return { messageId: data.id }
}
