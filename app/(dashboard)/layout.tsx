'use client'

import { useState, useEffect } from 'react'
import { Sidebar } from '@/components/Sidebar'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/app/context/AuthContext'

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const [clientReady, setClientReady] = useState(false)
  const { isLoggedIn, logout } = useAuth()
  const router = useRouter()

  // This effect ensures we only render after hydration
  useEffect(() => {
    setClientReady(true)
  }, [])

  const handleLogout = () => {
    logout()
  }

  // Don't render anything until client-side code is running
  if (!clientReady) {
    return <div className="flex items-center justify-center h-screen">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-slate-900"></div>
    </div>
  }

  if (!isLoggedIn) {
    return <div className="flex items-center justify-center h-screen">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-slate-900"></div>
    </div>
  }

  return (
    <div className="flex h-screen bg-gray-0">
      <Sidebar onLogout={handleLogout} />
      <div className="flex-1 overflow-auto">
        {children}
      </div>
    </div>
  )
} 