import { NextResponse } from 'next/server';
import { ClickHouseClient, createClient } from '@clickhouse/client';
import { calculateDateRanges, calculateComparisonDateRanges } from '@/lib/dateUtils';
import * as fs from 'fs';
import * as path from 'path';

// --- START CACHING LOGIC ---

interface CacheEntryData {
  body: any; // Store the parsed JSON body
  status: number;
  headers: Record<string, string>;
}

interface CacheEntry {
  data: CacheEntryData;
  expiresAt: number;
}

// File-based cache configuration
const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours in milliseconds
const CACHE_DIR = path.join(process.cwd(), '.cache');

// Ensure cache directory exists
try {
  if (!fs.existsSync(CACHE_DIR)) {
    fs.mkdirSync(CACHE_DIR, { recursive: true });
  }
} catch (error) {
  console.error('Error creating cache directory:', error);
}

// File-based cache functions
function getCacheFilePath(key: string): string {
  // Create a safe filename from the key
  const safeKey = Buffer.from(key).toString('base64').replace(/[/\\?%*:|"<>]/g, '_');
  return path.join(CACHE_DIR, `${safeKey}.json`);
}

async function getCacheEntry(key: string): Promise<CacheEntry | null> {
  try {
    const filePath = getCacheFilePath(key);
    if (fs.existsSync(filePath)) {
      const data = fs.readFileSync(filePath, 'utf8');
      return JSON.parse(data);
    }
    return null;
  } catch (error) {
    console.error(`Cache read error:`, error);
    return null;
  }
}

async function setCacheEntry(key: string, entry: CacheEntry): Promise<void> {
  try {
    const filePath = getCacheFilePath(key);
    fs.writeFileSync(filePath, JSON.stringify(entry), 'utf8');
  } catch (error) {
    console.error(`Cache write error:`, error);
  }
}

async function deleteCacheEntry(key: string): Promise<void> {
  try {
    const filePath = getCacheFilePath(key);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  } catch (error) {
    console.error(`Cache delete error:`, error);
  }
}

/**
 * Generates a cache key based on relevant query parameters.
 * Ensures the key is consistent regardless of parameter order.
 */
function generateCacheKey(params: URLSearchParams): string {
  const relevantParams = [
    'businessDate', 
    'periodType', 
    'viewType', 
    'comparison', 
    'primaryField', 
    'secondaryField', 
    'limit'
  ];
  const keyParts: string[] = [];
  
  relevantParams.forEach(key => {
    // Use default values if parameter is missing, mirroring the route's logic
    let value: string | null = null;
    switch (key) {
        case 'businessDate': value = params.get(key) || new Date().toISOString().split('T')[0]; break;
        case 'periodType': value = params.get(key) || 'Month'; break;
        case 'viewType': value = params.get(key) || 'Actual'; break;
        case 'comparison': value = params.get(key) || 'Last year - OTB'; break;
        case 'primaryField': value = params.get(key) || 'booking_channel'; break;
        case 'secondaryField': value = params.get(key) || 'producer'; break;
        case 'limit': value = params.get(key) || '10'; break;
        default: value = params.get(key); // Should not happen with current relevantParams
    }
    if (value !== null) {
        keyParts.push(`${key}=${value}`);
    }
  });
  
  // Sort parts to ensure consistent key regardless of parameter order
  keyParts.sort();
  return keyParts.join('&');
}

// --- END CACHING LOGIC ---

// Interface for analysis data
interface AnalysisData {
  name: string;
  value: number;
  change: number;
  code: string;
}

// Interface for grouped data
interface GroupedData {
  [key: string]: {
    revenue: AnalysisData[];
    roomsSold: AnalysisData[];
    adr: AnalysisData[];
    timeSeriesData: Array<{
      date: string;
      categories: {
        [key: string]: {
          current: number;
          previous: number;
        };
      };
    }>;
  }
}

// Helper function to round numbers
function roundValue(value: number): number {
  // Round to nearest integer for values >= 100
  // Round to 2 decimal places for smaller values
  return value >= 100 ? Math.round(value) : Number(value.toFixed(2));
}

// Helper function to generate a code from a name
function generateCode(name: string): string {
  return name.toString().toLowerCase().replace(/\s+/g, '_');
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  
  // --- CHECK CACHE ---
  const cacheKey = `distribution-upgraded:${generateCacheKey(searchParams)}`;
  const cachedEntry = await getCacheEntry(cacheKey);

  if (cachedEntry && cachedEntry.expiresAt > Date.now()) {
    console.log(`[Cache HIT] Returning cached response for key: ${cacheKey.substring(0, 100)}...`);
    // Reconstruct the response from cached data
    return new NextResponse(JSON.stringify(cachedEntry.data.body), {
      status: cachedEntry.data.status,
      headers: cachedEntry.data.headers,
    });
  } else if (cachedEntry) {
    // Entry exists but is expired
    console.log(`[Cache EXPIRED] Removing expired entry for key: ${cacheKey.substring(0, 100)}...`);
    await deleteCacheEntry(cacheKey);
  } else {
    console.log(`[Cache MISS] No valid cache entry for key: ${cacheKey.substring(0, 100)}...`);
  }
  // --- END CACHE CHECK ---

  // Parse query parameters
  const businessDateParam = searchParams.get('businessDate') || new Date().toISOString().split('T')[0];
  const periodType = searchParams.get('periodType') || 'Month'; // Month, Year, Day
  const viewType = searchParams.get('viewType') || 'Actual'; // Actual, OTB, Projected
  const comparisonType = searchParams.get('comparison') || 'Last year - OTB';
  
  // Get the primary and secondary grouping fields
  const primaryField = searchParams.get('primaryField') || 'booking_channel';
  const secondaryField = searchParams.get('secondaryField') || 'producer';
  
  // Limit for number of items to return
  const limit = parseInt(searchParams.get('limit') || '10');
  
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

    // Add field-specific filters
    const primaryFieldFilters = `
      AND ${primaryField} != ''
      AND ${primaryField} IS NOT NULL
    `;
    
    const secondaryFieldFilters = `
      AND toString(${secondaryField}) != ''
      AND ${secondaryField} IS NOT NULL
    `;

    // Get unique values for the primary field (booking channels)
    const primaryFieldQuery = `
      SELECT DISTINCT ${primaryField} as field_value
      FROM SAND01CN.insights
      WHERE 
        toDate(occupancy_date) BETWEEN '${startDate}' AND '${endDate}'
        AND date(scd_valid_from) <= DATE('${businessDateParam}') 
        AND DATE('${businessDateParam}') < date(scd_valid_to)
        ${primaryFieldFilters}
    `;
    
    const primaryFieldResultSet = await client.query({
      query: primaryFieldQuery,
      format: 'JSONEachRow'
    });
    
    const primaryFieldValues = await primaryFieldResultSet.json() as any[];
    
    // Maps for name lookups (for producer names, etc)
    const nameMap = new Map<string, string>();
    
    // If the secondary field is producer, get the producer names
    if (secondaryField === 'producer') {
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
        nameMap.set(item.producer.toString(), item.producer_name);
      });
    }

    // Now, for each primary field value, get the data grouped by secondary field
    const groupedData: GroupedData = {};
    
    for (const primaryItem of primaryFieldValues) {
      const primaryValue = primaryItem.field_value;
      
      // Build the query for current period by the secondary field for this primary value
      const currentQuery = `
        SELECT 
          toString(${secondaryField}) AS field_name,
          SUM(sold_rooms) AS rooms_sold,
          SUM(roomRevenue) AS room_revenue,
          SUM(fbRevenue) AS fb_revenue,
          SUM(otherRevenue) AS other_revenue,
          SUM(totalRevenue) AS total_revenue
        FROM SAND01CN.insights
        WHERE 
          toDate(occupancy_date) BETWEEN '${startDate}' AND '${endDate}'
          AND date(scd_valid_from) <= DATE('${businessDateParam}') 
          AND DATE('${businessDateParam}') < date(scd_valid_to)
          AND ${primaryField} = '${primaryValue}'
          ${secondaryFieldFilters}
        GROUP BY ${secondaryField}
        ORDER BY total_revenue DESC
      `;

      // Build the query for previous period by the secondary field for this primary value
      const previousQuery = `
        SELECT 
          toString(${secondaryField}) AS field_name,
          SUM(sold_rooms) AS rooms_sold,
          SUM(roomRevenue) AS room_revenue,
          SUM(fbRevenue) AS fb_revenue,
          SUM(otherRevenue) AS other_revenue,
          SUM(totalRevenue) AS total_revenue
        FROM SAND01CN.insights
        WHERE 
          toDate(occupancy_date) BETWEEN '${prevStartDate}' AND '${prevEndDate}'
          AND date(scd_valid_from) <= DATE('${prevBusinessDateParam}') 
          AND DATE('${prevBusinessDateParam}') < date(scd_valid_to)
          AND ${primaryField} = '${primaryValue}'
          ${secondaryFieldFilters}
        GROUP BY ${secondaryField}
        ORDER BY total_revenue DESC
      `;

      // Query for time series data (by month or day depending on period type)
      const timeScaleClause = periodType === 'Day' 
        ? "toString(toDate(occupancy_date)) AS date_period" 
        : "toYYYYMM(occupancy_date) AS date_period";
      
      const timeSeriesQuery = `
        SELECT 
          ${timeScaleClause},
          toString(${secondaryField}) AS field_name,
          SUM(sold_rooms) AS rooms_sold,
          SUM(roomRevenue) AS room_revenue,
          SUM(totalRevenue) AS total_revenue
        FROM SAND01CN.insights
        WHERE 
          (
            (
              toDate(occupancy_date) BETWEEN '${startDate}' AND '${endDate}'
              AND date(scd_valid_from) <= DATE('${businessDateParam}') 
              AND DATE('${businessDateParam}') < date(scd_valid_to)
            )
            OR
            (
              toDate(occupancy_date) BETWEEN '${prevStartDate}' AND '${prevEndDate}'
              AND date(scd_valid_from) <= DATE('${prevBusinessDateParam}') 
              AND DATE('${prevBusinessDateParam}') < date(scd_valid_to)
            )
          )
          AND ${primaryField} = '${primaryValue}'
          ${secondaryFieldFilters}
          AND toString(${secondaryField}) IN (
            SELECT toString(${secondaryField})
            FROM SAND01CN.insights
            WHERE 
              toDate(occupancy_date) BETWEEN '${startDate}' AND '${endDate}'
              AND date(scd_valid_from) <= DATE('${businessDateParam}') 
              AND DATE('${businessDateParam}') < date(scd_valid_to)
              AND ${primaryField} = '${primaryValue}'
              ${secondaryFieldFilters}
            GROUP BY ${secondaryField}
            ORDER BY SUM(totalRevenue) DESC
            LIMIT ${limit}
          )
        GROUP BY date_period, field_name
        ORDER BY date_period, total_revenue DESC
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

      const timeSeriesResultSet = await client.query({
        query: timeSeriesQuery,
        format: 'JSONEachRow'
      });

      const currentData = await currentResultSet.json() as any[];
      const previousData = await previousResultSet.json() as any[];
      const timeSeriesData = await timeSeriesResultSet.json() as any[];

      // Skip if no data for this primary value
      if (currentData.length === 0) continue;

      // Create a map for previous data for easier lookup
      const previousDataMap = new Map();
      previousData.forEach(item => {
        previousDataMap.set(item.field_name, item);
      });

      // Helper function to get display name
      const getDisplayName = (fieldValue: any): string => {
        if (secondaryField === 'producer' && nameMap.has(fieldValue.toString())) {
          return nameMap.get(fieldValue.toString()) || `Producer ${fieldValue}`;
        }
        return fieldValue.toString();
      };

      // Process data for revenue
      const revenueData: AnalysisData[] = currentData.slice(0, limit).map(item => {
        const prevItem = previousDataMap.get(item.field_name) || {
          total_revenue: 0,
          rooms_sold: 0,
          room_revenue: 0
        };
        
        const value = parseFloat(item.total_revenue || '0');
        const prevValue = parseFloat(prevItem.total_revenue || '0');
        const change = value - prevValue;
        
        const displayName = getDisplayName(item.field_name);
        
        return {
          name: displayName,
          value: roundValue(value),
          change: roundValue(change),
          code: generateCode(displayName)
        };
      });

      // Process data for rooms sold
      const roomsSoldData: AnalysisData[] = currentData.slice(0, limit).map(item => {
        const prevItem = previousDataMap.get(item.field_name) || {
          total_revenue: 0,
          rooms_sold: 0,
          room_revenue: 0
        };
        
        const value = parseFloat(item.rooms_sold || '0');
        const prevValue = parseFloat(prevItem.rooms_sold || '0');
        const change = value - prevValue;
        
        const displayName = getDisplayName(item.field_name);
        
        return {
          name: displayName,
          value: roundValue(value),
          change: roundValue(change),
          code: generateCode(displayName)
        };
      });

      // Process data for ADR (Average Daily Rate)
      const adrData: AnalysisData[] = currentData.slice(0, limit).map(item => {
        const prevItem = previousDataMap.get(item.field_name) || {
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
          code: generateCode(displayName)
        };
      });

      // Process time series data
      // First, gather all unique dates and field values
      const dateSet = new Set<string>();
      const fieldValueSet = new Set<string>();
      const timeSeriesMap = new Map<string, Map<string, { current: number; previous: number }>>();

      timeSeriesData.forEach(item => {
        const date = item.date_period.toString();
        const fieldValue = getDisplayName(item.field_name);
        const fieldCode = generateCode(fieldValue);
        
        const isCurrentPeriod = true; // Simplified for this example

        dateSet.add(date);
        fieldValueSet.add(fieldCode);

        if (!timeSeriesMap.has(date)) {
          timeSeriesMap.set(date, new Map());
        }

        const dateMap = timeSeriesMap.get(date)!;
        if (!dateMap.has(fieldCode)) {
          dateMap.set(fieldCode, { current: 0, previous: 0 });
        }

        const entry = dateMap.get(fieldCode)!;
        const revenue = parseFloat(item.total_revenue || '0');

        if (isCurrentPeriod) {
          entry.current = revenue;
        } else {
          entry.previous = revenue;
        }
      });

      // Convert the nested maps to the expected structure
      const processedTimeSeriesData = Array.from(dateSet).map(date => {
        const categoryMap = timeSeriesMap.get(date) || new Map();
        const categories: Record<string, { current: number; previous: number }> = {};

        Array.from(fieldValueSet).forEach(fieldCode => {
          const data = categoryMap.get(fieldCode) || { current: 0, previous: 0 };
          categories[fieldCode] = data;
        });

        return {
          date,
          categories
        };
      });

      // Add this primary value's data to the grouped data
      groupedData[primaryValue] = {
        revenue: revenueData,
        roomsSold: roomsSoldData,
        adr: adrData,
        timeSeriesData: processedTimeSeriesData
      };
    }

    // --- STORE IN CACHE ---
    const cacheEntry: CacheEntry = {
      data: {
        body: groupedData,
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      },
      expiresAt: Date.now() + CACHE_DURATION
    };

    await setCacheEntry(cacheKey, cacheEntry);
    console.log(`[Cache SET] Stored response data for key: ${cacheKey.substring(0, 100)}...`);
    // --- END STORE IN CACHE ---

    // Return the actual response for this request
    return NextResponse.json(groupedData);

  } catch (error) {
    console.error('Error querying ClickHouse:', error);
    // Do not cache errors
    const errorBody = { error: `Failed to fetch grouped data from ClickHouse` };
    return NextResponse.json(errorBody, { status: 500 });
  } finally {
    // Close client connection if it exists
    if (client) {
      await client.close();
    }
  }
} 