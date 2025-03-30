import { NextResponse } from 'next/server';
import { ClickHouseClient, createClient } from '@clickhouse/client';
import { addDays, endOfMonth, endOfYear, format } from 'date-fns';
import * as fs from 'fs';
import * as path from 'path';

// --- START CACHING LOGIC (Copied from overview/distribution) ---

interface CacheEntryData {
  body: any; // Store the parsed JSON body
  status: number;
  headers: Record<string, string>;
}

interface CacheEntry {
  data: CacheEntryData;
  expiresAt: number;
}

const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours
const CACHE_DIR = path.join(process.cwd(), '.cache');

try {
  if (!fs.existsSync(CACHE_DIR)) {
    fs.mkdirSync(CACHE_DIR, { recursive: true });
  }
} catch (error) { console.error('Error creating cache directory:', error); }

function getCacheFilePath(key: string): string {
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
  } catch (error) { console.error(`Cache read error:`, error); return null; }
}

async function setCacheEntry(key: string, entry: CacheEntry): Promise<void> {
  try {
    const filePath = getCacheFilePath(key);
    fs.writeFileSync(filePath, JSON.stringify(entry), 'utf8');
  } catch (error) { console.error(`Cache write error:`, error); }
}

async function deleteCacheEntry(key: string): Promise<void> {
  try {
    const filePath = getCacheFilePath(key);
    if (fs.existsSync(filePath)) { fs.unlinkSync(filePath); }
  } catch (error) { console.error(`Cache delete error:`, error); }
}

function generateCacheKey(params: URLSearchParams): string {
  const relevantParams = ['reportDate', 'viewType', 'comparison', 'field'];
  const keyParts: string[] = [];
  relevantParams.forEach(key => {
    let value: string | null = null;
    switch (key) {
      case 'reportDate': value = params.get(key) || format(new Date(), 'yyyy-MM-dd'); break;
      case 'viewType': value = params.get(key) || 'Day'; break;
      case 'comparison': value = params.get(key) || 'Yesterday'; break;
      case 'field': value = params.get(key) || 'guest_country'; break;
      default: value = params.get(key);
    }
    if (value !== null) { keyParts.push(`${key}=${value}`); }
  });
  keyParts.sort();
  return keyParts.join('&');
}

// --- END CACHING LOGIC ---


// --- Interfaces (Fixed type definitions) ---
interface AnalysisData {
  name: string;
  value: number;
  change: number;
  code: string;
}

interface AnalysisResponse {
  revenue: AnalysisData[];
  roomsSold: AnalysisData[];
  adr: AnalysisData[];
  mapData?: Array<{ country: string; value: number }>;
  timeSeriesData: Array<{
    date: string;
    categories: {
      [key: string]: {
        current: number;
        previous: number;
      };
    };
  }>;
  countryCodes?: { [countryName: string]: string };
}

// Fixed interface definitions for query results
interface RawQueryResult {
  field_name: string | number;
  rooms_sold: number;
  room_revenue: number;
  total_revenue: number;
  num_comparison_days?: number;
}

interface RawTimeSeriesResult {
  date_period: string;
  field_name: string | number;
  rooms_sold: number;
  room_revenue: number;
  total_revenue: number;
  booking_date_marker: string;
}


// --- Helper Functions (Adapted/Copied) ---
const countryCodes: { [countryName: string]: string } = { /* ... same as overview ... */
  "United States": "us", "United Kingdom": "gb", "Germany": "de", "France": "fr", "Spain": "es", "Italy": "it", "Netherlands": "nl", "Switzerland": "ch", "Canada": "ca", "Australia": "au", "Japan": "jp", "China": "cn", "India": "in", "Brazil": "br", "Mexico": "mx", "Russia": "ru", "South Korea": "kr", "United Arab Emirates": "ae", "Saudi Arabia": "sa", "Sweden": "se", "Norway": "no", "Denmark": "dk", "Belgium": "be", "Austria": "at", "Portugal": "pt", "Greece": "gr", "Ireland": "ie", "Poland": "pl", "Finland": "fi", "Singapore": "sg", "Thailand": "th", "Malaysia": "my", "Indonesia": "id",
};

function roundValue(value: number): number {
  if (typeof value !== 'number') {
    // Handle case where value might not be a number
    value = Number(value) || 0;
  }
  return value >= 100 ? Math.round(value) : Number(value.toFixed(2));
}

function generateCode(name: string, field: string): string {
  if (field === 'guest_country' && countryCodes[name]) {
    return countryCodes[name];
  }
  // Simple slugify: lowercase, replace space/non-alphanumeric with underscore
  return name.toString().toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');
}

const calculateAdr = (revenue: number, rooms: number): number => {
  return rooms > 0 ? roundValue(revenue / rooms) : 0;
}

const getOccupancyDateRange = (refDateStr: string, viewType: 'Day' | 'Month' | 'Year'): { startDate: string, endDate: string } => {
    const refDate = new Date(refDateStr + 'T00:00:00Z'); // Ensure parsing as UTC
    let occStartDate: Date;
    let occEndDate: Date;
    switch (viewType) {
        case 'Day': occStartDate = refDate; occEndDate = refDate; break;
        case 'Month': occStartDate = refDate; occEndDate = endOfMonth(refDate); break;
        case 'Year': occStartDate = refDate; occEndDate = endOfYear(refDate); break;
        default: occStartDate = refDate; occEndDate = refDate; break;
    }
    return { startDate: format(occStartDate, 'yyyy-MM-dd'), endDate: format(occEndDate, 'yyyy-MM-dd') };
};

// --- Main GET Handler ---
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);

  // --- CHECK CACHE ---
  const cacheKey = `pickup-distribution:${generateCacheKey(searchParams)}`;
  const cachedEntry = await getCacheEntry(cacheKey);
  if (cachedEntry && cachedEntry.expiresAt > Date.now()) {
    console.log(`[Cache HIT] Pickup Distribution: ${cacheKey.substring(0, 100)}...`);
    return new NextResponse(JSON.stringify(cachedEntry.data.body), {
      status: cachedEntry.data.status,
      headers: cachedEntry.data.headers,
    });
  } else if (cachedEntry) {
    console.log(`[Cache EXPIRED] Pickup Distribution: ${cacheKey.substring(0, 100)}...`);
    await deleteCacheEntry(cacheKey);
  } else {
    console.log(`[Cache MISS] Pickup Distribution: ${cacheKey.substring(0, 100)}...`);
  }
  // --- END CACHE CHECK ---

  // Parse Params (Pickup Style)
  const reportDateParam = searchParams.get('reportDate') || format(new Date(), 'yyyy-MM-dd');
  const viewType = (searchParams.get('viewType') || 'Day') as 'Day' | 'Month' | 'Year';
  const comparison = (searchParams.get('comparison') || 'Yesterday') as 'Yesterday' | 'Last 7 days' | 'Last 15 days' | 'Last 30 days';
  const field = searchParams.get('field') || 'guest_country';
  const isProducerRoute = field === 'producer'; // Check if field is producer

  // --- Date Calculations (Pickup Style) ---
  const reportDate = new Date(reportDateParam + 'T00:00:00Z');
  const currentBookingDate = format(reportDate, 'yyyy-MM-dd');
  const currentOccupancyRange = getOccupancyDateRange(reportDateParam, viewType); // Use reportDateParam for occupancy range start

  let comparisonBookingStartDate: string;
  let comparisonBookingEndDate: string;
  let comparisonDays = 1;

  if (comparison === 'Yesterday') {
      const yesterday = addDays(reportDate, -1);
      comparisonBookingStartDate = format(yesterday, 'yyyy-MM-dd');
      comparisonBookingEndDate = comparisonBookingStartDate;
  } else {
      let daysToSubtract = 7;
      if (comparison === 'Last 15 days') daysToSubtract = 15;
      if (comparison === 'Last 30 days') daysToSubtract = 30;
      const endDate = addDays(reportDate, -1);
      const startDate = addDays(reportDate, -daysToSubtract);
      comparisonBookingStartDate = format(startDate, 'yyyy-MM-dd');
      comparisonBookingEndDate = format(endDate, 'yyyy-MM-dd');
      comparisonDays = daysToSubtract;
  }
  // Comparison occupancy range is the same as current for pickup analysis
  const comparisonOccupancyRange = currentOccupancyRange;


  let client: ClickHouseClient | undefined;
  try {
    client = createClient({
      host: process.env.CLICKHOUSE_HOST || 'http://34.34.71.156:8123',
      username: process.env.CLICKHOUSE_USER || 'default',
      password: process.env.CLICKHOUSE_PASSWORD || 'elarion',
      database: 'SAND01CN',
    });

    // Add field-specific filters (similar to overview)
    let fieldFilters = '';
    if (field === 'guest_country') {
        // fieldFilters = `AND ${field} != 'UNDEFINED' AND ${field} != '' AND ${field} IS NOT NULL`;
    } else if (isProducerRoute) {
        fieldFilters = `AND ${field} != -1 AND ${field} IS NOT NULL`; // Assuming -1 is undefined producer ID
    } // Add more filters for other fields if needed

    // Fetch producer names if needed (copied from overview)
    let producerMap = new Map<number, string>();
    if (isProducerRoute) {
        const producerQuery = `
            SELECT producer, producer_name FROM producers
            WHERE date(scd_valid_from) <= {reportDate:Date} AND {reportDate:Date} < date(scd_valid_to) AND producer != -1`;
        const producerResultSet = await client.query({ 
          query: producerQuery, 
          query_params: { reportDate: reportDateParam }, 
          format: 'JSONEachRow' 
        });
        
        // Fix: parse as an array of objects
        const producerData = await producerResultSet.json<Array<{producer: number; producer_name: string}>>();
        
        // Now iterate over the array properly
        producerData.forEach(row => {
          producerMap.set(row.producer, row.producer_name);
        });
    }

    // --- Build Queries (Pickup Logic) ---

    // Current Period Query
    const currentQuery = `
        SELECT
            ${field} AS field_name,
            SUM(sold_rooms) AS rooms_sold,
            SUM(roomRevenue) AS room_revenue,
            SUM(totalRevenue) AS total_revenue
        FROM insights
        WHERE
            toDate(booking_date) = {currentBookingDate:Date}
        AND toDate(occupancy_date) BETWEEN {occStartDate:Date} AND {occEndDate:Date}
        ${fieldFilters}
        GROUP BY field_name
        ORDER BY total_revenue DESC
    `;
    const currentQueryParams = {
        currentBookingDate: currentBookingDate,
        occStartDate: currentOccupancyRange.startDate,
        occEndDate: currentOccupancyRange.endDate,
    };

    // Comparison Period Query
    let comparisonQuery: string;
    let comparisonQueryParams: Record<string, any>;
    if (comparison === 'Yesterday') {
        comparisonQuery = `
            SELECT
                ${field} AS field_name,
                SUM(sold_rooms) AS rooms_sold,
                SUM(roomRevenue) AS room_revenue,
                SUM(totalRevenue) AS total_revenue
            FROM insights
            WHERE
                toDate(booking_date) = {comparisonBookingDate:Date}
            AND toDate(occupancy_date) BETWEEN {occStartDate:Date} AND {occEndDate:Date}
            ${fieldFilters}
            GROUP BY field_name
        `;
        comparisonQueryParams = {
            comparisonBookingDate: comparisonBookingStartDate,
            occStartDate: comparisonOccupancyRange.startDate,
            occEndDate: comparisonOccupancyRange.endDate,
        };
    } else { // 'Last X days'
        comparisonQuery = `
            SELECT
                ${field} AS field_name,
                SUM(sold_rooms) AS rooms_sold,
                SUM(roomRevenue) AS room_revenue,
                SUM(totalRevenue) AS total_revenue,
                toFloat64(COUNT(DISTINCT toDate(booking_date))) as num_comparison_days
            FROM insights
            WHERE
                toDate(booking_date) BETWEEN {comparisonBookingStartDate:Date} AND {comparisonBookingEndDate:Date}
            AND toDate(occupancy_date) BETWEEN {occStartDate:Date} AND {occEndDate:Date}
            ${fieldFilters}
            GROUP BY field_name
        `;
        comparisonQueryParams = {
            comparisonBookingStartDate,
            comparisonBookingEndDate,
            occStartDate: comparisonOccupancyRange.startDate,
            occEndDate: comparisonOccupancyRange.endDate,
        };
    }

    // Time Series Query (adapted logic)
    const timeScaleClause = viewType === 'Day'
        ? "toString(toDate(occupancy_date)) AS date_period" // Daily occupancy date
        : "formatDateTime(toDate(occupancy_date), '%Y-%m') AS date_period"; // Monthly occupancy date YYYY-MM

    const timeSeriesQuery = `
        WITH AllFields AS ( -- Select all fields based on current booking date's revenue
             SELECT ${field} AS field_name
             FROM insights
             WHERE toDate(booking_date) = {currentBookingDate:Date}
               AND toDate(occupancy_date) BETWEEN {occStartDate:Date} AND {occEndDate:Date}
               ${fieldFilters}
             GROUP BY field_name
             ORDER BY SUM(totalRevenue) DESC
        )
        SELECT
            ${timeScaleClause},
            ${field} AS field_name,
            SUM(sold_rooms) AS rooms_sold,
            SUM(roomRevenue) AS room_revenue,
            SUM(totalRevenue) AS total_revenue,
            CASE
                WHEN toDate(booking_date) = {currentBookingDate:Date} THEN 'current'
                ELSE 'previous'
            END AS booking_date_marker
        FROM insights
        WHERE
            ( -- Pickup windows
                toDate(booking_date) = {currentBookingDate:Date} OR
                toDate(booking_date) BETWEEN {comparisonBookingStartDate:Date} AND {comparisonBookingEndDate:Date}
            )
            AND -- Occupancy window
                toDate(occupancy_date) BETWEEN {occStartDate:Date} AND {occEndDate:Date}
            AND -- Field filters and only include fields present in the current period
                ${field} IN (SELECT field_name FROM AllFields) -- Changed TopFields to AllFields
                ${fieldFilters}
        GROUP BY date_period, field_name, booking_date_marker
        ORDER BY date_period, total_revenue DESC
    `;
     const timeSeriesQueryParams = {
        currentBookingDate: currentBookingDate,
        comparisonBookingStartDate: comparisonBookingStartDate,
        comparisonBookingEndDate: comparisonBookingEndDate,
        occStartDate: currentOccupancyRange.startDate,
        occEndDate: currentOccupancyRange.endDate,
    };

    // --- Execute Queries ---
    const [currentResultSet, comparisonResultSet, timeSeriesResultSet] = await Promise.all([
        client.query({ query: currentQuery, query_params: currentQueryParams, format: 'JSONEachRow' }),
        client.query({ query: comparisonQuery, query_params: comparisonQueryParams, format: 'JSONEachRow' }),
        client.query({ query: timeSeriesQuery, query_params: timeSeriesQueryParams, format: 'JSONEachRow' })
    ]);

    // Fix: parse JSON results as arrays of their respective types
    const currentData = await currentResultSet.json<RawQueryResult[]>();
    const comparisonDataRaw = await comparisonResultSet.json<RawQueryResult[]>();
    const timeSeriesDataRaw = await timeSeriesResultSet.json<RawTimeSeriesResult[]>();

    // --- Process Data ---

    // Helper to get display name
    const getDisplayName = (fieldValue: any): string => {
      if (isProducerRoute && producerMap.size > 0) {
        const producerId = parseInt(String(fieldValue));
        return producerMap.get(producerId) || `Producer ${fieldValue}`;
      }
      return String(fieldValue);
    };

    // Process Comparison Data - FIX: handle array elements correctly
    const comparisonDataMap = new Map<string, RawQueryResult>();
    comparisonDataRaw.forEach(row => {
      // Each row is a RawQueryResult object
      const name = getDisplayName(row.field_name);
      let processedItem = { ...row }; // Clone the item

      if (comparison !== 'Yesterday') {
          const actualDays = row.num_comparison_days ?? 0;
          const divisor = actualDays > 0 ? actualDays : comparisonDays;
          processedItem.rooms_sold = row.rooms_sold / divisor;
          processedItem.room_revenue = row.room_revenue / divisor;
          processedItem.total_revenue = row.total_revenue / divisor;
      }
      comparisonDataMap.set(name, processedItem);
    });


    // Process Main Metrics (Revenue, Rooms Sold, ADR)
    const revenue: AnalysisData[] = [];
    const roomsSold: AnalysisData[] = [];
    const adr: AnalysisData[] = [];
    const topFieldNames = new Set<string>(); // Track names included in the top N

    currentData.forEach(row => {
        // Each row is a RawQueryResult object
        const name = getDisplayName(row.field_name);
        topFieldNames.add(name); // Add to the set of top fields
        const code = generateCode(name, field);
        const prevItem = comparisonDataMap.get(name) || { rooms_sold: 0, room_revenue: 0, total_revenue: 0 };

        // Revenue
        const currentRevenue = roundValue(row.total_revenue);
        const prevRevenue = roundValue(prevItem.total_revenue);
        revenue.push({ name, value: currentRevenue, change: roundValue(currentRevenue - prevRevenue), code });

        // Rooms Sold
        const currentRooms = roundValue(row.rooms_sold);
        const prevRooms = roundValue(prevItem.rooms_sold);
        roomsSold.push({ name, value: currentRooms, change: roundValue(currentRooms - prevRooms), code });

        // ADR
        const currentAdr = calculateAdr(row.room_revenue, row.rooms_sold);
        const prevAdr = calculateAdr(prevItem.room_revenue, prevItem.rooms_sold);
        adr.push({ name, value: currentAdr, change: roundValue(currentAdr - prevAdr), code });
    });

    // Process Time Series Data - FIX: handle array elements correctly
    const timeSeriesMap = new Map<string, Map<string, { current: number; previous: number }>>();
    const timeSeriesDates = new Set<string>();
    const timeSeriesFieldCodes = new Set<string>();

    timeSeriesDataRaw.forEach(row => {
        // Each row is a RawTimeSeriesResult object
        const date = row.date_period;
        const name = getDisplayName(row.field_name);
        // Only include fields that were in the top N of the main current data
        if (!topFieldNames.has(name)) return;

        const code = generateCode(name, field);
        const value = roundValue(row.total_revenue);

        timeSeriesDates.add(date);
        timeSeriesFieldCodes.add(code);

        if (!timeSeriesMap.has(date)) {
            timeSeriesMap.set(date, new Map());
        }
        const dateMap = timeSeriesMap.get(date)!;

        if (!dateMap.has(code)) {
            dateMap.set(code, { current: 0, previous: 0 });
        }
        const entry = dateMap.get(code)!;

        if (row.booking_date_marker === 'current') {
            entry.current += value; // Summing might be needed if query returns multiple rows per field/date/marker
        } else {
            entry.previous += value;
        }
    });

    // Format Time Series Response
    const timeSeriesData = Array.from(timeSeriesDates)
        .sort() // Sort dates chronologically
        .map(date => {
            const categories: Record<string, { current: number; previous: number }> = {};
            const dateMap = timeSeriesMap.get(date);

            timeSeriesFieldCodes.forEach(code => {
                categories[code] = dateMap?.get(code) || { current: 0, previous: 0 };
            });

            return { date, categories };
     });


    // Prepare Map Data if needed
    let mapData;
    if (field === 'guest_country') {
        mapData = currentData.map(row => ({
            country: countryCodes[getDisplayName(row.field_name)] || 'unknown',
            value: roundValue(row.total_revenue)
        }));
    }

    // --- Construct Final Response ---
    const response: AnalysisResponse = {
        revenue,
        roomsSold,
        adr,
        timeSeriesData,
        ...(field === 'guest_country' && { mapData, countryCodes }), // Conditionally add map data and codes
    };

    // --- STORE IN CACHE ---
    const cacheEntry: CacheEntry = {
      data: { body: response, status: 200, headers: { 'Content-Type': 'application/json' } },
      expiresAt: Date.now() + CACHE_DURATION
    };
    await setCacheEntry(cacheKey, cacheEntry);
    console.log(`[Cache SET] Stored pickup distribution data for key: ${cacheKey.substring(0, 100)}...`);
    // --- END STORE IN CACHE ---

    return NextResponse.json(response);

  } catch (error) {
    console.error(`Error fetching pickup distribution data for field '${field}':`, error);
    const errorMsg = error instanceof Error ? error.message : 'An unknown error occurred';
    // Do not cache errors
    return NextResponse.json({ error: `Failed to fetch pickup distribution data`, details: errorMsg }, { status: 500 });
  } finally {
    await client?.close();
  }
} 