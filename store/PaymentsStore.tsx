import React, { createContext, useContext } from "react";
import { collection, addDoc, updateDoc, doc, increment } from "firebase/firestore";
import { db } from "../config/firebaseConfig";
import { userCollectionPath } from "../config/firestorePaths";
import { useClients } from "./ClientsStore";

const PaymentsContext = createContext(null);

export function PaymentsProvider({ children, userId }) {
  const { clients, setClients } = useClients();

  async function addPayment(clientId, payment) {
    // 1️⃣ Update Client UI instantly
    setClients(prev =>
      prev.map(c =>
        c.id === clientId
          ? {
              ...c,
              pendingAmount: c.pendingAmount - payment.amount,
              totalPaidAmount: (c.totalPaidAmount || 0) + payment.amount,
            }
          : c
      )
    );

    // 2️⃣ Save Payment to Firestore
    const paymentsRef = collection(
      db,
      userCollectionPath(userId, `clients/${clientId}/payments`)
    );
    await addDoc(paymentsRef, payment);

    // 3️⃣ Update Client Fields in Firestore
    const clientDoc = doc(db, userCollectionPath(userId, "clients"), clientId);
    await updateDoc(clientDoc, {
      pendingAmount: increment(-payment.amount),
      totalPaidAmount: increment(payment.amount),
    });
  }

  return (
    <PaymentsContext.Provider value={{ addPayment }}>
      {children}
    </PaymentsContext.Provider>
  );
}

export function usePayments() {
  return useContext(PaymentsContext);
}
