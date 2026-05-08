import type { Metadata, Viewport } from 'next'
import { Suspense } from 'react'
import './globals.css'
import Navbar from '@/components/layout/Navbar'
import Footer from '@/components/layout/Footer'
import { DevSupabaseConfigBanner } from '@/components/dev/DevSupabaseConfigBanner'

export const metadata: Metadata = {
  icons: {
    icon: '/favicon.png',
    apple: '/favicon.png',
  },
  title: 'Camper Van Rentals | Experience Van Life',
  description:
    'Premium camper van rentals for the discerning traveler. Experience the wilderness in uncompromising luxury with our hand-curated fleet of fully-equipped vans.',
  keywords: [
    'luxury camper van rental',
    'premium van rental',
    'luxury road trip',
    'campervan hire',
    'off-grid luxury travel',
    'van life luxury',
    'national park road trip',
  ],
  authors: [{ name: 'Camper Van Rentals' }],
  creator: 'Camper Van Rentals',
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: 'https://campervansrental.com',
    siteName: 'Camper Van Rentals',
    title: 'Camper Van Rentals | Experience Van Life',
    description:
      'Premium camper van rentals for the discerning traveler. Experience the wilderness in uncompromising luxury.',
    images: [
      {
        url: 'https://campervansrental.com/rearvan.png',
        alt: 'Camper van experience',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Camper Van Rentals | Experience Van Life',
    description:
      'Premium camper van rentals for the discerning traveler.',
    images: ['https://campervansrental.com/rearvan.png'],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
}

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
    <html lang="en" className="scroll-smooth">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
      </head>
      <body className="bg-cream-100 text-charcoal font-sans antialiased">
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
