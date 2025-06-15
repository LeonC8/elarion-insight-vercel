import { NextResponse } from "next/server";
import {
  ClickHouseClient,
  createClient,
  ResultSet,
  DataFormat,
} from "@clickhouse/client";
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
    "primaryField",
    "secondaryField",
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
      case "primaryField":
        value = params.get(key) || "booking_channel";
        break;
      case "secondaryField":
        value = params.get(key) || "producer";
        break;
      case "limit":
        value = params.get(key) || "10";
        break;
      default:
        value = params.get(key); // Should not happen with current relevantParams
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

// --- START CLICKHOUSE HELPERS ---

/**
 * Executes a ClickHouse query with a single retry attempt on failure.
 * Uses updated types from @clickhouse/client.
 * @param client The ClickHouse client instance.
 * // Adjust query type hint if necessary based on library usage
 * @param query The query string or configuration object.
 * @param format The desired response format.
 * @param retryDelayMs Delay before retrying in milliseconds.
 * @returns The query response as a ResultSet.
 * @throws Throws an error if the query fails after the retry attempt.
 */
async function executeQueryWithRetry(
  client: ClickHouseClient,
  // Use string for query, assuming simple query strings for now
  query: string,
  format: DataFormat, // Use DataFormat type
  retryDelayMs: number = 500
  // Adjust return type to ResultSet<unknown> or a more specific type if known
): Promise<ResultSet<unknown>> {
  try {
    // First attempt
    return await client.query({
      query: query,
      format: format,
      // query_params can be added here if needed
    });
  } catch (error) {
    console.warn(
      `ClickHouse query failed, retrying in ${retryDelayMs}ms... Error:`,
      error
    );
    // Wait before retrying
    await new Promise((resolve) => setTimeout(resolve, retryDelayMs));
    try {
      // Second attempt
      return await client.query({
        query: query,
        format: format,
        // query_params can be added here if needed
      });
    } catch (retryError) {
      console.error("ClickHouse query failed on retry:", retryError);
      throw retryError; // Re-throw the error after the second failure
    }
  }
}

// --- END CLICKHOUSE HELPERS ---

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
  };
}

// Helper function to round numbers
function roundValue(value: number): number {
  // Round to nearest integer for values >= 100
  // Round to 2 decimal places for smaller values
  return value >= 100 ? Math.round(value) : Number(value.toFixed(2));
}

// Updated Helper function to generate a code from a name, considering the field type
function generateCode(name: string, field: string): string {
  // Use the utility function for guest countries to get the 2-letter code
  if (field === "guest_country") {
    // If the input 'name' is already a code (e.g., during time series processing), return it directly
    // Otherwise, assume it's a full name and get the code.
    // This check might need refinement based on exactly what's passed in different scenarios.
    // A simpler approach might be to consistently pass the full name here.
    // For now, let's assume 'name' is the display name (full country name).
    return getCodeFromFullName(name);
  }
  // Keep original logic for other fields (like producers)
  return name.toString().toLowerCase().replace(/\s+/g, "_");
}

// Interface for raw metric data from consolidated query
interface ConsolidatedMetricItem {
  primary_field: string;
  // field_name will store the raw value (e.g., country code or producer ID string)
  field_name: string;
  current_rooms_sold: number;
  current_room_revenue: number;
  current_total_revenue: number;
  previous_rooms_sold: number;
  previous_room_revenue: number;
  previous_total_revenue: number;
}

// Interface for raw time series data from consolidated query
interface ConsolidatedTimeSeriesItem {
  primary_field: string;
  date_period: string;
  // field_name will store the raw value (e.g., country code or producer ID string)
  field_name: string;
  is_current_period: 1 | 0;
  rooms_sold: number;
  room_revenue: number;
  total_revenue: number;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);

  // --- CHECK CACHE ---
  const cacheKey = `distribution-upgraded:${generateCacheKey(searchParams)}`;
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

  // Parse query parameters
  const businessDateParam =
    searchParams.get("businessDate") || new Date().toISOString().split("T")[0];
  const periodType = searchParams.get("periodType") || "Month"; // Month, Year, Day
  const viewType = searchParams.get("viewType") || "Actual"; // Actual, OTB, Projected
  const comparisonType = searchParams.get("comparison") || "Last year - OTB";

  // Get the primary and secondary grouping fields
  const primaryField = searchParams.get("primaryField") || "booking_channel";
  const secondaryField = searchParams.get("secondaryField") || "producer";

  // Limit for number of items to return
  const limit = parseInt(searchParams.get("limit") || "10");

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
    client = createClient({
      host: process.env.CLICKHOUSE_HOST || "http://34.34.71.156:8123",
      username: process.env.CLICKHOUSE_USER || "default",
      password: process.env.CLICKHOUSE_PASSWORD || "elarion",
    });

    // Add field-specific filters based on field type
    let primaryFieldSpecificFilters = "";
    if (primaryField === "guest_country") {
      primaryFieldSpecificFilters = `
        AND ${primaryField} != 'UNDEFINED'
        AND ${primaryField} != ''
        AND ${primaryField} IS NOT NULL
      `;
    } else {
      // Default filters for other string-like fields
      primaryFieldSpecificFilters = `
            AND ${primaryField} != ''
            AND ${primaryField} IS NOT NULL
        `;
      // Add specific filters for numeric IDs like 'producer' if needed
      if (primaryField === "producer") {
        primaryFieldSpecificFilters += ` AND ${primaryField} != -1`;
      }
    }

    let secondaryFieldSpecificFilters = "";
    // Use toString() only if the secondary field is not already a string type like guest_country
    const secondaryFieldSelector =
      secondaryField === "guest_country"
        ? secondaryField
        : `toString(${secondaryField})`;

    if (secondaryField === "guest_country") {
      secondaryFieldSpecificFilters = `
        AND ${secondaryField} != 'UNDEFINED'
        AND ${secondaryField} != ''
        AND ${secondaryField} IS NOT NULL
      `;
    } else {
      secondaryFieldSpecificFilters = `
        AND ${secondaryFieldSelector} != '' 
        AND ${secondaryField} IS NOT NULL 
      `;
      // Add specific filters for numeric IDs like 'producer' if needed
      if (secondaryField === "producer") {
        secondaryFieldSpecificFilters += ` AND ${secondaryField} != -1`;
      }
    }

    // Rewrite the primary field query using a CTE to avoid the subquery scope issue
    const primaryFieldQuery = `
      WITH PrimaryFieldRevenue AS (
          SELECT
              ${primaryField} as field_value,
              SUM(totalRevenue) as current_period_revenue
          FROM SAND01CN.insights
          WHERE
              toDate(occupancy_date) BETWEEN '${startDate}' AND '${endDate}'
              AND date(scd_valid_from) <= DATE('${businessDateParam}')
              AND DATE('${businessDateParam}') < date(scd_valid_to)
              ${primaryFieldSpecificFilters} // Use specific filters
          GROUP BY field_value
      )
      SELECT field_value
      FROM PrimaryFieldRevenue
      ORDER BY current_period_revenue DESC
      LIMIT 10 -- Still limit to top 10 primary fields
    `;

    // Use the retry helper
    const primaryFieldResultSet = await executeQueryWithRetry(
      client,
      primaryFieldQuery,
      "JSONEachRow" // Use DataFormat enum or string literal
    );

    // Extract only the field_value from the results
    const primaryFieldData = (await primaryFieldResultSet.json()) as {
      field_value: string;
    }[];
    const primaryFieldValues = primaryFieldData.map((item) => item.field_value);

    // Maps for name lookups (for producer names, etc)
    const nameMap = new Map<string, string>();

    // Get producer names ONLY if the secondary field is producer
    if (secondaryField === "producer") {
      const producerQuery = `
        SELECT 
          toString(producer) as producer_id_str, // Select as string for map key consistency
          producer_name
        FROM SAND01CN.producers
        WHERE 
          date(scd_valid_from) <= DATE('${businessDateParam}') 
          AND DATE('${businessDateParam}') < date(scd_valid_to)
          AND producer != -1
      `;

      // Use the retry helper
      const producerResultSet = await executeQueryWithRetry(
        client,
        producerQuery,
        "JSONEachRow"
      );

      const producerData = (await producerResultSet.json()) as any[];

      // Build producer ID string to name mapping
      producerData.forEach((item) => {
        nameMap.set(item.producer_id_str, item.producer_name);
      });
    }

    // CONSOLIDATE ALL METRICS INTO ONE QUERY
    const consolidatedMetricsQuery = `
      SELECT
        ${primaryField} AS primary_field,
        ${secondaryFieldSelector} AS field_name, // Use adjusted selector
        SUM(CASE WHEN is_current THEN sold_rooms ELSE 0 END) AS current_rooms_sold,
        SUM(CASE WHEN is_current THEN roomRevenue ELSE 0 END) AS current_room_revenue,
        SUM(CASE WHEN is_current THEN totalRevenue ELSE 0 END) AS current_total_revenue,
        SUM(CASE WHEN NOT is_current THEN sold_rooms ELSE 0 END) AS previous_rooms_sold,
        SUM(CASE WHEN NOT is_current THEN roomRevenue ELSE 0 END) AS previous_room_revenue,
        SUM(CASE WHEN NOT is_current THEN totalRevenue ELSE 0 END) AS previous_total_revenue
      FROM (
        -- Current Period Data
        SELECT
          ${primaryField}, ${secondaryField}, sold_rooms, roomRevenue, totalRevenue, 1 AS is_current
        FROM SAND01CN.insights
        WHERE
          toDate(occupancy_date) BETWEEN '${startDate}' AND '${endDate}'
          AND date(scd_valid_from) <= DATE('${businessDateParam}')
          AND DATE('${businessDateParam}') < date(scd_valid_to)
          ${primaryFieldSpecificFilters} // Use specific filters
          ${secondaryFieldSpecificFilters} // Use specific filters
          -- Filter only for the top primary fields fetched earlier
          AND ${primaryField} IN (${primaryFieldValues
      .map((v) => (typeof v === "string" ? `'${v}'` : v))
      .join(",")}) // Quote strings

        UNION ALL

        -- Previous Period Data
        SELECT
          ${primaryField}, ${secondaryField}, sold_rooms, roomRevenue, totalRevenue, 0 AS is_current
        FROM SAND01CN.insights
        WHERE
          toDate(occupancy_date) BETWEEN '${prevStartDate}' AND '${prevEndDate}'
          AND date(scd_valid_from) <= DATE('${prevBusinessDateParam}')
          AND DATE('${prevBusinessDateParam}') < date(scd_valid_to)
          ${primaryFieldSpecificFilters} // Use specific filters
          ${secondaryFieldSpecificFilters} // Use specific filters
          -- Filter only for the top primary fields fetched earlier
          AND ${primaryField} IN (${primaryFieldValues
      .map((v) => (typeof v === "string" ? `'${v}'` : v))
      .join(",")}) // Quote strings
      ) AS combined_data
      GROUP BY primary_field, field_name
    `;

    // CONSOLIDATED TIME SERIES QUERY
    const timeScaleClause =
      periodType === "Day"
        ? "toString(toDate(occupancy_date)) AS date_period"
        : "toYYYYMM(occupancy_date) AS date_period";

    const consolidatedTimeSeriesQuery = `
      SELECT
        ${primaryField} AS primary_field,
        ${timeScaleClause},
        ${secondaryFieldSelector} AS field_name, // Use adjusted selector
        CASE
          WHEN toDate(occupancy_date) BETWEEN '${startDate}' AND '${endDate}'
            AND date(scd_valid_from) <= DATE('${businessDateParam}')
            AND DATE('${businessDateParam}') < date(scd_valid_to)
          THEN 1
          ELSE 0
        END AS is_current_period,
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
        ${primaryFieldSpecificFilters} // Use specific filters
        ${secondaryFieldSpecificFilters} // Use specific filters
        -- Filter only for the top primary fields fetched earlier
        AND ${primaryField} IN (${primaryFieldValues
      .map((v) => (typeof v === "string" ? `'${v}'` : v))
      .join(",")}) // Quote strings
      GROUP BY primary_field, date_period, field_name, is_current_period
    `;

    // Execute consolidated queries - removed streaming
    // Assign results correctly using Promise.all
    const [consolidatedMetricsResultSet, timeSeriesResultSet] =
      await Promise.all([
        executeQueryWithRetry(client, consolidatedMetricsQuery, "JSONEachRow"),
        executeQueryWithRetry(
          client,
          consolidatedTimeSeriesQuery,
          "JSONEachRow"
        ),
      ]);

    // Parse JSON data from results
    const consolidatedMetricsData =
      (await consolidatedMetricsResultSet.json()) as ConsolidatedMetricItem[];
    const timeSeriesRawData =
      (await timeSeriesResultSet.json()) as ConsolidatedTimeSeriesItem[];

    // Process the consolidated data
    const groupedData: GroupedData = {};

    // Group the metrics data by primary field first
    const metricsByPrimaryField = new Map<string, ConsolidatedMetricItem[]>();
    consolidatedMetricsData.forEach((item: ConsolidatedMetricItem) => {
      const primaryValue = item.primary_field;
      if (!metricsByPrimaryField.has(primaryValue)) {
        metricsByPrimaryField.set(primaryValue, []);
      }
      metricsByPrimaryField.get(primaryValue)!.push(item);
    });

    // Group the time series data by primary field
    const timeSeriesByPrimaryField = new Map<
      string,
      ConsolidatedTimeSeriesItem[]
    >();
    timeSeriesRawData.forEach((item: ConsolidatedTimeSeriesItem) => {
      const primaryValue = item.primary_field;
      if (!timeSeriesByPrimaryField.has(primaryValue)) {
        timeSeriesByPrimaryField.set(primaryValue, []);
      }
      timeSeriesByPrimaryField.get(primaryValue)!.push(item);
    });

    // Process each primary field's data
    for (const primaryValue of Array.from(metricsByPrimaryField.keys())) {
      const metricsData = metricsByPrimaryField.get(primaryValue) || [];

      // Skip if no data for this primary value in the current period
      if (
        !metricsData.some(
          (item: ConsolidatedMetricItem) =>
            Number(item.current_total_revenue || 0) > 0
        )
      ) {
        continue;
      }

      // Sort by current total revenue and limit to top N items
      metricsData.sort(
        (a: ConsolidatedMetricItem, b: ConsolidatedMetricItem) =>
          Number(b.current_total_revenue || 0) -
          Number(a.current_total_revenue || 0)
      );
      const topNMetricsData = metricsData.slice(0, limit);

      // Updated helper function to get display name, considering the field type
      const getDisplayName = (fieldValue: string, field: string): string => {
        if (field === "guest_country") {
          // Use the utility function to convert code to full name
          return getFullNameFromCode(fieldValue); // Assumes fieldValue is the country code
        }
        if (field === "producer" && nameMap.has(fieldValue)) {
          // Use the pre-fetched producer name map
          return nameMap.get(fieldValue) || `Producer ${fieldValue}`;
        }
        // Fallback for other fields or if lookup fails
        return fieldValue;
      };

      // Process revenue data
      const revenueData: AnalysisData[] = topNMetricsData.map(
        (item: ConsolidatedMetricItem) => {
          // Fix parseFloat error by converting input to string or using Number()
          const value = Number(item.current_total_revenue || 0);
          const prevValue = Number(item.previous_total_revenue || 0);
          const change = value - prevValue;
          // Get display name using the secondary field value and type
          const displayName = getDisplayName(item.field_name, secondaryField);

          return {
            name: displayName,
            value: roundValue(value),
            change: roundValue(change),
            // Generate code using the display name and secondary field type
            code: generateCode(displayName, secondaryField),
          };
        }
      );

      // Process rooms sold data
      const roomsSoldData: AnalysisData[] = topNMetricsData.map(
        (item: ConsolidatedMetricItem) => {
          // Fix parseFloat error by converting input to string or using Number()
          const value = Number(item.current_rooms_sold || 0);
          const prevValue = Number(item.previous_rooms_sold || 0);
          const change = value - prevValue;
          // Get display name using the secondary field value and type
          const displayName = getDisplayName(item.field_name, secondaryField);

          return {
            name: displayName,
            value: roundValue(value),
            change: roundValue(change),
            // Generate code using the display name and secondary field type
            code: generateCode(displayName, secondaryField),
          };
        }
      );

      // Process ADR (Average Daily Rate)
      const adrData: AnalysisData[] = topNMetricsData.map(
        (item: ConsolidatedMetricItem) => {
          // Fix parseFloat error by converting input to string or using Number()
          const currentRoomsSold = Number(item.current_rooms_sold || 0);
          const currentRoomRevenue = Number(item.current_room_revenue || 0);
          const prevRoomsSold = Number(item.previous_rooms_sold || 0);
          const prevRoomRevenue = Number(item.previous_room_revenue || 0);

          const currentAdr =
            currentRoomsSold > 0 ? currentRoomRevenue / currentRoomsSold : 0;
          const prevAdr =
            prevRoomsSold > 0 ? prevRoomRevenue / prevRoomsSold : 0;
          const change = currentAdr - prevAdr;
          // Get display name using the secondary field value and type
          const displayName = getDisplayName(item.field_name, secondaryField);

          return {
            name: displayName,
            value: roundValue(currentAdr),
            change: roundValue(change),
            // Generate code using the display name and secondary field type
            code: generateCode(displayName, secondaryField),
          };
        }
      );

      // Process time series data for this primary value
      const timeSeriesForPrimary =
        timeSeriesByPrimaryField.get(primaryValue) || [];
      const timeSeriesMap = new Map<
        string,
        Map<string, { current: number; previous: number }>
      >();
      const dateSet = new Set<string>();
      // Generate codes for the top N secondary fields based on their display names
      const topNFieldCodes = new Set(
        topNMetricsData.map((item: ConsolidatedMetricItem) =>
          generateCode(
            getDisplayName(item.field_name, secondaryField),
            secondaryField
          )
        )
      );

      timeSeriesForPrimary.forEach((item: ConsolidatedTimeSeriesItem) => {
        const date = item.date_period.toString();
        // Get display name first from the raw field_name (e.g., country code)
        const displayName = getDisplayName(item.field_name, secondaryField);
        // Generate the code (e.g., 2-letter country code) from the display name
        const fieldCode: string = generateCode(displayName, secondaryField);

        // Only process data for fields that are in the top N for the overall period
        if (!topNFieldCodes.has(fieldCode)) {
          return;
        }

        dateSet.add(date);

        if (!timeSeriesMap.has(date)) {
          timeSeriesMap.set(date, new Map());
        }
        const dateMap = timeSeriesMap.get(date)!;

        if (!dateMap.has(fieldCode)) {
          dateMap.set(fieldCode, { current: 0, previous: 0 });
        }
        const entry = dateMap.get(fieldCode)!;
        // Use Number() to ensure correct type
        const revenue = Number(item.total_revenue || 0);
        const isCurrent = item.is_current_period === 1;

        if (isCurrent) {
          entry.current += revenue;
        } else {
          entry.previous += revenue;
        }
      });

      // Convert the maps to the final structure, ensuring all top N fields are present for each date
      const processedTimeSeriesData = Array.from(dateSet)
        .sort() // Sort dates chronologically
        .map((date) => {
          const categoryMap = timeSeriesMap.get(date) || new Map();
          const categories: Record<
            string,
            { current: number; previous: number }
          > = {};

          // Ensure all top N field codes are present, even if they have zero values for this date
          topNFieldCodes.forEach((fieldCode) => {
            // fieldCode is already string here
            const data = categoryMap.get(fieldCode) || {
              current: 0,
              previous: 0,
            };
            // Round the final values here
            categories[fieldCode] = {
              current: roundValue(data.current),
              previous: roundValue(data.previous),
            };
          });

          return {
            date,
            categories,
          };
        });

      // Add to groupedData (using the raw primaryValue as the key)
      // If primaryField is guest_country, primaryValue will be the country code.
      // If you need the full name as the key, you'd use:
      // const primaryDisplayKey = getDisplayName(primaryValue, primaryField);
      // groupedData[primaryDisplayKey] = { ... }
      groupedData[primaryValue] = {
        revenue: revenueData,
        roomsSold: roomsSoldData,
        adr: adrData,
        timeSeriesData: processedTimeSeriesData,
      };
    }

    // --- STORE IN CACHE ---
    const cacheEntry: CacheEntry = {
      data: {
        body: groupedData,
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

    // Return the actual response for this request
    return NextResponse.json(groupedData);
  } catch (error) {
    console.error("Error querying ClickHouse:", error);
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
