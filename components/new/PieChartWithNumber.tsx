"use client"

import * as React from "react"
import { ArrowRight } from "lucide-react"
import { Label, Pie, PieChart } from "recharts"

import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
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

// Update the chart data for revenue breakdown
const chartData = [
  { category: "room", value: 10200, fill: "hsl(152, 76.2%, 36.3%)" },
  { category: "fnb", value: 3000, fill: "hsl(45, 93%, 47%)" },
  { category: "other", value: 2000, fill: "hsl(0, 84%, 92%)" },
]

const chartConfig = {
  room: {
    label: "Room Revenue",
    color: "hsl(152, 76.2%, 36.3%)",
  },
  fnb: {
    label: "F&B Revenue",
    color: "hsl(45, 93%, 47%)",
  },
  other: {
    label: "Other Revenue",
    color: "hsl(0, 84%, 92%)",
  },
} satisfies ChartConfig

export function Component() {
  const [fullScreenTable, setFullScreenTable] = React.useState(false)
  const [activeCategories, setActiveCategories] = React.useState<string[]>(["room", "fnb", "other"])
  
  const totalRevenue = React.useMemo(() => {
    return chartData.reduce((acc, curr) => acc + curr.value, 0)
  }, [])

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
            className="mx-auto aspect-[4/3] max-h-[265px]"
          >
            <PieChart>
              <ChartTooltip
                cursor={false}
                content={<ChartTooltipContent hideLabel />}
              />
              <Pie
                data={chartData.filter(d => activeCategories.includes(d.category))}
                dataKey="value"
                nameKey="category"
                innerRadius={80}
                strokeWidth={5}
              >
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
                            className="fill-foreground text-4xl font-bold"
                          >
                            €{totalRevenue.toLocaleString()}
                          </tspan>
                          <tspan
                            x={viewBox.cx}
                            y={(viewBox.cy || 0) + 28}
                            className="fill-muted-foreground"
                          >
                            Total Revenue
                          </tspan>
                        </text>
                      )
                    }
                  }}
                />
              </Pie>
            </PieChart>
          </ChartContainer>

          <div className="flex justify-center gap-3 pt-6 mb-8">
            {Object.entries(chartConfig).map(([key, config]) => (
              <div
                key={key}
                onClick={() => {
                  if (activeCategories.includes(key)) {
                    setActiveCategories(activeCategories.filter(item => item !== key))
                  } else {
                    setActiveCategories([...activeCategories, key])
                  }
                }}
                className={`cursor-pointer bg-[#f0f4fa] px-3 py-1.5 rounded-full border border-[#e5eaf3] flex items-center gap-2 ${
                  activeCategories.includes(key) ? '' : 'opacity-50'
                }`}
              >
                <div 
                  style={{ backgroundColor: config.color }} 
                  className="w-2 h-2 rounded-full" 
                />
                <span className="text-xs text-gray-500 font-medium">
                  {config.label}
                </span>
              </div>
            ))}
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
