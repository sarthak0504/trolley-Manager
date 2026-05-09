import React, { createContext, useContext, useState, useEffect } from 'react';
import { collection, onSnapshot } from 'firebase/firestore';
import { db } from '../../config/firebaseConfig';
import { expensesApi } from '../api/expenses.api';

const ExpensesContext = createContext<any>(null);

export function ExpensesProvider({ children, userId }: { children: React.ReactNode; userId: string }) {
  const [expenses, setExpenses] = useState<any[]>([]);
  const [loaded, setLoaded] = useState(false);

  // Real-time reads — stays on Firebase Client SDK
  useEffect(() => {
    if (!userId) return;
    setLoaded(false);
    const colRef = collection(db, `users/${userId}/expenses`);
    const unsub = onSnapshot(colRef, (snap) => {
      setExpenses(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
      setLoaded(true);
    });
    return () => unsub();
  }, [userId]);

  async function addExpense(expense: any) {
    await expensesApi.add(expense);
  }

  async function updateExpense(id: string, newDetails: any) {
    await expensesApi.update(id, newDetails);
  }

  async function deleteExpense(id: string) {
    await expensesApi.remove(id);
  }

  return (
    <ExpensesContext.Provider value={{ expenses, loaded, addExpense, updateExpense, deleteExpense }}>
      {children}
    </ExpensesContext.Provider>
  );
}

export function useExpenses() {
  return useContext(ExpensesContext);
}
