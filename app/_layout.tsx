import { Tabs } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { ClientsProvider } from "../store/ClientsStore";
import { ExpensesProvider } from "../store/ExpensesStore";
import { TrolleyProvider } from "../store/TrolleyStore";
import { useEffect, useState } from "react";
import { initAuth } from "../config/firebaseConfig";
import { View, Text } from "react-native";
import { PaymentsProvider } from "../store/PaymentsStore";

export default function Layout() {
  const [userId, setUserId] = useState(null);

  useEffect(() => {
    initAuth((uid) => setUserId(uid));
  }, []);

  if (!userId) {
    return (
      <View style={{ flex:1, justifyContent:"center", alignItems:"center" }}>
        <Text style={{ fontSize:18 }}>Connecting to Firebase...</Text>
      </View>
    );
  }

  return (
    <ClientsProvider userId={userId}>
      <PaymentsProvider userId={userId}>
      <ExpensesProvider userId ={userId}>
        <TrolleyProvider userId={userId}>
          <Tabs screenOptions={{ headerShown: false }}>
            <Tabs.Screen
              name="index"
              options={{
                title: "Clients",
                tabBarIcon: ({ color, size }) =>
                  <Ionicons name="people" size={size} color={color} />,
              }}
            />
            <Tabs.Screen
              name="expenses"
              options={{
                title: "Expenses",
                tabBarIcon: ({ color, size }) =>
                  <Ionicons name="wallet" size={size} color={color} />,
              }}
            />
            <Tabs.Screen
              name="trolleys"
              options={{
                title: "Trolleys",
                tabBarIcon: ({ color, size }) =>
                  <Ionicons name="cart" size={size} color={color} />,
              }}
            />
          </Tabs>

          {/* ✅ Display User ID in small footer */}
          <View style={{ padding:6, alignItems:"center" }}>
            <Text style={{ fontSize:10, color:"gray" }}>User ID: {userId}</Text>
          </View>
        </TrolleyProvider>
      </ExpensesProvider>
      </PaymentsProvider>
    </ClientsProvider>
  );
}
