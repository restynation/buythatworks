import './globals.css'
import { Inter } from 'next/font/google'
import Navigation from '@/components/Navigation'
import React from 'react'

const inter = Inter({ subsets: ['latin'] })

export const metadata = {
  title: 'buythatworks - Mac Monitor Compatibility',
  description: 'Verify whether your Mac and external monitor work together at full performance',
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