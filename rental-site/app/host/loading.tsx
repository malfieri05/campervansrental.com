export default function HostLoading() {
  return (
    <div className="min-h-screen bg-cream-100 px-4 sm:px-6 py-10 sm:py-14 animate-pulse">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="h-8 w-40 rounded-xl bg-cream-300/60" />
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="rounded-2xl border border-cream-300/50 bg-white p-6 space-y-2">
              <div className="h-4 w-20 rounded bg-cream-300/60" />
              <div className="h-8 w-16 rounded bg-cream-200/70" />
            </div>
          ))}
        </div>
        <div className="rounded-2xl border border-cream-300/50 bg-white p-6 space-y-4">
          <div className="h-5 w-32 rounded bg-cream-300/60" />
          {[1, 2].map((i) => (
            <div key={i} className="h-16 rounded-xl bg-cream-200/60" />
          ))}
        </div>
      </div>
    </div>
  )
}
