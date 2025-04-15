"use client"

import * as React from "react"
import { Area, AreaChart, ResponsiveContainer, YAxis } from "recharts"
import { Card } from "@/components/ui/card"
import { ChevronRight, LucideIcon } from "lucide-react"
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart"
import { MainTimeSeriesDialog } from "./dialogs/MainTimeSeriesDialog"

interface KpiWithAlignedChartProps {
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
  icon?: LucideIcon
}

export function KpiWithAlignedChart({ 
  title, 
  currentValue,
  percentageChange,
  chartData,
  prefix = "€",
  suffix,
  valueColor = "blue",
  icon: Icon
}: KpiWithAlignedChartProps) {
  const [showDetails, setShowDetails] = React.useState(false)
  const formattedValue = Math.round(currentValue).toLocaleString()
  const changePercent = Math.round(percentageChange * 10) / 10
  const isPositive = changePercent > 0
  
  // Check if there's more than one data point to display the chart
  const hasMultipleDataPoints = chartData && chartData.length > 1
  
  const getColorConfig = () => {
    switch(valueColor) {
      case 'blue': 
        return "hsl(221.2 83.2% 53.3%)";
      case 'green': 
        return "hsl(142.1 76.2% 36.3%)";
      case 'red': 
        return "hsl(0 84.2% 60.2%)";
      default: 
        return "hsl(221.2 83.2% 53.3%)";
    }
  };
  
  const chartColor = getColorConfig();
  const gradientId = `gradient-${title.toLowerCase().replace(/\s+/g, '-')}-${valueColor}`;

  const mainChartConfig = {
    current: {
      label: "Current Period",
      color: chartColor,
    },
  } as ChartConfig

  // Calculate min and max values for domain
  const getChartDomain = () => {
    // For charts without prefix and suffix, we need explicit domain calculation
    if (!prefix && !suffix) {
      const allValues = chartData.flatMap(item => [item.current, item.previous]);
      const minValue = Math.min(...allValues);
      const maxValue = Math.max(...allValues);
      return [
        minValue * 0.9, // Add some padding at the bottom
        maxValue * 1.1  // Add some padding at the top
      ];
    }
    // For charts with prefix or suffix, auto domain works fine
    return ['auto', 'auto'];
  };

  // Custom Tooltip Content Renderer
  const renderTooltipContent = (props: any) => {
    const { payload, label, active } = props; // `label` might be the x-axis value (date), `payload` has the data points

    if (active && payload && payload.length) {
      // Find the data entry for the 'current' series
      const dataEntry = payload.find((p: any) => p.dataKey === 'current');
      if (!dataEntry) return null;

      const dataPoint = dataEntry.payload; // The full data object for this point: { date, current, previous }
      const currentVal = dataEntry.value;  // The specific value for 'current' at this point

      let formattedValue;
      // Apply formatting based on the KPI title
      if (title === 'Revenue' || title === 'Rooms Sold' || title === 'ADR') {
        formattedValue = Math.round(currentVal).toLocaleString();
      } else if (title === 'Occupancy') {
        // Format to one decimal place and add suffix if it exists
        formattedValue = currentVal.toFixed(1) + (suffix || '');
      } else {
        // Default formatting (e.g., locale string)
        formattedValue = currentVal.toLocaleString();
      }

      // Add prefix for non-occupancy values
      const displayValue = (title !== 'Occupancy') ? `${prefix || ''}${formattedValue}` : formattedValue;

      return (
        <div className="rounded-lg border bg-background p-2 text-sm shadow-sm min-w-[150px]">
          <div className="grid gap-1">
            {/* Title: Use label from chart config */}
            <div className="font-medium text-foreground">
              {mainChartConfig.current.label}
            </div>
            {/* Value Line - Now includes the date */}
            <div className="flex items-center gap-2 mt-1">
              <span
                className="h-2.5 w-2.5 shrink-0 rounded-[2px]"
                style={{ backgroundColor: mainChartConfig.current.color }} // Use color from config
              />
              <div className="flex flex-1 justify-between">
                {/* Change "Value:" to the date */}
                <span className="text-muted-foreground">{dataPoint.date}:</span>
                <span className="font-medium text-foreground">
                  {displayValue}
                </span>
              </div>
            </div>
          </div>
        </div>
      );
    }

    return null;
  };

  return (
    <>
      <Card 
        className={`relative overflow-hidden cursor-pointer border-gray-300 flex flex-col ${hasMultipleDataPoints ? 'h-[200px]' : 'h-[130px]'} w-full ${!hasMultipleDataPoints ? 'justify-center' : ''}`}
        onClick={() => setShowDetails(true)}
      >
        {/* Header section - reduced padding */}
        <div className="p-5 pb-2">
          <div className="flex justify-between items-start">
            <div className="flex items-center gap-2 text-lg text-muted-foreground mb-1 text-gray-800">
              {Icon && (
                <div className="p-1.5 rounded-full bg-[#f5f8ff] ">
                  <Icon className="h-4 w-4 text-gray-500" />
                </div>
              )}
              {title}
            </div>
            <ChevronRight className="h-4 w-4 text-muted-foreground mt-1" />
          </div>
          <div className="flex flex-wrap items-end gap-2 mt-2">
            <span className={`font-bold ${!hasMultipleDataPoints ? 'text-3xl' : 'text-2xl'}`}>
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
        
        {/* Only render the chart if there are multiple data points */}
        {hasMultipleDataPoints && (
          <div className="flex-1 w-full h-[100px] absolute bottom-0 left-0 right-0">
            <ChartContainer config={mainChartConfig} className="h-full w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart 
                  data={chartData}
                  margin={{
                    top: 12,
                    right: 0,
                    bottom: 0,
                    left: 0,
                  }}
                >
                  <defs>
                    <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                      <stop
                        offset="5%"
                        stopColor={chartColor}
                        stopOpacity={0.3}
                      />
                      <stop
                        offset="95%"
                        stopColor={chartColor}
                        stopOpacity={0.1}
                      />
                    </linearGradient>
                  </defs>
                  <ChartTooltip 
                    content={renderTooltipContent}
                    position={{ y: -40 }}
                    cursor={false}
                    offset={5}
                    wrapperStyle={{ zIndex: 100 }}
                  />
                  <YAxis 
                    hide={true}
                    domain={getChartDomain()}
                  />
                  {/* Removed the previous period line - only keeping current period */}
                  <Area
                    type="monotone"
                    dataKey="current"
                    stroke={chartColor}
                    fill={`url(#${gradientId})`}
                    strokeWidth={1.5}
                    dot={false}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </ChartContainer>
          </div>
        )}
      </Card>
      
      {/* Pass the percentageChange prop to the dialog */}
      <MainTimeSeriesDialog 
        open={showDetails}
        onOpenChange={setShowDetails}
        title={title}
        currentValue={currentValue}
        percentageChange={percentageChange} 
        prefix={prefix}
        suffix={suffix}
        mainTimeSeriesData={chartData}
      />
    </>
  )
} 