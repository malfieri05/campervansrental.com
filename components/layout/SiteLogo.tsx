import Image from 'next/image'

type Props = {
  priority?: boolean
  /** Applied to the outer lockup (image + text). */
  className?: string
  /** Narrow screens: keep the mark from dominating; desktop unchanged. */
  imageClassName?: string
  /** Wordmark only — no `/logo.png` mark (e.g. footer). */
  textOnly?: boolean
}

function Wordmark() {
  return (
    <span className="flex min-w-0 flex-col">
      <span className="font-serif text-base font-semibold leading-tight tracking-wide text-cream-50 transition-colors duration-300 group-hover:text-gold-300">
        Camper Van
      </span>
      <span className="font-display text-[0.6rem] font-bold uppercase leading-tight tracking-[0.2em] text-gold-400">
        Rentals
      </span>
    </span>
  )
}

/**
 * Brand lockup: platform logo image plus existing wordmark lines.
 * Image served from `/public/logo.png`.
 */
export default function SiteLogo({ priority, className, imageClassName, textOnly }: Props) {
  if (textOnly) {
    return (
      <span className={className}>
        <Wordmark />
      </span>
    )
  }

  return (
    <span
      className={[
        'inline-flex min-w-0 items-center gap-2.5 sm:gap-3',
        className ?? '',
      ].join(' ')}
    >
      <Image
        src="/logo.png"
        alt=""
        width={200}
        height={72}
        priority={priority}
        className={[
          'h-7 w-auto max-h-7 shrink-0 object-contain object-left sm:h-8 sm:max-h-8',
          imageClassName ?? '',
        ].join(' ')}
      />
      <Wordmark />
    </span>
  )
}
