import { ArrowUpIcon, ArrowDownIcon, PercentIcon, HashIcon, ChevronDownIcon } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { useState } from "react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Button } from "@/components/ui/button"
import { DetailedTopProducersDialog } from "./DetailedTopProducersDialog"

interface TopProducerItem {
  name: string
  value: number
  change: number
}

interface TopProducersProps {
  title: string
  data: TopProducerItem[]
  valueLabel?: string
}

export function TopProducers({ title, data, valueLabel = "Revenue" }: TopProducersProps) {
  const [showPercentage, setShowPercentage] = useState(false)
  const [showDetails, setShowDetails] = useState(false)
  const [filterType, setFilterType] = useState<'top' | 'bottom' | 'rising' | 'falling'>('top')
  
  // Find the maximum value to calculate percentages
  const maxValue = Math.max(...data.map(item => item.value))

  // Filter and sort data based on selected filter
  const filteredData = [...data].sort((a, b) => {
    switch (filterType) {
      case 'top':
        return b.value - a.value
      case 'bottom':
        return a.value - b.value
      case 'rising':
        return b.change - a.change
      case 'falling':
        return a.change - b.change
      default:
        return 0
    }
  }).slice(0, 5)

  return (
    <>
      <Card className="bg-white shadow-lg rounded-lg overflow-hidden">
        <CardHeader className="flex flex-col items-start">
          <div className="flex w-full justify-between items-center">
            <CardTitle className="text-lg font-semibold text-gray-800">{title}</CardTitle>
            <div className="flex items-center space-x-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowPercentage(!showPercentage)}
                className="flex items-center justify-center w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 p-0"
              >
                {showPercentage ? (
                  <PercentIcon className="h-4 w-4" />
                ) : (
                  <HashIcon className="h-4 w-4" />
                )}
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button 
                    variant="ghost" 
                    size="sm"
                    className="bg-gray-100 hover:bg-gray-200 rounded-full"
                  >
                    Filter <ChevronDownIcon className="ml-2 h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  <DropdownMenuItem onClick={() => setFilterType('top')}>
                    Top 5
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setFilterType('bottom')}>
                    Bottom 5
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setFilterType('rising')}>
                    Top 5 Rising
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setFilterType('falling')}>
                    Top 5 Falling
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button 
                    variant="ghost" 
                    size="sm"
                    className="bg-gray-100 hover:bg-gray-200 rounded-full px-4"
                  >
                    {valueLabel} <ChevronDownIcon className="ml-2 h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  <DropdownMenuItem>Revenue</DropdownMenuItem>
                  <DropdownMenuItem>Rooms sold</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          {filteredData.map((item, index) => (
            <div
              key={item.name}
              className="relative mb-4 last:mb-0"
            >
              <div className="flex items-center justify-between py-4">
                <span className="text-gray-600">{item.name}</span>
                <div className="flex items-center space-x-4">
                  <span className="font-medium">{item.value}</span>
                  <span 
                    className={`flex items-center text-sm ${
                      item.change > 0 ? 'text-green-500' : 'text-red-500'
                    }`}
                  >
                    {item.change > 0 ? (
                      <ArrowUpIcon className="h-4 w-4 mr-1" />
                    ) : (
                      <ArrowDownIcon className="h-4 w-4 mr-1" />
                    )}
                    {showPercentage 
                      ? `${Math.abs(item.change * 20)}%` 
                      : Math.abs(item.change)
                    }
                  </span>
                </div>
              </div>
              {/* Progress bar container */}
              <div className="absolute bottom-0 left-0 right-0 h-1 bg-gray-100">
                {/* Filled portion - increased opacity and adjusted green color */}
                <div 
                  className="h-full bg-emerald-500 transition-all duration-300"
                  style={{ 
                    width: `${(item.value / maxValue) * 100}%`
                  }} 
                />
              </div>
            </div>
          ))}
          
          {/* View Details button section */}
          <div className="mt-6 pt-4 border-t border-gray-200">
            <div className="flex justify-end">
              <Button
                variant="ghost"
                className="text-blue-600 hover:text-blue-800 font-medium text-sm"
                onClick={() => setShowDetails(true)}
              >
                View Details
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <DetailedTopProducersDialog
        open={showDetails}
        onClose={() => setShowDetails(false)}
        title={title}
        data={data}
        showPercentage={showPercentage}
      />
    </>
  )
} 