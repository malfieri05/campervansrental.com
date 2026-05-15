'use server'

import { revalidatePath } from 'next/cache'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { geocodeAddress } from '@/lib/geocode'

export async function updateMechanicProfile(
  fd: FormData
): Promise<{ error: string | null }> {
  const supabase = await createServerSupabaseClient()
  if (!supabase) return { error: 'Supabase not configured' }

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthenticated' }

  const displayName = (fd.get('display_name') as string)?.trim()
  if (!displayName) return { error: 'Display name is required.' }

  const addressStreet = (fd.get('address_street') as string) || null
  const addressCity = (fd.get('address_city') as string)?.trim() || null
  const addressState = (fd.get('address_state') as string)?.trim() || null
  const addressZip = (fd.get('address_zip') as string) || null
  const serviceRadius = Number(fd.get('service_radius_miles') || 25)
  const specialties = fd.getAll('specialties[]') as string[]
  const bio = (fd.get('bio') as string) || null
  const certifications = (fd.get('certifications') as string) || null

  // Re-geocode if address changed.
  let geoFields: { lat?: number | null; lng?: number | null } = {}
  if (addressCity) {
    const point = await geocodeAddress({
      street: addressStreet,
      city: addressCity,
      state: addressState,
      zip: addressZip,
    })
    if (point) geoFields = { lat: point.lat, lng: point.lng }
  }

  const { error } = await supabase
    .from('mechanic_profiles')
    .update({
      display_name: displayName,
      business_name: (fd.get('business_name') as string) || null,
      phone: (fd.get('phone') as string) || null,
      bio,
      certifications,
      service_radius_miles: serviceRadius,
      address_street: addressStreet,
      address_city: addressCity,
      address_state: addressState,
      address_zip: addressZip,
      specialties,
      ...geoFields,
    })
    .eq('id', user.id)

  if (error) return { error: error.message }

  revalidatePath('/mechanic/profile')
  revalidatePath('/mechanic/dashboard')

  return { error: null }
}
