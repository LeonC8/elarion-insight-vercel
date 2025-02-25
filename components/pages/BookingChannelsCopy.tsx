"use client"

import { useState } from 'react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { 
  ChevronDownIcon, 
  DownloadIcon,
  Check,
  DollarSign, 
  Percent, 
  Hotel, 
  Building
} from 'lucide-react'
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { DatePickerDemo as DatePicker } from "@/components/ui/date-picker"
import dynamic from 'next/dynamic'
import { TopFive } from '../new/TopFive'
import { KpiWithChart } from '../new/KpiWithChart'
import { Kpi } from '../new/Kpi'
import { KpiWithSubtleChart } from '../new/KpiWithSubtleChart'
import { ChartConfig } from '@/components/ui/chart'
import type { CategoryTimeSeriesData } from '@/components/new/DataDetailsDialog'
import { ReservationsByDayChart } from '../new/ReservationsByDayChart'
import { HorizontalBarChart } from '../new/HorizontalBarChart'
import { HotelSelector } from '../new/HotelSelector'
import { HorizontalBarChartMultipleDatasets } from "../new/HorizontalBarChartMultipleDatasets"
import { PieChartWithLabels } from "@/components/new/PieChartWithLabels"
import { addDays } from "date-fns"
import { TopCategories } from "../new/TopCategories"

// Dynamic import for WorldMap with loading state
const WorldMap = dynamic(
  () => import('react-svg-worldmap').then(mod => mod.default),
  { 
    ssr: false, 
    loading: () => (
      <div className="h-[500px] flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
      </div>
    )
  }
)


function TriangleDown({ className }: { className?: string }) {
  return (
    <svg 
      width="8" 
      height="6" 
      viewBox="0 0 8 6" 
      fill="currentColor" 
      className={className}
    >
      <path d="M4 6L0 0L8 0L4 6Z" />
    </svg>
  )
}

export function BookingChannelsCopy() {
  // Add date state
  const [date, setDate] = useState<Date>(new Date())
  
  // Basic state for hotel selection
  const [selectedHotels, setSelectedHotels] = useState<string[]>(["Hotel 1"])
  const [selectedTimeFrame, setSelectedTimeFrame] = useState("Month")
  const [selectedViewType, setSelectedViewType] = useState("Actual")
  const [selectedComparison, setSelectedComparison] = useState("Last year - OTB")
  const allHotels = ["Hotel 1", "Hotel 2", "Hotel 3"]

  const toggleHotel = (hotel: string) => {
    setSelectedHotels(prev => 
      prev.includes(hotel) 
        ? prev.filter(h => h !== hotel) 
        : [...prev, hotel]
    )
  }

  const toggleAllHotels = () => {
    setSelectedHotels(prev => 
      prev.length === allHotels.length ? [] : [...allHotels]
    )
  }

  const toggleRegion = (regionHotels: string[], e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    
    const allSelected = regionHotels.every(hotel => selectedHotels.includes(hotel))
    if (allSelected) {
      setSelectedHotels(prev => prev.filter(h => !regionHotels.includes(h)))
    } else {
      setSelectedHotels(prev => [...new Set([...prev, ...regionHotels])])
    }
  }

  const toggleBrand = (brandHotels: string[], e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    
    const allSelected = brandHotels.every(hotel => selectedHotels.includes(hotel))
    if (allSelected) {
      setSelectedHotels(prev => prev.filter(h => !brandHotels.includes(h)))
    } else {
      setSelectedHotels(prev => [...new Set([...prev, ...brandHotels])])
    }
  }

  // Add date change handler
  const handleDateChange = (newDate: Date | undefined) => {
    if (newDate) {
      setDate(newDate)
      // Here you can add any additional logic needed when the date changes
      // For example, fetching new data for the selected date
    }
  }

  // Add dummy data for TopCategories
  const bookingChannelCategories = [
    { key: 'direct', label: 'Direct', color: 'hsl(152, 76.2%, 36.3%)' },
    { key: 'booking_com', label: 'Booking.com', color: 'hsl(45, 93%, 47%)' },
    { key: 'expedia', label: 'Expedia', color: 'hsl(0, 84%, 92%)' },
    { key: 'airbnb', label: 'Airbnb', color: 'hsl(212, 72%, 59%)' },
    { key: 'travel_agents', label: 'Travel Agents', color: 'hsl(280, 65%, 60%)' },
  ]

  // Helper function to generate random values with trends
  const generateTrendingValue = (base: number, variance: number = 0.2) => {
    return Math.round(base * (1 + (Math.random() - 0.5) * variance))
  }

  // Generate more comprehensive pie chart data
  const dummyPieData = [
    {
      key: 'direct',
      name: 'Direct',
      total_revenue: 150000,
      room_revenue: 120000,
      fnb_revenue: 30000,
      rooms_sold: 800,
      cancellations: 50,
      percentage: 35,
      fill: 'hsl(152, 76.2%, 36.3%)'
    },
    {
      key: 'booking_com',
      name: 'Booking.com',
      total_revenue: 100000,
      room_revenue: 85000,
      fnb_revenue: 15000,
      rooms_sold: 500,
      cancellations: 30,
      percentage: 25,
      fill: 'hsl(45, 93%, 47%)'
    },
    {
      key: 'expedia',
      name: 'Expedia',
      total_revenue: 80000,
      room_revenue: 70000,
      fnb_revenue: 10000,
      rooms_sold: 400,
      cancellations: 25,
      percentage: 20,
      fill: 'hsl(0, 84%, 92%)'
    },
    {
      key: 'airbnb',
      name: 'Airbnb',
      total_revenue: 50000,
      room_revenue: 45000,
      fnb_revenue: 5000,
      rooms_sold: 250,
      cancellations: 15,
      percentage: 12,
      fill: 'hsl(212, 72%, 59%)'
    },
    {
      key: 'travel_agents',
      name: 'Travel Agents',
      total_revenue: 30000,
      room_revenue: 25000,
      fnb_revenue: 5000,
      rooms_sold: 150,
      cancellations: 10,
      percentage: 8,
      fill: 'hsl(280, 65%, 60%)'
    },
  ]

  // Generate more comprehensive time series data
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun']
  const dummyOverTimeData = months.map(month => {
    const categoryData = bookingChannelCategories.reduce((acc, cat) => {
      const baseRevenue = cat.key === 'direct' ? 50000 : 30000
      const baseRooms = cat.key === 'direct' ? 250 : 150
      
      acc[cat.key] = {
        current: {
          total_revenue: generateTrendingValue(baseRevenue),
          room_revenue: generateTrendingValue(baseRevenue * 0.8),
          fnb_revenue: generateTrendingValue(baseRevenue * 0.2),
          rooms_sold: generateTrendingValue(baseRooms),
          cancellations: generateTrendingValue(baseRooms * 0.1),
          adr: generateTrendingValue(200),
          occupancy: generateTrendingValue(75),
          avg_length_of_stay: generateTrendingValue(3),
          lead_time: generateTrendingValue(30)
        },
        previous: {
          total_revenue: generateTrendingValue(baseRevenue * 0.9),
          room_revenue: generateTrendingValue(baseRevenue * 0.7),
          fnb_revenue: generateTrendingValue(baseRevenue * 0.15),
          rooms_sold: generateTrendingValue(baseRooms * 0.9),
          cancellations: generateTrendingValue(baseRooms * 0.08),
          adr: generateTrendingValue(180),
          occupancy: generateTrendingValue(70),
          avg_length_of_stay: generateTrendingValue(2.8),
          lead_time: generateTrendingValue(28)
        }
      }
      return acc
    }, {} as any)

    return {
      date: month,
      categories: categoryData
    }
  })

  // Generate more comprehensive bar chart data
  const dummyBarChartData = bookingChannelCategories.map(cat => ({
    key: cat.key,
    label: cat.label,
    current: {
      adr: generateTrendingValue(200),
      occupancy: generateTrendingValue(75),
      avg_length_of_stay: generateTrendingValue(3),
      lead_time: generateTrendingValue(30)
    },
    previous: {
      adr: generateTrendingValue(180),
      occupancy: generateTrendingValue(70),
      avg_length_of_stay: generateTrendingValue(2.8),
      lead_time: generateTrendingValue(28)
    }
  }))

  const pieKPIOptions = [
    { value: "total_revenue", label: "Total Revenue" },
    { value: "room_revenue", label: "Room Revenue" },
    { value: "fnb_revenue", label: "F&B Revenue" },
    { value: "rooms_sold", label: "Rooms Sold" },
    { value: "cancellations", label: "Cancellations" },
  ]

  const overTimeKPIOptions = [
    { value: "total_revenue", label: "Total Revenue" },
    { value: "room_revenue", label: "Room Revenue" },
    { value: "fnb_revenue", label: "F&B Revenue" },
    { value: "rooms_sold", label: "Rooms Sold" },
    { value: "cancellations", label: "Cancellations" },
    { value: "adr", label: "ADR" },
    { value: "occupancy", label: "Occupancy" },
    { value: "avg_length_of_stay", label: "Average Length of Stay" },
    { value: "lead_time", label: "Lead Time" },
  ]

  const barKPIOptions = [
    { value: "adr", label: "ADR" },
    { value: "occupancy", label: "Occupancy" },
    { value: "avg_length_of_stay", label: "Average Length of Stay" },
    { value: "lead_time", label: "Lead Time" },
  ]

  // Add transformation functions for the TopCategories component
  const transformPieData = (data: any[], selectedKPI: string) => {
    return data.map(item => ({
      ...item,
      value: item[selectedKPI],
      fill: item.fill
    }))
  }

  const transformOverTimeData = (data: any[], selectedKPI: string) => {
    return data.map(item => ({
      date: item.date,
      categories: Object.keys(item.categories).reduce((acc, catKey) => {
        acc[catKey] = {
          current: item.categories[catKey].current[selectedKPI],
          previous: item.categories[catKey].previous[selectedKPI]
        }
        return acc
      }, {} as any)
    }))
  }

  const transformBarData = (data: any[], selectedKPI: string) => {
    return data.map(item => ({
      key: item.key,
      label: item.label,
      current: item.current[selectedKPI],
      previous: item.previous[selectedKPI]
    }))
  }

  return (
    <div className="flex-1 overflow-auto bg-[#f5f8ff]">
        {/* Header with Filters */}
        <div className="fixed top-0 left-[256px] right-0 z-30 flex justify-between items-center mb-6 bg-white py-6 px-12 border-b border-gray-300 shadow-sm">
          <div>
            <h2 className="text-xl font-bold text-gray-800 mb-1">Overview</h2>
            <span className='text-gray-400 font-ligth mt-3 pt-2 text-sm'>{`${selectedTimeFrame} ${selectedViewType}`}</span>
          </div>

          <div className="flex items-center space-x-8">
            {/* Combined Time Frame and View Type Dropdown */}
            <div className="flex flex-col">
              <span className="text-xs text-gray-500 mb-2">Selected period</span>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button 
                    variant="ghost" 
                    className="bg-[#f2f8ff] hover:bg-[#f2f8ff] text-[#342630] rounded-full px-4"
                  >
                    {`${selectedTimeFrame} ${selectedViewType}`} <TriangleDown className="ml-2" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-56">
                  {/* Day Group */}
                  <div className="px-2 py-2 text-sm font-semibold text-gray-800  border-b border-gray-300">
                    Day
                  </div>
                  <div className="p-1 text-gray-600">
                    <DropdownMenuItem onSelect={() => { setSelectedTimeFrame("Day"); setSelectedViewType("Actual"); }}>
                      Actual
                    </DropdownMenuItem>
                    <DropdownMenuItem onSelect={() => { setSelectedTimeFrame("Day"); setSelectedViewType("OTB"); }}>
                      OTB
                    </DropdownMenuItem>
                    <DropdownMenuItem onSelect={() => { setSelectedTimeFrame("Day"); setSelectedViewType("Projected"); }}>
                      Projected
                    </DropdownMenuItem>
                  </div>
                  
                  {/* Month Group */}
                  <div className="px-2 py-2 text-sm font-semibold text-gray-800  border-y border-gray-300">
                    Month
                  </div>
                  <div className="p-1 text-gray-600">
                    <DropdownMenuItem onSelect={() => { setSelectedTimeFrame("Month"); setSelectedViewType("Actual"); }}>
                      Actual
                    </DropdownMenuItem>
                    <DropdownMenuItem onSelect={() => { setSelectedTimeFrame("Month"); setSelectedViewType("OTB"); }}>
                      OTB
                    </DropdownMenuItem>
                    <DropdownMenuItem onSelect={() => { setSelectedTimeFrame("Month"); setSelectedViewType("Projected"); }}>
                      Projected
                    </DropdownMenuItem>
                  </div>
                  
                  {/* Year Group */}
                  <div className="px-2 py-2 text-sm font-semibold text-gray-800  border-y border-gray-300">
                    Year
                  </div>
                  <div className="p-1">
                    <DropdownMenuItem onSelect={() => { setSelectedTimeFrame("Year"); setSelectedViewType("Actual"); }}>
                      Actual
                    </DropdownMenuItem>
                    <DropdownMenuItem onSelect={() => { setSelectedTimeFrame("Year"); setSelectedViewType("OTB"); }}>
                      OTB
                    </DropdownMenuItem>
                    <DropdownMenuItem onSelect={() => { setSelectedTimeFrame("Year"); setSelectedViewType("Projected"); }}>
                      Projected
                    </DropdownMenuItem>
                  </div>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            {/* Comparison Dropdown with Label */}
            <div className="flex flex-col">
              <span className="text-xs text-gray-500 mb-2">Compare with:</span>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button 
                    variant="ghost" 
                    className="bg-[#f2f8ff] hover:bg-[#f2f8ff] text-[#342630] rounded-full px-4"
                  >
                    {selectedComparison} <TriangleDown className="ml-2" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  <DropdownMenuItem onSelect={() => setSelectedComparison("Last year - OTB")}>
                     Last year - OTB
                  </DropdownMenuItem>
                  <DropdownMenuItem onSelect={() => setSelectedComparison("Last year (match day of week) - OTB")}>
                     Last year (match day of week) - OTB
                  </DropdownMenuItem>
                  <DropdownMenuItem onSelect={() => setSelectedComparison("Last year - Actual")}>
                     Last year - Actual
                  </DropdownMenuItem>
                  <DropdownMenuItem onSelect={() => setSelectedComparison("Last year (match day of week) - Actual")}>
                     Last year (match day of week) - Actual
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
            
            {/* Date Picker with Label */}
            <div className="flex flex-col">
              <span className="text-xs text-gray-500 mb-2">Business date</span>
              <DatePicker 
                date={date} 
                onDateChange={handleDateChange}
              />
            </div>

            {/* Hotel Selector with Label */}
            <div className="flex flex-col">
              <span className="text-xs text-gray-500 mb-2">Property</span>
              <HotelSelector 
                selectedHotels={selectedHotels}
                setSelectedHotels={setSelectedHotels}
              />
            </div>

            {/* Export Button */}
            {/* <Button 
              variant="ghost" 
              className="flex items-center space-x-2 text-blue-600 mt-7"
            >
              <DownloadIcon className="h-4 w-4" />
              <span>Export to Excel</span>
            </Button> */}
          </div>
        </div>

        {/* New section with TopCategories below the filters */}
        <div className="pt-32 p-6">
          <TopCategories 
            categories={bookingChannelCategories}
            pieChartData={dummyPieData}
            overTimeData={dummyOverTimeData}
            barChartData={dummyBarChartData}
            pieKPIOptions={pieKPIOptions}
            overTimeKPIOptions={overTimeKPIOptions}
            barKPIOptions={barKPIOptions}
            transformPieData={transformPieData}
            transformOverTimeData={transformOverTimeData}
            transformBarData={transformBarData}
          />
        </div>

    </div>
  )
} 