/**
 * Vehicle Health email notifications via Resend.
 *
 * - sendHostMaintenanceDigest: daily digest for hosts with high/urgent open tasks.
 *   Triggered from the nightly generate-maintenance-tasks cron route.
 * - sendHostNewQuoteNotification: instant email to host when a mechanic submits a quote.
 */
import { Resend } from 'resend'
import { siteUrl } from '@/lib/env'

type HostDigestPayload = {
  /** Host email address */
  to: string
  hostFirstName: string
  tasks: {
    title: string
    priority: 'high' | 'urgent'
    listingTitle: string
    listingId: string
    dueAtDate: string | null
  }[]
}

type NewQuotePayload = {
  to: string
  hostFirstName: string
  mechanicName: string
  taskTitle: string
  listingId: string
  quoteAmountCents: number
}

// ─── sendHostMaintenanceDigest ────────────────────────────────────────────────

export async function sendHostMaintenanceDigest(
  payload: HostDigestPayload
): Promise<{ error: string | null }> {
  const apiKey = process.env.RESEND_API_KEY?.trim()
  if (!apiKey) {
    console.info('[vehicle-health-emails] RESEND_API_KEY not set; skipping digest')
    return { error: null }
  }

  const { to, hostFirstName, tasks } = payload
  if (tasks.length === 0) return { error: null }

  const urgentCount = tasks.filter((t) => t.priority === 'urgent').length
  const highCount = tasks.filter((t) => t.priority === 'high').length

  const taskRows = tasks
    .map(
      (t) => `
        <tr>
          <td style="padding:10px 8px;border-bottom:1px solid #f0f0f0;font-size:14px;color:#1a1a1a;">${escapeHtml(t.listingTitle)}</td>
          <td style="padding:10px 8px;border-bottom:1px solid #f0f0f0;font-size:14px;color:#1a1a1a;">${escapeHtml(t.title)}</td>
          <td style="padding:10px 8px;border-bottom:1px solid #f0f0f0;">
            <span style="background:${t.priority === 'urgent' ? '#fef2f2' : '#fffbeb'};color:${t.priority === 'urgent' ? '#b91c1c' : '#b45309'};padding:2px 8px;border-radius:999px;font-size:12px;font-weight:600;">
              ${t.priority.charAt(0).toUpperCase() + t.priority.slice(1)}
            </span>
          </td>
          <td style="padding:10px 8px;border-bottom:1px solid #f0f0f0;font-size:13px;color:#666;">
            ${t.dueAtDate ? new Date(t.dueAtDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—'}
          </td>
        </tr>`
    )
    .join('')

  const subjectLine =
    urgentCount > 0
      ? `Action needed: ${urgentCount} urgent maintenance item${urgentCount > 1 ? 's' : ''} on your fleet`
      : `Heads up: ${highCount} maintenance item${highCount > 1 ? 's' : ''} coming up`

  const html = `
    <!DOCTYPE html>
    <html>
    <head><meta charset="utf-8"/></head>
    <body style="font-family:'Helvetica Neue',Arial,sans-serif;background:#f9f7f2;margin:0;padding:0;">
      <table width="100%" cellpadding="0" cellspacing="0" style="background:#f9f7f2;padding:40px 20px;">
        <tr><td align="center">
          <table width="600" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:16px;overflow:hidden;border:1px solid #e5e7eb;">
            <!-- Header -->
            <tr><td style="background:#1a2e1a;padding:32px 40px;">
              <p style="margin:0;font-size:22px;font-weight:700;color:#f9f7f2;letter-spacing:0.02em;">Vehicle Health Digest</p>
              <p style="margin:6px 0 0;font-size:13px;color:#a8c4a8;">CamperVansRental.com</p>
            </td></tr>
            <!-- Body -->
            <tr><td style="padding:32px 40px;">
              <p style="font-size:16px;color:#1a1a1a;margin:0 0 8px;">Hi ${escapeHtml(hostFirstName)},</p>
              <p style="font-size:14px;color:#555;line-height:1.6;margin:0 0 24px;">
                Your vehicle fleet has <strong>${tasks.length} maintenance item${tasks.length > 1 ? 's' : ''}</strong>
                that need${tasks.length === 1 ? 's' : ''} your attention.
              </p>
              <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e5e7eb;border-radius:8px;overflow:hidden;">
                <thead>
                  <tr style="background:#f9f7f2;">
                    <th style="padding:10px 8px;text-align:left;font-size:12px;font-weight:600;color:#666;text-transform:uppercase;letter-spacing:0.05em;">Vehicle</th>
                    <th style="padding:10px 8px;text-align:left;font-size:12px;font-weight:600;color:#666;text-transform:uppercase;letter-spacing:0.05em;">Task</th>
                    <th style="padding:10px 8px;text-align:left;font-size:12px;font-weight:600;color:#666;text-transform:uppercase;letter-spacing:0.05em;">Priority</th>
                    <th style="padding:10px 8px;text-align:left;font-size:12px;font-weight:600;color:#666;text-transform:uppercase;letter-spacing:0.05em;">Due</th>
                  </tr>
                </thead>
                <tbody>${taskRows}</tbody>
              </table>
              <div style="margin:28px 0;text-align:center;">
                <a href="${siteUrl()}/host/health" style="background:#1a2e1a;color:#f9f7f2;text-decoration:none;padding:12px 28px;border-radius:999px;font-size:14px;font-weight:600;display:inline-block;">
                  View Vehicle Health Dashboard
                </a>
              </div>
              <p style="font-size:12px;color:#999;text-align:center;margin:0;">
                You're receiving this because you have active vehicle listings on CamperVansRental.com.
              </p>
            </td></tr>
          </table>
        </td></tr>
      </table>
    </body>
    </html>
  `

  const resend = new Resend(apiKey)
  const { error } = await resend.emails.send({
    from: 'CamperVansRental <noreply@campervansrental.com>',
    to,
    subject: subjectLine,
    html,
  })

  return { error: error?.message ?? null }
}

// ─── sendHostNewQuoteNotification ─────────────────────────────────────────────

export async function sendHostNewQuoteNotification(
  payload: NewQuotePayload
): Promise<{ error: string | null }> {
  const apiKey = process.env.RESEND_API_KEY?.trim()
  if (!apiKey) return { error: null }

  const { to, hostFirstName, mechanicName, taskTitle, listingId, quoteAmountCents } = payload

  const formattedAmount = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(quoteAmountCents / 100)

  const html = `
    <!DOCTYPE html>
    <html>
    <head><meta charset="utf-8"/></head>
    <body style="font-family:'Helvetica Neue',Arial,sans-serif;background:#f9f7f2;margin:0;padding:0;">
      <table width="100%" cellpadding="0" cellspacing="0" style="background:#f9f7f2;padding:40px 20px;">
        <tr><td align="center">
          <table width="560" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:16px;overflow:hidden;border:1px solid #e5e7eb;">
            <tr><td style="background:#1a2e1a;padding:28px 36px;">
              <p style="margin:0;font-size:20px;font-weight:700;color:#f9f7f2;">New Quote Received</p>
              <p style="margin:4px 0 0;font-size:13px;color:#a8c4a8;">CamperVansRental.com · Vehicle Health</p>
            </td></tr>
            <tr><td style="padding:28px 36px;">
              <p style="font-size:15px;color:#1a1a1a;margin:0 0 16px;">Hi ${escapeHtml(hostFirstName)},</p>
              <p style="font-size:14px;color:#555;line-height:1.6;margin:0 0 20px;">
                <strong>${escapeHtml(mechanicName)}</strong> submitted a quote of
                <strong>${formattedAmount}</strong> for your maintenance task:
              </p>
              <div style="background:#f9f7f2;border-radius:10px;padding:16px 20px;margin-bottom:24px;">
                <p style="margin:0;font-size:15px;font-weight:600;color:#1a1a1a;">${escapeHtml(taskTitle)}</p>
              </div>
              <div style="text-align:center;">
                <a href="${siteUrl()}/host/health/${listingId}" style="background:#1a2e1a;color:#f9f7f2;text-decoration:none;padding:12px 28px;border-radius:999px;font-size:14px;font-weight:600;display:inline-block;">
                  Review Quote
                </a>
              </div>
            </td></tr>
          </table>
        </td></tr>
      </table>
    </body>
    </html>
  `

  const resend = new Resend(apiKey)
  const { error } = await resend.emails.send({
    from: 'CamperVansRental <noreply@campervansrental.com>',
    to,
    subject: `New mechanic quote: ${taskTitle}`,
    html,
  })

  return { error: error?.message ?? null }
}

// ─── HTML escape helper ───────────────────────────────────────────────────────

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}
