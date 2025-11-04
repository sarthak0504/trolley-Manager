// config/firebaseConfig.js
import { initializeApp } from "firebase/app";
import {
  initializeAuth,
  getReactNativePersistence,
  onAuthStateChanged,
  signInAnonymously
} from "firebase/auth";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { getFirestore } from "firebase/firestore";

// 🔥 REPLACE THESE VALUES WITH YOURS FROM FIREBASE CONSOLE
const firebaseConfig = {
  apiKey: "AIzaSyBbPKZT48q-ofeQXPIopwErOw-xVN9CsMM",
  authDomain: "trolley-rental-app-7ffe9.firebaseapp.com",
  projectId: "trolley-rental-app-7ffe9",
  storageBucket: "trolley-rental-app-7ffe9.appspot.com",
  messagingSenderId: "636046974589",
  appId: "1:636046974589:web:5828f5d354d6bda9819b14"
};

const app = initializeApp(firebaseConfig);

// ✅ Auth that persists across app restarts
const auth = initializeAuth(app, {
  persistence: getReactNativePersistence(AsyncStorage),
});

// ✅ Firestore database
const db = getFirestore(app);

// ✅ Auto Anonymous Login
export function initAuth(onReady) {
  onAuthStateChanged(auth, (user) => {
    if (!user) {
      signInAnonymously(auth);
    } else {
      onReady(user.uid);
    }
  });
}

export { auth, db };
