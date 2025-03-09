import React, { useState } from 'react'
import { Card, CardHeader, CardContent, CardTitle } from "@/components/ui/card"
import { ResponsiveContainer, ComposedChart, CartesianGrid, XAxis, YAxis, Bar, Line, Tooltip } from 'recharts'

// Data for room type upgrades and downgrades
const roomTypeUpgradeData = [
  { 
    id: "Standard",
    bookedAndStayed: 750,
    freeUpgrades: 250,
    paidUpgrades: 45,
    downgrades: 0,
    occupancy: 75
  },
  { 
    id: "Deluxe",
    bookedAndStayed: 520,
    freeUpgrades: 0,
    paidUpgrades: 130,
    downgrades: 65,
    occupancy: 83
  },
  { 
    id: "Suite",
    bookedAndStayed: 320,
    freeUpgrades: 0,
    paidUpgrades: 80,
    downgrades: 35,
    occupancy: 62
  },
  { 
    id: "Executive",
    bookedAndStayed: 180,
    freeUpgrades: 0,
    paidUpgrades: 0,
    downgrades: 95,
    occupancy: 45
  }
];

// Define data series for tracking active state
const dataSeriesConfig = {
  bookedAndStayed: { name: "Booked & Stayed", color: "#18b0cc" },
  freeUpgrades: { name: "Free Upgrades", color: "#1eb09a" },
  paidUpgrades: { name: "Paid Upgrades", color: "#3b56de" },
  downgrades: { name: "Downgrades", color: "#713ddd" },
  occupancy: { name: "Occupancy %", color: "#e11d48" }
};

export function RoomTypeUpgradesDowngrades() {
  // State to track active data series
  const [activeSeries, setActiveSeries] = useState<string[]>(
    Object.keys(dataSeriesConfig)
  );

  // Function to toggle a data series
  const toggleSeries = (seriesName: string) => {
    setActiveSeries(prev => {
      // If removing the last item, do nothing (keep at least one active)
      if (prev.length === 1 && prev.includes(seriesName)) {
        return prev;
      }
      
      // Toggle the series
      return prev.includes(seriesName)
        ? prev.filter(s => s !== seriesName)
        : [...prev, seriesName];
    });
  };

  return (
    <Card className="bg-white shadow-lg rounded-lg overflow-hidden w-full border border-gray-300 -mt-2">
      <CardHeader className="pb-4">
        <CardTitle className="text-lg font-semibold text-gray-800">Room Types Upgrades & Downgrades</CardTitle>
      </CardHeader>
      <CardContent>
        <div style={{ height: 400 }}>
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart
              data={roomTypeUpgradeData}
              margin={{ top: 30, right: 60, left: 60, bottom: 20 }}
            >
              <CartesianGrid vertical={false} stroke="#f3f4f6" />
              <XAxis 
                dataKey="id" 
                angle={0}
                textAnchor="middle"
                height={60}
                tick={{ fontSize: 12 }}
                tickMargin={30}
              />
              <YAxis 
                yAxisId="left"
                orientation="left"
                tick={{ fontSize: 12 }}
                axisLine={false}
                tickLine={false}
                tickMargin={20}
                label={{ 
                  value: 'No. Rooms',
                  angle: -90,
                  position: 'insideLeft',
                  style: {
                    fontSize: 12,
                    fill: '#7d8694',
                    fontFamily: "'Geist Sans', sans-serif",
                  },
                  offset: -30
                }}
              />
              <YAxis 
                yAxisId="right"
                orientation="right"
                domain={[0, 100]}
                tick={{ fontSize: 12 }}
                tickMargin={20}
                axisLine={false}
                tickLine={false}
                label={{
                  value: 'Occupancy %',
                  angle: 90,
                  position: 'insideRight',
                  style: {
                    fontSize: 12,
                    fill: '#7d8694',
                    fontFamily: "'Geist Sans', sans-serif",
                  },
                  offset: -30
                }}
              />
              <Tooltip />
              {activeSeries.includes('bookedAndStayed') && (
                <Bar 
                  yAxisId="left" 
                  dataKey="bookedAndStayed" 
                  stackId="a" 
                  fill="#18b0cc" 
                  name="Booked & Stayed" 
                />
              )}
              {activeSeries.includes('freeUpgrades') && (
                <Bar 
                  yAxisId="left" 
                  dataKey="freeUpgrades" 
                  stackId="a" 
                  fill="#1eb09a" 
                  name="Free Upgrades" 
                />
              )}
              {activeSeries.includes('paidUpgrades') && (
                <Bar 
                  yAxisId="left" 
                  dataKey="paidUpgrades" 
                  stackId="a" 
                  fill="#3b56de" 
                  name="Paid Upgrades" 
                />
              )}
              {activeSeries.includes('downgrades') && (
                <Bar 
                  yAxisId="left" 
                  dataKey="downgrades" 
                  stackId="a" 
                  fill="#713ddd" 
                  name="Downgrades" 
                />
              )}
              {activeSeries.includes('occupancy') && (
                <Line 
                  yAxisId="right"
                  type="monotone" 
                  dataKey="occupancy" 
                  stroke="#e11d48" 
                  strokeWidth={2}
                  dot={false}
                  name="Occupancy %"
                />
              )}
            </ComposedChart>
          </ResponsiveContainer>
        </div>
        
        {/* Custom legend rendered directly in the component (not using Recharts Legend) */}
        <div className="flex flex-wrap justify-center gap-3 mt-6">
          {Object.entries(dataSeriesConfig).map(([key, config]) => {
            const isActive = activeSeries.includes(key);
            
            return (
              <div
                key={key}
                onClick={() => toggleSeries(key)}
                className={`
                  cursor-pointer bg-[#f0f4fa] px-3 py-1.5 rounded-full 
                  border border-[#e5eaf3] flex items-center gap-2
                  ${isActive ? '' : 'opacity-50'}
                `}
              >
                <div 
                  style={{ backgroundColor: config.color }} 
                  className="w-2 h-2 rounded-full" 
                />
                <span className="text-xs text-gray-500 font-medium">
                  {config.name}
                </span>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  )
} 