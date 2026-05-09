import { Tabs } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { TouchableOpacity, Alert } from "react-native";
import { useAuth } from "../../src/context/AuthContext";
import { useRouter } from "expo-router";

function SignOutButton() {
  const { signOut } = useAuth();
  const router = useRouter();

  function handleSignOut() {
    Alert.alert("Sign Out", "Are you sure you want to sign out?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Sign Out",
        style: "destructive",
        onPress: async () => {
          await signOut();
          router.replace("/(auth)/login");
        },
      },
    ]);
  }

  return (
    <TouchableOpacity onPress={handleSignOut} style={{ marginRight: 14 }}>
      <Ionicons name="log-out-outline" size={24} color="#ef4444" />
    </TouchableOpacity>
  );
}

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: true,
        headerRight: () => <SignOutButton />,
        headerStyle: { backgroundColor: "#fff" },
        headerShadowVisible: false,
      }}
    >
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
