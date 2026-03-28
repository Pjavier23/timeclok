import type { Metadata } from 'next'
import './globals.css'
import { ClientProviders } from './components/ClientProviders'
import { Analytics } from '@vercel/analytics/next'
import Script from 'next/script'

export const metadata: Metadata = {
  metadataBase: new URL('https://timeclok.vercel.app'),
  title: 'TimeClok — Free Employee Time Tracking & Payroll for Small Business',
  description: 'Clock in/out with GPS, auto-calculate payroll, manage contractors. Free for small businesses. No paperwork.',
  keywords: 'employee time tracking, small business payroll, contractor time clock, GPS time tracking, free timesheet app, timesheet software, clock in clock out app, payroll automation',
  robots: 'index, follow',
  alternates: {
    canonical: 'https://timeclok.vercel.app',
  },
  openGraph: {
    type: 'website',
    url: 'https://timeclok.vercel.app',
    title: 'TimeClok — Free Employee Time Tracking & Payroll for Small Business',
    description: 'Clock in/out with GPS, auto-calculate payroll, manage contractors. Free for small businesses. No paperwork.',
    siteName: 'TimeClok',
    images: [
      {
        url: 'https://timeclok.vercel.app/og-image.png',
        width: 1200,
        height: 630,
        alt: 'TimeClok — Employee Time Tracking & Payroll',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'TimeClok — Free Employee Time Tracking & Payroll for Small Business',
    description: 'Clock in/out with GPS, auto-calculate payroll, manage contractors. Free for small businesses. No paperwork.',
    images: ['https://timeclok.vercel.app/og-image.png'],
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <head>
        <Script
          src="https://www.googletagmanager.com/gtag/js?id=G-4PF4JE8B5J"
          strategy="afterInteractive"
        />
        <Script id="google-analytics" strategy="afterInteractive">
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', 'G-4PF4JE8B5J');
          `}
        </Script>
      </head>
      <body>
        <ClientProviders>{children}</ClientProviders>
        <Analytics />
      </body>
    </html>
  )
}
