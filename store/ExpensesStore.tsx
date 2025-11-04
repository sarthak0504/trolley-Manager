import React, { createContext, useContext, useEffect, useState } from "react";
import {
  collection,
  addDoc,
  getDocs,
  onSnapshot
} from "firebase/firestore";
import { db } from "../config/firebaseConfig";
import { userCollectionPath } from "../config/firestorePaths";

const ExpensesContext = createContext(null);

export function ExpensesProvider({ children, userId }) {
  const [expenses, setExpenses] = useState([]);

  // ✅ Load once + Sync live in background
  useEffect(() => {
    if (!userId) return;

    const colRef = collection(db, userCollectionPath(userId, "expenses"));

    // Load once (fast)
    getDocs(colRef).then((snap) => {
      const loaded = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      setExpenses(loaded);
    });

    // Live updates
    const unsub = onSnapshot(colRef, (snap) => {
      const updated = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      setExpenses(updated);
    });

    return () => unsub();
  }, [userId]);

  // ✅ Add expense (UI first → Firestore background)
  async function addExpense(expense) {
    setExpenses((prev) => [expense, ...prev]);

    const colRef = collection(db, userCollectionPath(userId, "expenses"));
    await addDoc(colRef, expense);
  }

  return (
    <ExpensesContext.Provider value={{ expenses, addExpense }}>
      {children}
    </ExpensesContext.Provider>
  );
}

export function useExpenses() {
  return useContext(ExpensesContext);
}
