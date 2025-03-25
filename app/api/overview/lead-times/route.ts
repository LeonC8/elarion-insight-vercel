import { NextResponse } from 'next/server';
import { ClickHouseClient, createClient } from '@clickhouse/client';
import { calculateDateRanges, calculateComparisonDateRanges } from '@/lib/dateUtils';

// Interfaces for lead time distribution data
interface LeadTimeItem {
  bucket: string;
  current: number;
  previous: number;
}

export interface LeadTimesResponse {
  bookingLeadTime: LeadTimeItem[];
  cancellationLeadTime: LeadTimeItem[];
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

    // Build the query for current period booking lead time
    const currentBookingQuery = `
      SELECT 
        bucket AS lead_time_bucket,
        SUM(booking_lead_num) AS count
      FROM SAND01CN.booking_lead_time
      WHERE 
        toDate(occupancy_date) BETWEEN '${startDate}' AND '${endDate}'
        AND date(scd_valid_from) <= DATE('${businessDateParam}') 
        AND DATE('${businessDateParam}') < date(scd_valid_to)
      GROUP BY bucket
      ORDER BY 
        CASE 
          WHEN bucket = '0-7 days' THEN 1
          WHEN bucket = '8-14 days' THEN 2
          WHEN bucket = '15-30 days' THEN 3
          WHEN bucket = '31-60 days' THEN 4
          WHEN bucket = '61-90 days' THEN 5
          WHEN bucket = '91-180 days' THEN 6
          WHEN bucket = '181-365 days' THEN 7
          WHEN bucket = '365+ days' THEN 8
          ELSE 9
        END ASC
    `;

    // Build the query for previous period booking lead time
    const previousBookingQuery = `
      SELECT 
        bucket AS lead_time_bucket,
        SUM(booking_lead_num) AS count
      FROM SAND01CN.booking_lead_time
      WHERE 
        toDate(occupancy_date) BETWEEN '${prevStartDate}' AND '${prevEndDate}'
        AND date(scd_valid_from) <= DATE('${prevBusinessDateParam}') 
        AND DATE('${prevBusinessDateParam}') < date(scd_valid_to)
      GROUP BY bucket
      ORDER BY 
        CASE 
          WHEN bucket = '0-7 days' THEN 1
          WHEN bucket = '8-14 days' THEN 2
          WHEN bucket = '15-30 days' THEN 3
          WHEN bucket = '31-60 days' THEN 4
          WHEN bucket = '61-90 days' THEN 5
          WHEN bucket = '91-180 days' THEN 6
          WHEN bucket = '181-365 days' THEN 7
          WHEN bucket = '365+ days' THEN 8
          ELSE 9
        END ASC
    `;

    // Build the query for current period cancellation lead time
    const currentCancellationQuery = `
      SELECT 
        bucket AS lead_time_bucket,
        SUM(cancellation_lead_num) AS count
      FROM SAND01CN.cancellation_lead_time
      WHERE 
        toDate(occupancy_date) BETWEEN '${startDate}' AND '${endDate}'
        AND date(scd_valid_from) <= DATE('${businessDateParam}') 
        AND DATE('${businessDateParam}') < date(scd_valid_to)
      GROUP BY bucket
      ORDER BY 
        CASE 
          WHEN bucket = '0-7 days' THEN 1
          WHEN bucket = '8-14 days' THEN 2
          WHEN bucket = '15-30 days' THEN 3
          WHEN bucket = '31-60 days' THEN 4
          WHEN bucket = '61-90 days' THEN 5
          WHEN bucket = '91-180 days' THEN 6
          WHEN bucket = '181-365 days' THEN 7
          WHEN bucket = '365+ days' THEN 8
          ELSE 9
        END ASC
    `;

    // Build the query for previous period cancellation lead time
    const previousCancellationQuery = `
      SELECT 
        bucket AS lead_time_bucket,
        SUM(cancellation_lead_num) AS count
      FROM SAND01CN.cancellation_lead_time
      WHERE 
        toDate(occupancy_date) BETWEEN '${prevStartDate}' AND '${prevEndDate}'
        AND date(scd_valid_from) <= DATE('${prevBusinessDateParam}') 
        AND DATE('${prevBusinessDateParam}') < date(scd_valid_to)
      GROUP BY bucket
      ORDER BY 
        CASE 
          WHEN bucket = '0-7 days' THEN 1
          WHEN bucket = '8-14 days' THEN 2
          WHEN bucket = '15-30 days' THEN 3
          WHEN bucket = '31-60 days' THEN 4
          WHEN bucket = '61-90 days' THEN 5
          WHEN bucket = '91-180 days' THEN 6
          WHEN bucket = '181-365 days' THEN 7
          WHEN bucket = '365+ days' THEN 8
          ELSE 9
        END ASC
    `;

    

    // Execute queries
    const currentBookingResultSet = await client.query({
      query: currentBookingQuery,
      format: 'JSONEachRow'
    });

    const previousBookingResultSet = await client.query({
      query: previousBookingQuery,
      format: 'JSONEachRow'
    });

    const currentCancellationResultSet = await client.query({
      query: currentCancellationQuery,
      format: 'JSONEachRow'
    });

    const previousCancellationResultSet = await client.query({
      query: previousCancellationQuery,
      format: 'JSONEachRow'
    });

    const currentBookingData = await currentBookingResultSet.json() as any[];
    const previousBookingData = await previousBookingResultSet.json() as any[];
    const currentCancellationData = await currentCancellationResultSet.json() as any[];
    const previousCancellationData = await previousCancellationResultSet.json() as any[];

    // Process booking lead time data
    const previousBookingDataMap = new Map();
    previousBookingData.forEach(item => {
      previousBookingDataMap.set(item.lead_time_bucket, item);
    });

    const bookingLeadTimeData: LeadTimeItem[] = currentBookingData.map(item => {
      const prevItem = previousBookingDataMap.get(item.lead_time_bucket) || { count: 0 };
      
      return {
        bucket: item.lead_time_bucket,
        current: parseInt(item.count || '0', 10),
        previous: parseInt(prevItem.count || '0', 10)
      };
    });

    // Add any buckets from previous booking data that might not be in current data
    previousBookingData.forEach(prevItem => {
      const exists = bookingLeadTimeData.some(item => item.bucket === prevItem.lead_time_bucket);
      if (!exists) {
        bookingLeadTimeData.push({
          bucket: prevItem.lead_time_bucket,
          current: 0,
          previous: parseInt(prevItem.count || '0', 10)
        });
      }
    });

    // Process cancellation lead time data
    const previousCancellationDataMap = new Map();
    previousCancellationData.forEach(item => {
      previousCancellationDataMap.set(item.lead_time_bucket, item);
    });

    const cancellationLeadTimeData: LeadTimeItem[] = currentCancellationData.map(item => {
      const prevItem = previousCancellationDataMap.get(item.lead_time_bucket) || { count: 0 };
      
      return {
        bucket: item.lead_time_bucket,
        current: parseInt(item.count || '0', 10),
        previous: parseInt(prevItem.count || '0', 10)
      };
    });

    // Add any buckets from previous cancellation data that might not be in current data
    previousCancellationData.forEach(prevItem => {
      const exists = cancellationLeadTimeData.some(item => item.bucket === prevItem.lead_time_bucket);
      if (!exists) {
        cancellationLeadTimeData.push({
          bucket: prevItem.lead_time_bucket,
          current: 0,
          previous: parseInt(prevItem.count || '0', 10)
        });
      }
    });

    // Sort data by the correct order of lead time buckets
    const bucketOrder = {
      '0-7 days': 1,
      '8-14 days': 2,
      '15-30 days': 3,
      '31-60 days': 4,
      '61-90 days': 5,
      '91-180 days': 6,
      '181-365 days': 7,
      '365+ days': 8
    };

    bookingLeadTimeData.sort((a, b) => {
      return (bucketOrder[a.bucket as keyof typeof bucketOrder] || 99) - 
             (bucketOrder[b.bucket as keyof typeof bucketOrder] || 99);
    });

    cancellationLeadTimeData.sort((a, b) => {
      return (bucketOrder[a.bucket as keyof typeof bucketOrder] || 99) - 
             (bucketOrder[b.bucket as keyof typeof bucketOrder] || 99);
    });

    // Construct response
    const response: LeadTimesResponse = {
      bookingLeadTime: bookingLeadTimeData,
      cancellationLeadTime: cancellationLeadTimeData
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Error querying ClickHouse:', error);
    return NextResponse.json(
      { error: 'Failed to fetch lead time distribution data from ClickHouse' },
      { status: 500 }
    );
  } finally {
    // Close client connection if it exists
    if (client) {
      await client.close();
    }
  }
} 