import { NextResponse } from "next/server";
import { ClickHouseClient, createClient } from "@clickhouse/client";
import { getClickhouseConnection } from "@/lib/clickhouse";
import {
  calculateDateRanges,
  calculateComparisonDateRanges,
} from "@/lib/dateUtils";

// Interface for the response with the correct structure
export interface ReservationTrendsByBookingChannelResponse {
  data: {
    [bookingChannel: string]: {
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
  const property = searchParams.get("property");

  // Custom date range parameters
  const customStartDate = searchParams.get("customStartDate") || undefined;
  const customEndDate = searchParams.get("customEndDate") || undefined;

  // Calculate date ranges
  const { startDate, endDate } = calculateDateRanges(
    businessDateParam,
    periodType,
    viewType,
    customStartDate,
    customEndDate
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

    const propertyFilter = property ? `AND property = '${property}'` : "";

    // 1. Query for occupancy (stays) by day of week - current period
    const occupancyCurrentQuery = `
      SELECT 
        booking_channel,
        toDayOfWeek(occupancy_date) AS day_of_week,
        SUM(sold_rooms) AS rooms_sold
      FROM JADRANKA.insights
      WHERE 
        toDate(occupancy_date) BETWEEN '${startDate}' AND '${endDate}'
        AND date(scd_valid_from) <= DATE('${businessDateParam}') 
        AND DATE('${businessDateParam}') < date(scd_valid_to)
        ${propertyFilter}
      GROUP BY booking_channel, day_of_week
      ORDER BY booking_channel, day_of_week ASC
    `;

    // 2. Query for occupancy (stays) by day of week - previous period
    const occupancyPreviousQuery = `
      SELECT 
        booking_channel,
        toDayOfWeek(occupancy_date) AS day_of_week,
        SUM(sold_rooms) AS rooms_sold
      FROM JADRANKA.insights
      WHERE 
        toDate(occupancy_date) BETWEEN '${prevStartDate}' AND '${prevEndDate}'
        AND date(scd_valid_from) <= DATE('${prevBusinessDateParam}') 
        AND DATE('${prevBusinessDateParam}') < date(scd_valid_to)
        ${propertyFilter}
      GROUP BY booking_channel, day_of_week
      ORDER BY booking_channel, day_of_week ASC
    `;

    // 3. Query for bookings by day of week - current period
    const bookingsCurrentQuery = `
      SELECT 
        booking_channel,
        toDayOfWeek(booking_date) AS day_of_week,
        SUM(sold_rooms) AS rooms_sold
      FROM JADRANKA.insights
      WHERE 
        toDate(occupancy_date) BETWEEN '${startDate}' AND '${endDate}'
        AND date(scd_valid_from) <= DATE('${businessDateParam}') 
        AND DATE('${businessDateParam}') < date(scd_valid_to)
        ${propertyFilter}
      GROUP BY booking_channel, day_of_week
      ORDER BY booking_channel, day_of_week ASC
    `;

    // 4. Query for bookings by day of week - previous period
    const bookingsPreviousQuery = `
      SELECT 
        booking_channel,
        toDayOfWeek(booking_date) AS day_of_week,
        SUM(sold_rooms) AS rooms_sold
      FROM JADRANKA.insights
      WHERE 
        toDate(occupancy_date) BETWEEN '${prevStartDate}' AND '${prevEndDate}'
        AND date(scd_valid_from) <= DATE('${prevBusinessDateParam}') 
        AND DATE('${prevBusinessDateParam}') < date(scd_valid_to)
        ${propertyFilter}
      GROUP BY booking_channel, day_of_week
      ORDER BY booking_channel, day_of_week ASC
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
      const key = `${item.booking_channel}|${item.day_of_week}`;
      occupancyPreviousMap.set(key, parseInt(item.rooms_sold || "0", 10));
    });

    const bookingsPreviousMap = new Map();
    bookingsPreviousData.forEach((item) => {
      const key = `${item.booking_channel}|${item.day_of_week}`;
      bookingsPreviousMap.set(key, parseInt(item.rooms_sold || "0", 10));
    });

    // Process data to organize by booking channel with the CORRECT structure
    const dataByBookingChannel: ReservationTrendsByBookingChannelResponse["data"] =
      {};

    // Process occupancy (stays) data
    occupancyCurrentData.forEach((item) => {
      const bookingChannel = item.booking_channel;
      const dayOfWeek = parseInt(item.day_of_week, 10);
      const dayName = getDayName(dayOfWeek);

      if (!dataByBookingChannel[bookingChannel]) {
        dataByBookingChannel[bookingChannel] = {
          datasets: {},
        };
      }

      // Initialize stay_date dataset if it doesn't exist
      if (!dataByBookingChannel[bookingChannel].datasets.stay_date) {
        dataByBookingChannel[bookingChannel].datasets.stay_date = {
          title: "Stay Date",
          data: [],
        };
      }

      const key = `${bookingChannel}|${dayOfWeek}`;
      const previousCount = occupancyPreviousMap.get(key) || 0;

      dataByBookingChannel[bookingChannel].datasets.stay_date.data.push({
        range: dayName,
        current: parseInt(item.rooms_sold || "0", 10),
        previous: previousCount,
      });
    });

    // Process bookings data
    bookingsCurrentData.forEach((item) => {
      const bookingChannel = item.booking_channel;
      const dayOfWeek = parseInt(item.day_of_week, 10);
      const dayName = getDayName(dayOfWeek);

      if (!dataByBookingChannel[bookingChannel]) {
        dataByBookingChannel[bookingChannel] = {
          datasets: {},
        };
      }

      // Initialize booking_date dataset if it doesn't exist
      if (!dataByBookingChannel[bookingChannel].datasets.booking_date) {
        dataByBookingChannel[bookingChannel].datasets.booking_date = {
          title: "Booking Date",
          data: [],
        };
      }

      const key = `${bookingChannel}|${dayOfWeek}`;
      const previousCount = bookingsPreviousMap.get(key) || 0;

      dataByBookingChannel[bookingChannel].datasets.booking_date.data.push({
        range: dayName,
        current: parseInt(item.rooms_sold || "0", 10),
        previous: previousCount,
      });
    });

    // Add any booking channels and days from previous data that might not be in current data
    // First for occupancy
    occupancyPreviousData.forEach((prevItem) => {
      const bookingChannel = prevItem.booking_channel;
      const dayOfWeek = parseInt(prevItem.day_of_week, 10);
      const dayName = getDayName(dayOfWeek);

      if (!dataByBookingChannel[bookingChannel]) {
        dataByBookingChannel[bookingChannel] = {
          datasets: {},
        };
      }

      // Initialize stay_date dataset if it doesn't exist
      if (!dataByBookingChannel[bookingChannel].datasets.stay_date) {
        dataByBookingChannel[bookingChannel].datasets.stay_date = {
          title: "Stay Date",
          data: [],
        };
      }

      const existingEntry = dataByBookingChannel[
        bookingChannel
      ].datasets.stay_date.data.find((item) => item.range === dayName);

      if (!existingEntry) {
        dataByBookingChannel[bookingChannel].datasets.stay_date.data.push({
          range: dayName,
          current: 0,
          previous: parseInt(prevItem.rooms_sold || "0", 10),
        });
      }
    });

    // Then for bookings
    bookingsPreviousData.forEach((prevItem) => {
      const bookingChannel = prevItem.booking_channel;
      const dayOfWeek = parseInt(prevItem.day_of_week, 10);
      const dayName = getDayName(dayOfWeek);

      if (!dataByBookingChannel[bookingChannel]) {
        dataByBookingChannel[bookingChannel] = {
          datasets: {},
        };
      }

      // Initialize booking_date dataset if it doesn't exist
      if (!dataByBookingChannel[bookingChannel].datasets.booking_date) {
        dataByBookingChannel[bookingChannel].datasets.booking_date = {
          title: "Booking Date",
          data: [],
        };
      }

      const existingEntry = dataByBookingChannel[
        bookingChannel
      ].datasets.booking_date.data.find((item) => item.range === dayName);

      if (!existingEntry) {
        dataByBookingChannel[bookingChannel].datasets.booking_date.data.push({
          range: dayName,
          current: 0,
          previous: parseInt(prevItem.rooms_sold || "0", 10),
        });
      }
    });

    // Ensure all booking channels have all days of the week
    Object.keys(dataByBookingChannel).forEach((channel) => {
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
      if (dataByBookingChannel[channel].datasets.stay_date) {
        const existingDays = new Set(
          dataByBookingChannel[channel].datasets.stay_date.data.map(
            (item) => item.range
          )
        );

        allDays.forEach((day) => {
          if (!existingDays.has(day)) {
            dataByBookingChannel[channel].datasets.stay_date.data.push({
              range: day,
              current: 0,
              previous: 0,
            });
          }
        });
      } else {
        // Create dataset with all days if it doesn't exist
        dataByBookingChannel[channel].datasets.stay_date = {
          title: "Stay Date",
          data: allDays.map((day) => ({
            range: day,
            current: 0,
            previous: 0,
          })),
        };
      }

      // Handle booking_date dataset
      if (dataByBookingChannel[channel].datasets.booking_date) {
        const existingDays = new Set(
          dataByBookingChannel[channel].datasets.booking_date.data.map(
            (item) => item.range
          )
        );

        allDays.forEach((day) => {
          if (!existingDays.has(day)) {
            dataByBookingChannel[channel].datasets.booking_date.data.push({
              range: day,
              current: 0,
              previous: 0,
            });
          }
        });
      } else {
        // Create dataset with all days if it doesn't exist
        dataByBookingChannel[channel].datasets.booking_date = {
          title: "Booking Date",
          data: allDays.map((day) => ({
            range: day,
            current: 0,
            previous: 0,
          })),
        };
      }
    });

    // Sort data for each booking channel by day of week
    const dayOrder = {
      Monday: 1,
      Tuesday: 2,
      Wednesday: 3,
      Thursday: 4,
      Friday: 5,
      Saturday: 6,
      Sunday: 7,
    };

    Object.keys(dataByBookingChannel).forEach((channel) => {
      // Sort stay_date data
      dataByBookingChannel[channel].datasets.stay_date.data.sort((a, b) => {
        return (
          dayOrder[a.range as keyof typeof dayOrder] -
          dayOrder[b.range as keyof typeof dayOrder]
        );
      });

      // Sort booking_date data
      dataByBookingChannel[channel].datasets.booking_date.data.sort((a, b) => {
        return (
          dayOrder[a.range as keyof typeof dayOrder] -
          dayOrder[b.range as keyof typeof dayOrder]
        );
      });
    });

    // Filter out booking channels with all zeros
    const filteredDataByBookingChannel: ReservationTrendsByBookingChannelResponse["data"] =
      {};
    Object.entries(dataByBookingChannel).forEach(([channel, channelData]) => {
      const hasNonZeroStayDate = channelData.datasets.stay_date.data.some(
        (item) => item.current > 0 || item.previous > 0
      );

      const hasNonZeroBookingDate = channelData.datasets.booking_date.data.some(
        (item) => item.current > 0 || item.previous > 0
      );

      if (hasNonZeroStayDate || hasNonZeroBookingDate) {
        filteredDataByBookingChannel[channel] = channelData;
      }
    });

    // Construct response
    const response: ReservationTrendsByBookingChannelResponse = {
      data: filteredDataByBookingChannel,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("Error querying ClickHouse:", error);
    return NextResponse.json(
      {
        error:
          "Failed to fetch reservation trends data by booking channel from ClickHouse",
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
