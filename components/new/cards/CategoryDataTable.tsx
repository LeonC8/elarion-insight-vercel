import * as React from "react"
import { Card, CardHeader, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ChevronLeftIcon, ChevronRightIcon } from 'lucide-react'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

// Helper function for formatting percentage change in tables (copied and adapted)
const formatPercentageChange = (current: number, previous: number): string => {
  // Ensure values are numbers and finite before proceeding
  const currentVal = Number(current);
  const previousVal = Number(previous);

  if (!isFinite(currentVal) || !isFinite(previousVal)) return '-'; // Handle non-finite numbers

  if (previousVal === 0 && currentVal === 0) return '-';
  if (previousVal === 0) return '+100.0%'; // Current > 0
  if (currentVal === 0) return '-100.0%'; // Previous > 0

  const change = ((currentVal - previousVal) / previousVal) * 100;
  // Clamp change to avoid extreme values like Infinity/-Infinity if previous is extremely small
  const clampedChange = Math.max(-1000, Math.min(1000, change));
  return `${clampedChange > 0 ? '+' : ''}${clampedChange.toFixed(1)}%`;
};

// Interface for metric configuration
interface MetricConfig {
  name: string;
  config: {
    supportsPie: boolean;
    supportsBar: boolean;
    supportsNormal: boolean;
    supportsStacked: boolean;
    prefix?: string;
    suffix?: string;
  }
}

// Define the TableData interface to handle dynamic metrics
interface TableData {
  category: string;
  [key: string]: any; // Allow dynamic metric properties
}

// Define the props interface with metrics
interface CategoryDataTableProps {
  title: string;
  data: TableData[];
  defaultPrefix?: string;
  availableMetrics: {[key: string]: MetricConfig};
}

export function CategoryDataTable({
  title,
  data,
  defaultPrefix = "€",
  availableMetrics
}: CategoryDataTableProps) {
  const metricKeys = Object.keys(availableMetrics);
  
  // Process the title to remove "Top" and surrounding whitespace
  const processedTitle = title.replace(/\s?Top\s?/i, ' ').trim();

  // Add ref for table container to enable scrolling
  const tableContainerRef = React.useRef<HTMLDivElement>(null)
  
  // Add state for shadow
  const [showRightShadow, setShowRightShadow] = React.useState(true)
  // Add state for viewing all rows
  const [viewAll, setViewAll] = React.useState(false)

  // Initial data to display (limited to 10 rows)
  const displayData = viewAll ? data : data.slice(0, 10)

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
  
  return (
    <Card className="border-gray-300">
      <CardHeader>
        <div className="flex justify-between items-center">
          <h3 className="text-lg font-medium">All {processedTitle}</h3>
          {metricKeys.length > 3 && (
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
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className="border rounded-lg overflow-x-auto relative" ref={tableContainerRef}>
          <div className="relative">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="bg-[#f0f4fa] w-[12%] sticky left-0 z-30 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">
                    Category
                  </TableHead>
                  
                  {/* Generate columns dynamically */}
                  {metricKeys.map(metricKey => (
                    <React.Fragment key={metricKey}>
                      <TableHead className="bg-[#f0f4fa] text-right min-w-[150px]">
                        {availableMetrics[metricKey].name} CY
                      </TableHead>
                      <TableHead className="bg-[#f0f4fa] text-right min-w-[150px]">
                        {availableMetrics[metricKey].name} LY
                      </TableHead>
                      <TableHead className="bg-[#f0f4fa] text-right min-w-[150px]">
                        Change
                      </TableHead>
                    </React.Fragment>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {displayData.map((row, idx) => (
                  <TableRow key={idx} className="border-b border-[#d0d7e3] last:border-0">
                    <TableCell className="w-[12%] text-left border-r border-[#d0d7e3] sticky left-0 bg-white z-20 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">
                      {row.category}
                    </TableCell>
                    
                    {/* Generate data cells dynamically */}
                    {metricKeys.map((metricKey, metricIdx) => {
                      const metricConfig = availableMetrics[metricKey];
                      const currentValue = row[metricKey] || 0;
                      const previousValue = row[`${metricKey}Previous`] || 0;
                      
                      // Use metric-specific prefix if defined, otherwise use empty string
                      // This ensures metrics like 'roomsSold' won't show a € sign
                      const metricPrefix = metricConfig.config.prefix !== undefined 
                        ? metricConfig.config.prefix 
                        : metricKey.toLowerCase().includes('room') && !metricKey.toLowerCase().includes('revenue')
                          ? '' // No prefix for room-related metrics (except revenue)
                          : defaultPrefix;

                      const metricSuffix = metricConfig.config.suffix || '';
                      
                      const isLastMetric = metricIdx === metricKeys.length - 1;
                      
                      return (
                        <React.Fragment key={metricKey}>
                          <TableCell className="text-right border-r border-[#d0d7e3] min-w-[150px]">
                            {metricPrefix}{currentValue.toLocaleString()}{metricSuffix}
                          </TableCell>
                          
                          <TableCell className="text-right border-r border-[#d0d7e3] min-w-[150px]">
                            {metricPrefix}{previousValue.toLocaleString()}{metricSuffix}
                          </TableCell>
                          
                          <TableCell className={`text-right min-w-[150px] ${!isLastMetric ? 'border-r border-[#d0d7e3]' : ''} ${
                            // Updated color logic based on MainTimeSeriesDialog
                            (currentValue > previousValue || (previousValue === 0 && currentValue > 0))
                              ? "text-emerald-500"
                              : (currentValue < previousValue || (currentValue === 0 && previousValue > 0))
                              ? "text-red-500"
                              : "text-gray-700" // Use gray for no change (including 0 vs 0)
                          }`}>
                            {/* Use the new helper function for formatting */}
                            {formatPercentageChange(currentValue, previousValue)}
                          </TableCell>
                        </React.Fragment>
                      );
                    })}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            {/* Add shadow overlay */}
            {showRightShadow && (
              <div className="absolute top-0 right-0 bottom-0 w-8 pointer-events-none shadow-[inset_-12px_0_8px_-8px_rgba(0,0,0,0.075)]" />
            )}
          </div>
        </div>
        
        {/* Only show View All button if there are more than 10 rows */}
        {data.length > 10 && (
          <div className="flex justify-center mt-4">
            <Button 
              variant="outline" 
              onClick={() => setViewAll(!viewAll)}
              className="text-sm"
            >
              {viewAll ? "Show Less" : "View All"}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
} 