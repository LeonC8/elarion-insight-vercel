import { NextResponse } from 'next/server';
import { ClickHouseClient, createClient } from '@clickhouse/client';
import { addDays, endOfMonth, endOfYear, format, eachDayOfInterval, parseISO } from 'date-fns';

// Define FluctuationData type
type FluctuationData = {
  date: string; // Format: 'dd/MM' or 'yyyy-MM-dd' based on dialog expectation
  current: number;
  previous: number;
}[];

// Define the structure for the response including fluctuation
interface KpiData {
  kpiName: 'roomsSold' | 'roomsRevenue' | 'adr' | 'cancellations' | 'revenueLost';
  title: string;
  currentValue: number;
  comparisonValue: number;
  prefix?: string;
  suffix?: string;
  fluctuation: FluctuationData; // Add fluctuation data
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

// Interface for raw daily query results
interface DailyQueryResult {
    occupancy_date: string; // YYYY-MM-DD format from ClickHouse
    daily_sold_rooms: number;
    daily_room_revenue: number;
    daily_cancelled_rooms: number;
    daily_revenue_lost: number;
}

// Interface for averaged daily results (for 'Last X days')
interface DailyAverageResult {
    occupancy_date: string;
    avg_daily_sold_rooms: number;
    avg_daily_room_revenue: number;
    avg_daily_cancelled_rooms: number;
    avg_daily_revenue_lost: number;
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

        // Query for Current Period Daily Data
        const currentDailyQuery = `
            SELECT
                toString(toDate(occupancy_date)) AS occupancy_date,
                SUM(sold_rooms) AS daily_sold_rooms,
                SUM(roomRevenue) AS daily_room_revenue,
                SUM(cancelled_rooms) AS daily_cancelled_rooms,
                SUM(totalRevenue_lost) AS daily_revenue_lost
            FROM insights
            WHERE
                toDate(booking_date) = {currentBookingDate:Date}
            AND toDate(occupancy_date) BETWEEN {occStartDate:Date} AND {occEndDate:Date}
            GROUP BY occupancy_date
            ORDER BY occupancy_date
        `;

        // Query for Comparison Period Aggregate
        let comparisonQuery: string;
        let comparisonQueryParams: Record<string, any>;

        if (comparison === 'Yesterday') {
            // Aggregate Query
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
            // Daily Query
            comparisonQueryParams = {
                comparisonBookingDate: comparisonBookingStartDate,
                occStartDate: comparisonOccupancyRange.startDate,
                occEndDate: comparisonOccupancyRange.endDate,
            };
        } else { // 'Last X days'
             // Aggregate Query
             comparisonQuery = `
                SELECT
                    SUM(sold_rooms) AS total_sold_rooms,
                    SUM(roomRevenue) AS total_room_revenue,
                    SUM(cancelled_rooms) AS total_cancelled_rooms,
                    SUM(totalRevenue_lost) AS total_revenue_lost,
                    toFloat64(COUNT(DISTINCT toDate(booking_date))) as num_comparison_days
                FROM insights
                WHERE
                    toDate(booking_date) BETWEEN {comparisonBookingStartDate:Date} AND {comparisonBookingEndDate:Date}
                AND toDate(occupancy_date) BETWEEN {occStartDate:Date} AND {occEndDate:Date}
            `;
            // Daily Query - Calculate average daily values per occupancy date
            comparisonQueryParams = {
                comparisonBookingStartDate,
                comparisonBookingEndDate,
                occStartDate: comparisonOccupancyRange.startDate,
                occEndDate: comparisonOccupancyRange.endDate,
            };
        }

        // --- Execute Queries ---
        const [currentResult, comparisonResult, currentDailyResult, comparisonDailyResult] = await Promise.all([
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
            }),
            client.query({
                 query: currentDailyQuery,
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
                 format: 'JSONEachRow', // Will contain DailyQueryResult or DailyAverageResult
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

        // --- Process Daily Data ---
        const currentDailyDataRaw = await currentDailyResult.json<DailyQueryResult[]>();
        const comparisonDailyDataRaw = await comparisonDailyResult.json<any[]>(); // Can be DailyQueryResult or DailyAverageResult

        // Create maps for easy lookup by occupancy_date
        const currentDailyMap = new Map(currentDailyDataRaw.map(d => [d.occupancy_date, d]));
        const comparisonDailyMap = new Map();

        if (comparison === 'Yesterday') {
            comparisonDailyDataRaw.forEach((d: DailyQueryResult) => {
                comparisonDailyMap.set(d.occupancy_date, {
                    avg_daily_sold_rooms: d.daily_sold_rooms,
                    avg_daily_room_revenue: d.daily_room_revenue,
                    avg_daily_cancelled_rooms: d.daily_cancelled_rooms,
                    avg_daily_revenue_lost: d.daily_revenue_lost,
                });
            });
        } else { // 'Last X days' - data is already averaged DailyAverageResult
            comparisonDailyDataRaw.forEach((d: DailyAverageResult) => {
                 comparisonDailyMap.set(d.occupancy_date, d);
            });
        }

        // --- Create Fluctuation Data ---
        const createFluctuationData = (
            currentMap: Map<string, DailyQueryResult>,
            comparisonMap: Map<string, DailyAverageResult>, // Use average structure for both cases now
            occupancyRange: { startDate: string, endDate: string },
            getCurrentValue: (day: DailyQueryResult | undefined) => number,
            getComparisonValue: (day: DailyAverageResult | undefined) => number
        ): FluctuationData => {
             const fluctuations: FluctuationData = [];
             const startDate = parseISO(occupancyRange.startDate + 'T00:00:00Z');
             const endDate = parseISO(occupancyRange.endDate + 'T00:00:00Z');

             // Iterate through each day in the occupancy range
             const daysInRange = eachDayOfInterval({ start: startDate, end: endDate });

             for (const day of daysInRange) {
                 const dateStr = format(day, 'yyyy-MM-dd');
                 const currentDayData = currentMap.get(dateStr);
                 const comparisonDayData = comparisonMap.get(dateStr);

                 fluctuations.push({
                     date: format(day, 'dd/MM'), // Format for the chart label
                     current: getCurrentValue(currentDayData),
                     previous: getComparisonValue(comparisonDayData),
                 });
             }
             return fluctuations;
        };

        // Generate fluctuation data for each KPI
        const roomsSoldFluctuation = createFluctuationData(
            currentDailyMap, comparisonDailyMap, currentOccupancyRange,
            (d) => d?.daily_sold_rooms ?? 0,
            (d) => d?.avg_daily_sold_rooms ?? 0
        );
        const roomsRevenueFluctuation = createFluctuationData(
            currentDailyMap, comparisonDailyMap, currentOccupancyRange,
            (d) => roundValue(d?.daily_room_revenue ?? 0),
            (d) => roundValue(d?.avg_daily_room_revenue ?? 0)
        );
        const adrFluctuation = createFluctuationData(
             currentDailyMap, comparisonDailyMap, currentOccupancyRange,
             (d) => calculateAdr(d?.daily_room_revenue ?? 0, d?.daily_sold_rooms ?? 0),
             (d) => calculateAdr(d?.avg_daily_room_revenue ?? 0, d?.avg_daily_sold_rooms ?? 0)
        );
        const cancellationsFluctuation = createFluctuationData(
            currentDailyMap, comparisonDailyMap, currentOccupancyRange,
            (d) => d?.daily_cancelled_rooms ?? 0,
            (d) => d?.avg_daily_cancelled_rooms ?? 0
        );
        const revenueLostFluctuation = createFluctuationData(
            currentDailyMap, comparisonDailyMap, currentOccupancyRange,
            (d) => roundValue(d?.daily_revenue_lost ?? 0),
            (d) => roundValue(d?.avg_daily_revenue_lost ?? 0)
        );


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
                fluctuation: roomsSoldFluctuation, // Add fluctuation
            },
            {
                kpiName: 'roomsRevenue',
                title: 'Rooms revenue',
                currentValue: roundValue(currentData.total_room_revenue),
                comparisonValue: roundValue(comparisonData.total_room_revenue),
                prefix: '€', // Assuming Euro based on Overview page
                fluctuation: roomsRevenueFluctuation, // Add fluctuation
            },
            {
                kpiName: 'adr',
                title: 'ADR',
                currentValue: currentAdr,
                comparisonValue: comparisonAdr,
                prefix: '€',
                fluctuation: adrFluctuation.map(f => ({ // Round ADR fluctuation values
                     ...f,
                     current: roundValue(f.current),
                     previous: roundValue(f.previous)
                })),
            },
            {
                kpiName: 'cancellations',
                title: 'Cancellations',
                currentValue: currentData.total_cancelled_rooms,
                comparisonValue: comparisonData.total_cancelled_rooms,
                prefix: '',
                fluctuation: cancellationsFluctuation, // Add fluctuation
            },
            {
                kpiName: 'revenueLost',
                title: 'Revenue lost',
                currentValue: roundValue(currentData.total_revenue_lost),
                comparisonValue: roundValue(comparisonData.total_revenue_lost),
                prefix: '€',
                fluctuation: revenueLostFluctuation, // Add fluctuation
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