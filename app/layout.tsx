import type { Metadata } from 'next'
import './globals.css'
import { ClientProviders } from './components/ClientProviders'
import { Analytics } from '@vercel/analytics/next'

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
      <body>
        <ClientProviders>{children}</ClientProviders>
        <Analytics />
      </body>
    </html>
  )
}
