import { NextRequest, NextResponse } from 'next/server';
import { verifyIdToken } from '@/lib/firebase-admin';

export async function POST(request: NextRequest) {
  try {
    const { token } = await request.json();

    if (!token) {
      return NextResponse.json(
        { error: 'Token is required' },
        { status: 400 }
      );
    }

    const result = await verifyIdToken(token);

    if (result.success) {
      return NextResponse.json({
        success: true,
        user: result.user
      });
    } else {
      return NextResponse.json(
        { error: result.error },
        { status: 401 }
      );
    }
  } catch (error) {
    console.error('Token verification error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 