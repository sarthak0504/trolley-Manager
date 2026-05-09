import { Tabs } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { TouchableOpacity, Alert, View, Text, Platform } from "react-native";
import { useAuth } from "../../src/context/AuthContext";

function HeaderRight() {
  const { user, signOut } = useAuth();

  const username =
    user?.displayName || user?.email?.split("@")[0] || "User";

  function handleSignOut() {
    if (Platform.OS === "web") {
      if (window.confirm("Are you sure you want to sign out?")) {
        signOut();
      }
    } else {
      Alert.alert("Sign Out", "Are you sure you want to sign out?", [
        { text: "Cancel", style: "cancel" },
        {
          text: "Sign Out",
          style: "destructive",
          onPress: () => signOut(),
        },
      ]);
    }
  }

  return (
    <View style={{ flexDirection: "row", alignItems: "center", marginRight: 14, gap: 10 }}>
      <Text style={{ fontSize: 13, color: "#374151", fontWeight: "500" }}>
        Hey, {username}
      </Text>
      <TouchableOpacity onPress={handleSignOut}>
        <Ionicons name="log-out-outline" size={24} color="#ef4444" />
      </TouchableOpacity>
    </View>
  );
}

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: true,
        headerRight: () => <HeaderRight />,
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
