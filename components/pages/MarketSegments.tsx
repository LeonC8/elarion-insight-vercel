"use client"

import { useState, useEffect } from 'react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { 
  ChevronDownIcon, 
  DownloadIcon,
  Check,
  DollarSign, 
  Percent, 
  Hotel, 
  Building
} from 'lucide-react'
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { DatePickerDemo as DatePicker } from "@/components/ui/date-picker"
import dynamic from 'next/dynamic'
import { TopFive } from '../new/TopFive'
import { KpiWithChart } from '../new/KpiWithChart'
import { Kpi } from '../new/Kpi'
import { KpiWithSubtleChart } from '../new/KpiWithSubtleChart'
import { ChartConfig } from '@/components/ui/chart'
import { CategoriesDetailsDialog, type CategoryTimeSeriesData } from '@/components/new/CategoriesDetailsDialog'
import { ReservationsByDayChart } from '../new/ReservationsByDayChart'
import { HorizontalBarChart } from '../new/HorizontalBarChart'
import { HotelSelector } from '../new/HotelSelector'
import { HorizontalBarChartMultipleDatasets } from "../new/HorizontalBarChartMultipleDatasets"
import { HorizontalBarChartMultipleDatasetsUpgraded } from "../new/HorizontalBarChartMultipleDatasetsUpgraded"
import { TopFiveUpgraded } from "@/components/new/TopFiveUpgraded"
import eventBus from '@/utils/eventBus'

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






// Add metrics by channel




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





export function MarketSegments() {
  // Add date state
  const [date, setDate] = useState<Date>(new Date())
  
  // Basic state for hotel selection
  const [selectedHotels, setSelectedHotels] = useState<string[]>(["Hotel 1"])
  const [selectedTimeFrame, setSelectedTimeFrame] = useState("Month")
  const [selectedViewType, setSelectedViewType] = useState("Actual")
  const [selectedComparison, setSelectedComparison] = useState("Last year - OTB")
  const allHotels = ["Hotel 1", "Hotel 2", "Hotel 3"]

  const toggleHotel = (hotel: string) => {
    setSelectedHotels(prev => 
      prev.includes(hotel) 
        ? prev.filter(h => h !== hotel) 
        : [...prev, hotel]
    )
  }

  const toggleAllHotels = () => {
    setSelectedHotels(prev => 
      prev.length === allHotels.length ? [] : [...allHotels]
    )
  }

  const toggleRegion = (regionHotels: string[], e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    
    const allSelected = regionHotels.every(hotel => selectedHotels.includes(hotel))
    if (allSelected) {
      setSelectedHotels(prev => prev.filter(h => !regionHotels.includes(h)))
    } else {
      setSelectedHotels(prev => [...Array.from(new Set([...prev, ...regionHotels]))])
    }
  }

  const toggleBrand = (brandHotels: string[], e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    
    const allSelected = brandHotels.every(hotel => selectedHotels.includes(hotel))
    if (allSelected) {
      setSelectedHotels(prev => prev.filter(h => !brandHotels.includes(h)))
    } else {
      setSelectedHotels(prev => [...Array.from(new Set([...prev, ...brandHotels]))])
    }
  }

  // Add date change handler
  const handleDateChange = (newDate: Date | undefined) => {
    if (newDate) {
      setDate(newDate)
      // Here you can add any additional logic needed when the date changes
      // For example, fetching new data for the selected date
    }
  }

 

  // Sample metrics for producers by Market Group
  const producerMetrics = [
    {
      key: 'revenue',
      label: 'Revenue',
      prefix: '€',
      data: [
        { name: "Grand Hotel Berlin", value: 125000, change: 16500 },
        { name: "Luxury Resort Milan", value: 98000, change: 18000 },
        { name: "Boutique Paris", value: 85000, change: -7500 },
        { name: "City Lodge Amsterdam", value: 76000, change: 8000 },
        { name: "Beach Retreat Barcelona", value: 72000, change: -4000 },
      ]
    },
    {
      key: 'rooms',
      label: 'Rooms Sold',
      data: [
        { name: "Grand Hotel Berlin", value: 850, change: 110 },
        { name: "Luxury Resort Milan", value: 720, change: 150 },
        { name: "Boutique Paris", value: 580, change: -50 },
        { name: "City Lodge Amsterdam", value: 510, change: 60 },
        { name: "Beach Retreat Barcelona", value: 490, change: -35 },
      ]
    },
    {
      key: 'adr',
      label: 'ADR',
      prefix: '€',
      data: [
        { name: "Grand Hotel Berlin", value: 195, change: 15 },
        { name: "Luxury Resort Milan", value: 210, change: 22 },
        { name: "Boutique Paris", value: 185, change: -12 },
        { name: "City Lodge Amsterdam", value: 165, change: 8 },
        { name: "Beach Retreat Barcelona", value: 155, change: -6 },
      ]
    }
  ]

  // Sample distribution data
  const producersDistributionData = [
    { name: "Grand Hotel Berlin", value: 125000, percentage: 27.5, fill: "hsl(198, 85%, 45%)" },
    { name: "Luxury Resort Milan", value: 98000, percentage: 21.5, fill: "hsl(150, 60%, 40%)" },
    { name: "Boutique Paris", value: 85000, percentage: 18.7, fill: "hsl(280, 65%, 55%)" },
    { name: "City Lodge Amsterdam", value: 76000, percentage: 16.7, fill: "hsl(210, 80%, 50%)" },
    { name: "Beach Retreat Barcelona", value: 72000, percentage: 15.6, fill: "hsl(340, 70%, 50%)" },
  ]

  // Sample time series data
  const producersTimeSeriesData = [
    { 
      date: "January",
      categories: {
        berlin: { current: 125000, previous: 108500 },
        milan: { current: 98000, previous: 80000 },
        paris: { current: 85000, previous: 92500 }
      }
    },
    { 
      date: "February",
      categories: {
        berlin: { current: 127000, previous: 110000 },
        milan: { current: 99500, previous: 81500 },
        paris: { current: 83000, previous: 90000 }
      }
    },
    // Add more months as needed
  ]

  // Create analysis API params similar to what's in the overview page
  const analysisApiParams = {
    periodType: selectedTimeFrame,
    viewType: selectedViewType,
    comparison: selectedComparison, 
    businessDate: date.toISOString().split('T')[0],
    hotels: selectedHotels.join(',')
  };

  const metricOptions = [
    {
      label: "Revenue",
      key: "revenue",
      prefix: "$",
      data: []
    },
    {
      label: "Rooms Sold",
      key: "rooms",
      data: []
    },
    {
      label: "ADR",
      key: "adr",
      prefix: "$",
      data: []
    }
  ];

  // Add state for controlling the world map data - initialize as empty
  const [currentMapData, setCurrentMapData] = useState<Array<{ country: string, value: number }>>([]);

  // Subscribe to TopFiveUpgraded data update events
  useEffect(() => {
    // Subscribe to data updates from the 'top-countries' component
    const unsubscribeDataUpdated = eventBus.subscribe('topfive:top-countries:dataUpdated',
      (payload: { id: string; primaryGroup: string; metric: string; data: Array<{ name: string; value: number; code: string }> }) => {
        console.log('MarketSegments: Received dataUpdated event:', payload);
        if (payload.id === 'top-countries' && payload.data) {
          // Map the received data to the format WorldMap expects
          // IMPORTANT: Assumes payload.data items have a 'code' property (e.g., 'us', 'gb')
          const newMapData = payload.data.map(item => ({
            country: item.code, // Use the country code directly from the data item
            value: item.value
          })).filter(item => item.country); // Ensure items have a country code

          console.log('MarketSegments: Updating map data:', newMapData);
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
        {/* Header with Filters */}
        <div className="fixed top-0 left-[256px] right-0 z-30 flex justify-between items-center mb-6 bg-white py-6 px-12 border-b border-gray-300 shadow-sm">
          <div>
            <h2 className="text-xl font-bold text-gray-800 mb-1">Market Segments</h2>
            <span className='text-gray-400 font-ligth mt-3 pt-2 text-sm'>{`${selectedTimeFrame} ${selectedViewType}`}</span>
          </div>

          <div className="flex items-center space-x-8">
            {/* Combined Time Frame and View Type Dropdown */}
            <div className="flex flex-col">
              <span className="text-xs text-gray-500 mb-2">Selected period</span>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button 
                    variant="ghost" 
                    className="bg-[#f2f8ff] hover:bg-[#f2f8ff] text-[#342630] rounded-full px-4"
                  >
                    {`${selectedTimeFrame} ${selectedViewType}`} <TriangleDown className="ml-2" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-56">
                  {/* Day Group */}
                  <div className="px-2 py-2 text-sm font-semibold text-gray-800  border-b border-gray-300">
                    Day
                  </div>
                  <div className="p-1 text-gray-600">
                    <DropdownMenuItem onSelect={() => { setSelectedTimeFrame("Day"); setSelectedViewType("Actual"); }}>
                      Actual
                    </DropdownMenuItem>
                    <DropdownMenuItem onSelect={() => { setSelectedTimeFrame("Day"); setSelectedViewType("OTB"); }}>
                      OTB
                    </DropdownMenuItem>
                    <DropdownMenuItem onSelect={() => { setSelectedTimeFrame("Day"); setSelectedViewType("Projected"); }}>
                      Projected
                    </DropdownMenuItem>
                  </div>
                  
                  {/* Month Group */}
                  <div className="px-2 py-2 text-sm font-semibold text-gray-800  border-y border-gray-300">
                    Month
                  </div>
                  <div className="p-1 text-gray-600">
                    <DropdownMenuItem onSelect={() => { setSelectedTimeFrame("Month"); setSelectedViewType("Actual"); }}>
                      Actual
                    </DropdownMenuItem>
                    <DropdownMenuItem onSelect={() => { setSelectedTimeFrame("Month"); setSelectedViewType("OTB"); }}>
                      OTB
                    </DropdownMenuItem>
                    <DropdownMenuItem onSelect={() => { setSelectedTimeFrame("Month"); setSelectedViewType("Projected"); }}>
                      Projected
                    </DropdownMenuItem>
                  </div>
                  
                  {/* Year Group */}
                  <div className="px-2 py-2 text-sm font-semibold text-gray-800  border-y border-gray-300">
                    Year
                  </div>
                  <div className="p-1">
                    <DropdownMenuItem onSelect={() => { setSelectedTimeFrame("Year"); setSelectedViewType("Actual"); }}>
                      Actual
                    </DropdownMenuItem>
                    <DropdownMenuItem onSelect={() => { setSelectedTimeFrame("Year"); setSelectedViewType("OTB"); }}>
                      OTB
                    </DropdownMenuItem>
                    <DropdownMenuItem onSelect={() => { setSelectedTimeFrame("Year"); setSelectedViewType("Projected"); }}>
                      Projected
                    </DropdownMenuItem>
                  </div>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            {/* Comparison Dropdown with Label */}
            <div className="flex flex-col">
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
                  <DropdownMenuItem onSelect={() => setSelectedComparison("Last year - OTB")}>
                     Last year - OTB
                  </DropdownMenuItem>
                  <DropdownMenuItem onSelect={() => setSelectedComparison("Last year (match day of week) - OTB")}>
                     Last year (match day of week) - OTB
                  </DropdownMenuItem>
                  <DropdownMenuItem onSelect={() => setSelectedComparison("Last year - Actual")}>
                     Last year - Actual
                  </DropdownMenuItem>
                  <DropdownMenuItem onSelect={() => setSelectedComparison("Last year (match day of week) - Actual")}>
                     Last year (match day of week) - Actual
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
            
            {/* Date Picker with Label */}
            <div className="flex flex-col">
              <span className="text-xs text-gray-500 mb-2">Business date</span>
              <DatePicker 
                date={date} 
                onDateChange={handleDateChange}
              />
            </div>

            {/* Hotel Selector with Label */}
            <div className="flex flex-col">
              <span className="text-xs text-gray-500 mb-2">Property</span>
              <HotelSelector 
                selectedHotels={selectedHotels}
                setSelectedHotels={setSelectedHotels}
              />
            </div>

            {/* Export Button */}
            {/* <Button 
              variant="ghost" 
              className="flex items-center space-x-2 text-blue-600 mt-7"
            >
              <DownloadIcon className="h-4 w-4" />
              <span>Export to Excel</span>
            </Button> */}
          </div>
        </div>

        {/* Add the charts */}
        <div className="mt-[140px] px-12 py-0">
          {/* Use the correct URL pattern for CategoriesDetailsDialog */}
          <div className="mb-8">
            <CategoriesDetailsDialog
              isDialog={false}
              title="Market Segments Analysis"
              prefix="€"
              apiEndpoint="/api/market-segments/distribution"
              apiParams={{
                ...analysisApiParams,
                field: 'market_group_code',
                limit: '5'
              }}
            />
          </div>

          
          {/* Add the TopFiveMultiple component underneath */}
          <div className="mb-8 grid grid-cols-2 gap-6">
            <Card className="bg-white rounded-lg overflow-hidden">
              <CardContent className="p-0">
                <TopFiveUpgraded
                  title="Top Producers"
                  subtitle="By market group"
                  metrics={metricOptions}
                  apiEndpoint="/api/market-segments/distribution-upgraded"
                  apiParams={{
                    businessDate: date.toISOString().split('T')[0],
                    periodType: selectedTimeFrame,
                    viewType: selectedViewType,
                    comparison: selectedComparison
                  }}
                  primaryField="market_group_code"
                  secondaryField="producer"
                  color="blue"
                  withBorder={false}
                />
              </CardContent>
            </Card>
            
            <div className="bg-white rounded-lg shadow overflow-hidden">
              <HorizontalBarChartMultipleDatasetsUpgraded 
                title="Length of Stay by Market Group"
                datasetTitle="Length of Stay"
                apiEndpoint="/api/market-segments/length-of-stay"
                apiParams={{
                  businessDate: date.toISOString().split('T')[0],
                  periodType: selectedTimeFrame,
                  viewType: selectedViewType,
                  comparison: selectedComparison
                }}
                defaultDataset="length_of_stay"
                defaultCategory="ALL"
                sort={true}
                leftMargin={10}
              />
            </div>
          </div>
          
          {/* Add the new World Map with TopFiveMultiple component in a new row */}
          <div className="mt-8">
            <Card className="bg-white rounded-lg overflow-hidden">
              <CardHeader className="flex flex-col items-start">
                <div className="flex w-full justify-between items-center">
                  <div>
                    <CardTitle className="text-lg font-semibold text-gray-800 mb-3">Global Distribution by Market Group</CardTitle>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-8">
                  {/* World Map Side */}
                  <div>
                    <div className="h-[500px] flex justify-center items-center">
                      {/* Ensure WorldMap receives the updated currentMapData */}
                      {currentMapData.length > 0 ? (
                        <WorldMap
                          color="rgb(59, 130, 246)"
                          title=""
                          valueSuffix="€" // Adjust suffix based on actual metric if needed
                          size="xl"
                          data={currentMapData}
                          tooltipBgColor="black"
                          tooltipTextColor="white"
                          richInteraction={true}
                        />
                      ) : (
                        <div className="text-gray-500">Select data to display on map</div>
                      )}
                    </div>
                    <div className="flex justify-center mt-4">
                      <div className="flex items-center space-x-8">
                        <div className="flex items-center">
                          <div className="w-24 h-3 bg-gradient-to-r from-blue-100 to-blue-600"></div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <span className="text-sm text-gray-500">Lower</span>
                          <span className="text-sm text-gray-500">-</span>
                          <span className="text-sm text-gray-500">Higher Revenue</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Top Five by Country Side - ensure 'id' is set */}
                  <div className="border-l border-gray-100 pl-8">
                    <TopFiveUpgraded
                      id="top-countries" // This ID is crucial for the event subscription
                      title="Top Countries"
                      subtitle="by Market Group"
                      metrics={metricOptions} // Pass the metric options config
                      apiEndpoint="/api/market-segments/distribution-upgraded"
                      apiParams={{
                        // ... existing apiParams ...
                        // businessDate: date.toISOString().split('T')[0], // Already included in analysisApiParams spread below? Check usage.
                        periodType: selectedTimeFrame,
                        viewType: selectedViewType,
                        comparison: selectedComparison,
                        // Add hotels if needed by this endpoint
                        // hotels: selectedHotels.join(',')
                      }}
                      primaryField="market_group_code"
                      secondaryField="guest_country"
                      defaultPrimaryValue="ALL" // Or fetch the first available one
                      color="blue"
                      withBorder={false}
                      // Remove props related to hardcoded data
                      // distributionData={...} // REMOVE
                      // categoryTimeSeriesData={...} // REMOVE
                      // chartConfig={...} // REMOVE
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Add this section at the bottom of the return statement before the final closing div */}
        <div className="mt-8 px-12 pb-12 grid grid-cols-2 gap-6">
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <HorizontalBarChartMultipleDatasetsUpgraded 
              title="Lead Times by Market Group"
              datasetTitle="Lead Times"
              apiEndpoint="/api/market-segments/lead-times"
              apiParams={{
                businessDate: date.toISOString().split('T')[0],
                periodType: selectedTimeFrame,
                viewType: selectedViewType,
                comparison: selectedComparison
              }}
              defaultDataset="cancellation_lead_time"
              defaultCategory="ALL"
              sort={true}
              leftMargin={-5}
              orientation="horizontal"
            />
          </div>
          <div className="bg-white rounded-lg shadow overflow-hidden">
          <HorizontalBarChartMultipleDatasetsUpgraded 
              title="Reservation Trends (DOW)"
              datasetTitle="Reservation Trends (DOW)"
              apiEndpoint="/api/market-segments/reservation-trends"
              apiParams={{
                businessDate: date.toISOString().split('T')[0],
                periodType: selectedTimeFrame,
                viewType: selectedViewType,
                comparison: selectedComparison
              }}
              defaultDataset="occupancyByDayOfWeek"
              leftMargin={20}
              defaultCategory="ALL"
              orientation="vertical"
            />
          </div>
        </div>
    </div>
  )
} 