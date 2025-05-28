import { NextResponse } from "next/server";
import { ClickHouseClient, createClient } from "@clickhouse/client";
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

// Create an interface for daily data
interface DailyData {
  occupancy_date: string;
  rooms_sold: number;
  room_revenue: number;
  fb_revenue: number;
  other_revenue: number;
  total_revenue: number;
  available_rooms: number;
}

// Add fluctuation data type
type FluctuationData = {
  date: string;
  current: number;
  previous: number;
}[];

// Update the KpiResponse interface to allow null for percentageChange
export interface KpiResponse {
  totalRevenue: {
    value: number;
    percentageChange: number | null;
    fluctuation: FluctuationData;
  };
  roomsSold: {
    value: number;
    percentageChange: number | null;
    fluctuation: FluctuationData;
  };
  adr: {
    value: number;
    percentageChange: number | null;
    fluctuation: FluctuationData;
  };
  occupancyRate: {
    value: number;
    percentageChange: number | null;
    fluctuation: FluctuationData;
  };
  roomRevenue: {
    value: number;
    percentageChange: number | null;
    fluctuation: FluctuationData;
  };
  fbRevenue: {
    value: number;
    percentageChange: number | null;
    fluctuation: FluctuationData;
  };
  otherRevenue: {
    value: number;
    percentageChange: number | null;
    fluctuation: FluctuationData;
  };
  revpar: {
    value: number;
    percentageChange: number | null;
    fluctuation: FluctuationData;
  };
  trevpar: {
    value: number;
    percentageChange: number | null;
    fluctuation: FluctuationData;
  };
  hotelCapacity: number;
}

// Add interface for aggregate query results
interface AggregateQueryResult {
  available_rooms: string;
  rooms_sold: string;
  room_revenue: string;
  fb_revenue: string;
  other_revenue: string;
  total_revenue: string;
}

// Add interface for room availability query results
interface RoomAvailabilityResult {
  available_rooms: string;
}

export async function GET(request: Request) {
  // Parse query parameters
  const { searchParams } = new URL(request.url);

  const businessDateParam =
    searchParams.get("businessDate") || new Date().toISOString().split("T")[0];
  const periodType = searchParams.get("periodType") || "Month"; // Month, Year, Day
  const viewType = searchParams.get("viewType") || "Actual"; // Actual, OTB, Projected
  const comparisonType = searchParams.get("comparison") || "Last year - OTB";

  // Define date ranges based on selected period
  const businessDate = new Date(businessDateParam);
  let startDate: string, endDate: string;

  if (periodType === "Day") {
    // For Day, always use business date
    startDate = businessDateParam;
    endDate = startDate;
  } else if (periodType === "Month") {
    const year = businessDate.getFullYear();
    const month = businessDate.getMonth();

    if (viewType === "Actual") {
      // From beginning of month to business date - add one day to the start date
      const firstDayOfMonth = new Date(year, month, 1);
      firstDayOfMonth.setDate(firstDayOfMonth.getDate() + 1); // Add one day
      startDate = firstDayOfMonth.toISOString().split("T")[0];
      endDate = businessDateParam;
    } else if (viewType === "OTB") {
      // From day after business date to end of month
      const nextDay = new Date(businessDate);
      nextDay.setDate(nextDay.getDate() + 1);
      startDate = nextDay.toISOString().split("T")[0];
      endDate = new Date(year, month + 1, 0).toISOString().split("T")[0];
    } else {
      // Projected
      // Full month - add one day to the start date
      const firstDayOfMonth = new Date(year, month, 1);
      firstDayOfMonth.setDate(firstDayOfMonth.getDate() + 1); // Add one day
      startDate = firstDayOfMonth.toISOString().split("T")[0];
      endDate = new Date(year, month + 1, 0).toISOString().split("T")[0];
    }
  } else {
    // Year
    const year = businessDate.getFullYear();

    if (viewType === "Actual") {
      // From beginning of year to business date - add one day to the start date
      const firstDayOfYear = new Date(year, 0, 1);
      firstDayOfYear.setDate(firstDayOfYear.getDate() + 1); // Add one day
      startDate = firstDayOfYear.toISOString().split("T")[0];
      endDate = businessDateParam;
    } else if (viewType === "OTB") {
      // From day after business date to end of year
      const nextDay = new Date(businessDate);
      nextDay.setDate(nextDay.getDate() + 1);
      startDate = nextDay.toISOString().split("T")[0];
      endDate = new Date(year, 11, 31).toISOString().split("T")[0];
    } else {
      // Projected
      // Full year - add one day to the start date
      const firstDayOfYear = new Date(year, 0, 1);
      firstDayOfYear.setDate(firstDayOfYear.getDate() + 1); // Add one day
      startDate = firstDayOfYear.toISOString().split("T")[0];
      endDate = new Date(year, 11, 31).toISOString().split("T")[0];
    }
  }

  // Extract comparison method and data type from the comparison string
  const useMatchingDayOfWeek = comparisonType.includes("match day of week");
  const useOTBBusinessDate = comparisonType.includes("- OTB");

  // Calculate previous period date range based on comparison type
  let prevStartDate: Date, prevEndDate: Date;

  if (useMatchingDayOfWeek) {
    // Find the same day of the week from previous year
    prevStartDate = findMatchingDayOfWeek(new Date(startDate), -1);
    prevEndDate = findMatchingDayOfWeek(new Date(endDate), -1);
  } else {
    // Simply subtract a year from the dates
    prevStartDate = new Date(startDate);
    prevStartDate.setFullYear(prevStartDate.getFullYear() - 1);
    prevEndDate = new Date(endDate);
    prevEndDate.setFullYear(prevEndDate.getFullYear() - 1);
  }

  // Determine which business date to use for the previous period
  let prevBusinessDateParam: string;
  if (useOTBBusinessDate) {
    // Use the business date from the beginning of the previous period
    prevBusinessDateParam = prevStartDate.toISOString().split("T")[0];
  } else {
    // Use the same business date as the current period
    prevBusinessDateParam = businessDateParam;
  }

  // Initialize client variable before try block
  let client: ClickHouseClient | undefined;

  try {
    // Create ClickHouse client
    client = createClient({
      host: process.env.CLICKHOUSE_HOST || "http://34.34.71.156:8123",
      username: process.env.CLICKHOUSE_USER || "default",
      password: process.env.CLICKHOUSE_PASSWORD || "elarion",
    });

    // Combined query for aggregate data (combines 4 queries into 1)
    const aggregateQuery = `
    SELECT
      'current' AS period,
      (
        SELECT SUM(physicalRooms)
        FROM SAND01CN.room_type_details
        WHERE 
          toDate(occupancy_date) BETWEEN '${startDate}' AND '${endDate}'
          AND date(scd_valid_from) <= DATE('${businessDateParam}') 
          AND DATE('${businessDateParam}') < date(scd_valid_to)
      ) AS available_rooms,
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
      
    UNION ALL
    
    SELECT
      'previous' AS period,
      (
        SELECT SUM(physicalRooms)
        FROM SAND01CN.room_type_details
        WHERE 
          toDate(occupancy_date) BETWEEN '${
            prevStartDate.toISOString().split("T")[0]
          }' AND '${prevEndDate.toISOString().split("T")[0]}'
          AND date(scd_valid_from) <= DATE('${prevBusinessDateParam}') 
          AND DATE('${prevBusinessDateParam}') < date(scd_valid_to)
      ) AS available_rooms,
      SUM(sold_rooms) AS rooms_sold,
      SUM(roomRevenue) AS room_revenue,
      SUM(fbRevenue) AS fb_revenue,
      SUM(otherRevenue) AS other_revenue,
      SUM(totalRevenue) AS total_revenue
    FROM SAND01CN.insights
    WHERE 
      toDate(occupancy_date) BETWEEN '${
        prevStartDate.toISOString().split("T")[0]
      }' AND '${prevEndDate.toISOString().split("T")[0]}'
      AND date(scd_valid_from) <= DATE('${prevBusinessDateParam}') 
      AND DATE('${prevBusinessDateParam}') < date(scd_valid_to)
    `;

    console.log("Aggregate Query:");
    console.log(aggregateQuery);

    // Combined query for daily data (combines 4 queries into 1)
    const dailyQuery = `
    WITH current_rooms AS (
      SELECT 
        toString(toDate(occupancy_date)) AS occupancy_date,
        SUM(physicalRooms) AS available_rooms
      FROM SAND01CN.room_type_details
      WHERE 
        toDate(occupancy_date) BETWEEN '${startDate}' AND '${endDate}'
        AND date(scd_valid_from) <= DATE('${businessDateParam}') 
        AND DATE('${businessDateParam}') < date(scd_valid_to)
      GROUP BY occupancy_date
    ),
    previous_rooms AS (
      SELECT 
        toString(toDate(occupancy_date)) AS occupancy_date,
        SUM(physicalRooms) AS available_rooms
      FROM SAND01CN.room_type_details
      WHERE 
        toDate(occupancy_date) BETWEEN '${
          prevStartDate.toISOString().split("T")[0]
        }' AND '${prevEndDate.toISOString().split("T")[0]}'
        AND date(scd_valid_from) <= DATE('${prevBusinessDateParam}') 
        AND DATE('${prevBusinessDateParam}') < date(scd_valid_to)
      GROUP BY occupancy_date
    ),
    current_daily AS (
      SELECT 
        'current' AS period,
        toString(toDate(occupancy_date)) AS occupancy_date,
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
      GROUP BY occupancy_date
    ),
    previous_daily AS (
      SELECT 
        'previous' AS period,
        toString(toDate(occupancy_date)) AS occupancy_date,
        SUM(sold_rooms) AS rooms_sold,
        SUM(roomRevenue) AS room_revenue,
        SUM(fbRevenue) AS fb_revenue,
        SUM(otherRevenue) AS other_revenue,
        SUM(totalRevenue) AS total_revenue
      FROM SAND01CN.insights
      WHERE 
        toDate(occupancy_date) BETWEEN '${
          prevStartDate.toISOString().split("T")[0]
        }' AND '${prevEndDate.toISOString().split("T")[0]}'
        AND date(scd_valid_from) <= DATE('${prevBusinessDateParam}') 
        AND DATE('${prevBusinessDateParam}') < date(scd_valid_to)
      GROUP BY occupancy_date
    )
    
    SELECT 
      cd.period,
      cd.occupancy_date,
      cd.rooms_sold,
      cd.room_revenue,
      cd.fb_revenue,
      cd.other_revenue,
      cd.total_revenue,
      cr.available_rooms
    FROM current_daily cd
    LEFT JOIN current_rooms cr ON cd.occupancy_date = cr.occupancy_date
    
    UNION ALL
    
    SELECT 
      pd.period,
      pd.occupancy_date,
      pd.rooms_sold,
      pd.room_revenue,
      pd.fb_revenue,
      pd.other_revenue,
      pd.total_revenue,
      pr.available_rooms
    FROM previous_daily pd
    LEFT JOIN previous_rooms pr ON pd.occupancy_date = pr.occupancy_date
    ORDER BY period, occupancy_date
    `;

    // Execute the combined queries
    const aggregateResultSet = await client.query({
      query: aggregateQuery,
      format: "JSONEachRow",
    });

    const dailyResultSet = await client.query({
      query: dailyQuery,
      format: "JSONEachRow",
    });

    // Process results
    const aggregateData = (await aggregateResultSet.json()) as {
      period: string;
      available_rooms: string;
      rooms_sold: string;
      room_revenue: string;
      fb_revenue: string;
      other_revenue: string;
      total_revenue: string;
    }[];

    const dailyData = (await dailyResultSet.json()) as {
      period: string;
      occupancy_date: string;
      rooms_sold: string;
      room_revenue: string;
      fb_revenue: string;
      other_revenue: string;
      total_revenue: string;
      available_rooms: string;
    }[];

    // Separate data by period
    const current = aggregateData.find((d) => d.period === "current") || {
      period: "current",
      available_rooms: "0",
      rooms_sold: "0",
      room_revenue: "0",
      fb_revenue: "0",
      other_revenue: "0",
      total_revenue: "0",
    };

    const previous = aggregateData.find((d) => d.period === "previous") || {
      period: "previous",
      available_rooms: "0",
      rooms_sold: "0",
      room_revenue: "0",
      fb_revenue: "0",
      other_revenue: "0",
      total_revenue: "0",
    };

    const currentDailyDataWithRooms = dailyData
      .filter((d) => d.period === "current")
      .map((d) => ({
        occupancy_date: d.occupancy_date,
        rooms_sold: parseFloat(d.rooms_sold || "0"),
        room_revenue: parseFloat(d.room_revenue || "0"),
        fb_revenue: parseFloat(d.fb_revenue || "0"),
        other_revenue: parseFloat(d.other_revenue || "0"),
        total_revenue: parseFloat(d.total_revenue || "0"),
        available_rooms: parseFloat(d.available_rooms || "0"),
      }));

    const previousDailyDataWithRooms = dailyData
      .filter((d) => d.period === "previous")
      .map((d) => ({
        occupancy_date: d.occupancy_date,
        rooms_sold: parseFloat(d.rooms_sold || "0"),
        room_revenue: parseFloat(d.room_revenue || "0"),
        fb_revenue: parseFloat(d.fb_revenue || "0"),
        other_revenue: parseFloat(d.other_revenue || "0"),
        total_revenue: parseFloat(d.total_revenue || "0"),
        available_rooms: parseFloat(d.available_rooms || "0"),
      }));

    // Calculate derived metrics
    const roomsAvailable = parseFloat(current.available_rooms || "0") || 0;
    const roomsSold = parseFloat(current.rooms_sold || "0") || 0;
    const roomRevenue = parseFloat(current.room_revenue || "0") || 0;
    const fbRevenue = parseFloat(current.fb_revenue || "0") || 0;
    const otherRevenue = parseFloat(current.other_revenue || "0") || 0;
    const totalRevenue = parseFloat(current.total_revenue || "0") || 0;

    const prevRoomsAvailable = parseFloat(previous.available_rooms || "0") || 0;
    const prevRoomsSold = parseFloat(previous.rooms_sold || "0") || 0;
    const prevRoomRevenue = parseFloat(previous.room_revenue || "0") || 0;
    const prevFbRevenue = parseFloat(previous.fb_revenue || "0") || 0;
    const prevOtherRevenue = parseFloat(previous.other_revenue || "0") || 0;
    const prevTotalRevenue = parseFloat(previous.total_revenue || "0") || 0;

    // Calculate ADR (Average Daily Rate)
    const adr = roomsSold > 0 ? roomRevenue / roomsSold : 0;
    const prevAdr = prevRoomsSold > 0 ? prevRoomRevenue / prevRoomsSold : 0;

    // Calculate Occupancy Rate
    // const occupancyRate = roomsAvailable > 0 ? (roomsSold / roomsAvailable) * 100 : 0;
    // const prevOccupancyRate = prevRoomsAvailable > 0 ? (prevRoomsSold / prevRoomsAvailable) * 100 : 0;

    // Calculate RevPAR (Revenue Per Available Room)
    // const revpar = roomsAvailable > 0 ? roomRevenue / roomsAvailable : 0;
    // const prevRevpar = prevRoomsAvailable > 0 ? prevRoomRevenue / prevRoomsAvailable : 0;

    // Calculate TRevPAR (Total Revenue Per Available Room)
    // const trevpar = roomsAvailable > 0 ? totalRevenue / roomsAvailable : 0;
    // const prevTrevpar = prevRoomsAvailable > 0 ? prevTotalRevenue / prevRoomsAvailable : 0;

    const occupancyRate = 75;
    const prevOccupancyRate = 70;
    const revpar = 436.97;
    const prevRevpar = 439.4;
    const trevpar = 439.4;
    const prevTrevpar = 420.4;

    // Calculate percentage changes - UPDATED LOGIC
    const calculatePercentageChange = (
      current: number,
      previous: number
    ): number | null => {
      // Handle non-finite inputs safely
      if (!isFinite(current) || !isFinite(previous)) {
        // Decide on handling: returning null might be safest if data quality is uncertain
        // Or treat non-finite as 0 for calculation? Let's treat as 0 for now.
        current = isFinite(current) ? current : 0;
        previous = isFinite(previous) ? previous : 0;
      }

      if (previous === 0) {
        if (current === 0) {
          return null; // Case: 0 vs 0 - Indicate undefined change with null
        } else {
          return 100; // Case: >0 vs 0 - Represents +100% change
        }
      }
      // From here, previous is non-zero
      if (current === 0) {
        return -100; // Case: 0 vs >0 - Represents -100% change
      }

      // Standard calculation for non-zero previous value
      const change = ((current - previous) / previous) * 100;

      // Clamp change to avoid extreme values (e.g., +/- 1000%)
      const clampedChange = Math.max(-1000, Math.min(1000, change));

      // Avoid returning -0 by explicitly checking for 0
      return clampedChange === 0 ? 0 : clampedChange;
    };

    // Process daily data to create fluctuation arrays for each KPI
    const createFluctuationData = (
      currentDailyData: DailyData[],
      previousDailyData: DailyData[],
      getCurrentValue: (day: DailyData) => number,
      getPreviousValue: (day: DailyData) => number
    ): FluctuationData => {
      // Create a map of previous data by date for easy lookup
      const previousDataMap = new Map<string, DailyData>();
      previousDailyData.forEach((day) => {
        // Extract month and day from the previous year's date (ignore year)
        const prevDate = new Date(day.occupancy_date);
        // Keep the key for lookup as MM/DD to match how previous data is keyed
        const monthDayKey = `${(prevDate.getMonth() + 1)
          .toString()
          .padStart(2, "0")}/${prevDate.getDate().toString().padStart(2, "0")}`;
        previousDataMap.set(monthDayKey, day);
      });

      // Create the fluctuation data array
      return currentDailyData.map((currentDay) => {
        const date = new Date(currentDay.occupancy_date);

        // Format the date as DD/MM for display
        const formattedDate = `${date.getDate().toString().padStart(2, "0")}/${(
          date.getMonth() + 1
        )
          .toString()
          .padStart(2, "0")}`;

        // Create the key for lookup as MM/DD to match the map
        const lookupKey = `${(date.getMonth() + 1)
          .toString()
          .padStart(2, "0")}/${date.getDate().toString().padStart(2, "0")}`;

        // Use the MM/DD key to look up previous data (ignoring year)
        const previousDay = previousDataMap.get(lookupKey) || {
          occupancy_date: currentDay.occupancy_date,
          rooms_sold: 0,
          room_revenue: 0,
          fb_revenue: 0,
          other_revenue: 0,
          total_revenue: 0,
          available_rooms: 0,
        };

        return {
          date: formattedDate, // Use DD/MM format here
          current: getCurrentValue(currentDay),
          previous: getPreviousValue(previousDay),
        };
      });
    };

    // Create fluctuation data for each KPI using the updated daily data with room availability
    const totalRevenueFluctuation = createFluctuationData(
      currentDailyDataWithRooms,
      previousDailyDataWithRooms,
      (day) => day.total_revenue || 0,
      (day) => day.total_revenue || 0
    );

    const roomsSoldFluctuation = createFluctuationData(
      currentDailyDataWithRooms,
      previousDailyDataWithRooms,
      (day) => day.rooms_sold || 0,
      (day) => day.rooms_sold || 0
    );

    const roomRevenueFluctuation = createFluctuationData(
      currentDailyDataWithRooms,
      previousDailyDataWithRooms,
      (day) => day.room_revenue || 0,
      (day) => day.room_revenue || 0
    );

    const fbRevenueFluctuation = createFluctuationData(
      currentDailyDataWithRooms,
      previousDailyDataWithRooms,
      (day) => day.fb_revenue || 0,
      (day) => day.fb_revenue || 0
    );

    const otherRevenueFluctuation = createFluctuationData(
      currentDailyDataWithRooms,
      previousDailyDataWithRooms,
      (day) => day.other_revenue || 0,
      (day) => day.other_revenue || 0
    );

    // ADR fluctuation
    const adrFluctuation = createFluctuationData(
      currentDailyDataWithRooms,
      previousDailyDataWithRooms,
      (day) => (day.rooms_sold > 0 ? day.room_revenue / day.rooms_sold : 0),
      (day) => (day.rooms_sold > 0 ? day.room_revenue / day.rooms_sold : 0)
    );

    // Occupancy rate fluctuation
    const occupancyRateFluctuation = createFluctuationData(
      currentDailyDataWithRooms,
      previousDailyDataWithRooms,
      (day) =>
        day.available_rooms > 0
          ? (day.rooms_sold / day.available_rooms) * 100
          : 0,
      (day) =>
        day.available_rooms > 0
          ? (day.rooms_sold / day.available_rooms) * 100
          : 0
    );

    // RevPAR fluctuation
    const revparFluctuation = createFluctuationData(
      currentDailyDataWithRooms,
      previousDailyDataWithRooms,
      (day) =>
        day.available_rooms > 0 ? day.room_revenue / day.available_rooms : 0,
      (day) =>
        day.available_rooms > 0 ? day.room_revenue / day.available_rooms : 0
    );

    // TRevPAR fluctuation
    const trevparFluctuation = createFluctuationData(
      currentDailyDataWithRooms,
      previousDailyDataWithRooms,
      (day) =>
        day.available_rooms > 0 ? day.total_revenue / day.available_rooms : 0,
      (day) =>
        day.available_rooms > 0 ? day.total_revenue / day.available_rooms : 0
    );

    const response: KpiResponse = {
      totalRevenue: {
        value: totalRevenue,
        percentageChange: calculatePercentageChange(
          totalRevenue,
          prevTotalRevenue
        ),
        fluctuation: totalRevenueFluctuation,
      },
      roomsSold: {
        value: roomsSold,
        percentageChange: calculatePercentageChange(roomsSold, prevRoomsSold),
        fluctuation: roomsSoldFluctuation,
      },
      adr: {
        value: adr,
        percentageChange: calculatePercentageChange(adr, prevAdr),
        fluctuation: adrFluctuation,
      },
      occupancyRate: {
        value: occupancyRate,
        percentageChange: calculatePercentageChange(
          occupancyRate,
          prevOccupancyRate
        ),
        fluctuation: occupancyRateFluctuation,
      },
      roomRevenue: {
        value: roomRevenue,
        percentageChange: calculatePercentageChange(
          roomRevenue,
          prevRoomRevenue
        ),
        fluctuation: roomRevenueFluctuation,
      },
      fbRevenue: {
        value: fbRevenue,
        percentageChange: calculatePercentageChange(fbRevenue, prevFbRevenue),
        fluctuation: fbRevenueFluctuation,
      },
      otherRevenue: {
        value: otherRevenue,
        percentageChange: calculatePercentageChange(
          otherRevenue,
          prevOtherRevenue
        ),
        fluctuation: otherRevenueFluctuation,
      },
      revpar: {
        value: revpar,
        percentageChange: calculatePercentageChange(revpar, prevRevpar),
        fluctuation: revparFluctuation,
      },
      trevpar: {
        value: trevpar,
        percentageChange: calculatePercentageChange(trevpar, prevTrevpar),
        fluctuation: trevparFluctuation,
      },
      hotelCapacity: roomsAvailable,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("Error querying ClickHouse:", error);
    // Do not cache errors
    const errorBody = { error: "Failed to fetch data from ClickHouse" };
    return NextResponse.json(errorBody, { status: 500 });
  } finally {
    // Close client connection if it exists
    if (client) {
      await client.close();
    }
  }
}

// Helper function to find matching day of week from previous year
function findMatchingDayOfWeek(date: Date, yearOffset: number): Date {
  // Create a new date for the same day in the previous/next year
  const targetDate = new Date(date);
  targetDate.setFullYear(targetDate.getFullYear() + yearOffset);

  // Get day of week for both dates
  const originalDayOfWeek = date.getDay();
  const targetDayOfWeek = targetDate.getDay();

  // If days of week match, return the target date
  if (originalDayOfWeek === targetDayOfWeek) {
    return targetDate;
  }

  // Otherwise, adjust the target date to match the day of week
  const dayDifference = originalDayOfWeek - targetDayOfWeek;

  // Add the difference (might be negative, which is fine for setDate)
  targetDate.setDate(targetDate.getDate() + dayDifference);

  return targetDate;
}
