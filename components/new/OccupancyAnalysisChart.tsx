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
import { useState, useMemo } from "react"
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
import { format, parseISO } from "date-fns"

interface OccupancyData {
  date: string;
  current: number;
  previous: number;
}

interface OccupancyAnalysisChartProps {
  color?: 'green' | 'blue';
  occupancyData?: OccupancyData[];
  totalRooms?: number; // Total number of rooms in the hotel
  loading?: boolean; // Add loading prop to handle parent loading state
}

// Chart configuration for occupied/free rooms
const chartConfig = {
  occupied: {
    label: "Occupied Rooms",
    color: "hsl(221.2 83.2% 53.3%)",  // Blue
  },
  free: {
    label: "Available Rooms",
    color: "#e0e7ff",  // Light Blue/Gray
  },
} satisfies ChartConfig

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

const daysOfWeek = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export function OccupancyAnalysisChart({ 
  color = 'blue', 
  occupancyData = [], 
  totalRooms = 100,
  loading = false
}: OccupancyAnalysisChartProps) {
  const [viewType, setViewType] = useState<'period' | 'dow'>('dow')
  const [activeSeries, setActiveSeries] = React.useState<string[]>([
    'occupied',
    'free'
  ])
  const [fullScreenTable, setFullScreenTable] = React.useState(false)

  // Check if parent is in loading state or if we have real data to display
  // The check for date format helps identify real data vs fallback data
  const isRealData = !loading && occupancyData && occupancyData.length > 0 && 
                    occupancyData.some(item => item.date && 
                    (item.date.includes('-') || item.date.includes('/')));
  
  // Process the occupancy data to create period data
  const periodData = useMemo(() => {
    if (!isRealData) {
      return [];
    }

    return occupancyData.map(item => {
      const date = item.date.includes('-') 
        ? format(parseISO(item.date), 'd MMM') 
        : item.date;
      
      // Calculate occupied and free values
      const occupied = Math.round(item.current);
      const free = Math.max(0, 100 - occupied); // Ensure free is not negative
      
      return {
        period: date,
        occupied,
        free,
        totalRooms
      };
    });
  }, [occupancyData, totalRooms, isRealData]);

  // Simplify the day of week calculation to directly use the occupancy data
  const dowData = useMemo(() => {
    if (!isRealData) {
      return [];
    }

    // Simple dictionary to accumulate values by day of week
    const dowAccumulator: Record<string, { sum: number; count: number }> = {
      "Sunday": { sum: 0, count: 0 },
      "Monday": { sum: 0, count: 0 },
      "Tuesday": { sum: 0, count: 0 },
      "Wednesday": { sum: 0, count: 0 },
      "Thursday": { sum: 0, count: 0 },
      "Friday": { sum: 0, count: 0 },
      "Saturday": { sum: 0, count: 0 }
    };
    
    // Process each data point
    occupancyData.forEach(dataPoint => {
      try {
        // Parse the date
        let date;
        
        if (dataPoint.date.includes('-')) {
          // ISO format (YYYY-MM-DD)
          date = parseISO(dataPoint.date);
        } else if (dataPoint.date.includes('/')) {
          // MM/DD format
          const [month, day] = dataPoint.date.split('/').map(Number);
          const year = new Date().getFullYear();
          date = new Date(year, month - 1, day);
        } else {
          // Try to parse directly
          date = new Date(dataPoint.date);
        }
        
        // Check if date is valid
        if (date && !isNaN(date.getTime())) {
          // Get day of week
          const dayOfWeek = daysOfWeek[date.getDay()];
          
          // Add to accumulator
          dowAccumulator[dayOfWeek].sum += dataPoint.current;
          dowAccumulator[dayOfWeek].count += 1;
        } else {
          console.warn(`Could not parse date: ${dataPoint.date}`);
        }
      } catch (error) {
        console.error(`Error processing dataPoint: ${dataPoint.date}`, error);
      }
    });

    // Calculate averages and create final data
    const result = daysOfWeek.map(day => {
      const data = dowAccumulator[day];
      const avg = data.count > 0 ? Math.round(data.sum / data.count) : 0;
      
      return {
        period: day,
        occupied: avg,
        free: Math.max(0, 100 - avg),
        totalRooms
      };
    });

    return result;
  }, [occupancyData, totalRooms, isRealData]);

  // Get the appropriate data based on view type
  const chartData = viewType === 'period' ? periodData : dowData;

  // Render a loading skeleton if no data is available
  if (loading || !isRealData) {
    return (
      <Card className="border-gray-300 h-full">
        <CardHeader>
          <div className="flex w-full justify-between items-center">
            <CardTitle className="text-lg font-semibold text-gray-800">
              Occupancy Analysis
            </CardTitle>
            <div className="animate-pulse h-8 w-40 bg-gray-200 rounded-full"></div>
          </div>
        </CardHeader>
        <CardContent className="flex flex-col justify-center items-center h-[352px]">
          <div className="w-full h-[300px] bg-gray-100 rounded-lg animate-pulse flex items-center justify-center">
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card className="border-gray-300 h-full flex flex-col">
        <CardHeader>
          <div className="flex w-full justify-between items-center">
            <CardTitle className="text-lg font-semibold text-gray-800">
              Occupancy Analysis
            </CardTitle>
            <div className="flex space-x-2">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button 
                    variant="ghost" 
                    size="sm"
                    className="bg-[#f2f8ff] hover:bg-[#f2f8ff] text-[#342630] rounded-full px-4"
                  >
                    {viewType === 'period' ? 'Period Overview' : 'Day of Week Overview'} <TriangleDown className="ml-2" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  <DropdownMenuItem onClick={() => setViewType('period')}>
                    Period Overview
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setViewType('dow')}>
                    Day of Week Overview
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </CardHeader>
        <CardContent className="flex-grow flex flex-col">
          <ChartContainer config={chartConfig}>
            <BarChart
              data={chartData}
              height={300}
              margin={{
                top: 10,
                right: 10,
                bottom: 20,
                left: -10,
              }}
            >
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis
                dataKey="period"
                tickLine={false}
                axisLine={false}
                tickMargin={8}
              />
              <YAxis
                tickLine={false}
                axisLine={false}
                tickFormatter={(value) => `${value}%`}
                tickMargin={8}
              />
              <ChartTooltip content={<ChartTooltipContent />} />
              {activeSeries.includes('occupied') && (
                <Bar
                  dataKey="occupied"
                  stackId="a"
                  fill={chartConfig.occupied.color}
                  radius={[4, 4, 0, 0]}
                />
              )}
              {activeSeries.includes('free') && (
                <Bar
                  dataKey="free"
                  stackId="a"
                  fill={chartConfig.free.color}
                  radius={[0, 0, 0, 0]}
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

          {/* Push details button to the bottom */}
          <div className="mt-auto pt-4 border-t border-gray-200">
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
              Occupancy Analysis – {viewType === 'period' ? 'Period Overview' : 'Day of Week Overview'}
            </DialogTitle>
          </DialogHeader>
          <div className="border rounded-lg bg-[#f0f4fa]/40 border-[#d0d7e3]">
            <div className="overflow-y-auto max-h-[calc(90vh-120px)]">
              <Table>
                <TableHeader>
                  <TableRow className="border-b border-[#d0d7e3] hover:bg-transparent">
                    <TableHead className="bg-[#f0f4fa]/60 first:rounded-tl-lg text-left border-r border-[#d0d7e3]">
                      {viewType === 'period' ? 'Period' : 'Day of Week'}
                    </TableHead>
                    <TableHead className="bg-[#f0f4fa]/60 text-left border-r border-[#d0d7e3]">
                      Occupied (%)
                    </TableHead>
                    <TableHead className="bg-[#f0f4fa]/60 text-left border-r border-[#d0d7e3]">
                      Available (%)
                    </TableHead>
                    <TableHead className="bg-[#f0f4fa]/60 last:rounded-tr-lg text-left">
                      Total Rooms
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {chartData.map((row, idx) => (
                    <TableRow key={idx} className="border-b border-[#d0d7e3] last:border-0">
                      <TableCell className="w-[25%] bg-[#f0f4fa]/40 border-r border-[#d0d7e3] text-left">
                        {row.period}
                      </TableCell>
                      <TableCell className="w-[25%] text-left border-r border-[#d0d7e3]">
                        {row.occupied}%
                      </TableCell>
                      <TableCell className="w-[25%] text-left border-r border-[#d0d7e3]">
                        {row.free}%
                      </TableCell>
                      <TableCell className="w-[25%] text-left">
                        {row.totalRooms} rooms
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