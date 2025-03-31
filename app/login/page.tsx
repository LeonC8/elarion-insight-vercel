'use client'

import { LoginScreen } from '@/components/LoginScreen';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/app/context/AuthContext';
import { useEffect, useState } from 'react';

export default function LoginPage() {
  const router = useRouter();
  const { isLoggedIn, login } = useAuth();
  const [clientReady, setClientReady] = useState(false);

  // This effect ensures we only render after hydration
  useEffect(() => {
    setClientReady(true);
  }, []);

  // Redirect to overview if already logged in
  useEffect(() => {
    if (clientReady && isLoggedIn) {
      router.push('/overview');
    }
  }, [clientReady, isLoggedIn, router]);

  const handleLogin = (email: string, password: string) => {
    // Set logged in state to true
    login();
    
    // Redirect to overview page after login
    router.push('/overview');
  };

  if (!clientReady) {
    return <div className="flex items-center justify-center h-screen">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-slate-900"></div>
    </div>;
  }

  return <LoginScreen onLogin={handleLogin} />;
} 