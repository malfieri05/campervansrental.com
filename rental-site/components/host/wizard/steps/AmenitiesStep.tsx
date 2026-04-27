import HostEditorShell from '../HostEditorShell'
import HostTipCard from '../HostTipCard'
import { TIP_IMAGES } from '../tipImages'
import { Card } from '../formPrimitives'

export type AmenityItem = { icon: string; label: string }

type CategoryGroup = {
  title: string
  items: AmenityItem[]
}

export const AMENITY_CATEGORIES: CategoryGroup[] = [
  {
    title: 'Bedroom',
    items: [
      { icon: 'BedDouble', label: 'King / queen bed' },
      { icon: 'Package', label: 'Linens & towels included' },
    ],
  },
  {
    title: 'Bathroom',
    items: [
      { icon: 'ShowerHead', label: 'Outdoor shower' },
      { icon: 'Droplets', label: 'Indoor shower / wet bath' },
      { icon: 'Trash2', label: 'Composting toilet' },
    ],
  },
  {
    title: 'Kitchen',
    items: [
      { icon: 'Coffee', label: 'Kitchen / kitchenette' },
      { icon: 'UtensilsCrossed', label: 'Espresso machine' },
      { icon: 'Flame', label: 'BBQ / grill' },
    ],
  },
  {
    title: 'Climate',
    items: [
      { icon: 'Thermometer', label: 'Air conditioning' },
      { icon: 'Wind', label: 'Heater' },
      { icon: 'Layers', label: 'Heated floors' },
    ],
  },
  {
    title: 'Hookups & power',
    items: [
      { icon: 'Zap', label: 'Solar power' },
      { icon: 'Sun', label: 'Solar generator' },
      { icon: 'Battery', label: 'Generator (gas/propane)' },
    ],
  },
  {
    title: 'Entertainment',
    items: [
      { icon: 'Tv', label: 'TV / streaming' },
      { icon: 'Bluetooth', label: 'Bluetooth audio' },
      { icon: 'Telescope', label: 'Stargazing skylight' },
      { icon: 'Wifi', label: 'Wi-Fi' },
    ],
  },
  {
    title: 'Outdoor & adventure',
    items: [
      { icon: 'Bike', label: 'Bike rack' },
      { icon: 'Waves', label: 'Kayak / board rack' },
      { icon: 'Sofa', label: 'Outdoor furniture' },
      { icon: 'Dog', label: 'Pet amenities' },
    ],
  },
  {
    title: 'Other',
    items: [
      { icon: 'MapPin', label: 'GPS navigation' },
      { icon: 'Lock', label: 'Keyless entry' },
    ],
  },
]

// Trip readiness items shown with a callout at the bottom
export const TRIP_READINESS_ITEMS: AmenityItem[] = [
  { icon: 'ShoppingCart', label: 'Cutlery and utensils for your kitchen setup' },
  { icon: 'Droplets', label: 'Bathroom essentials: soap, towels, toilet paper' },
]

interface AmenitiesStepProps {
  amenities: AmenityItem[]
  setAmenities: (v: AmenityItem[]) => void
}

function CheckIcon({ checked }: { checked: boolean }) {
  return (
    <div
      className={[
        'flex h-4 w-4 shrink-0 items-center justify-center rounded border transition-colors',
        checked ? 'border-neutral-900 bg-neutral-900' : 'border-neutral-300 bg-white',
      ].join(' ')}
      aria-hidden
    >
      {checked && (
        <svg viewBox="0 0 10 8" fill="none" className="h-2.5 w-2.5">
          <path d="M1 4l3 3 5-6" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      )}
    </div>
  )
}

export default function AmenitiesStep({ amenities, setAmenities }: AmenitiesStepProps) {
  const isOn = (label: string) => amenities.some((a) => a.label === label)

  const toggle = (item: AmenityItem) => {
    setAmenities(
      isOn(item.label)
        ? amenities.filter((a) => a.label !== item.label)
        : [...amenities, item]
    )
  }

  const tip = (
    <HostTipCard
      imageSrc={TIP_IMAGES.amenities}
      imageAlt="Outdoor camp kitchen setup on a van trip"
      body={
        <>
          <p>
            Unique or unexpected amenities — an outdoor grill, espresso machine, board games, or heated
            floors — can be the detail that tips a guest from browsing to booking.
          </p>
          <p className="mt-2">
            Prioritise amenities that match the kind of trips your van is ideal for. Adventure travellers
            care about gear storage; comfort seekers care about beds and climate control.
          </p>
        </>
      }
    />
  )

  const main = (
    <div className="space-y-6">
      <Card>
        <h2 className="text-base font-semibold text-neutral-900 mb-2">Amenities</h2>
        <p className="text-xs text-neutral-500 mb-5">Select everything included in your van.</p>

        <div className="space-y-6">
          {AMENITY_CATEGORIES.map((cat) => (
            <div key={cat.title}>
              <p className="text-[0.7rem] font-bold uppercase tracking-[0.12em] text-neutral-500 mb-3">
                {cat.title}
              </p>
              <hr className="border-neutral-200 mb-3" />
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                {cat.items.map((item) => (
                  <label
                    key={item.label}
                    className="flex cursor-pointer items-center gap-3 rounded-lg p-2 transition hover:bg-neutral-50"
                  >
                    <CheckIcon checked={isOn(item.label)} />
                    <input
                      type="checkbox"
                      className="sr-only"
                      checked={isOn(item.label)}
                      onChange={() => toggle(item)}
                    />
                    <span className="text-sm text-neutral-800">{item.label}</span>
                  </label>
                ))}
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* Trip readiness callout */}
      <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm">
        <p className="font-semibold text-amber-900 mb-2">
          Be sure to provide the following items, if applicable to your vehicle, at no additional cost:
        </p>
        <p className="font-medium text-amber-800 mb-1">Trip readiness</p>
        <ul className="space-y-1 text-amber-800">
          {TRIP_READINESS_ITEMS.map((item) => (
            <li key={item.label} className="flex items-start gap-2">
              <span className="mt-0.5">•</span>
              <span>{item.label}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )

  return <HostEditorShell main={main} tip={tip} />
}
