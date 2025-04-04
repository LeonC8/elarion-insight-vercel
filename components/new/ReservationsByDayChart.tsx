"use client"

import * as React from "react"
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart"
import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { ArrowRight } from 'lucide-react'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

interface ReservationDayData {
  dayOfWeek: string;
  bookingsCreated: number;
  prevBookingsCreated: number;
  staysStarting: number;
  prevStaysStarting: number;
}

interface ReservationTrendsApiResponse {
   bookingsByDayOfWeek: Array<{ day: string; current: number; previous: number }>;
   occupancyByDayOfWeek: Array<{ day: string; current: number; previous: number }>;
}

export interface ReservationsByDayChartProps {
  data?: ReservationDayData[]
  url?: string
  apiParams?: Record<string, string | number | boolean | undefined>
  color?: 'green' | 'blue'
  categories?: Array<{
    key: string
    label: string
  }>
}

// Updated chart configuration for current/previous period
const chartConfig = {
  current: {
    label: "Current Period",
    color: "hsl(221.2 83.2% 53.3%)",  // Blue
  },
  previous: {
    label: "Previous Period",
    color: "#93c5fd",  // Lighter Blue
  },
} satisfies ChartConfig

// Exact copy of KpiWithChart's margin calculation
const getLeftMargin = (data: Array<{ bookingsCreated: number; staysStarting: number }>) => {
  // Find the largest number in both datasets
  const maxNumber = Math.max(
    ...data.flatMap(item => [item.bookingsCreated, item.staysStarting])
  )
  
  // Convert to string and count digits
  const numLength = Math.round(maxNumber).toString().length

  // Map number length to margin values
  const marginMap: { [key: number]: number } = {
    3: 35,  // 100-999
    4: 42,  // 1,000-9,999
    5: 48,  // 10,000-99,999
    6: 56,  // 100,000-999,999
    7: 64   // 1,000,000-9,999,999
  }

  // Return the appropriate margin or default to 42 if not found
  return marginMap[numLength] || 42
}

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

function Skeleton({ className }: { className?: string }) {
  return (
    <div className={`animate-pulse rounded bg-gray-200 ${className}`} />
  )
}

export function ReservationsByDayChart({
  data: dataProp,
  url,
  apiParams,
  color = 'green',
  categories
}: ReservationsByDayChartProps) {
  const [dateType, setDateType] = useState<'book' | 'stay'>('book')
  const [activeSeries, setActiveSeries] = React.useState<string[]>([
    'current',
    'previous'
  ])
  const [fullScreenTable, setFullScreenTable] = React.useState(false)
  const [selectedCategory, setSelectedCategory] = React.useState<string>(
    categories && categories.length > 0 ? categories[0].key : ''
  )

  // Add internal state for data fetching
  const [internalData, setInternalData] = useState<ReservationDayData[] | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Effect to fetch data if URL is provided
  useEffect(() => {
    if (!url) {
      setInternalData(null); // Clear internal data if URL is removed
      return;
    }

    const fetchData = async () => {
      setLoading(true);
      setError(null);
      try {
        const fetchUrl = new URL(url, window.location.origin);
        if (apiParams) {
          Object.entries(apiParams).forEach(([key, value]) => {
            if (value !== undefined) {
              fetchUrl.searchParams.append(key, String(value));
            }
          });
        }

        const response = await fetch(fetchUrl.toString());
        if (!response.ok) {
          throw new Error(`Failed to fetch reservation trends: ${response.status} ${response.statusText}`);
        }
        const apiResponse: ReservationTrendsApiResponse = await response.json();

        // Transform API response to the component's expected format
        const transformedData = apiResponse.occupancyByDayOfWeek.map((occupancyItem, index) => {
           const bookingItem = apiResponse.bookingsByDayOfWeek[index];
           // Basic safety check: ensure items align by day or index if API guarantees order
           if (!bookingItem || bookingItem.day !== occupancyItem.day) {
             console.warn(`Data mismatch for day: ${occupancyItem.day}`);
             // Handle mismatch: return a default structure or skip
             return {
               dayOfWeek: occupancyItem.day,
               bookingsCreated: 0,
               prevBookingsCreated: 0,
               staysStarting: occupancyItem.current,
               prevStaysStarting: occupancyItem.previous
             };
           }
           return {
             dayOfWeek: occupancyItem.day,
             bookingsCreated: bookingItem.current,
             prevBookingsCreated: bookingItem.previous,
             staysStarting: occupancyItem.current,
             prevStaysStarting: occupancyItem.previous
           };
         });


        setInternalData(transformedData);

      } catch (err) {
        console.error('Error fetching data in ReservationsByDayChart:', err);
        setError(err instanceof Error ? err.message : 'An unknown error occurred');
        setInternalData(null);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [url, JSON.stringify(apiParams)]);

  // Determine which data source to use
  const data = url ? internalData : dataProp;

  // Get the appropriate data keys based on date type
  const currentKey = dateType === 'book' ? 'bookingsCreated' : 'staysStarting'
  const previousKey = dateType === 'book' ? 'prevBookingsCreated' : 'prevStaysStarting'

  // Transform data for the selected date type, handle loading/null state
  const chartData = (!loading && data)
    ? data.map(item => ({
        dayOfWeek: item.dayOfWeek,
        current: item[currentKey],
        previous: item[previousKey],
      }))
    : []; // Default to empty array if loading or data is null/undefined

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const current = payload.find((p: any) => p.dataKey === 'current');
      const previous = payload.find((p: any) => p.dataKey === 'previous');

      // Calculate percentage change
      let percentageChange = 0;
      if (previous && previous.value !== 0) {
        percentageChange = ((current.value - previous.value) / previous.value) * 100;
      } else if (current && current.value !== 0) {
        percentageChange = Infinity; // Handle division by zero or previous being zero
      }

      const changeText = percentageChange === Infinity
        ? ' (New)'
        : ` (${percentageChange >= 0 ? '+' : ''}${percentageChange.toFixed(1)}%)`;

      return (
        <div className="bg-white p-3 border border-gray-300 rounded shadow-lg text-sm">
          <p className="font-semibold mb-1">{label}</p>
          {current && (
             <p style={{ color: current.color }}>
                Current: {current.value.toLocaleString()}
                {previous && previous.value !== 0 ? changeText : ''}
             </p>
          )}
          {previous && (
             <p style={{ color: previous.color }}>Previous: {previous.value.toLocaleString()}</p>
          )}
        </div>
      );
    }
    return null;
  };

  const renderLegendText = (value: string) => {
    return <span className="text-gray-600 capitalize">{value}</span>;
  };

  return (
    <>
      <Card className="border-gray-300">
        <CardHeader>
          <div className="flex w-full justify-between items-center">
            <CardTitle className="text-lg font-semibold text-gray-800">
              Reservation trends (DOW)
            </CardTitle>
            <div className="flex space-x-2">
              {categories && categories.length > 0 && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button 
                      variant="ghost" 
                      size="sm"
                      className="bg-[#f2f8ff] hover:bg-[#f2f8ff] text-[#342630] rounded-full px-4"
                    >
                      {categories.find(c => c.key === selectedCategory)?.label || categories[0].label} <TriangleDown className="ml-2" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent>
                    {categories.map(category => (
                      <DropdownMenuItem 
                        key={category.key} 
                        onClick={() => setSelectedCategory(category.key)}
                      >
                        {category.label}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
              
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button 
                    variant="ghost" 
                    size="sm"
                    className="bg-[#f2f8ff] hover:bg-[#f2f8ff] text-[#342630] rounded-full px-4"
                  >
                    {dateType === 'book' ? 'Booking Date' : 'Stay Date'} <TriangleDown className="ml-2" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  <DropdownMenuItem onClick={() => setDateType('book')}>
                    Booking Date
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setDateType('stay')}>
                    Stay Date
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <ChartContainer config={chartConfig}>
            <BarChart
              data={chartData}
              height={300}
              margin={{
                top: 10,
                right: 10,
                bottom: 20,
                left: -20,
              }}
            >
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis
                dataKey="dayOfWeek"
                tickLine={false}
                axisLine={false}
                tickMargin={8}
              />
              <YAxis
                tickLine={false}
                axisLine={false}
                tickFormatter={(value) => `${Math.round(value).toLocaleString()}`}
                tickMargin={8}
              />
              <ChartTooltip content={<ChartTooltipContent />} />
              {activeSeries.includes('current') && (
                <Bar
                  dataKey="current"
                  fill={chartConfig.current.color}
                  radius={[4, 4, 0, 0]}
                />
              )}
              {activeSeries.includes('previous') && (
                <Bar
                  dataKey="previous"
                  fill={chartConfig.previous.color}
                  radius={[4, 4, 0, 0]}
                />
              )}
            </BarChart>
          </ChartContainer>

          {/* Clickable Legend */}
          <div className="flex justify-center gap-3 mt-6">
            {Object.entries(chartConfig).map(([key, config]) => (
              <div
                key={key}
                onClick={() => {
                  if (activeSeries.includes(key)) {
                    setActiveSeries(activeSeries.filter(item => item !== key))
                  } else {
                    setActiveSeries([...activeSeries, key])
                  }
                }}
                className={`cursor-pointer bg-[#f0f4fa] px-3 py-1.5 rounded-full border border-[#e5eaf3] flex items-center gap-2 ${
                  activeSeries.includes(key) ? '' : 'opacity-50'
                }`}
              >
                <div 
                  style={{ backgroundColor: config.color }} 
                  className="w-2 h-2 rounded-full" 
                />
                <span className="text-xs text-gray-500 font-medium">
                  {config.label}
                </span>
              </div>
            ))}
          </div>

          {/* Add View Details Button */}
          <div className="mt-3 pt-4 border-t border-gray-200">
            <div className="flex justify-end">
              <Button
                variant="ghost"
                className="text-blue-600 hover:text-blue-800 font-medium text-sm flex items-center gap-2"
                onClick={() => setFullScreenTable(true)}
              >
                View Details
                <ArrowRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Dialog open={fullScreenTable} onOpenChange={setFullScreenTable}>
        <DialogContent className="max-w-7xl min-h-fit max-h-[90vh]">
          <DialogHeader className="pb-6">
            <DialogTitle>
              Reservation trends (DOW) – {dateType === 'book' ? 'Booking date' : 'Stay date'}
            </DialogTitle>
          </DialogHeader>
          <div className="border rounded-lg bg-[#f0f4fa]/40 border-[#d0d7e3]">
            <div className="overflow-y-auto max-h-[calc(90vh-120px)]">
              <Table>
                <TableHeader>
                  <TableRow className="border-b border-[#d0d7e3] hover:bg-transparent">
                    <TableHead className="bg-[#f0f4fa]/60 first:rounded-tl-lg text-left border-r border-[#d0d7e3]">
                      Day of Week
                    </TableHead>
                    <TableHead className="bg-[#f0f4fa]/60 text-left border-r border-[#d0d7e3]">
                      Current Period
                    </TableHead>
                    <TableHead className="bg-[#f0f4fa]/60 text-left border-r border-[#d0d7e3]">
                      Previous Period
                    </TableHead>
                    <TableHead className="bg-[#f0f4fa]/60 last:rounded-tr-lg text-left">
                      Change
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {chartData.map((row, idx) => (
                    <TableRow key={idx} className="border-b border-[#d0d7e3] last:border-0">
                      <TableCell className="w-[25%] bg-[#f0f4fa]/40 border-r border-[#d0d7e3] text-left">
                        {row.dayOfWeek}
                      </TableCell>
                      <TableCell className="w-[25%] text-left border-r border-[#d0d7e3]">
                        {row.current.toLocaleString()}
                      </TableCell>
                      <TableCell className="w-[25%] text-left border-r border-[#d0d7e3]">
                        {row.previous.toLocaleString()}
                      </TableCell>
                      <TableCell className={`w-[25%] text-left ${row.current > row.previous ? "text-emerald-500" : "text-red-500"}`}>
                        {((row.current - row.previous) / row.previous * 100).toFixed(1)}%
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
} 