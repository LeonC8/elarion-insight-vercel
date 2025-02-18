"use client"

import { useState, useRef, useEffect } from 'react'
import {
  DropdownMenu,
  DropdownMenuContent,  
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { motion } from 'framer-motion'
import { 
  CalendarIcon, 
  ChevronDownIcon, 
  ArrowRightIcon, 
  BedDoubleIcon, 
  DollarSignIcon, 
  UtensilsIcon, 
  TrendingUpIcon, 
  PercentIcon, 
  BarChartIcon, 
  LineChartIcon,
  PieChartIcon,
  Check,
  DownloadIcon,
} from 'lucide-react'
import { CustomDialog } from '../NumericalCardDetails'
import { DetailedDialog } from '../GraphCardDetails'
import { Calendar } from "@/components/ui/calendar"
import { format, subDays } from "date-fns"
import * as XLSX from 'xlsx'
import { ResponsivePie } from '@nivo/pie'
import { ResponsiveBar, BarDatum } from '@nivo/bar'
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts'
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { DatePickerDemo as DatePicker } from "@/components/ui/date-picker"
import dynamic from 'next/dynamic'
import { HorizontalBarChart } from "@/components/ui/HorizontalBarChart"
import { TopFive } from "../new/TopFive"

// Add the COLORS constant
const COLORS = ['rgba(59, 130, 246, 0.5)', 'rgba(34, 197, 94, 0.5)', 'rgba(234, 179, 8, 0.5)', 'rgba(239, 68, 68, 0.5)']

// Add the graph data constants
const marketSegments = [
  { id: "Personal", value: 450000 },
  { id: "Business", value: 350000 },
  { id: "Corporate", value: 280000 },
  { id: "Government", value: 150000 },
  { id: "Other", value: 70000 },
]

const roomTypes = [
  { id: "Standard", value: 300000 },
  { id: "Deluxe", value: 250000 },
  { id: "Suite", value: 180000 },
  { id: "Executive", value: 120000 },
  { id: "Family", value: 90000 },
]

const bookingChannels = [
  { id: "Direct", value: 280000 },
  { id: "OTA", value: 350000 },
  { id: "Travel Agent", value: 180000 },
  { id: "Corporate", value: 90000 },
  { id: "Wholesaler", value: 60000 },
]

const geoSources = [
  { id: "Domestic", value: 520000 },
  { id: "Europe", value: 180000 },
  { id: "Asia", value: 130000 },
  { id: "North America", value: 100000 },
  { id: "Other", value: 70000 },
]

// Add the theme constant
const modernTheme = {
  fontFamily: "'Geist Sans', sans-serif",
  fontSize: 11,
  text: {
    fontFamily: "'Geist Sans', sans-serif",
    fontSize: 11,
    fontWeight: 500,
    letterSpacing: 0.15,
    fill: '#7d8694'
  },
  labels: {
    text: {
      fontFamily: "'Geist Sans', sans-serif",
      fontSize: 11,
      fontWeight: 500,
      letterSpacing: 0.15,
      fill: '#7d8694'
    }
  },
  axis: {
    legend: {
      text: {
        fontFamily: "'Geist Sans', sans-serif",
        fontSize: 11,
        fontWeight: 500,
        letterSpacing: 0.15,
        fill: '#7d8694'
      }
    },
    ticks: {
      text: {
        fontFamily: "'Geist Sans', sans-serif",
        fontSize: 11,
        fontWeight: 500,
        fill: '#7d8694'
      }
    }
  },
  legends: {
    text: {
      fontFamily: "'Geist Sans', sans-serif",
      fontSize: 11,
      fontWeight: 400,
      fill: '#7d8694'
    }
  }
}

// Add helper functions
function generateComparisonData(originalData: Array<{ id: string; value: number }>) {
  return originalData.map(item => {
    const changePercentage = (Math.random() * 0.4) - 0.2;
    const newValue = Math.round(item.value * (1 + changePercentage));
    return {
      id: item.id,
      value: Math.max(0, newValue)
    };
  });
}

const getYAxisTickValues = (data: Array<{ id: string; value: number }>) => {
  const maxValue = Math.max(...data.map(d => d.value));
  const roundedMax = Math.ceil(maxValue / 100000) * 100000;
  const step = roundedMax / 5;
  return Array.from({ length: 6 }, (_, i) => i * step);
};

const getDisplayTimeframe = (timeframe: string, forExcel: boolean = false) => {
  if (timeframe.includes('-')) {
    if (forExcel) {
      return timeframe;
    }
    return "Custom period";
  }
  return timeframe;
};

// Types
type TimeframeOption = {
  label: string;
  type: 'dropdown' | 'calendar';
  options?: {
    value: string;
    label: string;
  }[];
  onClick?: () => void;
};

interface NumericalDataItem {
  title: string;
  value: string | number;
  change: number;
  comparisonValue?: string | number;
  icon: React.ElementType;
}

type DateRange = {
  from: Date | undefined;
  to: Date | undefined;
};

// Data
const numericalData: NumericalDataItem[] = [
  { title: "Sold Rooms", value: 150, change: 5.2, comparisonValue: 142, icon: BedDoubleIcon },
  { title: "Total Revenue", value: "$35,000", change: 3.8, comparisonValue: "$33,700", icon: DollarSignIcon },
  { title: "Rooms Revenue", value: "$25,000", change: 4.5, comparisonValue: "$23,900", icon: DollarSignIcon },
  { title: "F&B Revenue", value: "$10,000", change: 2.1, comparisonValue: "$9,800", icon: UtensilsIcon },
  { title: "ADR", value: "$166.67", change: 3.8, comparisonValue: "$160.56", icon: TrendingUpIcon },
  { title: "Occupancy", value: "75%", change: 1.5, comparisonValue: "73.8%", icon: PercentIcon },
  { title: "RevPAR", value: "$125.00", change: 2.3, comparisonValue: "$122.19", icon: BarChartIcon },
  { title: "TrevPAR", value: "$180.00", change: 1.8, comparisonValue: "$176.82", icon: LineChartIcon },
];

// Add after imports

interface ChartData {
  date: string;
  cancellations?: number;
  revenueLost?: number;
  noShows?: number;
  comparisonCancellations?: number;
  comparisonRevenueLost?: number;
  comparisonNoShows?: number;
}

const cancellationsData: ChartData[] = [
  { date: '2023-01', cancellations: 5, revenueLost: 500 },
  { date: '2023-02', cancellations: 8, revenueLost: 800 },
  { date: '2023-03', cancellations: 12, revenueLost: 1200 },
  { date: '2023-04', cancellations: 7, revenueLost: 700 },
  { date: '2023-05', cancellations: 10, revenueLost: 1000 },
  { date: '2023-06', cancellations: 15, revenueLost: 1500 },
];

const noShowsData: ChartData[] = [
  { date: '2023-01', noShows: 2 },
  { date: '2023-02', noShows: 4 },
  { date: '2023-03', noShows: 3 },
  { date: '2023-04', noShows: 5 },
  { date: '2023-05', noShows: 6 },
  { date: '2023-06', noShows: 4 },
];

// Add this function after the existing helper functions
const generateLineChartComparisonData = (data: ChartData[]): ChartData[] => {
  return data.map(item => ({
    ...item,
    comparisonCancellations: item.cancellations ? Math.round(item.cancellations * (1 + (Math.random() - 0.5) * 0.4)) : undefined,
    comparisonRevenueLost: item.revenueLost ? Math.round(item.revenueLost * (1 + (Math.random() - 0.5) * 0.4)) : undefined,
    comparisonNoShows: item.noShows ? Math.round(item.noShows * (1 + (Math.random() - 0.5) * 0.4)) : undefined,
  }));
};

// Add this helper function after other helper functions
const formatCurrency = (value: number): string => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

// Add this constant with other data constants
const worldMapData = [
  { country: "cn", value: 1389618778 }, // China
  { country: "in", value: 1311559204 }, // India
  { country: "us", value: 331883986 },  // United States
  { country: "id", value: 264935824 },  // Indonesia
  { country: "pk", value: 210797836 },  // Pakistan
  { country: "br", value: 210301591 },  // Brazil
  { country: "ng", value: 208679114 },  // Nigeria
  { country: "bd", value: 161062905 },  // Bangladesh
  { country: "ru", value: 141944641 },  // Russia
  { country: "mx", value: 127318112 },  // Mexico
];

// Update the WorldMap import and add dynamic import with loading
const WorldMap = dynamic(
  () => import('react-svg-worldmap').then(mod => mod.default),
  { ssr: false, loading: () => (
    <div className="h-[500px] flex items-center justify-center">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
    </div>
  )}
)

export function OverviewDashboard() {
  const [selectedHotels, setSelectedHotels] = useState<string[]>(["Hotel 1"])
  const allHotels = ["Hotel 1", "Hotel 2", "Hotel 3"]
  const [selectedCard, setSelectedCard] = useState<string | null>(null)
  const [selectedTimeframe, setSelectedTimeframe] = useState("OTB")
  const [comparisonType, setComparisonType] = useState<'Last year' | 'Budget' | 'No comparison'>('Last year')
  const [pieChartData, setPieChartData] = useState<Array<{ id: string; value: number }> | undefined>(undefined)
  const [comparisonPieChartData, setComparisonPieChartData] = useState<Array<{ id: string; value: number }> | undefined>(undefined)
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: undefined,
    to: undefined,
  })

  // Add new states for our tabs
  const [timeframeType, setTimeframeType] = useState<'day' | 'month' | 'year'>('month')
  const [viewType, setViewType] = useState<'actual' | 'otb' | 'projected'>('actual')
  const [businessDate, setBusinessDate] = useState<Date | undefined>(new Date())

  // Add state for occupancy date range
  const [occupancyDateRange, setOccupancyDateRange] = useState<{
    start: string;
    end: string;
  }>({
    start: '',
    end: ''
  });

  // Add state for the KPI data
  const [kpiData, setKpiData] = useState<{
    soldRooms: number;
    totalRooms: number;
    roomRevenue: number;
    fbRevenue: number;
    adr: number;
    occupancy: number;
    revPAR: number;
    trevPAR: number;
  } | null>(null);

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

  const handleCardClick = (title: string) => {
    setSelectedCard(title);
    
    // Set pie chart data based on the card title
    if (title === "Total Revenue") {
      setPieChartData([
        { id: "Rooms Revenue", value: 25000 },
        { id: "F&B Revenue", value: 10000 },
        { id: "Other Revenue", value: 5000 },
      ]);
      
      if (comparisonType !== 'No comparison') {
        setComparisonPieChartData([
          { id: "Rooms Revenue", value: 23000 },
          { id: "F&B Revenue", value: 9000 },
          { id: "Other Revenue", value: 4500 },
        ]);
      }
    } else if (title === "F&B Revenue") {
      setPieChartData([
        { id: "Breakfast", value: 3000 },
        { id: "Lunch", value: 3500 },
        { id: "Dinner", value: 2500 },
        { id: "Other", value: 1000 },
      ]);
      
      if (comparisonType !== 'No comparison') {
        setComparisonPieChartData([
          { id: "Breakfast", value: 2800 },
          { id: "Lunch", value: 3200 },
          { id: "Dinner", value: 2300 },
          { id: "Other", value: 900 },
        ]);
      }
    } else {
      // For cards without pie chart data
      setPieChartData(undefined);
      setComparisonPieChartData(undefined);
    }
  };

  const closeDialog = () => {
    setSelectedCard(null)
    setPieChartData(undefined)
    setComparisonPieChartData(undefined)
  }

  // Add this state to control calendar visibility
  const [isCalendarVisible, setIsCalendarVisible] = useState(false);

  // Add this state to control the temporary date range
  const [tempDateRange, setTempDateRange] = useState<DateRange | undefined>(undefined);

  // Modify the timeframeOptions to include an onClick handler for the "Custom" option
  const timeframeOptions: TimeframeOption[] = [
    {
      label: "Day",
      type: 'dropdown',
      options: [
        { value: "Today", label: "Today" },
        { value: "Yesterday", label: "Yesterday" },
      ]
    },
    {
      label: "Month",
      type: 'dropdown',
      options: [
        { value: "Month-OTB", label: "OTB" },
        { value: "MTD", label: "MTD" },
        { value: "Month-Projected", label: "Projected" }
      ]
    },
    {
      label: "Year",
      type: 'dropdown',
      options: [
        { value: "Year-OTB", label: "OTB" },
        { value: "YTD", label: "YTD" },
        { value: "Year-Projected", label: "Projected" }
      ]
    },
    {
      label: "Custom",
      type: 'calendar',
      onClick: () => setIsCalendarVisible(true)
    }
  ];

  const handleTimeframeSelect = (value: string) => {
    setSelectedTimeframe(value);
    setIsCalendarVisible(false);
  };

  const handleDateRangeSelect = (range: DateRange | undefined) => {
    setTempDateRange(range);
  };

  const dropdownRef = useRef<HTMLDivElement | null>(null);

  const applyDateRange = () => {
    if (tempDateRange?.from && tempDateRange?.to) {
      setDateRange(tempDateRange);
      const formattedRange = `${format(tempDateRange.from, 'dd MMM yyyy')} - ${format(tempDateRange.to, 'dd MMM yyyy')}`;
      setSelectedTimeframe(formattedRange);
      setIsCalendarVisible(true);
      if (dropdownRef.current) {
        dropdownRef.current.click();
      }
    }
  };

  const hideCalendar = () => {
    setIsCalendarVisible(false);
  };

  // Add this new function to handle Excel export
  const handleExportToExcel = () => {
    const wb = XLSX.utils.book_new()
    
    // Overview Metrics Sheet
    const overviewData = [
      ['Overview Metrics', ''],
      ['Metric', getDisplayTimeframe(selectedTimeframe, true)],
      ...numericalData.map(item => [
        item.title,
        item.value,
      ])
    ]
    
    if (comparisonType !== 'No comparison') {
      overviewData[0].push('', '')
      overviewData[1].push(
        `${getDisplayTimeframe(selectedTimeframe, true)} ${comparisonType === 'Last year' ? 'STLY' : 'Budget'}`, 
        'Change %'
      )
      overviewData.slice(2).forEach((row, index) => {
        row.push(numericalData[index].comparisonValue || '-', `${numericalData[index].change}%`)
      })
    }
    
    const wsOverview = XLSX.utils.aoa_to_sheet(overviewData)

    // Market Segments Sheet
    const marketSegmentsData = [
      ['Market Segments', ''],
      ['Segment', getDisplayTimeframe(selectedTimeframe, true)],
      ...marketSegments.map(segment => [
        segment.id,
        formatCurrency(segment.value),
      ])
    ]

    if (comparisonType !== 'No comparison') {
      marketSegmentsData[0].push('', '')
      marketSegmentsData[1].push(`${getDisplayTimeframe(selectedTimeframe, true)} ${comparisonType === 'Last year' ? 'STLY' : 'Budget'}`, 'Change %')
      marketSegmentsData.slice(2).forEach((row, index) => {
        const compData = generateComparisonData(marketSegments)[index]
        const change = ((marketSegments[index].value - compData.value) / compData.value * 100).toFixed(1)
        row.push(formatCurrency(compData.value), `${change}%`)
      })
    }

    const wsMarketSegments = XLSX.utils.aoa_to_sheet(marketSegmentsData)

    // Room Types Sheet
    const roomTypesData = [
      ['Room Types', ''],
      ['Room Type', getDisplayTimeframe(selectedTimeframe, true)],
      ...roomTypes.map(room => [
        room.id,
        formatCurrency(room.value),
      ])
    ]

    if (comparisonType !== 'No comparison') {
      roomTypesData[0].push('', '')
      roomTypesData[1].push(`${getDisplayTimeframe(selectedTimeframe, true)} ${comparisonType === 'Last year' ? 'STLY' : 'Budget'}`, 'Change %')
      roomTypesData.slice(2).forEach((row, index) => {
        const compData = generateComparisonData(roomTypes)[index]
        const change = ((roomTypes[index].value - compData.value) / compData.value * 100).toFixed(1)
        row.push(formatCurrency(compData.value), `${change}%`)
      })
    }

    const wsRoomTypes = XLSX.utils.aoa_to_sheet(roomTypesData)

    // Booking Channels Sheet
    const bookingChannelsData = [
      ['Booking Channels', ''],
      ['Channel', getDisplayTimeframe(selectedTimeframe, true)],
      ...bookingChannels.map(channel => [
        channel.id,
        formatCurrency(channel.value),
      ])
    ]

    if (comparisonType !== 'No comparison') {
      bookingChannelsData[0].push('', '')
      bookingChannelsData[1].push(`${getDisplayTimeframe(selectedTimeframe, true)} ${comparisonType === 'Last year' ? 'STLY' : 'Budget'}`, 'Change %')
      bookingChannelsData.slice(2).forEach((row, index) => {
        const compData = generateComparisonData(bookingChannels)[index]
        const change = ((bookingChannels[index].value - compData.value) / compData.value * 100).toFixed(1)
        row.push(formatCurrency(compData.value), `${change}%`)
      })
    }

    const wsBookingChannels = XLSX.utils.aoa_to_sheet(bookingChannelsData)

    // Geo Sources Sheet
    const geoSourcesData = [
      ['Geographic Sources', ''],
      ['Source', getDisplayTimeframe(selectedTimeframe, true)],
      ...geoSources.map(source => [
        source.id,
        formatCurrency(source.value),
      ])
    ]

    if (comparisonType !== 'No comparison') {
      geoSourcesData[0].push('', '')
      geoSourcesData[1].push(`${getDisplayTimeframe(selectedTimeframe, true)} ${comparisonType === 'Last year' ? 'STLY' : 'Budget'}`, 'Change %')
      geoSourcesData.slice(2).forEach((row, index) => {
        const compData = generateComparisonData(geoSources)[index]
        const change = ((geoSources[index].value - compData.value) / compData.value * 100).toFixed(1)
        row.push(formatCurrency(compData.value), `${change}%`)
      })
    }

    const wsGeoSources = XLSX.utils.aoa_to_sheet(geoSourcesData)

    // Cancellations Sheet
    const cancellationsExportData = [
      ['Cancellations', ''],
      ['Date', 'Cancellations', 'Revenue Lost'],
      ...combinedCancellationsData.map(item => [
        item.date,
        item.cancellations,
        formatCurrency(item.revenueLost || 0),
      ])
    ]

    if (comparisonType !== 'No comparison') {
      cancellationsExportData[0].push('', '')
      cancellationsExportData[1].push('Comparison Cancellations', 'Comparison Revenue Lost')
      cancellationsExportData.slice(2).forEach(row => {
        const item = combinedCancellationsData[cancellationsExportData.indexOf(row) - 2]
        row.push(item.comparisonCancellations, formatCurrency(item.comparisonRevenueLost || 0))
      })
    }

    const wsCancellations = XLSX.utils.aoa_to_sheet(cancellationsExportData)

    // No Shows Sheet
    const noShowsExportData = [
      ['No Shows', ''],
      ['Date', 'No Shows'],
      ...combinedNoShowsData.map(item => [
        item.date,
        item.noShows,
      ])
    ]

    if (comparisonType !== 'No comparison') {
      noShowsExportData[0].push('')
      noShowsExportData[1].push('Comparison No Shows')
      noShowsExportData.slice(2).forEach(row => {
        const item = combinedNoShowsData[noShowsExportData.indexOf(row) - 2]
        row.push(item.comparisonNoShows)
      })
    }

    const wsNoShows = XLSX.utils.aoa_to_sheet(noShowsExportData)

    // Add all sheets to workbook
    XLSX.utils.book_append_sheet(wb, wsOverview, 'Overview')
    XLSX.utils.book_append_sheet(wb, wsMarketSegments, 'Market Segments')
    XLSX.utils.book_append_sheet(wb, wsRoomTypes, 'Room Types')
    XLSX.utils.book_append_sheet(wb, wsBookingChannels, 'Booking Channels')
    XLSX.utils.book_append_sheet(wb, wsGeoSources, 'Geo Sources')
    XLSX.utils.book_append_sheet(wb, wsCancellations, 'Cancellations')
    XLSX.utils.book_append_sheet(wb, wsNoShows, 'No Shows')

    // Apply some basic styling to all sheets
    ;[wsOverview, wsMarketSegments, wsRoomTypes, wsBookingChannels, wsGeoSources, wsCancellations, wsNoShows].forEach(sheet => {
      // Set column widths based on whether comparison is enabled
      const columnWidths = comparisonType !== 'No comparison' 
        ? [{ wch: 20 }, { wch: 15 }, { wch: 15 }, { wch: 15 }, { wch: 15 }]
        : [{ wch: 20 }, { wch: 15 }]
      sheet['!cols'] = columnWidths

      // Add some cell styling
      if (sheet['A1']) {
        sheet['A1'].s = { font: { bold: true, sz: 14 } }
      }
      if (sheet['A2']) {
        const headerRow = comparisonType !== 'No comparison'
          ? ['A2', 'B2', 'C2', 'D2', 'E2']
          : ['A2', 'B2']
        headerRow.forEach(cell => {
          if (sheet[cell]) {
            sheet[cell].s = { font: { bold: true }, fill: { fgColor: { rgb: "EFEFEF" } } }
          }
        })
      }
    })

    // Generate filename with current date and selected timeframe
    const filename = `Dashboard_Export_${format(new Date(), 'yyyy-MM-dd')}_${selectedTimeframe.replace(/\s/g, '_')}.xlsx`
    
    // Write the file
    XLSX.writeFile(wb, filename)
  }

  // Add new state variables for graph displays
  const [chartTypes, setChartTypes] = useState<Record<string, 'pie' | 'bar'>>({
    marketSegments: 'bar',
    roomTypes: 'bar',
    bookingChannels: 'bar',
    geoSources: 'bar',
  })
  const [selectedDetailedChart, setSelectedDetailedChart] = useState<string | null>(null)
  const [selectedPieView, setSelectedPieView] = useState<Record<string, 'current' | 'comparison'>>({
    marketSegments: 'current',
    roomTypes: 'current',
    bookingChannels: 'current',
    geoSources: 'current',
  })

  // Add renderChart function
  const renderChart = (data: Array<{ id: string; value: number }>, title: string, filterKey: string) => {
    const chartType = chartTypes[filterKey]
    const comparisonData = generateComparisonData(data)
    const pieView = selectedPieView[filterKey]

    const toggleChartType = () => {
      setChartTypes(prev => ({
        ...prev,
        [filterKey]: chartType === 'pie' ? 'bar' : 'pie'
      }))
    }

    const togglePieView = (view: 'current' | 'comparison') => {
      setSelectedPieView(prev => ({
        ...prev,
        [filterKey]: view
      }))
    }

    return (
      <Card className="bg-white shadow-lg rounded-lg overflow-hidden flex flex-col">
        <CardHeader className="flex flex-col items-start">
          <div className="flex w-full justify-between items-center">
            <div>
              <CardTitle className="text-lg font-semibold text-gray-800">{title}</CardTitle>
            </div>
            <div className="flex items-center space-x-2">
              <button
                className={`text-sm px-3 py-1 rounded-full flex items-center transition-colors ${
                  chartType === 'bar' 
                    ? 'bg-blue-100 text-blue-600' 
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
                onClick={toggleChartType}
              >
                <BarChartIcon className="w-4 h-4 mr-1" />
                Bar
              </button>
              <button
                className={`text-sm px-3 py-1 rounded-full flex items-center transition-colors ${
                  chartType === 'pie' 
                    ? 'bg-blue-100 text-blue-600' 
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
                onClick={toggleChartType}
              >
                <PieChartIcon className="w-4 h-4 mr-1" />
                Pie
              </button>
            </div>
          </div>
          {chartType === 'pie' && comparisonType !== 'No comparison' && (
            <div className="flex w-full mt-4 border-b">
              <button 
                className={`px-4 py-2 ${
                  pieView === 'current'
                    ? 'border-b-2 border-blue-500 text-blue-600 text-sm'
                    : 'text-gray-500 text-sm '
                }`}
                onClick={() => togglePieView('current')}
              >
                {getDisplayTimeframe(selectedTimeframe)}
              </button>
              <button
                className={`px-4 py-2 ${
                  pieView === 'comparison'
                    ? 'border-b-2 border-blue-500 text-sm text-blue-600'
                    : 'text-gray-500 text-sm'
                }`}
                onClick={() => togglePieView('comparison')}
              >
                {getDisplayTimeframe(selectedTimeframe)} {comparisonType === 'Last year' ? 'STLY' : 'Budget'}
              </button>
            </div>
          )}
        </CardHeader>
        <CardContent className="flex-grow pb-2">
          <div style={{ height: chartType === 'pie' ? 250 : 300 }}>
            {chartType === 'pie' ? (
              <ResponsivePie
                data={pieView === 'current' ? data : comparisonData}
                margin={{ top: 50, right: 80, bottom: 20, left: 80 }}
                innerRadius={0.5}
                padAngle={0.7}
                cornerRadius={3}
                activeOuterRadiusOffset={8}
                colors={COLORS}
                borderWidth={1}
                borderColor={{ from: 'color', modifiers: [['darker', 0.2]] }}
                arcLinkLabelsSkipAngle={10}
                arcLinkLabelsTextColor="#666666"
                arcLinkLabelsThickness={2}
                arcLinkLabelsColor={{ from: 'color' }}
                arcLabelsSkipAngle={10}
                arcLabelsTextColor={{ from: 'color', modifiers: [['darker', 2]] }}
                arcLabel={d => `${Math.round((d.value / data.reduce((sum, item) => sum + item.value, 0)) * 100)}%`}
                theme={modernTheme}
              />
            ) : (
              <ResponsiveBar
                data={data.map((item, index) => ({
                  ...item,
                  comparisonValue: comparisonType !== 'No comparison' ? comparisonData[index].value : undefined
                }))}
                keys={comparisonType !== 'No comparison' ? ['value', 'comparisonValue'] : ['value']}
                indexBy="id"
                margin={{ 
                  top: 50,
                  right: 20, 
                  bottom: comparisonType !== 'No comparison' ? 80 : 40,
                  left: 50
                }}
                padding={0.2}
                colors={({ id }) => COLORS[id === 'value' ? 0 : 1]}
                borderColor={{ from: 'color', modifiers: [['darker', 1.6]] }}
                axisBottom={{
                  tickSize: 5,
                  tickPadding: 10,
                  tickRotation: 0,
                  legend: undefined,
                  legendPosition: 'middle',
                  legendOffset: 32
                }}
                axisLeft={{
                  tickSize: 5,
                  tickPadding: 10,
                  tickRotation: 0,
                  legend: '',
                  legendPosition: 'middle',
                  legendOffset: -50,
                  format: (value) => `€${value / 1000}K`,
                  tickValues: getYAxisTickValues(data),
                  renderTick: (tick) => {
                    return (
                      <g transform={`translate(${tick.x},${tick.y})`}>
                        <line x2="-6" y2="0" stroke="#e5e7eb" />
                        <text
                          x="-12"
                          y="0"
                          dy="0.32em"
                          textAnchor="end"
                          fontFamily="'Geist Sans', sans-serif"
                          fontSize="11px"
                          fill="#7d8694"
                        >
                          {tick.value === 0 ? '€0' : `€${tick.value / 1000}K`}
                        </text>
                      </g>
                    );
                  }
                }}
                gridYValues={getYAxisTickValues(data)}
                labelSkipWidth={12}
                labelSkipHeight={12}
                enableLabel={comparisonType === 'No comparison'}
                label={d => `€${(d.value || 0).toLocaleString()}`}
                labelTextColor={{ from: 'color', modifiers: [['darker', 1.6]] }}
                animate={true}
                theme={modernTheme}
                groupMode={comparisonType !== 'No comparison' ? "grouped" : "stacked"}
                legends={comparisonType !== 'No comparison' ? [
                  {
                    dataFrom: 'keys',
                    anchor: 'bottom',
                    direction: 'row',
                    justify: false,
                    translateX: 0,
                    translateY: 80,
                    itemsSpacing: 20,
                    itemWidth: 80,
                    itemHeight: 20,
                    itemDirection: 'left-to-right',
                    itemOpacity: 1,
                    symbolSize: 12,
                    symbolShape: 'circle',
                    effects: [],
                    data: [
                      { id: 'value', label: getDisplayTimeframe(selectedTimeframe), color: COLORS[0] },
                      { id: 'comparisonValue', label: `${getDisplayTimeframe(selectedTimeframe)} ${comparisonType === 'Last year' ? 'STLY' : 'Budget'}`, color: COLORS[1] }
                    ]
                  }
                ] : []}
                tooltip={({ id, value, color }) => (
                  <div
                    style={{
                      padding: 12,
                      background: '#ffffff',
                      color: '#333333',
                      border: '1px solid #ccc',
                      borderRadius: '4px',
                    }}
                  >
                    <strong>{id}</strong>
                    <br />
                    <span style={{ color }}>€{(value || 0).toLocaleString()}</span>
                  </div>
                )}
              />
            )}
          </div>
        </CardContent>
        <div className="px-6 py-4">
          <hr className="border-t border-gray-200 mb-4" />
          <div className="flex justify-end">
            <button
              className="text-blue-600 hover:text-blue-800 font-medium text-sm focus:outline-none"
              onClick={() => setSelectedDetailedChart(filterKey)}
            >
              View Details
            </button>
          </div>
        </div>
      </Card>
    )
  }

  // Add inside OverviewDashboard component, with other state declarations
  const [cancellationMetric, setCancellationMetric] = useState<'cancellations' | 'revenueLost'>('cancellations');
  const [combinedCancellationsData, setCombinedCancellationsData] = useState<ChartData[]>([]);
  const [combinedNoShowsData, setCombinedNoShowsData] = useState<ChartData[]>([]);

  // Add this useEffect after the state declarations
  useEffect(() => {
    setCombinedCancellationsData(generateLineChartComparisonData(cancellationsData));
    setCombinedNoShowsData(generateLineChartComparisonData(noShowsData));
  }, []);

  // Add inside OverviewDashboard component, after other render functions
  const renderAreaChart = (data: ChartData[], title: string, dataKey: string, comparisonDataKey: string, color: string, comparisonColor: string, showSelector: boolean) => (
    <Card className="bg-white shadow-lg rounded-lg overflow-hidden">
      <CardHeader className="flex flex-col items-start">
        <div className="flex w-full justify-between items-center">
          <div>
            <CardTitle className="text-lg font-semibold text-gray-800">{title}</CardTitle>
          </div>
          {showSelector && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm">
                  {cancellationMetric === 'cancellations' ? 'Number of cancellations' : 'Revenue lost'} <ChevronDownIcon className="ml-2 h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuItem onSelect={() => setCancellationMetric('cancellations')}>
                  Number of cancellations
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={() => setCancellationMetric('revenueLost')}>
                  Revenue lost
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div style={{ height: 300 }}>
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart
              data={data}
              margin={{ top: 20, right: 30, left: 0, bottom: comparisonType !== 'No comparison' ? 40 : 20 }}
            >
              <CartesianGrid horizontal={true} vertical={false} />
              <XAxis
                dataKey="date"
                axisLine={false}
                tickLine={false}
                tick={{ dy: 15, fontSize: 11, fill: "#999", fontWeight: 500 }}
              />
              <YAxis
                domain={[0, 'dataMax']}
                axisLine={false}
                tickLine={false}
                tick={{ dx: -15, fontSize: 11, fill: "#999", fontWeight: 500 }}
                tickFormatter={(value) => dataKey.includes('revenueLost') ? `€${value}` : value.toString()}
              />
              <Tooltip 
                formatter={(value: number, name: string) => {
                  if (name.includes('revenueLost')) {
                    return [`€${value}`, name.includes('comparison') ? 'Comparison Revenue lost' : 'Revenue lost'];
                  }
                  return [value, name.includes('comparison') ? `Comparison ${name}` : name];
                }}
              />
              {comparisonType === 'No comparison' ? (
                <Area 
                  type="monotone"
                  dataKey={dataKey}
                  stroke={color}
                  strokeWidth={2}
                  fill={color}
                  fillOpacity={0.1}
                  dot={false}
                  activeDot={{ r: 8 }}
                />
              ) : (
                <>
                  <Area 
                    type="monotone"
                    dataKey={dataKey}
                    stroke={color}
                    strokeWidth={2}
                    fill="none"
                    dot={false}
                    activeDot={{ r: 8 }}
                  />
                  <Area 
                    type="monotone"
                    dataKey={comparisonDataKey}
                    stroke={comparisonColor}
                    strokeWidth={2}
                    fill="none"
                    dot={false}
                    activeDot={{ r: 8 }}
                  />
                </>
              )}
            </AreaChart>
          </ResponsiveContainer>
        </div>
        {comparisonType !== 'No comparison' && (
          <div className="flex justify-center mt-4">
            <div className="flex items-center space-x-8">
              <div className="flex items-center">
                <div className="w-3 h-3 rounded-full mr-2" style={{ backgroundColor: color }}></div>
                <span className="text-sm text-gray-500">{getDisplayTimeframe(selectedTimeframe)}</span>
              </div>
              <div className="flex items-center">
                <div className="w-3 h-3 rounded-full mr-2" style={{ backgroundColor: comparisonColor }}></div>
                <span className="text-sm text-gray-500">{`${getDisplayTimeframe(selectedTimeframe)} ${comparisonType === 'Last year' ? 'STLY' : 'Budget'}`}</span>
              </div>
            </div>
          </div>
        )}
      </CardContent>
      <div className="px-6 py-4">
        <hr className="border-t border-gray-200 mb-4" />
        <div className="flex justify-end">
          <button
            className="text-blue-600 hover:text-blue-800 font-medium text-sm focus:outline-none"
            onClick={() => {
              if (title === "Cancellations") {
                const formattedData = data.map(item => ({
                  date: item.date,
                  value: cancellationMetric === 'cancellations' ? item.cancellations : item.revenueLost,
                  comparison: cancellationMetric === 'cancellations' ? item.comparisonCancellations : item.comparisonRevenueLost,
                }));
                setSelectedMetricCard({
                  title: cancellationMetric === 'cancellations' ? 'Number of Cancellations' : 'Revenue Lost from Cancellations',
                  data: formattedData
                });
              } else if (title === "No-Shows") {
                const formattedData = data.map(item => ({
                  date: item.date,
                  value: item.noShows,
                  comparison: item.comparisonNoShows,
                }));
                setSelectedMetricCard({
                  title: 'Number of No-Shows',
                  data: formattedData
                });
              }
            }}
          >
            View Details
          </button>
        </div>
      </div>
    </Card>
  );

  // First, add these new state variables near the top of the OverviewDashboard component
  const [selectedMetricCard, setSelectedMetricCard] = useState<string | null>(null);

  // Function to calculate date range based on timeframe and view type
  const calculateDateRange = (timeframe: string, view: string, businessDate: Date | undefined) => {
    if (!businessDate) return { start: '', end: '' };

    // Get start of month, end of month, start of year, end of year for the business date
    const startOfMonth = new Date(businessDate.getFullYear(), businessDate.getMonth(), 1);
    const endOfMonth = new Date(businessDate.getFullYear(), businessDate.getMonth() + 1, 0);
    const startOfYear = new Date(businessDate.getFullYear(), 0, 1);
    const endOfYear = new Date(businessDate.getFullYear(), 11, 31);
    
    // Format the business date for comparison
    const businessDateStr = format(businessDate, 'yyyy-MM-dd');

    if (timeframe === 'day') {
      // For day, always return the business date for both start and end
      return {
        start: businessDateStr,
        end: businessDateStr
      };
    }
    
    if (timeframe === 'month') {
      switch (view) {
        case 'actual':
          // From start of month to business date
          return {
            start: format(startOfMonth, 'yyyy-MM-dd'),
            end: format(subDays(businessDate, 1), 'yyyy-MM-dd')
          };
        case 'otb':
          // From business date to end of month
          return {
            start: businessDateStr,
            end: format(endOfMonth, 'yyyy-MM-dd')
          };
        case 'projected':
          // Whole month
          return {
            start: format(startOfMonth, 'yyyy-MM-dd'),
            end: format(endOfMonth, 'yyyy-MM-dd')
          };
      }
    }
    
    if (timeframe === 'year') {
      switch (view) {
        case 'actual':
          // From start of year to business date
          return {
            start: format(startOfYear, 'yyyy-MM-dd'),
            end: format(subDays(businessDate, 1), 'yyyy-MM-dd')
          };
        case 'otb':
          // From business date to end of year
          return {
            start: businessDateStr,
            end: format(endOfYear, 'yyyy-MM-dd')
          };
        case 'projected':
          // Whole years
          return {
            start: format(startOfYear, 'yyyy-MM-dd'),
            end: format(endOfYear, 'yyyy-MM-dd')
          };
      }
    }

    return { start: '', end: '' };
  };

  // Update the effect to pass businessDate to calculateDateRange
  useEffect(() => {
    if (!businessDate) return;
    
    const newRange = calculateDateRange(timeframeType, viewType, businessDate);
    setOccupancyDateRange(newRange);
  }, [timeframeType, viewType, businessDate]); // Added businessDate as dependency

  // Effect to fetch data when parameters change
  useEffect(() => {
    const fetchData = async () => {
      if (!businessDate || !occupancyDateRange.start || !occupancyDateRange.end) return;

      try {
        const response = await fetch(
          `/api/overview/general?` + 
          `business_date=${format(businessDate, 'yyyy-MM-dd')}` +
          `&occupancy_date_start=${occupancyDateRange.start}` +
          `&occupancy_date_end=${occupancyDateRange.end}`
        );

        if (!response.ok) throw new Error('Failed to fetch data');

        const data = await response.json();
        setKpiData(data);
      } catch (error) {
        console.error('Error fetching data:', error);
      }
    };

    fetchData();
  }, [businessDate, occupancyDateRange]);

  // Add date change handler
  const handleDateChange = (newDate: Date | undefined) => {
    setBusinessDate(newDate);
  };

  // Add the new CustomDialog for metrics near the end of the component, alongside the existing dialogs
  return (
    <div className="flex-1 overflow-auto">
      <div className="p-8">
        {/* Modified Header */}
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center space-x-4">
            <h2 className="text-3xl font-bold text-gray-800">Overview</h2>
            
            {/* Time Frame Tabs */}
            <Tabs defaultValue={timeframeType} onValueChange={(value) => setTimeframeType(value as 'day' | 'month' | 'year')}>
              <TabsList>
                <TabsTrigger value="day">Day</TabsTrigger>
                <TabsTrigger value="month">Month</TabsTrigger>
                <TabsTrigger value="year">Year</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>

          <div className="flex items-center space-x-4">
            {/* View Type Tabs */}
            <Tabs defaultValue={viewType} onValueChange={(value) => setViewType(value as 'actual' | 'otb' | 'projected')}>
              <TabsList>
                <TabsTrigger value="actual">Actual</TabsTrigger>
                <TabsTrigger value="otb">OTB</TabsTrigger>
                <TabsTrigger value="projected">Projected</TabsTrigger>
              </TabsList>
            </Tabs>

            {/* Update DatePicker with props */}
            <DatePicker 
              date={businessDate}
              onDateChange={handleDateChange}
            />

            {/* Keep Export Button */}
            <Button 
              variant="ghost" 
              onClick={handleExportToExcel}
              className="flex items-center space-x-2 text-blue-600"
            >
              <DownloadIcon className="h-4 w-4" />
              <span>Export to Excel</span>
            </Button>

            {/* Keep Hotel Selector */}
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
                  
        {/* Numerical Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {kpiData && [
            { 
              title: "Sold Rooms", 
              value: Math.round(kpiData.soldRooms),
              icon: BedDoubleIcon 
            },
            { 
              title: "Total Revenue", 
              value: `$${Math.round(kpiData.roomRevenue + kpiData.fbRevenue).toLocaleString()}`,
              icon: DollarSignIcon 
            },
            { 
              title: "Rooms Revenue", 
              value: `$${Math.round(kpiData.roomRevenue).toLocaleString()}`,
              icon: DollarSignIcon 
            },
            { 
              title: "F&B Revenue", 
              value: `$${Math.round(kpiData.fbRevenue).toLocaleString()}`,
              icon: UtensilsIcon 
            },
            { 
              title: "ADR", 
              value: `$${Math.round(kpiData.adr).toLocaleString()}`,
              icon: TrendingUpIcon 
            },
            { 
              title: "Occupancy", 
              value: `${Math.round(kpiData.occupancy)}%`,
              icon: PercentIcon 
            },
            { 
              title: "RevPAR", 
              value: `$${Math.round(kpiData.revPAR).toLocaleString()}`,
              icon: BarChartIcon 
            },
            { 
              title: "TrevPAR", 
              value: `$${Math.round(kpiData.trevPAR).toLocaleString()}`,
              icon: LineChartIcon 
            }
          ].map((item) => (
            <motion.div
              key={item.title}
              whileHover={{ scale: 1.05 }}
              onClick={() => handleCardClick(item.title)}
              className="cursor-pointer"
            >
              <Card className="bg-white shadow-lg rounded-lg overflow-hidden">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-0">
                  <CardTitle className="text-sm font-medium text-gray-500">
                    {item.title}
                  </CardTitle>
                  <item.icon className="h-4 w-4 text-gray-500" />
                </CardHeader>
                <CardContent className="pt-4">
                  <div className="text-2xl font-bold">{item.value}</div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>

        {/* Graph Displays */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {renderChart(marketSegments, "Market Segments", "marketSegments")}
          {renderChart(roomTypes, "Room Types", "roomTypes")}
          {renderChart(bookingChannels, "Booking Channels", "bookingChannels")}
          {renderChart(geoSources, "Geo Sources", "geoSources")}
        </div>

        {/* Line Charts */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-8">
          {renderAreaChart(
            combinedCancellationsData, 
            "Cancellations", 
            cancellationMetric, 
            `comparison${cancellationMetric.charAt(0).toUpperCase() + cancellationMetric.slice(1)}`,
            "#60a5fa", 
            "#82ca9d", 
            true
          )}
          {renderAreaChart(
            combinedNoShowsData, 
            "No-Shows", 
            "noShows", 
            "comparisonNoShows", 
            "#60a5fa", 
            "#82ca9d", 
            false
          )}
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
                  data={worldMapData}
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
            <div className="px-6 py-4">
              <hr className="border-t border-gray-200 mb-4" />
              <div className="flex justify-end">
                <button
                  className="text-blue-600 hover:text-blue-800 font-medium text-sm focus:outline-none"
                  onClick={() => setSelectedDetailedChart('worldMap')}
                >
                  View Details
                </button>
              </div>
            </div>
          </Card>
        </div>

        {/* Add the new horizontal bar charts row */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-8">
          <HorizontalBarChart 
            title="Revenue by Department"
            description="Last 6 months"
            data={[
              { name: "Rooms", value: 286 },
              { name: "F&B", value: 234 },
              { name: "Spa", value: 187 },
              { name: "Events", value: 143 },
              { name: "Other", value: 98 },
            ]}
          />
          <HorizontalBarChart 
            title="Bookings by Channel"
            description="Last 6 months"
            data={[
              { name: "Direct", value: 245 },
              { name: "Booking.com", value: 198 },
              { name: "Expedia", value: 167 },
              { name: "Travel Agents", value: 142 },
              { name: "Other OTAs", value: 87 },
            ]}
          />
        </div>

        {/* Add the Top Producers section */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-8">
          <TopFive 
            title="Top Producers - Room Revenue"
            data={[
              { name: "Campsite", value: 5, change: 1 },
              { name: "Other", value: 4.8, change: -0.2 },
              { name: "Kids offer", value: 4.5, change: 4.5 },
              { name: "Staff & Service", value: 4.3, change: -0.3 },
              { name: "Food", value: 4.3, change: -0.2 },
            ]}
          />
          <TopFive 
            title="Top Producers - F&B Revenue"
            data={[
              { name: "Restaurant", value: 5.2, change: 0.8 },
              { name: "Room Service", value: 4.9, change: -0.3 },
              { name: "Bar", value: 4.7, change: 1.2 },
              { name: "Banquet", value: 4.4, change: -0.4 },
              { name: "Catering", value: 4.1, change: 0.5 },
            ]}
          />
        </div>
      </div>

      {/* Custom Dialog */}
      <CustomDialog
        selectedCard={selectedCard}
        closeDialog={closeDialog}
        selectedTimeframe={selectedTimeframe}
        comparisonType={comparisonType}
        pieChartData={pieChartData}
        comparisonPieChartData={comparisonPieChartData}
      />

      {/* Custom Dialog for Metrics */}
      <CustomDialog
        selectedCard={selectedMetricCard?.title || null}
        closeDialog={() => setSelectedMetricCard(null)}
        selectedTimeframe={selectedTimeframe}
        comparisonType={comparisonType}
        customData={selectedMetricCard?.data}
      />

      {/* Add DetailedDialog */}
      {selectedDetailedChart && (
        <DetailedDialog
          title={selectedDetailedChart.replace(/([A-Z])/g, ' $1').trim().replace(/^\w/, c => c.toUpperCase())}
          subtitle={`${getDisplayTimeframe(selectedTimeframe)} vs ${getDisplayTimeframe(selectedTimeframe)} ${comparisonType === 'Last year' ? 'STLY' : 'Budget'}`}
          closeDialog={() => setSelectedDetailedChart(null)}
          selectedData={
            selectedDetailedChart === 'marketSegments' ? marketSegments :
            selectedDetailedChart === 'roomTypes' ? roomTypes :
            selectedDetailedChart === 'bookingChannels' ? bookingChannels :
            geoSources
          }
          comparisonData={generateComparisonData(
            selectedDetailedChart === 'marketSegments' ? marketSegments :
            selectedDetailedChart === 'roomTypes' ? roomTypes :
            selectedDetailedChart === 'bookingChannels' ? bookingChannels :
            geoSources
          )}
        />
      )}

    </div>
  )
}
