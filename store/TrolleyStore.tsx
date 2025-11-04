import React, { createContext, useContext, useState, useEffect } from "react";
import {
  collection,
  addDoc,
  getDocs,
  onSnapshot,
  updateDoc,
  doc,
  setDoc,
} from "firebase/firestore";
import { db } from "../config/firebaseConfig";
import { userCollectionPath } from "../config/firestorePaths";

const TrolleyContext = createContext(null);

export function TrolleyProvider({ children, userId }) {
  const [trolleys, setTrolleys] = useState([]);

  // ✅ Load + Sync in Background
  useEffect(() => {
    if (!userId) return;

    const colRef = collection(db, userCollectionPath(userId, "trolleys"));

    // Load once fast
    getDocs(colRef).then((snap) => {
      const loaded = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      setTrolleys(loaded);
    });

    // Then listen live
    const unsub = onSnapshot(colRef, (snap) => {
      const live = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      setTrolleys(live);
    });

    return () => unsub();
  }, [userId]);

  // ✅ Add trolley (instant UI + background Firestore write)
  async function addTrolley(id) {
    const newTrolley = {
      id,
      isAvailable: true,
      currentClient: null,
      history: [],
    };

    setTrolleys((prev) => [...prev, newTrolley]);

    const colRef = collection(db, userCollectionPath(userId, "trolleys"));
    await setDoc(doc(db, userCollectionPath(userId, "trolleys"), id), newTrolley);
  }

  // ✅ Toggle Availability
  async function toggleAvailability(id) {
    const trolley = trolleys.find((t) => t.id === id);
    if (!trolley) return;

    const updated = {
      ...trolley,
      isAvailable: !trolley.isAvailable,
      currentClient: trolley.isAvailable ? null : trolley.currentClient,
    };

    setTrolleys((prev) => prev.map((t) => (t.id === id ? updated : t)));

    await updateDoc(doc(db, userCollectionPath(userId, "trolleys"), id), updated);
  }

  // ✅ Assign to Client
  async function assignTrolley(trolleyId, clientId, clientName) {
    const trolley = trolleys.find((t) => t.id === trolleyId);
    if (!trolley) return;

    const updated = {
      ...trolley,
      isAvailable: false,
      currentClient: clientName,
      history: [
        ...trolley.history,
        { clientId, clientName, fromDate: new Date().toLocaleDateString(), toDate: null },
      ],
    };

    setTrolleys((prev) =>
      prev.map((t) => (t.id === trolleyId ? updated : t))
    );

    await updateDoc(doc(db, userCollectionPath(userId, "trolleys"), trolleyId), updated);
  }

  // ✅ Mark Returned
  async function markReturned(trolleyId, toDate) {
    const trolley = trolleys.find((t) => t.id === trolleyId);
    if (!trolley) return;

    const updatedHistory = [...trolley.history];
    const last = updatedHistory[updatedHistory.length - 1];
    if (last) last.toDate = toDate;

    const updated = {
      ...trolley,
      isAvailable: true,
      currentClient: null,
      history: updatedHistory,
    };

    setTrolleys((prev) =>
      prev.map((t) => (t.id === trolleyId ? updated : t))
    );

    await updateDoc(doc(db, userCollectionPath(userId, "trolleys"), trolleyId), updated);
  }

  return (
    <TrolleyContext.Provider
      value={{ trolleys, addTrolley, toggleAvailability, assignTrolley, markReturned }}
    >
      {children}
    </TrolleyContext.Provider>
  );
}

export function useTrolleys() {
  return useContext(TrolleyContext);
}
