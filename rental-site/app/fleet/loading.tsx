function VanCardSkeleton() {
  return (
    <div className="rounded-2xl border border-cream-300/50 bg-white overflow-hidden shadow-luxury-sm animate-pulse">
      <div className="h-52 bg-cream-200/70" />
      <div className="p-5 space-y-3">
        <div className="h-5 w-3/4 rounded-lg bg-cream-300/60" />
        <div className="h-4 w-1/2 rounded-lg bg-cream-200/70" />
        <div className="flex justify-between items-center pt-2">
          <div className="h-6 w-24 rounded-lg bg-cream-300/60" />
          <div className="h-9 w-28 rounded-full bg-gold-400/30" />
        </div>
      </div>
    </div>
  )
}

export default function FleetLoading() {
  return (
    <div className="min-h-screen bg-cream-100 px-4 sm:px-6 py-10">
      <div className="max-w-7xl mx-auto">
        {/* Filter bar skeleton */}
        <div className="mb-8 flex gap-3 animate-pulse">
          <div className="h-10 w-32 rounded-full bg-cream-300/60" />
          <div className="h-10 w-32 rounded-full bg-cream-300/60" />
          <div className="h-10 w-32 rounded-full bg-cream-300/60" />
        </div>
        {/* Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <VanCardSkeleton key={i} />
          ))}
        </div>
      </div>
    </div>
  )
}
