"use client";

import { useState, useRef, useEffect } from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { motion } from "framer-motion";
import {
  CalendarIcon,
  ChevronDownIcon,
  ArrowRightIcon,
  BedDoubleIcon,
  DollarSignIcon,
  UtensilsIcon,
  TrendingUpIcon,
  PercentIcon,
  BarChartIcon,
  LineChartIcon,
  PieChartIcon,
  Check,
  DownloadIcon,
  XIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
} from "lucide-react";
import { CustomDialog } from "../NumericalCardDetails";
import { DetailedDialog } from "../GraphCardDetails";
import { Calendar } from "@/components/ui/calendar";
import { format } from "date-fns";
import * as XLSX from "xlsx";
import { ResponsivePie } from "@nivo/pie";
import { ResponsiveBar, BarDatum } from "@nivo/bar";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";
import { cn } from "@/lib/utils";
import { HotelSelector } from "../new/HotelSelector";
import { DEFAULT_PROPERTY, type PropertyCode } from "@/lib/property";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

// Add the COLORS constant
const COLORS = [
  "rgba(59, 130, 246, 0.5)",
  "rgba(34, 197, 94, 0.5)",
  "rgba(234, 179, 8, 0.5)",
  "rgba(239, 68, 68, 0.5)",
];

interface NumericalDataItem {
  title: string;
  value: string | number;
  change: number;
  comparisonValue?: string | number;
  icon: React.ElementType;
}

interface ChartData {
  date: string;
  cancellations?: number;
  revenueLost?: number;
  noShows?: number;
  comparisonCancellations?: number;
  comparisonRevenueLost?: number;
  comparisonNoShows?: number;
}

// Add this type definition near the top with other types
type Tab = "All" | "Direct" | "OTA" | "Travel Agent" | "Corporate";

// Add this interface for the metric card
interface MetricCard {
  title: string;
  data?: Array<{ date: string; value: number; comparison?: number }>;
}

// Add these interfaces and data near the top with other interfaces
interface TimeSeriesData {
  date: string;
  value: number;
  comparison?: number;
}

// Add this interface for the table data
interface BookingChannelTableData {
  channel: string;
  rooms: number;
  totalRevenue: number;
  roomRevenue: number;
  fbRevenue: number;
  adr: number;
  occupancy: number;
  cancellations: number;
  avgLengthOfStay: number;
  leadTime: number;
}

// Add this data constant
const bookingChannelTableData: BookingChannelTableData[] = [
  {
    channel: "Direct",
    rooms: 150,
    totalRevenue: 35000,
    roomRevenue: 25000,
    fbRevenue: 10000,
    adr: 166.67,
    occupancy: 75,
    cancellations: 12,
    avgLengthOfStay: 3.5,
    leadTime: 45,
  },
  {
    channel: "OTA",
    rooms: 120,
    totalRevenue: 28000,
    roomRevenue: 20000,
    fbRevenue: 8000,
    adr: 155.5,
    occupancy: 70,
    cancellations: 15,
    avgLengthOfStay: 3.2,
    leadTime: 30,
  },
  {
    channel: "Travel Agent",
    rooms: 90,
    totalRevenue: 21000,
    roomRevenue: 15000,
    fbRevenue: 6000,
    adr: 145.8,
    occupancy: 65,
    cancellations: 8,
    avgLengthOfStay: 4.0,
    leadTime: 60,
  },
  {
    channel: "Corporate",
    rooms: 60,
    totalRevenue: 14000,
    roomRevenue: 10000,
    fbRevenue: 4000,
    adr: 138.9,
    occupancy: 55,
    cancellations: 5,
    avgLengthOfStay: 2.8,
    leadTime: 25,
  },
];

// Add this component for the table
const BookingChannelsTable = ({
  data,
  comparisonType,
}: {
  data: BookingChannelTableData[];
  comparisonType: string;
}) => {
  // Add comparison data with random changes
  const comparisonData = data.map((row) => ({
    ...row,
    rooms: Math.round(row.rooms * (1 + (Math.random() - 0.5) * 0.2)),
    totalRevenue: Math.round(
      row.totalRevenue * (1 + (Math.random() - 0.5) * 0.2)
    ),
    roomRevenue: Math.round(
      row.roomRevenue * (1 + (Math.random() - 0.5) * 0.2)
    ),
    fbRevenue: Math.round(row.fbRevenue * (1 + (Math.random() - 0.5) * 0.2)),
    adr: Math.round(row.adr * (1 + (Math.random() - 0.5) * 0.2) * 100) / 100,
    occupancy: Math.round(row.occupancy * (1 + (Math.random() - 0.5) * 0.2)),
    cancellations: Math.round(
      row.cancellations * (1 + (Math.random() - 0.5) * 0.2)
    ),
    avgLengthOfStay:
      Math.round(row.avgLengthOfStay * (1 + (Math.random() - 0.5) * 0.2) * 10) /
      10,
    leadTime: Math.round(row.leadTime * (1 + (Math.random() - 0.5) * 0.2)),
  }));

  const formatValue = (value: number, type: string) => {
    switch (type) {
      case "currency":
        return `€${value.toLocaleString()}`;
      case "percentage":
        return `${value}%`;
      default:
        return value.toLocaleString();
    }
  };

  const getChangePercentage = (current: number, comparison: number) => {
    const change = ((current - comparison) / comparison) * 100;
    return change.toFixed(1);
  };

  const renderCell = (
    currentValue: number,
    comparisonValue: number,
    type: string
  ) => {
    const changePercentage = Number(
      getChangePercentage(currentValue, comparisonValue)
    );

    return (
      <td className="px-6 py-4 whitespace-nowrap text-sm">
        <div className="flex flex-col">
          <span className="text-gray-900">
            {formatValue(currentValue, type)}
          </span>
          {comparisonType !== "No comparison" && (
            <div
              className={`text-xs mt-1 ${
                changePercentage > 0
                  ? "text-green-600"
                  : changePercentage < 0
                  ? "text-red-600"
                  : "text-gray-500"
              }`}
            >
              {changePercentage > 0 ? "↑" : changePercentage < 0 ? "↓" : ""}
              {Math.abs(changePercentage)}%
            </div>
          )}
        </div>
      </td>
    );
  };

  return (
    <div className="bg-white shadow-lg border border-gray-200 rounded-lg overflow-hidden">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-0">
            <tr>
              <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Channel
              </th>
              <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Rooms
              </th>
              <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Total Revenue
              </th>
              <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Room Revenue
              </th>
              <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                F&B Revenue
              </th>
              <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                ADR
              </th>
              <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Occupancy
              </th>
              <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Cancellations
              </th>
              <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Avg Length of Stay
              </th>
              <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Lead Time
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {data.map((row, index) => (
              <tr
                key={index}
                className={index % 2 === 0 ? "bg-white" : "bg-gray-50"}
              >
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                  {row.channel}
                </td>
                {renderCell(row.rooms, comparisonData[index].rooms, "number")}
                {renderCell(
                  row.totalRevenue,
                  comparisonData[index].totalRevenue,
                  "currency"
                )}
                {renderCell(
                  row.roomRevenue,
                  comparisonData[index].roomRevenue,
                  "currency"
                )}
                {renderCell(
                  row.fbRevenue,
                  comparisonData[index].fbRevenue,
                  "currency"
                )}
                {renderCell(row.adr, comparisonData[index].adr, "currency")}
                {renderCell(
                  row.occupancy,
                  comparisonData[index].occupancy,
                  "percentage"
                )}
                {renderCell(
                  row.cancellations,
                  comparisonData[index].cancellations,
                  "number"
                )}
                {renderCell(
                  row.avgLengthOfStay,
                  comparisonData[index].avgLengthOfStay,
                  "number"
                )}
                {renderCell(
                  row.leadTime,
                  comparisonData[index].leadTime,
                  "number"
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

// Add this near the top with other type definitions
type ViewType = "month" | "year";

// Add new type for metric selection
type MetricType = "soldRooms" | "revenue" | "adr";

// Add new interface for pickup data with multiple metrics
interface PickupMetrics {
  soldRooms: number | null;
  revenue: number | null;
  adr: number | null;
}

interface MonthlyPickupData {
  bookingDate: string;
  pickupData: {
    [stayDate: string]: PickupMetrics;
  };
}

interface YearlyPickupData {
  bookingMonth: string;
  bookingDate: string;
  pickupData: {
    [stayMonth: string]: PickupMetrics;
  };
}

// Add color coding helper function
const getChangeColor = (
  currentValue: number | null,
  previousValue: number | null
): string => {
  // Handle cases where previous value was null or 0 and current value is positive
  if (currentValue !== null && currentValue > 0) {
    if (previousValue === null || previousValue === 0) {
      return "bg-green-50"; // Highlight as green if pickup appears from nothing or zero
    }
  }

  if (currentValue === null || previousValue === null || previousValue === 0)
    return "";

  const percentageChange =
    ((currentValue - previousValue) / previousValue) * 100;

  // Positive changes
  if (percentageChange > 0) {
    if (percentageChange <= 10) return "bg-green-50";
    if (percentageChange <= 20) return "bg-green-100";
    return "bg-green-200";
  }

  // Negative changes
  const absoluteChange = Math.abs(percentageChange);
  if (absoluteChange <= 10) return "bg-yellow-50";
  if (absoluteChange <= 20) return "bg-orange-100";
  return "bg-red-100";
};

// Add this helper function near the other helpers
const calculateRowSum = (
  rowData: { [key: string]: PickupMetrics },
  metric: MetricType
): number => {
  return Object.values(rowData).reduce((sum, metrics) => {
    if (metrics && metrics[metric] !== null) {
      return sum + (metrics[metric] as number);
    }
    return sum;
  }, 0);
};

// Update the MonthlyPickupTable component to fetch data from the API
const MonthlyPickupTable = ({
  selectedMetric,
  businessDate,
  selectedProperty,
  onCellClick,
}: {
  selectedMetric: MetricType;
  businessDate: Date;
  selectedProperty: PropertyCode;
  onCellClick: (bookingDate: string, occupancyDate: string) => void;
}) => {
  const monthDates = generateMonthDatesUTC(businessDate);
  const today = new Date();
  const [pickupData, setPickupData] = useState<MonthlyPickupData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const year = businessDate.getFullYear();
        const month = String(businessDate.getMonth() + 1).padStart(2, "0");
        const day = String(businessDate.getDate()).padStart(2, "0");
        const businessDateParam = `${year}-${month}-${day}`;

        const response = await fetch(
          `/api/pickup/month?businessDate=${businessDateParam}&property=${selectedProperty}`
        );

        if (!response.ok) {
          throw new Error("Failed to fetch pickup data");
        }

        const data = await response.json();
        console.log("Monthly Pickup API Response:", {
          endpoint: `/api/pickup/month?businessDate=${businessDateParam}&property=${selectedProperty}`,
          data: data,
        });
        setPickupData(data);
      } catch (err) {
        console.error("Error fetching pickup data:", err);
        setError(
          err instanceof Error ? err.message : "An unknown error occurred"
        );
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [businessDate, selectedProperty]);

  const formatValue = (metrics: PickupMetrics | undefined) => {
    if (
      !metrics ||
      metrics[selectedMetric] === null ||
      metrics[selectedMetric] === 0
    )
      return "-";
    switch (selectedMetric) {
      case "soldRooms":
        return metrics.soldRooms;
      case "revenue":
        return `€${metrics.revenue?.toLocaleString()}`;
      case "adr":
        return metrics.adr ? `€${metrics.adr.toLocaleString()}` : "-";
    }
  };

  const getCellValue = (metrics: PickupMetrics | undefined) => {
    if (!metrics || metrics[selectedMetric] === null) return null;
    return metrics[selectedMetric];
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        Loading pickup data...
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex justify-center items-center h-64 text-red-500">
        Error: {error}
      </div>
    );
  }

  return (
    <div className="overflow-x-auto border border-gray-200 rounded-lg relative max-h-[calc(100vh-180px)]">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50 sticky top-0 z-20">
          <tr>
            <th className="sticky left-0 top-0 z-30 bg-gray-50 px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-r border-b">
              Business Date
            </th>
            {monthDates.map((dateString) => {
              const displayDate = new Date(dateString + "T00:00:00Z");
              return (
                <th
                  key={dateString}
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b"
                >
                  {format(displayDate, "d MMM")}
                </th>
              );
            })}
            <th className="sticky right-0 top-0 z-30 bg-gray-50 px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-l border-b">
              SUM
            </th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {pickupData.map((row, rowIndex) => {
            const rowSum = calculateRowSum(row.pickupData, selectedMetric);

            return (
              <tr key={row.bookingDate}>
                <td className="sticky left-0 z-10 bg-white px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 border-r">
                  {format(new Date(row.bookingDate + "T00:00:00Z"), "d MMM")}
                </td>
                {monthDates.map((dateString) => {
                  const dateMetrics = row.pickupData[dateString] || {
                    soldRooms: null,
                    revenue: null,
                    adr: null,
                  };

                  const currentValue = getCellValue(dateMetrics);
                  const previousValue =
                    rowIndex > 0
                      ? getCellValue(
                          pickupData[rowIndex - 1]?.pickupData?.[dateString]
                        )
                      : null;

                  const colorClass = getChangeColor(
                    currentValue,
                    previousValue
                  );

                  return (
                    <td
                      key={dateString}
                      className={`px-6 py-4 whitespace-nowrap text-sm text-gray-500 transition-colors ${colorClass} cursor-pointer hover:bg-gray-100`}
                      onClick={() =>
                        onCellClick(
                          format(
                            new Date(row.bookingDate + "T00:00:00Z"),
                            "dd MMM yyyy"
                          ),
                          format(
                            new Date(dateString + "T00:00:00Z"),
                            "dd MMM yyyy"
                          )
                        )
                      }
                    >
                      {formatValue(dateMetrics)}
                    </td>
                  );
                })}
                <td className="sticky right-0 z-10 bg-white px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 borde border-gray-200">
                  {selectedMetric === "revenue"
                    ? `€${rowSum.toLocaleString()}`
                    : selectedMetric === "adr"
                    ? `€${Math.round(rowSum).toLocaleString()}`
                    : rowSum.toLocaleString()}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};

// Update the YearlyPickupTable component to fetch data from the API
const YearlyPickupTable = ({
  selectedMetric,
  businessDate,
  selectedProperty,
  onCellClick,
}: {
  selectedMetric: MetricType;
  businessDate: Date;
  selectedProperty: PropertyCode;
  onCellClick: (bookingDate: string, occupancyMonth: string) => void;
}) => {
  // Get year months
  const yearMonths = generateYearMonths(businessDate);
  const [pickupData, setPickupData] = useState<YearlyPickupData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const year = businessDate.getFullYear();
        const month = String(businessDate.getMonth() + 1).padStart(2, "0");
        const day = String(businessDate.getDate()).padStart(2, "0");
        const businessDateParam = `${year}-${month}-${day}`;

        const response = await fetch(
          `/api/pickup/year?businessDate=${businessDateParam}&property=${selectedProperty}`
        );

        if (!response.ok) {
          throw new Error("Failed to fetch yearly pickup data");
        }

        const data = await response.json();
        console.log("Yearly Pickup API Response:", {
          endpoint: `/api/pickup/year?businessDate=${businessDateParam}&property=${selectedProperty}`,
          data: data,
        });
        setPickupData(data);
      } catch (err) {
        console.error("Error fetching yearly pickup data:", err);
        setError(
          err instanceof Error ? err.message : "An unknown error occurred"
        );
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [businessDate, selectedProperty]);

  const formatValue = (metrics: PickupMetrics | undefined) => {
    if (
      !metrics ||
      metrics[selectedMetric] === null ||
      metrics[selectedMetric] === 0
    )
      return "-";
    switch (selectedMetric) {
      case "soldRooms":
        return metrics.soldRooms;
      case "revenue":
        return `€${metrics.revenue?.toLocaleString()}`;
      case "adr":
        return metrics.adr ? `€${metrics.adr.toLocaleString()}` : "-";
    }
  };

  const getCellValue = (metrics: PickupMetrics | undefined) => {
    if (!metrics || metrics[selectedMetric] === null) return null;
    return metrics[selectedMetric];
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        Loading yearly pickup data...
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex justify-center items-center h-64 text-red-500">
        Error: {error}
      </div>
    );
  }

  return (
    <div className="overflow-x-auto border border-gray-200 rounded-lg relative max-h-[calc(100vh-180px)]">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50 sticky top-0 z-20">
          <tr>
            <th className="sticky left-0 top-0 z-30 bg-gray-50 px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-r border-b">
              Business Date
            </th>
            {yearMonths.map((month) => (
              <th
                key={month}
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b"
              >
                {month}
              </th>
            ))}
            <th className="sticky right-0 top-0 z-30 bg-gray-50 px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-l border-b">
              SUM
            </th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {pickupData.map((row, rowIndex) => {
            const rowSum = calculateRowSum(row.pickupData, selectedMetric);

            return (
              <tr key={row.bookingDate}>
                <td className="sticky left-0 z-10 bg-white px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 border-r">
                  {format(new Date(row.bookingDate), "d MMM")}
                </td>
                {yearMonths.map((month) => {
                  const dateMetrics = row.pickupData[month] || {
                    soldRooms: null,
                    revenue: null,
                    adr: null,
                  };

                  const currentValue = getCellValue(dateMetrics);
                  const previousValue =
                    rowIndex > 0
                      ? getCellValue(
                          pickupData[rowIndex - 1]?.pickupData?.[month]
                        )
                      : null;

                  const colorClass = getChangeColor(
                    currentValue,
                    previousValue
                  );

                  return (
                    <td
                      key={month}
                      className={`px-6 py-4 whitespace-nowrap text-sm text-gray-500 transition-colors ${colorClass} cursor-pointer hover:bg-gray-100`}
                      onClick={() =>
                        onCellClick(
                          format(new Date(row.bookingDate), "dd MMM yyyy"),
                          month
                        )
                      }
                    >
                      {formatValue(dateMetrics)}
                    </td>
                  );
                })}
                <td className="sticky right-0 z-10 bg-white px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 border-l">
                  {selectedMetric === "revenue"
                    ? `€${rowSum.toLocaleString()}`
                    : selectedMetric === "adr"
                    ? `€${Math.round(rowSum).toLocaleString()}`
                    : rowSum.toLocaleString()}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};

export function PickupDashboard() {
  const [selectedMetric, setSelectedMetric] = useState<MetricType>("soldRooms");
  const [selectedView, setSelectedView] = useState<ViewType>("month");
  const [selectedProperty, setSelectedProperty] =
    useState<PropertyCode>(DEFAULT_PROPERTY);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [businessDate, setBusinessDate] = useState<Date>(new Date());
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [showStatsModal, setShowStatsModal] = useState(false);
  const [selectedCell, setSelectedCell] = useState<{
    bookingDate: string;
    occupancyDateOrMonth: string;
  } | null>(null);
  const [statsData, setStatsData] = useState({
    roomsSold: 0,
    revenue: 0,
    adr: 0,
    occupancy: 0,
    roomsCancelled: 0,
    revenueLost: 0,
    roomsAvailable: 0,
    revPAR: 0,
    // Variances
    roomsSoldVariance: 0,
    revenueVariance: 0,
    adrVariance: 0,
    occupancyVariance: 0,
    roomsCancelledVariance: 0,
    revenueLostVariance: 0,
    roomsAvailableVariance: 0,
    revPARVariance: 0,
  });
  const [isLoadingStats, setIsLoadingStats] = useState(false);

  useEffect(() => {
    setSelectedDate(new Date());
  }, [businessDate]);

  const handleCellClick = async (
    bookingDateStr: string,
    occupancyDateOrMonthStr: string
  ) => {
    setSelectedCell({
      bookingDate: bookingDateStr,
      occupancyDateOrMonth: occupancyDateOrMonthStr,
    });
    setShowStatsModal(true);
    setIsLoadingStats(true);

    const apiBusinessDate = format(businessDate, "yyyy-MM-dd");

    try {
      const params = new URLSearchParams({
        businessDate: apiBusinessDate,
        bookingDate: format(new Date(bookingDateStr), "yyyy-MM-dd"),
        property: selectedProperty,
      });

      if (selectedView === "month") {
        params.append(
          "occupancyDate",
          format(new Date(occupancyDateOrMonthStr), "yyyy-MM-dd")
        );
      } else {
        params.append("occupancyMonth", occupancyDateOrMonthStr);
      }

      const response = await fetch(`/api/pickup/stats?${params.toString()}`);

      if (!response.ok) {
        throw new Error("Failed to fetch stats data");
      }

      const data = await response.json();
      console.log("Stats API Response:", data);

      setStatsData({
        roomsSold: data.roomsSold,
        revenue: data.revenue,
        adr: data.adr,
        occupancy: data.occupancy,
        roomsCancelled: data.roomsCancelled,
        revenueLost: data.revenueLost,
        roomsAvailable: data.roomsAvailable,
        revPAR: data.revPAR,
        roomsSoldVariance: data.roomsSoldVariance,
        revenueVariance: data.revenueVariance,
        adrVariance: data.adrVariance,
        occupancyVariance: data.occupancyVariance,
        roomsCancelledVariance: data.roomsCancelledVariance,
        revenueLostVariance: data.revenueLostVariance,
        roomsAvailableVariance: data.roomsAvailableVariance,
        revPARVariance: data.revPARVariance,
      });
    } catch (error) {
      console.error("Error fetching stats data:", error);
    } finally {
      setIsLoadingStats(false);
    }
  };

  const closeStatsModal = () => {
    setShowStatsModal(false);
  };

  return (
    <div className="flex-1 overflow-auto bg-[#f5f8ff]">
      {/* Header Section */}
      <div className="xl:fixed top-0 left-0 xl:left-[256px] right-0 z-30 flex flex-col xl:flex-row xl:items-center xl:justify-between bg-white py-4 xl:py-6 xl:px-12 border-b border-gray-300 shadow-sm">
        {/* Title - Hide on smaller screens, show on xl+ */}
        <div className="hidden xl:block px-4 xl:px-0 mb-4 xl:mb-0">
          <h2 className="text-xl xl:text-2xl font-bold text-gray-800">
            Pickup
          </h2>
        </div>

        {/* Filters Container - Make horizontally scrollable */}
        <div className="flex flex-nowrap items-end gap-x-4 xl:gap-x-6 overflow-x-auto pb-2 xl:pb-0 w-full xl:w-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100 px-4 md:px-6 xl:px-0">
          {/* Business Date Filter */}
          <div className="flex flex-col flex-shrink-0">
            <span className="text-xs text-gray-500 mb-2">Business Date</span>
            <DropdownMenu
              open={isCalendarOpen}
              onOpenChange={setIsCalendarOpen}
            >
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  className="bg-[#f2f8ff] hover:bg-[#f2f8ff] text-[#342630] rounded-full px-4"
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {format(businessDate, "dd MMM yyyy")}
                  <ChevronDownIcon className="ml-2 h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="p-0" align="end">
                <Calendar
                  mode="single"
                  selected={businessDate}
                  onSelect={(date) => {
                    if (date) {
                      setBusinessDate(date);
                      setIsCalendarOpen(false);
                    }
                  }}
                  initialFocus
                />
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* View Type Filter */}
          <div className="flex flex-col flex-shrink-0">
            <span className="text-xs text-gray-500 mb-2">View type</span>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  className="bg-[#f2f8ff] hover:bg-[#f2f8ff] text-[#342630] rounded-full px-4"
                >
                  {selectedView === "month" ? "Month View" : "Year View"}{" "}
                  <ChevronDownIcon className="ml-2 h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuItem onSelect={() => setSelectedView("month")}>
                  Month View
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={() => setSelectedView("year")}>
                  Year View
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* Metric Filter */}
          <div className="flex flex-col flex-shrink-0">
            <span className="text-xs text-gray-500 mb-2">Metric</span>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  className="bg-[#f2f8ff] hover:bg-[#f2f8ff] text-[#342630] rounded-full px-4"
                >
                  {selectedMetric === "soldRooms"
                    ? "Sold Rooms"
                    : selectedMetric === "revenue"
                    ? "Revenue"
                    : "ADR"}{" "}
                  <ChevronDownIcon className="ml-2 h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuItem
                  onSelect={() => setSelectedMetric("soldRooms")}
                >
                  Sold Rooms
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={() => setSelectedMetric("revenue")}>
                  Revenue
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={() => setSelectedMetric("adr")}>
                  ADR
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* Hotel Selector Filter */}
          <div className="flex flex-col flex-shrink-0">
            <span className="text-xs text-gray-500 mb-2">Property</span>
            <HotelSelector
              mode="property"
              selectedProperty={selectedProperty}
              setSelectedProperty={setSelectedProperty}
            />
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      {/* Use responsive padding classes, including specific xl:pt */}
      <div className="pt-4 md:pt-6 lg:pt-8 xl:pt-[140px] p-4 md:p-6 lg:p-8 xl:px-12">
        {/* Title - Show ONLY on screens smaller than xl */}
        <div className="block xl:hidden mb-6 md:mb-8">
          <h2 className="text-xl md:text-2xl font-bold text-gray-800">
            Pickup
          </h2>
        </div>

        {/* Table Container */}
        {/* Max-height remains, removed mt-6 */}
        {/* Added responsive margin top only for non-xl screens to space below title */}
        <div className="overflow-x-auto border border-gray-200 rounded-lg relative max-h-[calc(100vh-180px)] mt-0 xl:mt-0">
          {selectedView === "month" ? (
            <MonthlyPickupTable
              selectedMetric={selectedMetric}
              businessDate={businessDate}
              selectedProperty={selectedProperty}
              onCellClick={handleCellClick}
            />
          ) : (
            <YearlyPickupTable
              selectedMetric={selectedMetric}
              businessDate={businessDate}
              selectedProperty={selectedProperty}
              onCellClick={handleCellClick}
            />
          )}
        </div>
      </div>

      {/* Stats Modal Dialog - with responsive improvements */}
      <Dialog open={showStatsModal} onOpenChange={setShowStatsModal}>
        <DialogContent className="max-w-3xl p-4 sm:p-6 h-auto max-h-[95vh] overflow-auto">
          <DialogHeader className="mb-4 pr-6 text-left">
            <DialogTitle className="text-xl sm:text-2xl font-bold pr-4">
              Performance Summary for {selectedCell?.occupancyDateOrMonth}
            </DialogTitle>
            <DialogDescription className="text-sm text-gray-500 pt-1">
              Business date: {selectedCell?.bookingDate}
            </DialogDescription>
          </DialogHeader>

          {isLoadingStats ? (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 md:gap-4">
              {Array.from({ length: 8 }).map((_, index) => (
                <div
                  key={index}
                  className="rounded-lg border border-gray-100 p-3 sm:p-5 flex flex-col items-center"
                >
                  <div className="w-24 h-4 bg-gray-200 animate-pulse rounded mb-2 sm:mb-4"></div>
                  <div className="w-16 h-6 sm:h-8 bg-gray-200 animate-pulse rounded mt-3 mb-4 sm:mb-8"></div>
                  <div className="w-24 h-4 bg-gray-200 animate-pulse rounded"></div>
                  <div className="w-12 h-4 bg-gray-200 animate-pulse rounded mt-1"></div>
                </div>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 md:gap-4">
              {/* First row */}
              <div className="rounded-lg border border-gray-100 p-3 sm:p-5 flex flex-col items-center text-center">
                <div className="text-xs sm:text-sm text-gray-500 font-medium">
                  Rooms Sold
                </div>
                <div className="text-xl sm:text-3xl font-bold mt-2 sm:mt-4 mb-4 sm:mb-8">
                  {statsData.roomsSold}
                </div>
                <div className="text-xs sm:text-sm text-gray-500">
                  Variance LY
                </div>
                <div
                  className={`text-sm sm:text-md font-medium ${
                    statsData.roomsSoldVariance >= 0
                      ? "text-green-500"
                      : "text-red-500"
                  }`}
                >
                  {statsData.roomsSoldVariance >= 0 ? "+" : ""}
                  {statsData.roomsSoldVariance}%
                </div>
              </div>

              <div className="rounded-lg border border-gray-100 p-3 sm:p-5 flex flex-col items-center text-center">
                <div className="text-xs sm:text-sm text-gray-500 font-medium">
                  Revenue
                </div>
                <div className="text-xl sm:text-3xl font-bold mt-2 sm:mt-4 mb-4 sm:mb-8">
                  €{statsData.revenue}
                </div>
                <div className="text-xs sm:text-sm text-gray-500">
                  Variance LY
                </div>
                <div
                  className={`text-sm sm:text-md font-medium ${
                    statsData.revenueVariance >= 0
                      ? "text-green-500"
                      : "text-red-500"
                  }`}
                >
                  {statsData.revenueVariance >= 0 ? "+" : ""}
                  {statsData.revenueVariance}%
                </div>
              </div>

              <div className="rounded-lg border border-gray-100 p-3 sm:p-5 flex flex-col items-center text-center">
                <div className="text-xs sm:text-sm text-gray-500 font-medium">
                  ADR
                </div>
                <div className="text-xl sm:text-3xl font-bold mt-2 sm:mt-4 mb-4 sm:mb-8">
                  €{statsData.adr}
                </div>
                <div className="text-xs sm:text-sm text-gray-500">
                  Variance LY
                </div>
                <div
                  className={`text-sm sm:text-md font-medium ${
                    statsData.adrVariance >= 0
                      ? "text-green-500"
                      : "text-red-500"
                  }`}
                >
                  {statsData.adrVariance >= 0 ? "+" : ""}
                  {statsData.adrVariance}%
                </div>
              </div>

              <div className="rounded-lg border border-gray-100 p-3 sm:p-5 flex flex-col items-center text-center">
                <div className="text-xs sm:text-sm text-gray-500 font-medium">
                  Occupancy
                </div>
                <div className="text-xl sm:text-3xl font-bold mt-2 sm:mt-4 mb-4 sm:mb-8">
                  {statsData.occupancy}%
                </div>
                <div className="text-xs sm:text-sm text-gray-500">
                  Variance LY
                </div>
                <div
                  className={`text-sm sm:text-md font-medium ${
                    statsData.occupancyVariance >= 0
                      ? "text-green-500"
                      : "text-red-500"
                  }`}
                >
                  {statsData.occupancyVariance >= 0 ? "+" : ""}
                  {statsData.occupancyVariance}%
                </div>
              </div>

              {/* Second row */}
              <div className="rounded-lg border border-gray-100 p-3 sm:p-5 flex flex-col items-center text-center">
                <div className="text-xs sm:text-sm text-gray-500 font-medium">
                  Rooms Cancelled
                </div>
                <div className="text-xl sm:text-3xl font-bold mt-2 sm:mt-4 mb-4 sm:mb-8">
                  {statsData.roomsCancelled}
                </div>
                <div className="text-xs sm:text-sm text-gray-500">
                  Variance LY
                </div>
                <div
                  className={`text-sm sm:text-md font-medium ${
                    statsData.roomsCancelledVariance >= 0
                      ? "text-green-500"
                      : "text-red-500"
                  }`}
                >
                  {statsData.roomsCancelledVariance >= 0 ? "+" : ""}
                  {statsData.roomsCancelledVariance}%
                </div>
              </div>

              <div className="rounded-lg border border-gray-100 p-3 sm:p-5 flex flex-col items-center text-center">
                <div className="text-xs sm:text-sm text-gray-500 font-medium">
                  Revenue Lost
                </div>
                <div className="text-xl sm:text-3xl font-bold mt-2 sm:mt-4 mb-4 sm:mb-8">
                  €{statsData.revenueLost}
                </div>
                <div className="text-xs sm:text-sm text-gray-500">
                  Variance LY
                </div>
                <div
                  className={`text-sm sm:text-md font-medium ${
                    statsData.revenueLostVariance >= 0
                      ? "text-green-500"
                      : "text-red-500"
                  }`}
                >
                  {statsData.revenueLostVariance >= 0 ? "+" : ""}
                  {statsData.revenueLostVariance}%
                </div>
              </div>

              <div className="rounded-lg border border-gray-100 p-3 sm:p-5 flex flex-col items-center text-center">
                <div className="text-xs sm:text-sm text-gray-500 font-medium">
                  Rooms Available
                </div>
                <div className="text-xl sm:text-3xl font-bold mt-2 sm:mt-4 mb-4 sm:mb-8">
                  {statsData.roomsAvailable}
                </div>
                <div className="text-xs sm:text-sm text-gray-500">
                  Variance LY
                </div>
                <div
                  className={`text-sm sm:text-md font-medium ${
                    statsData.roomsAvailableVariance >= 0
                      ? "text-green-500"
                      : "text-red-500"
                  }`}
                >
                  {statsData.roomsAvailableVariance >= 0 ? "+" : ""}
                  {statsData.roomsAvailableVariance}%
                </div>
              </div>

              <div className="rounded-lg border border-gray-100 p-3 sm:p-5 flex flex-col items-center text-center">
                <div className="text-xs sm:text-sm text-gray-500 font-medium">
                  RevPAR
                </div>
                <div className="text-xl sm:text-3xl font-bold mt-2 sm:mt-4 mb-4 sm:mb-8">
                  €{statsData.revPAR}
                </div>
                <div className="text-xs sm:text-sm text-gray-500">
                  Variance LY
                </div>
                <div
                  className={`text-sm sm:text-md font-medium ${
                    statsData.revPARVariance >= 0
                      ? "text-green-500"
                      : "text-red-500"
                  }`}
                >
                  {statsData.revPARVariance >= 0 ? "+" : ""}
                  {statsData.revPARVariance}%
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Helper function to generate UTC date strings for the month of the given date
// Renamed from generateMonthDates and updated for UTC consistency
const generateMonthDatesUTC = (referenceDate: Date): string[] => {
  // Use UTC components of the reference date (passed as businessDate)
  const year = referenceDate.getUTCFullYear();
  const month = referenceDate.getUTCMonth(); // 0-indexed UTC month

  // Calculate the number of days in the month using UTC
  // new Date(Date.UTC(year, month + 1, 0)) gives the last day of the target month in UTC
  const daysInMonth = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();

  return Array.from({ length: daysInMonth }, (_, i) => {
    // Generate each date within the month using UTC
    const dateUTC = new Date(Date.UTC(year, month, i + 1));

    // Format the UTC date as YYYY-MM-DD string, matching backend keys
    const y = dateUTC.getUTCFullYear();
    const m = (dateUTC.getUTCMonth() + 1).toString().padStart(2, "0"); // Pad month
    const d = dateUTC.getUTCDate().toString().padStart(2, "0"); // Pad day
    return `${y}-${m}-${d}`;
  });
};

// Helper function to generate months for the year (ensure consistency if needed, seems ok for now)
const generateYearMonths = (selectedDate: Date) => {
  const year = selectedDate.getFullYear();
  const currentMonth = selectedDate.getMonth();
  const months = [];

  // Only generate months from current month to end of year
  for (let i = currentMonth; i < 12; i++) {
    months.push(format(new Date(year, i, 1), "MMM yyyy"));
  }
  return months;
};
