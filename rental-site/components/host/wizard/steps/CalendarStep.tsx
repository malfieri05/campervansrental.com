import ListingCalendar from '@/components/listing/ListingCalendar'
import type { BlockRange } from '@/lib/availability'
import { Card, Field } from '../formPrimitives'

interface CalendarStepProps {
  calendarBlocks: BlockRange[]
  hostBlocks: { id: string; start_date: string; end_date: string; block_type: string }[]
  maxNights: number | ''; setMaxNights: (v: number | '') => void
  leadTimeDays: number; setLeadTimeDays: (v: number) => void
  bufferDays: number; setBufferDays: (v: number) => void
  onAddBlock: (start: string, end: string) => Promise<void>
  onRemoveBlock: (id: string) => Promise<void>
}

export default function CalendarStep(p: CalendarStepProps) {
  return (
    <div className="space-y-5">
      <Card>
        <h2 className="text-base font-semibold text-neutral-900 mb-4">Booking settings</h2>
        <div className="grid gap-4 sm:grid-cols-3">
          <div>
            <Field
              label="Max nights per booking"
              value={p.maxNights === '' ? '' : String(p.maxNights)}
              onChange={(v) => p.setMaxNights(v ? Number(v) : '')}
              placeholder="No limit"
              type="number"
            />
          </div>
          <div>
            <Field
              label="Advance notice (days)"
              value={String(p.leadTimeDays)}
              onChange={(v) => p.setLeadTimeDays(Number(v) || 0)}
              type="number"
            />
            <p className="text-xs text-neutral-400 mt-1">Days before trip guests must book</p>
          </div>
          <div>
            <Field
              label="Buffer days between bookings"
              value={String(p.bufferDays)}
              onChange={(v) => p.setBufferDays(Number(v) || 0)}
              type="number"
            />
            <p className="text-xs text-neutral-400 mt-1">Prep / cleaning time between trips</p>
          </div>
        </div>
      </Card>

      <Card>
        <h2 className="text-base font-semibold text-neutral-900 mb-1">Block unavailable dates</h2>
        <p className="text-xs text-neutral-500 mb-4">
          Select a date range on the calendar to mark it as unavailable. Confirmed bookings are
          blocked automatically.
        </p>
        <ListingCalendar
          blocks={p.calendarBlocks}
          readOnly={false}
          onAddHostBlock={p.onAddBlock}
        />
        {p.hostBlocks.length > 0 && (
          <div className="mt-4 space-y-2">
            <p className="text-[0.7rem] font-bold uppercase tracking-widest text-neutral-500">
              Blocked periods
            </p>
            <ul className="space-y-1">
              {p.hostBlocks.map((b) => (
                <li
                  key={b.id}
                  className="flex items-center justify-between gap-2 rounded-lg border border-neutral-200 bg-neutral-50 px-3 py-2"
                >
                  <span className="text-sm text-neutral-700">
                    {b.start_date} → {b.end_date}
                  </span>
                  <button
                    type="button"
                    className="text-xs font-medium text-red-500 hover:text-red-700"
                    onClick={() => p.onRemoveBlock(b.id)}
                  >
                    Remove
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}
      </Card>
    </div>
  )
}
