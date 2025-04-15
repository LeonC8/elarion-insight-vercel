"use client"

import * as React from "react"
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart"
import { Button } from "@/components/ui/button"
import { ArrowRight } from 'lucide-react'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"

interface HorizontalBarChartProps {
  data: Array<{
    range: string
    current: number
    previous: number
  }>
  title: string
  leftMargin?: number
}

// Chart configuration for current/previous period
const chartConfig = {
  current: {
    label: "Selected Period",
    color: "hsl(221.2 83.2% 53.3%)",  // Blue
  },
  previous: {
    label: "Comparison Period",
    color: "#93c5fd",  // Lighter Blue
  },
} satisfies ChartConfig

// Helper function for formatting percentage change in tables
const formatPercentageChange = (current: number, previous: number): string => {
  if (!isFinite(current) || !isFinite(previous)) return '-'; // Handle non-finite numbers
  if (previous === 0 && current === 0) return '-';
  if (previous === 0) return '+100.0%'; // Current > 0
  if (current === 0) return '-100.0%'; // Previous > 0

  const change = ((current - previous) / previous) * 100;
  // Clamp change to avoid extreme values like Infinity/-Infinity if previous is extremely small
  const clampedChange = Math.max(-1000, Math.min(1000, change));
  return `${clampedChange > 0 ? '+' : ''}${clampedChange.toFixed(1)}%`;
};

export function HorizontalBarChart({ data, title, leftMargin = -10 }: HorizontalBarChartProps) {
  const [activeSeries, setActiveSeries] = React.useState<string[]>([
    'current',
    'previous'
  ])
  const [fullScreenTable, setFullScreenTable] = React.useState(false)

  return (
    <>
      <Card className="border-gray-300">
        <CardHeader>
          <CardTitle className="text-lg font-semibold text-gray-800">
            {title}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ChartContainer config={chartConfig} className="min-h-[345px] w-full">
            <BarChart
              data={data}
              layout="vertical"
              height={300}
              margin={{
                top: 10,
                right: 10,
                bottom: 20,
                left: leftMargin,
              }}
            >
              <CartesianGrid strokeDasharray="3 3" horizontal={false} />
              <XAxis
                type="number"
                tickLine={false}
                axisLine={false}
                tickFormatter={(value) => `${Math.round(value).toLocaleString()}`}
                tickMargin={8}
              />
              <YAxis
                dataKey="range"
                type="category"
                tickLine={false}
                axisLine={false}
                tickMargin={8}
              />
              <ChartTooltip content={<ChartTooltipContent />} />
              {activeSeries.includes('current') && (
                <Bar
                  dataKey="current"
                  fill={chartConfig.current.color}
                  radius={[0, 4, 4, 0]}
                />
              )}
              {activeSeries.includes('previous') && (
                <Bar
                  dataKey="previous"
                  fill={chartConfig.previous.color}
                  radius={[0, 4, 4, 0]}
                />
              )}
            </BarChart>
          </ChartContainer>

          {/* Clickable Legend */}
          <div className="flex justify-center gap-3 mt-6">
            {Object.entries(chartConfig).map(([key, config]) => (
              <div
                key={key}
                onClick={() => {
                  if (activeSeries.includes(key)) {
                    setActiveSeries(activeSeries.filter(item => item !== key))
                  } else {
                    setActiveSeries([...activeSeries, key])
                  }
                }}
                className={`cursor-pointer bg-[#f0f4fa] px-3 py-1.5 rounded-full border border-[#e5eaf3] flex items-center gap-2 ${
                  activeSeries.includes(key) ? '' : 'opacity-50'
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

          <div className="mt-8 pt-4 border-t border-gray-200">
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
            <DialogTitle>{title}</DialogTitle>
          </DialogHeader>
          <div className="border rounded-lg bg-[#f0f4fa]/40 border-[#d0d7e3]">
            <div className="overflow-y-auto max-h-[calc(90vh-120px)]">
              <Table>
                <TableHeader>
                  <TableRow className="border-b border-[#d0d7e3] hover:bg-transparent">
                    <TableHead className="bg-[#f0f4fa]/60 first:rounded-tl-lg text-left border-r border-[#d0d7e3]">
                      Range
                    </TableHead>
                    <TableHead className="bg-[#f0f4fa]/60 text-left border-r border-[#d0d7e3]">
                      Selected Period
                    </TableHead>
                    <TableHead className="bg-[#f0f4fa]/60 text-left border-r border-[#d0d7e3]">
                      Comparison Period
                    </TableHead>
                    <TableHead className="bg-[#f0f4fa]/60 last:rounded-tr-lg text-left">
                      Change
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.map((row, idx) => (
                    <TableRow key={idx} className="border-b border-[#d0d7e3] last:border-0">
                      <TableCell className="w-[25%] bg-[#f0f4fa]/40 border-r border-[#d0d7e3] text-left">
                        {row.range}
                      </TableCell>
                      <TableCell className="w-[25%] text-left border-r border-[#d0d7e3]">
                        {row.current.toLocaleString()}
                      </TableCell>
                      <TableCell className="w-[25%] text-left border-r border-[#d0d7e3]">
                        {row.previous.toLocaleString()}
                      </TableCell>
                      <TableCell className={`w-[25%] text-left ${
                        (row.current > row.previous || (row.previous === 0 && row.current > 0))
                          ? "text-emerald-500"
                          : (row.current < row.previous || (row.current === 0 && row.previous > 0))
                          ? "text-red-500"
                          : "text-gray-700" // Style for '-' case
                      }`}>
                        {formatPercentageChange(row.current, row.previous)}
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