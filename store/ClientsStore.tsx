import React, { createContext, useContext, useState, useEffect } from "react";
import {
  collection,
  addDoc,
  onSnapshot,
  doc,
  updateDoc,
  deleteDoc, 
  getDoc,
  getDocs,
} from "firebase/firestore";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { db } from "../config/firebaseConfig";
import { userCollectionPath } from "../config/firestorePaths";
import { useTrolleys } from "./TrolleyStore";

const ClientsContext = createContext(null);

/* ---------------------- 🔧 Helper Functions ---------------------- */

const addDays = (date, days) => {
  const newDate = new Date(date);
  newDate.setDate(newDate.getDate() + days);
  return newDate;
};

const parseDDMMYYYY = (str) => {
  if (!str) return new Date(0);
  const [day, month, year] = str.split("-");
  return new Date(`${year}-${month}-${day}T00:00:00`);
};

const formatDDMMYYYY = (date) => {
  const d = new Date(date);
  const day = String(d.getDate()).padStart(2, "0");
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const year = d.getFullYear();
  return `${day}-${month}-${year}`;
};

const checkAndMarkRunToday = async (userId) => {
  const today = formatDDMMYYYY(new Date());
  const key = `lastRentUpdate_${userId}`;
  try {
    const lastRun = await AsyncStorage.getItem(key);
    if (lastRun === today) return false;
    await AsyncStorage.setItem(key, today);
    return true;
  } catch {
    return true;
  }
};

/* ---------------------- 🧭 Main Clients Provider ---------------------- */

export function ClientsProvider({ children, userId }) {
  const { trolleys } = useTrolleys();
  const [clients, setClients] = useState([]);

  // Helper to get client document reference
  const getClientRef = (clientId) => doc(db, userCollectionPath(userId, "clients"), clientId);

  /* 🧠 Sync Clients Live */
  useEffect(() => {
    if (!userId) return;
    const colRef = collection(db, userCollectionPath(userId, "clients"));
    
    getDocs(colRef).then((snap) =>
      setClients(snap.docs.map((d) => ({ id: d.id, ...d.data() })))
    );

    const unsub = onSnapshot(colRef, (snap) => {
      const updated = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      setClients(updated);
    });
    return () => unsub();
  }, [userId]);

  /* 🧮 Auto Rent Update (runs once per day) */
  useEffect(() => {
    if (!userId || !clients.length) return;

    const updateMonthlyRent = async () => {
      console.log("🏁 Running monthly rent update...");

      for (const client of clients) {
        if (!client?.id || !client.activeRentals?.length) continue;

        let updatedRentals = [...client.activeRentals];
        let changed = false;
        let advanceBalance = Number(client.advance) || 0;

        updatedRentals = await Promise.all(
          updatedRentals.map(async (rental) => {
            const today = new Date();
            const todayStr = formatDDMMYYYY(today);
            let dueDate = rental.nextRentDueDate
              ? parseDDMMYYYY(rental.nextRentDueDate)
              : null;

            if (!dueDate || isNaN(dueDate.getTime())) {
              const start = parseDDMMYYYY(rental.startDate);
              dueDate = addDays(start, 30);
              return {
                ...rental,
                nextRentDueDate: formatDDMMYYYY(dueDate),
                lastRentAddedOn: null,
              };
            }

            const lastAdded = rental.lastRentAddedOn || "";
            if (lastAdded === todayStr) return rental;
            
            if (dueDate.getTime() > parseDDMMYYYY(formatDDMMYYYY(today)).getTime()) return rental; 

            const diffDays = Math.floor((today.getTime() - dueDate.getTime()) / (1000 * 86400));
            const cyclesMissed = Math.max(Math.floor(diffDays / 30) + 1, 1);

            changed = true;
            const monthlyRent = Number(rental.monthlyRent);
            const totalRentToAccrue = monthlyRent * cyclesMissed;
            let newPending = rental.pending || 0;
            let advanceUsed = 0;

            // --- RENT ACCRUAL LOGIC (UPDATES PENDING/ADVANCE ONLY) ---
            if (advanceBalance >= totalRentToAccrue) {
              advanceUsed = totalRentToAccrue;
              advanceBalance -= totalRentToAccrue;
            } else if (advanceBalance > 0) {
              advanceUsed = advanceBalance;
              newPending += totalRentToAccrue - advanceUsed;
              advanceBalance = 0;
            } else {
              newPending += totalRentToAccrue;
            }
            
            // --- LOGGING/PAYMENT SIDE EFFECTS (Only log advance consumption) ---
            
            const paymentsRef = collection(
              db,
              `users/${userId}/clients/${client.id}/payments`
            );

            if (advanceUsed > 0) {
              await addDoc(paymentsRef, {
                amount: advanceUsed,
                date: todayStr,
                notes: `Advance ₹${advanceUsed} auto-applied for ${cyclesMissed} month(s) rent accrual.`,
                type: "advance_auto",
              });
            }
            
            const nextDue = addDays(dueDate, 30 * cyclesMissed);
            return {
              ...rental,
              pending: newPending,
              nextRentDueDate: formatDDMMYYYY(nextDue),
              lastRentAddedOn: todayStr,
            };
          })
        );

        if (changed) {
          const totalPending = updatedRentals.reduce(
            (sum, r) => sum + (r.pending || 0),
            0
          );
          const updatedClient = {
            ...client,
            activeRentals: updatedRentals,
            pendingAmount: totalPending,
            advance: advanceBalance,
          };
          await updateDoc(
            doc(db, userCollectionPath(userId, "clients"), client.id),
            updatedClient
          );
        }
      }
    };

    const run = async () => {
      const shouldRun = await checkAndMarkRunToday(userId);
      if (shouldRun) setTimeout(updateMonthlyRent, 1500);
    };
    run();
  }, [userId, clients.length]);

  /* 🧾 Add New Client (remains the same) */
  async function addClient(client) {
    if (!userId || !client?.activeRentals?.length) return;

    const rental = client.activeRentals[0];
    const start = parseDDMMYYYY(rental.startDate);
    const today = new Date();
    const monthlyRent = Number(rental.monthlyRent);
    const advance = Number(client.advance) || 0;

    const diffDays = Math.floor((today.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
    const cyclesPassed = diffDays >= 30 ? Math.floor(diffDays / 30) : 0;
    const nextDueDate = addDays(start, 30 * (cyclesPassed + 1));

    let pending = 0;
    let remainingAdvance = advance;
    let advanceUsed = 0;

    // 1. Calculate rent for the first month
    if (advance >= monthlyRent) {
      advanceUsed = monthlyRent;
      remainingAdvance = advance - monthlyRent;
    } else if (advance > 0) {
      advanceUsed = advance;
      remainingAdvance = 0;
      pending = monthlyRent - advance;
    } else {
      pending = monthlyRent;
    }

    // 2. Accrue rent for already elapsed months (adds to pending, NOT payments)
    if (cyclesPassed > 0) pending += monthlyRent * cyclesPassed;

    const updatedRental = {
      ...rental,
      startDate: formatDDMMYYYY(start),
      pending,
      nextRentDueDate: formatDDMMYYYY(nextDueDate),
      lastRentAddedOn: cyclesPassed > 0 ? formatDDMMYYYY(today) : null,
    };

    const newClient = {
      ...client,
      userId,
      activeRentals: [updatedRental],
      pendingAmount: pending,
      totalPaidAmount: 0,
      advance: remainingAdvance,
      initialAdvance: advance,
    };

    try {
      const colRef = collection(db, userCollectionPath(userId, "clients"));
      const clientDocRef = await addDoc(colRef, newClient);
      const paymentsRef = collection(
        db,
        `users/${userId}/clients/${clientDocRef.id}/payments`
      );

      // 💰 Log advance usage (correctly logs an actual advance application)
      if (advanceUsed > 0) {
        await addDoc(paymentsRef, {
          amount: advanceUsed,
          date: formatDDMMYYYY(start),
          notes: `Advance ₹${advanceUsed} used for first month's rent.`,
          type: "advance_auto",
        });
      }

      // 🛒 Update trolley
      const trolleyRef = doc(
        db,
        userCollectionPath(userId, "trolleys"),
        rental.trolleyNo
      );
      const currentTrolley = trolleys.find((t) => t.id === rental.trolleyNo);

      await updateDoc(trolleyRef, {
        isAvailable: false,
        currentClient: newClient.name,
        currentClientId: clientDocRef.id,
        history: [
          ...(currentTrolley?.history || []),
          {
            action: "Rented",
            clientName: newClient.name,
            clientId: clientDocRef.id,
            date: formatDDMMYYYY(new Date()),
          },
        ],
      });

    } catch (err) {
      console.error("❌ Failed to add client:", err.message);
    }
  }

  // 🆕 UPDATE EXISTING CLIENT
  async function updateClient(id, newDetails) {
    if (!userId || !id) return;
    
    const clientRef = getClientRef(id);
    let finalUpdateData = { ...newDetails };

    try {
        const snap = await getDoc(clientRef);
        const oldClient = snap.data();
        
        const oldRental = oldClient.activeRentals?.[0] || {};
        const newRental = newDetails.activeRentals?.[0] || {};

        // Check if critical financial fields have changed
        const startDateChanged = oldRental.startDate !== newRental.startDate;
        const rentChanged = Number(oldRental.monthlyRent) !== Number(newRental.monthlyRent);

        // --- RECALCULATION LOGIC ONLY IF START DATE OR RENT CHANGES ---
        if (startDateChanged || rentChanged) {
            const newStart = parseDDMMYYYY(newRental.startDate);
            const newMonthlyRent = Number(newRental.monthlyRent);
            const today = new Date();

            // 1. Calculate total rent accrued based on the NEW schedule (since start date up to now)
            const diffDays = Math.floor((today.getTime() - newStart.getTime()) / (1000 * 60 * 60 * 24));
            // Total cycles passed (including the current, likely incomplete cycle)
            const totalCyclesAccrued = Math.max(Math.floor(diffDays / 30), 0);
            
            // Total Rent Liability: Rent for all full cycles passed + the rent for the current, first cycle.
            const totalRentLiability = newMonthlyRent * (totalCyclesAccrued + 1);

            // 2. Base totals on existing payments
            const totalPaymentsReceived = oldClient.totalPaidAmount || 0; 
            const initialAdvance = oldClient.initialAdvance || 0; // Use old initial advance
            
            // 3. Determine New Pending and New Advance Balance
            let amountLeftAfterLiability = totalPaymentsReceived + initialAdvance - totalRentLiability;
            
            let newPending;
            let newAdvanceBalance;

            if (amountLeftAfterLiability >= 0) {
                // Client has paid enough; no pending.
                newPending = 0;
                newAdvanceBalance = amountLeftAfterLiability;
            } else {
                // Client owes money (negative amountLeftAfterLiability)
                newPending = Math.abs(amountLeftAfterLiability);
                newAdvanceBalance = 0;
            }

            // 4. Calculate Next Due Date based on the NEW Start Date
            const nextDueDate = addDays(newStart, 30 * (totalCyclesAccrued + 1));

            // 5. Update the rental object within the activeRentals array
            const recalculatedRental = {
                ...newRental,
                pending: newPending,
                nextRentDueDate: formatDDMMYYYY(nextDueDate),
                // lastRentAddedOn should be handled by the daily auto-update listener
            };

            finalUpdateData = {
                ...newDetails,
                activeRentals: [recalculatedRental], 
                pendingAmount: newPending,
                advance: newAdvanceBalance,
                initialAdvance: initialAdvance, // Preserve initial advance
                // totalPaidAmount remains totalPaymentsReceived
            };
        }
        // --- END RECALCULATION ---

        await updateDoc(clientRef, finalUpdateData);
    } catch (err) {
        console.error(`❌ Failed to update client ${id}:`, err.message);
        // Fallback or error message for the user
    }
  }

  // 🆕 DELETE CLIENT
  async function deleteClient(id) {
    if (!userId || !id) return;
    try {
      const clientRef = getClientRef(id);
      
      const snap = await getDoc(clientRef);
      const clientData = snap.data();
      
      await deleteDoc(clientRef);
      
      if (clientData?.activeRentals?.length) {
        for (const rental of clientData.activeRentals) {
          const trolleyRef = doc(db, userCollectionPath(userId, "trolleys"), rental.trolleyNo);
          
          await updateDoc(trolleyRef, {
            isAvailable: true,
            currentClient: null,
            currentClientId: null,
          });
        }
      }

    } catch (err) {
      console.error(`❌ Failed to delete client ${id}:`, err.message);
    }
  }


  return (
    <ClientsContext.Provider value={{ clients, addClient, updateClient, deleteClient, setClients }}>
      {children}
    </ClientsContext.Provider>
  );
}

export function useClients() {
  return useContext(ClientsContext);
}