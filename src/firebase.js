import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey:            import.meta.env.VITE_FIREBASE_API_KEY            || "AIzaSyDlIpNL8CS5FPK7vipsDd2Vac-v8GGdNac",
  authDomain:        import.meta.env.VITE_FIREBASE_AUTH_DOMAIN        || "eduzah-platform.firebaseapp.com",
  projectId:         import.meta.env.VITE_FIREBASE_PROJECT_ID         || "eduzah-platform",
  storageBucket:     import.meta.env.VITE_FIREBASE_STORAGE_BUCKET     || "eduzah-platform.firebasestorage.app",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID|| "631874234277",
  appId:             import.meta.env.VITE_FIREBASE_APP_ID             || "1:631874234277:web:2dc4191b15308a610eaa4c",
  measurementId:     import.meta.env.VITE_FIREBASE_MEASUREMENT_ID     || "G-064XP85WB9",
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db   = getFirestore(app);
export { app, firebaseConfig };
export default app;
