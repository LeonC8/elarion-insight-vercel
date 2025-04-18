import Link from 'next/link'
import { motion } from 'framer-motion'
import { BarChart2Icon, HomeIcon, GlobeIcon, UsersIcon, BedDoubleIcon, MapPinIcon, UserIcon, LogOutIcon, CalendarIcon, TrendingUpIcon, Settings, BarChart3Icon, MenuIcon, XIcon } from 'lucide-react'
import { usePathname } from 'next/navigation'

interface SidebarProps {
  onLogout: () => void;
  onClose?: () => void;
}

const sidebarLinks = [
  { name: "Overview", icon: HomeIcon, path: "/overview" },
  { name: "Booking Channels", icon: GlobeIcon, path: "/booking-channels" },
  { name: "Market Segments", icon: UsersIcon, path: "/market-segments" },
  { name: "Room Types", icon: BedDoubleIcon, path: "/room-types" },
  { name: "Pickup", icon: CalendarIcon, path: "/pickup" },
  { name: "Pickup Analytics", icon: BarChart3Icon, path: "/pickup-analytics" },
  { name: "Pace", icon: TrendingUpIcon, path: "/pace" },
]

export function Sidebar({ onLogout, onClose }: SidebarProps) {
  const pathname = usePathname()

  return (
    <div className="w-64 bg-slate-900 text-white flex flex-col h-screen relative">
      <button 
        onClick={onClose} 
        className="absolute top-4 right-4 p-2 text-gray-400 hover:text-white lg:hidden"
      >
        <XIcon className="h-6 w-6" />
      </button>

      <div className="py-4 px-6 flex-grow overflow-y-auto">
        <div className="flex items-center mb-8 mt-4">
          <BarChart2Icon className="h-12 w-11 text-blue-400 mr-2 pr-1" />
          <div className="flex flex-col">
            <span className="text-md font-bold">Elarion Insights</span>
            <span className="text-sm text-gray-400">Hospitality</span>
          </div>
        </div>
        <nav>
          <ul>
            {sidebarLinks.map((link, index) => (
              <motion.li
                key={link.name}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
                onClick={onClose}
              >
                <Link 
                  href={link.path}
                  className={`flex items-center py-2 px-4 pl-1 rounded transition duration-200 ease-in-out hover:bg-blue-900 ${
                    pathname === link.path ? 'text-blue-400 font-semibold' : 'text-white'
                  }`}
                >
                  {link.icon && (
                    <link.icon className={`h-5 w-5 mr-3 ${
                      pathname === link.path ? 'text-blue-400' : 'text-white'
                    }`} />
                  )}
                  {link.name}
                </Link>
              </motion.li>
            ))}
          </ul>
        </nav>
      </div>
      <div className="py-4 px-6 flex gap-2">
        <button
          onClick={() => {}} // Settings button - no action for now
          className="w-12 h-12 flex items-center justify-center rounded-lg bg-[#394756] transition duration-200 ease-in-out hover:bg-[#4a5a6b]"
        >
          <Settings className="h-5 w-5 text-white" />
        </button>
        <button
          onClick={onLogout}
          className="w-12 h-12 flex items-center justify-center rounded-lg bg-[#394756] transition duration-200 ease-in-out hover:bg-[#4a5a6b]"
        >
          <LogOutIcon className="h-5 w-5 text-white" />
        </button>
      </div>
    </div>
  )
}
