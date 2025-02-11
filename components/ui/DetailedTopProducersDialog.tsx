import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Card } from "@/components/ui/card"
import { ArrowUpIcon, ArrowDownIcon } from "lucide-react"

interface TopProducerItem {
  name: string
  value: number
  change: number
}

interface DetailedTopProducersDialogProps {
  open: boolean
  onClose: () => void
  title: string
  data: TopProducerItem[]
  showPercentage: boolean
}

export function DetailedTopProducersDialog({ 
  open, 
  onClose, 
  title, 
  data,
  showPercentage 
}: DetailedTopProducersDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>{title} - Detailed View</DialogTitle>
        </DialogHeader>
        <div className="mt-4">
          <Card className="bg-white p-6">
            <div className="space-y-4">
              {data.map((item) => {
                const totalValue = data.reduce((sum, i) => sum + i.value, 0)
                const percentage = ((item.value / totalValue) * 100).toFixed(1)
                
                return (
                  <div key={item.name} className="flex items-center justify-between">
                    <span className="text-gray-600">{item.name}</span>
                    <div className="flex items-center space-x-8">
                      <span className="font-medium">{item.value}</span>
                      <span 
                        className={`flex items-center ${
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
                      <span className="text-gray-500">{percentage}%</span>
                    </div>
                  </div>
                )
              })}
            </div>
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  )
} 