import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyDlIpNL8CS5FPK7vipsDd2Vac-v8GGdNac",
  authDomain: "eduzah-platform.firebaseapp.com",
  projectId: "eduzah-platform",
  storageBucket: "eduzah-platform.firebasestorage.app",
  messagingSenderId: "631874234277",
  appId: "1:631874234277:web:2dc4191b15308a610eaa4c",
  measurementId: "G-064XP85WB9",
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db   = getFirestore(app);
export default app;
