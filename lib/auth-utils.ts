import { NextRequest, NextResponse } from 'next/server';
import { verifyIdToken } from '@/lib/firebase-admin';

export async function protectApiRoute(request: NextRequest) {
  try {
    // Get token from cookies
    const token = request.cookies.get('firebase-token');
    
    if (!token) {
      return NextResponse.json(
        { error: 'Authentication required' }, 
        { status: 401 }
      );
    }
    
    // Verify token with Firebase Admin
    const result = await verifyIdToken(token.value);
    
    if (!result.success) {
      return NextResponse.json(
        { error: 'Invalid token' }, 
        { status: 401 }
      );
    }
    
    // Return user data for use in API route
    return { user: result.user, success: true };
    
  } catch (error) {
    console.error('API route protection error:', error);
    return NextResponse.json(
      { error: 'Authentication failed' }, 
      { status: 401 }
    );
  }
} 