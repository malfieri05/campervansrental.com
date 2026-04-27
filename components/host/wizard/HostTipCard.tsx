import Image from 'next/image'

interface HostTipCardProps {
  imageSrc: string
  imageAlt: string
  body: React.ReactNode
}

/**
 * "Keep in mind" tip card shown in the right rail of each host wizard tab.
 * Mirrors the Outdoorsy sidebar guidance pattern with our own copy.
 */
export default function HostTipCard({ imageSrc, imageAlt, body }: HostTipCardProps) {
  return (
    <div className="overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-sm">
      <div className="relative aspect-[4/3] w-full overflow-hidden bg-neutral-100">
        <Image
          src={imageSrc}
          alt={imageAlt}
          fill
          className="object-cover"
          sizes="(max-width: 1024px) 100vw, 300px"
        />
      </div>
      <div className="p-4">
        <span className="inline-block rounded-full bg-neutral-900 px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-white">
          Keep in mind
        </span>
        <div className="mt-3 text-sm leading-relaxed text-neutral-600">{body}</div>
      </div>
    </div>
  )
}
