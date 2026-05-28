import type { Metadata, Viewport } from 'next'
import { Suspense } from 'react'
import { Playfair_Display, Inter, Montserrat } from 'next/font/google'
import './globals.css'
import Navbar from '@/components/layout/Navbar'
import Footer from '@/components/layout/Footer'
import { DevSupabaseConfigBanner } from '@/components/dev/DevSupabaseConfigBanner'
import JsonLd from '@/components/seo/JsonLd'
import { buildOrganizationJsonLd, buildRootMetadata, buildWebSiteJsonLd } from '@/lib/seo'

const playfairDisplay = Playfair_Display({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  style: ['normal', 'italic'],
  display: 'swap',
  variable: '--font-serif',
})

const inter = Inter({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600'],
  display: 'swap',
  variable: '--font-sans',
})

const montserrat = Montserrat({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800'],
  display: 'swap',
  variable: '--font-display',
})

export const metadata: Metadata = buildRootMetadata()

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#0a2d21',
  viewportFit: 'cover',
}

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html
      lang="en"
      className={`${playfairDisplay.variable} ${inter.variable} ${montserrat.variable} scroll-smooth`}
    >
      <body className="bg-cream-100 text-charcoal font-sans antialiased">
        <JsonLd data={[buildOrganizationJsonLd(), buildWebSiteJsonLd()]} />
        <Suspense fallback={null}>
          <DevSupabaseConfigBanner />
        </Suspense>
        <Navbar />
        <main className="pt-20 pb-[env(safe-area-inset-bottom,0px)]">{children}</main>
        <Footer />
      </body>
    </html>
  )
}
