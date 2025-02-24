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

// First, add this constant at the top of the file with other constants
const countryData = [
  { country: "us", value: 285000 }, // United States
  { country: "gb", value: 195000 }, // United Kingdom
  { country: "de", value: 168000 }, // Germany
  { country: "fr", value: 142000 }, // France
  { country: "es", value: 125000 }, // Spain
  // Add more countries with lower values to show contrast
  { country: "it", value: 98000 },  // Italy
  { country: "nl", value: 85000 },  // Netherlands
  { country: "ch", value: 75000 },  // Switzerland
  { country: "se", value: 65000 },  // Sweden
  { country: "be", value: 55000 },  // Belgium
];

// Update the sample data section with more variable datasets
const totalRevenueChartData = [
  { date: "January", current: 12500, previous: 13200 },  // Previous higher
  { date: "February", current: 13800, previous: 12800 },
  { date: "March", current: 13200, previous: 12000 },
  { date: "April", current: 14100, previous: 11800 },
  { date: "May", current: 13600, previous: 12200 },
  { date: "June", current: 14800, previous: 13900 }, // Previous close to current
  { date: "July", current: 15200, previous: 12100 },
]

const roomRevenueChartData = [
  { date: "January", current: 8500, previous: 7500 },
  { date: "February", current: 8800, previous: 7700 },
  { date: "March", current: 8600, previous: 7600 },
  { date: "April", current: 8400, previous: 7400 },
  { date: "May", current: 8500, previous: 7500 },
  { date: "June", current: 9000, previous: 8000 },
  { date: "July", current: 10200, previous: 8500 },
]

const fnbRevenueChartData = [
  { date: "January", current: 2500, previous: 2200 },
  { date: "February", current: 2600, previous: 2300 },
  { date: "March", current: 2500, previous: 2400 },
  { date: "April", current: 2400, previous: 2300 },
  { date: "May", current: 2500, previous: 2400 },
  { date: "June", current: 2600, previous: 2400 },
  { date: "July", current: 3000, previous: 2500 },
]

const otherRevenueChartData = [
  { date: "January", current: 1500, previous: 1300 },
  { date: "February", current: 1400, previous: 1200 },
  { date: "March", current: 1500, previous: 1400 },
  { date: "April", current: 1600, previous: 1600 },
  { date: "May", current: 1500, previous: 1600 },
  { date: "June", current: 1400, previous: 1400 },
  { date: "July", current: 2000, previous: 1100 },
]

const occupancyChartData = [
  { date: "January", current: 75, previous: 82 },    // Previous higher
  { date: "February", current: 82, previous: 79 },
  { date: "March", current: 78, previous: 71 },
  { date: "April", current: 83, previous: 70 },
  { date: "May", current: 79, previous: 76 },
  { date: "June", current: 87, previous: 85 },      // Previous close to current
  { date: "July", current: 85, previous: 75 },
]

const adrChartData = [
  { date: "January", current: 185, previous: 175 },
  { date: "February", current: 195, previous: 178 },
  { date: "March", current: 188, previous: 176 },
  { date: "April", current: 198, previous: 177 },
  { date: "May", current: 192, previous: 178 },
  { date: "June", current: 201, previous: 180 },
  { date: "July", current: 205, previous: 185 },
]

const cancellationsChartData = [
  { date: "January", current: 25, previous: 28 },
  { date: "February", current: 22, previous: 26 },
  { date: "March", current: 24, previous: 27 },
  { date: "April", current: 20, previous: 25 },
  { date: "May", current: 18, previous: 24 },
  { date: "June", current: 15, previous: 22 },
  { date: "July", current: 12, previous: 20 },
];

const noShowsChartData = [
  { date: "January", current: 8, previous: 10 },
  { date: "February", current: 7, previous: 9 },
  { date: "March", current: 8, previous: 11 },
  { date: "April", current: 6, previous: 8 },
  { date: "May", current: 5, previous: 7 },
  { date: "June", current: 4, previous: 6 },
  { date: "July", current: 3, previous: 5 },
];

const roomsSoldChartData = [
  { date: "January", current: 1650, previous: 1450 },
  { date: "February", current: 1820, previous: 1500 },
  { date: "March", current: 1750, previous: 1550 },
  { date: "April", current: 1890, previous: 1600 },
  { date: "May", current: 1780, previous: 1620 },
  { date: "June", current: 1920, previous: 1640 },
  { date: "July", current: 1850, previous: 1650 },
]

// Add distribution data for Total Revenue
const totalRevenueDistribution = [
  { name: "Room Revenue", value: 10200, percentage: 67.1, fill: "hsl(152, 76.2%, 36.3%)" },
  { name: "F&B Revenue", value: 3000, percentage: 19.7, fill: "hsl(45, 93%, 47%)" },
  { name: "Other Revenue", value: 2000, percentage: 13.2, fill: "hsl(0, 84%, 92%)" },
]

// Add category time series data for Total Revenue
const totalRevenueCategoryData = [
  { 
    date: "January",
    categories: {
      room: { current: 8500, previous: 7500 },
      fnb: { current: 2500, previous: 2200 },
      other: { current: 1500, previous: 1300 }
    }
  },
  { 
    date: "February",
    categories: {
      room: { current: 8800, previous: 7700 },
      fnb: { current: 2600, previous: 2300 },
      other: { current: 1400, previous: 1200 }
    }
  },
  { 
    date: "March",
    categories: {
      room: { current: 8600, previous: 7600 },
      fnb: { current: 2500, previous: 2400 },
      other: { current: 1500, previous: 1400 }
    }
  },
  { 
    date: "April",
    categories: {
      room: { current: 8400, previous: 7400 },
      fnb: { current: 2400, previous: 2300 },
      other: { current: 1600, previous: 1600 }
    }
  },
  { 
    date: "May",
    categories: {
      room: { current: 8500, previous: 7500 },
      fnb: { current: 2500, previous: 2400 },
      other: { current: 1500, previous: 1600 }
    }
  },
  { 
    date: "June",
    categories: {
      room: { current: 9000, previous: 8000 },
      fnb: { current: 2600, previous: 2400 },
      other: { current: 1400, previous: 1400 }
    }
  },
  { 
    date: "July",
    categories: {
      room: { current: 10200, previous: 8500 },
      fnb: { current: 3000, previous: 2500 },
      other: { current: 2000, previous: 1100 }
    }
  }
]

// Add RevPAR data (Revenue Per Available Room)
const revparChartData = [
  { date: "January", current: 156.25, previous: 142.50 },
  { date: "February", current: 165.80, previous: 148.20 },
  { date: "March", current: 162.40, previous: 145.80 },
  { date: "April", current: 169.50, previous: 151.20 },
  { date: "May", current: 164.75, previous: 153.40 },
  { date: "June", current: 171.20, previous: 158.60 },
  { date: "July", current: 174.25, previous: 159.80 },
]

// Add TRevPAR data (Total Revenue Per Available Room)
const trevparChartData = [
  { date: "January", current: 195.30, previous: 178.40 },
  { date: "February", current: 201.50, previous: 182.60 },
  { date: "March", current: 198.70, previous: 180.20 },
  { date: "April", current: 208.40, previous: 185.30 },
  { date: "May", current: 204.80, previous: 188.50 },
  { date: "June", current: 211.20, previous: 192.40 },
  { date: "July", current: 215.50, previous: 195.60 },
]

// Update country chart config with distinct colors
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
} satisfies ChartConfig

// Update producers chart config with distinct colors
const producersChartConfig = {
  booking: {
    label: "Booking.com",
    color: "hsl(198, 85%, 45%)",      // Bright Blue
  },
  direct: {
    label: "Direct Website",
    color: "hsl(150, 60%, 40%)",      // Emerald
  },
  corporate: {
    label: "Corporate Partners",
    color: "hsl(280, 65%, 55%)",      // Violet
  },
} satisfies ChartConfig

// Update demographics chart config with distinct colors
const demographicsChartConfig = {
  age3544: {
    label: "35-44 years",
    color: "hsl(210, 80%, 50%)",      // Royal Blue
  },
  age4554: {
    label: "45-54 years",
    color: "hsl(340, 70%, 50%)",      // Bright Pink
  },
  age2534: {
    label: "25-34 years",
    color: "hsl(160, 65%, 40%)",      // Deep Green
  },
} satisfies ChartConfig

// Update segments chart config with distinct colors
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
} satisfies ChartConfig

// Update room types chart config with distinct colors
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
  family: {
    label: "Family Room",
    color: "hsl(230, 70%, 55%)",
  },
  standardSingle: {
    label: "Standard Single",
    color: "hsl(170, 75%, 40%)",
  }
} satisfies ChartConfig

// Also update the distribution data colors to match their respective configs
const countryDistributionData = [
  { name: "United States", value: 285000, percentage: 28.5, fill: "hsl(246, 60%, 60%)" },
  { name: "United Kingdom", value: 195000, percentage: 19.5, fill: "hsl(180, 75%, 35%)" },
  { name: "Germany", value: 168000, percentage: 16.8, fill: "hsl(322, 65%, 55%)" },
  { name: "France", value: 142000, percentage: 14.2, fill: "hsl(198, 85%, 45%)" },
  { name: "Spain", value: 125000, percentage: 12.5, fill: "hsl(150, 60%, 40%)" },
]

const producersDistributionData = [
  { name: "Booking.com", value: 125000, percentage: 27.5, fill: "hsl(198, 85%, 45%)" },
  { name: "Direct Website", value: 98000, percentage: 21.5, fill: "hsl(150, 60%, 40%)" },
  { name: "Corporate Partners", value: 85000, percentage: 18.7, fill: "hsl(280, 65%, 55%)" },
  { name: "Travel Agencies", value: 76000, percentage: 16.7, fill: "hsl(210, 80%, 50%)" },
  { name: "Expedia", value: 72000, percentage: 15.6, fill: "hsl(340, 70%, 50%)" },
]

const demographicsDistributionData = [
  { name: "35-44 years", value: 95000, percentage: 25.1, fill: "hsl(210, 80%, 50%)" },
  { name: "45-54 years", value: 88000, percentage: 23.3, fill: "hsl(340, 70%, 50%)" },
  { name: "25-34 years", value: 82000, percentage: 21.7, fill: "hsl(160, 65%, 40%)" },
  { name: "55-64 years", value: 68000, percentage: 18.0, fill: "hsl(230, 70%, 55%)" },
  { name: "18-24 years", value: 45000, percentage: 11.9, fill: "hsl(170, 75%, 40%)" },
]

const segmentsDistributionData = [
  { name: "Leisure", value: 185000, percentage: 32.6, fill: "hsl(230, 70%, 55%)" },
  { name: "Corporate", value: 142000, percentage: 25.0, fill: "hsl(170, 75%, 40%)" },
  { name: "Groups", value: 98000, percentage: 17.2, fill: "hsl(300, 65%, 55%)" },
  { name: "Government", value: 75000, percentage: 13.2, fill: "hsl(190, 80%, 45%)" },
  { name: "Airlines", value: 68000, percentage: 12.0, fill: "hsl(140, 65%, 40%)" },
]

const roomTypesDistributionData = [
  { name: "Deluxe Suite", value: 156000, percentage: 29.5, fill: "hsl(190, 80%, 45%)" },
  { name: "Executive Room", value: 128000, percentage: 24.2, fill: "hsl(140, 65%, 40%)" },
  { name: "Standard Double", value: 95000, percentage: 18.0, fill: "hsl(260, 70%, 55%)" },
  { name: "Family Room", value: 82000, percentage: 15.5, fill: "hsl(230, 70%, 55%)" },
  { name: "Standard Single", value: 67000, percentage: 12.8, fill: "hsl(170, 75%, 40%)" },
]

// Add time series data for countries
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
]

// Add time series data for producers
const producersTimeSeriesData = [
  { 
    date: "January",
    categories: {
      booking: { current: 125000, previous: 108500 },
      direct: { current: 98000, previous: 80000 },
      corporate: { current: 85000, previous: 92500 }
    }
  },
  { 
    date: "February",
    categories: {
      booking: { current: 127000, previous: 110000 },
      direct: { current: 99500, previous: 81500 },
      corporate: { current: 83000, previous: 90000 }
    }
  },
  { 
    date: "March",
    categories: {
      booking: { current: 124000, previous: 107000 },
      direct: { current: 97000, previous: 79000 },
      corporate: { current: 84000, previous: 91500 }
    }
  },
  { 
    date: "April",
    categories: {
      booking: { current: 126000, previous: 109500 },
      direct: { current: 98500, previous: 80500 },
      corporate: { current: 82000, previous: 89500 }
    }
  },
  { 
    date: "May",
    categories: {
      booking: { current: 128000, previous: 111500 },
      direct: { current: 100000, previous: 82000 },
      corporate: { current: 86000, previous: 93500 }
    }
  },
  { 
    date: "June",
    categories: {
      booking: { current: 130000, previous: 113500 },
      direct: { current: 101500, previous: 83500 },
      corporate: { current: 87000, previous: 94500 }
    }
  },
  { 
    date: "July",
    categories: {
      booking: { current: 125000, previous: 108500 },
      direct: { current: 98000, previous: 80000 },
      corporate: { current: 85000, previous: 92500 }
    }
  }
]

// Add time series data for demographics
const demographicsTimeSeriesData = [
  { 
    date: "January",
    categories: {
      age3544: { current: 95000, previous: 76500 },
      age4554: { current: 88000, previous: 75700 },
      age2534: { current: 82000, previous: 56200 }
    }
  },
  { 
    date: "February",
    categories: {
      age3544: { current: 97000, previous: 78500 },
      age4554: { current: 89500, previous: 77200 },
      age2534: { current: 83500, previous: 57700 }
    }
  },
  { 
    date: "March",
    categories: {
      age3544: { current: 94000, previous: 75500 },
      age4554: { current: 87000, previous: 74200 },
      age2534: { current: 81000, previous: 55200 }
    }
  },
  { 
    date: "April",
    categories: {
      age3544: { current: 96000, previous: 77500 },
      age4554: { current: 88500, previous: 76200 },
      age2534: { current: 82500, previous: 56700 }
    }
  },
  { 
    date: "May",
    categories: {
      age3544: { current: 98000, previous: 79500 },
      age4554: { current: 90000, previous: 77700 },
      age2534: { current: 84000, previous: 58200 }
    }
  },
  { 
    date: "June",
    categories: {
      age3544: { current: 99500, previous: 81000 },
      age4554: { current: 91500, previous: 79200 },
      age2534: { current: 85500, previous: 59700 }
    }
  },
  { 
    date: "July",
    categories: {
      age3544: { current: 95000, previous: 76500 },
      age4554: { current: 88000, previous: 75700 },
      age2534: { current: 82000, previous: 56200 }
    }
  }
]

// Add time series data for segments
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
]

// Add time series data for room types
const roomTypesTimeSeriesData = [
  { 
    date: "January",
    categories: {
      deluxe: { current: 156000, previous: 137500 },
      executive: { current: 128000, previous: 112800 },
      standard: { current: 95000, previous: 100500 }
    }
  },
  { 
    date: "February",
    categories: {
      deluxe: { current: 158000, previous: 139500 },
      executive: { current: 130000, previous: 114800 },
      standard: { current: 93000, previous: 98500 }
    }
  },
  { 
    date: "March",
    categories: {
      deluxe: { current: 155000, previous: 136500 },
      executive: { current: 127000, previous: 111800 },
      standard: { current: 94000, previous: 99500 }
    }
  },
  { 
    date: "April",
    categories: {
      deluxe: { current: 157000, previous: 138500 },
      executive: { current: 129000, previous: 113800 },
      standard: { current: 92000, previous: 97500 }
    }
  },
  { 
    date: "May",
    categories: {
      deluxe: { current: 159000, previous: 140500 },
      executive: { current: 131000, previous: 115800 },
      standard: { current: 96000, previous: 101500 }
    }
  },
  { 
    date: "June",
    categories: {
      deluxe: { current: 161000, previous: 142500 },
      executive: { current: 133000, previous: 117800 },
      standard: { current: 97000, previous: 102500 }
    }
  },
  { 
    date: "July",
    categories: {
      deluxe: { current: 156000, previous: 137500 },
      executive: { current: 128000, previous: 112800 },
      standard: { current: 95000, previous: 100500 }
    }
  }
]

// Add room revenue distribution data
const roomRevenueDistribution = [
  { name: "Deluxe Suite", value: 4590000, percentage: 45.0, fill: "hsl(190, 80%, 45%)" },
  { name: "Executive Room", value: 2856000, percentage: 28.0, fill: "hsl(140, 65%, 40%)" },
  { name: "Standard Double", value: 1734000, percentage: 17.0, fill: "hsl(260, 70%, 55%)" },
  { name: "Family Room", value: 612000, percentage: 6.0, fill: "hsl(230, 70%, 55%)" },
  { name: "Standard Single", value: 408000, percentage: 4.0, fill: "hsl(170, 75%, 40%)" },
]

// Update room revenue category time series data
const roomRevenueCategoryData = [
  { 
    date: "January",
    categories: {
      deluxe: { current: 3825, previous: 3375 },
      executive: { current: 2380, previous: 2100 },
      standard: { current: 1445, previous: 1275 }
    }
  },
  { 
    date: "February",
    categories: {
      deluxe: { current: 3900, previous: 3400 },
      executive: { current: 2450, previous: 2150 },
      standard: { current: 1500, previous: 1300 }
    }
  },
  { 
    date: "March",
    categories: {
      deluxe: { current: 3850, previous: 3350 },
      executive: { current: 2400, previous: 2125 },
      standard: { current: 1475, previous: 1285 }
    }
  },
  { 
    date: "April",
    categories: {
      deluxe: { current: 3800, previous: 3300 },
      executive: { current: 2350, previous: 2075 },
      standard: { current: 1425, previous: 1250 }
    }
  },
  { 
    date: "May",
    categories: {
      deluxe: { current: 3875, previous: 3325 },
      executive: { current: 2425, previous: 2100 },
      standard: { current: 1450, previous: 1275 }
    }
  },
  { 
    date: "June",
    categories: {
      deluxe: { current: 4200, previous: 3600 },
      executive: { current: 2600, previous: 2250 },
      standard: { current: 1550, previous: 1350 }
    }
  },
  { 
    date: "July",
    categories: {
      deluxe: { current: 4590, previous: 3825 },
      executive: { current: 2856, previous: 2380 },
      standard: { current: 1734, previous: 1445 }
    }
  }
] satisfies CategoryTimeSeriesData[]

// Add rooms sold distribution data
const roomsSoldDistribution = [
  { name: "Deluxe Suite", value: 555, percentage: 30.0, fill: "hsl(190, 80%, 45%)" },
  { name: "Executive Room", value: 481, percentage: 26.0, fill: "hsl(140, 65%, 40%)" },
  { name: "Standard Double", value: 407, percentage: 22.0, fill: "hsl(260, 70%, 55%)" },
  { name: "Family Room", value: 241, percentage: 13.0, fill: "hsl(230, 70%, 55%)" },
  { name: "Standard Single", value: 166, percentage: 9.0, fill: "hsl(170, 75%, 40%)" },
]

// Update rooms sold category time series data
const roomsSoldCategoryData = [
  { 
    date: "January",
    categories: {
      deluxe: { current: 495, previous: 435 },
      executive: { current: 429, previous: 377 },
      standardDouble: { current: 363, previous: 319 },
      family: { current: 220, previous: 190 },
      standardSingle: { current: 143, previous: 129 }
    }
  },
  { 
    date: "February",
    categories: {
      deluxe: { current: 510, previous: 445 },
      executive: { current: 440, previous: 385 },
      standardDouble: { current: 375, previous: 325 },
      family: { current: 230, previous: 195 },
      standardSingle: { current: 155, previous: 135 }
    }
  },
  { 
    date: "March",
    categories: {
      deluxe: { current: 505, previous: 440 },
      executive: { current: 435, previous: 380 },
      standardDouble: { current: 370, previous: 322 },
      family: { current: 225, previous: 193 },
      standardSingle: { current: 150, previous: 132 }
    }
  },
  { 
    date: "April",
    categories: {
      deluxe: { current: 515, previous: 450 },
      executive: { current: 445, previous: 390 },
      standardDouble: { current: 380, previous: 330 },
      family: { current: 235, previous: 198 },
      standardSingle: { current: 160, previous: 138 }
    }
  },
  { 
    date: "May",
    categories: {
      deluxe: { current: 520, previous: 455 },
      executive: { current: 450, previous: 395 },
      standardDouble: { current: 385, previous: 335 },
      family: { current: 238, previous: 200 },
      standardSingle: { current: 163, previous: 140 }
    }
  },
  { 
    date: "June",
    categories: {
      deluxe: { current: 535, previous: 470 },
      executive: { current: 465, previous: 410 },
      standardDouble: { current: 395, previous: 345 },
      family: { current: 240, previous: 205 },
      standardSingle: { current: 165, previous: 145 }
    }
  },
  { 
    date: "July",
    categories: {
      deluxe: { current: 555, previous: 495 },
      executive: { current: 481, previous: 429 },
      standardDouble: { current: 407, previous: 363 },
      family: { current: 241, previous: 210 },
      standardSingle: { current: 166, previous: 153 }
    }
  }
] satisfies CategoryTimeSeriesData[]

// Add F&B revenue distribution data
const fnbRevenueDistribution = [
  { name: "Restaurant", value: 1500, percentage: 50.0, fill: "hsl(190, 80%, 45%)" },
  { name: "Bar", value: 750, percentage: 25.0, fill: "hsl(140, 65%, 40%)" },
  { name: "Room Service", value: 450, percentage: 15.0, fill: "hsl(260, 70%, 55%)" },
  { name: "Banquet", value: 300, percentage: 10.0, fill: "hsl(230, 70%, 55%)" },
]

// Add F&B revenue category time series data
const fnbRevenueCategoryData = [
  { 
    date: "January",
    categories: {
      restaurant: { current: 1250, previous: 1100 },
      bar: { current: 625, previous: 550 },
      roomService: { current: 375, previous: 330 }
    }
  },
  { 
    date: "February",
    categories: {
      restaurant: { current: 1300, previous: 1150 },
      bar: { current: 650, previous: 575 },
      roomService: { current: 400, previous: 350 }
    }
  },
  { 
    date: "March",
    categories: {
      restaurant: { current: 1350, previous: 1200 },
      bar: { current: 675, previous: 580 },
      roomService: { current: 425, previous: 370 }
    }
  },
  { 
    date: "April",
    categories: {
      restaurant: { current: 1400, previous: 1250 },
      bar: { current: 700, previous: 600 },
      roomService: { current: 450, previous: 390 }
    }
  },
  { 
    date: "May",
    categories: {
      restaurant: { current: 1450, previous: 1300 },
      bar: { current: 725, previous: 625 },
      roomService: { current: 475, previous: 410 }
    }
  },
  { 
    date: "June",
    categories: {
      restaurant: { current: 1500, previous: 1350 },
      bar: { current: 750, previous: 650 },
      roomService: { current: 500, previous: 430 }
    }
  },
  { 
    date: "July",
    categories: {
      restaurant: { current: 1550, previous: 1400 },
      bar: { current: 775, previous: 675 },
      roomService: { current: 525, previous: 450 }
    }
  }
]

// Add other revenue distribution data
const otherRevenueDistribution = [
  { name: "Spa & Wellness", value: 800, percentage: 40.0, fill: "hsl(190, 80%, 45%)" },
  { name: "Parking", value: 500, percentage: 25.0, fill: "hsl(140, 65%, 40%)" },
  { name: "Events", value: 400, percentage: 20.0, fill: "hsl(260, 70%, 55%)" },
  { name: "Misc Services", value: 300, percentage: 15.0, fill: "hsl(230, 70%, 55%)" },
]

// Add other revenue category time series data
const otherRevenueCategoryData = [
  { 
    date: "January",
    categories: {
      spa: { current: 600, previous: 520 },
      parking: { current: 375, previous: 325 },
      events: { current: 300, previous: 260 }
    }
  },
  { 
    date: "February",
    categories: {
      spa: { current: 620, previous: 540 },
      parking: { current: 380, previous: 330 },
      events: { current: 320, previous: 280 }
    }
  },
  { 
    date: "March",
    categories: {
      spa: { current: 640, previous: 560 },
      parking: { current: 390, previous: 340 },
      events: { current: 340, previous: 300 }
    }
  },
  { 
    date: "April",
    categories: {
      spa: { current: 660, previous: 580 },
      parking: { current: 400, previous: 350 },
      events: { current: 360, previous: 320 }
    }
  },
  { 
    date: "May",
    categories: {
      spa: { current: 680, previous: 600 },
      parking: { current: 410, previous: 360 },
      events: { current: 380, previous: 340 }
    }
  },
  { 
    date: "June",
    categories: {
      spa: { current: 700, previous: 620 },
      parking: { current: 420, previous: 370 },
      events: { current: 400, previous: 360 }
    }
  },
  { 
    date: "July",
    categories: {
      spa: { current: 720, previous: 640 },
      parking: { current: 430, previous: 380 },
      events: { current: 420, previous: 380 }
    }
  }
]

// Update the reservationsByDayData constant with previous period data
const reservationsByDayData = [
  { 
    dayOfWeek: "Monday", 
    bookingsCreated: 145, 
    prevBookingsCreated: 125,
    staysStarting: 168,
    prevStaysStarting: 155
  },
  { 
    dayOfWeek: "Tuesday", 
    bookingsCreated: 132, 
    prevBookingsCreated: 120,
    staysStarting: 142,
    prevStaysStarting: 130
  },
  { 
    dayOfWeek: "Wednesday", 
    bookingsCreated: 156, 
    prevBookingsCreated: 140,
    staysStarting: 187,
    prevStaysStarting: 165
  },
  { 
    dayOfWeek: "Thursday", 
    bookingsCreated: 123, 
    prevBookingsCreated: 115,
    staysStarting: 145,
    prevStaysStarting: 135
  },
  { 
    dayOfWeek: "Friday", 
    bookingsCreated: 198, 
    prevBookingsCreated: 175,
    staysStarting: 210,
    prevStaysStarting: 190
  },
  { 
    dayOfWeek: "Saturday", 
    bookingsCreated: 208, 
    prevBookingsCreated: 185,
    staysStarting: 245,
    prevStaysStarting: 220
  },
  { 
    dayOfWeek: "Sunday", 
    bookingsCreated: 167, 
    prevBookingsCreated: 150,
    staysStarting: 189,
    prevStaysStarting: 170
  },
]

// Add this constant with the other data constants at the top of the file
const cancellationLeadTimeData = [
  { range: "0-5 days", current: 45, previous: 52 },
  { range: "6-10 days", current: 38, previous: 41 },
  { range: "11-15 days", current: 32, previous: 35 },
  { range: "16-20 days", current: 25, previous: 28 },
  { range: "21-25 days", current: 18, previous: 20 },
  { range: "26-30 days", current: 12, previous: 15 },
  { range: ">30 days", current: 8, previous: 10 },
]

// Add these constants near the top where other data is defined
const hotelsByRegion = {
  "Europe": ["Hotel Paris", "Hotel London", "Hotel Berlin", "Hotel Madrid"],
  "North America": ["Hotel New York", "Hotel Miami", "Hotel Toronto"],
  "Asia": ["Hotel Tokyo", "Hotel Singapore", "Hotel Bangkok"]
}

const hotelsByBrand = {
  "Luxury Collection": ["Hotel Paris", "Hotel New York", "Hotel Tokyo"],
  "Premium Hotels": ["Hotel London", "Hotel Miami", "Hotel Singapore"],
  "Boutique Series": ["Hotel Berlin", "Hotel Madrid", "Hotel Bangkok", "Hotel Toronto"]
}

// Add this constant with the other data constants
const leadTimeData = [
  { 
    range: "0-7 days", 
    current: 245,
    previous: 220
  },
  { 
    range: "8-14 days", 
    current: 312,
    previous: 280
  },
  { 
    range: "15-30 days", 
    current: 456,
    previous: 410
  },
  { 
    range: "31-60 days", 
    current: 323,
    previous: 290
  },
  { 
    range: "61-90 days", 
    current: 198,
    previous: 175
  },
  { 
    range: "91-180 days", 
    current: 148,
    previous: 125
  },
  { 
    range: ">180 days", 
    current: 87,
    previous: 75
  },
]

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

export function OverviewCopy() {
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

  // Prepare the datasets for the HorizontalBarChartMultipleDatasets
  const barChartDatasets = [
    {
      key: "leadtime",
      title: "Lead Time Distribution",
      data: leadTimeData // Your existing leadTimeData
    },
    {
      key: "cancellation",
      title: "Cancellation Lead Time Distribution",
      data: cancellationLeadTimeData // Your existing cancellationLeadTimeData
    }
  ]

  // Add date change handler
  const handleDateChange = (newDate: Date | undefined) => {
    if (newDate) {
      setDate(newDate)
      // Here you can add any additional logic needed when the date changes
      // For example, fetching new data for the selected date
    }
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


      <div className="p-8 px-12  pt-[140px]">
    

        {/* KPI Grid */}
        <div className="grid grid-cols-4 gap-6 mb-8">
          <KpiWithSubtleChart
            title="Total Revenue"
            currentValue={15200}
            percentageChange={-8.3}
            chartData={totalRevenueChartData}
            prefix="€"
            valueColor="blue"
            
            icon={DollarSign}
          />
          <KpiWithSubtleChart
            title="Rooms Sold"
            currentValue={1850}
            percentageChange={-3.4}
            chartData={roomsSoldChartData}
            valueColor="blue"
            prefix=""
            chartConfig={roomTypesChartConfig}
            icon={Hotel}
          />
          <KpiWithSubtleChart
            title="ADR"
            currentValue={205}
            percentageChange={10.8}
            chartData={adrChartData}
            prefix="€"
            valueColor="green"
            icon={DollarSign}
          />
          <KpiWithSubtleChart
            title="Occupancy Rate"
            currentValue={85}
            percentageChange={-5.2}
            chartData={occupancyChartData}
            prefix=""
            suffix="%"
            valueColor="green"
            icon={Percent}
          />
        </div>

        {/* Second Row - KPIs without Charts */}
        <div className="grid grid-cols-5 gap-4 mb-8">
          
          <Kpi
            title="Room Revenue"
            currentValue={10200}
            percentageChange={-6.8}
            prefix="€"
            color="green"
            mainTimeSeriesData={roomRevenueChartData}
          />
          <Kpi
            title="F&B Revenue"
            currentValue={3000}
            percentageChange={15.2}
            prefix="€"
            color="blue"
            mainTimeSeriesData={fnbRevenueChartData}
          />
          <Kpi
            title="Other Revenue"
            currentValue={2000}
            percentageChange={-4.5}
            prefix="€"
            color="blue"
            mainTimeSeriesData={otherRevenueChartData}
          />
          <Kpi
            title="RevPAR"
            currentValue={174.25}
            percentageChange={-7.2}
            prefix="€"
            color="green"
            mainTimeSeriesData={revparChartData}
          />
          <Kpi
            title="TRevPAR"
            currentValue={215.50}
            percentageChange={11.2}
            prefix="€"
            color="blue"
            mainTimeSeriesData={trevparChartData}
          />
        </div>

        {/* Top Producers and Demographics */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-8">
          <TopFive 
            title="Top Producers Performance"
            color="blue"
            metrics={[
              {
                key: 'revenue',
                label: 'Revenue',
                prefix: '€',
                data: [
                  { name: "Booking.com", value: 125000, change: 16500 },
                  { name: "Direct Website", value: 98000, change: 18000 },
                  { name: "Corporate Partners", value: 85000, change: -7500 },
                  { name: "Travel Agencies", value: 76000, change: 8000 },
                  { name: "Expedia", value: 72000, change: -4000 },
                ]
              },
              {
                key: 'rooms',
                label: 'Rooms Sold',
                data: [
                  { name: "Booking.com", value: 850, change: 110 },
                  { name: "Direct Website", value: 720, change: 150 },
                  { name: "Corporate Partners", value: 580, change: -50 },
                  { name: "Travel Agencies", value: 510, change: 60 },
                  { name: "Expedia", value: 490, change: -35 },
                ]
              }
            ]}
            distributionData={producersDistributionData}
            categoryTimeSeriesData={producersTimeSeriesData}
            chartConfig={producersChartConfig}
          />
          <PieChartWithLabels />
        </div>

        {/* World Map */}
        <div className="mt-8">
          <Card className="bg-white  rounded-lg overflow-hidden">
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
                      valueSuffix="€"
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
                    title="Top Countries Performance"
                    color="blue"
                    withBorder={false}
                    metrics={[
                      {
                        key: 'revenue',
                        label: 'Revenue',
                        prefix: '€',
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
                      },
                      {
                        key: 'adr',
                        label: 'ADR',
                        prefix: '€',
                        data: [
                          { name: "United States", value: 154, change: 12 },
                          { name: "United Kingdom", value: 148, change: 8 },
                          { name: "Germany", value: 146, change: -5 },
                          { name: "France", value: 145, change: 10 },
                          { name: "Spain", value: 147, change: 9 },
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

        {/* Market Segments and Room Types */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-8">
          <TopFive 
            title="Market Segments Performance"
            color="blue"
            metrics={[
              {
                key: 'revenue',
                label: 'Revenue',
                prefix: '€',
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
            title="Room Types Performance"
            color="green"
            metrics={[
              {
                key: 'revenue',
                label: 'Revenue',
                prefix: '€',
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

        {/* New KPIs - moved outside the previous grid */}
        <div className="grid grid-cols-2 gap-6 mt-8">
          <KpiWithChart
            title="Cancellation Rate"
            initialValue={12}
            initialPercentageChange={-40}
            chartData={cancellationsChartData}
            metrics={[
              {
                key: 'cancellations',
                label: 'Number of Cancellations',
                data: cancellationsChartData,
                prefix: ''
              },
              {
                key: 'revenue',
                label: 'Revenue Lost',
                data: cancellationsChartData.map(item => ({
                  date: item.date,
                  current: item.current * 150,
                  previous: item.previous * 150
                })),
                prefix: '€'
              }
            ]}
            color="blue"
          />
          <KpiWithChart
            title="No-Show Rate"
            initialValue={3}
            percentageChange={-40}
            chartData={noShowsChartData}
            metrics={[
              {
                key: 'noshows',
                label: 'Number of No-Shows',
                data: noShowsChartData,
                prefix: ''
              }
            ]}
            color="blue"
          />
        </div>

        {/* Horizontal Bar Chart and Reservations by Day */}
        <div className="grid gap-4 grid-cols-2 pt-8">
          <HorizontalBarChartMultipleDatasets 
            datasets={barChartDatasets}
            defaultDataset="leadtime"
          />
          <ReservationsByDayChart data={reservationsByDayData} />
        </div>

      </div>
    </div>
  )
} 