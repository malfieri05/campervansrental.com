import { redirect } from 'next/navigation'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { isSupabaseConfigured } from '@/lib/env'
import HostBookingAcceptedToast from '@/components/host/bookings/HostBookingAcceptedToast'

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
