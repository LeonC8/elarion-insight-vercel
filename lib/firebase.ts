import { initializeApp } from "firebase/app";
import { getAuth, signInWithEmailAndPassword, signOut, onAuthStateChanged, User } from "firebase/auth";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);

export const loginWithEmailAndPassword = async (email: string, password: string) => {
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;
    
    const idToken = await user.getIdToken();
    
    return { 
      success: true, 
      user: user,
      token: idToken
    };
  } catch (error: any) {
    console.error('Firebase login error:', error);
    
    let errorMessage = 'Login failed. Please try again.';
    
    switch (error.code) {
      case 'auth/user-not-found':
        errorMessage = 'No account found with this email address.';
        break;
      case 'auth/wrong-password':
        errorMessage = 'Incorrect password.';
        break;
      case 'auth/invalid-email':
        errorMessage = 'Invalid email address.';
        break;
      case 'auth/too-many-requests':
        errorMessage = 'Too many failed attempts. Please try again later.';
        break;
      case 'auth/user-disabled':
        errorMessage = 'This account has been disabled.';
        break;
    }
    
    return { 
      success: false, 
      error: errorMessage,
      code: error.code 
    };
  }
};

export const logoutUser = async () => {
  try {
    await signOut(auth);
    return { success: true };
  } catch (error: any) {
    console.error('Firebase logout error:', error);
    return { 
      success: false, 
      error: 'Logout failed. Please try again.' 
    };
  }
};

export const onAuthStateChange = (callback: (user: User | null) => void) => {
  return onAuthStateChanged(auth, callback);
};

export const getCurrentUser = () => {
  return auth.currentUser;
};

export const getCurrentUserToken = async () => {
  const user = auth.currentUser;
  if (user) {
    return await user.getIdToken();
  }
  return null;
}; 