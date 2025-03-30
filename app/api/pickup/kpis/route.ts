import { NextResponse } from 'next/server';
import { ClickHouseClient, createClient } from '@clickhouse/client';
import { addDays, endOfMonth, endOfYear, format } from 'date-fns';

// Define the structure for the response
interface KpiData {
  kpiName: 'roomsSold' | 'roomsRevenue' | 'adr' | 'cancellations' | 'revenueLost';
  title: string;
  currentValue: number;
  comparisonValue: number;
  prefix?: string;
  suffix?: string;
}

type PickupKpiResponse = KpiData[];

// Interface for raw query results
interface QueryResult {
    total_sold_rooms: number;
    total_room_revenue: number;
    total_cancelled_rooms: number;
    total_revenue_lost: number;
    num_comparison_days?: number; // Only for 'Last X days' comparison
}

// Helper function to round values for consistency
function roundValue(value: number): number {
  return value >= 100 ? Math.round(value) : Number(value.toFixed(2));
}

// Helper to calculate ADR safely
const calculateAdr = (revenue: number, rooms: number): number => {
    return rooms > 0 ? revenue / rooms : 0;
}

// Helper function to get occupancy date range based on viewType and a reference date
const getOccupancyDateRange = (refDateStr: string, viewType: 'Day' | 'Month' | 'Year'): { startDate: string, endDate: string } => {
    const refDate = new Date(refDateStr + 'T00:00:00Z'); // Ensure parsing as UTC
    let occStartDate: Date;
    let occEndDate: Date;

    switch (viewType) {
        case 'Day':
            occStartDate = refDate;
            occEndDate = refDate;
            break;
        case 'Month':
            occStartDate = refDate;
            occEndDate = endOfMonth(refDate);
            break;
        case 'Year':
            occStartDate = refDate;
            occEndDate = endOfYear(refDate);
            break;
        default: // Default to Day view if type is invalid
            occStartDate = refDate;
            occEndDate = refDate;
            break;
    }
    return {
        startDate: format(occStartDate, 'yyyy-MM-dd'),
        endDate: format(occEndDate, 'yyyy-MM-dd'),
    };
};


export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const reportDateParam = searchParams.get('reportDate') || format(new Date(), 'yyyy-MM-dd');
    const viewType = (searchParams.get('viewType') || 'Day') as 'Day' | 'Month' | 'Year';
    const comparison = (searchParams.get('comparison') || 'Yesterday') as 'Yesterday' | 'Last 7 days' | 'Last 15 days' | 'Last 30 days';

    let client: ClickHouseClient | undefined;

    try {
        client = createClient({
            host: process.env.CLICKHOUSE_HOST || 'http://34.34.71.156:8123',
            username: process.env.CLICKHOUSE_USER || 'default',
            password: process.env.CLICKHOUSE_PASSWORD || 'elarion',
            database: 'SAND01CN', // Specify database here
        });

        // --- Calculate Date Ranges ---
        const reportDate = new Date(reportDateParam + 'T00:00:00Z'); // Ensure UTC

        // Current Period
        const currentBookingDate = format(reportDate, 'yyyy-MM-dd');
        const currentOccupancyRange = getOccupancyDateRange(currentBookingDate, viewType);

        // Comparison Period
        let comparisonBookingStartDate: string;
        let comparisonBookingEndDate: string;
        let comparisonDays = 1; // Default for 'Yesterday'

        if (comparison === 'Yesterday') {
            const yesterday = addDays(reportDate, -1);
            comparisonBookingStartDate = format(yesterday, 'yyyy-MM-dd');
            comparisonBookingEndDate = comparisonBookingStartDate;
        } else {
            let daysToSubtract = 7;
            if (comparison === 'Last 15 days') daysToSubtract = 15;
            if (comparison === 'Last 30 days') daysToSubtract = 30;

            const endDate = addDays(reportDate, -1); // End date is the day before reportDate
            const startDate = addDays(reportDate, -daysToSubtract);
            comparisonBookingStartDate = format(startDate, 'yyyy-MM-dd');
            comparisonBookingEndDate = format(endDate, 'yyyy-MM-dd');
            comparisonDays = daysToSubtract;
        }

        // For comparison, we use the *same occupancy logic* relative to the report date,
        // as specified in the prompt interpretation.
        const comparisonOccupancyRange = currentOccupancyRange;


        // --- Build Queries ---

        // Query for Current Period - Removed SCD filtering
        const currentQuery = `
            SELECT
                SUM(sold_rooms) AS total_sold_rooms,
                SUM(roomRevenue) AS total_room_revenue,
                SUM(cancelled_rooms) AS total_cancelled_rooms,
                SUM(totalRevenue_lost) AS total_revenue_lost
            FROM insights
            WHERE
                toDate(booking_date) = {currentBookingDate:Date}
            AND toDate(occupancy_date) BETWEEN {occStartDate:Date} AND {occEndDate:Date}
        `;


        // Query for Comparison Period
        let comparisonQuery: string;
        let comparisonQueryParams: Record<string, any>;

        if (comparison === 'Yesterday') {
            // Removed SCD filtering
            comparisonQuery = `
                SELECT
                    SUM(sold_rooms) AS total_sold_rooms,
                    SUM(roomRevenue) AS total_room_revenue,
                    SUM(cancelled_rooms) AS total_cancelled_rooms,
                    SUM(totalRevenue_lost) AS total_revenue_lost
                FROM insights
                WHERE
                    toDate(booking_date) = {comparisonBookingDate:Date}
                AND toDate(occupancy_date) BETWEEN {occStartDate:Date} AND {occEndDate:Date}
            `;
             comparisonQueryParams = {
                comparisonBookingDate: comparisonBookingStartDate,
                occStartDate: comparisonOccupancyRange.startDate,
                occEndDate: comparisonOccupancyRange.endDate,
            };
        } else { // 'Last X days'
             // Removed SCD filtering
             comparisonQuery = `
                SELECT
                    SUM(sold_rooms) AS total_sold_rooms,
                    SUM(roomRevenue) AS total_room_revenue,
                    SUM(cancelled_rooms) AS total_cancelled_rooms,
                    SUM(totalRevenue_lost) AS total_revenue_lost,
                    toFloat64(COUNT(DISTINCT toDate(booking_date))) as num_comparison_days -- Get actual number of days with data
                FROM insights
                WHERE
                    toDate(booking_date) BETWEEN {comparisonBookingStartDate:Date} AND {comparisonBookingEndDate:Date}
                AND toDate(occupancy_date) BETWEEN {occStartDate:Date} AND {occEndDate:Date}
            `;
             comparisonQueryParams = {
                comparisonBookingStartDate,
                comparisonBookingEndDate,
                occStartDate: comparisonOccupancyRange.startDate,
                occEndDate: comparisonOccupancyRange.endDate,
            };
        }

        // --- Execute Queries ---
        const [currentResult, comparisonResult] = await Promise.all([
            client.query({
                query: currentQuery,
                query_params: {
                    currentBookingDate: currentBookingDate,
                    occStartDate: currentOccupancyRange.startDate,
                    occEndDate: currentOccupancyRange.endDate,
                },
                format: 'JSONEachRow',
            }),
            client.query({
                query: comparisonQuery,
                query_params: comparisonQueryParams,
                format: 'JSONEachRow',
            })
        ]);

        const currentDataRaw = await currentResult.json<QueryResult[]>();
        const comparisonDataRaw = await comparisonResult.json<QueryResult[]>();

        // Fix for the linter error - explicitly check the array and extract the first item safely
        const currentData: QueryResult = currentDataRaw && currentDataRaw.length > 0 
            ? currentDataRaw[0] as QueryResult
            : { total_sold_rooms: 0, total_room_revenue: 0, total_cancelled_rooms: 0, total_revenue_lost: 0 };
        
        const comparisonDataBase: QueryResult = comparisonDataRaw && comparisonDataRaw.length > 0
            ? comparisonDataRaw[0] as QueryResult
            : { total_sold_rooms: 0, total_room_revenue: 0, total_cancelled_rooms: 0, total_revenue_lost: 0, num_comparison_days: 0 };

        let comparisonData: QueryResult;

        // Calculate average for 'Last X days' comparison
        if (comparison !== 'Yesterday') {
            const actualDays = comparisonDataBase.num_comparison_days ?? 0;
            const divisor = actualDays > 0 ? actualDays : comparisonDays; // Use actual days with data if available, else the requested number

            comparisonData = {
                total_sold_rooms: comparisonDataBase.total_sold_rooms / divisor,
                total_room_revenue: comparisonDataBase.total_room_revenue / divisor,
                total_cancelled_rooms: comparisonDataBase.total_cancelled_rooms / divisor,
                total_revenue_lost: comparisonDataBase.total_revenue_lost / divisor,
            };
        } else {
            comparisonData = comparisonDataBase;
        }

        // --- Calculate KPIs ---
        const currentAdr = calculateAdr(currentData.total_room_revenue, currentData.total_sold_rooms);
        const comparisonAdr = calculateAdr(comparisonData.total_room_revenue, comparisonData.total_sold_rooms);

        // --- Format Response ---
        const responseData: PickupKpiResponse = [
            {
                kpiName: 'roomsSold',
                title: 'Rooms sold',
                currentValue: currentData.total_sold_rooms,
                comparisonValue: comparisonData.total_sold_rooms,
                prefix: '',
            },
            {
                kpiName: 'roomsRevenue',
                title: 'Rooms revenue',
                currentValue: roundValue(currentData.total_room_revenue),
                comparisonValue: roundValue(comparisonData.total_room_revenue),
                prefix: '€', // Assuming Euro based on Overview page
            },
            {
                kpiName: 'adr',
                title: 'ADR',
                currentValue: currentAdr,
                comparisonValue: comparisonAdr,
                prefix: '€',
            },
            {
                kpiName: 'cancellations',
                title: 'Cancellations',
                currentValue: currentData.total_cancelled_rooms,
                comparisonValue: comparisonData.total_cancelled_rooms,
                prefix: '',
            },
            {
                kpiName: 'revenueLost',
                title: 'Revenue lost',
                currentValue: roundValue(currentData.total_revenue_lost),
                comparisonValue: roundValue(comparisonData.total_revenue_lost),
                prefix: '€',
            },
        ];

        return NextResponse.json(responseData);

    } catch (error) {
        console.error('Error fetching pickup KPI data:', error);
        const errorMsg = error instanceof Error ? error.message : 'An unknown error occurred';
        return NextResponse.json({ error: 'Failed to fetch pickup KPI data', details: errorMsg }, { status: 500 });
    } finally {
        await client?.close();
    }
} 