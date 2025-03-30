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



interface NumericalDataItem {
  title: string;
  value: string | number;
  change: number;
  comparisonValue?: string | number;
  icon: React.ElementType;
}


interface ChartData {
  date: string;
  cancellations?: number;
  revenueLost?: number;
  noShows?: number;
  comparisonCancellations?: number;
  comparisonRevenueLost?: number;
  comparisonNoShows?: number;
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
  // Handle cases where previous value was null or 0 and current value is positive
  if (currentValue !== null && currentValue > 0) {
    if (previousValue === null || previousValue === 0) {
      return 'bg-green-50'; // Highlight as green if pickup appears from nothing or zero
    }
  }

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

// Update the MonthlyPickupTable component to fetch data from the API
const MonthlyPickupTable = ({
  selectedMetric,
  selectedDate,
  businessDate,
  onCellClick
}: {
  selectedMetric: MetricType;
  selectedDate: Date;
  businessDate: Date;
  onCellClick: (bookingDate: string, occupancyDate: string) => void;
}) => {
  const monthDates = generateMonthDates(selectedDate);
  const today = new Date();
  const [pickupData, setPickupData] = useState<MonthlyPickupData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const dateParam = selectedDate.toISOString().split('T')[0];
        
        const year = businessDate.getFullYear();
        const month = String(businessDate.getMonth() + 1).padStart(2, '0');
        const day = String(businessDate.getDate()).padStart(2, '0');
        const businessDateParam = `${year}-${month}-${day}`;
        
        const response = await fetch(`/api/pickup/month?date=${dateParam}&businessDate=${businessDateParam}`);
        
        if (!response.ok) {
          throw new Error('Failed to fetch pickup data');
        }
        
        const data = await response.json();
        console.log('Monthly Pickup API Response:', {
          endpoint: `/api/pickup/month?date=${dateParam}&businessDate=${businessDateParam}`,
          data: data
        });
        setPickupData(data);
      } catch (err) {
        console.error('Error fetching pickup data:', err);
        setError(err instanceof Error ? err.message : 'An unknown error occurred');
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [selectedDate, businessDate]);

  const formatValue = (metrics: PickupMetrics | undefined) => {
    if (!metrics || metrics[selectedMetric] === null || metrics[selectedMetric] === 0) return '-';
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

  if (isLoading) {
    return <div className="flex justify-center items-center h-64">Loading pickup data...</div>;
  }

  if (error) {
    return <div className="flex justify-center items-center h-64 text-red-500">Error: {error}</div>;
  }

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
                  const dateMetrics = row.pickupData[date] || {
                    soldRooms: null,
                    revenue: null,
                    adr: null
                  };
                  
                  const currentValue = getCellValue(dateMetrics);
                  const previousValue = rowIndex > 0 ? 
                    getCellValue(pickupData[rowIndex - 1]?.pickupData?.[date]) : 
                    null;
                  
                  const colorClass = getChangeColor(currentValue, previousValue);
                  
                  return (
                    <td 
                      key={date} 
                      className={`px-6 py-4 whitespace-nowrap text-sm text-gray-500 transition-colors ${colorClass} cursor-pointer hover:bg-gray-100`}
                      onClick={() => onCellClick(
                        format(new Date(row.bookingDate), 'dd MMM yyyy'),
                        format(new Date(date), 'dd MMM yyyy')
                      )}
                    >
                      {formatValue(dateMetrics)}
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

// Update the YearlyPickupTable component to fetch data from the API
const YearlyPickupTable = ({
  selectedMetric,
  selectedDate,
  businessDate,
  onCellClick
}: {
  selectedMetric: MetricType;
  selectedDate: Date;
  businessDate: Date;
  onCellClick: (bookingDate: string, occupancyMonth: string) => void;
}) => {
  // Get year months
  const yearMonths = generateYearMonths(selectedDate);
  const [pickupData, setPickupData] = useState<YearlyPickupData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const dateParam = selectedDate.toISOString().split('T')[0];
        
        const year = businessDate.getFullYear();
        const month = String(businessDate.getMonth() + 1).padStart(2, '0');
        const day = String(businessDate.getDate()).padStart(2, '0');
        const businessDateParam = `${year}-${month}-${day}`;
        
        const response = await fetch(`/api/pickup/year?date=${dateParam}&businessDate=${businessDateParam}`);
        
        if (!response.ok) {
          throw new Error('Failed to fetch yearly pickup data');
        }
        
        const data = await response.json();
        console.log('Yearly Pickup API Response:', {
          endpoint: `/api/pickup/year?date=${dateParam}&businessDate=${businessDateParam}`,
          data: data
        });
        setPickupData(data);
      } catch (err) {
        console.error('Error fetching yearly pickup data:', err);
        setError(err instanceof Error ? err.message : 'An unknown error occurred');
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [selectedDate, businessDate]);

  const formatValue = (metrics: PickupMetrics | undefined) => {
    if (!metrics || metrics[selectedMetric] === null || metrics[selectedMetric] === 0) return '-';
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

  if (isLoading) {
    return <div className="flex justify-center items-center h-64">Loading yearly pickup data...</div>;
  }

  if (error) {
    return <div className="flex justify-center items-center h-64 text-red-500">Error: {error}</div>;
  }

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
                  const dateMetrics = row.pickupData[month] || {
                    soldRooms: null,
                    revenue: null,
                    adr: null
                  };
                  
                  const currentValue = getCellValue(dateMetrics);
                  const previousValue = rowIndex > 0 ? 
                    getCellValue(pickupData[rowIndex - 1]?.pickupData?.[month]) : 
                    null;
                    
                  const colorClass = getChangeColor(currentValue, previousValue);

                  return (
                    <td 
                      key={month} 
                      className={`px-6 py-4 whitespace-nowrap text-sm text-gray-500 transition-colors ${colorClass} cursor-pointer hover:bg-gray-100`}
                      onClick={() => onCellClick(
                        format(new Date(row.bookingDate), 'dd MMM yyyy'),
                        month
                      )}
                    >
                      {formatValue(dateMetrics)}
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
  const [businessDate, setBusinessDate] = useState<Date>(new Date());
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const allHotels = ["Hotel 1", "Hotel 2", "Hotel 3"];
  const [showStatsModal, setShowStatsModal] = useState(false);
  const [selectedCell, setSelectedCell] = useState<{bookingDate: string, occupancyDateOrMonth: string} | null>(null);
  const [statsData, setStatsData] = useState({
    roomsSold: 0,
    revenue: 0,
    adr: 0,
    occupancy: 0,
    roomsCancelled: 0,
    revenueLost: 0,
    roomsAvailable: 0,
    revPAR: 0,
    // Variances
    roomsSoldVariance: 0,
    revenueVariance: 0,
    adrVariance: 0,
    occupancyVariance: 0,
    roomsCancelledVariance: 0,
    revenueLostVariance: 0,
    roomsAvailableVariance: 0,
    revPARVariance: 0
  });
  const [isLoadingStats, setIsLoadingStats] = useState(false);

  const handleCellClick = async (bookingDateStr: string, occupancyDateOrMonthStr: string) => {
    setSelectedCell({ bookingDate: bookingDateStr, occupancyDateOrMonth: occupancyDateOrMonthStr });
    setShowStatsModal(true);
    setIsLoadingStats(true);
    
    // Business date for API call is still from the dropdown
    const apiBusinessDate = format(businessDate, 'yyyy-MM-dd'); 
    
    try {
      const params = new URLSearchParams({
        businessDate: apiBusinessDate, // Use business date from dropdown for validity check
        bookingDate: format(new Date(bookingDateStr), 'yyyy-MM-dd') // Use clicked booking date for validity check
      });
      
      if (selectedView === 'month') {
        // Pass the clicked occupancy date
        params.append('occupancyDate', format(new Date(occupancyDateOrMonthStr), 'yyyy-MM-dd'));
      } else {
        // Pass the clicked occupancy month string
        params.append('occupancyMonth', occupancyDateOrMonthStr); 
      }
      
      const response = await fetch(`/api/pickup/stats?${params.toString()}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch stats data');
      }
      
      const data = await response.json();
      console.log('Stats API Response:', data);
      
      // Update the stats in state instead of using hardcoded values
      setStatsData({
        roomsSold: data.roomsSold,
        revenue: data.revenue,
        adr: data.adr,
        occupancy: data.occupancy,
        roomsCancelled: data.roomsCancelled,
        revenueLost: data.revenueLost,
        roomsAvailable: data.roomsAvailable,
        revPAR: data.revPAR,
        // Variances
        roomsSoldVariance: data.roomsSoldVariance,
        revenueVariance: data.revenueVariance,
        adrVariance: data.adrVariance,
        occupancyVariance: data.occupancyVariance,
        roomsCancelledVariance: data.roomsCancelledVariance,
        revenueLostVariance: data.revenueLostVariance,
        roomsAvailableVariance: data.roomsAvailableVariance,
        revPARVariance: data.revPARVariance
      });
    } catch (error) {
      console.error('Error fetching stats data:', error);
      // You might want to show an error message to the user
    } finally {
      setIsLoadingStats(false);
    }
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
              {/* Business Date Selector */}
              <div className="flex flex-col">
                <span className="text-xs text-gray-500 mb-2">Business Date</span>
                <DropdownMenu open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
                  <DropdownMenuTrigger asChild>
                    <Button 
                      variant="ghost" 
                      className="bg-[#f2f8ff] hover:bg-[#f2f8ff] text-[#342630] rounded-full px-4"
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {format(businessDate, 'dd MMM yyyy')}
                      <ChevronDownIcon className="ml-2 h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="p-0" align="end">
                    <Calendar
                      mode="single"
                      selected={businessDate}
                      onSelect={(date) => {
                        if (date) {
                          setBusinessDate(date);
                          setIsCalendarOpen(false);
                        }
                      }}
                      initialFocus
                    />
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

              {/* View Type Dropdown */}
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
              businessDate={businessDate}
              onCellClick={handleCellClick}
            />
          ) : (
            <YearlyPickupTable 
              selectedMetric={selectedMetric} 
              selectedDate={selectedDate}
              businessDate={businessDate}
              onCellClick={handleCellClick}
            />
          )}
        </div>
      </div>

      {/* Updated Dialog component with correct conditional titles/subtitles */}
      <Dialog open={showStatsModal} onOpenChange={setShowStatsModal}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold">
              Statistics for {selectedCell?.occupancyDateOrMonth}
            </DialogTitle>
            <DialogDescription className="text-base text-gray-500 text-sm pt-2">
              Booking date: {selectedCell?.bookingDate} 
            </DialogDescription>
          </DialogHeader>
          
          {isLoadingStats ? (
            <div className="grid grid-cols-4 gap-4 mt-6">
              {/* Create skeleton loading placeholders for each stat card */}
              {Array.from({ length: 8 }).map((_, index) => (
                <div key={index} className="rounded-lg border border-gray-100 p-5 flex flex-col items-center">
                  <div className="w-24 h-4 bg-gray-200 animate-pulse rounded mb-4"></div>
                  <div className="w-16 h-8 bg-gray-200 animate-pulse rounded mt-4 mb-8"></div>
                  <div className="w-24 h-4 bg-gray-200 animate-pulse rounded"></div>
                  <div className="w-12 h-4 bg-gray-200 animate-pulse rounded mt-1"></div>
                </div>
              ))}
            </div>
          ) : (
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
          )}
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
