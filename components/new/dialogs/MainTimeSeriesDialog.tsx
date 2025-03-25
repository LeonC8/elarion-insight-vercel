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
  percentageChange: number
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

// First, update the calculateSummaryValue function to handle infinity and NaN values
const calculateSummaryValue = (data: TimeSeriesData[], title: string) => {
  if (!data?.length) return { value: 0, change: 0 };
  
  const isSum = title.toLowerCase().includes('revenue') || title.toLowerCase().includes('sold');
  
  // Filter out any infinity or NaN values before calculating
  const validData = data.filter(item => 
    isFinite(item.current) && !isNaN(item.current) &&
    isFinite(item.previous) && !isNaN(item.previous)
  );
  
  if (validData.length === 0) return { value: 0, change: 0 };
  
  const currentValue = isSum 
    ? validData.reduce((sum, item) => sum + item.current, 0)
    : validData.reduce((sum, item) => sum + item.current, 0) / validData.length;
    
  const previousValue = isSum
    ? validData.reduce((sum, item) => sum + item.previous, 0)
    : validData.reduce((sum, item) => sum + item.previous, 0) / validData.length;
    
  const percentageChange = previousValue === 0 
    ? (currentValue > 0 ? 100 : 0) // Avoid infinity when previous is 0
    : ((currentValue - previousValue) / previousValue) * 100;
  
  return {
    value: currentValue,
    change: percentageChange
  };
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
        headers={['Month', 'Selected Period', 'Comparison period', 'Change']}
        data={mainTimeSeriesData}
        renderRow={(row) => (
          <>
            <TableCell className="w-[25%] bg-[#f0f4fa]/40 border-r border-[#d0d7e3] text-left">
              {row.date}
            </TableCell>
            <TableCell className="w-[25%] text-left border-r border-[#d0d7e3]">
              {prefix}{isFinite(row.current) ? Math.round(Math.min(row.current, 999999999999)).toLocaleString() : 0}
            </TableCell>
            <TableCell className="w-[25%] text-left border-r border-[#d0d7e3]">
              {prefix}{isFinite(row.previous) ? Math.round(Math.min(row.previous, 999999999999)).toLocaleString() : 0}
            </TableCell>
            <TableCell className={`w-[25%] text-left ${row.current > row.previous ? "text-emerald-500" : "text-red-500"}`}>
              {((row.current - row.previous) / row.previous * 100).toFixed(1)}%
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

  // Instead of calculating change here, use the passed percentageChange
  const changePercent = Math.round(percentageChange * 10) / 10
  const isPositive = changePercent > 0

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[45vw] max-h-[90vh] flex flex-col p-0">
        <DialogHeader className="flex-none py-6 pb-2" showBorder={true}>
          <DialogTitle className="text-lg font-medium px-4">{title} over time</DialogTitle>
        </DialogHeader>
        
        <div className="flex-1 overflow-y-auto pr-6 bg-[#f2f8ff] px-4 pb-4 pt-4">
          <div className="flex flex-col gap-6">
            {/* Main Time Series Section */}
            <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-300">
              <h3 className="text-base mb-2 font-medium text-sm text-muted-foreground mb-4">
                {title}
              </h3>
              
              {/* Summary Section */}
              <div className="flex items-end gap-3 mb-10">
                <span className="text-2xl font-bold leading-none">
                  {prefix}{Math.round(currentValue).toLocaleString()}{suffix}
                </span>
                <span className={`text-sm -translate-y-[1px] px-2 py-0.5 rounded ${
                  isPositive 
                    ? 'text-green-600 bg-green-100/50 border border-green-600' 
                    : 'text-red-600 bg-red-100/50 border border-red-600'
                } leading-none`}>
                  {isPositive ? '+' : ''}{changePercent}% 
                </span>
              </div>

              <ChartContainer config={mainTimeSeriesConfig}>
                <AreaChart
                  data={mainTimeSeriesData}
                  height={300}
                  margin={{
                    top: 10,
                    right: 10,
                    bottom: 20,
                    left: getLeftMargin(mainTimeSeriesData),
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
                    interval={Math.ceil(mainTimeSeriesData.length / 10) - 1}
                  />
                  <YAxis
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(value) => `${Math.round(value).toLocaleString()}`}
                    tickMargin={8}
                    width={45}
                    domain={getChartDomain()}
                    allowDecimals={false}
                    minTickGap={20}
                  />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  {activeMainTimeSeriesLines.includes("previous") && (
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
                  {activeMainTimeSeriesLines.includes("current") && (
                    <Area
                      type="monotone"
                      dataKey="current"
                      stroke={mainTimeSeriesConfig.current.color}
                      fill="url(#gradient-main)"
                      strokeWidth={2}
                      dot={false}
                    />
                  )}
                  <ChartLegend 
                    className="mt-6" 
                    content={() => (
                      <div className="flex justify-center gap-3 pt-10 pb-0 mb-0">
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
                    )}
                  />
                </AreaChart>
              </ChartContainer>
            </div>

            {/* Table Card */}
            <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-300">
              <h3 className="text-base mb-6 font-medium">Details</h3>
              <div className="border rounded-lg">
                <Table>
                  <TableHeader>
                    <TableRow className="hover:bg-transparent">
                      <TableHead className="bg-[#f0f4fa]/60 w-[25%] text-left">Month</TableHead>
                      <TableHead className="bg-[#f0f4fa]/60 w-[25%] text-left">Selected Period</TableHead>
                      <TableHead className="bg-[#f0f4fa]/60 w-[25%] text-left">Comparison Period</TableHead>
                      <TableHead className="bg-[#f0f4fa]/60 w-[25%] text-left">Change</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {mainTimeSeriesData.map((row, idx) => (
                      <TableRow key={idx} className="border-b border-[#d0d7e3] last:border-0">
                        <TableCell className="bg-[#f0f4fa]/40 border-r border-[#d0d7e3]">
                          {row.date}
                        </TableCell>
                        <TableCell className="border-r border-[#d0d7e3]">
                          {prefix}{isFinite(row.current) ? Math.round(Math.min(row.current, 999999999999)).toLocaleString() : 0}
                        </TableCell>
                        <TableCell className="border-r border-[#d0d7e3]">
                          {prefix}{isFinite(row.previous) ? Math.round(Math.min(row.previous, 999999999999)).toLocaleString() : 0}
                        </TableCell>
                        <TableCell className={row.current > row.previous ? "text-emerald-500" : "text-red-500"}>
                          {((row.current - row.previous) / row.previous * 100).toFixed(1)}%
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
} 