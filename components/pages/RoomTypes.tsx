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
import type { CategoryTimeSeriesData } from '@/components/new/CategoriesDetailsDialog'
import { ReservationsByDayChart } from '../new/ReservationsByDayChart'
import { HorizontalBarChart } from '../new/HorizontalBarChart'
import { HotelSelector } from '../new/HotelSelector'
import { HorizontalBarChartMultipleDatasets } from "../new/HorizontalBarChartMultipleDatasets"
import { PieChartWithLabels } from "@/components/new/PieChartWithLabels"
import { addDays } from "date-fns"
import { DistributionChart } from '../new/DistributionChart'
import { CategoriesOverTimeChart } from '../new/CategoriesOverTimeChart'
import { ArrowUpIcon } from 'lucide-react'
import { CategoriesDetailContent } from '../new/CategoriesDetailContent'
import { TopFiveMultiple } from '../new/TopFiveMultiple'
import { RoomTypeUpgradesDowngrades } from '@/components/RoomTypeUpgradesDowngrades'

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

const ROOM_TYPES = {
  standard: {
    label: "Standard Room",
    color: "#18b0cc"
  },
  deluxe: {
    label: "Deluxe Room", 
    color: "#1eb09a"
  },
  suite: {
    label: "Suite",
    color: "#3b56de"
  },
  family: {
    label: "Family Room",
    color: "#713ddd"
  },
  executive: {
    label: "Executive Room",
    color: "#22a74f"
  }
} as const;

// Add this constant for country data near the top of your file with other constants
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

// Add country distribution data for each booking channel
const countryDistributionByChannel = {
  standard: [
    { name: "United States", value: 95000, percentage: 32.5, fill: "hsl(246, 60%, 60%)" },
    { name: "United Kingdom", value: 75000, percentage: 25.5, fill: "hsl(180, 75%, 35%)" },
    { name: "Germany", value: 48000, percentage: 16.0, fill: "hsl(322, 65%, 55%)" },
    { name: "France", value: 42000, percentage: 14.0, fill: "hsl(15, 75%, 50%)" },
    { name: "Spain", value: 35000, percentage: 12.0, fill: "hsl(45, 90%, 45%)" },
  ],
  deluxe: [
    { name: "United States", value: 85000, percentage: 29.0, fill: "hsl(246, 60%, 60%)" },
    { name: "United Kingdom", value: 65000, percentage: 22.5, fill: "hsl(180, 75%, 35%)" },
    { name: "Germany", value: 58000, percentage: 20.0, fill: "hsl(322, 65%, 55%)" },
    { name: "France", value: 45000, percentage: 15.5, fill: "hsl(15, 75%, 50%)" },
    { name: "Spain", value: 38000, percentage: 13.0, fill: "hsl(45, 90%, 45%)" },
  ],
  suite: [
    { name: "United States", value: 75000, percentage: 35.0, fill: "hsl(246, 60%, 60%)" },
    { name: "United Kingdom", value: 42000, percentage: 19.5, fill: "hsl(180, 75%, 35%)" },
    { name: "Germany", value: 38000, percentage: 17.5, fill: "hsl(322, 65%, 55%)" },
    { name: "France", value: 32000, percentage: 15.0, fill: "hsl(15, 75%, 50%)" },
    { name: "Spain", value: 28000, percentage: 13.0, fill: "hsl(45, 90%, 45%)" },
  ],
  family: [
    { name: "United States", value: 55000, percentage: 30.0, fill: "hsl(246, 60%, 60%)" },
    { name: "United Kingdom", value: 38000, percentage: 21.0, fill: "hsl(180, 75%, 35%)" },
    { name: "Germany", value: 35000, percentage: 19.0, fill: "hsl(322, 65%, 55%)" },
    { name: "France", value: 30000, percentage: 16.0, fill: "hsl(15, 75%, 50%)" },
    { name: "Spain", value: 25000, percentage: 14.0, fill: "hsl(45, 90%, 45%)" },
  ],
  executive: [
    { name: "United States", value: 45000, percentage: 28.0, fill: "hsl(246, 60%, 60%)" },
    { name: "United Kingdom", value: 35000, percentage: 22.0, fill: "hsl(180, 75%, 35%)" },
    { name: "Germany", value: 32000, percentage: 20.0, fill: "hsl(322, 65%, 55%)" },
    { name: "France", value: 28000, percentage: 17.0, fill: "hsl(15, 75%, 50%)" },
    { name: "Spain", value: 20000, percentage: 13.0, fill: "hsl(45, 90%, 45%)" },
  ]
};

// Add country time series data for each booking channel
const countryTimeSeriesByChannel = {
  standard: [
    { 
      date: "January",
      categories: {
        us: { current: 95000, previous: 83000 },
        uk: { current: 75000, previous: 65000 },
        de: { current: 48000, previous: 52000 },
        fr: { current: 42000, previous: 36000 },
        es: { current: 35000, previous: 31000 }
      }
    },
    { 
      date: "February",
      categories: {
        us: { current: 97000, previous: 85000 },
        uk: { current: 77000, previous: 67000 },
        de: { current: 46000, previous: 50000 },
        fr: { current: 44000, previous: 38000 },
        es: { current: 37000, previous: 33000 }
      }
    },
    // Add more months as needed
    { 
      date: "July",
      categories: {
        us: { current: 95000, previous: 83000 },
        uk: { current: 75000, previous: 65000 },
        de: { current: 48000, previous: 52000 },
        fr: { current: 42000, previous: 36000 },
        es: { current: 35000, previous: 31000 }
      }
    }
  ],
  deluxe: [
    // Similar structure for booking.com
    { 
      date: "January",
      categories: {
        us: { current: 85000, previous: 73000 },
        uk: { current: 65000, previous: 55000 },
        de: { current: 58000, previous: 62000 },
        fr: { current: 45000, previous: 39000 },
        es: { current: 38000, previous: 34000 }
      }
    },
    // Add more months
    { 
      date: "July",
      categories: {
        us: { current: 85000, previous: 73000 },
        uk: { current: 65000, previous: 55000 },
        de: { current: 58000, previous: 62000 },
        fr: { current: 45000, previous: 39000 },
        es: { current: 38000, previous: 34000 }
      }
    }
  ],
  // Add similar data for expedia, gds, and wholesalers
  suite: [
    { 
      date: "January",
      categories: {
        us: { current: 75000, previous: 63000 },
        uk: { current: 42000, previous: 32000 },
        de: { current: 38000, previous: 42000 },
        fr: { current: 32000, previous: 26000 },
        es: { current: 28000, previous: 24000 }
      }
    },
    // Add more months
    { 
      date: "July",
      categories: {
        us: { current: 75000, previous: 63000 },
        uk: { current: 42000, previous: 32000 },
        de: { current: 38000, previous: 42000 },
        fr: { current: 32000, previous: 26000 },
        es: { current: 28000, previous: 24000 }
      }
    }
  ],
  family: [
    { 
      date: "January",
      categories: {
        us: { current: 55000, previous: 45000 },
        uk: { current: 38000, previous: 28000 },
        de: { current: 35000, previous: 39000 },
        fr: { current: 30000, previous: 24000 },
        es: { current: 25000, previous: 21000 }
      }
    },
    // Add more months
    { 
      date: "July",
      categories: {
        us: { current: 55000, previous: 45000 },
        uk: { current: 38000, previous: 28000 },
        de: { current: 35000, previous: 39000 },
        fr: { current: 30000, previous: 24000 },
        es: { current: 25000, previous: 21000 }
      }
    }
  ],
  executive: [
    { 
      date: "January",
      categories: {
        us: { current: 45000, previous: 35000 },
        uk: { current: 35000, previous: 25000 },
        de: { current: 32000, previous: 36000 },
        fr: { current: 28000, previous: 22000 },
        es: { current: 20000, previous: 16000 }
      }
    },
    // Add more months
    { 
      date: "July",
      categories: {
        us: { current: 45000, previous: 35000 },
        uk: { current: 35000, previous: 25000 },
        de: { current: 32000, previous: 36000 },
        fr: { current: 28000, previous: 22000 },
        es: { current: 20000, previous: 16000 }
      }
    }
  ]
};

// Add metrics by channel
const countryMetricsByChannel = {
  standard: [
    {
      key: 'revenue',
      label: 'Revenue',
      prefix: '€',
      data: [
        { name: "United States", value: 95000, change: 12000 },
        { name: "United Kingdom", value: 75000, change: 10000 },
        { name: "Germany", value: 48000, change: -4000 },
        { name: "France", value: 42000, change: 6000 },
        { name: "Spain", value: 35000, change: 4000 },
      ]
    },
    {
      key: 'rooms',
      label: 'Rooms Sold',
      data: [
        { name: "United States", value: 650, change: 80 },
        { name: "United Kingdom", value: 520, change: 70 },
        { name: "Germany", value: 350, change: -35 },
        { name: "France", value: 290, change: 45 },
        { name: "Spain", value: 240, change: 30 },
      ]
    }
  ],
  deluxe: [
    // Similar structure for other channels
    {
      key: 'revenue',
      label: 'Revenue',
      prefix: '€',
      data: [
        { name: "United States", value: 85000, change: 12000 },
        { name: "United Kingdom", value: 65000, change: 10000 },
        { name: "Germany", value: 58000, change: -4000 },
        { name: "France", value: 45000, change: 6000 },
        { name: "Spain", value: 38000, change: 4000 },
      ]
    },
    {
      key: 'rooms',
      label: 'Rooms Sold',
      data: [
        { name: "United States", value: 580, change: 80 },
        { name: "United Kingdom", value: 450, change: 70 },
        { name: "Germany", value: 400, change: -35 },
        { name: "France", value: 310, change: 45 },
        { name: "Spain", value: 260, change: 30 },
      ]
    }
  ],
  suite: [
    {
      key: 'revenue',
      label: 'Revenue',
      prefix: '€',
      data: [
        { name: "United States", value: 75000, change: 12000 },
        { name: "United Kingdom", value: 42000, change: 10000 },
        { name: "Germany", value: 38000, change: -4000 },
        { name: "France", value: 32000, change: 6000 },
        { name: "Spain", value: 28000, change: 4000 },
      ]
    },
    {
      key: 'rooms',
      label: 'Rooms Sold',
      data: [
        { name: "United States", value: 510, change: 80 },
        { name: "United Kingdom", value: 290, change: 70 },
        { name: "Germany", value: 260, change: -35 },
        { name: "France", value: 220, change: 45 },
        { name: "Spain", value: 190, change: 30 },
      ]
    }
  ],
  family: [
    {
      key: 'revenue',
      label: 'Revenue',
      prefix: '€',
      data: [
        { name: "United States", value: 55000, change: 10000 },
        { name: "United Kingdom", value: 38000, change: 10000 },
        { name: "Germany", value: 35000, change: -4000 },
        { name: "France", value: 30000, change: 6000 },
        { name: "Spain", value: 25000, change: 4000 },
      ]
    },
    {
      key: 'rooms',
      label: 'Rooms Sold',
      data: [
        { name: "United States", value: 380, change: 70 },
        { name: "United Kingdom", value: 260, change: 70 },
        { name: "Germany", value: 240, change: -35 },
        { name: "France", value: 210, change: 40 },
        { name: "Spain", value: 170, change: 30 },
      ]
    }
  ],
  executive: [  
    {
      key: 'revenue',
      label: 'Revenue',
      prefix: '€',
      data: [
        { name: "United States", value: 45000, change: 10000 },
        { name: "United Kingdom", value: 35000, change: 10000 },
        { name: "Germany", value: 32000, change: -4000 },
        { name: "France", value: 28000, change: 4000 },
        { name: "Spain", value: 20000, change: 4000 },
      ]
    },
    {
      key: 'rooms',
      label: 'Rooms Sold',
      data: [
        { name: "United States", value: 310, change: 70 },
        { name: "United Kingdom", value: 240, change: 65 },
        { name: "Germany", value: 220, change: -30 },
        { name: "France", value: 190, change: 30 },
        { name: "Spain", value: 140, change: 25 },
      ]
    }
  ]
};

// Add country chart config 
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

// Add this data near the top where other data is defined
const lengthOfStayByChannelData = {
  standard: [
    { range: "1 night", current: 210, previous: 185 },
    { range: "2 nights", current: 345, previous: 310 },
    { range: "3 nights", current: 420, previous: 380 },
    { range: "4 nights", current: 285, previous: 250 },
    { range: "5 nights", current: 175, previous: 155 },
    { range: "6 nights", current: 95, previous: 80 },
    { range: "7+ nights", current: 120, previous: 105 }
  ],
  deluxe: [
    { range: "1 night", current: 230, previous: 205 },
    { range: "2 nights", current: 360, previous: 325 },
    { range: "3 nights", current: 395, previous: 355 },
    { range: "4 nights", current: 260, previous: 225 },
    { range: "5 nights", current: 155, previous: 135 },
    { range: "6 nights", current: 85, previous: 70 },
    { range: "7+ nights", current: 105, previous: 90 }
  ],
  suite: [
    { range: "1 night", current: 245, previous: 220 },
    { range: "2 nights", current: 375, previous: 340 },
    { range: "3 nights", current: 380, previous: 340 },
    { range: "4 nights", current: 245, previous: 210 },
    { range: "5 nights", current: 145, previous: 125 },
    { range: "6 nights", current: 75, previous: 60 },
    { range: "7+ nights", current: 90, previous: 75 }
  ],
  family: [
    { range: "1 night", current: 190, previous: 165 },
    { range: "2 nights", current: 320, previous: 285 },
    { range: "3 nights", current: 450, previous: 410 },
    { range: "4 nights", current: 310, previous: 275 },
    { range: "5 nights", current: 195, previous: 175 },
    { range: "6 nights", current: 115, previous: 100 },
    { range: "7+ nights", current: 140, previous: 125 }
  ],
  executive: [
    { range: "1 night", current: 180, previous: 155 },
    { range: "2 nights", current: 325, previous: 290 },
    { range: "3 nights", current: 435, previous: 395 },
    { range: "4 nights", current: 295, previous: 260 },
    { range: "5 nights", current: 185, previous: 165 },
    { range: "6 nights", current: 105, previous: 90 },
    { range: "7+ nights", current: 130, previous: 115 }
  ]
}

// Add lead time data by channel
const leadTimeByChannelData = {
  standard: [
    { range: "0-7 days", current: 245, previous: 220 },
    { range: "8-14 days", current: 312, previous: 280 },
    { range: "15-30 days", current: 456, previous: 410 },
    { range: "31-60 days", current: 323, previous: 290 },
    { range: "61-90 days", current: 198, previous: 175 },
    { range: "91-180 days", current: 148, previous: 125 },
    { range: ">180 days", current: 87, previous: 75 }
  ],
  deluxe: [
    { range: "0-7 days", current: 265, previous: 240 },
    { range: "8-14 days", current: 332, previous: 300 },
    { range: "15-30 days", current: 436, previous: 390 },
    { range: "31-60 days", current: 303, previous: 270 },
    { range: "61-90 days", current: 178, previous: 155 },
    { range: "91-180 days", current: 128, previous: 105 },
    { range: ">180 days", current: 67, previous: 55 }
  ],
  suite: [
    { range: "0-7 days", current: 275, previous: 250 },
    { range: "8-14 days", current: 342, previous: 310 },
    { range: "15-30 days", current: 426, previous: 380 },
    { range: "31-60 days", current: 293, previous: 260 },
    { range: "61-90 days", current: 168, previous: 145 },
    { range: "91-180 days", current: 118, previous: 95 },
    { range: ">180 days", current: 57, previous: 45 }
  ],
  family: [
    { range: "0-7 days", current: 225, previous: 200 },
    { range: "8-14 days", current: 292, previous: 260 },
    { range: "15-30 days", current: 476, previous: 430 },
    { range: "31-60 days", current: 343, previous: 310 },
    { range: "61-90 days", current: 218, previous: 195 },
    { range: "91-180 days", current: 168, previous: 145 },
    { range: ">180 days", current: 107, previous: 95 }
  ],
  executive: [
    { range: "0-7 days", current: 215, previous: 190 },
    { range: "8-14 days", current: 282, previous: 250 },
    { range: "15-30 days", current: 466, previous: 420 },
    { range: "31-60 days", current: 333, previous: 300 },
    { range: "61-90 days", current: 208, previous: 185 },
    { range: "91-180 days", current: 158, previous: 135 },
    { range: ">180 days", current: 97, previous: 85 }
  ]
}

// Add cancellation lead time data by channel near the other data definitions
const cancellationLeadTimeByChannelData = {
  standard: [
    { range: "0-5 days", current: 45, previous: 52 },
    { range: "6-10 days", current: 38, previous: 41 },
    { range: "11-15 days", current: 32, previous: 35 },
    { range: "16-20 days", current: 25, previous: 28 },
    { range: "21-25 days", current: 18, previous: 20 },
    { range: "26-30 days", current: 12, previous: 15 },
    { range: ">30 days", current: 8, previous: 10 }
  ],
  deluxe: [
    { range: "0-5 days", current: 50, previous: 57 },
    { range: "6-10 days", current: 42, previous: 45 },
    { range: "11-15 days", current: 36, previous: 39 },
    { range: "16-20 days", current: 28, previous: 31 },
    { range: "21-25 days", current: 21, previous: 23 },
    { range: "26-30 days", current: 15, previous: 18 },
    { range: ">30 days", current: 10, previous: 12 }
  ],
  suite: [
    { range: "0-5 days", current: 52, previous: 59 },
    { range: "6-10 days", current: 45, previous: 48 },
    { range: "11-15 days", current: 38, previous: 41 },
    { range: "16-20 days", current: 30, previous: 33 },
    { range: "21-25 days", current: 23, previous: 25 },
    { range: "26-30 days", current: 16, previous: 19 },
    { range: ">30 days", current: 11, previous: 13 }
  ],
  family: [
    { range: "0-5 days", current: 40, previous: 47 },
    { range: "6-10 days", current: 35, previous: 38 },
    { range: "11-15 days", current: 29, previous: 32 },
    { range: "16-20 days", current: 22, previous: 25 },
    { range: "21-25 days", current: 15, previous: 17 },
    { range: "26-30 days", current: 9, previous: 12 },
    { range: ">30 days", current: 6, previous: 8 }
  ],
  executive: [
    { range: "0-5 days", current: 38, previous: 45 },
    { range: "6-10 days", current: 32, previous: 35 },
    { range: "11-15 days", current: 27, previous: 30 },
    { range: "16-20 days", current: 20, previous: 23 },
    { range: "21-25 days", current: 14, previous: 16 },
    { range: "26-30 days", current: 8, previous: 11 },
    { range: ">30 days", current: 5, previous: 7 }
  ]
}

// Add this constant with the other data constants near the top of the file (around line 670-680)
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

// First, add these new data constants near the other data definitions

// Data for room types by market segment
const roomTypesByMarketSegmentMetrics = [
  {
    key: 'revenue',
    label: 'Revenue',
    prefix: '€',
    data: [
      { name: "Standard Room", value: 285000, change: 32000 },
      { name: "Deluxe Room", value: 245000, change: -15000 },
      { name: "Suite", value: 198000, change: 25000 },
      { name: "Executive Room", value: 175000, change: -12000 },
      { name: "Family Room", value: 156000, change: 18000 },
    ]
  },
  {
    key: 'rooms',
    label: 'Rooms Sold',
    data: [
      { name: "Standard Room", value: 1250, change: 150 },
      { name: "Deluxe Room", value: 980, change: -85 },
      { name: "Suite", value: 720, change: 95 },
      { name: "Executive Room", value: 650, change: -45 },
      { name: "Family Room", value: 580, change: 65 },
    ]
  },
  {
    key: 'adr',
    label: 'ADR',
    prefix: '€',
    data: [
      { name: "Standard Room", value: 228, change: 15 },
      { name: "Deluxe Room", value: 250, change: -8 },
      { name: "Suite", value: 275, change: 20 },
      { name: "Executive Room", value: 269, change: -10 },
      { name: "Family Room", value: 269, change: 12 },
    ]
  }
]

// Data for room types by booking channel
const roomTypesByBookingChannelMetrics = [
  {
    key: 'revenue',
    label: 'Revenue',
    prefix: '€',
    data: [
      { name: "Standard Room", value: 265000, change: 28000 },
      { name: "Deluxe Room", value: 235000, change: -12000 },
      { name: "Suite", value: 188000, change: 22000 },
      { name: "Executive Room", value: 165000, change: -10000 },
      { name: "Family Room", value: 146000, change: 15000 },
    ]
  },
  {
    key: 'rooms',
    label: 'Rooms Sold',
    data: [
      { name: "Standard Room", value: 1150, change: 140 },
      { name: "Deluxe Room", value: 920, change: -75 },
      { name: "Suite", value: 680, change: 85 },
      { name: "Executive Room", value: 610, change: -40 },
      { name: "Family Room", value: 540, change: 55 },
    ]
  },
  {
    key: 'adr',
    label: 'ADR',
    prefix: '€',
    data: [
      { name: "Standard Room", value: 230, change: 12 },
      { name: "Deluxe Room", value: 255, change: -6 },
      { name: "Suite", value: 276, change: 18 },
      { name: "Executive Room", value: 270, change: -8 },
      { name: "Family Room", value: 270, change: 10 },
    ]
  }
]

// Add categories for market segments and booking channels
const marketSegmentCategories = [
  { key: 'leisure', label: 'Leisure' },
  { key: 'business', label: 'Business' },
  { key: 'groups', label: 'Groups' },
  { key: 'corporate', label: 'Corporate' },
  { key: 'government', label: 'Government' },
]

const bookingChannelCategories = [
  { key: 'direct', label: 'Direct' },
  { key: 'ota', label: 'OTA' },
  { key: 'gds', label: 'GDS' },
  { key: 'wholesale', label: 'Wholesale' },
  { key: 'corporate', label: 'Corporate Portal' },
]

export function RoomTypes() {
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
      setSelectedHotels(prev => [...Array.from(new Set([...prev, ...regionHotels]))])
    }
  }

  const toggleBrand = (brandHotels: string[], e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    
    const allSelected = brandHotels.every(hotel => selectedHotels.includes(hotel))
    if (allSelected) {
      setSelectedHotels(prev => prev.filter(h => !brandHotels.includes(h)))
    } else {
      setSelectedHotels(prev => [...Array.from(new Set([...prev, ...brandHotels]))])
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

  // Add sample data for the TopFiveMultiple component
  const bookingChannelCategories = [
    { key: 'standard', label: 'Standard Room' },
    { key: 'deluxe', label: 'Deluxe Room' },
    { key: 'suite', label: 'Suite' },
    { key: 'family', label: 'Family Room' },
    { key: 'executive', label: 'Executive Room' },
  ]

  // Sample metrics for producers by booking channel
  const producerMetrics = [
    {
      key: 'revenue',
      label: 'Revenue',
      prefix: '€',
      data: [
        { name: "Grand Hotel Berlin", value: 125000, change: 16500 },
        { name: "Luxury Resort Milan", value: 98000, change: 18000 },
        { name: "Boutique Paris", value: 85000, change: -7500 },
        { name: "City Lodge Amsterdam", value: 76000, change: 8000 },
        { name: "Beach Retreat Barcelona", value: 72000, change: -4000 },
      ]
    },
    {
      key: 'rooms',
      label: 'Rooms Sold',
      data: [
        { name: "Grand Hotel Berlin", value: 850, change: 110 },
        { name: "Luxury Resort Milan", value: 720, change: 150 },
        { name: "Boutique Paris", value: 580, change: -50 },
        { name: "City Lodge Amsterdam", value: 510, change: 60 },
        { name: "Beach Retreat Barcelona", value: 490, change: -35 },
      ]
    },
    {
      key: 'adr',
      label: 'ADR',
      prefix: '€',
      data: [
        { name: "Grand Hotel Berlin", value: 195, change: 15 },
        { name: "Luxury Resort Milan", value: 210, change: 22 },
        { name: "Boutique Paris", value: 185, change: -12 },
        { name: "City Lodge Amsterdam", value: 165, change: 8 },
        { name: "Beach Retreat Barcelona", value: 155, change: -6 },
      ]
    }
  ]

  // Sample distribution data
  const producersDistributionData = [
    { name: "Grand Hotel Berlin", value: 125000, percentage: 27.5, fill: "hsl(198, 85%, 45%)" },
    { name: "Luxury Resort Milan", value: 98000, percentage: 21.5, fill: "hsl(150, 60%, 40%)" },
    { name: "Boutique Paris", value: 85000, percentage: 18.7, fill: "hsl(280, 65%, 55%)" },
    { name: "City Lodge Amsterdam", value: 76000, percentage: 16.7, fill: "hsl(210, 80%, 50%)" },
    { name: "Beach Retreat Barcelona", value: 72000, percentage: 15.6, fill: "hsl(340, 70%, 50%)" },
  ]

  // Sample time series data
  const producersTimeSeriesData = [
    { 
      date: "January",
      categories: {
        berlin: { current: 125000, previous: 108500 },
        milan: { current: 98000, previous: 80000 },
        paris: { current: 85000, previous: 92500 }
      }
    },
    { 
      date: "February",
      categories: {
        berlin: { current: 127000, previous: 110000 },
        milan: { current: 99500, previous: 81500 },
        paris: { current: 83000, previous: 90000 }
      }
    },
    // Add more months as needed
  ]

  // Add new state for selected booking channel
  const [selectedRoomType, setSelectedRoomType] = useState<keyof typeof ROOM_TYPES>('standard');

  return (
    <div className="flex-1 overflow-auto bg-[#f5f8ff]">
        {/* Header with Filters */}
        <div className="fixed top-0 left-[256px] right-0 z-30 flex justify-between items-center mb-6 bg-white py-6 px-12 border-b border-gray-300 shadow-sm">
          <div>
            <h2 className="text-xl font-bold text-gray-800 mb-1">Room types</h2>
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

        {/* Add the charts */}
        <div className="mt-[140px] px-12 py-0">
          {/* Add the existing CategoriesDetailContent component */}
          <div className="mb-8">
            <CategoriesDetailContent
              title="Room Types Analysis"
              categories={ROOM_TYPES}
              prefix="€"
              apiUrl="/api/room-types/categories-detail"
            />
          </div>
          
          {/* Add the TopFiveMultiple component underneath */}
          <div className="mb-8 grid grid-cols-2 gap-6">
            <TopFive 
              title="Room Types by Market Segment"
              subtitle="Performance Analysis"
              color="blue"
              categories={marketSegmentCategories}
              metrics={roomTypesByMarketSegmentMetrics}
              distributionData={producersDistributionData}
              categoryTimeSeriesData={producersTimeSeriesData}
            />
            
            <TopFive 
              title="Room Types by Booking Channel"
              subtitle="Performance Analysis"
              color="blue"
              categories={bookingChannelCategories}
              metrics={roomTypesByBookingChannelMetrics}
              distributionData={producersDistributionData}
              categoryTimeSeriesData={producersTimeSeriesData}
            />
          </div>
          
          {/* Add the new World Map with TopFiveMultiple component in a new row */}
          <div className="mt-8">
            <Card className="bg-white rounded-lg overflow-hidden">
              <CardHeader className="flex flex-col items-start">
                <div className="flex w-full justify-between items-center">
                  <div>
                    <CardTitle className="text-lg font-semibold text-gray-800 mb-3">Global Distribution by Room Type</CardTitle>
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

                  {/* TopFiveMultiple by Room Type Side */}
                  <div className="border-l border-gray-100 pl-8">
                    <TopFive 
                      title="Top Countries Performance"
                      color="blue"
                      withBorder={false}
                      categories={bookingChannelCategories}
                      metrics={countryMetricsByChannel[selectedRoomType]}
                      distributionData={countryDistributionByChannel[selectedRoomType]}
                      categoryTimeSeriesData={countryTimeSeriesByChannel[selectedRoomType]}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Add this section at the bottom of the return statement before the final closing div */}
        <div className="mt-8 px-12 pb-12 grid grid-cols-2 gap-6">
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <HorizontalBarChartMultipleDatasets 
              datasets={[
                {
                  key: "cancellation",
                  title: "Cancellation Lead Time",
                  data: cancellationLeadTimeByChannelData[selectedRoomType]
                },
                {
                  key: "leadTime",
                  title: "Lead Time",
                  data: leadTimeByChannelData[selectedRoomType]
                }
              ]}
              defaultDataset="cancellation"
              categories={[
                { key: "standard", label: "Standard Room" },
                { key: "deluxe", label: "Deluxe Room" },
                { key: "suite", label: "Suite" },
                { key: "family", label: "Family Room" },
                { key: "executive", label: "Executive Room" }
              ]}
              defaultCategory={selectedRoomType}
            />
          </div>
          <ReservationsByDayChart 
            data={reservationsByDayData} 
            color="blue"
            categories={[
              { key: "standard", label: "Standard Room" },
              { key: "deluxe", label: "Deluxe Room" },
              { key: "suite", label: "Suite" },
              { key: "family", label: "Family Room" },
              { key: "executive", label: "Executive Room" }
            ]}
          />
        </div>

        {/* Add the new Room Type Upgrades & Downgrades chart */}
        <div className="mt-0 px-12 pb-6">
          <RoomTypeUpgradesDowngrades />
        </div>

        {/* Length of Stay in its own row at bottom */}
        <div className="mt-0 px-12 pb-12">
          <div className="w-1/2">
            <div className="bg-white rounded-lg shadow overflow-hidden">
              <HorizontalBarChartMultipleDatasets 
                datasets={[
                  {
                    key: "lengthOfStay",
                    title: "Length of Stay",
                    data: lengthOfStayByChannelData[selectedRoomType]
                  }
                ]}
                defaultDataset="lengthOfStay"
                categories={[
                  { key: "standard", label: "Standard Room" },
                  { key: "deluxe", label: "Deluxe Room" },
                  { key: "suite", label: "Suite" },
                  { key: "family", label: "Family Room" },
                  { key: "executive", label: "Executive Room" }
                ]}
                defaultCategory={selectedRoomType}
              />
            </div>
          </div>
        </div>
    </div>
  )
} 