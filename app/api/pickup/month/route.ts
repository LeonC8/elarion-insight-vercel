import { NextResponse } from 'next/server';
import { ClickHouseClient, createClient } from '@clickhouse/client';

// Type definition for our response data
export interface PickupMetric {
  soldRooms: number | null;
  revenue: number | null;
  adr: number | null;
}

export interface MonthlyPickupResponse {
  bookingDate: string;
  pickupData: {
    [stayDate: string]: PickupMetric;
  };
}

// Helper to get month names for UTC formatting
const MONTH_NAMES_SHORT = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export async function GET(request: Request) {
  // Parse query parameters
  const { searchParams } = new URL(request.url);
  // const dateParam = searchParams.get('date'); // No longer the primary source for month context
  const businessDateParam = searchParams.get('businessDate');

  if (!businessDateParam) {
    return NextResponse.json({ error: 'businessDate parameter is required' }, { status: 400 });
  }

  // Use businessDate to define the context (month and upper limit for booking dates)
  // Parse the date string and treat components as UTC
  const [yearStr, monthStr, dayStr] = businessDateParam.split('-').map(Number);
  const businessDateUTC = new Date(Date.UTC(yearStr, monthStr - 1, dayStr)); // Month is 0-indexed

  const year = businessDateUTC.getUTCFullYear();
  const month = businessDateUTC.getUTCMonth(); // 0-indexed

  // Format dates for query (using UTC dates)
  const monthStart = formatDateUTC(new Date(Date.UTC(year, month, 1)));
  const monthEnd = formatDateUTC(new Date(Date.UTC(year, month + 1, 0)));
  const businessDateStr = formatDateUTC(businessDateUTC); // Use the formatted UTC date string

  // Initialize client variable before try block
  let client: ClickHouseClient | undefined;

  try {
    // Create ClickHouse client
    client = createClient({
      host: process.env.CLICKHOUSE_HOST || 'http://34.34.71.156:8123',
      username: process.env.CLICKHOUSE_USER || 'default',
      password: process.env.CLICKHOUSE_PASSWORD || 'elarion'
    });

    const query = `
      SELECT
        toDate(booking_date) AS booking_date,
        toDate(occupancy_date) AS occupancy_date,
        sold_rooms,
        roomRevenue AS room_revenue
      FROM SAND01CN.insights
      WHERE
        toDate(booking_date) BETWEEN '${monthStart}' AND '${businessDateStr}'
        AND toDate(occupancy_date) BETWEEN '${monthStart}' AND '${monthEnd}'
      ORDER BY booking_date, occupancy_date
    `;

    console.log(query);

    const resultSet = await client.query({
      query,
      format: 'JSONEachRow'
    });

    const data = await resultSet.json();

    // Use businessDateUTC for generating dates
    const bookingDates = generateDatesInMonthUTC(businessDateUTC); // Generate row headers
    const occupancyDates = generateAllDatesInMonthUTC(businessDateUTC); // Generate column headers

    const result: MonthlyPickupResponse[] = bookingDates.map(bookingDateString => {
      const pickupData: { [key: string]: PickupMetric } = {};

      // Initialize all occupancy dates with null values
      occupancyDates.forEach(occupancyDate => {
        pickupData[occupancyDate] = { soldRooms: null, revenue: null, adr: null };
      });

      // Find the actual data for this booking date
      data.forEach((row: any) => {
        if (row.booking_date === bookingDateString) {
          const rooms = parseFloat(row.sold_rooms) || 0;
          const revenue = parseFloat(row.room_revenue) || 0;

          pickupData[row.occupancy_date] = {
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

// --- UTC Helper Functions ---

// Generates dates from the 1st of the month of the given UTC date up to that date.
function generateDatesInMonthUTC(targetDateUTC: Date): string[] {
  const year = targetDateUTC.getUTCFullYear();
  const month = targetDateUTC.getUTCMonth();

  const firstDayOfMonth = new Date(Date.UTC(year, month, 1));
  const dates: string[] = [];
  let currentDate = firstDayOfMonth;

  // Loop while currentDate is less than or equal to targetDateUTC
  // Use getTime() for reliable comparison
  while (currentDate.getTime() <= targetDateUTC.getTime()) {
    dates.push(formatDateUTC(currentDate));
    // Increment date carefully in UTC
    currentDate = new Date(Date.UTC(currentDate.getUTCFullYear(), currentDate.getUTCMonth(), currentDate.getUTCDate() + 1));
  }

  return dates;
}

// Generates all dates in the month of the given UTC date.
function generateAllDatesInMonthUTC(targetDateUTC: Date): string[] {
  const year = targetDateUTC.getUTCFullYear();
  const month = targetDateUTC.getUTCMonth();
  // Get the last day of the month in UTC
  const daysInMonth = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();

  return Array.from({ length: daysInMonth }, (_, i) => {
    // Generate each date in UTC
    return formatDateUTC(new Date(Date.UTC(year, month, i + 1)));
  });
}

// Formats a UTC Date object as YYYY-MM-DD string.
function formatDateUTC(date: Date): string {
  const year = date.getUTCFullYear();
  // Month is 0-indexed, add 1 and pad
  const month = (date.getUTCMonth() + 1).toString().padStart(2, '0');
  // Day needs padding
  const day = date.getUTCDate().toString().padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// Formats a UTC Date object as MMM YYYY string (needed for yearly view).
function formatMonthYearUTC(date: Date): string {
  const monthIndex = date.getUTCMonth(); // 0-11
  const month = MONTH_NAMES_SHORT[monthIndex];
  const year = date.getUTCFullYear();
  return `${month} ${year}`;
} 