import { NextResponse } from "next/server";
import { ClickHouseClient, createClient } from "@clickhouse/client";
import { getClickhouseConnection } from "@/lib/clickhouse";
import {
  calculateDateRanges,
  calculateComparisonDateRanges,
} from "@/lib/dateUtils";
import type { DataSet } from "@/components/new/HorizontalBarChartMultipleDatasets";

export async function GET(request: Request) {
  // Parse query parameters
  const { searchParams } = new URL(request.url);
  const businessDateParam =
    searchParams.get("businessDate") || new Date().toISOString().split("T")[0];
  const periodType = searchParams.get("periodType") || "Month"; // Month, Year, Day
  const viewType = searchParams.get("viewType") || "Actual"; // Actual, OTB, Projected
  const comparisonType = searchParams.get("comparison") || "Last year - OTB";
  const property = searchParams.get("property");

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

    const propertyFilter = property ? `AND property = '${property}'` : "";

    // Build the query for current period booking lead time
    const currentBookingQuery = `
      SELECT 
        bucket AS lead_time_bucket,
        SUM(booking_lead_num) AS count
      FROM JADRANKA.booking_lead_time
      WHERE 
        toDate(occupancy_date) BETWEEN '${startDate}' AND '${endDate}'
        AND date(scd_valid_from) <= DATE('${businessDateParam}') 
        AND DATE('${businessDateParam}') < date(scd_valid_to)
        ${propertyFilter}
      GROUP BY bucket
      ORDER BY 
        CASE 
          WHEN bucket = '0-7 days' THEN 1
          WHEN bucket = '8-14 days' THEN 2
          WHEN bucket = '15-30 days' THEN 3
          WHEN bucket = '31-60 days' THEN 4
          WHEN bucket = '61-90 days' THEN 5
          WHEN bucket = '91-180 days' THEN 6
          WHEN bucket = '181-365 days' THEN 7
          WHEN bucket = '365+ days' THEN 8
          ELSE 9
        END ASC
    `;

    // Build the query for previous period booking lead time
    const previousBookingQuery = `
      SELECT 
        bucket AS lead_time_bucket,
        SUM(booking_lead_num) AS count
      FROM JADRANKA.booking_lead_time
      WHERE 
        toDate(occupancy_date) BETWEEN '${prevStartDate}' AND '${prevEndDate}'
        AND date(scd_valid_from) <= DATE('${prevBusinessDateParam}') 
        AND DATE('${prevBusinessDateParam}') < date(scd_valid_to)
        ${propertyFilter}
      GROUP BY bucket
      ORDER BY 
        CASE 
          WHEN bucket = '0-7 days' THEN 1
          WHEN bucket = '8-14 days' THEN 2
          WHEN bucket = '15-30 days' THEN 3
          WHEN bucket = '31-60 days' THEN 4
          WHEN bucket = '61-90 days' THEN 5
          WHEN bucket = '91-180 days' THEN 6
          WHEN bucket = '181-365 days' THEN 7
          WHEN bucket = '365+ days' THEN 8
          ELSE 9
        END ASC
    `;

    // Build the query for current period cancellation lead time
    const currentCancellationQuery = `
      SELECT 
        bucket AS lead_time_bucket,
        SUM(cancellation_lead_num) AS count
      FROM JADRANKA.cancellation_lead_time
      WHERE 
        toDate(occupancy_date) BETWEEN '${startDate}' AND '${endDate}'
        AND date(scd_valid_from) <= DATE('${businessDateParam}') 
        AND DATE('${businessDateParam}') < date(scd_valid_to)
        ${propertyFilter}
      GROUP BY bucket
      ORDER BY 
        CASE 
          WHEN bucket = '0-7 days' THEN 1
          WHEN bucket = '8-14 days' THEN 2
          WHEN bucket = '15-30 days' THEN 3
          WHEN bucket = '31-60 days' THEN 4
          WHEN bucket = '61-90 days' THEN 5
          WHEN bucket = '91-180 days' THEN 6
          WHEN bucket = '181-365 days' THEN 7
          WHEN bucket = '365+ days' THEN 8
          ELSE 9
        END ASC
    `;

    // Build the query for previous period cancellation lead time
    const previousCancellationQuery = `
      SELECT 
        bucket AS lead_time_bucket,
        SUM(cancellation_lead_num) AS count
      FROM JADRANKA.cancellation_lead_time
      WHERE 
        toDate(occupancy_date) BETWEEN '${prevStartDate}' AND '${prevEndDate}'
        AND date(scd_valid_from) <= DATE('${prevBusinessDateParam}') 
        AND DATE('${prevBusinessDateParam}') < date(scd_valid_to)
        ${propertyFilter}
      GROUP BY bucket
      ORDER BY 
        CASE 
          WHEN bucket = '0-7 days' THEN 1
          WHEN bucket = '8-14 days' THEN 2
          WHEN bucket = '15-30 days' THEN 3
          WHEN bucket = '31-60 days' THEN 4
          WHEN bucket = '61-90 days' THEN 5
          WHEN bucket = '91-180 days' THEN 6
          WHEN bucket = '181-365 days' THEN 7
          WHEN bucket = '365+ days' THEN 8
          ELSE 9
        END ASC
    `;

    // Execute queries in parallel
    const [
      currentBookingResultSet,
      previousBookingResultSet,
      currentCancellationResultSet,
      previousCancellationResultSet,
    ] = await Promise.all([
      client.query({ query: currentBookingQuery, format: "JSONEachRow" }),
      client.query({ query: previousBookingQuery, format: "JSONEachRow" }),
      client.query({ query: currentCancellationQuery, format: "JSONEachRow" }),
      client.query({ query: previousCancellationQuery, format: "JSONEachRow" }),
    ]);

    const currentBookingData = (await currentBookingResultSet.json()) as any[];
    const previousBookingData =
      (await previousBookingResultSet.json()) as any[];
    const currentCancellationData =
      (await currentCancellationResultSet.json()) as any[];
    const previousCancellationData =
      (await previousCancellationResultSet.json()) as any[];

    // Define a helper function to merge and transform data
    const processLeadTimeData = (
      currentData: any[],
      previousData: any[],
      bucketField: string = "lead_time_bucket",
      countField: string = "count"
    ): Array<{ range: string; current: number; previous: number }> => {
      const previousDataMap = new Map();
      previousData.forEach((item) => {
        previousDataMap.set(item[bucketField], item);
      });

      const combinedDataMap = new Map<
        string,
        { current: number; previous: number }
      >();

      // Process current data
      currentData.forEach((item) => {
        const bucket = item[bucketField];
        const currentCount = parseInt(item[countField] || "0", 10);
        const prevItem = previousDataMap.get(bucket);
        const previousCount = parseInt(prevItem?.[countField] || "0", 10);
        combinedDataMap.set(bucket, {
          current: currentCount,
          previous: previousCount,
        });
      });

      // Add any buckets from previous data not in current data
      previousData.forEach((prevItem) => {
        const bucket = prevItem[bucketField];
        if (!combinedDataMap.has(bucket)) {
          combinedDataMap.set(bucket, {
            current: 0,
            previous: parseInt(prevItem[countField] || "0", 10),
          });
        }
      });

      // Convert map to array and transform bucket to range
      const result = Array.from(combinedDataMap.entries()).map(
        ([bucket, counts]) => ({
          range: bucket, // Map 'bucket' to 'range'
          current: counts.current,
          previous: counts.previous,
        })
      );

      // Sort data by the correct order of lead time buckets
      const bucketOrder = {
        "0-7 days": 1,
        "8-14 days": 2,
        "15-30 days": 3,
        "31-60 days": 4,
        "61-90 days": 5,
        "91-180 days": 6,
        "181-365 days": 7,
        "365+ days": 8,
      };

      result.sort((a, b) => {
        return (
          (bucketOrder[a.range as keyof typeof bucketOrder] || 99) -
          (bucketOrder[b.range as keyof typeof bucketOrder] || 99)
        );
      });

      return result;
    };

    // Process both datasets
    const bookingLeadTimeData = processLeadTimeData(
      currentBookingData,
      previousBookingData,
      "lead_time_bucket",
      "count"
    );
    const cancellationLeadTimeData = processLeadTimeData(
      currentCancellationData,
      previousCancellationData,
      "lead_time_bucket",
      "count"
    );

    // Construct the response in the DataSet[] format
    const response: DataSet[] = [
      {
        key: "bookingLeadTime", // Consistent key
        title: "Booking Lead Time",
        data: bookingLeadTimeData,
      },
      {
        key: "cancellationLeadTime", // Consistent key
        title: "Cancellation Lead Time",
        data: cancellationLeadTimeData,
      },
    ];

    return NextResponse.json(response);
  } catch (error) {
    console.error("Error querying ClickHouse:", error);
    return NextResponse.json(
      { error: "Failed to fetch lead time distribution data from ClickHouse" },
      { status: 500 }
    );
  } finally {
    // Close client connection if it exists
    if (client) {
      await client.close();
    }
  }
}
