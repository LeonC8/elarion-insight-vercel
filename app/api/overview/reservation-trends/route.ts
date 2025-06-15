import { NextResponse } from "next/server";
import { ClickHouseClient, createClient } from "@clickhouse/client";
import {
  calculateDateRanges,
  calculateComparisonDateRanges,
} from "@/lib/dateUtils";

// Interface for day of week data
interface DayOfWeekData {
  day: string;
  current: number;
  previous: number;
}

export interface ReservationTrendsResponse {
  occupancyByDayOfWeek: DayOfWeekData[];
  bookingsByDayOfWeek: DayOfWeekData[];
}

// Helper to get full day name
const getDayName = (dayIndex: number): string => {
  // ClickHouse uses 1 for Monday, 2 for Tuesday, etc.
  const days = [
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
    "Sunday",
  ];
  return days[(dayIndex - 1) % 7]; // Adjust index to be 0-based for our array
};

export async function GET(request: Request) {
  // Parse query parameters
  const { searchParams } = new URL(request.url);
  const businessDateParam =
    searchParams.get("businessDate") || new Date().toISOString().split("T")[0];
  const periodType = searchParams.get("periodType") || "Month"; // Month, Year, Day
  const viewType = searchParams.get("viewType") || "Actual"; // Actual, OTB, Projected
  const comparisonType = searchParams.get("comparison") || "Last year - OTB";

  // Calculate date ranges using utility functions
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
      host: process.env.CLICKHOUSE_HOST,
      username: process.env.CLICKHOUSE_USER,
      password: process.env.CLICKHOUSE_PASSWORD,
    });

    // Build the query for occupancy by day of week (current period)
    const currentOccupancyQuery = `
      SELECT 
        toDayOfWeek(occupancy_date) AS day_of_week,
        SUM(sold_rooms) AS rooms_sold
      FROM SAND01CN.insights
      WHERE 
        toDate(occupancy_date) BETWEEN '${startDate}' AND '${endDate}'
        AND date(scd_valid_from) <= DATE('${businessDateParam}') 
        AND DATE('${businessDateParam}') < date(scd_valid_to)
      GROUP BY day_of_week
      ORDER BY day_of_week
    `;

    // Build the query for occupancy by day of week (previous period)
    const previousOccupancyQuery = `
      SELECT 
        toDayOfWeek(occupancy_date) AS day_of_week,
        SUM(sold_rooms) AS rooms_sold
      FROM SAND01CN.insights
      WHERE 
        toDate(occupancy_date) BETWEEN '${prevStartDate}' AND '${prevEndDate}'
        AND date(scd_valid_from) <= DATE('${prevBusinessDateParam}') 
        AND DATE('${prevBusinessDateParam}') < date(scd_valid_to)
      GROUP BY day_of_week
      ORDER BY day_of_week
    `;

    // Build the query for bookings by day of week (current period)
    const currentBookingsQuery = `
      SELECT 
        toDayOfWeek(booking_date) AS day_of_week,
        SUM(sold_rooms) AS rooms_sold
      FROM SAND01CN.insights
      WHERE 
        toDate(occupancy_date) BETWEEN '${startDate}' AND '${endDate}'
        AND date(scd_valid_from) <= DATE('${businessDateParam}') 
        AND DATE('${businessDateParam}') < date(scd_valid_to)
      GROUP BY day_of_week
      ORDER BY day_of_week
    `;

    // Build the query for bookings by day of week (previous period)
    const previousBookingsQuery = `
      SELECT 
        toDayOfWeek(booking_date) AS day_of_week,
        SUM(sold_rooms) AS rooms_sold
      FROM SAND01CN.insights
      WHERE 
        toDate(occupancy_date) BETWEEN '${prevStartDate}' AND '${prevEndDate}'
        AND date(scd_valid_from) <= DATE('${prevBusinessDateParam}') 
        AND DATE('${prevBusinessDateParam}') < date(scd_valid_to)
      GROUP BY day_of_week
      ORDER BY day_of_week
    `;

    // Execute queries
    const currentOccupancyResultSet = await client.query({
      query: currentOccupancyQuery,
      format: "JSONEachRow",
    });

    const previousOccupancyResultSet = await client.query({
      query: previousOccupancyQuery,
      format: "JSONEachRow",
    });

    const currentBookingsResultSet = await client.query({
      query: currentBookingsQuery,
      format: "JSONEachRow",
    });

    const previousBookingsResultSet = await client.query({
      query: previousBookingsQuery,
      format: "JSONEachRow",
    });

    const currentOccupancyData =
      (await currentOccupancyResultSet.json()) as any[];
    const previousOccupancyData =
      (await previousOccupancyResultSet.json()) as any[];
    const currentBookingsData =
      (await currentBookingsResultSet.json()) as any[];
    const previousBookingsData =
      (await previousBookingsResultSet.json()) as any[];

    // Process occupancy by day of week data
    const previousOccupancyMap = new Map();
    previousOccupancyData.forEach((item) => {
      previousOccupancyMap.set(
        parseInt(item.day_of_week),
        parseInt(item.rooms_sold || "0")
      );
    });

    // Use numbers 1 (Monday) through 7 (Sunday) for days of the week
    const occupancyByDayOfWeek: DayOfWeekData[] = [];
    for (let i = 1; i <= 7; i++) {
      const currentData = currentOccupancyData.find(
        (item) => parseInt(item.day_of_week) === i
      );
      const current = currentData ? parseInt(currentData.rooms_sold || "0") : 0;
      const previous = previousOccupancyMap.get(i) || 0;

      occupancyByDayOfWeek.push({
        day: getDayName(i), // Just pass the day index directly
        current,
        previous,
      });
    }

    // Process bookings by day of week data
    const previousBookingsMap = new Map();
    previousBookingsData.forEach((item) => {
      previousBookingsMap.set(
        parseInt(item.day_of_week),
        parseInt(item.rooms_sold || "0")
      );
    });

    const bookingsByDayOfWeek: DayOfWeekData[] = [];
    for (let i = 1; i <= 7; i++) {
      const currentData = currentBookingsData.find(
        (item) => parseInt(item.day_of_week) === i
      );
      const current = currentData ? parseInt(currentData.rooms_sold || "0") : 0;
      const previous = previousBookingsMap.get(i) || 0;

      bookingsByDayOfWeek.push({
        day: getDayName(i), // Just pass the day index directly
        current,
        previous,
      });
    }

    // Construct response
    const response: ReservationTrendsResponse = {
      occupancyByDayOfWeek,
      bookingsByDayOfWeek,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("Error querying ClickHouse:", error);
    return NextResponse.json(
      { error: "Failed to fetch reservation trends data from ClickHouse" },
      { status: 500 }
    );
  } finally {
    // Close client connection if it exists
    if (client) {
      await client.close();
    }
  }
}
