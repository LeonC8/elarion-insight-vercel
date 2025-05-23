import { NextResponse } from 'next/server';
import { ClickHouseClient, createClient } from '@clickhouse/client';
import { calculateDateRanges, calculateComparisonDateRanges } from '@/lib/dateUtils';

// Interface for the response
export interface LeadTimesByMarketSegmentResponse {
  data: {
    [marketSegment: string]: {
      datasets: {
        [datasetKey: string]: {
          title: string;
          data: Array<{
            range: string;
            current: number;
            previous: number;
          }>;
        }
      }
    }
  };
}

export async function GET(request: Request) {
  // Parse query parameters
  const { searchParams } = new URL(request.url);
  const businessDateParam = searchParams.get('businessDate') || new Date().toISOString().split('T')[0];
  const periodType = searchParams.get('periodType') || 'Month'; // Month, Year, Day
  const viewType = searchParams.get('viewType') || 'Actual'; // Actual, OTB, Projected
  const comparisonType = searchParams.get('comparison') || 'Last year - OTB'; 
  
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

  // Initialize client variable
  let client: ClickHouseClient | undefined;

  try {
    // Create ClickHouse client
    client = createClient({
      url: process.env.CLICKHOUSE_HOST || 'http://34.34.71.156:8123',
      username: process.env.CLICKHOUSE_USER || 'default',
      password: process.env.CLICKHOUSE_PASSWORD || 'elarion'
    });

    // 1. First query for booking lead time data (current period)
    const bookingLeadTimeCurrentQuery = `
      SELECT 
        market_group_code,
        bucket AS time_range,
        SUM(booking_lead_num) AS count
      FROM SAND01CN.booking_lead_time
      WHERE 
        toDate(occupancy_date) BETWEEN '${startDate}' AND '${endDate}'
        AND date(scd_valid_from) <= DATE('${businessDateParam}') 
        AND DATE('${businessDateParam}') < date(scd_valid_to)
      GROUP BY market_group_code, bucket
      ORDER BY market_group_code, bucket ASC
    `;

    // 2. Second query for booking lead time data (previous period)
    const bookingLeadTimePreviousQuery = `
      SELECT 
        market_group_code,
        bucket AS time_range,
        SUM(booking_lead_num) AS count
      FROM SAND01CN.booking_lead_time
      WHERE 
        toDate(occupancy_date) BETWEEN '${prevStartDate}' AND '${prevEndDate}'
        AND date(scd_valid_from) <= DATE('${prevBusinessDateParam}') 
        AND DATE('${prevBusinessDateParam}') < date(scd_valid_to)
      GROUP BY market_group_code, bucket
      ORDER BY market_group_code, bucket ASC
    `;

    // 3. Third query for cancellation lead time data (current period)
    const cancellationLeadTimeCurrentQuery = `
      SELECT 
        market_group_code,
        bucket AS time_range,
        SUM(cancellation_lead_num) AS count
      FROM SAND01CN.cancellation_lead_time
      WHERE 
        toDate(occupancy_date) BETWEEN '${startDate}' AND '${endDate}'
        AND date(scd_valid_from) <= DATE('${businessDateParam}') 
        AND DATE('${businessDateParam}') < date(scd_valid_to)
      GROUP BY market_group_code, bucket
      ORDER BY market_group_code, bucket ASC
    `;

    // 4. Fourth query for cancellation lead time data (previous period)
    const cancellationLeadTimePreviousQuery = `
      SELECT 
        market_group_code,
        bucket AS time_range,
        SUM(cancellation_lead_num) AS count
      FROM SAND01CN.cancellation_lead_time
      WHERE 
        toDate(occupancy_date) BETWEEN '${prevStartDate}' AND '${prevEndDate}'
        AND date(scd_valid_from) <= DATE('${prevBusinessDateParam}') 
        AND DATE('${prevBusinessDateParam}') < date(scd_valid_to)
      GROUP BY market_group_code, bucket
      ORDER BY market_group_code, bucket ASC
    `;

    // Execute all four queries
    const [
      bookingLeadTimeCurrentResultSet,
      bookingLeadTimePreviousResultSet,
      cancellationLeadTimeCurrentResultSet,
      cancellationLeadTimePreviousResultSet
    ] = await Promise.all([
      client.query({
        query: bookingLeadTimeCurrentQuery,
        format: 'JSONEachRow'
      }),
      client.query({
        query: bookingLeadTimePreviousQuery,
        format: 'JSONEachRow'
      }),
      client.query({
        query: cancellationLeadTimeCurrentQuery,
        format: 'JSONEachRow'
      }),
      client.query({
        query: cancellationLeadTimePreviousQuery,
        format: 'JSONEachRow'
      })
    ]);

    // Parse results
    const bookingLeadTimeCurrentData = await bookingLeadTimeCurrentResultSet.json() as any[];
    const bookingLeadTimePreviousData = await bookingLeadTimePreviousResultSet.json() as any[];
    const cancellationLeadTimeCurrentData = await cancellationLeadTimeCurrentResultSet.json() as any[];
    const cancellationLeadTimePreviousData = await cancellationLeadTimePreviousResultSet.json() as any[];

    // Create maps for previous data for easier lookup
    const bookingLeadTimePreviousMap = new Map();
    bookingLeadTimePreviousData.forEach(item => {
      const key = `${item.market_group_code}|${item.time_range}`;
      bookingLeadTimePreviousMap.set(key, item);
    });

    const cancellationLeadTimePreviousMap = new Map();
    cancellationLeadTimePreviousData.forEach(item => {
      const key = `${item.market_group_code}|${item.time_range}`;
      cancellationLeadTimePreviousMap.set(key, item);
    });

    // Process data to organize by market segment
    const dataByMarketSegment: LeadTimesByMarketSegmentResponse['data'] = {};

    // First pass: collect all data and identify all unique buckets for both datasets
    const bookingLeadTimeBuckets = new Set<string>();
    const cancellationLeadTimeBuckets = new Set<string>();
    
    // Process booking lead time current data
    bookingLeadTimeCurrentData.forEach(item => {
      const marketSegment = item.market_group_code;
      const timeRange = item.time_range;
      bookingLeadTimeBuckets.add(timeRange);
      
      const key = `${marketSegment}|${timeRange}`;
      const prevItem = bookingLeadTimePreviousMap.get(key) || { count: 0 };
      
      if (!dataByMarketSegment[marketSegment]) {
        dataByMarketSegment[marketSegment] = {
          datasets: {}
        };
      }
      
      // Make sure the booking_lead_time dataset exists
      if (!dataByMarketSegment[marketSegment].datasets.booking_lead_time) {
        dataByMarketSegment[marketSegment].datasets.booking_lead_time = {
          title: "Booking Lead Time",
          data: []
        };
      }
      
      dataByMarketSegment[marketSegment].datasets.booking_lead_time.data.push({
        range: timeRange,
        current: parseInt(item.count || '0', 10),
        previous: parseInt(prevItem.count || '0', 10)
      });
    });

    // Process cancellation lead time current data
    cancellationLeadTimeCurrentData.forEach(item => {
      const marketSegment = item.market_group_code;
      const timeRange = item.time_range;
      cancellationLeadTimeBuckets.add(timeRange);
      
      const key = `${marketSegment}|${timeRange}`;
      const prevItem = cancellationLeadTimePreviousMap.get(key) || { count: 0 };
      
      if (!dataByMarketSegment[marketSegment]) {
        dataByMarketSegment[marketSegment] = {
          datasets: {}
        };
      }
      
      // Make sure the cancellation_lead_time dataset exists
      if (!dataByMarketSegment[marketSegment].datasets.cancellation_lead_time) {
        dataByMarketSegment[marketSegment].datasets.cancellation_lead_time = {
          title: "Cancellation Lead Time",
          data: []
        };
      }
      
      dataByMarketSegment[marketSegment].datasets.cancellation_lead_time.data.push({
        range: timeRange,
        current: parseInt(item.count || '0', 10),
        previous: parseInt(prevItem.count || '0', 10)
      });
    });

    // Add any market segments and buckets from previous data that might not be in current data
    bookingLeadTimePreviousData.forEach(prevItem => {
      const marketSegment = prevItem.market_group_code;
      const timeRange = prevItem.time_range;
      bookingLeadTimeBuckets.add(timeRange);
      
      // Check if this market segment exists in our result
      if (!dataByMarketSegment[marketSegment]) {
        dataByMarketSegment[marketSegment] = {
          datasets: {}
        };
      }
      
      // Make sure the booking_lead_time dataset exists
      if (!dataByMarketSegment[marketSegment].datasets.booking_lead_time) {
        dataByMarketSegment[marketSegment].datasets.booking_lead_time = {
          title: "Booking Lead Time",
          data: []
        };
      }
      
      // Check if this time range exists for this market segment
      const existingEntry = dataByMarketSegment[marketSegment].datasets.booking_lead_time.data.find(
        item => item.range === timeRange
      );
      
      if (!existingEntry) {
        dataByMarketSegment[marketSegment].datasets.booking_lead_time.data.push({
          range: timeRange,
          current: 0,
          previous: parseInt(prevItem.count || '0', 10)
        });
      }
    });

    // Add any market segments and buckets from cancellation previous data that might not be in current data
    cancellationLeadTimePreviousData.forEach(prevItem => {
      const marketSegment = prevItem.market_group_code;
      const timeRange = prevItem.time_range;
      cancellationLeadTimeBuckets.add(timeRange);
      
      // Check if this market segment exists in our result
      if (!dataByMarketSegment[marketSegment]) {
        dataByMarketSegment[marketSegment] = {
          datasets: {}
        };
      }
      
      // Make sure the cancellation_lead_time dataset exists
      if (!dataByMarketSegment[marketSegment].datasets.cancellation_lead_time) {
        dataByMarketSegment[marketSegment].datasets.cancellation_lead_time = {
          title: "Cancellation Lead Time",
          data: []
        };
      }
      
      // Check if this time range exists for this market segment
      const existingEntry = dataByMarketSegment[marketSegment].datasets.cancellation_lead_time.data.find(
        item => item.range === timeRange
      );
      
      if (!existingEntry) {
        dataByMarketSegment[marketSegment].datasets.cancellation_lead_time.data.push({
          range: timeRange,
          current: 0,
          previous: parseInt(prevItem.count || '0', 10)
        });
      }
    });

    // Second pass: ensure all market segments have entries for all buckets
    Object.keys(dataByMarketSegment).forEach(segment => {
      // Handle booking lead time dataset
      if (dataByMarketSegment[segment].datasets.booking_lead_time) {
        const existingBuckets = new Set(
          dataByMarketSegment[segment].datasets.booking_lead_time.data.map(item => item.range)
        );
        
        // Add any missing buckets with zero values
        bookingLeadTimeBuckets.forEach(bucket => {
          if (!existingBuckets.has(bucket)) {
            dataByMarketSegment[segment].datasets.booking_lead_time.data.push({
              range: bucket,
              current: 0,
              previous: 0
            });
          }
        });
      } else {
        // Create the dataset if it doesn't exist
        dataByMarketSegment[segment].datasets.booking_lead_time = {
          title: "Booking Lead Time",
          data: Array.from(bookingLeadTimeBuckets).map(bucket => ({
            range: bucket,
            current: 0,
            previous: 0
          }))
        };
      }
      
      // Handle cancellation lead time dataset
      if (dataByMarketSegment[segment].datasets.cancellation_lead_time) {
        const existingBuckets = new Set(
          dataByMarketSegment[segment].datasets.cancellation_lead_time.data.map(item => item.range)
        );
        
        // Add any missing buckets with zero values
        cancellationLeadTimeBuckets.forEach(bucket => {
          if (!existingBuckets.has(bucket)) {
            dataByMarketSegment[segment].datasets.cancellation_lead_time.data.push({
              range: bucket,
              current: 0,
              previous: 0
            });
          }
        });
      } else {
        // Create the dataset if it doesn't exist
        dataByMarketSegment[segment].datasets.cancellation_lead_time = {
          title: "Cancellation Lead Time",
          data: Array.from(cancellationLeadTimeBuckets).map(bucket => ({
            range: bucket,
            current: 0,
            previous: 0
          }))
        };
      }
    });

    // Sort function for time ranges
    const sortTimeRanges = (a: string, b: string) => {
      // For booking lead time
      const bookingLeadTimeOrder: { [key: string]: number } = {
        '0-7 days': 1,
        '8-14 days': 2,
        '15-30 days': 3,
        '31-60 days': 4,
        '61-90 days': 5,
        '91-180 days': 6,
        '>180 days': 7
      };
      
      // For cancellation lead time
      const cancellationLeadTimeOrder: { [key: string]: number } = {
        '0-5 days': 1,
        '6-10 days': 2,
        '11-15 days': 3,
        '16-20 days': 4,
        '21-25 days': 5,
        '26-30 days': 6,
        '>30 days': 7
      };
      
      // Try booking lead time order first
      if (bookingLeadTimeOrder[a] !== undefined && bookingLeadTimeOrder[b] !== undefined) {
        return bookingLeadTimeOrder[a] - bookingLeadTimeOrder[b];
      }
      
      // Try cancellation lead time order
      if (cancellationLeadTimeOrder[a] !== undefined && cancellationLeadTimeOrder[b] !== undefined) {
        return cancellationLeadTimeOrder[a] - cancellationLeadTimeOrder[b];
      }
      
      // Fallback to alphabetical
      return a.localeCompare(b);
    };

    // Sort data for each market segment by the correct order of time ranges
    Object.keys(dataByMarketSegment).forEach(segment => {
      // Sort booking lead time data
      if (dataByMarketSegment[segment].datasets.booking_lead_time) {
        dataByMarketSegment[segment].datasets.booking_lead_time.data.sort((a, b) => {
          return sortTimeRanges(a.range, b.range);
        });
      }
      
      // Sort cancellation lead time data
      if (dataByMarketSegment[segment].datasets.cancellation_lead_time) {
        dataByMarketSegment[segment].datasets.cancellation_lead_time.data.sort((a, b) => {
          return sortTimeRanges(a.range, b.range);
        });
      }
    });

    // Format pretty segment names
    const segmentNameMap: Record<string, string> = {
      'business': 'Business',
      'leisure': 'Leisure',
      'group': 'Group',
      'corporate': 'Corporate',
      'wholesale': 'Wholesale',
    };

    // Filter out market segments with all zeros
    const filteredDataByMarketSegment: LeadTimesByMarketSegmentResponse['data'] = {};
    Object.entries(dataByMarketSegment).forEach(([segment, segmentData]) => {
      const hasNonZeroBookingLeadTime = segmentData.datasets.booking_lead_time?.data.some(
        item => item.current > 0 || item.previous > 0
      ) || false;
      
      const hasNonZeroCancellationLeadTime = segmentData.datasets.cancellation_lead_time?.data.some(
        item => item.current > 0 || item.previous > 0
      ) || false;
      
      if (hasNonZeroBookingLeadTime || hasNonZeroCancellationLeadTime) {
        filteredDataByMarketSegment[segment] = segmentData;
      }
    });

    // Construct response
    const response: LeadTimesByMarketSegmentResponse = {
      data: filteredDataByMarketSegment
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Error querying ClickHouse:', error);
    return NextResponse.json(
      { error: 'Failed to fetch lead times data by market segment from ClickHouse' },
      { status: 500 }
    );
  } finally {
    // Close client connection if it exists
    if (client) {
      await client.close();
    }
  }
} 