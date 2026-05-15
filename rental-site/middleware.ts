import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { isSupabaseConfigured } from '@/lib/env'

/** Avoid hanging requests when Supabase is slow or unreachable (DNS stalls may never throw). */
const AUTH_GET_USER_TIMEOUT_MS =
  process.env.NODE_ENV === 'development' ? 3500 : 12_000

function vehicleHealthUiDisabled() {
  return process.env.NEXT_PUBLIC_SHOW_VEHICLE_HEALTH_UI !== 'true'
}

export async function middleware(request: NextRequest) {
  if (vehicleHealthUiDisabled()) {
    const path = request.nextUrl.pathname
    if (path.startsWith('/mechanic')) {
      return NextResponse.redirect(new URL('/', request.url))
    }
    if (path.startsWith('/host/health')) {
      return NextResponse.redirect(new URL('/host', request.url))
    }
  }

  if (!isSupabaseConfigured()) {
    return NextResponse.next()
  }

  let response = NextResponse.next({
    request: { headers: request.headers },
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value
        },
        set(name: string, value: string, options: CookieOptions) {
          request.cookies.set({ name, value, ...options })
          response = NextResponse.next({
            request: { headers: request.headers },
          })
          response.cookies.set({ name, value, ...options })
        },
        remove(name: string, options: CookieOptions) {
          request.cookies.set({ name, value: '', ...options })
          response = NextResponse.next({
            request: { headers: request.headers },
          })
          response.cookies.set({ name, value: '', ...options })
        },
      },
    }
  )

  const pendingGetUser = supabase.auth.getUser()
  const raced = await Promise.race([
    pendingGetUser.then(
      () => ({ kind: 'ok' } as const),
      (error: unknown) => ({ kind: 'error', error } as const)
    ),
    new Promise<'timeout'>((resolve) =>
      setTimeout(() => resolve('timeout'), AUTH_GET_USER_TIMEOUT_MS)
    ),
  ])

  if (raced === 'timeout') {
    void pendingGetUser.catch(() => {})
    if (process.env.NODE_ENV === 'development') {
      console.warn(
        `Supabase getUser exceeded ${AUTH_GET_USER_TIMEOUT_MS}ms in middleware; continuing without session refresh.`
      )
    }
    return NextResponse.next({
      request: { headers: request.headers },
    })
  }

  if (raced.kind === 'error') {
    if (process.env.NODE_ENV === 'development') {
      console.warn('Supabase auth getUser failed in middleware:', raced.error)
      return NextResponse.next({
        request: { headers: request.headers },
      })
    }
    throw raced.error
  }

  return response
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
