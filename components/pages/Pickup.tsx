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
  ChevronLeftIcon,
  ChevronRightIcon,
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
import { HotelSelector } from '../new/HotelSelector'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"

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
type Tab = 'All' | 'Direct' | 'OTA' | 'Travel Agent' | 'Corporate';

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
          <span className="text-gray-900">{formatValue(currentValue, type)}</span>
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
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-0">
            <tr >
              <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Channel</th>
              <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Rooms</th>
              <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total Revenue</th>
              <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Room Revenue</th>
              <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">F&B Revenue</th>
              <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ADR</th>
              <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Occupancy</th>
              <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Cancellations</th>
              <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Avg Length of Stay</th>
              <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Lead Time</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {data.map((row, index) => (
              <tr key={index} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{row.channel}</td>
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

// Add this near the top with other type definitions
type ViewType = 'month' | 'year';

// Add new type for metric selection
type MetricType = 'soldRooms' | 'revenue' | 'adr';

// Add new interface for pickup data with multiple metrics
interface PickupMetrics {
  soldRooms: number | null;
  revenue: number | null;
  adr: number | null;
}

interface MonthlyPickupData {
  bookingDate: string;
  pickupData: {
    [stayDate: string]: PickupMetrics;
  };
}

interface YearlyPickupData {
  bookingMonth: string;
  bookingDate: string;
  pickupData: {
    [stayMonth: string]: PickupMetrics;
  };
}

// Add color coding helper function
const getChangeColor = (currentValue: number | null, previousValue: number | null): string => {
  if (currentValue === null || previousValue === null || previousValue === 0) return '';
  
  const percentageChange = ((currentValue - previousValue) / previousValue) * 100;
  
  // Positive changes
  if (percentageChange > 0) {
    if (percentageChange <= 10) return 'bg-green-50';
    if (percentageChange <= 20) return 'bg-green-100';
    return 'bg-green-200';
  }
  
  // Negative changes
  const absoluteChange = Math.abs(percentageChange);
  if (absoluteChange <= 10) return 'bg-yellow-50';
  if (absoluteChange <= 20) return 'bg-orange-100';
  return 'bg-red-100';
};

// Add this helper function near the other helpers
const calculateRowSum = (rowData: { [key: string]: PickupMetrics }, metric: MetricType): number => {
  return Object.values(rowData).reduce((sum, metrics) => {
    if (metrics && metrics[metric] !== null) {
      return sum + (metrics[metric] as number);
    }
    return sum;
  }, 0);
};

// Update the MonthlyPickupTable component's return statement
const MonthlyPickupTable = ({ 
  selectedMetric, 
  selectedDate,
  onCellClick 
}: { 
  selectedMetric: MetricType; 
  selectedDate: Date;
  onCellClick: (date: string, month: string) => void;
}) => {
  const monthDates = generateMonthDates(selectedDate);
  const today = new Date();

  // Sample data - replace with actual data
  const pickupData: MonthlyPickupData[] = monthDates.map(date => ({
    bookingDate: date,
    pickupData: monthDates.reduce((acc, stayDate) => {
      const bookingDay = new Date(date);
      const stayDay = new Date(stayDate);
      
      if (bookingDay > stayDay || bookingDay > today) {
        acc[stayDate] = {
          soldRooms: null,
          revenue: null,
          adr: null
        };
      } else {
        // Generate random data for demonstration
        const rooms = Math.floor(Math.random() * 10);
        const rev = rooms * (Math.random() * 200 + 100);
        acc[stayDate] = {
          soldRooms: rooms,
          revenue: Math.round(rev),
          adr: rooms > 0 ? Math.round(rev / rooms) : null
        };
      }
      return acc;
    }, {} as { [key: string]: PickupMetrics })
  }));

  const formatValue = (metrics: PickupMetrics) => {
    if (metrics[selectedMetric] === null) return '-';
    switch (selectedMetric) {
      case 'soldRooms':
        return metrics.soldRooms;
      case 'revenue':
        return `€${metrics.revenue?.toLocaleString()}`;
      case 'adr':
        return metrics.adr ? `€${metrics.adr.toLocaleString()}` : '-';
    }
  };

  const getCellValue = (metrics: PickupMetrics) => {
    if (metrics[selectedMetric] === null) return null;
    return metrics[selectedMetric];
  };

  return (
    <div className="overflow-x-auto border border-gray-200 rounded-lg relative max-h-[calc(100vh-180px)]">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50 sticky top-0 z-20">
          <tr>
            <th className="sticky left-0 top-0 z-30 bg-gray-50 px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-r border-b">
              Booking Date
            </th>
            {monthDates.map(date => (
              <th key={date} className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b">
                {format(new Date(date), 'd MMM')}
              </th>
            ))}
            <th className="sticky right-0 top-0 z-30 bg-gray-50 px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-l border-b">
              SUM
            </th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {pickupData.map((row, rowIndex) => {
            const rowSum = calculateRowSum(row.pickupData, selectedMetric);
            
            return (
              <tr key={row.bookingDate}>
                <td className="sticky left-0 z-10 bg-white px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 border-r">
                  {format(new Date(row.bookingDate), 'd MMM')}
                </td>
                {monthDates.map(date => {
                  const currentValue = getCellValue(row.pickupData[date]);
                  const previousValue = rowIndex > 0 ? getCellValue(pickupData[rowIndex - 1].pickupData[date]) : null;
                  const colorClass = getChangeColor(currentValue, previousValue);
                  
                  return (
                    <td 
                      key={date} 
                      className={`px-6 py-4 whitespace-nowrap text-sm text-gray-500 transition-colors ${colorClass} cursor-pointer hover:bg-gray-100`}
                      onClick={() => onCellClick(format(new Date(date), 'dd MMM yyyy'), format(new Date(date), 'MMM yyyy'))}
                    >
                      {formatValue(row.pickupData[date])}
                    </td>
                  );
                })}
                <td className="sticky right-0 z-10 bg-white px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 borde border-gray-200">
                  {selectedMetric === 'revenue' ? `€${rowSum.toLocaleString()}` : 
                   selectedMetric === 'adr' ? `€${Math.round(rowSum).toLocaleString()}` :
                   rowSum.toLocaleString()}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};

// Update the YearlyPickupTable component's return statement similarly
const YearlyPickupTable = ({ 
  selectedMetric, 
  selectedDate,
  onCellClick 
}: { 
  selectedMetric: MetricType; 
  selectedDate: Date;
  onCellClick: (date: string, month: string) => void;
}) => {
  // Instead of using generateDaysFromMonthStart, use generateMonthDates to get all dates
  const monthDates = generateMonthDates(selectedDate);
  const yearMonths = generateYearMonths(selectedDate);
  const today = new Date();

  // Sample data - replace with actual data
  const pickupData: YearlyPickupData[] = monthDates.map(date => ({
    bookingMonth: format(new Date(date), 'MMM yyyy'),
    bookingDate: date,
    pickupData: yearMonths.reduce((acc, stayMonth) => {
      const bookingDay = new Date(date);
      const stayDay = new Date(stayMonth);
      
      if (bookingDay > stayDay || bookingDay > today) {
        acc[stayMonth] = {
          soldRooms: null,
          revenue: null,
          adr: null
        };
      } else {
        // Generate random data for demonstration
        const rooms = Math.floor(Math.random() * 10);
        const rev = rooms * (Math.random() * 200 + 100);
        acc[stayMonth] = {
          soldRooms: rooms,
          revenue: Math.round(rev),
          adr: rooms > 0 ? Math.round(rev / rooms) : null
        };
      }
      return acc;
    }, {} as { [key: string]: PickupMetrics })
  }));

  const formatValue = (metrics: PickupMetrics | undefined) => {
    if (!metrics || metrics[selectedMetric] === null) return '-';
    switch (selectedMetric) {
      case 'soldRooms':
        return metrics.soldRooms;
      case 'revenue':
        return `€${metrics.revenue?.toLocaleString()}`;
      case 'adr':
        return metrics.adr ? `€${metrics.adr.toLocaleString()}` : '-';
    }
  };

  const getCellValue = (metrics: PickupMetrics | undefined) => {
    if (!metrics || metrics[selectedMetric] === null) return null;
    return metrics[selectedMetric];
  };

  return (
    <div className="overflow-x-auto border border-gray-200 rounded-lg relative max-h-[calc(100vh-180px)]">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50 sticky top-0 z-20">
          <tr>
            <th className="sticky left-0 top-0 z-30 bg-gray-50 px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-r border-b">
              Booking Date
            </th>
            {yearMonths.map(month => (
              <th key={month} className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b">
                {month}
              </th>
            ))}
            <th className="sticky right-0 top-0 z-30 bg-gray-50 px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-l border-b">
              SUM
            </th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {pickupData.map((row, rowIndex) => {
            const rowSum = calculateRowSum(row.pickupData, selectedMetric);
            
            return (
              <tr key={row.bookingDate}>
                <td className="sticky left-0 z-10 bg-white px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 border-r">
                  {format(new Date(row.bookingDate), 'd MMM')}
                </td>
                {yearMonths.map(month => {
                  const currentValue = getCellValue(row.pickupData[month]);
                  const previousValue = rowIndex > 0 ? getCellValue(pickupData[rowIndex - 1].pickupData[month]) : null;
                  const colorClass = getChangeColor(currentValue, previousValue);

                  return (
                    <td 
                      key={month} 
                      className={`px-6 py-4 whitespace-nowrap text-sm text-gray-500 transition-colors ${colorClass} cursor-pointer hover:bg-gray-100`}
                      onClick={() => onCellClick(format(new Date(row.bookingDate), 'dd MMM yyyy'), month)}
                    >
                      {formatValue(row.pickupData[month])}
                    </td>
                  );
                })}
                <td className="sticky right-0 z-10 bg-white px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 border-l">
                  {selectedMetric === 'revenue' ? `€${rowSum.toLocaleString()}` : 
                   selectedMetric === 'adr' ? `€${Math.round(rowSum).toLocaleString()}` :
                   rowSum.toLocaleString()}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};

export function PickupDashboard() {
  const [selectedMetric, setSelectedMetric] = useState<MetricType>('soldRooms');
  const [selectedView, setSelectedView] = useState<ViewType>('month');
  const [selectedHotels, setSelectedHotels] = useState<string[]>(["Hotel 1"]);
  const [selectedDate] = useState(new Date());
  const allHotels = ["Hotel 1", "Hotel 2", "Hotel 3"];
  const [showStatsModal, setShowStatsModal] = useState(false);
  const [selectedCell, setSelectedCell] = useState<{date: string, month: string} | null>(null);

  // Hardcoded statistics data for the modal
  const statsData = {
    roomsSold: 24,
    revenue: 3850,
    adr: 160,
    occupancy: 86,
    roomsCancelled: 3,
    revenueLost: 474,
    roomsAvailable: 32,
    revPAR: 43,
    // Variance data
    roomsSoldVariance: 8,
    revenueVariance: -13,
    adrVariance: 14,
    occupancyVariance: -10,
    roomsCancelledVariance: 0,
    revenueLostVariance: 16,
    roomsAvailableVariance: -6,
    revPARVariance: -8
  };

  const handleCellClick = (date: string, month: string) => {
    setSelectedCell({date, month});
    setShowStatsModal(true);
  };

  const toggleAllHotels = () => {
    setSelectedHotels(prev => 
      prev.length === allHotels.length ? [] : [...allHotels]
    );
  };

  const toggleHotel = (hotel: string) => {
    setSelectedHotels(prev => 
      prev.includes(hotel) 
        ? prev.filter(h => h !== hotel) 
        : [...prev, hotel]
    );
  };

  // Function to close the modal
  const closeStatsModal = () => {
    setShowStatsModal(false);
  };

  return (
    <div className="flex-1 overflow-auto">
      <div className="p-8">
        <div className="flex flex-col mb-6">
          <div className="flex justify-between items-center">  
            <div className="flex items-center">
              <h2 className="text-3xl font-bold text-gray-800">Pickup</h2>
            </div>
            <div className="flex space-x-4 items-center">
              {/* New style dropdown for view selection */}
              <div className="flex flex-col">
                <span className="text-xs text-gray-500 mb-2">View type</span>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button 
                      variant="ghost" 
                      className="bg-[#f2f8ff] hover:bg-[#f2f8ff] text-[#342630] rounded-full px-4"
                    >
                      {selectedView === 'month' ? 'Month View' : 'Year View'} <ChevronDownIcon className="ml-2 h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent>
                    <DropdownMenuItem onSelect={() => setSelectedView('month')}>
                      Month View
                    </DropdownMenuItem>
                    <DropdownMenuItem onSelect={() => setSelectedView('year')}>
                      Year View
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

              {/* New style dropdown for metric selection */}
              <div className="flex flex-col">
                <span className="text-xs text-gray-500 mb-2">Metric</span>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button 
                      variant="ghost" 
                      className="bg-[#f2f8ff] hover:bg-[#f2f8ff] text-[#342630] rounded-full px-4"
                    >
                      {selectedMetric === 'soldRooms' ? 'Sold Rooms' : 
                       selectedMetric === 'revenue' ? 'Revenue' : 'ADR'} <ChevronDownIcon className="ml-2 h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent>
                    <DropdownMenuItem onSelect={() => setSelectedMetric('soldRooms')}>
                      Sold Rooms
                    </DropdownMenuItem>
                    <DropdownMenuItem onSelect={() => setSelectedMetric('revenue')}>
                      Revenue
                    </DropdownMenuItem>
                    <DropdownMenuItem onSelect={() => setSelectedMetric('adr')}>
                      ADR
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

              {/* Advanced Hotel Selector from Overview page */}
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

        <div className="mt-6">
          {selectedView === 'month' ? (
            <MonthlyPickupTable 
              selectedMetric={selectedMetric} 
              selectedDate={selectedDate} 
              onCellClick={handleCellClick}
            />
          ) : (
            <YearlyPickupTable 
              selectedMetric={selectedMetric} 
              selectedDate={selectedDate} 
              onCellClick={handleCellClick}
            />
          )}
        </div>
      </div>

      {/* Updated Dialog component with hardcoded data */}
      <Dialog open={showStatsModal} onOpenChange={setShowStatsModal}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold">
              Statistics for {selectedCell?.date}
            </DialogTitle>
            <DialogDescription className="text-base text-gray-500 text-sm pt-2">
              Business date: {format(new Date(), 'dd MMM yyyy')}
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid grid-cols-4 gap-4 mt-6">
            {/* Rooms Sold */}
            <div className="rounded-lg border border-gray-100 p-5 flex flex-col items-center text-center">
              <div className="text-sm text-gray-500 font-medium">Rooms Sold</div>
              <div className="text-3xl font-bold mt-4 mb-8">{statsData.roomsSold}</div>
              <div className="text-sm text-gray-500">Variance LY</div>
              <div className={`text-md font-medium ${statsData.roomsSoldVariance >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                {statsData.roomsSoldVariance >= 0 ? '+' : ''}{statsData.roomsSoldVariance}%
              </div>
            </div>
            
            {/* Revenue */}
            <div className="rounded-lg border border-gray-100 p-5 flex flex-col items-center text-center">
              <div className="text-sm text-gray-500 font-medium">Revenue</div>
              <div className="text-3xl font-bold mt-4 mb-8">€{statsData.revenue}</div>
              <div className="text-sm text-gray-500">Variance LY</div>
              <div className={`text-md font-medium ${statsData.revenueVariance >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                {statsData.revenueVariance >= 0 ? '+' : ''}{statsData.revenueVariance}%
              </div>
            </div>
            
            {/* ADR */}
            <div className="rounded-lg border border-gray-100 p-5 flex flex-col items-center text-center">
              <div className="text-sm text-gray-500 font-medium">ADR</div>
              <div className="text-3xl font-bold mt-4 mb-8">€{statsData.adr}</div>
              <div className="text-sm text-gray-500">Variance LY</div>
              <div className={`text-md font-medium ${statsData.adrVariance >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                {statsData.adrVariance >= 0 ? '+' : ''}{statsData.adrVariance}%
              </div>
            </div>
            
            {/* Occupancy */}
            <div className="rounded-lg border border-gray-100 p-5 flex flex-col items-center text-center">
              <div className="text-sm text-gray-500 font-medium">Occupancy</div>
              <div className="text-3xl font-bold mt-4 mb-8">{statsData.occupancy}%</div>
              <div className="text-sm text-gray-500">Variance LY</div>
              <div className={`text-md font-medium ${statsData.occupancyVariance >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                {statsData.occupancyVariance >= 0 ? '+' : ''}{statsData.occupancyVariance}%
              </div>
            </div>
            
            {/* Rooms Cancelled */}
            <div className="rounded-lg border border-gray-100 p-5 flex flex-col items-center text-center">
              <div className="text-sm text-gray-500 font-medium">Rooms Cancelled</div>
              <div className="text-3xl font-bold mt-4 mb-8">{statsData.roomsCancelled}</div>
              <div className="text-sm text-gray-500">Variance LY</div>
              <div className={`text-md font-medium ${statsData.roomsCancelledVariance >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                {statsData.roomsCancelledVariance >= 0 ? '+' : ''}{statsData.roomsCancelledVariance}%
              </div>
            </div>
            
            {/* Revenue Lost */}
            <div className="rounded-lg border border-gray-100 p-5 flex flex-col items-center text-center">
              <div className="text-sm text-gray-500 font-medium">Revenue Lost</div>
              <div className="text-3xl font-bold mt-4 mb-8">€{statsData.revenueLost}</div>
              <div className="text-sm text-gray-500">Variance LY</div>
              <div className={`text-md font-medium ${statsData.revenueLostVariance >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                {statsData.revenueLostVariance >= 0 ? '+' : ''}{statsData.revenueLostVariance}%
              </div>
            </div>
            
            {/* Rooms Available */}
            <div className="rounded-lg border border-gray-100 p-5 flex flex-col items-center text-center">
              <div className="text-sm text-gray-500 font-medium">Rooms Available</div>
              <div className="text-3xl font-bold mt-4 mb-8">{statsData.roomsAvailable}</div>
              <div className="text-sm text-gray-500">Variance LY</div>
              <div className={`text-md font-medium ${statsData.roomsAvailableVariance >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                {statsData.roomsAvailableVariance >= 0 ? '+' : ''}{statsData.roomsAvailableVariance}%
              </div>
            </div>
            
            {/* RevPAR */}
            <div className="rounded-lg border border-gray-100 p-5 flex flex-col items-center text-center">
              <div className="text-sm text-gray-500 font-medium">RevPAR</div>
              <div className="text-3xl font-bold mt-4 mb-8">€{statsData.revPAR}</div>
              <div className="text-sm text-gray-500">Variance LY</div>
              <div className={`text-md font-medium ${statsData.revPARVariance >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                {statsData.revPARVariance >= 0 ? '+' : ''}{statsData.revPARVariance}%
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Helper function to generate dates for the current month
const generateMonthDates = (selectedDate: Date) => {
  const year = selectedDate.getFullYear();
  const month = selectedDate.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  
  return Array.from({ length: daysInMonth }, (_, i) => {
    return format(new Date(year, month, i + 1), 'yyyy-MM-dd');
  });
};

// Helper function to generate months for the year
const generateYearMonths = (selectedDate: Date) => {
  const year = selectedDate.getFullYear();
  const currentMonth = selectedDate.getMonth();
  const months = [];
  
  // Only generate months from current month to end of year
  for (let i = currentMonth; i < 12; i++) {
    months.push(format(new Date(year, i, 1), 'MMM yyyy'));
  }
  return months;
};
