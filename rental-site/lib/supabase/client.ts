import { createBrowserClient } from '@supabase/ssr'
import { isSupabaseConfigured } from '@/lib/env'

/**
 * GoTrue's default `navigatorLock` (Web Locks API) races with React Strict Mode
 * and parallel `getSession()` calls, producing "stolen" / AbortError lock failures.
 * Serialize auth work in-process instead; cross-tab coordination is less critical
 * here because SSR uses cookies via middleware.
 */
function createInProcessAuthLock() {
  let tail: Promise<unknown> = Promise.resolve()
  return async <R>(
    _name: string,
    _acquireTimeout: number,
    fn: () => Promise<R>
  ): Promise<R> => {
    const run = tail.then(fn, fn)
    tail = run.then(
      () => undefined,
      () => undefined
    )
    return run
  }
}

const browserAuthLock = createInProcessAuthLock()

export function createClient() {
  if (!isSupabaseConfigured()) {
    throw new Error('Supabase is not configured')
  }
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      auth: {
        lock: browserAuthLock,
      },
    }
  )
}
