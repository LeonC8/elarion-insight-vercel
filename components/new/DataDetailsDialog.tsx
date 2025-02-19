"use client"

import * as React from "react"
import { Line, LineChart, CartesianGrid, XAxis, YAxis, Label, Pie, PieChart, Area, AreaChart } from "recharts"
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
  ChartLegendContent,
} from "@/components/ui/chart"
import { Maximize2, ArrowRight } from 'lucide-react'
import { Button } from "@/components/ui/button"
import { Dialog as FullScreenDialog } from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

interface PieChartData {
  name: string
  value: number
  percentage: number
  fill: string
}

interface TimeSeriesData {
  date: string
  current: number
  previous: number
}

export interface CategoryTimeSeriesData {
  date: string
  categories: {
    [key: string]: {
      current: number
      previous: number
    }
  }
}

interface DataDetailsDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  currentValue: number
  prefix?: string
  suffix?: string
  // Optional data for each section
  distributionData?: PieChartData[]
  categoryTimeSeriesData?: CategoryTimeSeriesData[]
  mainTimeSeriesData?: TimeSeriesData[]
  chartConfig?: ChartConfig
}

interface FullScreenTableProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  headers: string[]
  data: any[]
  renderRow: (row: any) => React.ReactNode
}

const categoryChartConfig = {
  room: {
    label: "Room Revenue",
    color: "hsl(152, 76.2%, 36.3%)",
  },
  fnb: {
    label: "F&B Revenue",
    color: "hsl(45, 93%, 47%)",
  },
  other: {
    label: "Other Revenue",
    color: "hsl(0, 84%, 92%)",
  },
} satisfies ChartConfig

const mainKpiConfig = {
  current: {
    label: "Current Period",
    color: "hsl(221.2 83.2% 53.3%)",
  },
  previous: {
    label: "Previous Period",
    color: "hsl(215 20.2% 65.1%)",
  },
} satisfies ChartConfig

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
  const numLength = Math.round(maxNumber).toString().replace(/,/g, '').length
  const marginMap: { [key: number]: number } = {
    3: -5,  // 100-999
    4: 3,   // 1,000-9,999
    5: 9,   // 10,000-99,999
    6: 18,  // 100,000-999,999
    7: 27   // 1,000,000-9,999,999
  }
  return marginMap[numLength] || 3
}

const getCategoriesLeftMargin = (data: CategoryTimeSeriesData[]) => {
  const maxNumber = Math.max(
    ...data.flatMap(item => 
      Object.values(item.categories).flatMap(cat => [cat.current, cat.previous])
    )
  )
  const numLength = Math.round(maxNumber).toString().replace(/,/g, '').length
  const marginMap: { [key: number]: number } = {
    3: -5,  // 100-999
    4: 3,   // 1,000-9,999
    5: 9,   // 10,000-99,999
    6: 18,  // 100,000-999,999
    7: 27   // 1,000,000-9,999,999
  }
  return marginMap[numLength] || 3
}

const calculateMainValue = (data: TimeSeriesData[], title: string) => {
  if (!data?.length) return 0
  
  const isPercentageMetric = ['Occupancy Rate'].includes(title)
  const isRateMetric = ['RevPAR', 'TRevPAR', 'ADR'].includes(title)
  
  if (isPercentageMetric || isRateMetric) {
    // Calculate average for percentage/rate metrics
    return data.reduce((sum, item) => sum + item.current, 0) / data.length
  }
  
  // Sum for other metrics
  return data.reduce((sum, item) => sum + item.current, 0)
}

type ChartDisplayMode = 'normal' | 'stacked';

export function DataDetailsDialog({ 
  open, 
  onOpenChange, 
  title,
  currentValue,
  prefix = "€",
  suffix = "",
  distributionData,
  categoryTimeSeriesData,
  mainTimeSeriesData,
  chartConfig = categoryChartConfig
}: DataDetailsDialogProps) {
  const [fullScreenTable, setFullScreenTable] = React.useState<{
    isOpen: boolean;
    type: 'main' | 'pie' | 'categories' | null;
  }>({
    isOpen: false,
    type: null
  });

  // New state for toggling visibility of main KPI series and categories in the overtime chart
  const [activeMainSeries, setActiveMainSeries] = React.useState<string[]>(['current', 'previous']);
  const [activeCategories, setActiveCategories] = React.useState<string[]>(Object.keys(chartConfig));
  // New state for toggling legend items for the pie chart distribution
  const [activePieLegends, setActivePieLegends] = React.useState<string[]>(distributionData ? distributionData.map(item => item.name) : []);
  const filteredDistributionData = React.useMemo(() => distributionData ? distributionData.filter(item => activePieLegends.includes(item.name)) : [], [distributionData, activePieLegends]);
  const filteredTotalValue = React.useMemo(() => filteredDistributionData.reduce((acc, item) => acc + item.value, 0), [filteredDistributionData]);
  
  const totalValue = React.useMemo(() => {
    return distributionData?.reduce((acc, curr) => acc + curr.value, 0) ?? 0
  }, [distributionData])

  const [categoryChartMode, setCategoryChartMode] = React.useState<ChartDisplayMode>('normal');

  const renderFullScreenTable = () => {
    if (!fullScreenTable.type) return null;

    switch (fullScreenTable.type) {
      case 'main':
        return mainTimeSeriesData ? (
          <FullScreenTable
            open={fullScreenTable.isOpen}
            onOpenChange={(open) => setFullScreenTable({ isOpen: open, type: open ? 'main' : null })}
            title={`${title} Over Time`}
            headers={['Month', 'Current Period', 'Previous Period', 'Change']}
            data={mainTimeSeriesData}
            renderRow={(row) => (
              <>
                <TableCell className="w-[25%] bg-[#f0f4fa]/40 border-r border-[#d0d7e3] text-left">
                  {row.date}
                </TableCell>
                <TableCell className="w-[25%] text-left border-r border-[#d0d7e3]">
                  {prefix}{row.current.toLocaleString()}
                </TableCell>
                <TableCell className="w-[25%] text-left border-r border-[#d0d7e3]">
                  {prefix}{row.previous.toLocaleString()}
                </TableCell>
                <TableCell className={`w-[25%] text-left ${row.current > row.previous ? "text-emerald-500" : "text-red-500"}`}>
                  {((row.current - row.previous) / row.previous * 100).toFixed(1)}%
                </TableCell>
              </>
            )}
          />
        ) : null;
      case 'pie':
        return distributionData ? (
          <FullScreenTable
            open={fullScreenTable.isOpen}
            onOpenChange={(open) => setFullScreenTable({ isOpen: open, type: open ? 'pie' : null })}
            title="Revenue Distribution"
            headers={['Category', 'Revenue', 'Percentage']}
            data={filteredDistributionData}
            renderRow={(row) => (
              <>
                <TableCell className="w-[40%] bg-[#f0f4fa]/40 border-r border-[#d0d7e3] text-left">
                  {row.name}
                </TableCell>
                <TableCell className="w-[30%] text-left border-r border-[#d0d7e3]">
                  {prefix}{row.value.toLocaleString()}
                </TableCell>
                <TableCell className="w-[30%] text-left">
                  {row.percentage}%
                </TableCell>
              </>
            )}
          />
        ) : null;
      case 'categories':
        return categoryTimeSeriesData ? (
          <FullScreenTable
            open={fullScreenTable.isOpen}
            onOpenChange={(open) => setFullScreenTable({ isOpen: open, type: open ? 'categories' : null })}
            title="Categories Over Time"
            headers={[
              'Month',
              ...Object.keys(chartConfig).flatMap(key => [
                `${String(chartConfig[key].label)} (Current)`,
                `${String(chartConfig[key].label)} (Prev)`
              ])
            ]}
            data={categoryTimeSeriesData}
            renderRow={(row) => (
              <>
                <TableCell className="w-[16%] bg-[#f0f4fa]/40 border-r border-[#d0d7e3] text-left">
                  {row.date}
                </TableCell>
                {Object.keys(chartConfig).map((categoryKey, index) => (
                  <React.Fragment key={categoryKey}>
                    <TableCell className="w-[14%] text-left border-r border-[#d0d7e3]">
                      {prefix}{row.categories[categoryKey].current.toLocaleString()}
                    </TableCell>
                    <TableCell className={`w-[14%] text-left ${index === Object.keys(chartConfig).length - 1 ? '' : 'border-r border-[#d0d7e3]'}`}>
                      {prefix}{row.categories[categoryKey].previous.toLocaleString()}
                    </TableCell>
                  </React.Fragment>
                ))}
              </>
            )}
          />
        ) : null;
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-6xl max-h-[90vh] flex flex-col p-0">
          <DialogHeader className="flex-none py-6 pb-2">
            <DialogTitle className="text-lg font-medium px-4 ">{title} Breakdown</DialogTitle>
          </DialogHeader>
          
          <div className="flex-1 overflow-y-auto pr-6 bg-[#f2f8ff] px-4 pb-4 pt-4">
            <div className="flex flex-col gap-6">

                {/* Main KPI Section */}
              {mainTimeSeriesData && (
                <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-300">
                  <div className="flex flex-col mb-10">
                    <span className="text-sm text-muted-foreground mb-3">{title}</span>
                    <span className="text-2xl font-bold">
                      {prefix}{Math.round(calculateMainValue(mainTimeSeriesData, title)).toLocaleString()}{suffix}
                    </span>
                  </div>
                  
                  <ChartContainer config={mainKpiConfig}>
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
                        <linearGradient id="mainGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor={mainKpiConfig.current.color} stopOpacity={0.1}/>
                          <stop offset="100%" stopColor={mainKpiConfig.current.color} stopOpacity={0.1}/>
                        </linearGradient>
                        <linearGradient id="previousGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor={mainKpiConfig.previous.color} stopOpacity={0.05}/>
                          <stop offset="100%" stopColor={mainKpiConfig.previous.color} stopOpacity={0.05}/>
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
                      {/* Conditionally render the "previous" and "current" areas */}
                      {activeMainSeries.includes("previous") && (
                        <Area
                          type="monotone"
                          dataKey="previous"
                          stroke={mainKpiConfig.previous.color}
                          strokeDasharray="4 4"
                          fill="url(#previousGradient)"
                          dot={false}
                          strokeWidth={2}
                        />
                      )}
                      {activeMainSeries.includes("current") && (
                        <Area
                          type="monotone"
                          dataKey="current"
                          stroke={mainKpiConfig.current.color}
                          fill="url(#mainGradient)"
                          dot={false}
                          strokeWidth={2}
                        />
                      )}
                      {/* Custom legend with toggle functionality */}
                      <ChartLegend 
                        className="mt-6" 
                        content={() => (
                          <div className="flex justify-center gap-3 pt-12">
                            {Object.keys(mainKpiConfig).map((key) => (
                              <div
                                key={key}
                                onClick={() => {
                                  if (activeMainSeries.includes(key)) {
                                    setActiveMainSeries(activeMainSeries.filter(item => item !== key))
                                  } else {
                                    setActiveMainSeries([...activeMainSeries, key])
                                  }
                                }}
                                className={`cursor-pointer bg-[#f0f4fa] px-4 py-2 rounded-full border border-[#e5eaf3] flex items-center gap-2 ${activeMainSeries.includes(key) ? '' : 'opacity-50'}`}
                              >
                                <div style={{ backgroundColor: mainKpiConfig[key].color }} className="w-3 h-3 rounded-full" />
                                <span className="text-sm font-medium">{mainKpiConfig[key].label}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      />
                    </AreaChart>
                  </ChartContainer>
                  <div className="mt-6 pt-4 border-t border-gray-200">
                    <div className="flex justify-end">
                      <Button
                        variant="ghost"
                        className="text-blue-600 hover:text-blue-800 font-medium text-sm flex items-center gap-2"
                        onClick={() => setFullScreenTable({ isOpen: true, type: 'main' })}
                      >
                        View Details
                        <ArrowRight className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              )}


              {/* Distribution Section */}
              {distributionData && (
                <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-300">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-medium">Distribution</h3>
                  </div>

                  <div className="flex items-start">
                    <ChartContainer config={categoryChartConfig} className="w-[60%] h-[300px]">
                      <PieChart>
                        <ChartTooltip content={<ChartTooltipContent hideLabel />} />
                        <Pie
                          data={filteredDistributionData}
                          dataKey="value"
                          nameKey="name"
                          innerRadius={80}
                          outerRadius={120}
                          paddingAngle={2}
                        >
                          <Label
                            content={({ viewBox }) => {
                              if (viewBox && "cx" in viewBox && "cy" in viewBox) {
                                return (
                                  <text
                                    x={viewBox.cx}
                                    y={viewBox.cy}
                                    textAnchor="middle"
                                    dominantBaseline="middle"
                                  >
                                    <tspan
                                      x={viewBox.cx}
                                      y={viewBox.cy}
                                      className="fill-foreground text-3xl font-bold"
                                    >
                                      {prefix}{filteredTotalValue}
                                    </tspan>
                                    <tspan
                                      x={viewBox.cx}
                                      y={(viewBox.cy || 0) + 24}
                                      className="fill-muted-foreground text-sm"
                                    >
                                      Total Value
                                    </tspan>
                                  </text>
                                )
                              }
                            }}
                          />
                        </Pie>
                      </PieChart>
                    </ChartContainer>
                    
                    <div className="w-[40%] pl-8 pt-8">
                      <div className="flex flex-col gap-4">
                        {distributionData.map((item) => (
                          <div 
                            key={item.name}
                            onClick={() => {
                              if (activePieLegends.includes(item.name)) {
                                setActivePieLegends(activePieLegends.filter(x => x !== item.name))
                              } else {
                                setActivePieLegends([...activePieLegends, item.name])
                              }
                            }}
                            className={`cursor-pointer flex items-center justify-between gap-2 bg-[#f0f4fa] px-4 py-2.5 rounded-full border border-[#e5eaf3] ${activePieLegends.includes(item.name) ? '' : 'opacity-50'}`}
                          >
                            <div className="flex items-center gap-2">
                              <div 
                                className="w-3 h-3 rounded-full"
                                style={{ backgroundColor: item.fill }}
                              />
                              <span className="text-sm font-medium">
                                {item.name}: {item.value} ({item.percentage}%)
                              </span>
                            </div>
                            <span className="text-emerald-500 text-sm">
                              ↑ {Math.floor(Math.random() * 500 + 300)}%
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="mt-6 pt-4 border-t border-gray-200">
                    <div className="flex justify-end">
                      <Button
                        variant="ghost"
                        className="text-blue-600 hover:text-blue-800 font-medium text-sm flex items-center gap-2"
                        onClick={() => setFullScreenTable({ isOpen: true, type: 'pie' })}
                      >
                        View Details
                        <ArrowRight className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              )}

              {/* Categories Over Time Section */}
              {categoryTimeSeriesData && (
                <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-300">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-medium">Categories Over Time</h3>
                    <Select
                      value={categoryChartMode}
                      onValueChange={(value: ChartDisplayMode) => setCategoryChartMode(value)}
                    >
                      <SelectTrigger className="w-[140px] bg-[#f2f8ff] hover:bg-[#f2f8ff] text-[#342630] rounded-full border-0">
                        <SelectValue placeholder="Select view" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="normal">Normal View</SelectItem>
                        <SelectItem value="stacked">Stacked View</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <ChartContainer config={chartConfig}>
                    <AreaChart
                      data={categoryTimeSeriesData}
                      height={300}
                      margin={{
                        top: 10,
                        right: 10,
                        bottom: 20,
                        left: getCategoriesLeftMargin(categoryTimeSeriesData),
                      }}
                    >
                      <defs>
                        {Object.keys(chartConfig).map((categoryKey) => (
                          <React.Fragment key={categoryKey}>
                            <linearGradient id={`gradient-${categoryKey}`} x1="0" y1="0" x2="0" y2="1">
                              <stop offset="0%" stopColor={chartConfig[categoryKey].color} stopOpacity={0.1}/>
                              <stop offset="100%" stopColor={chartConfig[categoryKey].color} stopOpacity={0.1}/>
                            </linearGradient>
                            <linearGradient id={`gradient-${categoryKey}-previous`} x1="0" y1="0" x2="0" y2="1">
                              <stop offset="0%" stopColor={chartConfig[categoryKey].color} stopOpacity={0.05}/>
                              <stop offset="100%" stopColor={chartConfig[categoryKey].color} stopOpacity={0.05}/>
                            </linearGradient>
                          </React.Fragment>
                        ))}
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
                      <ChartTooltip 
                        content={({ active, payload, label }) => {
                          if (active && payload && payload.length) {
                            const stackedTotal = categoryChartMode === 'stacked' 
                              ? payload.reduce((sum, entry) => sum + (entry.value as number), 0)
                              : null;
                            
                            return (
                              <div className="bg-white p-4 border border-gray-200 shadow-lg rounded-lg">
                                <p className="font-medium mb-2">{label}</p>
                                {Object.keys(chartConfig).map(categoryKey => {
                                  const entry = payload.find(p => p.dataKey === `categories.${categoryKey}.current`)
                                  if (!entry) return null
                                  return (
                                    <div key={categoryKey} className="mb-2">
                                      <p className="font-medium" style={{ color: chartConfig[categoryKey].color }}>
                                        {chartConfig[categoryKey].label}
                                      </p>
                                      <p className="text-sm">
                                        {prefix}{Number(entry.value).toLocaleString()}
                                        {stackedTotal && ` (${((entry.value as number) / stackedTotal * 100).toFixed(1)}%)`}
                                      </p>
                                    </div>
                                  )
                                })}
                                {stackedTotal && (
                                  <div className="mt-2 pt-2 border-t border-gray-200">
                                    <p className="font-medium">Total</p>
                                    <p className="text-sm">{prefix}{stackedTotal.toLocaleString()}</p>
                                  </div>
                                )}
                              </div>
                            )
                          }
                          return null
                        }}
                      />
                      {/* Render areas based on chart mode */}
                      {Object.keys(chartConfig).map((categoryKey) => (
                        activeCategories.includes(categoryKey) && (
                          <Area
                            key={categoryKey}
                            type="monotone"
                            dataKey={`categories.${categoryKey}.current`}
                            stroke={chartConfig[categoryKey].color}
                            fill={chartConfig[categoryKey].color}
                            fillOpacity={0.4}
                            strokeWidth={2}
                            dot={false}
                            name={String(chartConfig[categoryKey].label)}
                            stackId={categoryChartMode === 'stacked' ? "1" : undefined}
                          />
                        )
                      ))}
                      {/* Keep the existing legend code */}
                      <ChartLegend 
                        content={() => (
                          <div className="flex flex-wrap justify-center gap-3 mt-4">
                            {Object.keys(chartConfig).map((key) => (
                              <div
                                key={key}
                                onClick={() => {
                                  if (activeCategories.includes(key)) {
                                    setActiveCategories(activeCategories.filter(item => item !== key))
                                  } else {
                                    setActiveCategories([...activeCategories, key])
                                  }
                                }}
                                className={`cursor-pointer bg-[#f0f4fa] px-4 py-2 rounded-full border border-[#e5eaf3] flex items-center gap-2 ${activeCategories.includes(key) ? '' : 'opacity-50'}`}
                              >
                                <div style={{ backgroundColor: chartConfig[key].color }} className="w-3 h-3 rounded-full" />
                                <span className="text-sm font-medium">{chartConfig[key].label}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      />
                    </AreaChart>
                  </ChartContainer>
                  <div className="mt-6 pt-4 border-t border-gray-200">
                    <div className="flex justify-end">
                      <Button
                        variant="ghost"
                        className="text-blue-600 hover:text-blue-800 font-medium text-sm flex items-center gap-2"
                        onClick={() => setFullScreenTable({ isOpen: true, type: 'categories' })}
                      >
                        View Details
                        <ArrowRight className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              )}

              {/* Categories Distribution Over Time Section */}
              {/* {categoryTimeSeriesData && (
                <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-300">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-medium">Categories Distribution Over Time</h3>
                  </div>

                  <ChartContainer config={chartConfig}>
                    <AreaChart
                      data={categoryTimeSeriesData}
                      height={300}
                      stackOffset="expand"
                      margin={{
                        top: 10,
                        right: 10,
                        bottom: 20,
                        left: 30,
                      }}
                    >
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
                        tickFormatter={(value) => `${(value * 100).toFixed(0)}%`}
                        tickMargin={8}
                        width={45}
                      />
                      <ChartTooltip 
                        content={({ active, payload, label }) => {
                          if (active && payload && payload.length) {
                            const total = payload.reduce((sum, entry) => sum + (entry.value as number), 0)
                            return (
                              <div className="bg-white p-4 border border-gray-200 shadow-lg rounded-lg">
                                <p className="font-medium mb-2">{label}</p>
                                {Object.keys(chartConfig).map(categoryKey => {
                                  const entry = payload.find(p => p.dataKey === `categories.${categoryKey}.current`)
                                  if (!entry) return null
                                  const percentage = ((entry.value as number) / total * 100).toFixed(1)
                                  return (
                                    <div key={categoryKey} className="mb-2">
                                      <p className="font-medium" style={{ color: chartConfig[categoryKey].color }}>
                                        {chartConfig[categoryKey].label}
                                      </p>
                                      <p className="text-sm">
                                        {prefix}{Number(entry.value).toLocaleString()} ({percentage}%)
                                      </p>
                                    </div>
                                  )
                                })}
                              </div>
                            )
                          }
                          return null
                        }}
                      />
                      {Object.keys(chartConfig).map((categoryKey) => (
                        activeCategories.includes(categoryKey) && (
                          <Area
                            key={categoryKey}
                            type="monotone"
                            dataKey={`categories.${categoryKey}.current`}
                            stroke={chartConfig[categoryKey].color}
                            fill={chartConfig[categoryKey].color}
                            stackId="1"
                            fillOpacity={0.4}
                            strokeWidth={1}
                            dot={false}
                            name={String(chartConfig[categoryKey].label)}
                          />
                        )
                      ))}
                      <ChartLegend 
                        content={() => (
                          <div className="flex flex-wrap justify-center gap-3 mt-4">
                            {Object.keys(chartConfig).map((key) => (
                              <div
                                key={key}
                                onClick={() => {
                                  if (activeCategories.includes(key)) {
                                    setActiveCategories(activeCategories.filter(item => item !== key))
                                  } else {
                                    setActiveCategories([...activeCategories, key])
                                  }
                                }}
                                className={`cursor-pointer bg-[#f0f4fa] px-4 py-2 rounded-full border border-[#e5eaf3] flex items-center gap-2 ${activeCategories.includes(key) ? '' : 'opacity-50'}`}
                              >
                                <div style={{ backgroundColor: chartConfig[key].color }} className="w-3 h-3 rounded-full" />
                                <span className="text-sm font-medium">{chartConfig[key].label}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      />
                    </AreaChart>
                  </ChartContainer>
                </div>
              )} */}

            </div>
          </div>
        </DialogContent>
      </Dialog>
      {renderFullScreenTable()}
    </>
  )
} 