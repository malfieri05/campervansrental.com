function BookingRowSkeleton() {
  return (
    <div className="rounded-xl border border-neutral-200 bg-white p-5 shadow-sm animate-pulse">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex-1 space-y-3">
          <div className="flex items-center gap-3">
            <div className="h-5 w-24 rounded-full bg-cream-300/60" />
            <div className="h-5 w-32 rounded bg-cream-200/70" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="h-12 rounded-lg bg-cream-200/60" />
            <div className="h-12 rounded-lg bg-cream-200/60" />
            <div className="h-12 rounded-lg bg-cream-200/60" />
          </div>
        </div>
      </div>
    </div>
  )
}

export default function HostBookingsLoading() {
  return (
    <div className="min-h-screen bg-cream-100 px-4 sm:px-6 py-10 sm:py-14">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8 animate-pulse">
          <div className="h-8 w-32 rounded-xl bg-cream-300/60" />
        </div>
        {/* Status tabs */}
        <div className="flex gap-2 mb-6 animate-pulse">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-9 w-24 rounded-full bg-cream-300/60" />
          ))}
        </div>
        {/* Rows */}
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <BookingRowSkeleton key={i} />
          ))}
        </div>
      </div>
    </div>
  )
}
