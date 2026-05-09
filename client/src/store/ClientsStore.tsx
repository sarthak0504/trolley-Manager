import React, { createContext, useContext, useState, useEffect } from 'react';
import { collection, onSnapshot } from 'firebase/firestore';
import { db } from '../../config/firebaseConfig';
import { clientsApi } from '../api/clients.api';
import { useTrolleys } from './TrolleyStore';

const ClientsContext = createContext<any>(null);

export function ClientsProvider({ children, userId }: { children: React.ReactNode; userId: string }) {
  const { updateTrolleyHistoryForClient } = useTrolleys();
  const [clients, setClients] = useState<any[]>([]);
  const [loaded, setLoaded] = useState(false);

  // Real-time reads — stays on Firebase Client SDK
  useEffect(() => {
    if (!userId) return;
    setLoaded(false);
    const colRef = collection(db, `users/${userId}/clients`);
    const unsub = onSnapshot(colRef, (snap) => {
      setClients(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
      setLoaded(true);
    });
    return () => unsub();
  }, [userId]);

  // Writes go through the Express API
  async function addClient(client: any) {
    await clientsApi.create(client);
  }

  async function updateClient(id: string, newDetails: any) {
    await clientsApi.update(id, newDetails);
    const newName = newDetails.name;
    const newStartDate = newDetails.activeRentals?.[0]?.startDate;
    if (newName) await updateTrolleyHistoryForClient(id, newName, newStartDate);
  }

  async function deleteClient(id: string) {
    await clientsApi.remove(id);
  }

  async function syncClientRent(clientId: string) {
    await clientsApi.syncRent(clientId);
  }

  async function editRentHistoryForCycle(
    clientId: string,
    trolleyNo: string,
    cycleDateStr: string,
    newRentAmount: number,
  ) {
    await clientsApi.editRentHistory(clientId, { trolleyNo, cycleDateStr, newRentAmount });
  }

  return (
    <ClientsContext.Provider
      value={{ clients, loaded, setClients, addClient, updateClient, deleteClient, syncClientRent, editRentHistoryForCycle }}
    >
      {children}
    </ClientsContext.Provider>
  );
}

export function useClients() {
  return useContext(ClientsContext);
}
