import type { Van } from '@/types'
import { Card, SectionDivider, Field, labelCls, inputCls } from '../formPrimitives'
import DocUpload from './DocUpload'

const VEHICLE_CLASSES = [
  'Class A Motorhome',
  'Class B / Campervan',
  'Class C Motorhome',
  'Travel Trailer',
  'Fifth Wheel',
  'Pop-up / Tent Trailer',
  'Converted Van',
  'Vintage / Classic',
  'Other',
]

interface VehicleStepProps {
  vehicleClass: string; setVehicleClass: (v: string) => void
  vehicleYear: number | ''; setVehicleYear: (v: number | '') => void
  vehicleMake: string; setVehicleMake: (v: string) => void
  vehicleModel: string; setVehicleModel: (v: string) => void
  lengthLabel: string; setLengthLabel: (v: string) => void
  sleeps: number; setSleeps: (v: number) => void
  seatbelts: number | ''; setSeatbelts: (v: number | '') => void
  category: Van['category']; setCategory: (v: Van['category']) => void
  vin: string; setVin: (v: string) => void
  licensePlate: string; setLicensePlate: (v: string) => void
  registrationDocUrl: string; setRegistrationDocUrl: (v: string) => void
  insuranceDocUrl: string; setInsuranceDocUrl: (v: string) => void
  uploadingDoc: string | null
  onUploadDoc: (file: File, docType: 'registration' | 'insurance') => Promise<void>
}

export default function VehicleStep(p: VehicleStepProps) {
  return (
    <Card>
      <h2 className="text-base font-semibold text-neutral-900 mb-4">Vehicle specs</h2>

      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <label className={labelCls}>Vehicle type / class *</label>
          <select
            className={inputCls}
            value={p.vehicleClass}
            onChange={(e) => p.setVehicleClass(e.target.value)}
          >
            {VEHICLE_CLASSES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>
        <Field
          label="Year *"
          value={p.vehicleYear === '' ? '' : String(p.vehicleYear)}
          onChange={(v) => p.setVehicleYear(v ? Number(v) : '')}
          placeholder="e.g. 2022"
          type="number"
        />
        <Field
          label="Make *"
          value={p.vehicleMake}
          onChange={p.setVehicleMake}
          placeholder="e.g. Mercedes-Benz"
        />
        <Field
          label="Model *"
          value={p.vehicleModel}
          onChange={p.setVehicleModel}
          placeholder="e.g. Sprinter 170"
        />
        <Field label="Length" value={p.lengthLabel} onChange={p.setLengthLabel} placeholder="e.g. 22ft" />
        <Field
          label="Sleeps"
          value={String(p.sleeps)}
          onChange={(v) => p.setSleeps(Number(v) || 1)}
          type="number"
        />
        <Field
          label="Seatbelts"
          value={p.seatbelts === '' ? '' : String(p.seatbelts)}
          onChange={(v) => p.setSeatbelts(v ? Number(v) : '')}
          type="number"
        />
        <div>
          <label className={labelCls}>Category</label>
          <select
            className={inputCls}
            value={p.category}
            onChange={(e) => p.setCategory(e.target.value as Van['category'])}
          >
            <option value="classic">Classic</option>
            <option value="adventure">Adventure</option>
            <option value="luxury">Luxury</option>
            <option value="ultra-luxury">Ultra-Luxury</option>
          </select>
        </div>
      </div>

      <SectionDivider title="Identity & compliance" className="mt-6" />
      <p className="text-xs text-neutral-500 mt-2 mb-4">
        Required for insurance verification. Stored securely and never shown to guests.
      </p>

      <div className="grid gap-4 md:grid-cols-2">
        <Field label="VIN *" value={p.vin} onChange={p.setVin} placeholder="17-character vehicle ID" />
        <Field
          label="License plate *"
          value={p.licensePlate}
          onChange={p.setLicensePlate}
          placeholder="e.g. ABC-1234"
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2 mt-4">
        <DocUpload
          label="Registration document *"
          docUrl={p.registrationDocUrl}
          uploading={p.uploadingDoc === 'registration'}
          onUpload={(f) => p.onUploadDoc(f, 'registration')}
        />
        <DocUpload
          label="Proof of insurance *"
          docUrl={p.insuranceDocUrl}
          uploading={p.uploadingDoc === 'insurance'}
          onUpload={(f) => p.onUploadDoc(f, 'insurance')}
        />
      </div>
    </Card>
  )
}
