import { ArrowUpIcon, ArrowDownIcon, PercentIcon, HashIcon } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { useState, useEffect } from "react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Button } from "@/components/ui/button"
import { CategoriesDetailsDialog } from "./CategoriesDetailsDialog"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { useInView } from "@/hooks/useInView"

interface MetricData {
  name: string
  value: number
  change: number      // This will now represent the absolute change
  prevValue?: number  // Optional previous value for more accurate percentage calc
  code?: string       // Optional code for identification
}

interface MetricOption {
  label: string
  key: string
  data: MetricData[]
  prefix?: string // For currency symbols etc
  suffix?: string // For percentages, units etc
}

// New interface for category options
interface CategoryOption {
  label: string
  key: string
}

interface TopFiveProps {
  title: string
  subtitle?: string // New optional subtitle prop
  metrics: MetricOption[]
  categories?: CategoryOption[] // New optional prop for category options
  defaultMetric?: string
  defaultCategory?: string // New optional default category prop
  color?: 'green' | 'blue' | 'purple' | 'red'
  withBorder?: boolean
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
  chartConfig?: any
  // New prop to specify an API endpoint to fetch data from
  apiEndpoint?: string
  // Additional query parameters to send to the API
  apiParams?: Record<string, string | undefined>
  onMetricChange?: (metric: string) => void
  // New prop to enable simple details view
  simpleDetails?: boolean
  lazyLoad?: boolean // Add new prop for lazy loading
}

type FilterType = 'top' | 'bottom' | 'rising' | 'falling';

const filterDisplayNames: Record<FilterType, string> = {
  'top': 'Top 5',
  'bottom': 'Bottom 5',
  'rising': 'Top Rising',
  'falling': 'Top Falling'
};

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

// Helper function to format numbers consistently
function formatNumber(value: number): number {
  // Round to the nearest integer for large numbers, or to 2 decimal places for smaller numbers
  return value >= 100 ? Math.round(value) : Number(value.toFixed(2));
}

// Helper function to format numbers with commas
function formatNumberWithCommas(value: number | undefined): string {
  if (value === undefined) return '';
  return value.toLocaleString('en-US');
}

// Add the Skeleton component definition
function Skeleton({ className }: { className?: string }) {
  return (
    <div className={`animate-pulse rounded bg-gray-200 ${className}`} />
  )
}

// Helper function to filter undefined values from apiParams for child components
function filterUndefinedParams(params: Record<string, string | undefined> | undefined): Record<string, string> | undefined {
  if (!params) return undefined;
  return Object.entries(params).reduce((acc, [key, value]) => {
    if (value !== undefined) {
      acc[key] = String(value); // Ensure value is string
    }
    return acc;
  }, {} as Record<string, string>);
}

export function TopFive({ 
  title, 
  subtitle,
  metrics = [],
  categories,
  defaultMetric = metrics[0]?.key,
  defaultCategory,
  color = 'green',
  withBorder = true,
  distributionData,
  categoryTimeSeriesData,
  chartConfig,
  apiEndpoint,
  apiParams,
  onMetricChange,
  simpleDetails = false, // Default to false for backward compatibility
  lazyLoad = false, // Default to false for backward compatibility
}: TopFiveProps) {
  const [showPercentage, setShowPercentage] = useState(false)
  const [filterType, setFilterType] = useState<FilterType>('top')
  const [selectedMetric, setSelectedMetric] = useState(defaultMetric)
  const [selectedCategory, setSelectedCategory] = useState(defaultCategory || categories?.[0]?.key)
  const [showDetails, setShowDetails] = useState(false)
  const [showDetailsTable, setShowDetailsTable] = useState(false) // For simple table view
  
  // State for API-loaded data
  const [apiData, setApiData] = useState<null | any>(null)
  const [apiLoading, setApiLoading] = useState(false) // Initialize as false
  const [apiError, setApiError] = useState<null | string>(null)
  // Track the stringified params of the last successful fetch
  const [fetchedParams, setFetchedParams] = useState<string | null>(null); 

  // Use the Intersection Observer hook
  const { ref, isInView } = useInView<HTMLDivElement>({ 
    threshold: 0.1, 
    triggerOnce: true 
  });

  // Fetch data from API if endpoint is provided
  useEffect(() => {
    const currentParamsString = JSON.stringify(apiParams);

    // Conditions to *not* fetch:
    // 1. No apiEndpoint provided
    // 2. Lazy loading is enabled AND the component is not in view
    if (!apiEndpoint || (lazyLoad && !isInView)) {
      return;
    }
    
    // Condition to fetch:
    // - The component is in view (or lazyLoad is false) AND
    // - EITHER no fetch has happened yet (fetchedParams is null) OR
    // - The apiParams have changed since the last successful fetch
    const shouldFetch = (isInView || !lazyLoad) && (fetchedParams === null || fetchedParams !== currentParamsString);

    if (!shouldFetch) {
      return; // Don't fetch if params haven't changed and we've already fetched them
    }

    const fetchData = async () => {
      setApiLoading(true);
      setApiError(null);
      // Don't reset apiData here

      try {
        // Construct URL with query parameters
        const url = new URL(apiEndpoint, window.location.origin);
        if (apiParams) {
          Object.entries(apiParams).forEach(([key, value]) => {
            if (value !== undefined) { // Filter out undefined
              url.searchParams.append(key, String(value));
            }
          });
        }
        
        const response = await fetch(url.toString());
        
        if (!response.ok) {
           let errorBody = null;
           try { errorBody = await response.json(); } catch (e) { /* Ignore */ }
           const errorMessage = errorBody?.error || `API request failed with status ${response.status}`;
           throw new Error(errorMessage);
        }
        
        const data = await response.json();
        setApiData(data);
        setFetchedParams(currentParamsString); // Store successful fetch params

      } catch (error) {
        console.error('Error fetching data from API:', error);
        setApiError(error instanceof Error ? error.message : 'Unknown error');
        setApiData(null); // Clear data on error
        // Keep fetchedParams as is
      } finally {
        setApiLoading(false);
      }
    };
    
    fetchData();
  // Dependencies: Run when endpoint, params, lazyLoad status, or visibility changes.
  }, [apiEndpoint, JSON.stringify(apiParams), lazyLoad, isInView]); 
  
  // Determine which data to use - API data or provided props
  let effectiveMetrics = metrics || [];
  let effectiveDistributionData = distributionData; // Keep distribution static for now unless API provides it
  let effectiveTimeSeriesData = categoryTimeSeriesData; // Keep time series static for now unless API provides it
  
  // If we have API data and are using an endpoint, process it
  // Important: Reset effectiveMetrics derived from API data if params change and loading starts
  const metricsFromApi = apiData && apiEndpoint && fetchedParams === JSON.stringify(apiParams);
  
  if (metricsFromApi) {
    // Map API data to the metrics format expected by the component
    // Create a new array based on the original metrics structure
     effectiveMetrics = metrics.map(metric => {
        const metricKeyInData = metric.key === 'rooms' ? 'roomsSold' : metric.key; // Handle potential key mismatch
        const dataFromApi = apiData[metricKeyInData];
        
        if (dataFromApi && Array.isArray(dataFromApi)) {
          return {
            ...metric,
            // Map the API items for this specific metric
            data: dataFromApi.map((item: any) => ({
              name: item.name || 'Unknown', // Ensure name exists
              value: formatNumber(item.value ?? 0), // Ensure value exists and format
              change: formatNumber(item.change ?? 0), // Ensure change exists and format
              prevValue: item.prevValue ? formatNumber(item.prevValue) : undefined,
              code: item.code,
            }))
          };
        }
        // If no corresponding data in API, return the original metric structure but clear its data
        // Or keep original data? Let's clear it to reflect API state.
        return { ...metric, data: [] }; 
     });
     
     // Update time series data if provided by API
     if (apiData.timeSeriesData) {
       effectiveTimeSeriesData = apiData.timeSeriesData;
     }
     // Update distribution data if provided by API (assuming structure matches)
     // Example: If API returns distribution under a key like 'distribution'
     // if (apiData.distribution) {
     //   effectiveDistributionData = apiData.distribution;
     // }
  } else if (apiEndpoint && !metricsFromApi) {
     // If using API but data isn't ready/valid for current params, clear metric data
     effectiveMetrics = metrics.map(metric => ({ ...metric, data: [] }));
     effectiveTimeSeriesData = undefined; // Or []? Depends on CategoriesDetailsDialog
     effectiveDistributionData = undefined; // Or []?
  }
  // If not using API endpoint, effectiveMetrics remains the initially passed prop.

  // Get current metric data
  const currentMetric = effectiveMetrics.find(m => m.key === selectedMetric) || effectiveMetrics[0];
  let currentData = currentMetric?.data || []; // Ensure currentData is always an array

  // Recalculate derived values whenever currentData changes
  const maxValue = currentData.length > 0 
    ? Math.max(...currentData.map(item => item.value)) 
    : 0;

  const allData = [...currentData].sort((a, b) => { // Use the potentially updated currentData
    switch (filterType) {
      case 'top':
        return b.value - a.value;
      case 'bottom':
        return a.value - b.value;
      case 'rising': // Assumes change is absolute difference
        return b.change - a.change;
      case 'falling': // Assumes change is absolute difference
        return a.change - b.change;
      default:
        return 0;
    }
  });

  const filteredData = allData.slice(0, 5); // Use the potentially updated allData

  // Add function to calculate percentage change
  const calculatePercentageChange = (current: number, change: number): number => {
    // If prevValue is available, use it for better accuracy
    // const previous = item.prevValue !== undefined ? item.prevValue : current - change;
    const previous = current - change; // Use derived previous value for now
    if (previous === 0 || previous === null || previous === undefined) {
      // Handle division by zero or undefined previous value
      // Return 0 or some indicator like Infinity or NaN based on desired behavior
      return current > 0 ? Infinity : 0; // Example: If current > 0 and prev was 0, infinite % increase
    }
    // Ensure calculation is safe
    const percentage = (change / previous) * 100;
    return isNaN(percentage) ? 0 : Number(percentage.toFixed(1)); // Handle NaN result
  }

  // Format change value based on the metric and display mode
  const formatChange = (item: MetricData): string => {
    if (showPercentage) {
      // Calculate percentage change
      const percentChange = calculatePercentageChange(item.value, item.change);
      return `${Math.abs(percentChange)}%`;
    }
    // For absolute changes, return the raw change number
    return `${Math.abs(item.change)}`;
  }

  // Modify the getColorClass function to only handle bg color
  const getColorClass = (type: 'bg') => {
    if (color === 'green') return 'bg-emerald-500';
    if (color === 'purple') return 'bg-purple-500';
    if (color === 'red') return 'bg-red-500';
    return 'bg-blue-500';
  }

  // Get current category label if categories exist
  const currentCategoryLabel = categories?.find(c => c.key === selectedCategory)?.label || 'All Categories'

  // Modify the metric selection handler
  const handleMetricChange = (metric: string) => {
    setSelectedMetric(metric);
    onMetricChange?.(metric); // Call the callback if provided
  };

  // Filter apiParams before passing to CategoriesDetailsDialog
  const filteredApiParams = filterUndefinedParams(apiParams);

  // Determine if the skeleton should be shown
  const showSkeleton = apiLoading || (apiEndpoint && lazyLoad && !fetchedParams && !apiError);

  return (
    <div ref={ref}>
      <Card className={`h-full ${withBorder ? 'bg-white border-gray-300 ' : 'bg-transparent shadow-none border-0'}`}>
        <CardHeader className="flex flex-row items-start justify-between pb-2">
          {/* Title and subtitle column */}
          <div className="flex flex-col">
            <CardTitle className="text-lg font-semibold text-gray-800">{title}</CardTitle>
            {subtitle && <CardDescription className="text-sm text-gray-500 mt-1">{subtitle}</CardDescription>}
          </div>
          
          {/* Controls bundled at top right */}
          <div className="flex items-center space-x-2 mt-0">
            {/* Only render the category dropdown if categories are provided */}
            {categories && categories.length > 0 && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button 
                    variant="ghost" 
                    size="sm"
                    className="bg-[#f2f8ff] hover:bg-[#f2f8ff] text-[#342630] rounded-full px-4 font-semibold"
                  >
                    {currentCategoryLabel} <TriangleDown className="ml-2" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  {categories.map(category => (
                    <DropdownMenuItem 
                      key={category.key}
                      onClick={() => setSelectedCategory(category.key)}
                    >
                      {category.label}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            )}
            
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowPercentage(!showPercentage)}
              className="flex items-center justify-center w-8 h-8 rounded-full bg-[#f2f8ff] hover:bg-[#f2f8ff] text-[#342630] p-0"
            >
              {showPercentage ? (
                <PercentIcon className="h-4 w-4" />
              ) : (
                <HashIcon className="h-4 w-4" />
              )}
            </Button>
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button 
                  variant="ghost" 
                  size="sm"
                  className="bg-[#f2f8ff] hover:bg-[#f2f8ff] text-[#342630] rounded-full px-4 font-semibold"
                >
                  {filterDisplayNames[filterType]} <TriangleDown className="ml-2" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuItem onClick={() => setFilterType('top')}>
                  {filterDisplayNames.top}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setFilterType('bottom')}>
                  {filterDisplayNames.bottom}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setFilterType('rising')}>
                  {filterDisplayNames.rising}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setFilterType('falling')}>
                  {filterDisplayNames.falling}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button 
                  variant="ghost" 
                  size="sm"
                  className="bg-[#f2f8ff] hover:bg-[#f2f8ff] text-[#342630] rounded-full px-4"
                >
                  {currentMetric?.label || 'Select Metric'} <TriangleDown className="ml-2" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                {effectiveMetrics.map(metric => (
                  <DropdownMenuItem 
                    key={metric.key}
                    onClick={() => handleMetricChange(metric.key)}
                  >
                    {metric.label}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </CardHeader>
        
        <CardContent className="pt-3">
          {/* Loading state */}
          {showSkeleton && (
            <div className="space-y-4 pt-4"> {/* Add pt-4 to match data row padding */}
              {Array.from({ length: 5 }).map((_, index) => (
                <div key={`skeleton-${index}`} className="relative mb-4 last:mb-0"> {/* Match structure of data rows */}
                  <div className="flex items-center justify-between py-4"> {/* Match padding */}
                    {/* Skeleton for name */}
                    <Skeleton className="h-5 w-2/5" /> 
                    <div className="flex items-center">
                      {/* Skeleton for value */}
                      <Skeleton className="h-5 w-16 mr-8" /> 
                      {/* Skeleton for change */}
                      <Skeleton className="h-5 w-20" /> 
                    </div>
                  </div>
                  {/* Skeleton for progress bar */}
                  <div className="absolute bottom-0 left-0 right-0 h-1"> 
                    <Skeleton className="h-full w-full" />
                  </div>
                </div>
              ))}
              {/* Skeleton for "View Details" button area to maintain height */}
              <div className="mt-6 pt-4 border-t border-transparent"> {/* Match spacing, transparent border */}
                 <div className="flex justify-end">
                   <Skeleton className="h-9 w-24" /> {/* Approx size of Button */}
                 </div>
              </div>
            </div>
          )}
          
          {/* Error state - Show only if an error occurred */}
          {apiError && !apiLoading && (
            <div className="bg-red-50 text-red-700 p-3 rounded-md mb-4">
              <p>Error loading data: {apiError}</p>
            </div>
          )}
          
          {/* Data display - Show if not loading, no error, and data is ready */}
          {/* Data ready means: Not loading AND ( (using API AND fetch completed for current params) OR (not using API) ) */}
          {!showSkeleton && !apiError && (apiEndpoint ? fetchedParams === JSON.stringify(apiParams) : true) && (
            <>
              {/* Show actual data */}
              {/* Check if filteredData has items before mapping */}
              {filteredData.length > 0 ? filteredData.map((item, index) => (
                <div
                  key={item.code || item.name || index} // Use index as fallback key
                  className="relative mb-4 last:mb-0"
                >
                  <div className="flex items-center justify-between py-4">
                    <span className="text-gray-600 text-sm truncate pr-2" title={item.name}>{item.name || 'N/A'}</span> {/* Add truncate and title */}
                    <div className="flex items-center flex-shrink-0"> {/* Prevent shrinking */}
                      <span className="text-sm font-medium w-16 text-right mr-8">
                        {currentMetric?.prefix || ''}{formatNumberWithCommas(item.value)}{currentMetric?.suffix || ''}
                      </span>
                      <span 
                        className={`flex items-center text-sm ${
                          // Use a small threshold for change to determine color if needed
                          item.change > 0 ? 'text-green-500' : item.change < 0 ? 'text-red-500' : 'text-gray-500' // Handle zero change
                        } w-20 justify-end`}
                      >
                        {item.change !== 0 && ( // Only show icon if change is non-zero
                           item.change > 0 ? (
                             <ArrowUpIcon className="h-4 w-4 mr-1 flex-shrink-0" /> // Add flex-shrink-0
                           ) : (
                             <ArrowDownIcon className="h-4 w-4 mr-1 flex-shrink-0" /> // Add flex-shrink-0
                           )
                        )}
                        {/* Format change value */}
                        {showPercentage ? 
                          `${Math.abs(calculatePercentageChange(item.value, item.change))}%` : 
                          `${formatNumberWithCommas(Math.abs(item.change))}`}
                      </span>
                    </div>
                  </div>
                  {/* Progress bar container */}
                  <div className="absolute bottom-0 left-0 right-0 h-1 bg-gray-100">
                    <div 
                      className={`h-full ${getColorClass('bg')} transition-all duration-300`}
                      style={{ 
                        // Handle maxValue being 0
                        width: maxValue > 0 ? `${(item.value / maxValue) * 100}%` : '0%'
                      }} 
                    />
                  </div>
                </div>
              )) : (
                 // Show "No data" message if filteredData is empty after potential fetch
                 <div className="text-center text-gray-500 py-10">
                   No data available for the selected criteria.
                 </div>
              )}

              {/* Fill with empty rows if needed (Only if filteredData has < 5 items but > 0) */}
              {/* This might be less necessary if the "No data available" message covers the empty case */}
              {filteredData.length > 0 && filteredData.length < 5 && Array.from({ length: 5 - filteredData.length }).map((_, index) => (
                <div
                  key={`empty-${index}`}
                  className="relative mb-4 last:mb-0 opacity-0 pointer-events-none" // Hide visually but maintain space
                >
                   {/* Simplified empty row structure to maintain spacing */}
                  <div className="flex items-center justify-between py-4">
                     <span className="text-gray-400 text-sm italic">&nbsp;</span>
                     <div className="flex items-center">
                       <span className="text-sm font-medium w-16 text-right mr-8">&nbsp;</span>
                       <span className="flex items-center text-sm w-20 justify-end">&nbsp;</span>
                     </div>
                   </div>
                   <div className="absolute bottom-0 left-0 right-0 h-1 bg-gray-100"></div>
                 </div>
               ))}
            </>
          )}

          {/* View Details button section - Render only when data is loaded and exists */}
          {/* Condition: Not skeleton, no error, AND (using API and fetch complete OR not using API) AND currentData has items */}
          {!showSkeleton && !apiError && (apiEndpoint ? fetchedParams === JSON.stringify(apiParams) : true) && currentData.length > 0 && (
            <div className="mt-6 pt-4 border-t border-gray-200">
              <div className="flex justify-end">
                <Button
                  variant="ghost"
                  className="text-blue-600 hover:text-blue-800 font-medium text-sm"
                  onClick={() => simpleDetails ? setShowDetailsTable(true) : setShowDetails(true)}
                  disabled={apiLoading} // Disable button while loading new data
                >
                  View Details
                </Button>
              </div>
            </div>
          )}
          {/* Placeholder for button area - Render when data isn't ready or is empty */}
          {(showSkeleton || apiError || !(apiEndpoint ? fetchedParams === JSON.stringify(apiParams) : true) || currentData.length === 0) && (
             <div className="mt-6 pt-4 border-t border-transparent"> {/* Match spacing, transparent border */}
               <div className="flex justify-end">
                 {/* Empty div or subtle placeholder to maintain height if needed */}
                 <div className="h-9 w-24"></div> 
               </div>
             </div>
          )}
        </CardContent>
      </Card>

      {/* Choose which details dialog to show based on simpleDetails prop */}
      {!simpleDetails && (
        <CategoriesDetailsDialog 
          open={showDetails}
          onOpenChange={setShowDetails}
          title={categories && selectedCategory ? `${title} - ${currentCategoryLabel}` : title}
          prefix={currentMetric?.prefix || ''}
          // Pass the filtered params here
          apiParams={filteredApiParams} 
          // Pass the apiEndpoint if it exists
          apiEndpoint={apiEndpoint}
          // Optionally pass the fetched timeSeries data if available and ready
          categoryTimeSeriesData={apiEndpoint && fetchedParams === JSON.stringify(apiParams) ? effectiveTimeSeriesData : categoryTimeSeriesData}
          // Optionally pass the fetched distribution data if available and ready
          distributionData={apiEndpoint && fetchedParams === JSON.stringify(apiParams) ? effectiveDistributionData : distributionData}
          chartConfig={chartConfig}
        />
      )}

      {/* Simple details table dialog */}
      <Dialog open={showDetailsTable} onOpenChange={setShowDetailsTable}>
        <DialogContent className="max-w-[45vw] max-h-[90vh] flex flex-col p-0">
          <DialogHeader className="flex-none py-6 pb-2" showBorder={true}>
            <DialogTitle className="text-lg font-medium px-4">
              {title} {categories && selectedCategory ? `- ${currentCategoryLabel}` : ''}
            </DialogTitle>
          </DialogHeader>
          
          <div className="flex-1 overflow-y-auto pr-6 bg-[#f2f8ff] px-4 pb-4 pt-4">
            <div className="flex flex-col gap-6">
              {/* Table Card */}
              <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-300">
                <h3 className="text-base mb-6 font-medium">Details for {currentMetric?.label || 'Metric'}</h3>
                <div className="border rounded-lg">
                  <Table>
                    <TableHeader>
                      <TableRow className="hover:bg-transparent">
                        <TableHead className="bg-[#f0f4fa]/60 w-[40%] text-left">Name</TableHead>
                        <TableHead className="bg-[#f0f4fa]/60 w-[30%] text-left">Value</TableHead>
                        <TableHead className="bg-[#f0f4fa]/60 w-[30%] text-left">Change</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {/* Show all data points, use allData derived from current state */}
                      {allData.length > 0 ? allData.map((item, idx) => (
                        <TableRow key={item.code || item.name || `data-${idx}`} className="border-b border-[#d0d7e3] last:border-0">
                          <TableCell className="bg-[#f0f4fa]/40 border-r border-[#d0d7e3]">
                            {item.name}
                          </TableCell>
                          <TableCell className="border-r border-[#d0d7e3]">
                            {currentMetric?.prefix || ''}{formatNumberWithCommas(item.value)}{currentMetric?.suffix || ''}
                          </TableCell>
                          <TableCell className={item.change > 0 ? "text-emerald-500" : "text-red-500"}>
                            {item.change > 0 ? '+' : ''}{formatNumberWithCommas(item.change)} 
                            ({calculatePercentageChange(item.value, item.change).toFixed(1)}%)
                          </TableCell>
                        </TableRow>
                      )) : ( // Handle case where allData is empty
                        <TableRow>
                          <TableCell colSpan={3} className="text-center py-4 text-gray-500">
                            No data available
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}