import { NextResponse } from "next/server";
import { ClickHouseClient, createClient } from "@clickhouse/client";
import { getClickhouseConnection } from "@/lib/clickhouse";
import {
  calculateDateRanges,
  calculateComparisonDateRanges,
} from "@/lib/dateUtils";

// Interface for the response with the correct structure
export interface ReservationTrendsByRoomTypeResponse {
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
        };
      };
    };
  };
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
    // Create ClickHouse client using centralized config
    const clickhouseConfig = getClickhouseConnection();
    client = createClient(clickhouseConfig);

    // 1. Query for occupancy (stays) by day of week - current period
    const occupancyCurrentQuery = `
      SELECT 
        room_type,
        toDayOfWeek(occupancy_date) AS day_of_week,
        SUM(sold_rooms) AS rooms_sold
      FROM JADRANKA.insights
      WHERE 
        toDate(occupancy_date) BETWEEN '${startDate}' AND '${endDate}'
        AND date(scd_valid_from) <= DATE('${businessDateParam}') 
        AND DATE('${businessDateParam}') < date(scd_valid_to)
      GROUP BY room_type, day_of_week
      ORDER BY room_type, day_of_week ASC
    `;

    // 2. Query for occupancy (stays) by day of week - previous period
    const occupancyPreviousQuery = `
      SELECT 
        room_type,
        toDayOfWeek(occupancy_date) AS day_of_week,
        SUM(sold_rooms) AS rooms_sold
      FROM JADRANKA.insights
      WHERE 
        toDate(occupancy_date) BETWEEN '${prevStartDate}' AND '${prevEndDate}'
        AND date(scd_valid_from) <= DATE('${prevBusinessDateParam}') 
        AND DATE('${prevBusinessDateParam}') < date(scd_valid_to)
      GROUP BY room_type, day_of_week
      ORDER BY room_type, day_of_week ASC
    `;

    // 3. Query for bookings by day of week - current period
    const bookingsCurrentQuery = `
      SELECT 
        room_type,
        toDayOfWeek(booking_date) AS day_of_week,
        SUM(sold_rooms) AS rooms_sold
      FROM JADRANKA.insights
      WHERE 
        toDate(occupancy_date) BETWEEN '${startDate}' AND '${endDate}'
        AND date(scd_valid_from) <= DATE('${businessDateParam}') 
        AND DATE('${businessDateParam}') < date(scd_valid_to)
      GROUP BY room_type, day_of_week
      ORDER BY room_type, day_of_week ASC
    `;

    // 4. Query for bookings by day of week - previous period
    const bookingsPreviousQuery = `
      SELECT 
        room_type,
        toDayOfWeek(booking_date) AS day_of_week,
        SUM(sold_rooms) AS rooms_sold
      FROM JADRANKA.insights
      WHERE 
        toDate(occupancy_date) BETWEEN '${prevStartDate}' AND '${prevEndDate}'
        AND date(scd_valid_from) <= DATE('${prevBusinessDateParam}') 
        AND DATE('${prevBusinessDateParam}') < date(scd_valid_to)
      GROUP BY room_type, day_of_week
      ORDER BY room_type, day_of_week ASC
    `;

    // Execute all four queries in parallel
    const [
      occupancyCurrentResultSet,
      occupancyPreviousResultSet,
      bookingsCurrentResultSet,
      bookingsPreviousResultSet,
    ] = await Promise.all([
      client.query({
        query: occupancyCurrentQuery,
        format: "JSONEachRow",
      }),
      client.query({
        query: occupancyPreviousQuery,
        format: "JSONEachRow",
      }),
      client.query({
        query: bookingsCurrentQuery,
        format: "JSONEachRow",
      }),
      client.query({
        query: bookingsPreviousQuery,
        format: "JSONEachRow",
      }),
    ]);

    // Parse results
    const occupancyCurrentData =
      (await occupancyCurrentResultSet.json()) as any[];
    const occupancyPreviousData =
      (await occupancyPreviousResultSet.json()) as any[];
    const bookingsCurrentData =
      (await bookingsCurrentResultSet.json()) as any[];
    const bookingsPreviousData =
      (await bookingsPreviousResultSet.json()) as any[];

    // Create maps for previous data for easier lookup
    const occupancyPreviousMap = new Map();
    occupancyPreviousData.forEach((item) => {
      const key = `${item.room_type}|${item.day_of_week}`;
      occupancyPreviousMap.set(key, parseInt(item.rooms_sold || "0", 10));
    });

    const bookingsPreviousMap = new Map();
    bookingsPreviousData.forEach((item) => {
      const key = `${item.room_type}|${item.day_of_week}`;
      bookingsPreviousMap.set(key, parseInt(item.rooms_sold || "0", 10));
    });

    // Process data to organize by room type with the CORRECT structure
    const dataByRoomType: ReservationTrendsByRoomTypeResponse["data"] = {};

    // Process occupancy (stays) data
    occupancyCurrentData.forEach((item) => {
      const roomType = item.room_type;
      const dayOfWeek = parseInt(item.day_of_week, 10);
      const dayName = getDayName(dayOfWeek);

      if (!dataByRoomType[roomType]) {
        dataByRoomType[roomType] = {
          datasets: {},
        };
      }

      // Initialize stay_date dataset if it doesn't exist
      if (!dataByRoomType[roomType].datasets.stay_date) {
        dataByRoomType[roomType].datasets.stay_date = {
          title: "Stay Date",
          data: [],
        };
      }

      const key = `${roomType}|${dayOfWeek}`;
      const previousCount = occupancyPreviousMap.get(key) || 0;

      dataByRoomType[roomType].datasets.stay_date.data.push({
        range: dayName,
        current: parseInt(item.rooms_sold || "0", 10),
        previous: previousCount,
      });
    });

    // Process bookings data
    bookingsCurrentData.forEach((item) => {
      const roomType = item.room_type;
      const dayOfWeek = parseInt(item.day_of_week, 10);
      const dayName = getDayName(dayOfWeek);

      if (!dataByRoomType[roomType]) {
        dataByRoomType[roomType] = {
          datasets: {},
        };
      }

      // Initialize booking_date dataset if it doesn't exist
      if (!dataByRoomType[roomType].datasets.booking_date) {
        dataByRoomType[roomType].datasets.booking_date = {
          title: "Booking Date",
          data: [],
        };
      }

      const key = `${roomType}|${dayOfWeek}`;
      const previousCount = bookingsPreviousMap.get(key) || 0;

      dataByRoomType[roomType].datasets.booking_date.data.push({
        range: dayName,
        current: parseInt(item.rooms_sold || "0", 10),
        previous: previousCount,
      });
    });

    // Add any room types and days from previous data that might not be in current data
    // First for occupancy
    occupancyPreviousData.forEach((prevItem) => {
      const roomType = prevItem.room_type;
      const dayOfWeek = parseInt(prevItem.day_of_week, 10);
      const dayName = getDayName(dayOfWeek);

      if (!dataByRoomType[roomType]) {
        dataByRoomType[roomType] = {
          datasets: {},
        };
      }

      // Initialize stay_date dataset if it doesn't exist
      if (!dataByRoomType[roomType].datasets.stay_date) {
        dataByRoomType[roomType].datasets.stay_date = {
          title: "Stay Date",
          data: [],
        };
      }

      const existingEntry = dataByRoomType[
        roomType
      ].datasets.stay_date.data.find((item) => item.range === dayName);

      if (!existingEntry) {
        dataByRoomType[roomType].datasets.stay_date.data.push({
          range: dayName,
          current: 0,
          previous: parseInt(prevItem.rooms_sold || "0", 10),
        });
      }
    });

    // Then for bookings
    bookingsPreviousData.forEach((prevItem) => {
      const roomType = prevItem.room_type;
      const dayOfWeek = parseInt(prevItem.day_of_week, 10);
      const dayName = getDayName(dayOfWeek);

      if (!dataByRoomType[roomType]) {
        dataByRoomType[roomType] = {
          datasets: {},
        };
      }

      // Initialize booking_date dataset if it doesn't exist
      if (!dataByRoomType[roomType].datasets.booking_date) {
        dataByRoomType[roomType].datasets.booking_date = {
          title: "Booking Date",
          data: [],
        };
      }

      const existingEntry = dataByRoomType[
        roomType
      ].datasets.booking_date.data.find((item) => item.range === dayName);

      if (!existingEntry) {
        dataByRoomType[roomType].datasets.booking_date.data.push({
          range: dayName,
          current: 0,
          previous: parseInt(prevItem.rooms_sold || "0", 10),
        });
      }
    });

    // Ensure all room types have all days of the week
    Object.keys(dataByRoomType).forEach((roomType) => {
      // Define all days of week
      const allDays = [
        "Monday",
        "Tuesday",
        "Wednesday",
        "Thursday",
        "Friday",
        "Saturday",
        "Sunday",
      ];

      // Handle stay_date dataset
      if (dataByRoomType[roomType].datasets.stay_date) {
        const existingDays = new Set(
          dataByRoomType[roomType].datasets.stay_date.data.map(
            (item) => item.range
          )
        );

        allDays.forEach((day) => {
          if (!existingDays.has(day)) {
            dataByRoomType[roomType].datasets.stay_date.data.push({
              range: day,
              current: 0,
              previous: 0,
            });
          }
        });
      } else {
        // Create dataset with all days if it doesn't exist
        dataByRoomType[roomType].datasets.stay_date = {
          title: "Stay Date",
          data: allDays.map((day) => ({
            range: day,
            current: 0,
            previous: 0,
          })),
        };
      }

      // Handle booking_date dataset
      if (dataByRoomType[roomType].datasets.booking_date) {
        const existingDays = new Set(
          dataByRoomType[roomType].datasets.booking_date.data.map(
            (item) => item.range
          )
        );

        allDays.forEach((day) => {
          if (!existingDays.has(day)) {
            dataByRoomType[roomType].datasets.booking_date.data.push({
              range: day,
              current: 0,
              previous: 0,
            });
          }
        });
      } else {
        // Create dataset with all days if it doesn't exist
        dataByRoomType[roomType].datasets.booking_date = {
          title: "Booking Date",
          data: allDays.map((day) => ({
            range: day,
            current: 0,
            previous: 0,
          })),
        };
      }
    });

    // Sort data for each room type by day of week
    const dayOrder = {
      Monday: 1,
      Tuesday: 2,
      Wednesday: 3,
      Thursday: 4,
      Friday: 5,
      Saturday: 6,
      Sunday: 7,
    };

    Object.keys(dataByRoomType).forEach((roomType) => {
      // Sort stay_date data
      dataByRoomType[roomType].datasets.stay_date.data.sort((a, b) => {
        return (
          dayOrder[a.range as keyof typeof dayOrder] -
          dayOrder[b.range as keyof typeof dayOrder]
        );
      });

      // Sort booking_date data
      dataByRoomType[roomType].datasets.booking_date.data.sort((a, b) => {
        return (
          dayOrder[a.range as keyof typeof dayOrder] -
          dayOrder[b.range as keyof typeof dayOrder]
        );
      });
    });

    // Filter out room types with all zeros
    const filteredDataByRoomType: ReservationTrendsByRoomTypeResponse["data"] =
      {};
    Object.entries(dataByRoomType).forEach(([roomType, roomTypeData]) => {
      const hasNonZeroStayDate = roomTypeData.datasets.stay_date.data.some(
        (item) => item.current > 0 || item.previous > 0
      );

      const hasNonZeroBookingDate =
        roomTypeData.datasets.booking_date.data.some(
          (item) => item.current > 0 || item.previous > 0
        );

      if (hasNonZeroStayDate || hasNonZeroBookingDate) {
        filteredDataByRoomType[roomType] = roomTypeData;
      }
    });

    // Construct response
    const response: ReservationTrendsByRoomTypeResponse = {
      data: filteredDataByRoomType,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("Error querying ClickHouse:", error);
    return NextResponse.json(
      {
        error:
          "Failed to fetch reservation trends data by room type from ClickHouse",
      },
      { status: 500 }
    );
  } finally {
    // Close client connection if it exists
    if (client) {
      await client.close();
    }
  }
}
