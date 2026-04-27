import { useState } from 'react'
import { Plus, Trash2, X } from 'lucide-react'
import type { PricingRule, PricingRuleKind, LengthDiscountTier } from '@/app/host/listings/actions'
import { Card, labelCls, inputCls } from '../formPrimitives'
import HostEditorShell from '../HostEditorShell'
import HostTipCard from '../HostTipCard'
import { TIP_IMAGES } from '../tipImages'

interface ProfitPlanStepProps {
  rules: PricingRule[]
  setRules: (v: PricingRule[]) => void
  defaultMinNights: number
}

function buildSummaryLines(rule: Partial<PricingRule>): string[] {
  if (rule.kind === 'min_stay') {
    const n = rule.minNights ?? 1
    return [`Minimum stay ${n} night${n !== 1 ? 's' : ''}`]
  }
  if (rule.kind === 'length_discount') {
    return (rule.tiers ?? []).map((t) => `${t.nights}+ nights ${t.pct}% off`)
  }
  if (rule.kind === 'date_price_adjustment') {
    const delta = rule.nightlyDeltaCents ?? 0
    const dir = delta < 0 ? 'decreased' : 'increased'
    return [`Nightly rate ${dir} by $${Math.abs(delta / 100).toFixed(0)}`]
  }
  return []
}

function formatDatesLabel(rule: Partial<PricingRule>): string {
  if (rule.startDate && rule.endDate) {
    const fmt = (d: string) => {
      const [y, m, day] = d.split('-').map(Number)
      return new Date(y, m - 1, day).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    }
    return `${fmt(rule.startDate)} - ${fmt(rule.endDate)}`
  }
  return 'Everyday'
}

function RuleModal({
  initial,
  onSave,
  onClose,
}: {
  initial?: PricingRule
  onSave: (r: PricingRule) => void
  onClose: () => void
}) {
  const isEdit = Boolean(initial)
  const [kind, setKind] = useState<PricingRuleKind>(initial?.kind ?? 'min_stay')
  const [name, setName] = useState(initial?.name ?? '')
  const [minNights, setMinNights] = useState(initial?.minNights ?? 1)
  const [tiers, setTiers] = useState<LengthDiscountTier[]>(initial?.tiers ?? [{ nights: 7, pct: 7 }])
  const [startDate, setStartDate] = useState(initial?.startDate ?? '')
  const [endDate, setEndDate] = useState(initial?.endDate ?? '')
  const [nightlyDelta, setNightlyDelta] = useState(
    initial?.nightlyDeltaCents != null ? initial.nightlyDeltaCents / 100 : 0
  )

  const draft: Partial<PricingRule> = { kind, minNights, tiers, startDate, endDate, nightlyDeltaCents: Math.round(nightlyDelta * 100) }

  const handleSave = () => {
    const rule: PricingRule = {
      id: initial?.id ?? crypto.randomUUID(),
      kind,
      name: name || (kind === 'min_stay' ? 'Minimum stay rule' : kind === 'length_discount' ? 'Length of trip discount' : 'Price adjustment'),
      summaryLines: buildSummaryLines(draft),
      datesLabel: formatDatesLabel(draft),
      enabled: initial?.enabled ?? true,
      status: (() => {
        if (kind === 'date_price_adjustment' && endDate) {
          return new Date(endDate) < new Date() ? 'expired' : 'active'
        }
        return 'active'
      })(),
      minNights: kind === 'min_stay' ? minNights : undefined,
      tiers: kind === 'length_discount' ? tiers : undefined,
      startDate: kind === 'date_price_adjustment' ? startDate || undefined : undefined,
      endDate: kind === 'date_price_adjustment' ? endDate || undefined : undefined,
      nightlyDeltaCents: kind === 'date_price_adjustment' ? Math.round(nightlyDelta * 100) : undefined,
    }
    onSave(rule)
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-neutral-200 px-5 py-4">
          <h3 className="font-semibold text-neutral-900">{isEdit ? 'Edit rule' : 'Create rule'}</h3>
          <button type="button" onClick={onClose} className="text-neutral-400 hover:text-neutral-700">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-4 p-5">
          <div>
            <label className={labelCls}>Rule type</label>
            <select
              className={inputCls}
              value={kind}
              onChange={(e) => setKind(e.target.value as PricingRuleKind)}
            >
              <option value="min_stay">Minimum stay</option>
              <option value="length_discount">Length of trip discount</option>
              <option value="date_price_adjustment">Date-based price adjustment</option>
            </select>
          </div>

          <div>
            <label className={labelCls}>Rule name</label>
            <input
              className={inputCls}
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={
                kind === 'min_stay'
                  ? 'e.g. Minimum Days Rental Rule'
                  : kind === 'length_discount'
                  ? 'e.g. Length of trip discount'
                  : 'e.g. Holiday weekend adjustment'
              }
            />
          </div>

          {kind === 'min_stay' && (
            <div>
              <label className={labelCls}>Minimum nights</label>
              <input
                type="number"
                min="1"
                className={inputCls}
                value={minNights}
                onChange={(e) => setMinNights(Number(e.target.value) || 1)}
              />
            </div>
          )}

          {kind === 'length_discount' && (
            <div className="space-y-3">
              <label className={labelCls}>Discount tiers</label>
              {tiers.map((tier, i) => (
                <div key={i} className="flex items-center gap-2">
                  <input
                    type="number"
                    min="1"
                    className={inputCls}
                    value={tier.nights}
                    onChange={(e) => {
                      const updated = [...tiers]
                      updated[i] = { ...tier, nights: Number(e.target.value) || 1 }
                      setTiers(updated)
                    }}
                    placeholder="Nights"
                  />
                  <span className="shrink-0 text-sm text-neutral-500">nights</span>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    className={inputCls}
                    value={tier.pct}
                    onChange={(e) => {
                      const updated = [...tiers]
                      updated[i] = { ...tier, pct: Number(e.target.value) || 0 }
                      setTiers(updated)
                    }}
                    placeholder="% off"
                  />
                  <span className="shrink-0 text-sm text-neutral-500">% off</span>
                  <button
                    type="button"
                    onClick={() => setTiers(tiers.filter((_, j) => j !== i))}
                    className="text-neutral-400 hover:text-red-500"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ))}
              <button
                type="button"
                onClick={() => setTiers([...tiers, { nights: 28, pct: 15 }])}
                className="text-sm font-medium text-neutral-700 underline"
              >
                + Add tier
              </button>
            </div>
          )}

          {kind === 'date_price_adjustment' && (
            <>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelCls}>Start date</label>
                  <input
                    type="date"
                    className={inputCls}
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                  />
                </div>
                <div>
                  <label className={labelCls}>End date</label>
                  <input
                    type="date"
                    className={inputCls}
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                  />
                </div>
              </div>
              <div>
                <label className={labelCls}>Nightly rate change ($)</label>
                <input
                  type="number"
                  className={inputCls}
                  value={nightlyDelta}
                  onChange={(e) => setNightlyDelta(Number(e.target.value))}
                  placeholder="e.g. -7 to decrease by $7, +25 to increase"
                />
                <p className="mt-1 text-xs text-neutral-500">
                  Negative = decrease nightly rate. Positive = increase.
                </p>
              </div>
            </>
          )}
        </div>

        <div className="flex justify-end gap-2 border-t border-neutral-200 px-5 py-4">
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-neutral-300 px-4 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="rounded-full bg-neutral-900 px-5 py-2 text-sm font-semibold text-white hover:bg-neutral-700"
          >
            {isEdit ? 'Save changes' : 'Create rule'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default function ProfitPlanStep({ rules, setRules, defaultMinNights }: ProfitPlanStepProps) {
  const [showModal, setShowModal] = useState(false)
  const [editingRule, setEditingRule] = useState<PricingRule | undefined>(undefined)

  const openCreate = () => {
    setEditingRule(undefined)
    setShowModal(true)
  }

  const openEdit = (rule: PricingRule) => {
    setEditingRule(rule)
    setShowModal(true)
  }

  const saveRule = (rule: PricingRule) => {
    setRules(
      editingRule
        ? rules.map((r) => (r.id === rule.id ? rule : r))
        : [...rules, rule]
    )
  }

  const deleteRule = (id: string) => setRules(rules.filter((r) => r.id !== id))

  const toggleRule = (id: string) =>
    setRules(rules.map((r) => (r.id === id ? { ...r, enabled: !r.enabled } : r)))

  const tip = (
    <HostTipCard
      imageSrc={TIP_IMAGES.profitPlan}
      imageAlt="Laptop with analytics dashboard showing booking trends"
      body={
        <>
          <p>
            Pricing rules let you fine-tune your nightly rate based on trip length or specific dates —
            without touching your base rate. A weekend premium or a 7-night discount can meaningfully
            increase your average booking value.
          </p>
          <p className="mt-2">
            Length-of-trip discounts (7%+ for weekly, 15%+ for monthly) tend to attract longer bookings
            with fewer turnaround gaps.
          </p>
        </>
      }
    />
  )

  const main = (
    <div>
      <div className="flex items-start justify-between mb-5">
        <div>
          <h2 className="text-base font-semibold text-neutral-900">Profit plan</h2>
          <p className="text-sm text-neutral-500 mt-0.5">
            Adjust your nightly rate, minimum stay, or set discounts for longer trips. You can also
            create date-specific pricing adjustments.
          </p>
        </div>
        <button
          type="button"
          onClick={openCreate}
          className="flex shrink-0 items-center gap-1.5 rounded-full bg-amber-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-amber-600"
        >
          <Plus className="h-4 w-4" />
          Create rule
        </button>
      </div>

      <Card className="overflow-hidden !p-0">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-neutral-200 bg-neutral-50">
              <th className="px-4 py-3 text-left text-[0.65rem] font-bold uppercase tracking-widest text-neutral-400">Name</th>
              <th className="px-4 py-3 text-left text-[0.65rem] font-bold uppercase tracking-widest text-neutral-400">Summary</th>
              <th className="px-4 py-3 text-left text-[0.65rem] font-bold uppercase tracking-widest text-neutral-400">Dates</th>
              <th className="px-4 py-3 text-left text-[0.65rem] font-bold uppercase tracking-widest text-neutral-400">Status</th>
              <th className="px-4 py-3 text-left text-[0.65rem] font-bold uppercase tracking-widest text-neutral-400">Options</th>
            </tr>
          </thead>
          <tbody>
            {rules.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-sm text-neutral-400 italic">
                  No rules yet. Click &quot;Create rule&quot; to add your first one.
                </td>
              </tr>
            )}
            {rules.map((rule) => (
              <tr key={rule.id} className="border-b border-neutral-100 last:border-0">
                <td className="px-4 py-3 font-medium text-neutral-900">{rule.name}</td>
                <td className="px-4 py-3 text-neutral-600">
                  {rule.summaryLines.map((l, i) => (
                    <p key={i}>{l}</p>
                  ))}
                </td>
                <td className="px-4 py-3 text-neutral-600">{rule.datesLabel}</td>
                <td className="px-4 py-3">
                  {rule.status === 'expired' ? (
                    <span className="text-xs font-medium text-neutral-400">Expired</span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => toggleRule(rule.id)}
                      aria-label={rule.enabled ? 'Disable rule' : 'Enable rule'}
                      className={[
                        'relative h-6 w-11 rounded-full transition-colors duration-200',
                        rule.enabled ? 'bg-emerald-500' : 'bg-neutral-300',
                      ].join(' ')}
                    >
                      <span
                        className={[
                          'absolute top-1 h-4 w-4 rounded-full bg-white shadow transition-transform duration-200',
                          rule.enabled ? 'translate-x-6' : 'translate-x-1',
                        ].join(' ')}
                      />
                      <span className="sr-only">{rule.enabled ? 'Active' : 'Inactive'}</span>
                    </button>
                  )}
                  {rule.status === 'active' && (
                    <span className="ml-2 text-xs text-neutral-500">{rule.enabled ? 'Active' : 'Inactive'}</span>
                  )}
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => deleteRule(rule.id)}
                      className="text-xs font-medium text-red-500 hover:text-red-700"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => openEdit(rule)}
                      className="text-xs font-semibold text-neutral-900 underline"
                    >
                      Edit
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  )

  return (
    <>
      <HostEditorShell main={main} tip={tip} />
      {showModal && (
        <RuleModal
          initial={editingRule}
          onSave={saveRule}
          onClose={() => setShowModal(false)}
        />
      )}
    </>
  )
}
