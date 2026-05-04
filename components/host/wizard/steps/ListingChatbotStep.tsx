'use client'

import { useState } from 'react'
import { Bot, FileText, Loader2, RefreshCw, Trash2, Upload, X } from 'lucide-react'
import type { ChatDocument } from '@/app/host/listings/chatbot-actions'

type Props = {
  listingId: string
  chatbotEnabled: boolean
  setChatbotEnabled: (v: boolean) => void
  chatbotNotes: string
  setChatbotNotes: (v: string) => void
  documents: ChatDocument[]
  setDocuments: (docs: ChatDocument[]) => void
  uploading: boolean
  onUploadDoc: (file: File) => void
  onDeleteDoc: (doc: ChatDocument) => void
}

type StatusBadgeProps = { status: ChatDocument['processing_status'] }

function StatusBadge({ status }: StatusBadgeProps) {
  const map: Record<ChatDocument['processing_status'], { label: string; cls: string }> = {
    pending:    { label: 'Pending',    cls: 'bg-amber-50  text-amber-700  border-amber-200' },
    processing: { label: 'Processing', cls: 'bg-blue-50   text-blue-700   border-blue-200' },
    ready:      { label: 'Ready',      cls: 'bg-forest-50 text-forest-700 border-forest-200' },
    failed:     { label: 'Failed',     cls: 'bg-red-50    text-red-700    border-red-200' },
  }
  const { label, cls } = map[status]
  return (
    <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${cls}`}>
      {status === 'processing' && <Loader2 className="mr-1 h-3 w-3 animate-spin" />}
      {label}
    </span>
  )
}

export default function ListingChatbotStep({
  listingId,
  chatbotEnabled,
  setChatbotEnabled,
  chatbotNotes,
  setChatbotNotes,
  documents,
  setDocuments,
  uploading,
  onUploadDoc,
  onDeleteDoc,
}: Props) {
  const [pollingId, setPollingId] = useState<string | null>(null)

  const pollStatus = async (docId: string) => {
    setPollingId(docId)
    let attempts = 0
    const interval = setInterval(async () => {
      attempts++
      try {
        const res = await fetch(`/api/host/chatbot/status?documentId=${docId}`)
        if (res.ok) {
          const json = await res.json()
          const status = json?.status as ChatDocument['processing_status'] | undefined
          if (status === 'ready' || status === 'failed' || status === undefined) {
            clearInterval(interval)
            setPollingId(null)
            if (status) {
              setDocuments(
                documents.map((d) =>
                  d.id === docId ? { ...d, processing_status: status } : d
                )
              )
            }
          }
        }
      } catch {
        // ignore network errors during poll
      }
      if (attempts >= 20) {
        clearInterval(interval)
        setPollingId(null)
      }
    }, 3000)
  }

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      {/* Header */}
      <div className="flex items-start gap-4 rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-neutral-900 text-white">
          <Bot className="h-6 w-6" />
        </div>
        <div className="flex-1 min-w-0">
          <h2 className="font-serif text-xl font-semibold text-charcoal leading-tight">
            Listing assistant chatbot
          </h2>
          <p className="mt-1 text-sm text-neutral-600 leading-relaxed">
            Give guests an AI assistant that knows your van. When enabled, an "Ask about this van"
            chat widget appears on your public listing. The bot automatically uses all your listing
            details; anything you add here makes it smarter.
          </p>
        </div>
      </div>

      {/* Enable / disable toggle */}
      <section className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h3 className="font-display text-xs font-bold uppercase tracking-[0.15em] text-neutral-500">
              Chatbot status
            </h3>
            <p className="mt-1 text-sm text-neutral-600">
              Toggle the assistant on or off for your public listing at any time.
            </p>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={chatbotEnabled}
            onClick={() => setChatbotEnabled(!chatbotEnabled)}
            className={[
              'relative inline-flex h-7 w-12 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-gold-500',
              chatbotEnabled ? 'bg-neutral-900' : 'bg-neutral-300',
            ].join(' ')}
          >
            <span
              className={[
                'pointer-events-none inline-block h-6 w-6 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out',
                chatbotEnabled ? 'translate-x-5' : 'translate-x-0',
              ].join(' ')}
            />
          </button>
        </div>
        {chatbotEnabled && (
          <p className="mt-3 text-xs text-forest-700 font-medium">
            ✓ Chatbot is live on your listing
          </p>
        )}
        {!chatbotEnabled && (
          <p className="mt-3 text-xs text-neutral-400">
            Chatbot is hidden from guests
          </p>
        )}
      </section>

      {/* Knowledge base: documents */}
      <section className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm">
        <h3 className="font-display text-xs font-bold uppercase tracking-[0.15em] text-neutral-500">
          Upload documents
        </h3>
        <p className="mt-2 text-sm text-neutral-600">
          Upload your vehicle manual, FAQ document, rental checklist, or any PDF / text file.
          The bot will learn from these when answering guest questions.
        </p>

        <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center">
          <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-neutral-900 bg-neutral-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-neutral-800 disabled:opacity-60">
            <Upload className="h-4 w-4" />
            {uploading ? 'Uploading…' : 'Choose file'}
            <input
              type="file"
              accept=".pdf,.txt,.md,application/pdf,text/plain,text/markdown"
              className="sr-only"
              disabled={uploading}
              onChange={(e) => {
                const f = e.target.files?.[0]
                if (f) onUploadDoc(f)
                e.target.value = ''
              }}
            />
          </label>
          <span className="text-xs text-neutral-400">PDF or plain text · max 10 MB</span>
        </div>

        {documents.length > 0 && (
          <ul className="mt-5 divide-y divide-neutral-100 rounded-xl border border-neutral-200">
            {documents.map((doc) => (
              <li key={doc.id} className="flex items-center gap-3 px-4 py-3">
                <FileText className="h-5 w-5 shrink-0 text-neutral-400" />
                <div className="flex-1 min-w-0">
                  <p className="truncate text-sm font-medium text-charcoal">
                    {doc.original_filename ?? 'Document'}
                  </p>
                  <div className="mt-0.5 flex items-center gap-2">
                    <StatusBadge status={doc.processing_status} />
                    {doc.processing_status === 'failed' && doc.error_message && (
                      <span className="text-xs text-red-600">{doc.error_message}</span>
                    )}
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  {doc.processing_status === 'pending' && (
                    <button
                      type="button"
                      title="Check status"
                      disabled={pollingId === doc.id}
                      onClick={() => pollStatus(doc.id)}
                      className="rounded-lg p-1.5 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-700 disabled:opacity-40"
                    >
                      <RefreshCw className={`h-4 w-4 ${pollingId === doc.id ? 'animate-spin' : ''}`} />
                    </button>
                  )}
                  <button
                    type="button"
                    title="Delete document"
                    onClick={() => onDeleteDoc(doc)}
                    className="rounded-lg p-1.5 text-neutral-400 hover:bg-red-50 hover:text-red-600"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Knowledge base: notes */}
      <section className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm">
        <h3 className="font-display text-xs font-bold uppercase tracking-[0.15em] text-neutral-500">
          Additional notes
        </h3>
        <p className="mt-2 text-sm text-neutral-600">
          Type anything extra the bot should know — quirks of the vehicle, common guest questions,
          directions, local tips, etc.
        </p>
        <textarea
          value={chatbotNotes}
          onChange={(e) => setChatbotNotes(e.target.value)}
          rows={10}
          placeholder="Example: The awning lever is on the passenger side near the slide. Press the button twice to extend…"
          className="mt-4 w-full resize-y rounded-xl border border-neutral-200 bg-neutral-50/50 px-4 py-3 text-sm text-neutral-900 placeholder:text-neutral-400 focus:border-gold-400 focus:outline-none focus:ring-1 focus:ring-gold-400/40"
        />
      </section>

      <p className="text-xs text-neutral-400 text-center">
        The assistant uses AI and may occasionally make mistakes. It is not a substitute for
        official policies, insurance terms, or legal advice.
      </p>
    </div>
  )
}
