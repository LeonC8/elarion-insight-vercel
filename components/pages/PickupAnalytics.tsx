"use client"

import { useState } from 'react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Button } from '@/components/ui/button'
import { ChevronDownIcon } from 'lucide-react'
import { DatePickerDemo as DatePicker } from "@/components/ui/date-picker"
import { HotelSelector } from '../new/HotelSelector'
import { addDays, format } from "date-fns"
import { Kpi } from '../new/Kpi'
import { TopFive } from '../new/TopFive'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ChartConfig } from '@/components/ui/chart'
import dynamic from 'next/dynamic'

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

// Create dummy time series data for each KPI
const generateDummyData = (baseValue: number, months: number = 7) => {
  return Array.from({ length: months }, (_, i) => {
    const month = new Date(2023, i, 1);
    const monthName = format(month, 'MMMM');
    const randomFactor = 0.9 + Math.random() * 0.2; // Random value between 0.9 and 1.1
    
    return {
      date: monthName,
      current: Math.round(baseValue * randomFactor),
      previous: Math.round(baseValue * randomFactor * 0.9)
    };
  });
};

// Country data for the world map
const countryData = [
  { country: "us", value: 285000 }, // United States
  { country: "gb", value: 195000 }, // United Kingdom
  { country: "de", value: 168000 }, // Germany
  { country: "fr", value: 142000 }, // France
  { country: "es", value: 125000 }, // Spain
  { country: "it", value: 98000 },  // Italy
  { country: "nl", value: 85000 },  // Netherlands
  { country: "ch", value: 75000 },  // Switzerland
  { country: "se", value: 65000 },  // Sweden
  { country: "be", value: 55000 },  // Belgium
];

// Chart config for segments
const segmentsChartConfig = {
  leisure: {
    label: "Leisure",
    color: "hsl(230, 70%, 55%)",      // Indigo
  },
  corporate: {
    label: "Corporate",
    color: "hsl(170, 75%, 40%)",      // Sea Green
  },
  groups: {
    label: "Groups",
    color: "hsl(300, 65%, 55%)",      // Magenta
  },
} satisfies ChartConfig;

// Chart config for booking channels
const bookingChannelsChartConfig = {
  direct: {
    label: "Direct Booking", 
    color: "hsl(198, 85%, 45%)",
  },
  booking: {
    label: "Booking.com",
    color: "hsl(150, 60%, 40%)",
  },
  expedia: {
    label: "Expedia",
    color: "hsl(280, 65%, 55%)",
  },
} satisfies ChartConfig;

// Chart config for room types
const roomTypesChartConfig = {
  deluxe: {
    label: "Deluxe Suite", 
    color: "hsl(190, 80%, 45%)",
  },
  executive: {
    label: "Executive Room",
    color: "hsl(140, 65%, 40%)",
  },
  standardDouble: {
    label: "Standard Double",
    color: "hsl(260, 70%, 55%)",
  },
} satisfies ChartConfig;

// Chart config for countries
const countryChartConfig = {
  us: {
    label: "United States",
    color: "hsl(246, 60%, 60%)",      // Modern Purple
  },
  uk: {
    label: "United Kingdom", 
    color: "hsl(180, 75%, 35%)",      // Teal
  },
  de: {
    label: "Germany",
    color: "hsl(322, 65%, 55%)",      // Rose Pink
  },
  fr: {
    label: "France",
    color: "hsl(15, 75%, 50%)",       // Coral Orange
  },
  es: {
    label: "Spain", 
    color: "hsl(45, 90%, 45%)",       // Golden Yellow
  }
} satisfies ChartConfig;

// Distribution data for pie charts
const segmentsDistributionData = [
  { name: "Leisure", value: 185000, percentage: 32.6, fill: "hsl(230, 70%, 55%)" },
  { name: "Corporate", value: 142000, percentage: 25.0, fill: "hsl(170, 75%, 40%)" },
  { name: "Groups", value: 98000, percentage: 17.2, fill: "hsl(300, 65%, 55%)" },
  { name: "Government", value: 75000, percentage: 13.2, fill: "hsl(190, 80%, 45%)" },
  { name: "Airlines", value: 68000, percentage: 12.0, fill: "hsl(140, 65%, 40%)" },
];

const bookingChannelsDistributionData = [
  { name: "Direct Booking", value: 165000, percentage: 31.2, fill: "hsl(198, 85%, 45%)" },
  { name: "Booking.com", value: 142000, percentage: 26.8, fill: "hsl(150, 60%, 40%)" },
  { name: "Expedia", value: 98000, percentage: 18.5, fill: "hsl(280, 65%, 55%)" },
  { name: "Hotels.com", value: 76000, percentage: 14.4, fill: "hsl(210, 80%, 50%)" },
  { name: "Airbnb", value: 48000, percentage: 9.1, fill: "hsl(340, 70%, 50%)" },
];

const roomTypesDistributionData = [
  { name: "Deluxe Suite", value: 156000, percentage: 29.5, fill: "hsl(190, 80%, 45%)" },
  { name: "Executive Room", value: 128000, percentage: 24.2, fill: "hsl(140, 65%, 40%)" },
  { name: "Standard Double", value: 95000, percentage: 18.0, fill: "hsl(260, 70%, 55%)" },
  { name: "Family Room", value: 82000, percentage: 15.5, fill: "hsl(230, 70%, 55%)" },
  { name: "Standard Single", value: 67000, percentage: 12.8, fill: "hsl(170, 75%, 40%)" },
];

const countryDistributionData = [
  { name: "United States", value: 285000, percentage: 28.5, fill: "hsl(246, 60%, 60%)" },
  { name: "United Kingdom", value: 195000, percentage: 19.5, fill: "hsl(180, 75%, 35%)" },
  { name: "Germany", value: 168000, percentage: 16.8, fill: "hsl(322, 65%, 55%)" },
  { name: "France", value: 142000, percentage: 14.2, fill: "hsl(198, 85%, 45%)" },
  { name: "Spain", value: 125000, percentage: 12.5, fill: "hsl(150, 60%, 40%)" },
];

// Time series data for the charts
const segmentsTimeSeriesData = [
  { 
    date: "January",
    categories: {
      leisure: { current: 185000, previous: 162500 },
      corporate: { current: 142000, previous: 150500 },
      groups: { current: 98000, previous: 86000 }
    }
  },
  { 
    date: "February",
    categories: {
      leisure: { current: 188000, previous: 165500 },
      corporate: { current: 140000, previous: 148500 },
      groups: { current: 99500, previous: 87500 }
    }
  },
  { 
    date: "March",
    categories: {
      leisure: { current: 183000, previous: 160500 },
      corporate: { current: 141000, previous: 149500 },
      groups: { current: 97000, previous: 85000 }
    }
  },
  { 
    date: "April",
    categories: {
      leisure: { current: 186000, previous: 163500 },
      corporate: { current: 143000, previous: 151500 },
      groups: { current: 98500, previous: 86500 }
    }
  },
  { 
    date: "May",
    categories: {
      leisure: { current: 189000, previous: 166500 },
      corporate: { current: 144000, previous: 152500 },
      groups: { current: 100000, previous: 88000 }
    }
  },
  { 
    date: "June",
    categories: {
      leisure: { current: 192000, previous: 169500 },
      corporate: { current: 145000, previous: 153500 },
      groups: { current: 101500, previous: 89500 }
    }
  },
  { 
    date: "July",
    categories: {
      leisure: { current: 185000, previous: 162500 },
      corporate: { current: 142000, previous: 150500 },
      groups: { current: 98000, previous: 86000 }
    }
  }
];

const bookingChannelsTimeSeriesData = [
  { 
    date: "January",
    categories: {
      direct: { current: 165000, previous: 145000 },
      booking: { current: 142000, previous: 125000 },
      expedia: { current: 98000, previous: 85000 }
    }
  },
  { 
    date: "February",
    categories: {
      direct: { current: 167000, previous: 147000 },
      booking: { current: 144000, previous: 127000 },
      expedia: { current: 100000, previous: 87000 }
    }
  },
  { 
    date: "March",
    categories: {
      direct: { current: 163000, previous: 143000 },
      booking: { current: 140000, previous: 123000 },
      expedia: { current: 96000, previous: 83000 }
    }
  },
  { 
    date: "April",
    categories: {
      direct: { current: 166000, previous: 146000 },
      booking: { current: 143000, previous: 126000 },
      expedia: { current: 99000, previous: 86000 }
    }
  },
  { 
    date: "May",
    categories: {
      direct: { current: 169000, previous: 149000 },
      booking: { current: 146000, previous: 129000 },
      expedia: { current: 102000, previous: 89000 }
    }
  },
  { 
    date: "June",
    categories: {
      direct: { current: 172000, previous: 152000 },
      booking: { current: 149000, previous: 132000 },
      expedia: { current: 105000, previous: 92000 }
    }
  },
  { 
    date: "July",
    categories: {
      direct: { current: 165000, previous: 145000 },
      booking: { current: 142000, previous: 125000 },
      expedia: { current: 98000, previous: 85000 }
    }
  }
];

const roomTypesTimeSeriesData = [
  { 
    date: "January",
    categories: {
      deluxe: { current: 156000, previous: 137500 },
      executive: { current: 128000, previous: 112800 },
      standardDouble: { current: 95000, previous: 100500 }
    }
  },
  { 
    date: "February",
    categories: {
      deluxe: { current: 158000, previous: 139500 },
      executive: { current: 130000, previous: 114800 },
      standardDouble: { current: 93000, previous: 98500 }
    }
  },
  { 
    date: "March",
    categories: {
      deluxe: { current: 155000, previous: 136500 },
      executive: { current: 127000, previous: 111800 },
      standardDouble: { current: 94000, previous: 99500 }
    }
  },
  { 
    date: "April",
    categories: {
      deluxe: { current: 157000, previous: 138500 },
      executive: { current: 129000, previous: 113800 },
      standardDouble: { current: 96000, previous: 101500 }
    }
  },
  { 
    date: "May",
    categories: {
      deluxe: { current: 159000, previous: 140500 },
      executive: { current: 131000, previous: 115800 },
      standardDouble: { current: 97000, previous: 102500 }
    }
  },
  { 
    date: "June",
    categories: {
      deluxe: { current: 161000, previous: 142500 },
      executive: { current: 133000, previous: 117800 },
      standardDouble: { current: 99000, previous: 104500 }
    }
  },
  { 
    date: "July",
    categories: {
      deluxe: { current: 156000, previous: 137500 },
      executive: { current: 128000, previous: 112800 },
      standardDouble: { current: 95000, previous: 100500 }
    }
  }
];

const countryTimeSeriesData = [
  { 
    date: "January",
    categories: {
      us: { current: 285000, previous: 253000 },
      uk: { current: 195000, previous: 170000 },
      de: { current: 168000, previous: 180000 },
      fr: { current: 142000, previous: 124000 },
      es: { current: 125000, previous: 110000 }
    }
  },
  { 
    date: "February",
    categories: {
      us: { current: 288000, previous: 255000 },
      uk: { current: 198000, previous: 172000 },
      de: { current: 165000, previous: 178000 },
      fr: { current: 144000, previous: 126000 },
      es: { current: 127000, previous: 112000 }
    }
  },
  { 
    date: "March",
    categories: {
      us: { current: 282000, previous: 254000 },
      uk: { current: 192000, previous: 171000 },
      de: { current: 166000, previous: 179000 },
      fr: { current: 140000, previous: 123000 },
      es: { current: 124000, previous: 109000 }
    }
  },
  { 
    date: "April",
    categories: {
      us: { current: 286000, previous: 256000 },
      uk: { current: 196000, previous: 173000 },
      de: { current: 164000, previous: 177000 },
      fr: { current: 143000, previous: 125000 },
      es: { current: 126000, previous: 111000 }
    }
  },
  { 
    date: "May",
    categories: {
      us: { current: 290000, previous: 258000 },
      uk: { current: 199000, previous: 174000 },
      de: { current: 167000, previous: 176000 },
      fr: { current: 145000, previous: 127000 },
      es: { current: 128000, previous: 113000 }
    }
  },
  { 
    date: "June",
    categories: {
      us: { current: 292000, previous: 260000 },
      uk: { current: 201000, previous: 176000 },
      de: { current: 169000, previous: 175000 },
      fr: { current: 147000, previous: 129000 },
      es: { current: 130000, previous: 115000 }
    }
  },
  { 
    date: "July",
    categories: {
      us: { current: 285000, previous: 253000 },
      uk: { current: 195000, previous: 170000 },
      de: { current: 168000, previous: 180000 },
      fr: { current: 142000, previous: 124000 },
      es: { current: 125000, previous: 110000 }
    }
  }
];

export function PickupAnalytics() {
  // State for filter selections
  const [selectedView, setSelectedView] = useState<'Day' | 'Month' | 'Year'>('Day')
  const [reportDate, setReportDate] = useState<Date>(new Date())
  const [selectedComparison, setSelectedComparison] = useState<string>("Yesterday")
  const [selectedHotels, setSelectedHotels] = useState<string[]>(["Hotel 1"])

  // Dummy time series data for each KPI
  const roomsSoldData = generateDummyData(627);
  const roomsRevenueData = generateDummyData(102000);
  const adrData = generateDummyData(164);
  const cancellationsData = generateDummyData(126);
  const revenueLostData = generateDummyData(20000);

  // Handle report date change
  const handleDateChange = (newDate: Date | undefined) => {
    if (newDate) {
      setReportDate(newDate)
    }
  }

  return (
    <div className="flex-1 overflow-auto">
      <div className="p-8">
        <div className="flex flex-col mb-6">
          <div className="flex justify-between items-center">  
            <div className="flex items-center">
              <h2 className="text-3xl font-bold text-gray-800">Pickup Analytics</h2>
            </div>
            <div className="flex space-x-4 items-center">
              {/* View Type Dropdown (Day/Month/Year) */}
              <div className="flex flex-col">
                <span className="text-xs text-gray-500 mb-2">View type</span>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button 
                      variant="ghost" 
                      className="bg-[#f2f8ff] hover:bg-[#f2f8ff] text-[#342630] rounded-full px-4"
                    >
                      {selectedView} <ChevronDownIcon className="ml-2 h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent>
                    <DropdownMenuItem onSelect={() => setSelectedView('Day')}>
                      Day
                    </DropdownMenuItem>
                    <DropdownMenuItem onSelect={() => setSelectedView('Month')}>
                      Month
                    </DropdownMenuItem>
                    <DropdownMenuItem onSelect={() => setSelectedView('Year')}>
                      Year
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

              {/* Report Date Picker */}
              <div className="flex flex-col">
                <span className="text-xs text-gray-500 mb-2">Report date</span>
                <DatePicker 
                  date={reportDate} 
                  onDateChange={handleDateChange}
                />
              </div>

              {/* Comparison Dropdown */}
              <div className="flex flex-col">
                <span className="text-xs text-gray-500 mb-2">Compare with</span>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button 
                      variant="ghost" 
                      className="bg-[#f2f8ff] hover:bg-[#f2f8ff] text-[#342630] rounded-full px-4"
                    >
                      {selectedComparison} <ChevronDownIcon className="ml-2 h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent>
                    <DropdownMenuItem onSelect={() => setSelectedComparison('Yesterday')}>
                      Yesterday
                    </DropdownMenuItem>
                    <DropdownMenuItem onSelect={() => setSelectedComparison('Last 7 days')}>
                      Last 7 days
                    </DropdownMenuItem>
                    <DropdownMenuItem onSelect={() => setSelectedComparison('Last 15 days')}>
                      Last 15 days
                    </DropdownMenuItem>
                    <DropdownMenuItem onSelect={() => setSelectedComparison('Last 30 days')}>
                      Last 30 days
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

              {/* Hotel Selector */}
              <div className="flex flex-col">
                <span className="text-xs text-gray-500 mb-2">Property</span>
                <HotelSelector 
                  selectedHotels={selectedHotels}
                  setSelectedHotels={setSelectedHotels}
                />
              </div>
            </div>
          </div>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-6 mt-6">
          <Kpi
            title="Rooms sold"
            currentValue={627}
            percentageChange={-9}
            prefix=""
            color="blue"
            mainTimeSeriesData={roomsSoldData}
          />
          <Kpi
            title="Rooms revenue"
            currentValue={102000}
            percentageChange={9}
            prefix="$"
            color="blue"
            mainTimeSeriesData={roomsRevenueData}
          />
          <Kpi
            title="ADR"
            currentValue={164}
            percentageChange={138}
            prefix="$"
            color="green"
            mainTimeSeriesData={adrData}
          />
          <Kpi
            title="Cancellations"
            currentValue={126}
            percentageChange={9}
            prefix=""
            color="blue"
            mainTimeSeriesData={cancellationsData}
          />
          <Kpi
            title="Revenue lost"
            currentValue={20000}
            percentageChange={9}
            prefix="$"
            color="blue"
            mainTimeSeriesData={revenueLostData}
          />
        </div>

        {/* Market Segments, Booking Channels, Room Types */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8">
          <TopFive 
            title="Market Segments"
            color="blue"
            metrics={[
              {
                key: 'revenue',
                label: 'Revenue',
                prefix: '$',
                data: [
                  { name: "Leisure", value: 185000, change: 22500 },
                  { name: "Corporate", value: 142000, change: -8500 },
                  { name: "Groups", value: 98000, change: 12000 },
                  { name: "Government", value: 75000, change: 5500 },
                  { name: "Airlines", value: 68000, change: 7800 },
                ]
              },
              {
                key: 'rooms',
                label: 'Rooms Sold',
                data: [
                  { name: "Leisure", value: 1250, change: 180 },
                  { name: "Corporate", value: 980, change: -65 },
                  { name: "Groups", value: 720, change: 95 },
                  { name: "Government", value: 520, change: 45 },
                  { name: "Airlines", value: 480, change: 55 },
                ]
              }
            ]}
            distributionData={segmentsDistributionData}
            categoryTimeSeriesData={segmentsTimeSeriesData}
            chartConfig={segmentsChartConfig}
          />
          <TopFive 
            title="Booking Channels"
            color="purple"
            metrics={[
              {
                key: 'revenue',
                label: 'Revenue',
                prefix: '$',
                data: [
                  { name: "Direct Booking", value: 165000, change: 20000 },
                  { name: "Booking.com", value: 142000, change: 17000 },
                  { name: "Expedia", value: 98000, change: -5000 },
                  { name: "Hotels.com", value: 76000, change: 8500 },
                  { name: "Airbnb", value: 48000, change: 6200 },
                ]
              },
              {
                key: 'rooms',
                label: 'Rooms Sold',
                data: [
                  { name: "Direct Booking", value: 1100, change: 150 },
                  { name: "Booking.com", value: 950, change: 120 },
                  { name: "Expedia", value: 680, change: -40 },
                  { name: "Hotels.com", value: 520, change: 60 },
                  { name: "Airbnb", value: 320, change: 45 },
                ]
              }
            ]}
            distributionData={bookingChannelsDistributionData}
            categoryTimeSeriesData={bookingChannelsTimeSeriesData}
            chartConfig={bookingChannelsChartConfig}
          />
          <TopFive 
            title="Room Types"
            color="green"
            metrics={[
              {
                key: 'revenue',
                label: 'Revenue',
                prefix: '$',
                data: [
                  { name: "Deluxe Suite", value: 156000, change: 18500 },
                  { name: "Executive Room", value: 128000, change: 15200 },
                  { name: "Standard Double", value: 95000, change: -5500 },
                  { name: "Family Room", value: 82000, change: 9800 },
                  { name: "Standard Single", value: 67000, change: 7200 },
                ]
              },
              {
                key: 'rooms',
                label: 'Rooms Sold',
                data: [
                  { name: "Deluxe Suite", value: 850, change: 95 },
                  { name: "Executive Room", value: 920, change: 110 },
                  { name: "Standard Double", value: 1150, change: -75 },
                  { name: "Family Room", value: 580, change: 65 },
                  { name: "Standard Single", value: 780, change: 85 },
                ]
              }
            ]}
            distributionData={roomTypesDistributionData}
            categoryTimeSeriesData={roomTypesTimeSeriesData}
            chartConfig={roomTypesChartConfig}
          />
        </div>

        {/* Geo Source (World Map) */}
        <div className="mt-8">
          <Card className="bg-white rounded-lg overflow-hidden">
            <CardHeader className="flex flex-col items-start">
              <div className="flex w-full justify-between items-center">
                <div>
                  <CardTitle className="text-lg font-semibold text-gray-800 mb-3">Global Distribution</CardTitle>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-8">
                {/* World Map Side */}
                <div>
                  <div className="h-[500px] flex justify-center items-center">
                    <WorldMap
                      color="rgb(59, 130, 246)"
                      title=""
                      valueSuffix="$"
                      size="xl"
                      data={countryData}
                      tooltipBgColor="black"
                      tooltipTextColor="white"
                      richInteraction={true}
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
                </div>

                {/* Top Five Countries Side */}
                <div className="border-l border-gray-100 pl-8">
                  <TopFive 
                    title="Top Countries"
                    color="blue"
                    withBorder={false}
                    metrics={[
                      {
                        key: 'revenue',
                        label: 'Revenue',
                        prefix: '$',
                        data: [
                          { name: "United States", value: 285000, change: 32000 },
                          { name: "United Kingdom", value: 195000, change: 25000 },
                          { name: "Germany", value: 168000, change: -12000 },
                          { name: "France", value: 142000, change: 18000 },
                          { name: "Spain", value: 125000, change: 15000 },
                        ]
                      },
                      {
                        key: 'rooms',
                        label: 'Rooms Sold',
                        data: [
                          { name: "United States", value: 1850, change: 220 },
                          { name: "United Kingdom", value: 1320, change: 180 },
                          { name: "Germany", value: 1150, change: -85 },
                          { name: "France", value: 980, change: 120 },
                          { name: "Spain", value: 850, change: 95 },
                        ]
                      }
                    ]}
                    distributionData={countryDistributionData}
                    categoryTimeSeriesData={countryTimeSeriesData}
                    chartConfig={countryChartConfig}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
} 