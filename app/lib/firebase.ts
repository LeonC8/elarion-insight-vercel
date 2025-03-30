// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAuth, signInWithEmailAndPassword, signOut } from "firebase/auth";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyCYXoUxJZNekgXo-rBadDDBcU9RJ_WHl1g",
  authDomain: "yachtscraping.firebaseapp.com",
  projectId: "yachtscraping",
  storageBucket: "yachtscraping.firebasestorage.app",
  messagingSenderId: "140271697615",
  appId: "1:140271697615:web:acbf67a8795fab4b4f01ba",
  measurementId: "G-0JR8EK2D0Z"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);

// Login function
export const loginWithEmailAndPassword = async (email: string, password: string) => {
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    return { success: true, user: userCredential.user };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
};

// Logout function
export const logoutUser = async () => {
  try {
    await signOut(auth);
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}; 