import { NextResponse } from 'next/server';
import { parseHotelCSV } from '../../utils/csvParser';

export async function GET(request: Request) {
  try {
    const data = await parseHotelCSV();
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to fetch hotel data' },
      { status: 500 }
    );
  }
} 