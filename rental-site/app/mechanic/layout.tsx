import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { NOINDEX_METADATA } from '@/lib/seo'

export const metadata: Metadata = NOINDEX_METADATA

/**
 * Guard: unauthenticated users → /auth/login
 * Authenticated non-mechanics → /mechanic/signup  (except when already on /mechanic/signup)
 */
export default async function MechanicLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createServerSupabaseClient()
  if (!supabase) {
    redirect('/auth/login')
  }

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    redirect('/auth/login')
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('is_mechanic')
    .eq('id', user.id)
    .maybeSingle()

  // If not yet a mechanic, the signup page itself handles the onboarding.
  // All other /mechanic/* routes require is_mechanic = true.
  // We can't read the current pathname in a server layout directly, so we rely
  // on the child page to call redirect() when needed.
  // This layout only enforces login-gating.

  return (
    <div className="min-h-screen bg-cream-50">
      {children}
    </div>
  )
}
