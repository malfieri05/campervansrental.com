/**
 * Phase 3 — Mechanic & host notification helpers.
 *
 * - sendMechanicNewTaskDigest: daily digest to mechanics within radius of new public tasks.
 *   Called from the nightly cron (generate-maintenance-tasks) or a dedicated digest cron.
 * - Instant host notification on new quote is handled by sendHostNewQuoteNotification
 *   in lib/vehicle-health-emails.ts, called from the mechanic quote submit action.
 */

import { Resend } from 'resend'
import { siteUrl } from '@/lib/env'
import { getPublicTasksInRadius } from '@/lib/mechanic-feed'

// ─── sendMechanicNewTaskDigest ────────────────────────────────────────────────

type MechanicDigestPayload = {
  to: string
  mechanicFirstName: string
  lat: number
  lng: number
  radiusMiles: number
  specialties: string[]
}

export async function sendMechanicNewTaskDigest(
  payload: MechanicDigestPayload
): Promise<{ error: string | null }> {
  const apiKey = process.env.RESEND_API_KEY?.trim()
  if (!apiKey) return { error: null }

  const { to, mechanicFirstName, lat, lng, radiusMiles, specialties } = payload

  const allTasks = await getPublicTasksInRadius({ lat, lng, radiusMiles })

  // Filter to matching specialties (empty = accept all).
  const tasks = specialties.length > 0
    ? allTasks.filter((t) => specialties.includes(t.kind))
    : allTasks

  if (tasks.length === 0) return { error: null }

  const taskRows = tasks
    .slice(0, 5)
    .map(
      (t) => `
      <tr>
        <td style="padding:10px 8px;border-bottom:1px solid #f0f0f0;font-size:14px;color:#1a1a1a;">${escapeHtml(t.title)}</td>
        <td style="padding:10px 8px;border-bottom:1px solid #f0f0f0;font-size:13px;color:#555;">
          ${t.address_city ? `${escapeHtml(t.address_city)}, ${escapeHtml(t.address_state ?? '')}` : '—'}
        </td>
        <td style="padding:10px 8px;border-bottom:1px solid #f0f0f0;font-size:13px;color:#555;">
          ${t.distanceMiles < Infinity ? `${t.distanceMiles.toFixed(1)} mi` : '—'}
        </td>
        <td style="padding:10px 8px;border-bottom:1px solid #f0f0f0;">
          <a href="${siteUrl()}/mechanic/tasks/${t.id}"
             style="background:#1a2e1a;color:#f9f7f2;text-decoration:none;padding:4px 12px;border-radius:999px;font-size:12px;font-weight:600;display:inline-block;">
            View
          </a>
        </td>
      </tr>`
    )
    .join('')

  const html = `
    <!DOCTYPE html>
    <html>
    <head><meta charset="utf-8"/></head>
    <body style="font-family:'Helvetica Neue',Arial,sans-serif;background:#f9f7f2;margin:0;padding:0;">
      <table width="100%" cellpadding="0" cellspacing="0" style="background:#f9f7f2;padding:40px 20px;">
        <tr><td align="center">
          <table width="600" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:16px;overflow:hidden;border:1px solid #e5e7eb;">
            <tr><td style="background:#1a2e1a;padding:28px 36px;">
              <p style="margin:0;font-size:20px;font-weight:700;color:#f9f7f2;">New Maintenance Jobs Near You</p>
              <p style="margin:4px 0 0;font-size:13px;color:#a8c4a8;">CamperVansRental.com · Mechanic Partner Network</p>
            </td></tr>
            <tr><td style="padding:28px 36px;">
              <p style="font-size:15px;color:#1a1a1a;margin:0 0 16px;">Hi ${escapeHtml(mechanicFirstName)},</p>
              <p style="font-size:14px;color:#555;line-height:1.6;margin:0 0 20px;">
                There ${tasks.length === 1 ? 'is' : 'are'} <strong>${tasks.length} open task${tasks.length > 1 ? 's' : ''}</strong>
                within ${radiusMiles} miles of you.
              </p>
              <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e5e7eb;border-radius:8px;overflow:hidden;">
                <thead>
                  <tr style="background:#f9f7f2;">
                    <th style="padding:10px 8px;text-align:left;font-size:12px;font-weight:600;color:#666;text-transform:uppercase;">Task</th>
                    <th style="padding:10px 8px;text-align:left;font-size:12px;font-weight:600;color:#666;text-transform:uppercase;">Location</th>
                    <th style="padding:10px 8px;text-align:left;font-size:12px;font-weight:600;color:#666;text-transform:uppercase;">Distance</th>
                    <th style="padding:10px 8px;"></th>
                  </tr>
                </thead>
                <tbody>${taskRows}</tbody>
              </table>
              <div style="margin:24px 0;text-align:center;">
                <a href="${siteUrl()}/mechanic/tasks"
                   style="background:#1a2e1a;color:#f9f7f2;text-decoration:none;padding:12px 28px;border-radius:999px;font-size:14px;font-weight:600;display:inline-block;">
                  Browse All Tasks
                </a>
              </div>
              <p style="font-size:12px;color:#999;text-align:center;">
                You're receiving this as a CamperVansRental.com mechanic partner.
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
    subject: `${tasks.length} maintenance job${tasks.length > 1 ? 's' : ''} near you`,
    html,
  })

  return { error: error?.message ?? null }
}

// ─── sendMechanicDigestToAll ──────────────────────────────────────────────────
// Convenience wrapper called from the daily cron. Iterates all active mechanics
// and sends each a personalized digest if they have matching tasks in radius.

export async function sendMechanicDigestToAll(
  serviceClient: {
    from: (table: string) => {
      select: (cols: string) => {
        eq: (col: string, val: unknown) => Promise<{ data: unknown[] | null }>
      }
    }
  } & {
    auth: {
      admin: {
        listUsers: () => Promise<{ data: { users: { id: string; email?: string }[] } }>
      }
    }
  }
): Promise<{ sent: number; errors: number }> {
  let sent = 0
  let errors = 0

  const { data: mechanics } = await (serviceClient as unknown as {
    from: (t: string) => {
      select: (c: string) => {
        eq: (col: string, val: unknown) => Promise<{ data: {
          id: string
          display_name: string
          lat: number | null
          lng: number | null
          service_radius_miles: number
          specialties: string[]
        }[] | null }>
      }
    }
  })
    .from('mechanic_profiles')
    .select('id, display_name, lat, lng, service_radius_miles, specialties')
    .eq('is_active', true)

  if (!mechanics || mechanics.length === 0) return { sent: 0, errors: 0 }

  let emailMap = new Map<string, string>()
  try {
    const { data: { users } } = await serviceClient.auth.admin.listUsers()
    emailMap = new Map(users.map((u) => [u.id, u.email ?? '']))
  } catch {
    return { sent: 0, errors: 1 }
  }

  for (const mech of mechanics) {
    if (!mech.lat || !mech.lng) continue
    const email = emailMap.get(mech.id)
    if (!email) continue

    const firstName = mech.display_name.split(' ')[0]
    const result = await sendMechanicNewTaskDigest({
      to: email,
      mechanicFirstName: firstName,
      lat: mech.lat,
      lng: mech.lng,
      radiusMiles: mech.service_radius_miles,
      specialties: mech.specialties,
    })

    if (result.error) errors++
    else sent++
  }

  return { sent, errors }
}

// ─── HTML escape ──────────────────────────────────────────────────────────────

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}
