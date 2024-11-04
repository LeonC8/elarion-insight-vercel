import Link from 'next/link'
import { motion } from 'framer-motion'
import { BarChart2Icon, HomeIcon, GlobeIcon, UsersIcon, BedDoubleIcon, MapPinIcon, UserIcon, LogOutIcon, CalendarIcon } from 'lucide-react'
import { usePathname } from 'next/navigation'

interface SidebarProps {
  onLogout: () => void;
}

const sidebarLinks = [
  { name: "Overview", icon: HomeIcon, path: "/overview" },
  { name: "Booking Channels", icon: GlobeIcon, path: "/booking-channels" },
  { name: "Market Segments", icon: UsersIcon, path: "/market-segments" },
  { name: "Room Types", icon: BedDoubleIcon, path: "/room-types" },
  { name: "Geo Source", icon: MapPinIcon, path: "/geo-source" },
  { name: "Age Bucket", icon: UserIcon, path: "/age-bucket" },
  { name: "Pickup", icon: CalendarIcon, path: "/pickup" },
]

export function Sidebar({ onLogout }: SidebarProps) {
  const pathname = usePathname()

  return (
    <div className="w-64 bg-slate-900 text-white flex flex-col h-screen">
      <div className="py-4 px-6 flex-grow">
        <div className="flex items-center mb-8 mt-4">
          <BarChart2Icon className="h-12 w-11 text-blue-400 mr-2 pr-1" />
          <div className="flex flex-col">
            <span className="text-md font-bold">Elarion Insight</span>
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
      <div className="py-4 px-6">
        <button
          onClick={onLogout}
          className="flex items-center py-2 px-4 pl-1 rounded transition duration-200 ease-in-out hover:bg-blue-900 text-white w-full"
        >
          <LogOutIcon className="h-5 w-5 mr-3 text-white" />
          Logout
        </button>
      </div>
    </div>
  )
}
