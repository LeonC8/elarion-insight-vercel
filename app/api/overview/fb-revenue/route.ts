import { NextResponse } from 'next/server';
import { parseHotelCSV } from '../../../utils/csvParser';

interface DailyFBRevenue {
  date: string;
  revenue: number;
}

interface RevenueAccumulator {
  [key: string]: DailyFBRevenue;
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const businessDate = searchParams.get('business_date');
    const occupancyDateStart = searchParams.get('occupancy_date_start');
    const occupancyDateEnd = searchParams.get('occupancy_date_end');

    if (!businessDate || !occupancyDateStart || !occupancyDateEnd) {
      return NextResponse.json(
        { error: 'Missing required parameters' },
        { status: 400 }
      );
    }

    const data = await parseHotelCSV();
    const currentDateTime = new Date().toISOString();

    const filteredData = data
      .map(row => ({
        ...row,
        scd_valid_to: row.scd_valid_to || currentDateTime
      }))
      .filter(row => {
        const businessDateOnly = businessDate.split('T')[0];
        const rowBusinessDate = row.business_datetime.split(' ')[0];
        const validFrom = row.scd_valid_from.split(' ')[0];
        const validTo = row.scd_valid_to.split(' ')[0];
        
        return rowBusinessDate === businessDateOnly &&
               validFrom <= businessDateOnly &&
               validTo >= businessDateOnly;
      })
      .filter(row => {
        return row.occupancyDate >= occupancyDateStart &&
               row.occupancyDate <= occupancyDateEnd;
      });

    const revenues = filteredData.reduce((acc: RevenueAccumulator, row) => {
      const date = row.occupancyDate;
      if (!acc[date]) {
        acc[date] = {
          date,
          revenue: 0
        };
      }
      acc[date].revenue += row.foodRevenue;
      return acc;
    }, {});

    const response = Object.values(revenues)
      .sort((a, b) => a.date.localeCompare(b.date));

    return NextResponse.json(response);
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to calculate F&B revenue trends' },
      { status: 500 }
    );
  }
} 