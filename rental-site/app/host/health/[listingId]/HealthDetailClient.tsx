'use client'

import { useState, useTransition, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import {
  Gauge,
  Wrench,
  AlertTriangle,
  Plus,
  Check,
  Trash2,
  Eye,
  EyeOff,
  X,
  MessageSquare,
  Star,
  Send,
  Calendar,
} from 'lucide-react'
import {
  logMileage,
  claimExternalTripMiles,
  logDamage,
  upsertTask,
  completeTask,
  deleteTask,
  togglePublicToMechanics,
  acceptQuote,
  declineQuote,
  sendMessage,
} from '../actions'
import type {
  VehicleProfile,
  VehicleMileageLog,
  VehicleMaintenanceTask,
  VehicleDamageReport,
  MaintenancePriority,
  MaintenanceStatus,
  DamageSeverity,
} from '@/lib/vehicle-health'
import type { ExternalBlock } from '@/lib/vehicle-health-external'

// ─── Shared helpers ───────────────────────────────────────────────────────────

function priorityBadge(p: MaintenancePriority) {
  const map: Record<MaintenancePriority, string> = {
    low: 'bg-neutral-100 text-neutral-600',
    medium: 'bg-blue-50 text-blue-700',
    high: 'bg-amber-50 text-amber-700',
    urgent: 'bg-red-50 text-red-700',
  }
  return (
    <span className={`rounded-full px-2 py-0.5 text-[0.65rem] font-semibold ${map[p]}`}>
      {p.charAt(0).toUpperCase() + p.slice(1)}
    </span>
  )
}

function statusBadge(s: MaintenanceStatus) {
  const map: Record<MaintenanceStatus, string> = {
    open: 'bg-amber-50 text-amber-700',
    in_progress: 'bg-blue-50 text-blue-700',
    completed: 'bg-emerald-50 text-emerald-700',
    deferred: 'bg-neutral-100 text-neutral-600',
    cancelled: 'bg-neutral-100 text-neutral-500',
  }
  return (
    <span className={`rounded-full px-2 py-0.5 text-[0.65rem] font-semibold ${map[s]}`}>
      {s.replace('_', ' ')}
    </span>
  )
}

// ─── Card frame ───────────────────────────────────────────────────────────────

function DashCard({
  id,
  title,
  Icon,
  count,
  notificationCount,
  action,
  children,
}: {
  id?: string
  title: string
  Icon: React.ElementType
  count?: number
  /** Classic red notification badge (e.g. unclaimed/unread items needing attention). */
  notificationCount?: number
  action?: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <div
      id={id}
      className="flex flex-col rounded-2xl border border-neutral-200 bg-white shadow-sm overflow-hidden scroll-mt-24"
    >
      <header className="flex items-center justify-between gap-3 border-b border-neutral-100 px-5 py-4">
        <div className="flex items-center gap-2 min-w-0">
          <span className="relative">
            <Icon className="h-4 w-4 text-neutral-500" strokeWidth={1.75} />
            {typeof notificationCount === 'number' && notificationCount > 0 && (
              <span
                aria-label={`${notificationCount} need attention`}
                className="absolute -top-1.5 -right-2 inline-flex h-4 min-w-[1rem] items-center justify-center rounded-full bg-red-500 px-1 text-[0.6rem] font-bold leading-none text-white ring-2 ring-white"
              >
                {notificationCount > 9 ? '9+' : notificationCount}
              </span>
            )}
          </span>
          <h3 className="font-sans text-sm font-bold uppercase tracking-wide text-neutral-900 truncate">
            {title}
          </h3>
          {typeof count === 'number' && (
            <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-[0.65rem] font-semibold text-neutral-600">
              {count}
            </span>
          )}
        </div>
        {action}
      </header>
      <div className="flex-1 p-5">{children}</div>
    </div>
  )
}

function AddPillButton({
  onClick,
  label,
  open,
}: {
  onClick: () => void
  label: string
  open: boolean
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex items-center gap-1.5 rounded-full border border-neutral-300 px-3 py-1 text-xs font-semibold text-neutral-700 hover:bg-neutral-50 transition"
    >
      {open ? <X className="h-3 w-3" /> : <Plus className="h-3 w-3" />}
      {open ? 'Cancel' : label}
    </button>
  )
}

// Inline form wrapper: lives inside a DashCard so no border, just a divider.
function InlineFormPanel({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-xl bg-neutral-50 border border-neutral-200 p-4 mb-4 space-y-3">
      {children}
    </div>
  )
}

function tripMilesDisplay(log: VehicleMileageLog): number | null {
  if (log.miles_driven != null) return log.miles_driven
  return log.host_reported_trip_miles ?? null
}

function UnclaimedTripRow({
  block,
  listingId,
  onClaimed,
}: {
  block: ExternalBlock
  listingId: string
  onClaimed: (blockId: string) => void
}) {
  const router = useRouter()
  const [miles, setMiles] = useState('')
  const [localError, setLocalError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function submit() {
    setLocalError(null)
    const n = Number.parseFloat(miles)
    if (!Number.isFinite(n) || n <= 0) {
      setLocalError('Enter trip miles')
      return
    }
    startTransition(async () => {
      const result = await claimExternalTripMiles(listingId, block.id, n)
      if (result.error) {
        setLocalError(result.error)
      } else {
        setMiles('')
        onClaimed(block.id)
        router.refresh()
      }
    })
  }

  return (
    <li className="rounded-md bg-white border border-amber-200 px-2.5 py-2 space-y-1.5">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between sm:gap-3">
        <span className="text-[0.7rem] text-neutral-700 shrink-0">
          {new Date(block.start_date).toLocaleDateString()} –{' '}
          {new Date(block.end_date).toLocaleDateString()}
        </span>
        <div className="flex items-center gap-2 sm:shrink-0">
          <input
            type="number"
            inputMode="decimal"
            min={0}
            step={1}
            placeholder="Trip miles"
            value={miles}
            onChange={(e) => setMiles(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault()
                submit()
              }
            }}
            disabled={isPending}
            className="min-w-0 flex-1 rounded-lg border border-neutral-300 bg-white px-2.5 py-1.5 text-sm text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-neutral-400 sm:w-28 sm:flex-initial"
          />
          <button
            type="button"
            onClick={submit}
            disabled={isPending}
            className="shrink-0 rounded-full bg-neutral-900 px-3 py-1.5 text-xs font-semibold text-white hover:bg-neutral-800 disabled:opacity-50 transition"
          >
            {isPending ? '…' : 'Add'}
          </button>
        </div>
      </div>
      {localError && <p className="text-[0.65rem] text-red-600">{localError}</p>}
    </li>
  )
}

function MileageCard({
  profile,
  logs,
  unclaimedExternalBlocks,
  listingId,
}: {
  profile: VehicleProfile | null
  logs: VehicleMileageLog[]
  unclaimedExternalBlocks: ExternalBlock[]
  listingId: string
}) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [localUnclaimed, setLocalUnclaimed] = useState(unclaimedExternalBlocks)

  useEffect(() => {
    setLocalUnclaimed(unclaimedExternalBlocks)
  }, [unclaimedExternalBlocks])

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    const fd = new FormData(e.currentTarget)
    startTransition(async () => {
      const result = await logMileage(listingId, fd)
      if (result.error) {
        setError(result.error)
      } else {
        setOpen(false)
        ;(e.target as HTMLFormElement).reset()
        router.refresh()
      }
    })
  }

  return (
    <DashCard
      id="card-mileage"
      title="Mileage"
      Icon={Gauge}
      notificationCount={localUnclaimed.length}
      action={
        <AddPillButton open={open} onClick={() => setOpen((v) => !v)} label="Log mileage" />
      }
    >
      {/* Current odometer stat */}
      <div className="mb-4 flex items-baseline justify-between gap-3 rounded-xl bg-neutral-50 border border-neutral-100 px-4 py-3">
        <div>
          <p className="text-[0.65rem] font-medium uppercase tracking-wide text-neutral-500">
            Current odometer
          </p>
          <p className="mt-0.5 font-sans text-2xl font-bold text-neutral-900">
            {profile?.current_odometer_miles != null
              ? `${profile.current_odometer_miles.toLocaleString()} mi`
              : <span className="text-base text-neutral-400">Not recorded</span>}
          </p>
        </div>
        {profile?.current_odometer_updated_at && (
          <p className="text-xs text-neutral-500 text-right">
            Updated<br />
            {new Date(profile.current_odometer_updated_at).toLocaleDateString()}
          </p>
        )}
      </div>

      {/* Unclaimed off-platform trips — inline trip miles + Add */}
      {localUnclaimed.length > 0 && (
        <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50/70 px-3 py-2.5">
          <p className="text-xs font-semibold text-amber-800">
            {localUnclaimed.length} untracked off-platform{' '}
            {localUnclaimed.length === 1 ? 'trip' : 'trips'}
          </p>
          <ul className="mt-2 space-y-2">
            {localUnclaimed.map((block) => (
              <UnclaimedTripRow
                key={block.id}
                block={block}
                listingId={listingId}
                onClaimed={(id) => setLocalUnclaimed((prev) => prev.filter((b) => b.id !== id))}
              />
            ))}
          </ul>
        </div>
      )}

      {open && (
        <InlineFormPanel>
          <form onSubmit={handleSubmit} className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <label className="flex flex-col gap-1 text-xs">
                <span className="font-medium text-neutral-700">Start odometer (mi)</span>
                <input name="start_odometer" type="number" min={0} className="rounded-lg border border-neutral-300 bg-white px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-neutral-400" />
              </label>
              <label className="flex flex-col gap-1 text-xs">
                <span className="font-medium text-neutral-700">End odometer (mi)</span>
                <input name="end_odometer" type="number" min={0} className="rounded-lg border border-neutral-300 bg-white px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-neutral-400" />
              </label>
              <label className="flex flex-col gap-1 text-xs">
                <span className="font-medium text-neutral-700">Trip start</span>
                <input name="trip_start_date" type="date" className="rounded-lg border border-neutral-300 bg-white px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-neutral-400" />
              </label>
              <label className="flex flex-col gap-1 text-xs">
                <span className="font-medium text-neutral-700">Trip end</span>
                <input name="trip_end_date" type="date" className="rounded-lg border border-neutral-300 bg-white px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-neutral-400" />
              </label>
            </div>
            <label className="flex flex-col gap-1 text-xs">
              <span className="font-medium text-neutral-700">Source</span>
              <select name="source" className="rounded-lg border border-neutral-300 bg-white px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-neutral-400">
                <option value="manual">Manual entry</option>
                <option value="platform">Platform booking</option>
                <option value="external_calendar">External calendar</option>
              </select>
            </label>
            <label className="flex flex-col gap-1 text-xs">
              <span className="font-medium text-neutral-700">Notes (optional)</span>
              <textarea name="notes" rows={2} className="rounded-lg border border-neutral-300 bg-white px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-neutral-400" />
            </label>
            {error && <p className="text-xs text-red-600">{error}</p>}
            <button
              type="submit"
              disabled={isPending}
              className="rounded-full bg-neutral-900 px-4 py-1.5 text-xs font-semibold text-white disabled:opacity-60 hover:bg-neutral-800 transition"
            >
              {isPending ? 'Saving…' : 'Save entry'}
            </button>
          </form>
        </InlineFormPanel>
      )}

      {logs.length === 0 ? (
        <p className="text-sm text-neutral-400">No mileage entries yet.</p>
      ) : (
        <ul className="divide-y divide-neutral-100 -mx-2">
          {logs.slice(0, 6).map((log) => (
            <li key={log.id} className="flex items-center justify-between gap-3 px-2 py-2.5">
              <div className="min-w-0">
                <p className="text-sm text-neutral-800">
                  {log.trip_end_date ? new Date(log.trip_end_date).toLocaleDateString() : '—'}
                </p>
                <p className="text-[0.7rem] capitalize text-neutral-500">{log.source.replace('_', ' ')}</p>
              </div>
              <div className="text-right shrink-0">
                <p className="text-sm font-medium text-neutral-800">
                  {(() => {
                    const m = tripMilesDisplay(log)
                    return m != null ? `+${m.toLocaleString()} mi` : '—'
                  })()}
                </p>
                {log.end_odometer != null && (
                  <p className="text-[0.7rem] text-neutral-500">{log.end_odometer.toLocaleString()} mi</p>
                )}
              </div>
            </li>
          ))}
          {logs.length > 6 && (
            <li className="px-2 pt-2 text-[0.7rem] text-neutral-400">+{logs.length - 6} earlier entries</li>
          )}
        </ul>
      )}
    </DashCard>
  )
}

// ─── Maintenance card ────────────────────────────────────────────────────────

function MaintenanceCard({
  tasks,
  listingId,
}: {
  tasks: VehicleMaintenanceTask[]
  listingId: string
}) {
  const [showForm, setShowForm] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [localTasks, setLocalTasks] = useState(tasks)

  const openCount = localTasks.filter((t) => t.status === 'open' || t.status === 'in_progress').length

  function handleAdd(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    const fd = new FormData(e.currentTarget)
    startTransition(async () => {
      const result = await upsertTask(listingId, fd)
      if (result.error) {
        setError(result.error)
      } else if (result.task) {
        setLocalTasks((prev) => [result.task!, ...prev])
        setShowForm(false)
        ;(e.target as HTMLFormElement).reset()
      }
    })
  }

  function handleComplete(taskId: string) {
    startTransition(async () => {
      await completeTask(taskId)
      setLocalTasks((prev) =>
        prev.map((t) => (t.id === taskId ? { ...t, status: 'completed' as MaintenanceStatus } : t))
      )
    })
  }

  function handleDelete(taskId: string) {
    startTransition(async () => {
      await deleteTask(taskId)
      setLocalTasks((prev) => prev.filter((t) => t.id !== taskId))
    })
  }

  function handleTogglePublic(taskId: string, current: boolean) {
    startTransition(async () => {
      await togglePublicToMechanics(taskId, !current)
      setLocalTasks((prev) =>
        prev.map((t) => (t.id === taskId ? { ...t, is_public_to_mechanics: !current } : t))
      )
    })
  }

  return (
    <DashCard
      title="Maintenance"
      Icon={Wrench}
      count={openCount}
      action={
        <AddPillButton open={showForm} onClick={() => setShowForm((v) => !v)} label="Add task" />
      }
    >
      {showForm && (
        <InlineFormPanel>
          <form onSubmit={handleAdd} className="space-y-3">
            <label className="flex flex-col gap-1 text-xs">
              <span className="font-medium text-neutral-700">Title *</span>
              <input name="title" required className="rounded-lg border border-neutral-300 bg-white px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-neutral-400" />
            </label>
            <div className="grid grid-cols-2 gap-3">
              <label className="flex flex-col gap-1 text-xs">
                <span className="font-medium text-neutral-700">Priority</span>
                <select name="priority" defaultValue="medium" className="rounded-lg border border-neutral-300 bg-white px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-neutral-400">
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="urgent">Urgent</option>
                </select>
              </label>
              <label className="flex flex-col gap-1 text-xs">
                <span className="font-medium text-neutral-700">Kind</span>
                <select name="kind" className="rounded-lg border border-neutral-300 bg-white px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-neutral-400">
                  <option value="custom">Custom</option>
                  <option value="oil_change">Oil change</option>
                  <option value="tire_rotation">Tire rotation</option>
                  <option value="brake_inspection">Brake inspection</option>
                  <option value="transmission_fluid">Transmission fluid</option>
                  <option value="air_filter">Air filter</option>
                  <option value="coolant_flush">Coolant flush</option>
                  <option value="inspection">Inspection</option>
                </select>
              </label>
            </div>
            <label className="flex flex-col gap-1 text-xs">
              <span className="font-medium text-neutral-700">Description</span>
              <textarea name="description" rows={2} className="rounded-lg border border-neutral-300 bg-white px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-neutral-400" />
            </label>
            <div className="grid grid-cols-2 gap-3">
              <label className="flex flex-col gap-1 text-xs">
                <span className="font-medium text-neutral-700">Due date</span>
                <input name="due_at_date" type="date" className="rounded-lg border border-neutral-300 bg-white px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-neutral-400" />
              </label>
              <label className="flex flex-col gap-1 text-xs">
                <span className="font-medium text-neutral-700">Due at miles</span>
                <input name="due_at_miles" type="number" min={0} className="rounded-lg border border-neutral-300 bg-white px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-neutral-400" />
              </label>
            </div>
            {error && <p className="text-xs text-red-600">{error}</p>}
            <button type="submit" disabled={isPending} className="rounded-full bg-neutral-900 px-4 py-1.5 text-xs font-semibold text-white disabled:opacity-60 hover:bg-neutral-800 transition">
              {isPending ? 'Saving…' : 'Add task'}
            </button>
          </form>
        </InlineFormPanel>
      )}

      {localTasks.length === 0 ? (
        <p className="text-sm text-neutral-400">No maintenance tasks yet.</p>
      ) : (
        <ul className="divide-y divide-neutral-100 -mx-2">
          {localTasks.map((task) => (
            <li
              key={task.id}
              className={`flex items-start gap-3 px-2 py-2.5 ${task.status === 'completed' ? 'opacity-60' : ''}`}
            >
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-neutral-900 truncate">{task.title}</p>
                <div className="mt-1 flex flex-wrap items-center gap-1.5">
                  {priorityBadge(task.priority)}
                  {statusBadge(task.status)}
                  {(task.due_at_date || task.due_at_miles) && (
                    <span className="text-[0.7rem] text-neutral-500">
                      {task.due_at_date && new Date(task.due_at_date).toLocaleDateString()}
                      {task.due_at_miles && ` · ${task.due_at_miles.toLocaleString()} mi`}
                    </span>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                {task.status !== 'completed' && (
                  <>
                    <button
                      onClick={() => handleTogglePublic(task.id, task.is_public_to_mechanics)}
                      title={task.is_public_to_mechanics ? 'Hide from mechanics' : 'Share with mechanics'}
                      className="text-neutral-400 hover:text-neutral-700 transition"
                    >
                      {task.is_public_to_mechanics ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
                    </button>
                    <button
                      onClick={() => handleComplete(task.id)}
                      title="Mark complete"
                      className="text-neutral-400 hover:text-emerald-600 transition"
                    >
                      <Check className="h-3.5 w-3.5" />
                    </button>
                  </>
                )}
                <button
                  onClick={() => handleDelete(task.id)}
                  title="Delete"
                  className="text-neutral-400 hover:text-red-500 transition"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </DashCard>
  )
}

// ─── Damage card ─────────────────────────────────────────────────────────────

function DamageCard({
  damages,
  listingId,
}: {
  damages: VehicleDamageReport[]
  listingId: string
}) {
  const [showForm, setShowForm] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [localDamages, setLocalDamages] = useState(damages)
  const fileRef = useRef<HTMLInputElement>(null)

  const openCount = localDamages.filter(
    (d) => d.repair_status === 'unresolved' || d.repair_status === 'in_progress'
  ).length

  function handleAdd(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    const fd = new FormData(e.currentTarget)
    startTransition(async () => {
      const result = await logDamage(listingId, fd)
      if (result.error) {
        setError(result.error)
      } else if (result.damage) {
        setLocalDamages((prev) => [result.damage!, ...prev])
        setShowForm(false)
        ;(e.target as HTMLFormElement).reset()
      }
    })
  }

  const severityColors: Record<DamageSeverity, string> = {
    minor: 'bg-yellow-50 text-yellow-700 border-yellow-200',
    moderate: 'bg-amber-50 text-amber-700 border-amber-200',
    major: 'bg-red-50 text-red-700 border-red-200',
    totaled: 'bg-red-100 text-red-900 border-red-300',
  }

  return (
    <DashCard
      title="Damage Reports"
      Icon={AlertTriangle}
      count={openCount}
      action={
        <AddPillButton open={showForm} onClick={() => setShowForm((v) => !v)} label="Log damage" />
      }
    >
      {showForm && (
        <InlineFormPanel>
          <form onSubmit={handleAdd} className="space-y-3">
            <label className="flex flex-col gap-1 text-xs">
              <span className="font-medium text-neutral-700">Title *</span>
              <input name="title" required className="rounded-lg border border-neutral-300 bg-white px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-neutral-400" />
            </label>
            <div className="grid grid-cols-2 gap-3">
              <label className="flex flex-col gap-1 text-xs">
                <span className="font-medium text-neutral-700">Severity</span>
                <select name="severity" className="rounded-lg border border-neutral-300 bg-white px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-neutral-400">
                  <option value="minor">Minor</option>
                  <option value="moderate">Moderate</option>
                  <option value="major">Major</option>
                  <option value="totaled">Totaled</option>
                </select>
              </label>
              <label className="flex flex-col gap-1 text-xs">
                <span className="font-medium text-neutral-700">Category</span>
                <select name="category" className="rounded-lg border border-neutral-300 bg-white px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-neutral-400">
                  <option value="exterior">Exterior</option>
                  <option value="interior">Interior</option>
                  <option value="mechanical">Mechanical</option>
                  <option value="electrical">Electrical</option>
                  <option value="tires">Tires</option>
                  <option value="glass">Glass</option>
                  <option value="other">Other</option>
                </select>
              </label>
            </div>
            <label className="flex flex-col gap-1 text-xs">
              <span className="font-medium text-neutral-700">Discovered date</span>
              <input
                name="discovered_at"
                type="date"
                defaultValue={new Date().toISOString().split('T')[0]}
                className="rounded-lg border border-neutral-300 bg-white px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-neutral-400"
              />
            </label>
            <label className="flex flex-col gap-1 text-xs">
              <span className="font-medium text-neutral-700">Description</span>
              <textarea name="description" rows={2} className="rounded-lg border border-neutral-300 bg-white px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-neutral-400" />
            </label>
            <label className="flex flex-col gap-1 text-xs">
              <span className="font-medium text-neutral-700">Repair cost (USD)</span>
              <input name="repair_cost_dollars" type="number" min={0} step="0.01" placeholder="0.00" className="rounded-lg border border-neutral-300 bg-white px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-neutral-400" />
            </label>
            <label className="flex flex-col gap-1 text-xs">
              <span className="font-medium text-neutral-700">Photos</span>
              <input
                ref={fileRef}
                name="photos"
                type="file"
                multiple
                accept="image/*"
                className="text-xs text-neutral-600 file:mr-2 file:rounded-full file:border file:border-neutral-300 file:bg-white file:px-3 file:py-1 file:text-xs file:font-semibold hover:file:bg-neutral-50"
              />
            </label>
            {error && <p className="text-xs text-red-600">{error}</p>}
            <button type="submit" disabled={isPending} className="rounded-full bg-neutral-900 px-4 py-1.5 text-xs font-semibold text-white disabled:opacity-60 hover:bg-neutral-800 transition">
              {isPending ? 'Saving…' : 'Log damage'}
            </button>
          </form>
        </InlineFormPanel>
      )}

      {localDamages.length === 0 ? (
        <p className="text-sm text-neutral-400">No damage reports on file.</p>
      ) : (
        <ul className="divide-y divide-neutral-100 -mx-2">
          {localDamages.map((d) => (
            <li key={d.id} className="px-2 py-2.5">
              <div className="flex items-start justify-between gap-2">
                <p className="text-sm font-medium text-neutral-900 truncate">{d.title}</p>
                <span className={`shrink-0 rounded-full border px-2 py-0.5 text-[0.65rem] font-semibold capitalize ${severityColors[d.severity]}`}>
                  {d.severity}
                </span>
              </div>
              {d.description && <p className="mt-0.5 text-xs text-neutral-500 line-clamp-2">{d.description}</p>}
              <div className="mt-1 flex flex-wrap gap-2 text-[0.7rem] text-neutral-500">
                <span className="capitalize">{d.category}</span>
                <span>·</span>
                <span>{new Date(d.discovered_at).toLocaleDateString()}</span>
                {d.repair_cost_cents != null && (
                  <>
                    <span>·</span>
                    <span>${(d.repair_cost_cents / 100).toFixed(0)}</span>
                  </>
                )}
                <span>·</span>
                <span className="capitalize">{d.repair_status.replace('_', ' ')}</span>
              </div>
              {d.photos.length > 0 && (
                <div className="mt-2 flex gap-1.5 flex-wrap">
                  {d.photos.slice(0, 3).map((url, i) => (
                    <img
                      key={i}
                      src={url}
                      alt=""
                      className="h-12 w-12 rounded-md object-cover border border-neutral-200"
                    />
                  ))}
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </DashCard>
  )
}

// ─── Quotes card ─────────────────────────────────────────────────────────────

function QuotesCard({
  quotes,
  tasks,
  listingId: _listingId,
}: {
  quotes: MechanicQuote[]
  tasks: VehicleMaintenanceTask[]
  listingId: string
}) {
  const [isPending, startTransition] = useTransition()
  const [localQuotes, setLocalQuotes] = useState(quotes)
  const [messageTaskId, setMessageTaskId] = useState<string | null>(null)
  const [messageDraft, setMessageDraft] = useState('')
  const [messageQuoteId, setMessageQuoteId] = useState<string | null>(null)

  const taskMap = new Map(tasks.map((t) => [t.id, t]))

  function handleAccept(quoteId: string) {
    startTransition(async () => {
      await acceptQuote(quoteId)
      setLocalQuotes((prev) =>
        prev.map((q) =>
          q.id === quoteId
            ? { ...q, status: 'accepted' }
            : q.status === 'pending' && q.task_id === prev.find((x) => x.id === quoteId)?.task_id
            ? { ...q, status: 'declined' }
            : q
        )
      )
    })
  }

  function handleDecline(quoteId: string) {
    startTransition(async () => {
      await declineQuote(quoteId)
      setLocalQuotes((prev) => prev.map((q) => q.id === quoteId ? { ...q, status: 'declined' } : q))
    })
  }

  async function handleSendMessage(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!messageDraft.trim() || !messageTaskId) return
    const result = await sendMessage(messageTaskId, messageDraft.trim(), messageQuoteId ?? undefined)
    if (!result.error) setMessageDraft('')
  }

  const pendingQuotes = localQuotes.filter((q) => q.status === 'pending')
  const otherQuotes = localQuotes.filter((q) => q.status !== 'pending')

  return (
    <DashCard
      title="Mechanic Quotes"
      Icon={Star}
      count={localQuotes.length}
    >
      {localQuotes.length === 0 ? (
        <p className="text-sm text-neutral-400">
          No quotes received yet. Toggle tasks as public to mechanics to attract bids.
        </p>
      ) : (
        <ul className="space-y-3">
          {[...pendingQuotes, ...otherQuotes].map((q) => {
            const task = taskMap.get(q.task_id)
            const mech = q.mechanic_profiles
            return (
              <li
                key={q.id}
                className={`rounded-xl border bg-white p-3 ${q.status === 'accepted' ? 'border-emerald-200 bg-emerald-50/40' : 'border-neutral-200'}`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    {task && (
                      <p className="text-[0.65rem] uppercase tracking-wide text-neutral-500 mb-0.5 truncate">
                        {task.title}
                      </p>
                    )}
                    <div className="flex items-baseline gap-2">
                      <p className="font-sans text-lg font-bold text-neutral-900">
                        ${(q.amount_cents / 100).toFixed(0)}
                      </p>
                      {q.estimated_duration_hours && (
                        <span className="text-xs text-neutral-500">· {q.estimated_duration_hours}h</span>
                      )}
                    </div>
                    {mech && (
                      <p className="mt-0.5 text-xs text-neutral-700 truncate">
                        {mech.business_name || mech.display_name}
                        {mech.is_verified && (
                          <span className="ml-1 inline-flex items-center gap-0.5 rounded-full bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 text-[0.6rem] text-emerald-700">
                            <Check className="h-2.5 w-2.5" />Verified
                          </span>
                        )}
                        {mech.avg_rating && (
                          <span className="ml-1.5 text-[0.65rem] text-neutral-500">★ {mech.avg_rating.toFixed(1)}</span>
                        )}
                      </p>
                    )}
                    {q.earliest_available_date && (
                      <p className="text-[0.7rem] text-neutral-500 mt-0.5">
                        Available from {new Date(q.earliest_available_date).toLocaleDateString()}
                      </p>
                    )}
                  </div>
                  <span className={`shrink-0 rounded-full px-2 py-0.5 text-[0.65rem] font-semibold capitalize ${
                    q.status === 'accepted' ? 'bg-emerald-50 text-emerald-700' :
                    q.status === 'pending' ? 'bg-amber-50 text-amber-700' :
                    'bg-neutral-100 text-neutral-500'
                  }`}>
                    {q.status}
                  </span>
                </div>
                {q.notes && <p className="mt-2 text-xs text-neutral-600 line-clamp-2">{q.notes}</p>}
                {q.status === 'pending' && (
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    <button
                      onClick={() => handleAccept(q.id)}
                      disabled={isPending}
                      className="rounded-full bg-neutral-900 px-3 py-1 text-[0.7rem] font-semibold text-white hover:bg-neutral-800 disabled:opacity-60 transition"
                    >
                      Accept
                    </button>
                    <button
                      onClick={() => handleDecline(q.id)}
                      disabled={isPending}
                      className="rounded-full border border-neutral-300 px-3 py-1 text-[0.7rem] font-semibold text-neutral-700 hover:bg-neutral-50 disabled:opacity-60 transition"
                    >
                      Decline
                    </button>
                    <button
                      onClick={() => { setMessageTaskId(q.task_id); setMessageQuoteId(q.id) }}
                      className="inline-flex items-center gap-1 rounded-full border border-neutral-300 px-3 py-1 text-[0.7rem] font-semibold text-neutral-700 hover:bg-neutral-50 transition"
                    >
                      <MessageSquare className="h-2.5 w-2.5" />
                      Message
                    </button>
                  </div>
                )}
              </li>
            )
          })}
        </ul>
      )}

      {messageTaskId && (
        <div className="mt-4 rounded-xl bg-neutral-50 border border-neutral-200 p-3">
          <div className="flex items-center justify-between mb-2">
            <h4 className="font-sans text-xs font-bold uppercase tracking-wide text-neutral-900">Message mechanic</h4>
            <button onClick={() => setMessageTaskId(null)} className="text-neutral-400 hover:text-neutral-600 transition">
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
          <form onSubmit={handleSendMessage} className="flex gap-2">
            <input
              value={messageDraft}
              onChange={(e) => setMessageDraft(e.target.value)}
              placeholder="Type a message…"
              className="flex-1 rounded-full border border-neutral-300 bg-white px-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-neutral-400"
            />
            <button type="submit" className="flex h-7 w-7 items-center justify-center rounded-full bg-neutral-900 text-white hover:bg-neutral-800 transition">
              <Send className="h-3 w-3" />
            </button>
          </form>
        </div>
      )}
    </DashCard>
  )
}

// ─── Root component ──────────────────────────────────────────────────────────

export type MechanicQuote = {
  id: string
  task_id: string
  mechanic_id: string
  amount_cents: number
  estimated_duration_hours: number | null
  earliest_available_date: string | null
  notes: string | null
  status: string
  created_at: string
  mechanic_profiles?: {
    display_name: string
    business_name: string | null
    is_verified: boolean
    avg_rating: number | null
  } | null
}

export type HealthDetailClientProps = {
  listingId: string
  profile: VehicleProfile | null
  mileageLogs: VehicleMileageLog[]
  tasks: VehicleMaintenanceTask[]
  damages: VehicleDamageReport[]
  unclaimedExternalBlocks: ExternalBlock[]
  totalTripCount: number
  quotes?: MechanicQuote[]
}

export default function HealthDetailClient({
  listingId,
  profile,
  mileageLogs,
  tasks,
  damages,
  unclaimedExternalBlocks,
  totalTripCount,
  quotes = [],
}: HealthDetailClientProps) {
  return (
    <div className="mt-5 space-y-4">
      {/* Total trip counter */}
      {totalTripCount > 0 && (
        <div className="inline-flex items-center gap-1.5 rounded-full bg-neutral-100 px-3 py-1 text-xs font-medium text-neutral-600">
          <Calendar className="h-3.5 w-3.5" />
          {totalTripCount} total trips (platform + synced calendar)
        </div>
      )}

      {/* Dashboard grid — 2 cards per row at lg+, 1 per row on smaller screens */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <MileageCard
          profile={profile}
          logs={mileageLogs}
          unclaimedExternalBlocks={unclaimedExternalBlocks}
          listingId={listingId}
        />
        <MaintenanceCard tasks={tasks} listingId={listingId} />
        <DamageCard damages={damages} listingId={listingId} />
        <QuotesCard quotes={quotes} tasks={tasks} listingId={listingId} />
      </div>
    </div>
  )
}
