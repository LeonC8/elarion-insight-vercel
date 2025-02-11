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
} from 'lucide-react'
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { DatePickerDemo as DatePicker } from "@/components/ui/date-picker"
import dynamic from 'next/dynamic'
import { HorizontalBarChart } from "@/components/ui/HorizontalBarChart"
import { TopProducers } from "@/components/ui/TopProducers"

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

export function OverviewCopy() {
  // Basic state for hotel selection
  const [selectedHotels, setSelectedHotels] = useState<string[]>(["Hotel 1"])
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

  return (
    <div className="flex-1 overflow-auto">
      <div className="p-8">
        {/* Header with Filters */}
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center space-x-4">
            <h2 className="text-3xl font-bold text-gray-800">Overview</h2>
            
            {/* Time Frame Tabs */}
            <Tabs defaultValue="month">
              <TabsList>
                <TabsTrigger value="day">Day</TabsTrigger>
                <TabsTrigger value="month">Month</TabsTrigger>
                <TabsTrigger value="year">Year</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>

          <div className="flex items-center space-x-4">
            {/* View Type Tabs */}
            <Tabs defaultValue="actual">
              <TabsList>
                <TabsTrigger value="actual">Actual</TabsTrigger>
                <TabsTrigger value="otb">OTB</TabsTrigger>
                <TabsTrigger value="projected">Projected</TabsTrigger>
              </TabsList>
            </Tabs>

            {/* Date Picker */}
            <DatePicker />

            {/* Export Button */}
            <Button 
              variant="ghost" 
              className="flex items-center space-x-2 text-blue-600"
            >
              <DownloadIcon className="h-4 w-4" />
              <span>Export to Excel</span>
            </Button>

            {/* Hotel Selector */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline">
                  {selectedHotels.length === 1 ? selectedHotels[0] : `${selectedHotels.length} Hotels`} <ChevronDownIcon className="ml-2 h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuItem onSelect={toggleAllHotels}>
                  <div className="flex items-center">
                    <div className={`mr-2 h-4 w-4 border rounded-sm flex items-center justify-center ${selectedHotels.length === allHotels.length ? 'bg-primary border-primary' : 'border-input'}`}>
                      {selectedHotels.length === allHotels.length && <Check className="h-3 w-3 text-primary-foreground" />}
                    </div>
                    Select All
                  </div>
                </DropdownMenuItem>
                {allHotels.map((hotel) => (
                  <DropdownMenuItem key={hotel} onSelect={() => toggleHotel(hotel)}>
                    <div className="flex items-center">
                      <div className={`mr-2 h-4 w-4 border rounded-sm flex items-center justify-center ${selectedHotels.includes(hotel) ? 'bg-primary border-primary' : 'border-input'}`}>
                        {selectedHotels.includes(hotel) && <Check className="h-3 w-3 text-primary-foreground" />}
                      </div>
                      {hotel}
                    </div>  
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* World Map */}
        <div className="mt-8">
          <Card className="bg-white shadow-lg rounded-lg overflow-hidden">
            <CardHeader className="flex flex-col items-start">
              <div className="flex w-full justify-between items-center">
                <div>
                  <CardTitle className="text-lg font-semibold text-gray-800">Global Revenue Distribution</CardTitle>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="h-[500px] flex justify-center items-center">
                <WorldMap
                  color="rgb(59, 130, 246)"
                  title="Top 10 Populous Countries"
                  value-suffix="people"
                  size="lg"
                  data={[]} // Empty data for now
                />
              </div>
              <div className="flex justify-center mt-4">
                <div className="flex items-center space-x-8">
                  <div className="flex items-center">
                    <div className="w-24 h-3 bg-gradient-to-r from-blue-100 to-blue-600"></div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="text-sm text-gray-500">Lower</span>
                    <span className="text-sm text-gray-500">-</span>
                    <span className="text-sm text-gray-500">Higher Revenue</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Horizontal Bar Charts */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-8">
          <HorizontalBarChart 
            title="Revenue by Department"
            description="Last 6 months"
            data={[]} // Empty data for now
          />
          <HorizontalBarChart 
            title="Bookings by Channel"
            description="Last 6 months"
            data={[]} // Empty data for now
          />
        </div>

        {/* Top Producers */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-8">
          <TopProducers 
            title="Top Producers - Room Revenue"
            data={[]} // Empty data for now
          />
          <TopProducers 
            title="Top Producers - F&B Revenue"
            data={[]} // Empty data for now
          />
        </div>
      </div>
    </div>
  )
} 