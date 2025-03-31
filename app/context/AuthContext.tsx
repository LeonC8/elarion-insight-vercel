'use client'

import { createContext, useState, useContext, useEffect, ReactNode } from 'react';
import { useRouter, usePathname } from 'next/navigation';

type AuthContextType = {
  isLoggedIn: boolean;
  login: () => void;
  logout: () => void;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  // Start with null to indicate "loading" state
  const [isLoggedIn, setIsLoggedIn] = useState<boolean | null>(null);
  const router = useRouter();
  const pathname = usePathname();

  // Check if user is logged in from localStorage on initial load
  useEffect(() => {
    // This will only run on the client side
    const storedLoggedIn = localStorage.getItem('isLoggedIn');
    setIsLoggedIn(storedLoggedIn === 'true');
  }, []);

  // Protect routes when not logged in - only after we've checked localStorage
  useEffect(() => {
    // Only redirect if we've checked localStorage (isLoggedIn is not null)
    // and the user is not logged in
    if (isLoggedIn === false && pathname !== '/login') {
      router.push('/login');
    }
  }, [isLoggedIn, pathname, router]);

  const login = () => {
    setIsLoggedIn(true);
    localStorage.setItem('isLoggedIn', 'true');
  };

  const logout = () => {
    setIsLoggedIn(false);
    localStorage.setItem('isLoggedIn', 'false');
    router.push('/login');
  };

  return (
    <AuthContext.Provider value={{ 
      // Treat null as false for the context consumer
      isLoggedIn: isLoggedIn === null ? false : isLoggedIn, 
      login, 
      logout 
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
} 