import React, { createContext, useContext } from 'react';
import { paymentsApi } from '../api/payments.api';

const PaymentsContext = createContext<any>(null);

export function PaymentsProvider({ children, userId }: { children: React.ReactNode; userId: string }) {
  async function addPayment(clientId: string, payment: any) {
    await paymentsApi.add(clientId, payment);
  }

  async function updatePayment(
    clientId: string,
    paymentId: string,
    newData: any,
    oldAmount: number,
  ) {
    await paymentsApi.update(clientId, paymentId, newData, oldAmount);
  }

  async function deletePayment(clientId: string, paymentId: string, amount: number) {
    await paymentsApi.remove(clientId, paymentId, amount);
  }

  return (
    <PaymentsContext.Provider value={{ addPayment, updatePayment, deletePayment }}>
      {children}
    </PaymentsContext.Provider>
  );
}

export function usePayments() {
  return useContext(PaymentsContext);
}
