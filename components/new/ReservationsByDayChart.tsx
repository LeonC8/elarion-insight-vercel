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
import { useInView } from "@/hooks/useInView"

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
  lazyLoad?: boolean
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

// Helper function for formatting percentage change in tables
const formatPercentageChange = (current: number, previous: number): string => {
  if (!isFinite(current) || !isFinite(previous)) return '-'; // Handle non-finite numbers
  if (previous === 0 && current === 0) return '-';
  if (previous === 0) return '+100.0%'; // Current > 0
  if (current === 0) return '-100.0%'; // Previous > 0

  const change = ((current - previous) / previous) * 100;
  // Clamp change to avoid extreme values like Infinity/-Infinity if previous is extremely small
  const clampedChange = Math.max(-1000, Math.min(1000, change));
  return `${clampedChange > 0 ? '+' : ''}${clampedChange.toFixed(1)}%`;
};

export function ReservationsByDayChart({
  data: dataProp,
  url,
  apiParams,
  color = 'green',
  categories,
  lazyLoad = false,
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
  const [loading, setLoading] = useState(false) // Initialize as false
  const [error, setError] = useState<string | null>(null)
  // Track the stringified params of the last successful fetch
  const [fetchedParams, setFetchedParams] = useState<string | null>(null);

  // Use the Intersection Observer hook
  const { ref, isInView } = useInView<HTMLDivElement>({
    threshold: 0.1,
    triggerOnce: true
  });

  // Effect to fetch data if URL is provided
  useEffect(() => {
    const currentParamsString = JSON.stringify(apiParams);

    // Conditions to *not* fetch:
    // 1. No url provided
    // 2. Lazy loading is enabled AND the component is not in view
    if (!url || (lazyLoad && !isInView)) {
      return;
    }

    // Condition to fetch:
    // - The component is in view (or lazyLoad is false) AND
    // - EITHER no fetch has happened yet (fetchedParams is null) OR
    // - The apiParams have changed since the last successful fetch
    const shouldFetch = (isInView || !lazyLoad) && (fetchedParams === null || fetchedParams !== currentParamsString);

    if (!shouldFetch) {
      return; // Don't fetch if params haven't changed and we've already fetched them
    }

    const fetchData = async () => {
      setLoading(true);
      setError(null);
      // Don't reset internalData here

      try {
        const fetchUrl = new URL(url, window.location.origin);
        if (apiParams) {
          Object.entries(apiParams).forEach(([key, value]) => {
            if (value !== undefined) { // Filter out undefined
              fetchUrl.searchParams.append(key, String(value));
            }
          });
        }

        const response = await fetch(fetchUrl.toString());
        if (!response.ok) {
           let errorBody = null;
           try { errorBody = await response.json(); } catch (e) { /* Ignore */ }
           const errorMessage = errorBody?.error || `Failed to fetch reservation trends: ${response.status} ${response.statusText}`;
           throw new Error(errorMessage);
        }
        const apiResponse: ReservationTrendsApiResponse = await response.json();

        // Transform API response to the component's expected format
        // Add more robust checking for missing data
        const transformedData = apiResponse.occupancyByDayOfWeek?.map((occupancyItem, index) => {
           const bookingItem = apiResponse.bookingsByDayOfWeek?.[index];
           // Ensure both items exist and days match (or use index if days aren't reliable)
           if (!bookingItem || bookingItem.day !== occupancyItem.day) {
             console.warn(`Data mismatch or missing for day: ${occupancyItem.day} at index ${index}`);
             // Provide default values if data is incomplete
             return {
               dayOfWeek: occupancyItem.day || `Day ${index + 1}`, // Fallback day name
               bookingsCreated: bookingItem?.current ?? 0,
               prevBookingsCreated: bookingItem?.previous ?? 0,
               staysStarting: occupancyItem.current ?? 0,
               prevStaysStarting: occupancyItem.previous ?? 0
             };
           }
           return {
             dayOfWeek: occupancyItem.day,
             bookingsCreated: bookingItem.current ?? 0, // Use nullish coalescing for safety
             prevBookingsCreated: bookingItem.previous ?? 0,
             staysStarting: occupancyItem.current ?? 0,
             prevStaysStarting: occupancyItem.previous ?? 0
           };
         }) ?? []; // Default to empty array if occupancyByDayOfWeek is missing


        setInternalData(transformedData);
        setFetchedParams(currentParamsString); // Store successful fetch params

      } catch (err) {
        console.error('Error fetching data in ReservationsByDayChart:', err);
        setError(err instanceof Error ? err.message : 'An unknown error occurred');
        setInternalData(null); // Clear data on error
        // Keep fetchedParams as is
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  // Dependencies: Run when url, params, lazyLoad status, or visibility changes.
  }, [url, JSON.stringify(apiParams), lazyLoad, isInView]);

  // Determine which data source to use
  const data = url ? internalData : dataProp;
  // Determine if the skeleton should be shown
  const showSkeleton = loading || (url && lazyLoad && !fetchedParams && !error);

  // Get the appropriate data keys based on date type
  const currentKey = dateType === 'book' ? 'bookingsCreated' : 'staysStarting'
  const previousKey = dateType === 'book' ? 'prevBookingsCreated' : 'prevStaysStarting'

  // Transform data for the selected date type, handle loading/null state
  // Data is ready if not showing skeleton and no error
  const dataReady = !showSkeleton && !error;
  const chartData = (dataReady && data)
    ? data.map(item => ({
        dayOfWeek: item.dayOfWeek,
        current: item[currentKey],
        previous: item[previousKey],
      }))
    : []; // Default to empty array if not ready or data is null/undefined

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
      <Card ref={ref} className="border-gray-300">
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
          {/* Show Skeleton */}
          {showSkeleton && (
            <div className="h-[300px] w-full flex flex-col space-y-4 p-4">
              <Skeleton className="h-6 w-3/4" />
              <Skeleton className="h-6 w-1/2" />
              <Skeleton className="h-6 w-5/6" />
              <Skeleton className="h-6 w-2/3" />
              <Skeleton className="h-6 w-3/4" />
              <Skeleton className="h-6 w-1/2" />
              <div className="flex justify-end pt-4 border-t border-transparent mt-auto">
                 <Skeleton className="h-9 w-24" />
              </div>
            </div>
          )}

          {/* Show Error */}
          {error && !showSkeleton && (
             <div className="h-[300px] flex items-center justify-center text-red-500">
                Error loading data: {error}
             </div>
          )}

          {/* Show Chart and Data */}
          {/* Condition: Not skeleton, no error, AND (using API and fetch complete OR not using API) */}
          {!showSkeleton && !error && (url ? fetchedParams === JSON.stringify(apiParams) : true) && (
            <>
              {/* Show "No data" message if chartData is empty */}
              {chartData.length === 0 ? (
                 <div className="h-[300px] flex items-center justify-center text-gray-500">
                    No data available for the selected criteria.
                 </div>
              ) : (
                 // Render the chart only if there is data
                 <ChartContainer config={chartConfig} className="min-h-[341px] w-full">
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
              )}

              {/* Legend - Render even if chartData is empty initially */}
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

              {/* View Details Button - Show only if data is ready and not empty */}
              {dataReady && data && data.length > 0 && (
                <div className="mt-8 pt-4 border-t border-gray-200">
                  <div className="flex justify-end">
                    <Button
                      variant="ghost"
                      className="text-blue-600 hover:text-blue-800 font-medium text-sm flex items-center gap-2"
                      onClick={() => setFullScreenTable(true)}
                      disabled={loading} // Disable if actively loading new data
                    >
                      View Details
                      <ArrowRight className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              )}
              {/* Placeholder for button area when data is empty or not ready */}
              {(!dataReady || !data || data.length === 0) && (
                 <div className="mt-8 pt-4 border-t border-transparent">
                   <div className="flex justify-end">
                     <div className="h-9 w-24"></div> {/* Maintain height */}
                   </div>
                 </div>
              )}
            </>
          )}
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
                      <TableCell className={`w-[25%] text-left ${
                        // Updated color logic to match formatting rules
                        (row.current > row.previous || (row.previous === 0 && row.current > 0))
                          ? "text-emerald-500"
                          : (row.current < row.previous || (row.current === 0 && row.previous > 0))
                          ? "text-red-500"
                          : "text-gray-700" // Style for '-' case
                      }`}>
                        {/* Use the helper function */}
                        {formatPercentageChange(row.current, row.previous)}
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