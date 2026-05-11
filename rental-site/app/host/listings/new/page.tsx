'use client'

import { useTransition } from 'react'
import { useRouter } from 'next/navigation'
import Button from '@/components/ui/Button'
import { createDraftListing } from '@/app/host/listings/actions'

export default function NewHostListingPage() {
  const router = useRouter()
  const [pending, startTransition] = useTransition()

  return (
    <div className="mx-auto max-w-lg px-4 py-12 sm:px-6 sm:py-16">
      <div className="rounded-2xl border border-neutral-200/90 bg-white p-6 shadow-sm sm:p-8">
        <h1 className="font-sans text-2xl font-bold tracking-tight text-neutral-900">Add a vehicle</h1>
        <p className="mt-3 text-sm leading-relaxed text-neutral-600">
          You will walk through vehicle details, photos, pricing, policies, and calendar — the same kinds
          of sections guests expect on major rental marketplaces. Save as a draft and publish when you are
          ready.
        </p>
        <Button
          variant="primary"
          size="lg"
          disabled={pending}
          className="mt-8 w-full !rounded-full"
          onClick={() =>
            startTransition(async () => {
              const r = await createDraftListing()
              if (r.id) {
                router.push(`/host/listings/${r.id}/edit`)
              }
            })
          }
        >
          {pending ? 'Starting…' : 'Start listing'}
        </Button>
      </div>
    </div>
  )
}
