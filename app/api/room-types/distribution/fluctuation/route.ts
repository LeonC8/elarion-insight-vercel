import { NextResponse } from 'next/server';
import { ClickHouseClient, createClient } from '@clickhouse/client';
import { calculateDateRanges, calculateComparisonDateRanges } from '@/lib/dateUtils';

// Interface for top categories in each KPI
interface CategorySummary {
  name: string;
  value: number;
  change: number;
  code: string;
}

// Interface for fluctuation data point
interface FluctuationDataPoint {
  date: string;
  value: number;
  previousValue: number;
  change: number;
}

// Updated interface for the API response
export interface FluctuationResponse {
  metrics: {
    [key: string]: {
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
  };
  kpis: {
    [key: string]: CategorySummary[];
  };
  fluctuationData: {
    [key: string]: Record<string, FluctuationDataPoint[]>;
  };
  timeScale: 'day' | 'month' | 'year';
  actualGranularity: 'day';
}

// Helper function to round numbers - add null checks and default values
function roundValue(value: number | null | undefined): number {
  if (value === null || value === undefined) return 0;
  return value >= 100 ? Math.round(value) : Number(value.toFixed(2));
}

// Helper function to generate a code from a name
function generateCode(name: string, field: string): string {
  return name.toString().toLowerCase().replace(/\s+/g, '_');
}

// Generate an array of dates for the time range
function generateDateRange(startDate: string, endDate: string, intervalType: 'day' | 'month' | 'year'): string[] {
  const dates: string[] = [];
  const start = new Date(startDate);
  const end = new Date(endDate);
  
  let current = new Date(start);
  
  while (current <= end) {
    let dateStr: string;
    
    if (intervalType === 'day') {
      dateStr = current.toISOString().split('T')[0]; // YYYY-MM-DD
    } else if (intervalType === 'month') {
      dateStr = `${current.getFullYear()}-${String(current.getMonth() + 1).padStart(2, '0')}-01`; // YYYY-MM-01
    } else {
      dateStr = `${current.getFullYear()}-01-01`; // YYYY-01-01
    }
    
    if (!dates.includes(dateStr)) {
      dates.push(dateStr);
    }
    
    // Increment the date based on interval type
    if (intervalType === 'day') {
      current.setDate(current.getDate() + 1);
    } else if (intervalType === 'month') {
      current.setMonth(current.getMonth() + 1);
    } else {
      current.setFullYear(current.getFullYear() + 1);
    }
  }
  
  return dates;
}

// Helper function to convert date to index in a range
const datesToIndex = (startDate: string, endDate: string, date: string): number => {
  const start = new Date(startDate).getTime();
  const end = new Date(endDate).getTime();
  const target = new Date(date).getTime();
  
  if (target < start || target > end) return -1;
  
  return Math.floor((target - start) / (24 * 60 * 60 * 1000));
};

export async function GET(request: Request) {
  // Parse query parameters
  const { searchParams } = new URL(request.url);
  const businessDateParam = searchParams.get('businessDate') || new Date().toISOString().split('T')[0];
  const periodType = searchParams.get('periodType') || 'Month'; // Month, Year, Day
  const viewType = searchParams.get('viewType') || 'Actual'; // Actual, OTB, Projected
  const comparisonType = searchParams.get('comparison') || 'Last year - OTB';
  
  // Get the field to analyze
  const field = searchParams.get('field') || 'guest_country';
  
  // Limit for fluctuation data only
  const fluctuationLimit = parseInt(searchParams.get('limit') || '5', 10);
  
  // Calculate date ranges
  const { startDate, endDate } = calculateDateRanges(
    businessDateParam,
    periodType,
    viewType
  );
  
  // Calculate comparison period date ranges
  const { prevStartDate, prevEndDate, prevBusinessDateParam } = calculateComparisonDateRanges(
    startDate,
    endDate,
    businessDateParam,
    comparisonType
  );

  // Time scale for fluctuation data
  const timeScale: 'day' | 'month' | 'year' = 
    periodType === 'Day' ? 'day' : 
    periodType === 'Year' ? 'year' : 'month';

  // Initialize client variable
  let client: ClickHouseClient | undefined;

  try {
    // Create ClickHouse client
    client = createClient({
      host: process.env.CLICKHOUSE_HOST || 'http://34.34.71.156:8123',
      username: process.env.CLICKHOUSE_USER || 'default',
      password: process.env.CLICKHOUSE_PASSWORD || 'elarion'
    });

    // Determine if we're handling producer data
    const isProducerRoute = request.url.includes('producer') || field === 'producer';

    // Add field-specific filters
    let fieldFilters = '';
    if (field === 'guest_country') {
      fieldFilters = `
        AND ${field} != 'UNDEFINED'
        AND ${field} != ''
        AND ${field} IS NOT NULL
      `;
    } else if (isProducerRoute) {
      fieldFilters = `
        AND ${field} != -1
        AND ${field} IS NOT NULL
      `;
    }

    // Producer name mapping
    let producerMap = new Map<number, string>();
    
    if (isProducerRoute) {
      // Query to fetch producer names
      const producerQuery = `
        SELECT 
          producer,
          producer_name
        FROM SAND01CN.producers
        WHERE 
          date(scd_valid_from) <= DATE('${businessDateParam}') 
          AND DATE('${businessDateParam}') < date(scd_valid_to)
          AND producer != -1
      `;
      
      const producerResultSet = await client.query({
        query: producerQuery,
        format: 'JSONEachRow'
      });
      
      const producerData = await producerResultSet.json() as any[];
      
      // Build producer ID to name mapping
      producerData.forEach(item => {
        producerMap.set(parseInt(item.producer), item.producer_name);
      });
    }

    // Helper function to get display name (maps producer ID to name if needed)
    const getDisplayName = (fieldValue: any): string => {
      if (isProducerRoute && producerMap.size > 0) {
        const producerId = parseInt(fieldValue);
        return producerMap.get(producerId) || `Producer ${fieldValue}`;
      }
      return fieldValue.toString();
    };

    // First, get ALL categories for KPIs (remove the LIMIT clause)
    const summaryQuery = `
      SELECT 
        ${field} AS field_name,
        SUM(sold_rooms) AS rooms_sold,
        SUM(roomRevenue) AS room_revenue,
        SUM(fbRevenue) AS fb_revenue,
        SUM(otherRevenue) AS other_revenue,
        SUM(totalRevenue) AS total_revenue,
        SUM(cancelled_rooms) AS cancelled_rooms
      FROM SAND01CN.insights
      WHERE 
        toDate(occupancy_date) BETWEEN '${startDate}' AND '${endDate}'
        AND date(scd_valid_from) <= DATE('${businessDateParam}') 
        AND DATE('${businessDateParam}') < date(scd_valid_to)
        ${fieldFilters}
      GROUP BY ${field}
      ORDER BY total_revenue DESC
    `;

    const prevSummaryQuery = `
      SELECT 
        ${field} AS field_name,
        SUM(sold_rooms) AS rooms_sold,
        SUM(roomRevenue) AS room_revenue,
        SUM(fbRevenue) AS fb_revenue,
        SUM(otherRevenue) AS other_revenue,
        SUM(totalRevenue) AS total_revenue,
        SUM(cancelled_rooms) AS cancelled_rooms
      FROM SAND01CN.insights
      WHERE 
        toDate(occupancy_date) BETWEEN '${prevStartDate}' AND '${prevEndDate}'
        AND date(scd_valid_from) <= DATE('${prevBusinessDateParam}') 
        AND DATE('${prevBusinessDateParam}') < date(scd_valid_to)
        ${fieldFilters}
      GROUP BY ${field}
      ORDER BY total_revenue DESC
    `;

    // Execute the summary queries
    const summaryResultSet = await client.query({
      query: summaryQuery,
      format: 'JSONEachRow'
    });

    const prevSummaryResultSet = await client.query({
      query: prevSummaryQuery,
      format: 'JSONEachRow'
    });

    const summaryData = await summaryResultSet.json() as any[];
    const prevSummaryData = await prevSummaryResultSet.json() as any[];

    // Create a map for previous data for easier lookup
    const prevSummaryMap = new Map();
    prevSummaryData.forEach(item => {
      prevSummaryMap.set(item.field_name, item);
    });

    // Create a separate query to get the top categories for fluctuations
    const topCategoriesQuery = `
      SELECT 
        ${field} AS field_name,
        SUM(totalRevenue) AS total_revenue
      FROM SAND01CN.insights
      WHERE 
        toDate(occupancy_date) BETWEEN '${startDate}' AND '${endDate}'
        AND date(scd_valid_from) <= DATE('${businessDateParam}') 
        AND DATE('${businessDateParam}') < date(scd_valid_to)
        ${fieldFilters}
      GROUP BY ${field}
      ORDER BY total_revenue DESC
      LIMIT ${fluctuationLimit}
    `;

    const topCategoriesResultSet = await client.query({
      query: topCategoriesQuery,
      format: 'JSONEachRow'
    });

    const topCategoriesData = await topCategoriesResultSet.json() as any[];

    // Extract the top category names for fluctuation query
    const topCategoryNames = topCategoriesData.map(item => item.field_name);

    // Define the time granularity for the query - MODIFIED to always use daily granularity
    const timeGroupingClause = "toString(toDate(occupancy_date)) AS date_period";

    // Modified query to get daily data points - update to include cancelled_rooms and fbRevenue
    const fluctuationQuery = `
      SELECT 
        ${timeGroupingClause},
        ${field} AS field_name,
        SUM(sold_rooms) AS rooms_sold,
        SUM(roomRevenue) AS room_revenue,
        SUM(totalRevenue) AS total_revenue,
        SUM(cancelled_rooms) AS cancelled_rooms,
        SUM(fbRevenue) AS fb_revenue
      FROM SAND01CN.insights
      WHERE 
        toDate(occupancy_date) BETWEEN '${startDate}' AND '${endDate}'
        AND date(scd_valid_from) <= DATE('${businessDateParam}') 
        AND DATE('${businessDateParam}') < date(scd_valid_to)
        ${fieldFilters}
        AND ${field} IN (${topCategoryNames.map(name => `'${name}'`).join(',')})
      GROUP BY date_period, field_name
      ORDER BY date_period, field_name
    `;

    // Query for the previous period also using daily granularity - update to include cancelled_rooms and fbRevenue
    const prevFluctuationQuery = `
      SELECT 
        ${timeGroupingClause},
        ${field} AS field_name,
        SUM(sold_rooms) AS rooms_sold,
        SUM(roomRevenue) AS room_revenue,
        SUM(totalRevenue) AS total_revenue,
        SUM(cancelled_rooms) AS cancelled_rooms,
        SUM(fbRevenue) AS fb_revenue
      FROM SAND01CN.insights
      WHERE 
        toDate(occupancy_date) BETWEEN '${prevStartDate}' AND '${prevEndDate}'
        AND date(scd_valid_from) <= DATE('${prevBusinessDateParam}') 
        AND DATE('${prevBusinessDateParam}') < date(scd_valid_to)
        ${fieldFilters}
        AND ${field} IN (${topCategoryNames.map(name => `'${name}'`).join(',')})
      GROUP BY date_period, field_name
      ORDER BY date_period, field_name
    `;

    

    // Execute the fluctuation queries
    const fluctuationResultSet = await client.query({
      query: fluctuationQuery,
      format: 'JSONEachRow'
    });

    const prevFluctuationResultSet = await client.query({
      query: prevFluctuationQuery,
      format: 'JSONEachRow'
    });

    const fluctuationData = await fluctuationResultSet.json() as any[];
    const prevFluctuationData = await prevFluctuationResultSet.json() as any[];

    // Generate the date range for the specified period - ALWAYS use day granularity for data points
    const allDates = generateDateRange(startDate, endDate, 'day');
    
    // Create lookup maps for current and previous period data
    const currentDataMap = new Map();
    const prevDataMap = new Map();
    
    // Organize current period data
    fluctuationData.forEach(item => {
      const category = item.field_name;
      const datePeriod = item.date_period;
      const key = `${category}|${datePeriod}`;
      
      currentDataMap.set(key, {
        revenue: parseFloat(item.total_revenue || '0'),
        roomsSold: parseFloat(item.rooms_sold || '0'),
        roomRevenue: parseFloat(item.room_revenue || '0'),
        cancelled_rooms: parseFloat(item.cancelled_rooms || '0'),
        fbRevenue: parseFloat(item.fb_revenue || '0')
      });
    });
    
    // Organize previous period data
    prevFluctuationData.forEach(item => {
      const category = item.field_name;
      const datePeriod = item.date_period;
      
      // Map previous period date to current period for comparison
      let mappedDate;
      if (timeScale === 'month') {
        // For month, keep month but change year
        const prevDate = new Date(datePeriod);
        const currDate = new Date(prevDate);
        currDate.setFullYear(currDate.getFullYear() + 1);
        mappedDate = currDate.toISOString().split('T')[0].substring(0, 7) + "-01";
      } else if (timeScale === 'day') {
        // For day, ensure correct mapping (may need to adjust for day of week if necessary)
        const dayDiff = (new Date(endDate).getTime() - new Date(startDate).getTime()) / 
                        (1000 * 60 * 60 * 24);
        const prevDayDiff = (new Date(prevEndDate).getTime() - new Date(prevStartDate).getTime()) / 
                        (1000 * 60 * 60 * 24);
        
        if (dayDiff === prevDayDiff) {
          // If periods are same length, map directly
          const prevIdx = datesToIndex(prevStartDate, prevEndDate, datePeriod);
          if (prevIdx !== -1) {
            const mappedIdx = prevIdx / prevDayDiff * dayDiff;
            const mappedMsec = new Date(startDate).getTime() + 
                             (mappedIdx * 24 * 60 * 60 * 1000);
            mappedDate = new Date(mappedMsec).toISOString().split('T')[0];
          }
        } else {
          // If periods have different lengths, use relative positioning
          const prevDate = new Date(datePeriod);
          const relativePosition = (prevDate.getTime() - new Date(prevStartDate).getTime()) / 
                                 (new Date(prevEndDate).getTime() - new Date(prevStartDate).getTime());
          
          const currentSpan = new Date(endDate).getTime() - new Date(startDate).getTime();
          const mappedMsec = new Date(startDate).getTime() + (relativePosition * currentSpan);
          mappedDate = new Date(mappedMsec).toISOString().split('T')[0];
        }
      } else {
        // For year, just add the difference between periods
        const yearDiff = new Date(startDate).getFullYear() - new Date(prevStartDate).getFullYear();
        const prevYear = parseInt(datePeriod.substring(0, 4));
        mappedDate = `${prevYear + yearDiff}-01-01`;
      }
      
      const key = `${category}|${mappedDate}`;
      
      prevDataMap.set(key, {
        revenue: parseFloat(item.total_revenue || '0'),
        roomsSold: parseFloat(item.rooms_sold || '0'),
        roomRevenue: parseFloat(item.room_revenue || '0'),
        cancelled_rooms: parseFloat(item.cancelled_rooms || '0'),
        fbRevenue: parseFloat(item.fb_revenue || '0')
      });
    });

    // Generate complete fluctuation data for each category and KPI
    const revenueFluctuationData: Record<string, FluctuationDataPoint[]> = {};
    const roomsSoldFluctuationData: Record<string, FluctuationDataPoint[]> = {};
    const adrFluctuationData: Record<string, FluctuationDataPoint[]> = {};
    const roomRevenueFluctuationData: Record<string, FluctuationDataPoint[]> = {};
    // Add missing fluctuation data objects
    const cancellationsFluctuationData: Record<string, FluctuationDataPoint[]> = {};
    const fbRevenueFluctuationData: Record<string, FluctuationDataPoint[]> = {};
    
    // For each category, create a time series with all dates
    topCategoryNames.forEach(category => {
      const displayName = getDisplayName(category);
      const revenueSeries: FluctuationDataPoint[] = [];
      const roomsSoldSeries: FluctuationDataPoint[] = [];
      const adrSeries: FluctuationDataPoint[] = [];
      const roomRevenueSeries: FluctuationDataPoint[] = [];
      // Add missing series arrays
      const cancellationsSeries: FluctuationDataPoint[] = [];
      const fbRevenueSeries: FluctuationDataPoint[] = [];
      
      allDates.forEach(date => {
        const key = `${category}|${date}`;
        const currentData = currentDataMap.get(key) || { 
          revenue: 0, 
          roomsSold: 0, 
          roomRevenue: 0, 
          cancelled_rooms: 0,
          fbRevenue: 0 
        };
        
        // Find mapped previous date for comparison
        let prevData = { 
          revenue: 0, 
          roomsSold: 0, 
          roomRevenue: 0,
          cancelled_rooms: 0, // Add missing properties
          fbRevenue: 0 
        };
        
        // For more accurate comparison, look up the equivalent date in the previous period
        if (prevDataMap.has(key)) {
          prevData = prevDataMap.get(key);
        }
        
        // Calculate values and change percentages
        const revenueChange = (prevData.revenue || 0) !== 0 ? 
          ((currentData.revenue - prevData.revenue) / prevData.revenue) * 100 : 0;
        
        const roomsSoldChange = (prevData.roomsSold || 0) !== 0 ? 
          ((currentData.roomsSold - prevData.roomsSold) / prevData.roomsSold) * 100 : 0;
        
        // Calculate ADR
        const currentAdr = (currentData.roomsSold || 0) > 0 ? 
          (currentData.roomRevenue || 0) / currentData.roomsSold : 0;
        const prevAdr = (prevData.roomsSold || 0) > 0 ? 
          (prevData.roomRevenue || 0) / prevData.roomsSold : 0;
        const adrChange = prevAdr !== 0 ? 
          ((currentAdr - prevAdr) / prevAdr) * 100 : 0;
        
        // Add room revenue change calculation
        const roomRevenueChange = (prevData.roomRevenue || 0) !== 0 ? 
          ((currentData.roomRevenue - prevData.roomRevenue) / prevData.roomRevenue) * 100 : 0;
        
        // Add cancellations change calculation
        const cancellationsChange = (prevData.cancelled_rooms || 0) !== 0 ? 
          ((currentData.cancelled_rooms - prevData.cancelled_rooms) / prevData.cancelled_rooms) * 100 : 0;

        // Add F&B revenue change calculation
        const fbRevenueChange = (prevData.fbRevenue || 0) !== 0 ? 
          ((currentData.fbRevenue - prevData.fbRevenue) / prevData.fbRevenue) * 100 : 0;
        
        // Add data points to each series
        revenueSeries.push({
          date,
          value: roundValue(currentData.revenue),
          previousValue: roundValue(prevData.revenue),
          change: roundValue(revenueChange)
        });
        
        roomsSoldSeries.push({
          date,
          value: roundValue(currentData.roomsSold),
          previousValue: roundValue(prevData.roomsSold),
          change: roundValue(roomsSoldChange)
        });
        
        adrSeries.push({
          date,
          value: roundValue(currentAdr),
          previousValue: roundValue(prevAdr),
          change: roundValue(adrChange)
        });
        
        // Add room revenue series instead of cancellations
        roomRevenueSeries.push({
          date,
          value: roundValue(currentData.roomRevenue),
          previousValue: roundValue(prevData.roomRevenue),
          change: roundValue(roomRevenueChange)
        });

        // Add new data points for cancellations and fbRevenue
        cancellationsSeries.push({
          date,
          value: roundValue(currentData.cancelled_rooms),
          previousValue: roundValue(prevData.cancelled_rooms),
          change: roundValue(cancellationsChange)
        });
        
        fbRevenueSeries.push({
          date,
          value: roundValue(currentData.fbRevenue),
          previousValue: roundValue(prevData.fbRevenue),
          change: roundValue(fbRevenueChange)
        });
      });
      
      // Add series for this category to the output data using the display name as the key
      revenueFluctuationData[displayName] = revenueSeries;
      roomsSoldFluctuationData[displayName] = roomsSoldSeries;
      adrFluctuationData[displayName] = adrSeries;
      roomRevenueFluctuationData[displayName] = roomRevenueSeries;
      cancellationsFluctuationData[displayName] = cancellationsSeries;
      fbRevenueFluctuationData[displayName] = fbRevenueSeries;
    });

    // Define metric configurations
    const metricConfigs = {
      revenue: {
        name: "Revenue",
        config: {
          supportsPie: true,
          supportsBar: true,
          supportsNormal: true,
          supportsStacked: true,
          prefix: "€",
          suffix: ""
        }
      },
      roomsSold: {
        name: "Rooms Sold",
        config: {
          supportsPie: true,
          supportsBar: true,
          supportsNormal: true,
          supportsStacked: true,
          prefix: "",
          suffix: ""
        }
      },
      adr: {
        name: "ADR",
        config: {
          supportsPie: false,
          supportsBar: true,
          supportsNormal: true,
          supportsStacked: false,
          prefix: "€",
          suffix: ""
        }
      },
      roomRevenue: {
        name: "Room Revenue",
        config: {
          supportsPie: true,
          supportsBar: true,
          supportsNormal: true,
          supportsStacked: true,
          prefix: "€",
          suffix: ""
        }
      },
      cancellations: {
        name: "Cancellations",
        config: {
          supportsPie: true,
          supportsBar: true,
          supportsNormal: true,
          supportsStacked: true,
          prefix: "",
          suffix: ""
        }
      },
      fbRevenue: {
        name: "F&B Revenue",
        config: {
          supportsPie: true,
          supportsBar: true,
          supportsNormal: true,
          supportsStacked: true,
          prefix: "€",
          suffix: ""
        }
      }
    };

    // Return all KPI records rather than limiting them
    const revenueTopCategories = summaryData.map(item => {
      const prevItem = prevSummaryMap.get(item.field_name) || {
        total_revenue: 0
      };
      
      const value = parseFloat(item.total_revenue || '0');
      const prevValue = parseFloat(prevItem.total_revenue || '0');
      const change = value - prevValue;
      
      const displayName = getDisplayName(item.field_name);
      
      return {
        name: displayName,
        value: roundValue(value),
        change: roundValue(change),
        code: generateCode(displayName, field)
      };
    });

    const roomsSoldTopCategories = summaryData.map(item => {
      const prevItem = prevSummaryMap.get(item.field_name) || {
        rooms_sold: 0
      };
      
      const value = parseFloat(item.rooms_sold || '0');
      const prevValue = parseFloat(prevItem.rooms_sold || '0');
      const change = value - prevValue;
      
      const displayName = getDisplayName(item.field_name);
      
      return {
        name: displayName,
        value: roundValue(value),
        change: roundValue(change),
        code: generateCode(displayName, field)
      };
    });

    const adrTopCategories = summaryData.map(item => {
      const prevItem = prevSummaryMap.get(item.field_name) || {
        rooms_sold: 0,
        room_revenue: 0
      };

      const currentRoomsSold = parseFloat(item.rooms_sold || '0');
      const currentRoomRevenue = parseFloat(item.room_revenue || '0');
      const prevRoomsSold = parseFloat(prevItem.rooms_sold || '0');
      const prevRoomRevenue = parseFloat(prevItem.room_revenue || '0');
      
      const currentAdr = currentRoomsSold > 0 ? currentRoomRevenue / currentRoomsSold : 0;
      const prevAdr = prevRoomsSold > 0 ? prevRoomRevenue / prevRoomsSold : 0;
      const change = currentAdr - prevAdr;
      
      const displayName = getDisplayName(item.field_name);
      
      return {
        name: displayName,
        value: roundValue(currentAdr),
        change: roundValue(change),
        code: generateCode(displayName, field)
      };
    });

    // Replace the cancellations top categories with room revenue top categories
    const roomRevenueTopCategories = summaryData.map(item => {
      const prevItem = prevSummaryMap.get(item.field_name) || {
        room_revenue: 0
      };
      
      const value = parseFloat(item.room_revenue || '0');
      const prevValue = parseFloat(prevItem.room_revenue || '0');
      const change = value - prevValue;
      
      const displayName = getDisplayName(item.field_name);
      
      return {
        name: displayName,
        value: roundValue(value),
        change: roundValue(change),
        code: generateCode(displayName, field)
      };
    });

    // Add new top categories calculations after the roomRevenueTopCategories:
    const cancellationsTopCategories = summaryData.map(item => {
      const prevItem = prevSummaryMap.get(item.field_name) || {
        cancelled_rooms: 0
      };
      
      const value = parseFloat(item.cancelled_rooms || '0');
      const prevValue = parseFloat(prevItem.cancelled_rooms || '0');
      const change = value - prevValue;
      
      const displayName = getDisplayName(item.field_name);
      
      return {
        name: displayName,
        value: roundValue(value),
        change: roundValue(change),
        code: generateCode(displayName, field)
      };
    });

    const fbRevenueTopCategories = summaryData.map(item => {
      const prevItem = prevSummaryMap.get(item.field_name) || {
        fb_revenue: 0
      };
      
      const value = parseFloat(item.fb_revenue || '0');
      const prevValue = parseFloat(prevItem.fb_revenue || '0');
      const change = value - prevValue;
      
      const displayName = getDisplayName(item.field_name);
      
      return {
        name: displayName,
        value: roundValue(value),
        change: roundValue(change),
        code: generateCode(displayName, field)
      };
    });

    // Construct the response with the new structure
    const response: FluctuationResponse = {
      metrics: metricConfigs,
      kpis: {
        revenue: revenueTopCategories,
        roomsSold: roomsSoldTopCategories,
        adr: adrTopCategories,
        roomRevenue: roomRevenueTopCategories,
        cancellations: cancellationsTopCategories,
        fbRevenue: fbRevenueTopCategories
      },
      fluctuationData: {
        revenue: revenueFluctuationData,
        roomsSold: roomsSoldFluctuationData,
        adr: adrFluctuationData,
        roomRevenue: roomRevenueFluctuationData,
        cancellations: cancellationsFluctuationData,
        fbRevenue: fbRevenueFluctuationData
      },
      timeScale,
      actualGranularity: 'day'
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Error querying ClickHouse:', error);
    return NextResponse.json(
      { error: `Failed to fetch ${field} fluctuation data from ClickHouse` },
      { status: 500 }
    );
  } finally {
    // Close client connection if it exists
    if (client) {
      await client.close();
    }
  }
} 