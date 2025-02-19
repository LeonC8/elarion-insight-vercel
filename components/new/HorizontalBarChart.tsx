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

interface HorizontalBarChartProps {
  data: Array<{
    range: string
    current: number
    previous: number
  }>
  title: string
}

// Chart configuration for current/previous period
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

export function HorizontalBarChart({ data, title }: HorizontalBarChartProps) {
  const [activeSeries, setActiveSeries] = React.useState<string[]>([
    'current',
    'previous'
  ])

  return (
    <Card className="border-gray-300">
      <CardHeader>
        <CardTitle className="text-lg font-semibold text-gray-800">
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig}>
          <BarChart
            data={data}
            layout="vertical"
            height={300}
            margin={{
              top: 10,
              right: 10,
              bottom: 20,
              left: -10,
            }}
          >
            <CartesianGrid strokeDasharray="3 3" horizontal={false} />
            <XAxis
              type="number"
              tickLine={false}
              axisLine={false}
              tickFormatter={(value) => `${Math.round(value).toLocaleString()}`}
              tickMargin={8}
            />
            <YAxis
              dataKey="range"
              type="category"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
            />
            <ChartTooltip content={<ChartTooltipContent />} />
            {activeSeries.includes('current') && (
              <Bar
                dataKey="current"
                fill={chartConfig.current.color}
                radius={[0, 4, 4, 0]}
              />
            )}
            {activeSeries.includes('previous') && (
              <Bar
                dataKey="previous"
                fill={chartConfig.previous.color}
                radius={[0, 4, 4, 0]}
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