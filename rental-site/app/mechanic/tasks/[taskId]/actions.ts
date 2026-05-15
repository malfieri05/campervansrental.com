'use server'

import { createServerSupabaseClient } from '@/lib/supabase/server'
import { sendHostNewQuoteNotification } from '@/lib/vehicle-health-emails'
import { revalidateTag } from 'next/cache'
import { MECHANIC_FEED_TAG } from '@/lib/mechanic-feed'

export async function submitQuote(
  taskId: string,
  fd: FormData
): Promise<{ error: string | null }> {
  const supabase = await createServerSupabaseClient()
  if (!supabase) return { error: 'Supabase not configured' }

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthenticated' }

  const { data: mechProfile } = await supabase
    .from('mechanic_profiles')
    .select('id, display_name, business_name')
    .eq('id', user.id)
    .maybeSingle()

  if (!mechProfile) return { error: 'You must be a registered mechanic to submit quotes.' }

  const { data: task } = await supabase
    .from('published_open_tasks')
    .select('listing_id, title')
    .eq('id', taskId)
    .maybeSingle()

  if (!task) return { error: 'Task not found.' }

  const { data: listing } = await supabase
    .from('listings')
    .select('owner_id')
    .eq('id', task.listing_id)
    .maybeSingle()

  if (!listing) return { error: 'Listing not found.' }

  const amountDollars = Number(fd.get('amount_dollars'))
  const durationHours = fd.get('duration_hours') ? Number(fd.get('duration_hours')) : null
  const earliestDate = (fd.get('earliest_date') as string) || null
  const notes = (fd.get('notes') as string) || null
  const amountCents = Math.round(amountDollars * 100)

  const { error: insertError } = await supabase.from('mechanic_quotes').insert({
    task_id: taskId,
    mechanic_id: user.id,
    listing_id: task.listing_id,
    host_id: listing.owner_id,
    amount_cents: amountCents,
    estimated_duration_hours: durationHours,
    earliest_available_date: earliestDate,
    notes,
    status: 'pending',
  })

  if (insertError) return { error: insertError.message }

  // Instant email to host.
  // We need the host's email — use service role to look it up.
  try {
    const { createServiceRoleClient } = await import('@/lib/supabase/server')
    const serviceClient = createServiceRoleClient()
    if (serviceClient) {
      const { data: hostUsers } = await (serviceClient as unknown as {
        auth: { admin: { listUsers: () => Promise<{ data: { users: { id: string; email?: string }[] } }> } }
      }).auth.admin.listUsers()

      const hostEmail = hostUsers?.users.find((u) => u.id === listing.owner_id)?.email
      const { data: hostProfile } = await serviceClient
        .from('profiles')
        .select('display_name')
        .eq('id', listing.owner_id)
        .maybeSingle()

      if (hostEmail) {
        const hostFirstName = (hostProfile as { display_name: string | null } | null)?.display_name?.split(' ')[0] ?? 'there'
        await sendHostNewQuoteNotification({
          to: hostEmail,
          hostFirstName,
          mechanicName: mechProfile.business_name || mechProfile.display_name,
          taskTitle: task.title,
          listingId: task.listing_id,
          quoteAmountCents: amountCents,
        })
      }
    }
  } catch {
    // Email failure should not block the quote submission.
  }

  revalidateTag(MECHANIC_FEED_TAG)

  return { error: null }
}
