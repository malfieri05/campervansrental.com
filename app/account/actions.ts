'use server'

import { revalidatePath } from 'next/cache'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { isStripeHostConnectOffered, siteUrl } from '@/lib/env'
import { getStripe } from '@/lib/stripe'

function normalizeCountryCode(value: string | null | undefined): string {
  const raw = (value ?? '').trim()
  if (!raw) return 'US'

  const upper = raw.toUpperCase()
  if (/^[A-Z]{2}$/.test(upper)) return upper

  const lookup: Record<string, string> = {
    'UNITED STATES': 'US',
    USA: 'US',
    'UNITED STATES OF AMERICA': 'US',
    CANADA: 'CA',
    MEXICO: 'MX',
    'UNITED KINGDOM': 'GB',
    UK: 'GB',
    GREATBRITAIN: 'GB',
    AUSTRALIA: 'AU',
    GERMANY: 'DE',
    FRANCE: 'FR',
    SPAIN: 'ES',
    ITALY: 'IT',
    NETHERLANDS: 'NL',
    IRELAND: 'IE',
    NEWZEALAND: 'NZ',
  }

  const compact = upper.replace(/[^A-Z]/g, '')
  return lookup[compact] ?? 'US'
}

export type ProfileFields = {
  first_name: string
  last_name: string
  phone: string
  about_me: string
  address_street: string
  address_city: string
  address_state: string
  address_zip: string
  address_country: string
  avatar_url: string
  display_name: string
}

export async function getProfile(): Promise<{ profile: ProfileFields | null; error: string | null }> {
  const supabase = await createServerSupabaseClient()
  if (!supabase) return { profile: null, error: 'Supabase not configured' }

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { profile: null, error: 'Not authenticated' }

  const { data, error } = await supabase
    .from('profiles')
    .select('first_name, last_name, phone, about_me, address_street, address_city, address_state, address_zip, address_country, avatar_url, display_name')
    .eq('id', user.id)
    .single()

  if (error) return { profile: null, error: error.message }
  return { profile: data as ProfileFields, error: null }
}

export async function updateProfile(
  fields: Partial<ProfileFields>
): Promise<{ error: string | null }> {
  const supabase = await createServerSupabaseClient()
  if (!supabase) return { error: 'Supabase not configured' }

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  // Sync display_name from first+last if provided
  const updates: Record<string, unknown> = { ...fields }
  if (fields.first_name !== undefined || fields.last_name !== undefined) {
    const { data: existing } = await supabase
      .from('profiles')
      .select('first_name, last_name')
      .eq('id', user.id)
      .single()
    const fn = fields.first_name ?? existing?.first_name ?? ''
    const ln = fields.last_name ?? existing?.last_name ?? ''
    updates.display_name = `${fn} ${ln}`.trim() || fn || ln
  }

  const { error } = await supabase
    .from('profiles')
    .update(updates)
    .eq('id', user.id)

  if (error) return { error: error.message }
  revalidatePath('/account')
  return { error: null }
}

export async function updateAvatarUrl(
  avatarUrl: string
): Promise<{ error: string | null }> {
  const supabase = await createServerSupabaseClient()
  if (!supabase) return { error: 'Supabase not configured' }

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const { error } = await supabase
    .from('profiles')
    .update({ avatar_url: avatarUrl })
    .eq('id', user.id)

  if (error) return { error: error.message }
  revalidatePath('/account')
  return { error: null }
}

const CONNECT_BLOCKED_MESSAGE =
  'Host payouts use Stripe Connect on your platform account (this app’s STRIPE_SECRET_KEY). Your Stripe dashboard is blocking Connect until you finish Atlas or switch accounts—that does not apply to normal traveler checkout (Checkout sessions). Easiest path: create a second Stripe account with a new email, skip Atlas, enable Connect there, replace STRIPE_SECRET_KEY with that account’s secret key, restart the app. Or contact Stripe support to enable Connect without Atlas.'

function isStripeConnectPlatformBlockedMessage(message: string): boolean {
  const m = message.toLowerCase()
  return (
    m.includes('signed up for connect') ||
    m.includes('atlas') ||
    (m.includes('connect') &&
      (m.includes('not enabled') ||
        m.includes('must complete') ||
        m.includes('different account') ||
        m.includes('complete your')))
  )
}

export async function startStripeConnectOnboarding(): Promise<{
  url: string | null
  error: string | null
}> {
  try {
    if (!isStripeHostConnectOffered()) {
      return {
        url: null,
        error:
          'Host Stripe Connect onboarding is disabled (NEXT_PUBLIC_STRIPE_HOST_CONNECT=false). Turn it on after your platform Stripe account has Connect enabled.',
      }
    }

    const supabase = await createServerSupabaseClient()
    if (!supabase) return { url: null, error: 'Supabase not configured' }

    const stripe = getStripe()
    if (!stripe) return { url: null, error: 'Stripe is not configured yet' }

    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return { url: null, error: 'Not authenticated' }

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('is_host, stripe_connect_account_id, first_name, last_name, address_country')
      .eq('id', user.id)
      .single()

    if (profileError) return { url: null, error: profileError.message }
    if (!profile?.is_host) return { url: null, error: 'Only host accounts can connect payouts.' }

    let accountId = profile.stripe_connect_account_id as string | null

    if (!accountId) {
      const account = await stripe.accounts.create({
        country: normalizeCountryCode(profile.address_country),
        email: user.email ?? undefined,
        business_type: 'individual',
        individual: {
          first_name: profile.first_name ?? undefined,
          last_name: profile.last_name ?? undefined,
          email: user.email ?? undefined,
        },
        capabilities: {
          transfers: { requested: true },
        },
      })

      accountId = account.id

      const { error: updateError } = await supabase
        .from('profiles')
        .update({ stripe_connect_account_id: accountId })
        .eq('id', user.id)

      if (updateError) return { url: null, error: updateError.message }
    }

    const base = siteUrl()
    const accountLink = await stripe.accountLinks.create({
      account: accountId,
      type: 'account_onboarding',
      refresh_url: `${base}/account?tab=payments`,
      return_url: `${base}/account?tab=payments`,
    })

    revalidatePath('/account')
    return { url: accountLink.url, error: null }
  } catch (error) {
    let message = error instanceof Error ? error.message : 'Unable to start Stripe onboarding.'
    const raw =
      error && typeof error === 'object' && 'raw' in error
        ? (error as { raw?: { message?: string } }).raw?.message
        : undefined
    if (raw && !message.includes(raw)) message = `${message} ${raw}`

    if (isStripeConnectPlatformBlockedMessage(message)) {
      return { url: null, error: CONNECT_BLOCKED_MESSAGE }
    }
    return { url: null, error: message }
  }
}
