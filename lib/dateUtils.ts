// Date range calculation utilities for API routes

/**
 * Calculate date ranges based on period type and view type
 */
export function calculateDateRanges(
  businessDateParam: string, 
  periodType: string = 'Month', 
  viewType: string = 'Actual'
) {
  const businessDate = new Date(businessDateParam);
  let startDate: string, endDate: string;
  
  if (periodType === 'Day') {
    // For Day, always use business date
    startDate = businessDateParam;
    endDate = startDate;
  } else if (periodType === 'Month') {
    const year = businessDate.getFullYear();
    const month = businessDate.getMonth();
    
    if (viewType === 'Actual') {
      // From beginning of month to business date
      const firstDayOfMonth = new Date(year, month, 1);
      startDate = firstDayOfMonth.toISOString().split('T')[0];
      endDate = businessDateParam;
    } else if (viewType === 'OTB') {
      // From day after business date to end of month
      const nextDay = new Date(businessDate);
      nextDay.setDate(nextDay.getDate() + 1);
      startDate = nextDay.toISOString().split('T')[0];
      endDate = new Date(year, month + 1, 0).toISOString().split('T')[0];
    } else { // Projected
      // Full month - add one day to the start date
      const firstDayOfMonth = new Date(year, month, 1);
      firstDayOfMonth.setDate(firstDayOfMonth.getDate() + 1); // Add one day
      startDate = firstDayOfMonth.toISOString().split('T')[0];
      endDate = new Date(year, month + 1, 0).toISOString().split('T')[0];
    }
  } else { // Year
    const year = businessDate.getFullYear();
    
    if (viewType === 'Actual') {
      // From beginning of year to business date
      const firstDayOfYear = new Date(year, 0, 1);
      startDate = firstDayOfYear.toISOString().split('T')[0];
      endDate = businessDateParam;
    } else if (viewType === 'OTB') {
      // From day after business date to end of year
      const nextDay = new Date(businessDate);
      nextDay.setDate(nextDay.getDate() + 1);
      startDate = nextDay.toISOString().split('T')[0];
      endDate = new Date(year, 11, 31).toISOString().split('T')[0];
    } else { // Projected
      // Full year - add one day to the start date
      const firstDayOfYear = new Date(year, 0, 1);
      firstDayOfYear.setDate(firstDayOfYear.getDate() + 1); // Add one day
      startDate = firstDayOfYear.toISOString().split('T')[0];
      endDate = new Date(year, 11, 31).toISOString().split('T')[0];
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
  comparisonType: string = 'Last year - OTB'
) {
  // Extract comparison method and data type from the comparison string
  const useMatchingDayOfWeek = comparisonType.includes('match day of week');
  const useOTBBusinessDate = comparisonType.includes('- OTB');

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
  }

  // Determine which business date to use for the previous period
  let prevBusinessDateParam: string;
  if (useOTBBusinessDate) {
    // Use the business date from the beginning of the previous period
    prevBusinessDateParam = prevStartDate.toISOString().split('T')[0];
  } else {
    // Use the same business date as the current period
    prevBusinessDateParam = businessDateParam;
  }
  
  return {
    prevStartDate: prevStartDate.toISOString().split('T')[0],
    prevEndDate: prevEndDate.toISOString().split('T')[0],
    prevBusinessDateParam
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