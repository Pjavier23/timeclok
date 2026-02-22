import type { Metadata } from 'next'
import './globals.css'

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
      <body>{children}</body>
    </html>
  )
}
