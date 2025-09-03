import { NextRequest, NextResponse } from "next/server";
import { createClient, ClickHouseClient } from "@clickhouse/client";
import { getClickhouseConnection } from "@/lib/clickhouse";

// Type definition for our response data
export interface PickupStats {
  // Current year stats
  roomsSold: number;
  revenue: number;
  adr: number;
  occupancy: number;
  roomsCancelled: number;
  revenueLost: number;
  roomsAvailable: number;
  revPAR: number;

  // Previous year stats (for variance calculation)
  prevYearRoomsSold: number;
  prevYearRevenue: number;
  prevYearAdr: number;
  prevYearOccupancy: number;
  prevYearRoomsCancelled: number;
  prevYearRevenueLost: number;
  prevYearRoomsAvailable: number;
  prevYearRevPAR: number;

  // Calculated variances
  roomsSoldVariance: number;
  revenueVariance: number;
  adrVariance: number;
  occupancyVariance: number;
  roomsCancelledVariance: number;
  revenueLostVariance: number;
  roomsAvailableVariance: number;
  revPARVariance: number;

  // Context information
  businessDate: string;
  bookingDate: string;
  occupancyDate: string;
}

// Move function declaration outside of block scope
function calculateVariance(current: number, previous: number): number {
  if (previous === 0) return current > 0 ? 100 : 0;
  return ((current - previous) / previous) * 100;
}

// Ensure values are valid numbers
function ensureNumber(value: any): number {
  const num = parseFloat(value);
  return isNaN(num) ? 0 : num;
}

export async function GET(request: NextRequest) {
  // Parse query parameters
  const { searchParams } = new URL(request.url);
  const businessDateParam = searchParams.get("businessDate");
  const bookingDateParam = searchParams.get("bookingDate");
  const occupancyDateParam = searchParams.get("occupancyDate");
  const occupancyMonthParam = searchParams.get("occupancyMonth"); // For year view
  const property = searchParams.get("property");

  // Validate required parameters
  if (
    !businessDateParam ||
    !bookingDateParam ||
    (!occupancyDateParam && !occupancyMonthParam)
  ) {
    return NextResponse.json(
      {
        error:
          "businessDate, bookingDate, and either occupancyDate or occupancyMonth parameters are required",
      },
      { status: 400 }
    );
  }

  // Initialize client variable before try block
  let client: ClickHouseClient | undefined;

  try {
    // Create ClickHouse client using centralized config
    const clickhouseConfig = getClickhouseConnection();
    client = createClient(clickhouseConfig);

    // Parse dates for processing
    // Convert date strings to proper date objects for querying
    const bookingDate = formatDateUTC(new Date(bookingDateParam));

    // Determine if we're dealing with a specific date or a month range
    let occupancyClause = "";
    let occupancyDisplayDate = "";

    if (occupancyDateParam) {
      // Single day view (monthly pickup)
      occupancyClause = `toDate(occupancy_date) = '${formatDateUTC(
        new Date(occupancyDateParam)
      )}'`;
      occupancyDisplayDate = occupancyDateParam;
    } else if (occupancyMonthParam) {
      // Month range view (yearly pickup)
      const [monthName, yearStr] = occupancyMonthParam.split(" ");
      const monthIndex = [
        "Jan",
        "Feb",
        "Mar",
        "Apr",
        "May",
        "Jun",
        "Jul",
        "Aug",
        "Sep",
        "Oct",
        "Nov",
        "Dec",
      ].indexOf(monthName);
      const year = parseInt(yearStr, 10);

      if (monthIndex === -1 || isNaN(year)) {
        return NextResponse.json(
          { error: 'Invalid occupancyMonth format. Expected "MMM YYYY"' },
          { status: 400 }
        );
      }

      const startOfMonth = formatDateUTC(
        new Date(Date.UTC(year, monthIndex, 1))
      );
      const endOfMonth = formatDateUTC(
        new Date(Date.UTC(year, monthIndex + 1, 0))
      ); // Last day of month

      occupancyClause = `toDate(occupancy_date) BETWEEN '${startOfMonth}' AND '${endOfMonth}'`;
      occupancyDisplayDate = occupancyMonthParam;
    }

    // Create previous year dates for comparison
    const bookingDateObj = new Date(bookingDateParam);
    const prevYearBookingDate = formatDateUTC(
      new Date(
        bookingDateObj.getFullYear() - 1,
        bookingDateObj.getMonth(),
        bookingDateObj.getDate()
      )
    );

    const propertyFilter = property ? `AND property = '${property}'` : "";

    // Query for current year data
    // For pickup stats, we want to match the Overview "Day Actual" logic:
    // - Show stats for the occupancy date (stay date)
    // - As of the occupancy date itself (not the business date from pickup table)
    // This matches Overview "Day Actual" behavior
    const snapshotDate =
      occupancyDateParam || occupancyDisplayDate.split(" ")[0]; // Use occupancy date as snapshot date
    const currentYearQuery = `
      WITH insights_data AS (
        SELECT
          SUM(sold_rooms) AS rooms_sold,
          SUM(roomRevenue) AS revenue,
          SUM(cancelled_rooms) AS rooms_cancelled,
          SUM(totalRevenue_lost) AS revenue_lost
        FROM JADRANKA.insights
        WHERE
          ${occupancyClause}
          AND scd_valid_from <= toDateTime('${snapshotDate}')
          AND scd_valid_to > toDateTime('${snapshotDate}')
          ${propertyFilter}
      ),
      room_capacity AS (
        SELECT
          SUM(physicalRooms) AS available_rooms
        FROM JADRANKA.room_type_details
        WHERE 
          date(scd_valid_from) <= DATE('${snapshotDate}') 
          AND DATE('${snapshotDate}') < date(scd_valid_to)
          ${propertyFilter}
      )
      SELECT
        i.rooms_sold,
        i.revenue,
        i.revenue / NULLIF(i.rooms_sold, 0) AS adr,
        (i.rooms_sold / NULLIF(r.available_rooms, 0)) * 100 AS occupancy,
        i.rooms_cancelled,
        i.revenue_lost,
        r.available_rooms,
        i.revenue / NULLIF(r.available_rooms, 0) AS revpar
      FROM insights_data i
      CROSS JOIN room_capacity r
    `;

    // Query for previous year data
    // Keep the same snapshot date (don't shift it back)
    // Only shift the occupancy dates for comparison

    const prevYearQuery = `
      WITH insights_data AS (
        SELECT
          SUM(sold_rooms) AS rooms_sold,
          SUM(roomRevenue) AS revenue,
          SUM(cancelled_rooms) AS rooms_cancelled,
          SUM(totalRevenue_lost) AS revenue_lost
        FROM JADRANKA.insights
        WHERE
          ${occupancyClause.replace(/(\d{4})/g, (match) =>
            (parseInt(match) - 1).toString()
          )}
          AND scd_valid_from <= toDateTime('${snapshotDate}')
          AND scd_valid_to > toDateTime('${snapshotDate}')
          ${propertyFilter}
      ),
      room_capacity AS (
        SELECT
          SUM(physicalRooms) AS available_rooms
        FROM JADRANKA.room_type_details
        WHERE 
          date(scd_valid_from) <= DATE('${snapshotDate}') 
          AND DATE('${snapshotDate}') < date(scd_valid_to)
          ${propertyFilter}
      )
      SELECT
        i.rooms_sold,
        i.revenue,
        i.revenue / NULLIF(i.rooms_sold, 0) AS adr,
        (i.rooms_sold / NULLIF(r.available_rooms, 0)) * 100 AS occupancy,
        i.rooms_cancelled,
        i.revenue_lost,
        r.available_rooms,
        i.revenue / NULLIF(r.available_rooms, 0) AS revpar
      FROM insights_data i
      CROSS JOIN room_capacity r
    `;

    console.log("🔍 DEBUG: Property filter:", property);
    console.log("🔍 DEBUG: businessDateParam:", businessDateParam);
    console.log("🔍 DEBUG: snapshotDate:", snapshotDate);
    console.log("🔍 DEBUG: occupancyDateParam:", occupancyDateParam);
    console.log("🔍 DEBUG: occupancyDisplayDate:", occupancyDisplayDate);

    // Debug room capacity separately
    const debugRoomCapacityQuery = `
      SELECT 
        SUM(physicalRooms) AS available_rooms,
        COUNT(*) AS record_count
      FROM JADRANKA.room_type_details
      WHERE 
        date(scd_valid_from) <= DATE('${snapshotDate}') 
        AND DATE('${snapshotDate}') < date(scd_valid_to)
        ${propertyFilter}
    `;
    console.log("🔍 DEBUG: Room capacity query:", debugRoomCapacityQuery);

    try {
      const debugResult = await client.query({
        query: debugRoomCapacityQuery,
        format: "JSONEachRow",
      });
      const debugData = await debugResult.json();
      console.log("🔍 DEBUG: Room capacity result:", debugData);
    } catch (error) {
      console.error("🔍 DEBUG: Room capacity query failed:", error);
    }

    console.log("Current Year Query:", currentYearQuery);
    console.log("Previous Year Query:", prevYearQuery);

    // Execute both queries
    const currentYearResult = await client.query({
      query: currentYearQuery,
      format: "JSONEachRow",
    });

    const prevYearResult = await client.query({
      query: prevYearQuery,
      format: "JSONEachRow",
    });

    // Parse the results
    const currentYearData = await currentYearResult.json();
    const prevYearData = await prevYearResult.json();

    console.log("🔍 DEBUG: Current year raw data:", currentYearData);
    console.log("🔍 DEBUG: Previous year raw data:", prevYearData);

    // Default values if no data is found
    const defaultStats = {
      rooms_sold: 0,
      revenue: 0,
      adr: 0,
      occupancy: 0,
      rooms_cancelled: 0,
      revenue_lost: 0,
      available_rooms: 0,
      revpar: 0,
    };

    // Get current year metrics or use defaults
    const currentStats = currentYearData[0] || defaultStats;
    const prevStats = prevYearData[0] || defaultStats;

    // Type assertion to handle the property access
    type StatsRecord = typeof defaultStats;
    const typedCurrentStats = currentStats as StatsRecord;
    const typedPrevStats = prevStats as StatsRecord;

    // Format the response
    const stats: PickupStats = {
      // Current year stats (rounded appropriately)
      roomsSold: Math.round(ensureNumber(typedCurrentStats.rooms_sold)),
      revenue: Math.round(ensureNumber(typedCurrentStats.revenue)),
      adr: Math.round(ensureNumber(typedCurrentStats.adr)),
      occupancy: Math.round(ensureNumber(typedCurrentStats.occupancy)),
      roomsCancelled: Math.round(
        ensureNumber(typedCurrentStats.rooms_cancelled)
      ),
      revenueLost: Math.round(ensureNumber(typedCurrentStats.revenue_lost)),
      roomsAvailable: Math.round(
        Math.max(
          0,
          ensureNumber(typedCurrentStats.available_rooms) -
            ensureNumber(typedCurrentStats.rooms_sold)
        )
      ),
      revPAR: Math.round(ensureNumber(typedCurrentStats.revpar)),

      // Previous year stats
      prevYearRoomsSold: Math.round(ensureNumber(typedPrevStats.rooms_sold)),
      prevYearRevenue: Math.round(ensureNumber(typedPrevStats.revenue)),
      prevYearAdr: Math.round(ensureNumber(typedPrevStats.adr)),
      prevYearOccupancy: Math.round(ensureNumber(typedPrevStats.occupancy)),
      prevYearRoomsCancelled: Math.round(
        ensureNumber(typedPrevStats.rooms_cancelled)
      ),
      prevYearRevenueLost: Math.round(
        ensureNumber(typedPrevStats.revenue_lost)
      ),
      prevYearRoomsAvailable: Math.round(
        Math.max(
          0,
          ensureNumber(typedPrevStats.available_rooms) -
            ensureNumber(typedPrevStats.rooms_sold)
        )
      ),
      prevYearRevPAR: Math.round(ensureNumber(typedPrevStats.revpar)),

      // Variances (rounded to nearest integer)
      roomsSoldVariance: Math.round(
        calculateVariance(
          ensureNumber(typedCurrentStats.rooms_sold),
          ensureNumber(typedPrevStats.rooms_sold)
        )
      ),
      revenueVariance: Math.round(
        calculateVariance(
          ensureNumber(typedCurrentStats.revenue),
          ensureNumber(typedPrevStats.revenue)
        )
      ),
      adrVariance: Math.round(
        calculateVariance(
          ensureNumber(typedCurrentStats.adr),
          ensureNumber(typedPrevStats.adr)
        )
      ),
      occupancyVariance: Math.round(
        calculateVariance(
          ensureNumber(typedCurrentStats.occupancy),
          ensureNumber(typedPrevStats.occupancy)
        )
      ),
      roomsCancelledVariance: Math.round(
        calculateVariance(
          ensureNumber(typedCurrentStats.rooms_cancelled),
          ensureNumber(typedPrevStats.rooms_cancelled)
        )
      ),
      revenueLostVariance: Math.round(
        calculateVariance(
          ensureNumber(typedCurrentStats.revenue_lost),
          ensureNumber(typedPrevStats.revenue_lost)
        )
      ),
      roomsAvailableVariance: Math.round(
        calculateVariance(
          ensureNumber(typedCurrentStats.available_rooms),
          ensureNumber(typedPrevStats.available_rooms)
        )
      ),
      revPARVariance: Math.round(
        calculateVariance(
          ensureNumber(typedCurrentStats.revpar),
          ensureNumber(typedPrevStats.revpar)
        )
      ),

      // Context information
      businessDate: businessDateParam,
      bookingDate: bookingDateParam,
      occupancyDate: occupancyDisplayDate,
    };

    return NextResponse.json(stats);
  } catch (error) {
    console.error("Error querying ClickHouse:", error);
    return NextResponse.json(
      { error: "Failed to fetch stats data from ClickHouse" },
      { status: 500 }
    );
  } finally {
    // Close client connection if it exists
    if (client) {
      await client.close();
    }
  }
}

// Helper function to format date as YYYY-MM-DD
function formatDateUTC(date: Date): string {
  const year = date.getFullYear();
  const month = (date.getMonth() + 1).toString().padStart(2, "0");
  const day = date.getDate().toString().padStart(2, "0");
  return `${year}-${month}-${day}`;
}
