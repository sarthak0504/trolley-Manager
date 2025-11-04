import React, { createContext, useContext, useState, useEffect } from "react";
import { collection, addDoc, getDocs, onSnapshot } from "firebase/firestore";
import { db } from "../config/firebaseConfig";
import { userCollectionPath } from "../config/firestorePaths";

const ClientsContext = createContext(null);

export function ClientsProvider({ children, userId }) {
  const [clients, setClients] = useState([]);

  useEffect(() => {
    if (!userId) return;

    const colRef = collection(db, userCollectionPath(userId, "clients"));

    // Load once fast
    getDocs(colRef).then((snap) => {
      const loaded = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      setClients(loaded);
    });

    // Live updates
    const unsub = onSnapshot(colRef, (snap) => {
      const updated = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      setClients(updated);
    });

    return () => unsub();
  }, [userId]);

  // ✅ New improved addClient
  async function addClient(client) {
  const newClient = {
    ...client,
    userId, // ✅ ensure Firestore path can be built later
    pendingAmount: Number(client.pendingAmount || 0),
    totalPaidAmount: Number(client.totalPaidAmount || 0),
  };

  // ✅ UI updates instantly
  setClients((prev) => [...prev, newClient]);

  // ✅ Save to Firestore
  const colRef = collection(db, userCollectionPath(userId, "clients"));
  await addDoc(colRef, newClient);
}


  return (
    <ClientsContext.Provider value={{ clients, addClient, setClients }}>
      {children}
    </ClientsContext.Provider>
  );
}

export function useClients() {
  return useContext(ClientsContext);
}
