import { Plus } from 'lucide-react'
import type { AddOn } from '@/app/host/listings/actions'
import { Card, labelCls, inputCls } from '../formPrimitives'

interface AddOnsStepProps {
  addOns: AddOn[]
  setAddOns: (v: AddOn[]) => void
}

export default function AddOnsStep({ addOns, setAddOns }: AddOnsStepProps) {
  const addBlank = () =>
    setAddOns([
      ...addOns,
      { id: crypto.randomUUID(), name: '', description: '', price_cents: 0, charge_type: 'per_trip' },
    ])

  const update = (id: string, patch: Partial<AddOn>) =>
    setAddOns(addOns.map((a) => (a.id === id ? { ...a, ...patch } : a)))

  const remove = (id: string) => setAddOns(addOns.filter((a) => a.id !== id))

  return (
    <Card>
      <div className="flex items-start justify-between mb-4">
        <div>
          <h2 className="text-base font-semibold text-neutral-900">Optional add-ons</h2>
          <p className="text-sm text-neutral-500 mt-0.5">
            Sell extras that enhance the guest experience — camping chairs, kayaks, airport transfers,
            welcome baskets, etc. Guests choose add-ons at checkout.
          </p>
        </div>
        <button
          type="button"
          onClick={addBlank}
          className="flex shrink-0 items-center gap-1.5 rounded-full border border-neutral-900 px-3 py-1.5 text-xs font-semibold text-neutral-900 transition hover:bg-neutral-50"
        >
          <Plus className="h-3.5 w-3.5" />
          Add extra
        </button>
      </div>

      {addOns.length === 0 && (
        <p className="text-sm italic text-neutral-400">No add-ons yet.</p>
      )}

      <div className="space-y-4">
        {addOns.map((addon) => (
          <div key={addon.id} className="rounded-xl border border-neutral-200 bg-neutral-50 p-4 space-y-3">
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className={labelCls}>Name *</label>
                <input
                  className={inputCls}
                  value={addon.name}
                  onChange={(e) => update(addon.id, { name: e.target.value })}
                  placeholder="e.g. Camping chair set"
                />
              </div>
              <div>
                <label className={labelCls}>Price ($) *</label>
                <input
                  type="number"
                  min="0"
                  className={inputCls}
                  value={Math.round(addon.price_cents / 100)}
                  onChange={(e) => update(addon.id, { price_cents: Math.round(Number(e.target.value) * 100) })}
                />
              </div>
            </div>
            <div>
              <label className={labelCls}>Description (optional)</label>
              <input
                className={inputCls}
                value={addon.description ?? ''}
                onChange={(e) => update(addon.id, { description: e.target.value })}
                placeholder="Brief description of what's included"
              />
            </div>
            <div className="flex items-center justify-between gap-4">
              <div className="flex-1">
                <label className={labelCls}>Charge type</label>
                <select
                  className={inputCls}
                  value={addon.charge_type}
                  onChange={(e) => update(addon.id, { charge_type: e.target.value as AddOn['charge_type'] })}
                >
                  <option value="per_trip">Per trip (flat fee)</option>
                  <option value="daily">Per day</option>
                  <option value="upon_return">Charged upon return</option>
                </select>
              </div>
              <button
                type="button"
                onClick={() => remove(addon.id)}
                className="mt-5 shrink-0 text-xs font-medium text-red-500 underline"
              >
                Remove
              </button>
            </div>
          </div>
        ))}
      </div>
    </Card>
  )
}
