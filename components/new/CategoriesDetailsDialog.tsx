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
}

// Add this type for chart display type
type ChartType = 'pie' | 'bar';

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

export function CategoriesDetailsDialog({ 
  open, 
  onOpenChange, 
  title,
  prefix = "€",
  suffix = "",
}: CategoriesDetailsDialogProps) {
  // Generate data once when component mounts
  const [pieDatasets] = React.useState(generatePieChartDatasets)
  const [timeSeriesDatasets] = React.useState(generateTimeSeriesDatasets)
  
  // State for selected datasets
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
  const [activeCategories, setActiveCategories] = React.useState<CategoryKey[]>(
    Object.keys(STANDARD_CATEGORIES) as CategoryKey[]
  );
  // New state for toggling legend items for the pie chart distribution
  const [activePieLegends, setActivePieLegends] = React.useState<string[]>(pieDatasets[0].data.map(item => item.name));
  const filteredDistributionData = React.useMemo(() => pieDatasets[0].data.filter(item => activePieLegends.includes(item.name)), [pieDatasets[0].data, activePieLegends]);
  const filteredTotalValue = React.useMemo(() => filteredDistributionData.reduce((acc, item) => acc + item.value, 0), [filteredDistributionData]);
  
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

  // Transform distribution data based on selected KPI
  const transformedDistributionData = React.useMemo(() => {
    if (!pieDatasets[0].data) return [];
    
    return pieDatasets[0].data.map((item, index) => {
      const roomsSold = calculateRoomsSold(item.value);
      // Use index as a variation factor (0-1 range)
      const variationFactor = index / (pieDatasets[0].data.length - 1);
      return {
        ...item,
        value: selectedPieKPI === 'revenue' ? 
          item.value : 
          selectedPieKPI === 'roomsSold' ?
          roomsSold :
          calculateADR(item.value, roomsSold, variationFactor)
      };
    });
  }, [pieDatasets[0].data, selectedPieKPI]);

  // Transform category time series data based on selected KPI
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

  // Generate table data
  const tableData: TableData[] = React.useMemo(() => {
    if (!pieDatasets[0].data) return [];

    return pieDatasets[0].data.map(item => {
      const roomsSold = calculateRoomsSold(item.value);
      return {
        category: item.name,
        revenue: item.value,
        roomsSold,
        adr: calculateADR(item.value, roomsSold)
      };
    });
  }, [pieDatasets[0].data]);

  // Update effect to switch to bar chart when ADR is selected
  React.useEffect(() => {
    if (selectedPieKPI === 'adr' && distributionChartType === 'pie') {
      setDistributionChartType('bar');
    }
  }, [selectedPieKPI]);

  const renderFullScreenTable = () => {
    if (!fullScreenTable.type) return null;

    switch (fullScreenTable.type) {
      case 'main':
        return timeSeriesDatasets[0].data ? (
          <FullScreenTable
            open={fullScreenTable.isOpen}
            onOpenChange={(open) => setFullScreenTable({ isOpen: open, type: open ? 'main' : null })}
            title={`${title} Over Time`}
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
        return pieDatasets[0].data ? (
          <FullScreenTable
            open={fullScreenTable.isOpen}
            onOpenChange={(open) => setFullScreenTable({ isOpen: open, type: open ? 'pie' : null })}
            title="Revenue Distribution"
            headers={['Category', 'Revenue', 'Percentage']}
            data={filteredDistributionData}
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
                `${String(STANDARD_CATEGORIES[key].label)} (Current)`,
                `${String(STANDARD_CATEGORIES[key].label)} (Prev)`
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
      <DialogContent className="max-w-[90vw] max-h-[90vh] flex flex-col p-0">
        <DialogHeader className="flex-none py-6 pb-2" showBorder={true}>
          <DialogTitle className="text-lg font-medium px-4">{title} Breakdown</DialogTitle>
        </DialogHeader>
        
        <div className="flex-1 overflow-y-auto pr-6 bg-[#f2f8ff] px-4 pb-4 pt-4">
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
                      <ChartContainer config={STANDARD_CATEGORIES}>
                        <BarChart
                          data={selectedPieKPI === 'adr' ? transformedDistributionData : transformedDistributionData.filter(item => activePieLegends.includes(item.name))}
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
                            tickMargin={8}
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
                            {transformedDistributionData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.fill} />
                            ))}
                          </Bar>
                        </BarChart>
                      </ChartContainer>
                    </div>
                  ) : (
                    /* Pie Chart for Revenue and Rooms Sold */
                    <div className="w-full h-[300px] relative flex justify-center">
                      <ChartContainer config={STANDARD_CATEGORIES}>
                        <PieChart width={300} height={300}>
                          <ChartTooltip content={<ChartTooltipContent />} />
                          <Pie
                            data={filteredDistributionData}
                            dataKey="value"
                            nameKey="name"
                            innerRadius={70}
                            outerRadius={120}
                            fill="#8884d8"
                          >
                            {filteredDistributionData.map((entry, index) => (
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
                    {transformedDistributionData.map((item) => (
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
                        <span className="text-emerald-500 text-xs flex items-center">
                          <ArrowUpIcon className="h-3 w-3 mr-1" />
                          {Math.floor(Math.random() * 500 + 200)}%
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
                    <h3 className="text-lg font-medium">Categories Over Time</h3>
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
                  <ChartContainer config={STANDARD_CATEGORIES}>
                    <AreaChart
                      data={transformedCategoryData}
                      height={300}
                      margin={{
                        top: 30,
                        right: 10,
                        bottom: 20,
                        left: getCategoriesLeftMargin(timeSeriesDatasets[0].data),
                      }}
                    >
                      <defs>
                        {Object.keys(STANDARD_CATEGORIES).map((categoryKey) => (
                          <React.Fragment key={categoryKey}>
                            <linearGradient id={`gradient-${categoryKey}`} x1="0" y1="0" x2="0" y2="1">
                              <stop offset="0%" stopColor={STANDARD_CATEGORIES[categoryKey as CategoryKey].color} stopOpacity={0.1}/>
                              <stop offset="100%" stopColor={STANDARD_CATEGORIES[categoryKey as CategoryKey].color} stopOpacity={0.1}/>
                            </linearGradient>
                            <linearGradient id={`gradient-${categoryKey}-previous`} x1="0" y1="0" x2="0" y2="1">
                              <stop offset="0%" stopColor={STANDARD_CATEGORIES[categoryKey as CategoryKey].color} stopOpacity={0.05}/>
                              <stop offset="100%" stopColor={STANDARD_CATEGORIES[categoryKey as CategoryKey].color} stopOpacity={0.05}/>
                            </linearGradient>
                          </React.Fragment>
                        ))}
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} />
                      <XAxis
                        dataKey="date"
                        tickLine={false}
                        axisLine={false}
                        tickFormatter={(value) => value.slice(0, 3)}
                        tickMargin={8}
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
                                {Object.keys(STANDARD_CATEGORIES).map(categoryKey => {
                                  const entry = payload.find(p => p.dataKey === `categories.${categoryKey}.current`)
                                  if (!entry) return null
                                  return (
                                    <div key={categoryKey} className="mb-2">
                                      <p className="font-medium" style={{ color: STANDARD_CATEGORIES[categoryKey as CategoryKey].color }}>
                                        {STANDARD_CATEGORIES[categoryKey as CategoryKey].label}
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
                      {Object.keys(STANDARD_CATEGORIES).map((categoryKey) => (
                        activeCategories.includes(categoryKey as CategoryKey) && (
                          <Area
                            key={categoryKey}
                            type="monotone"
                            dataKey={`categories.${categoryKey}.current`}
                            stroke={STANDARD_CATEGORIES[categoryKey as CategoryKey].color}
                            fill={categoryChartMode === 'stacked' ? STANDARD_CATEGORIES[categoryKey as CategoryKey].color : 'transparent'}
                            fillOpacity={categoryChartMode === 'stacked' ? 0.4 : 0}
                            strokeWidth={2}
                            dot={false}
                            name={String(STANDARD_CATEGORIES[categoryKey as CategoryKey].label)}
                            stackId={categoryChartMode === 'stacked' ? "1" : undefined}
                          />
                        )
                      ))}
                    </AreaChart>
                  </ChartContainer>

                  {/* Categories Over Time Legend - Moved below chart */}
                  <div className="flex justify-center gap-3 mt-6">
                    {Object.keys(STANDARD_CATEGORIES).map((key) => (
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
                          style={{ backgroundColor: STANDARD_CATEGORIES[key as CategoryKey].color }} 
                          className="w-2 h-2 rounded-full" 
                        />
                        <span className="text-xs text-gray-500 font-medium">
                          {STANDARD_CATEGORIES[key as CategoryKey].label}
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
                  <h3 className="text-lg font-medium">All Categories</h3>
                </div>
              </CardHeader>
              <CardContent>
                <div className="border rounded-lg">
                  <Table>
                    <TableHeader>
                      <TableRow className="hover:bg-transparent">
                        <TableHead className="bg-[#f0f4fa]/60 w-[16%]">Category</TableHead>
                        {/* Revenue Columns */}
                        <TableHead className="bg-[#f0f4fa]/60 text-right">Revenue CY</TableHead>
                        <TableHead className="bg-[#f0f4fa]/60 text-right">Revenue LY</TableHead>
                        <TableHead className="bg-[#f0f4fa]/60 text-right">Change</TableHead>
                        {/* Rooms Sold Columns */}
                        <TableHead className="bg-[#f0f4fa]/60 text-right">Rooms Sold CY</TableHead>
                        <TableHead className="bg-[#f0f4fa]/60 text-right">Rooms Sold LY</TableHead>
                        <TableHead className="bg-[#f0f4fa]/60 text-right">Change</TableHead>
                        {/* ADR Columns */}
                        <TableHead className="bg-[#f0f4fa]/60 text-right">ADR CY</TableHead>
                        <TableHead className="bg-[#f0f4fa]/60 text-right">ADR LY</TableHead>
                        <TableHead className="bg-[#f0f4fa]/60 text-right">Change</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {tableData.map((row, idx) => {
                        // Calculate changes
                        const revenueChange = ((row.revenue - row.revenue * 0.95) / (row.revenue * 0.95)) * 100;
                        const roomsChange = ((row.roomsSold - row.roomsSold * 0.93) / (row.roomsSold * 0.93)) * 100;
                        const adrChange = ((row.adr - row.adr * 0.97) / (row.adr * 0.97)) * 100;

                        return (
                          <TableRow key={idx} className="border-b border-[#d0d7e3] last:border-0">
                            <TableCell className="w-[16%] text-left border-r border-[#d0d7e3]">
                              {row.category}
                            </TableCell>
                            <TableCell className="w-[14%] text-right border-r border-[#d0d7e3]">
                              {prefix}{row.revenue.toLocaleString()}
                            </TableCell>
                            <TableCell className="w-[14%] text-right border-r border-[#d0d7e3]">
                              {prefix}{(row.revenue * 0.95).toLocaleString()}
                            </TableCell>
                            <TableCell className={`w-[14%] text-right border-r border-[#d0d7e3] ${
                              revenueChange > 0 ? "text-emerald-500" : "text-red-500"
                            }`}>
                              {revenueChange > 0 ? "+" : ""}{revenueChange.toFixed(1)}%
                            </TableCell>
                            <TableCell className="w-[14%] text-right border-r border-[#d0d7e3]">
                              {row.roomsSold.toLocaleString()}
                            </TableCell>
                            <TableCell className="w-[14%] text-right border-r border-[#d0d7e3]">
                              {(row.roomsSold * 0.93).toLocaleString()}
                            </TableCell>
                            <TableCell className={`w-[14%] text-right border-r border-[#d0d7e3] ${
                              roomsChange > 0 ? "text-emerald-500" : "text-red-500"
                            }`}>
                              {roomsChange > 0 ? "+" : ""}{roomsChange.toFixed(1)}%
                            </TableCell>
                            <TableCell className="w-[14%] text-right border-r border-[#d0d7e3]">
                              {prefix}{row.adr.toLocaleString()}
                            </TableCell>
                            <TableCell className="w-[14%] text-right border-r border-[#d0d7e3]">
                              {prefix}{(row.adr * 0.97).toLocaleString()}
                            </TableCell>
                            <TableCell className={`w-[14%] text-right ${
                              adrChange > 0 ? "text-emerald-500" : "text-red-500"
                            }`}>
                              {adrChange > 0 ? "+" : ""}{adrChange.toFixed(1)}%
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
        </div>
      </DialogContent>
    </Dialog>
  )
} 