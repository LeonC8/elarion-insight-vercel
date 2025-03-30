'use client'

import { useState, useEffect } from 'react'
import { Sidebar } from '@/components/Sidebar'
import { LoginScreen } from '@/components/LoginScreen'
import { useRouter } from 'next/navigation'
import { auth, logoutUser } from '@/app/lib/firebase'
import { onAuthStateChanged } from 'firebase/auth'

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setIsLoggedIn(!!user)
      setLoading(false)
    });
    
    return () => unsubscribe();
  }, []);

  const handleLogin = (email: string, password: string) => {
    // Firebase login is handled in the LoginScreen component
    // This is just for UI updates after successful login
    setIsLoggedIn(true)
  }

  const handleLogout = async () => {
    const result = await logoutUser();
    if (result.success) {
      setIsLoggedIn(false)
      router.push('/login')
    }
  }

  if (loading) {
    return <div className="flex items-center justify-center h-screen">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-slate-900"></div>
    </div>;
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