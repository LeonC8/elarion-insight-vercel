"use client";

import { LoginScreen } from "@/components/LoginScreen";
import { useAuth } from "@/context/AuthContext";
import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  // Redirect to overview if already logged in
  useEffect(() => {
    if (!isLoading && user) {
      router.push("/overview");
    }
  }, [user, isLoading, router]);

  // Show loading spinner while checking auth state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-slate-900"></div>
      </div>
    );
  }

  // Show login screen if not logged in
  if (!user) {
    return <LoginScreen />;
  }

  // This should not be reached, but just in case
  return null;
}
