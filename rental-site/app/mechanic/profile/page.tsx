import { redirect } from 'next/navigation'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import MechanicProfileClient from './MechanicProfileClient'

export const metadata = { title: 'Edit Profile | Mechanic' }

export default async function MechanicProfilePage() {
  const supabase = await createServerSupabaseClient()
  if (!supabase) redirect('/auth/login')

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('is_mechanic')
    .eq('id', user.id)
    .maybeSingle()

  if (!profile?.is_mechanic) redirect('/mechanic/signup')

  const { data: mechProfile } = await supabase
    .from('mechanic_profiles')
    .select('*')
    .eq('id', user.id)
    .maybeSingle()

  return <MechanicProfileClient profile={mechProfile} />
}
