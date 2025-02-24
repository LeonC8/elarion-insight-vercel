"use client"

import * as React from "react"
import { LabelList, Pie, PieChart } from "recharts"
import { ArrowRight } from "lucide-react"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart"

type CategoryType = "room" | "fnb" | "other"

type ChartDataWithChange = {
  category: CategoryType
  value: number
  fill: string
  change: number
}

const chartData: ChartDataWithChange[] = [
  { category: "room", value: 10200, fill: "hsl(221.2 83.2% 53.3%)", change: 1200 },
  { category: "fnb", value: 3000, fill: "hsl(221.2 83.2% 65.3%)", change: -500 },
  { category: "other", value: 2000, fill: "hsl(221.2 83.2% 87.3%)", change: 300 },
]

const chartConfig = {
  room: {
    label: "Room Revenue",
    color: "hsl(221.2 83.2% 53.3%)",
  },
  fnb: {
    label: "F&B ",
    color: "hsl(221.2 83.2% 65.3%)", 
  },
  other: {
    label: "Other",
    color: "hsl(221.2 83.2% 87.3%)",
  },
} satisfies ChartConfig

export function PieChartWithLabels() {
  const [fullScreenTable, setFullScreenTable] = React.useState(false)
  const [activeCategories, setActiveCategories] = React.useState<CategoryType[]>(["room", "fnb", "other"])
  
  const totalRevenue = React.useMemo(() => {
    return chartData.reduce((acc, curr) => acc + curr.value, 0)
  }, [])

  const calculatePercentageChange = (current: number, change: number): number => {
    const previous = current - change;
    if (previous === 0) return 0;
    return Number(((change / previous) * 100).toFixed(1));
  }

  const renderCustomizedLabel = (props: any) => {
    const RADIAN = Math.PI / 180;
    const { cx, cy, midAngle, outerRadius, percent, category } = props;
    
    // Increase the radius multiplier to position labels further out
    const radius = outerRadius * 1.4; // Changed from 1.2 to 1.4
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);
    
    return (
      <text
        x={x}
        y={y}
        fill="currentColor"
        textAnchor={x > cx ? 'start' : 'end'}
        dominantBaseline="central"
        className="text-xs font-medium"
      >
        {chartConfig[category as CategoryType].label} ({(percent * 100).toFixed(0)}%)
      </text>
    );
  };

  return (
    <>
      <Card className="border-gray-300">
        <CardHeader className="flex flex-col items-start">
          <div className="flex w-full justify-between items-center">
            <CardTitle className="text-lg font-semibold text-gray-800">Revenue Breakdown</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="pb-4">
          <ChartContainer
            config={chartConfig}
            className="mx-auto aspect-[16/9] max-h-[275px] [&_.recharts-text]:fill-foreground"
          >
            <PieChart margin={{ top: 20, right: 80, bottom: 20, left: 80 }}>
              <ChartTooltip
                content={<ChartTooltipContent nameKey="value" hideLabel />}
              />
              <Pie 
                data={chartData.filter(d => activeCategories.includes(d.category))} 
                dataKey="value"
                nameKey="category"
                label={renderCustomizedLabel}
                labelLine={true}
                outerRadius="80%"
              />
            </PieChart>
          </ChartContainer>

          {/* Legend */}
          <div className="flex justify-center gap-3 pt-6 mb-8">
            {Object.entries(chartConfig).map(([key, config]) => {
              const data = chartData.find(d => d.category === key);
              const percentChange = data ? calculatePercentageChange(data.value, data.change) : 0;
              
              return (
                <div
                  key={key}
                  onClick={() => {
                    if (activeCategories.includes(key as CategoryType)) {
                      setActiveCategories(activeCategories.filter(item => item !== key))
                    } else {
                      setActiveCategories([...activeCategories, key as CategoryType])
                    }
                  }}
                  className={`cursor-pointer bg-[#f0f4fa] px-3 py-1.5 rounded-full border border-[#e5eaf3] flex items-center gap-2 ${
                    activeCategories.includes(key as CategoryType) ? '' : 'opacity-50'
                  }`}
                >
                  <div 
                    style={{ backgroundColor: config.color }} 
                    className="w-2 h-2 rounded-full" 
                  />
                  <span className="text-xs text-gray-500 font-medium">
                    {config.label}
                  </span>
                  {data && (
                    <div className={`flex items-center text-xs ${
                      data.change >= 0 ? 'text-green-500' : 'text-red-500'
                    }`}>
                      {data.change >= 0 ? (
                        <ArrowRight className="h-3 w-3 rotate-[-45deg]" />
                      ) : (
                        <ArrowRight className="h-3 w-3 rotate-45" />
                      )}
                      <span>{Math.abs(percentChange)}%</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <div className="mt-3 pt-4 border-t border-gray-200">
            <div className="flex justify-end">
              <Button
                variant="ghost"
                className="text-blue-600 hover:text-blue-800 font-medium text-sm flex items-center gap-2"
                onClick={() => setFullScreenTable(true)}
              >
                View Details
                <ArrowRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Dialog open={fullScreenTable} onOpenChange={setFullScreenTable}>
        <DialogContent className="max-w-7xl min-h-fit max-h-[90vh]">
          <DialogHeader className="pb-6">
            <DialogTitle>Revenue Breakdown</DialogTitle>
          </DialogHeader>
          <div className="border rounded-lg bg-[#f0f4fa]/40 border-[#d0d7e3]">
            <div className="overflow-y-auto max-h-[calc(90vh-120px)]">
              <Table>
                <TableHeader>
                  <TableRow className="border-b border-[#d0d7e3] hover:bg-transparent">
                    <TableHead className="bg-[#f0f4fa]/60 first:rounded-tl-lg text-left border-r border-[#d0d7e3]">
                      Category
                    </TableHead>
                    <TableHead className="bg-[#f0f4fa]/60 text-left border-r border-[#d0d7e3]">
                      Revenue
                    </TableHead>
                    <TableHead className="bg-[#f0f4fa]/60 last:rounded-tr-lg text-left">
                      Percentage
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {chartData.map((row, idx) => (
                    <TableRow key={idx} className="border-b border-[#d0d7e3] last:border-0">
                      <TableCell className="w-[33%] bg-[#f0f4fa]/40 border-r border-[#d0d7e3] text-left">
                        {chartConfig[row.category].label}
                      </TableCell>
                      <TableCell className="w-[33%] text-left border-r border-[#d0d7e3]">
                        €{row.value.toLocaleString()}
                      </TableCell>
                      <TableCell className="w-[33%] text-left">
                        {((row.value / totalRevenue) * 100).toFixed(1)}%
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
} 