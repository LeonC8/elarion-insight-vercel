"use client";

import * as React from "react";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { ChevronRight } from "lucide-react";
import { MainTimeSeriesDialog } from "./dialogs/MainTimeSeriesDialog";

interface KpiProps {
  title: string;
  currentValue: number;
  percentageChange: number;
  prefix?: string;
  suffix?: string;
  color?: "green" | "blue";
  flipColors?: boolean; // When true, positive change = red, negative change = green
  chartData?: {
    date: string;
    current: number;
    previous: number;
  }[];
}

export function Kpi({
  title,
  currentValue,
  percentageChange,
  prefix = "€",
  suffix,
  color = "green",
  flipColors = false,
  chartData,
}: KpiProps) {
  const [showDetails, setShowDetails] = React.useState(false);
  const formattedValue = Math.round(currentValue).toLocaleString();
  const changePercent = Math.round(percentageChange * 10) / 10;
  const isPositive = changePercent > 0;

  return (
    <>
      <Card
        className="cursor-pointer border-gray-300"
        onClick={() => setShowDetails(true)}
      >
        <CardHeader>
          <div className="flex justify-between items-start">
            <div className="flex flex-col space-y-2">
              <CardTitle className="text-md text-muted-foreground font-normal mb-3 ">
                {title}
              </CardTitle>
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-2xl font-bold leading-none">
                  {prefix && prefix}
                  {formattedValue}
                  {suffix && suffix}
                </span>
                <span
                  className={`text-xs px-2 py-0.5 rounded ${
                    flipColors
                      ? isPositive
                        ? "text-red-600 bg-red-100/50 border border-red-600"
                        : "text-green-600 bg-green-100/50 border border-green-600"
                      : isPositive
                      ? "text-green-600 bg-green-100/50 border border-green-600"
                      : "text-red-600 bg-red-100/50 border border-red-600"
                  }`}
                >
                  {isPositive ? "+" : ""}
                  {changePercent}%
                </span>
              </div>
            </div>
            <ChevronRight className="h-5 w-5 text-muted-foreground" />
          </div>
        </CardHeader>
      </Card>

      {chartData && (
        <MainTimeSeriesDialog
          open={showDetails}
          onOpenChange={setShowDetails}
          title={title}
          currentValue={currentValue}
          percentageChange={percentageChange}
          prefix={prefix}
          suffix={suffix}
          mainTimeSeriesData={chartData}
        />
      )}
    </>
  );
}
