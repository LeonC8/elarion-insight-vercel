"use client"

import { Button } from "@/components/ui/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { useState, useEffect } from "react"
import { useInView } from "@/hooks/useInView"
import * as React from "react"
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart"
import { ArrowRight } from 'lucide-react'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"

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

export interface DataSet {
  title: string
  key: string
  data: Array<{
    range: string
    current: number
    previous: number
  }>
}

export interface CategoryOption {
  label: string
  key: string
}

export interface HorizontalBarChartMultipleDatasetsProps {
  datasets?: DataSet[]
  defaultDataset?: string
  categories?: CategoryOption[]
  defaultCategory?: string
  leftMargin?: number
  loading?: boolean
  error?: string | null
  sort?: boolean
  url?: string
  apiParams?: Record<string, string | number | boolean | undefined>
  lazyLoad?: boolean
  fixedTitle?: string
}

// Extract number from a string (e.g., "3 night" -> 3, "7+ nights" -> 7.5)
const extractNumber = (str: string): number => {
  // Special case handling for common patterns
  if (str.includes('7+') || str.includes('7 +') || str.includes('7-plus') || str.toLowerCase().includes('seven plus')) {
    return 7.5; // Make "7+" sort after "7" but before "8"
  }
  
  // Default number extraction
  const match = str.match(/(\d+)/);
  if (match && match.index !== undefined) {
    const num = parseInt(match[1], 10);
    // Additional check for plus sign after the number
    if (str.includes('+', match.index + match[0].length)) {
      return num + 0.5; // Make "N+" sort after "N" but before "N+1"
    }
    return num;
  }
  
  // No numbers found, put at end of sort
  return Number.MAX_SAFE_INTEGER;
};

// Add the Skeleton component definition
function Skeleton({ className }: { className?: string }) {
  return (
    <div className={`animate-pulse rounded bg-gray-200 ${className}`} />
  )
}

// Chart configuration for current/previous period
const chartConfig = {
  current: {
    label: "Selected Period",
    color: "hsl(221.2 83.2% 53.3%)",  // Blue
  },
  previous: {
    label: "Comparison Period",
    color: "#93c5fd",  // Lighter Blue
  },
} satisfies ChartConfig

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

export function HorizontalBarChartMultipleDatasets({
  datasets: datasetsProp,
  defaultDataset: defaultDatasetProp,
  categories,
  defaultCategory = categories?.[0]?.key,
  leftMargin = -10,
  loading: loadingProp = false,
  error: errorProp = null,
  sort = true,
  url,
  apiParams,
  lazyLoad = false,
  fixedTitle,
}: HorizontalBarChartMultipleDatasetsProps) {
  // State for internally fetched data, loading, and errors
  const [internalDatasets, setInternalDatasets] = useState<DataSet[] | null>(null)
  const [internalLoading, setInternalLoading] = useState(false)
  const [internalError, setInternalError] = useState<string | null>(null)
  const [fetchedParams, setFetchedParams] = useState<string | null>(null);

  // Determine initial default dataset key
  const determineDefaultDatasetKey = (datasets: DataSet[] | null | undefined): string | undefined => {
    if (!datasets) return undefined; // Handle null or undefined
    if (defaultDatasetProp && datasets.some(d => d.key === defaultDatasetProp)) return defaultDatasetProp;
    if (datasets.length > 0) return datasets[0].key;
    return undefined;
  };

  const [selectedDataset, setSelectedDataset] = useState<string | undefined>(
    !url ? determineDefaultDatasetKey(datasetsProp) : undefined
  );
  const [selectedCategory, setSelectedCategory] = useState(defaultCategory)

  // Add state copied from HorizontalBarChart.tsx
  const [activeSeries, setActiveSeries] = React.useState<string[]>([
    'current',
    'previous'
  ])
  const [fullScreenTable, setFullScreenTable] = React.useState(false)

  // Use the Intersection Observer hook
  const { ref, isInView } = useInView<HTMLDivElement>({ 
    threshold: 0.1, 
    triggerOnce: true 
  });

  // Effect to fetch data if URL is provided
  useEffect(() => {
    const currentParamsString = JSON.stringify(apiParams);

    if (!url || (lazyLoad && !isInView)) {
      return;
    }

    const shouldFetch = (isInView || !lazyLoad) && (fetchedParams === null || fetchedParams !== currentParamsString);

    if (!shouldFetch) {
      return;
    }

    const fetchData = async () => {
      setInternalLoading(true);
      setInternalError(null);

      try {
        // Construct URL with query parameters
        const fetchUrl = new URL(url, window.location.origin);
        if (apiParams) {
          Object.entries(apiParams).forEach(([key, value]) => {
            if (value !== undefined) {
              fetchUrl.searchParams.append(key, String(value));
            }
          });
        }

        const response = await fetch(fetchUrl.toString());
        if (!response.ok) {
           let errorBody = null;
           try { errorBody = await response.json(); } catch (e) { /* Ignore */ }
           const errorMessage = errorBody?.error || `Failed to fetch data: ${response.status} ${response.statusText}`;
           throw new Error(errorMessage);
        }
        const data: DataSet[] = await response.json(); // Expect API to return DataSet[] directly
        setInternalDatasets(data);
        setFetchedParams(currentParamsString);

        const currentSelectedKeyExists = data.some(d => d.key === selectedDataset);
        if (!currentSelectedKeyExists) {
           setSelectedDataset(determineDefaultDatasetKey(data));
        } else if (!selectedDataset && data.length > 0) {
           setSelectedDataset(determineDefaultDatasetKey(data));
        }

      } catch (err) {
        console.error('Error fetching data in HorizontalBarChartMultipleDatasets:', err);
        setInternalError(err instanceof Error ? err.message : 'An unknown error occurred');
        setInternalDatasets(null);
      } finally {
        setInternalLoading(false);
      }
    };

    fetchData();
  }, [url, JSON.stringify(apiParams), lazyLoad, isInView, selectedDataset]);

  // Determine which datasets, loading state, and error state to use
  const isLoading = url ? internalLoading : loadingProp;
  const error = url ? internalError : errorProp;
  const datasets = (url ? internalDatasets : datasetsProp) ?? [];

  // Effect to update selectedDataset only when datasets actually change from null/empty to having data (initial load)
   useEffect(() => {
     if (!selectedDataset && datasets && datasets.length > 0) {
       setSelectedDataset(determineDefaultDatasetKey(datasets));
     }
   }, [datasets, defaultDatasetProp, selectedDataset]);


  // Find the current dataset based on the selected key
   const currentDataset = datasets?.find(d => d.key === selectedDataset);
   const chartTitle = fixedTitle || currentDataset?.title || "";
   const currentCategory = categories?.find(c => c.key === selectedCategory) || categories?.[0]

  // Handle error state
  if (error && !isLoading) {
    return (
      <div className="relative min-h-[400px]">
        <div className="h-[400px] flex items-center justify-center">
          <div className="text-red-500 text-center p-4">
             <p className="font-semibold mb-2">Error loading chart data</p>
             <p className="text-sm">{error}</p>
          </div>
        </div>
      </div>
    )
  }

  // Prepare data for the chart (sorting logic)
  let chartData: DataSet['data'] = [];
  const dataReady = !isLoading && (!url || fetchedParams === JSON.stringify(apiParams));
  if (dataReady && currentDataset?.data) {
     chartData = [...currentDataset.data];
     if (sort && chartData.length > 0) {
       chartData.sort((a: { range: string }, b: { range: string }) => extractNumber(a.range) - extractNumber(b.range));
     }
  }

  const showSkeleton = isLoading || (url && lazyLoad && !fetchedParams && !internalError);

  // --- Start: Title/Subtitle logic copied from HorizontalBarChart.tsx ---
  let mainTitle = chartTitle; // Use chartTitle determined above
  let subtitle: string | null = null;
  const titleParts = chartTitle.split(" by ");
  if (titleParts.length > 1) {
    mainTitle = titleParts[0];
    subtitle = `By ${titleParts.slice(1).join(" by ")}`; // Handle cases with multiple "by"
  }
  // --- End: Title/Subtitle logic copied from HorizontalBarChart.tsx ---

  return (
    <Card ref={ref} className="border-gray-300 min-h-[450px]"> 
     

      <CardHeader className={`flex flex-col md:flex-row items-start justify-between pb-4 ${showSkeleton ? 'invisible' : ''}`}>
        <div className="w-full md:w-auto mb-4 md:mb-0">
           <CardTitle className="text-lg font-semibold text-gray-800">
             {mainTitle}
           </CardTitle>
           {subtitle && (
             <CardDescription className="text-sm text-gray-500 pt-1">
               {subtitle}
             </CardDescription>
           )}
        </div>

        <div className={`flex items-center flex-wrap gap-2 w-full md:w-auto justify-start md:justify-end ${isLoading ? 'opacity-50 pointer-events-none' : ''}`}>
           {categories && categories.length > 0 && (
             <DropdownMenu>
               <DropdownMenuTrigger asChild>
                 <Button variant="ghost" size="sm" className="bg-[#f2f8ff] hover:bg-[#f2f8ff] text-[#342630] rounded-full px-4 flex-shrink-0" disabled={isLoading || !categories || categories.length === 0}>
                   {currentCategory?.label || "All"} <TriangleDown className="ml-2" />
                 </Button>
               </DropdownMenuTrigger>
               <DropdownMenuContent>
                 {categories.map(category => ( <DropdownMenuItem key={category.key} onClick={() => setSelectedCategory(category.key)} disabled={isLoading}>{category.label}</DropdownMenuItem> ))}
               </DropdownMenuContent>
             </DropdownMenu>
           )}
           {datasets && datasets.length > 1 && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="bg-[#f2f8ff] hover:bg-[#f2f8ff] text-[#342630] rounded-full px-4 flex-shrink-0" disabled={isLoading || !datasets || datasets.length <= 1}>
                    {currentDataset?.title || 'Select Dataset'} <TriangleDown className="ml-2" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  {datasets.map(dataset => ( <DropdownMenuItem key={dataset.key} onClick={() => setSelectedDataset(dataset.key)} disabled={isLoading}>{dataset.title}</DropdownMenuItem> ))}
                </DropdownMenuContent>
              </DropdownMenu>
           )}
        </div>
      </CardHeader>
      
      <CardContent className={`${showSkeleton ? 'invisible' : ''}`}>
        {!showSkeleton && dataReady && currentDataset && datasets.length > 0 && (
          <ChartContainer config={chartConfig} className="min-h-[345px] w-full">
            <BarChart
              data={chartData}
              layout="vertical"
              height={300}
              margin={{
                top: 10,
                right: 10,
                bottom: 20,
                left: leftMargin,
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
        )}

        {!showSkeleton && !error && (!url || fetchedParams === JSON.stringify(apiParams)) && datasets.length === 0 && (
           <div className="flex items-center justify-center text-gray-500 min-h-[345px]">
              No data available.
           </div>
        )}

        {!showSkeleton && dataReady && currentDataset && datasets.length > 0 && (
          <>
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
                  <div style={{ backgroundColor: config.color }} className="w-2 h-2 rounded-full" />
                  <span className="text-xs text-gray-500 font-medium">{config.label}</span>
                </div>
              ))}
            </div>

            <div className="mt-8 pt-4 border-t border-gray-200">
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
          </>
        )}
      </CardContent>

      <Dialog open={fullScreenTable} onOpenChange={setFullScreenTable}>
        <DialogContent className="max-w-7xl min-h-fit max-h-[90vh]">
          <DialogHeader className="pb-6">
            <DialogTitle>{chartTitle}</DialogTitle> 
          </DialogHeader>
          <div className="border rounded-lg bg-[#f0f4fa]/40 border-[#d0d7e3]">
            <div className="overflow-y-auto max-h-[calc(90vh-120px)]">
              <Table>
                <TableHeader>
                   <TableRow className="border-b border-[#d0d7e3] hover:bg-transparent">
                     <TableHead className="bg-[#f0f4fa]/60 first:rounded-tl-lg text-left border-r border-[#d0d7e3]">Range</TableHead>
                     <TableHead className="bg-[#f0f4fa]/60 text-left border-r border-[#d0d7e3]">Selected Period</TableHead>
                     <TableHead className="bg-[#f0f4fa]/60 text-left border-r border-[#d0d7e3]">Comparison Period</TableHead>
                     <TableHead className="bg-[#f0f4fa]/60 last:rounded-tr-lg text-left">Change</TableHead>
                   </TableRow>
                 </TableHeader>
                <TableBody>
                  {chartData.map((row, idx) => ( 
                    <TableRow key={idx} className="border-b border-[#d0d7e3] last:border-0">
                      <TableCell className="w-[25%] bg-[#f0f4fa]/40 border-r border-[#d0d7e3] text-left">{row.range}</TableCell>
                      <TableCell className="w-[25%] text-left border-r border-[#d0d7e3]">{row.current.toLocaleString()}</TableCell>
                      <TableCell className="w-[25%] text-left border-r border-[#d0d7e3]">{row.previous.toLocaleString()}</TableCell>
                      <TableCell className={`w-[25%] text-left ${ (row.current > row.previous || (row.previous === 0 && row.current > 0)) ? "text-emerald-500" : (row.current < row.previous || (row.current === 0 && row.previous > 0)) ? "text-red-500" : "text-gray-700"}`}>
                        {formatPercentageChange(row.current, row.previous)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </Card> 
  )
} 