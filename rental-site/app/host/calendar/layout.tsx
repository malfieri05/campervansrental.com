/**
 * Lock the calendar shell to the viewport below the fixed navbar (pt-20 = 5rem).
 * Only the schedule grid scrolls; the page body does not grow with calendar months.
 */
export default function HostCalendarLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-[calc(100dvh-5rem)] max-h-[calc(100dvh-5rem)] flex-col overflow-hidden">
      <div className="flex min-h-0 flex-1 flex-col">{children}</div>
    </div>
  )
}
