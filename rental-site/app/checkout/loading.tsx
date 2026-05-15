export default function CheckoutLoading() {
  return (
    <div className="min-h-screen bg-cream-100 px-4 py-16 animate-pulse">
      <div className="max-w-4xl mx-auto lg:grid lg:grid-cols-[1fr_22rem] lg:gap-10">
        {/* Checkout form area */}
        <div className="space-y-6">
          <div className="h-8 w-48 rounded-xl bg-cream-300/60" />
          <div className="rounded-2xl border border-cream-300/50 bg-white p-6 space-y-4">
            <div className="h-5 w-40 rounded bg-cream-300/60" />
            <div className="h-10 rounded-lg bg-cream-200/70" />
            <div className="h-10 rounded-lg bg-cream-200/70" />
          </div>
          <div className="rounded-2xl border border-cream-300/50 bg-white p-6 h-52 bg-cream-200/40" />
        </div>
        {/* Summary panel */}
        <div className="hidden lg:block">
          <div className="rounded-2xl border border-cream-300/50 bg-white p-6 space-y-4">
            <div className="h-5 w-32 rounded bg-cream-300/60" />
            <div className="h-32 w-full rounded-xl bg-cream-200/70" />
            <div className="space-y-2">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex justify-between">
                  <div className="h-4 w-24 rounded bg-cream-300/60" />
                  <div className="h-4 w-16 rounded bg-cream-300/60" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
