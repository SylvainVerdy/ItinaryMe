// Import the functions you need from the SDKs you need
import { initializeApp, getApps } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getAuth, connectAuthEmulator } from 'firebase/auth';
import { getFirestore, connectFirestoreEmulator } from 'firebase/firestore';

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

// Connect to Firebase emulators if in development
if (process.env.NODE_ENV === 'development') {
  try {
    if (typeof window !== 'undefined') {
      // Utilisez l'IP locale pour l'émulateur
      connectFirestoreEmulator(db, 'localhost', 8080);
      // Correction de l'URL de l'émulateur Auth pour éviter les problèmes CORS
      connectAuthEmulator(auth, 'http://127.0.0.1:9099');
      console.log('Connecté aux émulateurs Firebase locaux');
    }
  } catch (error) {
    console.error('Erreur lors de la connexion aux émulateurs Firebase:', error);
  }
}

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
