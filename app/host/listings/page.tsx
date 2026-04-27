import Image from 'next/image'
import Link from 'next/link'
import { CheckCircle2, Zap } from 'lucide-react'
import { createServerSupabaseClient } from '@/lib/supabase/server'

type ListingImage = { url: string; sort_order: number }

type HostListingRow = {
  id: string
  title: string
  slug: string
  status: string
  updated_at: string
  location_label: string | null
  price_per_night_cents: number | null
  delivery_offered: boolean | null
  vehicle_class: string | null
  listing_images: ListingImage[] | null
}

function coverUrl(images: ListingImage[] | null | undefined): string | null {
  if (!images?.length) return null
  return [...images].sort((a, b) => a.sort_order - b.sort_order)[0]?.url ?? null
}

function formatMoney(cents: number | null | undefined) {
  if (cents == null) return '—'
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(cents / 100)
}

export default async function HostListingsPage() {
  const supabase = await createServerSupabaseClient()
  if (!supabase) return null

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return null

  const { data: rawListings } = await supabase
    .from('listings')
    .select(
      `
      id,
      title,
      slug,
      status,
      updated_at,
      location_label,
      price_per_night_cents,
      delivery_offered,
      vehicle_class,
      listing_images ( url, sort_order )
    `
    )
    .eq('owner_id', user.id)
    .order('updated_at', { ascending: false })

  const listings = (rawListings ?? []) as unknown as HostListingRow[]

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-10 sm:py-14">
      <div className="rounded-2xl border border-neutral-200/90 bg-white shadow-sm overflow-hidden">
        <div className="flex flex-col gap-4 border-b border-neutral-200 px-6 py-6 sm:flex-row sm:items-center sm:justify-between">
          <h1 className="font-sans text-2xl font-bold tracking-tight text-neutral-900">My listings</h1>
          <Link
            href="/host/listings/new"
            className="inline-flex h-10 shrink-0 items-center justify-center rounded-full border border-neutral-900 px-5 text-sm font-semibold text-neutral-900 transition hover:bg-neutral-50"
          >
            Add an RV
          </Link>
        </div>

        <div className="px-6 py-8">
          {listings.length === 0 ? (
            <p className="text-center text-sm text-neutral-500">
              No listings yet. Add your first van to start hosting.
            </p>
          ) : (
            <ul className="space-y-6">
              {listings.map((row) => {
                const thumb = coverUrl(row.listing_images)
                const subtitle = [row.vehicle_class || 'Camper van', row.location_label || 'Location not set'].join(
                  ' • '
                )
                const published = row.status === 'published'
                const publicHref = `/listings/${row.slug}`

                return (
                  <li
                    key={row.id}
                    className="rounded-xl border border-neutral-200 bg-white p-4 shadow-sm sm:p-5"
                  >
                    <div className="flex flex-col gap-4 sm:flex-row sm:gap-5">
                      <div className="relative h-40 w-full shrink-0 overflow-hidden rounded-lg bg-neutral-100 sm:h-28 sm:w-40">
                        {thumb ? (
                          <Image src={thumb} alt="" fill className="object-cover" sizes="160px" />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center text-xs font-medium text-neutral-400">
                            No photo
                          </div>
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
                          <div className="min-w-0">
                            <h2 className="font-sans text-base font-bold leading-snug text-neutral-900 line-clamp-2">
                              {row.title}
                            </h2>
                            <p className="mt-1 text-sm text-neutral-500">{subtitle}</p>
                          </div>
                          <div className="flex shrink-0 items-center gap-2 sm:flex-col sm:items-end">
                            {published ? (
                              <Link
                                href={`/host/listings/${row.id}/edit`}
                                className="text-sm font-medium text-neutral-900 underline underline-offset-4"
                              >
                                View/Edit
                              </Link>
                            ) : (
                              <Link
                                href={`/host/listings/${row.id}/edit`}
                                className="text-sm font-medium text-neutral-900 underline underline-offset-4"
                              >
                                Edit
                              </Link>
                            )}
                          </div>
                        </div>

                        <div className="mt-4 grid grid-cols-2 gap-3 border-t border-neutral-200 pt-4 md:grid-cols-4">
                          <div className="border-neutral-200 md:border-r md:pr-4">
                            <p className="text-[0.65rem] font-medium uppercase tracking-wide text-neutral-400">
                              Listing status
                            </p>
                            <p className="mt-1.5 flex items-center gap-1.5 text-sm font-semibold text-neutral-900">
                              {published ? (
                                <>
                                  <span className="h-2 w-2 shrink-0 rounded-full bg-emerald-500" aria-hidden />
                                  Published
                                </>
                              ) : (
                                <>
                                  <span className="h-2 w-2 shrink-0 rounded-full bg-amber-400" aria-hidden />
                                  <span className="capitalize">{row.status}</span>
                                </>
                              )}
                            </p>
                          </div>
                          <div className="border-neutral-200 md:border-r md:px-4">
                            <p className="text-[0.65rem] font-medium uppercase tracking-wide text-neutral-400">
                              Delivery
                            </p>
                            <p className="mt-1.5 flex items-center gap-1.5 text-sm font-semibold text-neutral-900">
                              {row.delivery_offered ? (
                                <>
                                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-100">
                                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" aria-hidden />
                                  </span>
                                  On
                                </>
                              ) : (
                                <span className="text-neutral-400">Off</span>
                              )}
                            </p>
                          </div>
                          <div className="border-neutral-200 md:border-r md:px-4">
                            <p className="text-[0.65rem] font-medium uppercase tracking-wide text-neutral-400">
                              Nightly rate
                            </p>
                            <p className="mt-1.5 flex items-center gap-1.5 text-sm font-semibold text-neutral-900">
                              <Zap className="h-4 w-4 shrink-0 text-amber-500" aria-hidden />
                              {formatMoney(row.price_per_night_cents)}
                            </p>
                          </div>
                          <div className="md:pl-4">
                            <p className="text-[0.65rem] font-medium uppercase tracking-wide text-neutral-400">
                              Next available
                            </p>
                            <p className="mt-1.5 text-sm font-semibold text-neutral-700">
                              {published ? 'Open calendar' : '—'}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </li>
                )
              })}
            </ul>
          )}
        </div>
      </div>
    </div>
  )
}
