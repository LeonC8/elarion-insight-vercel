import { NextResponse } from 'next/server';
import { ClickHouseClient, createClient } from '@clickhouse/client';
import { calculateDateRanges, calculateComparisonDateRanges } from '@/lib/dateUtils';
// Import the DataSet type
import type { DataSet } from '@/components/new/HorizontalBarChartMultipleDatasets';

// Interface for length of stay distribution data
interface LengthOfStayItem {
  range: string;
  current: number;
  previous: number;
}

export interface LengthOfStayResponse {
  data: LengthOfStayItem[];
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

    console.log('Business Date:', businessDateParam);

    console.log('Current Period:');
    console.log('  Start Date:', startDate);
    console.log('  End Date:', endDate);

    console.log('Previous Period:');
    console.log('  Start Date:', prevStartDate);
    console.log('  End Date:', prevEndDate);
    console.log('  Business Date:', prevBusinessDateParam);


    // Build the query for current period
    const currentQuery = `
      SELECT 
        bucket AS stay_range,
        SUM(num) AS count
      FROM SAND01CN.lenght_of_stay_distribution
      WHERE 
        toDate(occupancy_date) BETWEEN '${startDate}' AND '${endDate}'
        AND date(scd_valid_from) <= DATE('${businessDateParam}') 
        AND DATE('${businessDateParam}') < date(scd_valid_to)
      GROUP BY bucket
      ORDER BY 
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

    console.log('Current Query:', currentQuery);

    // Build the query for previous period
    const previousQuery = `
      SELECT 
        bucket AS stay_range,
        SUM(num) AS count
      FROM SAND01CN.lenght_of_stay_distribution
      WHERE 
        toDate(occupancy_date) BETWEEN '${prevStartDate}' AND '${prevEndDate}'
        AND date(scd_valid_from) <= DATE('${prevBusinessDateParam}') 
        AND DATE('${prevBusinessDateParam}') < date(scd_valid_to)
      GROUP BY bucket
      ORDER BY 
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
      previousDataMap.set(item.stay_range, item);
    });

    // Combine current and previous data, mapping field names
    const combinedData = currentData.map(item => {
      const prevItem = previousDataMap.get(item.stay_range) || { count: 0 };
      
      return {
        range: item.stay_range,
        current: parseInt(item.count || '0', 10),
        previous: parseInt(prevItem.count || '0', 10)
      };
    });

    // Add any buckets from previous data that might not be in current data
    previousData.forEach(prevItem => {
      const exists = combinedData.some(item => item.range === prevItem.stay_range);
      if (!exists) {
        combinedData.push({
          range: prevItem.stay_range,
          current: 0,
          previous: parseInt(prevItem.count || '0', 10)
        });
      }
    });

    // Sort data by the correct order of stay lengths
    combinedData.sort((a, b) => {
      const order = {
        '1 night': 1,
        '2 nights': 2,
        '3 nights': 3,
        '4 nights': 4,
        '5 nights': 5,
        '6 nights': 6,
        '7+ nights': 7
      };
      
      return (order[a.range as keyof typeof order] || 99) - (order[b.range as keyof typeof order] || 99);
    });

    // Construct the response as DataSet[]
    const response: DataSet[] = [
      {
        key: "lengthOfStay", // Match the defaultDataset key used in Overview.tsx
        title: "Length of Stay Distribution",
        data: combinedData // The processed data array
      }
    ];

    return NextResponse.json(response); // Return the DataSet array directly
  } catch (error) {
    console.error('Error querying ClickHouse:', error);
    return NextResponse.json(
      { error: 'Failed to fetch length of stay distribution data from ClickHouse' },
      { status: 500 }
    );
  } finally {
    // Close client connection if it exists
    if (client) {
      await client.close();
    }
  }
} 