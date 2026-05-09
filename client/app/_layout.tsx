import { Slot, useRouter, useSegments } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { useEffect } from "react";

import { AuthProvider, useAuth } from "@/src/context/AuthContext";
import { TrolleyProvider } from "@/src/store/TrolleyStore";
import { ClientsProvider } from "@/src/store/ClientsStore";
import { PaymentsProvider } from "@/src/store/PaymentsStore";
import { ExpensesProvider } from "@/src/store/ExpensesStore";
import LoadingScreen from "@/src/components/LoadingScreen";
import DataReadyGate from "@/src/components/DataReadyGate";

function AppGate() {
  const { user, userId, loading } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;

    const inAuthGroup = segments[0] === "(auth)";

    if (!user && !inAuthGroup) {
      router.replace("/(auth)/login");
    } else if (user && inAuthGroup) {
      router.replace("/(tabs)");
    }
  }, [user, loading, segments]);

  // Phase 1 — restoring persisted session from AsyncStorage
  if (loading) {
    return <LoadingScreen message="Signing you in..." />;
  }

  // Not signed in — only render auth screens; anything else waits for redirect
  if (!user) {
    const inAuthGroup = segments[0] === "(auth)";
    if (!inAuthGroup) {
      // useEffect will redirect to login; hold the loading screen so no
      // protected screen tries to render without its store providers.
      return <LoadingScreen message="Signing you in..." />;
    }
    return <Slot />;
  }

  // Phase 2 — signed in, mount providers and wait for first Firestore snapshots
  return (
    <TrolleyProvider userId={userId!}>
      <ClientsProvider userId={userId!}>
        <PaymentsProvider userId={userId!}>
          <ExpensesProvider userId={userId!}>
            <SafeAreaView style={{ flex: 1, backgroundColor: "#fff" }}>
              <DataReadyGate>
                <Slot />
              </DataReadyGate>
            </SafeAreaView>
          </ExpensesProvider>
        </PaymentsProvider>
      </ClientsProvider>
    </TrolleyProvider>
  );
}

export default function RootLayout() {
  return (
    <AuthProvider>
      <AppGate />
    </AuthProvider>
  );
}
