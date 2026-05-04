'use client'

import { FileText, Upload, X } from 'lucide-react'

type Props = {
  rulesText: string
  setRulesText: (v: string) => void
  docUrl: string
  setDocUrl: (v: string) => void
  uploading: boolean
  onUploadDoc: (file: File) => void
}

export default function PickupDropoffRulesStep({
  rulesText,
  setRulesText,
  docUrl,
  setDocUrl,
  uploading,
  onUploadDoc,
}: Props) {
  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <p className="text-sm text-neutral-600">
        This section is optional. When you add rules or a document, renters will see them near the bottom of your public listing.
      </p>

      {/* Upload premade document */}
      <section className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm">
        <h3 className="font-display text-xs font-bold uppercase tracking-[0.15em] text-neutral-500">
          Upload a document
        </h3>
        <p className="mt-2 text-sm text-neutral-600">
          PDF or image (e.g. your existing pickup & drop-off checklist). Max recommended size 10&nbsp;MB.
        </p>

        <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center">
          <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-neutral-900 bg-neutral-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-neutral-800">
            <Upload className="h-4 w-4" />
            {uploading ? 'Uploading…' : 'Choose file'}
            <input
              type="file"
              accept=".pdf,application/pdf,image/jpeg,image/png,image/webp"
              className="sr-only"
              disabled={uploading}
              onChange={(e) => {
                const f = e.target.files?.[0]
                if (f) onUploadDoc(f)
                e.target.value = ''
              }}
            />
          </label>
          {docUrl ? (
            <div className="flex flex-wrap items-center gap-2 text-sm">
              <a
                href={docUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 font-medium text-gold-700 underline underline-offset-2 hover:text-gold-600"
              >
                <FileText className="h-4 w-4 shrink-0" />
                View uploaded file
              </a>
              <button
                type="button"
                onClick={() => setDocUrl('')}
                className="inline-flex items-center gap-1 rounded-lg border border-neutral-200 px-2 py-1 text-xs font-medium text-neutral-600 hover:bg-neutral-50"
              >
                <X className="h-3.5 w-3.5" />
                Remove
              </button>
            </div>
          ) : (
            <span className="text-sm text-neutral-400">No file uploaded</span>
          )}
        </div>
      </section>

      {/* Type manually */}
      <section className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm">
        <h3 className="font-display text-xs font-bold uppercase tracking-[0.15em] text-neutral-500">
          Or type your rules
        </h3>
        <p className="mt-2 text-sm text-neutral-600">
          Parking, meeting location, keys, fuel, holding tanks, late returns — whatever guests should know.
        </p>
        <textarea
          value={rulesText}
          onChange={(e) => setRulesText(e.target.value)}
          rows={12}
          placeholder="Example: Meet at the east lot at 11am. Full tank return preferred…"
          className="mt-4 w-full resize-y rounded-xl border border-neutral-200 bg-neutral-50/50 px-4 py-3 text-sm text-neutral-900 placeholder:text-neutral-400 focus:border-gold-400 focus:outline-none focus:ring-1 focus:ring-gold-400/40"
        />
      </section>
    </div>
  )
}
