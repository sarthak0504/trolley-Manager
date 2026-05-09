import React from "react";
import { useTrolleys } from "../store/TrolleyStore";
import { useClients } from "../store/ClientsStore";
import { useExpenses } from "../store/ExpensesStore";
import LoadingScreen from "./LoadingScreen";

interface Props {
  children: React.ReactNode;
}

export default function DataReadyGate({ children }: Props) {
  const { loaded: trolleysLoaded } = useTrolleys();
  const { loaded: clientsLoaded } = useClients();
  const { loaded: expensesLoaded } = useExpenses();

  if (!trolleysLoaded || !clientsLoaded || !expensesLoaded) {
    return <LoadingScreen message="Fetching your data..." />;
  }

  return <>{children}</>;
}
