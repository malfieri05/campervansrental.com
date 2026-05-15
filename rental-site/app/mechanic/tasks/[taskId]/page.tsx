'use client'

import { useState, useTransition, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Send, DollarSign, Calendar, Clock } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

type PublicTask = {
  id: string
  kind: string
  title: string
  description: string | null
  priority: string
  due_at_date: string | null
  due_at_miles: number | null
  address_city: string | null
  address_state: string | null
  vehicle_year: number | null
  vehicle_make: string | null
  vehicle_model: string | null
  created_at: string
}

type Message = {
  id: string
  body: string
  sender_role: 'host' | 'mechanic'
  created_at: string
}

export default function TaskDetailPage() {
  const { taskId } = useParams<{ taskId: string }>()
  const router = useRouter()
  const [task, setTask] = useState<PublicTask | null>(null)
  const [existingQuote, setExistingQuote] = useState<{ id: string; status: string; amount_cents: number } | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [loading, setLoading] = useState(true)
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [messageDraft, setMessageDraft] = useState('')

  const supabase = createClient()

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/auth/login'); return }

      const [taskRes, quoteRes, msgRes] = await Promise.all([
        supabase.from('published_open_tasks').select('*').eq('id', taskId).maybeSingle(),
        supabase.from('mechanic_quotes').select('id, status, amount_cents').eq('task_id', taskId).eq('mechanic_id', user.id).maybeSingle(),
        supabase.from('mechanic_task_messages').select('*').eq('task_id', taskId).order('created_at'),
      ])
      setTask(taskRes.data as PublicTask | null)
      setExistingQuote(quoteRes.data ?? null)
      setMessages((msgRes.data ?? []) as Message[])
      setLoading(false)
    }
    void load()
  }, [taskId])

  async function submitQuote(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    const fd = new FormData(e.currentTarget)
    const amountDollars = Number(fd.get('amount_dollars'))
    const durationHours = fd.get('duration_hours') ? Number(fd.get('duration_hours')) : null
    const earliestDate = (fd.get('earliest_date') as string) || null
    const notes = (fd.get('notes') as string) || null

    startTransition(async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { setError('Not logged in'); return }

      const { data: profile } = await supabase
        .from('mechanic_profiles')
        .select('id')
        .eq('id', user.id)
        .maybeSingle()

      if (!profile) { setError('You must be a registered mechanic to submit quotes.'); return }

      const { data: listing } = await supabase
        .from('published_open_tasks')
        .select('listing_id')
        .eq('id', taskId)
        .maybeSingle()

      if (!listing) { setError('Task not found.'); return }

      const { data: listingOwner } = await supabase
        .from('listings')
        .select('owner_id')
        .eq('id', listing.listing_id)
        .maybeSingle()

      const { error: insertError } = await supabase.from('mechanic_quotes').insert({
        task_id: taskId,
        mechanic_id: user.id,
        listing_id: listing.listing_id,
        host_id: listingOwner?.owner_id ?? null,
        amount_cents: Math.round(amountDollars * 100),
        estimated_duration_hours: durationHours,
        earliest_available_date: earliestDate,
        notes,
        status: 'pending',
      })

      if (insertError) {
        setError(insertError.message)
        return
      }

      const { data: newQuote } = await supabase
        .from('mechanic_quotes')
        .select('id, status, amount_cents')
        .eq('task_id', taskId)
        .eq('mechanic_id', user.id)
        .maybeSingle()

      setExistingQuote(newQuote ?? null)
      ;(e.target as HTMLFormElement).reset()
    })
  }

  async function sendMessage(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!messageDraft.trim()) return
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data } = await supabase.from('mechanic_task_messages').insert({
      task_id: taskId,
      quote_id: existingQuote?.id ?? null,
      sender_id: user.id,
      sender_role: 'mechanic',
      body: messageDraft.trim(),
    }).select('*').single()

    if (data) {
      setMessages((prev) => [...prev, data as Message])
      setMessageDraft('')
    }
  }

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-14 animate-pulse space-y-4">
        <div className="h-6 w-32 rounded-lg bg-neutral-100" />
        <div className="h-8 w-64 rounded-xl bg-neutral-100" />
        <div className="h-32 rounded-2xl bg-neutral-100" />
      </div>
    )
  }

  if (!task) {
    return (
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-14 text-center">
        <p className="text-neutral-500">Task not found or no longer available.</p>
        <Link href="/mechanic/tasks" className="mt-4 inline-block text-sm font-semibold text-neutral-900 underline">
          Back to tasks
        </Link>
      </div>
    )
  }

  const vehicleLabel = [task.vehicle_year, task.vehicle_make, task.vehicle_model].filter(Boolean).join(' ')

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-10 sm:py-14">
      <Link href="/mechanic/tasks" className="inline-flex items-center gap-1.5 text-sm text-neutral-500 hover:text-neutral-700 transition mb-6">
        <ArrowLeft className="h-4 w-4" />
        Back to tasks
      </Link>

      <div className="rounded-2xl border border-neutral-200 bg-white p-6 mb-6">
        <span className="inline-block rounded-full bg-neutral-100 px-2.5 py-0.5 text-xs font-semibold text-neutral-700 capitalize mb-3">
          {task.kind.replace('_', ' ')}
        </span>
        <h1 className="font-sans text-2xl font-bold text-neutral-900">{task.title}</h1>
        {vehicleLabel && <p className="mt-1 text-sm text-neutral-500">{vehicleLabel}</p>}
        {task.description && <p className="mt-4 text-sm text-neutral-700 leading-relaxed">{task.description}</p>}
        <div className="mt-4 flex flex-wrap gap-4 text-xs text-neutral-500">
          {task.address_city && <span className="flex items-center gap-1">{task.address_city}, {task.address_state}</span>}
          {task.due_at_date && <span className="flex items-center gap-1"><Calendar className="h-3 w-3" />Due {new Date(task.due_at_date).toLocaleDateString()}</span>}
          {task.due_at_miles && <span>{task.due_at_miles.toLocaleString()} mi</span>}
        </div>
      </div>

      {/* Quote form or status */}
      {existingQuote ? (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5 mb-6">
          <p className="font-semibold text-emerald-800">
            Quote submitted — ${(existingQuote.amount_cents / 100).toFixed(0)}
          </p>
          <p className="text-sm text-emerald-700 mt-0.5 capitalize">Status: {existingQuote.status}</p>
        </div>
      ) : (
        <div className="rounded-2xl border border-neutral-200 bg-white p-6 mb-6">
          <h2 className="font-sans text-base font-bold text-neutral-900 mb-4">Submit Your Quote</h2>
          <form onSubmit={submitQuote} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <label className="flex flex-col gap-1 text-sm">
                <span className="font-medium text-neutral-700">Your price (USD) *</span>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-2.5 h-4 w-4 text-neutral-400" />
                  <input
                    name="amount_dollars"
                    type="number"
                    min={1}
                    step="0.01"
                    required
                    className="w-full rounded-lg border border-neutral-300 pl-8 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-neutral-400"
                  />
                </div>
              </label>
              <label className="flex flex-col gap-1 text-sm">
                <span className="font-medium text-neutral-700">Est. duration (hours)</span>
                <div className="relative">
                  <Clock className="absolute left-3 top-2.5 h-4 w-4 text-neutral-400" />
                  <input
                    name="duration_hours"
                    type="number"
                    min={0.5}
                    step={0.5}
                    className="w-full rounded-lg border border-neutral-300 pl-8 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-neutral-400"
                  />
                </div>
              </label>
            </div>
            <label className="flex flex-col gap-1 text-sm">
              <span className="font-medium text-neutral-700">Earliest available date</span>
              <input name="earliest_date" type="date" className="rounded-lg border border-neutral-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-neutral-400" />
            </label>
            <label className="flex flex-col gap-1 text-sm">
              <span className="font-medium text-neutral-700">Notes (optional)</span>
              <textarea name="notes" rows={3} placeholder="Describe your approach, experience with this type of work, etc." className="rounded-lg border border-neutral-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-neutral-400 resize-none" />
            </label>
            {error && <p className="text-sm text-red-600">{error}</p>}
            <button
              type="submit"
              disabled={isPending}
              className="w-full rounded-full bg-neutral-900 py-2.5 text-sm font-semibold text-white disabled:opacity-60 hover:bg-neutral-800 transition"
            >
              {isPending ? 'Submitting…' : 'Submit Quote'}
            </button>
          </form>
        </div>
      )}

      {/* Message thread */}
      {existingQuote && (
        <div className="rounded-2xl border border-neutral-200 bg-white p-6">
          <h2 className="font-sans text-base font-bold text-neutral-900 mb-4">Messages</h2>
          {messages.length === 0 ? (
            <p className="text-sm text-neutral-400">No messages yet. Start the conversation.</p>
          ) : (
            <div className="space-y-3 mb-4">
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex ${msg.sender_role === 'mechanic' ? 'justify-end' : 'justify-start'}`}
                >
                  <div className={`max-w-xs rounded-2xl px-4 py-2.5 text-sm ${
                    msg.sender_role === 'mechanic'
                      ? 'bg-neutral-900 text-white'
                      : 'bg-neutral-100 text-neutral-800'
                  }`}>
                    {msg.body}
                  </div>
                </div>
              ))}
            </div>
          )}
          <form onSubmit={sendMessage} className="flex gap-2">
            <input
              value={messageDraft}
              onChange={(e) => setMessageDraft(e.target.value)}
              placeholder="Type a message…"
              className="flex-1 rounded-full border border-neutral-300 px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-neutral-400"
            />
            <button type="submit" className="flex h-9 w-9 items-center justify-center rounded-full bg-neutral-900 text-white hover:bg-neutral-800 transition">
              <Send className="h-4 w-4" />
            </button>
          </form>
        </div>
      )}
    </div>
  )
}
