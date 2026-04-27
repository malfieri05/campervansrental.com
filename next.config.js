const path = require('path')
const fs = require('fs')

/**
 * Merge `.env` / `.env.local` into `process.env` so Next (and `next.config` `env`)
 * see keys when the app lives under `.claude/worktrees/.../rental-site` but your
 * real file is at any parent folder (e.g. repo root when using `npm run dev` there).
 */
function mergeEnvFile(filePath, { override } = { override: false }) {
  if (!fs.existsSync(filePath)) return
  let text = fs.readFileSync(filePath, 'utf8')
  if (text.charCodeAt(0) === 0xfeff) text = text.slice(1)
  for (let line of text.split('\n')) {
    line = line.trim()
    if (!line || line.startsWith('#')) continue
    const eq = line.indexOf('=')
    if (eq === -1) continue
    const key = line.slice(0, eq).trim()
    let val = line.slice(eq + 1).trim()
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1)
    }
    if (override || process.env[key] === undefined || process.env[key] === '') {
      process.env[key] = val
    }
  }
}

const appDir = __dirname

// Parent directories (repo root, etc.) — fill only so `rental-site/.env` can override
let dir = appDir
for (let i = 0; i < 10; i++) {
  const parent = path.dirname(dir)
  if (parent === dir) break
  dir = parent
  mergeEnvFile(path.join(dir, '.env'), { override: false })
  mergeEnvFile(path.join(dir, '.env.local'), { override: false })
}

mergeEnvFile(path.join(appDir, '.env'), { override: true })
mergeEnvFile(path.join(appDir, '.env.local'), { override: true })

function supabaseImagePatterns() {
  try {
    const u = process.env.NEXT_PUBLIC_SUPABASE_URL
    if (!u) return []
    const host = new URL(u).hostname
    return [
      {
        protocol: 'https',
        hostname: host,
        port: '',
        pathname: '/storage/v1/object/public/**',
      },
    ]
  } catch {
    return []
  }
}

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Inlines into the browser bundle (required for client `createBrowserClient` + checks)
  env: {
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL || '',
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '',
    NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL || '',
  },
  images: {
    domains: ['unsplash.com', 'images.unsplash.com'],
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'unsplash.com',
        port: '',
        pathname: '/**',
      },
      ...supabaseImagePatterns(),
    ],
  },
}

module.exports = nextConfig
