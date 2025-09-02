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
import {
  CategoriesDetailsDialog,
  type CategoryTimeSeriesData,
} from "@/components/new/CategoriesDetailsDialog";
import { ReservationsByDayChart } from "../new/ReservationsByDayChart";
import { HorizontalBarChart } from "../new/HorizontalBarChart";
import { HotelSelector } from "../new/HotelSelector";
import { HorizontalBarChartMultipleDatasets } from "../new/HorizontalBarChartMultipleDatasets";
import { HorizontalBarChartMultipleDatasetsUpgraded } from "../new/HorizontalBarChartMultipleDatasetsUpgraded";
import { TopFiveUpgraded } from "@/components/new/TopFiveUpgraded";
import eventBus from "@/utils/eventBus";
import { usePersistentOverviewFilters } from "@/hooks/usePersistentOverviewFilters";

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

const room_typeS = {
  direct: {
    label: "Direct Bookings",
    color: "#18b0cc",
  },
  booking_com: {
    label: "Booking.com",
    color: "#1eb09a",
  },
  expedia: {
    label: "Expedia",
    color: "#3b56de",
  },
  gds: {
    label: "GDS",
    color: "#713ddd",
  },
  wholesalers: {
    label: "Wholesalers",
    color: "#22a74f",
  },
} as const;

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

export function RoomTypes() {
  // Use the custom hook to manage persistent state for common filters
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

  // Remove legacy hotel selection functions as they're handled by the new HotelSelector

  // Update handleDateChange to use the setter from the hook
  const handleDateChange = (newDate: Date | undefined) => {
    // The hook's setDate handles the undefined case and checks for actual change
    setDate(newDate);
  };

  // Create analysis API params using state from the hook
  const analysisApiParams = {
    periodType: selectedTimeFrame, // From hook
    viewType: selectedViewType, // From hook
    comparison: selectedComparison, // From hook
    businessDate: `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(
      2,
      "0"
    )}-${String(date.getDate()).padStart(2, "0")}`, // From hook - avoid timezone issues
    property: selectedProperty, // From hook
  };

  const metricOptions = [
    {
      label: "Revenue",
      key: "revenue",
      prefix: "$",
      data: [],
    },
    {
      label: "Rooms Sold",
      key: "rooms",
      data: [],
    },
    {
      label: "ADR",
      key: "adr",
      prefix: "$",
      data: [],
    },
  ];

  // Add state for controlling the world map data - initialize as empty
  const [currentMapData, setCurrentMapData] = useState<
    Array<{ country: string; value: number }>
  >([]);

  // Subscribe to TopFiveUpgraded data update events
  useEffect(() => {
    // Subscribe to data updates from the 'top-countries' component
    const unsubscribeDataUpdated = eventBus.subscribe(
      "topfive:top-countries:dataUpdated",
      (payload: {
        id: string;
        primaryGroup: string;
        metric: string;
        data: Array<{ name: string; value: number; code: string }>;
      }) => {
        console.log("RoomTypes: Received dataUpdated event:", payload);
        if (payload.id === "top-countries" && payload.data) {
          // Map the received data to the format WorldMap expects
          // IMPORTANT: Assumes payload.data items have a 'code' property (e.g., 'us', 'gb')
          const newMapData = payload.data
            .map((item) => ({
              country: item.code, // Use the country code directly from the data item
              value: item.value,
            }))
            .filter((item) => item.country); // Ensure items have a country code

          console.log("RoomTypes: Updating map data:", newMapData);
          setCurrentMapData(newMapData);
        }
      }
    );

    // Cleanup subscription on unmount
    return () => {
      unsubscribeDataUpdated();
    };
  }, []); // Run only once on mount

  return (
    <div className="flex-1 overflow-auto bg-[#f5f8ff]">
      {/* Header with Filters - Apply responsive layout */}
      {/* Use xl:fixed for fixed positioning only on extra large screens. */}
      {/* Adjusted left margin to account for potential sidebar width changes if needed */}
      {/* Changed lg: prefixes to xl: */}
      <div className="xl:fixed top-0 left-[256px] right-0 z-30 flex flex-col xl:flex-row xl:items-center xl:justify-between bg-white py-4 xl:py-6 xl:px-12 border-b border-gray-300 shadow-sm">
        {/* Title Block - Hide on small/medium/large screens */}
        {/* Changed lg:block to xl:block */}
        <div className="hidden xl:block px-4 xl:px-0 mb-2 xl:mb-0">
          {" "}
          {/* Adjusted padding/margin */}
          <h2 className="text-xl font-bold text-gray-800 mb-1">Room Types</h2>
          <span className="text-gray-400 font-ligth text-sm">{`${selectedTimeFrame} ${selectedViewType}`}</span>
        </div>

        {/* Filters container - Enable horizontal scrolling on smaller screens */}
        {/* Changed lg: prefixes to xl: */}
        <div className="flex flex-nowrap items-end gap-x-4 xl:gap-x-8 gap-y-3 overflow-x-auto pb-2 xl:pb-0 w-full xl:w-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100 px-4 md:px-6 xl:px-0">
          {/* Combined Time Frame and View Type Dropdown */}
          {/* Add flex-shrink-0 to prevent shrinking */}
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
          {/* Add flex-shrink-0 */}
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
          {/* Add flex-shrink-0 */}
          <div className="flex flex-col flex-shrink-0">
            <span className="text-xs text-gray-500 mb-2">Business date</span>
            <DatePicker
              date={date} // Uses date from the hook
              onDateChange={handleDateChange} // Uses the updated handler
            />
          </div>

          {/* Hotel Selector with Label */}
          {/* Add flex-shrink-0 */}
          <div className="flex flex-col flex-shrink-0">
            <span className="text-xs text-gray-500 mb-2">Property</span>
            <HotelSelector
              mode="property"
              selectedProperty={selectedProperty}
              setSelectedProperty={setSelectedProperty}
            />
          </div>

          {/* Export Button */}
          {/* Optional: Add flex-shrink-0 if uncommented */}
          {/* <Button 
              variant="ghost" 
              className="flex items-center space-x-2 text-blue-600 mt-7" // Adjusted alignment if needed
            >
              <DownloadIcon className="h-4 w-4" />
              <span>Export to Excel</span>
            </Button> */}
        </div>
      </div>
      {/* Main Content Area - Adjust padding-top for the fixed header */}
      {/* Changed mt-[140px] to xl:pt-[140px] and added base padding */}
      <div className="xl:pt-[140px] p-4 md:p-6 lg:p-8 xl:px-12">
        {/* Overview Title - Show ONLY on screens smaller than xl */}
        {/* Changed lg:hidden to xl:hidden */}
        <div className="block xl:hidden mb-6 md:mb-8">
          <h2 className="text-xl md:text-2xl font-bold text-gray-800 mb-1">
            Room Types
          </h2>
          <span className="text-gray-500 font-light text-sm">{`${selectedTimeFrame} ${selectedViewType}`}</span>
        </div>

        {/* CategoriesDetailsDialog section */}
        {/* Add mb-6 md:mb-8 for responsive margin */}
        <div className="mb-6 md:mb-8">
          <CategoriesDetailsDialog
            isDialog={false}
            title="Room Types Analysis"
            prefix="€"
            apiEndpoint="/api/room-types/distribution"
            apiParams={{
              ...analysisApiParams,
              field: "room_type",
              limit: "5",
            }}
          />
        </div>

        {/* Top Producers & LOS Chart Grid */}
        {/* Change grid breakpoint from lg/default to xl, adjust margin */}
        <div className="mb-6 md:mb-8 grid grid-cols-1 xl:grid-cols-2 gap-6 md:gap-8">
          <Card className="bg-white rounded-lg overflow-hidden">
            <CardContent className="p-0">
              <TopFiveUpgraded
                title="Top Producers"
                subtitle="By Room Type"
                metrics={metricOptions}
                apiEndpoint="/api/room-types/distribution-upgraded"
                apiParams={analysisApiParams}
                primaryField="room_type"
                secondaryField="producer"
                color="blue"
                defaultPrimaryValue="KNS"
                withBorder={false}
                useCategoriesDialog={true}
              />
            </CardContent>
          </Card>

          <div className="bg-white rounded-lg shadow overflow-hidden">
            <HorizontalBarChartMultipleDatasetsUpgraded
              title="Length of Stay by Room Type"
              datasetTitle="Length of Stay"
              apiEndpoint="/api/room-types/length-of-stay"
              apiParams={analysisApiParams}
              defaultDataset="length_of_stay"
              defaultCategory="SUP"
              sort={true}
              leftMargin={10}
            />
          </div>
        </div>

        {/* Secondary TopFive Grid */}
        {/* Change grid breakpoint to xl, adjust margin */}
        <div className="mb-6 md:mb-8 grid grid-cols-1 xl:grid-cols-2 gap-6 md:gap-8">
          <Card className="bg-white rounded-lg overflow-hidden">
            <CardContent className="p-0">
              <TopFiveUpgraded
                title="Room types"
                subtitle="By market segment"
                metrics={metricOptions}
                apiEndpoint="/api/room-types/distribution-upgraded"
                apiParams={analysisApiParams}
                primaryField="market_group_code"
                secondaryField="room_type"
                color="blue"
                withBorder={false}
                useCategoriesDialog={true}
              />
            </CardContent>
          </Card>

          <Card className="bg-white rounded-lg overflow-hidden">
            <CardContent className="p-0">
              <TopFiveUpgraded
                title="Room types"
                subtitle="By booking channel"
                metrics={metricOptions}
                apiEndpoint="/api/booking-channels/distribution-upgraded" // Note: Endpoint change might be intended or a copy-paste remnant
                apiParams={analysisApiParams}
                primaryField="booking_channel"
                secondaryField="room_type"
                color="green"
                withBorder={false}
                useCategoriesDialog={true}
              />
            </CardContent>
          </Card>
        </div>

        {/* World Map & Top Countries Grid */}
        {/* Adjust margin */}
        <div className="mt-6 md:mt-8">
          <Card className="bg-white rounded-lg overflow-hidden">
            {/* Add responsive padding/text size to header */}
            <CardHeader className="flex flex-col items-start px-4 py-4 md:px-6 md:py-5">
              <div className="flex w-full justify-between items-center">
                <div>
                  {/* Add responsive text/margin */}
                  <CardTitle className="text-base md:text-lg font-semibold text-gray-800 mb-2 md:mb-3">
                    Global Distribution by Room Type
                  </CardTitle>
                </div>
              </div>
            </CardHeader>
            {/* Add responsive padding */}
            <CardContent className="px-2 py-4 md:px-6 md:py-6">
              {/* Change grid breakpoint to xl */}
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 md:gap-8">
                {/* World Map Side */}
                <div>
                  {/* Adjust map container height, change size to responsive */}
                  <div className="h-[350px] sm:h-[450px] xl:h-[500px] flex justify-center items-center mb-4">
                    {/* Ensure WorldMap receives the updated currentMapData */}
                    {currentMapData.length > 0 ? (
                      <WorldMap
                        color="rgb(59, 130, 246)"
                        title=""
                        valueSuffix="€" // Adjust suffix based on actual metric if needed
                        size="responsive" // Use responsive size
                        data={currentMapData}
                        tooltipBgColor="black"
                        tooltipTextColor="white"
                        richInteraction={true}
                      />
                    ) : (
                      <div className="text-gray-500">
                        Select data to display on map
                      </div>
                    )}
                  </div>
                  {/* Legend */}
                  <div className="flex justify-center mt-4">
                    <div className="flex items-center space-x-8">
                      <div className="flex items-center">
                        <div className="w-24 h-3 bg-gradient-to-r from-blue-100 to-blue-600"></div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <span className="text-sm text-gray-500">Lower</span>
                        <span className="text-sm text-gray-500">-</span>
                        <span className="text-sm text-gray-500">
                          Higher Revenue
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Top Five by Country Side - Adjust border/padding for stacking */}
                {/* Changed lg: prefixes to xl: */}
                <div className="xl:border-l xl:border-gray-100 xl:pl-6 xl:pl-8 pt-6 xl:pt-0 border-t border-gray-100 xl:border-t-0">
                  <TopFiveUpgraded
                    id="top-countries" // This ID is crucial for the event subscription
                    title="Top Countries"
                    subtitle="by Room Type"
                    metrics={metricOptions} // Pass the metric options config
                    apiEndpoint="/api/room-types/distribution-upgraded"
                    apiParams={analysisApiParams}
                    primaryField="room_type"
                    secondaryField="guest_country"
                    defaultPrimaryValue="SUP" // Or fetch the first available one
                    color="blue"
                    withBorder={false}
                    useCategoriesDialog={true}
                    // Decide if useCategoriesDialog is needed here based on functionality
                    // useCategoriesDialog={true}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>{" "}
      {/* End of main content padding wrapper */}
      {/* Bottom Charts section - Make grid responsive, adjust margins */}
      {/* Change grid breakpoint to xl, adjust padding/margin */}
      <div className="mt-6 md:mt-8 px-4 md:px-6 xl:px-12 pb-12 grid grid-cols-1 xl:grid-cols-2 gap-6 md:gap-8">
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <HorizontalBarChartMultipleDatasetsUpgraded
            title="Lead Times by Room Type"
            datasetTitle="Lead Times"
            apiEndpoint="/api/room-types/lead-times"
            apiParams={analysisApiParams}
            defaultDataset="cancellation_lead_time"
            defaultCategory="SUP"
            sort={true}
            leftMargin={-5}
            orientation="horizontal"
          />
        </div>
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <HorizontalBarChartMultipleDatasetsUpgraded
            title="Reservation Trends (DOW)"
            datasetTitle="Reservation Trends (DOW)"
            apiEndpoint="/api/room-types/reservation-trends"
            apiParams={analysisApiParams}
            defaultDataset="occupancyByDayOfWeek"
            // Consider adding defaultCategory if applicable
            leftMargin={20}
            orientation="vertical"
          />
        </div>
      </div>
    </div> // End of main component div
  );
}
