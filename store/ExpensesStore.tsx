import React, { createContext, useContext, useState, useEffect } from "react";
import {
  collection,
  addDoc,
  onSnapshot,
  getDocs,
  doc,
  updateDoc,
  deleteDoc, // 🆕 Import deleteDoc
  getDoc,
} from "firebase/firestore";
import { db } from "../config/firebaseConfig";
import { userCollectionPath } from "../config/firestorePaths";
import { useTrolleys } from "./TrolleyStore";

const ExpensesContext = createContext(null);

export function ExpensesProvider({ children, userId }) {
  const [expenses, setExpenses] = useState([]);
  const { setTrolleys } = useTrolleys();

  // --- Utility Functions ---

  const getExpenseRef = (id) => doc(db, userCollectionPath(userId, "expenses"), id);
  const getExpensesColRef = () => collection(db, userCollectionPath(userId, "expenses"));
  
  // Helper to update trolley history (used by all write operations)
  const updateTrolleyHistory = async (trolleyNo, action, description, amount, date) => {
    if (!trolleyNo) return;
    
    const trolleyRef = doc(db, userCollectionPath(userId, "trolleys"), trolleyNo);
    const snap = await getDoc(trolleyRef);
    const trolley = snap.data();

    // Remove any previous entry for the same expense (for update/delete)
    const filteredHistory = (trolley.history || []).filter(
      (h) => !(h.action === "Expense" && h.description === description && h.amount === amount && h.date === date)
    );

    let updatedHistory = filteredHistory;

    if (action !== "Delete") {
      updatedHistory = [
        ...filteredHistory,
        { action: "Expense", description, amount, date },
      ];
    }
    
    await updateDoc(trolleyRef, { history: updatedHistory });
  };


  // --- CRUD Operations ---

  // ✅ 1. ADD EXPENSE
  async function addExpense(expense) {
    const newExpense = { ...expense, userId };

    try {
      // Save expense in Firestore
      const docRef = await addDoc(getExpensesColRef(), newExpense);
      
      // If linked to a trolley, update its history
      if (expense.trolleyNo) {
        await updateTrolleyHistory(
          expense.trolleyNo, 
          "Add", 
          expense.work, 
          expense.amount, 
          expense.date
        );
      }
    } catch (error) {
      console.error("Error adding expense: ", error);
    }
    // UI update is handled by the onSnapshot listener below
  }

  // 🆕 2. UPDATE EXPENSE
  async function updateExpense(id, newDetails) {
    try {
      const expenseRef = getExpenseRef(id);
      
      // Get old expense data for trolley history cleanup
      const oldSnap = await getDoc(expenseRef);
      const oldExpense = oldSnap.data();

      // Update Firestore
      await updateDoc(expenseRef, newDetails);

      // Clean up old trolley entry (if trolley changed or details changed)
      if (oldExpense.trolleyNo) {
         // Mark old entry as deleted/replaced in the trolley history
         await updateTrolleyHistory(
            oldExpense.trolleyNo, 
            "Delete", // Use delete to remove the old entry
            oldExpense.work, 
            oldExpense.amount, 
            oldExpense.date
         );
      }

      // Add new entry to history if trolley is still linked
      if (newDetails.trolleyNo) {
        await updateTrolleyHistory(
          newDetails.trolleyNo, 
          "Add", 
          newDetails.work, 
          newDetails.amount, 
          newDetails.date
        );
      }
    } catch (error) {
      console.error("Error updating expense: ", error);
    }
  }

  // 🆕 3. DELETE EXPENSE
  async function deleteExpense(id) {
    try {
      const expenseRef = getExpenseRef(id);
      
      // Get expense data before deleting for trolley history cleanup
      const snap = await getDoc(expenseRef);
      const expense = snap.data();
      
      // Delete from Firestore
      await deleteDoc(expenseRef);

      // If linked to a trolley, remove it from history
      if (expense.trolleyNo) {
        await updateTrolleyHistory(
          expense.trolleyNo, 
          "Delete", 
          expense.work, 
          expense.amount, 
          expense.date
        );
      }
    } catch (error) {
      console.error("Error deleting expense: ", error);
    }
  }


  // --- Listener Effect ---
  useEffect(() => {
    if (!userId) return;

    const colRef = getExpensesColRef();

    // Use onSnapshot for real-time updates (replaces initial getDocs)
    const unsub = onSnapshot(colRef, (snap) => {
      const updated = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      setExpenses(updated);
    });

    return () => unsub();
  }, [userId]);

  // 4. EXPORT required functions and state
  return (
    <ExpensesContext.Provider value={{ expenses, addExpense, updateExpense, deleteExpense }}>
      {children}
    </ExpensesContext.Provider>
  );
}

export function useExpenses() {
  return useContext(ExpensesContext);
}