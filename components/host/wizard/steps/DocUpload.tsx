import { CheckCircle2, Upload } from 'lucide-react'

interface DocUploadProps {
  label: string
  docUrl: string
  uploading: boolean
  onUpload: (file: File) => void
}

export default function DocUpload({ label, docUrl, uploading, onUpload }: DocUploadProps) {
  return (
    <div>
      <p className="block text-[0.7rem] font-bold uppercase tracking-[0.12em] text-neutral-500 mb-1.5">
        {label}
      </p>
      {docUrl ? (
        <div className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2.5 text-sm text-emerald-700">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          <a href={docUrl} target="_blank" rel="noopener noreferrer" className="underline truncate">
            View document
          </a>
        </div>
      ) : (
        <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-dashed border-neutral-300 bg-neutral-50 px-3 py-2.5 text-sm text-neutral-500 transition hover:border-neutral-500 hover:text-neutral-700">
          <Upload className="h-4 w-4 shrink-0" />
          <span>{uploading ? 'Uploading…' : 'Upload file'}</span>
          <input
            type="file"
            accept=".pdf,image/*"
            className="sr-only"
            disabled={uploading}
            onChange={(e) => {
              const f = e.target.files?.[0]
              if (f) onUpload(f)
              e.target.value = ''
            }}
          />
        </label>
      )}
    </div>
  )
}
