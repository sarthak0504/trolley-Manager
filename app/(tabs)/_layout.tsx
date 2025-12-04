import { Tabs } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

export default function TabsLayout() {
  return (
    <Tabs screenOptions={{ headerShown: false }}>
      <Tabs.Screen
        name="index"
        options={{
          title: "Clients",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="people" size={size} color={color} />
          ),
        }}
      />

      <Tabs.Screen
        name="expenses/index"
        options={{
          title: "Expenses",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="wallet" size={size} color={color} />
          ),
        }}
      />

      <Tabs.Screen
        name="trolleys/index"
        options={{
          title: "Trolleys",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="cart" size={size} color={color} />
          ),
        }}
      />

      {/* ✅ Add this for app/pending/index.tsx */}
   <Tabs.Screen
  name="pending/index"
  options={{
    title: "Pendings",
    tabBarIcon: ({ color, size }) => (
      <Ionicons name="hourglass" size={size} color={color} />
    ),
  }}
/>
   <Tabs.Screen
  name="profit-loss/index"
  options={{
    title: "P&L",
    tabBarIcon: ({ color, size }) => (
      <Ionicons name="hourglass" size={size} color={color} />
    ),
  }}
/>

    </Tabs>
  );
}
