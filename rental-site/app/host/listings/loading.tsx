function ListingRowSkeleton() {
  return (
    <div className="flex items-center gap-4 rounded-xl border border-neutral-200 bg-white p-4 shadow-sm animate-pulse">
      <div className="h-16 w-20 shrink-0 rounded-xl bg-cream-200/70" />
      <div className="flex-1 space-y-2">
        <div className="h-5 w-1/2 rounded-lg bg-cream-300/60" />
        <div className="h-4 w-1/3 rounded bg-cream-200/70" />
      </div>
      <div className="h-9 w-20 rounded-full bg-cream-300/60" />
    </div>
  )
}

export default function HostListingsLoading() {
  return (
    <div className="min-h-screen bg-cream-100 px-4 sm:px-6 py-10 sm:py-14">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8 flex items-center justify-between animate-pulse">
          <div className="h-8 w-32 rounded-xl bg-cream-300/60" />
          <div className="h-10 w-36 rounded-full bg-gold-400/30" />
        </div>
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <ListingRowSkeleton key={i} />
          ))}
        </div>
      </div>
    </div>
  )
}
