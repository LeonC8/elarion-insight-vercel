'use client'

import { useState } from 'react'
import { Sidebar } from '@/components/Sidebar'
import { LoginScreen } from '@/components/LoginScreen'
import { redirect } from 'next/navigation'

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const [isLoggedIn, setIsLoggedIn] = useState(true) // You might want to use a proper auth system

  const handleLogin = (email: string, password: string) => {
    setIsLoggedIn(true)
  }

  const handleLogout = () => {
    setIsLoggedIn(false)
    redirect('/login')
  }

  if (!isLoggedIn) {
    return <LoginScreen onLogin={handleLogin} />
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