"use client"

import { Button } from "@/components/ui/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { HorizontalBarChart } from "./HorizontalBarChart"
import { useState, useEffect } from "react"
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ChartConfig, ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"
import { ArrowRight } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"

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

export interface CategoryData {
  [key: string]: {
    datasets: {
      [datasetKey: string]: {
        title: string;
        data: Array<{
          range: string;
          current: number;
          previous: number;
        }>;
      }
    }
  }
}

export interface DatasetOption {
  label: string;
  key: string;
}

export interface CategoryOption {
  label: string;
  key: string;
}

export interface HorizontalBarChartMultipleDatasetsUpgradedProps {
  title: string;
  datasetTitle: string;
  apiEndpoint: string;
  apiParams: Record<string, string>;
  categories?: CategoryOption[];
  defaultCategory?: string;
  defaultDataset?: string;
  leftMargin?: number;
  sort?: boolean;
  orientation?: 'horizontal' | 'vertical';
}

// Chart configuration for vertical charts
const verticalChartConfig = {
  current: {
    label: "Current Period",
    color: "hsl(221.2 83.2% 53.3%)",  // Blue
  },
  previous: {
    label: "Previous Period",
    color: "#93c5fd",  // Lighter Blue
  },
} satisfies ChartConfig;

export function HorizontalBarChartMultipleDatasetsUpgraded({ 
  title,
  datasetTitle,
  apiEndpoint,
  apiParams,
  categories,
  defaultCategory,
  defaultDataset = "length_of_stay",
  leftMargin = -10,
  sort = false,
  orientation = 'horizontal',
}: HorizontalBarChartMultipleDatasetsUpgradedProps) {
  const [data, setData] = useState<CategoryData>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dynamicCategories, setDynamicCategories] = useState<CategoryOption[]>(categories || []);
  const [selectedCategory, setSelectedCategory] = useState<string | undefined>(defaultCategory);
  const [availableDatasets, setAvailableDatasets] = useState<DatasetOption[]>([]);
  const [selectedDataset, setSelectedDataset] = useState<string>(defaultDataset);
  const [activeSeries, setActiveSeries] = useState<string[]>(['current', 'previous']);
  const [fullScreenTable, setFullScreenTable] = useState(false);
  
  // Update selected category when defaultCategory changes
  useEffect(() => {
    if (defaultCategory) {
      setSelectedCategory(defaultCategory);
    }
  }, [defaultCategory]);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const queryParams = new URLSearchParams(apiParams);
        const response = await fetch(`${apiEndpoint}?${queryParams.toString()}`);
        if (!response.ok) {
          throw new Error('Failed to fetch data');
        }
        const responseData = await response.json();
        
        // Filter out channels with all zeros
        const filteredData: CategoryData = {};
        Object.entries(responseData.data).forEach(([key, channelData]) => {
          const hasNonZeroValue = Object.values((channelData as any).datasets).some(
            (dataset: any) => dataset.data.some(
              (item: any) => item.current > 0 || item.previous > 0
            )
          );
          
          if (hasNonZeroValue) {
            filteredData[key] = channelData as any;
          }
        });
        
        setData(filteredData);
        
        // Generate dynamic categories
        if (filteredData && Object.keys(filteredData).length > 0) {
          const newCategories = Object.keys(filteredData).map(key => {
            // Try to find matching category from provided categories
            const existingCategory = categories?.find(c => c.key === key);
            return {
              key,
              label: existingCategory?.label || key
            };
          });
          setDynamicCategories(newCategories);
          
          // If default category is specified and exists in data, use it
          if (defaultCategory && newCategories.some(c => c.key === defaultCategory)) {
            setSelectedCategory(defaultCategory);
          }
          // Else if no category is selected or current selection doesn't exist in new data,
          // select the first available category
          else if (!selectedCategory || !newCategories.some(c => c.key === selectedCategory)) {
            setSelectedCategory(newCategories[0]?.key);
          }
          
          // Get datasets for the selected category (or first category if none selected)
          const categoryToUse = defaultCategory && filteredData[defaultCategory] 
            ? defaultCategory 
            : selectedCategory && filteredData[selectedCategory]
              ? selectedCategory
              : newCategories[0]?.key;
              
          if (categoryToUse) {
            updateAvailableDatasets(filteredData, categoryToUse);
          }
        }
        
        setLoading(false);
      } catch (err) {
        console.error('Error fetching data:', err);
        setError(err instanceof Error ? err.message : 'An unknown error occurred');
        setLoading(false);
      }
    };
    
    fetchData();
  }, [apiEndpoint, apiParams, categories, defaultCategory]);

  // Update available datasets when category changes
  useEffect(() => {
    if (selectedCategory && data[selectedCategory]) {
      updateAvailableDatasets(data, selectedCategory);
    }
  }, [selectedCategory, data]);

  // Helper function to update available datasets based on selected category
  const updateAvailableDatasets = (dataObj: CategoryData, categoryKey: string) => {
    if (dataObj[categoryKey]?.datasets) {
      const datasetEntries = Object.entries(dataObj[categoryKey].datasets);
      const datasetOptions: DatasetOption[] = datasetEntries.map(([key, value]) => ({
        key,
        label: value.title
      }));
      
      setAvailableDatasets(datasetOptions);
      
      // If current dataset isn't available, select the first one
      if (datasetOptions.length > 0 && !datasetOptions.some(d => d.key === selectedDataset)) {
        setSelectedDataset(datasetOptions[0].key);
      }
    }
  };

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

  // Get current data based on selected category and dataset
  const currentCategory = selectedCategory || dynamicCategories[0]?.key || '';
  const currentDataset = selectedDataset || availableDatasets[0]?.key || '';
  
  let currentCategoryData = currentCategory && currentDataset && data[currentCategory]?.datasets[currentDataset]
    ? [...(data[currentCategory].datasets[currentDataset].data || [])]
    : [];

  // Sort data by extracted numbers if enabled
  if (sort && currentCategoryData.length > 0) {
    currentCategoryData.sort((a, b) => {
      return extractNumber(a.range) - extractNumber(b.range);
    });
  }
    
  const categoryTitle = currentCategory && currentDataset && data[currentCategory]?.datasets[currentDataset]
    ? data[currentCategory].datasets[currentDataset].title
    : datasetTitle;
  
  // Format the display title to include the category name if available
  const displayTitle = title || categoryTitle;

  // Format dropdown labels
  const selectedCategoryLabel = dynamicCategories.find(c => c.key === selectedCategory)?.label || "Select Channel";
  const selectedDatasetLabel = availableDatasets.find(d => d.key === selectedDataset)?.label || "Select Dataset";

  // Transform data format for vertical chart
  const verticalChartData = currentCategoryData.map(item => ({
    dayOfWeek: item.range,  // We're using the range field as the x-axis value
    current: item.current,
    previous: item.previous
  }));

  if (loading) {
    return (
      <div className="relative">
        <div className="p-6 pb-0">
          <h3 className="text-lg font-semibold text-gray-800">{displayTitle}</h3>
        </div>
        <div className="h-[400px] flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="relative">
        <div className="p-6 pb-0">
          <h3 className="text-lg font-semibold text-gray-800">{displayTitle}</h3>
        </div>
        <div className="h-[400px] flex items-center justify-center">
          <div className="text-red-500">Error: {error}</div>
        </div>
      </div>
    )
  }

  if (Object.keys(data).length === 0 || !currentCategory) {
    return (
      <div className="relative">
        <div className="p-6 pb-0">
          <h3 className="text-lg font-semibold text-gray-800">{displayTitle}</h3>
        </div>
        <div className="h-[400px] flex items-center justify-center">
          <div className="text-gray-500">No data available</div>
        </div>
      </div>
    )
  }

  // Render horizontal bar chart (original behavior)
  if (orientation === 'horizontal') {
    return (
      <div className="relative">
        <div className="absolute right-8 top-6 z-10 flex space-x-2">
          {availableDatasets.length > 0 && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button 
                  variant="ghost" 
                  size="sm"
                  className="bg-[#f2f8ff] hover:bg-[#f2f8ff] text-[#342630] rounded-full px-4"
                >
                  {selectedDatasetLabel} <TriangleDown className="ml-2" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                {availableDatasets.map(dataset => (
                  <DropdownMenuItem 
                    key={dataset.key}
                    onClick={() => setSelectedDataset(dataset.key)}
                  >
                    {dataset.label}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
          
          {dynamicCategories.length > 0 && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button 
                  variant="ghost" 
                  size="sm"
                  className="bg-[#f2f8ff] hover:bg-[#f2f8ff] text-[#342630] rounded-full px-4"
                >
                  {selectedCategoryLabel} <TriangleDown className="ml-2" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="max-h-[300px] overflow-y-auto">
                {dynamicCategories.map(category => (
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
        </div>
        <HorizontalBarChart 
          data={currentCategoryData}
          title={displayTitle}
          leftMargin={leftMargin}
        />
      </div>
    )
  }
  
  // Render vertical bar chart (similar to ReservationsByDayChart)
  return (
    <>
      <Card className="border-gray-300">
        <CardHeader>
          <div className="flex w-full justify-between items-center">
            <CardTitle className="text-lg font-semibold text-gray-800">
              {displayTitle}
            </CardTitle>
            <div className="flex space-x-2">
              {availableDatasets.length > 0 && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button 
                      variant="ghost" 
                      size="sm"
                      className="bg-[#f2f8ff] hover:bg-[#f2f8ff] text-[#342630] rounded-full px-4"
                    >
                      {selectedDatasetLabel} <TriangleDown className="ml-2" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent>
                    {availableDatasets.map(dataset => (
                      <DropdownMenuItem 
                        key={dataset.key}
                        onClick={() => setSelectedDataset(dataset.key)}
                      >
                        {dataset.label}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
              
              {dynamicCategories.length > 0 && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button 
                      variant="ghost" 
                      size="sm"
                      className="bg-[#f2f8ff] hover:bg-[#f2f8ff] text-[#342630] rounded-full px-4"
                    >
                      {selectedCategoryLabel} <TriangleDown className="ml-2" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="max-h-[300px] overflow-y-auto">
                    {dynamicCategories.map(category => (
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
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <ChartContainer config={verticalChartConfig}>
            <BarChart
              data={verticalChartData}
              height={300}
              margin={{
                top: 10,
                right: 10,
                bottom: 20,
                left: -20,
              }}
            >
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis
                dataKey="dayOfWeek"
                tickLine={false}
                axisLine={false}
                tickMargin={8}
              />
              <YAxis
                tickLine={false}
                axisLine={false}
                tickFormatter={(value) => `${Math.round(value).toLocaleString()}`}
                tickMargin={8}
              />
              <ChartTooltip content={<ChartTooltipContent />} />
              {activeSeries.includes('current') && (
                <Bar
                  dataKey="current"
                  fill={verticalChartConfig.current.color}
                  radius={[4, 4, 0, 0]}
                />
              )}
              {activeSeries.includes('previous') && (
                <Bar
                  dataKey="previous"
                  fill={verticalChartConfig.previous.color}
                  radius={[4, 4, 0, 0]}
                />
              )}
            </BarChart>
          </ChartContainer>

          {/* Clickable Legend */}
          <div className="flex justify-center gap-3 mt-6">
            {Object.entries(verticalChartConfig).map(([key, config]) => (
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
                <div 
                  style={{ backgroundColor: config.color }} 
                  className="w-2 h-2 rounded-full" 
                />
                <span className="text-xs text-gray-500 font-medium">
                  {config.label}
                </span>
              </div>
            ))}
          </div>

          {/* Add View Details Button */}
          <div className="mt-3 pt-4 border-t border-gray-200">
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
        </CardContent>
      </Card>

      {/* Full screen table dialog */}
      <Dialog open={fullScreenTable} onOpenChange={setFullScreenTable}>
        <DialogContent className="max-w-7xl min-h-fit max-h-[90vh]">
          <DialogHeader className="pb-6">
            <DialogTitle>
              {displayTitle} – {selectedCategoryLabel}
            </DialogTitle>
          </DialogHeader>
          <div className="border rounded-lg bg-[#f0f4fa]/40 border-[#d0d7e3]">
            <div className="overflow-y-auto max-h-[calc(90vh-120px)]">
              <Table>
                <TableHeader>
                  <TableRow className="border-b border-[#d0d7e3] hover:bg-transparent">
                    <TableHead className="bg-[#f0f4fa]/60 first:rounded-tl-lg text-left border-r border-[#d0d7e3]">
                      {orientation === 'vertical' ? 'Range' : 'Day of Week'}
                    </TableHead>
                    <TableHead className="bg-[#f0f4fa]/60 text-left border-r border-[#d0d7e3]">
                      Current Period
                    </TableHead>
                    <TableHead className="bg-[#f0f4fa]/60 text-left border-r border-[#d0d7e3]">
                      Previous Period
                    </TableHead>
                    <TableHead className="bg-[#f0f4fa]/60 last:rounded-tr-lg text-left">
                      Change
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {verticalChartData.map((row, idx) => (
                    <TableRow key={idx} className="border-b border-[#d0d7e3] last:border-0">
                      <TableCell className="w-[25%] bg-[#f0f4fa]/40 border-r border-[#d0d7e3] text-left">
                        {row.dayOfWeek}
                      </TableCell>
                      <TableCell className="w-[25%] text-left border-r border-[#d0d7e3]">
                        {row.current.toLocaleString()}
                      </TableCell>
                      <TableCell className="w-[25%] text-left border-r border-[#d0d7e3]">
                        {row.previous.toLocaleString()}
                      </TableCell>
                      <TableCell className={`w-[25%] text-left ${
                        row.previous === 0 
                          ? (row.current > 0 ? "text-emerald-500" : "text-gray-500") 
                          : (row.current > row.previous ? "text-emerald-500" : "text-red-500")
                      }`}>
                        {row.previous === 0 
                          ? (row.current > 0 ? "∞%" : "0%")
                          : ((row.current - row.previous) / row.previous * 100).toFixed(1) + "%"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
} 