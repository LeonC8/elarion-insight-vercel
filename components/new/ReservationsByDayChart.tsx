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
import { useState } from "react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

interface ReservationsByDayChartProps {
  data: Array<{
    dayOfWeek: string
    bookingsCreated: number
    prevBookingsCreated: number
    staysStarting: number
    prevStaysStarting: number
  }>
  color?: 'green' | 'blue'
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

export function ReservationsByDayChart({ data, color = 'green' }: ReservationsByDayChartProps) {
  const [dateType, setDateType] = useState<'book' | 'stay'>('book')
  const [activeSeries, setActiveSeries] = React.useState<string[]>([
    'current',
    'previous'
  ])

  // Get the appropriate data keys based on date type
  const currentKey = dateType === 'book' ? 'bookingsCreated' : 'staysStarting'
  const previousKey = dateType === 'book' ? 'prevBookingsCreated' : 'prevStaysStarting'

  // Transform data for the selected date type
  const chartData = data.map(item => ({
    dayOfWeek: item.dayOfWeek,
    current: item[currentKey],
    previous: item[previousKey],
  }))

  return (
    <Card className="border-gray-300">
      <CardHeader>
        <div className="flex w-full justify-between items-center">
          <CardTitle className="text-lg font-semibold text-gray-800">
            Reservations by Day of Week
          </CardTitle>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button 
                variant="ghost" 
                size="sm"
                className="bg-[#f2f8ff] hover:bg-[#f2f8ff] text-[#342630] rounded-full px-4"
              >
                {dateType === 'book' ? 'Book Date' : 'Stay Date'} <TriangleDown className="ml-2" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem onClick={() => setDateType('book')}>
                Book Date
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setDateType('stay')}>
                Stay Date
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
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
      </CardContent>
    </Card>
  )
} 