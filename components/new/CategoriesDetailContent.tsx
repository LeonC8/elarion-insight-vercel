"use client"

import * as React from "react"
import { Line, LineChart, CartesianGrid, XAxis, YAxis, Label, Pie, PieChart, Area, AreaChart, BarChart, Bar } from "recharts"
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
} from "@/components/ui/chart"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Card, CardHeader, CardContent } from "@/components/ui/card"
import { Cell } from "recharts"
import { ArrowUpIcon, ArrowDownIcon, ChevronLeftIcon, ChevronRightIcon } from 'lucide-react'

// Type definitions for our configurable data model
type ChartType = 'pie' | 'bar'
type ChartDisplayMode = 'normal' | 'stacked'

interface Category {
  id: string
  name: string
  color: string
}

interface DatasetConfig {
  id: string
  name: string
  unit: string
  prefix?: string
  suffix?: string
  chartTypes: {
    pie: boolean
    bar: boolean
    stacked: boolean
  }
}

interface PieChartData {
  categoryId: string
  value: number
  percentage: number
}

interface TimeSeriesPoint {
  date: string
  values: {
    [categoryId: string]: {
      current: number
      previous: number
    }
  }
}

interface TableDataRow {
  categoryId: string
  metrics: {
    [datasetId: string]: {
      current: number
      previous: number
      change: number
    }
  }
}

interface CategoryDataResponse {
  categories: Category[]
  datasets: DatasetConfig[]
  pieData: {
    [datasetId: string]: PieChartData[]
  }
  timeSeriesData: {
    [datasetId: string]: TimeSeriesPoint[]
  }
  tableData: TableDataRow[]
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

interface CategoriesDetailContentProps {
  title: string
  apiUrl?: string
  categories?: Record<string, { label: string, color: string }>
  prefix?: string
}

export function CategoriesDetailContent({ 
  title,
  apiUrl = '/api/booking-channels/categories-detail',
  categories,
  prefix
}: CategoriesDetailContentProps) {
  // State management for data
  const [data, setData] = React.useState<CategoryDataResponse | null>(null)
  const [isLoading, setIsLoading] = React.useState(true)
  
  // State for selected datasets and chart types
  const [selectedDistributionDataset, setSelectedDistributionDataset] = React.useState<string>('revenue')
  const [selectedTimeSeriesDataset, setSelectedTimeSeriesDataset] = React.useState<string>('revenue')
  const [distributionChartType, setDistributionChartType] = React.useState<ChartType>('pie')
  const [timeSeriesMode, setTimeSeriesMode] = React.useState<ChartDisplayMode>('normal')
  
  // State for active categories
  const [activeDistributionCategories, setActiveDistributionCategories] = React.useState<string[]>([])
  const [activeTimeSeriesCategories, setActiveTimeSeriesCategories] = React.useState<string[]>([])

  // Add ref for table container to enable scrolling
  const tableContainerRef = React.useRef<HTMLDivElement>(null)
  
  // Add new state for shadow
  const [showRightShadow, setShowRightShadow] = React.useState(true)

  // Function to handle horizontal scrolling
  const scrollTable = (direction: 'left' | 'right') => {
    if (tableContainerRef.current) {
      const container = tableContainerRef.current
      const scrollAmount = 200 // Adjust scroll amount as needed
      
      if (direction === 'left') {
        container.scrollBy({ left: -scrollAmount, behavior: 'smooth' })
      } else {
        container.scrollBy({ left: scrollAmount, behavior: 'smooth' })
      }
    }
  }

  // Function to check scroll position and update shadow
  const handleScroll = React.useCallback(() => {
    if (tableContainerRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = tableContainerRef.current
      // Show shadow if not scrolled to the end (with small buffer for rounding)
      setShowRightShadow(Math.ceil(scrollLeft + clientWidth) < scrollWidth - 1)
    }
  }, [])

  // Add scroll event listener
  React.useEffect(() => {
    const container = tableContainerRef.current
    if (container) {
      container.addEventListener('scroll', handleScroll)
      // Initial check
      handleScroll()
    }
    return () => {
      if (container) {
        container.removeEventListener('scroll', handleScroll)
      }
    }
  }, [handleScroll])

  // Fetch data on component mount
  React.useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true)
      try {
        const response = await fetch(apiUrl)
        if (!response.ok) {
          throw new Error('Failed to fetch data')
        }
        const responseData = await response.json()
        setData(responseData)
        
        // Initialize active categories
        if (responseData.categories) {
          const categoryIds = responseData.categories.map((cat: Category) => cat.id)
          setActiveDistributionCategories(categoryIds)
          setActiveTimeSeriesCategories(categoryIds)
          
          // Set default dataset based on availability
          if (responseData.datasets) {
            const availableDatasets = responseData.datasets
            const defaultDistDataset = availableDatasets.find((d: DatasetConfig) => 
              d.chartTypes.pie || d.chartTypes.bar)?.id || 'revenue'
            const defaultTimeDataset = availableDatasets.find((d: DatasetConfig) => 
              true)?.id || 'revenue'
            
            setSelectedDistributionDataset(defaultDistDataset)
            setSelectedTimeSeriesDataset(defaultTimeDataset)
          }
        }
      } catch (error) {
        console.error('Error fetching category detail data:', error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchData()
  }, [apiUrl])

  // Prepare distribution chart data
  const distributionChartData = React.useMemo(() => {
    if (!data || !data.pieData || !selectedDistributionDataset) return []
    
    const pieData = data.pieData[selectedDistributionDataset] || []
    
    return pieData
      .filter(item => activeDistributionCategories.includes(item.categoryId))
      .map(item => {
        const category = data.categories.find(c => c.id === item.categoryId)
        return {
          ...item,
          name: category?.name || item.categoryId,
          fill: category?.color,
          // For pie chart we need both name and value
          value: item.value,
          // For backward compatibility
          categoryId: item.categoryId,
        }
      })
  }, [data, selectedDistributionDataset, activeDistributionCategories])

  // Calculate total for pie chart center
  const distributionTotal = React.useMemo(() => 
    distributionChartData.reduce((acc, item) => acc + item.value, 0), 
    [distributionChartData]
  )

  // Prepare time series chart data
  const timeSeriesChartData = React.useMemo(() => {
    if (!data || !data.timeSeriesData || !selectedTimeSeriesDataset) return []
    
    const timeData = data.timeSeriesData[selectedTimeSeriesDataset] || []
    
    return timeData.map(point => {
      const result: any = { date: point.date }
      
      // Add values for active categories
      Object.entries(point.values).forEach(([categoryId, values]) => {
        if (activeTimeSeriesCategories.includes(categoryId)) {
          result[categoryId] = values.current
        }
      })
      
      return result
    })
  }, [data, selectedTimeSeriesDataset, activeTimeSeriesCategories])

  // Get current dataset configs
  const distDatasetConfig = React.useMemo(() => 
    data?.datasets.find(d => d.id === selectedDistributionDataset) || 
    { name: 'Revenue', prefix: '€', suffix: '', unit: 'currency' }, 
    [data, selectedDistributionDataset]
  )
  
  const timeDatasetConfig = React.useMemo(() => 
    data?.datasets.find(d => d.id === selectedTimeSeriesDataset) || 
    { name: 'Revenue', prefix: '€', suffix: '', unit: 'currency' }, 
    [data, selectedTimeSeriesDataset]
  )

  // Helper to format values based on dataset config
  const formatValue = (value: number, dataset: any) => {
    const prefix = dataset.prefix || ''
    const suffix = dataset.suffix || ''
    return `${prefix}${Math.round(value).toLocaleString()}${suffix}`
  }

  // Inside the render function, add this ChartContainer config to maintain color palette
  const chartContainerConfig = React.useMemo(() => {
    if (!data?.categories) return {}
    
    // Convert categories array to the expected ChartConfig format
    return data.categories.reduce((config, category) => {
      return {
        ...config,
        [category.id]: {
          label: category.name,
          color: category.color
        }
      }
    }, {})
  }, [data?.categories])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[400px]">
        <p>Loading data...</p>
      </div>
    )
  }

  if (!data) {
    return (
      <div className="flex items-center justify-center h-[400px]">
        <p>No data available</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Charts Row */}
      <div className="grid grid-cols-2 gap-6">
        {/* Distribution Card */}
        <Card className="border-gray-300">
          <CardHeader>
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-medium">Distribution</h3>
              <div className="flex items-center gap-3">
                {/* Chart Type Selector */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button 
                      variant="ghost" 
                      size="sm"
                      className="bg-[#f2f8ff] hover:bg-[#f2f8ff] text-[#342630] rounded-full px-4 font-semibold whitespace-nowrap"
                    >
                      {distributionChartType === 'pie' ? 'Pie Chart' : 'Bar Chart'}
                      <TriangleDown className="ml-3" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    {data.datasets
                      .filter(dataset => dataset.id === selectedDistributionDataset)
                      .map(dataset => (
                        <React.Fragment key={dataset.id}>
                          {dataset.chartTypes.pie && (
                            <DropdownMenuItem onClick={() => setDistributionChartType('pie')}>
                              Pie Chart
                            </DropdownMenuItem>
                          )}
                          {dataset.chartTypes.bar && (
                            <DropdownMenuItem onClick={() => setDistributionChartType('bar')}>
                              Bar Chart
                            </DropdownMenuItem>
                          )}
                        </React.Fragment>
                      ))}
                  </DropdownMenuContent>
                </DropdownMenu>

                {/* Dataset Selector */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button 
                      variant="ghost" 
                      size="sm"
                      className="bg-[#f2f8ff] hover:bg-[#f2f8ff] text-[#342630] rounded-full px-4 font-semibold whitespace-nowrap"
                    >
                      {distDatasetConfig.name}
                      <TriangleDown className="ml-3" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    {data.datasets
                      .filter(dataset => dataset.chartTypes.pie || dataset.chartTypes.bar)
                      .map(dataset => (
                        <DropdownMenuItem 
                          key={dataset.id}
                          onClick={() => {
                            setSelectedDistributionDataset(dataset.id)
                            // Make sure chart type is compatible
                            if (distributionChartType === 'pie' && !dataset.chartTypes.pie) {
                              setDistributionChartType('bar')
                            }
                          }}
                        >
                          {dataset.name}
                        </DropdownMenuItem>
                      ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="w-full h-[300px] relative flex justify-center">
              <ChartContainer config={chartContainerConfig}>
                {distributionChartType === 'bar' ? (
                  <BarChart
                    data={distributionChartData}
                    height={300}
                    margin={{
                      top: 30,
                      right: 30,
                      bottom: 20,
                      left: 40,
                    }}
                  >
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis
                      dataKey="name"
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
                    <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                      {distributionChartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.fill} />
                      ))}
                    </Bar>
                  </BarChart>
                ) : (
                  <PieChart width={300} height={300}>
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Pie
                      data={distributionChartData}
                      dataKey="value"
                      nameKey="name"
                      innerRadius={70}
                      outerRadius={120}
                      fill="#8884d8"
                    >
                      {distributionChartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.fill} />
                      ))}
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
                                  className="fill-foreground text-lg font-bold"
                                >
                                  {formatValue(distributionTotal, distDatasetConfig)}
                                </tspan>
                                <tspan
                                  x={viewBox.cx}
                                  y={(viewBox.cy || 0) + 20}
                                  className="fill-muted-foreground text-xs"
                                >
                                  Total {distDatasetConfig.name}
                                </tspan>
                              </text>
                            )
                          }
                          return null
                        }}
                      />
                    </Pie>
                  </PieChart>
                )}
              </ChartContainer>
            </div>

            {/* Distribution Stats */}
            <div className="w-full grid grid-cols-2 gap-3 mt-6">
              {data.categories.map((category) => {
                // Find the data for this category
                const categoryData = data.pieData[selectedDistributionDataset]?.find(
                  item => item.categoryId === category.id
                )
                
                if (!categoryData) return null
                
                const isActive = activeDistributionCategories.includes(category.id)
                
                return (
                  <div 
                    key={category.id}
                    onClick={() => {
                      if (distributionChartType !== 'pie' || selectedDistributionDataset !== 'adr') {
                        if (isActive) {
                          // Only remove if not the last item
                          if (activeDistributionCategories.length > 1) {
                            setActiveDistributionCategories(prev => 
                              prev.filter(id => id !== category.id)
                            )
                          }
                        } else {
                          setActiveDistributionCategories(prev => [...prev, category.id])
                        }
                      }
                    }}
                    className={`
                      ${(distributionChartType !== 'pie' || selectedDistributionDataset !== 'adr') ? 'cursor-pointer' : ''}
                      flex items-center justify-between px-4 py-3 rounded-lg bg-[#f0f4fa] border border-[#e5eaf3]
                      ${isActive ? '' : 'opacity-50'}
                    `}
                  >
                    <div className="flex items-center gap-2">
                      <div 
                        className="w-2 h-2 rounded-full"
                        style={{ backgroundColor: category.color }}
                      />
                      <span className="text-xs text-gray-500 font-medium">
                        {category.name}: {formatValue(categoryData.value, distDatasetConfig)}
                        {distributionChartType === 'pie' && ` (${categoryData.percentage}%)`}
                      </span>
                    </div>
                    <span className="text-emerald-500 text-xs flex items-center">
                      <ArrowUpIcon className="h-3 w-3 mr-1" />
                      {Math.floor(Math.random() * 500 + 200)}%
                    </span>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>

        {/* Categories Over Time Card */}
        <Card className="border-gray-300">
          <CardHeader>
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-medium">Categories Over Time</h3>
              <div className="flex items-center gap-3">
                {/* Chart Mode Selector */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button 
                      variant="ghost" 
                      size="sm"
                      className="bg-[#f2f8ff] hover:bg-[#f2f8ff] text-[#342630] rounded-full px-4 font-semibold whitespace-nowrap"
                    >
                      {timeSeriesMode === 'normal' ? 'Normal View' : 'Stacked View'}
                      <TriangleDown className="ml-3" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => setTimeSeriesMode('normal')}>
                      Normal View
                    </DropdownMenuItem>
                    {data.datasets
                      .filter(dataset => dataset.id === selectedTimeSeriesDataset && dataset.chartTypes.stacked)
                      .map(dataset => (
                        <DropdownMenuItem 
                          key={dataset.id}
                          onClick={() => setTimeSeriesMode('stacked')}
                        >
                          Stacked View
                        </DropdownMenuItem>
                      ))}
                  </DropdownMenuContent>
                </DropdownMenu>

                {/* Dataset Selector */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button 
                      variant="ghost" 
                      size="sm"
                      className="bg-[#f2f8ff] hover:bg-[#f2f8ff] text-[#342630] rounded-full px-4 font-semibold whitespace-nowrap"
                    >
                      {timeDatasetConfig.name}
                      <TriangleDown className="ml-3" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    {data.datasets.map(dataset => (
                      <DropdownMenuItem 
                        key={dataset.id}
                        onClick={() => {
                          setSelectedTimeSeriesDataset(dataset.id)
                          // Make sure view mode is compatible
                          if (timeSeriesMode === 'stacked' && !dataset.chartTypes.stacked) {
                            setTimeSeriesMode('normal')
                          }
                        }}
                      >
                        {dataset.name}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <ChartContainer config={chartContainerConfig}>
              <AreaChart
                data={timeSeriesChartData}
                height={300}
                margin={{
                  top: 30,
                  right: 10,
                  bottom: 20,
                  left: 40,
                }}
              >
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis
                  dataKey="date"
                  tickLine={false}
                  axisLine={false}
                  tickMargin={8}
                />
                <YAxis
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(value) => `${Math.round(value).toLocaleString()}`}
                  tickMargin={8}
                  width={45}
                />
                <ChartTooltip />
                {data.categories
                  .filter(category => activeTimeSeriesCategories.includes(category.id))
                  .map(category => (
                    <Area
                      key={category.id}
                      type="monotone"
                      dataKey={category.id}
                      stroke={category.color}
                      fill={timeSeriesMode === 'stacked' ? category.color : 'transparent'}
                      fillOpacity={timeSeriesMode === 'stacked' ? 0.4 : 0}
                      strokeWidth={2}
                      dot={false}
                      name={category.name}
                      stackId={timeSeriesMode === 'stacked' ? "1" : undefined}
                    />
                  ))
                }
              </AreaChart>
            </ChartContainer>

            {/* Categories Legend */}
            <div className="flex flex-wrap justify-center gap-3 mt-6">
              {data.categories.map((category) => {
                const isActive = activeTimeSeriesCategories.includes(category.id)
                
                return (
                  <div
                    key={category.id}
                    onClick={() => {
                      if (isActive) {
                        // Only remove if not the last item
                        if (activeTimeSeriesCategories.length > 1) {
                          setActiveTimeSeriesCategories(prev => 
                            prev.filter(id => id !== category.id)
                          )
                        }
                      } else {
                        setActiveTimeSeriesCategories(prev => [...prev, category.id])
                      }
                    }}
                    className={`
                      cursor-pointer bg-[#f0f4fa] px-3 py-1.5 rounded-full 
                      border border-[#e5eaf3] flex items-center gap-2
                      ${isActive ? '' : 'opacity-50'}
                    `}
                  >
                    <div 
                      style={{ backgroundColor: category.color }} 
                      className="w-2 h-2 rounded-full" 
                    />
                    <span className="text-xs text-gray-500 font-medium">
                      {category.name}
                    </span>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Table Card */}
      <Card className="border-gray-300">
        <CardHeader>
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-medium">All Categories</h3>
            <div className="flex items-center gap-2">
              <Button 
                variant="ghost" 
                size="sm"
                onClick={() => scrollTable('left')}
                className="bg-[#f2f8ff] hover:bg-[#f2f8ff] text-[#342630] rounded-full w-8 h-8 p-0"
              >
                <ChevronLeftIcon className="h-4 w-4" />
              </Button>
              <Button 
                variant="ghost" 
                size="sm"
                onClick={() => scrollTable('right')}
                className="bg-[#f2f8ff] hover:bg-[#f2f8ff] text-[#342630] rounded-full w-8 h-8 p-0"
              >
                <ChevronRightIcon className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="border rounded-lg overflow-x-auto relative" ref={tableContainerRef}>
            <div className="relative">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead 
                      className="bg-[#f0f4fa] min-w-[180px] sticky left-0 z-20 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]"
                    >
                      Category
                    </TableHead>
                    {data.datasets.map(dataset => (
                      <TableHead 
                        key={dataset.id} 
                        className="bg-[#f0f4fa]/60 text-right min-w-[150px]"
                      >
                        {dataset.name}
                      </TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.tableData.map((row) => {
                    const category = data.categories.find(c => c.id === row.categoryId)
                    if (!category) return null
                    
                    return (
                      <TableRow key={row.categoryId} className="border-b border-[#d0d7e3] last:border-0">
                        <TableCell 
                          className="text-left border-r border-[#d0d7e3] min-w-[180px] sticky left-0 bg-white z-10 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]"
                        >
                          {category.name}
                        </TableCell>
                        
                        {data.datasets.map(dataset => {
                          const metrics = row.metrics[dataset.id] || { current: 0, previous: 0, change: 0 }
                          const changeValue = metrics.change
                          const isPositive = changeValue > 0
                          
                          return (
                            <TableCell 
                              key={dataset.id} 
                              className="text-right border-r border-[#d0d7e3] min-w-[150px]"
                            >
                              <div className="flex justify-end items-center gap-2">
                                <span>{formatValue(metrics.current, dataset)}</span>
                                <span className={`text-xs ${isPositive ? "text-emerald-500" : "text-red-500"}`}>
                                  {isPositive ? "+" : ""}{changeValue.toFixed(1)}%
                                </span>
                              </div>
                            </TableCell>
                          )
                        })}
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
              {/* Add shadow overlay */}
              {showRightShadow && (
                <div className="absolute top-0 right-0 bottom-0 w-8 pointer-events-none shadow-[inset_-12px_0_8px_-8px_rgba(0,0,0,0.075)]" />
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
} 