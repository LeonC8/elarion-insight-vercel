"use client"

import { useState, useRef, useEffect } from 'react'
import {
  DropdownMenu,
  DropdownMenuContent,  
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { 
  CalendarIcon, 
  ChevronDownIcon, 
  DollarSignIcon, 
  UtensilsIcon, 
  TrendingUpIcon, 
  PercentIcon, 
  BarChartIcon, 
  LineChartIcon,
  PieChartIcon,
  Check,
  DownloadIcon,
  BedDoubleIcon,
} from 'lucide-react'
import { CustomDialog } from '../NumericalCardDetails'
import { DetailedDialog } from '../GraphCardDetails'
import { Calendar } from "@/components/ui/calendar"
import { format } from "date-fns"
import * as XLSX from 'xlsx'
import { ResponsivePie } from '@nivo/pie'
import { ResponsiveBar } from '@nivo/bar'
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts'

// Add the COLORS constant
const COLORS = ['rgba(59, 130, 246, 0.5)', 'rgba(34, 197, 94, 0.5)', 'rgba(234, 179, 8, 0.5)', 'rgba(239, 68, 68, 0.5)']

// Add the graph data constants
const marketSegments = [
  { id: "Personal", value: 450000 },
  { id: "Business", value: 350000 },
  { id: "Corporate", value: 280000 },
  { id: "Government", value: 150000 },
  { id: "Other", value: 70000 },
]

const roomTypes = [
  { id: "Standard", value: 300000 },
  { id: "Deluxe", value: 250000 },
  { id: "Suite", value: 180000 },
  { id: "Executive", value: 120000 },
  { id: "Family", value: 90000 },
]

const bookingChannels = [
  { id: "Direct", value: 280000 },
  { id: "OTA", value: 350000 },
  { id: "Travel Agent", value: 180000 },
  { id: "Corporate", value: 90000 },
  { id: "Wholesaler", value: 60000 },
]

const geoSources = [
  { id: "Domestic", value: 520000 },
  { id: "Europe", value: 180000 },
  { id: "Asia", value: 130000 },
  { id: "North America", value: 100000 },
  { id: "Other", value: 70000 },
]

// Add the theme constant
const modernTheme = {
  fontFamily: "'Geist Sans', sans-serif",
  fontSize: 11,
  text: {
    fontFamily: "'Geist Sans', sans-serif",
    fontSize: 11,
    fontWeight: 500,
    letterSpacing: 0.15,
    fill: '#7d8694'
  },
  labels: {
    text: {
      fontFamily: "'Geist Sans', sans-serif",
      fontSize: 11,
      fontWeight: 500,
      letterSpacing: 0.15,
      fill: '#7d8694'
    }
  },
  axis: {
    legend: {
      text: {
        fontFamily: "'Geist Sans', sans-serif",
        fontSize: 11,
        fontWeight: 500,
        letterSpacing: 0.15,
        fill: '#7d8694'
      }
    },
    ticks: {
      text: {
        fontFamily: "'Geist Sans', sans-serif",
        fontSize: 11,
        fontWeight: 500,
        fill: '#7d8694'
      }
    }
  },
  legends: {
    text: {
      fontFamily: "'Geist Sans', sans-serif",
      fontSize: 11,
      fontWeight: 400,
      fill: '#7d8694'
    }
  }
}

// Add helper functions
function generateComparisonData(originalData: Array<{ id: string; value: number }>) {
  return originalData.map(item => {
    const changePercentage = (Math.random() * 0.4) - 0.2;
    const newValue = Math.round(item.value * (1 + changePercentage));
    return {
      id: item.id,
      value: Math.max(0, newValue)
    };
  });
}

const getYAxisTickValues = (data: Array<{ id: string; value: number }>) => {
  const maxValue = Math.max(...data.map(d => d.value));
  const roundedMax = Math.ceil(maxValue / 100000) * 100000;
  const step = roundedMax / 5;
  return Array.from({ length: 6 }, (_, i) => i * step);
};

const getDisplayTimeframe = (timeframe: string, forExcel: boolean = false) => {
  if (timeframe.includes('-')) {
    if (forExcel) {
      return timeframe;
    }
    return "Custom period";
  }
  return timeframe;
};

// Types
type TimeframeOption = {
  label: string;
  type: 'dropdown' | 'calendar';
  options?: {
    value: string;
    label: string;
  }[];
  onClick?: () => void;
};

interface NumericalDataItem {
  title: string;
  value: string | number;
  change: number;
  comparisonValue?: string | number;
  icon: React.ElementType;
}

type DateRange = {
  from: Date | undefined;
  to: Date | undefined;
};

// Data
const numericalData: NumericalDataItem[] = [
  { title: "Sold Rooms", value: 150, change: 5.2, comparisonValue: 142, icon: BedDoubleIcon },
  { title: "Total Revenue", value: "$35,000", change: 3.8, comparisonValue: "$33,700", icon: DollarSignIcon },
  { title: "Rooms Revenue", value: "$25,000", change: 4.5, comparisonValue: "$23,900", icon: DollarSignIcon },
  { title: "F&B Revenue", value: "$10,000", change: 2.1, comparisonValue: "$9,800", icon: UtensilsIcon },
  { title: "ADR", value: "$166.67", change: 3.8, comparisonValue: "$160.56", icon: TrendingUpIcon },
  { title: "Occupancy", value: "75%", change: 1.5, comparisonValue: "73.8%", icon: PercentIcon },
  { title: "RevPAR", value: "$125.00", change: 2.3, comparisonValue: "$122.19", icon: BarChartIcon },
  { title: "TrevPAR", value: "$180.00", change: 1.8, comparisonValue: "$176.82", icon: LineChartIcon },
];

// Add after imports

interface ChartData {
  date: string;
  rooms?: number;
  revenue?: number;
  roomsRevenue?: number;
  fbRevenue?: number;
  comparisonRooms?: number;
  comparisonRevenue?: number;
  comparisonRoomsRevenue?: number;
  comparisonFbRevenue?: number;
}

const roomsData: ChartData[] = [
  { date: '2023-01', rooms: 150, revenue: 35000, roomsRevenue: 25000, fbRevenue: 10000 },
  { date: '2023-02', rooms: 160, revenue: 37000, roomsRevenue: 26000, fbRevenue: 11000 },
  { date: '2023-03', rooms: 175, revenue: 40000, roomsRevenue: 28000, fbRevenue: 12000 },
  { date: '2023-04', rooms: 155, revenue: 36000, roomsRevenue: 25500, fbRevenue: 10500 },
  { date: '2023-05', rooms: 170, revenue: 39000, roomsRevenue: 27500, fbRevenue: 11500 },
  { date: '2023-06', rooms: 180, revenue: 42000, roomsRevenue: 29500, fbRevenue: 12500 },
];

// Add this function after the existing helper functions
const generateLineChartComparisonData = (data: ChartData[]): ChartData[] => {
  return data.map(item => ({
    ...item,
    comparisonRooms: item.rooms ? Math.round(item.rooms * (1 + (Math.random() - 0.5) * 0.4)) : undefined,
    comparisonRevenue: item.revenue ? Math.round(item.revenue * (1 + (Math.random() - 0.5) * 0.4)) : undefined,
    comparisonRoomsRevenue: item.roomsRevenue ? Math.round(item.roomsRevenue * (1 + (Math.random() - 0.5) * 0.4)) : undefined,
    comparisonFbRevenue: item.fbRevenue ? Math.round(item.fbRevenue * (1 + (Math.random() - 0.5) * 0.4)) : undefined,
  }));
};

// Add this helper function after other helper functions
const formatCurrency = (value: number): string => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

export function PaceDashboard() {
  const [selectedHotels, setSelectedHotels] = useState<string[]>(["Hotel 1"])
  const allHotels = ["Hotel 1", "Hotel 2", "Hotel 3"]
  const [selectedCard, setSelectedCard] = useState<string | null>(null)
  const [selectedTimeframe, setSelectedTimeframe] = useState("OTB")
  const [comparisonType, setComparisonType] = useState<'Last year' | 'Budget' | 'No comparison'>('Last year')
  const [pieChartData, setPieChartData] = useState<Array<{ id: string; value: number }> | undefined>(undefined)
  const [comparisonPieChartData, setComparisonPieChartData] = useState<Array<{ id: string; value: number }> | undefined>(undefined)

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

  const closeDialog = () => {
    setSelectedCard(null)
    setPieChartData(undefined)
    setComparisonPieChartData(undefined)
  }

  // Add this state to control calendar visibility
  const [isCalendarVisible, setIsCalendarVisible] = useState(false);

  // Add this state to control the temporary date range
  const [tempDateRange, setTempDateRange] = useState<DateRange | undefined>(undefined);

  // Replace the timeframeOptions with a simpler version
  const timeframeOptions = [
    { value: "Month", label: "Month view" },
    { value: "Year", label: "Year view" },
  ];

  const handleTimeframeSelect = (value: string) => {
    setSelectedTimeframe(value);
    setIsCalendarVisible(false);
  };

  const handleDateRangeSelect = (range: DateRange | undefined) => {
    setTempDateRange(range);
  };

  const dropdownRef = useRef<HTMLDivElement | null>(null);

  const applyDateRange = () => {
    if (tempDateRange?.from && tempDateRange?.to) {
      setDateRange(tempDateRange);
      const formattedRange = `${format(tempDateRange.from, 'dd MMM yyyy')} - ${format(tempDateRange.to, 'dd MMM yyyy')}`;
      setSelectedTimeframe(formattedRange);
      setIsCalendarVisible(true);
      if (dropdownRef.current) {
        dropdownRef.current.click();
      }
    }
  };

  const hideCalendar = () => {
    setIsCalendarVisible(false);
  };

  // Add new state variables for graph displays
  const [chartTypes, setChartTypes] = useState<Record<string, 'pie' | 'bar'>>({
    marketSegments: 'bar',
    roomTypes: 'bar',
    bookingChannels: 'bar',
    geoSources: 'bar',
  })
  const [selectedDetailedChart, setSelectedDetailedChart] = useState<string | null>(null)
  const [selectedPieView, setSelectedPieView] = useState<Record<string, 'current' | 'comparison'>>({
    marketSegments: 'current',
    roomTypes: 'current',
    bookingChannels: 'current',
    geoSources: 'current',
  })

  // Add renderChart function
  const renderChart = (data: Array<{ id: string; value: number }>, title: string, filterKey: string) => {
    const chartType = chartTypes[filterKey]
    const comparisonData = generateComparisonData(data)
    const pieView = selectedPieView[filterKey]

    const toggleChartType = () => {
      setChartTypes(prev => ({
        ...prev,
        [filterKey]: chartType === 'pie' ? 'bar' : 'pie'
      }))
    }

    const togglePieView = (view: 'current' | 'comparison') => {
      setSelectedPieView(prev => ({
        ...prev,
        [filterKey]: view
      }))
    }

    return (
      <Card className="bg-white shadow-lg rounded-lg overflow-hidden flex flex-col">
        <CardHeader className="flex flex-col items-start">
          <div className="flex w-full justify-between items-center">
            <div>
              <CardTitle className="text-lg font-semibold text-gray-800">{title}</CardTitle>
            </div>
            <div className="flex items-center space-x-2">
              <button
                className={`text-sm px-3 py-1 rounded-full flex items-center transition-colors ${
                  chartType === 'bar' 
                    ? 'bg-blue-100 text-blue-600' 
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
                onClick={toggleChartType}
              >
                <BarChartIcon className="w-4 h-4 mr-1" />
                Bar
              </button>
              <button
                className={`text-sm px-3 py-1 rounded-full flex items-center transition-colors ${
                  chartType === 'pie' 
                    ? 'bg-blue-100 text-blue-600' 
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
                onClick={toggleChartType}
              >
                <PieChartIcon className="w-4 h-4 mr-1" />
                Pie
              </button>
            </div>
          </div>
          {chartType === 'pie' && comparisonType !== 'No comparison' && (
            <div className="flex w-full mt-4 border-b">
              <button 
                className={`px-4 py-2 ${
                  pieView === 'current'
                    ? 'border-b-2 border-blue-500 text-blue-600 text-sm'
                    : 'text-gray-500 text-sm '
                }`}
                onClick={() => togglePieView('current')}
              >
                {getDisplayTimeframe(selectedTimeframe)}
              </button>
              <button
                className={`px-4 py-2 ${
                  pieView === 'comparison'
                    ? 'border-b-2 border-blue-500 text-sm text-blue-600'
                    : 'text-gray-500 text-sm'
                }`}
                onClick={() => togglePieView('comparison')}
              >
                {getDisplayTimeframe(selectedTimeframe)} {comparisonType === 'Last year' ? 'STLY' : 'Budget'}
              </button>
            </div>
          )}
        </CardHeader>
        <CardContent className="flex-grow pb-2">
          <div style={{ height: chartType === 'pie' ? 250 : 300 }}>
            {chartType === 'pie' ? (
              <ResponsivePie
                data={pieView === 'current' ? data : comparisonData}
                margin={{ top: 50, right: 80, bottom: 20, left: 80 }}
                innerRadius={0.5}
                padAngle={0.7}
                cornerRadius={3}
                activeOuterRadiusOffset={8}
                colors={COLORS}
                borderWidth={1}
                borderColor={{ from: 'color', modifiers: [['darker', 0.2]] }}
                arcLinkLabelsSkipAngle={10}
                arcLinkLabelsTextColor="#666666"
                arcLinkLabelsThickness={2}
                arcLinkLabelsColor={{ from: 'color' }}
                arcLabelsSkipAngle={10}
                arcLabelsTextColor={{ from: 'color', modifiers: [['darker', 2]] }}
                arcLabel={d => `${Math.round((d.value / data.reduce((sum, item) => sum + item.value, 0)) * 100)}%`}
                theme={modernTheme}
              />
            ) : (
              <ResponsiveBar
                data={data.map((item, index) => ({
                  ...item,
                  comparisonValue: comparisonType !== 'No comparison' ? comparisonData[index].value : undefined
                }))}
                keys={comparisonType !== 'No comparison' ? ['value', 'comparisonValue'] : ['value']}
                indexBy="id"
                margin={{ 
                  top: 50,
                  right: 20, 
                  bottom: comparisonType !== 'No comparison' ? 80 : 40,
                  left: 50
                }}
                padding={0.2}
                colors={({ id }) => COLORS[id === 'value' ? 0 : 1]}
                borderColor={{ from: 'color', modifiers: [['darker', 1.6]] }}
                axisBottom={{
                  tickSize: 5,
                  tickPadding: 10,
                  tickRotation: 0,
                  legend: undefined,
                  legendPosition: 'middle',
                  legendOffset: 32
                }}
                axisLeft={{
                  tickSize: 5,
                  tickPadding: 10,
                  tickRotation: 0,
                  legend: '',
                  legendPosition: 'middle',
                  legendOffset: -50,
                  format: (value) => `€${value / 1000}K`,
                  tickValues: getYAxisTickValues(data),
                  renderTick: (tick) => {
                    return (
                      <g transform={`translate(${tick.x},${tick.y})`}>
                        <line x2="-6" y2="0" stroke="#e5e7eb" />
                        <text
                          x="-12"
                          y="0"
                          dy="0.32em"
                          textAnchor="end"
                          fontFamily="'Geist Sans', sans-serif"
                          fontSize="11px"
                          fill="#7d8694"
                        >
                          {tick.value === 0 ? '€0' : `€${tick.value / 1000}K`}
                        </text>
                      </g>
                    );
                  }
                }}
                gridYValues={getYAxisTickValues(data)}
                labelSkipWidth={12}
                labelSkipHeight={12}
                enableLabel={comparisonType === 'No comparison'}
                label={d => `€${(d.value || 0).toLocaleString()}`}
                labelTextColor={{ from: 'color', modifiers: [['darker', 1.6]] }}
                animate={true}
                theme={modernTheme}
                groupMode={comparisonType !== 'No comparison' ? "grouped" : "stacked"}
                legends={comparisonType !== 'No comparison' ? [
                  {
                    dataFrom: 'keys',
                    anchor: 'bottom',
                    direction: 'row',
                    justify: false,
                    translateX: 0,
                    translateY: 80,
                    itemsSpacing: 20,
                    itemWidth: 80,
                    itemHeight: 20,
                    itemDirection: 'left-to-right',
                    itemOpacity: 1,
                    symbolSize: 12,
                    symbolShape: 'circle',
                    effects: [],
                    data: [
                      { id: 'value', label: getDisplayTimeframe(selectedTimeframe), color: COLORS[0] },
                      { id: 'comparisonValue', label: `${getDisplayTimeframe(selectedTimeframe)} ${comparisonType === 'Last year' ? 'STLY' : 'Budget'}`, color: COLORS[1] }
                    ]
                  }
                ] : []}
                tooltip={({ id, value, color }) => (
                  <div
                    style={{
                      padding: 12,
                      background: '#ffffff',
                      color: '#333333',
                      border: '1px solid #ccc',
                      borderRadius: '4px',
                    }}
                  >
                    <strong>{id}</strong>
                    <br />
                    <span style={{ color }}>€{(value || 0).toLocaleString()}</span>
                  </div>
                )}
              />
            )}
          </div>
        </CardContent>
        {/* <div className="px-6 py-4">
          <hr className="border-t border-gray-200 mb-4" />
          <div className="flex justify-end">
            <button
              className="text-blue-600 hover:text-blue-800 font-medium text-sm focus:outline-none"
              onClick={() => setSelectedDetailedChart(filterKey)}
            >
              View Details
            </button>
          </div>
        </div> */}
      </Card>
    )
  }

  // Add inside OverviewDashboard component, with other state declarations
  const [combinedRoomsData, setCombinedRoomsData] = useState<ChartData[]>([]);

  // Update the roomsData for both month and year views
  const monthData: ChartData[] = [
    { date: '2024-03-01', rooms: 150, revenue: 35000, roomsRevenue: 25000, fbRevenue: 10000 },
    { date: '2024-03-05', rooms: 160, revenue: 37000, roomsRevenue: 26000, fbRevenue: 11000 },
    { date: '2024-03-10', rooms: 175, revenue: 40000, roomsRevenue: 28000, fbRevenue: 12000 },
    { date: '2024-03-15', rooms: 155, revenue: 36000, roomsRevenue: 25500, fbRevenue: 10500 },
    { date: '2024-03-20', rooms: 170, revenue: 39000, roomsRevenue: 27500, fbRevenue: 11500 },
    { date: '2024-03-25', rooms: 180, revenue: 42000, roomsRevenue: 29500, fbRevenue: 12500 },
  ];

  const yearData: ChartData[] = [
    { date: '2024-01', rooms: 150, revenue: 35000, roomsRevenue: 25000, fbRevenue: 10000 },
    { date: '2024-02', rooms: 160, revenue: 37000, roomsRevenue: 26000, fbRevenue: 11000 },
    { date: '2024-03', rooms: 175, revenue: 40000, roomsRevenue: 28000, fbRevenue: 12000 },
    { date: '2024-04', rooms: 155, revenue: 36000, roomsRevenue: 25500, fbRevenue: 10500 },
    { date: '2024-05', rooms: 170, revenue: 39000, roomsRevenue: 27500, fbRevenue: 11500 },
    { date: '2024-06', rooms: 180, revenue: 42000, roomsRevenue: 29500, fbRevenue: 12500 },
  ];

  // Update the useEffect to handle different data based on view
  useEffect(() => {
    const data = selectedTimeframe === "Month" ? monthData : yearData;
    setCombinedRoomsData(generateLineChartComparisonData(data));
  }, [selectedTimeframe]);

  // Add inside OverviewDashboard component, after other render functions
  const renderAreaChart = (data: ChartData[], title: string, dataKey: string, comparisonDataKey: string, color: string, comparisonColor: string, showSelector: boolean) => (
    <Card className="bg-white shadow-lg rounded-lg overflow-hidden">
      <CardHeader className="flex flex-col items-start">
        <div className="flex w-full justify-between items-center">
          <div>
            <CardTitle className="text-lg font-semibold text-gray-800">{title}</CardTitle>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div style={{ height: 300 }}>
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart
              data={data}
              margin={{ top: 20, right: 30, left: 0, bottom: comparisonType !== 'No comparison' ? 40 : 20 }}
            >
              <CartesianGrid horizontal={true} vertical={false} />
              <XAxis
                dataKey="date"
                axisLine={false}
                tickLine={false}
                tick={{ dy: 15, fontSize: 11, fill: "#999", fontWeight: 500 }}
              />
              <YAxis
                domain={[0, 'dataMax']}
                axisLine={false}
                tickLine={false}
                tick={{ dx: -15, fontSize: 11, fill: "#999", fontWeight: 500 }}
                tickFormatter={(value) => 
                  dataKey.includes('revenue') || dataKey.includes('Revenue') 
                    ? `€${value.toLocaleString()}`
                    : value.toString()
                }
              />
              <Tooltip 
                formatter={(value: number, name: string) => {
                  const isRevenue = name.toLowerCase().includes('revenue');
                  return [
                    isRevenue ? `€${value.toLocaleString()}` : value.toString(),
                    name.includes('comparison') ? `Comparison ${name}` : name
                  ];
                }}
              />
              {comparisonType === 'No comparison' ? (
                <Area 
                  type="monotone"
                  dataKey={dataKey}
                  stroke={color}
                  strokeWidth={2}
                  fill={color}
                  fillOpacity={0.1}
                  dot={false}
                  activeDot={{ r: 8 }}
                />
              ) : (
                <>
                  <Area 
                    type="monotone"
                    dataKey={dataKey}
                    stroke={color}
                    strokeWidth={2}
                    fill="none"
                    dot={false}
                    activeDot={{ r: 8 }}
                  />
                  <Area 
                    type="monotone"
                    dataKey={comparisonDataKey}
                    stroke={comparisonColor}
                    strokeWidth={2}
                    fill="none"
                    dot={false}
                    activeDot={{ r: 8 }}
                  />
                </>
              )}
            </AreaChart>
          </ResponsiveContainer>
        </div>
        {comparisonType !== 'No comparison' && (
          <div className="flex justify-center mt-4">
            <div className="flex items-center space-x-8">
              <div className="flex items-center">
                <div className="w-3 h-3 rounded-full mr-2" style={{ backgroundColor: color }}></div>
                <span className="text-sm text-gray-500">
                  {selectedTimeframe === "Month" 
                    ? `March - 2024` 
                    : '2024'}
                </span>
              </div>
              <div className="flex items-center">
                <div className="w-3 h-3 rounded-full mr-2" style={{ backgroundColor: comparisonColor }}></div>
                <span className="text-sm text-gray-500">
                  {selectedTimeframe === "Month"
                    ? `March - 2023`
                    : '2023'}
                </span>
              </div>
            </div>
          </div>
        )}
      </CardContent>
        {/* <div className="px-6 py-4">
          <hr className="border-t border-gray-200 mb-4" />
          <div className="flex justify-end">
            <button
              className="text-blue-600 hover:text-blue-800 font-medium text-sm focus:outline-none"
              onClick={() => {
                if (title === "Cancellations") {
                  const formattedData = data.map(item => ({
                    date: item.date,
                    value: cancellationMetric === 'cancellations' ? item.cancellations : item.revenueLost,
                    comparison: cancellationMetric === 'cancellations' ? item.comparisonCancellations : item.comparisonRevenueLost,
                  }));
                  setSelectedMetricCard({
                    title: cancellationMetric === 'cancellations' ? 'Number of Cancellations' : 'Revenue Lost from Cancellations',
                    data: formattedData
                  });
                } else if (title === "No-Shows") {
                  const formattedData = data.map(item => ({
                    date: item.date,
                    value: item.noShows,
                    comparison: item.comparisonNoShows,
                  }));
                  setSelectedMetricCard({
                    title: 'Number of No-Shows',
                    data: formattedData
                  });
                }
              }}
            >
              View Details
            </button>
          </div>
        </div> */}
    </Card>
  );

  // First, add these new state variables near the top of the OverviewDashboard component
  const [selectedMetricCard, setSelectedMetricCard] = useState<string | null>(null);

  // Add the new CustomDialog for metrics near the end of the component, alongside the existing dialogs
  return (
    <div className="flex-1 overflow-auto">
      <div className="p-8">

        {/* Header */}
        <div className="flex justify-between items-center mb-6">  
          <div className="flex items-center">
            <h2 className="text-3xl font-bold text-gray-800">Overview</h2>
          </div>
          <div className="flex space-x-4 items-center">
            <Button 
              variant="ghost" 
              
              className="flex items-center space-x-2 text-blue-600"
            >
              <DownloadIcon className="h-4 w-4" />
              <span>Export to Excel</span>
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline">
                  {selectedHotels.length === 1 ? selectedHotels[0] : `${selectedHotels.length} Hotels`} <ChevronDownIcon className="ml-2 h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuItem onSelect={toggleAllHotels}>
                  <div className="flex items-center">
                    <div className={`mr-2 h-4 w-4 border rounded-sm flex items-center justify-center ${selectedHotels.length === allHotels.length ? 'bg-primary border-primary' : 'border-input'}`}>
                      {selectedHotels.length === allHotels.length && <Check className="h-3 w-3 text-primary-foreground" />}
                    </div>
                    Select All
                  </div>
                </DropdownMenuItem>
                {allHotels.map((hotel) => (
                  <DropdownMenuItem key={hotel} onSelect={() => toggleHotel(hotel)}>
                    <div className="flex items-center">
                      <div className={`mr-2 h-4 w-4 border rounded-sm flex items-center justify-center ${selectedHotels.includes(hotel) ? 'bg-primary border-primary' : 'border-input'}`}>
                        {selectedHotels.includes(hotel) && <Check className="h-3 w-3 text-primary-foreground" />}
                      </div>
                      {hotel}
                    </div>  
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
                
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline">
                  {selectedTimeframe === "Month" ? "Month view" : "Year view"} <ChevronDownIcon className="ml-2 h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                {timeframeOptions.map((option) => (
                  <DropdownMenuItem 
                    key={option.value} 
                    onSelect={() => handleTimeframeSelect(option.value)}
                  >
                    {option.label}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline">
                  Compare with: {comparisonType} <ChevronDownIcon className="ml-2 h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuItem onSelect={() => setComparisonType('Last year')}>
                  Last year
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={() => setComparisonType('Budget')}>
                  Budget
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={() => setComparisonType('No comparison')}>
                  No comparison
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        

        {/* Line Charts */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-8">
          {renderAreaChart(
            combinedRoomsData, 
            "Number of Rooms", 
            "rooms", 
            "comparisonRooms",
            "#60a5fa", 
            "#82ca9d", 
            false
          )}
          {renderAreaChart(
            combinedRoomsData, 
            "Total Revenue", 
            "revenue", 
            "comparisonRevenue",  
            "#60a5fa", 
            "#82ca9d", 
            false
          )}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
          {renderAreaChart(
            combinedRoomsData, 
            "Rooms Revenue", 
            "roomsRevenue", 
            "comparisonRoomsRevenue",
            "#60a5fa", 
            "#82ca9d", 
            false
          )}
          {renderAreaChart(
            combinedRoomsData, 
            "F&B Revenue", 
            "fbRevenue", 
            "comparisonFbRevenue", 
            "#60a5fa", 
            "#82ca9d", 
            false
          )}
        </div>
      </div>

      {/* Custom Dialog */}
      <CustomDialog
        selectedCard={selectedCard}
        closeDialog={closeDialog}
        selectedTimeframe={selectedTimeframe}
        comparisonType={comparisonType}
        pieChartData={pieChartData}
        comparisonPieChartData={comparisonPieChartData}
      />

      {/* Custom Dialog for Metrics */}
      <CustomDialog
        selectedCard={selectedMetricCard?.title || null}
        closeDialog={() => setSelectedMetricCard(null)}
        selectedTimeframe={selectedTimeframe}
        comparisonType={comparisonType}
        customData={selectedMetricCard?.data}
      />

      {/* Add DetailedDialog */}
      {selectedDetailedChart && (
        <DetailedDialog
          title={selectedDetailedChart.replace(/([A-Z])/g, ' $1').trim().replace(/^\w/, c => c.toUpperCase())}
          subtitle={`${getDisplayTimeframe(selectedTimeframe)} vs ${getDisplayTimeframe(selectedTimeframe)} ${comparisonType === 'Last year' ? 'STLY' : 'Budget'}`}
          closeDialog={() => setSelectedDetailedChart(null)}
          selectedData={
            selectedDetailedChart === 'marketSegments' ? marketSegments :
            selectedDetailedChart === 'roomTypes' ? roomTypes :
            selectedDetailedChart === 'bookingChannels' ? bookingChannels :
            geoSources
          }
          comparisonData={generateComparisonData(
            selectedDetailedChart === 'marketSegments' ? marketSegments :
            selectedDetailedChart === 'roomTypes' ? roomTypes :
            selectedDetailedChart === 'bookingChannels' ? bookingChannels :
            geoSources
          )}
        />
      )}

    </div>
  )
}
