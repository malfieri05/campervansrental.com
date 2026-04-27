/** Shared micro-components used across all wizard step files. */
export const labelCls =
  'block text-[0.7rem] font-bold uppercase tracking-[0.12em] text-neutral-500 mb-1.5'

export const inputCls =
  'w-full rounded-lg border border-neutral-200 bg-white px-3 py-2.5 text-sm text-neutral-900 placeholder-neutral-400 focus:border-neutral-900 focus:outline-none focus:ring-1 focus:ring-neutral-900/20 transition-colors'

export function Card({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`rounded-xl border border-neutral-200 bg-white p-5 shadow-sm ${className}`}>
      {children}
    </div>
  )
}

export function SectionDivider({ title, className = '' }: { title?: string; className?: string }) {
  return (
    <div className={`flex items-center gap-3 border-t border-neutral-200 pt-4 ${className}`}>
      {title && (
        <span className="shrink-0 text-[0.7rem] font-bold uppercase tracking-[0.12em] text-neutral-500">
          {title}
        </span>
      )}
      {title && <div className="h-px flex-1 bg-neutral-200" />}
    </div>
  )
}

export function Field({
  label,
  value,
  onChange,
  placeholder,
  type = 'text',
}: {
  label: string
  value: string
  onChange: (v: string) => void
  placeholder?: string
  type?: string
}) {
  return (
    <div>
      <label className={labelCls}>{label}</label>
      <input
        type={type}
        className={inputCls}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
      />
    </div>
  )
}

export function Toggle({
  label,
  description,
  value,
  onChange,
}: {
  label: string
  description?: string
  value: boolean
  onChange: (v: boolean) => void
}) {
  return (
    <label className="flex cursor-pointer items-start gap-3">
      <div
        role="checkbox"
        aria-checked={value}
        tabIndex={0}
        onClick={() => onChange(!value)}
        onKeyDown={(e) => (e.key === ' ' || e.key === 'Enter') && onChange(!value)}
        className={[
          'relative mt-0.5 h-5 w-9 shrink-0 rounded-full transition-colors duration-200 focus:outline-none',
          value ? 'bg-emerald-500' : 'bg-neutral-300',
        ].join(' ')}
      >
        <span
          className={[
            'absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform duration-200',
            value ? 'translate-x-4' : 'translate-x-0.5',
          ].join(' ')}
        />
      </div>
      <div>
        <p className="text-sm font-medium text-neutral-900">{label}</p>
        {description && <p className="mt-0.5 text-xs text-neutral-500">{description}</p>}
      </div>
    </label>
  )
}

export function ReviewRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4 py-1">
      <dt className="shrink-0 text-neutral-500">{label}</dt>
      <dd className="text-right font-medium text-neutral-900">{value}</dd>
    </div>
  )
}
