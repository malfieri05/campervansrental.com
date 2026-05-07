/**
 * Centers monogram initials inside a fixed circle. Parent should be
 * `grid grid-cols-1 grid-rows-1` with explicit h/w (e.g. h-10 w-10).
 */
export function ProfileInitialsContent({
  initials,
  textClassName = '',
}: {
  initials: string
  textClassName?: string
}) {
  const label = (initials.trim().slice(0, 2) || 'U').toUpperCase()

  return (
    <span className="col-span-full row-span-full flex min-h-0 min-w-0 items-center justify-center">
      <span
        className={[
          'text-center text-xs font-bold uppercase leading-none tracking-normal select-none',
          textClassName,
        ]
          .filter(Boolean)
          .join(' ')}
      >
        {label}
      </span>
    </span>
  )
}
