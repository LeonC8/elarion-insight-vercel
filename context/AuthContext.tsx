"use client";

import {
  createContext,
  useState,
  useContext,
  useEffect,
  ReactNode,
} from "react";
import { useRouter, usePathname } from "next/navigation";
import { User } from "firebase/auth";

type AuthContextType = {
  user: User | null;
  isLoggedIn: boolean;
  isLoading: boolean;
  login: (
    email: string,
    password: string
  ) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  getToken: () => Promise<string | null>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const pathname = usePathname();

  // Real-time auth state listener
  useEffect(() => {
    console.log("AuthProvider: Initializing...");

    try {
      // Dynamically import Firebase to avoid SSR issues
      import("@/lib/firebase")
        .then(({ onAuthStateChange }) => {
          console.log("AuthProvider: Firebase imported successfully");

          const unsubscribe = onAuthStateChange(async (user) => {
            console.log(
              "AuthProvider: Auth state changed",
              user ? "User logged in" : "No user"
            );
            setUser(user);

            // Ensure middleware-visible cookie is present when user is logged in
            try {
              if (user) {
                const idToken = await user.getIdToken();
                const isDev = process.env.NODE_ENV === "development";
                const sameSite = isDev ? "Lax" : "Strict";
                const secure = isDev ? "" : "Secure; ";
                document.cookie = `firebase-token=${idToken}; path=/; max-age=3600; ${secure}SameSite=${sameSite}`;
                console.log(
                  "AuthProvider: Token refreshed and stored in cookie"
                );
              } else {
                // Remove cookie when logged out
                document.cookie =
                  "firebase-token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
              }
            } catch (cookieErr) {
              console.error(
                "AuthProvider: Failed to set auth cookie",
                cookieErr
              );
            }
            setIsLoading(false);
          });

          return () => unsubscribe();
        })
        .catch((err) => {
          console.error("AuthProvider: Firebase import error", err);
          setError("Failed to initialize authentication");
          setIsLoading(false);
        });
    } catch (err) {
      console.error("AuthProvider: Initialization error", err);
      setError("Failed to initialize authentication");
      setIsLoading(false);
    }
  }, []);

  // Route protection - DISABLED since middleware handles it
  useEffect(() => {
    if (!isLoading) {
      console.log("AuthProvider: Route protection check", {
        user: !!user,
        pathname,
      });

      // Only redirect if user is logged in and on login page
      if (user && pathname === "/login") {
        console.log("AuthProvider: Redirecting to overview");
        router.push("/overview");
      }

      // Disabled client-side protection - middleware handles it
      // if (!user && pathname !== '/login') {
      //   console.log('AuthProvider: Redirecting to login');
      //   router.push('/login');
      // }
    }
  }, [user, isLoading, pathname, router]);

  const login = async (email: string, password: string) => {
    console.log("AuthProvider: Login attempt", email);

    try {
      const { loginWithEmailAndPassword } = await import("@/lib/firebase");
      const result = await loginWithEmailAndPassword(email, password);

      console.log("AuthProvider: Login result", result.success);

      if (result.success && result.token) {
        // Store token in cookie for middleware access (dev: non-secure, prod: secure)
        const isDev = process.env.NODE_ENV === "development";
        const sameSite = isDev ? "Lax" : "Strict";
        const secure = isDev ? "" : "Secure; ";
        document.cookie = `firebase-token=${result.token}; path=/; max-age=3600; ${secure}SameSite=${sameSite}`;
        console.log("AuthProvider: Token stored in cookie");
        return { success: true };
      } else {
        return { success: false, error: result.error };
      }
    } catch (error) {
      console.error("AuthProvider: Login error", error);
      return { success: false, error: "Login failed. Please try again." };
    }
  };

  const logout = async () => {
    console.log("AuthProvider: Logout attempt");

    try {
      const { logoutUser } = await import("@/lib/firebase");
      await logoutUser();
      setUser(null);

      // Remove token from cookie
      document.cookie =
        "firebase-token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
      console.log("AuthProvider: Token removed from cookie");

      router.push("/login");
    } catch (error) {
      console.error("AuthProvider: Logout error", error);
    }
  };

  const getToken = async () => {
    try {
      const { getCurrentUserToken } = await import("@/lib/firebase");
      return await getCurrentUserToken();
    } catch (error) {
      console.error("AuthProvider: Get token error", error);
      return null;
    }
  };

  const value = {
    user,
    isLoggedIn: !!user,
    isLoading,
    login,
    logout,
    getToken,
  };

  // Show error if initialization failed
  if (error) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-red-600">
          <h1>Authentication Error</h1>
          <p>{error}</p>
        </div>
      </div>
    );
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
