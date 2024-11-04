import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { ChevronDownIcon } from 'lucide-react'
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts'
import { useState, useEffect } from 'react'

interface LineChartsProps {
  selectedTimeframe: string;
  comparisonType: 'Last year' | 'Budget' | 'No comparison';
}

interface ChartData {
  date: string;
  cancellations?: number;
  revenueLost?: number;
  noShows?: number;
  comparisonCancellations?: number;
  comparisonRevenueLost?: number;
  comparisonNoShows?: number;
}

const cancellationsData: ChartData[] = [
  { date: '2023-01', cancellations: 5, revenueLost: 500 },
  { date: '2023-02', cancellations: 8, revenueLost: 800 },
  { date: '2023-03', cancellations: 12, revenueLost: 1200 },
  { date: '2023-04', cancellations: 7, revenueLost: 700 },
  { date: '2023-05', cancellations: 10, revenueLost: 1000 },
  { date: '2023-06', cancellations: 15, revenueLost: 1500 },
];

const noShowsData: ChartData[] = [
  { date: '2023-01', noShows: 2 },
  { date: '2023-02', noShows: 4 },
  { date: '2023-03', noShows: 3 },
  { date: '2023-04', noShows: 5 },
  { date: '2023-05', noShows: 6 },
  { date: '2023-06', noShows: 4 },
];

// Function to generate comparison data
const generateComparisonData = (data: ChartData[]): ChartData[] => {
  return data.map(item => ({
    ...item,
    comparisonCancellations: item.cancellations ? Math.round(item.cancellations * (1 + (Math.random() - 0.5) * 0.4)) : undefined,
    comparisonRevenueLost: item.revenueLost ? Math.round(item.revenueLost * (1 + (Math.random() - 0.5) * 0.4)) : undefined,
    comparisonNoShows: item.noShows ? Math.round(item.noShows * (1 + (Math.random() - 0.5) * 0.4)) : undefined,
  }));
};

export function LineCharts({ selectedTimeframe, comparisonType }: LineChartsProps) {
  const [cancellationMetric, setCancellationMetric] = useState<'cancellations' | 'revenueLost'>('cancellations');
  const [combinedCancellationsData, setCombinedCancellationsData] = useState<ChartData[]>([]);
  const [combinedNoShowsData, setCombinedNoShowsData] = useState<ChartData[]>([]);

  useEffect(() => {
    setCombinedCancellationsData(generateComparisonData(cancellationsData));
    setCombinedNoShowsData(generateComparisonData(noShowsData));
  }, []);

  const getDisplayTimeframe = (timeframe: string) => {
    return /\d/.test(timeframe) ? "Custom period" : timeframe;
  };

  const renderAreaChart = (data: ChartData[], title: string, dataKey: string, comparisonDataKey: string, color: string, comparisonColor: string, showSelector: boolean) => (
    <Card className="bg-white shadow-lg rounded-lg overflow-hidden">
      <CardHeader className="flex flex-col items-start">
        <div className="flex w-full justify-between items-center">
          <div>
            <CardTitle className="text-lg font-semibold text-gray-800">{title}</CardTitle>
          </div>
          {showSelector && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm">
                  {cancellationMetric === 'cancellations' ? 'Number of cancellations' : 'Revenue lost'} <ChevronDownIcon className="ml-2 h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuItem onSelect={() => setCancellationMetric('cancellations')}>
                  Number of cancellations
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={() => setCancellationMetric('revenueLost')}>
                  Revenue lost
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
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
                tickFormatter={(value) => dataKey.includes('revenueLost') ? `€${value}` : value.toString()}
              />
              <Tooltip 
                formatter={(value: number, name: string) => {
                  if (name.includes('revenueLost')) {
                    return [`€${value}`, name.includes('comparison') ? 'Comparison Revenue lost' : 'Revenue lost'];
                  }
                  return [value, name.includes('comparison') ? `Comparison ${name}` : name];
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
                <span className="text-sm text-gray-500">{getDisplayTimeframe(selectedTimeframe)}</span>
              </div>
              <div className="flex items-center">
                <div className="w-3 h-3 rounded-full mr-2" style={{ backgroundColor: comparisonColor }}></div>
                <span className="text-sm text-gray-500">{`${getDisplayTimeframe(selectedTimeframe)} ${comparisonType === 'Last year' ? 'STLY' : 'Budget'}`}</span>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-8">
      {renderAreaChart(
        combinedCancellationsData, 
        "Cancellations", 
        cancellationMetric, 
        `comparison${cancellationMetric.charAt(0).toUpperCase() + cancellationMetric.slice(1)}`,
        "#60a5fa", 
        "#82ca9d", 
        true
      )}
      {renderAreaChart(combinedNoShowsData, "No-Shows", "noShows", "comparisonNoShows", "#60a5fa", "#82ca9d", false)}
    </div>
  );
}
