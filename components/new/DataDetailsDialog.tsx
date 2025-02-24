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
import { Maximize2, ArrowRight, ArrowUpIcon, ArrowDownIcon } from 'lucide-react'
import { Button } from "@/components/ui/button"
import { Dialog as FullScreenDialog } from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

// Add the custom TriangleDown icon component – same as in TopFive component
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
  );
}

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

// Add new type for KPI selection
type KPIType = 'revenue' | 'roomsSold' | 'adr';

// Add new interface for the table data
interface TableData {
  category: string;
  revenue: number;
  roomsSold: number;
  adr: number;
}

// Add this helper function at the top level
const calculateSummaryValue = (data: TimeSeriesData[], title: string) => {
  if (!data?.length) return { value: 0, change: 0 };
  
  const isSum = title.toLowerCase().includes('revenue') || title.toLowerCase().includes('sold');
  
  const currentValue = isSum 
    ? data.reduce((sum, item) => sum + item.current, 0)
    : data.reduce((sum, item) => sum + item.current, 0) / data.length;
    
  const previousValue = isSum
    ? data.reduce((sum, item) => sum + item.previous, 0)
    : data.reduce((sum, item) => sum + item.previous, 0) / data.length;
    
  const percentageChange = ((currentValue - previousValue) / previousValue) * 100;
  
  return {
    value: currentValue,
    change: percentageChange
  };
};

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

  // Add new states for KPI selection
  const [selectedPieKPI, setSelectedPieKPI] = React.useState<'revenue' | 'roomsSold'>('revenue');
  const [selectedCategoryKPI, setSelectedCategoryKPI] = React.useState<KPIType>('revenue');

  // Calculate rooms sold data (assuming €150 per room)
  const ROOM_RATE = 150;
  const calculateRoomsSold = (revenue: number) => Math.ceil(revenue / ROOM_RATE);
  
  // Calculate ADR
  const calculateADR = (revenue: number, roomsSold: number) => 
    roomsSold > 0 ? revenue / roomsSold : 0;

  // Transform distribution data based on selected KPI
  const transformedDistributionData = React.useMemo(() => {
    if (!distributionData) return [];
    
    return distributionData.map(item => ({
      ...item,
      value: selectedPieKPI === 'revenue' ? 
        item.value : 
        calculateRoomsSold(item.value)
    }));
  }, [distributionData, selectedPieKPI]);

  // Transform category time series data based on selected KPI
  const transformedCategoryData = React.useMemo(() => {
    if (!categoryTimeSeriesData) return [];

    return categoryTimeSeriesData.map(item => ({
      ...item,
      categories: Object.entries(item.categories).reduce((acc, [key, value]) => {
        const roomsSold = calculateRoomsSold(value.current);
        const prevRoomsSold = calculateRoomsSold(value.previous);
        
        return {
          ...acc,
          [key]: {
            current: selectedCategoryKPI === 'revenue' ? 
              value.current : 
              selectedCategoryKPI === 'roomsSold' ? 
                roomsSold :
                calculateADR(value.current, roomsSold),
            previous: selectedCategoryKPI === 'revenue' ? 
              value.previous : 
              selectedCategoryKPI === 'roomsSold' ? 
                prevRoomsSold :
                calculateADR(value.previous, prevRoomsSold)
          }
        };
      }, {})
    }));
  }, [categoryTimeSeriesData, selectedCategoryKPI]);

  // Generate table data
  const tableData: TableData[] = React.useMemo(() => {
    if (!distributionData) return [];

    return distributionData.map(item => {
      const roomsSold = calculateRoomsSold(item.value);
      return {
        category: item.name,
        revenue: item.value,
        roomsSold,
        adr: calculateADR(item.value, roomsSold)
      };
    });
  }, [distributionData]);

  // Add state for main time series chart
  const [activeMainTimeSeriesLines, setActiveMainTimeSeriesLines] = React.useState<string[]>(['current', 'previous']);

  const mainTimeSeriesConfig = {
    current: {
      label: "Current Period",
      color: "hsl(221.2 83.2% 53.3%)",
    },
    previous: {
      label: "Previous Period",
      color: "hsl(215 20.2% 65.1%)",
    },
  } satisfies ChartConfig;

  // Check if only mainTimeSeriesData is present
  const isOnlyMainTimeSeries = mainTimeSeriesData && !distributionData && !categoryTimeSeriesData;

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

  // Add this effect to switch to normal view when ADR is selected
  React.useEffect(() => {
    if (selectedCategoryKPI === 'adr' && categoryChartMode === 'stacked') {
      setCategoryChartMode('normal');
    }
  }, [selectedCategoryKPI]);

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className={`${
          isOnlyMainTimeSeries ? 'max-w-[45vw]' : 'max-w-[90vw]'
        } max-h-[90vh] flex flex-col p-0`}>
          <DialogHeader className="flex-none py-6 pb-2" showBorder={true}>
            <DialogTitle className="text-lg font-medium px-4">{title} Breakdown</DialogTitle>
          </DialogHeader>
          
          <div className="flex-1 overflow-y-auto pr-6 bg-[#f2f8ff] px-4 pb-4 pt-4">
            <div className="flex flex-col gap-6">
              {/* Main Time Series Section */}
              {mainTimeSeriesData && (
                <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-300">
                  <h3 className="text-base mb-2 font-medium text-sm text-muted-foreground mb-4">
                    {title}
                  </h3>
                  
                  {/* Add Summary Section */}
                  {(() => {
                    const summary = calculateSummaryValue(mainTimeSeriesData, title);
                    const isPositive = summary.change > 0;
                    return (
                      <div className="flex items-end gap-3 mb-10">
                        <span className="text-2xl font-bold leading-none">
                          {prefix}{Math.round(summary.value).toLocaleString()}
                        </span>
                        <span className={`text-sm -translate-y-[1px] px-2 py-0.5 rounded ${
                          isPositive 
                            ? 'text-green-600 bg-green-100/50 border border-green-600' 
                            : 'text-red-600 bg-red-100/50 border border-red-600'
                        } leading-none`}>
                          {isPositive ? '+' : ''}{Math.round(summary.change * 10) / 10}% 
                        </span>
                      </div>
                    );
                  })()}

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
                            {Object.keys(mainTimeSeriesConfig).map((key) => (
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
                                <div style={{ backgroundColor: mainTimeSeriesConfig[key].color }} className="w-2 h-2 rounded-full" />
                                <span className="text-xs text-gray-500 font-medium">{mainTimeSeriesConfig[key].label}</span>
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

              {/* Only render these sections if not only main time series */}
              {!isOnlyMainTimeSeries && (
                <>
                  {/* Top Categories Section - Only show if either distribution or category data exists */}
                  {(distributionData || categoryTimeSeriesData) && (
                    <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-300">
                      <h3 className="text-lg font-medium mb-4 text-center">Top Categories</h3>
                      
                      {/* Categories Legend - restore background */}
                      <div className="flex justify-center gap-3 mb-6">
                        {Object.keys(chartConfig).map((key) => (
                          <div
                            key={key}
                            onClick={() => {
                              if (activeCategories.includes(key)) {
                                setActiveCategories(activeCategories.filter(item => item !== key));
                                setActivePieLegends(activePieLegends.filter(item => 
                                  item !== chartConfig[key].label
                                ));
                              } else {
                                setActiveCategories([...activeCategories, key]);
                                setActivePieLegends([...activePieLegends, 
                                  chartConfig[key].label
                                ]);
                              }
                            }}
                            className={`cursor-pointer bg-[#f2f8ff] px-4 py-2 rounded-full border border-[#e5eaf3] flex items-center gap-2 ${
                              activeCategories.includes(key) ? '' : 'opacity-50'
                            }`}
                          >
                            <div 
                              style={{ backgroundColor: chartConfig[key].color }} 
                              className="w-3 h-3 rounded-full" 
                            />
                            <span className="text-sm font-medium">
                              {chartConfig[key].label}
                            </span>
                          </div>
                        ))}
                      </div>

                      {/* Charts Grid - update background color */}
                      <div className="grid grid-cols-2 gap-6">
                        {/* Pie Chart Section */}
                        {distributionData && (
                          <div className="bg-[#f2f8ff] rounded-lg p-6 border border-gray-300">
                            <div className="flex justify-between items-center mb-4">
                              <h3 className="text-lg font-medium">Distribution</h3>
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button 
                                    variant="ghost" 
                                    size="sm"
                                    className="bg-[#f2f8ff] hover:bg-[#f2f8ff] text-[#342630] rounded-full px-4 font-semibold whitespace-nowrap"
                                  >
                                    {selectedPieKPI === 'revenue' ? 'Revenue' : 'Rooms Sold'}
                                    <TriangleDown className="ml-3" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuItem onClick={() => setSelectedPieKPI('revenue')}>
                                    Revenue
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => setSelectedPieKPI('roomsSold')}>
                                    Rooms Sold
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </div>
                            
                            <div className="flex flex-col items-center">
                              <ChartContainer config={chartConfig} className="w-full flex justify-center">
                                <PieChart width={400} height={300}>
                                  <ChartTooltip content={<ChartTooltipContent hideLabel />} />
                                  <Pie
                                    data={transformedDistributionData.filter(d => 
                                      activePieLegends.includes(d.name)
                                    )}
                                    dataKey="value"
                                    nameKey="name"
                                    innerRadius={80}
                                    outerRadius={120}
                                    paddingAngle={2}
                                    cx="50%"
                                    cy="50%"
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
                                                className="fill-foreground text-2xl font-bold"
                                              >
                                                {selectedPieKPI === 'revenue' ? prefix : ''}{filteredTotalValue.toLocaleString()}
                                              </tspan>
                                              <tspan
                                                x={viewBox.cx}
                                                y={(viewBox.cy || 0) + 24}
                                                className="fill-muted-foreground text-sm"
                                              >
                                                Total {selectedPieKPI === 'revenue' ? 'Revenue' : 'Rooms'}
                                              </tspan>
                                            </text>
                                          )
                                        }
                                      }}
                                    />
                                  </Pie>
                                </PieChart>
                              </ChartContainer>

                              <div className="w-full grid grid-cols-2 gap-3 mt-6">
                                {transformedDistributionData.map((item) => (
                                  <div 
                                    key={item.name}
                                    className="flex items-center justify-between px-4 py-3 rounded-lg"
                                  >
                                    <div className="flex items-center gap-2">
                                      <div 
                                        className="w-3 h-3 rounded-full"
                                        style={{ backgroundColor: item.fill }}
                                      />
                                      <span className="text-sm text-gray-700">
                                        {item.name}: {selectedPieKPI === 'revenue' ? prefix : ''}{item.value.toLocaleString()} ({item.percentage}%)
                                      </span>
                                    </div>
                                    <span className="text-emerald-500 text-sm flex items-center">
                                      <ArrowUpIcon className="h-4 w-4 mr-1" />
                                      {Math.floor(Math.random() * 500 + 200)}%
                                    </span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Categories Over Time Section */}
                        {categoryTimeSeriesData && (
                          <div className="bg-[#f2f8ff] rounded-lg p-6 border border-gray-300">
                            <div className="flex justify-between items-center mb-12">
                              <h3 className="text-lg font-medium">Categories Over Time</h3>
                              <div className="flex items-center gap-3">
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <Button 
                                      variant="ghost" 
                                      size="sm"
                                      className="bg-[#f2f8ff] hover:bg-[#f2f8ff] text-[#342630] rounded-full px-4 font-semibold whitespace-nowrap"
                                    >
                                      {categoryChartMode === 'normal' ? 'Normal View' : 'Stacked View'}
                                      <TriangleDown className="ml-3" />
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end">
                                    <DropdownMenuItem onClick={() => setCategoryChartMode('normal')}>
                                      Normal View
                                    </DropdownMenuItem>
                                    <DropdownMenuItem 
                                      onClick={() => setCategoryChartMode('stacked')}
                                      className={selectedCategoryKPI === 'adr' ? 'opacity-50 cursor-not-allowed' : ''}
                                      disabled={selectedCategoryKPI === 'adr'}
                                    >
                                      Stacked View
                                    </DropdownMenuItem>
                                  </DropdownMenuContent>
                                </DropdownMenu>
                                
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <Button 
                                      variant="ghost" 
                                      size="sm"
                                      className="bg-[#f2f8ff] hover:bg-[#f2f8ff] text-[#342630] rounded-full px-4 font-semibold whitespace-nowrap"
                                    >
                                      {selectedCategoryKPI === 'revenue' ? 'Revenue' : 
                                       selectedCategoryKPI === 'roomsSold' ? 'Rooms Sold' : 'ADR'}
                                      <TriangleDown className="ml-3" />
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end">
                                    <DropdownMenuItem onClick={() => setSelectedCategoryKPI('revenue')}>
                                      Revenue
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => setSelectedCategoryKPI('roomsSold')}>
                                      Rooms Sold
                                    </DropdownMenuItem>
                                    <DropdownMenuItem 
                                      onClick={() => {
                                        setSelectedCategoryKPI('adr');
                                        setCategoryChartMode('normal'); // Force normal view when selecting ADR
                                      }}
                                    >
                                      ADR
                                    </DropdownMenuItem>
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              </div>
                            </div>

                            <ChartContainer config={chartConfig}>
                              <AreaChart
                                data={transformedCategoryData}
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
                              </AreaChart>
                            </ChartContainer>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Table Section */}
                  {distributionData && (
                    <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-300">
                      <div className="flex justify-between items-center mb-4">
                        <h3 className="text-lg font-medium">All categories</h3>
                      </div>
                      
                      <div className="border rounded-lg">
                        <Table>
                          <TableHeader>
                            <TableRow className="hover:bg-transparent">
                              <TableHead className="bg-[#f0f4fa]/60 w-[16%]">Category</TableHead>
                              {/* Revenue Columns */}
                              <TableHead className="bg-[#f0f4fa]/60 text-right">Revenue CY</TableHead>
                              <TableHead className="bg-[#f0f4fa]/60 text-right">Revenue LY</TableHead>
                              <TableHead className="bg-[#f0f4fa]/60 text-right">Change</TableHead>
                              {/* Rooms Sold Columns */}
                              <TableHead className="bg-[#f0f4fa]/60 text-right">Rooms Sold CY</TableHead>
                              <TableHead className="bg-[#f0f4fa]/60 text-right">Rooms Sold LY</TableHead>
                              <TableHead className="bg-[#f0f4fa]/60 text-right">Change</TableHead>
                              {/* ADR Columns */}
                              <TableHead className="bg-[#f0f4fa]/60 text-right">ADR CY</TableHead>
                              <TableHead className="bg-[#f0f4fa]/60 text-right">ADR LY</TableHead>
                              <TableHead className="bg-[#f0f4fa]/60 text-right">Change</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {tableData.map((row, index) => {
                              // Generate random previous period values for demo
                              const previousPeriod = {
                                revenue: row.revenue * (1 - Math.random() * 0.5), // 50-100% of current
                                roomsSold: row.roomsSold * (1 - Math.random() * 0.5),
                                adr: row.adr * (1 - Math.random() * 0.5)
                              };
                              
                              // Calculate changes
                              const changes = {
                                revenue: ((row.revenue - previousPeriod.revenue) / previousPeriod.revenue) * 100,
                                roomsSold: ((row.roomsSold - previousPeriod.roomsSold) / previousPeriod.roomsSold) * 100,
                                adr: ((row.adr - previousPeriod.adr) / previousPeriod.adr) * 100
                              };
                              
                              return (
                                <TableRow key={index}>
                                  <TableCell className="font-medium">{row.category}</TableCell>
                                  
                                  {/* Revenue Cells */}
                                  <TableCell className="text-right">
                                    {prefix}{row.revenue.toLocaleString()}
                                  </TableCell>
                                  <TableCell className="text-right">
                                    {prefix}{Math.round(previousPeriod.revenue).toLocaleString()}
                                  </TableCell>
                                  <TableCell className="text-right">
                                    <span className={`flex items-center justify-end ${changes.revenue >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                                      {changes.revenue >= 0 ? (
                                        <ArrowUpIcon className="h-4 w-4 mr-1" />
                                      ) : (
                                        <ArrowDownIcon className="h-4 w-4 mr-1" />
                                      )}
                                      {Math.abs(changes.revenue).toFixed(1)}%
                                    </span>
                                  </TableCell>

                                  {/* Rooms Sold Cells */}
                                  <TableCell className="text-right">
                                    {row.roomsSold.toLocaleString()}
                                  </TableCell>
                                  <TableCell className="text-right">
                                    {Math.round(previousPeriod.roomsSold).toLocaleString()}
                                  </TableCell>
                                  <TableCell className="text-right">
                                    <span className={`flex items-center justify-end ${changes.roomsSold >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                                      {changes.roomsSold >= 0 ? (
                                        <ArrowUpIcon className="h-4 w-4 mr-1" />
                                      ) : (
                                        <ArrowDownIcon className="h-4 w-4 mr-1" />
                                      )}
                                      {Math.abs(changes.roomsSold).toFixed(1)}%
                                    </span>
                                  </TableCell>

                                  {/* ADR Cells */}
                                  <TableCell className="text-right">
                                    {prefix}{row.adr.toFixed(2)}
                                  </TableCell>
                                  <TableCell className="text-right">
                                    {prefix}{previousPeriod.adr.toFixed(2)}
                                  </TableCell>
                                  <TableCell className="text-right">
                                    <span className={`flex items-center justify-end ${changes.adr >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                                      {changes.adr >= 0 ? (
                                        <ArrowUpIcon className="h-4 w-4 mr-1" />
                                      ) : (
                                        <ArrowDownIcon className="h-4 w-4 mr-1" />
                                      )}
                                      {Math.abs(changes.adr).toFixed(1)}%
                                    </span>
                                  </TableCell>
                                </TableRow>
                              );
                            })}
                          </TableBody>
                        </Table>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
      {renderFullScreenTable()}
    </>
  )
} 