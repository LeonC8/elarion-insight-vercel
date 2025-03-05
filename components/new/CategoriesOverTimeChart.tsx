"use client"

import * as React from "react"
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer 
} from "recharts"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

interface CategoriesOverTimeChartProps {
  title: string
  subtitle?: string
  data: {
    date: string
    categories: {
      [key: string]: {
        current: number
        previous: number
      }
    }
  }[]
  categories: {
    [key: string]: {
      label: string
      color: string
    }
  }
}

export function CategoriesOverTimeChart({
  title,
  subtitle,
  data,
  categories
}: CategoriesOverTimeChartProps) {
  // Transform data for recharts
  const chartData = data.map(item => {
    const result: any = {
      date: item.date,
    }
    
    Object.entries(item.categories).forEach(([key, values]) => {
      result[key] = values.current
    })
    
    return result
  })

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-medium">{title}</CardTitle>
        {subtitle && (
          <CardDescription>{subtitle}</CardDescription>
        )}
      </CardHeader>
      <CardContent>
        <div className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={chartData}
              margin={{
                top: 5,
                right: 30,
                left: 20,
                bottom: 5,
              }}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
              <Legend />
              {Object.entries(categories).map(([key, config]) => (
                <Line
                  key={key}
                  type="monotone"
                  dataKey={key}
                  name={config.label}
                  stroke={config.color}
                  activeDot={{ r: 8 }}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  )
} 