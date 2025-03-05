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

interface HorizontalBarChartMultipleDatasetsProps {
  datasets: DataSet[]
  defaultDataset?: string
  categories?: CategoryOption[]
  defaultCategory?: string
}

export function HorizontalBarChartMultipleDatasets({ 
  datasets,
  defaultDataset = datasets[0]?.key,
  categories,
  defaultCategory = categories?.[0]?.key
}: HorizontalBarChartMultipleDatasetsProps) {
  const [selectedDataset, setSelectedDataset] = useState(defaultDataset)
  const [selectedCategory, setSelectedCategory] = useState(defaultCategory)
  
  const currentDataset = datasets.find(d => d.key === selectedDataset) || datasets[0]
  const currentCategory = categories?.find(c => c.key === selectedCategory) || categories?.[0]

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
      />
    </div>
  )
} 