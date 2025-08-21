import './globals.css'
import { Inter } from 'next/font/google'
import { AuthProvider } from '@/context/AuthContext'
import { validateClickhouseConfig } from '@/lib/clickhouse'

const inter = Inter({ subsets: ['latin'] })

export const metadata = {
  title: 'Elarion Insights',
  description: 'Hotel Management Dashboard',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // Validate ClickHouse configuration on app startup
  if (typeof window === 'undefined') {
    // Server-side only
    validateClickhouseConfig();
  }

  return (
    <html lang="en">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=0.8" />
      </head>
      <body className={inter.className}>
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  )
}