import { NextResponse } from 'next/server'

// Configuration interface for datasets
interface DatasetConfig {
  id: string
  name: string
  unit: string
  prefix?: string
  suffix?: string
  chartTypes: {
    pie: boolean
    bar: boolean
    stacked: boolean
  }
}

// Standardized interfaces for data
interface Category {
  id: string
  name: string
  color: string
}

interface PieChartData {
  categoryId: string
  value: number
  percentage: number
}

interface TimeSeriesPoint {
  date: string
  values: {
    [categoryId: string]: {
      current: number
      previous: number
    }
  }
}

interface TableDataRow {
  categoryId: string
  metrics: {
    [datasetId: string]: {
      current: number
      previous: number
      change: number
    }
  }
}

interface CategoriesDetailResponse {
  categories: Category[]
  datasets: DatasetConfig[]
  pieData: {
    [datasetId: string]: PieChartData[]
  }
  timeSeriesData: {
    [datasetId: string]: TimeSeriesPoint[]
  }
  tableData: TableDataRow[]
}

// Define standard category colors
const CATEGORY_COLORS = {
  leisure: "#18b0cc",
  business: "#1eb09a", 
  groups: "#3b56de",
  conferences: "#713ddd",
  wholesale: "#22a74f",
  government: "#f59e0b",
  packages: "#7c3aed",
  other: "#ef4444"
}

// Define all possible categories
const allCategories: Category[] = [
  { id: 'standard', name: 'Standard Rooms', color: CATEGORY_COLORS.leisure },
  { id: 'deluxe', name: 'Deluxe Rooms', color: CATEGORY_COLORS.business },
  { id: 'suite', name: 'Suites', color: CATEGORY_COLORS.groups },
  { id: 'executive', name: 'Executive Rooms', color: CATEGORY_COLORS.conferences },
  { id: 'family', name: 'Family Rooms', color: CATEGORY_COLORS.wholesale },
  { id: 'connecting', name: 'Connecting Rooms', color: CATEGORY_COLORS.government },
  { id: 'accessible', name: 'Accessible Rooms', color: CATEGORY_COLORS.packages },
  { id: 'other', name: 'Other Room Types', color: CATEGORY_COLORS.other }
]

// Define available datasets
const datasets: DatasetConfig[] = [
  {
    id: 'revenue',
    name: 'Revenue',
    unit: 'currency',
    prefix: '€',
    chartTypes: { pie: true, bar: true, stacked: true }
  },
  {
    id: 'roomRevenue',
    name: 'Room Revenue',
    unit: 'currency',
    prefix: '€',
    chartTypes: { pie: true, bar: true, stacked: true }
  },
  {
    id: 'roomsSold',
    name: 'Rooms Sold',
    unit: 'count',
    chartTypes: { pie: true, bar: true, stacked: true }
  },
  {
    id: 'adr',
    name: 'ADR',
    unit: 'currency',
    prefix: '€',
    chartTypes: { pie: false, bar: true, stacked: false }
  },
  {
    id: 'occupancy',
    name: 'Occupancy',
    unit: 'percentage',
    suffix: '%',
    chartTypes: { pie: false, bar: true, stacked: false }
  },
  {
    id: 'fnbRevenue',
    name: 'F&B Revenue',
    unit: 'currency',
    prefix: '€',
    chartTypes: { pie: true, bar: true, stacked: true }
  },
  {
    id: 'leadTime',
    name: 'Lead Time',
    unit: 'days',
    suffix: ' days',
    chartTypes: { pie: false, bar: true, stacked: false }
  },
  {
    id: 'cancellations',
    name: 'Cancellations',
    unit: 'count',
    chartTypes: { pie: true, bar: true, stacked: true }
  },
  {
    id: 'alos',
    name: 'Avg. Length of Stay',
    unit: 'nights',
    suffix: ' nights',
    chartTypes: { pie: false, bar: true, stacked: false }
  }
]

export async function GET() {
  // Generate the data structure
  const response: CategoriesDetailResponse = {
    categories: allCategories.slice(0, 5), // Use first 5 categories by default
    datasets,
    pieData: {},
    timeSeriesData: {},
    tableData: []
  }
  
  // Generate pie chart data for each dataset
  datasets.forEach(dataset => {
    response.pieData[dataset.id] = response.categories.map(category => {
      // Generate different base values based on category and dataset
      let baseValue: number
      
      if (dataset.id === 'revenue') {
        baseValue = 300000 + Math.floor(Math.random() * 700000)
      } else if (dataset.id === 'roomRevenue') {
        // Room revenue is typically 70-85% of total revenue
        const totalRevenue = 300000 + Math.floor(Math.random() * 700000)
        baseValue = Math.floor(totalRevenue * (0.7 + Math.random() * 0.15))
      } else if (dataset.id === 'roomsSold') {
        baseValue = 1500 + Math.floor(Math.random() * 3000)
      } else if (dataset.id === 'adr') {
        baseValue = 100 + Math.floor(Math.random() * 150)
      } else if (dataset.id === 'occupancy') {
        // Occupancy rates typically range from 55-90%
        if (category.id === 'leisure') {
          baseValue = 65 + Math.floor(Math.random() * 25) // 65-90%
        } else if (category.id === 'business') {
          baseValue = 70 + Math.floor(Math.random() * 20) // 70-90%
        } else if (category.id === 'groups') {
          baseValue = 70 + Math.floor(Math.random() * 25) // 70-95%
        } else if (category.id === 'conferences') {
          baseValue = 70 + Math.floor(Math.random() * 25) // 70-95%
        } else {
          baseValue = 55 + Math.floor(Math.random() * 20) // 55-75%
        }
      } else if (dataset.id === 'fnbRevenue') {
        baseValue = 70000 + Math.floor(Math.random() * 150000)
      } else if (dataset.id === 'leadTime') {
        // Generate lead time values - different booking channels have different typical lead times
        if (category.id === 'leisure') {
          baseValue = 15 + Math.floor(Math.random() * 15) // 15-30 days
        } else if (category.id === 'business') {
          baseValue = 7 + Math.floor(Math.random() * 14) // 7-21 days
        } else if (category.id === 'groups') {
          baseValue = 60 + Math.floor(Math.random() * 60) // 60-120 days
        } else if (category.id === 'conferences') {
          baseValue = 60 + Math.floor(Math.random() * 60) // 60-120 days
        } else {
          baseValue = 20 + Math.floor(Math.random() * 40) // 20-60 days
        }
      } else if (dataset.id === 'cancellations') {
        // Cancellation rates vary by booking channel
        if (category.id === 'leisure') {
          baseValue = 20 + Math.floor(Math.random() * 40) // Lower cancellations for leisure
        } else if (category.id === 'business') {
          baseValue = 80 + Math.floor(Math.random() * 150) // Higher for business
        } else if (category.id === 'groups') {
          baseValue = 5 + Math.floor(Math.random() * 15) // Very low for groups
        } else {
          baseValue = 30 + Math.floor(Math.random() * 70) // Medium-high for other market segments
        }
      } else if (dataset.id === 'alos') {
        // Average length of stay varies by booking channel
        if (category.id === 'leisure') {
          baseValue = 180 + Math.floor(Math.random() * 70) // 1.8-2.5 nights
        } else if (category.id === 'business') {
          baseValue = 160 + Math.floor(Math.random() * 120) // 1.6-2.8 nights
        } else if (category.id === 'groups') {
          baseValue = 300 + Math.floor(Math.random() * 200) // 3.0-5.0 nights
        } else if (category.id === 'conferences') {
          baseValue = 300 + Math.floor(Math.random() * 200) // 3.0-5.0 nights
        } else {
          baseValue = 150 + Math.floor(Math.random() * 150) // 1.5-3.0 nights
        }
        // Convert to decimal for display (storing as integer x100 for calculations)
        baseValue = baseValue / 100
      } else {
        baseValue = 1000 + Math.floor(Math.random() * 5000)
      }
      
      return {
        categoryId: category.id,
        value: baseValue,
        percentage: 0 // Will calculate after all values are generated
      }
    })
    
    // Calculate percentages
    const totalValue = response.pieData[dataset.id].reduce((sum, item) => sum + item.value, 0)
    response.pieData[dataset.id].forEach(item => {
      item.percentage = Number(((item.value / totalValue) * 100).toFixed(1))
    })
  })
  
  // Generate time series data for each dataset
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun']
  
  datasets.forEach(dataset => {
    response.timeSeriesData[dataset.id] = months.map((month, monthIndex) => {
      const values: { [categoryId: string]: { current: number, previous: number } } = {}
      
      response.categories.forEach(category => {
        // Generate base values for each category based on dataset
        let baseValue: number
        
        if (dataset.id === 'revenue') {
          baseValue = 150000 + Math.floor(Math.random() * 200000)
        } else if (dataset.id === 'roomRevenue') {
          // Room revenue is typically 70-85% of total revenue
          const totalRevenue = 150000 + Math.floor(Math.random() * 200000)
          baseValue = Math.floor(totalRevenue * (0.7 + Math.random() * 0.15))
        } else if (dataset.id === 'roomsSold') {
          baseValue = 800 + Math.floor(Math.random() * 1200)
        } else if (dataset.id === 'adr') {
          baseValue = 100 + Math.floor(Math.random() * 150)
        } else if (dataset.id === 'occupancy') {
          // Occupancy rates typically range from 55-90% with seasonal patterns
          let basePct: number
          if (category.id === 'leisure') {
            basePct = 65 + Math.floor(Math.random() * 25) // 65-90%
          } else if (category.id === 'business') {
            basePct = 70 + Math.floor(Math.random() * 20) // 70-90%
          } else if (category.id === 'groups') {
            basePct = 70 + Math.floor(Math.random() * 25) // 70-95%
          } else if (category.id === 'conferences') {
            basePct = 70 + Math.floor(Math.random() * 25) // 70-95%
          } else {
            basePct = 55 + Math.floor(Math.random() * 20) // 55-75%
          }
          baseValue = basePct
        } else if (dataset.id === 'fnbRevenue') {
          baseValue = 30000 + Math.floor(Math.random() * 80000)
        } else if (dataset.id === 'leadTime') {
          // Generate lead time values with category-specific ranges
          if (category.id === 'leisure') {
            baseValue = 15 + Math.floor(Math.random() * 15) // 15-30 days
          } else if (category.id === 'business') {
            baseValue = 7 + Math.floor(Math.random() * 14) // 7-21 days
          } else if (category.id === 'groups') {
            baseValue = 60 + Math.floor(Math.random() * 60) // 60-120 days
          } else if (category.id === 'conferences') {
            baseValue = 60 + Math.floor(Math.random() * 60) // 60-120 days
          } else {
            baseValue = 20 + Math.floor(Math.random() * 40) // 20-60 days
          }
        } else if (dataset.id === 'cancellations') {
          // Cancellation counts for time series
          if (category.id === 'leisure') {
            baseValue = 10 + Math.floor(Math.random() * 20) // Lower cancellations for leisure
          } else if (category.id === 'business') {
            baseValue = 40 + Math.floor(Math.random() * 80) // Higher for business
          } else if (category.id === 'groups') {
            baseValue = 3 + Math.floor(Math.random() * 7) // Very low for groups
          } else {
            baseValue = 15 + Math.floor(Math.random() * 35) // Medium-high for other market segments
          }
        } else if (dataset.id === 'alos') {
          // Average length of stay for time series (stored as decimal)
          if (category.id === 'leisure') {
            baseValue = 1.8 + Math.random() * 0.7 // 1.8-2.5 nights
          } else if (category.id === 'business') {
            baseValue = 1.6 + Math.random() * 1.2 // 1.6-2.8 nights
          } else if (category.id === 'groups') {
            baseValue = 3.0 + Math.random() * 2.0 // 3.0-5.0 nights
          } else if (category.id === 'conferences') {
            baseValue = 3.0 + Math.random() * 2.0 // 3.0-5.0 nights
          } else {
            baseValue = 1.5 + Math.random() * 1.5 // 1.5-3.0 nights
          }
          // Round to 1 decimal place
          baseValue = Math.round(baseValue * 10) / 10
        } else {
          baseValue = 500 + Math.floor(Math.random() * 2000)
        }
        
        // Add seasonality factor (different for each dataset)
        let monthFactor: number
        
        if (dataset.id === 'leadTime') {
          monthFactor = 0.9 + (Math.sin(monthIndex * 0.5) * 0.2) // Less seasonal variation for lead time
        } else if (dataset.id === 'occupancy') {
          // Occupancy has strong seasonality - higher in summer months
          monthFactor = 0.7 + (Math.sin((monthIndex + 3) * 0.7) * 0.3) // Peaks in summer
        } else if (dataset.id === 'cancellations') {
          // Cancellations often spike in certain months
          monthFactor = 0.8 + (Math.cos(monthIndex * 1.2) * 0.4) // More variation
        } else if (dataset.id === 'alos') {
          // ALOS tends to be higher in summer/holiday periods
          monthFactor = 0.85 + (Math.sin((monthIndex + 2) * 0.8) * 0.25) // Moderate seasonality
        } else {
          monthFactor = 0.7 + (Math.sin(monthIndex * 0.7) * 0.5) // Standard seasonality
        }
        
        values[category.id] = {
          current: Math.round((baseValue * monthFactor * (0.85 + Math.random() * 0.4)) * 10) / 10,
          previous: Math.round((baseValue * monthFactor * (0.6 + Math.random() * 0.3)) * 10) / 10
        }
      })
      
      return {
        date: month,
        values
      }
    })
  })
  
  // Generate table data
  response.tableData = response.categories.map(category => {
    const metrics: { [datasetId: string]: { current: number, previous: number, change: number } } = {}
    
    datasets.forEach(dataset => {
      // Get or generate values for this category and dataset
      let current: number
      
      if (response.pieData[dataset.id]) {
        // Use existing pie data if available
        const pieItem = response.pieData[dataset.id].find(item => item.categoryId === category.id)
        current = pieItem ? pieItem.value : 0
      } else if (dataset.id === 'revenue') {
        current = 300000 + Math.floor(Math.random() * 700000)
      } else if (dataset.id === 'roomRevenue') {
        // Room revenue is typically 70-85% of total revenue
        const totalRevenue = 300000 + Math.floor(Math.random() * 700000)
        current = Math.floor(totalRevenue * (0.7 + Math.random() * 0.15))
      } else if (dataset.id === 'roomsSold') {
        current = 1500 + Math.floor(Math.random() * 3000)
      } else if (dataset.id === 'adr') {
        current = 100 + Math.floor(Math.random() * 150)
      } else if (dataset.id === 'occupancy') {
        // Occupancy rates for table
        if (category.id === 'leisure') {
          current = 65 + Math.floor(Math.random() * 25) // 65-90%
        } else if (category.id === 'business') {
          current = 70 + Math.floor(Math.random() * 20) // 70-90%
        } else if (category.id === 'groups') {
          current = 70 + Math.floor(Math.random() * 25) // 70-95%
        } else if (category.id === 'conferences') {
          current = 70 + Math.floor(Math.random() * 25) // 70-95%
        } else {
          current = 55 + Math.floor(Math.random() * 20) // 55-75%
        }
      } else if (dataset.id === 'fnbRevenue') {
        current = 70000 + Math.floor(Math.random() * 150000)
      } else if (dataset.id === 'leadTime') {
        // Generate lead time values for the table
        if (category.id === 'leisure') {
          current = 15 + Math.floor(Math.random() * 15) // 15-30 days
        } else if (category.id === 'business') {
          current = 7 + Math.floor(Math.random() * 14) // 7-21 days
        } else if (category.id === 'groups') {
          current = 60 + Math.floor(Math.random() * 60) // 60-120 days
        } else if (category.id === 'conferences') {
          current = 60 + Math.floor(Math.random() * 60) // 60-120 days
        } else {
          current = 20 + Math.floor(Math.random() * 40) // 20-60 days
        }
      } else if (dataset.id === 'cancellations') {
        // Cancellations for table
        if (category.id === 'leisure') {
          current = 20 + Math.floor(Math.random() * 40)
        } else if (category.id === 'business') {
          current = 80 + Math.floor(Math.random() * 150)
        } else if (category.id === 'groups') {
          current = 5 + Math.floor(Math.random() * 15)
        } else {
          current = 30 + Math.floor(Math.random() * 70)
        }
      } else if (dataset.id === 'alos') {
        // ALOS for table (as decimal)
        if (category.id === 'leisure') {
          current = Math.round((1.8 + Math.random() * 0.7) * 10) / 10
        } else if (category.id === 'business') {
          current = Math.round((1.6 + Math.random() * 1.2) * 10) / 10
        } else if (category.id === 'groups') {
          current = Math.round((3.0 + Math.random() * 2.0) * 10) / 10
        } else if (category.id === 'conferences') {
          current = Math.round((3.0 + Math.random() * 2.0) * 10) / 10
        } else {
          current = Math.round((1.5 + Math.random() * 1.5) * 10) / 10
        }
      } else {
        current = 1000 + Math.floor(Math.random() * 5000)
      }
      
      // Determine previous year multiplier based on metric type
      let previousMultiplier: number
      
      if (dataset.id === 'leadTime') {
        previousMultiplier = 1.03 + Math.random() * 0.10 // Lead times were longer last year (5-15% longer)
      } else if (dataset.id === 'cancellations') {
        previousMultiplier = 1.05 + Math.random() * 0.15 // Cancellations were higher last year
      } else if (dataset.id === 'occupancy') {
        previousMultiplier = 0.92 + Math.random() * 0.06 // Occupancy was lower last year
      } else if (dataset.id === 'alos') {
        previousMultiplier = 0.95 + Math.random() * 0.08 // ALOS was slightly lower last year
      } else {
        previousMultiplier = 0.9 + Math.random() * 0.07 // Standard metrics were lower last year
      }
      
      // Calculate previous year value
      const previous = Math.round(current * previousMultiplier * 10) / 10
      
      // Calculate change
      const change = ((current - previous) / previous) * 100
      
      metrics[dataset.id] = {
        current,
        previous,
        change
      }
    })
    
    return {
      categoryId: category.id,
      metrics
    }
  })
  
  return NextResponse.json(response)
} 