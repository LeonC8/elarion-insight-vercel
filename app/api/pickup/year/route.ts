import { NextResponse } from 'next/server';
import { ClickHouseClient, createClient } from '@clickhouse/client'
import { getClickhouseConnection } from '@/lib/clickhouse';;

// Type definition for our response data
export interface PickupMetric {
  soldRooms: number | null;
  revenue: number | null;
  adr: number | null;
}

export interface YearlyPickupResponse {
  bookingDate: string;
  pickupData: {
    [stayMonth: string]: PickupMetric;
  };
}

// Helper to get month names for UTC formatting
const MONTH_NAMES_SHORT = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export async function GET(request: Request) {
  // Parse query parameters
  const { searchParams } = new URL(request.url);
  const businessDateParam = searchParams.get('businessDate');

  if (!businessDateParam) {
    return NextResponse.json({ error: 'businessDate parameter is required' }, { status: 400 });
  }

  // Use businessDate to define the context (year, month, and upper limit for booking dates)
  // Parse the date string and treat components as UTC
  const [yearStr, monthStr, dayStr] = businessDateParam.split('-').map(Number);
  const businessDateUTC = new Date(Date.UTC(yearStr, monthStr - 1, dayStr)); // Month is 0-indexed

  const year = businessDateUTC.getUTCFullYear();
  const month = businessDateUTC.getUTCMonth(); // 0-indexed

  // Format dates for query (using UTC dates)
  const monthStart = formatDateUTC(new Date(Date.UTC(year, month, 1))); // Start of the *business date's* month
  const yearEnd = formatDateUTC(new Date(Date.UTC(year, 11, 31))); // End of the *business date's* year
  const businessDateStr = formatDateUTC(businessDateUTC); // Use the formatted UTC date string

  // Initialize client variable before try block
  let client: ClickHouseClient | undefined;

  try {
    // Create ClickHouse client
    client = createClient({
       host: getClickhouseConnection().host,
       username: getClickhouseConnection().username,
       password: getClickhouseConnection().password
     });

    // Modified query to match the month view's calculation logic
    // This ensures consistency between monthly and yearly views
    const query = `
      WITH 
        -- First get the data at the daily level (same as month view)
        daily_data AS (
          SELECT 
            toDate(booking_date) AS booking_date,
            toDate(occupancy_date) AS occupancy_date,
            toStartOfMonth(occupancy_date) AS occupancy_month,
            sold_rooms,
            roomRevenue AS room_revenue
          FROM SAND01CN.insights
          WHERE
            toDate(booking_date) BETWEEN '${monthStart}' AND '${businessDateStr}'
            AND toDate(occupancy_date) BETWEEN '${monthStart}' AND '${yearEnd}'
        )
      -- Then aggregate by month (ensuring we use the same base data as the month view)
      SELECT
        booking_date,
        occupancy_month,
        SUM(sold_rooms) as sold_rooms,
        SUM(room_revenue) AS room_revenue
      FROM daily_data
      GROUP BY booking_date, occupancy_month
      ORDER BY booking_date, occupancy_month
    `;

    console.log("Year Pickup Query:", query);

    const resultSet = await client.query({
      query,
      format: 'JSONEachRow'
    });



    const data = await resultSet.json();

    console.log("Year Pickup Data:", data);

    // Use businessDateUTC for generating rows and columns
    const bookingDates = generateDatesInMonthUTC(businessDateUTC); // Rows: Dates in the business month up to business date
    const occupancyMonths = generateMonthsInYearUTC(businessDateUTC); // Columns: Months from business month to end of year

    const result: YearlyPickupResponse[] = bookingDates.map(bookingDateString => {
      const pickupData: { [key: string]: PickupMetric } = {};

      // Initialize all occupancy months with null values
      occupancyMonths.forEach(occupancyMonth => {
        pickupData[occupancyMonth] = { soldRooms: null, revenue: null, adr: null };
      });

      // Find the actual data for this booking date
      data.forEach((row: any) => {
        if (row.booking_date === bookingDateString) {
           // occupancy_month from ClickHouse is YYYY-MM-DD, need to convert to UTC Date for formatting
           const occupancyMonthDate = new Date(row.occupancy_month + 'T00:00:00Z'); // Treat as UTC
           const monthStr = formatMonthYearUTC(occupancyMonthDate);

          const rooms = parseFloat(row.sold_rooms) || 0;
          const revenue = parseFloat(row.room_revenue) || 0;

          pickupData[monthStr] = {
            soldRooms: rooms,
            revenue: revenue,
            adr: rooms > 0 ? Math.round(revenue / rooms) : null
          };
        }
      });

      return {
        bookingDate: bookingDateString,
        pickupData
      };
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error querying ClickHouse:', error);
    return NextResponse.json(
      { error: 'Failed to fetch data from ClickHouse' },
      { status: 500 }
    );
  } finally {
    // Close client connection if it exists
    if (client) {
      await client.close();
    }
  }
}

// --- UTC Helper Functions (Same as in month route) ---

// Generates dates from the 1st of the month of the given UTC date up to that date.
function generateDatesInMonthUTC(targetDateUTC: Date): string[] {
  const year = targetDateUTC.getUTCFullYear();
  const month = targetDateUTC.getUTCMonth();

  const firstDayOfMonth = new Date(Date.UTC(year, month, 1));
  const dates: string[] = [];
  let currentDate = firstDayOfMonth;

  // Loop while currentDate is less than or equal to targetDateUTC
  while (currentDate.getTime() <= targetDateUTC.getTime()) {
    dates.push(formatDateUTC(currentDate));
    // Increment date carefully in UTC
    currentDate = new Date(Date.UTC(currentDate.getUTCFullYear(), currentDate.getUTCMonth(), currentDate.getUTCDate() + 1));
  }

  return dates;
}

// Generates months (MMM YYYY) from the month of the given UTC date to the end of the year.
function generateMonthsInYearUTC(targetDateUTC: Date): string[] {
  const year = targetDateUTC.getUTCFullYear();
  const startMonth = targetDateUTC.getUTCMonth(); // 0-indexed
  const months: string[] = [];

  for (let i = startMonth; i < 12; i++) {
    // Generate first day of each month in UTC
    months.push(formatMonthYearUTC(new Date(Date.UTC(year, i, 1))));
  }

  return months;
}

// Formats a UTC Date object as YYYY-MM-DD string.
function formatDateUTC(date: Date): string {
  const year = date.getUTCFullYear();
  const month = (date.getUTCMonth() + 1).toString().padStart(2, '0');
  const day = date.getUTCDate().toString().padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// Formats a UTC Date object as MMM YYYY string.
function formatMonthYearUTC(date: Date): string {
  const monthIndex = date.getUTCMonth(); // 0-11
  const month = MONTH_NAMES_SHORT[monthIndex];
  const year = date.getUTCFullYear();
  return `${month} ${year}`;
} 