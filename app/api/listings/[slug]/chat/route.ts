/**
 * POST /api/listings/[slug]/chat
 *
 * Public chatbot endpoint for a specific listing. Guests send messages and get
 * streaming AI replies grounded in the listing's data and host-uploaded KB.
 *
 * Rate limit: 30 messages per IP per 10 minutes (in-memory, single-instance).
 * Body: { messages: { role: 'user' | 'assistant'; content: string }[] }
 */

import { NextRequest } from 'next/server'
import { streamText } from 'ai'
import { openai } from '@ai-sdk/openai'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { buildListingContextText, embedText, searchListingChunks } from '@/lib/chatbot'

// ─── Simple in-process rate limiter ──────────────────────────────────────────

type Window = { count: number; resetAt: number }
const rateLimitMap = new Map<string, Window>()
const WINDOW_MS = 10 * 60 * 1000 // 10 minutes
const MAX_REQUESTS = 30

function isRateLimited(key: string): boolean {
  const now = Date.now()
  let win = rateLimitMap.get(key)
  if (!win || now > win.resetAt) {
    win = { count: 0, resetAt: now + WINDOW_MS }
    rateLimitMap.set(key, win)
  }
  win.count += 1
  // Prune map periodically to avoid unbounded growth
  if (rateLimitMap.size > 5000) {
    Array.from(rateLimitMap.entries()).forEach(([k, v]) => {
      if (now > v.resetAt) rateLimitMap.delete(k)
    })
  }
  return win.count > MAX_REQUESTS
}

// ─── Handler ──────────────────────────────────────────────────────────────────

export async function POST(
  req: NextRequest,
  { params }: { params: { slug: string } }
) {
  // Rate limit by IP (or x-forwarded-for from Vercel edge)
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'anon'
  if (isRateLimited(`${ip}:${params.slug}`)) {
    return new Response(JSON.stringify({ error: 'Too many requests. Please wait and try again.' }), {
      status: 429,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  if (!process.env.OPENAI_API_KEY) {
    return new Response(JSON.stringify({ error: 'AI not configured' }), {
      status: 503,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  // Parse body
  const body = await req.json().catch(() => null)
  const messages = body?.messages
  if (!Array.isArray(messages) || messages.length === 0) {
    return new Response(JSON.stringify({ error: 'Invalid request' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  const latestUserMessage = [...messages].reverse().find((m) => m.role === 'user')?.content ?? ''

  // Validate listing (must be published + chatbot enabled)
  const svc = createServiceRoleClient()
  if (!svc) {
    return new Response(JSON.stringify({ error: 'Service unavailable' }), {
      status: 503,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  const { data: listing } = await svc
    .from('listings')
    .select('*')
    .eq('slug', params.slug)
    .eq('status', 'published')
    .eq('listing_chatbot_enabled', true)
    .maybeSingle()

  if (!listing) {
    return new Response(JSON.stringify({ error: 'Chatbot not available for this listing' }), {
      status: 404,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  // Also fetch FAQs from listing_faqs column (already in listing row as jsonb)
  const contextText = buildListingContextText(listing as Record<string, unknown>)

  // Retrieve relevant KB chunks via vector similarity (best-effort)
  let extraChunks: string[] = []
  try {
    const queryEmbedding = await embedText(latestUserMessage)
    extraChunks = await searchListingChunks(String(listing.id), queryEmbedding, 5)
  } catch {
    // If embedding fails, proceed without KB context
  }

  const systemPrompt = [
    `You are a helpful assistant for a specific campervan listing on a rental platform.`,
    `Your job is to answer questions from potential renters and current renters about this vehicle.`,
    `Be friendly, accurate, and concise. Only discuss topics relevant to this listing, the booking process, or van operation questions.`,
    `If you don't know the answer, say so clearly and suggest the guest contact the host directly.`,
    `Never make up information about prices, availability, or policies not mentioned below.`,
    `Do not provide legal, medical, or insurance advice.`,
    ``,
    `=== LISTING INFORMATION ===`,
    contextText,
    extraChunks.length > 0
      ? `\n=== ADDITIONAL HOST KNOWLEDGE BASE ===\n${extraChunks.join('\n\n')}`
      : '',
  ]
    .filter(Boolean)
    .join('\n')

  // Stream response
  const result = streamText({
    model: openai('gpt-4o-mini'),
    system: systemPrompt,
    messages: messages
      .slice(-12) // keep last 12 messages to stay within token budget
      .map((m: { role: string; content: string }) => ({
        role: m.role as 'user' | 'assistant',
        content: m.content,
      })),
    maxOutputTokens: 512,
    temperature: 0.4,
  })

  return result.toTextStreamResponse()
}
