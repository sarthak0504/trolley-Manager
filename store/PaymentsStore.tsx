import React, { createContext, useContext } from "react";
import { collection, addDoc, updateDoc, doc, increment } from "firebase/firestore";
import { db } from "../config/firebaseConfig";
import { userCollectionPath } from "../config/firestorePaths";
import { useClients } from "./ClientsStore";

const PaymentsContext = createContext(null);

export function PaymentsProvider({ children, userId }) {
  const { clients, setClients } = useClients();

async function addPayment(clientId, payment) {
  // 🧹 Remove undefined or null fields (especially id)
  const cleanPayment = {};
  for (const [key, value] of Object.entries(payment)) {
    if (value !== undefined && value !== null) {
      cleanPayment[key] = value;
    }
  }
  delete cleanPayment.id; // 💯 absolutely ensure no id field goes to Firestore

  // 1️⃣ Update Client UI instantly
  setClients(prev =>
    prev.map(c =>
      c.id === clientId
        ? {
            ...c,
            pendingAmount: c.pendingAmount - cleanPayment.amount,
            totalPaidAmount: (c.totalPaidAmount || 0) + cleanPayment.amount,
          }
        : c
    )
  );

  // 2️⃣ Save Payment to Firestore
  const paymentsRef = collection(
    db,
    userCollectionPath(userId, `clients/${clientId}/payments`)
  );
  const docRef = await addDoc(paymentsRef, cleanPayment);

  // 🔄 Optionally save generated Firestore ID in the document
  await updateDoc(docRef, { id: docRef.id });

  // 3️⃣ Update Client Fields in Firestore
  const clientDoc = doc(db, userCollectionPath(userId, "clients"), clientId);
  await updateDoc(clientDoc, {
    pendingAmount: increment(-cleanPayment.amount),
    totalPaidAmount: increment(cleanPayment.amount),
  });

  console.log("✅ Added payment:", cleanPayment);
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
