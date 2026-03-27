import type { Metadata } from 'next'
import './globals.css'
import { ClientProviders } from './components/ClientProviders'
import { Analytics } from '@vercel/analytics/next'
import Script from 'next/script'

export const metadata: Metadata = {
  title: 'TimeClok - Employee Time Tracking & Payroll',
  description: 'Clock in/out, manage contractors, automate payroll',
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
