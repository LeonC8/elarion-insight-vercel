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
}

export function HorizontalBarChartMultipleDatasets({ 
  datasets,
  defaultDataset = datasets[0]?.key,
  categories,
  defaultCategory = categories?.[0]?.key,
  leftMargin = -10,
  loading = false,
  error = null
}: HorizontalBarChartMultipleDatasetsProps) {
  const [selectedDataset, setSelectedDataset] = useState(defaultDataset)
  const [selectedCategory, setSelectedCategory] = useState(defaultCategory)
  
  const currentDataset = datasets.find(d => d.key === selectedDataset) || datasets[0]
  const currentCategory = categories?.find(c => c.key === selectedCategory) || categories?.[0]

  if (loading) {
    return (
      <div className="relative">
        <div className="h-[400px] flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="relative">
        <div className="h-[400px] flex items-center justify-center">
          <div className="text-red-500">Error: {error}</div>
        </div>
      </div>
    )
  }

  return (
    <div className="relative">
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
        data={currentDataset.data}
        title={currentDataset.title}
        leftMargin={leftMargin}
      />
    </div>
  )
} 