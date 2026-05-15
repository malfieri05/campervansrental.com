import { redirect } from 'next/navigation'

// Per-vehicle health is now inline on the host dashboard at /host.
// We anchor to the vehicle for convenience.
export default async function VehicleHealthDetailPage({
  params,
}: {
  params: Promise<{ listingId: string }>
}) {
  const { listingId } = await params
  redirect(`/host#vehicle-${listingId}`)
}
