import { NextResponse } from "next/server";
import { ClickHouseClient, createClient } from "@clickhouse/client";
import { getClickhouseConnection } from "@/lib/clickhouse";
import {
  calculateDateRanges,
  calculateComparisonDateRanges,
} from "@/lib/dateUtils";

// Interface for the response
export interface LengthOfStayByBookingChannelResponse {
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
    // Create ClickHouse client
    client = createClient(getClickhouseConnection());

    const propertyFilter = property ? `AND property = '${property}'` : "";

    // Build the query for current period - now with booking_channel grouping
    const currentQuery = `
      SELECT 
        booking_channel,
        bucket AS stay_range,
        SUM(num) AS count
      FROM JADRANKA.lenght_of_stay_distribution
      WHERE 
        toDate(occupancy_date) BETWEEN '${startDate}' AND '${endDate}'
        AND date(scd_valid_from) <= DATE('${businessDateParam}') 
        AND DATE('${businessDateParam}') < date(scd_valid_to)
        ${propertyFilter}
      GROUP BY booking_channel, bucket
      ORDER BY 
        booking_channel,
        CASE 
          WHEN bucket = '1 night' THEN 1
          WHEN bucket = '2 nights' THEN 2
          WHEN bucket = '3 nights' THEN 3
          WHEN bucket = '4 nights' THEN 4
          WHEN bucket = '5 nights' THEN 5
          WHEN bucket = '6 nights' THEN 6
          WHEN bucket = '7+ nights' THEN 7
          ELSE 8
        END ASC
    `;

    // Build the query for previous period - now with booking_channel grouping
    const previousQuery = `
      SELECT 
        booking_channel,
        bucket AS stay_range,
        SUM(num) AS count
      FROM JADRANKA.lenght_of_stay_distribution
      WHERE 
        toDate(occupancy_date) BETWEEN '${prevStartDate}' AND '${prevEndDate}'
        AND date(scd_valid_from) <= DATE('${prevBusinessDateParam}') 
        AND DATE('${prevBusinessDateParam}') < date(scd_valid_to)
        ${propertyFilter}
      GROUP BY booking_channel, bucket
      ORDER BY 
        booking_channel,
        CASE 
          WHEN bucket = '1 night' THEN 1
          WHEN bucket = '2 nights' THEN 2
          WHEN bucket = '3 nights' THEN 3
          WHEN bucket = '4 nights' THEN 4
          WHEN bucket = '5 nights' THEN 5
          WHEN bucket = '6 nights' THEN 6
          WHEN bucket = '7+ nights' THEN 7
          ELSE 8
        END ASC
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

    const currentData = (await currentResultSet.json()) as any[];
    const previousData = (await previousResultSet.json()) as any[];

    // Create a map for previous data for easier lookup
    const previousDataMap = new Map();
    previousData.forEach((item) => {
      const key = `${item.booking_channel}|${item.stay_range}`;
      previousDataMap.set(key, item);
    });

    // Process data to organize by booking channel
    const dataByBookingChannel: LengthOfStayByBookingChannelResponse["data"] =
      {};

    // First pass: collect all data and identify all unique buckets
    const allBuckets = new Set<string>();

    // Process current data
    currentData.forEach((item) => {
      const bookingChannel = item.booking_channel;
      const stayRange = item.stay_range;
      allBuckets.add(stayRange);

      const key = `${bookingChannel}|${stayRange}`;
      const prevItem = previousDataMap.get(key) || { count: 0 };

      if (!dataByBookingChannel[bookingChannel]) {
        dataByBookingChannel[bookingChannel] = {
          datasets: {
            length_of_stay: {
              title: "Length of Stay",
              data: [],
            },
          },
        };
      }

      // Make sure the dataset exists
      if (!dataByBookingChannel[bookingChannel].datasets.length_of_stay) {
        dataByBookingChannel[bookingChannel].datasets.length_of_stay = {
          title: "Length of Stay",
          data: [],
        };
      }

      dataByBookingChannel[bookingChannel].datasets.length_of_stay.data.push({
        range: stayRange,
        current: parseInt(item.count || "0", 10),
        previous: parseInt(prevItem.count || "0", 10),
      });
    });

    // Add any booking channels and buckets from previous data that might not be in current data
    previousData.forEach((prevItem) => {
      const bookingChannel = prevItem.booking_channel;
      const stayRange = prevItem.stay_range;
      allBuckets.add(stayRange);

      // Check if this booking channel exists in our result
      if (!dataByBookingChannel[bookingChannel]) {
        dataByBookingChannel[bookingChannel] = {
          datasets: {
            length_of_stay: {
              title: "Length of Stay",
              data: [],
            },
          },
        };
      }

      // Make sure the dataset exists
      if (!dataByBookingChannel[bookingChannel].datasets.length_of_stay) {
        dataByBookingChannel[bookingChannel].datasets.length_of_stay = {
          title: "Length of Stay",
          data: [],
        };
      }

      // Check if this stay range exists for this booking channel
      const existingEntry = dataByBookingChannel[
        bookingChannel
      ].datasets.length_of_stay.data.find((item) => item.range === stayRange);

      if (!existingEntry) {
        dataByBookingChannel[bookingChannel].datasets.length_of_stay.data.push({
          range: stayRange,
          current: 0,
          previous: parseInt(prevItem.count || "0", 10),
        });
      }
    });

    // Second pass: ensure all booking channels have entries for all buckets
    Object.keys(dataByBookingChannel).forEach((channel) => {
      if (dataByBookingChannel[channel].datasets.length_of_stay) {
        const existingBuckets = new Set(
          dataByBookingChannel[channel].datasets.length_of_stay.data.map(
            (item) => item.range
          )
        );

        // Add any missing buckets with zero values
        allBuckets.forEach((bucket) => {
          if (!existingBuckets.has(bucket)) {
            dataByBookingChannel[channel].datasets.length_of_stay.data.push({
              range: bucket,
              current: 0,
              previous: 0,
            });
          }
        });
      }
    });

    // Sort data for each booking channel by the correct order of stay lengths
    const stayRangeOrder = {
      "1 night": 1,
      "2 nights": 2,
      "3 nights": 3,
      "4 nights": 4,
      "5 nights": 5,
      "6 nights": 6,
      "7+ nights": 7,
    };

    Object.keys(dataByBookingChannel).forEach((channel) => {
      if (dataByBookingChannel[channel].datasets.length_of_stay) {
        dataByBookingChannel[channel].datasets.length_of_stay.data.sort(
          (a, b) => {
            return (
              (stayRangeOrder[a.range as keyof typeof stayRangeOrder] || 99) -
              (stayRangeOrder[b.range as keyof typeof stayRangeOrder] || 99)
            );
          }
        );
      }
    });

    // Format pretty channel names
    const channelNameMap: Record<string, string> = {
      direct: "Direct Bookings",
      booking_com: "Booking.com",
      expedia: "Expedia",
      gds: "GDS",
      wholesalers: "Wholesalers",
      // Add more mappings as needed
    };

    Object.keys(dataByBookingChannel).forEach((channel) => {
      if (channelNameMap[channel]) {
        dataByBookingChannel[
          channel
        ].datasets.length_of_stay.title = `Length of Stay`;
      }
    });

    // Filter out booking channels with all zeros
    const filteredDataByBookingChannel: LengthOfStayByBookingChannelResponse["data"] =
      {};
    Object.entries(dataByBookingChannel).forEach(([channel, channelData]) => {
      const hasNonZeroValue = channelData.datasets.length_of_stay.data.some(
        (item) => item.current > 0 || item.previous > 0
      );

      if (hasNonZeroValue) {
        filteredDataByBookingChannel[channel] = channelData;
      }
    });

    // Construct response
    const response: LengthOfStayByBookingChannelResponse = {
      data: filteredDataByBookingChannel,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("Error querying ClickHouse:", error);
    return NextResponse.json(
      {
        error:
          "Failed to fetch length of stay distribution data by booking channel from ClickHouse",
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
