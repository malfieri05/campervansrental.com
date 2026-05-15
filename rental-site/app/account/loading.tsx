export default function AccountLoading() {
  return (
    <div className="min-h-screen bg-cream-100 px-4 py-16 sm:py-24 animate-pulse">
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="h-8 w-48 rounded-lg bg-cream-300/60" />
        <div className="rounded-2xl border border-cream-300/50 bg-white p-6 space-y-4">
          <div className="h-5 w-32 rounded bg-cream-300/60" />
          <div className="grid grid-cols-2 gap-4">
            <div className="h-10 rounded-lg bg-cream-200/70" />
            <div className="h-10 rounded-lg bg-cream-200/70" />
            <div className="h-10 rounded-lg bg-cream-200/70" />
            <div className="h-10 rounded-lg bg-cream-200/70" />
          </div>
        </div>
        <div className="rounded-2xl border border-cream-300/50 bg-white p-6 space-y-4">
          <div className="h-5 w-40 rounded bg-cream-300/60" />
          <div className="h-24 rounded-lg bg-cream-200/70" />
        </div>
        <div className="rounded-2xl border border-cream-300/50 bg-white p-6 space-y-4">
          <div className="h-5 w-36 rounded bg-cream-300/60" />
          <div className="h-10 rounded-lg bg-cream-200/70" />
        </div>
      </div>
    </div>
  )
}
