import { NextResponse } from 'next/server';
import { parseHotelCSV } from '../../../utils/csvParser';

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
      // Handle null valid_to dates
      .map(row => ({
        ...row,
        scd_valid_to: row.scd_valid_to || currentDateTime
      }))
      // Filter by business_datetime within SCD range
      .filter(row => {
        const businessDateOnly = businessDate.split('T')[0];
        const rowBusinessDate = row.business_datetime.split(' ')[0];
        const validFrom = row.scd_valid_from.split(' ')[0];
        const validTo = row.scd_valid_to.split(' ')[0];
        
        return rowBusinessDate === businessDateOnly &&
               validFrom <= businessDateOnly &&
               validTo >= businessDateOnly;
      })
      // Filter by occupancy date range
      .filter(row => {
        return row.occupancyDate >= occupancyDateStart &&
               row.occupancyDate <= occupancyDateEnd;
      });

    // Calculate metrics
    const metrics = {
      soldRooms: filteredData.reduce((sum, row) => sum + row.roomsSold, 0),
      totalRooms: filteredData.reduce((sum, row) => sum + row.physicalRooms, 0),
      roomRevenue: filteredData.reduce((sum, row) => sum + row.roomRevenue, 0),
      fbRevenue: filteredData.reduce((sum, row) => sum + row.foodRevenue, 0),
      totalRevenue: filteredData.reduce((sum, row) => sum + row.totalRevenue, 0),
      totalAvailableRooms: filteredData.reduce((sum, row) => sum + row.availableRooms, 0),
    };

    console.log(metrics.totalAvailableRooms)
    
    // Calculate derived metrics
    const response = {
      soldRooms: metrics.soldRooms,
      totalRooms: metrics.totalRooms,
      roomRevenue: metrics.roomRevenue,
      fbRevenue: metrics.fbRevenue,
      adr: metrics.soldRooms > 0 ? metrics.roomRevenue / metrics.soldRooms : 0,
      occupancy: metrics.totalAvailableRooms > 0 ? 
        (metrics.soldRooms / metrics.totalAvailableRooms) * 100 : 0,
      revPAR: metrics.totalAvailableRooms > 0 ? 
        metrics.roomRevenue / metrics.totalAvailableRooms : 0,
      trevPAR: metrics.totalAvailableRooms > 0 ? 
        metrics.totalRevenue / metrics.totalAvailableRooms : 0,
    };

    return NextResponse.json(response);
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to calculate metrics' },
      { status: 500 }
    );
  }
}