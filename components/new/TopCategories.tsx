"use client"

import * as React from "react"
import { useState, useMemo } from "react"
import {
  PieChart,
  Pie,
  Cell,
  Label,
  AreaChart,
  Area,
  BarChart,
  Bar,
  CartesianGrid,
  XAxis,
  YAxis
} from "recharts"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Button } from "@/components/ui/button"
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart"

// Simple TriangleDown icon component
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

interface Category {
  key: string;
  label: string;
  color: string;
}

interface Option {
  value: string;
  label: string;
}

export interface TopCategoriesProps {
  // Array for the common legend – each item defines a category key, label, and color.
  categories: Category[];
  // Arrays for the three charts' raw data. The shapes below are what you'd expect:
  // • each pie data item: { key, name, value, percentage, fill? }
  // • each over time data item: { date: string, categories: { [key]: { current: number; previous: number } } }
  // • each bar data item: { key, label, current: number, previous: number }
  pieChartData: any[];
  overTimeData: any[];
  barChartData: any[];
  // Dropdown KPI options – each chart has its own list
  pieKPIOptions: Option[];
  overTimeKPIOptions: Option[];
  barKPIOptions: Option[];
  // Optional transformation functions (if you need to tweak the raw data based on KPI)
  transformPieData?: (data: any[], selectedKPI: string) => any[];
  transformOverTimeData?: (data: any[], selectedKPI: string) => any[];
  transformBarData?: (data: any[], selectedKPI: string) => any[];
}

export function TopCategories({
  categories,
  pieChartData,
  overTimeData,
  barChartData,
  pieKPIOptions,
  overTimeKPIOptions,
  barKPIOptions,
  transformPieData,
  transformOverTimeData,
  transformBarData
}: TopCategoriesProps) {
  // State for the common legend – which categories are active across charts
  const [activeCategories, setActiveCategories] = useState<string[]>(categories.map(cat => cat.key))
  // State for the KPI selections for each chart
  const [selectedPieKPI, setSelectedPieKPI] = useState<string>(pieKPIOptions[0].value)
  const [selectedOverTimeKPI, setSelectedOverTimeKPI] = useState<string>(overTimeKPIOptions[0].value)
  const [selectedBarKPI, setSelectedBarKPI] = useState<string>(barKPIOptions[0].value)
  // Categories over time chart toggle for a normal vs. stacked view
  const [categoryChartMode, setCategoryChartMode] = useState<'normal' | 'stacked'>("normal")
  // For the bar chart let the user toggle the active series (current and previous)
  const [activeBarSeries, setActiveBarSeries] = useState<string[]>(["current", "previous"])

  // HARDCODED PIE CHART DATA
  const hardcodedPieData = [
    { key: 'direct', name: 'Direct', value: 150000, percentage: 35, fill: 'hsl(152, 76.2%, 36.3%)' },
    { key: 'booking_com', name: 'Booking.com', value: 100000, percentage: 25, fill: 'hsl(45, 93%, 47%)' },
    { key: 'expedia', name: 'Expedia', value: 80000, percentage: 20, fill: 'hsl(0, 84%, 92%)' },
    { key: 'airbnb', name: 'Airbnb', value: 50000, percentage: 12, fill: 'hsl(212, 72%, 59%)' },
    { key: 'travel_agents', name: 'Travel Agents', value: 30000, percentage: 8, fill: 'hsl(280, 65%, 60%)' }
  ];
  
  // Use hardcoded data instead of transformed data
  const filteredPieData = useMemo(() => {
    return hardcodedPieData.filter((item) => activeCategories.includes(item.key));
  }, [hardcodedPieData, activeCategories]);

  const totalPieValue = useMemo(() => {
    return filteredPieData.reduce((acc, item) => acc + item.value, 0);
  }, [filteredPieData]);

  // Transform raw data if transformation functions are provided else use the raw data.
  const transformedPieData = useMemo(() => {
    if (transformPieData) return transformPieData(pieChartData, selectedPieKPI)
    return pieChartData
  }, [pieChartData, selectedPieKPI, transformPieData])

  const transformedOverTimeData = useMemo(() => {
    if (transformOverTimeData) return transformOverTimeData(overTimeData, selectedOverTimeKPI)
    return overTimeData
  }, [overTimeData, selectedOverTimeKPI, transformOverTimeData])

  const transformedBarData = useMemo(() => {
    if (transformBarData) return transformBarData(barChartData, selectedBarKPI)
    return barChartData
  }, [barChartData, selectedBarKPI, transformBarData])

  // Filter bar chart data based on active categories
  const filteredBarData = useMemo(() => {
    return transformedBarData.filter((item: any) => activeCategories.includes(item.key))
  }, [transformedBarData, activeCategories])

  // Helper function to calculate the left margin for the over time chart's YAxis
  const getCategoriesLeftMargin = (data: any[]) => {
    const maxNumber = Math.max(
      ...data.flatMap(item =>
        Object.values(item.categories).flatMap((cat: any) => [cat.current, cat.previous])
      )
    )
    const numLength = Math.round(maxNumber).toString().replace(/,/g, "").length
    const marginMap: { [key: number]: number } = {
      3: -5,
      4: 3,
      5: 9,
      6: 18,
      7: 27,
    }
    return marginMap[numLength] || 3
  }

  // Handler to toggle legend (active category) selections.
  const toggleCategory = (key: string) => {
    if (activeCategories.includes(key)) {
      setActiveCategories(activeCategories.filter(item => item !== key))
    } else {
      setActiveCategories([...activeCategories, key])
    }
  }

  // Add chart configs for each chart type
  const pieChartConfig = useMemo(() => {
    return filteredPieData.reduce((acc, item) => {
      acc[item.key] = {
        label: item.name,
        color: item.fill,
      }
      return acc
    }, {} as Record<string, { label: string; color: string }>)
  }, [filteredPieData])

  const overTimeChartConfig = useMemo(() => {
    return categories.reduce((acc, cat) => {
      acc[cat.key] = {
        label: cat.label,
        color: cat.color,
      }
      return acc
    }, {} as Record<string, { label: string; color: string }>)
  }, [categories])

  const barChartConfig = useMemo(() => ({
    current: {
      label: "Current Period",
      color: "hsl(221.2 83.2% 53.3%)",
    },
    previous: {
      label: "Previous Period",
      color: "#93c5fd",
    },
  }), [])

  return (
    <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-300">
      <h3 className="text-lg font-medium mb-4 text-center">Top Categories</h3>

      {/* Common Legend */}
      <div className="flex justify-center gap-3 mb-6">
        {categories.map(cat => (
          <div
            key={cat.key}
            onClick={() => toggleCategory(cat.key)}
            className={`cursor-pointer bg-[#f2f8ff] px-4 py-2 rounded-full border border-[#e5eaf3] flex items-center gap-2 ${
              activeCategories.includes(cat.key) ? "" : "opacity-50"
            }`}
          >
            <div style={{ backgroundColor: cat.color }} className="w-3 h-3 rounded-full" />
            <span className="text-sm font-medium">{cat.label}</span>
          </div>
        ))}
      </div>

      {/* Charts Grid: three columns */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Pie Chart Section */}
        <div className="bg-[#f2f8ff] rounded-lg p-6 border border-gray-300">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-medium">Distribution</h3>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button 
                  variant="ghost"
                  size="sm"
                  className="bg-[#f2f8ff] hover:bg-[#f2f8ff] text-[#342630] rounded-full px-4 font-semibold whitespace-nowrap"
                >
                  {pieKPIOptions.find(opt => opt.value === selectedPieKPI)?.label || "Total Revenue"}
                  <TriangleDown className="ml-3" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {pieKPIOptions.map(option => (
                  <DropdownMenuItem 
                    key={option.value}
                    onClick={() => setSelectedPieKPI(option.value)}
                  >
                    {option.label}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
          <div className="flex flex-col items-center">
            <PieChart width={300} height={300}>
              <Pie
                data={filteredPieData}
                dataKey="value"
                nameKey="name"
                innerRadius={50}
                outerRadius={90}
                paddingAngle={2}
                cx="50%"
                cy="50%"
              >
                {filteredPieData.map((entry) => (
                  <Cell key={`cell-${entry.key}`} fill={entry.fill} />
                ))}
                <Label
                  content={({ viewBox }: any) => {
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
                            fill="#000"
                            fontSize="20"
                            fontWeight="bold"
                          >
                            {totalPieValue.toLocaleString()}
                          </tspan>
                          <tspan
                            x={viewBox.cx}
                            y={(viewBox.cy || 0) + 24}
                            fill="#666"
                            fontSize="12"
                          >
                            Total Revenue
                          </tspan>
                        </text>
                      );
                    }
                    return null;
                  }}
                />
              </Pie>
              <ChartTooltip />
            </PieChart>
          </div>
        </div>

        {/* Categories Over Time Chart Section */}
        <div className="bg-[#f2f8ff] rounded-lg p-6 border border-gray-300">
          <div className="flex justify-between items-center mb-12">
            <h3 className="text-lg font-medium">Categories Over Time</h3>
            <div className="flex items-center gap-3">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button 
                    variant="ghost"
                    size="sm"
                    className="bg-[#f2f8ff] hover:bg-[#f2f8ff] text-[#342630] rounded-full px-4 font-semibold whitespace-nowrap"
                  >
                    {categoryChartMode === "normal" ? "Normal View" : "Stacked View"}
                    <TriangleDown className="ml-3" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => setCategoryChartMode("normal")}>
                    Normal View
                  </DropdownMenuItem>
                  <DropdownMenuItem 
                    onClick={() => setCategoryChartMode("stacked")}
                    className={selectedOverTimeKPI === "adr" ? "opacity-50 cursor-not-allowed" : ""}
                    disabled={selectedOverTimeKPI === "adr"}
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
                    {overTimeKPIOptions.find(opt => opt.value === selectedOverTimeKPI)?.label}
                    <TriangleDown className="ml-3" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {overTimeKPIOptions.map(option => (
                    <DropdownMenuItem 
                      key={option.value} 
                      onClick={() => setSelectedOverTimeKPI(option.value)}
                    >
                      {option.label}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
          <ChartContainer config={overTimeChartConfig}>
            <AreaChart
              data={transformedOverTimeData}
              height={300}
              margin={{
                top: 10,
                right: 10,
                bottom: 20,
                left: getCategoriesLeftMargin(transformedOverTimeData),
              }}
            >
              <defs>
                {categories.map(cat => (
                  <React.Fragment key={cat.key}>
                    <linearGradient id={`gradient-${cat.key}`} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={cat.color} stopOpacity={0.1}/>
                      <stop offset="100%" stopColor={cat.color} stopOpacity={0.1}/>
                    </linearGradient>
                    <linearGradient id={`gradient-${cat.key}-previous`} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={cat.color} stopOpacity={0.05}/>
                      <stop offset="100%" stopColor={cat.color} stopOpacity={0.05}/>
                    </linearGradient>
                  </React.Fragment>
                ))}
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis
                dataKey="date"
                tickLine={false}
                axisLine={false}
                tickFormatter={(value: string) => value.slice(0, 3)}
                tickMargin={8}
              />
              <YAxis
                tickLine={false}
                axisLine={false}
                tickFormatter={(value: number) => Math.round(value).toLocaleString()}
                tickMargin={8}
                width={45}
              />
              <ChartTooltip content={<ChartTooltipContent />} />
              {categories.map(cat =>
                activeCategories.includes(cat.key) && (
                  <Area
                    key={cat.key}
                    type="monotone"
                    dataKey={`categories.${cat.key}.current`}
                    stroke={cat.color}
                    fill={cat.color}
                    fillOpacity={0.4}
                    strokeWidth={2}
                    dot={false}
                    name={cat.label}
                    stackId={categoryChartMode === "stacked" ? "1" : undefined}
                  />
                )
              )}
            </AreaChart>
          </ChartContainer>
        </div>

        {/* Bar Chart Section */}
        <div className="bg-[#f2f8ff] rounded-lg p-6 border border-gray-300">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-medium">Booking Channels</h3>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button 
                  variant="ghost"
                  size="sm"
                  className="bg-[#f2f8ff] hover:bg-[#f2f8ff] text-[#342630] rounded-full px-4 font-semibold whitespace-nowrap"
                >
                  {barKPIOptions.find(opt => opt.value === selectedBarKPI)?.label}
                  <TriangleDown className="ml-3" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {barKPIOptions.map(option => (
                  <DropdownMenuItem 
                    key={option.value}
                    onClick={() => setSelectedBarKPI(option.value)}
                  >
                    {option.label}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
          <ChartContainer config={barChartConfig}>
            <BarChart
              data={filteredBarData}
              height={300}
              margin={{ top: 10, right: 10, bottom: 20, left: 20 }}
            >
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="label" tickLine={false} axisLine={false} tickMargin={8} />
              <YAxis 
                tickLine={false} 
                axisLine={false} 
                tickFormatter={(value: number) => Math.round(value).toLocaleString()} 
                tickMargin={8} 
              />
              <ChartTooltip content={<ChartTooltipContent />} />
              {/* Clickable legend for bar chart series */}
              <foreignObject x={0} y={0} width={200} height={50}>
                <div className="flex gap-3">
                  {["current", "previous"].map(series => (
                    <div
                      key={series}
                      onClick={() => {
                        if (activeBarSeries.includes(series)) {
                          setActiveBarSeries(activeBarSeries.filter(s => s !== series))
                        } else {
                          setActiveBarSeries([...activeBarSeries, series])
                        }
                      }}
                      className={`cursor-pointer bg-[#f0f4fa] px-3 py-1.5 rounded-full border border-[#e5eaf3] flex items-center gap-2 ${
                        activeBarSeries.includes(series) ? "" : "opacity-50"
                      }`}
                    >
                      <div
                        style={{
                          backgroundColor:
                            series === "current"
                              ? "hsl(221.2 83.2% 53.3%)"
                              : "#93c5fd",
                        }}
                        className="w-2 h-2 rounded-full"
                      />
                      <span className="text-xs text-gray-500 font-medium">
                        {series === "current" ? "Current" : "Previous"}
                      </span>
                    </div>
                  ))}
                </div>
              </foreignObject>
              {activeBarSeries.includes("current") && (
                <Bar dataKey="current" fill="hsl(221.2 83.2% 53.3%)" radius={[4, 4, 0, 0]} />
              )}
              {activeBarSeries.includes("previous") && (
                <Bar dataKey="previous" fill="#93c5fd" radius={[4, 4, 0, 0]} />
              )}
            </BarChart>
          </ChartContainer>
        </div>
      </div>
    </div>
  )
} 