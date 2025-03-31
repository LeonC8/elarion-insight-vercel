import * as React from "react"
import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from "recharts"
import { Card, CardHeader, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ChartContainer, ChartTooltip } from "@/components/ui/chart"
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
  DialogClose,
} from "@/components/ui/dialog"
import { Maximize2, X } from "lucide-react"

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

// Types
type ChartDisplayMode = 'normal' | 'stacked';
type KPIType = 'revenue' | 'roomsSold' | 'adr';

// Add MetricConfig interface
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

// Define props interface for CategoryTimeSeriesCard
interface CategoryTimeSeriesCardProps {
  title?: string;
  categoryChartMode: ChartDisplayMode;
  setCategoryChartMode: (mode: ChartDisplayMode) => void;
  selectedCategoryKPI: string; // Changed from KPIType to string for dynamic metrics
  setSelectedCategoryKPI: (kpi: string) => void;
  effectiveCategoryData: Array<{
    date: string;
    categories: Record<string, {
      current: number;
      previous: number;
    }>;
  }>;
  effectiveCategoryConfig: Record<string, { 
    label: string; 
    color: string 
  }>;
  activeCategories: string[];
  setActiveCategories: (categories: string[]) => void;
  getCategoriesLeftMargin: (data: any[]) => number;
  timeSeriesDatasets: any[]; // Using any[] for simplicity, should be more specific in real code
  prefix?: string;
  availableMetrics: {[key: string]: MetricConfig};
}

export function CategoryTimeSeriesCard({
  title = "Over Time",
  categoryChartMode,
  setCategoryChartMode,
  selectedCategoryKPI,
  setSelectedCategoryKPI,
  effectiveCategoryData,
  effectiveCategoryConfig,
  activeCategories,
  setActiveCategories,
  getCategoriesLeftMargin,
  timeSeriesDatasets,
  prefix = "€",
  availableMetrics
}: CategoryTimeSeriesCardProps) {
  // Define the consistent color palette
  const colorPalette = ["#1e459b", "#306db8", "#6eabd8", "#39955c", "#7cc698", "#a8e0bc"];
  
  // Create a modified category config with our color palette
  const colorizedCategoryConfig = React.useMemo(() => {
    const categoryKeys = Object.keys(effectiveCategoryConfig);
    return categoryKeys.reduce((acc, key, index) => {
      return {
        ...acc,
        [key]: {
          ...effectiveCategoryConfig[key as keyof typeof effectiveCategoryConfig],
          color: colorPalette[index % colorPalette.length]
        }
      };
    }, {});
  }, [effectiveCategoryConfig]);
  
  // Determine if stacked mode is supported for the current KPI
  const supportsStacked = availableMetrics[selectedCategoryKPI]?.config.supportsStacked ?? true;
  
  // Add state for fullscreen dialog
  const [isFullscreenOpen, setIsFullscreenOpen] = React.useState(false);
  
  // Add a function to calculate left margin based on the maximum value
  const getLeftMargin = React.useCallback(() => {
    // Find the largest number in all categories
    let maxNumber = 0;
    
    effectiveCategoryData.forEach(dataPoint => {
      Object.keys(dataPoint.categories)
        .filter(cat => activeCategories.includes(cat))
        .forEach(cat => {
          maxNumber = Math.max(maxNumber, dataPoint.categories[cat].current);
        });
    });
    
    // Convert to string and count digits
    const numLength = Math.round(maxNumber).toString().replace(/,/g, '').length;

    // Map number length to margin values
    const marginMap: { [key: number]: number } = {
      3: -5,  // 100-999
      4: 3,   // 1,000-9,999
      5: 9,   // 10,000-99,999
      6: 18,  // 100,000-999,999
      7: 27   // 1,000,000-9,999,999
    };

    // Return the appropriate margin or default to 3 if not found
    return marginMap[numLength] || 3;
  }, [effectiveCategoryData, activeCategories]);
  
  // Create the chart content component to reuse in both normal and fullscreen mode
  const ChartContent = React.useCallback(({ bottom = 30 }: { bottom?: number }) => {
    // Calculate the maximum value in the data for Y-axis scaling
    const maxValue = React.useMemo(() => {
      let max = 0;
      
      if (categoryChartMode === 'stacked') {
        // For stacked mode, we need to sum values at each data point
        effectiveCategoryData.forEach(dataPoint => {
          const totalAtPoint = Object.keys(dataPoint.categories)
            .filter(cat => activeCategories.includes(cat))
            .reduce((sum, cat) => sum + dataPoint.categories[cat].current, 0);
          max = Math.max(max, totalAtPoint);
        });
      } else {
        // For normal mode, find the highest individual value
        effectiveCategoryData.forEach(dataPoint => {
          Object.keys(dataPoint.categories)
            .filter(cat => activeCategories.includes(cat))
            .forEach(cat => {
              max = Math.max(max, dataPoint.categories[cat].current);
            });
        });
      }
      
      return max;
    }, [effectiveCategoryData, activeCategories, categoryChartMode]);
    
    // Determine appropriate tick count based on max value
    const yAxisTickCount = maxValue <= 3 ? maxValue + 1 : undefined;
    
    return (
      <>
        {/* Area Chart */}
        <ChartContainer config={colorizedCategoryConfig}>
          <AreaChart
            data={effectiveCategoryData}
            height={300}
            margin={{
              top: 30,
              right: 10,
              bottom: bottom,
              left: getLeftMargin(),
            }}
          >
            <defs>
              {Object.keys(colorizedCategoryConfig).map((categoryKey) => (
                <React.Fragment key={categoryKey}>
                  <linearGradient id={`gradient-${categoryKey}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={colorizedCategoryConfig[categoryKey as keyof typeof colorizedCategoryConfig].color} stopOpacity={0.3}/>
                    <stop offset="95%" stopColor={colorizedCategoryConfig[categoryKey as keyof typeof colorizedCategoryConfig].color} stopOpacity={0.1}/>
                  </linearGradient>
                  <linearGradient id={`gradient-${categoryKey}-previous`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={colorizedCategoryConfig[categoryKey as keyof typeof colorizedCategoryConfig].color} stopOpacity={0.05}/>
                    <stop offset="100%" stopColor={colorizedCategoryConfig[categoryKey as keyof typeof colorizedCategoryConfig].color} stopOpacity={0.05}/>
                  </linearGradient>
                </React.Fragment>
              ))}
            </defs>
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis
              dataKey="date"
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
              width={45}
              tickCount={yAxisTickCount}
            />
            <ChartTooltip 
              content={({ active, payload, label }) => {
                if (active && payload && payload.length) {
                  const stackedTotal = categoryChartMode === 'stacked' 
                    ? payload.reduce((sum, entry) => sum + (entry.value as number), 0)
                    : null;
                  
                  return (
                    <div className="bg-white p-4 border border-gray-200 shadow-lg rounded-lg">
                      <p className="font-medium mb-2">{label}</p>
                      {Object.keys(colorizedCategoryConfig).map(categoryKey => {
                        const entry = payload.find(p => p.dataKey === `categories.${categoryKey}.current`)
                        if (!entry) return null
                        return (
                          <div key={categoryKey} className="mb-2">
                            <p className="font-medium" style={{ 
                                color: colorizedCategoryConfig[categoryKey as keyof typeof colorizedCategoryConfig].color 
                              }}>
                              {colorizedCategoryConfig[categoryKey as keyof typeof colorizedCategoryConfig].label}
                            </p>
                            <p className="text-sm">
                              {prefix}{Number(entry.value).toLocaleString()}
                              {stackedTotal && ` (${((entry.value as number) / stackedTotal * 100).toFixed(1)}%)`}
                            </p>
                          </div>
                        )
                      })}
                      {stackedTotal && (
                        <div className="mt-2 pt-2 border-t border-gray-200">
                          <p className="font-medium">Total</p>
                          <p className="text-sm">{prefix}{stackedTotal.toLocaleString()}</p>
                        </div>
                      )}
                    </div>
                  )
                }
                return null
              }}
            />
            {/* Render areas based on chart mode */}
            {Object.keys(colorizedCategoryConfig).map((categoryKey) => (
              activeCategories.includes(categoryKey) && (
                <Area
                  key={categoryKey}
                  type="monotone"
                  dataKey={`categories.${categoryKey}.current`}
                  stroke={colorizedCategoryConfig[categoryKey as keyof typeof colorizedCategoryConfig].color}
                  fill={categoryChartMode === 'stacked' 
                    ? colorizedCategoryConfig[categoryKey as keyof typeof colorizedCategoryConfig].color 
                    : `url(#gradient-${categoryKey})`}
                  fillOpacity={categoryChartMode === 'stacked' ? 0.4 : 1}
                  strokeWidth={2}
                  dot={false}
                  name={String(colorizedCategoryConfig[categoryKey as keyof typeof colorizedCategoryConfig].label)}
                  stackId={categoryChartMode === 'stacked' ? "1" : undefined}
                />
              )
            ))}
          </AreaChart>
        </ChartContainer>

        {/* Categories Over Time Legend - Moved below chart */}
        <div className="flex justify-center gap-3 mt-6 flex-wrap">
          {Object.keys(colorizedCategoryConfig).map((key) => (
            <div
              key={key}
              onClick={() => {
                if (activeCategories.includes(key)) {
                  setActiveCategories(activeCategories.filter(item => item !== key));
                } else {
                  setActiveCategories([...activeCategories, key]);
                }
              }}
              className={`cursor-pointer bg-[#f0f4fa] px-3 py-1.5 rounded-full border border-[#e5eaf3] flex items-center gap-2 ${
                activeCategories.includes(key) ? '' : 'opacity-50'
              }`}
            >
              <div 
                style={{ 
                  backgroundColor: colorizedCategoryConfig[key as keyof typeof colorizedCategoryConfig].color 
                }} 
                className="w-2 h-2 rounded-full" 
              />
              <span className="text-xs text-gray-500 font-medium">
                {colorizedCategoryConfig[key as keyof typeof colorizedCategoryConfig].label}
              </span>
            </div>
          ))}
        </div>
      </>
    );
  }, [effectiveCategoryData, colorizedCategoryConfig, categoryChartMode, activeCategories, timeSeriesDatasets, prefix, getLeftMargin, setActiveCategories]);
  
  return (
    <>
      <Card className="border-gray-300">
        <CardHeader>
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-medium">{title}</h3>
            <div className="flex items-center gap-3">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button 
                    variant="ghost" 
                    size="sm"
                    className="bg-[#f2f8ff] hover:bg-[#f2f8ff] text-[#342630] rounded-full px-4 font-semibold"
                  >
                    {categoryChartMode === 'normal' ? 'Normal' : 'Stacked'}
                    <TriangleDown className="ml-3" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => setCategoryChartMode('normal')}>
                    Normal
                  </DropdownMenuItem>
                  <DropdownMenuItem 
                    onClick={() => setCategoryChartMode('stacked')}
                    disabled={!supportsStacked}
                    className={!supportsStacked ? 'opacity-50 cursor-not-allowed' : ''}
                  >
                    Stacked
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button 
                    variant="ghost" 
                    size="sm"
                    className="bg-[#f2f8ff] hover:bg-[#f2f8ff] text-[#342630] rounded-full px-4 font-semibold"
                  >
                    {availableMetrics[selectedCategoryKPI]?.name || 'Metric'}
                    <TriangleDown className="ml-3" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {Object.entries(availableMetrics).map(([key, metric]) => (
                    <DropdownMenuItem 
                      key={key}
                      onClick={() => {
                        setSelectedCategoryKPI(key as string);
                        // If stacked mode isn't supported, switch to normal
                        if (!metric.config.supportsStacked && categoryChartMode === 'stacked') {
                          setCategoryChartMode('normal');
                        }
                      }}
                    >
                      {metric.name}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
              
              {/* Add Fullscreen Button */}
              <Button 
                variant="ghost" 
                size="sm"
                className="bg-[#f2f8ff] hover:bg-[#f2f8ff] text-[#342630] rounded-full px-4 font-semibold"
                onClick={() => setIsFullscreenOpen(true)}
              >
                <Maximize2 className="h-4 w-4 mr-1" />
                Expand
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <ChartContent bottom={30} />
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
                        {categoryChartMode === 'normal' ? 'Normal' : 'Stacked'}
                        <TriangleDown className="ml-3" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => setCategoryChartMode('normal')}>
                        Normal
                      </DropdownMenuItem>
                      <DropdownMenuItem 
                        onClick={() => setCategoryChartMode('stacked')}
                        disabled={!supportsStacked}
                        className={!supportsStacked ? 'opacity-50 cursor-not-allowed' : ''}
                      >
                        Stacked
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                  
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button 
                        variant="ghost" 
                        size="sm"
                        className="bg-[#f2f8ff] hover:bg-[#f2f8ff] text-[#342630] rounded-full px-4 font-semibold"
                      >
                        {availableMetrics[selectedCategoryKPI]?.name || 'Metric'}
                        <TriangleDown className="ml-3" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      {Object.entries(availableMetrics).map(([key, metric]) => (
                        <DropdownMenuItem 
                          key={key}
                          onClick={() => {
                            setSelectedCategoryKPI(key as string);
                            if (!metric.config.supportsStacked && categoryChartMode === 'stacked') {
                              setCategoryChartMode('normal');
                            }
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
            
            <div className="flex-1 overflow-hidden">
              <div className="h-[calc(100%-20px)]">
                <ChartContent bottom={120} />
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
} 