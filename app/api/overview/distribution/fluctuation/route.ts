import { NextResponse } from "next/server";
import { ClickHouseClient, createClient } from "@clickhouse/client";
import {
  calculateDateRanges,
  calculateComparisonDateRanges,
} from "@/lib/dateUtils";
import { getFullNameFromCode, getCodeFromFullName } from "@/lib/countryUtils";
import * as fs from "fs";
import * as path from "path";

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
      };
    };
  };
  kpis: {
    [key: string]: CategorySummary[];
  };
  fluctuationData: {
    [key: string]: Record<string, FluctuationDataPoint[]>;
  };
  timeScale: "day" | "month" | "year";
  actualGranularity: "day";
}

// Helper function to round numbers - add null checks and default values
function roundValue(value: number | null | undefined): number {
  if (value === null || value === undefined) return 0;
  return value >= 100 ? Math.round(value) : Number(value.toFixed(2));
}

// Updated Helper function to generate a code from a name
function generateCode(name: string, field: string): string {
  // Use the utility function for guest countries to get the 2-letter code
  if (field === "guest_country") {
    // Use the full name (which is expected as input here) to get the code
    return getCodeFromFullName(name);
  }
  // Keep original logic for other fields (like producers)
  return name.toString().toLowerCase().replace(/\s+/g, "_");
}

// Generate an array of dates for the time range
function generateDateRange(
  startDate: string,
  endDate: string,
  intervalType: "day" | "month" | "year"
): string[] {
  const dates: string[] = [];
  const start = new Date(startDate);
  const end = new Date(endDate);

  let current = new Date(start);

  while (current <= end) {
    let dateStr: string;

    if (intervalType === "day") {
      dateStr = current.toISOString().split("T")[0]; // YYYY-MM-DD
    } else if (intervalType === "month") {
      dateStr = `${current.getFullYear()}-${String(
        current.getMonth() + 1
      ).padStart(2, "0")}-01`; // YYYY-MM-01
    } else {
      dateStr = `${current.getFullYear()}-01-01`; // YYYY-01-01
    }

    if (!dates.includes(dateStr)) {
      dates.push(dateStr);
    }

    // Increment the date based on interval type
    if (intervalType === "day") {
      current.setDate(current.getDate() + 1);
    } else if (intervalType === "month") {
      current.setMonth(current.getMonth() + 1);
    } else {
      current.setFullYear(current.getFullYear() + 1);
    }
  }

  return dates;
}

// Helper function to convert date to index in a range
const datesToIndex = (
  startDate: string,
  endDate: string,
  date: string
): number => {
  const start = new Date(startDate).getTime();
  const end = new Date(endDate).getTime();
  const target = new Date(date).getTime();

  if (target < start || target > end) return -1;

  return Math.floor((target - start) / (24 * 60 * 60 * 1000));
};

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
 * Generates a cache key based on relevant query parameters for the fluctuation route.
 * Ensures the key is consistent regardless of parameter order.
 */
function generateCacheKey(params: URLSearchParams): string {
  const relevantParams = [
    "businessDate",
    "periodType",
    "viewType",
    "comparison",
    "field",
    "limit", // Fluctuation uses limit differently
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
      case "limit":
        value = params.get(key) || "5";
        break; // Default limit for fluctuation
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
  const cacheKey = `distribution-fluctuation:${generateCacheKey(searchParams)}`;
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

  // Get the field to analyze
  const field = searchParams.get("field") || "guest_country";

  // Limit for number of items for fluctuation data only
  const fluctuationLimit = parseInt(searchParams.get("limit") || "5", 10);

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

  // Time scale for fluctuation data
  const timeScale: "day" | "month" | "year" =
    periodType === "Day" ? "day" : periodType === "Year" ? "year" : "month";

  // Initialize client variable
  let client: ClickHouseClient | undefined;

  try {
    // Create ClickHouse client
    client = createClient({
      host: process.env.CLICKHOUSE_HOST,
      username: process.env.CLICKHOUSE_USER,
      password: process.env.CLICKHOUSE_PASSWORD,
    });

    // Determine if we're handling producer data
    const isProducerRoute =
      request.url.includes("producer") || field === "producer";

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

    // Updated helper function to get display name (maps producer ID or country code)
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

    // First, get ALL categories for KPIs (remove the LIMIT clause from summary queries)
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
      format: "JSONEachRow",
    });

    const prevSummaryResultSet = await client.query({
      query: prevSummaryQuery,
      format: "JSONEachRow",
    });

    const summaryData = (await summaryResultSet.json()) as any[];
    const prevSummaryData = (await prevSummaryResultSet.json()) as any[];

    // Create a map for previous data for easier lookup
    const prevSummaryMap = new Map();
    prevSummaryData.forEach((item) => {
      prevSummaryMap.set(item.field_name, item);
    });

    // Create a separate query to get the top categories just for fluctuations
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
      format: "JSONEachRow",
    });

    const topCategoriesData = (await topCategoriesResultSet.json()) as any[];

    // Process top categories for each KPI using the *full* summaryData
    const revenueTopCategories = summaryData.map((item) => {
      const prevItem = prevSummaryMap.get(item.field_name) || {
        total_revenue: 0,
      };

      const value = parseFloat(item.total_revenue || "0");
      const prevValue = parseFloat(prevItem.total_revenue || "0");
      const change = value - prevValue;

      // Get the display name (handles country code conversion)
      const displayName = getDisplayName(item.field_name);

      return {
        name: displayName, // Use the full name
        value: roundValue(value),
        change: roundValue(change),
        // Generate code based on the full display name
        code: generateCode(displayName, field),
      };
    });

    const roomsSoldTopCategories = summaryData.map((item) => {
      const prevItem = prevSummaryMap.get(item.field_name) || {
        rooms_sold: 0,
      };

      const value = parseFloat(item.rooms_sold || "0");
      const prevValue = parseFloat(prevItem.rooms_sold || "0");
      const change = value - prevValue;

      // Get the display name (handles country code conversion)
      const displayName = getDisplayName(item.field_name);

      return {
        name: displayName, // Use the full name
        value: roundValue(value),
        change: roundValue(change),
        // Generate code based on the full display name
        code: generateCode(displayName, field),
      };
    });

    const adrTopCategories = summaryData.map((item) => {
      const prevItem = prevSummaryMap.get(item.field_name) || {
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

      // Get the display name (handles country code conversion)
      const displayName = getDisplayName(item.field_name);

      return {
        name: displayName, // Use the full name
        value: roundValue(currentAdr),
        change: roundValue(change),
        // Generate code based on the full display name
        code: generateCode(displayName, field),
      };
    });

    // Extract the top category *original field values* for the fluctuation query filter
    const topCategoryOriginalValues = topCategoriesData.map(
      (item) => item.field_name
    );
    // Create a map from original value to display name for later use
    const originalValueToDisplayNameMap = new Map<string, string>();
    topCategoriesData.forEach((item) => {
      originalValueToDisplayNameMap.set(
        item.field_name,
        getDisplayName(item.field_name)
      );
    });

    // Define the time granularity for the query - MODIFIED to always use daily granularity
    const timeGroupingClause =
      "toString(toDate(occupancy_date)) AS date_period";

    // Modified query to get daily data points using original field values in IN clause
    const fluctuationQuery = `
      SELECT 
        ${timeGroupingClause},
        ${field} AS field_name,
        SUM(sold_rooms) AS rooms_sold,
        SUM(roomRevenue) AS room_revenue,
        SUM(totalRevenue) AS total_revenue
      FROM SAND01CN.insights
      WHERE 
        toDate(occupancy_date) BETWEEN '${startDate}' AND '${endDate}'
        AND date(scd_valid_from) <= DATE('${businessDateParam}') 
        AND DATE('${businessDateParam}') < date(scd_valid_to)
        ${fieldFilters}
        AND ${field} IN (${topCategoryOriginalValues
      .map((name) =>
        typeof name === "string" ? `'${name.replace(/'/g, "''")}'` : name
      )
      .join(",")})
      GROUP BY date_period, field_name
      ORDER BY date_period, field_name
    `;

    // Query for the previous period also using daily granularity and original field values
    const prevFluctuationQuery = `
      SELECT 
        ${timeGroupingClause},
        ${field} AS field_name,
        SUM(sold_rooms) AS rooms_sold,
        SUM(roomRevenue) AS room_revenue,
        SUM(totalRevenue) AS total_revenue
      FROM SAND01CN.insights
      WHERE 
        toDate(occupancy_date) BETWEEN '${prevStartDate}' AND '${prevEndDate}'
        AND date(scd_valid_from) <= DATE('${prevBusinessDateParam}') 
        AND DATE('${prevBusinessDateParam}') < date(scd_valid_to)
        ${fieldFilters}
        AND ${field} IN (${topCategoryOriginalValues
      .map((name) =>
        typeof name === "string" ? `'${name.replace(/'/g, "''")}'` : name
      )
      .join(",")})
      GROUP BY date_period, field_name
      ORDER BY date_period, field_name
    `;

    // Execute the fluctuation queries
    const fluctuationResultSet = await client.query({
      query: fluctuationQuery,
      format: "JSONEachRow",
    });

    const prevFluctuationResultSet = await client.query({
      query: prevFluctuationQuery,
      format: "JSONEachRow",
    });

    const fluctuationData = (await fluctuationResultSet.json()) as any[];
    const prevFluctuationData =
      (await prevFluctuationResultSet.json()) as any[];

    // Generate the date range for the specified period - ALWAYS use day granularity for data points
    const allDates = generateDateRange(startDate, endDate, "day");

    // Create lookup maps for current and previous period data
    const currentDataMap = new Map();
    const prevDataMap = new Map();

    // Organize current period data - use original field value from DB as intermediate key part
    fluctuationData.forEach((item) => {
      const originalFieldValue = item.field_name; // Use the value directly from DB
      const datePeriod = item.date_period;
      const key = `${originalFieldValue}|${datePeriod}`; // Key uses original value

      currentDataMap.set(key, {
        revenue: parseFloat(item.total_revenue || "0"),
        roomsSold: parseFloat(item.rooms_sold || "0"),
        roomRevenue: parseFloat(item.room_revenue || "0"),
      });
    });

    // Organize previous period data - use original field value from DB as intermediate key part
    prevFluctuationData.forEach((item) => {
      const originalFieldValue = item.field_name; // Use the value directly from DB
      const datePeriod = item.date_period;

      // Map previous period date to current period for comparison
      let mappedDate;
      if (timeScale === "month") {
        // For month, keep month but change year
        const prevDate = new Date(datePeriod);
        const currDate = new Date(prevDate);
        currDate.setFullYear(currDate.getFullYear() + 1);
        mappedDate =
          currDate.toISOString().split("T")[0].substring(0, 7) + "-01";
      } else if (timeScale === "day") {
        // For day, ensure correct mapping (may need to adjust for day of week if necessary)
        const dayDiff =
          (new Date(endDate).getTime() - new Date(startDate).getTime()) /
          (1000 * 60 * 60 * 24);
        const prevDayDiff =
          (new Date(prevEndDate).getTime() -
            new Date(prevStartDate).getTime()) /
          (1000 * 60 * 60 * 24);

        if (dayDiff === prevDayDiff) {
          // If periods are same length, map directly
          const prevIdx = datesToIndex(prevStartDate, prevEndDate, datePeriod);
          if (prevIdx !== -1) {
            const mappedIdx = prevIdx; // Direct mapping index
            const mappedMsec =
              new Date(startDate).getTime() + mappedIdx * 24 * 60 * 60 * 1000;
            mappedDate = new Date(mappedMsec).toISOString().split("T")[0];
          }
        } else {
          // If periods have different lengths, use relative positioning
          const prevDate = new Date(datePeriod);
          const relativePosition =
            (prevDate.getTime() - new Date(prevStartDate).getTime()) /
            (new Date(prevEndDate).getTime() -
              new Date(prevStartDate).getTime());

          const currentSpan =
            new Date(endDate).getTime() - new Date(startDate).getTime();
          const mappedMsec =
            new Date(startDate).getTime() + relativePosition * currentSpan;
          mappedDate = new Date(mappedMsec).toISOString().split("T")[0];
        }
      } else {
        // For year, just add the difference between periods
        const yearDiff =
          new Date(startDate).getFullYear() -
          new Date(prevStartDate).getFullYear();
        const prevYear = parseInt(datePeriod.substring(0, 4));
        mappedDate = `${prevYear + yearDiff}-01-01`;
      }

      if (mappedDate) {
        // Only set if mappedDate is valid
        const key = `${originalFieldValue}|${mappedDate}`; // Key uses original value + mapped date
        prevDataMap.set(key, {
          revenue: parseFloat(item.total_revenue || "0"),
          roomsSold: parseFloat(item.rooms_sold || "0"),
          roomRevenue: parseFloat(item.room_revenue || "0"),
        });
      }
    });

    // Generate complete fluctuation data for each category and KPI - using only topCategoryOriginalValues
    const revenueFluctuationData: Record<string, FluctuationDataPoint[]> = {};
    const roomsSoldFluctuationData: Record<string, FluctuationDataPoint[]> = {};
    const adrFluctuationData: Record<string, FluctuationDataPoint[]> = {};

    // For each *top* category (using original value), create a time series with all dates
    topCategoryOriginalValues.forEach((originalValue) => {
      // Get the display name corresponding to this original value
      const displayName =
        originalValueToDisplayNameMap.get(String(originalValue)) ||
        getDisplayName(originalValue); // Use map or convert directly

      const revenueSeries: FluctuationDataPoint[] = [];
      const roomsSoldSeries: FluctuationDataPoint[] = [];
      const adrSeries: FluctuationDataPoint[] = [];

      allDates.forEach((date) => {
        // Use the original field value to look up data in maps
        const key = `${originalValue}|${date}`;
        const currentData = currentDataMap.get(key) || {
          revenue: 0,
          roomsSold: 0,
          roomRevenue: 0,
        };
        const prevData = prevDataMap.get(key) || {
          revenue: 0,
          roomsSold: 0,
          roomRevenue: 0,
        };

        // Calculate values and change percentages
        const revenueChange =
          prevData.revenue !== 0
            ? ((currentData.revenue - prevData.revenue) / prevData.revenue) *
              100
            : currentData.revenue > 0
            ? Infinity
            : 0;

        const roomsSoldChange =
          prevData.roomsSold !== 0
            ? ((currentData.roomsSold - prevData.roomsSold) /
                prevData.roomsSold) *
              100
            : currentData.roomsSold > 0
            ? Infinity
            : 0;

        // Calculate ADR
        const currentAdr =
          currentData.roomsSold > 0
            ? currentData.roomRevenue / currentData.roomsSold
            : 0;
        const prevAdr =
          prevData.roomsSold > 0
            ? prevData.roomRevenue / prevData.roomsSold
            : 0;
        const adrChange =
          prevAdr !== 0
            ? ((currentAdr - prevAdr) / prevAdr) * 100
            : currentAdr > 0
            ? Infinity
            : 0;

        // Add data points to each series
        revenueSeries.push({
          date,
          value: roundValue(currentData.revenue),
          previousValue: roundValue(prevData.revenue),
          change: isFinite(revenueChange)
            ? roundValue(revenueChange)
            : revenueChange > 0
            ? 9999
            : -9999, // Handle Infinity
        });

        roomsSoldSeries.push({
          date,
          value: roundValue(currentData.roomsSold),
          previousValue: roundValue(prevData.roomsSold),
          change: isFinite(roomsSoldChange)
            ? roundValue(roomsSoldChange)
            : roomsSoldChange > 0
            ? 9999
            : -9999, // Handle Infinity
        });

        adrSeries.push({
          date,
          value: roundValue(currentAdr),
          previousValue: roundValue(prevAdr),
          change: isFinite(adrChange)
            ? roundValue(adrChange)
            : adrChange > 0
            ? 9999
            : -9999, // Handle Infinity
        });
      });

      // Add series for this category to the output data using the *full display name* as the key
      revenueFluctuationData[displayName] = revenueSeries;
      roomsSoldFluctuationData[displayName] = roomsSoldSeries;
      adrFluctuationData[displayName] = adrSeries;
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
          suffix: "",
        },
      },
      roomsSold: {
        name: "Rooms Sold",
        config: {
          supportsPie: true,
          supportsBar: true,
          supportsNormal: true,
          supportsStacked: true,
          prefix: "",
          suffix: "",
        },
      },
      adr: {
        name: "ADR",
        config: {
          supportsPie: false,
          supportsBar: true,
          supportsNormal: true,
          supportsStacked: false,
          prefix: "€",
          suffix: "",
        },
      },
    };

    // Construct the response with the new structure
    // kpis now contain *all* categories with full names
    // fluctuationData contains *top* categories keyed by full name
    const response: FluctuationResponse = {
      metrics: metricConfigs,
      kpis: {
        revenue: revenueTopCategories,
        roomsSold: roomsSoldTopCategories,
        adr: adrTopCategories,
      },
      fluctuationData: {
        revenue: revenueFluctuationData,
        roomsSold: roomsSoldFluctuationData,
        adr: adrFluctuationData,
      },
      timeScale,
      actualGranularity: "day",
    };

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
