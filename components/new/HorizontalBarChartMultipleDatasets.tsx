"use client"

import { Button } from "@/components/ui/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { HorizontalBarChart } from "./HorizontalBarChart"
import { useState } from "react"

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
  datasets: DataSet[]
  defaultDataset?: string
  categories?: CategoryOption[]
  defaultCategory?: string
  leftMargin?: number
  loading?: boolean
  error?: string | null
  sort?: boolean
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

export function HorizontalBarChartMultipleDatasets({ 
  datasets,
  defaultDataset = datasets[0]?.key,
  categories,
  defaultCategory = categories?.[0]?.key,
  leftMargin = -10,
  loading = false,
  error = null,
  sort = true // Sorting is enabled by default
}: HorizontalBarChartMultipleDatasetsProps) {
  const [selectedDataset, setSelectedDataset] = useState(defaultDataset)
  const [selectedCategory, setSelectedCategory] = useState(defaultCategory)
  
  const currentDataset = datasets.find(d => d.key === selectedDataset) || datasets[0]
  const currentCategory = categories?.find(c => c.key === selectedCategory) || categories?.[0]

  if (error) {
    return (
      <div className="relative">
        <div className="h-[400px] flex items-center justify-center">
          <div className="text-red-500">Error: {error}</div>
        </div>
      </div>
    )
  }

  // Create a copy of the data to sort
  let sortedData = loading ? [] : [...(currentDataset?.data || [])];

  // Sort data by extracted numbers if enabled (on by default)
  if (!loading && sort !== false && sortedData.length > 0) {
    sortedData.sort((a, b) => {
      return extractNumber(a.range) - extractNumber(b.range);
    });
  }

  return (
    <div className="relative min-h-[400px]">
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center bg-white/80 z-20">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
        </div>
      )}

      <div className="absolute right-8 top-6 z-10 flex space-x-2">
        {categories && categories.length > 0 && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button 
                variant="ghost" 
                size="sm"
                className="bg-[#f2f8ff] hover:bg-[#f2f8ff] text-[#342630] rounded-full px-4"
              >
                {currentCategory?.label || "All"} <TriangleDown className="ml-2" />
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
        
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button 
              variant="ghost" 
              size="sm"
              className="bg-[#f2f8ff] hover:bg-[#f2f8ff] text-[#342630] rounded-full px-4"
            >
              {currentDataset.title} <TriangleDown className="ml-2" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            {datasets.map(dataset => (
              <DropdownMenuItem 
                key={dataset.key}
                onClick={() => setSelectedDataset(dataset.key)}
              >
                {dataset.title}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      
      <HorizontalBarChart 
        data={sortedData}
        title={currentDataset.title}
        leftMargin={leftMargin}
      />
    </div>
  )
} 