import dynamic from 'next/dynamic'
import { redirect } from 'next/navigation'
import { getHostListingForEdit } from '@/app/host/listings/actions'

// Defer the wizard (39 kB per build report) + its 13 step files + @dnd-kit.
const HostListingWizard = dynamic(
  () => import('@/components/host/HostListingWizard'),
  {
    ssr: false,
    loading: () => (
      <div className="min-h-screen bg-cream-100 flex items-center justify-center animate-pulse">
        <div className="h-8 w-40 rounded-xl bg-cream-300/60" />
      </div>
    ),
  }
)

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
