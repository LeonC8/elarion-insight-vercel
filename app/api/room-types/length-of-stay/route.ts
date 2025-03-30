import { NextResponse } from 'next/server';
import { ClickHouseClient, createClient } from '@clickhouse/client';
import { calculateDateRanges, calculateComparisonDateRanges } from '@/lib/dateUtils';

// Interface for the response
export interface LengthOfStayByRoomTypeResponse {
  data: {
    [roomType: string]: {
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

    // Build the query for current period - now with room_type grouping
    const currentQuery = `
      SELECT 
        room_type,
        bucket AS stay_range,
        SUM(num) AS count
      FROM SAND01CN.lenght_of_stay_distribution
      WHERE 
        toDate(occupancy_date) BETWEEN '${startDate}' AND '${endDate}'
        AND date(scd_valid_from) <= DATE('${businessDateParam}') 
        AND DATE('${businessDateParam}') < date(scd_valid_to)
      GROUP BY room_type, bucket
      ORDER BY 
        room_type,
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

    // Build the query for previous period - now with room_type grouping
    const previousQuery = `
      SELECT 
        room_type,
        bucket AS stay_range,
        SUM(num) AS count
      FROM SAND01CN.lenght_of_stay_distribution
      WHERE 
        toDate(occupancy_date) BETWEEN '${prevStartDate}' AND '${prevEndDate}'
        AND date(scd_valid_from) <= DATE('${prevBusinessDateParam}') 
        AND DATE('${prevBusinessDateParam}') < date(scd_valid_to)
      GROUP BY room_type, bucket
      ORDER BY 
        room_type,
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
      const key = `${item.room_type}|${item.stay_range}`;
      previousDataMap.set(key, item);
    });

    // Process data to organize by room type
    const dataByRoomType: LengthOfStayByRoomTypeResponse['data'] = {};

    // First pass: collect all data and identify all unique buckets
    const allBuckets = new Set<string>();
    
    // Process current data
    currentData.forEach(item => {
      const roomType = item.room_type;
      const stayRange = item.stay_range;
      allBuckets.add(stayRange);
      
      const key = `${roomType}|${stayRange}`;
      const prevItem = previousDataMap.get(key) || { count: 0 };
      
      if (!dataByRoomType[roomType]) {
        dataByRoomType[roomType] = {
          datasets: {
            length_of_stay: {
              title: "Length of Stay",
              data: []
            }
          }
        };
      }
      
      // Make sure the dataset exists
      if (!dataByRoomType[roomType].datasets.length_of_stay) {
        dataByRoomType[roomType].datasets.length_of_stay = {
          title: "Length of Stay",
          data: []
        };
      }
      
      dataByRoomType[roomType].datasets.length_of_stay.data.push({
        range: stayRange,
        current: parseInt(item.count || '0', 10),
        previous: parseInt(prevItem.count || '0', 10)
      });
    });

    // Add any room types and buckets from previous data that might not be in current data
    previousData.forEach(prevItem => {
      const roomType = prevItem.room_type;
      const stayRange = prevItem.stay_range;
      allBuckets.add(stayRange);
      
      // Check if this room type exists in our result
      if (!dataByRoomType[roomType]) {
        dataByRoomType[roomType] = {
          datasets: {
            length_of_stay: {
              title: "Length of Stay",
              data: []
            }
          }
        };
      }
      
      // Make sure the dataset exists
      if (!dataByRoomType[roomType].datasets.length_of_stay) {
        dataByRoomType[roomType].datasets.length_of_stay = {
          title: "Length of Stay",
          data: []
        };
      }
      
      // Check if this stay range exists for this room type
      const existingEntry = dataByRoomType[roomType].datasets.length_of_stay.data.find(
        item => item.range === stayRange
      );
      
      if (!existingEntry) {
        dataByRoomType[roomType].datasets.length_of_stay.data.push({
          range: stayRange,
          current: 0,
          previous: parseInt(prevItem.count || '0', 10)
        });
      }
    });

    // Second pass: ensure all room types have entries for all buckets
    Object.keys(dataByRoomType).forEach(roomType => {
      if (dataByRoomType[roomType].datasets.length_of_stay) {
        const existingBuckets = new Set(
          dataByRoomType[roomType].datasets.length_of_stay.data.map(item => item.range)
        );
        
        // Add any missing buckets with zero values
        allBuckets.forEach(bucket => {
          if (!existingBuckets.has(bucket)) {
            dataByRoomType[roomType].datasets.length_of_stay.data.push({
              range: bucket,
              current: 0,
              previous: 0
            });
          }
        });
      }
    });

    // Sort data for each room type by the correct order of stay lengths
    const stayRangeOrder = {
      '1 night': 1,
      '2 nights': 2,
      '3 nights': 3,
      '4 nights': 4,
      '5 nights': 5,
      '6 nights': 6,
      '7+ nights': 7
    };
    
    Object.keys(dataByRoomType).forEach(roomType => {
      if (dataByRoomType[roomType].datasets.length_of_stay) {
        dataByRoomType[roomType].datasets.length_of_stay.data.sort((a, b) => {
          return (stayRangeOrder[a.range as keyof typeof stayRangeOrder] || 99) - 
                 (stayRangeOrder[b.range as keyof typeof stayRangeOrder] || 99);
        });
      }
    });

    // Format pretty room type names (keeping the mapping logic in place for future use)
    const roomTypeNameMap: Record<string, string> = {
      // You can add mappings here if needed for room types
      // 'standard': 'Standard Room',
      // 'deluxe': 'Deluxe Room',
      // etc.
    };

    Object.keys(dataByRoomType).forEach(roomType => {
      if (roomTypeNameMap[roomType]) {
        dataByRoomType[roomType].datasets.length_of_stay.title = `Length of Stay`;
      }
    });

    // Filter out room types with all zeros
    const filteredDataByRoomType: LengthOfStayByRoomTypeResponse['data'] = {};
    Object.entries(dataByRoomType).forEach(([roomType, roomTypeData]) => {
      const hasNonZeroValue = roomTypeData.datasets.length_of_stay.data.some(
        item => item.current > 0 || item.previous > 0
      );
      
      if (hasNonZeroValue) {
        filteredDataByRoomType[roomType] = roomTypeData;
      }
    });

    // Construct response
    const response: LengthOfStayByRoomTypeResponse = {
      data: filteredDataByRoomType
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Error querying ClickHouse:', error);
    return NextResponse.json(
      { error: 'Failed to fetch length of stay distribution data by room type from ClickHouse' },
      { status: 500 }
    );
  } finally {
    // Close client connection if it exists
    if (client) {
      await client.close();
    }
  }
} 