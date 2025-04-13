// Import the functions you need from the SDKs you need
import { initializeApp, getApps } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyBiBxXehFOrG9sBpxKP-PO8EzQjSya86WE",
  authDomain: "itinaryme.firebaseapp.com",
  projectId: "itinaryme",
  storageBucket: "itinaryme.firebasestorage.app",
  messagingSenderId: "294333021103",
  appId: "1:294333021103:web:980b9e4222623116528d5a",
  measurementId: "G-M44NVFGTE0"
};

// Initialize Firebase only if not already initialized
const apps = getApps();
const app = apps.length > 0 ? apps[0] : initializeApp(firebaseConfig);

// Initialize services
export const auth = getAuth(app);
export const db = getFirestore(app);

// Initialize analytics only in browser environment
let analytics: any = null;
if (typeof window !== 'undefined') {
  try {
    analytics = getAnalytics(app);
    console.log("Firebase Analytics initialized successfully");
  } catch (error) {
    console.error("Error initializing Firebase Analytics:", error);
  }
}

// Log initialization status
console.log("Firebase initialized with config:", {
  projectId: firebaseConfig.projectId,
  authDomain: firebaseConfig.authDomain,
  appInitialized: !!app,
  authInitialized: !!auth,
  dbInitialized: !!db,
  environment: process.env.NODE_ENV
});

export { analytics };
