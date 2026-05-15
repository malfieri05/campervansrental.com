export default function HostCalendarLoading() {
  return (
    <div className="flex h-[calc(100vh-5rem)] bg-cream-100 animate-pulse">
      {/* Sidebar */}
      <div className="hidden lg:flex flex-col gap-4 w-64 shrink-0 border-r border-cream-300/50 bg-white p-4">
        <div className="h-6 w-32 rounded-lg bg-cream-300/60" />
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-12 rounded-xl bg-cream-200/60" />
        ))}
      </div>
      {/* Calendar grid */}
      <div className="flex-1 p-4 space-y-3">
        <div className="flex justify-between items-center mb-6">
          <div className="h-7 w-40 rounded-lg bg-cream-300/60" />
          <div className="flex gap-2">
            <div className="h-9 w-9 rounded-full bg-cream-300/60" />
            <div className="h-9 w-9 rounded-full bg-cream-300/60" />
          </div>
        </div>
        <div className="grid grid-cols-7 gap-1">
          {Array.from({ length: 35 }).map((_, i) => (
            <div key={i} className="h-16 rounded-lg bg-cream-200/60" />
          ))}
        </div>
      </div>
    </div>
  )
}
