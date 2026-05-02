import { redirect } from 'next/navigation'
import { isStripeHostConnectOffered } from '@/lib/env'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import AccountPageClient from './AccountPageClient'
import type { ProfileFields } from './actions'

export const metadata = { title: 'Account – CampervansRental' }

export default async function AccountPage() {
  const supabase = await createServerSupabaseClient()

  if (!supabase) {
    // Supabase not configured in this environment — show empty shell
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
