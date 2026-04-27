import type { Metadata, Viewport } from 'next'
import { Suspense } from 'react'
import './globals.css'
import Navbar from '@/components/layout/Navbar'
import Footer from '@/components/layout/Footer'
import { DevSupabaseConfigBanner } from '@/components/dev/DevSupabaseConfigBanner'

export const metadata: Metadata = {
  title: 'Camper Van Rentals | Luxury Outdoor Adventures',
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
    title: 'Camper Van Rentals | Luxury Outdoor Adventures',
    description:
      'Premium camper van rentals for the discerning traveler. Experience the wilderness in uncompromising luxury.',
    images: [
      {
        url: 'https://images.unsplash.com/photo-1504280390367-361c6d9f38f4?w=1200',
        width: 1200,
        height: 630,
        alt: 'Luxury camper van in stunning natural landscape',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Camper Van Rentals | Luxury Outdoor Adventures',
    description:
      'Premium camper van rentals for the discerning traveler.',
    images: [
      'https://images.unsplash.com/photo-1504280390367-361c6d9f38f4?w=1200',
    ],
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
        <main className="pt-20">{children}</main>
        <Footer />
      </body>
    </html>
  )
}
