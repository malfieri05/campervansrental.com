'use client'

import { useRef, useState, useEffect } from 'react'
import { Bot, Send, Loader2, ChevronDown, ChevronUp } from 'lucide-react'

type Message = {
  role: 'user' | 'assistant'
  content: string
}

const WELCOME_MESSAGE =
  "Hi! I'm the assistant for this listing. Ask me anything about the van, pricing, pickup process, or what to expect on your trip."

interface Props {
  slug: string
}

export default function ListingInlineChat({ slug }: Props) {
  const [open, setOpen] = useState(true)
  const [messages, setMessages] = useState<Message[]>([
    { role: 'assistant', content: WELCOME_MESSAGE },
  ])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const messagesScrollRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  // Keep newest messages visible inside the chat panel only — never scrollIntoView
  // (that would scroll the whole listing page to the chat).
  useEffect(() => {
    const el = messagesScrollRef.current
    if (!el) return
    el.scrollTop = el.scrollHeight
  }, [messages, loading])

  const submit = async () => {
    const text = input.trim()
    if (!text || loading) return

    const userMsg: Message = { role: 'user', content: text }
    const nextMessages = [...messages, userMsg]
    setMessages(nextMessages)
    setInput('')
    setLoading(true)
    setError(null)

    try {
      const res = await fetch(`/api/listings/${slug}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: nextMessages }),
      })

      if (!res.ok) {
        const json = await res.json().catch(() => null)
        throw new Error(json?.error ?? `Error ${res.status}`)
      }

      if (!res.body) throw new Error('No response body')

      // Read streaming plain-text response (toTextStreamResponse)
      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let assistantText = ''

      setMessages((prev) => [...prev, { role: 'assistant', content: '' }])

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        const chunk = decoder.decode(value, { stream: true })
        assistantText += chunk
        setMessages((prev) => {
          const updated = [...prev]
          updated[updated.length - 1] = { role: 'assistant', content: assistantText }
          return updated
        })
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong. Try again.')
      setMessages((prev) => prev.filter((m) => !(m.role === 'assistant' && m.content === '')))
    } finally {
      setLoading(false)
    }
  }

  const onKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      submit()
    }
  }

  return (
    <div className="rounded-2xl border border-neutral-200 bg-white shadow-sm overflow-hidden">
      {/* Header / toggle */}
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center gap-3 px-5 py-4 text-left hover:bg-neutral-50 transition"
      >
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-neutral-900 text-white">
          <Bot className="h-5 w-5" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-serif text-base font-semibold text-charcoal">Ask about this van</p>
          <p className="text-sm text-neutral-500">Get instant answers from the listing assistant</p>
        </div>
        {open ? (
          <ChevronUp className="h-5 w-5 shrink-0 text-neutral-400" />
        ) : (
          <ChevronDown className="h-5 w-5 shrink-0 text-neutral-400" />
        )}
      </button>

      {open && (
        <div className="border-t border-neutral-100">
          {/* Messages */}
          <div ref={messagesScrollRef} className="max-h-80 overflow-y-auto px-5 py-4 space-y-3">
            {messages.map((msg, i) => (
              <div
                key={i}
                className={[
                  'flex',
                  msg.role === 'user' ? 'justify-end' : 'justify-start',
                ].join(' ')}
              >
                <div
                  className={[
                    'max-w-[85%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed whitespace-pre-wrap',
                    msg.role === 'user'
                      ? 'bg-neutral-900 text-white rounded-br-sm'
                      : 'bg-neutral-100 text-charcoal rounded-bl-sm',
                  ].join(' ')}
                >
                  {msg.content || (loading && i === messages.length - 1 ? (
                    <span className="flex items-center gap-1 text-neutral-400">
                      <span className="h-1.5 w-1.5 rounded-full bg-neutral-400 animate-bounce [animation-delay:0ms]" />
                      <span className="h-1.5 w-1.5 rounded-full bg-neutral-400 animate-bounce [animation-delay:150ms]" />
                      <span className="h-1.5 w-1.5 rounded-full bg-neutral-400 animate-bounce [animation-delay:300ms]" />
                    </span>
                  ) : '')}
                </div>
              </div>
            ))}
            {error && (
              <p className="text-xs text-red-600 text-center">{error}</p>
            )}
          </div>

          {/* Input */}
          <div className="border-t border-neutral-100 px-4 py-3 flex items-end gap-2">
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={onKeyDown}
              rows={1}
              placeholder="Ask a question…"
              className="flex-1 resize-none rounded-xl border border-neutral-200 bg-neutral-50 px-3.5 py-2.5 text-sm text-charcoal placeholder:text-neutral-400 focus:border-gold-400 focus:outline-none focus:ring-1 focus:ring-gold-400/40"
              style={{ maxHeight: '6rem', overflowY: 'auto' }}
            />
            <button
              type="button"
              disabled={!input.trim() || loading}
              onClick={submit}
              className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-neutral-900 text-white transition hover:bg-neutral-700 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </button>
          </div>
          <p className="px-5 pb-3 text-[10px] text-neutral-400 leading-tight">
            AI responses may be imperfect.
          </p>
        </div>
      )}
    </div>
  )
}
