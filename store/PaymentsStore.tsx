import React, { createContext, useContext } from "react";
import {
  collection,
  addDoc,
  updateDoc,
  doc,
  deleteDoc,
  getDoc,
  setDoc,
} from "firebase/firestore";
import { db } from "../config/firebaseConfig";
import { userCollectionPath } from "../config/firestorePaths";
import { useClients } from "./ClientsStore";

const PaymentsContext = createContext(null);

export function PaymentsProvider({ children, userId }) {
  const { clients, setClients } = useClients();

  const getClientRef = (clientId) =>
    doc(db, userCollectionPath(userId, "clients"), clientId);

  /* ----------------- helpers ----------------- */

  const calcPendingAmount = (activeRentals, pastRentals) =>
    activeRentals.reduce((s, r) => s + Number(r.pending || 0), 0) +
    pastRentals.reduce((s, r) => s + Number(r.pending || 0), 0);

  // clear pending oldest-first
  const clearPendingFIFO = (rentals, amt) => {
    const updated = rentals.map((r) => ({ ...r }));
    let remaining = amt;

    for (let r of updated) {
      const pending = Number(r.pending || 0);
      if (pending <= 0) continue;

      if (remaining >= pending) {
        remaining -= pending;
        r.pending = 0;
      } else {
        r.pending = pending - remaining;
        remaining = 0;
      }
      if (remaining === 0) break;
    }

    return { rentals: updated, remaining };
  };

  // simple restore into oldest rental first
  const restorePendingFIFO = (rentals, amt) => {
    const updated = rentals.map((r) => ({ ...r }));
    let remaining = amt;

    for (let r of updated) {
      if (remaining <= 0) break;
      r.pending = Number(r.pending || 0) + remaining;
      remaining = 0;
    }
    return { rentals: updated, remaining };
  };

  // apply a manual payment of +amount to a client object (no Firestore here)
  const applyManualPaymentToClient = (client, amount) => {
    let {
      activeRentals = [],
      pastRentals = [],
      advance = Number(client.advance) || 0,
      totalPaidAmount = Number(client.totalPaidAmount || 0),
    } = client;

    let remaining = amount;

    // clear active pending
    let c1 = clearPendingFIFO(activeRentals, remaining);
    activeRentals = c1.rentals;
    remaining = c1.remaining;

    // clear past pending
    let c2 = clearPendingFIFO(pastRentals, remaining);
    pastRentals = c2.rentals;
    remaining = c2.remaining;

    // leftover → advance
    advance += remaining;

    totalPaidAmount += amount;

    const pendingAmount = calcPendingAmount(activeRentals, pastRentals);

    return {
      ...client,
      activeRentals,
      pastRentals,
      advance,
      totalPaidAmount,
      pendingAmount,
    };
  };

  // reverse a manual payment of +amount from a client object (no Firestore here)
  const reverseManualPaymentOnClient = (client, amount) => {
    let {
      activeRentals = [],
      pastRentals = [],
      advance = Number(client.advance) || 0,
      totalPaidAmount = Number(client.totalPaidAmount || 0),
    } = client;

    const amt = amount;
    totalPaidAmount -= amt;

    let remaining = amt;

    // take back from advance first
    if (advance >= remaining) {
      advance -= remaining;
      remaining = 0;
    } else {
      remaining -= advance;
      advance = 0;
    }

    // then recreate pending oldest-first
    if (remaining > 0) {
      let r1 = restorePendingFIFO(pastRentals, remaining);
      pastRentals = r1.rentals;
      remaining = r1.remaining;
    }
    if (remaining > 0) {
      let r2 = restorePendingFIFO(activeRentals, remaining);
      activeRentals = r2.rentals;
      remaining = r2.remaining;
    }

    const pendingAmount = calcPendingAmount(activeRentals, pastRentals);

    return {
      ...client,
      activeRentals,
      pastRentals,
      advance,
      totalPaidAmount,
      pendingAmount,
    };
  };

  /* ------------------------------------------------
        ADD PAYMENT (manual)
  -------------------------------------------------- */
  async function addPayment(clientId, payment) {
    if (!clientId || !payment) return;
    const client = clients.find((c) => c.id === clientId);
    if (!client) return;

    const clean = {};
    for (let [k, v] of Object.entries(payment)) {
      if (v !== undefined && v !== null) clean[k] = v;
    }
    clean.type = clean.type || "manual";

    const amount = Number(clean.amount || 0);
    if (!amount || isNaN(amount)) return;

    // 1) update client object in memory
    const updatedClient = applyManualPaymentToClient(client, amount);

    // 2) save payment doc
    const paymentsRef = collection(
      db,
      userCollectionPath(userId, `clients/${clientId}/payments`)
    );

    let docRef;
    if (clean.id) {
      docRef = doc(paymentsRef, clean.id);
      await setDoc(docRef, clean, { merge: true });
    } else {
      docRef = await addDoc(paymentsRef, clean);
      await updateDoc(docRef, { id: docRef.id });
    }

    // 3) update client in Firestore
    const { activeRentals, pastRentals, advance, totalPaidAmount, pendingAmount } =
      updatedClient;

    await updateDoc(getClientRef(clientId), {
      activeRentals,
      pastRentals,
      advance,
      totalPaidAmount,
      pendingAmount,
    });

    // 4) update UI state
    setClients((prev) =>
      prev.map((c) => (c.id === clientId ? updatedClient : c))
    );
  }

  /* ------------------------------------------------
        DELETE PAYMENT (full reverse)
  -------------------------------------------------- */
  async function deletePayment(clientId, paymentId, amount) {
    if (!clientId || !paymentId) return;

    const client = clients.find((c) => c.id === clientId);
    if (!client) return;

    const amt = Number(amount || 0);
    if (!amt || isNaN(amt)) return;

    // fetch payment to know its type (only manual affects totals)
    const paymentRef = doc(
      db,
      userCollectionPath(userId, `clients/${clientId}/payments`),
      paymentId
    );
    const snap = await getDoc(paymentRef);
    const paymentData = snap.data();
    if (!paymentData) return;

    let updatedClient = client;

    if (paymentData.type === "manual") {
      updatedClient = reverseManualPaymentOnClient(client, amt);
    }

    const { activeRentals, pastRentals, advance, totalPaidAmount, pendingAmount } =
      updatedClient;

    // delete payment doc
    await deleteDoc(paymentRef);

    // update Firestore client
    await updateDoc(getClientRef(clientId), {
      activeRentals,
      pastRentals,
      advance,
      totalPaidAmount,
      pendingAmount,
    });

    // update UI
    setClients((prev) =>
      prev.map((c) => (c.id === clientId ? updatedClient : c))
    );
  }

  /* ------------------------------------------------
        EDIT PAYMENT
        → only apply the DIFFERENCE (delta)
  -------------------------------------------------- */
  async function updatePayment(clientId, paymentId, newData, oldAmount) {
    if (!clientId || !paymentId) return;

    const client = clients.find((c) => c.id === clientId);
    if (!client) return;

    const newAmt = Number(newData.amount || 0);
    const oldAmt = Number(oldAmount || 0);
    const delta = newAmt - oldAmt;

    // 1) update the payment document itself
    const paymentRef = doc(
      db,
      userCollectionPath(userId, `clients/${clientId}/payments`),
      paymentId
    );

    await setDoc(
      paymentRef,
      {
        ...newData,
        id: paymentId,
        type: newData.type || "manual",
      },
      { merge: true }
    );

    // 2) if amount didn't change, done
    if (delta === 0) return;

    // 3) apply only the difference to the client balances
    let updatedClient;
    if (delta > 0) {
      // extra money received → behaves like new payment of delta
      updatedClient = applyManualPaymentToClient(client, delta);
    } else {
      // reduced amount → behaves like deleting |delta| from that payment
      updatedClient = reverseManualPaymentOnClient(client, Math.abs(delta));
    }

    const { activeRentals, pastRentals, advance, totalPaidAmount, pendingAmount } =
      updatedClient;

    // 4) update Firestore client
    await updateDoc(getClientRef(clientId), {
      activeRentals,
      pastRentals,
      advance,
      totalPaidAmount,
      pendingAmount,
    });

    // 5) update UI state
    setClients((prev) =>
      prev.map((c) => (c.id === clientId ? updatedClient : c))
    );
  }

  return (
    <PaymentsContext.Provider
      value={{ addPayment, deletePayment, updatePayment }}
    >
      {children}
    </PaymentsContext.Provider>
  );
}

export function usePayments() {
  return useContext(PaymentsContext);
}
