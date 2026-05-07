/**
 * iCal sync utilities — server-side only (Node.js).
 * Parses an iCal feed URL and returns half-open date intervals [start, end).
 *
 * Note:
 * - We intentionally avoid node-ical here because newer node-ical releases use
 *   regex flags not supported by this Next.js toolchain during compile.
 * - This parser is purpose-built for availability sync (VEVENT DTSTART/DTEND).
 * - RRULE master events are skipped in this MVP.
 */

type BusyInterval = {
  start: string // yyyy-MM-dd
  end: string   // yyyy-MM-dd (exclusive / half-open)
  summary: string
}

/** Fetch and parse an iCal URL; returns busy intervals as half-open [start, end) date pairs. */
export async function fetchICalBusyIntervals(url: string): Promise<BusyInterval[]> {
  let rawText: string
  try {
    const res = await fetch(url, { cache: 'no-store' })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    rawText = await res.text()
  } catch (err) {
    throw new Error(`Failed to fetch iCal feed: ${err instanceof Error ? err.message : String(err)}`)
  }

  const unfolded = unfoldICalLines(rawText)
  const events = parseVEventBlocks(unfolded)

  const intervals: BusyInterval[] = []
  for (const ev of events) {
    // Skip RRULE masters; external providers commonly emit expanded instances.
    if (ev.hasRRule) continue
    if (!ev.startDate) continue

    const startStr = ev.startDate
    let endStr = ev.endDate ?? addOneDay(startStr)
    if (endStr <= startStr) endStr = addOneDay(startStr)

    intervals.push({
      start: startStr,
      end: endStr,
      summary: ev.summary || 'Busy',
    })
  }

  return intervals
}

function unfoldICalLines(input: string): string[] {
  const normalized = input.replace(/\r\n/g, '\n').replace(/\r/g, '\n')
  const raw = normalized.split('\n')
  const out: string[] = []
  for (const line of raw) {
    if ((line.startsWith(' ') || line.startsWith('\t')) && out.length > 0) {
      out[out.length - 1] += line.slice(1)
    } else {
      out.push(line)
    }
  }
  return out
}

type ParsedEvent = {
  startDate: string | null
  endDate: string | null
  summary: string | null
  hasRRule: boolean
}

function parseVEventBlocks(lines: string[]): ParsedEvent[] {
  const events: ParsedEvent[] = []
  let inEvent = false
  let eventLines: string[] = []

  for (const line of lines) {
    if (line === 'BEGIN:VEVENT') {
      inEvent = true
      eventLines = []
      continue
    }
    if (line === 'END:VEVENT') {
      if (inEvent) events.push(parseEvent(eventLines))
      inEvent = false
      eventLines = []
      continue
    }
    if (inEvent) eventLines.push(line)
  }
  return events
}

function parseEvent(lines: string[]): ParsedEvent {
  let startDate: string | null = null
  let endDate: string | null = null
  let summary: string | null = null
  let hasRRule = false

  for (const line of lines) {
    if (line.startsWith('RRULE')) {
      hasRRule = true
      continue
    }
    if (line.startsWith('SUMMARY')) {
      summary = parseContentValue(line)
      continue
    }
    if (line.startsWith('DTSTART')) {
      startDate = parseICalDateToYMD(parseContentValue(line))
      continue
    }
    if (line.startsWith('DTEND')) {
      endDate = parseICalDateToYMD(parseContentValue(line))
      continue
    }
  }

  return { startDate, endDate, summary, hasRRule }
}

function parseContentValue(line: string): string {
  const idx = line.indexOf(':')
  if (idx === -1) return ''
  return line.slice(idx + 1).trim()
}

function parseICalDateToYMD(v: string): string | null {
  // Supports DATE (YYYYMMDD) and DATE-TIME (YYYYMMDDTHHmmssZ / floating).
  const m = v.match(/^(\d{4})(\d{2})(\d{2})/)
  if (!m) return null
  return `${m[1]}-${m[2]}-${m[3]}`
}

function addOneDay(ymd: string): string {
  const d = new Date(`${ymd}T12:00:00`)
  d.setDate(d.getDate() + 1)
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}
