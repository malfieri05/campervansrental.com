import HostEditorShell from '../HostEditorShell'
import HostTipCard from '../HostTipCard'
import { TIP_IMAGES } from '../tipImages'
import { Card, SectionDivider, Field, Toggle, labelCls, inputCls } from '../formPrimitives'

interface DeliveryStepProps {
  deliveryOffered: boolean; setDeliveryOffered: (v: boolean) => void
  deliveryRadiusMiles: number | ''; setDeliveryRadiusMiles: (v: number | '') => void
  deliveryFeeCents: number | ''; setDeliveryFeeCents: (v: number | '') => void
  deliveryPerMileCents: number; setDeliveryPerMileCents: (v: number) => void
  allowGuestDriving: boolean; setAllowGuestDriving: (v: boolean) => void
  oneWayOk: boolean; setOneWayOk: (v: boolean) => void
  // For the map tip callout
  addressStreet: string
  addressCity: string
  addressState: string
  addressZip: string
}

function MapPlaceholder() {
  return (
    <div className="relative aspect-[4/3] w-full overflow-hidden rounded-xl border border-neutral-200 bg-neutral-100">
      <div className="flex h-full flex-col items-center justify-center gap-2 text-neutral-400">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="h-10 w-10">
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 6.75V15m6-6v8.25m.503 3.498 4.875-2.437c.381-.19.622-.58.622-1.006V4.82c0-.836-.88-1.38-1.628-1.006l-3.869 1.934c-.317.159-.69.159-1.006 0L9.503 3.252a1.125 1.125 0 0 0-1.006 0L3.622 5.689C3.24 5.88 3 6.27 3 6.695V19.18c0 .836.88 1.38 1.628 1.006l3.869-1.934c.317-.159.69-.159 1.006 0l4.994 2.497c.317.158.69.158 1.006 0Z" />
        </svg>
        <span className="text-sm font-medium">Map preview</span>
        <span className="text-xs text-neutral-400">Set your address on the Details tab to see delivery range</span>
      </div>
    </div>
  )
}

export default function DeliveryStep(p: DeliveryStepProps) {
  const addressParts = [p.addressStreet, p.addressCity, p.addressState, p.addressZip].filter(Boolean)
  const hasAddress = addressParts.length > 0

  const radiusMiles = typeof p.deliveryRadiusMiles === 'number' ? p.deliveryRadiusMiles : 50

  const tip = (
    <HostTipCard
      imageSrc={TIP_IMAGES.delivery}
      imageAlt="Campervan being driven on an open road"
      body={
        <>
          <p>
            Your delivery radius is measured from your pickup address.
            {hasAddress && (
              <>
                {' '}The delivery range is{' '}
                <strong>{radiusMiles} miles</strong> from{' '}
                <span className="font-medium">{addressParts.join(', ')}</span>.
              </>
            )}
          </p>
          <p className="mt-2">
            Offering delivery to a guest&apos;s preferred location — an airport, campground, or
            neighbourhood — can dramatically expand your booking reach without extra effort.
          </p>
        </>
      }
    />
  )

  const main = (
    <div className="space-y-5">
      <Card>
        <h2 className="text-base font-semibold text-neutral-900 mb-4">Vehicle usage</h2>

        <div className="space-y-4">
          <Toggle
            label="Allow guests to drive your vehicle"
            description="Guests can pick up and drive the van themselves."
            value={p.allowGuestDriving}
            onChange={p.setAllowGuestDriving}
          />
          <Toggle
            label="Provide delivery and set-up of your vehicle"
            description="You deliver and position the van at the guest's location."
            value={p.deliveryOffered}
            onChange={p.setDeliveryOffered}
          />
          <Toggle
            label="Allow one-way rentals"
            description="Guest picks up at one location and drops off at another."
            value={p.oneWayOk}
            onChange={p.setOneWayOk}
          />
        </div>
      </Card>

      {p.deliveryOffered && (
        <Card>
          <h2 className="text-base font-semibold text-neutral-900 mb-4">Delivery charges</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className={labelCls}>Minimum delivery fee ($)</label>
              <input
                type="number"
                min="0"
                className={inputCls}
                value={p.deliveryFeeCents === '' ? '' : Math.round(Number(p.deliveryFeeCents) / 100)}
                onChange={(e) =>
                  p.setDeliveryFeeCents(e.target.value ? Math.round(Number(e.target.value) * 100) : '')
                }
                placeholder="e.g. 75"
              />
            </div>
            <div>
              <label className={labelCls}>Distance — one way (miles)</label>
              <input
                type="number"
                min="0"
                className={inputCls}
                value={p.deliveryRadiusMiles === '' ? '' : p.deliveryRadiusMiles}
                onChange={(e) =>
                  p.setDeliveryRadiusMiles(e.target.value ? Number(e.target.value) : '')
                }
                placeholder="e.g. 50"
              />
            </div>
            <div>
              <label className={labelCls}>Per mile fee — one way ($ / mile)</label>
              <input
                type="number"
                min="0"
                step="0.25"
                className={inputCls}
                value={p.deliveryPerMileCents / 100 || ''}
                onChange={(e) =>
                  p.setDeliveryPerMileCents(e.target.value ? Math.round(Number(e.target.value) * 100) : 0)
                }
                placeholder="e.g. 3.00"
              />
            </div>
          </div>
        </Card>
      )}

      <MapPlaceholder />
    </div>
  )

  return <HostEditorShell main={main} tip={tip} />
}
