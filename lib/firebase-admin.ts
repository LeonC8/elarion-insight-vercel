import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';

// Server-side Firebase Admin SDK configuration
const firebaseAdminConfig = {
  projectId: process.env.FIREBASE_PROJECT_ID,
  clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
  privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
};

// Initialize Firebase Admin SDK
let firebaseAdmin;
if (getApps().length === 0) {
  firebaseAdmin = initializeApp({
    credential: cert(firebaseAdminConfig),
  });
} else {
  firebaseAdmin = getApps()[0];
}

export const adminAuth = getAuth(firebaseAdmin);

// Verify Firebase ID token on server-side
export const verifyIdToken = async (idToken: string) => {
  try {
    const decodedToken = await adminAuth.verifyIdToken(idToken);
    return { 
      success: true, 
      user: decodedToken 
    };
  } catch (error) {
    console.error('Token verification error:', error);
    return { 
      success: false, 
      error: 'Invalid or expired token' 
    };
  }
};

// Get user by UID
export const getUserByUid = async (uid: string) => {
  try {
    const userRecord = await adminAuth.getUser(uid);
    return { 
      success: true, 
      user: userRecord 
    };
  } catch (error) {
    console.error('Get user error:', error);
    return { 
      success: false, 
      error: 'User not found' 
    };
  }
};

// Create custom token (if needed for special cases)
export const createCustomToken = async (uid: string) => {
  try {
    const customToken = await adminAuth.createCustomToken(uid);
    return { 
      success: true, 
      token: customToken 
    };
  } catch (error) {
    console.error('Create custom token error:', error);
    return { 
      success: false, 
      error: 'Failed to create custom token' 
    };
  }
}; 