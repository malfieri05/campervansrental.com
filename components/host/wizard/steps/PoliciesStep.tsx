import type { CancellationPolicy } from '@/app/host/listings/actions'
import HostEditorShell from '../HostEditorShell'
import HostTipCard from '../HostTipCard'
import { TIP_IMAGES } from '../tipImages'
import { Card, SectionDivider, Toggle, labelCls, inputCls } from '../formPrimitives'

interface PoliciesStepProps {
  cancellationPolicy: CancellationPolicy
  setCancellationPolicy: (v: CancellationPolicy) => void
  petsAllowed: boolean; setPetsAllowed: (v: boolean) => void
  smokingAllowed: boolean; setSmokingAllowed: (v: boolean) => void
  festivalsOk: boolean; setFestivalsOk: (v: boolean) => void
  minAge: number; setMinAge: (v: number) => void
  customRules: string; setCustomRules: (v: string) => void
  // New policy fields (from rules jsonb)
  pickupTime: string; setPickupTime: (v: string) => void
  returnTime: string; setReturnTime: (v: string) => void
  advanceNoticeDays: number; setAdvanceNoticeDays: (v: number) => void
  turnaroundSameDayPickup: boolean; setTurnaroundSameDayPickup: (v: boolean) => void
  instantBook: boolean; setInstantBook: (v: boolean) => void
}

const CANCELLATION_OPTIONS = [
  {
    value: 'flexible' as CancellationPolicy,
    title: 'Flexible',
    desc: '100% refund if cancelled 5+ days before pickup · 25% refund if cancelled within 5 days',
  },
  {
    value: 'moderate' as CancellationPolicy,
    title: 'Moderate',
    desc: '75% refund if cancelled 7+ days before pickup · 50% refund if cancelled within 7 days',
  },
  {
    value: 'strict' as CancellationPolicy,
    title: 'Strict',
    desc: '50% refund if cancelled 14+ days before pickup · No refund if cancelled within 14 days',
  },
]

export default function PoliciesStep(p: PoliciesStepProps) {
  const tip = (
    <HostTipCard
      imageSrc={TIP_IMAGES.policies}
      imageAlt="Happy guests with a dog outside a campervan"
      body={
        <>
          <p>
            Your cancellation policy directly shapes how often guests feel comfortable booking.
            Flexible and Moderate policies tend to attract significantly more reservations than
            Strict — especially from first-time RV renters who aren&apos;t yet sure about their plans.
          </p>
          <p className="mt-2">
            If you&apos;re unsure, Moderate is a solid default: it protects you while keeping the
            booking barrier low.
          </p>
        </>
      }
    />
  )

  const main = (
    <div className="space-y-5">
      {/* Trip start / end times */}
      <Card>
        <h2 className="text-base font-semibold text-neutral-900 mb-1">
          Trip start and end times
        </h2>
        <p className="text-sm text-neutral-500 mb-4">
          These are the default times for new bookings. You and the guest can propose changes to
          start/end times on any individual booking.
        </p>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className={labelCls}>Start time</label>
            <input
              type="time"
              className={inputCls}
              value={p.pickupTime}
              onChange={(e) => p.setPickupTime(e.target.value)}
            />
          </div>
          <div>
            <label className={labelCls}>End time</label>
            <input
              type="time"
              className={inputCls}
              value={p.returnTime}
              onChange={(e) => p.setReturnTime(e.target.value)}
            />
          </div>
        </div>
      </Card>

      {/* Advance notice */}
      <Card>
        <h2 className="text-base font-semibold text-neutral-900 mb-1">Advance notice</h2>
        <p className="text-sm text-neutral-500 mb-4">
          How many days ahead a guest must book. Setting this to 0 allows same-day bookings,
          which automatically blocks the next few days from showing as available.
        </p>
        <div>
          <label className={labelCls}>Days required before trip</label>
          <input
            type="number"
            min="0"
            className={inputCls}
            value={p.advanceNoticeDays}
            onChange={(e) => p.setAdvanceNoticeDays(Number(e.target.value) || 0)}
          />
        </div>
      </Card>

      {/* Turnaround */}
      <Card>
        <h2 className="text-base font-semibold text-neutral-900 mb-1">Turnaround time</h2>
        <Toggle
          label="Same day pickup allowed after a prior trip ends"
          description="Automatically blocks the time window after each trip ends to allow for prep, cleaning, or rest — even if the calendar shows open."
          value={p.turnaroundSameDayPickup}
          onChange={p.setTurnaroundSameDayPickup}
        />
      </Card>

      {/* Booking approvals */}
      <Card>
        <h2 className="text-base font-semibold text-neutral-900 mb-1">Booking approvals</h2>
        <Toggle
          label="Instant book enabled for pickup trips"
          description="When off, all bookings require your manual approval regardless of pickup type."
          value={p.instantBook}
          onChange={p.setInstantBook}
        />
      </Card>

      {/* Cancellation policy */}
      <Card>
        <h2 className="text-base font-semibold text-neutral-900 mb-4">Cancellation policy</h2>
        <div className="space-y-3">
          {CANCELLATION_OPTIONS.map((opt) => (
            <label
              key={opt.value}
              className={[
                'flex cursor-pointer gap-3 rounded-xl border p-4 transition-colors',
                p.cancellationPolicy === opt.value
                  ? 'border-neutral-900 bg-neutral-50'
                  : 'border-neutral-200 hover:border-neutral-400',
              ].join(' ')}
            >
              <input
                type="radio"
                name="cancellation"
                value={opt.value}
                checked={p.cancellationPolicy === opt.value}
                onChange={() => p.setCancellationPolicy(opt.value)}
                className="mt-0.5 accent-neutral-900"
              />
              <div>
                <p className="text-sm font-semibold text-neutral-900">{opt.title}</p>
                <p className="text-xs text-neutral-500 mt-0.5">{opt.desc}</p>
              </div>
            </label>
          ))}
        </div>
      </Card>

      {/* House rules */}
      <Card>
        <h2 className="text-base font-semibold text-neutral-900 mb-4">Let guests know what&apos;s ok — and what&apos;s not</h2>

        <div className="grid grid-cols-2 gap-6">
          {/* Allowed */}
          <div>
            <p className="text-[0.65rem] font-bold uppercase tracking-widest text-neutral-400 mb-3">Allowed</p>
            <div className="space-y-3">
              <Toggle label="Bring pets" value={p.petsAllowed} onChange={p.setPetsAllowed} />
              <Toggle label="Festival / event use" value={p.festivalsOk} onChange={p.setFestivalsOk} />
            </div>
          </div>

          {/* Not allowed */}
          <div>
            <p className="text-[0.65rem] font-bold uppercase tracking-widest text-neutral-400 mb-3">Not allowed</p>
            <div className="space-y-3">
              <Toggle label="Smoke in the RV" value={!p.smokingAllowed} onChange={(v) => p.setSmokingAllowed(!v)} />
            </div>
          </div>
        </div>

        <SectionDivider className="mt-5" />
        <div className="mt-4">
          <label className={labelCls}>Minimum driver age</label>
          <input
            type="number"
            min="18"
            className={inputCls + ' w-24'}
            value={p.minAge}
            onChange={(e) => p.setMinAge(Number(e.target.value) || 21)}
          />
        </div>

        <div className="mt-4">
          <label className={labelCls}>Additional rules (optional)</label>
          <textarea
            className={inputCls + ' min-h-[80px]'}
            value={p.customRules}
            onChange={(e) => p.setCustomRules(e.target.value)}
            placeholder="Any extra rules or requests for guests…"
          />
        </div>
      </Card>
    </div>
  )

  return <HostEditorShell main={main} tip={tip} />
}
