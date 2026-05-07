export type FeedColorTheme = {
  dotClass: string
  barClass: string
}

// Keep first color teal to align with Outdoorsy visual expectation.
const FEED_COLOR_THEMES: FeedColorTheme[] = [
  {
    dotClass: 'bg-teal-400',
    barClass: 'bg-teal-50 border-l-2 border-teal-500 text-teal-900',
  },
  {
    dotClass: 'bg-violet-400',
    barClass: 'bg-violet-50 border-l-2 border-violet-500 text-violet-900',
  },
  {
    dotClass: 'bg-rose-400',
    barClass: 'bg-rose-50 border-l-2 border-rose-500 text-rose-900',
  },
  {
    dotClass: 'bg-cyan-500',
    barClass: 'bg-cyan-50 border-l-2 border-cyan-600 text-cyan-950',
  },
  {
    dotClass: 'bg-fuchsia-400',
    barClass: 'bg-fuchsia-50 border-l-2 border-fuchsia-500 text-fuchsia-900',
  },
  {
    dotClass: 'bg-lime-500',
    barClass: 'bg-lime-50 border-l-2 border-lime-600 text-lime-950',
  },
  {
    dotClass: 'bg-orange-400',
    barClass: 'bg-orange-50 border-l-2 border-orange-500 text-orange-950',
  },
  {
    dotClass: 'bg-indigo-400',
    barClass: 'bg-indigo-50 border-l-2 border-indigo-500 text-indigo-900',
  },
]

/** Tailwind JIT: allow feed theme classes used via getFeedColorTheme(). */
export const CALENDAR_FEED_COLOR_SAFELIST: string[] = (() => {
  const out = new Set<string>()
  for (const t of FEED_COLOR_THEMES) {
    for (const c of t.dotClass.split(/\s+/)) if (c) out.add(c)
    for (const c of t.barClass.split(/\s+/)) if (c) out.add(c)
  }
  return Array.from(out)
})()

export function getFeedColorTheme(index: number): FeedColorTheme {
  return FEED_COLOR_THEMES[index % FEED_COLOR_THEMES.length]
}
