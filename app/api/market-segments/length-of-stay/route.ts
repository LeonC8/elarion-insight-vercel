import { NextResponse } from 'next/server';
import { ClickHouseClient, createClient } from '@clickhouse/client';
import { calculateDateRanges, calculateComparisonDateRanges } from '@/lib/dateUtils';

// Interface for the response
export interface LengthOfStayByMarketSegmentResponse {
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
      host: process.env.CLICKHOUSE_HOST || 'http://34.34.71.156:8123',
      username: process.env.CLICKHOUSE_USER || 'default',
      password: process.env.CLICKHOUSE_PASSWORD || 'elarion'
    });

    // Build the query for current period - now with market_group_code grouping
    const currentQuery = `
      SELECT 
        market_group_code,
        bucket AS stay_range,
        SUM(num) AS count
      FROM SAND01CN.lenght_of_stay_distribution
      WHERE 
        toDate(occupancy_date) BETWEEN '${startDate}' AND '${endDate}'
        AND date(scd_valid_from) <= DATE('${businessDateParam}') 
        AND DATE('${businessDateParam}') < date(scd_valid_to)
      GROUP BY market_group_code, bucket
      ORDER BY 
        market_group_code,
        CASE 
          WHEN bucket = '1 night' THEN 1
          WHEN bucket = '2 nights' THEN 2
          WHEN bucket = '3 nights' THEN 3
          WHEN bucket = '4 nights' THEN 4
          WHEN bucket = '5 nights' THEN 5
          WHEN bucket = '6 nights' THEN 6
          WHEN bucket = '7+ nights' THEN 7
          ELSE 8
        END ASC
    `;

    // Build the query for previous period - now with market_group_code grouping
    const previousQuery = `
      SELECT 
        market_group_code,
        bucket AS stay_range,
        SUM(num) AS count
      FROM SAND01CN.lenght_of_stay_distribution
      WHERE 
        toDate(occupancy_date) BETWEEN '${prevStartDate}' AND '${prevEndDate}'
        AND date(scd_valid_from) <= DATE('${prevBusinessDateParam}') 
        AND DATE('${prevBusinessDateParam}') < date(scd_valid_to)
      GROUP BY market_group_code, bucket
      ORDER BY 
        market_group_code,
        CASE 
          WHEN bucket = '1 night' THEN 1
          WHEN bucket = '2 nights' THEN 2
          WHEN bucket = '3 nights' THEN 3
          WHEN bucket = '4 nights' THEN 4
          WHEN bucket = '5 nights' THEN 5
          WHEN bucket = '6 nights' THEN 6
          WHEN bucket = '7+ nights' THEN 7
          ELSE 8
        END ASC
    `;

    // Execute queries
    const currentResultSet = await client.query({
      query: currentQuery,
      format: 'JSONEachRow'
    });

    const previousResultSet = await client.query({
      query: previousQuery,
      format: 'JSONEachRow'
    });

    const currentData = await currentResultSet.json() as any[];
    const previousData = await previousResultSet.json() as any[];

    // Create a map for previous data for easier lookup
    const previousDataMap = new Map();
    previousData.forEach(item => {
      const key = `${item.market_group_code}|${item.stay_range}`;
      previousDataMap.set(key, item);
    });

    // Process data to organize by market segment
    const dataByMarketSegment: LengthOfStayByMarketSegmentResponse['data'] = {};

    // First pass: collect all data and identify all unique buckets
    const allBuckets = new Set<string>();
    
    // Process current data
    currentData.forEach(item => {
      const marketSegment = item.market_group_code;
      const stayRange = item.stay_range;
      allBuckets.add(stayRange);
      
      const key = `${marketSegment}|${stayRange}`;
      const prevItem = previousDataMap.get(key) || { count: 0 };
      
      if (!dataByMarketSegment[marketSegment]) {
        dataByMarketSegment[marketSegment] = {
          datasets: {
            length_of_stay: {
              title: "Length of Stay",
              data: []
            }
          }
        };
      }
      
      // Make sure the dataset exists
      if (!dataByMarketSegment[marketSegment].datasets.length_of_stay) {
        dataByMarketSegment[marketSegment].datasets.length_of_stay = {
          title: "Length of Stay",
          data: []
        };
      }
      
      dataByMarketSegment[marketSegment].datasets.length_of_stay.data.push({
        range: stayRange,
        current: parseInt(item.count || '0', 10),
        previous: parseInt(prevItem.count || '0', 10)
      });
    });

    // Add any market segments and buckets from previous data that might not be in current data
    previousData.forEach(prevItem => {
      const marketSegment = prevItem.market_group_code;
      const stayRange = prevItem.stay_range;
      allBuckets.add(stayRange);
      
      // Check if this market segment exists in our result
      if (!dataByMarketSegment[marketSegment]) {
        dataByMarketSegment[marketSegment] = {
          datasets: {
            length_of_stay: {
              title: "Length of Stay",
              data: []
            }
          }
        };
      }
      
      // Make sure the dataset exists
      if (!dataByMarketSegment[marketSegment].datasets.length_of_stay) {
        dataByMarketSegment[marketSegment].datasets.length_of_stay = {
          title: "Length of Stay",
          data: []
        };
      }
      
      // Check if this stay range exists for this market segment
      const existingEntry = dataByMarketSegment[marketSegment].datasets.length_of_stay.data.find(
        item => item.range === stayRange
      );
      
      if (!existingEntry) {
        dataByMarketSegment[marketSegment].datasets.length_of_stay.data.push({
          range: stayRange,
          current: 0,
          previous: parseInt(prevItem.count || '0', 10)
        });
      }
    });

    // Second pass: ensure all market segments have entries for all buckets
    Object.keys(dataByMarketSegment).forEach(segment => {
      if (dataByMarketSegment[segment].datasets.length_of_stay) {
        const existingBuckets = new Set(
          dataByMarketSegment[segment].datasets.length_of_stay.data.map(item => item.range)
        );
        
        // Add any missing buckets with zero values
        allBuckets.forEach(bucket => {
          if (!existingBuckets.has(bucket)) {
            dataByMarketSegment[segment].datasets.length_of_stay.data.push({
              range: bucket,
              current: 0,
              previous: 0
            });
          }
        });
      }
    });

    // Sort data for each market segment by the correct order of stay lengths
    const stayRangeOrder = {
      '1 night': 1,
      '2 nights': 2,
      '3 nights': 3,
      '4 nights': 4,
      '5 nights': 5,
      '6 nights': 6,
      '7+ nights': 7
    };
    
    Object.keys(dataByMarketSegment).forEach(segment => {
      if (dataByMarketSegment[segment].datasets.length_of_stay) {
        dataByMarketSegment[segment].datasets.length_of_stay.data.sort((a, b) => {
          return (stayRangeOrder[a.range as keyof typeof stayRangeOrder] || 99) - 
                 (stayRangeOrder[b.range as keyof typeof stayRangeOrder] || 99);
        });
      }
    });

    // Format pretty segment names
    const segmentNameMap: Record<string, string> = {
      'corporate': 'Corporate',
      'leisure': 'Leisure',
      'group': 'Group',
      'contract': 'Contract',
      'airline': 'Airline',
      // Add more mappings as needed
    };

    Object.keys(dataByMarketSegment).forEach(segment => {
      if (segmentNameMap[segment]) {
        dataByMarketSegment[segment].datasets.length_of_stay.title = `Length of Stay`;
      }
    });

    // Filter out market segments with all zeros
    const filteredDataByMarketSegment: LengthOfStayByMarketSegmentResponse['data'] = {};
    Object.entries(dataByMarketSegment).forEach(([segment, segmentData]) => {
      const hasNonZeroValue = segmentData.datasets.length_of_stay.data.some(
        item => item.current > 0 || item.previous > 0
      );
      
      if (hasNonZeroValue) {
        filteredDataByMarketSegment[segment] = segmentData;
      }
    });

    // Construct response
    const response: LengthOfStayByMarketSegmentResponse = {
      data: filteredDataByMarketSegment
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Error querying ClickHouse:', error);
    return NextResponse.json(
      { error: 'Failed to fetch length of stay distribution data by market segment from ClickHouse' },
      { status: 500 }
    );
  } finally {
    // Close client connection if it exists
    if (client) {
      await client.close();
    }
  }
} 