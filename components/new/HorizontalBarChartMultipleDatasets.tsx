"use client"

import { Button } from "@/components/ui/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { HorizontalBarChart } from "./HorizontalBarChart"
import { useState, useEffect } from "react"

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
  apiParams
}: HorizontalBarChartMultipleDatasetsProps) {
  // State for internally fetched data, loading, and errors
  const [internalDatasets, setInternalDatasets] = useState<DataSet[] | null>(null)
  const [internalLoading, setInternalLoading] = useState(false)
  const [internalError, setInternalError] = useState<string | null>(null)

  // Determine initial default dataset key
  const determineDefaultDatasetKey = (datasets: DataSet[] | null): string | undefined => {
    if (defaultDatasetProp) return defaultDatasetProp;
    if (datasets && datasets.length > 0) return datasets[0].key;
    return undefined;
  };

  const [selectedDataset, setSelectedDataset] = useState<string | undefined>(
    determineDefaultDatasetKey(url ? internalDatasets : datasetsProp)
  );
  const [selectedCategory, setSelectedCategory] = useState(defaultCategory)

  // Effect to fetch data if URL is provided
  useEffect(() => {
    // Only fetch if a URL is provided
    if (!url) {
      setInternalDatasets(null); // Clear internal data if URL is removed
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
          throw new Error(`Failed to fetch data: ${response.status} ${response.statusText}`);
        }
        const data: DataSet[] = await response.json(); // Expect API to return DataSet[] directly
        setInternalDatasets(data);
        // Reset selected dataset if the previous one doesn't exist in new data or if none was selected
        const newDefaultKey = determineDefaultDatasetKey(data);
        if (!selectedDataset || !data.some(d => d.key === selectedDataset)) {
          setSelectedDataset(newDefaultKey);
        }

      } catch (err) {
        console.error('Error fetching data in HorizontalBarChartMultipleDatasets:', err);
        setInternalError(err instanceof Error ? err.message : 'An unknown error occurred');
        setInternalDatasets(null); // Clear data on error
      } finally {
        setInternalLoading(false);
      }
    };

    fetchData();
  // Depend on url and stringified apiParams to refetch when they change
  }, [url, JSON.stringify(apiParams)]);

  // Determine which datasets, loading state, and error state to use
  const isLoading = url ? internalLoading : loadingProp;
  const error = url ? internalError : errorProp;
  const datasets = url ? internalDatasets : datasetsProp;

  // Effect to update selectedDataset when datasets change (either from props or fetch)
   useEffect(() => {
     if (!selectedDataset && datasets && datasets.length > 0) {
       setSelectedDataset(determineDefaultDatasetKey(datasets));
     }
   }, [datasets, selectedDataset]);


  // Find the current dataset based on the selected key
   const currentDataset = datasets?.find(d => d.key === selectedDataset) ?? datasets?.[0];
  const currentCategory = categories?.find(c => c.key === selectedCategory) || categories?.[0]

  // Handle error state
  if (error && !isLoading) { // Only show error if not loading
    return (
      <div className="relative min-h-[400px]"> {/* Ensure minimum height */}
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
  if (!isLoading && currentDataset?.data) {
     chartData = [...currentDataset.data]; // Create a copy
     if (sort && chartData.length > 0) {
       chartData.sort((a, b) => extractNumber(a.range) - extractNumber(b.range));
     }
  }

  return (
    <div className="relative min-h-[400px]"> {/* Ensure minimum height */}
      {/* Unified Loading State */}
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-white/80 z-20">
          {/* Use Skeleton for a smoother loading appearance */}
           <div className="w-full h-[400px] p-8 space-y-4">
              <Skeleton className="h-6 w-3/4" />
              <Skeleton className="h-6 w-1/2" />
              <Skeleton className="h-6 w-5/6" />
              <Skeleton className="h-6 w-2/3" />
              <Skeleton className="h-6 w-3/4" />
              <Skeleton className="h-6 w-1/2" />
           </div>
        </div>
      )}

      {/* Controls */}
       <div className={`absolute right-8 top-6 z-10 flex space-x-2 ${isLoading ? 'opacity-50 pointer-events-none' : ''}`}> {/* Dim controls when loading */}
        {categories && categories.length > 0 && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button 
                variant="ghost" 
                size="sm"
                className="bg-[#f2f8ff] hover:bg-[#f2f8ff] text-[#342630] rounded-full px-4"
                disabled={isLoading || !categories || categories.length === 0} // Disable when loading or no categories
              >
                {currentCategory?.label || "All"} <TriangleDown className="ml-2" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              {categories.map(category => (
                <DropdownMenuItem 
                  key={category.key}
                  onClick={() => setSelectedCategory(category.key)}
                  disabled={isLoading} // Disable items when loading
                >
                  {category.label}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
        
        {/* Only show dataset dropdown if there are multiple datasets */}
        {datasets && datasets.length > 1 && (
           <DropdownMenu>
             <DropdownMenuTrigger asChild>
               <Button 
                 variant="ghost" 
                 size="sm"
                 className="bg-[#f2f8ff] hover:bg-[#f2f8ff] text-[#342630] rounded-full px-4"
                 disabled={isLoading || !datasets || datasets.length <= 1} // Disable when loading or only one dataset
               >
                 {currentDataset?.title || 'Select Dataset'} <TriangleDown className="ml-2" />
               </Button>
             </DropdownMenuTrigger>
             <DropdownMenuContent>
               {datasets.map(dataset => (
                 <DropdownMenuItem 
                   key={dataset.key}
                   onClick={() => setSelectedDataset(dataset.key)}
                   disabled={isLoading} // Disable items when loading
                 >
                   {dataset.title}
                 </DropdownMenuItem>
               ))}
             </DropdownMenuContent>
           </DropdownMenu>
        )}
      </div>
      
      {/* Chart */}
      <HorizontalBarChart 
        // Pass the potentially sorted and ready data, or an empty array if loading/no data
        data={chartData} 
        // Use title from the current dataset, provide fallback
        title={currentDataset?.title || ""} 
        leftMargin={leftMargin}
      />
    </div>
  )
} 