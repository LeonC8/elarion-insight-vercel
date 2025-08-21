"use client";

import { Overview } from "@/components/pages/Overview";
import { Suspense, useEffect } from "react";

function LoadingFallback() {
  console.log("Overview: Loading fallback rendered");
  return (
    <div className="flex items-center justify-center h-screen">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-slate-900"></div>
    </div>
  );
}

function ErrorFallback() {
  console.log("Overview: Error fallback rendered");
  return (
    <div className="flex items-center justify-center h-screen">
      <div className="text-center">
        <h1 className="text-2xl font-bold text-red-600 mb-4">
          Dashboard Error
        </h1>
        <p className="text-gray-600">
          Unable to load dashboard. Please try refreshing the page.
        </p>
      </div>
    </div>
  );
}

export default function OverviewPage() {
  console.log("Overview: Page component rendered");

  useEffect(() => {
    console.log("Overview: Page component mounted");
  }, []);

  return (
    <div className="min-h-screen bg-white">
      <Suspense fallback={<LoadingFallback />}>
        <ErrorBoundary fallback={<ErrorFallback />}>
          <Overview />
        </ErrorBoundary>
      </Suspense>
    </div>
  );
}

// Simple Error Boundary component
function ErrorBoundary({
  children,
  fallback,
}: {
  children: React.ReactNode;
  fallback: React.ReactNode;
}) {
  console.log("Overview: ErrorBoundary rendered");

  try {
    return <>{children}</>;
  } catch (error) {
    console.error("Overview page error:", error);
    return <>{fallback}</>;
  }
}
