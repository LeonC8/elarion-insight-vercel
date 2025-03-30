import { NextResponse } from 'next/server';
import { ClickHouseClient, createClient } from '@clickhouse/client';
import * as fs from 'fs';
import * as path from 'path';

// --- START CACHING LOGIC --- (Copied from overview/general)

interface CacheEntryData {
    body: any; // Store the parsed JSON body
    status: number;
    headers: Record<string, string>;
}

interface CacheEntry {
    data: CacheEntryData;
    expiresAt: number;
}

const CACHE_DURATION = 1 * 60 * 60 * 1000; // 1 hour in milliseconds (adjust as needed)
const CACHE_DIR = path.join(process.cwd(), '.cache');

try {
    if (!fs.existsSync(CACHE_DIR)) {
        fs.mkdirSync(CACHE_DIR, { recursive: true });
    }
} catch (error) {
    console.error('Error creating cache directory:', error);
}

function getCacheFilePath(key: string): string {
    const safeKey = Buffer.from(key).toString('base64').replace(/[/\\?%*:|"<>]/g, '_');
    return path.join(CACHE_DIR, `${safeKey}.json`);
}

async function getCacheEntry(key: string): Promise<CacheEntry | null> {
    try {
        const filePath = getCacheFilePath(key);
        if (fs.existsSync(filePath)) {
            const data = fs.readFileSync(filePath, 'utf8');
            return JSON.parse(data);
        }
        return null;
    } catch (error) {
        console.error(`Cache read error:`, error);
        return null;
    }
}

async function setCacheEntry(key: string, entry: CacheEntry): Promise<void> {
    try {
        const filePath = getCacheFilePath(key);
        fs.writeFileSync(filePath, JSON.stringify(entry), 'utf8');
    } catch (error) {
        console.error(`Cache write error:`, error);
    }
}

async function deleteCacheEntry(key: string): Promise<void> {
    try {
        const filePath = getCacheFilePath(key);
        if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
        }
    } catch (error) {
        console.error(`Cache delete error:`, error);
    }
}

function generateCacheKey(params: URLSearchParams): string {
    const relevantParams = ['viewType'];
    const keyParts: string[] = [];
    relevantParams.forEach(key => {
        let value: string | null = null;
        switch (key) {
            case 'viewType': value = params.get(key) || 'Month'; break; // Default to Month
            default: value = params.get(key);
        }
        if (value !== null) {
            keyParts.push(`${key}=${value}`);
        }
    });
    keyParts.sort();
    return `pace:${keyParts.join('&')}`; // Add a prefix for pace routes
}

// --- END CACHING LOGIC ---

interface PacingQueryResult {
    period: 'current' | 'previous';
    date_key: string; // Will hold 'YYYY-MM-DD' for Month view, 'YYYY-MM' for Year view
    rooms_sold: string;
    room_revenue: string;
}

export interface PacingChartData {
    date: string; // 'YYYY-MM-DD' for Month, 'YYYY-MM' for Year
    revenue?: number;
    rooms?: number;
    adr?: number;
    comparisonRevenue?: number;
    comparisonRooms?: number;
    comparisonAdr?: number;
}

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);

    // --- CHECK CACHE ---
    const cacheKey = generateCacheKey(searchParams);
    const cachedEntry = await getCacheEntry(cacheKey);

    if (cachedEntry && cachedEntry.expiresAt > Date.now()) {
        console.log(`[Cache HIT] Returning cached response for key: ${cacheKey.substring(0, 100)}...`);
        return new NextResponse(JSON.stringify(cachedEntry.data.body), {
            status: cachedEntry.data.status,
            headers: cachedEntry.data.headers,
        });
    } else if (cachedEntry) {
        console.log(`[Cache EXPIRED] Removing expired entry for key: ${cacheKey.substring(0, 100)}...`);
        await deleteCacheEntry(cacheKey);
    } else {
        console.log(`[Cache MISS] No valid cache entry for key: ${cacheKey.substring(0, 100)}...`);
    }
    // --- END CACHE CHECK ---

    const viewType = searchParams.get('viewType') || 'Month'; // 'Month' or 'Year'
    const businessDate = new Date(); // Use today's date as the business date
    const businessDateParam = businessDate.toISOString().split('T')[0];

    let startDate: string, endDate: string;
    let prevStartDate: string, prevEndDate: string;
    let dateGroupFormat: string;
    let dateKeyFormat: string;

    const year = businessDate.getFullYear();
    const month = businessDate.getMonth(); // 0-indexed

    if (viewType === 'Month') {
        // Current month range
        startDate = new Date(year, month, 1).toISOString().split('T')[0];
        endDate = new Date(year, month + 1, 0).toISOString().split('T')[0]; // Last day of current month
        // Previous year, same month range
        prevStartDate = new Date(year - 1, month, 1).toISOString().split('T')[0];
        prevEndDate = new Date(year - 1, month + 1, 0).toISOString().split('T')[0]; // Last day of prev year's month
        dateGroupFormat = `toString(toDate(occupancy_date))`; // Group by day
        dateKeyFormat = `toString(toDate(occupancy_date))`; // Key is 'YYYY-MM-DD'
    } else { // Year view
        // Current year range
        startDate = new Date(year, 0, 1).toISOString().split('T')[0]; // Jan 1st
        endDate = new Date(year, 11, 31).toISOString().split('T')[0]; // Dec 31st
        // Previous year range
        prevStartDate = new Date(year - 1, 0, 1).toISOString().split('T')[0];
        prevEndDate = new Date(year - 1, 11, 31).toISOString().split('T')[0];
        dateGroupFormat = `formatDateTime(toStartOfMonth(toDate(occupancy_date)), '%Y-%m')`; // Group by month start
        dateKeyFormat = `formatDateTime(toStartOfMonth(toDate(occupancy_date)), '%Y-%m')`; // Key is 'YYYY-MM'
    }

    let client: ClickHouseClient | undefined;

    try {
        client = createClient({
            host: process.env.CLICKHOUSE_HOST || 'http://34.34.71.156:8123',
            username: process.env.CLICKHOUSE_USER || 'default',
            password: process.env.CLICKHOUSE_PASSWORD || 'elarion'
        });

        const query = `
        WITH CurrentData AS (
            SELECT
                ${dateKeyFormat} AS date_key,
                SUM(sold_rooms) AS rooms_sold,
                SUM(roomRevenue) AS room_revenue
            FROM SAND01CN.insights
            WHERE
                toDate(occupancy_date) BETWEEN '${startDate}' AND '${endDate}'
                AND date(scd_valid_from) <= DATE('${businessDateParam}')
                AND DATE('${businessDateParam}') < date(scd_valid_to)
            GROUP BY ${dateGroupFormat}
        ),
        PreviousData AS (
            SELECT
                ${dateKeyFormat} AS date_key,
                SUM(sold_rooms) AS rooms_sold,
                SUM(roomRevenue) AS room_revenue
            FROM SAND01CN.insights
            WHERE
                toDate(occupancy_date) BETWEEN '${prevStartDate}' AND '${prevEndDate}'
                -- Use the same business date for validity check, as per user request
                AND date(scd_valid_from) <= DATE('${businessDateParam}')
                AND DATE('${businessDateParam}') < date(scd_valid_to)
            GROUP BY ${dateGroupFormat}
        )
        SELECT
            'current' AS period,
            date_key,
            rooms_sold,
            room_revenue
        FROM CurrentData

        UNION ALL

        SELECT
            'previous' AS period,
            date_key,
            rooms_sold,
            room_revenue
        FROM PreviousData
        ORDER BY date_key, period
        `;

        const resultSet = await client.query({
            query: query,
            format: 'JSONEachRow'
        });

        const rawData = await resultSet.json<PacingQueryResult[]>();

        // Process and merge data
        const mergedData: Record<string, PacingChartData> = {};

        rawData.forEach(row => {
            const dateKey = row.date_key;
            if (!mergedData[dateKey]) {
                mergedData[dateKey] = { date: dateKey };
            }

            const rooms = parseFloat(row.rooms_sold || '0');
            const revenue = parseFloat(row.room_revenue || '0');
            const adr = rooms > 0 ? revenue / rooms : 0;

            if (row.period === 'current') {
                mergedData[dateKey].rooms = rooms;
                mergedData[dateKey].revenue = revenue;
                mergedData[dateKey].adr = adr;
            } else { // previous
                mergedData[dateKey].comparisonRooms = rooms;
                mergedData[dateKey].comparisonRevenue = revenue;
                mergedData[dateKey].comparisonAdr = adr;
            }
        });

        // Convert map to sorted array
        const responseData: PacingChartData[] = Object.values(mergedData)
            .sort((a, b) => a.date.localeCompare(b.date));


        // --- STORE IN CACHE ---
        const cacheEntry: CacheEntry = {
            data: {
                body: responseData,
                status: 200,
                headers: { 'Content-Type': 'application/json' }
            },
            expiresAt: Date.now() + CACHE_DURATION
        };
        await setCacheEntry(cacheKey, cacheEntry);
        console.log(`[Cache SET] Stored response data for key: ${cacheKey.substring(0, 100)}...`);
        // --- END STORE IN CACHE ---

        return NextResponse.json(responseData);

    } catch (error) {
        console.error('Error querying ClickHouse for pacing data:', error);
        // Do not cache errors
        const errorBody = { error: 'Failed to fetch pacing data from ClickHouse' };
        return NextResponse.json(errorBody, { status: 500 });
    } finally {
        if (client) {
            await client.close();
        }
    }
}
