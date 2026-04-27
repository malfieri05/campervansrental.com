/**
 * Two-column layout shell used inside every wizard tab:
 *   - main (left/full width on mobile)
 *   - optional tip card (right, sticky on desktop)
 */
export default function HostEditorShell({
  main,
  tip,
}: {
  main: React.ReactNode
  tip?: React.ReactNode
}) {
  if (!tip) {
    return <div>{main}</div>
  }

  return (
    <div className="grid grid-cols-1 gap-8 lg:grid-cols-[1fr_300px]">
      <div className="min-w-0">{main}</div>
      <div className="lg:sticky lg:top-6 lg:self-start">{tip}</div>
    </div>
  )
}
