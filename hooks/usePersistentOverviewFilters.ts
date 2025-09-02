import { useState, useEffect, useCallback } from "react";
import {
  DEFAULT_PROPERTY,
  PROPERTY_CODES,
  type PropertyCode,
} from "@/lib/property";

// Define keys for localStorage
const TIME_FRAME_KEY = "overview_timeFrame";
const VIEW_TYPE_KEY = "overview_viewType";
const COMPARISON_KEY = "overview_comparison";
const DATE_KEY = "overview_date";
const PROPERTY_KEY = "overview_property";

// Helper function to safely get item from localStorage
const getLocalStorageItem = <T>(
  key: string,
  defaultValue: T,
  parser?: (value: string) => T
): T => {
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
const setLocalStorageItem = (
  key: string,
  value: any,
  stringifier?: (value: any) => string
): void => {
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
  defaultDate: Date = new Date(),
  defaultProperty: PropertyCode = DEFAULT_PROPERTY
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
      console.log("🔍 DEBUG: Loading date from localStorage:", storedValue);
      // Parse YYYY-MM-DD format to avoid timezone issues
      const dateMatch = storedValue.match(/^(\d{4})-(\d{2})-(\d{2})$/);
      if (dateMatch) {
        const [, year, month, day] = dateMatch;
        const parsedDate = new Date(
          parseInt(year),
          parseInt(month) - 1,
          parseInt(day)
        );
        console.log(
          "🔍 DEBUG: Parsed date from YYYY-MM-DD format:",
          parsedDate
        );
        return !isNaN(parsedDate.getTime()) ? parsedDate : defaultDate;
      }
      // Fallback for old format
      console.log("🔍 DEBUG: Using fallback date parsing for:", storedValue);
      const parsedDate = new Date(storedValue);
      console.log("🔍 DEBUG: Fallback parsed date:", parsedDate);
      return !isNaN(parsedDate.getTime()) ? parsedDate : defaultDate;
    })
  );

  // Selected property (single select)
  const [selectedProperty, setSelectedPropertyState] = useState<PropertyCode>(
    () =>
      getLocalStorageItem(PROPERTY_KEY, defaultProperty, (storedValue) => {
        const value = storedValue as PropertyCode;
        return (PROPERTY_CODES as readonly string[]).includes(value)
          ? (value as PropertyCode)
          : defaultProperty;
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
    // Store date as YYYY-MM-DD string to avoid timezone issues
    setLocalStorageItem(DATE_KEY, date, (d) => {
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, "0");
      const day = String(d.getDate()).padStart(2, "0");
      const dateString = `${year}-${month}-${day}`;
      console.log(
        "🔍 DEBUG: Storing date to localStorage:",
        d,
        "->",
        dateString
      );
      return dateString;
    });
  }, [date]);

  useEffect(() => {
    setLocalStorageItem(PROPERTY_KEY, selectedProperty);
  }, [selectedProperty]);

  // Wrap the date setter to ensure it only updates if the date actually changes
  const setDate = useCallback(
    (newDate: Date | undefined) => {
      console.log(
        "🔍 DEBUG: setDate called with:",
        newDate,
        "current date:",
        date
      );
      if (newDate && newDate.getTime() !== date.getTime()) {
        console.log("🔍 DEBUG: Date is different, updating state");
        setDateState(newDate);
      } else {
        console.log("🔍 DEBUG: Date is same or undefined, not updating");
      }
    },
    [date]
  ); // Dependency ensures the function identity changes only when date changes

  const setSelectedProperty = useCallback((property: PropertyCode) => {
    setSelectedPropertyState((prev) =>
      prev === property ? (prev as PropertyCode) : property
    );
  }, []);

  return {
    selectedTimeFrame,
    setSelectedTimeFrame,
    selectedViewType,
    setSelectedViewType,
    selectedComparison,
    setSelectedComparison,
    date,
    setDate, // Use the wrapped setter
    selectedProperty,
    setSelectedProperty,
  };
};
