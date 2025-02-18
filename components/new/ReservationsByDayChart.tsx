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

interface ReservationsByDayChartProps {
  data: Array<{
    dayOfWeek: string
    bookingsCreated: number
    staysStarting: number
  }>
  color?: 'green' | 'blue'
}

// Chart configuration with colors for each dataset
const chartConfig = {
  bookingsCreated: {
    label: "Bookings Created",
    color: "hsl(221.2 83.2% 53.3%)",  // Blue
  },
  staysStarting: {
    label: "Stays Starting",
    color: "#11b981",  // Updated Green
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

export function ReservationsByDayChart({ data, color = 'green' }: ReservationsByDayChartProps) {
  const [activeSeries, setActiveSeries] = React.useState<string[]>([
    'bookingsCreated',
    'staysStarting'
  ])

  // Get color class from TopFive
  const getColorClass = (type: 'bg') => {
    return color === 'green' ? 'bg-emerald-500' : 'bg-blue-500'
  }

  return (
    <Card className="border-gray-300">
      <CardHeader>
        <CardTitle className="text-lg font-semibold text-gray-800">
          Reservations by Day of Week
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig}>
          <BarChart
            data={data}
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
            {activeSeries.includes('bookingsCreated') && (
              <Bar
                dataKey="bookingsCreated"
                fill={chartConfig.bookingsCreated.color}
                radius={[4, 4, 0, 0]}
              />
            )}
            {activeSeries.includes('staysStarting') && (
              <Bar
                dataKey="staysStarting"
                fill={chartConfig.staysStarting.color}
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