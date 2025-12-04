import { Slot } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { View, Text } from "react-native";
import { useEffect, useState } from "react";
import { initAuth } from "../config/firebaseConfig";

import { ClientsProvider } from "../store/ClientsStore";
import { PaymentsProvider } from "../store/PaymentsStore";
import { ExpensesProvider } from "../store/ExpensesStore";
import { TrolleyProvider } from "../store/TrolleyStore";

export default function RootLayout() {
  const [userId, setUserId] = useState(null);

  useEffect(() => {
    initAuth((uid) => setUserId(uid));
  }, []);

  if (!userId) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <Text style={{ fontSize: 18 }}>Connecting to Firebase...</Text>
      </View>
    );
  }

  return (
    // ✅ Correct provider order
    <TrolleyProvider userId={userId}>
      <ClientsProvider userId={userId}>
        <PaymentsProvider userId={userId}>
          <ExpensesProvider userId={userId}>
            <SafeAreaView style={{ flex: 1, backgroundColor: "white" }}>
              {/* App Screens */}
              <Slot />

              {/* Footer - show User ID */}
              <View style={{ padding: 6, alignItems: "center" }}>
                <Text style={{ fontSize: 10, color: "gray" }}>
                  User ID: {userId}
                </Text>
              </View>
            </SafeAreaView>
          </ExpensesProvider>
        </PaymentsProvider>
      </ClientsProvider>
    </TrolleyProvider>
  );
}
