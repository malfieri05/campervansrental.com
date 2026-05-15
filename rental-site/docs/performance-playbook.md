# Performance Playbook

> Codifies the patterns established during the Phase 2 performance audit.  
> Read this before adding new routes, queries, or components.

---

## 1. Adding a new page route

### Checklist
- [ ] Create a `loading.tsx` sibling alongside the `page.tsx` — every navigation to this segment will paint the skeleton immediately.
- [ ] If the page does **any** server data fetch, structure it as:
  - A **fast shell** — static HTML, layout, header
  - An **async inner component** wrapped in `<Suspense fallback={<Skeleton/>}>` that owns the slow awaits
  - This ensures the shell paints while the DB call is in flight
- [ ] If the page shows public, non-personalized data (catalog, listing detail), use the **anon client + `unstable_cache`** pattern (see Section 3) instead of `createServerSupabaseClient`.
- [ ] Mark the segment `export const dynamic = 'force-dynamic'` **only** if it reads per-user cookies or auth state. Public pages should be static or ISR.

### Template

```tsx
// app/my-page/loading.tsx
export default function Loading() {
  return <div className="animate-pulse ..."><Skeleton /></div>
}

// app/my-page/page.tsx
import { Suspense } from 'react'

async function PageData() {
  const data = await fetchData()       // slow DB call
  return <PageContent data={data} />
}

export default function MyPage() {
  return (
    <Suspense fallback={<PageDataSkeleton />}>
      <PageData />
    </Suspense>
  )
}
```

---

## 2. Adding a new Supabase query

### Rules
1. **Never `select('*')` on a large table** (`listings`, `reservations`, `rental_agreement_submissions`). Enumerate only the columns the caller reads.
2. **Add a composite index** if the query filters by multiple columns or sorts on a column that isn't the primary key. Use `CONCURRENTLY` to avoid table locks:
   ```sql
   CREATE INDEX CONCURRENTLY IF NOT EXISTS my_table_col1_col2_idx
     ON my_table (col1, col2 DESC);
   ```
3. **Use `Promise.all`** when two or more independent queries can run in parallel within the same request.
4. **Public data** (visible to anonymous users): use `createAnonClient()` from `lib/supabase/anon.ts` and wrap the result in `unstable_cache` (see Section 3).
5. **Per-user data**: use `createServerSupabaseClient()` which reads the session cookie. Never cache this in `unstable_cache`.

### Index naming convention
`{table}_{col1}_{col2}_{qualifier}_idx` — e.g. `listings_published_updated_at_idx`.

---

## 3. Caching public data with tagged ISR

Use this for any data that is:
- Visible to anonymous users
- Not personalized
- Changed by a host action (edits, publish, delete)

```ts
// lib/my-feature.ts
import { unstable_cache } from 'next/cache'
import { createAnonClient } from '@/lib/supabase/anon'

export const MY_CACHE_TAG = 'my-feature'

const _fetchMyData = unstable_cache(
  async (): Promise<MyRow[]> => {
    const supabase = createAnonClient()
    if (!supabase) return []
    const { data } = await supabase.from('my_table').select('...')
    return data ?? []
  },
  [MY_CACHE_TAG],
  { tags: [MY_CACHE_TAG], revalidate: 60 }   // 60 s TTL + tag invalidation
)

export async function getMyData(): Promise<MyRow[]> {
  return _fetchMyData()
}
```

Then in the server action that mutates the data:
```ts
import { revalidateTag } from 'next/cache'
import { MY_CACHE_TAG } from '@/lib/my-feature'

export async function updateMyData(...) {
  // ... DB write ...
  revalidateTag(MY_CACHE_TAG)     // invalidates cache immediately
  revalidatePath('/affected-page')
}
```

**Security**: only use the anon client for data that passes Supabase's `status = 'published'` or equivalent public-visibility filter. Never cache a query that joins on `auth.uid()` or reads from user-private tables.

---

## 4. Adding a new heavy client component

If a component is:
- > 200 LOC
- Below the fold or behind a click/modal
- Importing heavy libraries (Stripe, framer-motion, dnd-kit, chart libs)

…defer it with `next/dynamic`:

```tsx
import lazyImport from 'next/dynamic'

const HeavyComponent = lazyImport(
  () => import('./HeavyComponent'),
  {
    ssr: false,      // set true only if you need SSR for SEO/LCP
    loading: () => <Skeleton />,
  }
)
```

**Rule**: if the page already has a `loading.tsx` skeleton and the component is below the fold, `ssr: false` is always safe.

---

## 5. Adding an API route

```ts
// app/api/my-route/route.ts
export const runtime = 'nodejs'   // always explicit — prevents accidental edge deployment
export const dynamic = 'force-dynamic'

export async function POST(req: Request) { ... }
```

- Use `export const runtime = 'nodejs'` for routes that import Stripe, pdf-parse, or any Node.js-only module.
- Generate an **idempotency key** for any Stripe mutation:
  ```ts
  const idempotencyKey = `op:${userId}:${resourceId}:${dateRange}`
  stripe.someMethod(..., { idempotencyKey })
  ```
- Never use an in-process `Map` for rate limiting — Vercel runs many function instances. Use Supabase (counter table) or Upstash Redis.

---

## 6. Validating with `next build`

After making changes, run:
```sh
cd rental-site && npm run build
```

Check the route table output. Good signs:
- Routes that serve public content: `○ (Static)` or small first-load JS
- Auth, trips, host pages: `ƒ (Dynamic)` is expected
- No route should grow its "First Load JS" by more than ~5 kB per change
- Shared bundle (`+ First Load JS shared by all`) should stay below 100 kB

To inspect chunk contents:
```sh
npx next build --debug   # or use ANALYZE=true with @next/bundle-analyzer
```

---

## 7. Supabase connection pooling (production checklist)

Vercel serverless functions open a new Postgres connection per invocation. Without PgBouncer, you exhaust the connection limit at ~50 concurrent users.

Steps:
1. Supabase Dashboard → Project Settings → Database → Connection Pooling → **Enable**
2. Set **Transaction** mode (compatible with all queries in this app)
3. Copy the Transaction pooler URL
4. Set `DATABASE_URL_POOLED=<url>` in Vercel → Environment Variables
5. Verify the app uses the pooler URL by checking Supabase Dashboard → Monitoring → Connections

Do **not** use session-level features (SET SESSION, advisory locks, LISTEN/NOTIFY) — these are incompatible with Transaction pooling.

---

## 8. Database observability

After deploying new indexes (`supabase/migrations/00015_performance_indexes.sql`):

1. Reset pg_stat_statements so stats are clean:
   ```sql
   SELECT pg_stat_statements_reset();
   ```
2. Wait ~1 hour of production traffic.
3. Check slow queries:
   ```sql
   SELECT
     query,
     calls,
     round(mean_exec_time::numeric, 2) AS mean_ms,
     round(total_exec_time::numeric, 2) AS total_ms
   FROM pg_stat_statements
   WHERE mean_exec_time > 10   -- queries averaging > 10 ms
   ORDER BY mean_exec_time DESC
   LIMIT 20;
   ```
4. If a query is still slow, run `EXPLAIN (ANALYZE, BUFFERS)` and check for `Seq Scan` on large tables — add a covering index.
