// No `force-dynamic` here — the auth forms' `useSearchParams()` is already
// wrapped in Suspense inside each page, which is sufficient to opt only those
// subtrees into dynamic rendering without forcing the whole layout segment.

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return children
}
