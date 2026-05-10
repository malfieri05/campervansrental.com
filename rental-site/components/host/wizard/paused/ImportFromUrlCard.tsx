'use client'

import { useState, useTransition } from 'react'
import { Link2, Loader2, CheckCircle2, AlertCircle, ChevronDown, ChevronUp } from 'lucide-react'
import { importListingFromExternalUrl } from '@/app/host/listings/paused/import-actions'
import type { ListingImportResult } from '@/lib/paused/listing-import/types'
import type { ImageRow } from '@/components/host/wizard/steps/PhotosStep'
import type { ListingDraftInput } from '@/app/host/listings/actions'

interface Props {
  listingId: string
  onImported: (result: {
    patch: Partial<ListingDraftInput>
    newImages: ImageRow[]
    appliedFields: string[]
    warnings: string[]
  }) => void
}

export default function ImportFromUrlCard({ listingId, onImported }: Props) {
  const [url, setUrl] = useState('')
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle')
  const [result, setResult] = useState<ListingImportResult | null>(null)
  const [expanded, setExpanded] = useState(false)
  const [pending, startTransition] = useTransition()

  const handleImport = () => {
    if (!url.trim()) return
    setStatus('idle')
    setResult(null)
    startTransition(async () => {
      const r = await importListingFromExternalUrl(listingId, url.trim())
      setResult(r)
      if (r.ok) {
        setStatus('success')
        setUrl('')
        onImported({
          patch: r.listingPatch,
          newImages: r.newImages,
          appliedFields: r.appliedFields,
          warnings: r.warnings,
        })
      } else {
        setStatus('error')
      }
    })
  }

  return (
    <div className="mb-6 rounded-xl border border-amber-200 bg-amber-50/60 px-4 py-4 sm:px-5">
      {/* Header */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2.5">
          <Link2 className="h-4 w-4 shrink-0 text-amber-600" />
          <p className="text-sm font-semibold text-amber-900">Import from another platform</p>
        </div>
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="rounded p-1 text-amber-600 transition hover:bg-amber-100"
          aria-label={expanded ? 'Collapse import panel' : 'Expand import panel'}
        >
          {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </button>
      </div>

      {!expanded && (
        <p className="mt-1 text-xs text-amber-700">
          Have a listing on Outdoorsy or RVezy? Paste the URL to pre-fill your details.
        </p>
      )}

      {expanded && (
        <>
          <p className="mt-2 text-xs text-amber-700 leading-relaxed">
            Paste your Outdoorsy or RVezy listing URL below. We&apos;ll pull in as many details as
            possible — vehicle specs, description, photos, and amenities — and fill only the fields
            you haven&apos;t already entered. VIN, plate, and compliance docs are never imported.
            Review everything before publishing.
          </p>

          <div className="mt-3 flex gap-2">
            <input
              type="url"
              value={url}
              onChange={(e) => { setUrl(e.target.value); setStatus('idle') }}
              onKeyDown={(e) => e.key === 'Enter' && handleImport()}
              placeholder="https://www.outdoorsy.com/rv-rental/..."
              disabled={pending}
              className="min-w-0 flex-1 rounded-lg border border-amber-300 bg-white px-3 py-2 text-sm text-neutral-900 placeholder:text-neutral-400 focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-300/50 disabled:opacity-60"
            />
            <button
              type="button"
              onClick={handleImport}
              disabled={pending || !url.trim()}
              className="flex h-9 shrink-0 items-center gap-1.5 rounded-lg bg-amber-500 px-4 text-sm font-semibold text-white transition hover:bg-amber-600 disabled:opacity-50"
            >
              {pending ? (
                <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Importing…</>
              ) : (
                'Import'
              )}
            </button>
          </div>

          {/* Result feedback */}
          {status === 'success' && result && (
            <div className="mt-3 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2.5">
              <div className="flex items-start gap-2">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-emerald-800">
                    Imported {result.appliedFields.filter((f) => !f.startsWith('images')).length} field
                    {result.appliedFields.filter((f) => !f.startsWith('images')).length !== 1 ? 's' : ''}
                    {result.newImages.length > 0 ? ` and ${result.newImages.length} photo${result.newImages.length !== 1 ? 's' : ''}` : ''}
                  </p>
                  {result.skippedFields.length > 0 && (
                    <p className="mt-0.5 text-xs text-emerald-700">
                      {result.skippedFields.length} field{result.skippedFields.length !== 1 ? 's' : ''} already had data and were left unchanged.
                    </p>
                  )}
                  {result.warnings.map((w, i) => (
                    <p key={i} className="mt-0.5 text-xs text-amber-700">{w}</p>
                  ))}
                </div>
              </div>
            </div>
          )}

          {status === 'error' && result && (
            <div className="mt-3 flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2.5">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-500" />
              <p className="text-sm text-red-700">{result.error}</p>
            </div>
          )}
        </>
      )}
    </div>
  )
}
