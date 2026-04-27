import { Plus, Trash2 } from 'lucide-react'
import type { FAQ } from '@/app/host/listings/actions'
import HostEditorShell from '../HostEditorShell'
import HostTipCard from '../HostTipCard'
import { TIP_IMAGES } from '../tipImages'
import { Card, SectionDivider, labelCls, inputCls } from '../formPrimitives'

interface DetailsStepProps {
  title: string; setTitle: (v: string) => void
  tagline: string; setTagline: (v: string) => void
  description: string; setDescription: (v: string) => void
  whatsIncluded: string; setWhatsIncluded: (v: string) => void
  faqs: FAQ[]; setFaqs: (v: FAQ[]) => void
  tripRecommendations: string; setTripRecommendations: (v: string) => void
  otherThingsNote: string; setOtherThingsNote: (v: string) => void
}

export default function DetailsStep(p: DetailsStepProps) {
  const addFaq = () =>
    p.setFaqs([...p.faqs, { id: crypto.randomUUID(), question: '', answer: '' }])

  const updateFaq = (id: string, patch: Partial<FAQ>) =>
    p.setFaqs(p.faqs.map((f) => (f.id === id ? { ...f, ...patch } : f)))

  const removeFaq = (id: string) => p.setFaqs(p.faqs.filter((f) => f.id !== id))

  const tip = (
    <HostTipCard
      imageSrc={TIP_IMAGES.details}
      imageAlt="Campervan parked at scenic overlook"
      body={
        <>
          <p>
            A listing name that&apos;s specific and compelling — mentioning the van&apos;s best feature
            or the kind of trip it&apos;s built for — consistently earns more clicks. Pair it with a
            description that helps guests picture themselves on the road, not just a spec sheet.
          </p>
          <p className="mt-2">
            Think about your most memorable guest review: what did they say about the experience? Lead
            with that.
          </p>
        </>
      }
    />
  )

  const main = (
    <div className="space-y-6">
      <Card>
        <h2 className="text-base font-semibold text-neutral-900 mb-4">Listing name</h2>
        <div>
          <label className={labelCls}>Title *</label>
          <input
            className={inputCls}
            value={p.title}
            onChange={(e) => p.setTitle(e.target.value)}
            placeholder="e.g. Luxury Adventure Van | Coachmen Beyond 22C | Off-Grid Ready"
          />
        </div>
        <div className="mt-4">
          <label className={labelCls}>Tagline (one-line hook)</label>
          <input
            className={inputCls}
            value={p.tagline}
            onChange={(e) => p.setTagline(e.target.value)}
            placeholder="e.g. Easy to Drive | Fully Equipped | Off-Grid Ready | Sleeps 2"
          />
        </div>
      </Card>

      <Card>
        <h2 className="text-base font-semibold text-neutral-900 mb-4">Listing description</h2>
        <textarea
          className={inputCls + ' min-h-[140px]'}
          value={p.description}
          onChange={(e) => p.setDescription(e.target.value)}
          placeholder="Looking for the perfect camper van for your next road trip? Describe the experience, not just the specs — what makes this van special, what kinds of trips it's perfect for."
        />
      </Card>

      <Card>
        <h2 className="text-base font-semibold text-neutral-900 mb-1">What&apos;s included</h2>
        <p className="text-xs text-neutral-500 mb-4">
          Create a comprehensive list of everything included in your rental at no extra charge.
        </p>
        <textarea
          className={inputCls + ' min-h-[100px]'}
          value={p.whatsIncluded}
          onChange={(e) => p.setWhatsIncluded(e.target.value)}
          placeholder={"Full kitchen setup — pots, pans, utensils, spices\nLinens, pillows, and towels\nOutdoor camp chairs and table\nPortable Bluetooth speaker"}
        />
        <p className="mt-2 text-xs text-neutral-400">One item per line.</p>
      </Card>

      <Card>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-base font-semibold text-neutral-900">FAQs</h2>
            <p className="text-xs text-neutral-500 mt-0.5">
              Answer the questions guests ask before booking.
            </p>
          </div>
          <button
            type="button"
            onClick={addFaq}
            className="flex items-center gap-1.5 rounded-full border border-neutral-900 px-3 py-1.5 text-xs font-semibold text-neutral-900 transition hover:bg-neutral-50"
          >
            <Plus className="h-3.5 w-3.5" />
            Add FAQ
          </button>
        </div>

        {p.faqs.length === 0 && (
          <p className="text-sm text-neutral-400 italic">
            No FAQs yet — add common questions guests might have.
          </p>
        )}

        <div className="space-y-4">
          {p.faqs.map((faq) => (
            <div key={faq.id} className="rounded-lg border border-neutral-200 bg-neutral-50 p-4">
              <div className="flex items-start justify-between gap-3 mb-3">
                <input
                  className={inputCls + ' flex-1 font-medium'}
                  value={faq.question}
                  onChange={(e) => updateFaq(faq.id, { question: e.target.value })}
                  placeholder="e.g. Do I need to fill up the fresh water tank before departing?"
                />
                <button
                  type="button"
                  onClick={() => removeFaq(faq.id)}
                  className="mt-0.5 shrink-0 text-neutral-400 hover:text-red-500 transition-colors"
                  aria-label="Remove FAQ"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
              <textarea
                className={inputCls + ' min-h-[80px]'}
                value={faq.answer}
                onChange={(e) => updateFaq(faq.id, { answer: e.target.value })}
                placeholder="Provide a clear, helpful answer…"
              />
            </div>
          ))}
        </div>
      </Card>

      <Card>
        <h2 className="text-base font-semibold text-neutral-900 mb-1">
          Trip recommendations for guests
        </h2>
        <p className="text-xs text-neutral-500 mb-3">
          Share your favourite itineraries or destinations — guests love local picks.
        </p>
        <textarea
          className={inputCls + ' min-h-[100px]'}
          value={p.tripRecommendations}
          onChange={(e) => p.setTripRecommendations(e.target.value)}
          placeholder={"Pacific Northwest (5–10 days) — Crater Lake, Columbia River Gorge, Mt. Rainier\nCalifornia Coast (7–14 days) — Redwood NP, San Francisco, Big Sur\nSouthwest National Parks (7–14 days) — Zion, Bryce Canyon, Grand Canyon"}
        />
        <p className="mt-2 text-xs text-neutral-400">One route or suggestion per line.</p>
      </Card>

      <Card>
        <h2 className="text-base font-semibold text-neutral-900 mb-1">Other things to note</h2>
        <p className="text-xs text-neutral-500 mb-3">
          Include any additional important information or special instructions guests should be aware
          of before their trip.
        </p>
        <textarea
          className={inputCls + ' min-h-[80px]'}
          value={p.otherThingsNote}
          onChange={(e) => p.setOtherThingsNote(e.target.value)}
          placeholder="e.g. Bathroom essentials such as soap, towels, and toilet paper are included."
        />
      </Card>
    </div>
  )

  return <HostEditorShell main={main} tip={tip} />
}
