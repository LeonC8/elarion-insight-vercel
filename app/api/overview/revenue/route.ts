import { NextResponse } from 'next/server';
import { parseHotelCSV } from '../../../utils/csvParser';

interface DailyRevenue {
  date: string;
  revenue: number;
}

interface RevenueAccumulator {
  [key: string]: DailyRevenue;
}

interface RevenueResponse {
  dailyRevenue: DailyRevenue[];
  distribution: {
    roomsRevenue: {
      percentage: number;
      amount: number;
    };
    fbRevenue: {
      percentage: number;
      amount: number;
    };
    otherRevenue: {
      percentage: number;
      amount: number;
    };
    totalRevenue: number;
  };
}

export async function GET(request: Request) {
  try {
    // Get URL parameters
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

    // Process and filter data
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

    // Calculate daily revenue fluctuations
    const revenues = filteredData.reduce((acc: RevenueAccumulator, row) => {
      const date = row.occupancyDate;
      if (!acc[date]) {
        acc[date] = {
          date,
          revenue: 0
        };
      }
      acc[date].revenue += row.totalRevenue;
      return acc;
    }, {});

    // Calculate total revenue distribution
    const totalRevenue = filteredData.reduce((sum, row) => sum + row.totalRevenue, 0);
    const roomsRevenue = filteredData.reduce((sum, row) => sum + row.roomRevenue, 0);
    const fbRevenue = filteredData.reduce((sum, row) => sum + row.foodRevenue, 0);
    const otherRevenue = totalRevenue - roomsRevenue - fbRevenue;

    const response: RevenueResponse = {
      dailyRevenue: Object.values(revenues).sort((a, b) => a.date.localeCompare(b.date)),
      distribution: {
        roomsRevenue: {
          percentage: Math.round((roomsRevenue / totalRevenue) * 100),
          amount: roomsRevenue
        },
        fbRevenue: {
          percentage: Math.round((fbRevenue / totalRevenue) * 100),
          amount: fbRevenue
        },
        otherRevenue: {
          percentage: Math.round((otherRevenue / totalRevenue) * 100),
          amount: otherRevenue
        },
        totalRevenue
      }
    };

    return NextResponse.json(response);
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to calculate revenue trends' },
      { status: 500 }
    );
  }
} 