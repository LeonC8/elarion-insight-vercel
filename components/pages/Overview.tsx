"use client";

import { useState, useEffect } from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ChevronDownIcon,
  DownloadIcon,
  Check,
  DollarSign,
  Percent,
  Hotel,
  Building,
} from "lucide-react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { DatePickerDemo as DatePicker } from "@/components/ui/date-picker";
import dynamic from "next/dynamic";
import { TopFive } from "../new/TopFive";
import { KpiWithChart } from "../new/KpiWithChart";
import { Kpi } from "../new/Kpi";
import { ChartConfig } from "@/components/ui/chart";
import type { CategoryTimeSeriesData } from "@/components/new/CategoriesDetailsDialog";
import { ReservationsByDayChart } from "../new/ReservationsByDayChart";
import { HorizontalBarChart } from "../new/HorizontalBarChart";
import { HotelSelector } from "../new/HotelSelector";
import { HorizontalBarChartMultipleDatasets } from "../new/HorizontalBarChartMultipleDatasets";
import { addDays } from "date-fns";
import { OccupancyAnalysisChart } from "../new/OccupancyAnalysisChart";
type KpiResponse = any;
import { KpiWithAlignedChart } from "../new/KpiWithAlignedChart";
import { usePersistentOverviewFilters } from "@/hooks/usePersistentOverviewFilters"; // Import the custom hook
import { getCodeFromFullName } from "@/lib/countryUtils"; // <-- Import the utility function

// Dynamic import for WorldMap with loading state
const WorldMap = dynamic(
  () => import("react-svg-worldmap").then((mod) => mod.default),
  {
    ssr: false,
    loading: () => (
      <div className="h-[500px] flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
      </div>
    ),
  }
);

// Keep utility functions and component definitions
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

// First, let's add a Skeleton component at the top of the file after the imports
function Skeleton({ className }: { className?: string }) {
  return <div className={`animate-pulse rounded bg-gray-200 ${className}`} />;
}

// Add a mapping for the metric keys
const metricKeyMapping: Record<string, string> = {
  revenue: "revenue",
  rooms: "roomsSold", // Map 'rooms' to 'roomsSold' as returned by the API
  adr: "adr",
};

export function Overview() {
  // Use the custom hook to manage persistent state
  const {
    selectedTimeFrame,
    setSelectedTimeFrame,
    selectedViewType,
    setSelectedViewType,
    selectedComparison,
    setSelectedComparison,
    date,
    setDate, // Use the setter from the hook
    selectedProperty,
    setSelectedProperty,
  } = usePersistentOverviewFilters();

  // Remove dummy hotels; using property selector instead

  // Add state for API data
  const [kpiData, setKpiData] = useState<KpiResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [primaryDataLoaded, setPrimaryDataLoaded] = useState(false); // Keep this
  const [worldMapData, setWorldMapData] = useState<
    Array<{ country: string; value: number }>
  >([]); // Keep this
  const [selectedMapMetric, setSelectedMapMetric] = useState("revenue"); // Keep this

  // Keep analysisApiParams state and its useEffect (it now depends on the hook's state)
  const [analysisApiParams, setAnalysisApiParams] = useState({
    businessDate: date.toISOString().split("T")[0],
    periodType: selectedTimeFrame,
    viewType: selectedViewType,
    comparison: selectedComparison,
    property: selectedProperty,
  });

  useEffect(() => {
    setAnalysisApiParams({
      businessDate: date.toISOString().split("T")[0], // Uses date from the hook
      periodType: selectedTimeFrame, // Uses selectedTimeFrame from the hook
      viewType: selectedViewType, // Uses selectedViewType from the hook
      comparison: selectedComparison, // Uses selectedComparison from the hook
      property: selectedProperty,
    });
  }, [
    date,
    selectedTimeFrame,
    selectedViewType,
    selectedComparison,
    selectedProperty,
  ]); // Dependencies are now from the hook

  // Modify the fetchKpiData function to mark primary data as loaded
  const fetchKpiData = async () => {
    try {
      setLoading(true);
      setPrimaryDataLoaded(false);
      setError(null);

      // Format the date for the API
      const formattedDate = date.toISOString().split("T")[0];

      // Construct the query parameters
      const params = new URLSearchParams({
        businessDate: formattedDate,
        periodType: selectedTimeFrame,
        viewType: selectedViewType,
        comparison: selectedComparison,
        property: selectedProperty,
      });

      // Fetch data from the API
      const response = await fetch(
        `/api/overview/general?${params.toString()}`
      );

      if (!response.ok) {
        throw new Error(`Failed to fetch data: ${response.status}`);
      }

      const data = await response.json();
      setKpiData(data);

      // Mark primary data as loaded and trigger secondary data loads
      setPrimaryDataLoaded(true);
    } catch (err) {
      console.error("Error fetching KPI data:", err);
      setError(
        err instanceof Error ? err.message : "An unknown error occurred"
      );
    } finally {
      setLoading(false);
    }
  };

  // Update the initial data loading useEffect
  useEffect(() => {
    fetchKpiData();
    // Only fetch primary data here
  }, [
    date,
    selectedTimeFrame,
    selectedViewType,
    selectedComparison,
    selectedProperty,
  ]);

  // remove legacy toggleHotel/toggleAllHotels

  const toggleRegion = (regionHotels: string[], e: React.MouseEvent) => {
    // Note: This relies on hotelsByRegion which was removed.
    // You'll need to fetch/manage hotel groupings differently if this feature is kept.
    // For now, this function will likely not work as expected without the constant.
    // Consider disabling or refactoring hotel grouping.
    e.preventDefault();
    e.stopPropagation();

    // Example: Assuming you fetch or manage regions elsewhere
    // const allSelected = regionHotels.every(hotel => selectedHotels.includes(hotel))
    // if (allSelected) {
    //   setSelectedHotels(prev => prev.filter(h => !regionHotels.includes(h)))
    // } else {
    //   setSelectedHotels(prev => [...Array.from(new Set([...prev, ...regionHotels]))])
    // }
  };

  const toggleBrand = (brandHotels: string[], e: React.MouseEvent) => {
    // Note: This relies on hotelsByBrand which was removed.
    // Similar to toggleRegion, this needs refactoring.
    e.preventDefault();
    e.stopPropagation();

    // Example: Assuming you fetch or manage brands elsewhere
    // const allSelected = brandHotels.every(hotel => selectedHotels.includes(hotel))
    // if (allSelected) {
    //   setSelectedHotels(prev => prev.filter(h => !brandHotels.includes(h)))
    // } else {
    //   setSelectedHotels(prev => [...Array.from(new Set([...prev, ...brandHotels]))])
    // }
  };

  // Update handleDateChange to use the setter from the hook
  const handleDateChange = (newDate: Date | undefined) => {
    // The hook's setDate handles the undefined case and checks for actual change
    setDate(newDate);
    // Data fetching is handled by the main useEffect dependency change
  };

  // Modify the fetchWorldMapData function to use the mapping and convert country names
  const fetchWorldMapData = async (metric: string = selectedMapMetric) => {
    try {
      const params = new URLSearchParams({
        businessDate: date.toISOString().split("T")[0],
        periodType: selectedTimeFrame,
        viewType: selectedViewType,
        comparison: selectedComparison,
        field: "guest_country",
        limit: "50",
        property: selectedProperty,
      });

      const response = await fetch(`/api/overview/distribution?${params}`);
      if (!response.ok) throw new Error("Failed to fetch world map data");

      const data = await response.json();

      // Use the mapped metric key to access the correct data
      const mappedMetric = metricKeyMapping[metric] || metric;

      // Check if the data for the mapped metric exists and is an array
      if (data && Array.isArray(data[mappedMetric])) {
        const transformedData = data[mappedMetric].map((item: any) => ({
          // Convert the full name to a 2-letter code using the utility function
          country: getCodeFromFullName(item.name),
          value: item.value,
        }));
        setWorldMapData(transformedData);
      } else {
        console.warn(
          `Data for metric '${mappedMetric}' not found or not an array in API response.`
        );
        setWorldMapData([]); // Set to empty array if data is missing/invalid
      }
    } catch (error) {
      console.error("Error fetching world map data:", error);
      setWorldMapData([]); // Reset data on error
    }
  };

  // Update useEffect to include selectedMapMetric in dependencies
  useEffect(() => {
    fetchWorldMapData();
  }, [
    date,
    selectedTimeFrame,
    selectedViewType,
    selectedComparison,
    selectedMapMetric,
    selectedProperty,
  ]);

  return (
    <div className="flex-1 overflow-auto bg-[#f5f8ff]">
      {/* Header Section */}
      {/* Update the header div to support flex-row and space-between layout on large screens */}
      <div className="sticky top-0 left-0 right-0 z-30 flex flex-col lg:flex-row lg:items-center lg:justify-between bg-white py-4 lg:py-6 lg:px-12 border-b border-gray-300 shadow-sm">
        {/* Title Block - Visible ONLY on Large Screens */}
        <div className="hidden lg:block">
          {" "}
          {/* This block is hidden by default, shown on lg screens */}
          <h2 className="text-xl md:text-2xl font-bold text-gray-800 mb-1">
            Overview
          </h2>
          <span className="text-gray-500 font-light mt-1 pt-1 text-sm">{`${selectedTimeFrame} ${selectedViewType}`}</span>
        </div>

        {/* Filters container - Adjust padding and width for large screens */}
        {/* Change w-full to lg:w-auto so it doesn't take full width on large screens */}
        <div className="flex flex-nowrap items-end gap-x-4 lg:gap-x-8 gap-y-3 overflow-x-auto pb-2 lg:pb-0 w-full lg:w-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100 px-4 md:px-6 lg:px-0">
          {/* Combined Time Frame and View Type Dropdown */}
          {/* No changes needed here */}
          <div className="flex flex-col flex-shrink-0">
            <span className="text-xs text-gray-500 mb-2">Selected period</span>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  className="bg-[#f2f8ff] hover:bg-[#f2f8ff] text-[#342630] rounded-full px-4"
                >
                  {`${selectedTimeFrame} ${selectedViewType}`}{" "}
                  <TriangleDown className="ml-2" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56">
                {/* Day Group */}
                <div className="px-2 py-2 text-sm font-semibold text-gray-800  border-b border-gray-300">
                  Day
                </div>
                <div className="p-1 text-gray-600">
                  <DropdownMenuItem
                    onSelect={() => {
                      setSelectedTimeFrame("Day");
                      setSelectedViewType("Actual");
                    }}
                  >
                    Actual
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onSelect={() => {
                      setSelectedTimeFrame("Day");
                      setSelectedViewType("OTB");
                    }}
                  >
                    OTB
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onSelect={() => {
                      setSelectedTimeFrame("Day");
                      setSelectedViewType("Projected");
                    }}
                  >
                    Projected
                  </DropdownMenuItem>
                </div>

                {/* Month Group */}
                <div className="px-2 py-2 text-sm font-semibold text-gray-800  border-y border-gray-300">
                  Month
                </div>
                <div className="p-1 text-gray-600">
                  <DropdownMenuItem
                    onSelect={() => {
                      setSelectedTimeFrame("Month");
                      setSelectedViewType("Actual");
                    }}
                  >
                    Actual
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onSelect={() => {
                      setSelectedTimeFrame("Month");
                      setSelectedViewType("OTB");
                    }}
                  >
                    OTB
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onSelect={() => {
                      setSelectedTimeFrame("Month");
                      setSelectedViewType("Projected");
                    }}
                  >
                    Projected
                  </DropdownMenuItem>
                </div>

                {/* Year Group */}
                <div className="px-2 py-2 text-sm font-semibold text-gray-800  border-y border-gray-300">
                  Year
                </div>
                <div className="p-1">
                  <DropdownMenuItem
                    onSelect={() => {
                      setSelectedTimeFrame("Year");
                      setSelectedViewType("Actual");
                    }}
                  >
                    Actual
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onSelect={() => {
                      setSelectedTimeFrame("Year");
                      setSelectedViewType("OTB");
                    }}
                  >
                    OTB
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onSelect={() => {
                      setSelectedTimeFrame("Year");
                      setSelectedViewType("Projected");
                    }}
                  >
                    Projected
                  </DropdownMenuItem>
                </div>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* Comparison Dropdown with Label */}
          <div className="flex flex-col flex-shrink-0">
            <span className="text-xs text-gray-500 mb-2">Compare with:</span>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  className="bg-[#f2f8ff] hover:bg-[#f2f8ff] text-[#342630] rounded-full px-4"
                >
                  {selectedComparison} <TriangleDown className="ml-2" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuItem
                  onSelect={() => setSelectedComparison("Last year - OTB")}
                >
                  Last year - OTB
                </DropdownMenuItem>
                <DropdownMenuItem
                  onSelect={() =>
                    setSelectedComparison("Last year (match day of week) - OTB")
                  }
                >
                  Last year (match day of week) - OTB
                </DropdownMenuItem>
                <DropdownMenuItem
                  onSelect={() => setSelectedComparison("Last year - Actual")}
                >
                  Last year - Actual
                </DropdownMenuItem>
                <DropdownMenuItem
                  onSelect={() =>
                    setSelectedComparison(
                      "Last year (match day of week) - Actual"
                    )
                  }
                >
                  Last year (match day of week) - Actual
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* Date Picker with Label */}
          <div className="flex flex-col flex-shrink-0">
            <span className="text-xs text-gray-500 mb-2">Business date</span>
            <DatePicker
              date={date} // Uses date from the hook
              onDateChange={handleDateChange} // Uses the updated handler
            />
          </div>

          {/* Hotel Selector with Label */}
          <div className="flex flex-col flex-shrink-0">
            <span className="text-xs text-gray-500 mb-2">Property</span>
            <HotelSelector
              mode="property"
              selectedProperty={selectedProperty}
              setSelectedProperty={setSelectedProperty}
            />
          </div>

          {/* Export Button - Removed for brevity, add back if needed */}
        </div>
      </div>

      {/* Main Content Area */}
      <div className="p-4 md:p-6 lg:p-8 lg:px-12">
        {/* Overview Title - MOVED LOGICALLY, this block now ONLY renders on mobile/medium */}
        {/* Add 'block lg:hidden' to hide this on large screens */}
        <div className="block lg:hidden mb-6 md:mb-8">
          {" "}
          {/* Added block lg:hidden */}
          <h2 className="text-xl md:text-2xl font-bold text-gray-800 mb-1">
            Overview
          </h2>
          <span className="text-gray-500 font-light mt-1 pt-1 text-sm">{`${selectedTimeFrame} ${selectedViewType}`}</span>
        </div>

        {/* Show primary error if it exists */}
        {error &&
          !loading && ( // Only show if primary loading is done and error exists
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-6">
              <p>Error loading main KPIs: {error}</p>
            </div>
          )}

        {/* KPI Grid - Responsive columns */}
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 md:gap-6 mb-6 md:mb-8">
          {loading ? ( // Use primary loading state for KPI skeletons
            <>
              {[...Array(4)].map((_, index) => (
                <Card key={index} className="bg-white p-4 md:p-6">
                  <Skeleton className="h-8 md:h-10 w-24 md:w-32 mb-2" />
                  <Skeleton className="h-4 md:h-5 w-12 md:w-16 mb-3 md:mb-4" />
                  <Skeleton className="h-20 md:h-24 w-full" />
                </Card>
              ))}
            </>
          ) : (
            <>
              {/* Use empty array [] as fallback instead of hardcoded data */}
              <KpiWithAlignedChart
                title="Total Revenue"
                currentValue={kpiData?.totalRevenue.value ?? 0}
                percentageChange={kpiData?.totalRevenue.percentageChange ?? 0}
                chartData={kpiData?.totalRevenue.fluctuation ?? []} // Use []
                prefix="€"
                valueColor="blue"
                icon={DollarSign}
              />
              <KpiWithAlignedChart
                title="Rooms Sold"
                currentValue={kpiData?.roomsSold.value ?? 0}
                percentageChange={kpiData?.roomsSold.percentageChange ?? 0}
                chartData={kpiData?.roomsSold.fluctuation ?? []} // Use []
                valueColor="blue"
                prefix=""
                icon={Hotel}
              />
              <KpiWithAlignedChart
                title="ADR"
                currentValue={kpiData?.adr.value ?? 0}
                percentageChange={kpiData?.adr.percentageChange ?? 0}
                chartData={kpiData?.adr.fluctuation ?? []} // Use []
                prefix="€"
                valueColor="green"
                icon={DollarSign}
              />
              <KpiWithAlignedChart
                title="Occupancy"
                currentValue={kpiData?.occupancyRate.value ?? 0}
                percentageChange={kpiData?.occupancyRate.percentageChange ?? 0}
                chartData={kpiData?.occupancyRate.fluctuation ?? []} // Use []
                prefix=""
                suffix="%"
                valueColor="green"
                icon={Percent}
              />
            </>
          )}
        </div>

        {/* Second Row - KPIs without Charts - Responsive columns */}
        {/* Adjusted grid for Room Revenue span */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 mb-6 md:mb-8">
          {loading ? ( // Use primary loading state for KPI skeletons
            <>
              {/* Apply col-span-2 to the first skeleton on mobile */}
              <Card
                key={0}
                className="bg-white p-3 md:p-4 col-span-2 sm:col-span-1"
              >
                <div className="flex justify-between items-start mb-2 md:mb-3">
                  <Skeleton className="h-4 md:h-5 w-16 md:w-24" />
                </div>
                <Skeleton className="h-6 md:h-8 w-16 md:w-24 mb-1 md:mb-2" />
                <Skeleton className="h-3 md:h-4 w-10 md:w-16" />
              </Card>
              {/* Render the remaining skeletons */}
              {[...Array(4)].map((_, index) => (
                <Card key={index + 1} className="bg-white p-3 md:p-4">
                  <div className="flex justify-between items-start mb-2 md:mb-3">
                    <Skeleton className="h-4 md:h-5 w-16 md:w-24" />
                  </div>
                  <Skeleton className="h-6 md:h-8 w-16 md:w-24 mb-1 md:mb-2" />
                  <Skeleton className="h-3 md:h-4 w-10 md:w-16" />
                </Card>
              ))}
            </>
          ) : (
            <>
              {/* Apply col-span-2 on mobile (default), revert on sm and up */}
              <div className="col-span-2 sm:col-span-1">
                {/* Use empty array [] as fallback instead of hardcoded data */}
                <Kpi
                  title="Room Revenue"
                  currentValue={kpiData?.roomRevenue.value ?? 0}
                  percentageChange={kpiData?.roomRevenue.percentageChange ?? 0}
                  prefix="€"
                  color="green"
                  chartData={kpiData?.roomRevenue.fluctuation ?? []} // Use []
                />
              </div>
              {/* Remaining KPIs */}
              <Kpi
                title="F&B Revenue"
                currentValue={kpiData?.fbRevenue.value ?? 0}
                percentageChange={kpiData?.fbRevenue.percentageChange ?? 0}
                prefix="€"
                color="blue"
                chartData={kpiData?.fbRevenue.fluctuation ?? []} // Use []
              />
              <Kpi
                title="Other Revenue"
                currentValue={kpiData?.otherRevenue.value ?? 0}
                percentageChange={kpiData?.otherRevenue.percentageChange ?? 0}
                prefix="€"
                color="blue"
                chartData={kpiData?.otherRevenue.fluctuation ?? []} // Use []
              />
              <Kpi
                title="RevPAR"
                currentValue={kpiData?.revpar.value ?? 0}
                percentageChange={kpiData?.revpar.percentageChange ?? 0}
                prefix="€"
                color="green"
                chartData={kpiData?.revpar.fluctuation ?? []} // Use []
              />
              <Kpi
                title="TRevPAR"
                currentValue={kpiData?.trevpar.value ?? 0}
                percentageChange={kpiData?.trevpar.percentageChange ?? 0}
                prefix="€"
                color="blue"
                chartData={kpiData?.trevpar.fluctuation ?? []} // Use []
              />
            </>
          )}
        </div>

        {/* Top Producers and Occupancy Analysis - Stack vertically on medium screens */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 md:gap-8 mt-6 md:mt-8">
          {/* Remove hardcoded data from metrics, use empty fallbacks for distribution/category/config */}
          <TopFive
            title="Producers"
            color="blue"
            metrics={[
              { key: "revenue", label: "Revenue", prefix: "€", data: [] }, // Remove hardcoded data
              { key: "rooms", label: "Rooms Sold", data: [] }, // Remove hardcoded data
              { key: "adr", label: "ADR", prefix: "€", data: [] }, // Remove hardcoded data
            ]}
            distributionData={[]} // Use []
            categoryTimeSeriesData={[]} // Use []
            chartConfig={{}} // Use {}
            apiEndpoint="/api/overview/distribution"
            apiParams={{
              ...analysisApiParams,
              field: "producer",
              limit: "5",
            }}
            lazyLoad={true}
          />
          <OccupancyAnalysisChart
            occupancyData={kpiData?.occupancyRate.fluctuation ?? []} // Use []
            totalRooms={kpiData?.hotelCapacity ?? 0} // Use 0 as fallback
            // Add loading prop pass-through
            loading={loading}
          />
        </div>

        {/* World Map */}
        <div className="mt-6 md:mt-8">
          <Card className="bg-white rounded-lg overflow-hidden">
            <CardHeader className="flex flex-col items-start px-4 py-4 md:px-6 md:py-5">
              <div className="flex w-full justify-between items-center">
                <div>
                  <CardTitle className="text-base md:text-lg font-semibold text-gray-800 mb-2 md:mb-3">
                    Global Distribution
                  </CardTitle>
                </div>
              </div>
            </CardHeader>
            <CardContent className="px-2 py-4 md:px-6 md:py-6">
              {/* Responsive grid for map and TopFive */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 md:gap-8">
                {/* World Map Side */}
                <div>
                  {/* Adjusted map size container */}
                  <div className="h-[350px] sm:h-[450px] lg:h-[500px] flex justify-center items-center mb-4">
                    <WorldMap
                      color="rgb(59, 130, 246)"
                      title=""
                      valueSuffix={
                        selectedMapMetric === "revenue"
                          ? "€"
                          : selectedMapMetric === "adr"
                          ? "€"
                          : ""
                      }
                      size="responsive" // Use responsive size if available, or adjust based on container
                      data={worldMapData} // Already uses state initialized to []
                      tooltipBgColor="black"
                      tooltipTextColor="white"
                      richInteraction={true}
                    />
                  </div>
                  <div className="flex justify-center mt-4">
                    <div className="flex items-center space-x-8">
                      <div className="flex items-center">
                        <div className="w-24 h-3 bg-gradient-to-r from-blue-100 to-blue-600"></div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <span className="text-sm text-gray-500">Lower</span>
                        <span className="text-sm text-gray-500">-</span>
                        <span className="text-sm text-gray-500">Higher</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Top Five Countries Side - Adjust padding/border for stacking */}
                <div className="lg:border-l lg:border-gray-100 lg:pl-6 xl:pl-8 pt-6 lg:pt-0 border-t border-gray-100 lg:border-t-0">
                  {/* Remove hardcoded data from metrics, use empty fallbacks for distribution/category/config */}
                  <TopFive
                    title="Countries"
                    color="blue"
                    withBorder={false}
                    metrics={[
                      {
                        key: "revenue",
                        label: "Revenue",
                        prefix: "€",
                        data: [],
                      }, // Remove hardcoded data
                      { key: "rooms", label: "Rooms Sold", data: [] }, // Remove hardcoded data
                      { key: "adr", label: "ADR", prefix: "€", data: [] }, // Remove hardcoded data
                    ]}
                    distributionData={[]} // Use []
                    categoryTimeSeriesData={[]} // Use []
                    chartConfig={{}} // Use {}
                    // Replace specific endpoint with generic analysis endpoint
                    apiEndpoint="/api/overview/distribution"
                    apiParams={{
                      ...analysisApiParams,
                      field: "guest_country",
                      limit: "5",
                    }}
                    onMetricChange={(metric) => {
                      setSelectedMapMetric(metric);
                      fetchWorldMapData(metric); // Already calls fetch function
                    }}
                    lazyLoad={true}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Market Segments, Booking Channels, Room Types - Responsive Columns */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 md:gap-8 mt-6 md:mt-8">
          {/* Remove hardcoded data from metrics, use empty fallbacks for distribution/category/config */}
          <TopFive
            title="Market Segments "
            color="blue"
            metrics={[
              { key: "revenue", label: "Revenue", prefix: "€", data: [] }, // Remove hardcoded data
              { key: "rooms", label: "Rooms Sold", data: [] }, // Remove hardcoded data
              { key: "adr", label: "ADR", prefix: "€", data: [] }, // Remove hardcoded data
            ]}
            distributionData={[]} // Use []
            categoryTimeSeriesData={[]} // Use []
            chartConfig={{}} // Use {}
            // Add these two properties to use the generic analysis endpoint
            apiEndpoint="/api/overview/distribution"
            apiParams={{
              ...analysisApiParams,
              field: "market_group_code",
              limit: "5",
            }}
            lazyLoad={true}
          />
          {/* Remove hardcoded data from metrics, use empty fallbacks for distribution/category/config */}
          <TopFive
            title="Booking Channels"
            color="blue"
            metrics={[
              { key: "revenue", label: "Revenue", prefix: "€", data: [] }, // Remove hardcoded data
              { key: "rooms", label: "Rooms Sold", data: [] }, // Remove hardcoded data
              { key: "adr", label: "ADR", prefix: "€", data: [] }, // Remove hardcoded data
            ]}
            distributionData={[]} // Use []
            categoryTimeSeriesData={[]} // Use []
            chartConfig={{}} // Use {}
            // Add these two properties to use the generic analysis endpoint
            apiEndpoint="/api/overview/distribution"
            apiParams={{
              ...analysisApiParams,
              field: "booking_channel",
              limit: "5",
            }}
            lazyLoad={true}
          />
          {/* Remove hardcoded data from metrics, use empty fallbacks for distribution/category/config */}
          <TopFive
            title="Room Types"
            color="green"
            metrics={[
              { key: "revenue", label: "Revenue", prefix: "€", data: [] }, // Remove hardcoded data
              { key: "rooms", label: "Rooms Sold", data: [] }, // Remove hardcoded data
              { key: "adr", label: "ADR", prefix: "€", data: [] }, // Remove hardcoded data
            ]}
            distributionData={[]} // Use []
            categoryTimeSeriesData={[]} // Use []
            chartConfig={{}} // Use {}
            // Add these two properties to use the generic analysis endpoint
            apiEndpoint="/api/overview/distribution"
            apiParams={{
              ...analysisApiParams,
              field: "room_type",
              limit: "5",
            }}
            lazyLoad={true}
          />
        </div>

        {/* Horizontal Bar Chart and Reservations by Day - Stack on large screens */}
        {/* These components already fetch their own data, no hardcoded data was passed */}
        <div className="grid gap-6 md:gap-8 grid-cols-1 lg:grid-cols-2 pt-6 md:pt-8">
          {/* Use url and apiParams for Lead Times chart */}
          <HorizontalBarChartMultipleDatasets
            // ... other props ...
            url="/api/overview/lead-times" // Pass the URL
            apiParams={analysisApiParams} // Pass the common API parameters
            defaultDataset="bookingLeadTime" // Use the key defined in the API response
            leftMargin={-10}
            lazyLoad={true} // <-- Already added
            fixedTitle="Lead time distribution" // <-- Add this fixed title
          />
          {/* Update ReservationsByDayChart to fetch its own data and lazy load */}
          <ReservationsByDayChart
            url="/api/overview/reservation-trends" // Pass the URL
            apiParams={analysisApiParams} // Pass the common API parameters
            lazyLoad={true} // <-- Add this prop
          />
        </div>

        {/* New KPIs section - Stack on large screens */}
        {/* These components already fetch their own data, no hardcoded data was passed */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 md:gap-8 mt-6 md:mt-8">
          {/* KpiWithChart already fetches its own data */}
          <KpiWithChart
            title="Booking Status" // This title is now less prominent, primarily for internal identification
            fixedTitle="Cancellations statistics" // <-- Add the fixed title here
            color="blue"
            apiUrl="/api/overview/cancellations"
            apiParams={analysisApiParams} // Use common params
            fieldMapping={[
              {
                apiField: "cancelledRooms",
                label: "Cancelled rooms",
                prefix: "",
              },
              {
                apiField: "noShowRooms",
                label: "No-Show rooms",
                prefix: "",
              },
              {
                apiField: "revenueLost",
                label: "Revenue Lost",
                prefix: "€",
              },
            ]}
          />
          {/* Update HorizontalBarChartMultipleDatasets for Length of Stay */}
          <HorizontalBarChartMultipleDatasets
            // Add the necessary props to fetch data
            url="/api/overview/length-of-stay" // Specify the API endpoint
            apiParams={analysisApiParams} // Pass the common API parameters
            defaultDataset="lengthOfStay" // Specify the data key in the API response
            leftMargin={10} // Keep existing margin if needed
            lazyLoad={true} // Enable lazy loading
            fixedTitle="Length of stay distribution" // Add a fixed title
          />
        </div>
      </div>
    </div>
  );
}
