import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getDatabase } from "firebase/database";

// Firebase configuration provided by user
const firebaseConfig = {
  apiKey: "AIzaSyCP7AvmGEhezBi-4Pzy75OEVKLQ0R4ukjU",
  authDomain: "sistemasreportes.firebaseapp.com",
  databaseURL: "https://sistemasreportes-default-rtdb.firebaseio.com",
  projectId: "sistemasreportes",
  storageBucket: "sistemasreportes.firebasestorage.app",
  messagingSenderId: "802460279788",
  appId: "1:802460279788:web:039f882b5ece60c89a16c9",
  measurementId: "G-1FDRNVQ4PZ"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
const db = getDatabase(app);

export { app, analytics, db };
