'use client'

import { useState, useEffect } from 'react'
import { Sidebar } from '@/components/Sidebar'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/app/context/AuthContext'
import { MenuIcon, XIcon } from 'lucide-react'; // Import icons for toggle

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const [clientReady, setClientReady] = useState(false)
  const { isLoggedIn, logout } = useAuth()
  const router = useRouter()
  const [isSidebarOpen, setIsSidebarOpen] = useState(false); // State for sidebar visibility

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
    <div className="flex h-screen bg-gray-0 overflow-hidden"> {/* Prevent body scroll */}
      {/* Sidebar - adjusted for mobile */}
      <div className={`fixed inset-y-0 left-0 z-40 transition-transform duration-300 ease-in-out lg:static lg:inset-auto lg:translate-x-0 ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <Sidebar onLogout={handleLogout} onClose={() => setIsSidebarOpen(false)} /> 
      </div>

      {/* Optional Overlay for mobile when sidebar is open */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 z-30 bg-black/50 lg:hidden"
          onClick={() => setIsSidebarOpen(false)} 
        ></div>
      )}

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col overflow-auto"> 
        {/* Mobile Header with Toggle - Updated Style & Layout */}
        <div className="sticky top-0 z-20 bg-slate-900 shadow-sm lg:hidden flex items-center px-4 py-3 text-white"> {/* Changed background and text color */}
          {/* Hamburger button moved to the left */}
          <button onClick={() => setIsSidebarOpen(true)} className="p-2 mr-2 -ml-2 text-gray-300 hover:text-white"> {/* Adjusted margin/padding */}
            <MenuIcon className="h-6 w-6" />
          </button>
          {/* Title remains */}
          <span className="text-lg font-semibold">Elarion Insights</span> 
        </div>
        
        {/* Page Content */}
        <div className="flex-1 overflow-auto"> {/* Ensure content itself can scroll */}
          {children}
        </div>
      </div>
    </div>
  )
} 