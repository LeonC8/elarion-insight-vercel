import { NextResponse } from "next/server";
import { ClickHouseClient, createClient } from "@clickhouse/client";
import { getClickhouseConnection } from "@/lib/clickhouse";
import {
  calculateDateRanges,
  calculateComparisonDateRanges,
} from "@/lib/dateUtils";
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
 * Generates a cache key based on relevant query parameters for fluctuation route.
 * Ensures the key is consistent regardless of parameter order.
 */
function generateCacheKey(params: URLSearchParams): string {
  const relevantParams = [
    "businessDate",
    "periodType",
    "viewType",
    "comparison",
    "field",
    "limit",
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
        break; // Fluctuation route specific limit
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
  bookingLeadTime?: {
    [key: string]: number;
  };
  lengthOfStay?: {
    [key: string]: number;
  }; // Add new field for length of stay data
}

// Helper function to round numbers - add null checks and default values
function roundValue(value: number | null | undefined): number {
  if (value === null || value === undefined) return 0;
  return value >= 100 ? Math.round(value) : Number(value.toFixed(2));
}

// Helper function to generate a code from a name
function generateCode(name: string, field: string): string {
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

export async function GET(request: Request) {
  // Parse query parameters
  const { searchParams } = new URL(request.url);

  // --- CHECK CACHE ---
  const cacheKey = `fluctuation:${generateCacheKey(searchParams)}`;
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

  // Limit for fluctuation data only
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
    client = createClient(getClickhouseConnection());

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

    // Helper function to get display name (maps producer ID to name if needed)
    const getDisplayName = (fieldValue: any): string => {
      if (isProducerRoute && producerMap.size > 0) {
        const producerId = parseInt(fieldValue);
        return producerMap.get(producerId) || `Producer ${fieldValue}`;
      }
      return fieldValue.toString();
    };

    // First, get ALL categories for KPIs (remove the LIMIT clause)
    const summaryQuery = `
      SELECT 
        ${field} AS field_name,
        SUM(sold_rooms) AS rooms_sold,
        SUM(roomRevenue) AS room_revenue,
        SUM(fbRevenue) AS fb_revenue,
        SUM(otherRevenue) AS other_revenue,
        SUM(totalRevenue) AS total_revenue,
        SUM(cancelled_rooms) AS cancelled_rooms
      FROM JADRANKA.insights
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
      FROM JADRANKA.insights
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

    // Create a separate query to get the top categories for fluctuations
    const topCategoriesQuery = `
      SELECT 
        ${field} AS field_name,
        SUM(totalRevenue) AS total_revenue
      FROM JADRANKA.insights
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

    // Extract the top category names for fluctuation query
    const topCategoryNames = topCategoriesData.map((item) => item.field_name);

    // Define the time granularity for the query - MODIFIED to always use daily granularity
    const timeGroupingClause =
      "toString(toDate(occupancy_date)) AS date_period";

    // Modified query to get daily data points - update to include cancelled_rooms and fbRevenue
    const fluctuationQuery = `
      SELECT 
        ${timeGroupingClause},
        ${field} AS field_name,
        SUM(sold_rooms) AS rooms_sold,
        SUM(roomRevenue) AS room_revenue,
        SUM(totalRevenue) AS total_revenue,
        SUM(cancelled_rooms) AS cancelled_rooms,
        SUM(fbRevenue) AS fb_revenue
      FROM JADRANKA.insights
      WHERE 
        toDate(occupancy_date) BETWEEN '${startDate}' AND '${endDate}'
        AND date(scd_valid_from) <= DATE('${businessDateParam}') 
        AND DATE('${businessDateParam}') < date(scd_valid_to)
        ${fieldFilters}
        AND ${field} IN (${topCategoryNames
      .map((name) => `'${name}'`)
      .join(",")})
      GROUP BY date_period, field_name
      ORDER BY date_period, field_name
    `;

    // Query for the previous period also using daily granularity - update to include cancelled_rooms and fbRevenue
    const prevFluctuationQuery = `
      SELECT 
        ${timeGroupingClause},
        ${field} AS field_name,
        SUM(sold_rooms) AS rooms_sold,
        SUM(roomRevenue) AS room_revenue,
        SUM(totalRevenue) AS total_revenue,
        SUM(cancelled_rooms) AS cancelled_rooms,
        SUM(fbRevenue) AS fb_revenue
      FROM JADRANKA.insights
      WHERE 
        toDate(occupancy_date) BETWEEN '${prevStartDate}' AND '${prevEndDate}'
        AND date(scd_valid_from) <= DATE('${prevBusinessDateParam}') 
        AND DATE('${prevBusinessDateParam}') < date(scd_valid_to)
        ${fieldFilters}
        AND ${field} IN (${topCategoryNames
      .map((name) => `'${name}'`)
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

    // Organize current period data
    fluctuationData.forEach((item) => {
      const category = item.field_name;
      const datePeriod = item.date_period;
      const key = `${category}|${datePeriod}`;

      currentDataMap.set(key, {
        revenue: parseFloat(item.total_revenue || "0"),
        roomsSold: parseFloat(item.rooms_sold || "0"),
        roomRevenue: parseFloat(item.room_revenue || "0"),
        cancelled_rooms: parseFloat(item.cancelled_rooms || "0"),
        fbRevenue: parseFloat(item.fb_revenue || "0"),
      });
    });

    // Organize previous period data
    prevFluctuationData.forEach((item) => {
      const category = item.field_name;
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
            const mappedIdx = (prevIdx / prevDayDiff) * dayDiff;
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

      const key = `${category}|${mappedDate}`;

      prevDataMap.set(key, {
        revenue: parseFloat(item.total_revenue || "0"),
        roomsSold: parseFloat(item.rooms_sold || "0"),
        roomRevenue: parseFloat(item.room_revenue || "0"),
        cancelled_rooms: parseFloat(item.cancelled_rooms || "0"),
        fbRevenue: parseFloat(item.fb_revenue || "0"),
      });
    });

    // Generate complete fluctuation data for each category and KPI
    const revenueFluctuationData: Record<string, FluctuationDataPoint[]> = {};
    const roomsSoldFluctuationData: Record<string, FluctuationDataPoint[]> = {};
    const adrFluctuationData: Record<string, FluctuationDataPoint[]> = {};
    const roomRevenueFluctuationData: Record<string, FluctuationDataPoint[]> =
      {};
    // Add missing fluctuation data objects
    const cancellationsFluctuationData: Record<string, FluctuationDataPoint[]> =
      {};
    const fbRevenueFluctuationData: Record<string, FluctuationDataPoint[]> = {};

    // For each category, create a time series with all dates
    topCategoryNames.forEach((category) => {
      const displayName = getDisplayName(category);
      const revenueSeries: FluctuationDataPoint[] = [];
      const roomsSoldSeries: FluctuationDataPoint[] = [];
      const adrSeries: FluctuationDataPoint[] = [];
      const roomRevenueSeries: FluctuationDataPoint[] = [];
      // Add missing series arrays
      const cancellationsSeries: FluctuationDataPoint[] = [];
      const fbRevenueSeries: FluctuationDataPoint[] = [];

      allDates.forEach((date) => {
        const key = `${category}|${date}`;
        const currentData = currentDataMap.get(key) || {
          revenue: 0,
          roomsSold: 0,
          roomRevenue: 0,
          cancelled_rooms: 0,
          fbRevenue: 0,
        };

        // Find mapped previous date for comparison
        let prevData = {
          revenue: 0,
          roomsSold: 0,
          roomRevenue: 0,
          cancelled_rooms: 0, // Add missing properties
          fbRevenue: 0,
        };

        // For more accurate comparison, look up the equivalent date in the previous period
        if (prevDataMap.has(key)) {
          prevData = prevDataMap.get(key);
        }

        // Calculate values and change percentages
        const revenueChange =
          (prevData.revenue || 0) !== 0
            ? ((currentData.revenue - prevData.revenue) / prevData.revenue) *
              100
            : 0;

        const roomsSoldChange =
          (prevData.roomsSold || 0) !== 0
            ? ((currentData.roomsSold - prevData.roomsSold) /
                prevData.roomsSold) *
              100
            : 0;

        // Calculate ADR
        const currentAdr =
          (currentData.roomsSold || 0) > 0
            ? (currentData.roomRevenue || 0) / currentData.roomsSold
            : 0;
        const prevAdr =
          (prevData.roomsSold || 0) > 0
            ? (prevData.roomRevenue || 0) / prevData.roomsSold
            : 0;
        const adrChange =
          prevAdr !== 0 ? ((currentAdr - prevAdr) / prevAdr) * 100 : 0;

        // Add room revenue change calculation
        const roomRevenueChange =
          (prevData.roomRevenue || 0) !== 0
            ? ((currentData.roomRevenue - prevData.roomRevenue) /
                prevData.roomRevenue) *
              100
            : 0;

        // Add cancellations change calculation
        const cancellationsChange =
          (prevData.cancelled_rooms || 0) !== 0
            ? ((currentData.cancelled_rooms - prevData.cancelled_rooms) /
                prevData.cancelled_rooms) *
              100
            : 0;

        // Add F&B revenue change calculation
        const fbRevenueChange =
          (prevData.fbRevenue || 0) !== 0
            ? ((currentData.fbRevenue - prevData.fbRevenue) /
                prevData.fbRevenue) *
              100
            : 0;

        // Add data points to each series
        revenueSeries.push({
          date,
          value: roundValue(currentData.revenue),
          previousValue: roundValue(prevData.revenue),
          change: roundValue(revenueChange),
        });

        roomsSoldSeries.push({
          date,
          value: roundValue(currentData.roomsSold),
          previousValue: roundValue(prevData.roomsSold),
          change: roundValue(roomsSoldChange),
        });

        adrSeries.push({
          date,
          value: roundValue(currentAdr),
          previousValue: roundValue(prevAdr),
          change: roundValue(adrChange),
        });

        // Add room revenue series instead of cancellations
        roomRevenueSeries.push({
          date,
          value: roundValue(currentData.roomRevenue),
          previousValue: roundValue(prevData.roomRevenue),
          change: roundValue(roomRevenueChange),
        });

        // Add new data points for cancellations and fbRevenue
        cancellationsSeries.push({
          date,
          value: roundValue(currentData.cancelled_rooms),
          previousValue: roundValue(prevData.cancelled_rooms),
          change: roundValue(cancellationsChange),
        });

        fbRevenueSeries.push({
          date,
          value: roundValue(currentData.fbRevenue),
          previousValue: roundValue(prevData.fbRevenue),
          change: roundValue(fbRevenueChange),
        });
      });

      // Add series for this category to the output data using the display name as the key
      revenueFluctuationData[displayName] = revenueSeries;
      roomsSoldFluctuationData[displayName] = roomsSoldSeries;
      adrFluctuationData[displayName] = adrSeries;
      roomRevenueFluctuationData[displayName] = roomRevenueSeries;
      cancellationsFluctuationData[displayName] = cancellationsSeries;
      fbRevenueFluctuationData[displayName] = fbRevenueSeries;
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
      roomRevenue: {
        name: "Room Revenue",
        config: {
          supportsPie: true,
          supportsBar: true,
          supportsNormal: true,
          supportsStacked: true,
          prefix: "€",
          suffix: "",
        },
      },
      cancellations: {
        name: "Cancellations",
        config: {
          supportsPie: true,
          supportsBar: true,
          supportsNormal: true,
          supportsStacked: true,
          prefix: "",
          suffix: "",
        },
      },
      fbRevenue: {
        name: "F&B Revenue",
        config: {
          supportsPie: true,
          supportsBar: true,
          supportsNormal: true,
          supportsStacked: true,
          prefix: "€",
          suffix: "",
        },
      },
      bookingLeadTime: {
        name: "Lead Time",
        config: {
          supportsPie: false,
          supportsBar: true,
          supportsNormal: true,
          supportsStacked: true,
          prefix: "",
          suffix: " days",
        },
      },
      lengthOfStay: {
        name: "Length of Stay",
        config: {
          supportsPie: false,
          supportsBar: true,
          supportsNormal: true,
          supportsStacked: true,
          prefix: "",
          suffix: " nights",
        },
      },
    };

    // Return all KPI records rather than limiting them
    const revenueTopCategories = summaryData.map((item) => {
      const prevItem = prevSummaryMap.get(item.field_name) || {
        total_revenue: 0,
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

    const roomsSoldTopCategories = summaryData.map((item) => {
      const prevItem = prevSummaryMap.get(item.field_name) || {
        rooms_sold: 0,
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

      const displayName = getDisplayName(item.field_name);

      return {
        name: displayName,
        value: roundValue(currentAdr),
        change: roundValue(change),
        code: generateCode(displayName, field),
      };
    });

    // Replace the cancellations top categories with room revenue top categories
    const roomRevenueTopCategories = summaryData.map((item) => {
      const prevItem = prevSummaryMap.get(item.field_name) || {
        room_revenue: 0,
      };

      const value = parseFloat(item.room_revenue || "0");
      const prevValue = parseFloat(prevItem.room_revenue || "0");
      const change = value - prevValue;

      const displayName = getDisplayName(item.field_name);

      return {
        name: displayName,
        value: roundValue(value),
        change: roundValue(change),
        code: generateCode(displayName, field),
      };
    });

    // Add new top categories calculations after the roomRevenueTopCategories:
    const cancellationsTopCategories = summaryData.map((item) => {
      const prevItem = prevSummaryMap.get(item.field_name) || {
        cancelled_rooms: 0,
      };

      const value = parseFloat(item.cancelled_rooms || "0");
      const prevValue = parseFloat(prevItem.cancelled_rooms || "0");
      const change = value - prevValue;

      const displayName = getDisplayName(item.field_name);

      return {
        name: displayName,
        value: roundValue(value),
        change: roundValue(change),
        code: generateCode(displayName, field),
      };
    });

    const fbRevenueTopCategories = summaryData.map((item) => {
      const prevItem = prevSummaryMap.get(item.field_name) || {
        fb_revenue: 0,
      };

      const value = parseFloat(item.fb_revenue || "0");
      const prevValue = parseFloat(prevItem.fb_revenue || "0");
      const change = value - prevValue;

      const displayName = getDisplayName(item.field_name);

      return {
        name: displayName,
        value: roundValue(value),
        change: roundValue(change),
        code: generateCode(displayName, field),
      };
    });

    // Query to fetch booking lead time data - update field
    const bookingLeadTimeQuery = `
      SELECT 
        market_group_code,
        SUM(toFloat64(date_diff)) as total_date_diff,
        SUM(toFloat64(booking_lead_num)) as total_buckets
      FROM SAND01CN.booking_lead_time
      WHERE 
        toDate(occupancy_date) BETWEEN '${startDate}' AND '${endDate}'
        AND date(scd_valid_from) <= DATE('${businessDateParam}') 
        AND DATE('${businessDateParam}') < date(scd_valid_to)
        AND market_group_code != 'UNDEFINED'
        AND market_group_code != ''
        AND market_group_code IS NOT NULL
      GROUP BY market_group_code
      ORDER BY total_date_diff DESC
    `;

    const bookingLeadTimeResultSet = await client.query({
      query: bookingLeadTimeQuery,
      format: "JSONEachRow",
    });

    const bookingLeadTimeData =
      (await bookingLeadTimeResultSet.json()) as any[];

    // Process booking lead time data
    const bookingLeadTimeByChannel: { [key: string]: number } = {};
    const bookingLeadTimeTopCategories: CategorySummary[] = [];

    bookingLeadTimeData.forEach((item) => {
      const channel = item.market_group_code;
      const totalDateDiff = parseFloat(item.total_date_diff || "0");
      const totalBuckets = parseFloat(item.total_buckets || "0");

      // Calculate lead time - average days per booking
      const leadTime = totalBuckets > 0 ? totalDateDiff / totalBuckets : 0;

      // Store calculated lead time by channel
      bookingLeadTimeByChannel[channel] = roundValue(leadTime);

      // Create categories summary for KPIs
      bookingLeadTimeTopCategories.push({
        name: channel,
        value: roundValue(leadTime),
        change: 0, // We don't have comparison data yet for lead time
        code: generateCode(channel, "market_group_code"),
      });
    });

    // Update previous period query for lead time
    const prevBookingLeadTimeQuery = `
      SELECT 
        market_group_code,
        SUM(toFloat64(date_diff)) as total_date_diff,
        SUM(toFloat64(booking_lead_num)) as total_buckets
      FROM SAND01CN.booking_lead_time
      WHERE 
        toDate(occupancy_date) BETWEEN '${prevStartDate}' AND '${prevEndDate}'
        AND date(scd_valid_from) <= DATE('${prevBusinessDateParam}') 
        AND DATE('${prevBusinessDateParam}') < date(scd_valid_to)
        AND market_group_code != 'UNDEFINED'
        AND market_group_code != ''
        AND market_group_code IS NOT NULL
      GROUP BY market_group_code
      ORDER BY total_date_diff DESC
    `;

    const prevBookingLeadTimeResultSet = await client.query({
      query: prevBookingLeadTimeQuery,
      format: "JSONEachRow",
    });

    const prevBookingLeadTimeData =
      (await prevBookingLeadTimeResultSet.json()) as any[];

    // Process previous period booking lead time data
    const prevBookingLeadTimeByChannel: { [key: string]: number } = {};

    prevBookingLeadTimeData.forEach((item) => {
      const channel = item.market_group_code;
      const totalDateDiff = parseFloat(item.total_date_diff || "0");
      const totalBuckets = parseFloat(item.total_buckets || "0");

      // Calculate lead time
      const leadTime = totalBuckets > 0 ? totalDateDiff / totalBuckets : 0;

      // Store calculated lead time
      prevBookingLeadTimeByChannel[channel] = roundValue(leadTime);
    });

    // Update the lead time KPIs with change values
    bookingLeadTimeTopCategories.forEach((category) => {
      const prevValue = prevBookingLeadTimeByChannel[category.name] || 0;
      category.change = roundValue(category.value - prevValue);
    });

    // Sort by value descending
    bookingLeadTimeTopCategories.sort((a, b) => b.value - a.value);

    // Update lead time fluctuation query
    const leadTimeFluctuationQuery = `
      SELECT 
        toString(toDate(occupancy_date)) AS date_period,
        market_group_code,
        SUM(toFloat64(date_diff)) as total_date_diff,
        SUM(toFloat64(booking_lead_num)) as total_buckets
      FROM SAND01CN.booking_lead_time
      WHERE 
        toDate(occupancy_date) BETWEEN '${startDate}' AND '${endDate}'
        AND date(scd_valid_from) <= DATE('${businessDateParam}') 
        AND DATE('${businessDateParam}') < date(scd_valid_to)
        AND market_group_code != 'UNDEFINED'
        AND market_group_code != ''
        AND market_group_code IS NOT NULL
        AND market_group_code IN (${topCategoryNames
          .map((name) => `'${name}'`)
          .join(",")})
      GROUP BY date_period, market_group_code
      ORDER BY date_period, market_group_code
    `;

    const leadTimeFluctuationResultSet = await client.query({
      query: leadTimeFluctuationQuery,
      format: "JSONEachRow",
    });

    const leadTimeFluctuationData =
      (await leadTimeFluctuationResultSet.json()) as any[];

    const prevLeadTimeFluctuationQuery = `
      SELECT 
        toString(toDate(occupancy_date)) AS date_period,
        market_group_code,
        SUM(toFloat64(date_diff)) as total_date_diff,
        SUM(toFloat64(booking_lead_num)) as total_buckets
      FROM SAND01CN.booking_lead_time
      WHERE 
        toDate(occupancy_date) BETWEEN '${prevStartDate}' AND '${prevEndDate}'
        AND date(scd_valid_from) <= DATE('${prevBusinessDateParam}') 
        AND DATE('${prevBusinessDateParam}') < date(scd_valid_to)
        AND market_group_code != 'UNDEFINED'
        AND market_group_code != ''
        AND market_group_code IS NOT NULL
        AND market_group_code IN (${topCategoryNames
          .map((name) => `'${name}'`)
          .join(",")})
      GROUP BY date_period, market_group_code
      ORDER BY date_period, market_group_code
    `;

    const prevLeadTimeFluctuationResultSet = await client.query({
      query: prevLeadTimeFluctuationQuery,
      format: "JSONEachRow",
    });

    const prevLeadTimeFluctuationData =
      (await prevLeadTimeFluctuationResultSet.json()) as any[];

    // Process fluctuation data for lead time
    const currentLeadTimeMap = new Map();
    const prevLeadTimeMap = new Map();

    // Organize current period data
    leadTimeFluctuationData.forEach((item) => {
      const category = item.market_group_code;
      const datePeriod = item.date_period;
      const key = `${category}|${datePeriod}`;

      const totalDateDiff = parseFloat(item.total_date_diff || "0");
      const totalBuckets = parseFloat(item.total_buckets || "0");
      const leadTime = totalBuckets > 0 ? totalDateDiff / totalBuckets : 0;

      currentLeadTimeMap.set(key, leadTime);
    });

    // Organize previous period data
    prevLeadTimeFluctuationData.forEach((item) => {
      const category = item.market_group_code;
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
            const mappedIdx = (prevIdx / prevDayDiff) * dayDiff;
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

      const totalDateDiff = parseFloat(item.total_date_diff || "0");
      const totalBuckets = parseFloat(item.total_buckets || "0");
      const leadTime = totalBuckets > 0 ? totalDateDiff / totalBuckets : 0;

      const key = `${category}|${mappedDate}`;
      prevLeadTimeMap.set(key, leadTime);
    });

    // Generate lead time fluctuation data
    const leadTimeFluctuationSeries: Record<string, FluctuationDataPoint[]> =
      {};

    // For each top category, create a time series with all dates
    topCategoryNames.forEach((category) => {
      const displayName = getDisplayName(category);
      const leadTimeSeries: FluctuationDataPoint[] = [];

      allDates.forEach((date) => {
        const key = `${category}|${date}`;
        const currentValue = currentLeadTimeMap.get(key) || 0;
        const prevValue = prevLeadTimeMap.get(key) || 0;

        // Calculate change percentage
        const change =
          prevValue !== 0 ? ((currentValue - prevValue) / prevValue) * 100 : 0;

        // Add data point to series
        leadTimeSeries.push({
          date,
          value: roundValue(currentValue),
          previousValue: roundValue(prevValue),
          change: roundValue(change),
        });
      });

      // Add series for this category
      leadTimeFluctuationSeries[displayName] = leadTimeSeries;
    });

    // Query to fetch length of stay data - update field
    const lengthOfStayQuery = `
      SELECT 
        market_group_code,
        SUM(toFloat64(date_diff)) as total_date_diff,
        SUM(toFloat64(num)) as total_num
      FROM SAND01CN.lenght_of_stay_distribution
      WHERE 
        toDate(occupancy_date) BETWEEN '${startDate}' AND '${endDate}'
        AND date(scd_valid_from) <= DATE('${businessDateParam}') 
        AND DATE('${businessDateParam}') < date(scd_valid_to)
        AND market_group_code != 'UNDEFINED'
        AND market_group_code != ''
        AND market_group_code IS NOT NULL
      GROUP BY market_group_code
      ORDER BY total_date_diff DESC
    `;

    const lengthOfStayResultSet = await client.query({
      query: lengthOfStayQuery,
      format: "JSONEachRow",
    });

    const lengthOfStayData = (await lengthOfStayResultSet.json()) as any[];

    // Process length of stay data
    const lengthOfStayByChannel: { [key: string]: number } = {};
    const lengthOfStayTopCategories: CategorySummary[] = [];

    lengthOfStayData.forEach((item) => {
      const marketGroup = item.market_group_code;
      const totalDateDiff = parseFloat(item.total_date_diff || "0");
      const totalNum = parseFloat(item.total_num || "0");

      // Calculate length of stay - average days per booking
      const los = totalNum > 0 ? totalDateDiff / totalNum : 0;

      // Store calculated length of stay by channel
      lengthOfStayByChannel[marketGroup] = roundValue(los);

      // Create categories summary for KPIs
      lengthOfStayTopCategories.push({
        name: marketGroup,
        value: roundValue(los),
        change: 0, // Will update with comparison data later
        code: generateCode(marketGroup, "market_group_code"),
      });
    });

    // Update previous period length of stay query
    const prevLengthOfStayQuery = `
      SELECT 
        market_group_code,
        SUM(toFloat64(date_diff)) as total_date_diff,
        SUM(toFloat64(num)) as total_num
      FROM SAND01CN.lenght_of_stay_distribution
      WHERE 
        toDate(occupancy_date) BETWEEN '${prevStartDate}' AND '${prevEndDate}'
        AND date(scd_valid_from) <= DATE('${prevBusinessDateParam}') 
        AND DATE('${prevBusinessDateParam}') < date(scd_valid_to)
        AND market_group_code != 'UNDEFINED'
        AND market_group_code != ''
        AND market_group_code IS NOT NULL
      GROUP BY market_group_code
      ORDER BY total_date_diff DESC
    `;

    const prevLengthOfStayResultSet = await client.query({
      query: prevLengthOfStayQuery,
      format: "JSONEachRow",
    });

    const prevLengthOfStayData =
      (await prevLengthOfStayResultSet.json()) as any[];

    // Process previous period length of stay data
    const prevLengthOfStayByChannel: { [key: string]: number } = {};

    prevLengthOfStayData.forEach((item) => {
      const marketGroup = item.market_group_code;
      const totalDateDiff = parseFloat(item.total_date_diff || "0");
      const totalNum = parseFloat(item.total_num || "0");

      // Calculate length of stay
      const los = totalNum > 0 ? totalDateDiff / totalNum : 0;

      // Store calculated length of stay
      prevLengthOfStayByChannel[marketGroup] = roundValue(los);
    });

    // Update the length of stay KPIs with change values
    lengthOfStayTopCategories.forEach((category) => {
      const prevValue = prevLengthOfStayByChannel[category.name] || 0;
      category.change = roundValue(category.value - prevValue);
    });

    // Sort by value descending
    lengthOfStayTopCategories.sort((a, b) => b.value - a.value);

    // Update length of stay fluctuation query
    const losFluctuationQuery = `
      SELECT 
        toString(toDate(occupancy_date)) AS date_period,
        market_group_code,
        SUM(toFloat64(date_diff)) as total_date_diff,
        SUM(toFloat64(num)) as total_num
      FROM SAND01CN.lenght_of_stay_distribution
      WHERE 
        toDate(occupancy_date) BETWEEN '${startDate}' AND '${endDate}'
        AND date(scd_valid_from) <= DATE('${businessDateParam}') 
        AND DATE('${businessDateParam}') < date(scd_valid_to)
        AND market_group_code != 'UNDEFINED'
        AND market_group_code != ''
        AND market_group_code IS NOT NULL
        AND market_group_code IN (${topCategoryNames
          .map((name) => `'${name}'`)
          .join(",")})
      GROUP BY date_period, market_group_code
      ORDER BY date_period, market_group_code
    `;

    const losFluctuationResultSet = await client.query({
      query: losFluctuationQuery,
      format: "JSONEachRow",
    });

    const losFluctuationData = (await losFluctuationResultSet.json()) as any[];

    const prevLosFluctuationQuery = `
      SELECT 
        toString(toDate(occupancy_date)) AS date_period,
        market_group_code,
        SUM(toFloat64(date_diff)) as total_date_diff,
        SUM(toFloat64(num)) as total_num
      FROM SAND01CN.lenght_of_stay_distribution
      WHERE 
        toDate(occupancy_date) BETWEEN '${prevStartDate}' AND '${prevEndDate}'
        AND date(scd_valid_from) <= DATE('${prevBusinessDateParam}') 
        AND DATE('${prevBusinessDateParam}') < date(scd_valid_to)
        AND market_group_code != 'UNDEFINED'
        AND market_group_code != ''
        AND market_group_code IS NOT NULL
        AND market_group_code IN (${topCategoryNames
          .map((name) => `'${name}'`)
          .join(",")})
      GROUP BY date_period, market_group_code
      ORDER BY date_period, market_group_code
    `;

    const prevLosFluctuationResultSet = await client.query({
      query: prevLosFluctuationQuery,
      format: "JSONEachRow",
    });

    const prevLosFluctuationData =
      (await prevLosFluctuationResultSet.json()) as any[];

    // Process fluctuation data for length of stay
    const currentLosMap = new Map();
    const prevLosMap = new Map();

    // Organize current period data
    losFluctuationData.forEach((item) => {
      const category = item.market_group_code;
      const datePeriod = item.date_period;
      const key = `${category}|${datePeriod}`;

      const totalDateDiff = parseFloat(item.total_date_diff || "0");
      const totalNum = parseFloat(item.total_num || "0");
      const los = totalNum > 0 ? totalDateDiff / totalNum : 0;

      currentLosMap.set(key, los);
    });

    // Organize previous period data using the same date mapping logic
    prevLosFluctuationData.forEach((item) => {
      const category = item.market_group_code;
      const datePeriod = item.date_period;

      // Map previous period date to current period for comparison - same logic as lead time
      let mappedDate;
      if (timeScale === "month") {
        const prevDate = new Date(datePeriod);
        const currDate = new Date(prevDate);
        currDate.setFullYear(currDate.getFullYear() + 1);
        mappedDate =
          currDate.toISOString().split("T")[0].substring(0, 7) + "-01";
      } else if (timeScale === "day") {
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
            const mappedIdx = (prevIdx / prevDayDiff) * dayDiff;
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

      const totalDateDiff = parseFloat(item.total_date_diff || "0");
      const totalNum = parseFloat(item.total_num || "0");
      const los = totalNum > 0 ? totalDateDiff / totalNum : 0;

      const key = `${category}|${mappedDate}`;
      prevLosMap.set(key, los);
    });

    // Generate length of stay fluctuation data
    const losFluctuationSeries: Record<string, FluctuationDataPoint[]> = {};

    // For each top category, create a time series with all dates
    topCategoryNames.forEach((category) => {
      const displayName = getDisplayName(category);
      const losSeries: FluctuationDataPoint[] = [];

      allDates.forEach((date) => {
        const key = `${category}|${date}`;
        const currentValue = currentLosMap.get(key) || 0;
        const prevValue = prevLosMap.get(key) || 0;

        // Calculate change percentage
        const change =
          prevValue !== 0 ? ((currentValue - prevValue) / prevValue) * 100 : 0;

        // Add data point to series
        losSeries.push({
          date,
          value: roundValue(currentValue),
          previousValue: roundValue(prevValue),
          change: roundValue(change),
        });
      });

      // Add series for this category
      losFluctuationSeries[displayName] = losSeries;
    });

    // Construct the response with the new structure
    const response: FluctuationResponse = {
      metrics: metricConfigs,
      kpis: {
        revenue: revenueTopCategories,
        roomsSold: roomsSoldTopCategories,
        adr: adrTopCategories,
        roomRevenue: roomRevenueTopCategories,
        cancellations: cancellationsTopCategories,
        fbRevenue: fbRevenueTopCategories,
        bookingLeadTime: bookingLeadTimeTopCategories,
        lengthOfStay: lengthOfStayTopCategories,
      },
      fluctuationData: {
        revenue: revenueFluctuationData,
        roomsSold: roomsSoldFluctuationData,
        adr: adrFluctuationData,
        roomRevenue: roomRevenueFluctuationData,
        cancellations: cancellationsFluctuationData,
        fbRevenue: fbRevenueFluctuationData,
        bookingLeadTime: leadTimeFluctuationSeries,
        lengthOfStay: losFluctuationSeries,
      },
      timeScale,
      actualGranularity: "day",
      bookingLeadTime: bookingLeadTimeByChannel,
      lengthOfStay: lengthOfStayByChannel,
    };

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
      error: `Failed to fetch ${field} fluctuation data from ClickHouse`,
    };
    return NextResponse.json(errorBody, { status: 500 });
  } finally {
    // Close client connection if it exists
    if (client) {
      await client.close();
    }
  }
}
