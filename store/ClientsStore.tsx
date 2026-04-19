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
useEffect(() => {
  if (!userId || !clients.length) return;

  const updateMonthlyRent = async () => {
    console.log("🏁 Running monthly rent update...");

    for (const client of clients) {
      if (!client?.id || !client.activeRentals?.length) continue;

      let rentals = [...client.activeRentals];
      let changed = false;

      // remaining advance balance
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
  const rent = Number(rental.monthlyRent);

  // 1) Always log rent_auto
  await addDoc(paymentsRef, {
    amount: rent,
    date: formatDDMMYYYY(nextDue),
    type: "rent_auto",
    notes: `Auto rent added for cycle ${i + 1}`,
  });

  // 2) Add rent to pending
// 2) Apply prepaid logic
if (advanceBalance >= rent) {
    // advance fully covers rent
    advanceBalance -= rent;
    // pending unchanged
} else {
    // advance partially covers rent
    pending += (rent - advanceBalance);
    advanceBalance = 0;
}

// 3) Safety: pending should never go negative
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
        const totalPending = rentals.reduce(
          (s, r) => s + Number(r.pending || 0),
          0
        );

        await updateDoc(
          doc(db, userCollectionPath(userId, "clients"), client.id),
          {
            activeRentals: rentals,
            pendingAmount: totalPending,
            advance: advanceBalance,
          }
        );

        setClients((prev) =>
          prev.map((c) =>
            c.id === client.id
              ? {
                  ...c,
                  activeRentals: rentals,
                  pendingAmount: totalPending,
                  advance: advanceBalance,
                }
              : c
          )
        );
      }
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
    const rentChanged =
      newRental &&
      Number(oldRental.monthlyRent) !== Number(newRental.monthlyRent);

    if (newRental && (startDateChanged || rentChanged)) {
      const newStart = parseDDMMYYYY(newRental.startDate);
      const newRent = Number(newRental.monthlyRent);
      const today = new Date();

      const diffDays = Math.floor((today - newStart) / (1000 * 86400));
      const cyclesPassed = Math.max(Math.floor(diffDays / 30), 0);

      const totalRentLiability = newRent * (cyclesPassed + 1);
      const totalPayments = oldClient.totalPaidAmount || 0;
      const initialAdvance = oldClient.initialAdvance || 0;

      let remaining = totalPayments + initialAdvance - totalRentLiability;
      let newPending = remaining >= 0 ? 0 : Math.abs(remaining);
      let newAdvance = remaining >= 0 ? remaining : 0;

      const nextDue = addDays(newStart, 30 * (cyclesPassed + 1));

      finalUpdateData.activeRentals = [
        {
          ...oldRental,
          ...newRental,
          pending: newPending,
          nextRentDueDate: formatDDMMYYYY(nextDue),
        }
      ];

      finalUpdateData.pendingAmount = newPending;
      finalUpdateData.advance = newAdvance;
      finalUpdateData.initialAdvance = initialAdvance;
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

  return (
    <ClientsContext.Provider
      value={{ clients, addClient, updateClient, deleteClient, setClients }}
    >
      {children}
    </ClientsContext.Provider>
  );
}

export function useClients() {
  return useContext(ClientsContext);
}
