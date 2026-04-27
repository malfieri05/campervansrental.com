'use client'

import Link from 'next/link'
import { ReactNode } from 'react'

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'dark'
type ButtonSize = 'sm' | 'md' | 'lg'

interface ButtonProps {
  children: ReactNode
  variant?: ButtonVariant
  size?: ButtonSize
  href?: string
  onClick?: () => void
  className?: string
  disabled?: boolean
  type?: 'button' | 'submit' | 'reset'
  target?: string
  rel?: string
  fullWidth?: boolean
}

const variantClasses: Record<ButtonVariant, string> = {
  primary:
    'bg-gold-400 text-forest-950 border-2 border-transparent hover:bg-gold-300 hover:shadow-gold active:bg-gold-500 font-display font-semibold uppercase tracking-widest',
  secondary:
    'bg-transparent text-cream-100 border-2 border-cream-100/60 hover:border-cream-100 hover:bg-cream-100/10 font-display font-semibold uppercase tracking-widest',
  ghost:
    'bg-transparent text-cream-100 border-2 border-cream-100/30 hover:border-cream-100/70 hover:bg-cream-100/5 font-display font-semibold uppercase tracking-widest',
  dark: 'bg-forest-900 text-cream-100 border-2 border-forest-900 hover:bg-forest-800 hover:border-forest-800 font-display font-semibold uppercase tracking-widest',
}

const sizeClasses: Record<ButtonSize, string> = {
  sm: 'px-5 py-2 text-xs',
  md: 'px-7 py-3.5 text-xs',
  lg: 'px-9 py-4 text-sm',
}

export default function Button({
  children,
  variant = 'primary',
  size = 'md',
  href,
  onClick,
  className = '',
  disabled = false,
  type = 'button',
  target,
  rel,
  fullWidth = false,
}: ButtonProps) {
  const baseClasses =
    'inline-flex items-center justify-center gap-2.5 rounded-sm transition-all duration-300 cursor-pointer select-none leading-none'

  const allClasses = [
    baseClasses,
    variantClasses[variant],
    sizeClasses[size],
    fullWidth ? 'w-full' : '',
    disabled ? 'opacity-50 cursor-not-allowed pointer-events-none' : '',
    className,
  ]
    .filter(Boolean)
    .join(' ')

  if (href) {
    return (
      <Link href={href} className={allClasses} target={target} rel={rel}>
        {children}
      </Link>
    )
  }

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={allClasses}
    >
      {children}
    </button>
  )
}
