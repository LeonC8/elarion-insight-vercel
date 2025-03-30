"use client"

import { useState, useEffect } from 'react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Button } from '@/components/ui/button'
import { ChevronDownIcon } from 'lucide-react'
import { DatePickerDemo as DatePicker } from "@/components/ui/date-picker"
import { HotelSelector } from '../new/HotelSelector'
import { addDays, format } from "date-fns"
import { Kpi } from '../new/Kpi'
import { TopFive } from '../new/TopFive'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ChartConfig } from '@/components/ui/chart'
import dynamic from 'next/dynamic'
import { DollarSign, Hotel, Percent } from 'lucide-react'

// Dynamic import for WorldMap with loading state
const WorldMap = dynamic(
  () => import('react-svg-worldmap').then(mod => mod.default),
  { 
    ssr: false, 
    loading: () => (
      <div className="h-[500px] flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
      </div>
    )
  }
)

// First, let's add a Skeleton component at the top of the file after the imports
// (If not already present from previous edits)
function Skeleton({ className }: { className?: string }) {
  return (
    <div className={`animate-pulse rounded bg-gray-200 ${className}`} />
  )
}

// Add a mapping for the metric keys, similar to Overview
// Adjust keys if the pickup API returns different names (e.g., roomsPickup)
const metricKeyMapping: Record<string, string> = {
  'revenue': 'revenue', // Corrected based on previous fix
  'rooms': 'roomsSold', // Try 'roomsSold' for the "Rooms Sold" metric
  'adr': 'adr'         // Keep 'adr' as it likely works
};

// Create dummy time series data for each KPI
const generateDummyData = (baseValue: number, months: number = 7) => {
  return Array.from({ length: months }, (_, i) => {
    const month = new Date(2023, i, 1);
    const monthName = format(month, 'MMMM');
    const randomFactor = 0.9 + Math.random() * 0.2; // Random value between 0.9 and 1.1
    
    return {
      date: monthName,
      current: Math.round(baseValue * randomFactor),
      previous: Math.round(baseValue * randomFactor * 0.9)
    };
  });
};

// Country data for the world map - Replace dummy data with API fetch
// const countryData = [ ... ]; // Remove this dummy data

// Chart config for segments
const segmentsChartConfig = {
  leisure: {
    label: "Leisure",
    color: "hsl(230, 70%, 55%)",      // Indigo
  },
  corporate: {
    label: "Corporate",
    color: "hsl(170, 75%, 40%)",      // Sea Green
  },
  groups: {
    label: "Groups",
    color: "hsl(300, 65%, 55%)",      // Magenta
  },
} satisfies ChartConfig;

// Chart config for booking channels
const bookingChannelsChartConfig = {
  direct: {
    label: "Direct Booking", 
    color: "hsl(198, 85%, 45%)",
  },
  booking: {
    label: "Booking.com",
    color: "hsl(150, 60%, 40%)",
  },
  expedia: {
    label: "Expedia",
    color: "hsl(280, 65%, 55%)",
  },
} satisfies ChartConfig;

// Chart config for room types
const roomTypesChartConfig = {
  deluxe: {
    label: "Deluxe Suite", 
    color: "hsl(190, 80%, 45%)",
  },
  executive: {
    label: "Executive Room",
    color: "hsl(140, 65%, 40%)",
  },
  standardDouble: {
    label: "Standard Double",
    color: "hsl(260, 70%, 55%)",
  },
} satisfies ChartConfig;

// Chart config for countries
const countryChartConfig = {
  us: {
    label: "United States",
    color: "hsl(246, 60%, 60%)",      // Modern Purple
  },
  // Use 'gb' for United Kingdom to match react-svg-worldmap
  gb: {
    label: "United Kingdom",
    color: "hsl(180, 75%, 35%)",      // Teal
  },
  de: {
    label: "Germany",
    color: "hsl(322, 65%, 55%)",      // Rose Pink
  },
  fr: {
    label: "France",
    color: "hsl(15, 75%, 50%)",       // Coral Orange
  },
  es: {
    label: "Spain",
    color: "hsl(45, 90%, 45%)",       // Golden Yellow
  }
} satisfies ChartConfig;

// Define the structure for the API response (can be shared or redefined)
interface KpiData {
  kpiName: 'roomsSold' | 'roomsRevenue' | 'adr' | 'cancellations' | 'revenueLost';
  title: string;
  currentValue: number;
  comparisonValue: number;
  prefix?: string;
  suffix?: string;
}

type PickupKpiResponse = KpiData[];

export function PickupAnalytics() {
  // State for filter selections
  const [selectedView, setSelectedView] = useState<'Day' | 'Month' | 'Year'>('Day')
  const [reportDate, setReportDate] = useState<Date>(new Date())
  const [selectedComparison, setSelectedComparison] = useState<string>("Yesterday")
  const [selectedHotels, setSelectedHotels] = useState<string[]>(["Hotel 1"])

  // State for fetched KPI data
  const [kpiData, setKpiData] = useState<PickupKpiResponse | null>(null);
  const [loadingKpis, setLoadingKpis] = useState<boolean>(true);
  const [kpiError, setKpiError] = useState<string | null>(null);

  // Add state for API parameters shared by distribution components
  const [pickupAnalysisApiParams, setPickupAnalysisApiParams] = useState({});

  // Add state for world map data and selected metric
  const [worldMapData, setWorldMapData] = useState<Array<{ country: string; value: number }>>([]);
  const [loadingWorldMap, setLoadingWorldMap] = useState<boolean>(true);
  const [worldMapError, setWorldMapError] = useState<string | null>(null);
  const [selectedMapMetric, setSelectedMapMetric] = useState('revenue'); // Default metric

  // Handle report date change
  const handleDateChange = (newDate: Date | undefined) => {
    if (newDate) {
      setReportDate(newDate)
    }
  }

  // Function to calculate percentage change
  const calculatePercentageChange = (current: number, comparison: number): number => {
    if (comparison === 0) {
      return current === 0 ? 0 : Infinity; // Or handle as needed (e.g., return 100 if current > 0)
    }
    return Math.round(((current - comparison) / comparison) * 100);
  };

  // Update API params when filters change
  useEffect(() => {
    const params = {
      reportDate: format(reportDate, 'yyyy-MM-dd'),
      viewType: selectedView,
      comparison: selectedComparison,
      // hotelIds: selectedHotels.join(','), // If needed later
    };
    setPickupAnalysisApiParams(params);
    // Fetch KPIs and World Map data when base params change
    fetchKpiData(params);
    fetchWorldMapData(params, selectedMapMetric); // Fetch map data with current metric
  }, [reportDate, selectedView, selectedComparison, selectedHotels]);

  // Fetch KPI data function (modified to accept params)
  const fetchKpiData = async (params: any) => {
    setLoadingKpis(true);
    setKpiError(null);
    try {
      const queryParams = new URLSearchParams(params);
      const response = await fetch(`/api/pickup/kpis?${queryParams.toString()}`);
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.details || `API Error: ${response.statusText}`);
      }
      const data: PickupKpiResponse = await response.json();
      setKpiData(data);
    } catch (err) {
      console.error("Failed to fetch KPI data:", err);
      setKpiError(err instanceof Error ? err.message : "An unknown error occurred");
      setKpiData(null); // Clear data on error
    } finally {
      setLoadingKpis(false);
    }
  };

  // Function to fetch World Map data
  const fetchWorldMapData = async (baseParams: any, metric: string = selectedMapMetric) => {
    setLoadingWorldMap(true);
    setWorldMapError(null);
    try {
      const params = new URLSearchParams({
        ...baseParams,
        field: 'guest_country',
        limit: '50' // Fetch enough data for the map
      });

      const response = await fetch(`/api/pickup-analytics/distribution?${params.toString()}`);
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.details || `API Error: ${response.statusText}`);
      }
      const data = await response.json();

      // Use the mapped metric key to access the correct data array
      // Example: If metric is 'rooms', mappedMetric becomes 'roomsPickup'
      const mappedMetric = metricKeyMapping[metric] || metric;

      // Check if the expected data array exists
      if (!data || !Array.isArray(data[mappedMetric])) {
         console.warn(`Data for metric '${mappedMetric}' not found or not an array in API response.`, data);
         setWorldMapData([]); // Set empty data if structure is wrong
         throw new Error(`Data structure error: Metric '${mappedMetric}' not found.`);
      }

      // Transform API response: assumes API returns { name: "United States", value: 123 }
      // and we need { country: "us", value: 123 } for the map.
      // Requires a mapping from full country name/code in API to 2-letter code for map.
      // For now, we assume API returns 2-letter codes directly in 'name'.
      const transformedData = data[mappedMetric]
        .map((item: any) => ({
          // Assume item.name is the 2-letter country code (e.g., 'us', 'gb', 'de')
          // If item.name is the full name, add a mapping function here.
          country: item.name ? item.name.toLowerCase() : 'unknown',
          value: item.value
        }))
        .filter((item: any) => item.country !== 'unknown'); // Filter out items without a valid country code

      setWorldMapData(transformedData);

    } catch (err) {
      console.error("Failed to fetch world map data:", err);
      setWorldMapError(err instanceof Error ? err.message : "An unknown error occurred");
      setWorldMapData([]); // Clear data on error
    } finally {
      setLoadingWorldMap(false);
    }
  };

  // Helper to get KPI data by name
  const getKpiValue = (name: KpiData['kpiName']): KpiData | null => {
    if (!kpiData) return null;
    return kpiData.find(kpi => kpi.kpiName === name) || null;
  };

  // Define metrics structure for TopFive (data will be fetched)
  const topFiveMetricsBase = [
    { key: 'revenue', label: 'Revenue', prefix: '€', data: [] },
    { key: 'rooms', label: 'Rooms Sold', data: [] },
    { key: 'adr', label: 'ADR', prefix: '€', data: [] },
  ];

  return (
    <div className="flex-1 overflow-auto bg-[#f5f8ff]"> {/* Added bg color like Overview */}
       {/* Header with Filters - Adjusted Styling */}
       <div className="fixed top-0 left-[256px] right-0 z-30 flex justify-between items-center mb-6 bg-white py-6 px-12 border-b border-gray-300 shadow-sm">
          <div>
            <h2 className="text-xl font-bold text-gray-800 mb-1">Pickup Analytics</h2>
            <span className='text-gray-400 font-light mt-3 pt-2 text-sm'>{`Pickup for ${selectedView} ${format(reportDate, 'yyyy-MM-dd')} vs ${selectedComparison}`}</span>
          </div>
          <div className="flex items-center space-x-8"> {/* Use space-x-8 like Overview */}
             {/* View Type Dropdown */}
              <div className="flex flex-col">
                <span className="text-xs text-gray-500 mb-2">View type</span>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      className="bg-[#f2f8ff] hover:bg-[#f2f8ff] text-[#342630] rounded-full px-4"
                    >
                      {selectedView} <ChevronDownIcon className="ml-2 h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent>
                    <DropdownMenuItem onSelect={() => setSelectedView('Day')}>Day</DropdownMenuItem>
                    <DropdownMenuItem onSelect={() => setSelectedView('Month')}>Month</DropdownMenuItem>
                    <DropdownMenuItem onSelect={() => setSelectedView('Year')}>Year</DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

              {/* Report Date Picker */}
              <div className="flex flex-col">
                <span className="text-xs text-gray-500 mb-2">Report date</span>
                <DatePicker date={reportDate} onDateChange={handleDateChange} />
              </div>

              {/* Comparison Dropdown */}
              <div className="flex flex-col">
                <span className="text-xs text-gray-500 mb-2">Compare with</span>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      className="bg-[#f2f8ff] hover:bg-[#f2f8ff] text-[#342630] rounded-full px-4"
                    >
                      {selectedComparison} <ChevronDownIcon className="ml-2 h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                   <DropdownMenuContent>
                    <DropdownMenuItem onSelect={() => setSelectedComparison('Yesterday')}>Yesterday</DropdownMenuItem>
                    <DropdownMenuItem onSelect={() => setSelectedComparison('Last 7 days')}>Last 7 days</DropdownMenuItem>
                    <DropdownMenuItem onSelect={() => setSelectedComparison('Last 15 days')}>Last 15 days</DropdownMenuItem>
                    <DropdownMenuItem onSelect={() => setSelectedComparison('Last 30 days')}>Last 30 days</DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

              {/* Hotel Selector */}
              <div className="flex flex-col">
                <span className="text-xs text-gray-500 mb-2">Property</span>
                <HotelSelector selectedHotels={selectedHotels} setSelectedHotels={setSelectedHotels} />
              </div>
          </div>
        </div>


      <div className="p-8 px-12 pt-[140px]"> {/* Added padding like Overview */}
        {/* KPI Loading/Error State */}
        {loadingKpis && (
             <div className="grid grid-cols-1 md:grid-cols-5 gap-6 mt-6 h-24 items-center justify-center">
                 {/* Basic Loading Text */}
                 {/* <p className="text-gray-500 col-span-5 text-center">Loading KPIs...</p> */}
                 {/* Skeleton Loaders for KPIs */}
                 {[...Array(5)].map((_, index) => (
                    <Card key={index} className="bg-white p-4">
                      <div className="animate-pulse">
                        <div className="h-5 bg-gray-200 rounded w-3/4 mb-3"></div>
                        <div className="h-8 bg-gray-200 rounded w-1/2 mb-2"></div>
                        <div className="h-4 bg-gray-200 rounded w-1/3"></div>
                      </div>
                    </Card>
                 ))}
            </div>
        )}
        {kpiError && !loadingKpis && (
             <div className="grid grid-cols-1 md:grid-cols-5 gap-6 mt-6 h-auto items-center justify-center bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-6">
                <p className="col-span-5 text-center">Error loading KPIs: {kpiError}</p>
            </div>
        )}

        {/* KPI Cards - Updated to use fetched data */}
        {!loadingKpis && !kpiError && kpiData && (
          <div className="grid grid-cols-1 md:grid-cols-5 gap-6 mt-6">
            <Kpi
              title={getKpiValue('roomsSold')?.title || "Rooms sold"}
              currentValue={getKpiValue('roomsSold')?.currentValue ?? 0}
              percentageChange={calculatePercentageChange(
                getKpiValue('roomsSold')?.currentValue ?? 0,
                getKpiValue('roomsSold')?.comparisonValue ?? 0
              )}
              prefix={getKpiValue('roomsSold')?.prefix ?? ""}
              color="blue"
              // Removed chart data - Kpi component might need update or ignore this
              // mainTimeSeriesData={...}
            />
            <Kpi
              title={getKpiValue('roomsRevenue')?.title || "Rooms revenue"}
              currentValue={getKpiValue('roomsRevenue')?.currentValue ?? 0}
              percentageChange={calculatePercentageChange(
                getKpiValue('roomsRevenue')?.currentValue ?? 0,
                getKpiValue('roomsRevenue')?.comparisonValue ?? 0
              )}
              prefix={getKpiValue('roomsRevenue')?.prefix ?? "€"}
              color="blue"
              // mainTimeSeriesData={...}
            />
            <Kpi
              title={getKpiValue('adr')?.title || "ADR"}
              currentValue={getKpiValue('adr')?.currentValue ?? 0}
              percentageChange={calculatePercentageChange(
                getKpiValue('adr')?.currentValue ?? 0,
                getKpiValue('adr')?.comparisonValue ?? 0
              )}
              prefix={getKpiValue('adr')?.prefix ?? "€"}
              color="green"
              // mainTimeSeriesData={...}
            />
            <Kpi
              title={getKpiValue('cancellations')?.title || "Cancellations"}
              currentValue={getKpiValue('cancellations')?.currentValue ?? 0}
              percentageChange={calculatePercentageChange(
                getKpiValue('cancellations')?.currentValue ?? 0,
                getKpiValue('cancellations')?.comparisonValue ?? 0
              )}
              prefix={getKpiValue('cancellations')?.prefix ?? ""}
              color="red" // Changed color for cancellations
              // mainTimeSeriesData={...}
            />
            <Kpi
              title={getKpiValue('revenueLost')?.title || "Revenue lost"}
              currentValue={getKpiValue('revenueLost')?.currentValue ?? 0}
              percentageChange={calculatePercentageChange(
                getKpiValue('revenueLost')?.currentValue ?? 0,
                getKpiValue('revenueLost')?.comparisonValue ?? 0
              )}
              prefix={getKpiValue('revenueLost')?.prefix ?? "€"}
              color="red" // Changed color for revenue lost
              // mainTimeSeriesData={...}
            />
          </div>
        )}

        {/* Market Segments, Booking Channels, Room Types - Updated to fetch data */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8">
          <TopFive
            title="Market Segments"
            color="blue"
            metrics={topFiveMetricsBase} // Structure only
            chartConfig={segmentsChartConfig}
            apiEndpoint="/api/pickup-analytics/distribution"
            apiParams={{ ...pickupAnalysisApiParams, field: 'market_group_code', limit: 5 }}
            simpleDetails={true} // Enable simple details view
          />
          <TopFive
            title="Booking Channels"
            color="green"
            metrics={topFiveMetricsBase} // Structure only
            chartConfig={bookingChannelsChartConfig}
            apiEndpoint="/api/pickup-analytics/distribution"
            apiParams={{ ...pickupAnalysisApiParams, field: 'booking_channel', limit: 5 }}
            simpleDetails={true} // Enable simple details view
          />
          <TopFive
            title="Room Types"
            color="green"
            metrics={topFiveMetricsBase} // Structure only
            chartConfig={roomTypesChartConfig}
            apiEndpoint="/api/pickup-analytics/distribution"
            apiParams={{ ...pickupAnalysisApiParams, field: 'room_type', limit: 5 }}
            simpleDetails={true} // Enable simple details view
          />
        </div>

        {/* Geo Source (World Map) - Updated TopFive */}
        <div className="mt-8">
          <Card className="bg-white rounded-lg overflow-hidden">
            <CardHeader className="flex flex-col items-start">
              <div className="flex w-full justify-between items-center">
                <div>
                  <CardTitle className="text-lg font-semibold text-gray-800 mb-3">
                    Global Distribution - Pickup {selectedMapMetric.charAt(0).toUpperCase() + selectedMapMetric.slice(1)}
                  </CardTitle>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-8">
                {/* World Map Side */}
                <div>
                  {loadingWorldMap && (
                    <div className="h-[500px] flex items-center justify-center">
                      <Skeleton className="h-64 w-full" />
                    </div>
                  )}
                  {worldMapError && !loadingWorldMap && (
                     <div className="h-[500px] flex items-center justify-center bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
                       <p>Error loading map data: {worldMapError}</p>
                     </div>
                  )}
                  {!loadingWorldMap && !worldMapError && (
                    <div className="h-[500px] flex justify-center items-center">
                      <WorldMap
                        color="rgb(59, 130, 246)"
                        title="" // Title handled in CardHeader
                        valueSuffix={selectedMapMetric === 'revenue' ? '€' : selectedMapMetric === 'adr' ? '€' : ''} // Use €
                        size="xl"
                        data={worldMapData} // Use state variable
                        tooltipBgColor="black"
                        tooltipTextColor="white"
                        richInteraction={true}
                      />
                    </div>
                  )}
                  {/* Legend */}
                   <div className="flex justify-center mt-4">
                    <div className="flex items-center space-x-8">
                      <div className="flex items-center">
                        <div className="w-24 h-3 bg-gradient-to-r from-blue-100 to-blue-600"></div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <span className="text-sm text-gray-500">Lower</span>
                        <span className="text-sm text-gray-500">-</span>
                        <span className="text-sm text-gray-500">Higher {selectedMapMetric === 'revenue' ? 'Revenue' : selectedMapMetric === 'rooms' ? 'Rooms' : 'ADR'}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Top Five Countries Side - Updated */}
                <div className="border-l border-gray-100 pl-8">
                  <TopFive
                    title="Top Countries"
                    color="blue"
                    withBorder={false}
                    metrics={topFiveMetricsBase} // Structure only
                    chartConfig={countryChartConfig}
                    apiEndpoint="/api/pickup-analytics/distribution" // Use pickup endpoint
                    apiParams={{ ...pickupAnalysisApiParams, field: 'guest_country', limit: 5 }}
                    // Add onMetricChange handler
                    onMetricChange={(metric) => {
                      setSelectedMapMetric(metric);
                      // Fetch world map data again with the new metric and existing filters
                      fetchWorldMapData(pickupAnalysisApiParams, metric);
                    }}
                    simpleDetails={true} // Enable simple details view
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
} 