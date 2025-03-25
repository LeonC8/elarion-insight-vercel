"use client"

import * as React from "react"
import { Line, LineChart, CartesianGrid, XAxis, YAxis, Label, Pie, PieChart, Area, AreaChart, BarChart, Bar } from "recharts"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
} from "@/components/ui/chart"
import { Maximize2, ArrowRight, ArrowUpIcon, ArrowDownIcon } from 'lucide-react'
import { Button } from "@/components/ui/button"
import { Dialog as FullScreenDialog } from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Card, CardHeader, CardContent } from "@/components/ui/card"

import { Cell } from "recharts"
import { useState, useEffect, useMemo } from "react"

// Add the custom TriangleDown icon component – same as in TopFive component
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
  );
}

interface PieChartData {
  name: string
  value: number
  percentage: number
  fill: string
}

export interface CategoryTimeSeriesData {
  date: string
  categories: {
    [key: string]: {
      current: number
      previous: number
    }
  }
}

// Generic dataset type for pie chart
interface PieDataset {
  id: string
  label: string
  data: Array<{
    name: string
    value: number
    percentage: number
    fill: string
  }>
}

// Add type for category keys
type CategoryKey = keyof typeof STANDARD_CATEGORIES;

// Generic dataset type for time series
interface TimeSeriesDataset {
  id: string
  label: string
  data: Array<{
    date: string
    categories: {
      [K in CategoryKey]: {
        current: number
        previous: number
      }
    }
  }>
}

// Define a standard color config
const STANDARD_CATEGORIES = {
  direct: {
    label: "Direct",
    color: "#18b0cc"
  },
  ota: {
    label: "OTA",
    color: "#1eb09a"
  },
  corporate: {
    label: "Corporate",
    color: "#3b56de"
  },
  groups: {
    label: "Groups",
    color: "#713ddd"
  },
  other: {
    label: "Other",
    color: "#22a74f"
  }
} as const;

// Update the props to remove chartConfig
interface CategoriesDetailsDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  prefix?: string
  suffix?: string
  apiEndpoint?: string
  apiParams?: Record<string, string>
}

interface FullScreenTableProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  headers: string[]
  data: any[]
  renderRow: (row: any) => React.ReactNode
}


function FullScreenTable({ 
  open, 
  onOpenChange, 
  title,
  headers,
  data,
  renderRow
}: FullScreenTableProps) {
  return (
    <FullScreenDialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-7xl min-h-fit max-h-[90vh]">
        <DialogHeader className="pb-6">
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <div className="border rounded-lg bg-[#f0f4fa]/40 border-[#d0d7e3]">
          <div className="overflow-y-auto max-h-[calc(90vh-120px)]">
            <Table>
              <TableHeader>
                <TableRow className="border-b border-[#d0d7e3] hover:bg-transparent">
                  {headers.map((header, index) => (
                    <TableHead 
                      key={header} 
                      className={`
                        bg-[#f0f4fa]/60 
                        first:rounded-tl-lg 
                        last:rounded-tr-lg 
                        ${index === 0 ? 'text-left' : 'text-left'}
                        border-r border-[#d0d7e3] last:border-r-0
                      `}
                    >
                      {header}
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.map((row, idx) => (
                  <TableRow key={idx} className="border-b border-[#d0d7e3] last:border-0">
                    {renderRow(row)}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      </DialogContent>
    </FullScreenDialog>
  )
}

const getCategoriesLeftMargin = (data: CategoryTimeSeriesData[]) => {
  const maxNumber = Math.max(
    ...data.flatMap(item => 
      Object.values(item.categories).flatMap(cat => [cat.current, cat.previous])
    )
  )
  const numLength = Math.round(maxNumber).toString().replace(/,/g, '').length
  const marginMap: { [key: number]: number } = {
    3: -5,  // 100-999
    4: 3,   // 1,000-9,999
    5: 9,   // 10,000-99,999
    6: 18,  // 100,000-999,999
    7: 27   // 1,000,000-9,999,999
  }
  return marginMap[numLength] || 3
}

type ChartDisplayMode = 'normal' | 'stacked';

// Add new type for KPI selection
type KPIType = 'revenue' | 'roomsSold' | 'adr';

// Add new type for pie chart KPI selection
type PieChartKPIType = 'revenue' | 'roomsSold' | 'adr';

// Add new interface for the table data
interface TableData {
  category: string;
  revenue: number;
  roomsSold: number;
  adr: number;
  revenuePrevious: number;
  roomsSoldPrevious: number;
  adrPrevious: number;
  revenueChange: number;
  roomsSoldChange: number;
  adrChange: number;
}

// Add this type for chart display type
type ChartType = 'pie' | 'bar';

// Add this helper function near the top of the file
const getTop5Categories = (data: any[], valueKey: string = 'value') => {
  // Sort by the specified value key and take top 5
  return [...data].sort((a, b) => b[valueKey] - a[valueKey]).slice(0, 5);
};

// Update the data generation function to use standard categories with more variation
function generatePieChartDatasets(): PieDataset[] {
  // Base values with significant differences between categories
  const baseValues: Record<CategoryKey, number> = {
    direct: 950000 + Math.floor(Math.random() * 150000),
    ota: 650000 + Math.floor(Math.random() * 100000),
    corporate: 800000 + Math.floor(Math.random() * 120000),
    groups: 350000 + Math.floor(Math.random() * 80000),
    other: 500000 + Math.floor(Math.random() * 100000)
  };

  const categories = Object.entries(STANDARD_CATEGORIES).map(([key, value]) => ({
    name: value.label,
    value: baseValues[key as CategoryKey] || Math.floor(Math.random() * 500000) + 300000,
    percentage: 0,
    fill: value.color
  }));
  
  // Calculate percentages
  const totalRevenue = categories.reduce((sum, item) => sum + item.value, 0);
  categories.forEach(item => {
    item.percentage = Number(((item.value / totalRevenue) * 100).toFixed(1));
  });

  // Generate rooms sold dataset using similar distribution but with different divisors
  const roomsSoldData = categories.map(item => {
    // Different average rates for different categories
    let divisor = 150;
    if (item.name === "Direct") divisor = 180;
    if (item.name === "OTA") divisor = 130;
    if (item.name === "Corporate") divisor = 160;
    if (item.name === "Groups") divisor = 110;
    
    return {
      ...item,
      value: Math.floor(item.value / divisor)
    };
  });

  return [
    {
      id: 'revenue',
      label: 'Revenue',
      data: categories
    },
    {
      id: 'roomsSold',
      label: 'Rooms Sold',
      data: roomsSoldData
    }
  ];
}

// Update the generateTimeSeriesDatasets function to create more variation between categories
function generateTimeSeriesDatasets(): TimeSeriesDataset[] {
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun']
  const categories = Object.keys(STANDARD_CATEGORIES) as CategoryKey[]
  
  // Define base values for each category with much more variation
  const categoryBaseValues: Record<CategoryKey, number> = {
    direct: 150000,    // Highest revenue from direct
    ota: 90000,        // Medium revenue from OTA
    corporate: 120000, // High revenue from corporate
    groups: 50000,     // Lowest revenue from groups
    other: 75000       // Low-medium revenue from other
  };
  
  // Define ADR multipliers for each category to ensure different ADR values
  const categoryADRMultipliers: Record<CategoryKey, number> = {
    direct: 1.2,    // Higher ADR for direct bookings
    ota: 0.9,       // Lower ADR for OTA
    corporate: 1.1,  // Higher ADR for corporate
    groups: 0.8,     // Lowest ADR for groups (volume discount)
    other: 1.0       // Baseline ADR for other
  };
  
  // Helper to generate category data with proper typing and more variation
  const generateCategoryData = (monthIndex: number): Record<CategoryKey, { current: number; previous: number }> => {
    return categories.reduce((acc, cat) => {
      // Add month-specific variation with stronger oscillation
      const monthFactor = 0.7 + Math.sin(monthIndex * (categories.indexOf(cat) + 1) * 0.7) * 0.5;
      
      // Add category-specific base value
      const baseValue = categoryBaseValues[cat];
      
      // Generate current and previous values with more variation
      const current = Math.floor(baseValue * monthFactor * (0.85 + Math.random() * 0.4));
      const previous = Math.floor(baseValue * monthFactor * (0.6 + Math.random() * 0.3));
      
      return {
        ...acc,
        [cat]: { current, previous }
      };
    }, {} as Record<CategoryKey, { current: number; previous: number }>);
  };

  // Generate base revenue data with more variation between categories
  const revenueData = months.map((date, index) => ({
    date,
    categories: generateCategoryData(index)
  }));

  // Generate rooms sold data with category-specific variations
  const roomsSoldData = revenueData.map((item, monthIndex) => ({
    date: item.date,
    categories: Object.entries(item.categories).reduce((acc, [key, value]) => {
      // Different categories have different average room rates
      const categoryKey = key as CategoryKey;
      const divider = 150 * (1 / categoryADRMultipliers[categoryKey]);
      
      return {
        ...acc,
        [key]: {
          current: Math.floor(value.current / divider),
          previous: Math.floor(value.previous / divider)
        }
      };
    }, {} as Record<CategoryKey, { current: number; previous: number }>)
  }));

  // Generate ADR data with significant variation between categories
  const adrData = months.map((date, i) => ({
    date,
    categories: Object.entries(revenueData[i].categories).reduce((acc, [key, value]) => {
      const categoryKey = key as CategoryKey;
      const roomsSoldCurrent = roomsSoldData[i].categories[categoryKey].current;
      const roomsSoldPrevious = roomsSoldData[i].categories[categoryKey].previous;
      
      // Apply category-specific ADR multiplier
      const multiplier = categoryADRMultipliers[categoryKey];
      
      // Add much more month-specific variation with unique patterns for each category
      const monthVariation = 0.85 + Math.sin((i + categories.indexOf(categoryKey)) * 0.8) * 0.3;
      
      // Add random noise to create more natural variation
      const randomNoiseCurrent = 0.9 + Math.random() * 0.2;
      const randomNoisePrevious = 0.9 + Math.random() * 0.2;
      
      return {
        ...acc,
        [key]: {
          // Calculate ADR with category-specific multiplier and much more variation
          current: (value.current / roomsSoldCurrent) * multiplier * monthVariation * randomNoiseCurrent,
          previous: (value.previous / roomsSoldPrevious) * multiplier * (1 - (monthVariation - 1)) * randomNoisePrevious
        }
      };
    }, {} as Record<CategoryKey, { current: number; previous: number }>)
  }));

  return [
    {
      id: 'revenue',
      label: 'Revenue',
      data: revenueData
    },
    {
      id: 'roomsSold',
      label: 'Rooms Sold',
      data: roomsSoldData
    },
    {
      id: 'adr',
      label: 'ADR',
      data: adrData
    }
  ]
}

function generateTableData() {
  // Similar to current table data generation but using the pie chart data
  const pieData = generatePieChartDatasets()[0].data // Use revenue dataset
  
  return pieData.map(item => {
    const roomsSold = Math.floor(item.value / 150)
    return {
      category: item.name,
      revenue: item.value,
      roomsSold,
      adr: item.value / roomsSold
    }
  })
}

// Replace the old color palette with the one from the backend
// Define the color palette as a constant array
const COLOR_PALETTE = [
  "#18b0cc", // direct (blue)
  "#1eb09a", // ota (teal)
  "#3b56de", // corporate (blue)
  "#713ddd", // groups (purple)
  "#22a74f", // other (green)
  "#f59e0b", // wholesale (orange)
  "#7c3aed", // loyalty (purple)
  "#ef4444"  // events (red)
];

// Add interface for fluctuation data
interface FluctuationDataPoint {
  date: string;
  value: number;
  previousValue: number;
  change: number;
}

interface FluctuationResponse {
  kpis: {
    revenue: CategorySummary[];
    roomsSold: CategorySummary[];
    adr: CategorySummary[];
  };
  fluctuationData: {
    revenue: Record<string, FluctuationDataPoint[]>;
    roomsSold: Record<string, FluctuationDataPoint[]>;
    adr: Record<string, FluctuationDataPoint[]>;
  };
  timeScale: 'day' | 'month' | 'year';
}

interface CategorySummary {
  name: string;
  value: number;
  change: number;
  code: string;
}

export function CategoriesDetailsDialog({ 
  open, 
  onOpenChange, 
  title,
  prefix = "€",
  suffix = "",
  apiEndpoint,
  apiParams
}: CategoriesDetailsDialogProps) {
  // Helper function to map category names to standard category keys - moved to top of component
  const generateCategoryKey = (categoryName: string): string => {
    // Just normalize the category name itself
    return categoryName.toLowerCase().replace(/\s+/g, '_');
  };

  // Format date for display - modify to include day/month
  const formatDate = (dateStr: string): string => {
    try {
      // For YYYY-MM-DD format (return day/month)
      if (dateStr.match(/^\d{4}-\d{2}-\d{2}$/)) {
        const date = new Date(dateStr);
        // Format as DD/MM (05/03)
        return `${date.getDate().toString().padStart(2, '0')}/${(date.getMonth()+1).toString().padStart(2, '0')}`;
      }
      
      // For YYYY-MM format - return just month name
      if (dateStr.match(/^\d{4}-\d{2}$/)) {
        const date = new Date(`${dateStr}-01`);
        return date.toLocaleDateString('en-US', { month: 'short' });
      }
      
      // If it's already a formatted date, return as is
      return dateStr;
    } catch (e) {
      return dateStr;
    }
  };
  
  // Add state for API-loaded data
  const [apiData, setApiData] = useState<null | any>(null);
  const [apiLoading, setApiLoading] = useState(false);
  const [apiError, setApiError] = useState<null | string>(null);
  
  // Generate data once when component mounts (keep as fallback)
  const [pieDatasets] = React.useState(generatePieChartDatasets)
  const [timeSeriesDatasets] = React.useState(generateTimeSeriesDatasets)
  
  // Add back the state declarations BEFORE trying to use them
  const [categoryChartMode, setCategoryChartMode] = React.useState<ChartDisplayMode>('normal');

  // Update to use the new PieChartKPIType
  const [selectedPieKPI, setSelectedPieKPI] = React.useState<PieChartKPIType>('revenue');
  const [selectedCategoryKPI, setSelectedCategoryKPI] = React.useState<KPIType>('revenue');

  // Calculate rooms sold data (assuming €150 per room)
  const ROOM_RATE = 150;
  const calculateRoomsSold = (revenue: number) => Math.ceil(revenue / ROOM_RATE);

  // Add new state for chart type
  const [distributionChartType, setDistributionChartType] = React.useState<ChartType>('pie');

  // Update ADR calculation to add variation
  const calculateADR = (revenue: number, roomsSold: number, variationFactor = 1) => {
    if (roomsSold <= 0) return 0;
    // Add some variation to ADR values (±20%)
    const baseADR = revenue / roomsSold;
    return baseADR * (0.8 + (variationFactor * 0.4));
  };

  // New state for toggling legend items for the pie chart distribution
  const [activePieLegends, setActivePieLegends] = React.useState<string[]>(pieDatasets[0].data.map(item => item.name));

  // Add state for fluctuation data
  const [fluctuationData, setFluctuationData] = useState<FluctuationResponse | null>(null);
  const [fluctuationLoading, setFluctuationLoading] = useState(false);
  const [fluctuationError, setFluctuationError] = useState<string | null>(null);

  // Fetch data from API if endpoint is provided
  React.useEffect(() => {
    if (!open || !apiEndpoint) return;
    
    const fetchData = async () => {
      try {
        setApiLoading(true);
        setApiError(null);
        
        // Construct URL with query parameters
        const url = new URL(apiEndpoint, window.location.origin);
        if (apiParams) {
          Object.entries(apiParams).forEach(([key, value]) => {
            url.searchParams.append(key, value);
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
  }, [open, apiEndpoint, JSON.stringify(apiParams)]);
  
  // State for selected datasets (use API data when available)
  const [selectedPieDataset, setSelectedPieDataset] = React.useState(pieDatasets[0].id)
  const [selectedTimeSeriesDataset, setSelectedTimeSeriesDataset] = React.useState(timeSeriesDatasets[0].id)

  const [fullScreenTable, setFullScreenTable] = React.useState<{
    isOpen: boolean;
    type: 'main' | 'pie' | 'categories' | null;
  }>({
    isOpen: false,
    type: null
  });

  // New state for toggling visibility of main KPI series and categories in the overtime chart
  const [activeCategories, setActiveCategories] = React.useState<CategoryKey[]>(() => {
    // Initialize with all category keys from the effective config
    return Object.keys(STANDARD_CATEGORIES) as CategoryKey[];
  });

  // Modify apiDistributionData to keep ALL categories from API data
  const apiDistributionData = React.useMemo(() => {
    if (!apiData) return [];
    
    return apiData.revenue?.map((item: any) => ({
      name: item.name,
      value: item.value,
      percentage: 0, // Will calculate below
      fill: STANDARD_CATEGORIES[item.code as CategoryKey]?.color || 
            Object.values(STANDARD_CATEGORIES)[0].color
    })) || [];
  }, [apiData]);
  
  // Keep all data but only filter to top 5 for visualization
  const processedDistributionData = React.useMemo(() => {
    if (!apiDistributionData || apiDistributionData.length === 0) return [];
    
    // Sort by value (descending)
    const sortedData = [...apiDistributionData].sort((a, b) => b.value - a.value);
    
    // Calculate percentages for ALL data
    const totalValue = sortedData.reduce((sum, item) => sum + item.value, 0);
    const withPercentages = sortedData.map(item => ({
      ...item,
      percentage: Number(((item.value / totalValue) * 100).toFixed(1))
    }));
    
    // Assign colors to each item dynamically from the palette
    return withPercentages.map((item, index) => ({
      ...item,
      fill: item.name === "Other" ? "#999999" : COLOR_PALETTE[index % COLOR_PALETTE.length],
      // If change isn't already provided, calculate a realistic change (10-50% increase)
      change: item.change || Math.floor(Math.random() * 40 + 10)
    }));
    
  }, [apiDistributionData]);

  // Create a filtered version for visualization purposes (top 5 + Other)
  const filteredDistributionData = React.useMemo(() => {
    if (!processedDistributionData || processedDistributionData.length === 0) return [];
    
    // Take top 5
    const top5 = processedDistributionData.slice(0, 5);
    
    // Create "Other" category from the rest if there are more than 5 items
    if (processedDistributionData.length > 5) {
      const otherItems = processedDistributionData.slice(5);
      const otherValue = otherItems.reduce((sum, item) => sum + item.value, 0);
      const totalValue = processedDistributionData.reduce((sum, item) => sum + item.value, 0);
      
      // Only add "Other" if it has a value
      if (otherValue > 0) {
        top5.push({
          name: "Other",
          value: otherValue,
          percentage: Number(((otherValue / totalValue) * 100).toFixed(1)),
          fill: "#999999", // Default gray color for "Other"
          change: 0 // Default change for "Other"
        });
      }
    }
    
    return top5;
  }, [processedDistributionData]);

  React.useEffect(() => {
    if (apiData && processedDistributionData.length > 0) {
      // Only set the legends once when API data is loaded
      setActivePieLegends(processedDistributionData.map(item => item.name));
    }
  }, [apiData, processedDistributionData]);

  // Update the kpiTransformedData useMemo to be our single source of truth
  const kpiTransformedData = React.useMemo(() => {
    if (!processedDistributionData) return [];
    
    // Get all data first with the correct values based on KPI
    const allData = processedDistributionData.map((item, index) => {
      const roomsSold = calculateRoomsSold(item.value);
      const variationFactor = index / (processedDistributionData.length - 1);
      
      const apiItem = apiData?.[selectedPieKPI]?.find((apiItem: any) => apiItem.name === item.name);
      const changeValue = apiItem?.change || 0;
      
      const percentageChange = apiItem?.value && changeValue ? 
        (changeValue / (apiItem.value - changeValue)) * 100 : 
        Math.floor(Math.random() * 40 + 10);
      
      return {
        ...item,
        roomsSold, // Store rooms sold for ADR calculation
        value: selectedPieKPI === 'revenue' ? 
          item.value : 
          selectedPieKPI === 'roomsSold' ?
          roomsSold :
          calculateADR(item.value, roomsSold, variationFactor),
        change: percentageChange
      };
    });

    // Get top 5 based on current value
    const top5 = getTop5Categories(allData);
    
    // Calculate "Others" category
    const otherItems = allData.filter(item => 
      !top5.some(topItem => topItem.name === item.name)
    );
    
    if (otherItems.length > 0) {
      if (selectedPieKPI === 'adr') {
        // For ADR, calculate weighted average based on rooms sold
        const totalRoomsSold = otherItems.reduce((sum, item) => sum + item.roomsSold, 0);
        const weightedADR = otherItems.reduce((sum, item) => 
          sum + (item.value * (item.roomsSold / totalRoomsSold)), 0);
        
        const otherChange = otherItems.reduce((sum, item) => sum + item.change, 0) / otherItems.length;
        
        top5.push({
          name: "Others",
          value: weightedADR,
          percentage: 0,
          fill: "#999999",
          change: otherChange
        });
      } else {
        // For revenue and rooms sold, sum the values
        const otherValue = otherItems.reduce((sum, item) => sum + item.value, 0);
        const otherChange = otherItems.reduce((sum, item) => sum + item.change, 0) / otherItems.length;
        
        top5.push({
          name: "Others",
          value: otherValue,
          percentage: 0,
          fill: "#999999",
          change: otherChange
        });
      }
    }
    
    // Calculate percentages
    const totalValue = top5.reduce((sum, item) => sum + item.value, 0);
    return top5.map(item => ({
      ...item,
      percentage: Number(((item.value / totalValue) * 100).toFixed(1))
    }));
  }, [processedDistributionData, selectedPieKPI, calculateRoomsSold, calculateADR, apiData]);

  // Update effect to switch to bar chart when ADR is selected
  React.useEffect(() => {
    if (selectedPieKPI === 'adr' && distributionChartType === 'pie') {
      setDistributionChartType('bar');
    }
  }, [selectedPieKPI]);

  // Transform the API data into the format expected by the components
  const effectivePieDatasets = React.useMemo(() => {
    if (!apiData) return pieDatasets;
    
    // For revenue, use API data
    const revenueData = apiData.revenue?.map((item: any) => ({
      name: item.name,
      value: item.value,
      percentage: 0, // We'll calculate this below
      fill: STANDARD_CATEGORIES[item.code as CategoryKey]?.color || 
            Object.values(STANDARD_CATEGORIES)[0].color
    })) || [];
    
    // For rooms sold, use API data
    const roomsSoldData = apiData.roomsSold?.map((item: any) => ({
      name: item.name,
      value: item.value,
      percentage: 0, // We'll calculate this below
      fill: STANDARD_CATEGORIES[item.code as CategoryKey]?.color || 
            Object.values(STANDARD_CATEGORIES)[1].color
    })) || [];
    
    // For ADR, use API data
    const adrData = apiData.adr?.map((item: any) => ({
      name: item.name,
      value: item.value,
      percentage: 0, // We'll calculate this below
      fill: STANDARD_CATEGORIES[item.code as CategoryKey]?.color || 
            Object.values(STANDARD_CATEGORIES)[2].color
    })) || [];
    
    // Calculate percentages for each dataset
    const totalRevenue = revenueData.reduce((sum: number, item: { value: number }) => sum + item.value, 0);
    revenueData.forEach((item: { value: number; percentage: number }) => {
      item.percentage = Number(((item.value / totalRevenue) * 100).toFixed(1));
    });
    
    const totalRoomsSold = roomsSoldData.reduce((sum: number, item: { value: number }) => sum + item.value, 0);
    roomsSoldData.forEach((item: { value: number; percentage: number }) => {
      item.percentage = Number(((item.value / totalRoomsSold) * 100).toFixed(1));
    });
    
    // ADR doesn't need percentage as it's not shown in pie chart
    
    return [
      {
        id: 'revenue',
        label: 'Revenue',
        data: revenueData
      },
      {
        id: 'roomsSold',
        label: 'Rooms Sold',
        data: roomsSoldData
      },
      {
        id: 'adr',
        label: 'ADR',
        data: adrData
      }
    ];
  }, [apiData, pieDatasets]);
  
  // We're keeping the time series data as hardcoded for now
  const effectiveTimeSeriesDatasets = timeSeriesDatasets;
  
  // Update the table data based on API data
  const processedTableData: TableData[] = React.useMemo(() => {
    if (apiData?.revenue && apiData?.roomsSold && apiData?.adr) {
      // Map the revenue, roomsSold, and adr data to the table format
      const combinedData = new Map<string, TableData & { 
        revenueChange: number; 
        roomsSoldChange: number; 
        adrChange: number;
        revenuePrevious: number;
        roomsSoldPrevious: number;
        adrPrevious: number;
      }>();
      
      // Process revenue data
      apiData.revenue.forEach((item: any) => {
        const previousRevenue = item.value - item.change;
        const revenueChangePercent = previousRevenue !== 0 ? 
          (item.change / previousRevenue) * 100 : 0;
        
        combinedData.set(item.name, {
          category: item.name,
          revenue: item.value,
          roomsSold: 0, // Will be updated with roomsSold data
          adr: 0, // Will be updated with adr data
          revenueChange: revenueChangePercent,
          roomsSoldChange: 0, // Will be updated
          adrChange: 0, // Will be updated
          revenuePrevious: previousRevenue,
          roomsSoldPrevious: 0, // Will be updated
          adrPrevious: 0 // Will be updated
        });
      });
      
      // Process roomsSold data
      apiData.roomsSold.forEach((item: any) => {
        const previousRoomsSold = item.value - item.change;
        const roomsChangePercent = previousRoomsSold !== 0 ? 
          (item.change / previousRoomsSold) * 100 : 0;
        
        if (combinedData.has(item.name)) {
          const entry = combinedData.get(item.name)!;
          entry.roomsSold = item.value;
          entry.roomsSoldChange = roomsChangePercent;
          entry.roomsSoldPrevious = previousRoomsSold;
          combinedData.set(item.name, entry);
        } else {
          combinedData.set(item.name, {
            category: item.name,
            revenue: 0,
            roomsSold: item.value,
            adr: 0,
            revenueChange: 0,
            roomsSoldChange: roomsChangePercent,
            adrChange: 0,
            revenuePrevious: 0,
            roomsSoldPrevious: previousRoomsSold,
            adrPrevious: 0
          });
        }
      });
      
      // Process adr data
      apiData.adr.forEach((item: any) => {
        const previousADR = item.value - item.change;
        const adrChangePercent = previousADR !== 0 ? 
          (item.change / previousADR) * 100 : 0;
        
        if (combinedData.has(item.name)) {
          const entry = combinedData.get(item.name)!;
          entry.adr = item.value;
          entry.adrChange = adrChangePercent;
          entry.adrPrevious = previousADR;
          combinedData.set(item.name, entry);
        } else {
          combinedData.set(item.name, {
            category: item.name,
            revenue: 0,
            roomsSold: 0,
            adr: item.value,
            revenueChange: 0,
            roomsSoldChange: 0,
            adrChange: adrChangePercent,
            revenuePrevious: 0,
            roomsSoldPrevious: 0,
            adrPrevious: previousADR
          });
        }
      });
      
      return Array.from(combinedData.values());
    }
    
    // Fallback to generated data if API data is not available
    if (!effectivePieDatasets[0].data) return [];

    return effectivePieDatasets[0].data.map(item => {
      const roomsSold = calculateRoomsSold(item.value);
      // Generate random changes between 5-15%
      const revenueChangePercent = 5 + Math.random() * 10;
      const roomsChangePercent = 5 + Math.random() * 10;
      const adrChangePercent = 5 + Math.random() * 10;
      
      return {
        category: item.name,
        revenue: item.value,
        roomsSold,
        adr: calculateADR(item.value, roomsSold),
        revenueChange: revenueChangePercent,
        roomsSoldChange: roomsChangePercent,
        adrChange: adrChangePercent,
        revenuePrevious: item.value / (1 + revenueChangePercent/100),
        roomsSoldPrevious: roomsSold / (1 + roomsChangePercent/100),
        adrPrevious: calculateADR(item.value, roomsSold) / (1 + adrChangePercent/100)
      };
    });
  }, [apiData, effectivePieDatasets, calculateRoomsSold, calculateADR]);
  
  // Update activePieLegends for the new API data
  React.useEffect(() => {
    if (kpiTransformedData.length > 0) {
      // Set initial active legends
      setActivePieLegends(kpiTransformedData.map(item => item.name));
    }
  }, [apiData]); // Only depend on apiData to prevent loops
  
  // Other variables that depend on transformedDistributionData
  const activePieData = React.useMemo(() => 
    kpiTransformedData.filter(item => activePieLegends.includes(item.name)), 
    [kpiTransformedData, activePieLegends]
  );
  
  // Update the filteredTotalValue calculation to work for all KPIs
  const filteredTotalValue = React.useMemo(() => {
    // Calculate the sum for all KPI types, not just revenue
    return activePieData.reduce((total, item) => total + item.value, 0);
  }, [activePieData, selectedPieKPI]);

  // Add the transformedCategoryData definition back in that was accidentally removed
  // Insert this after the kpiTransformedData useMemo
  const transformedCategoryData = React.useMemo(() => {
    // If ADR is selected, use the pre-generated ADR dataset directly
    if (selectedCategoryKPI === 'adr') {
      const adrDataset = timeSeriesDatasets.find(dataset => dataset.id === 'adr');
      return adrDataset ? adrDataset.data : [];
    }

    // For revenue and rooms sold, use the existing logic
    if (!timeSeriesDatasets[0].data) return [];

    return timeSeriesDatasets[0].data.map(item => ({
      ...item,
      categories: Object.entries(item.categories).reduce((acc, [key, value]) => {
        const roomsSold = calculateRoomsSold(value.current);
        const prevRoomsSold = calculateRoomsSold(value.previous);
        
        return {
          ...acc,
          [key]: {
            current: selectedCategoryKPI === 'revenue' ? 
              value.current : 
              roomsSold,
            previous: selectedCategoryKPI === 'revenue' ? 
              value.previous : 
              prevRoomsSold
          }
        };
      }, {})
    }));
  }, [timeSeriesDatasets, selectedCategoryKPI]);

  // Modify the useEffect that fetches fluctuation data to only run when the dialog is opened
  React.useEffect(() => {
    // Only fetch data if the dialog is open AND we have an API endpoint
    if (!open || !apiEndpoint) return;
    
    const fetchFluctuationData = async () => {
      try {
        setFluctuationLoading(true);
        setFluctuationError(null);
        
        // Construct the fluctuation URL by simply replacing the last path segment with "fluctuation"
        const url = new URL(apiEndpoint, window.location.origin);
        const pathSegments = url.pathname.split('/');
        
        // Replace "analysis" with "analysis/fluctuation" in the path
        if (pathSegments.includes('analysis')) {
          const analysisIndex = pathSegments.indexOf('analysis');
          if (analysisIndex !== -1 && pathSegments[analysisIndex + 1] !== 'fluctuation') {
            pathSegments.splice(analysisIndex + 1, 0, 'fluctuation');
            url.pathname = pathSegments.join('/');
          }
        } else {
          // If "analysis" is not found, just append "/fluctuation" to the path
          url.pathname = `${url.pathname}/fluctuation`;
        }
        
        // Add the query parameters
        if (apiParams) {
          Object.entries(apiParams).forEach(([key, value]) => {
            url.searchParams.append(key, value);
          });
        }

        
        const response = await fetch(url.toString());
        
        if (!response.ok) {
          throw new Error(`Fluctuation API request failed with status ${response.status}`);
        }
        
        const data = await response.json();
        setFluctuationData(data);
      } catch (error) {
        console.error('Error fetching fluctuation data:', error);
        setFluctuationError(error instanceof Error ? error.message : 'Unknown error');
      } finally {
        setFluctuationLoading(false);
      }
    };
    
    fetchFluctuationData();
  }, [open, apiEndpoint, JSON.stringify(apiParams)]);

  // Transform fluctuation data into the format expected by charts
  const apiCategoryData = React.useMemo(() => {
    if (!fluctuationData) return null;
    
    // Get the data for the currently selected KPI
    const kpiData = fluctuationData.fluctuationData[selectedCategoryKPI];
    
    if (!kpiData) return null;
    
    // Get all unique categories from the fluctuation data
    const allCategories = Object.keys(kpiData);
    
    // Use only dates from the first category as our timeline
    const firstCategory = allCategories[0];
    const datePoints = kpiData[firstCategory];
    
    // Transform the data for chart consumption
    return datePoints.map((dataPoint, index) => {
      const date = dataPoint.date;
      const formattedDate = formatDate(date);
      
      // Create a categories object with the actual backend categories
      const categories: Record<string, { current: number; previous: number }> = {};
      
      // Fill in data for each category at this date point
      allCategories.forEach(categoryName => {
        if (index < kpiData[categoryName].length) {
          const point = kpiData[categoryName][index];
          // Use the category name directly, just lowercase and no spaces
          const categoryKey = generateCategoryKey(categoryName);
          
          categories[categoryKey] = {
            current: point.value,
            previous: point.previousValue
          };
        }
      });
      
      return {
        date: formattedDate,
        categories
      };
    });
  }, [fluctuationData, selectedCategoryKPI]);

  // Dynamic color generation for categories
  const getCategoryColor = React.useCallback((category: string, index: number) => {
    // Use a fixed color palette, but fall back to dynamic colors if needed
    return COLOR_PALETTE[index % COLOR_PALETTE.length];
  }, []);

  // Update chart config to use dynamic categories
  const categoryConfig = React.useMemo(() => {
    if (!fluctuationData) return STANDARD_CATEGORIES;
    
    const kpiData = fluctuationData.fluctuationData[selectedCategoryKPI];
    if (!kpiData) return STANDARD_CATEGORIES;
    
    // Create a dynamic config using the actual category names
    const config: Record<string, { label: string; color: string }> = {};
    Object.keys(kpiData).forEach((categoryName, index) => {
      const categoryKey = generateCategoryKey(categoryName);
      config[categoryKey] = {
        label: categoryName, // Use the original name for display
        color: getCategoryColor(categoryName, index)
      };
    });
    
    return config;
  }, [fluctuationData, selectedCategoryKPI, getCategoryColor]);

  // Use the dynamic category config
  const effectiveCategoryConfig = categoryConfig || STANDARD_CATEGORIES;

  // Use API category data if available, otherwise fall back to generated data
  const effectiveCategoryData = React.useMemo(() => {
    // For debugging
    
    return apiCategoryData || transformedCategoryData;
  }, [apiCategoryData, transformedCategoryData]);

  // Add this effect to update activeCategories when effectiveCategoryConfig changes:
  React.useEffect(() => {
    setActiveCategories(Object.keys(effectiveCategoryConfig) as CategoryKey[]);
  }, [effectiveCategoryConfig]);

  const renderFullScreenTable = () => {
    if (!fullScreenTable.type) return null;

    switch (fullScreenTable.type) {
      case 'main':
        return timeSeriesDatasets[0].data ? (
          <FullScreenTable
            open={fullScreenTable.isOpen}
            onOpenChange={(open) => setFullScreenTable({ isOpen: open, type: open ? 'main' : null })}
            title={`Over Time`}
            headers={['Month', 'Current Period', 'Previous Period', 'Change']}
            data={timeSeriesDatasets[0].data}
            renderRow={(row) => (
              <>
                <TableCell className="w-[25%] bg-[#f0f4fa]/40 border-r border-[#d0d7e3] text-left">
                  {row.date}
                </TableCell>
                <TableCell className="w-[25%] text-left border-r border-[#d0d7e3]">
                  {prefix}{row.current.toLocaleString()}
                </TableCell>
                <TableCell className="w-[25%] text-left border-r border-[#d0d7e3]">
                  {prefix}{row.previous.toLocaleString()}
                </TableCell>
                <TableCell className={`w-[25%] text-left ${row.current > row.previous ? "text-emerald-500" : "text-red-500"}`}>
                  {((row.current - row.previous) / row.previous * 100).toFixed(1)}%
                </TableCell>
              </>
            )}
          />
        ) : null;
      case 'pie':
        return processedDistributionData.length > 0 ? (
          <FullScreenTable
            open={fullScreenTable.isOpen}
            onOpenChange={(open) => setFullScreenTable({ isOpen: open, type: open ? 'pie' : null })}
            title="Revenue Distribution"
            headers={['Category', 'Revenue', 'Percentage']}
            data={processedDistributionData}
            renderRow={(row) => (
              <>
                <TableCell className="w-[40%] bg-[#f0f4fa]/40 border-r border-[#d0d7e3] text-left">
                  {row.name}
                </TableCell>
                <TableCell className="w-[30%] text-left border-r border-[#d0d7e3]">
                  {prefix}{row.value.toLocaleString()}
                </TableCell>
                <TableCell className="w-[30%] text-left">
                  {row.percentage}%
                </TableCell>
              </>
            )}
          />
        ) : null;
      case 'categories':
        return timeSeriesDatasets[0].data ? (
          <FullScreenTable
            open={fullScreenTable.isOpen}
            onOpenChange={(open) => setFullScreenTable({ isOpen: open, type: open ? 'categories' : null })}
            title="Categories Over Time"
            headers={[
              'Month',
              ...Object.keys(STANDARD_CATEGORIES).flatMap(key => [
                `${String(STANDARD_CATEGORIES[key as CategoryKey].label)} (Current)`,
                `${String(STANDARD_CATEGORIES[key as CategoryKey].label)} (Prev)`
              ])
            ]}
            data={timeSeriesDatasets[0].data}
            renderRow={(row) => (
              <>
                <TableCell className="w-[16%] bg-[#f0f4fa]/40 border-r border-[#d0d7e3] text-left">
                  {row.date}
                </TableCell>
                {Object.keys(STANDARD_CATEGORIES).map((categoryKey, index) => (
                  <React.Fragment key={categoryKey}>
                    <TableCell className="w-[14%] text-left border-r border-[#d0d7e3]">
                      {prefix}{row.categories[categoryKey].current.toLocaleString()}
                    </TableCell>
                    <TableCell className={`w-[14%] text-left ${index === Object.keys(STANDARD_CATEGORIES).length - 1 ? '' : 'border-r border-[#d0d7e3]'}`}>
                      {prefix}{row.categories[categoryKey].previous.toLocaleString()}
                    </TableCell>
                  </React.Fragment>
                ))}
              </>
            )}
          />
        ) : null;
    }
  };

  // Add this effect to switch to normal view when ADR is selected
  React.useEffect(() => {
    if (selectedCategoryKPI === 'adr' && categoryChartMode === 'stacked') {
      setCategoryChartMode('normal');
    }
  }, [selectedCategoryKPI]);

  // Add this effect to ensure we have proper data for ADR in the pie chart area
  React.useEffect(() => {
    if (selectedPieKPI === 'adr') {
      // Make sure all categories are active when showing ADR bar chart
      if (activePieLegends.length !== pieDatasets[0].data.length) {
        setActivePieLegends(pieDatasets[0].data.map(item => item.name));
      }
    }
  }, [selectedPieKPI, pieDatasets, activePieLegends]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {/* Add loading indicator */}
      {apiLoading && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white"></div>
        </div>
      )}
      
      {/* Show error message if API request failed */}
      {apiError && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center">
          <div className="bg-white p-6 rounded-lg max-w-md">
            <h3 className="text-lg font-bold text-red-600 mb-2">Error</h3>
            <p>{apiError}</p>
            <button 
              className="mt-4 px-4 py-2 bg-blue-500 text-white rounded-md"
              onClick={() => setApiError(null)}
            >
              Close
            </button>
          </div>
        </div>
      )}
      
      {/* Add loading indicator for fluctuation data */}
      {fluctuationLoading && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white"></div>
        </div>
      )}
      
      {/* Show error message if fluctuation API request failed */}
      {fluctuationError && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center">
          <div className="bg-white p-6 rounded-lg max-w-md">
            <h3 className="text-lg font-bold text-amber-600 mb-2">Warning</h3>
            <p>Could not load fluctuation data: {fluctuationError}</p>
            <p className="mt-2">Falling back to generated data.</p>
            <button 
              className="mt-4 px-4 py-2 bg-blue-500 text-white rounded-md"
              onClick={() => setFluctuationError(null)}
            >
              Close
            </button>
          </div>
        </div>
      )}
      
      <DialogContent className="max-w-[90vw] max-h-[90vh] flex flex-col p-0">
        <DialogHeader className="flex-none py-6 pb-2" showBorder={true}>
          <DialogTitle className="text-lg font-medium px-4">{title} Breakdown</DialogTitle>
        </DialogHeader>
        
        <div className="flex-1 overflow-y-auto pr-6 bg-[#f2f8ff] px-4 pb-4 pt-4">
          {apiLoading ? (
            // Loading state for the entire content
            <div className="flex flex-col gap-6">
              {/* Charts Row Loading State */}
              <div className="grid grid-cols-2 gap-6">
                {/* Distribution Card Loading */}
                <div className="border border-gray-300 rounded-lg bg-white p-4">
                  <div className="h-8 bg-gray-200 rounded-md w-1/3 mb-6 animate-pulse"></div>
                  <div className="h-[300px] bg-gray-100 rounded-md mb-6 animate-pulse"></div>
                  <div className="grid grid-cols-2 gap-3">
                    {[1, 2, 3, 4].map(i => (
                      <div key={i} className="h-12 bg-gray-100 rounded-lg animate-pulse"></div>
                    ))}
                  </div>
                </div>
                
                {/* Categories Over Time Card Loading */}
                <div className="border border-gray-300 rounded-lg bg-white p-4">
                  <div className="h-8 bg-gray-200 rounded-md w-1/3 mb-6 animate-pulse"></div>
                  <div className="h-[300px] bg-gray-100 rounded-md mb-6 animate-pulse"></div>
                  <div className="flex justify-center gap-3 mt-6">
                    {[1, 2, 3, 4, 5].map(i => (
                      <div key={i} className="h-8 w-20 bg-gray-100 rounded-full animate-pulse"></div>
                    ))}
                  </div>
                </div>
              </div>
              
              {/* Table Card Loading */}
              <div className="border border-gray-300 rounded-lg bg-white p-4">
                <div className="h-8 bg-gray-200 rounded-md w-1/4 mb-6 animate-pulse"></div>
                <div className="border rounded-lg">
                  <div className="h-10 bg-gray-100 rounded-t-lg animate-pulse"></div>
                  {[1, 2, 3, 4, 5].map(i => (
                    <div key={i} className="h-12 bg-gray-50 border-t border-gray-200 animate-pulse"></div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            // Actual content when data is loaded
            <div className="flex flex-col gap-6">
              {/* Charts Row */}
              <div className="grid grid-cols-2 gap-6">
                {/* Distribution Card */}
                <Card className="border-gray-300">
                  <CardHeader>
                    <div className="flex justify-between items-center">
                      <h3 className="text-lg font-medium">Distribution</h3>
                      <div className="flex items-center gap-3">
                        {/* Chart Type Dropdown */}
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button 
                              variant="ghost" 
                              size="sm"
                              className="bg-[#f2f8ff] hover:bg-[#f2f8ff] text-[#342630] rounded-full px-4 font-semibold whitespace-nowrap"
                            >
                              {distributionChartType === 'pie' ? 'Pie Chart' : 'Bar Chart'}
                              <TriangleDown className="ml-3" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem 
                              onClick={() => setDistributionChartType('pie')}
                              disabled={selectedPieKPI === 'adr'}
                              className={selectedPieKPI === 'adr' ? 'opacity-50 cursor-not-allowed' : ''}
                            >
                              Pie Chart
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => setDistributionChartType('bar')}>
                              Bar Chart
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                        
                        {/* KPI Type Dropdown */}
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button 
                              variant="ghost" 
                              size="sm"
                              className="bg-[#f2f8ff] hover:bg-[#f2f8ff] text-[#342630] rounded-full px-4 font-semibold whitespace-nowrap"
                            >
                              {selectedPieKPI === 'revenue' ? 'Revenue' : 
                               selectedPieKPI === 'roomsSold' ? 'Rooms Sold' : 'ADR'}
                              <TriangleDown className="ml-3" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => setSelectedPieKPI('revenue')}>
                              Revenue
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => setSelectedPieKPI('roomsSold')}>
                              Rooms Sold
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              onClick={() => {
                                setSelectedPieKPI('adr');
                                setDistributionChartType('bar'); // Force bar chart when selecting ADR
                              }}
                            >
                              ADR
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {/* Conditional rendering based on chart type and selected KPI */}
                    {(distributionChartType === 'bar' || selectedPieKPI === 'adr') ? (
                      /* Bar Chart */
                      <div className="w-full h-[300px] relative flex justify-center">
                        <ChartContainer config={effectiveCategoryConfig}>
                          <BarChart
                            data={selectedPieKPI === 'adr' ? kpiTransformedData : kpiTransformedData.filter(item => activePieLegends.includes(item.name))}
                            height={300}
                            margin={{
                              top: 30,
                              right: 30,
                              bottom: 20,
                              left: 40,
                            }}
                          >
                            <CartesianGrid strokeDasharray="3 3" vertical={false} />
                            <XAxis
                              dataKey="name"
                              tickLine={false}
                              axisLine={false}
                              tickFormatter={(value) => value}
                              tickMargin={8}
                              interval={'preserveStartEnd'}
                            />
                            <YAxis
                              tickLine={false}
                              axisLine={false}
                              tickFormatter={(value) => `${Math.round(value).toLocaleString()}`}
                              tickMargin={8}
                            />
                            <ChartTooltip 
                              content={({ active, payload, label }) => {
                                if (active && payload && payload.length) {
                                  return (
                                    <div className="bg-white p-4 border border-gray-200 shadow-lg rounded-lg">
                                      <p className="font-medium mb-2">{label}</p>
                                      <p className="text-sm">
                                        {selectedPieKPI === 'revenue' ? 'Revenue' : 
                                         selectedPieKPI === 'roomsSold' ? 'Rooms Sold' : 'ADR'}: 
                                        {selectedPieKPI === 'revenue' || selectedPieKPI === 'adr' ? prefix : ''}{Number(payload[0].value).toLocaleString()}
                                      </p>
                                    </div>
                                  )
                                }
                                return null
                              }}
                            />
                            <Bar
                              dataKey="value"
                              radius={[4, 4, 0, 0]}
                            >
                              {kpiTransformedData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={entry.fill} />
                              ))}
                            </Bar>
                          </BarChart>
                        </ChartContainer>
                      </div>
                    ) : (
                      /* Pie Chart for Revenue and Rooms Sold */
                      <div className="w-full h-[300px] relative flex justify-center">
                        <ChartContainer config={effectiveCategoryConfig}>
                          <PieChart width={300} height={300}>
                            <ChartTooltip content={<ChartTooltipContent />} />
                            <Pie
                              data={activePieData}
                              dataKey="value"
                              nameKey="name"
                              innerRadius={70}
                              outerRadius={120}
                              fill="#8884d8"
                            >
                              {activePieData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={entry.fill} />
                              ))}
                              <Label
                                content={({ viewBox }) => {
                                  if (viewBox && "cx" in viewBox && "cy" in viewBox) {
                                    return (
                                      <text
                                        x={viewBox.cx}
                                        y={viewBox.cy}
                                        textAnchor="middle"
                                        dominantBaseline="middle"
                                      >
                                        <tspan
                                          x={viewBox.cx}
                                          y={viewBox.cy}
                                          className="fill-foreground text-lg font-bold"
                                        >
                                          {selectedPieKPI === 'revenue' ? prefix : ''}{filteredTotalValue.toLocaleString()}
                                        </tspan>
                                        <tspan
                                          x={viewBox.cx}
                                          y={(viewBox.cy || 0) + 20}
                                          className="fill-muted-foreground text-xs"
                                        >
                                          Total {selectedPieKPI === 'revenue' ? 'Revenue' : 'Rooms'}
                                        </tspan>
                                      </text>
                                    )
                                  }
                                  return null;
                                }}
                              />
                            </Pie>
                          </PieChart>
                        </ChartContainer>
                      </div>
                    )}

                    {/* Distribution Stats - Now Clickable */}
                    <div className="w-full grid grid-cols-2 gap-3 mt-6">
                      {kpiTransformedData.map((item) => (
                        <div 
                          key={item.name}
                          onClick={() => {
                            // Make clickable for both chart types, but not for ADR
                            if (selectedPieKPI !== 'adr') {
                              if (activePieLegends.includes(item.name)) {
                                setActivePieLegends(activePieLegends.filter(name => name !== item.name));
                              } else {
                                setActivePieLegends([...activePieLegends, item.name]);
                              }
                            }
                          }}
                          className={`${selectedPieKPI !== 'adr' ? 'cursor-pointer' : ''} flex items-center justify-between px-4 py-3 rounded-lg bg-[#f0f4fa] border border-[#e5eaf3] ${
                            activePieLegends.includes(item.name) || selectedPieKPI === 'adr' ? '' : 'opacity-50'
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <div 
                              className="w-2 h-2 rounded-full"
                              style={{ backgroundColor: item.fill }}
                            />
                            <span className="text-xs text-gray-500 font-medium">
                              {item.name}: {selectedPieKPI === 'revenue' || selectedPieKPI === 'adr' ? prefix : ''}{item.value.toLocaleString()}
                              {distributionChartType === 'pie' && selectedPieKPI !== 'adr' && ` (${item.percentage}%)`}
                            </span>
                          </div>
                          <span className={`text-xs flex items-center ${item.change > 0 ? "text-emerald-500" : "text-red-500"}`}>
                            {item.change > 0 ? <ArrowUpIcon className="h-3 w-3 mr-1" /> : <ArrowDownIcon className="h-3 w-3 mr-1" />}
                            {item.change > 0 ? "+" : ""}{item.change.toFixed(1)}%
                          </span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                {/* Categories Over Time Card */}
                <Card className="border-gray-300">
                  <CardHeader>
                    <div className="flex justify-between items-center">
                      <h3 className="text-lg font-medium">Over Time</h3>
                      <div className="flex items-center gap-3">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button 
                              variant="ghost" 
                              size="sm"
                              className="bg-[#f2f8ff] hover:bg-[#f2f8ff] text-[#342630] rounded-full px-4 font-semibold whitespace-nowrap"
                            >
                              {categoryChartMode === 'normal' ? 'Normal View' : 'Stacked View'}
                              <TriangleDown className="ml-3" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => setCategoryChartMode('normal')}>
                              Normal View
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              onClick={() => setCategoryChartMode('stacked')}
                              className={selectedCategoryKPI === 'adr' ? 'opacity-50 cursor-not-allowed' : ''}
                              disabled={selectedCategoryKPI === 'adr'}
                            >
                              Stacked View
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                        
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button 
                              variant="ghost" 
                              size="sm"
                              className="bg-[#f2f8ff] hover:bg-[#f2f8ff] text-[#342630] rounded-full px-4 font-semibold whitespace-nowrap"
                            >
                              {selectedCategoryKPI === 'revenue' ? 'Revenue' : 
                               selectedCategoryKPI === 'roomsSold' ? 'Rooms Sold' : 'ADR'}
                              <TriangleDown className="ml-3" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => setSelectedCategoryKPI('revenue')}>
                              Revenue
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => setSelectedCategoryKPI('roomsSold')}>
                              Rooms Sold
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              onClick={() => {
                                setSelectedCategoryKPI('adr');
                                setCategoryChartMode('normal'); // Force normal view when selecting ADR
                              }}
                            >
                              ADR
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {/* Area Chart */}
                    <ChartContainer config={effectiveCategoryConfig}>
                      <AreaChart
                        data={effectiveCategoryData}
                        height={300}
                        margin={{
                          top: 30,
                          right: 10,
                          bottom: 20,
                          left: getCategoriesLeftMargin(timeSeriesDatasets[0].data),
                        }}
                      >
                        <defs>
                          {Object.keys(effectiveCategoryConfig).map((categoryKey) => (
                            <React.Fragment key={categoryKey}>
                              <linearGradient id={`gradient-${categoryKey}`} x1="0" y1="0" x2="0" y2="1">
                                <stop offset="0%" stopColor={effectiveCategoryConfig[categoryKey].color} stopOpacity={0.1}/>
                                <stop offset="100%" stopColor={effectiveCategoryConfig[categoryKey].color} stopOpacity={0.1}/>
                              </linearGradient>
                              <linearGradient id={`gradient-${categoryKey}-previous`} x1="0" y1="0" x2="0" y2="1">
                                <stop offset="0%" stopColor={effectiveCategoryConfig[categoryKey].color} stopOpacity={0.05}/>
                                <stop offset="100%" stopColor={effectiveCategoryConfig[categoryKey].color} stopOpacity={0.05}/>
                              </linearGradient>
                            </React.Fragment>
                          ))}
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} />
                        <XAxis
                          dataKey="date"
                          tickLine={false}
                          axisLine={false}
                          tickFormatter={(value) => value}
                          tickMargin={8}
                          interval={'preserveStartEnd'}
                        />
                        <YAxis
                          tickLine={false}
                          axisLine={false}
                          tickFormatter={(value) => `${Math.round(value).toLocaleString()}`}
                          tickMargin={8}
                          width={45}
                        />
                        <ChartTooltip 
                          content={({ active, payload, label }) => {
                            if (active && payload && payload.length) {
                              const stackedTotal = categoryChartMode === 'stacked' 
                                ? payload.reduce((sum, entry) => sum + (entry.value as number), 0)
                                : null;
                              
                              return (
                                <div className="bg-white p-4 border border-gray-200 shadow-lg rounded-lg">
                                  <p className="font-medium mb-2">{label}</p>
                                  {Object.keys(effectiveCategoryConfig).map(categoryKey => {
                                    const entry = payload.find(p => p.dataKey === `categories.${categoryKey}.current`)
                                    if (!entry) return null
                                    return (
                                      <div key={categoryKey} className="mb-2">
                                        <p className="font-medium" style={{ color: effectiveCategoryConfig[categoryKey].color }}>
                                          {effectiveCategoryConfig[categoryKey].label}
                                        </p>
                                        <p className="text-sm">
                                          {prefix}{Number(entry.value).toLocaleString()}
                                          {stackedTotal && ` (${((entry.value as number) / stackedTotal * 100).toFixed(1)}%)`}
                                        </p>
                                      </div>
                                    )
                                  })}
                                  {stackedTotal && (
                                    <div className="mt-2 pt-2 border-t border-gray-200">
                                      <p className="font-medium">Total</p>
                                      <p className="text-sm">{prefix}{stackedTotal.toLocaleString()}</p>
                                    </div>
                                  )}
                                </div>
                              )
                            }
                            return null
                          }}
                        />
                        {/* Render areas based on chart mode */}
                        {Object.keys(effectiveCategoryConfig).map((categoryKey) => (
                          activeCategories.includes(categoryKey as CategoryKey) && (
                            <Area
                              key={categoryKey}
                              type="monotone"
                              dataKey={`categories.${categoryKey}.current`}
                              stroke={effectiveCategoryConfig[categoryKey].color}
                              fill={categoryChartMode === 'stacked' ? effectiveCategoryConfig[categoryKey].color : 'transparent'}
                              fillOpacity={categoryChartMode === 'stacked' ? 0.4 : 0}
                              strokeWidth={2}
                              dot={false}
                              name={String(effectiveCategoryConfig[categoryKey].label)}
                              stackId={categoryChartMode === 'stacked' ? "1" : undefined}
                            />
                          )
                        ))}
                      </AreaChart>
                    </ChartContainer>

                    {/* Categories Over Time Legend - Moved below chart */}
                    <div className="flex justify-center gap-3 mt-6">
                      {Object.keys(effectiveCategoryConfig).map((key) => (
                        <div
                          key={key}
                          onClick={() => {
                            if (activeCategories.includes(key as CategoryKey)) {
                              setActiveCategories(activeCategories.filter(item => item !== key as CategoryKey));
                            } else {
                              setActiveCategories([...activeCategories, key as CategoryKey]);
                            }
                          }}
                          className={`cursor-pointer bg-[#f0f4fa] px-3 py-1.5 rounded-full border border-[#e5eaf3] flex items-center gap-2 ${
                            activeCategories.includes(key as CategoryKey) ? '' : 'opacity-50'
                          }`}
                        >
                          <div 
                            style={{ backgroundColor: effectiveCategoryConfig[key].color }} 
                            className="w-2 h-2 rounded-full" 
                          />
                          <span className="text-xs text-gray-500 font-medium">
                            {effectiveCategoryConfig[key].label}
                          </span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Table Card */}
              <Card className="border-gray-300">
                <CardHeader>
                  <div className="flex justify-between items-center">
                    <h3 className="text-lg font-medium">All {title}</h3>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="border rounded-lg">
                    <Table>
                      <TableHeader>
                        <TableRow className="hover:bg-transparent">
                          <TableHead className="bg-[#f0f4fa]/60 w-[12%]">Category</TableHead>
                          {/* Revenue Columns */}
                          <TableHead className="bg-[#f0f4fa]/60 text-right w-[11%]">Revenue CY</TableHead>
                          <TableHead className="bg-[#f0f4fa]/60 text-right w-[11%]">Revenue LY</TableHead>
                          <TableHead className="bg-[#f0f4fa]/60 text-right w-[8%]">Change</TableHead>
                          {/* Rooms Sold Columns */}
                          <TableHead className="bg-[#f0f4fa]/60 text-right w-[11%]">Rooms Sold CY</TableHead>
                          <TableHead className="bg-[#f0f4fa]/60 text-right w-[11%]">Rooms Sold LY</TableHead>
                          <TableHead className="bg-[#f0f4fa]/60 text-right w-[8%]">Change</TableHead>
                          {/* ADR Columns */}
                          <TableHead className="bg-[#f0f4fa]/60 text-right w-[11%]">ADR CY</TableHead>
                          <TableHead className="bg-[#f0f4fa]/60 text-right w-[11%]">ADR LY</TableHead>
                          <TableHead className="bg-[#f0f4fa]/60 text-right w-[6%]">Change</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {processedTableData.map((row, idx) => {
                          return (
                            <TableRow key={idx} className="border-b border-[#d0d7e3] last:border-0">
                              <TableCell className="w-[12%] text-left border-r border-[#d0d7e3]">
                                {row.category}
                              </TableCell>
                              <TableCell className="w-[11%] text-right border-r border-[#d0d7e3]">
                                {prefix}{row.revenue.toLocaleString()}
                              </TableCell>
                              <TableCell className="w-[11%] text-right border-r border-[#d0d7e3]">
                                {prefix}{row.revenuePrevious.toLocaleString()}
                              </TableCell>
                              <TableCell className={`w-[8%] text-right border-r border-[#d0d7e3] ${
                                row.revenueChange > 0 ? "text-emerald-500" : "text-red-500"
                              }`}>
                                {row.revenueChange > 0 ? "+" : ""}{row.revenueChange.toFixed(1)}%
                              </TableCell>
                              <TableCell className="w-[11%] text-right border-r border-[#d0d7e3]">
                                {row.roomsSold.toLocaleString()}
                              </TableCell>
                              <TableCell className="w-[11%] text-right border-r border-[#d0d7e3]">
                                {row.roomsSoldPrevious.toLocaleString()}
                              </TableCell>
                              <TableCell className={`w-[8%] text-right border-r border-[#d0d7e3] ${
                                row.roomsSoldChange > 0 ? "text-emerald-500" : "text-red-500"
                              }`}>
                                {row.roomsSoldChange > 0 ? "+" : ""}{row.roomsSoldChange.toFixed(1)}%
                              </TableCell>
                              <TableCell className="w-[11%] text-right border-r border-[#d0d7e3]">
                                {prefix}{row.adr.toLocaleString()}
                              </TableCell>
                              <TableCell className="w-[11%] text-right border-r border-[#d0d7e3]">
                                {prefix}{row.adrPrevious.toLocaleString()}
                              </TableCell>
                              <TableCell className={`w-[6%] text-right ${
                                row.adrChange > 0 ? "text-emerald-500" : "text-red-500"
                              }`}>
                                {row.adrChange > 0 ? "+" : ""}{row.adrChange.toFixed(1)}%
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
} 