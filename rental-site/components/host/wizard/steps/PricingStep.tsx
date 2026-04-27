import { useState } from 'react'
import { Pencil } from 'lucide-react'
import HostEditorShell from '../HostEditorShell'
import HostTipCard from '../HostTipCard'
import { TIP_IMAGES } from '../tipImages'
import { Card, labelCls, inputCls } from '../formPrimitives'

function fmt(cents: number | '') {
  if (cents === '') return '—'
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(
    Number(cents) / 100
  )
}

function PriceRow({
  label,
  valueFormatted,
  editing,
  inputEl,
}: {
  label: string
  valueFormatted: string
  editing: boolean
  inputEl: React.ReactNode
}) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-neutral-100 py-3 last:border-0">
      <span className="text-sm text-neutral-600">{label}</span>
      {editing ? <div className="w-36">{inputEl}</div> : <span className="text-sm font-semibold text-neutral-900">{valueFormatted}</span>}
    </div>
  )
}

interface PricingStepProps {
  pricePerNight: number; setPricePerNight: (v: number) => void
  weeklyRate: number | ''; setWeeklyRate: (v: number | '') => void
  monthlyRate: number | ''; setMonthlyRate: (v: number | '') => void
  securityDeposit: number; setSecurityDeposit: (v: number) => void
  cleaning: number; setCleaning: (v: number) => void
  insurance: number; setInsurance: (v: number) => void
  mileageFee: number; setMileageFee: (v: number) => void
  generatorFee: number; setGeneratorFee: (v: number) => void
  minNights: number; setMinNights: (v: number) => void
}

function MoneyInput({ value, onChange }: { value: number | ''; onChange: (v: number | '') => void }) {
  return (
    <input
      type="number"
      min="0"
      className={inputCls + ' text-right'}
      value={value === '' ? '' : value}
      onChange={(e) => onChange(e.target.value ? Number(e.target.value) : '')}
    />
  )
}

export default function PricingStep(p: PricingStepProps) {
  const [editingMain, setEditingMain] = useState(false)
  const [editingFees, setEditingFees] = useState(false)
  const [editingExtra, setEditingExtra] = useState(false)

  const tip = (
    <HostTipCard
      imageSrc={TIP_IMAGES.pricing}
      imageAlt="Campfire cooking at a scenic van campsite"
      body={
        <>
          <p>
            Your payout is your nightly rate minus our platform service fee, paid out after the guest
            begins their trip. The service fee covers payment processing, 24/7 host support, and guest
            protection — so you can focus on hosting.
          </p>
          <p className="mt-2">
            Weekly and monthly rate discounts are a reliable way to boost occupancy during slower
            periods without lowering your base nightly rate.
          </p>
        </>
      }
    />
  )

  const main = (
    <div className="space-y-5">
      {/* Min stay + nightly rate */}
      <Card>
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-base font-semibold text-neutral-900">Pricing</h2>
          <button
            type="button"
            onClick={() => setEditingMain((v) => !v)}
            className="flex items-center gap-1 text-xs font-semibold text-neutral-900 underline underline-offset-2"
          >
            <Pencil className="h-3.5 w-3.5" />
            {editingMain ? 'Done' : 'Edit'}
          </button>
        </div>

        <PriceRow
          label="Minimum stay"
          valueFormatted={`${p.minNights} night${p.minNights !== 1 ? 's' : ''}`}
          editing={editingMain}
          inputEl={
            <input
              type="number"
              min="1"
              className={inputCls}
              value={p.minNights}
              onChange={(e) => p.setMinNights(Number(e.target.value) || 1)}
            />
          }
        />
        <PriceRow
          label="Nightly rate"
          valueFormatted={`$${p.pricePerNight.toFixed(2)}`}
          editing={editingMain}
          inputEl={
            <input
              type="number"
              min="0"
              className={inputCls}
              value={p.pricePerNight}
              onChange={(e) => p.setPricePerNight(Number(e.target.value) || 0)}
            />
          }
        />
        <PriceRow
          label="Weekly rate (7+ nights)"
          valueFormatted={p.weeklyRate === '' ? 'Not set' : `$${Number(p.weeklyRate).toFixed(2)}`}
          editing={editingMain}
          inputEl={<MoneyInput value={p.weeklyRate} onChange={p.setWeeklyRate} />}
        />
        <PriceRow
          label="Monthly rate (28+ nights)"
          valueFormatted={p.monthlyRate === '' ? 'Not set' : `$${Number(p.monthlyRate).toFixed(2)}`}
          editing={editingMain}
          inputEl={<MoneyInput value={p.monthlyRate} onChange={p.setMonthlyRate} />}
        />

        {!editingMain && p.pricePerNight > 0 && (
          <div className="mt-3 rounded-lg bg-neutral-50 border border-neutral-200 px-3 py-2.5 text-xs text-neutral-600 space-y-1">
            {p.weeklyRate === '' && (
              <p>Suggested weekly (25% off): <strong>${Math.round(p.pricePerNight * 7 * 0.75)}</strong></p>
            )}
            {p.monthlyRate === '' && (
              <p>Suggested monthly (35% off): <strong>${Math.round(p.pricePerNight * 30 * 0.65)}</strong></p>
            )}
          </div>
        )}
      </Card>

      {/* Fees */}
      <Card>
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-base font-semibold text-neutral-900">State fees</h2>
          <button
            type="button"
            onClick={() => setEditingFees((v) => !v)}
            className="flex items-center gap-1 text-xs font-semibold text-neutral-900 underline underline-offset-2"
          >
            <Pencil className="h-3.5 w-3.5" />
            {editingFees ? 'Done' : 'Edit'}
          </button>
        </div>
        <p className="text-xs text-neutral-500 mb-3">
          We are required by law to collect and report applicable sales tax on your behalf.
        </p>
        <PriceRow
          label="Cleaning fee"
          valueFormatted={fmt(p.cleaning * 100)}
          editing={editingFees}
          inputEl={
            <input
              type="number"
              min="0"
              className={inputCls}
              value={p.cleaning}
              onChange={(e) => p.setCleaning(Number(e.target.value) || 0)}
            />
          }
        />
        <PriceRow
          label="Protection plan fee"
          valueFormatted={fmt(p.insurance * 100)}
          editing={editingFees}
          inputEl={
            <input
              type="number"
              min="0"
              className={inputCls}
              value={p.insurance}
              onChange={(e) => p.setInsurance(Number(e.target.value) || 0)}
            />
          }
        />
      </Card>

      {/* Security deposit */}
      <Card>
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-base font-semibold text-neutral-900">Security deposit</h2>
          <button
            type="button"
            onClick={() => setEditingExtra((v) => !v)}
            className="flex items-center gap-1 text-xs font-semibold text-neutral-900 underline underline-offset-2"
          >
            <Pencil className="h-3.5 w-3.5" />
            {editingExtra ? 'Done' : 'Edit'}
          </button>
        </div>
        <PriceRow
          label="Amount"
          valueFormatted={fmt(p.securityDeposit * 100)}
          editing={editingExtra}
          inputEl={
            <input
              type="number"
              min="0"
              className={inputCls}
              value={p.securityDeposit}
              onChange={(e) => p.setSecurityDeposit(Number(e.target.value) || 0)}
            />
          }
        />
      </Card>

      {/* Mileage & generator */}
      <Card>
        <h2 className="text-base font-semibold text-neutral-900 mb-3">Mileage</h2>
        <div>
          <label className={labelCls}>Set my own rules</label>
          <input
            type="number"
            min="0"
            className={inputCls}
            value={p.mileageFee}
            onChange={(e) => p.setMileageFee(Number(e.target.value) || 0)}
            placeholder="0 = unlimited miles included"
          />
          {p.mileageFee === 0 && (
            <p className="mt-1 text-xs text-neutral-400">Guests drive free. Cost for extra miles: $0/mile.</p>
          )}
          {p.mileageFee > 0 && (
            <p className="mt-1 text-xs text-neutral-500">Cost for extra miles: ${p.mileageFee.toFixed(2)}/mile.</p>
          )}
        </div>

        <div className="mt-5">
          <h2 className="text-base font-semibold text-neutral-900 mb-1">Generator</h2>
          <label className={labelCls}>Charge per day ($)</label>
          <input
            type="number"
            min="0"
            className={inputCls}
            value={p.generatorFee}
            onChange={(e) => p.setGeneratorFee(Number(e.target.value) || 0)}
            placeholder="0 = included"
          />
        </div>
      </Card>
    </div>
  )

  return <HostEditorShell main={main} tip={tip} />
}
