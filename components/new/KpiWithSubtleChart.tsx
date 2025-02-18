"use client"

import * as React from "react"
import { Area, AreaChart, ResponsiveContainer, XAxis } from "recharts"
import { Card, CardHeader } from "@/components/ui/card"
import { ChevronRight } from "lucide-react"
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart"
import { DataDetailsDialog } from "./DataDetailsDialog"
import type { CategoryTimeSeriesData } from '@/components/new/DataDetailsDialog'

interface KpiWithSubtleChartProps {
  title: string
  currentValue: number
  percentageChange: number
  chartData: {
    date: string
    current: number
    previous: number
  }[]
  prefix?: string
  suffix?: string
  valueColor?: "blue" | "green" | "red"
  distributionData?: {
    name: string
    value: number
    percentage: number
    fill: string
  }[]
  categoryTimeSeriesData?: CategoryTimeSeriesData[]
  chartConfig?: ChartConfig
}

export function KpiWithSubtleChart({ 
  title, 
  currentValue,
  percentageChange,
  chartData,
  prefix = "€",
  suffix,
  valueColor = "blue",
  distributionData,
  categoryTimeSeriesData,
  chartConfig: categoryChartConfig
}: KpiWithSubtleChartProps) {
  const [showDetails, setShowDetails] = React.useState(false)
  const formattedValue = Math.round(currentValue).toLocaleString()
  const changePercent = Math.round(percentageChange * 10) / 10
  const isPositive = changePercent > 0
  
  const mainChartConfig = {
    current: {
      label: "Current Period",
      color: valueColor === 'blue' ? "hsl(221.2 83.2% 53.3%)" : "hsl(142.1 76.2% 36.3%)",
    },
    previous: {
      label: "Previous Period",
      color: "hsl(var(--muted-foreground))",
    },
  } as ChartConfig

  const gradientColor = mainChartConfig.current.color
  const gradientId = `gradient-${title.toLowerCase().replace(/\s+/g, '-')}`

  return (
    <>
      <Card 
        className="relative overflow-hidden cursor-pointer border-gray-300"
        onClick={() => setShowDetails(true)}
      >
        <CardHeader>
          <div className="flex justify-between items-start">
            <div className="flex flex-col space-y-3">
              <p className="text-lg text-muted-foreground mb-2 text-gray-800">
                {title}
              </p>
              <div className="flex items-end gap-2">
                <span className="text-2xl font-bold ">
                  {prefix}{formattedValue}{suffix}
                </span>
                <span className={`text-xs mb-1 ml-1 px-2 py-0.5 rounded ${
                  isPositive 
                    ? 'text-green-600 bg-green-100/50 border border-green-600' 
                    : 'text-red-600 bg-red-100/50 border border-red-600'
                }`}>
                  {isPositive ? '+' : ''}{changePercent}%
                </span>
              </div>
            </div>
            <ChevronRight className="h-5 w-5 text-muted-foreground" />
          </div>
        </CardHeader>
        <div className="h-[100px] mt-auto">
          <ChartContainer config={mainChartConfig}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart 
                data={chartData}
                margin={{
                  top: 0,
                  right: -1,
                  bottom: 0,
                  left: -1,
                }}
              >
                <defs>
                  <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                    <stop
                      offset="5%"
                      stopColor={gradientColor}
                      stopOpacity={0.3}
                    />
                    <stop
                      offset="95%"
                      stopColor={gradientColor}
                      stopOpacity={0.1}
                    />
                  </linearGradient>
                </defs>
                <ChartTooltip 
                  content={<ChartTooltipContent />}
                  position={{ y: -50 }}
                  cursor={false}
                  offset={5}
                  wrapperStyle={{ zIndex: 100 }}
                />
                {/* Previous period line (render first to be behind) */}
                <Area
                  type="monotone"
                  dataKey="previous"
                  stroke={mainChartConfig.previous.color}
                  fill="none"
                  strokeWidth={1.5}
                  strokeDasharray="4 4"
                  dot={false}
                />
                {/* Current period area */}
                <Area
                  type="monotone"
                  dataKey="current"
                  stroke={gradientColor}
                  fill={`url(#${gradientId})`}
                  strokeWidth={1.5}
                  dot={false}
                />
                <XAxis
                  dataKey="date"
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(value) => value.slice(0, 3)}
                  tickMargin={8}
                />
              </AreaChart>
            </ResponsiveContainer>
          </ChartContainer>
        </div>
      </Card>
      <DataDetailsDialog 
        open={showDetails}
        onOpenChange={setShowDetails}
        title={title}
        currentValue={currentValue}
        prefix={prefix}
        suffix={suffix}
        distributionData={distributionData}
        categoryTimeSeriesData={categoryTimeSeriesData}
        mainTimeSeriesData={chartData}
        chartConfig={categoryChartConfig}
      />
    </>
  )
} 