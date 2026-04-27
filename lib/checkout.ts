/** Half-open range [start, end) overlap for ISO date strings yyyy-MM-dd */
export function dateRangesOverlapHalfOpen(
  aStart: string,
  aEnd: string,
  bStart: string,
  bEnd: string
): boolean {
  const as = new Date(aStart).getTime()
  const ae = new Date(aEnd).getTime()
  const bs = new Date(bStart).getTime()
  const be = new Date(bEnd).getTime()
  return as < be && bs < ae
}
