import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// Exact firebaseConfig object
const firebaseConfig = {
  apiKey: "AIzaSyCFqBTnPZi0EQFXbZcG2dcuPoB4kVGPYCw",
  authDomain: "brokecheck-d791f.firebaseapp.com",
  projectId: "brokecheck-d791f",
  storageBucket: "brokecheck-d791f.firebasestorage.app",
  messagingSenderId: "378199535401",
  appId: "1:378199535401:web:e1780a79fb2829b7825138"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Export services to use across the app
export const auth = getAuth(app);
export const db = getFirestore(app);