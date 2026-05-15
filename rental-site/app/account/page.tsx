import { Suspense } from 'react'
import { redirect } from 'next/navigation'
import { isStripeHostConnectOffered } from '@/lib/env'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import AccountPageClient from './AccountPageClient'
import type { ProfileFields } from './actions'

export const metadata = { title: 'Account – CampervansRental' }

function AccountFallback() {
  return (
    <div className="min-h-screen bg-cream-100 px-4 py-16 sm:py-24">
      <div className="max-w-2xl mx-auto space-y-6 animate-pulse">
        <div className="h-8 w-48 rounded-lg bg-cream-300/60" />
        <div className="rounded-2xl border border-cream-300/50 bg-white p-6 space-y-4">
          <div className="h-5 w-32 rounded bg-cream-300/60" />
          <div className="grid grid-cols-2 gap-4">
            <div className="h-10 rounded-lg bg-cream-200/70" />
            <div className="h-10 rounded-lg bg-cream-200/70" />
            <div className="h-10 rounded-lg bg-cream-200/70" />
            <div className="h-10 rounded-lg bg-cream-200/70" />
          </div>
        </div>
        <div className="rounded-2xl border border-cream-300/50 bg-white p-6 space-y-4">
          <div className="h-5 w-40 rounded bg-cream-300/60" />
          <div className="h-24 rounded-lg bg-cream-200/70" />
        </div>
      </div>
    </div>
  )
}

/**
 * Inner async component — Supabase auth + profile fetch happen here so the
 * Suspense boundary above can stream a skeleton while the DB call is in flight.
 */
async function AccountData() {
  const supabase = await createServerSupabaseClient()

  if (!supabase) {
    return (
      <AccountPageClient
        initialProfile={null}
        userId=""
        supabaseUrl=""
        isHost={false}
        stripeCustomerId={null}
        stripeConnectAccountId={null}
        stripeHostConnectOffered={isStripeHostConnectOffered()}
      />
    )
  }

  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect(`/auth/login?next=${encodeURIComponent('/account')}`)
  }

  const { data } = await supabase
    .from('profiles')
    .select('first_name, last_name, phone, about_me, address_street, address_city, address_state, address_zip, address_country, avatar_url, display_name, is_host, stripe_customer_id, stripe_connect_account_id')
    .eq('id', user.id)
    .single()

  return (
    <AccountPageClient
      initialProfile={(data as ProfileFields) ?? null}
      userId={user.id}
      supabaseUrl={process.env.NEXT_PUBLIC_SUPABASE_URL ?? ''}
      isHost={Boolean(data?.is_host)}
      stripeCustomerId={data?.stripe_customer_id ?? null}
      stripeConnectAccountId={data?.stripe_connect_account_id ?? null}
      stripeHostConnectOffered={isStripeHostConnectOffered()}
    />
  )
}

export default function AccountPage() {
  return (
    <Suspense fallback={<AccountFallback />}>
      <AccountData />
    </Suspense>
  )
}
