import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { isSupabaseConfigured } from '@/lib/env'
import HostBookingAcceptedToast from '@/components/host/bookings/HostBookingAcceptedToast'
import { NOINDEX_METADATA } from '@/lib/seo'

export const metadata: Metadata = NOINDEX_METADATA

export default async function HostLayout({ children }: { children: React.ReactNode }) {
  if (!isSupabaseConfigured()) {
    redirect('/')
  }
  const supabase = await createServerSupabaseClient()
  if (!supabase) {
    redirect('/')
  }
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    redirect('/auth/login?next=/host')
  }
  return (
    <div className="min-h-screen bg-neutral-100">
      <HostBookingAcceptedToast />
      {children}
    </div>
  )
}
