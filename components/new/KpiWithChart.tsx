"use client"

import * as React from "react"
import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from "recharts"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  ChartConfig,
  ChartContainer,
  ChartLegend,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart"
import { Button } from "@/components/ui/button"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Dialog as FullScreenDialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { ArrowRight } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

// Added types for API data
type FluctuationData = {
  date: string;
  current: number;
  previous: number;
}[];

type MetricData = {
  value: number;
  percentageChange: number;
  fluctuation: FluctuationData;
};

type ApiResponseData = {
  [key: string]: MetricData;
};

interface KpiWithChartProps {
  title: string;
  color?: 'green' | 'blue' | 'red';
  initialValue?: number;
  initialPercentageChange?: number;
  chartData?: Array<{
    date: string;
    current: number;
    previous: number;
  }>;
  
  // New API-related props
  apiUrl?: string;
  apiParams?: Record<string, string>;
  fieldMapping?: Array<{
    apiField: string;
    label: string;
    prefix?: string;
  }>;
  
  // Legacy props for backward compatibility
  prefix?: string;
  metrics?: Array<{
    key: string;
    label: string;
    data: Array<{
      date: string;
      current: number;
      previous: number;
    }>;
    prefix?: string;
  }>;
  distributionData?: Array<{
    name: string;
    value: number;
    percentage: number;
    fill: string;
  }>;
  categoryTimeSeriesData?: Array<{
    date: string;
    categories: {
      [key: string]: {
        current: number;
        previous: number;
      };
    };
  }>;
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
  metrics,
  distributionData,
  categoryTimeSeriesData,
  // New API-related props
  apiUrl,
  apiParams,
  fieldMapping
}: KpiWithChartProps) {
  const [fullScreenTable, setFullScreenTable] = React.useState(false)
  const [loading, setLoading] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const [apiData, setApiData] = React.useState<ApiResponseData | null>(null)
  
  // Determine if we're using API or legacy data
  const usingApi = !!apiUrl;
  
  // Create metrics from API data if available
  const apiMetrics = React.useMemo(() => {
    if (!apiData || !fieldMapping) return null;
    
    return fieldMapping.map(mapping => ({
      key: mapping.apiField,
      label: mapping.label,
      prefix: mapping.prefix || '',
      data: apiData[mapping.apiField]?.fluctuation || []
    }));
  }, [apiData, fieldMapping]);
  
  // Use API metrics if available, otherwise use provided metrics or create default
  const allMetrics = React.useMemo(() => {
    if (apiMetrics) return apiMetrics;
    if (metrics) return metrics;
    return [{ key: 'default', label: title, data: chartData || [], prefix }];
  }, [apiMetrics, metrics, title, chartData, prefix]);
  
  const [selectedMetric, setSelectedMetric] = React.useState<string>(allMetrics[0]?.key || '')
  const [activeMainSeries, setActiveMainSeries] = React.useState<string[]>(['current', 'previous'])
  
  // Memoize the API parameters to prevent unnecessary re-fetches
  const memoizedApiParams = React.useMemo(() => apiParams, [
    // Stringify the apiParams to compare by value, not reference
    apiParams ? JSON.stringify(apiParams) : null
  ]);
  
  // Fetch data from API when params change
  React.useEffect(() => {
    if (!apiUrl || !memoizedApiParams) return;
    
    // Use an AbortController to cancel previous requests
    const abortController = new AbortController();
    
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // Build query string
        const queryParams = new URLSearchParams();
        Object.entries(memoizedApiParams).forEach(([key, value]) => {
          queryParams.append(key, value);
        });
        
        const response = await fetch(`${apiUrl}?${queryParams.toString()}`, {
          signal: abortController.signal
        });
        
        if (!response.ok) {
          throw new Error(`API error: ${response.status}`);
        }
        
        const data = await response.json();
        setApiData(data);
      } catch (err) {
        // Don't show errors for aborted requests
        if (err.name !== 'AbortError') {
          console.error('Error fetching KPI data:', err);
          setError(err instanceof Error ? err.message : 'An unknown error occurred');
        }
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
    
    // Cleanup function to abort fetch on unmount or dependency change
    return () => {
      abortController.abort();
    };
  }, [apiUrl, memoizedApiParams]); // Use memoized params as dependency
  
  // Reset selected metric when metrics change
  React.useEffect(() => {
    if (allMetrics.length > 0 && !allMetrics.find(m => m.key === selectedMetric)) {
      setSelectedMetric(allMetrics[0].key);
    }
  }, [allMetrics, selectedMetric]);
  
  // Get current metric data
  const currentMetricData = allMetrics.find(m => m.key === selectedMetric) || allMetrics[0];
  
  // Calculate current value and percentage change based on selected metric
  let currentValue = initialValue;
  let changePercent = initialPercentageChange;
  
  if (usingApi && apiData && currentMetricData) {
    const apiMetricData = apiData[currentMetricData.key];
    if (apiMetricData) {
      currentValue = apiMetricData.value;
      changePercent = apiMetricData.percentageChange;
    }
  } else if (currentMetricData?.data?.length) {
    const lastIdx = currentMetricData.data.length - 1;
    const currVal = currentMetricData.data[lastIdx].current;
    const prevVal = currentMetricData.data[lastIdx].previous;
    currentValue = currVal;
    changePercent = prevVal !== 0 ? ((currVal - prevVal) / prevVal) * 100 : 0;
  }
  
  // Format values for display
  const formattedValue = currentValue !== undefined ? Math.round(currentValue).toLocaleString() : '—';
  const formattedChangePercent = changePercent !== undefined ? (Math.round(changePercent * 10) / 10) : 0;
  const isPositive = (formattedChangePercent || 0) > 0;
  
  const chartConfig = getChartConfig(color);
  // Only calculate left margin if we have data
  const leftMargin = currentMetricData.data?.length ? getLeftMargin(currentMetricData.data) : 0;

  const gradientId = `gradient-${title.toLowerCase().replace(/\s+/g, '-')}`;
  const currentGradientColor = chartConfig.current.color;

  // Add this getChartDomain function inside the KpiWithChart component
  const getChartDomain = (data: Array<{ current: number; previous: number }>) => {
    // Get all values from both current and previous datasets
    const allValues = data.flatMap(item => [item.current, item.previous]);
    
    // Calculate the min and max values
    const minValue = Math.min(...allValues);
    const maxValue = Math.max(...allValues);
    
    // Create a domain that gives enough padding at the top and bottom
    return [
      Math.max(0, Math.floor(minValue * 0.9)), // Ensure no negative values
      Math.ceil(maxValue * 1.1)  // Add 10% padding at the top
    ];
  };

  if (loading) {
    return (
      <Card className="border-gray-300">
        <CardHeader>
          <CardTitle className="text-base mb-2 font-medium text-sm text-muted-foreground">
            {title}
          </CardTitle>
          <div className="flex items-center justify-center h-24">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
          </div>
        </CardHeader>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="border-gray-300">
        <CardHeader>
          <CardTitle className="text-base mb-2 font-medium text-sm text-muted-foreground">
            {title}
          </CardTitle>
          <div className="text-red-500 p-4">
            Error loading data: {error}
          </div>
        </CardHeader>
      </Card>
    );
  }

  return (
    <>
      <Card className="border-gray-300">
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle className="text-base mb-2 font-medium text-sm text-muted-foreground">
              {currentMetricData.label}
            </CardTitle>
            {allMetrics.length > 1 && (
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
                  {allMetrics.map(metric => (
                    <DropdownMenuItem 
                      key={metric.key}
                      onClick={() => setSelectedMetric(metric.key)}
                    >
                      {metric.label}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
          <div className="flex items-end gap-3">
            <span className="text-2xl font-bold leading-none">
              {currentMetricData.prefix || prefix}{formattedValue}
            </span>
            {changePercent !== undefined && (
              <span className={`text-sm -translate-y-[1px] px-2 py-0.5 rounded ${
                isPositive 
                  ? 'text-green-600 bg-green-100/50 border border-green-600' 
                  : 'text-red-600 bg-red-100/50 border border-red-600'
              } leading-none`}>
                {isPositive ? '+' : ''}{formattedChangePercent}% 
              </span>
            )}
          </div>
        </CardHeader>
        <CardContent className="pb-4 mt-3">
          {currentMetricData.data?.length > 0 && (
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
                  tickFormatter={(value) => value}
                  tickMargin={8}
                  interval={Math.ceil(currentMetricData.data.length / 8) - 1}
                />
                <YAxis
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(value) => `${Math.round(value).toLocaleString()}`}
                  tickMargin={8}
                  width={45}
                  domain={getChartDomain(currentMetricData.data)}
                  allowDecimals={false}
                  minTickGap={20}
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
          )}
          <div className="mt-3 pt-4 border-t border-gray-200">
            <div className="flex justify-end">
              <Button
                variant="ghost"
                className="text-blue-600 hover:text-blue-800 font-medium text-sm flex items-center gap-2"
                onClick={() => setFullScreenTable(true)}
              >
                View Details
                <ArrowRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
      
      <FullScreenDialog open={fullScreenTable} onOpenChange={setFullScreenTable}>
        <DialogContent className="max-w-7xl min-h-fit max-h-[90vh]">
          <DialogHeader className="pb-6">
            <DialogTitle>{currentMetricData.label}</DialogTitle>
          </DialogHeader>
          <div className="border rounded-lg bg-[#f0f4fa]/40 border-[#d0d7e3]">
            <div className="overflow-y-auto max-h-[calc(90vh-120px)]">
              <Table>
                <TableHeader>
                  <TableRow className="border-b border-[#d0d7e3] hover:bg-transparent">
                    <TableHead className="bg-[#f0f4fa]/60 first:rounded-tl-lg text-left border-r border-[#d0d7e3]">
                      Date
                    </TableHead>
                    <TableHead className="bg-[#f0f4fa]/60 text-left border-r border-[#d0d7e3]">
                      Current Period
                    </TableHead>
                    <TableHead className="bg-[#f0f4fa]/60 text-left border-r border-[#d0d7e3]">
                      Previous Period
                    </TableHead>
                    <TableHead className="bg-[#f0f4fa]/60 last:rounded-tr-lg text-left">
                      Change
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {currentMetricData.data?.map((row, idx) => (
                    <TableRow key={idx} className="border-b border-[#d0d7e3] last:border-0">
                      <TableCell className="w-[25%] bg-[#f0f4fa]/40 border-r border-[#d0d7e3] text-left">
                        {row.date}
                      </TableCell>
                      <TableCell className="w-[25%] text-left border-r border-[#d0d7e3]">
                        {currentMetricData.prefix || prefix}{row.current.toLocaleString()}
                      </TableCell>
                      <TableCell className="w-[25%] text-left border-r border-[#d0d7e3]">
                        {currentMetricData.prefix || prefix}{row.previous.toLocaleString()}
                      </TableCell>
                      <TableCell className={`w-[25%] text-left ${row.current > row.previous ? "text-emerald-500" : "text-red-500"}`}>
                        {row.previous !== 0 ? ((row.current - row.previous) / row.previous * 100).toFixed(1) : "N/A"}%
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        </DialogContent>
      </FullScreenDialog>
    </>
  )
} 