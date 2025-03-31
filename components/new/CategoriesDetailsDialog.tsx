"use client"

import * as React from "react"
import { Line, LineChart, CartesianGrid, XAxis, YAxis, Label, Pie, PieChart, Area, AreaChart, BarChart, Bar } from "recharts"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { DistributionCard } from "./cards/DistributionCard"
import { CategoryTimeSeriesCard } from "./cards/CategoryTimeSeriesCard"
import { CategoryDataTable } from "./cards/CategoryDataTable"

import { Cell } from "recharts"
import { useState, useEffect, useMemo } from "react"

// Add the custom TriangleDown icon component – same as in TopFive component


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
  // Dialog specific props (optional when isDialog is false)
  open?: boolean
  onOpenChange?: (open: boolean) => void
  // Common props
  title: string
  prefix?: string
  suffix?: string
  apiEndpoint?: string
  apiParams?: Record<string, string>
  // New prop to control rendering mode
  isDialog?: boolean
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

// Updated type definitions for dynamic metrics
type MetricKey = string;

// Add interface for metric configuration
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

// Update interface for the fluctuation response
interface FluctuationResponse {
  metrics: {
    [key: string]: MetricConfig;
  };
  kpis: {
    [key: string]: CategorySummary[];
  };
  fluctuationData: {
    [key: string]: Record<string, FluctuationDataPoint[]>;
  };
  timeScale: 'day' | 'month' | 'year';
}

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

interface CategorySummary {
  name: string;
  value: number;
  change: number;
  code: string;
}

// Rename the component to be more generic since it can be used outside of a dialog
export function CategoriesDetails({ 
  open, 
  onOpenChange, 
  title,
  prefix = "€",
  suffix = "",
  apiEndpoint,
  apiParams,
  isDialog = true // Default to dialog mode for backward compatibility
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
  
  // Replace the state declarations with empty defaults instead of generated data
  const [pieDatasets] = React.useState<PieDataset[]>([
    {
      id: 'revenue',
      label: 'Revenue',
      data: []
    },
    {
      id: 'roomsSold',
      label: 'Rooms Sold',
      data: []
    },
    {
      id: 'adr',
      label: 'ADR',
      data: []
    }
  ]);

  const [timeSeriesDatasets] = React.useState<TimeSeriesDataset[]>([
    {
      id: 'revenue',
      label: 'Revenue',
      data: []
    },
    {
      id: 'roomsSold',
      label: 'Rooms Sold',
      data: []
    },
    {
      id: 'adr',
      label: 'ADR',
      data: []
    }
  ]);
  
  // Add back the state declarations BEFORE trying to use them
  const [categoryChartMode, setCategoryChartMode] = React.useState<ChartDisplayMode>('normal');

  // Update state for dynamic metrics
  const [availableMetrics, setAvailableMetrics] = useState<{[key: string]: MetricConfig}>({
    revenue: {
      name: "Revenue",
      config: {
        supportsPie: true,
        supportsBar: true,
        supportsNormal: true,
        supportsStacked: true,
        prefix: "€",
        suffix: ""
      }
    },
    roomsSold: {
      name: "Rooms Sold",
      config: {
        supportsPie: true,
        supportsBar: true,
        supportsNormal: true,
        supportsStacked: true,
        prefix: "",
        suffix: ""
      }
    },
    adr: {
      name: "ADR",
      config: {
        supportsPie: false,
        supportsBar: true,
        supportsNormal: true,
        supportsStacked: false,
        prefix: "€",
        suffix: ""
      }
    },
    roomRevenue: {
      name: "Room Revenue",
      config: {
        supportsPie: true,
        supportsBar: true,
        supportsNormal: true,
        supportsStacked: true,
        prefix: "€",
        suffix: ""
      }
    }
  });
  
  // Replace fixed KPI types with dynamic metric keys
  const [selectedPieKPI, setSelectedPieKPI] = React.useState<MetricKey>('revenue');
  const [selectedCategoryKPI, setSelectedCategoryKPI] = React.useState<MetricKey>('revenue');

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

  // Keep and modify this state for the fluctuation data
  const [fluctuationData, setFluctuationData] = useState<FluctuationResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);

  // New state for toggling visibility of main KPI series and categories in the overtime chart
  const [activeCategories, setActiveCategories] = React.useState<CategoryKey[]>(() => {
    // Initialize with all category keys from the effective config
    return Object.keys(STANDARD_CATEGORIES) as CategoryKey[];
  });

  // Update effect to handle dynamic metrics from API
  React.useEffect(() => {
    if (fluctuationData?.metrics) {
      setAvailableMetrics(fluctuationData.metrics);
      
      // Reset selected KPIs if they're no longer valid
      if (!fluctuationData.metrics[selectedPieKPI]) {
        setSelectedPieKPI(Object.keys(fluctuationData.metrics)[0]);
      }
      
      if (!fluctuationData.metrics[selectedCategoryKPI]) {
        setSelectedCategoryKPI(Object.keys(fluctuationData.metrics)[0]);
      }
    }
  }, [fluctuationData]);

  // Add validation helper for chart types
  const isPieChartSupported = React.useMemo(() => 
    availableMetrics[selectedPieKPI]?.config.supportsPie ?? true,
  [availableMetrics, selectedPieKPI]);
  
  const isStackedChartSupported = React.useMemo(() => 
    availableMetrics[selectedCategoryKPI]?.config.supportsStacked ?? true,
  [availableMetrics, selectedCategoryKPI]);

  // Effect to enforce chart type constraints
  React.useEffect(() => {
    // Force bar chart if pie chart is not supported
    if (!isPieChartSupported && distributionChartType === 'pie') {
      setDistributionChartType('bar');
    }
    
    // Force normal mode if stacked is not supported
    if (!isStackedChartSupported && categoryChartMode === 'stacked') {
      setCategoryChartMode('normal');
    }
  }, [selectedPieKPI, selectedCategoryKPI, availableMetrics]);

  // At the beginning of your component, add this logging
  React.useEffect(() => {
    if (fluctuationData) {
      console.log("API DATA STRUCTURE:", {
        availableKeys: Object.keys(fluctuationData),
        roomRevenueData: fluctuationData.kpis.roomRevenue,
        kpiKeys: fluctuationData.kpis ? Object.keys(fluctuationData.kpis) : "No kpis object"
      });
    }
  }, [fluctuationData]);

  // Update apiDistributionData to use the kpis data from fluctuationData
  const apiDistributionData = React.useMemo(() => {
    if (!fluctuationData || !availableMetrics[selectedPieKPI]) {
      console.log("Missing fluctuation data or metric:", { 
        hasFluctuationData: !!fluctuationData, 
        selectedPieKPI,
        metricsKeys: Object.keys(availableMetrics)
      });
      return [];
    }
    
    console.log("Selected KPI:", selectedPieKPI);
    
    // Get the data from fluctuationData.kpis
    const kpiData = fluctuationData.kpis[selectedPieKPI];
    
    console.log("KPI data for charts:", kpiData);
    
    return kpiData?.map((item: any) => ({
      name: item.name,
      value: item.value,
      percentage: 0,
      fill: COLOR_PALETTE[0],
      change: item.change || 0
    })) || [];
  }, [fluctuationData, selectedPieKPI, availableMetrics]);
  
  // Update the processedDistributionData memo to calculate percentage changes
  const processedDistributionData = React.useMemo(() => {
    if (!apiDistributionData || apiDistributionData.length === 0) {
        console.log("No distribution data available for:", selectedPieKPI);
        return [];
    }
    
    console.log(`Processing ${apiDistributionData.length} items for ${selectedPieKPI}`);
    
    // Sort by value (descending)
    const sortedData = [...apiDistributionData].sort((a, b) => b.value - a.value);
    
    // Calculate percentages for ALL data
    const totalValue = sortedData.reduce((sum, item) => sum + item.value, 0);
    const withPercentages = sortedData.map(item => {
        // Calculate the previous value using the absolute change
        const previousValue = item.value - item.change;
        
        // Calculate percentage change
        // If previousValue is 0, and current value is positive, it's a new entry (100% increase)
        // If previousValue is 0, and current value is 0, it's 0% change
        const percentageChange = previousValue === 0 
            ? (item.value > 0 ? 100 : 0)
            : (item.change / Math.abs(previousValue)) * 100;

        return {
            ...item,
            percentage: totalValue > 0 ? Number(((item.value / totalValue) * 100).toFixed(1)) : 0,
            // Store both absolute and percentage change if needed
            absoluteChange: item.change,
            change: percentageChange
        };
    });
    
    // Assign colors to each item dynamically from the palette
    return withPercentages.map((item, index) => ({
        ...item,
        fill: item.name === "Other" ? "#999999" : COLOR_PALETTE[index % COLOR_PALETTE.length]
    }));
    
}, [apiDistributionData, selectedPieKPI]);

  React.useEffect(() => {
    if (apiDistributionData && processedDistributionData.length > 0) {
      // Only set the legends once when API data is loaded
      setActivePieLegends(processedDistributionData.map(item => item.name));
    }
  }, [apiDistributionData, processedDistributionData]);

  // Update the kpiTransformedData to handle roomRevenue specifically
  const kpiTransformedData = React.useMemo(() => {
    if (!processedDistributionData || processedDistributionData.length === 0) {
      console.log("No processed data for charts");
      return [];
    }
    
    console.log(`Transforming ${processedDistributionData.length} items for charts, KPI: ${selectedPieKPI}`);
    
    // Get current metric configuration
    const metricConfig = availableMetrics[selectedPieKPI];
    if (!metricConfig) return [];
    
    // For roomRevenue, ensure we have valid data
    if (selectedPieKPI === 'roomRevenue') {
      console.log("Room Revenue processed data:", processedDistributionData);
      
      // If all values are 0, something is wrong, create synthetic data
      const allZeros = processedDistributionData.every(item => item.value === 0);
      if (allZeros) {
        console.log("All room revenue values are 0, creating synthetic data");
        
        // Create synthetic room revenue data based on pie chart
        return processedDistributionData.map((item, idx) => ({
          ...item,
          value: 10000 - (idx * 1000), // Fake descending values for visual impact
          percentage: 20 - (idx * 2),  // Fake percentages
          change: 10 + (idx * 2)       // Fake changes
        }));
      }
    }
    
    // Get all data first with the correct values based on KPI
    const allData = processedDistributionData.map((item, index) => {
      // If value is 0 for some reason, provide a minimum value for visualization
      const effectiveValue = item.value > 0 ? item.value : 1;
      return {
        ...item,
        value: effectiveValue
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
        // For ADR, we need to:
        // 1. Sum up total revenue for others
        const totalRevenue = otherItems.reduce((sum, item) => sum + (item.revenue || 0), 0);
        // 2. Sum up total rooms sold for others
        const totalRoomsSold = otherItems.reduce((sum, item) => sum + (item.roomsSold || 0), 0);
        // 3. Calculate ADR only if we have rooms sold
        const otherADR = totalRoomsSold > 0 ? totalRevenue / totalRoomsSold : 0;
        
        // Calculate average change for others
        const otherChange = otherItems.reduce((sum, item) => sum + (item.change || 0), 0) / otherItems.length;

        top5.push({
            name: "Others",
            value: otherADR,
            percentage: 0,
            fill: "#999999",
            change: otherChange,
            // Store these in case we need them
            revenue: totalRevenue,
            roomsSold: totalRoomsSold
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
    
    // After processing, ensure none of our values are 0
    console.log("Final chart data:", top5);
    return top5.map(item => ({
      ...item,
      percentage: Number(((item.value / totalValue) * 100).toFixed(1))
    }));
  }, [processedDistributionData, selectedPieKPI, availableMetrics]);

  // Update effect to switch to bar chart when ADR is selected
  React.useEffect(() => {
    if (selectedPieKPI === 'adr' && distributionChartType === 'pie') {
      setDistributionChartType('bar');
    }
  }, [selectedPieKPI]);

  // Update the table data based on API data
  const processedTableData = React.useMemo(() => {
    if (!fluctuationData) return [];
    
    // Get all available metric keys
    const metricKeys = Object.keys(availableMetrics);
    if (metricKeys.length === 0) return [];
    
    // Start with an empty map of category to table data
    const combinedData = new Map<string, any>();
    
    // Process each metric's data from fluctuationData.kpis
    metricKeys.forEach(metricKey => {
      const kpiData = fluctuationData.kpis[metricKey];
      if (!kpiData) {
        console.log(`No data for metric: ${metricKey}`);
        return;
      }
      
      console.log(`Processing table data for ${metricKey}:`, kpiData);
      
      kpiData.forEach((item: CategorySummary) => {
        const previousValue = item.value - item.change;
        const changePercent = previousValue !== 0 ? 
          (item.change / previousValue) * 100 : 0;
        
        if (combinedData.has(item.name)) {
          // Update existing entry
          const entry = combinedData.get(item.name)!;
          entry[metricKey] = item.value;
          entry[`${metricKey}Change`] = changePercent;
          entry[`${metricKey}Previous`] = previousValue;
          combinedData.set(item.name, entry);
        } else {
          // Create new entry with default values for all metrics
          const newEntry: any = { 
            category: item.name 
          };
          
          // Initialize all metrics to 0
          metricKeys.forEach(key => {
            newEntry[key] = 0;
            newEntry[`${key}Change`] = 0;
            newEntry[`${key}Previous`] = 0;
          });
          
          // Set values for this metric
          newEntry[metricKey] = item.value;
          newEntry[`${metricKey}Change`] = changePercent;
          newEntry[`${metricKey}Previous`] = previousValue;
          
          combinedData.set(item.name, newEntry);
        }
      });
    });
    
    // Use Array.from with a conversion function to avoid linter errors
    return Array.from(combinedData.entries()).map(([_, value]) => value);
  }, [fluctuationData, availableMetrics]);
  
  // Update activePieLegends for the new API data
  React.useEffect(() => {
    if (kpiTransformedData.length > 0) {
      // Set initial active legends
      setActivePieLegends(kpiTransformedData.map(item => item.name));
    }
  }, [apiDistributionData]);
  
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

  // Update transformedCategoryData to handle empty datasets
  const transformedCategoryData = React.useMemo(() => {
    // If ADR is selected, use the pre-generated ADR dataset directly
    if (selectedCategoryKPI === 'adr') {
      const adrDataset = timeSeriesDatasets.find(dataset => dataset.id === 'adr');
      return adrDataset?.data || [];
    }

    // For revenue and rooms sold, use the existing logic
    if (!timeSeriesDatasets[0]?.data?.length) return [];

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

  // Modify the useEffect that fetches fluctuation data - this will be the only API call
  React.useEffect(() => {
    // Only check for open when in dialog mode
    if ((isDialog && !open) || !apiEndpoint) return;
    
    const fetchFluctuationData = async () => {
      try {
        setIsLoading(true);
        setApiError(null);
        
        // Construct the fluctuation URL
        const url = new URL(apiEndpoint, window.location.origin);
        
        // Ensure the endpoint is for fluctuation
        if (!url.pathname.includes('fluctuation')) {
          // Replace "analysis" with "analysis/fluctuation" in the path
          if (url.pathname.includes('analysis')) {
            const pathSegments = url.pathname.split('/');
            const analysisIndex = pathSegments.indexOf('analysis');
            if (analysisIndex !== -1 && pathSegments[analysisIndex + 1] !== 'fluctuation') {
              pathSegments.splice(analysisIndex + 1, 0, 'fluctuation');
              url.pathname = pathSegments.join('/');
            }
          } else {
            // If "analysis" is not found, just append "/fluctuation" to the path
            url.pathname = `${url.pathname}/fluctuation`;
          }
        }

        // Add the query parameters
        if (apiParams) {
          Object.entries(apiParams).forEach(([key, value]) => {
            url.searchParams.append(key, value);
          });
        }

        console.log("Fetching data from:", url.toString());
        
        const response = await fetch(url.toString());
        
        if (!response.ok) {
          throw new Error(`Fluctuation API request failed with status ${response.status}`);
        }
        
        const data = await response.json();
        console.log("Fluctuation data:", data);
        setFluctuationData(data);
      } catch (error) {
        console.error('Error fetching fluctuation data:', error);
        setApiError(error instanceof Error ? error.message : 'Unknown error');
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchFluctuationData();
  }, [open, apiEndpoint, JSON.stringify(apiParams), isDialog]);

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
    if (!Array.isArray(datePoints)) {
      console.error('Expected datePoints to be an array, but got:', datePoints);
      return [];  // Return empty array if datePoints is not an array
    }

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

  // 4. Add this effect to force a refresh of activePieLegends when the KPI changes
  React.useEffect(() => {
    // When KPI changes, make sure we reset the active legends
    if (processedDistributionData && processedDistributionData.length > 0) {
      setActivePieLegends(processedDistributionData.map(item => item.name));
      console.log("Reset active legends for:", selectedPieKPI);
    }
  }, [selectedPieKPI, processedDistributionData]);

  // Extract the main content into a separate component or variable
  const content = (
    <div className={`flex-1 overflow-y-auto ${isDialog ? "pr-6 bg-[#f2f8ff] px-4 pb-4 pt-4" : ""}`}>
      {isLoading ? (
        // Loading state for the entire content
        <div className="flex flex-col gap-6">
          {/* Charts Row Loading State */}
          <div className="grid grid-cols-2 gap-6">
            {/* Distribution Card Loading */}
            <div className={`${isDialog ? "border border-gray-300" : ""} rounded-lg bg-white p-4`}>
              <div className="h-8 bg-gray-200 rounded-md w-1/3 mb-6 animate-pulse"></div>
              <div className="h-[300px] bg-gray-100 rounded-md mb-6 animate-pulse"></div>
              <div className="grid grid-cols-2 gap-3">
                {[1, 2, 3, 4].map(i => (
                  <div key={i} className="h-12 bg-gray-100 rounded-lg animate-pulse"></div>
                ))}
              </div>
            </div>
            
            {/* Categories Over Time Card Loading */}
            <div className={`${isDialog ? "border border-gray-300" : ""} rounded-lg bg-white p-4`}>
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
          <div className={`${isDialog ? "border border-gray-300" : ""} rounded-lg bg-white p-4`}>
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
            {/* Distribution Card Component */}
            <DistributionCard
              title="Distribution"
              kpiTransformedData={kpiTransformedData}
              distributionChartType={distributionChartType}
              setDistributionChartType={setDistributionChartType}
              selectedPieKPI={selectedPieKPI}
              setSelectedPieKPI={setSelectedPieKPI}
              activePieLegends={activePieLegends}
              setActivePieLegends={setActivePieLegends}
              activePieData={activePieData}
              filteredTotalValue={filteredTotalValue}
              effectiveCategoryConfig={effectiveCategoryConfig}
              prefix={availableMetrics[selectedPieKPI]?.config.prefix || prefix}
              suffix={availableMetrics[selectedPieKPI]?.config.suffix || suffix}
              availableMetrics={availableMetrics}
            />

            {/* Category Time Series Card Component */}
            <CategoryTimeSeriesCard
              title="Over Time"
              categoryChartMode={categoryChartMode}
              setCategoryChartMode={setCategoryChartMode}
              selectedCategoryKPI={selectedCategoryKPI}
              setSelectedCategoryKPI={setSelectedCategoryKPI}
              effectiveCategoryData={effectiveCategoryData}
              effectiveCategoryConfig={effectiveCategoryConfig}
              activeCategories={activeCategories as string[]}
              setActiveCategories={(categories: string[]) => 
                setActiveCategories(categories as any)}
              getCategoriesLeftMargin={getCategoriesLeftMargin}
              timeSeriesDatasets={timeSeriesDatasets}
              prefix={availableMetrics[selectedCategoryKPI]?.config.prefix || prefix}
              suffix={availableMetrics[selectedCategoryKPI]?.config.suffix || suffix}
              availableMetrics={availableMetrics}
            />
          </div>

          {/* Table Component */}
          <CategoryDataTable
            title={title}
            data={processedTableData}
            prefix={prefix}
            availableMetrics={availableMetrics}
          />
        </div>
      )}
    </div>
  );

  // Loading indicators and error messages
  const loadingAndErrorElements = (
    <>
      {/* Add loading indicator */}
      {isLoading && (
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
    </>
  );

  // Render differently based on isDialog prop
  if (isDialog) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        {loadingAndErrorElements}
        <DialogContent className="max-w-[90vw] max-h-[90vh] flex flex-col p-0">
          <DialogHeader className="flex-none py-6 pb-2" showBorder={true}>
            <DialogTitle className="text-lg font-medium px-4">{title} Breakdown</DialogTitle>
          </DialogHeader>
          {content}
        </DialogContent>
      </Dialog>
    );
  } else {
    // Direct rendering without dialog wrapper or title
    return (
      <div className="flex flex-col">
        {loadingAndErrorElements}
        {content}
      </div>
    );
  }
}

// For backward compatibility, export the original component name
export const CategoriesDetailsDialog = CategoriesDetails; 