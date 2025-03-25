import { NextResponse } from 'next/server';
import { ClickHouseClient, createClient } from '@clickhouse/client';

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

export async function GET(request: Request) {
  // Parse query parameters
  const { searchParams } = new URL(request.url);
  const dateParam = searchParams.get('date') || new Date().toISOString().split('T')[0];
  const businessDateParam = searchParams.get('businessDate') || new Date().toISOString().split('T')[0];
  
  // Ensure we're using the exact date string provided in the parameter
  // instead of converting it through a Date object which can cause timezone issues
  const selectedDate = new Date(dateParam);
  
  // Get year and month for filtering
  const year = selectedDate.getFullYear();
  const month = selectedDate.getMonth();
  const today = new Date();
  
  // Format dates for query
  const monthStart = new Date(year, month, 1).toISOString().split('T')[0];
  const yearEnd = new Date(year, 11, 31).toISOString().split('T')[0];
  const todayStr = today.toISOString().split('T')[0];

  // Initialize client variable before try block
  let client: ClickHouseClient | undefined;

  try {
    // Create ClickHouse client
    client = createClient({
      host: process.env.CLICKHOUSE_HOST || 'http://34.34.71.156:8123',
      username: process.env.CLICKHOUSE_USER || 'default',
      password: process.env.CLICKHOUSE_PASSWORD || 'elarion'
    });

    // Execute query with SCD filtering
    const query = `
      SELECT 
        toDate(booking_date) AS booking_date,
        toStartOfMonth(occupancy_date) AS occupancy_month,
        sold_rooms,
        roomRevenue AS room_revenue
      FROM SAND01CN.hotel_level_pace
      WHERE 
        toDate(booking_date) BETWEEN '${monthStart}' AND '${todayStr}'
        AND toDate(occupancy_date) BETWEEN '${monthStart}' AND '${yearEnd}'
        AND date(scd_valid_from) <= DATE('${businessDateParam}') 
        AND DATE('${businessDateParam}') < date(scd_valid_to)
      ORDER BY booking_date, occupancy_month
    `;


    const resultSet = await client.query({
      query,
      format: 'JSONEachRow'
    });

    const data = await resultSet.json();

    // Transform data into the format expected by the frontend
    const bookingDates = generateDatesInMonth(selectedDate, today);
    const occupancyMonths = generateMonthsInYear(selectedDate);
    
    const result: YearlyPickupResponse[] = bookingDates.map(bookingDate => {
      const pickupData: { [key: string]: PickupMetric } = {};
      
      // Initialize all occupancy months with null values
      occupancyMonths.forEach(occupancyMonth => {
        pickupData[occupancyMonth] = {
          soldRooms: null,
          revenue: null,
          adr: null
        };
      });
      
      // Find the actual data for this booking date
      data.forEach((row: any) => {
        if (row.booking_date === bookingDate) {
          // Convert string values to numbers and format month
          const rooms = parseFloat(row.sold_rooms) || 0;
          const revenue = parseFloat(row.room_revenue) || 0;
          const monthStr = formatMonthYear(new Date(row.occupancy_month));
          
          pickupData[monthStr] = {
            soldRooms: rooms,
            revenue: revenue,
            adr: rooms > 0 ? Math.round(revenue / rooms) : null
          };
        }
      });
      
      return {
        bookingDate,
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

// Helper function to generate dates from start of month to today
function generateDatesInMonth(selectedDate: Date, today: Date): string[] {
  const year = selectedDate.getFullYear();
  const month = selectedDate.getMonth();
  const startDay = 1;
  const endDay = Math.min(
    new Date(year, month + 1, 0).getDate(),  // Last day of month
    today.getDate()
  );
  
  return Array.from({ length: endDay - startDay + 1 }, (_, i) => {
    const day = startDay + i;
    return formatDate(new Date(year, month, day));
  });
}

// Helper function to generate months from current month to end of year
function generateMonthsInYear(selectedDate: Date): string[] {
  const year = selectedDate.getFullYear();
  const startMonth = selectedDate.getMonth();
  const months = [];
  
  for (let i = startMonth; i < 12; i++) {
    months.push(formatMonthYear(new Date(year, i, 1)));
  }
  
  return months;
}

// Helper function to format date as YYYY-MM-DD
function formatDate(date: Date): string {
  return date.toISOString().split('T')[0];
}

// Helper function to format month as MMM YYYY
function formatMonthYear(date: Date): string {
  const month = date.toLocaleString('en-US', { month: 'short' });
  const year = date.getFullYear();
  return `${month} ${year}`;
} 