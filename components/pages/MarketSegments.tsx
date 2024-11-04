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
  XIcon,
} from 'lucide-react'
import { CustomDialog } from '../NumericalCardDetails'
import { DetailedDialog } from '../GraphCardDetails'
import { Calendar } from "@/components/ui/calendar"
import { format } from "date-fns"
import * as XLSX from 'xlsx'
import { ResponsivePie } from '@nivo/pie'
import { ResponsiveBar, BarDatum } from '@nivo/bar'
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts'
import { cn } from "@/lib/utils"

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
  { title: "Rooms", value: 150, change: 5.2, comparisonValue: 142, icon: BedDoubleIcon },
  { title: "Total Revenue", value: "$35,000", change: 3.8, comparisonValue: "$33,700", icon: DollarSignIcon },
  { title: "Room Revenue", value: "$25,000", change: 4.5, comparisonValue: "$23,900", icon: DollarSignIcon },
  { title: "F&B Revenue", value: "$10,000", change: 2.1, comparisonValue: "$9,800", icon: UtensilsIcon },
  { title: "ADR", value: "$166.67", change: 3.8, comparisonValue: "$160.56", icon: TrendingUpIcon },
  { title: "Occupancy", value: "75%", change: 1.5, comparisonValue: "73.8%", icon: PercentIcon },
  { title: "Cancellations", value: "12", change: -2.3, comparisonValue: "10", icon: XIcon },
  { title: "Average Length of Stay", value: "3.5", change: 0.8, comparisonValue: "3.2", icon: BarChartIcon },
  { title: "Lead Time", value: "45", change: 2.1, comparisonValue: "42", icon: LineChartIcon },
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
const generateLineChartComparisonData = (data: TimeSeriesData[]): TimeSeriesData[] => {
  return data.map(item => ({
    date: item.date,
    value: item.value,
    comparison: Math.round(item.value * (1 + (Math.random() - 0.5) * 0.4))
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

// Add this type definition near the top with other types
type Tab = 'All' | 'Personal' | 'Business' | 'Corporate' | 'Government' | 'Other';

// Add this interface for the metric card
interface MetricCard {
  title: string;
  data?: Array<{ date: string; value: number; comparison?: number }>;
}

// Add these interfaces and data near the top with other interfaces
interface TimeSeriesData {
  date: string;
  value: number;
  comparison?: number;
}

// Add the new data constants
const avgLengthOfStayData: TimeSeriesData[] = [
  { date: '2023-01', value: 3.2 },
  { date: '2023-02', value: 3.5 },
  { date: '2023-03', value: 3.8 },
  { date: '2023-04', value: 3.3 },
  { date: '2023-05', value: 3.6 },
  { date: '2023-06', value: 3.9 },
];

const leadTimeData: TimeSeriesData[] = [
  { date: '2023-01', value: 42 },
  { date: '2023-02', value: 45 },
  { date: '2023-03', value: 48 },
  { date: '2023-04', value: 43 },
  { date: '2023-05', value: 46 },
  { date: '2023-06', value: 49 },
];

// Add this interface for the table data
interface BookingChannelTableData {
  channel: string;
  rooms: number;
  totalRevenue: number;
  roomRevenue: number;
  fbRevenue: number;
  adr: number;
  occupancy: number;
  cancellations: number;
  avgLengthOfStay: number;
  leadTime: number;
}

// Add this data constant
const bookingChannelTableData: BookingChannelTableData[] = [
  {
    channel: "Direct",
    rooms: 150,
    totalRevenue: 35000,
    roomRevenue: 25000,
    fbRevenue: 10000,
    adr: 166.67,
    occupancy: 75,
    cancellations: 12,
    avgLengthOfStay: 3.5,
    leadTime: 45
  },
  {
    channel: "OTA",
    rooms: 120,
    totalRevenue: 28000,
    roomRevenue: 20000,
    fbRevenue: 8000,
    adr: 155.50,
    occupancy: 70,
    cancellations: 15,
    avgLengthOfStay: 3.2,
    leadTime: 30
  },
  {
    channel: "Travel Agent",
    rooms: 90,
    totalRevenue: 21000,
    roomRevenue: 15000,
    fbRevenue: 6000,
    adr: 145.80,
    occupancy: 65,
    cancellations: 8,
    avgLengthOfStay: 4.0,
    leadTime: 60
  },
  {
    channel: "Corporate",
    rooms: 60,
    totalRevenue: 14000,
    roomRevenue: 10000,
    fbRevenue: 4000,
    adr: 138.90,
    occupancy: 55,
    cancellations: 5,
    avgLengthOfStay: 2.8,
    leadTime: 25
  }
];

// Add this component for the table
const BookingChannelsTable = ({ data, comparisonType }: { data: BookingChannelTableData[], comparisonType: string }) => {
  // Add comparison data with random changes
  const comparisonData = data.map(row => ({
    ...row,
    rooms: Math.round(row.rooms * (1 + (Math.random() - 0.5) * 0.2)),
    totalRevenue: Math.round(row.totalRevenue * (1 + (Math.random() - 0.5) * 0.2)),
    roomRevenue: Math.round(row.roomRevenue * (1 + (Math.random() - 0.5) * 0.2)),
    fbRevenue: Math.round(row.fbRevenue * (1 + (Math.random() - 0.5) * 0.2)),
    adr: Math.round(row.adr * (1 + (Math.random() - 0.5) * 0.2) * 100) / 100,
    occupancy: Math.round(row.occupancy * (1 + (Math.random() - 0.5) * 0.2)),
    cancellations: Math.round(row.cancellations * (1 + (Math.random() - 0.5) * 0.2)),
    avgLengthOfStay: Math.round(row.avgLengthOfStay * (1 + (Math.random() - 0.5) * 0.2) * 10) / 10,
    leadTime: Math.round(row.leadTime * (1 + (Math.random() - 0.5) * 0.2))
  }));

  const formatValue = (value: number, type: string) => {
    switch(type) {
      case 'currency':
        return `€${value.toLocaleString()}`;
      case 'percentage':
        return `${value}%`;
      default:
        return value.toLocaleString();
    }
  };

  const getChangePercentage = (current: number, comparison: number) => {
    const change = ((current - comparison) / comparison) * 100;
    return change.toFixed(1);
  };

  const renderCell = (currentValue: number, comparisonValue: number, type: string) => {
    const changePercentage = Number(getChangePercentage(currentValue, comparisonValue));
    
    return (
      <td className="px-6 py-4 whitespace-nowrap text-sm">
        <div className="flex flex-col">
          <span className="text-gray-600">{formatValue(currentValue, type)}</span>
          {comparisonType !== 'No comparison' && (
            <div className={`text-xs mt-1 ${
              changePercentage > 0 
                ? 'text-green-600' 
                : changePercentage < 0 
                  ? 'text-red-600' 
                  : 'text-gray-500'
            }`}>
              {changePercentage > 0 ? '↑' : changePercentage < 0 ? '↓' : ''}
              {Math.abs(changePercentage)}%
            </div>
          )}
        </div>
      </td>
    );
  };

  return (
    <div className="bg-white shadow-lg border border-gray-200 rounded-lg overflow-hidden">
      <div className="overflow-x-auto">
      <div className="flex justify-between items-center bg-white px-6 py-4">
          <h2 className="text-lg font-semibold bg-white text-gray-800">All market segments</h2>
        </div>
        <table className="min-w-full divide-y divide-gray-300 border-t border-gray-300">
          <thead className="bg-gray-50 font-medium uppercase">
            <tr >
              <th className="px-6 py-4 text-left text-sm font-medium text-gray-800">Channel</th>
              <th className="px-6 py-4 text-left text-sm font-medium text-gray-800">Rooms</th>
              <th className="px-6 py-4 text-left text-sm font-medium text-gray-800">Total Revenue</th>
              <th className="px-6 py-4 text-left text-sm font-medium text-gray-800">Room Revenue</th>
              <th className="px-6 py-4 text-left text-sm font-medium text-gray-800">F&B Revenue</th>
              <th className="px-6 py-4 text-left text-sm font-medium text-gray-800">ADR</th>
              <th className="px-6 py-4 text-left text-sm font-medium text-gray-800">Occupancy</th>
              <th className="px-6 py-4 text-left text-sm font-medium text-gray-800">Cancellations</th>
              <th className="px-6 py-4 text-left text-sm font-medium text-gray-800">Avg Length of Stay</th>
              <th className="px-6 py-4 text-left text-sm font-medium text-gray-800">Lead Time</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {data.map((row, index) => (
              <tr key={index}>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 bg-gray- border-r border-gray-300 text-sm"> {row.channel}</td>
                {renderCell(row.rooms, comparisonData[index].rooms, 'number')}
                {renderCell(row.totalRevenue, comparisonData[index].totalRevenue, 'currency')}
                {renderCell(row.roomRevenue, comparisonData[index].roomRevenue, 'currency')}
                {renderCell(row.fbRevenue, comparisonData[index].fbRevenue, 'currency')}
                {renderCell(row.adr, comparisonData[index].adr, 'currency')}
                {renderCell(row.occupancy, comparisonData[index].occupancy, 'percentage')}
                {renderCell(row.cancellations, comparisonData[index].cancellations, 'number')}
                {renderCell(row.avgLengthOfStay, comparisonData[index].avgLengthOfStay, 'number')}
                {renderCell(row.leadTime, comparisonData[index].leadTime, 'number')}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      </div>
  );
};

// Modify the table data to reflect market segments
const marketSegmentTableData: BookingChannelTableData[] = [
  {
    channel: "Personal",  // Changed from "Direct"
    rooms: 150,
    totalRevenue: 35000,
    roomRevenue: 25000,
    fbRevenue: 10000,
    adr: 166.67,
    occupancy: 75,
    cancellations: 12,
    avgLengthOfStay: 3.5,
    leadTime: 45
  },
  {
    channel: "Business",  // Changed from "OTA"
    rooms: 120,
    totalRevenue: 28000,
    roomRevenue: 20000,
    fbRevenue: 8000,
    adr: 155.50,
    occupancy: 70,
    cancellations: 15,
    avgLengthOfStay: 3.2,
    leadTime: 30
  },
  {
    channel: "Corporate",  // Changed from "Travel Agent"
    rooms: 90,
    totalRevenue: 21000,
    roomRevenue: 15000,
    fbRevenue: 6000,
    adr: 145.80,
    occupancy: 65,
    cancellations: 8,
    avgLengthOfStay: 4.0,
    leadTime: 60
  },
  {
    channel: "Government",  // Changed from "Corporate"
    rooms: 60,
    totalRevenue: 14000,
    roomRevenue: 10000,
    fbRevenue: 4000,
    adr: 138.90,
    occupancy: 55,
    cancellations: 5,
    avgLengthOfStay: 2.8,
    leadTime: 25
  },
  {
    channel: "Other",  // Added new segment
    rooms: 45,
    totalRevenue: 10000,
    roomRevenue: 7000,
    fbRevenue: 3000,
    adr: 130.50,
    occupancy: 50,
    cancellations: 4,
    avgLengthOfStay: 2.5,
    leadTime: 20
  }
];

// Modify the Tab type
type Tab = 'All' | 'Personal' | 'Business' | 'Corporate' | 'Government' | 'Other';

// Rename the component
export function MarketSegmentsDashboard() {
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
        { id: "Room Revenue", value: 25000 },
        { id: "F&B Revenue", value: 10000 },
        { id: "Other Revenue", value: 5000 },
      ]);
      
      if (comparisonType !== 'No comparison') {
        setComparisonPieChartData([
          { id: "Room Revenue", value: 23000 },
          { id: "F&B Revenue", value: 9000 },
          { id: "Other Revenue", value: 4500 },
        ]);
      }
    } else if (title === "F&B Revenue") {
      setPieChartData([
        { id: "Restaurant", value: 4000 },
        { id: "Bar", value: 3000 },
        { id: "Room Service", value: 2000 },
        { id: "Events", value: 1000 },
      ]);
      
      if (comparisonType !== 'No comparison') {
        setComparisonPieChartData([
          { id: "Restaurant", value: 3800 },
          { id: "Bar", value: 2800 },
          { id: "Room Service", value: 1900 },
          { id: "Events", value: 900 },
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

  const handleDateRangeSelect = (range: { from: Date | undefined; to: Date | undefined } | undefined) => {
    setTempDateRange(range ? { from: range.from, to: range.to } : undefined);
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
    const wb = XLSX.utils.book_new();
    
    // Overview Metrics Sheet
    const overviewData = [
      ['Overview Metrics', ''],
      ['Metric', getDisplayTimeframe(selectedTimeframe, true)],
      ...numericalData.map(item => [
        item.title,
        item.value,
      ])
    ];
    
    if (comparisonType !== 'No comparison') {
      overviewData[0].push('', '');
      overviewData[1].push(
        `${getDisplayTimeframe(selectedTimeframe, true)} ${comparisonType === 'Last year' ? 'STLY' : 'Budget'}`, 
        'Change %'
      );
      overviewData.slice(2).forEach((row, index) => {
        row.push(numericalData[index].comparisonValue || '-', `${numericalData[index].change}%`);
      });
    }
    
    const wsOverview = XLSX.utils.aoa_to_sheet(overviewData);

    // Add styling
    const applyStyles = (sheet: XLSX.WorkSheet) => {
      const columnWidths = comparisonType !== 'No comparison' 
        ? [{ wch: 20 }, { wch: 15 }, { wch: 15 }, { wch: 15 }]
        : [{ wch: 20 }, { wch: 15 }];
      sheet['!cols'] = columnWidths;

      if (sheet['A1']) {
        sheet['A1'].s = { font: { bold: true, sz: 14 } };
      }

      const headerRow = comparisonType !== 'No comparison'
        ? ['A2', 'B2', 'C2', 'D2']
        : ['A2', 'B2'];

      headerRow.forEach(cell => {
        if (sheet[cell]) {
          sheet[cell].s = { font: { bold: true }, fill: { fgColor: { rgb: "EFEFEF" } } };
        }
      });
    };

    // Apply styles to overview sheet
    applyStyles(wsOverview);

    // Add sheet to workbook
    XLSX.utils.book_append_sheet(wb, wsOverview, 'Overview');

    // Generate filename
    const filename = `Dashboard_Export_${format(new Date(), 'yyyy-MM-dd')}_${selectedTimeframe.replace(/\s/g, '_')}.xlsx`;
    
    // Write the file
    XLSX.writeFile(wb, filename);
  };

  // Add new state variables for graph displays
  const [chartTypes, setChartTypes] = useState<Record<string, 'pie' | 'bar'>>({
    marketSegments: 'bar',
    roomTypes: 'bar',
    bookingChannels: 'bar',
    geoSources: 'bar',
  });
  const [selectedDetailedChart, setSelectedDetailedChart] = useState<string | null>(null);
  const [selectedPieView, setSelectedPieView] = useState<Record<string, 'current' | 'comparison'>>({
    marketSegments: 'current',
    roomTypes: 'current',
    bookingChannels: 'current',
    geoSources: 'current',
  });

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
              <CardTitle className="text-md font-medium text-gray-800">{title}</CardTitle>
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
                label={d => `${(d.value || 0).toLocaleString()}`}
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
  const [combinedCancellationsData, setCombinedCancellationsData] = useState<TimeSeriesData[]>([]);
  const [combinedNoShowsData, setCombinedNoShowsData] = useState<TimeSeriesData[]>([]);

  // Add this useEffect after the state declarations
  useEffect(() => {
    // Convert cancellationsData to TimeSeriesData format
    const formattedCancellationsData: TimeSeriesData[] = cancellationsData.map(item => ({
      date: item.date,
      value: item.cancellations || 0,
      comparison: item.comparisonCancellations
    }));

    // Convert noShowsData to TimeSeriesData format
    const formattedNoShowsData: TimeSeriesData[] = noShowsData.map(item => ({
      date: item.date,
      value: item.noShows || 0,
      comparison: item.comparisonNoShows
    }));

    setCombinedCancellationsData(formattedCancellationsData);
    setCombinedNoShowsData(formattedNoShowsData);
  }, []);

  // Add inside OverviewDashboard component, after other render functions
  const renderAreaChart = (
    data: TimeSeriesData[], 
    title: string, 
    dataKey: string, 
    comparisonDataKey: string,
    color: string, 
    comparisonColor: string, 
    showSelector: boolean
  ) => (
    <Card className="bg-white shadow-lg rounded-lg overflow-hidden">
      <CardHeader className="flex flex-col items-start">
        <div className="flex w-full justify-between items-center">
          <div>
            <CardTitle className="text-md font-medium text-gray-800">{title}</CardTitle>
          </div>
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
              />
              <Tooltip />
              {comparisonType === 'No comparison' ? (
                <Area 
                  type="monotone"
                  dataKey="value"
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
                    dataKey="value"
                    stroke={color}
                    strokeWidth={2}
                    fill="none"
                    dot={false}
                    activeDot={{ r: 8 }}
                  />
                  <Area 
                    type="monotone"
                    dataKey="comparison"
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
                <div className="w-2.5 h-2.5 rounded-full mr-2" style={{ backgroundColor: color }}></div>
                <span className="text-xs text-gray-400">{getDisplayTimeframe(selectedTimeframe)}</span>
              </div>
              <div className="flex items-center">
                <div className="w-2.5 h-2.5 rounded-full mr-2" style={{ backgroundColor: comparisonColor }}></div>
                <span className="text-xs text-gray-400">{`${getDisplayTimeframe(selectedTimeframe)} ${comparisonType === 'Last year' ? 'STLY' : 'Budget'}`}</span>
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
              const formattedData = data.map(item => ({
                date: item.date,
                value: item.value,
                comparison: item.comparison
              }));
              setSelectedMetricCard({
                title,
                data: formattedData
              });
            }}
          >
            View Details
          </button>
        </div>
      </div>
    </Card>
  );

  // First, add these new state variables near the top of the OverviewDashboard component
  const [selectedTab, setSelectedTab] = useState<Tab>('All');
  const [selectedMetricCard, setSelectedMetricCard] = useState<MetricCard | null>(null);

  // Add the new CustomDialog for metrics near the end of the component, alongside the existing dialogs
  return (
    <div className="flex-1 overflow-auto">
      <div className="p-8">

        {/* Header */}
        <div className="flex flex-col mb-6">
          <div className="flex justify-between items-center">  
            <div className="flex items-center">
              <h2 className="text-3xl font-bold text-gray-800">Market Segments</h2>
            </div>
            <div className="flex space-x-4 items-center">
              <Button 
                variant="ghost" 
                onClick={handleExportToExcel}
                className="flex items-center space-x-2 text-blue-600"
              >
                <DownloadIcon className="h-4 w-4" />
                <span>Export to Excel</span>
              </Button>
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
                
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline">
                    {selectedTimeframe.includes('-') ? selectedTimeframe : `${selectedTimeframe}`} <ChevronDownIcon className="ml-2 h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent ref={dropdownRef} className={`p-0 ${isCalendarVisible ? 'w-[500px]' : 'w-[250px]'}`}>
                  <div className="flex">
                    <div className="w-full border-r pl-2 pt-2 pb-2">
                      {timeframeOptions.map((group) => (
                        <div key={group.label}>
                          <div className="px-2 py-1.5 text-sm font-medium text-gray-900 border-gray-200">
                            {group.label}
                          </div>
                          {group.type === 'dropdown' && group.options?.map((option) => (
                            <DropdownMenuItem
                              key={`${group.label}-${option.value}`}
                              onSelect={() => {
                                handleTimeframeSelect(option.value);
                                setIsCalendarVisible(false);
                              }}
                              className="pl-4"
                            >
                              <span className='text-sm text-gray-500'>{option.label}</span>
                            </DropdownMenuItem>
                          ))}
                          {group.type === 'calendar' && (
                            <DropdownMenuItem
                              onSelect={(e) => {
                                e.preventDefault();
                                group.onClick && group.onClick();
                              }}
                              className="pl-4 flex items-center"
                            >
                              <CalendarIcon className="mr-2 h-4 w-4 text-gray-500" />
                              <span className='text-sm text-gray-500'>Choose dates</span>
                            </DropdownMenuItem>
                          )}
                        </div>
                      ))}
                    </div>
                    {isCalendarVisible && (
                      <div className="w-[250px] p-2">
                        <Calendar
                          mode="range"
                          selected={tempDateRange}
                          onSelect={handleDateRangeSelect}
                          numberOfMonths={1}
                          className="w-full"
                        />
                        <div className="flex justify-between mt-2">
                          <button onClick={hideCalendar} className="text-sm text-black bg-gray-100 border border-gray-300 px-3 py-1 rounded">Hide</button>
                          <button onClick={applyDateRange} className="text-sm text-white bg-black px-3 py-1 rounded">Apply</button>
                        </div>
                      </div>
                    )}
                  </div>
                </DropdownMenuContent>
              </DropdownMenu>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline">
                    Compare with: {comparisonType} <ChevronDownIcon className="ml-2 h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  <DropdownMenuItem onSelect={() => setComparisonType('Last year')}>
                    Last year
                  </DropdownMenuItem>
                  <DropdownMenuItem onSelect={() => setComparisonType('Budget')}>
                    Budget
                  </DropdownMenuItem>
                  <DropdownMenuItem onSelect={() => setComparisonType('No comparison')}>
                    No comparison
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
          
          {/* Add the tabs */}
          <div className="flex space-x-8 mt-6 border-b">
            {(['All', 'Personal', 'Business', 'Corporate', 'Government', 'Other'] as Tab[]).map((tab) => (
              <button
                key={tab}
                onClick={() => setSelectedTab(tab)}
                className={cn(
                  "pb-4 text-sm font-medium transition-colors relative",
                  selectedTab === tab
                    ? "text-blue-600 border-b-2 border-blue-600"
                    : "text-gray-500 hover:text-gray-900"
                )}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>
                  
        {/* Numerical Cards Grid */}
        {selectedTab !== 'All' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
            {numericalData.map((item) => (
              <motion.div
                key={item.title}
                whileHover={{ scale: 1.05, boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)" }}
                onClick={() => handleCardClick(item.title)}
                className="cursor-pointer"
              >
                <Card className="bg-white shadow-lg rounded-lg overflow-hidden relative border border-gray-300">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 bg-gray-0 py-3 pt-4">
                    <div className="flex items-center mt-1">
                      <CardTitle className="text-sm font-medium text-gray-600">
                        {item.title}  
                      </CardTitle>
                    </div>
                    <ArrowRightIcon className="h-4 w-4 text-gray-400" />
                  </CardHeader>
                  <CardContent className="py-6">
                    <div className="flex items-center justify-between">
                      <div className="text-xl font-bold text-gray-800">{item.value}</div>
                      <div className={`flex items-center text-sm font-medium ${
                        comparisonType === 'No comparison' 
                          ? 'text-gray-400'
                          : item.change >= 0 
                            ? 'text-green-600' 
                            : 'text-red-600'
                      }`}>
                        {comparisonType === 'No comparison' 
                          ? '-'
                          : `${item.change >= 0 ? '↑' : '↓'} ${Math.abs(item.change)}%`
                        }
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        )}

        {/* Graph Displays */}
        <div className="grid grid-cols-1 gap-8">
          {selectedTab === 'All' ? (
            <BookingChannelsTable data={marketSegmentTableData} comparisonType={comparisonType} />
          ) : (
            renderChart(marketSegments, "Market Segments", "marketSegments")
          )}
        </div>

        {/* Line Charts */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-8">
          {renderAreaChart(
            generateLineChartComparisonData(avgLengthOfStayData), 
            "Average Length of Stay", 
            "value", 
            "comparison",
            "#60a5fa", 
            "#82ca9d", 
            false
          )}
          {renderAreaChart(
            generateLineChartComparisonData(leadTimeData), 
            "Lead Time", 
            "value", 
            "comparison",
            "#60a5fa", 
            "#82ca9d", 
            false
          )}
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
