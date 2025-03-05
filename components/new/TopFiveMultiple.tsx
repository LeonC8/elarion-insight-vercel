import { ArrowUpIcon, ArrowDownIcon, PercentIcon, HashIcon } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { useState } from "react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Button } from "@/components/ui/button"
import { CategoriesDetailsDialog } from "./CategoriesDetailsDialog"

interface MetricData {
  name: string
  value: number
  change: number      // This will now represent the absolute change
  prevValue?: number  // Optional previous value for more accurate percentage calc
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

interface TopFiveMultipleProps {
  title: string
  subtitle?: string // New optional subtitle prop
  metrics: MetricOption[]
  categories: CategoryOption[] // New prop for category options
  defaultMetric?: string
  defaultCategory?: string // New default category prop
  color?: 'green' | 'blue'
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

export function TopFiveMultiple({ 
  title, 
  subtitle,
  metrics,
  categories,
  defaultMetric = metrics[0]?.key,
  defaultCategory = categories[0]?.key,
  color = 'green',
  withBorder = true,
  distributionData,
  categoryTimeSeriesData,
  chartConfig,
}: TopFiveMultipleProps) {
  const [showPercentage, setShowPercentage] = useState(false)
  const [filterType, setFilterType] = useState<FilterType>('top')
  const [selectedMetric, setSelectedMetric] = useState(defaultMetric)
  const [selectedCategory, setSelectedCategory] = useState(defaultCategory)
  const [showDetails, setShowDetails] = useState(false)
  
  // Get current metric data
  const currentMetric = metrics.find(m => m.key === selectedMetric) || metrics[0]
  const currentData = currentMetric.data

  // Find the maximum value to calculate percentages
  const maxValue = Math.max(...currentData.map(item => item.value))

  // Filter and sort data based on selected filter
  const filteredData = [...currentData].sort((a, b) => {
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
  }).slice(0, 5)

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
    return color === 'green' ? 'bg-emerald-500' : 'bg-blue-500'
  }

  // Get current category label
  const currentCategoryLabel = categories.find(c => c.key === selectedCategory)?.label || categories[0].label

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
                  {currentMetric.label} <TriangleDown className="ml-2" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                {metrics.map(metric => (
                  <DropdownMenuItem 
                    key={metric.key}
                    onClick={() => setSelectedMetric(metric.key)}
                  >
                    {metric.label}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </CardHeader>
        
        <CardContent className="pt-3">
          {filteredData.map((item, index) => (
            <div
              key={item.name}
              className="relative mb-4 last:mb-0"
            >
              <div className="flex items-center justify-between py-4">
                <span className="text-gray-600 text-sm">{item.name}</span>
                <div className="flex items-center">
                  <span className="text-sm font-medium w-16 text-right mr-8">
                    {currentMetric.prefix || ''}{item.value}{currentMetric.suffix || ''}
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
                    {formatChange(item)}
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
          
          {/* View Details button section */}
          <div className="mt-6 pt-4 border-t border-gray-200">
            <div className="flex justify-end">
              <Button
                variant="ghost"
                className="text-blue-600 hover:text-blue-800 font-medium text-sm"
                onClick={() => setShowDetails(true)}
              >
                View Details
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
      <CategoriesDetailsDialog 
        open={showDetails}
        onOpenChange={setShowDetails}
        title={`${title} - ${currentCategoryLabel}`}
        prefix={currentMetric.prefix || ''}
      />
    </>
  )
} 