import { parse } from 'csv-parse';
import fs from 'fs';
import path from 'path';
import { HotelData } from '../types/hotel';

export async function parseHotelCSV(): Promise<HotelData[]> {
  const csvFilePath = path.join(process.cwd(), 'data', 'hotel_data.csv');
  
  return new Promise((resolve, reject) => {
    const results: HotelData[] = [];

    fs.createReadStream(csvFilePath)
      .pipe(
        parse({
          columns: true,
          skip_empty_lines: true,
        })
      )
      .on('data', (data) => {
        // Convert numeric strings to numbers
        const parsedData = {
          ...data,
          physicalRooms: Number(data.physicalRooms),
          roomsSold: Number(data.roomsSold),
          roomRevenue: Number(data.roomRevenue),
          roomArrivals: Number(data.roomArrivals),
          roomDepartures: Number(data.roomDepartures),
          totalRevenue: Number(data.totalRevenue),
          cancelledRooms: Number(data.cancelledRooms),
          foodRevenue: Number(data.foodRevenue),
          noShowRooms: Number(data.noShowRooms),
          ooRooms: Number(data.ooRooms),
          osRooms: Number(data.osRooms),
          otherRevenue: Number(data.otherRevenue),
          availableRooms: Number(data.availableRooms),
        };
        results.push(parsedData);
      })
      .on('end', () => {
        resolve(results);
      })
      .on('error', (error) => {
        reject(error);
      });
  });
} 