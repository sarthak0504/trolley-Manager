import { Platform } from "react-native";
import { initializeApp } from "firebase/app";
import {
  initializeAuth,
  getAuth,
  getReactNativePersistence,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut as firebaseSignOut,
} from "firebase/auth";
import ReactNativeAsyncStorage from "@react-native-async-storage/async-storage";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyBbPKZT48q-ofeQXPIopwErOw-xVN9CsMM",
  authDomain: "trolley-rental-app-7ffe9.firebaseapp.com",
  projectId: "trolley-rental-app-7ffe9",
  storageBucket: "trolley-rental-app-7ffe9.appspot.com",
  messagingSenderId: "636046974589",
  appId: "1:636046974589:web:5828f5d354d6bda9819b14",
};

const app = initializeApp(firebaseConfig);

const auth =
  Platform.OS === "web"
    ? getAuth(app)
    : initializeAuth(app, {
        persistence: getReactNativePersistence(ReactNativeAsyncStorage),
      });

const db = getFirestore(app);

export async function signIn(email, password) {
  const credential = await signInWithEmailAndPassword(auth, email, password);
  return credential.user;
}

export async function signUp(email, password) {
  const credential = await createUserWithEmailAndPassword(auth, email, password);
  return credential.user;
}

export async function signOut() {
  await firebaseSignOut(auth);
}

export { auth, db };