import { useState, useEffect, useCallback } from 'react';

// Define keys for localStorage
const TIME_FRAME_KEY = 'overview_timeFrame';
const VIEW_TYPE_KEY = 'overview_viewType';
const COMPARISON_KEY = 'overview_comparison';
const DATE_KEY = 'overview_date';

// Helper function to safely get item from localStorage
const getLocalStorageItem = <T>(key: string, defaultValue: T, parser?: (value: string) => T): T => {
  try {
    const storedValue = localStorage.getItem(key);
    if (storedValue !== null) {
      return parser ? parser(storedValue) : (storedValue as unknown as T);
    }
  } catch (error) {
    console.error(`Error reading localStorage key “${key}”:`, error);
  }
  return defaultValue;
};

// Helper function to safely set item in localStorage
const setLocalStorageItem = (key: string, value: any, stringifier?: (value: any) => string): void => {
  try {
    const valueToStore = stringifier ? stringifier(value) : String(value);
    localStorage.setItem(key, valueToStore);
  } catch (error) {
    console.error(`Error setting localStorage key “${key}”:`, error);
  }
};

// Custom hook definition
export const usePersistentOverviewFilters = (
  defaultTimeFrame: string = "Month",
  defaultViewType: string = "Actual",
  defaultComparison: string = "Last year - Actual",
  defaultDate: Date = new Date()
) => {
  // Initialize state, trying to read from localStorage first
  const [selectedTimeFrame, setSelectedTimeFrame] = useState<string>(() =>
    getLocalStorageItem(TIME_FRAME_KEY, defaultTimeFrame)
  );

  const [selectedViewType, setSelectedViewType] = useState<string>(() =>
    getLocalStorageItem(VIEW_TYPE_KEY, defaultViewType)
  );

  const [selectedComparison, setSelectedComparison] = useState<string>(() =>
    getLocalStorageItem(COMPARISON_KEY, defaultComparison)
  );

  const [date, setDateState] = useState<Date>(() =>
    getLocalStorageItem(DATE_KEY, defaultDate, (storedValue) => {
      const parsedDate = new Date(storedValue);
      // Check if the parsed date is valid
      return !isNaN(parsedDate.getTime()) ? parsedDate : defaultDate;
    })
  );

  // Persist changes to localStorage
  useEffect(() => {
    setLocalStorageItem(TIME_FRAME_KEY, selectedTimeFrame);
  }, [selectedTimeFrame]);

  useEffect(() => {
    setLocalStorageItem(VIEW_TYPE_KEY, selectedViewType);
  }, [selectedViewType]);

  useEffect(() => {
    setLocalStorageItem(COMPARISON_KEY, selectedComparison);
  }, [selectedComparison]);

  useEffect(() => {
    // Store date as ISO string for better compatibility
    setLocalStorageItem(DATE_KEY, date, (d) => d.toISOString());
  }, [date]);

  // Wrap the date setter to ensure it only updates if the date actually changes
  const setDate = useCallback((newDate: Date | undefined) => {
    if (newDate && newDate.getTime() !== date.getTime()) {
      setDateState(newDate);
    }
  }, [date]); // Dependency ensures the function identity changes only when date changes


  return {
    selectedTimeFrame,
    setSelectedTimeFrame,
    selectedViewType,
    setSelectedViewType,
    selectedComparison,
    setSelectedComparison,
    date,
    setDate, // Use the wrapped setter
  };
}; 