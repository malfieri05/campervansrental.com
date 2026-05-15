'use server'

import { createServerSupabaseClient } from '@/lib/supabase/server'
import { geocodeAddress } from '@/lib/geocode'

export async function becomeMechanic(
  fd: FormData
): Promise<{ error: string | null }> {
  const supabase = await createServerSupabaseClient()
  if (!supabase) return { error: 'Supabase not configured' }

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthenticated' }

  const displayName = (fd.get('display_name') as string)?.trim()
  if (!displayName) return { error: 'Display name is required.' }

  const addressCity = (fd.get('address_city') as string)?.trim()
  const addressState = (fd.get('address_state') as string)?.trim()
  if (!addressCity || !addressState) return { error: 'City and state are required.' }

  const addressStreet = (fd.get('address_street') as string) || null
  const addressZip = (fd.get('address_zip') as string) || null
  const businessName = (fd.get('business_name') as string) || null
  const phone = (fd.get('phone') as string) || null
  const bio = (fd.get('bio') as string) || null
  const serviceRadius = Number(fd.get('service_radius_miles') || 25)
  const specialties = fd.getAll('specialties[]') as string[]

  // Geocode the mechanic's service location.
  const point = await geocodeAddress({
    street: addressStreet,
    city: addressCity,
    state: addressState,
    zip: addressZip,
  })

  // Mark profile as mechanic.
  const { error: profileError } = await supabase
    .from('profiles')
    .update({ is_mechanic: true })
    .eq('id', user.id)

  if (profileError) return { error: profileError.message }

  // Upsert mechanic profile.
  const { error: mechError } = await supabase
    .from('mechanic_profiles')
    .upsert({
      id: user.id,
      display_name: displayName,
      business_name: businessName,
      phone,
      email: user.email ?? null,
      bio,
      service_radius_miles: serviceRadius,
      address_street: addressStreet,
      address_city: addressCity,
      address_state: addressState,
      address_zip: addressZip,
      lat: point?.lat ?? null,
      lng: point?.lng ?? null,
      specialties,
      is_active: true,
    })

  if (mechError) return { error: mechError.message }

  return { error: null }
}
