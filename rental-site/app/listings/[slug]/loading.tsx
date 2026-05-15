export default function ListingDetailLoading() {
  return (
    <div className="min-h-screen bg-cream-100 animate-pulse">
      {/* Gallery */}
      <div className="w-full max-w-[88rem] mx-auto px-4 sm:px-6 pt-8">
        <div className="h-72 sm:h-96 rounded-2xl bg-cream-300/50" />
      </div>

      {/* Body */}
      <div className="max-w-7xl mx-auto px-6 lg:px-10 pb-16 pt-8">
        <div className="lg:grid lg:grid-cols-[1fr_22rem] lg:gap-10">
          {/* Left column */}
          <div className="space-y-6">
            <div className="h-8 w-2/3 rounded-xl bg-cream-300/60" />
            <div className="h-5 w-1/3 rounded-lg bg-cream-200/70" />
            <div className="space-y-2">
              {[100, 90, 80, 95, 70].map((w, i) => (
                <div key={i} className={`h-4 rounded bg-cream-200/70`} style={{ width: `${w}%` }} />
              ))}
            </div>
          </div>
          {/* Right column (booking card) */}
          <div className="hidden lg:block">
            <div className="rounded-2xl border border-cream-300/50 bg-white p-6 space-y-4">
              <div className="h-8 w-1/2 rounded-lg bg-cream-300/60" />
              <div className="h-10 rounded-lg bg-cream-200/70" />
              <div className="h-10 rounded-lg bg-cream-200/70" />
              <div className="h-12 rounded-full bg-gold-400/30" />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
