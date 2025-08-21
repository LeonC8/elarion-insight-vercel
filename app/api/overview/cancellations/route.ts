import { NextResponse } from "next/server";
import { ClickHouseClient, createClient } from "@clickhouse/client";
import { getClickhouseConnection } from "@/lib/clickhouse";
import {
  calculateDateRanges,
  calculateComparisonDateRanges,
} from "@/lib/dateUtils";

// Type for fluctuation data
type FluctuationData = {
  date: string;
  current: number;
  previous: number;
}[];

// Interface for the API response
export interface CancellationResponse {
  cancelledRooms: {
    value: number;
    percentageChange: number;
    fluctuation: FluctuationData;
  };
  noShowRooms: {
    value: number;
    percentageChange: number;
    fluctuation: FluctuationData;
  };
  revenueLost: {
    value: number;
    percentageChange: number;
    fluctuation: FluctuationData;
  };
}

// Interface for the daily data
interface DailyData {
  occupancy_date: string;
  cancelled_rooms: number;
  no_show_rooms: number;
  totalRevenue_lost: number;
}

// Interface for aggregate query results
interface AggregateQueryResult {
  cancelled_rooms: string;
  no_show_rooms: string;
  totalRevenue_lost: string;
}

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
    // Create ClickHouse client
    client = createClient(getClickhouseConnection());

    // Build the current period query for aggregates
    const currentQuery = `
      SELECT 
        SUM(cancelled_rooms) AS cancelled_rooms,
        SUM(no_show_rooms) AS no_show_rooms,
        SUM(totalRevenue_lost) AS totalRevenue_lost
      FROM JADRANKA.insights
      WHERE 
        toDate(occupancy_date) BETWEEN '${startDate}' AND '${endDate}'
        AND date(scd_valid_from) <= DATE('${businessDateParam}') 
        AND DATE('${businessDateParam}') < date(scd_valid_to)
    `;

    // Build the previous period query for aggregates
    const previousQuery = `
      SELECT 
        SUM(cancelled_rooms) AS cancelled_rooms,
        SUM(no_show_rooms) AS no_show_rooms,
        SUM(totalRevenue_lost) AS totalRevenue_lost
      FROM JADRANKA.insights
      WHERE 
        toDate(occupancy_date) BETWEEN '${prevStartDate}' AND '${prevEndDate}'
        AND date(scd_valid_from) <= DATE('${prevBusinessDateParam}') 
        AND DATE('${prevBusinessDateParam}') < date(scd_valid_to)
    `;

    // New query for daily data for current period
    const currentDailyQuery = `
      SELECT 
        toString(toDate(occupancy_date)) AS occupancy_date,
        SUM(cancelled_rooms) AS cancelled_rooms,
        SUM(no_show_rooms) AS no_show_rooms,
        SUM(totalRevenue_lost) AS totalRevenue_lost
      FROM JADRANKA.insights
      WHERE 
        toDate(occupancy_date) BETWEEN '${startDate}' AND '${endDate}'
        AND date(scd_valid_from) <= DATE('${businessDateParam}') 
        AND DATE('${businessDateParam}') < date(scd_valid_to)
      GROUP BY occupancy_date
      ORDER BY occupancy_date
    `;

    // Query for daily data for previous period
    const previousDailyQuery = `
      SELECT 
        toString(toDate(occupancy_date)) AS occupancy_date,
        SUM(cancelled_rooms) AS cancelled_rooms,
        SUM(no_show_rooms) AS no_show_rooms,
        SUM(totalRevenue_lost) AS totalRevenue_lost
      FROM JADRANKA.insights
      WHERE 
        toDate(occupancy_date) BETWEEN '${prevStartDate}' AND '${prevEndDate}'
        AND date(scd_valid_from) <= DATE('${prevBusinessDateParam}') 
        AND DATE('${prevBusinessDateParam}') < date(scd_valid_to)
      GROUP BY occupancy_date
      ORDER BY occupancy_date
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

    const currentDailyResultSet = await client.query({
      query: currentDailyQuery,
      format: "JSONEachRow",
    });

    const previousDailyResultSet = await client.query({
      query: previousDailyQuery,
      format: "JSONEachRow",
    });

    const currentData =
      (await currentResultSet.json()) as AggregateQueryResult[];
    const previousData =
      (await previousResultSet.json()) as AggregateQueryResult[];
    const currentDailyData =
      (await currentDailyResultSet.json()) as DailyData[];
    const previousDailyData =
      (await previousDailyResultSet.json()) as DailyData[];

    // Extract the first (and only) row from each result
    const current = currentData[0] || {
      cancelled_rooms: "0",
      no_show_rooms: "0",
      totalRevenue_lost: "0",
    };
    const previous = previousData[0] || {
      cancelled_rooms: "0",
      no_show_rooms: "0",
      totalRevenue_lost: "0",
    };

    // Parse numeric values
    const cancelledRooms = parseFloat(current.cancelled_rooms || "0");
    const noShowRooms = parseFloat(current.no_show_rooms || "0");
    const revenueLost = parseFloat(current.totalRevenue_lost || "0");

    const prevCancelledRooms = parseFloat(previous.cancelled_rooms || "0");
    const prevNoShowRooms = parseFloat(previous.no_show_rooms || "0");
    const prevRevenueLost = parseFloat(previous.totalRevenue_lost || "0");

    // Calculate percentage changes
    const calculatePercentageChange = (current: number, previous: number) => {
      if (previous === 0) return 0;
      return ((current - previous) / previous) * 100;
    };

    // Process daily data to create fluctuation arrays for each metric
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
        const monthDay = `${(prevDate.getMonth() + 1)
          .toString()
          .padStart(2, "0")}/${prevDate.getDate().toString().padStart(2, "0")}`;
        previousDataMap.set(monthDay, day);
      });

      // Create the fluctuation data array
      return currentDailyData.map((currentDay) => {
        const date = new Date(currentDay.occupancy_date);

        // Format the date to match what your frontend expects
        // If using month names: const formattedDate = date.toLocaleString('default', { month: 'long' });
        // If using MM/DD:
        const formattedDate = `${(date.getMonth() + 1)
          .toString()
          .padStart(2, "0")}/${date.getDate().toString().padStart(2, "0")}`;

        // Use the month/day as key to look up previous data (ignoring year)
        const previousDay = previousDataMap.get(formattedDate) || {
          occupancy_date: currentDay.occupancy_date,
          cancelled_rooms: 0,
          no_show_rooms: 0,
          totalRevenue_lost: 0,
        };

        return {
          date: formattedDate,
          current: getCurrentValue(currentDay),
          previous: getPreviousValue(previousDay),
        };
      });
    };

    // Create fluctuation data for each metric
    const cancelledRoomsFluctuation = createFluctuationData(
      currentDailyData,
      previousDailyData,
      (day) => day.cancelled_rooms || 0,
      (day) => day.cancelled_rooms || 0
    );

    const noShowRoomsFluctuation = createFluctuationData(
      currentDailyData,
      previousDailyData,
      (day) => day.no_show_rooms || 0,
      (day) => day.no_show_rooms || 0
    );

    const revenueLostFluctuation = createFluctuationData(
      currentDailyData,
      previousDailyData,
      (day) => day.totalRevenue_lost || 0,
      (day) => day.totalRevenue_lost || 0
    );

    const response: CancellationResponse = {
      cancelledRooms: {
        value: cancelledRooms,
        percentageChange: calculatePercentageChange(
          cancelledRooms,
          prevCancelledRooms
        ),
        fluctuation: cancelledRoomsFluctuation,
      },
      noShowRooms: {
        value: noShowRooms,
        percentageChange: calculatePercentageChange(
          noShowRooms,
          prevNoShowRooms
        ),
        fluctuation: noShowRoomsFluctuation,
      },
      revenueLost: {
        value: revenueLost,
        percentageChange: calculatePercentageChange(
          revenueLost,
          prevRevenueLost
        ),
        fluctuation: revenueLostFluctuation,
      },
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("Error querying ClickHouse:", error);
    return NextResponse.json(
      { error: "Failed to fetch cancellation data from ClickHouse" },
      { status: 500 }
    );
  } finally {
    // Close client connection if it exists
    if (client) {
      await client.close();
    }
  }
}
