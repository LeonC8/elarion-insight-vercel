"use client";

import * as React from "react";
import { format } from "date-fns";
import { Calendar as CalendarIcon } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

export type DateRange = {
  from: Date | undefined;
  to: Date | undefined;
};

interface SeparateDatePickersProps {
  dateRange?: DateRange;
  onDateRangeChange?: (dateRange: DateRange | undefined) => void;
  className?: string;
  maxDate?: Date;
}

export function SeparateDatePickers({
  dateRange,
  onDateRangeChange,
  className,
  maxDate,
}: SeparateDatePickersProps) {
  const [isStartOpen, setIsStartOpen] = React.useState(false);
  const [isEndOpen, setIsEndOpen] = React.useState(false);

  const handleStartDateChange = (date: Date | undefined) => {
    const newRange = { from: date, to: dateRange?.to };
    onDateRangeChange?.(newRange);
    setIsStartOpen(false);

    // Auto-open end date picker if start date is selected but no end date
    if (date && !dateRange?.to) {
      setTimeout(() => setIsEndOpen(true), 100);
    }
  };

  const handleEndDateChange = (date: Date | undefined) => {
    const newRange = { from: dateRange?.from, to: date };
    onDateRangeChange?.(newRange);
    setIsEndOpen(false);
  };

  const formatDate = (date: Date | undefined) => {
    return date ? format(date, "dd MMM yy") : "Select";
  };

  return (
    <div className={cn("flex items-center gap-2", className)}>
      {/* Start Date Picker */}
      <div className="flex flex-col">
        <span className="text-xs text-gray-500 mb-1">From</span>
        <Popover open={isStartOpen} onOpenChange={setIsStartOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="ghost"
              className={cn(
                "bg-[#f2f8ff] hover:bg-[#f2f8ff] text-[#342630] rounded-full px-2 py-1 text-sm justify-start h-8 min-w-[100px]",
                !dateRange?.from && "text-muted-foreground"
              )}
            >
              <CalendarIcon className="mr-1 h-3 w-3" />
              {formatDate(dateRange?.from)}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start" side="left">
            <Calendar
              mode="single"
              selected={dateRange?.from}
              onSelect={handleStartDateChange}
              disabled={(date) => (maxDate ? date > maxDate : false)}
              initialFocus
            />
          </PopoverContent>
        </Popover>
      </div>

      {/* Separator */}
      <div className="text-gray-400 mt-6">-</div>

      {/* End Date Picker */}
      <div className="flex flex-col">
        <span className="text-xs text-gray-500 mb-1">To</span>
        <Popover open={isEndOpen} onOpenChange={setIsEndOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="ghost"
              className={cn(
                "bg-[#f2f8ff] hover:bg-[#f2f8ff] text-[#342630] rounded-full px-2 py-1 text-sm justify-start h-8 min-w-[100px]",
                !dateRange?.to && "text-muted-foreground"
              )}
            >
              <CalendarIcon className="mr-1 h-3 w-3" />
              {formatDate(dateRange?.to)}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="end" side="right">
            <Calendar
              mode="single"
              selected={dateRange?.to}
              onSelect={handleEndDateChange}
              disabled={(date) => {
                if (maxDate && date > maxDate) return true;
                return dateRange?.from ? date < dateRange.from : false;
              }}
              initialFocus
            />
          </PopoverContent>
        </Popover>
      </div>
    </div>
  );
}
