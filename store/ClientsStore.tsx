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

const getRentForCycle = (cycleDateStr, rentHistory, fallbackRent) => {
  if (!rentHistory || !rentHistory.length) return Number(fallbackRent);
  const cycleDate = parseDDMMYYYY(cycleDateStr);
  
  // Sort history ascending by date
  const sortedHistory = [...rentHistory].sort((a, b) => 
    parseDDMMYYYY(a.effectiveDate).getTime() - parseDDMMYYYY(b.effectiveDate).getTime()
  );
  
  let currentRent = Number(fallbackRent);
  for (const hist of sortedHistory) {
    if (parseDDMMYYYY(hist.effectiveDate).getTime() <= cycleDate.getTime()) {
      currentRent = Number(hist.amount);
    }
  }
  return currentRent;
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
  const { trolleys, updateTrolleyHistoryForClient } = useTrolleys();
  const [clients, setClients] = useState([]);

  // Helper to get client document reference
  const getClientRef = (clientId) =>
    doc(db, userCollectionPath(userId, "clients"), clientId);

  /* 🧠 Sync Clients Live */
  useEffect(() => {
    if (!userId) return;
    const colRef = collection(db, userCollectionPath(userId, "clients"));

    // initial load
    getDocs(colRef).then((snap) =>
      setClients(snap.docs.map((d) => ({ id: d.id, ...d.data() })))
    );

    const unsub = onSnapshot(colRef, (snap) => {
      const updated = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      setClients(updated);
    });
    return () => unsub();
  }, [userId]);

  /* 🧮 Auto Rent Update (runs once per day) — month-by-month processing */
/* 🧮 Auto Rent Update (runs once per day) — clean final version */
  const syncClientRent = async (clientId) => {
    if (!userId || !clients.length) return;
    const client = clients.find(c => c.id === clientId);
    if (!client || !client.activeRentals?.length) return;

    let rentals = [...client.activeRentals];
    let changed = false;
    let advanceBalance =
      client.advance !== undefined && client.advance !== null
        ? Number(client.advance)
        : Number(client.initialAdvance || 0);

    const paymentsRef = collection(
      db,
      `users/${userId}/clients/${client.id}/payments`
    );

    rentals = await Promise.all(
      rentals.map(async (rental) => {
        const today = new Date();
        const todayStr = formatDDMMYYYY(today);
        let dueDate = rental.nextRentDueDate
          ? parseDDMMYYYY(rental.nextRentDueDate)
          : null;

        if (!dueDate || isNaN(dueDate.getTime())) {
          const start = parseDDMMYYYY(rental.startDate);
          const firstDue = addDays(start, 30);
          return {
            ...rental,
            nextRentDueDate: formatDDMMYYYY(firstDue),
            lastRentAddedOn: formatDDMMYYYY(start),
          };
        }

        if (rental.lastRentAddedOn === todayStr) return rental;

        const todayClean = parseDDMMYYYY(todayStr);
        if (dueDate.getTime() > todayClean.getTime()) return rental;

        const diffDays = Math.floor(
          (today.getTime() - dueDate.getTime()) / (1000 * 86400)
        );
        const cyclesMissed = Math.max(Math.floor(diffDays / 30) + 1, 1);

        let pending = Number(rental.pending || 0);
        let nextDue = dueDate;

        for (let i = 0; i < cyclesMissed; i++) {
          changed = true;
          const cycleRent = getRentForCycle(formatDDMMYYYY(nextDue), rental.rentHistory, rental.monthlyRent);
          const rent = Number(cycleRent);

          await addDoc(paymentsRef, {
            amount: rent,
            date: formatDDMMYYYY(nextDue),
            type: "rent_auto",
            notes: `Auto rent added for cycle ${i + 1}`,
          });

          if (advanceBalance >= rent) {
              advanceBalance -= rent;
          } else {
              pending += (rent - advanceBalance);
              advanceBalance = 0;
          }

          if (pending < 0) {
              advanceBalance = Math.abs(pending);
              pending = 0;
          }
          nextDue = addDays(nextDue, 30);
        }

        return {
          ...rental,
          pending,
          nextRentDueDate: formatDDMMYYYY(nextDue),
          lastRentAddedOn: todayStr,
        };
      })
    );

    if (changed) {
      const activePending = rentals.reduce((s, r) => s + Number(r.pending || 0), 0);
      const pastPending = (client.pastRentals || []).reduce((s, r) => s + Number(r.pending || 0), 0);
      const totalPending = activePending + pastPending;

      await updateDoc(
        doc(db, userCollectionPath(userId, "clients"), client.id),
        {
          activeRentals: rentals,
          pendingAmount: totalPending,
          advance: advanceBalance,
        }
      );
    }
  };

useEffect(() => {
  if (!userId || !clients.length) return;



  const updateMonthlyRent = async () => {
    console.log("🏁 Running global monthly rent update...");
    for (const client of clients) {
      await syncClientRent(client.id);
    }
  };

  const run = async () => {
    const shouldRun = await checkAndMarkRunToday(userId);
    if (shouldRun) setTimeout(updateMonthlyRent, 1200);
  };

  run();
}, [userId, clients.length]);


  /* 🧾 Add New Client (detailed accounting, logs initial advance once) */
async function addClient(client) {
  if (!userId || !client?.activeRentals?.length) return;

  const rental = client.activeRentals[0];
  const start = parseDDMMYYYY(rental.startDate);
  const today = new Date();
  const rent = Number(rental.monthlyRent);

  let advance = Number(client.advance) || 0;
  let pending = 0;

  // Calculate how many past rent cycles have passed
  const diffDays = Math.floor((today - start) / (1000 * 60 * 60 * 24));
  const cyclesPassed = diffDays >= 30 ? Math.floor(diffDays / 30) + 1 : 1;

  // Apply PREPAID LOGIC month-by-month including month 1
  for (let i = 0; i < cyclesPassed; i++) {

    if (advance >= rent) {
      advance -= rent;
    } else {
      pending += (rent - advance);
      advance = 0;
    }

    // Safety: if pending accidentally goes negative
    if (pending < 0) {
      advance = Math.abs(pending);
      pending = 0;
    }
  }

  // Next due date is start + cyclesPassed*30
  const nextDueDate = addDays(start, 30 * cyclesPassed);

  const updatedRental = {
    ...rental,
    startDate: formatDDMMYYYY(start),
    pending,
    nextRentDueDate: formatDDMMYYYY(nextDueDate),
    lastRentAddedOn: formatDDMMYYYY(start),
    rentHistory: [{ effectiveDate: formatDDMMYYYY(start), amount: rent }],
  };

  const newClient = {
    ...client,
    userId,
    activeRentals: [updatedRental],
    pendingAmount: pending,
    totalPaidAmount: 0,
    advance,
    initialAdvance: Number(client.advance) || 0,
  };

  try {
    const colRef = collection(db, userCollectionPath(userId, "clients"));
    const clientDocRef = await addDoc(colRef, newClient);

    const paymentsRef = collection(
      db,
      `users/${userId}/clients/${clientDocRef.id}/payments`
    );

    // Log initial advance once
    if (Number(client.advance) > 0) {
      await addDoc(paymentsRef, {
        amount: Number(client.advance),
        date: formatDDMMYYYY(start),
        type: "advance_manual",
        notes: `Initial advance ₹${client.advance}`,
      });
    }

    // update trolley state
    const trolleyRef = doc(
      db,
      userCollectionPath(userId, "trolleys"),
      rental.trolleyNo
    );

    const currentTrolley = trolleys.find(t => t.id === rental.trolleyNo);

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


  // 🆕 UPDATE EXISTING CLIENT (unchanged semantics, preserves recalculation logic)
async function updateClient(id, newDetails) {
  if (!userId || !id) return;

  const clientRef = getClientRef(id);

  try {
    const snap = await getDoc(clientRef);
    const oldClient = snap.data();
    if (!oldClient) return;

    const oldRental = oldClient.activeRentals?.[0] || {};
    const newRental = newDetails.activeRentals?.[0] || null;

    // Merge safely (fixes pending reset issue)
    let finalUpdateData = {
      ...oldClient,
      ...newDetails
    };

    const startDateChanged =
      newRental && oldRental.startDate !== newRental.startDate;

    if (newRental && startDateChanged) {
       finalUpdateData.activeRentals = [
         {
           ...oldRental,
           ...newRental
         }
       ];
    }

    Object.keys(finalUpdateData).forEach((k) => {
      if (finalUpdateData[k] === undefined) delete finalUpdateData[k];
    });

    await updateDoc(clientRef, finalUpdateData);

    // 🔄 Update trolley history when client name/date changes
    try {
      const newName = finalUpdateData.name || oldClient.name;
      const newStartDate = finalUpdateData.activeRentals?.[0]?.startDate;

      await updateTrolleyHistoryForClient(id, newName, newStartDate);
    } catch (err) {
      console.error("⚠ Failed updating trolley history:", err);
    }

  } catch (err) {
    console.error(`❌ Failed to update client ${id}:`, err.message);
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
          const trolleyRef = doc(
            db,
            userCollectionPath(userId, "trolleys"),
            rental.trolleyNo
          );

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

  // 🆕 RECALCULATE ENTIRE RENT HISTORY FOR A RENTAL
  async function editRentHistoryForCycle(clientId, trolleyNo, targetCycleDateStr, newRentAmount) {
    if (!userId || !clientId || !trolleyNo) return;
    
    try {
      const clientRef = getClientRef(clientId);
      const snap = await getDoc(clientRef);
      const clientData = snap.data();
      if (!clientData) return;

      const rentalIndex = clientData.activeRentals?.findIndex(r => r.trolleyNo === trolleyNo);
      if (rentalIndex === -1 || rentalIndex === undefined) return;

      const rental = clientData.activeRentals[rentalIndex];
      const oldHistory = JSON.parse(JSON.stringify(rental.rentHistory || [{ effectiveDate: rental.startDate, amount: rental.monthlyRent }]));
      let updatedHistory = JSON.parse(JSON.stringify(oldHistory));
      
      const existingEntryIndex = updatedHistory.findIndex(h => h.effectiveDate === targetCycleDateStr);
      if (existingEntryIndex >= 0) {
        updatedHistory[existingEntryIndex].amount = newRentAmount;
      } else {
        updatedHistory.push({ effectiveDate: targetCycleDateStr, amount: newRentAmount });
      }

      // Sort just in case
      updatedHistory.sort((a, b) => parseDDMMYYYY(a.effectiveDate).getTime() - parseDDMMYYYY(b.effectiveDate).getTime());
      clientData.activeRentals[rentalIndex].rentHistory = updatedHistory;

      // Now we must re-calculate ALL cycles from startDate to the exact cycle limit
      let lastDateStr = rental.nextRentDueDate || rental.lastRentAddedOn;
      if (!lastDateStr) lastDateStr = formatDDMMYYYY(addDays(parseDDMMYYYY(rental.startDate), 30));
      
      const start = parseDDMMYYYY(rental.startDate);
      const end = parseDDMMYYYY(lastDateStr);
      let iterDate = start; // Include the starting month cycle
      
      let oldLiability = 0;
      let newLiability = 0;
      
      // Let's gather all cycles and update rent_auto documents cosmetically
      const paymentsRef = collection(db, `users/${userId}/clients/${clientId}/payments`);
      const paymentsSnap = await getDocs(paymentsRef);
      const paymentsLocalList = paymentsSnap.docs.map(d => ({ id: d.id, ...d.data() }));

      while (iterDate.getTime() < end.getTime()) {
          const cycleStr = formatDDMMYYYY(iterDate);
          
          const correctNewRent = getRentForCycle(cycleStr, updatedHistory, rental.monthlyRent);
          const correctOldRent = getRentForCycle(cycleStr, oldHistory, rental.monthlyRent);
          
          newLiability += correctNewRent;
          oldLiability += correctOldRent;

          // Find the rent_auto payment for this cycle and optionally update its amount in DB purely for visual sync
          const autoRentDoc = paymentsLocalList.find(p => p.type === "rent_auto" && p.date === cycleStr);
          if (autoRentDoc && autoRentDoc.amount !== correctNewRent) {
             const docRef = doc(db, `users/${userId}/clients/${clientId}/payments`, autoRentDoc.id);
             await updateDoc(docRef, { amount: correctNewRent, notes: `Auto rent updated for cycle (${cycleStr})` });
          }

          iterDate = addDays(iterDate, 30);
        }

        const exactLiabilityDifference = newLiability - oldLiability;
        let currentAdvance = Number(clientData.advance || 0);
        let currentPending = Number(clientData.pendingAmount || 0);

        if (exactLiabilityDifference > 0) {
           // Rent increased, charge more
           if (currentAdvance >= exactLiabilityDifference) {
              currentAdvance -= exactLiabilityDifference;
           } else {
              currentPending += (exactLiabilityDifference - currentAdvance);
              currentAdvance = 0;
           }
        } else if (exactLiabilityDifference < 0) {
           // Rent decreased, give credit back
           const credit = Math.abs(exactLiabilityDifference);
           if (currentPending >= credit) {
              currentPending -= credit;
           } else {
              currentAdvance += (credit - currentPending);
              currentPending = 0;
           }
        }

        clientData.advance = currentAdvance;
        clientData.pendingAmount = currentPending;

        // Keep local rental pending approximation synced
        let localPending = Number(clientData.activeRentals[rentalIndex].pending || 0);
        localPending += exactLiabilityDifference;
        if (localPending < 0) localPending = 0;
        clientData.activeRentals[rentalIndex].pending = localPending;

        await updateDoc(clientRef, {
           activeRentals: clientData.activeRentals,
           advance: clientData.advance,
           pendingAmount: clientData.pendingAmount
        });

      // Block complete, data saved!
    } catch (e) {
      console.error("Recalculate error:", e);
    }
  }

  return (
    <ClientsContext.Provider
      value={{ clients, addClient, updateClient, deleteClient, editRentHistoryForCycle, syncClientRent, setClients }}
    >
      {children}
    </ClientsContext.Provider>
  );
}

export function useClients() {
  return useContext(ClientsContext);
}
