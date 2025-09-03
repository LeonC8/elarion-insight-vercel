// Date range calculation utilities for API routes

/**
 * Calculate date ranges based on period type and view type
 */
export function calculateDateRanges(
  businessDateParam: string,
  periodType: string = "Month",
  viewType: string = "Actual",
  customStartDate?: string,
  customEndDate?: string
) {
  const businessDate = new Date(businessDateParam);
  let startDate: string, endDate: string;

  // Handle custom date range
  if (customStartDate && customEndDate && periodType === "Custom") {
    startDate = customStartDate;
    endDate = customEndDate;
  } else if (periodType === "Day") {
    // For Day, always use business date
    startDate = businessDateParam;
    endDate = startDate;
  } else if (periodType === "Month") {
    const year = businessDate.getFullYear();
    const month = businessDate.getMonth();

    // Check if it's the first day of the month
    const isFirstDayOfMonth = businessDate.getDate() === 1;

    if (viewType === "Actual") {
      if (isFirstDayOfMonth) {
        // If it's the first day of the month, use only that day
        startDate = businessDateParam;
        endDate = businessDateParam;
      } else {
        // From beginning of month to business date
        const firstDayOfMonth = new Date(year, month, 2);
        startDate = firstDayOfMonth.toISOString().split("T")[0];
        endDate = businessDateParam;
      }
    } else if (viewType === "OTB") {
      // From day after business date to end of month
      const nextDay = new Date(businessDate);
      nextDay.setDate(nextDay.getDate() + 1);
      startDate = nextDay.toISOString().split("T")[0];
      endDate = new Date(year, month + 1, 0).toISOString().split("T")[0];
    } else {
      // Projected
      // Full month - use the first day of month
      const firstDayOfMonth = new Date(year, month, 2);
      startDate = firstDayOfMonth.toISOString().split("T")[0];
      endDate = new Date(year, month + 1, 1).toISOString().split("T")[0];
    }
  } else {
    // Year
    const year = businessDate.getFullYear();
    const isFirstDayOfYear =
      businessDate.getMonth() === 0 && businessDate.getDate() === 1;

    if (viewType === "Actual") {
      if (isFirstDayOfYear) {
        // If it's the first day of the year, use only that day
        startDate = businessDateParam;
        endDate = businessDateParam;
      } else {
        // From beginning of year to business date
        const firstDayOfYear = new Date(year, 0, 2);
        startDate = firstDayOfYear.toISOString().split("T")[0];
        endDate = businessDateParam;
      }
    } else if (viewType === "OTB") {
      // From day after business date to end of year
      const nextDay = new Date(businessDate);
      nextDay.setDate(nextDay.getDate() + 1);
      startDate = nextDay.toISOString().split("T")[0];
      endDate = new Date(year, 11, 31).toISOString().split("T")[0];
    } else {
      // Projected
      // Full year - use the first day of year
      const firstDayOfYear = new Date(year, 0, 1);
      startDate = firstDayOfYear.toISOString().split("T")[0];
      endDate = new Date(year, 11, 31).toISOString().split("T")[0];
    }
  }

  return { startDate, endDate };
}

/**
 * Calculate comparison period date ranges
 */
export function calculateComparisonDateRanges(
  startDate: string,
  endDate: string,
  businessDateParam: string,
  comparisonType: string = "Last year - OTB"
) {
  // Extract comparison method and data type from the comparison string
  const useMatchingDayOfWeek = comparisonType.includes("match day of week");
  const useOTBBusinessDate = comparisonType.includes("- OTB");

  // Check if we're dealing with a single day range (meaning it's the 1st of the month)
  const isSingleDayRange = startDate === endDate;

  // Calculate previous period date range based on comparison type
  let prevStartDate: Date, prevEndDate: Date;

  if (useMatchingDayOfWeek) {
    // Find the same day of the week from previous year
    prevStartDate = findMatchingDayOfWeek(new Date(startDate), -1);
    prevEndDate = findMatchingDayOfWeek(new Date(endDate), -1);
  } else {
    // Simply subtract a year from the dates
    prevStartDate = new Date(startDate);
    prevStartDate.setFullYear(prevStartDate.getFullYear() - 1);
    prevEndDate = new Date(endDate);
    prevEndDate.setFullYear(prevEndDate.getFullYear() - 1);

    // If this is a first-day-of-month case (single day range),
    // make sure the comparison is also a single day
    if (isSingleDayRange) {
      // For the first day of the month case, use the first day of the same month last year
      const businessDate = new Date(businessDateParam);
      const prevYear = businessDate.getFullYear() - 1;
      const month = businessDate.getMonth();
      const day = businessDate.getDate(); // This should be 1 for first day of month

      // Create a date for the 1st of the same month last year
      const firstDayLastYear = new Date(prevYear, month, day);
      prevStartDate = firstDayLastYear;
      prevEndDate = firstDayLastYear;
    }
  }

  // Determine which business date to use for the previous period
  let prevBusinessDateParam: string;
  if (useOTBBusinessDate) {
    // For OTB comparisons, always use the current business date for SCD lookup
    // This ensures we're seeing the data as it existed on the current business date
    prevBusinessDateParam = businessDateParam;
  } else {
    // For Actual comparisons, use the current business date for consistency
    // This ensures we're comparing data from the same SCD perspective
    prevBusinessDateParam = businessDateParam;
  }

  return {
    prevStartDate: prevStartDate.toISOString().split("T")[0],
    prevEndDate: prevEndDate.toISOString().split("T")[0],
    prevBusinessDateParam,
  };
}

/**
 * Find matching day of week from previous year
 */
export function findMatchingDayOfWeek(date: Date, yearOffset: number): Date {
  // Create a new date for the same day in the previous/next year
  const targetDate = new Date(date);
  targetDate.setFullYear(targetDate.getFullYear() + yearOffset);

  // Get day of week for both dates
  const originalDayOfWeek = date.getDay();
  const targetDayOfWeek = targetDate.getDay();

  // If days of week match, return the target date
  if (originalDayOfWeek === targetDayOfWeek) {
    return targetDate;
  }

  // Otherwise, adjust the target date to match the day of week
  const dayDifference = originalDayOfWeek - targetDayOfWeek;

  // Add the difference (might be negative, which is fine for setDate)
  targetDate.setDate(targetDate.getDate() + dayDifference);

  return targetDate;
}
