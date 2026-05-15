/** Root loading skeleton — shown on first navigation to `/` while listings load. */
export default function HomeLoading() {
  return (
    <div className="min-h-screen bg-cream-100 animate-pulse">
      {/* Hero placeholder */}
      <div className="relative -mt-20 min-h-screen bg-forest-950/20 flex flex-col items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="h-10 w-64 rounded-xl bg-cream-300/30" />
          <div className="h-14 w-80 rounded-xl bg-cream-300/30" />
          <div className="h-10 w-64 rounded-xl bg-cream-300/30" />
          <div className="mt-6 h-12 w-40 rounded-full bg-gold-400/30" />
        </div>
        {/* Booking bar placeholder */}
        <div className="absolute bottom-9 left-6 right-6">
          <div className="max-w-5xl mx-auto h-20 rounded-2xl bg-white/20 shadow-luxury" />
        </div>
      </div>
    </div>
  )
}
