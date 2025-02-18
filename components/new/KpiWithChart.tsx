"use client"

import * as React from "react"
import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from "recharts"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  ChartConfig,
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart"
import { Button } from "@/components/ui/button"
import { DataDetailsDialog } from "./DataDetailsDialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

interface KpiWithChartProps {
  title: string
  initialValue: number
  initialPercentageChange: number
  chartData: Array<{
    date: string
    current: number
    previous: number
  }>
  prefix?: string
  color?: 'green' | 'blue' | 'red'
  metrics?: Array<{
    key: string
    label: string
    data: Array<{
      date: string
      current: number
      previous: number
    }>
    prefix?: string
  }>
  distributionData?: Array<{
    name: string
    value: number
    percentage: number
    fill: string
  }>
  categoryTimeSeriesData?: Array<{
    date: string
    categories: {
      [key: string]: {
        current: number
        previous: number
      }
    }
  }>
}

const getChartConfig = (color: 'green' | 'blue' | 'red'): ChartConfig => ({
  current: {
    label: "Current Period",
    color: color === 'green' ? "hsl(142.1 76.2% 36.3%)" : 
           color === 'blue' ? "hsl(221.2 83.2% 53.3%)" :
           "hsl(0, 84%, 60%)",
  },
  previous: {
    label: "Previous Period",
    color: "hsl(var(--muted-foreground))",
  },
}) 

const getLeftMargin = (data: Array<{ current: number; previous: number }>) => {
  // Find the largest number in both current and previous datasets
  const maxNumber = Math.max(
    ...data.flatMap(item => [item.current, item.previous])
  )
  
  // Convert to string and count digits
  const numLength = Math.round(maxNumber).toString().replace(/,/g, '').length

  // Map number length to margin values
  const marginMap: { [key: number]: number } = {
    3: -5,  // 100-999
    4: 3,   // 1,000-9,999
    5: 9,   // 10,000-99,999
    6: 18,  // 100,000-999,999
    7: 27   // 1,000,000-9,999,999
  }

  console.log(numLength)

  // Return the appropriate margin or default to 3 if not found
  return marginMap[numLength] || 3
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

export function KpiWithChart({ 
  title, 
  initialValue,
  initialPercentageChange,
  chartData,
  prefix = "",
  color = 'green',
  metrics = [{ key: 'default', label: title, data: chartData, prefix }],
  distributionData,
  categoryTimeSeriesData
}: KpiWithChartProps) {
  const [showDetails, setShowDetails] = React.useState(false)
  const [selectedMetric, setSelectedMetric] = React.useState(metrics[0].key)
  const [activeMainSeries, setActiveMainSeries] = React.useState<string[]>(['current', 'previous'])
  
  // Get current metric data
  const currentMetricData = metrics.find(m => m.key === selectedMetric) || metrics[0]
  
  // Calculate current value and percentage change based on selected metric
  const currentValue = currentMetricData.data[currentMetricData.data.length - 1].current
  const previousValue = currentMetricData.data[currentMetricData.data.length - 1].previous
  const calculatedPercentageChange = ((currentValue - previousValue) / previousValue) * 100
  
  const formattedValue = Math.round(currentValue).toLocaleString()
  const changePercent = Math.round(calculatedPercentageChange * 10) / 10
  const isPositive = changePercent > 0
  const chartConfig = getChartConfig(color)
  const leftMargin = getLeftMargin(currentMetricData.data)

  const gradientId = `gradient-${title.toLowerCase().replace(/\s+/g, '-')}`
  const currentGradientColor = chartConfig.current.color

  return (
    <Card className="border-gray-300">
      <CardHeader>
        <div className="flex justify-between items-center">
          <CardTitle className="text-base mb-2 font-medium text-sm text-muted-foreground">
            {title}
          </CardTitle>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button 
                variant="ghost" 
                size="sm"
                className="bg-[#f2f8ff] hover:bg-[#f2f8ff] text-[#342630] rounded-full px-4"
              >
                {currentMetricData.label} <TriangleDown className="ml-2" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              {metrics.map(metric => (
                <DropdownMenuItem 
                  key={metric.key}
                  onClick={() => setSelectedMetric(metric.key)}
                >
                  {metric.label}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        <div className="flex items-end gap-3">
          <span className="text-2xl font-bold leading-none">
            {currentMetricData.prefix || prefix}{formattedValue}
          </span>
          <span className={`text-sm -translate-y-[1px] px-2 py-0.5 rounded ${
            isPositive 
              ? 'text-green-600 bg-green-100/50 border border-green-600' 
              : 'text-red-600 bg-red-100/50 border border-red-600'
          } leading-none`}>
            {isPositive ? '+' : ''}{changePercent}% 
          </span>
        </div>
      </CardHeader>
      <CardContent className="pb-4 mt-3">
        <ChartContainer config={chartConfig}>
          <AreaChart
            data={currentMetricData.data}
            height={300}
            margin={{
              top: 10,
              right: 10,
              bottom: 20,
              left: leftMargin,
            }}
          >
            <defs>
              <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={currentGradientColor} stopOpacity={0.1}/>
                <stop offset="100%" stopColor={currentGradientColor} stopOpacity={0.1}/>
              </linearGradient>
              <linearGradient id={`${gradientId}-previous`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={chartConfig.previous.color} stopOpacity={0.05}/>
                <stop offset="100%" stopColor={chartConfig.previous.color} stopOpacity={0.05}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis
              dataKey="date"
              tickLine={false}
              axisLine={false}
              tickFormatter={(value) => value.slice(0, 3)}
              tickMargin={8}
            />
            <YAxis
              tickLine={false}
              axisLine={false}
              tickFormatter={(value) => `${Math.round(value).toLocaleString()}`}
              tickMargin={8}
              width={45}
            />
            <ChartTooltip content={<ChartTooltipContent />} />
            {/* Conditionally render the areas based on activeMainSeries */}
            {activeMainSeries.includes("previous") && (
              <Area
                type="monotone"
                dataKey="previous"
                stroke={chartConfig.previous.color}
                strokeDasharray="4 4"
                fill={`url(#${gradientId}-previous)`}
                strokeWidth={2}
                dot={false}
              />
            )}
            {activeMainSeries.includes("current") && (
              <Area
                type="monotone"
                dataKey="current"
                stroke={currentGradientColor}
                fill={`url(#${gradientId})`}
                strokeWidth={2}
                dot={false}
              />
            )}
            {/* Replace existing ChartLegend with updated version */}
            <ChartLegend 
              className="mt-6" 
              content={() => (
                <div className="flex justify-center gap-3 pt-10 pb-0 mb-0">
                  {Object.keys(chartConfig).map((key) => (
                    <div
                      key={key}
                      onClick={() => {
                        if (activeMainSeries.includes(key)) {
                          setActiveMainSeries(activeMainSeries.filter(item => item !== key))
                        } else {
                          setActiveMainSeries([...activeMainSeries, key])
                        }
                      }}
                      className={`cursor-pointer bg-[#f0f4fa] px-3 py-1.5 rounded-full border border-[#e5eaf3] flex items-center gap-2 ${
                        activeMainSeries.includes(key) ? '' : 'opacity-50'
                      }`}
                    >
                      <div style={{ backgroundColor: chartConfig[key].color }} className="w-2 h-2 rounded-full" />
                      <span className="text-xs text-gray-500 font-medium">{chartConfig[key].label}</span>
                    </div>
                  ))}
                </div>
              )}
            />
          </AreaChart>
        </ChartContainer>
        <div className="mt-3 pt-4 border-t border-gray-200">
          <div className="flex justify-end">
            <Button
              variant="ghost"
              className="text-blue-600 hover:text-blue-800 font-medium text-sm"
              onClick={() => setShowDetails(true)}
            >
              View Details
            </Button>
          </div>
        </div>
      </CardContent>
      <DataDetailsDialog 
        open={showDetails}
        onOpenChange={setShowDetails}
        title={title}
        currentValue={currentValue}
        prefix={currentMetricData.prefix || prefix}
        distributionData={distributionData}
        categoryTimeSeriesData={categoryTimeSeriesData}
        mainTimeSeriesData={currentMetricData.data}
      />
    </Card>
  )
} 