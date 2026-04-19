
import React, { createContext, useContext, useState, useEffect } from "react";
import {
  collection,
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

  // ✅ Load + Sync Trolleys
  useEffect(() => {
    if (!userId) return;

    const colRef = collection(db, userCollectionPath(userId, "trolleys"));

    // Initial fast load
    getDocs(colRef).then((snap) => {
      const loaded = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      setTrolleys(loaded);
    });

    // Live updates
    const unsub = onSnapshot(colRef, (snap) => {
      const live = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      setTrolleys(live);
    });

    return () => unsub();
  }, [userId]);

  // ✅ Add new trolley
  async function addTrolley(id) {
    const newTrolley = {
      id,
      isAvailable: true,
      currentClient: null,
      pending: 0,
      history: [],
    };

    setTrolleys((prev) => [...prev, newTrolley]);

    await setDoc(
      doc(db, userCollectionPath(userId, "trolleys"), id),
      newTrolley
    );
  }

  // ✅ Toggle availability manually
  async function toggleAvailability(id) {
    const trolley = trolleys.find((t) => t.id === id);
    if (!trolley) return;

    const updated = {
      ...trolley,
      isAvailable: !trolley.isAvailable,
      currentClient: trolley.isAvailable ? null : trolley.currentClient,
    };

    setTrolleys((prev) =>
      prev.map((t) => (t.id === id ? updated : t))
    );

    await updateDoc(
      doc(db, userCollectionPath(userId, "trolleys"), id),
      updated
    );
  }

  // ✅ Assign trolley to client
  async function assignTrolley(trolleyId, clientId, clientName) {
    const trolley = trolleys.find((t) => t.id === trolleyId);
    if (!trolley) return;

    const updated = {
      ...trolley,
      isAvailable: false,
      currentClient: clientName,
      history: [
        ...trolley.history,
        {
          clientId,
          clientName,
          fromDate: new Date().toLocaleDateString(),
          toDate: null,
        },
      ],
    };

    setTrolleys((prev) =>
      prev.map((t) => (t.id === trolleyId ? updated : t))
    );

    await updateDoc(
      doc(db, userCollectionPath(userId, "trolleys"), trolleyId),
      updated
    );
  }

  // ✅ Mark trolley returned + adjust payment
  async function markReturned(trolleyId, toDate, adjustedPayment = 0) {
    const trolley = trolleys.find((t) => t.id === trolleyId);
    if (!trolley) return;

    const updatedHistory = [...trolley.history];
    const last = updatedHistory[updatedHistory.length - 1];

    if (last) last.toDate = toDate;

    const currentPending = trolley.pending || 0;
    const newPending = currentPending - adjustedPayment;

    const updated = {
      ...trolley,
      isAvailable: true,
      currentClient: null,
      pending: newPending,
      history: updatedHistory,
    };

    setTrolleys((prev) =>
      prev.map((t) => (t.id === trolleyId ? updated : t))
    );

    await updateDoc(
      doc(db, userCollectionPath(userId, "trolleys"), trolleyId),
      updated
    );
  }

  // ✅ Update trolley history if client details change
  async function updateTrolleyHistoryForClient(
    clientId,
    newName,
    newStartDate = null
  ) {
    const affectedTrolleys = trolleys.filter((t) =>
      t.history?.some((h) => h.clientId === clientId)
    );

    for (const trolley of affectedTrolleys) {
      const updatedHistory = trolley.history.map((entry) => {
        if (entry.clientId !== clientId) return entry;

        return {
          ...entry,
          clientName: newName,
          fromDate: newStartDate || entry.fromDate,
        };
      });

      const updated = { ...trolley, history: updatedHistory };

      setTrolleys((prev) =>
        prev.map((t) => (t.id === trolley.id ? updated : t))
      );

      await updateDoc(
        doc(db, userCollectionPath(userId, "trolleys"), trolley.id),
        { history: updatedHistory }
      );
    }
  }

  return (
    <TrolleyContext.Provider
      value={{
        trolleys,
        addTrolley,
        toggleAvailability,
        assignTrolley,
        markReturned,
        updateTrolleyHistoryForClient,
      }}
    >
      {children}
    </TrolleyContext.Provider>
  );
}

export function useTrolleys() {
  return useContext(TrolleyContext);
}

