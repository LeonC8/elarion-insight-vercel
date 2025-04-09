"use client"

import { Button } from "@/components/ui/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { HorizontalBarChart } from "./HorizontalBarChart"
import { useState, useEffect } from "react"
import { useInView } from "@/hooks/useInView"

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
  apiParams,
  lazyLoad = false,
}: HorizontalBarChartMultipleDatasetsProps) {
  // State for internally fetched data, loading, and errors
  const [internalDatasets, setInternalDatasets] = useState<DataSet[] | null>(null)
  const [internalLoading, setInternalLoading] = useState(false)
  const [internalError, setInternalError] = useState<string | null>(null)
  const [fetchedParams, setFetchedParams] = useState<string | null>(null);

  // Determine initial default dataset key
  const determineDefaultDatasetKey = (datasets: DataSet[] | null): string | undefined => {
    if (defaultDatasetProp) return defaultDatasetProp;
    if (datasets && datasets.length > 0) return datasets[0].key;
    return undefined;
  };

  const [selectedDataset, setSelectedDataset] = useState<string | undefined>(
    !url ? determineDefaultDatasetKey(datasetsProp) : undefined
  );
  const [selectedCategory, setSelectedCategory] = useState(defaultCategory)

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
   }, [datasets, defaultDatasetProp]);


  // Find the current dataset based on the selected key
   const currentDataset = datasets?.find(d => d.key === selectedDataset) ?? (datasets?.length > 0 ? datasets[0] : null);
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
       chartData.sort((a, b) => extractNumber(a.range) - extractNumber(b.range));
     }
  }

  const showSkeleton = isLoading || (url && lazyLoad && !fetchedParams && !internalError);

  return (
    <div ref={ref} className="relative min-h-[400px]">
      {showSkeleton && (
        <div className="absolute inset-0 flex items-center justify-center bg-white/80 z-20">
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

      <div className={`absolute right-8 top-6 z-10 flex space-x-2 ${isLoading ? 'opacity-50 pointer-events-none' : ''}`}>
        {categories && categories.length > 0 && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button 
                variant="ghost" 
                size="sm"
                className="bg-[#f2f8ff] hover:bg-[#f2f8ff] text-[#342630] rounded-full px-4"
                disabled={isLoading || !categories || categories.length === 0}
              >
                {currentCategory?.label || "All"} <TriangleDown className="ml-2" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              {categories.map(category => (
                <DropdownMenuItem 
                  key={category.key}
                  onClick={() => setSelectedCategory(category.key)}
                  disabled={isLoading}
                >
                  {category.label}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
        
        {datasets && datasets.length > 1 && (
           <DropdownMenu>
             <DropdownMenuTrigger asChild>
               <Button 
                 variant="ghost" 
                 size="sm"
                 className="bg-[#f2f8ff] hover:bg-[#f2f8ff] text-[#342630] rounded-full px-4"
                 disabled={isLoading || !datasets || datasets.length <= 1}
               >
                 {currentDataset?.title || 'Select Dataset'} <TriangleDown className="ml-2" />
               </Button>
             </DropdownMenuTrigger>
             <DropdownMenuContent>
               {datasets.map(dataset => (
                 <DropdownMenuItem 
                   key={dataset.key}
                   onClick={() => setSelectedDataset(dataset.key)}
                   disabled={isLoading}
                 >
                   {dataset.title}
                 </DropdownMenuItem>
               ))}
             </DropdownMenuContent>
           </DropdownMenu>
        )}
      </div>
      
      {!showSkeleton && dataReady && currentDataset && datasets.length > 0 && (
        <HorizontalBarChart 
          data={chartData ?? []} 
          title={currentDataset?.title || ""} 
          leftMargin={leftMargin}
        />
      )}
      {!showSkeleton && !error && (!url || fetchedParams === JSON.stringify(apiParams)) && datasets.length === 0 && (
         <div className="absolute inset-0 flex items-center justify-center text-gray-500">
            No data available.
         </div>
      )}
    </div>
  )
} 