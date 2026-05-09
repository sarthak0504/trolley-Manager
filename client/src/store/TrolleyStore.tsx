import React, { createContext, useContext, useState, useEffect } from 'react';
import { collection, onSnapshot } from 'firebase/firestore';
import { db } from '../../config/firebaseConfig';
import { trolleysApi } from '../api/trolleys.api';

const TrolleyContext = createContext<any>(null);

export function TrolleyProvider({ children, userId }: { children: React.ReactNode; userId: string }) {
  const [trolleys, setTrolleys] = useState<any[]>([]);
  const [loaded, setLoaded] = useState(false);

  // Real-time reads — stays on Firebase Client SDK
  useEffect(() => {
    if (!userId) return;
    setLoaded(false);
    const colRef = collection(db, `users/${userId}/trolleys`);
    const unsub = onSnapshot(colRef, (snap) => {
      setTrolleys(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
      setLoaded(true);
    });
    return () => unsub();
  }, [userId]);

  async function addTrolley(id: string) {
    await trolleysApi.create({ id });
  }

  async function toggleAvailability(id: string) {
    await trolleysApi.toggle(id);
  }

  async function assignTrolley(trolleyId: string, clientId: string, clientName: string) {
    await trolleysApi.assign(trolleyId, { clientId, clientName });
  }

  async function markReturned(trolleyId: string, toDate: string, adjustedPayment = 0) {
    await trolleysApi.markReturned(trolleyId, { toDate, adjustedPayment });
  }

  async function updateTrolleyHistoryForClient(
    clientId: string,
    newName: string,
    newStartDate?: string,
  ) {
    await trolleysApi.updateHistory(clientId, { newName, newStartDate });
  }

  return (
    <TrolleyContext.Provider
      value={{ trolleys, loaded, addTrolley, toggleAvailability, assignTrolley, markReturned, updateTrolleyHistoryForClient }}
    >
      {children}
    </TrolleyContext.Provider>
  );
}

export function useTrolleys() {
  return useContext(TrolleyContext);
}
