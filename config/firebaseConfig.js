// config/firebaseConfig.js
import { initializeApp } from "firebase/app";
import { initializeAuth, getReactNativePersistence, signInWithEmailAndPassword } from "firebase/auth";
import ReactNativeAsyncStorage from "@react-native-async-storage/async-storage";
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


const auth = initializeAuth(app, {
  persistence: getReactNativePersistence(ReactNativeAsyncStorage),
});

const db = getFirestore(app);

export async function initAuth(setUserId) {
  const email = "mayank@trolley.com";
  const password = "mayank8989";

  const userCredential = await signInWithEmailAndPassword(auth, email, password);
  setUserId(userCredential.user.uid);
}

export { auth, db };