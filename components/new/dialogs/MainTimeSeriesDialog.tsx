"use client"

import * as React from "react"
import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from "recharts"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
} from "@/components/ui/chart"
import { ArrowRight } from 'lucide-react'
import { Button } from "@/components/ui/button"
import { Dialog as FullScreenDialog } from "@/components/ui/dialog"

interface TimeSeriesData {
  date: string
  current: number
  previous: number
}

interface MainTimeSeriesDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  currentValue: number
  percentageChange: number | null
  prefix?: string
  suffix?: string
  mainTimeSeriesData: TimeSeriesData[]
}

interface FullScreenTableProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  headers: string[]
  data: any[]
  renderRow: (row: any) => React.ReactNode
}

const mainKpiConfig = {
  current: {
    label: "Selected Period",
    color: "hsl(221.2 83.2% 53.3%)",
  },
  previous: {
    label: "Comparison Period",
    color: "hsl(215 20.2% 65.1%)",
  },
} as ChartConfig

function FullScreenTable({ 
  open, 
  onOpenChange, 
  title,
  headers,
  data,
  renderRow
}: FullScreenTableProps) {
  return (
    <FullScreenDialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-7xl min-h-fit max-h-[90vh]">
        <DialogHeader className="pb-6">
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <div className="border rounded-lg bg-[#f0f4fa]/40 border-[#d0d7e3]">
          <div className="overflow-y-auto max-h-[calc(90vh-120px)]">
            <Table>
              <TableHeader>
                <TableRow className="border-b border-[#d0d7e3] hover:bg-transparent">
                  {headers.map((header, index) => (
                    <TableHead 
                      key={header} 
                      className={`
                        bg-[#f0f4fa]/60 
                        first:rounded-tl-lg 
                        last:rounded-tr-lg 
                        ${index === 0 ? 'text-left' : 'text-left'}
                        border-r border-[#d0d7e3] last:border-r-0
                      `}
                    >
                      {header}
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.map((row, idx) => (
                  <TableRow key={idx} className="border-b border-[#d0d7e3] last:border-0">
                    {renderRow(row)}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      </DialogContent>
    </FullScreenDialog>
  )
}

const getLeftMargin = (data: Array<{ current: number; previous: number }>) => {
  const maxNumber = Math.max(
    ...data.flatMap(item => [item.current, item.previous])
  )
  console.log(maxNumber)
  const numLength = Math.round(maxNumber).toString().replace(/,/g, '').length
  console.log(numLength)
  const marginMap: { [key: number]: number } = {
    2: -13,
    3: -5,  // 100-999
    4: 3,   // 1,000-9,999
    5: 9,   // 10,000-99,999
    6: 18,  // 100,000-999,999
    7: 27,
    8: 44   // 1,000,000-9,999,999
  }
  return marginMap[numLength] || 3
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

// Helper function for formatting values based on title
const formatValue = (value: number, title: string, prefix: string, suffix: string): string => {
  if (!isFinite(value)) return `${prefix}0${suffix}`; // Handle non-finite numbers

  // Limit extremely large numbers before formatting
  const safeValue = Math.min(value, 999999999999);

  if (title.toLowerCase() === 'occupancy') {
    // Format Occupancy with one decimal place
    return `${prefix}${safeValue.toFixed(1)}${suffix}`;
  } else {
    // Format other metrics as rounded integers with locale string
    return `${prefix}${Math.round(safeValue).toLocaleString()}${suffix}`;
  }
};

export function MainTimeSeriesDialog({ 
  open, 
  onOpenChange, 
  title,
  currentValue,
  percentageChange,
  prefix = "€",
  suffix = "",
  mainTimeSeriesData,
}: MainTimeSeriesDialogProps) {
  const [fullScreenTable, setFullScreenTable] = React.useState<{
    isOpen: boolean;
    type: 'main' | null;
  }>({
    isOpen: false,
    type: null
  });

  // State for toggling visibility of main KPI series
  const [activeMainTimeSeriesLines, setActiveMainTimeSeriesLines] = React.useState<string[]>(['current', 'previous']);

  const mainTimeSeriesConfig = {
    current: {
      label: "Selected Period",
      color: "hsl(221.2 83.2% 53.3%)",
    },
    previous: {
      label: "Comparison period",
      color: "hsl(215 20.2% 65.1%)",
    },
  } as ChartConfig;


  const renderFullScreenTable = () => {
    if (!fullScreenTable.type) return null;

    return mainTimeSeriesData ? (
      <FullScreenTable
        open={fullScreenTable.isOpen}
        onOpenChange={(open) => setFullScreenTable({ isOpen: open, type: open ? 'main' : null })}
        title={`${title} Over Time`}
        headers={['Date', 'Selected Period', 'Comparison period', 'Change']}
        data={mainTimeSeriesData}
        renderRow={(row) => (
          <>
            <TableCell className="w-[25%] bg-[#f0f4fa]/40 border-r border-[#d0d7e3] text-left">
              {row.date}
            </TableCell>
            <TableCell className="w-[25%] text-left border-r border-[#d0d7e3]">
              {formatValue(row.current, title, prefix, suffix)}
            </TableCell>
            <TableCell className="w-[25%] text-left border-r border-[#d0d7e3]">
              {formatValue(row.previous, title, prefix, suffix)}
            </TableCell>
            <TableCell className={`w-[25%] text-left ${
              (row.current > row.previous || (row.previous === 0 && row.current > 0))
                ? "text-emerald-500"
                : (row.current < row.previous || (row.current === 0 && row.previous > 0))
                ? "text-red-500"
                : "text-gray-700"
            }`}>
              {formatPercentageChange(row.current, row.previous)}
            </TableCell>
          </>
        )}
      />
    ) : null;
  };

  // Update this function to calculate domain based on actual data values
  const getChartDomain = () => {
    const allValues = mainTimeSeriesData.flatMap(item => [item.current, item.previous]);
    const minValue = Math.min(...allValues);
    const maxValue = Math.max(...allValues);
    
    // For charts with currency or percentage, use exact max value
    if (prefix || suffix) {
      return [0, maxValue]; // Start at 0, end at exact max value
    }
    
    // For other charts, ensure we have a reasonable range
    return [
      Math.max(0, Math.floor(minValue * 0.9)), // Ensure no negative values
      Math.ceil(maxValue * 1.1)  // Add some padding at the top
    ];
  };

  // Simplify displayPercentageString and update class logic

  // Determine positivity/negativity based on the number value (if not null)
  const isValidPercentage = percentageChange !== null && isFinite(percentageChange);
  const isPositive = isValidPercentage && percentageChange > 0;
  const isNegative = isValidPercentage && percentageChange < 0;
  const isExactlyZero = percentageChange === 0; // Handles true 0% change (e.g., 5 vs 5)

  // Format display percentage string based on backend value
  const displayPercentageString = () => {
    if (percentageChange === null) {
      return '-'; // Handle 0 vs 0 case explicitly
    }
    if (!isFinite(percentageChange)) {
      // Fallback for unexpected non-finite numbers (shouldn't happen with backend clamping)
      return '-';
    }

    // Round the valid percentage number for display to one decimal place
    const changePercent = Math.round(percentageChange * 10) / 10;

    // Format the display string
    return `${changePercent > 0 ? '+' : ''}${changePercent.toFixed(1)}%`;
  };

  // *** NEW: Custom Tooltip Content Renderer for the Dialog Chart ***
  const renderDialogTooltipContent = (props: any) => {
    const { payload, label, active } = props; // label is the date

    if (active && payload && payload.length) {
      // Check if the payload contains valid data points before rendering
      const hasValidData = payload.some((entry: any) => entry.value !== undefined && entry.value !== null);
      if (!hasValidData) return null; // Don't render tooltip if data is missing

      return (
        <div className="rounded-lg border bg-background p-2 text-sm shadow-sm min-w-[180px]">
          <div className="grid gap-1.5">
            {/* Current Period/Date Label */}
            <div className="font-medium text-foreground">{`Current Period: ${label}`}</div>
            {/* Data Series Lines */}
            {payload.map((entry: any, index: number) => {
              const seriesKey = entry.dataKey as keyof typeof mainTimeSeriesConfig;
              const config = mainTimeSeriesConfig[seriesKey];
              // Skip rendering if config doesn't exist or if the value is null/undefined
              if (!config || entry.value === null || typeof entry.value === 'undefined') return null; 

              const val = entry.value;
              let formattedValue;
              let displayValue;

              // Group titles needing integer formatting
              if (title === 'Revenue' || title === 'Rooms Sold' || title === 'ADR' ||
                  title === 'Room Revenue' || title === 'F&B Revenue' || title === 'Other Revenue') {
                formattedValue = Math.round(val).toLocaleString();
                displayValue = `${prefix || ''}${formattedValue}`; // Apply prefix
              }
              // Group titles needing one decimal place formatting
              else if (title === 'Occupancy' || title === 'RevPAR' || title === 'TRevPAR') {
                formattedValue = val.toFixed(1);
                // Apply prefix for RevPAR/TRevPAR, suffix for Occupancy
                displayValue = (title === 'Occupancy')
                  ? `${formattedValue}${suffix || ''}`
                  : `${prefix || ''}${formattedValue}`;
              }
              // Default formatting for any other titles
              else {
                formattedValue = val.toLocaleString(); // Use toLocaleString for default
                displayValue = `${prefix || ''}${formattedValue}`; // Apply prefix
              }

              return (
                // Container for dot + label/value pair
                <div key={index} className="flex items-center gap-2">
                  <span
                    className="h-2.5 w-2.5 shrink-0 rounded-[2px]"
                    style={{ backgroundColor: config.color }}
                  />
                  {/* Container for label and value, using flex gap */}
                  <div className="flex items-center justify-between flex-1 gap-2"> {/* Use justify-between */}
                    {/* Make label shrink-proof */}
                    <span className="text-muted-foreground flex-shrink-0">{config.label}:</span>
                    {/* Allow value to grow, align text to right */}
                    <span className="font-medium text-foreground text-right">{displayValue}</span> {/* Removed flex-grow */}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      );
    }
    return null;
  };
  // *** END NEW ***

  // Ensure data used for calculations handles potential empty states
  const chartDataForRender = mainTimeSeriesData || [];
  // Calculate domain only if there's data
  const chartDomain = chartDataForRender.length > 0 ? getChartDomain() : [0, 100]; // Use existing getChartDomain
  // Calculate left margin only if there's data
  const leftMarginForRender = chartDataForRender.length > 0 ? getLeftMargin(chartDataForRender) : 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[95vw] max-w-4xl max-h-[90vh] flex flex-col p-0">
        <DialogHeader className="flex-none py-6 pb-2" showBorder={true}>
          <DialogTitle className="text-lg font-medium px-4">{title} over time</DialogTitle>
        </DialogHeader>
        
        <div className="flex-1 overflow-y-auto pr-2 sm:pr-6 bg-[#f2f8ff] px-2 sm:px-4 pb-4 pt-4">
          <div className="flex flex-col gap-6">
            {/* Main Time Series Section */}
            <div className="bg-white rounded-lg p-4 sm:p-6 shadow-sm border border-gray-300">
              <h3 className="text-base mb-2 font-medium text-sm text-muted-foreground mb-4">
                {title}
              </h3>
              
              {/* Summary Section - Always row, align items baseline */}
              <div className="flex flex-row items-baseline gap-2 sm:gap-3 mb-8 sm:mb-10"> 
                <span className="text-xl sm:text-2xl font-bold leading-none">
                  {/* Use formatValue helper for consistency, ensure prefix/suffix are handled */}
                  {formatValue(currentValue, title, prefix, suffix)}
                </span>
                {/* Apply styles based on the calculated states */}
                <span className={`text-xs sm:text-sm px-2 py-0.5 rounded ${
                  isPositive
                    ? 'text-green-600 bg-green-100/50 border border-green-600'
                    : isNegative
                    ? 'text-red-600 bg-red-100/50 border border-red-600'
                    : isExactlyZero // Style for actual 0% change
                    ? 'text-gray-600 bg-gray-100/50 border border-gray-600'
                    : 'text-gray-700' // Style for '-' (null percentageChange) or fallback
                } leading-none`}>
                  {displayPercentageString()}
                </span>
              </div>

              <ChartContainer config={mainTimeSeriesConfig} className="min-h-[300px] w-full">
                <AreaChart
                  data={chartDataForRender}
                  height={300}
                  margin={{
                    top: 10,
                    right: 10,
                    bottom: 20,
                    left: leftMarginForRender,
                  }}
                >
                  <defs>
                    <linearGradient id="gradient-main" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={mainTimeSeriesConfig.current.color} stopOpacity={0.1}/>
                      <stop offset="100%" stopColor={mainTimeSeriesConfig.current.color} stopOpacity={0.1}/>
                    </linearGradient>
                    <linearGradient id="gradient-main-previous" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={mainTimeSeriesConfig.previous.color} stopOpacity={0.05}/>
                      <stop offset="100%" stopColor={mainTimeSeriesConfig.previous.color} stopOpacity={0.05}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis
                    dataKey="date"
                    tickLine={false}
                    axisLine={false}
                    tickMargin={8}
                    // Adjusted interval calculation for fewer ticks (aiming for ~4-5)
                    interval={chartDataForRender.length > 5 ? Math.max(1, Math.ceil(chartDataForRender.length / 5) - 1) : 0} 
                  />
                  <YAxis
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(value) => `${Math.round(value).toLocaleString()}`}
                    tickMargin={8}
                    width={45}
                    domain={chartDomain}
                    allowDecimals={false}
                    minTickGap={20}
                  />
                  <ChartTooltip content={renderDialogTooltipContent} />
                  {chartDataForRender.length > 0 && activeMainTimeSeriesLines.includes("previous") && (
                    <Area
                      type="monotone"
                      dataKey="previous"
                      stroke={mainTimeSeriesConfig.previous.color}
                      strokeDasharray="4 4"
                      fill="url(#gradient-main-previous)"
                      strokeWidth={2}
                      dot={false}
                    />
                  )}
                  {chartDataForRender.length > 0 && activeMainTimeSeriesLines.includes("current") && (
                    <Area
                      type="monotone"
                      dataKey="current"
                      stroke={mainTimeSeriesConfig.current.color}
                      fill="url(#gradient-main)"
                      strokeWidth={2}
                      dot={false}
                    />
                  )}
                </AreaChart>
              </ChartContainer>
              <div className="flex flex-wrap justify-center gap-3 mt-6"> 
                {Object.entries(mainTimeSeriesConfig).map(([key, config]) => (
                  <div
                    key={key}
                    onClick={() => {
                      if (activeMainTimeSeriesLines.includes(key)) {
                        setActiveMainTimeSeriesLines(activeMainTimeSeriesLines.filter(item => item !== key))
                      } else {
                        setActiveMainTimeSeriesLines([...activeMainTimeSeriesLines, key])
                      }
                    }}
                    className={`cursor-pointer bg-[#f0f4fa] px-3 py-1.5 rounded-full border border-[#e5eaf3] flex items-center gap-2 ${
                      activeMainTimeSeriesLines.includes(key) ? '' : 'opacity-50'
                    }`}
                  >
                    <div style={{ backgroundColor: config.color }} className="w-2 h-2 rounded-full" />
                    <span className="text-xs text-gray-500 font-medium">{config.label}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Table Card */}
            <div className="bg-white rounded-lg p-4 sm:p-6 shadow-sm border border-gray-300">
              <h3 className="text-base mb-6 font-medium">Details</h3>
              <div className="border rounded-lg overflow-x-auto">
                <Table className="min-w-[600px]">
                  <TableHeader>
                    <TableRow className="hover:bg-transparent">
                      <TableHead className="bg-[#f0f4fa]/60 text-left whitespace-nowrap">Date</TableHead>
                      <TableHead className="bg-[#f0f4fa]/60 text-left whitespace-nowrap">Selected Period</TableHead>
                      <TableHead className="bg-[#f0f4fa]/60 text-left whitespace-nowrap">Comparison Period</TableHead>
                      <TableHead className="bg-[#f0f4fa]/60 text-left whitespace-nowrap">Change</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {mainTimeSeriesData.map((row, idx) => (
                      <TableRow key={idx} className="border-b border-[#d0d7e3] last:border-0">
                        <TableCell className="bg-[#f0f4fa]/40 border-r border-[#d0d7e3] whitespace-nowrap">
                          {row.date}
                        </TableCell>
                        <TableCell className="border-r border-[#d0d7e3] whitespace-nowrap">
                          {formatValue(row.current, title, prefix, suffix)}
                        </TableCell>
                        <TableCell className="border-r border-[#d0d7e3] whitespace-nowrap">
                          {formatValue(row.previous, title, prefix, suffix)}
                        </TableCell>
                        <TableCell className={`text-left whitespace-nowrap ${
                          (row.current > row.previous || (row.previous === 0 && row.current > 0))
                            ? "text-emerald-500"
                            : (row.current < row.previous || (row.current === 0 && row.previous > 0))
                            ? "text-red-500"
                            : "text-gray-700"
                        }`}>
                          {formatPercentageChange(row.current, row.previous)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          </div>
        </div>
        {renderFullScreenTable()}
      </DialogContent>
    </Dialog>
  )
} 