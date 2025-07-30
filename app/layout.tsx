import './globals.css'
import { Inter } from 'next/font/google'
import Navigation from '@/components/Navigation'
import React from 'react'
import type { Metadata, Viewport } from 'next'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'workswith - Mac Monitor Compatibility',
  description: 'Verify whether your Mac and external monitor work together at full performance',
  icons: {
    icon: '/favicon.ico',
    shortcut: '/favicon.ico',
    apple: '/favicon.ico',
  },
  openGraph: {
    title: 'workswith - Mac Monitor Compatibility',
    description: 'Verify whether your Mac and external monitor work together at full performance',
    url: 'https://buythatworks.vercel.app',
    siteName: 'workswith',
    images: [
      {
        url: '/opengraph-image.png',
        width: 1200,
        height: 630,
        alt: 'workswith - Mac Monitor Compatibility',
        type: 'image/png',
      }
    ],
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'workswith - Mac Monitor Compatibility',
    description: 'Verify whether your Mac and external monitor work together at full performance',
    images: ['/opengraph-image.png'],
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <Navigation />
        <main className="min-h-screen">
          {children}
        </main>
      </body>
    </html>
  )
} 