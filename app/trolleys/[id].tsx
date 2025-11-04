import React from "react";
import { View, Text, FlatList, TouchableOpacity } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useTrolleys } from "../../store/TrolleyStore";

export default function TrolleyDetailsScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const { trolleys, markReturned } = useTrolleys();

  const trolley = trolleys.find((t) => t.id === id);

  if (!trolley) return <Text style={{ padding: 20 }}>Trolley not found</Text>;

  return (
    <View style={{ flex: 1, padding: 16 }}>
      <TouchableOpacity onPress={() => router.back()}>
        <Text style={{ fontSize: 16, marginBottom: 12 }}>⬅ Back</Text>
      </TouchableOpacity>

      <Text style={{ fontSize: 24, fontWeight: "bold" }}>{trolley.id}</Text>
      <Text style={{ marginBottom: 10 }}>
        Status: {trolley.isAvailable ? "Available ✅" : "Rented ❌"}
      </Text>

      {!trolley.isAvailable && (
        <TouchableOpacity
          onPress={() => markReturned(trolley.id, new Date().toLocaleDateString())}
          style={{
            backgroundColor: "green",
            padding: 10,
            borderRadius: 6,
            marginBottom: 15,
            alignItems: "center",
          }}
        >
          <Text style={{ color: "white", fontSize: 16 }}>Mark as Returned</Text>
        </TouchableOpacity>
      )}

      <Text style={{ fontWeight: "bold", marginBottom: 8 }}>Usage History:</Text>

      <FlatList
        data={trolley.history}
        keyExtractor={(_, index) => index.toString()}
        renderItem={({ item }) => (
          <View
            style={{
              backgroundColor: "#fff",
              padding: 10,
              borderRadius: 8,
              marginBottom: 8,
            }}
          >
            <Text>Client: {item.clientName}</Text>
            <Text>From: {item.fromDate}</Text>
            <Text>To: {item.toDate ? item.toDate : "Still Renting"}</Text>
          </View>
        )}
      />
    </View>
  );
}
