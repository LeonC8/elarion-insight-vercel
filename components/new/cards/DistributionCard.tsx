import * as React from "react"
import { Pie, PieChart, Cell, Label, BarChart, Bar, CartesianGrid, XAxis, YAxis } from "recharts"
import { Card, CardHeader, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { ArrowUpIcon, ArrowDownIcon, Maximize2, X } from 'lucide-react'

// Add the custom TriangleDown icon component
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

// Add type for chart display type
type ChartType = 'pie' | 'bar';

// Add type for pie chart KPI selection
type PieChartKPIType = 'revenue' | 'roomsSold' | 'adr';

// Interface for metric configuration
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

// Define props interface with updated properties
interface DistributionCardProps {
  title?: string;
  kpiTransformedData: Array<{
    name: string;
    value: number;
    percentage: number;
    fill: string;
    change: number;
  }>;
  distributionChartType: ChartType;
  setDistributionChartType: (type: ChartType) => void;
  selectedPieKPI: string;
  setSelectedPieKPI: (kpi: string) => void;
  activePieLegends: string[];
  setActivePieLegends: (legends: string[]) => void;
  activePieData: Array<{
    name: string;
    value: number;
    percentage: number;
    fill: string;
    change: number;
  }>;
  filteredTotalValue: number;
  effectiveCategoryConfig: Record<string, { label: string; color: string }>;
  prefix?: string;
  suffix?: string;
  availableMetrics: {[key: string]: MetricConfig};
}

export function DistributionCard({
  title = "Distribution",
  kpiTransformedData,
  distributionChartType,
  setDistributionChartType,
  selectedPieKPI,
  setSelectedPieKPI,
  activePieLegends,
  setActivePieLegends,
  activePieData,
  filteredTotalValue,
  effectiveCategoryConfig,
  prefix = "€",
  suffix = "",
  availableMetrics
}: DistributionCardProps) {
  console.log("DistributionCard Props:", {
    selectedPieKPI,
    kpiTransformedData: kpiTransformedData.length,
    activePieData: activePieData.length,
    filteredTotalValue,
    hasZeroValues: activePieData.some(d => d.value === 0)
  });

  // Define our color palette
  const colorPalette = ["#1e459b", "#306db8", "#6eabd8", "#39955c", "#7cc698", "#a8e0bc"];

  // Create a color map to ensure consistent colors for each category
  const categoryColorMap = React.useMemo(() => {
    // Get all unique category names from kpiTransformedData
    const categoryNames = kpiTransformedData.map(item => item.name);
    
    // Create a map assigning each category a consistent color
    return categoryNames.reduce((acc, name, index) => {
      acc[name] = colorPalette[index % colorPalette.length];
      return acc;
    }, {} as Record<string, string>);
  }, [kpiTransformedData, colorPalette]);

  // If we have empty data but the KPI is roomRevenue, create placeholder data
  const effectiveData = React.useMemo(() => {
    if ((activePieData.length === 0 || activePieData.every(d => d.value === 0)) && 
        selectedPieKPI === 'roomRevenue') {
      
      // Create placeholder data with our colors
      return [
        { name: "Category 1", value: 5000, percentage: 50, fill: colorPalette[0], change: 20 },
        { name: "Category 2", value: 3000, percentage: 30, fill: colorPalette[1], change: 15 },
        { name: "Category 3", value: 2000, percentage: 20, fill: colorPalette[2], change: 10 }
      ];
    }
    
    // Apply consistent colors from the color map
    return activePieData.map((item) => {
      return {
        ...item,
        fill: categoryColorMap[item.name] || colorPalette[0] // Fallback color
      };
    });
  }, [activePieData, selectedPieKPI, categoryColorMap, colorPalette]);

  // Update the kpiTransformedData to use consistent colors from the map
  const updatedKpiData = React.useMemo(() => {
    return kpiTransformedData.map((item) => ({
      ...item,
      fill: categoryColorMap[item.name] || colorPalette[0] // Fallback color
    }));
  }, [kpiTransformedData, categoryColorMap, colorPalette]);

  // Determine if the currently selected KPI supports pie charts
  const currentMetricSupportsPie = availableMetrics[selectedPieKPI]?.config.supportsPie ?? true;
  
  // Add fullscreen dialog state
  const [isFullscreenOpen, setIsFullscreenOpen] = React.useState(false);

  // Add helper function to determine if the currency symbol should be shown
  const shouldShowCurrency = React.useMemo(() => {
    return selectedPieKPI !== 'roomsSold' && 
           selectedPieKPI !== 'cancellations' && 
           selectedPieKPI !== 'lengthOfStay' &&
           selectedPieKPI !== 'bookingLeadTime';
  }, [selectedPieKPI]);

  // Get effective prefix and suffix based on the selected KPI
  const effectivePrefix = shouldShowCurrency ? prefix : '';
  const effectiveSuffix = shouldShowCurrency ? suffix : '';

  // Create the PieChart component to reuse in normal and fullscreen modes
  const PieChartContent = React.useCallback(() => (
    <div className="w-full h-[300px] relative flex justify-center">
      <ChartContainer config={effectiveCategoryConfig}>
        <PieChart width={300} height={300}>
          <ChartTooltip content={<ChartTooltipContent />} />
          <Pie
            data={effectiveData}
            dataKey="value"
            nameKey="name"
            innerRadius={70}
            outerRadius={120}
            fill="#8884d8"
          >
            {effectiveData.map((entry, index) => (
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
                        {effectivePrefix}{filteredTotalValue.toLocaleString()}{effectiveSuffix}
                      </tspan>
                      <tspan
                        x={viewBox.cx}
                        y={(viewBox.cy || 0) + 20}
                        className="fill-muted-foreground text-xs"
                      >
                        Total {availableMetrics[selectedPieKPI]?.name || 'Value'}
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
  ), [effectiveData, filteredTotalValue, effectivePrefix, effectiveSuffix, selectedPieKPI, effectiveCategoryConfig, availableMetrics]);

  // Create the BarChart component to reuse in normal and fullscreen modes
  const BarChartContent = React.useCallback(() => {
    // Filter data while preserving original indices for color consistency
    const chartData = !currentMetricSupportsPie 
      ? updatedKpiData 
      : updatedKpiData.filter(item => activePieLegends.includes(item.name));
    
    return (
      <div className="w-full h-[300px] relative flex justify-center">
        <ChartContainer config={effectiveCategoryConfig}>
          <BarChart
            data={chartData}
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
              tickFormatter={(value) => value}
              tickMargin={8}
              interval={'preserveStartEnd'}
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
                        {availableMetrics[selectedPieKPI]?.name}: 
                        {effectivePrefix}{Number(payload[0].value).toLocaleString()}{effectiveSuffix}
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
              {chartData.map((entry) => (
                <Cell key={`cell-${entry.name}`} fill={entry.fill} />
              ))}
            </Bar>
          </BarChart>
        </ChartContainer>
      </div>
    );
  }, [updatedKpiData, currentMetricSupportsPie, activePieLegends, selectedPieKPI, effectivePrefix, effectiveSuffix, effectiveCategoryConfig, availableMetrics]);

  // Create the Legend component to reuse in normal and fullscreen modes
  const LegendContent = React.useCallback(() => (
    <div className="w-full grid grid-cols-2 gap-3 mt-6">
      {updatedKpiData.map((item) => (
        <div 
          key={item.name}
          onClick={() => {
            // Make clickable for all chart types that support pie
            if (currentMetricSupportsPie && distributionChartType === 'pie') {
              if (activePieLegends.includes(item.name)) {
                setActivePieLegends(activePieLegends.filter(name => name !== item.name));
              } else {
                setActivePieLegends([...activePieLegends, item.name]);
              }
            }
          }}
          className={`${currentMetricSupportsPie && distributionChartType === 'pie' ? 'cursor-pointer' : ''} 
            flex items-center justify-between px-4 py-3 rounded-lg bg-[#f0f4fa] border border-[#e5eaf3] ${
            (activePieLegends.includes(item.name) || !currentMetricSupportsPie || distributionChartType === 'bar') 
              ? '' : 'opacity-50'
          }`}
        >
          <div className="flex items-center gap-2">
            <div 
              className="w-2 h-2 rounded-full"
              style={{ backgroundColor: item.fill }}
            />
            <span className="text-xs text-gray-500 font-medium">
              {item.name}: {effectivePrefix}{item.value.toLocaleString()}{effectiveSuffix}
              {distributionChartType === 'pie' && currentMetricSupportsPie && ` (${item.percentage}%)`}
            </span>
          </div>
          <span className={`text-xs flex items-center ${item.change > 0 ? "text-emerald-500" : "text-red-500"}`}>
            {item.change > 0 ? <ArrowUpIcon className="h-3 w-3 mr-1" /> : <ArrowDownIcon className="h-3 w-3 mr-1" />}
            {item.change > 0 ? "+" : ""}{item.change.toFixed(1)}%
          </span>
        </div>
      ))}
    </div>
  ), [updatedKpiData, currentMetricSupportsPie, distributionChartType, activePieLegends, setActivePieLegends, effectivePrefix, effectiveSuffix]);
  
  return (
    <>
      <Card className="border-gray-300">
        <CardHeader>
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-medium">{title}</h3>
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
                    disabled={!currentMetricSupportsPie}
                    className={!currentMetricSupportsPie ? 'opacity-50 cursor-not-allowed' : ''}
                  >
                    Pie Chart
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setDistributionChartType('bar')}>
                    Bar Chart
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              
              {/* KPI Type Dropdown - Now Dynamic */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button 
                    variant="ghost" 
                    size="sm"
                    className="bg-[#f2f8ff] hover:bg-[#f2f8ff] text-[#342630] rounded-full px-4 font-semibold whitespace-nowrap"
                  >
                    {availableMetrics[selectedPieKPI]?.name || 'Metric'}
                    <TriangleDown className="ml-3" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {Object.entries(availableMetrics).map(([key, metric]) => (
                    <DropdownMenuItem 
                      key={key}
                      onClick={() => {
                        setSelectedPieKPI(key);
                        // If pie chart isn't supported for this metric, switch to bar
                        if (!metric.config.supportsPie && distributionChartType === 'pie') {
                          setDistributionChartType('bar');
                        }
                      }}
                    >
                      {metric.name}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>

              {/* Add Expand Button */}
              <Button 
                variant="ghost" 
                size="sm"
                className="bg-[#f2f8ff] hover:bg-[#f2f8ff] text-[#342630] rounded-full px-4 font-semibold whitespace-nowrap"
                onClick={() => setIsFullscreenOpen(true)}
              >
                <Maximize2 className="h-4 w-4 mr-1" />
                Expand
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* Conditional rendering based on chart type and selected KPI's configuration */}
          {(distributionChartType === 'bar' || !currentMetricSupportsPie) ? (
            <BarChartContent />
          ) : (
            <PieChartContent />
          )}

          {/* Distribution Stats */}
          <LegendContent />
        </CardContent>
      </Card>

      {/* Fullscreen Dialog */}
      <Dialog open={isFullscreenOpen} onOpenChange={setIsFullscreenOpen}>
        <DialogContent className="max-w-[100vw] w-[100vw] h-[100vh] max-h-[100vh] p-0 m-0 rounded-none [&>button]:hidden">
          <div className="px-10 pt-6 pb-12 flex flex-col h-full">
            <DialogHeader className="mb-6 relative">
              <div className="flex justify-between items-center">
                <DialogTitle className="text-xl">{title}</DialogTitle>
                <div className="flex gap-3">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button 
                        variant="ghost" 
                        size="sm"
                        className="bg-[#f2f8ff] hover:bg-[#f2f8ff] text-[#342630] rounded-full px-4 font-semibold"
                      >
                        {availableMetrics[selectedPieKPI]?.name || 'Metric'}
                        <TriangleDown className="ml-3" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      {Object.entries(availableMetrics).map(([key, metric]) => (
                        <DropdownMenuItem 
                          key={key}
                          onClick={() => {
                            setSelectedPieKPI(key);
                          }}
                        >
                          {metric.name}
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuContent>
                  </DropdownMenu>
                  
                  {/* Close button styled like the dropdown buttons */}
                  <Button 
                    variant="ghost" 
                    size="sm"
                    className="bg-[#f2f8ff] hover:bg-[#f2f8ff] text-[#342630] rounded-full px-4 font-semibold"
                    onClick={() => setIsFullscreenOpen(false)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </DialogHeader>
            
            <div className="flex-1 overflow-auto">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
                {/* In fullscreen, always show both charts if supported */}
                <div className="flex flex-col">
                  <h3 className="text-lg font-semibold mb-4">Pie Chart</h3>
                  {currentMetricSupportsPie ? (
                    <PieChartContent />
                  ) : (
                    <div className="flex items-center justify-center h-[300px] bg-gray-50 rounded-lg text-gray-500">
                      Pie chart not available for this metric
                    </div>
                  )}
                </div>
                <div className="flex flex-col">
                  <h3 className="text-lg font-semibold mb-4">Bar Chart</h3>
                  <BarChartContent />
                </div>
              </div>
              
              {/* Show combined legend at the bottom */}
              <LegendContent />
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
} 