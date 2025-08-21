import { NextResponse } from "next/server";
import { ClickHouseClient, createClient } from "@clickhouse/client";
import { getClickhouseConnection } from "@/lib/clickhouse";
import {
  calculateDateRanges,
  calculateComparisonDateRanges,
} from "@/lib/dateUtils";
import * as fs from "fs";
import * as path from "path";

// Interface for analysis data
interface AnalysisData {
  name: string;
  value: number;
  change: number;
  code: string;
}

// Interface for the API response
export interface AnalysisResponse {
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
  // Optional country codes mapping
  countryCodes?: {
    [countryName: string]: string;
  };
}

// Country code mapping - only used when field is guest_country
const countryCodes: { [countryName: string]: string } = {
  "United States": "us",
  "United Kingdom": "gb",
  Germany: "de",
  France: "fr",
  Spain: "es",
  Italy: "it",
  Netherlands: "nl",
  Switzerland: "ch",
  Canada: "ca",
  Australia: "au",
  Japan: "jp",
  China: "cn",
  India: "in",
  Brazil: "br",
  Mexico: "mx",
  Russia: "ru",
  "South Korea": "kr",
  "United Arab Emirates": "ae",
  "Saudi Arabia": "sa",
  Sweden: "se",
  Norway: "no",
  Denmark: "dk",
  Belgium: "be",
  Austria: "at",
  Portugal: "pt",
  Greece: "gr",
  Ireland: "ie",
  Poland: "pl",
  Finland: "fi",
  Singapore: "sg",
  Thailand: "th",
  Malaysia: "my",
  Indonesia: "id",
};

// Helper function to round numbers
function roundValue(value: number): number {
  // Round to nearest integer for values >= 100
  // Round to 2 decimal places for smaller values
  return value >= 100 ? Math.round(value) : Number(value.toFixed(2));
}

// Helper function to generate a code from a name
function generateCode(name: string, field: string): string {
  if (field === "guest_country" && countryCodes[name]) {
    return countryCodes[name];
  }
  return name.toString().toLowerCase().replace(/\s+/g, "_");
}

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
const CACHE_DIR = path.join(process.cwd(), ".cache");

// Ensure cache directory exists
try {
  if (!fs.existsSync(CACHE_DIR)) {
    fs.mkdirSync(CACHE_DIR, { recursive: true });
  }
} catch (error) {
  console.error("Error creating cache directory:", error);
}

// File-based cache functions
function getCacheFilePath(key: string): string {
  // Create a safe filename from the key
  const safeKey = Buffer.from(key)
    .toString("base64")
    .replace(/[/\\?%*:|"<>]/g, "_");
  return path.join(CACHE_DIR, `${safeKey}.json`);
}

async function getCacheEntry(key: string): Promise<CacheEntry | null> {
  try {
    const filePath = getCacheFilePath(key);
    if (fs.existsSync(filePath)) {
      const data = fs.readFileSync(filePath, "utf8");
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
    fs.writeFileSync(filePath, JSON.stringify(entry), "utf8");
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
 * Generates a cache key based on relevant query parameters for distribution route.
 * Ensures the key is consistent regardless of parameter order.
 */
function generateCacheKey(params: URLSearchParams): string {
  const relevantParams = [
    "businessDate",
    "periodType",
    "viewType",
    "comparison",
    "field",
    // 'limit' is derived from 'field' and URL path, so 'field' covers it implicitly
  ];
  const keyParts: string[] = [];

  relevantParams.forEach((key) => {
    // Use default values if parameter is missing, mirroring the route's logic
    let value: string | null = null;
    switch (key) {
      case "businessDate":
        value = params.get(key) || new Date().toISOString().split("T")[0];
        break;
      case "periodType":
        value = params.get(key) || "Month";
        break;
      case "viewType":
        value = params.get(key) || "Actual";
        break;
      case "comparison":
        value = params.get(key) || "Last year - OTB";
        break;
      case "field":
        value = params.get(key) || "guest_country";
        break;
      default:
        value = params.get(key);
    }
    if (value !== null) {
      keyParts.push(`${key}=${value}`);
    }
  });

  // Sort parts to ensure consistent key regardless of parameter order
  keyParts.sort();
  return keyParts.join("&");
}

// --- END CACHING LOGIC ---

export async function GET(request: Request) {
  // Parse query parameters
  const { searchParams } = new URL(request.url);

  // --- CHECK CACHE ---
  const cacheKey = `distribution:${generateCacheKey(searchParams)}`;
  const cachedEntry = await getCacheEntry(cacheKey);

  if (cachedEntry && cachedEntry.expiresAt > Date.now()) {
    console.log(
      `[Cache HIT] Returning cached response for key: ${cacheKey.substring(
        0,
        100
      )}...`
    );
    // Reconstruct the response from cached data
    return new NextResponse(JSON.stringify(cachedEntry.data.body), {
      status: cachedEntry.data.status,
      headers: cachedEntry.data.headers,
    });
  } else if (cachedEntry) {
    // Entry exists but is expired
    console.log(
      `[Cache EXPIRED] Removing expired entry for key: ${cacheKey.substring(
        0,
        100
      )}...`
    );
    await deleteCacheEntry(cacheKey);
  } else {
    console.log(
      `[Cache MISS] No valid cache entry for key: ${cacheKey.substring(
        0,
        100
      )}...`
    );
  }
  // --- END CACHE CHECK ---

  const businessDateParam =
    searchParams.get("businessDate") || new Date().toISOString().split("T")[0];
  const periodType = searchParams.get("periodType") || "Month"; // Month, Year, Day
  const viewType = searchParams.get("viewType") || "Actual"; // Actual, OTB, Projected
  const comparisonType = searchParams.get("comparison") || "Last year - OTB";

  // Get the field to analyze - this is the key parameter for this generic route
  const field = searchParams.get("field") || "guest_country";

  // Determine if we're handling producer data
  const isProducerRoute =
    request.url.includes("producer") || field === "producer";

  // Limit for number of items to return - make it very large for producers to effectively return all
  const defaultLimit = isProducerRoute ? 1000 : 10;
  const limit = 3000;

  // Calculate date ranges
  const { startDate, endDate } = calculateDateRanges(
    businessDateParam,
    periodType,
    viewType
  );

  // Calculate comparison period date ranges
  const { prevStartDate, prevEndDate, prevBusinessDateParam } =
    calculateComparisonDateRanges(
      startDate,
      endDate,
      businessDateParam,
      comparisonType
    );

  // Initialize client variable
  let client: ClickHouseClient | undefined;

  try {
    // Create ClickHouse client
    client = createClient(getClickhouseConnection());

    // Add field-specific filters
    let fieldFilters = "";

    if (field === "guest_country") {
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
        format: "JSONEachRow",
      });

      const producerData = (await producerResultSet.json()) as any[];

      // Build producer ID to name mapping
      producerData.forEach((item) => {
        producerMap.set(parseInt(item.producer), item.producer_name);
      });
    }

    // Build the query for current period by the specified field
    const currentQuery = `
      SELECT 
        ${field} AS field_name,
        SUM(sold_rooms) AS rooms_sold,
        SUM(roomRevenue) AS room_revenue,
        SUM(fbRevenue) AS fb_revenue,
        SUM(otherRevenue) AS other_revenue,
        SUM(totalRevenue) AS total_revenue
      FROM JADRANKA.insights
      WHERE 
        toDate(occupancy_date) BETWEEN '${startDate}' AND '${endDate}'
        AND date(scd_valid_from) <= DATE('${businessDateParam}') 
        AND DATE('${businessDateParam}') < date(scd_valid_to)
        ${fieldFilters}
      GROUP BY ${field}
      ORDER BY total_revenue DESC
    `;

    // Build the query for previous period by the specified field
    const previousQuery = `
      SELECT 
        ${field} AS field_name,
        SUM(sold_rooms) AS rooms_sold,
        SUM(roomRevenue) AS room_revenue,
        SUM(fbRevenue) AS fb_revenue,
        SUM(otherRevenue) AS other_revenue,
        SUM(totalRevenue) AS total_revenue
      FROM JADRANKA.insights
      WHERE 
        toDate(occupancy_date) BETWEEN '${prevStartDate}' AND '${prevEndDate}'
        AND date(scd_valid_from) <= DATE('${prevBusinessDateParam}') 
        AND DATE('${prevBusinessDateParam}') < date(scd_valid_to)
        ${fieldFilters}
      GROUP BY ${field}
      ORDER BY total_revenue DESC
    `;

    // Query for time series data (by month or day depending on period type)
    const timeScaleClause =
      periodType === "Day"
        ? "toString(toDate(occupancy_date)) AS date_period"
        : "toYYYYMM(occupancy_date) AS date_period";

    const timeSeriesQuery = `
      SELECT 
        ${timeScaleClause},
        ${field} AS field_name,
        SUM(sold_rooms) AS rooms_sold,
        SUM(roomRevenue) AS room_revenue,
        SUM(totalRevenue) AS total_revenue
      FROM JADRANKA.insights
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
        ${fieldFilters}
        ${
          isProducerRoute
            ? ""
            : `AND ${field} IN (
          SELECT ${field}
          FROM JADRANKA.insights
          WHERE 
            toDate(occupancy_date) BETWEEN '${startDate}' AND '${endDate}'
            AND date(scd_valid_from) <= DATE('${businessDateParam}') 
            AND DATE('${businessDateParam}') < date(scd_valid_to)
            ${fieldFilters}
          GROUP BY ${field}
          ORDER BY SUM(totalRevenue) DESC
          LIMIT ${limit}
        )`
        }
      GROUP BY date_period, field_name
      ORDER BY date_period, total_revenue DESC
    `;

    // Execute queries
    const currentResultSet = await client.query({
      query: currentQuery,
      format: "JSONEachRow",
    });

    const previousResultSet = await client.query({
      query: previousQuery,
      format: "JSONEachRow",
    });

    const timeSeriesResultSet = await client.query({
      query: timeSeriesQuery,
      format: "JSONEachRow",
    });

    const currentData = (await currentResultSet.json()) as any[];
    const previousData = (await previousResultSet.json()) as any[];
    const timeSeriesData = (await timeSeriesResultSet.json()) as any[];

    // Create a map for previous data for easier lookup
    const previousDataMap = new Map();
    previousData.forEach((item) => {
      previousDataMap.set(item.field_name, item);
    });

    // Helper function to get display name (maps producer ID to name if needed)
    const getDisplayName = (fieldValue: any): string => {
      if (isProducerRoute && producerMap.size > 0) {
        const producerId = parseInt(fieldValue);
        return producerMap.get(producerId) || `Producer ${fieldValue}`;
      }
      return fieldValue.toString();
    };

    // Process data for revenue
    const revenueData: AnalysisData[] = (
      isProducerRoute ? currentData : currentData.slice(0, limit)
    ).map((item) => {
      const prevItem = previousDataMap.get(item.field_name) || {
        total_revenue: 0,
        rooms_sold: 0,
        room_revenue: 0,
      };

      const value = parseFloat(item.total_revenue || "0");
      const prevValue = parseFloat(prevItem.total_revenue || "0");
      const change = value - prevValue;

      const displayName = getDisplayName(item.field_name);

      return {
        name: displayName,
        value: roundValue(value),
        change: roundValue(change),
        code: generateCode(displayName, field),
      };
    });

    // Process data for rooms sold
    const roomsSoldData: AnalysisData[] = (
      isProducerRoute ? currentData : currentData.slice(0, limit)
    ).map((item) => {
      const prevItem = previousDataMap.get(item.field_name) || {
        total_revenue: 0,
        rooms_sold: 0,
        room_revenue: 0,
      };

      const value = parseFloat(item.rooms_sold || "0");
      const prevValue = parseFloat(prevItem.rooms_sold || "0");
      const change = value - prevValue;

      const displayName = getDisplayName(item.field_name);

      return {
        name: displayName,
        value: roundValue(value),
        change: roundValue(change),
        code: generateCode(displayName, field),
      };
    });

    // Process data for ADR (Average Daily Rate)
    const adrData: AnalysisData[] = (
      isProducerRoute ? currentData : currentData.slice(0, limit)
    ).map((item) => {
      const prevItem = previousDataMap.get(item.field_name) || {
        rooms_sold: 0,
        room_revenue: 0,
      };

      const currentRoomsSold = parseFloat(item.rooms_sold || "0");
      const currentRoomRevenue = parseFloat(item.room_revenue || "0");
      const prevRoomsSold = parseFloat(prevItem.rooms_sold || "0");
      const prevRoomRevenue = parseFloat(prevItem.room_revenue || "0");

      const currentAdr =
        currentRoomsSold > 0 ? currentRoomRevenue / currentRoomsSold : 0;
      const prevAdr = prevRoomsSold > 0 ? prevRoomRevenue / prevRoomsSold : 0;
      const change = currentAdr - prevAdr;

      const displayName = getDisplayName(item.field_name);

      return {
        name: displayName,
        value: roundValue(currentAdr),
        change: roundValue(change),
        code: generateCode(displayName, field),
      };
    });

    // Process time series data
    // First, gather all unique dates and field values
    const dateSet = new Set<string>();
    const fieldValueSet = new Set<string>();
    const timeSeriesMap = new Map<
      string,
      Map<string, { current: number; previous: number }>
    >();

    timeSeriesData.forEach((item) => {
      const date = item.date_period.toString();
      const fieldValue = getDisplayName(item.field_name);
      const fieldCode = generateCode(fieldValue, field);

      const isCurrentPeriod =
        new Date(item.occupancy_date) >= new Date(startDate) &&
        new Date(item.occupancy_date) <= new Date(endDate);

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
      const revenue = parseFloat(item.total_revenue || "0");

      if (isCurrentPeriod) {
        entry.current = revenue;
      } else {
        entry.previous = revenue;
      }
    });

    // Convert the nested maps to the expected structure
    const processedTimeSeriesData = Array.from(dateSet).map((date) => {
      const categoryMap = timeSeriesMap.get(date) || new Map();
      const categories: Record<string, { current: number; previous: number }> =
        {};

      Array.from(fieldValueSet).forEach((fieldCode) => {
        const data = categoryMap.get(fieldCode) || { current: 0, previous: 0 };
        categories[fieldCode] = data;
      });

      return {
        date,
        categories,
      };
    });

    // Prepare map data if the field is guest_country
    let mapData;
    if (field === "guest_country") {
      mapData = currentData.slice(0, limit).map((country) => ({
        country: countryCodes[country.field_name] || "unknown",
        value: roundValue(parseFloat(country.total_revenue || "0")),
      }));
    }

    // Construct response
    const response: AnalysisResponse = {
      revenue: revenueData,
      roomsSold: roomsSoldData,
      adr: adrData,
      timeSeriesData: processedTimeSeriesData,
    };

    // Add map data and country codes if the field is guest_country
    if (field === "guest_country") {
      response.mapData = mapData;
      response.countryCodes = countryCodes;
    }

    // --- STORE IN CACHE ---
    const cacheEntry: CacheEntry = {
      data: {
        body: response, // The JSON response body
        status: 200,
        headers: { "Content-Type": "application/json" },
      },
      expiresAt: Date.now() + CACHE_DURATION,
    };

    await setCacheEntry(cacheKey, cacheEntry);
    console.log(
      `[Cache SET] Stored response data for key: ${cacheKey.substring(
        0,
        100
      )}...`
    );
    // --- END STORE IN CACHE ---

    return NextResponse.json(response);
  } catch (error) {
    console.error("Error querying ClickHouse:", error);
    // Do not cache errors
    const errorBody = {
      error: `Failed to fetch ${field} data from ClickHouse`,
    };
    return NextResponse.json(errorBody, { status: 500 });
  } finally {
    // Close client connection if it exists
    if (client) {
      await client.close();
    }
  }
}
