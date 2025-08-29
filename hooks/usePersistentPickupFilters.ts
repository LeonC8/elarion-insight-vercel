import { useState, useEffect, useCallback } from "react";
import {
  DEFAULT_PROPERTY,
  PROPERTY_CODES,
  type PropertyCode,
} from "@/lib/property";

// Define keys for localStorage
const BUSINESS_DATE_KEY = "pickup_businessDate";
const PROPERTY_KEY = "overview_property"; // Use the same key as all other pages
const VIEW_TYPE_KEY = "pickup_viewType"; // For pickup page (month/year)
const METRIC_KEY = "pickup_metric"; // For pickup page (soldRooms/revenue/adr)

// Define keys for pickup analytics
const ANALYTICS_VIEW_TYPE_KEY = "pickup_analytics_viewType"; // Day/Month/Year
const ANALYTICS_REPORT_DATE_KEY = "pickup_analytics_reportDate";
const ANALYTICS_COMPARISON_KEY = "pickup_analytics_comparison";
const ANALYTICS_PROPERTY_KEY = "overview_property"; // Use the same key as all other pages

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
    console.error(`Error reading localStorage key "${key}":`, error);
  }
  return defaultValue;
};

// Helper function to safely set item in localStorage
const setLocalStorageItem = (
  key: string,
  value: any,
  stringifier?: (value: any) => string
) => {
  try {
    const valueToStore = stringifier ? stringifier(value) : String(value);
    localStorage.setItem(key, valueToStore);
  } catch (error) {
    console.error(`Error setting localStorage key "${key}":`, error);
  }
};

// Custom hook for pickup page filters
export const usePersistentPickupFilters = (
  defaultBusinessDate: Date = new Date(),
  defaultProperty: PropertyCode = DEFAULT_PROPERTY,
  defaultViewType: "month" | "year" = "month",
  defaultMetric: "soldRooms" | "revenue" | "adr" = "soldRooms"
) => {
  // Initialize state, trying to read from localStorage first
  const [businessDate, setBusinessDateState] = useState<Date>(() =>
    getLocalStorageItem(
      BUSINESS_DATE_KEY,
      defaultBusinessDate,
      (storedValue) => {
        const parsedDate = new Date(storedValue);
        // Check if the parsed date is valid
        return !isNaN(parsedDate.getTime()) ? parsedDate : defaultBusinessDate;
      }
    )
  );

  const [selectedProperty, setSelectedPropertyState] = useState<PropertyCode>(
    () =>
      getLocalStorageItem(PROPERTY_KEY, defaultProperty, (storedValue) => {
        const value = storedValue as PropertyCode;
        return (PROPERTY_CODES as readonly string[]).includes(value)
          ? (value as PropertyCode)
          : defaultProperty;
      })
  );

  const [selectedView, setSelectedViewState] = useState<"month" | "year">(() =>
    getLocalStorageItem(VIEW_TYPE_KEY, defaultViewType, (storedValue) => {
      return ["month", "year"].includes(storedValue)
        ? (storedValue as "month" | "year")
        : defaultViewType;
    })
  );

  const [selectedMetric, setSelectedMetricState] = useState<
    "soldRooms" | "revenue" | "adr"
  >(() =>
    getLocalStorageItem(METRIC_KEY, defaultMetric, (storedValue) => {
      return ["soldRooms", "revenue", "adr"].includes(storedValue)
        ? (storedValue as "soldRooms" | "revenue" | "adr")
        : defaultMetric;
    })
  );

  // Persist changes to localStorage
  useEffect(() => {
    // Store date as ISO string for better compatibility
    setLocalStorageItem(BUSINESS_DATE_KEY, businessDate, (d) =>
      d.toISOString()
    );
  }, [businessDate]);

  useEffect(() => {
    setLocalStorageItem(PROPERTY_KEY, selectedProperty);
  }, [selectedProperty]);

  useEffect(() => {
    setLocalStorageItem(VIEW_TYPE_KEY, selectedView);
  }, [selectedView]);

  useEffect(() => {
    setLocalStorageItem(METRIC_KEY, selectedMetric);
  }, [selectedMetric]);

  // Wrap the setters to ensure they only update if the value actually changes
  const setBusinessDate = useCallback(
    (newDate: Date | undefined) => {
      if (newDate && newDate.getTime() !== businessDate.getTime()) {
        setBusinessDateState(newDate);
      }
    },
    [businessDate]
  );

  const setSelectedProperty = useCallback((property: PropertyCode) => {
    setSelectedPropertyState((prev) =>
      prev === property ? (prev as PropertyCode) : property
    );
  }, []);

  const setSelectedView = useCallback((view: "month" | "year") => {
    setSelectedViewState((prev) => (prev === view ? prev : view));
  }, []);

  const setSelectedMetric = useCallback(
    (metric: "soldRooms" | "revenue" | "adr") => {
      setSelectedMetricState((prev) => (prev === metric ? prev : metric));
    },
    []
  );

  return {
    businessDate,
    setBusinessDate,
    selectedProperty,
    setSelectedProperty,
    selectedView,
    setSelectedView,
    selectedMetric,
    setSelectedMetric,
  };
};

// Custom hook for pickup analytics filters
export const usePersistentPickupAnalyticsFilters = (
  defaultViewType: "Day" | "Month" | "Year" = "Day",
  defaultReportDate: Date = new Date(),
  defaultComparison: string = "Yesterday",
  defaultProperty: PropertyCode = DEFAULT_PROPERTY
) => {
  const [selectedView, setSelectedView] = useState<"Day" | "Month" | "Year">(
    () =>
      getLocalStorageItem(
        ANALYTICS_VIEW_TYPE_KEY,
        defaultViewType,
        (storedValue) => {
          return ["Day", "Month", "Year"].includes(storedValue)
            ? (storedValue as "Day" | "Month" | "Year")
            : defaultViewType;
        }
      )
  );

  const [reportDate, setReportDateState] = useState<Date>(() =>
    getLocalStorageItem(
      ANALYTICS_REPORT_DATE_KEY,
      defaultReportDate,
      (storedValue) => {
        const parsedDate = new Date(storedValue);
        return !isNaN(parsedDate.getTime()) ? parsedDate : defaultReportDate;
      }
    )
  );

  const [selectedComparison, setSelectedComparison] = useState<string>(() =>
    getLocalStorageItem(ANALYTICS_COMPARISON_KEY, defaultComparison)
  );

  const [selectedProperty, setSelectedPropertyState] = useState<PropertyCode>(
    () =>
      getLocalStorageItem(
        ANALYTICS_PROPERTY_KEY,
        defaultProperty,
        (storedValue) => {
          const value = storedValue as PropertyCode;
          return (PROPERTY_CODES as readonly string[]).includes(value)
            ? (value as PropertyCode)
            : defaultProperty;
        }
      )
  );

  // Persist changes to localStorage
  useEffect(() => {
    setLocalStorageItem(ANALYTICS_VIEW_TYPE_KEY, selectedView);
  }, [selectedView]);

  useEffect(() => {
    setLocalStorageItem(ANALYTICS_REPORT_DATE_KEY, reportDate, (d) =>
      d.toISOString()
    );
  }, [reportDate]);

  useEffect(() => {
    setLocalStorageItem(ANALYTICS_COMPARISON_KEY, selectedComparison);
  }, [selectedComparison]);

  useEffect(() => {
    setLocalStorageItem(ANALYTICS_PROPERTY_KEY, selectedProperty);
  }, [selectedProperty]);

  // Wrap the setters
  const setReportDate = useCallback(
    (newDate: Date | undefined) => {
      if (newDate && newDate.getTime() !== reportDate.getTime()) {
        setReportDateState(newDate);
      }
    },
    [reportDate]
  );

  const setSelectedProperty = useCallback((property: PropertyCode) => {
    setSelectedPropertyState((prev) =>
      prev === property ? (prev as PropertyCode) : property
    );
  }, []);

  return {
    selectedView,
    setSelectedView,
    reportDate,
    setReportDate,
    selectedComparison,
    setSelectedComparison,
    selectedProperty,
    setSelectedProperty,
  };
};
