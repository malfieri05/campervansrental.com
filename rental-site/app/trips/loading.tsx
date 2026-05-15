function TripCardSkeleton() {
  return (
    <div className="rounded-xl border border-neutral-200 bg-white p-5 shadow-sm animate-pulse">
      <div className="flex gap-4">
        <div className="h-20 w-28 shrink-0 rounded-xl bg-cream-200/70" />
        <div className="flex-1 space-y-2">
          <div className="h-5 w-1/2 rounded-lg bg-cream-300/60" />
          <div className="h-4 w-1/3 rounded bg-cream-200/70" />
          <div className="h-4 w-2/5 rounded bg-cream-200/70" />
        </div>
      </div>
    </div>
  )
}

export default function TripsLoading() {
  return (
    <div className="min-h-screen bg-cream-100 px-4 sm:px-6 py-10 sm:py-14">
      <div className="max-w-3xl mx-auto">
        {/* Tab bar */}
        <div className="mb-8 flex gap-3 animate-pulse">
          <div className="h-9 w-24 rounded-full bg-cream-300/60" />
          <div className="h-9 w-24 rounded-full bg-cream-200/70" />
        </div>
        {/* Trip cards */}
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <TripCardSkeleton key={i} />
          ))}
        </div>
      </div>
    </div>
  )
}
