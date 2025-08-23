import { NextResponse } from "next/server";
import { ClickHouseClient, createClient } from "@clickhouse/client";
import { getClickhouseConnection } from "@/lib/clickhouse";
import {
  calculateDateRanges,
  calculateComparisonDateRanges,
} from "@/lib/dateUtils";
import { getFullNameFromCode, getCodeFromFullName } from "@/lib/countryUtils";
import * as fs from "fs";
import * as path from "path";

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
 * Generates a cache key based on relevant query parameters.
 * Ensures the key is consistent regardless of parameter order.
 */
function generateCacheKey(params: URLSearchParams): string {
  const relevantParams = [
    "businessDate",
    "periodType",
    "viewType",
    "comparison",
    "field",
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
}

// Helper function to round numbers
function roundValue(value: number): number {
  // Round to nearest integer for values >= 100
  // Round to 2 decimal places for smaller values
  return value >= 100 ? Math.round(value) : Number(value.toFixed(2));
}

// Updated Helper function to generate a code from a name
function generateCode(name: string, field: string): string {
  // Use the utility function for guest countries to get the 2-letter code
  if (field === "guest_country") {
    return getCodeFromFullName(name);
  }
  // Keep original logic for other fields (like producers)
  return name.toString().toLowerCase().replace(/\s+/g, "_");
}

export async function GET(request: Request) {
  // Parse query parameters
  const { searchParams } = new URL(request.url);
  const property = searchParams.get("property");

  const cacheKey = `distribution:${generateCacheKey(searchParams)}`;
  const cachedEntry = await getCacheEntry(cacheKey);

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
      const propertyFilter = property ? `AND property = '${property}'` : "";
      // Query to fetch producer names
      const producerQuery = `
        SELECT 
          producer,
          producer_name
                  FROM JADRANKA.producers
          WHERE 
            producer != -1
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

    const propertyFilter = property ? `AND property = '${property}'` : "";

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
        ${propertyFilter}
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
        ${propertyFilter}
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
            ${propertyFilter}
          )
          OR
          (
            toDate(occupancy_date) BETWEEN '${prevStartDate}' AND '${prevEndDate}'
            AND date(scd_valid_from) <= DATE('${prevBusinessDateParam}') 
            AND DATE('${prevBusinessDateParam}') < date(scd_valid_to)
            ${propertyFilter}
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
            ${propertyFilter}
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

    // Updated helper function to get display name (maps producer ID to name or country code to full name)
    const getDisplayName = (fieldValue: any): string => {
      if (field === "guest_country") {
        // Use the utility function to convert code to full name
        return getFullNameFromCode(String(fieldValue));
      }
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

      // Get the display name (now handles country code conversion)
      const displayName = getDisplayName(item.field_name);

      return {
        name: displayName, // Will be full country name if applicable
        value: roundValue(value),
        change: roundValue(change),
        // Generate code (will be 2-letter code for countries thanks to updated generateCode)
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

      // Get the display name (now handles country code conversion)
      const displayName = getDisplayName(item.field_name);

      return {
        name: displayName, // Will be full country name if applicable
        value: roundValue(value),
        change: roundValue(change),
        // Generate code (will be 2-letter code for countries thanks to updated generateCode)
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

      // Get the display name (now handles country code conversion)
      const displayName = getDisplayName(item.field_name);

      return {
        name: displayName, // Will be full country name if applicable
        value: roundValue(currentAdr),
        change: roundValue(change),
        // Generate code (will be 2-letter code for countries thanks to updated generateCode)
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
      // Get display name first (handles country code conversion)
      const displayName = getDisplayName(item.field_name);
      // Generate code from the display name (uses getCodeFromFullName for countries)
      const fieldCode = generateCode(displayName, field);

      // Determine if the record belongs to the current or previous period
      // Note: Need the original occupancy_date from the item if possible,
      // otherwise, we might need to infer based on the date_period string format.
      // Assuming `item` still has `occupancy_date` or we can compare `date_period`
      let isCurrentPeriod = false;
      const itemDateStr = item.occupancy_date || date; // Fallback to date_period if occupancy_date isn't selected
      try {
        // Attempt to parse the date string. Adjust parsing based on actual format if needed.
        const itemDate = new Date(itemDateStr);
        const currentStartDate = new Date(startDate);
        const currentEndDate = new Date(endDate);
        // Ensure date comparison is correct
        isCurrentPeriod =
          itemDate >= currentStartDate && itemDate <= currentEndDate;
      } catch (e) {
        console.warn(
          `Could not parse date for time series item: ${itemDateStr}`
        );
        // Fallback logic if parsing fails, might need adjustment
        // Example: Check if date_period formatted as YYYYMM matches current period months
        if (periodType !== "Day") {
          const currentStartYYYYMM = parseInt(
            startDate.substring(0, 4) + startDate.substring(5, 7)
          );
          const currentEndYYYYMM = parseInt(
            endDate.substring(0, 4) + endDate.substring(5, 7)
          );
          const itemYYYYMM = parseInt(date); // Assuming date_period is YYYYMM
          isCurrentPeriod =
            itemYYYYMM >= currentStartYYYYMM && itemYYYYMM <= currentEndYYYYMM;
        }
      }

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
      mapData = currentData.slice(0, limit).map((countryItem) => {
        // Get the full name first
        const fullName = getDisplayName(countryItem.field_name);
        // Get the code from the full name
        const countryCode = getCodeFromFullName(fullName);
        return {
          country: countryCode, // Use the 2-letter code for the map
          value: roundValue(parseFloat(countryItem.total_revenue || "0")),
        };
      });
    }

    // Construct response
    const response: AnalysisResponse = {
      revenue: revenueData,
      roomsSold: roomsSoldData,
      adr: adrData,
      timeSeriesData: processedTimeSeriesData,
    };

    // Add map data if the field is guest_country
    if (field === "guest_country") {
      response.mapData = mapData;
    }

    // --- STORE IN CACHE ---
    const cacheEntry: CacheEntry = {
      data: {
        body: response,
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
