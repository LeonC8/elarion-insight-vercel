import React, { useState, useEffect } from 'react'
import { Card, CardHeader, CardContent, CardTitle } from "@/components/ui/card"
import { ResponsiveContainer, ComposedChart, CartesianGrid, XAxis, YAxis, Bar, Line, Tooltip } from 'recharts'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { ArrowUpIcon, ArrowDownIcon } from 'lucide-react'
import { format, getDaysInMonth, subYears } from 'date-fns'

// Define data series for tracking active state
const dataSeriesConfig = {
  revenue: { name: "Revenue", color: "#18b0cc" },
  roomsSold: { name: "Rooms Sold", color: "#3b56de" },
  adr: { name: "ADR", color: "#e11d48" }
};

// Define types for our data
interface PacingDataItem {
  id: string;
  date: Date;
  revenue: number;
  roomsSold: number;
  adr: number;
  lastYearRevenue: number;
  lastYearRoomsSold: number;
  lastYearAdr: number;
}

// Generate dummy data for month view (days of current month)
const generateMonthData = (): PacingDataItem[] => {
  const today = new Date();
  const daysInMonth = getDaysInMonth(today);
  const currentMonth = today.getMonth();
  const currentYear = today.getFullYear();
  
  return Array.from({ length: daysInMonth }, (_, i) => {
    const day = i + 1;
    const date = new Date(currentYear, currentMonth, day);
    
    // Only include days up to today
    if (date > today) {
      return null;
    }
    
    // Base values with some randomness
    const baseRevenue = 4000 + Math.random() * 2000;
    const baseRoomsSold = 25 + Math.random() * 15;
    
    // Add some patterns - higher on weekends, mid-month peak
    const dayOfWeek = date.getDay();
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
    const midMonthFactor = 1 + Math.sin((day / daysInMonth) * Math.PI) * 0.3;
    
    const revenueFactor = midMonthFactor * (isWeekend ? 1.3 : 1);
    const roomsFactor = midMonthFactor * (isWeekend ? 1.2 : 1);
    
    const revenue = Math.round(baseRevenue * revenueFactor);
    const roomsSold = Math.round(baseRoomsSold * roomsFactor);
    const adr = Math.round(revenue / roomsSold);
    
    // Last year data with some variation
    const lastYearRevenue = Math.round(revenue * (0.85 + Math.random() * 0.2));
    const lastYearRoomsSold = Math.round(roomsSold * (0.85 + Math.random() * 0.2));
    const lastYearAdr = Math.round(lastYearRevenue / lastYearRoomsSold);
    
    return {
      id: `Day ${day}`,
      date,
      revenue,
      roomsSold,
      adr,
      lastYearRevenue,
      lastYearRoomsSold,
      lastYearAdr
    };
  }).filter(Boolean) as PacingDataItem[];
};

// Generate dummy data for year view (months of current year)
const generateYearData = (): PacingDataItem[] => {
  const today = new Date();
  const currentMonth = today.getMonth();
  const currentYear = today.getFullYear();
  
  return Array.from({ length: 12 }, (_, i) => {
    // Only include months up to current month
    if (i > currentMonth) {
      return null;
    }
    
    const date = new Date(currentYear, i, 15);
    
    // Base values with seasonal patterns
    const seasonalFactor = 1 + 0.3 * Math.sin((i / 11) * Math.PI * 2 - Math.PI / 2);
    
    const baseRevenue = 120000 * seasonalFactor;
    const baseRoomsSold = 750 * seasonalFactor;
    
    // Add some randomness
    const randomFactor = 0.9 + Math.random() * 0.2;
    
    const revenue = Math.round(baseRevenue * randomFactor);
    const roomsSold = Math.round(baseRoomsSold * randomFactor);
    const adr = Math.round(revenue / roomsSold);
    
    // Last year data with some variation
    const lastYearRevenue = Math.round(revenue * (0.85 + Math.random() * 0.2));
    const lastYearRoomsSold = Math.round(roomsSold * (0.85 + Math.random() * 0.2));
    const lastYearAdr = Math.round(lastYearRevenue / lastYearRoomsSold);
    
    return {
      id: format(date, 'MMM'),
      date,
      revenue,
      roomsSold,
      adr,
      lastYearRevenue,
      lastYearRoomsSold,
      lastYearAdr
    };
  }).filter(Boolean) as PacingDataItem[];
};

interface PacingChartProps {
  viewType?: 'Month' | 'Year';
}

export function PacingChart({ viewType = 'Month' }: PacingChartProps) {
  // State to track active data series
  const [activeSeries, setActiveSeries] = useState<string[]>(
    Object.keys(dataSeriesConfig)
  );
  
  // Add new state for cumulative vs fluctuation view
  const [dataViewType, setDataViewType] = useState<'fluctuation' | 'cumulative'>('fluctuation');
  
  // State for data based on view type
  const [pacingData, setPacingData] = useState<PacingDataItem[]>([]);
  const [processedData, setProcessedData] = useState<PacingDataItem[]>([]);
  
  // Update data when view type changes
  useEffect(() => {
    const newData = viewType === 'Month' ? generateMonthData() : generateYearData();
    setPacingData(newData);
  }, [viewType]);
  
  // Process data when pacingData or dataViewType changes
  useEffect(() => {
    if (dataViewType === 'fluctuation') {
      setProcessedData([...pacingData]);
    } else {
      // Create cumulative data
      const cumulativeData = pacingData.reduce((acc: PacingDataItem[], current, index) => {
        if (index === 0) {
          // First item remains the same
          acc.push({...current});
        } else {
          // Add current values to previous cumulative values
          const previous = acc[index - 1];
          acc.push({
            ...current,
            revenue: previous.revenue + current.revenue,
            roomsSold: previous.roomsSold + current.roomsSold,
            lastYearRevenue: previous.lastYearRevenue + current.lastYearRevenue,
            lastYearRoomsSold: previous.lastYearRoomsSold + current.lastYearRoomsSold,
            // ADR is recalculated based on cumulative values
            adr: Math.round((previous.revenue + current.revenue) / (previous.roomsSold + current.roomsSold)),
            lastYearAdr: Math.round((previous.lastYearRevenue + current.lastYearRevenue) / 
                                   (previous.lastYearRoomsSold + current.lastYearRoomsSold))
          });
        }
        return acc;
      }, []);
      
      setProcessedData(cumulativeData);
    }
  }, [pacingData, dataViewType]);
  
  // Function to toggle a data series
  const toggleSeries = (seriesName: string) => {
    setActiveSeries(prev => {
      // If removing the last item, do nothing (keep at least one active)
      if (prev.length === 1 && prev.includes(seriesName)) {
        return prev;
      }
      
      // Toggle the series
      return prev.includes(seriesName)
        ? prev.filter(s => s !== seriesName)
        : [...prev, seriesName];
    });
  };
  
  // Calculate the maximum for left y-axis scale based on active series
  const maxRevenue = Math.max(...processedData.map(item => Math.max(item.revenue, item.lastYearRevenue)));
  
  // Calculate the maximum for right y-axis scale
  const maxRoomsSold = Math.max(...processedData.map(item => Math.max(item.roomsSold, item.lastYearRoomsSold)));
  const maxAdr = Math.max(...processedData.map(item => Math.max(item.adr, item.lastYearAdr)));
  
  // Dynamic max value for left axis (revenue)
  const leftAxisMax = Math.ceil(maxRevenue / (viewType === 'Month' ? 1000 : 50000)) * (viewType === 'Month' ? 1000 : 50000);
  
  // Dynamic max value for right axis (rooms sold and ADR)
  const rightAxisMax = Math.max(
    Math.ceil(maxRoomsSold / 10) * 10,
    Math.ceil(maxAdr / 50) * 50
  );
  
  // Dynamic tick formatter for left axis (revenue)
  const leftAxisTickFormatter = (value: number) => {
    if (value >= 1000) {
      return `${value / 1000}k`;
    }
    return value.toString();
  };
  
  // Calculate percentage change for table
  const calculateChange = (current: number, previous: number) => {
    if (previous === 0) return 0;
    return ((current - previous) / previous) * 100;
  };
  
  return (
    <div className="flex flex-col gap-6">
      <Card className="bg-white shadow-lg rounded-lg overflow-hidden w-full border border-gray-300">
        <CardHeader className="pb-4">
          <div className="flex justify-between items-center">
            <CardTitle className="text-lg font-semibold text-gray-800">
              Pacing Dashboard - {viewType} View
            </CardTitle>
            
            {/* Add the new dropdown for data view type */}
            <div className="flex flex-col">
              <span className="text-xs text-gray-500 mb-2">Data view</span>
              <div className="relative">
                <select
                  value={dataViewType}
                  onChange={(e) => setDataViewType(e.target.value as 'fluctuation' | 'cumulative')}
                  className="bg-[#f2f8ff] hover:bg-[#f2f8ff] text-[#342630] rounded-full px-4 py-2 pr-8 appearance-none cursor-pointer text-sm font-medium border border-[#e5eaf3]"
                >
                  <option value="fluctuation">Fluctuation</option>
                  <option value="cumulative">Cumulative</option>
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-700">
                  <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
                    <path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z" />
                  </svg>
                </div>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div style={{ height: 400 }}>
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart
                data={processedData}
                margin={{ top: 30, right: 60, left: 60, bottom: 20 }}
                barGap={0}
                barCategoryGap={10}
              >
                <CartesianGrid vertical={false} stroke="#f3f4f6" />
                <XAxis 
                  dataKey="id" 
                  angle={0}
                  textAnchor="middle"
                  height={60}
                  tick={{ fontSize: 12 }}
                  tickMargin={30}
                />
                <YAxis 
                  yAxisId="left"
                  orientation="left"
                  tick={{ fontSize: 12 }}
                  axisLine={false}
                  tickLine={false}
                  tickMargin={20}
                  domain={[0, leftAxisMax]}
                  label={{ 
                    value: 'Revenue',
                    angle: -90,
                    position: 'insideLeft',
                    style: {
                      fontSize: 12,
                      fill: '#7d8694',
                      fontFamily: "'Geist Sans', sans-serif",
                    },
                    offset: -30
                  }}
                  tickFormatter={leftAxisTickFormatter}
                />
                <YAxis 
                  yAxisId="right"
                  orientation="right"
                  domain={[0, rightAxisMax]}
                  tick={{ fontSize: 12 }}
                  tickMargin={20}
                  axisLine={false}
                  tickLine={false}
                  label={{
                    value: 'Rooms Sold / ADR',
                    angle: 90,
                    position: 'insideRight',
                    style: {
                      fontSize: 12,
                      fill: '#7d8694',
                      fontFamily: "'Geist Sans', sans-serif",
                    },
                    offset: -30
                  }}
                />
                <Tooltip 
                  formatter={(value, name, props) => {
                    if (name === "revenue" || name === "lastYearRevenue") {
                      return [`€${Number(value).toLocaleString()}`, name === "lastYearRevenue" ? "Revenue LY" : "Revenue"];
                    } else if (name === "adr" || name === "lastYearAdr") {
                      return [`€${value}`, name === "lastYearAdr" ? "ADR LY" : "ADR"];
                    } else {
                      return [value, name === "lastYearRoomsSold" ? "Rooms Sold LY" : "Rooms Sold"];
                    }
                  }}
                  labelFormatter={(label) => {
                    const item = processedData.find(d => d.id === label);
                    return item ? format(item.date, viewType === 'Month' ? 'dd MMM yyyy' : 'MMMM yyyy') : label;
                  }}
                />
                
                {/* Current Year Revenue - Bar Chart */}
                {activeSeries.includes('revenue') && (
                  <Bar 
                    yAxisId="left" 
                    dataKey="revenue" 
                    fill="#18b0cc" 
                    name="revenue" 
                    radius={[4, 4, 0, 0]}
                  />
                )}
                
                {/* Last Year Revenue - Bar Chart with lighter color */}
                {activeSeries.includes('revenue') && (
                  <Bar 
                    yAxisId="left" 
                    dataKey="lastYearRevenue" 
                    fill="#a3d9e5" 
                    name="lastYearRevenue" 
                    radius={[4, 4, 0, 0]}
                  />
                )}
                
                {/* Current Year Rooms Sold - Line Chart */}
                {activeSeries.includes('roomsSold') && (
                  <Line 
                    yAxisId="right"
                    type="monotone" 
                    dataKey="roomsSold" 
                    stroke="#3b56de" 
                    strokeWidth={2}
                    dot={{ r: 4 }}
                    name="roomsSold"
                  />
                )}
                
                {/* Last Year Rooms Sold - Dashed Line Chart */}
                {activeSeries.includes('roomsSold') && (
                  <Line 
                    yAxisId="right"
                    type="monotone" 
                    dataKey="lastYearRoomsSold" 
                    stroke="#3b56de" 
                    strokeWidth={2}
                    strokeDasharray="5 5"
                    dot={{ r: 3 }}
                    name="lastYearRoomsSold"
                  />
                )}
                
                {/* Current Year ADR - Line Chart */}
                {activeSeries.includes('adr') && (
                  <Line 
                    yAxisId="right"
                    type="monotone" 
                    dataKey="adr" 
                    stroke="#e11d48" 
                    strokeWidth={2}
                    dot={{ r: 4 }}
                    name="adr"
                  />
                )}
                
                {/* Last Year ADR - Dashed Line Chart */}
                {activeSeries.includes('adr') && (
                  <Line 
                    yAxisId="right"
                    type="monotone" 
                    dataKey="lastYearAdr" 
                    stroke="#e11d48" 
                    strokeWidth={2}
                    strokeDasharray="5 5"
                    dot={{ r: 3 }}
                    name="lastYearAdr"
                  />
                )}
              </ComposedChart>
            </ResponsiveContainer>
          </div>
          
          {/* Custom legend rendered directly in the component */}
          <div className="flex flex-wrap justify-center gap-3 mt-6">
            {Object.entries(dataSeriesConfig).map(([key, config]) => {
              const isActive = activeSeries.includes(key);
              
              return (
                <div
                  key={key}
                  onClick={() => toggleSeries(key)}
                  className={`
                    cursor-pointer bg-[#f0f4fa] px-3 py-1.5 rounded-full 
                    border border-[#e5eaf3] flex items-center gap-2
                    ${isActive ? '' : 'opacity-50'}
                  `}
                >
                  <div 
                    style={{ backgroundColor: config.color }} 
                    className="w-2 h-2 rounded-full" 
                  />
                  <span className="text-xs text-gray-500 font-medium">
                    {config.name}
                  </span>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
      
      {/* Comparison Table */}
      <Card className="bg-white shadow-lg rounded-lg overflow-hidden w-full border border-gray-300">
        <CardHeader className="pb-4">
          <div className="flex justify-between items-center">
            <CardTitle className="text-lg font-semibold text-gray-800">
              Performance Comparison with Last Year
            </CardTitle>
            
            {/* Add note about data view type */}
            <div className="text-xs text-gray-500">
              {dataViewType === 'cumulative' ? 'Showing cumulative data' : 'Showing period-by-period data'}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="bg-[#f0f4fa]/60 w-[16%]">
                    {viewType === 'Month' ? 'Day' : 'Month'}
                  </TableHead>
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
                {processedData.map((row, idx) => {
                  // Calculate changes
                  const revenueChange = calculateChange(row.revenue, row.lastYearRevenue);
                  const roomsChange = calculateChange(row.roomsSold, row.lastYearRoomsSold);
                  const adrChange = calculateChange(row.adr, row.lastYearAdr);
                  
                  return (
                    <TableRow key={idx} className="border-b border-[#d0d7e3] last:border-0">
                      <TableCell className="w-[16%] text-left border-r border-[#d0d7e3]">
                        {viewType === 'Month' 
                          ? format(row.date, 'dd MMM') 
                          : format(row.date, 'MMMM')}
                      </TableCell>
                      <TableCell className="w-[9%] text-right border-r border-[#d0d7e3]">
                        €{row.revenue.toLocaleString()}
                      </TableCell>
                      <TableCell className="w-[9%] text-right border-r border-[#d0d7e3]">
                        €{row.lastYearRevenue.toLocaleString()}
                      </TableCell>
                      <TableCell className={`w-[9%] text-right border-r border-[#d0d7e3] ${
                        revenueChange > 0 ? "text-emerald-500" : revenueChange < 0 ? "text-red-500" : ""
                      }`}>
                        <div className="flex items-center justify-end">
                          {revenueChange !== 0 && (
                            revenueChange > 0 
                              ? <ArrowUpIcon className="h-3 w-3 mr-1 text-emerald-500" />
                              : <ArrowDownIcon className="h-3 w-3 mr-1 text-red-500" />
                          )}
                          {Math.abs(revenueChange).toFixed(1)}%
                        </div>
                      </TableCell>
                      <TableCell className="w-[9%] text-right border-r border-[#d0d7e3]">
                        {row.roomsSold.toLocaleString()}
                      </TableCell>
                      <TableCell className="w-[9%] text-right border-r border-[#d0d7e3]">
                        {row.lastYearRoomsSold.toLocaleString()}
                      </TableCell>
                      <TableCell className={`w-[9%] text-right border-r border-[#d0d7e3] ${
                        roomsChange > 0 ? "text-emerald-500" : roomsChange < 0 ? "text-red-500" : ""
                      }`}>
                        <div className="flex items-center justify-end">
                          {roomsChange !== 0 && (
                            roomsChange > 0 
                              ? <ArrowUpIcon className="h-3 w-3 mr-1 text-emerald-500" />
                              : <ArrowDownIcon className="h-3 w-3 mr-1 text-red-500" />
                          )}
                          {Math.abs(roomsChange).toFixed(1)}%
                        </div>
                      </TableCell>
                      <TableCell className="w-[9%] text-right border-r border-[#d0d7e3]">
                        €{row.adr.toLocaleString()}
                      </TableCell>
                      <TableCell className="w-[9%] text-right border-r border-[#d0d7e3]">
                        €{row.lastYearAdr.toLocaleString()}
                      </TableCell>
                      <TableCell className={`w-[9%] text-right ${
                        adrChange > 0 ? "text-emerald-500" : adrChange < 0 ? "text-red-500" : ""
                      }`}>
                        <div className="flex items-center justify-end">
                          {adrChange !== 0 && (
                            adrChange > 0 
                              ? <ArrowUpIcon className="h-3 w-3 mr-1 text-emerald-500" />
                              : <ArrowDownIcon className="h-3 w-3 mr-1 text-red-500" />
                          )}
                          {Math.abs(adrChange).toFixed(1)}%
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
                
                {/* Totals Row */}
                {processedData.length > 0 && (
                  <TableRow className="bg-[#f0f4fa]/30 font-medium">
                    <TableCell className="w-[16%] text-left border-r border-[#d0d7e3]">
                      Total
                    </TableCell>
                    {/* Revenue Totals */}
                    {(() => {
                      const totalRevenue = processedData.reduce((sum, item) => sum + item.revenue, 0);
                      const totalLastYearRevenue = processedData.reduce((sum, item) => sum + item.lastYearRevenue, 0);
                      const totalRevenueChange = calculateChange(totalRevenue, totalLastYearRevenue);
                      
                      return (
                        <>
                          <TableCell className="w-[9%] text-right border-r border-[#d0d7e3]">
                            €{totalRevenue.toLocaleString()}
                          </TableCell>
                          <TableCell className="w-[9%] text-right border-r border-[#d0d7e3]">
                            €{totalLastYearRevenue.toLocaleString()}
                          </TableCell>
                          <TableCell className={`w-[9%] text-right border-r border-[#d0d7e3] ${
                            totalRevenueChange > 0 ? "text-emerald-500" : totalRevenueChange < 0 ? "text-red-500" : ""
                          }`}>
                            <div className="flex items-center justify-end">
                              {totalRevenueChange !== 0 && (
                                totalRevenueChange > 0 
                                  ? <ArrowUpIcon className="h-3 w-3 mr-1 text-emerald-500" />
                                  : <ArrowDownIcon className="h-3 w-3 mr-1 text-red-500" />
                              )}
                              {Math.abs(totalRevenueChange).toFixed(1)}%
                            </div>
                          </TableCell>
                        </>
                      );
                    })()}
                    
                    {/* Rooms Sold Totals */}
                    {(() => {
                      const totalRoomsSold = processedData.reduce((sum, item) => sum + item.roomsSold, 0);
                      const totalLastYearRoomsSold = processedData.reduce((sum, item) => sum + item.lastYearRoomsSold, 0);
                      const totalRoomsChange = calculateChange(totalRoomsSold, totalLastYearRoomsSold);
                      
                      return (
                        <>
                          <TableCell className="w-[9%] text-right border-r border-[#d0d7e3]">
                            {totalRoomsSold.toLocaleString()}
                          </TableCell>
                          <TableCell className="w-[9%] text-right border-r border-[#d0d7e3]">
                            {totalLastYearRoomsSold.toLocaleString()}
                          </TableCell>
                          <TableCell className={`w-[9%] text-right border-r border-[#d0d7e3] ${
                            totalRoomsChange > 0 ? "text-emerald-500" : totalRoomsChange < 0 ? "text-red-500" : ""
                          }`}>
                            <div className="flex items-center justify-end">
                              {totalRoomsChange !== 0 && (
                                totalRoomsChange > 0 
                                  ? <ArrowUpIcon className="h-3 w-3 mr-1 text-emerald-500" />
                                  : <ArrowDownIcon className="h-3 w-3 mr-1 text-red-500" />
                              )}
                              {Math.abs(totalRoomsChange).toFixed(1)}%
                            </div>
                          </TableCell>
                        </>
                      );
                    })()}
                    
                    {/* ADR Totals */}
                    {(() => {
                      const totalRevenue = processedData.reduce((sum, item) => sum + item.revenue, 0);
                      const totalRoomsSold = processedData.reduce((sum, item) => sum + item.roomsSold, 0);
                      const totalLastYearRevenue = processedData.reduce((sum, item) => sum + item.lastYearRevenue, 0);
                      const totalLastYearRoomsSold = processedData.reduce((sum, item) => sum + item.lastYearRoomsSold, 0);
                      
                      const avgAdr = Math.round(totalRevenue / totalRoomsSold);
                      const avgLastYearAdr = Math.round(totalLastYearRevenue / totalLastYearRoomsSold);
                      const adrChange = calculateChange(avgAdr, avgLastYearAdr);
                      
                      return (
                        <>
                          <TableCell className="w-[9%] text-right border-r border-[#d0d7e3]">
                            €{avgAdr.toLocaleString()}
                          </TableCell>
                          <TableCell className="w-[9%] text-right border-r border-[#d0d7e3]">
                            €{avgLastYearAdr.toLocaleString()}
                          </TableCell>
                          <TableCell className={`w-[9%] text-right ${
                            adrChange > 0 ? "text-emerald-500" : adrChange < 0 ? "text-red-500" : ""
                          }`}>
                            <div className="flex items-center justify-end">
                              {adrChange !== 0 && (
                                adrChange > 0 
                                  ? <ArrowUpIcon className="h-3 w-3 mr-1 text-emerald-500" />
                                  : <ArrowDownIcon className="h-3 w-3 mr-1 text-red-500" />
                              )}
                              {Math.abs(adrChange).toFixed(1)}%
                            </div>
                          </TableCell>
                        </>
                      );
                    })()}
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
} 