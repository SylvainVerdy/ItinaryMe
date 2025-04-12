// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getAuth } from 'firebase/auth';

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

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
