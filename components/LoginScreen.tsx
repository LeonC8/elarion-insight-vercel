'use client'

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { LockIcon, UserIcon, BarChart2Icon } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import loginImage from '@/assets/2.jpg';

export function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { login } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);
    
    try {
      const result = await login(email, password);
      if (!result.success) {
        setError(result.error || 'Login failed. Please try again.');
      }
    } catch (err) {
      setError('Login failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex bg-gray-100">
      {/* Left side - Image */}
      <div className="hidden lg:block lg:w-1/2 bg-gradient-to-br from-slate-900 to-slate-700 overflow-hidden relative">
        <img 
          src={loginImage.src} 
          alt="Corporate Background" 
          className="absolute inset-0 w-full h-full object-cover"
        />
      </div>

      {/* Right side - Login Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-6 sm:p-12">
        <Card className="w-full max-w-md shadow-xl border-none">
          <CardHeader className="space-y-1 pt-8 pb-4">
            {/* Updated Logo positioning - now left-aligned */}
            <div className="flex items-center mb-6">
              <BarChart2Icon className="h-12 w-11 text-slate-900 mr-2 pr-1" />
              <div className="flex flex-col text-left">
                <span className="text-xl font-bold text-slate-900">Elarion Insights</span>
                <span className="text-sm text-gray-500">Hospitality</span>
              </div>
            </div>
            {/* Removed "Welcome Back" heading */}
            <p className="text-sm text-gray-500">Please log in to access your dashboard</p>
          </CardHeader>
          <CardContent className="pb-8">
            <form onSubmit={handleSubmit} className="space-y-5">
              {error && (
                <div className="p-3 bg-red-50 border border-red-300 text-red-800 rounded-md text-sm">
                  {error}
                </div>
              )}
              <div className="space-y-2">
                <label htmlFor="email" className="text-sm font-medium text-gray-700 block">Email Address</label>
                <div className="relative">
                  <input
                    id="email"
                    type="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEmail(e.target.value)}
                    className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-slate-500 focus:border-transparent transition duration-150 ease-in-out"
                    required
                    disabled={isLoading}
                  />
                  <UserIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
                </div>
              </div>
              <div className="space-y-2">
                <label htmlFor="password" className="text-sm font-medium text-gray-700 block">Password</label>
                <div className="relative">
                  <input
                    id="password"
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPassword(e.target.value)}
                    className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-slate-500 focus:border-transparent transition duration-150 ease-in-out"
                    required
                    disabled={isLoading}
                  />
                  <LockIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
                </div>
                 {/* Optional: Add Forgot Password link here */}
                 {/* <div className="text-right">
                   <a href="#" className="text-sm text-slate-600 hover:text-slate-800 hover:underline">Forgot password?</a>
                 </div> */}
              </div>
              <Button 
                type="submit" 
                className="w-full bg-slate-900 hover:bg-slate-800 text-white py-2.5 rounded-md text-sm font-medium transition duration-150 ease-in-out"
                disabled={isLoading}
              >
                {isLoading ? 'Logging in...' : 'Log in'}
              </Button>
            </form>
             {/* Optional: Add Sign up link here */}
             {/* <p className="mt-6 text-center text-sm text-gray-600">
               Don't have an account?{' '}
               <a href="#" className="font-medium text-slate-700 hover:text-slate-900 hover:underline">
                 Sign up
               </a>
             </p> */}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
