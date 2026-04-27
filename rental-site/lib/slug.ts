export function slugify(input: string): string {
  const s = input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
  return s.length > 0 ? s : 'listing'
}

export function uniqueSlug(base: string, suffix: string): string {
  const b = slugify(base)
  const suf = suffix.replace(/-/g, '').slice(0, 8)
  return suf ? `${b}-${suf}` : b
}
