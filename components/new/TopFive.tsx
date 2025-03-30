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
}: TopFiveProps) {
  const [showPercentage, setShowPercentage] = useState(false)
  const [filterType, setFilterType] = useState<FilterType>('top')
  const [selectedMetric, setSelectedMetric] = useState(defaultMetric)
  const [selectedCategory, setSelectedCategory] = useState(defaultCategory || categories?.[0]?.key)
  const [showDetails, setShowDetails] = useState(false)
  const [showDetailsTable, setShowDetailsTable] = useState(false) // For simple table view
  
  // Add state for API-loaded data
  const [apiData, setApiData] = useState<null | any>(null)
  const [apiLoading, setApiLoading] = useState(false)
  const [apiError, setApiError] = useState<null | string>(null)
  
  // Fetch data from API if endpoint is provided
  useEffect(() => {
    if (!apiEndpoint) return;
    
    const fetchData = async () => {
      try {
        setApiLoading(true);
        setApiError(null);
        
        // Construct URL with query parameters
        const url = new URL(apiEndpoint, window.location.origin);
        if (apiParams) {
          Object.entries(apiParams).forEach(([key, value]) => {
            if (value !== undefined) {
              url.searchParams.append(key, value);
            }
          });
        }

        
        const response = await fetch(url.toString());
        
        if (!response.ok) {
          throw new Error(`API request failed with status ${response.status}`);
        }
        
        const data = await response.json();
        setApiData(data);
      } catch (error) {
        console.error('Error fetching data from API:', error);
        setApiError(error instanceof Error ? error.message : 'Unknown error');
      } finally {
        setApiLoading(false);
      }
    };
    
    fetchData();
  }, [apiEndpoint, JSON.stringify(apiParams)]);
  
  // Determine which data to use - API data or provided props
  let effectiveMetrics = metrics || [];
  let effectiveDistributionData = distributionData;
  let effectiveTimeSeriesData = categoryTimeSeriesData;
  
  // If we have API data, use it instead of the prop data
  if (apiData) {
    // Map API data to the metrics format expected by the component
    if (apiData.revenue && selectedMetric === 'revenue') {
      effectiveMetrics = metrics.map(metric => {
        if (metric.key === 'revenue') {
          return {
            ...metric,
            data: apiData.revenue.map((item: any) => ({
              ...item,
              value: formatNumber(item.value),
              change: formatNumber(item.change)
            }))
          };
        } else if (metric.key === 'rooms' && apiData.roomsSold) {
          return {
            ...metric,
            data: apiData.roomsSold.map((item: any) => ({
              ...item,
              value: formatNumber(item.value),
              change: formatNumber(item.change)
            }))
          };
        } else if (metric.key === 'adr' && apiData.adr) {
          return {
            ...metric,
            data: apiData.adr.map((item: any) => ({
              ...item,
              value: formatNumber(item.value),
              change: formatNumber(item.change)
            }))
          };
        }
        return metric;
      });
    } else if (apiData.roomsSold && selectedMetric === 'rooms') {
      effectiveMetrics = metrics.map(metric => {
        if (metric.key === 'rooms') {
          return {
            ...metric,
            data: apiData.roomsSold.map((item: any) => ({
              ...item,
              value: formatNumber(item.value),
              change: formatNumber(item.change)
            }))
          };
        } else if (metric.key === 'revenue' && apiData.revenue) {
          return {
            ...metric,
            data: apiData.revenue.map((item: any) => ({
              ...item,
              value: formatNumber(item.value),
              change: formatNumber(item.change)
            }))
          };
        } else if (metric.key === 'adr' && apiData.adr) {
          return {
            ...metric,
            data: apiData.adr.map((item: any) => ({
              ...item,
              value: formatNumber(item.value),
              change: formatNumber(item.change)
            }))
          };
        }
        return metric;
      });
    } else if (apiData.adr && selectedMetric === 'adr') {
      effectiveMetrics = metrics.map(metric => {
        if (metric.key === 'adr') {
          return {
            ...metric,
            data: apiData.adr.map((item: any) => ({
              ...item,
              value: formatNumber(item.value),
              change: formatNumber(item.change)
            }))
          };
        } else if (metric.key === 'revenue' && apiData.revenue) {
          return {
            ...metric,
            data: apiData.revenue.map((item: any) => ({
              ...item,
              value: formatNumber(item.value),
              change: formatNumber(item.change)
            }))
          };
        } else if (metric.key === 'rooms' && apiData.roomsSold) {
          return {
            ...metric,
            data: apiData.roomsSold.map((item: any) => ({
              ...item,
              value: formatNumber(item.value),
              change: formatNumber(item.change)
            }))
          };
        }
        return metric;
      });
    }
    
    // For time series data
    if (apiData.timeSeriesData) {
      effectiveTimeSeriesData = apiData.timeSeriesData;
    }
  }
  
  // Get current metric data
  const currentMetric = effectiveMetrics.find(m => m.key === selectedMetric) || effectiveMetrics[0]
  const currentData = currentMetric?.data || []

  // Get all data for simple details view
  const allData = currentData.sort((a, b) => {
    switch (filterType) {
      case 'top':
        return b.value - a.value
      case 'bottom':
        return a.value - b.value
      case 'rising':
        return b.change - a.change
      case 'falling':
        return a.change - b.change
      default:
        return 0
    }
  });

  // Find the maximum value to calculate percentages
  const maxValue = currentData.length > 0 
    ? Math.max(...currentData.map(item => item.value)) 
    : 0

  // Filter and sort data based on selected filter
  const filteredData = [...allData].slice(0, 5)

  // Add function to calculate percentage change
  const calculatePercentageChange = (current: number, change: number): number => {
    const previous = current - change;
    if (previous === 0) return 0;
    return Number(((change / previous) * 100).toFixed(1));
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

  return (
    <>
      <Card className={`${withBorder ? 'bg-white border-gray-300 ' : 'bg-transparent shadow-none border-0'}`}>
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
          {apiLoading && (
            <div className="flex justify-center items-center py-4">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
            </div>
          )}
          
          {/* Error state */}
          {apiError && (
            <div className="bg-red-50 text-red-700 p-3 rounded-md mb-4">
              <p>Error loading data: {apiError}</p>
            </div>
          )}
          
          {/* Data display - always show 5 rows */}
          {!apiLoading && !apiError && (
            <>
              {/* Show actual data */}
              {filteredData.map((item, index) => (
                <div
                  key={item.code || item.name || index}
                  className="relative mb-4 last:mb-0"
                >
                  <div className="flex items-center justify-between py-4">
                    <span className="text-gray-600 text-sm">{item.name}</span>
                    <div className="flex items-center">
                      <span className="text-sm font-medium w-16 text-right mr-8">
                        {currentMetric?.prefix || ''}{formatNumberWithCommas(item.value)}{currentMetric?.suffix || ''}
                      </span>
                      <span 
                        className={`flex items-center text-sm ${
                          item.change > 0 ? 'text-green-500' : 'text-red-500'
                        } w-20 justify-end`}
                      >
                        {item.change > 0 ? (
                          <ArrowUpIcon className="h-4 w-4 mr-1" />
                        ) : (
                          <ArrowDownIcon className="h-4 w-4 mr-1" />
                        )}
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
                        width: `${(item.value / maxValue) * 100}%`
                      }} 
                    />
                  </div>
                </div>
              ))}

              {/* Fill with empty rows if needed */}
              {Array.from({ length: Math.max(0, 5 - filteredData.length) }).map((_, index) => (
                <div
                  key={`empty-${index}`}
                  className="relative mb-4 last:mb-0"
                >
                  <div className="flex items-center justify-between py-4">
                    <span className="text-gray-400 text-sm italic">No data</span>
                    <div className="flex items-center">
                      <span className="text-sm font-medium w-16 text-right mr-8 text-gray-300">
                        {currentMetric?.prefix || ''}0{currentMetric?.suffix || ''}
                      </span>
                      <span className="flex items-center text-sm text-gray-300 w-20 justify-end">
                        0
                      </span>
                    </div>
                  </div>
                  {/* Empty progress bar container */}
                  <div className="absolute bottom-0 left-0 right-0 h-1 bg-gray-100">
                    <div className="h-full bg-gray-100" style={{ width: "0%" }} />
                  </div>
                </div>
              ))}
            </>
          )}

          {/* View Details button section */}
          {!apiLoading && !apiError && currentData.length > 0 && (
            <div className="mt-6 pt-4 border-t border-gray-200">
              <div className="flex justify-end">
                <Button
                  variant="ghost"
                  className="text-blue-600 hover:text-blue-800 font-medium text-sm"
                  onClick={() => simpleDetails ? setShowDetailsTable(true) : setShowDetails(true)}
                >
                  View Details
                </Button>
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
          apiEndpoint={apiEndpoint}
          apiParams={apiParams}
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
                      {/* Show all data points, not just the filtered ones */}
                      {allData.map((item, idx) => (
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
                      ))}
                      {allData.length === 0 && (
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
    </>
  )
}