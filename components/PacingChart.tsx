import React, { useState, useEffect } from 'react'
import { Card, CardHeader, CardContent, CardTitle } from "@/components/ui/card"
import { ResponsiveContainer, ComposedChart, CartesianGrid, XAxis, YAxis, Bar, Line, Tooltip, ReferenceLine } from 'recharts'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { ArrowUpIcon, ArrowDownIcon, Loader2 } from 'lucide-react'
import { format, getDaysInMonth, subYears, parseISO, isSameDay, isSameMonth, startOfMonth, getMonth, getDate, getYear } from 'date-fns'
import { PacingChartData } from '@/app/api/pace/route'

// Define data series for tracking active state
const dataSeriesConfig = {
  revenue: { name: "Revenue", color: "#18b0cc" },
  roomsSold: { name: "Rooms Sold", color: "#3b56de" },
  adr: { name: "ADR", color: "#e11d48" }
};

// Define types for our internal data structure (remains mostly the same)
interface PacingDataItem {
  id: string; // Will be 'Day X' or 'MMM'
  date: Date; // Parsed date object
  revenue: number;
  roomsSold: number;
  adr: number;
  lastYearRevenue: number;
  lastYearRoomsSold: number;
  lastYearAdr: number;
  isCurrent: boolean; // Flag for today's date or current month
}

interface PacingChartProps {
  viewType?: 'Month' | 'Year';
  data: PacingChartData[]; // Accept data from parent
  isLoading: boolean;      // Accept loading state
  error: string | null;    // Accept error state
}

export function PacingChart({
  viewType = 'Month',
  data,
  isLoading,
  error
}: PacingChartProps) {
  // State to track active data series
  const [activeSeries, setActiveSeries] = useState<string[]>(
    Object.keys(dataSeriesConfig)
  );
  
  // Add new state for cumulative vs fluctuation view
  const [dataViewType, setDataViewType] = useState<'fluctuation' | 'cumulative'>('fluctuation');
  
  // State for the data mapped to the internal format
  const [mappedPacingData, setMappedPacingData] = useState<PacingDataItem[]>([]);
  // State for the final processed data (cumulative or fluctuation)
  const [processedData, setProcessedData] = useState<PacingDataItem[]>([]);
  
  // Effect to map incoming API data to internal PacingDataItem format
  useEffect(() => {
    if (!data || isLoading || error) {
      setMappedPacingData([]);
      return;
    }

    const today = new Date();
    const currentYear = today.getFullYear();
    const mergedDataMap = new Map<string, Partial<PacingDataItem>>();

    data.forEach((item) => {
      const itemDate = parseISO(item.date);
      let id = '';
      let baseDateForSort: Date;

      if (viewType === 'Month') {
        const dayOfMonth = getDate(itemDate);
        id = `Day ${dayOfMonth}`;
        baseDateForSort = new Date(currentYear, today.getMonth(), dayOfMonth);
      } else { // Year view
        const monthIndex = getMonth(itemDate);
        id = format(new Date(currentYear, monthIndex, 1), 'MMM');
        baseDateForSort = new Date(currentYear, monthIndex, 1);
      }

      const entry = mergedDataMap.get(id) || { id: id, date: baseDateForSort };

      if (item.rooms !== undefined || item.revenue !== undefined || item.adr !== undefined) {
        // Current year data - Round here
        entry.revenue = Math.round(item.revenue ?? entry.revenue ?? 0);
        entry.roomsSold = Math.round(item.rooms ?? entry.roomsSold ?? 0); // Assuming rooms should be integer anyway
        entry.adr = Math.round(item.adr ?? entry.adr ?? 0);
        // Determine isCurrent based on the original item's date relative to today
        if (viewType === 'Month') {
            entry.isCurrent = isSameDay(itemDate, today);
        } else {
            entry.isCurrent = isSameMonth(itemDate, today);
        }
      } else {
        // Comparison (last year) data - Round here
        entry.lastYearRevenue = Math.round(item.comparisonRevenue ?? entry.lastYearRevenue ?? 0);
        entry.lastYearRoomsSold = Math.round(item.comparisonRooms ?? entry.lastYearRoomsSold ?? 0); // Assuming rooms should be integer anyway
        entry.lastYearAdr = Math.round(item.comparisonAdr ?? entry.lastYearAdr ?? 0);
      }

      mergedDataMap.set(id, entry);
    });

    // Step 2: Convert map values to array and ensure all fields are present
    const mapped = Array.from(mergedDataMap.values()).map(entry => ({
      id: entry.id!,
      date: entry.date!,
      // Ensure values are integers after merging/defaulting
      revenue: Math.round(entry.revenue ?? 0),
      roomsSold: Math.round(entry.roomsSold ?? 0),
      adr: Math.round(entry.adr ?? 0),
      lastYearRevenue: Math.round(entry.lastYearRevenue ?? 0),
      lastYearRoomsSold: Math.round(entry.lastYearRoomsSold ?? 0),
      lastYearAdr: Math.round(entry.lastYearAdr ?? 0),
      isCurrent: entry.isCurrent ?? false,
    }));

    // Step 3: Ensure correct sorting
    mapped.sort((a, b) => a.date.getTime() - b.date.getTime());

    setMappedPacingData(mapped);

  }, [data, viewType, isLoading, error]);
  
  // Effect to process data (cumulative vs fluctuation) based on mapped data
  useEffect(() => {
    if (!mappedPacingData.length) {
        setProcessedData([]);
        return;
    }

    if (dataViewType === 'fluctuation') {
      setProcessedData([...mappedPacingData]);
    } else { // Cumulative
      const cumulativeData = mappedPacingData.reduce((acc: PacingDataItem[], current, index) => {
        const newItem = { ...current }; // Values are already rounded

        if (index > 0) {
          const previous = acc[index - 1];
          newItem.revenue = previous.revenue + current.revenue;
          newItem.roomsSold = previous.roomsSold + current.roomsSold;
          newItem.lastYearRevenue = previous.lastYearRevenue + current.lastYearRevenue;
          newItem.lastYearRoomsSold = previous.lastYearRoomsSold + current.lastYearRoomsSold;
        }

        // Recalculate cumulative ADR and round
        newItem.adr = newItem.roomsSold > 0 ? Math.round(newItem.revenue / newItem.roomsSold) : 0;
        newItem.lastYearAdr = newItem.lastYearRoomsSold > 0 ? Math.round(newItem.lastYearRevenue / newItem.lastYearRoomsSold) : 0;

        acc.push(newItem);
        return acc;
      }, []);
      setProcessedData(cumulativeData);
    }
  }, [mappedPacingData, dataViewType]); // Rerun when mapped data or view type changes
  
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

  // === Render Loading and Error States ===
  if (isLoading) {
    return (
      <div className="flex flex-col gap-6">
        <Card className="bg-white shadow-lg rounded-lg overflow-hidden w-full border border-gray-300 min-h-[600px] flex items-center justify-center">
          <div className="flex flex-col items-center text-gray-500">
            <Loader2 className="h-12 w-12 animate-spin mb-4" />
            <p>Loading Pacing Data...</p>
          </div>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col gap-6">
        <Card className="bg-white shadow-lg rounded-lg overflow-hidden w-full border border-red-300 min-h-[600px] flex items-center justify-center">
          <div className="text-center text-red-600">
            <p className="font-semibold mb-2">Error loading pacing data</p>
            <p className="text-sm">{error}</p>
          </div>
        </Card>
      </div>
    );
  }
  // === End Loading and Error States ===

  return (
    <div className="flex flex-col gap-6">
      <Card className="bg-white shadow-lg rounded-lg overflow-hidden w-full border border-gray-300">
        <CardHeader className="pb-4">
          <div className="flex justify-between items-center">
            <CardTitle className="text-lg font-semibold text-gray-800">
              Pace – {viewType} View
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
                    // Ensure value is treated as number before formatting
                    const numValue = typeof value === 'number' ? value : 0;
                    // Format rounded value with locale string for thousands separators
                    const formattedValue = Math.round(numValue).toLocaleString();

                    if (name === "revenue" || name === "lastYearRevenue") {
                      return [`€${formattedValue}`, name === "lastYearRevenue" ? "Revenue LY" : "Revenue"];
                    } else if (name === "adr" || name === "lastYearAdr") {
                      return [`€${formattedValue}`, name === "lastYearAdr" ? "ADR LY" : "ADR"];
                    } else {
                      return [formattedValue, name === "lastYearRoomsSold" ? "Rooms Sold LY" : "Rooms Sold"];
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
                    stroke="#a8b3f0" 
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
                    stroke="#f0a2b5" 
                    strokeWidth={2}
                    strokeDasharray="5 5"
                    dot={{ r: 3 }}
                    name="lastYearAdr"
                  />
                )}
                
                {/* Add the ReferenceLine component to show the current day/month with labels */}
                {processedData.findIndex(d => d.isCurrent) !== -1 && (
                  <>
                    {/* "Actual" label - centered between left edge and Today */}
                    <ReferenceLine 
                      x={processedData[
                        Math.floor(processedData.findIndex(d => d.isCurrent) / 2)
                      ]?.id}
                      yAxisId="left"
                      stroke="transparent"
                      label={{ 
                        value: "Actual", 
                        position: "top",
                        fill: "#18b0cc", 
                        fontSize: 12,
                        fontWeight: "bold" 
                      }} 
                    />
                    
                    {/* Today line */}
                    <ReferenceLine 
                      x={processedData.find(d => d.isCurrent)?.id} 
                      yAxisId="left"
                      stroke="#6b7280" 
                      strokeDasharray="5 5" 
                      strokeWidth={2} 
                      label={{ 
                        value: "Today", 
                        position: "top", 
                        fill: "#6b7280",
                        fontSize: 12
                      }} 
                    />
                    
                    {/* "OTB" label - centered between Today and right edge */}
                    <ReferenceLine 
                      x={processedData[
                        Math.floor((processedData.findIndex(d => d.isCurrent) + processedData.length) / 2)
                      ]?.id}
                      yAxisId="left"
                      stroke="transparent"
                      label={{ 
                        value: "OTB", 
                        position: "top",
                        fill: "#e11d48", 
                        fontSize: 12,
                        fontWeight: "bold" 
                      }} 
                    />
                  </>
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
              Performance Comparison
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
                        €{Math.round(row.revenue).toLocaleString()}
                      </TableCell>
                      <TableCell className="w-[9%] text-right border-r border-[#d0d7e3]">
                        €{Math.round(row.lastYearRevenue).toLocaleString()}
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
                        {Math.round(row.roomsSold).toLocaleString()}
                      </TableCell>
                      <TableCell className="w-[9%] text-right border-r border-[#d0d7e3]">
                        {Math.round(row.lastYearRoomsSold).toLocaleString()}
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
                        €{Math.round(row.adr).toLocaleString()}
                      </TableCell>
                      <TableCell className="w-[9%] text-right border-r border-[#d0d7e3]">
                        €{Math.round(row.lastYearAdr).toLocaleString()}
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
                      const lastItem = processedData[processedData.length - 1];
                      const totalRevenue = dataViewType === 'cumulative' ? lastItem.revenue : processedData.reduce((sum, item) => sum + item.revenue, 0);
                      const totalLastYearRevenue = dataViewType === 'cumulative' ? lastItem.lastYearRevenue : processedData.reduce((sum, item) => sum + item.lastYearRevenue, 0);
                      const totalRevenueChange = calculateChange(totalRevenue, totalLastYearRevenue);
                      
                      return (
                        <>
                          <TableCell className="w-[9%] text-right border-r border-[#d0d7e3]">
                            €{Math.round(totalRevenue).toLocaleString()}
                          </TableCell>
                          <TableCell className="w-[9%] text-right border-r border-[#d0d7e3]">
                            €{Math.round(totalLastYearRevenue).toLocaleString()}
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
                      const lastItem = processedData[processedData.length - 1];
                      const totalRoomsSold = dataViewType === 'cumulative' ? lastItem.roomsSold : processedData.reduce((sum, item) => sum + item.roomsSold, 0);
                      const totalLastYearRoomsSold = dataViewType === 'cumulative' ? lastItem.lastYearRoomsSold : processedData.reduce((sum, item) => sum + item.lastYearRoomsSold, 0);
                      const totalRoomsChange = calculateChange(totalRoomsSold, totalLastYearRoomsSold);
                      
                      return (
                        <>
                          <TableCell className="w-[9%] text-right border-r border-[#d0d7e3]">
                            {Math.round(totalRoomsSold).toLocaleString()}
                          </TableCell>
                          <TableCell className="w-[9%] text-right border-r border-[#d0d7e3]">
                            {Math.round(totalLastYearRoomsSold).toLocaleString()}
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
                      const lastItem = processedData[processedData.length - 1];
                      const totalRevenue = dataViewType === 'cumulative' ? lastItem.revenue : processedData.reduce((sum, item) => sum + item.revenue, 0);
                      const totalRoomsSold = dataViewType === 'cumulative' ? lastItem.roomsSold : processedData.reduce((sum, item) => sum + item.roomsSold, 0);
                      const totalLastYearRevenue = dataViewType === 'cumulative' ? lastItem.lastYearRevenue : processedData.reduce((sum, item) => sum + item.lastYearRevenue, 0);
                      const totalLastYearRoomsSold = dataViewType === 'cumulative' ? lastItem.lastYearRoomsSold : processedData.reduce((sum, item) => sum + item.lastYearRoomsSold, 0);
                      
                      const avgAdr = totalRoomsSold > 0 ? Math.round(totalRevenue / totalRoomsSold) : 0;
                      const avgLastYearAdr = totalLastYearRoomsSold > 0 ? Math.round(totalLastYearRevenue / totalLastYearRoomsSold) : 0;
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