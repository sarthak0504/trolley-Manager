import React from "react";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { NavigationContainer } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";

import ClientsScreen from "../screens/ClientsScreen";
import ClientDetailsScreen from "../screens/ClientDetailsScreen";
import ExpensesScreen from "../screens/ExpensesScreen";

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

function ClientsStack({ userId }) {
  return (
    <Stack.Navigator>
      <Stack.Screen name="ClientsMain" options={{ title: "Clients" }}>
        {(props) => <ClientsScreen {...props} userId={userId} />}
      </Stack.Screen>
      <Stack.Screen name="ClientDetails" options={{ title: "Client Details" }}>
        {(props) => <ClientDetailsScreen {...props} userId={userId} />}
      </Stack.Screen>
    </Stack.Navigator>
  );
}

export default function TabNavigator({ userId }) {
  return (
    <NavigationContainer>
      <Tab.Navigator
        screenOptions={({ route }) => ({
          headerShown: false,
          tabBarIcon: ({ color, size }) => {
            let iconName;
            if (route.name === "Clients") iconName = "people";
            else if (route.name === "Expenses") iconName = "cash";
            return <Ionicons name={iconName} size={size} color={color} />;
          },
        })}
      >
        <Tab.Screen name="Clients">
          {(props) => <ClientsStack {...props} userId={userId} />}
        </Tab.Screen>
        <Tab.Screen name="Expenses">
          {(props) => <ExpensesScreen {...props} userId={userId} />}
        </Tab.Screen>
      </Tab.Navigator>
    </NavigationContainer>
  );
}
