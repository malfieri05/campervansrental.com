import { redirect } from 'next/navigation'
import HostListingWizard from '@/components/host/HostListingWizard'
import { getHostListingForEdit } from '@/app/host/listings/actions'

export default async function EditHostListingPage({
  params,
}: {
  params: { listingId: string }
}) {
  const { row, error } = await getHostListingForEdit(params.listingId)
  if (error || !row) {
    redirect('/host/listings')
  }
  return <HostListingWizard listingId={params.listingId} initial={row} />
}
