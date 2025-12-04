import React from "react";
import { View, Text, FlatList, TouchableOpacity, Alert } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useTrolleys } from "../../store/TrolleyStore";

export default function TrolleyDetailsScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const { trolleys, markReturned } = useTrolleys();

  const trolley = trolleys.find((t) => t.id === id);

  if (!trolley)
    return <Text style={{ padding: 20 }}>Trolley not found</Text>;

  // ✅ Handle tapping a history item
  const handleHistoryPress = (item) => {
    if (item.clientId) {
      router.push(`/client/${item.clientId}`);
    } else {
      Alert.alert("Info", "This record is not linked to any client.");
    }
  };

  return (
    <View style={{ flex: 1, padding: 16, backgroundColor: "#fff" }}>
      {/* Back button */}
      <TouchableOpacity onPress={() => router.back()}>
        <Text style={{ fontSize: 16, marginBottom: 12 }}>⬅ Back</Text>
      </TouchableOpacity>

      {/* Trolley details */}
      <Text style={{ fontSize: 24, fontWeight: "bold" }}>Trolley #{trolley.id}</Text>
      <Text style={{ marginBottom: 10 }}>
        Status: {trolley.isAvailable ? "✅ Available" : "❌ Rented"}
      </Text>



      {/* History Section */}
      <Text style={{ fontWeight: "bold", marginBottom: 8 }}>Usage History:</Text>

      <FlatList
        data={trolley.history?.slice().reverse() || []}
        keyExtractor={(_, index) => index.toString()}
        renderItem={({ item }) => (
  <TouchableOpacity
    onPress={() => handleHistoryPress(item)}
    disabled={!item.clientId}
    style={{
      backgroundColor:
        item.action === "Expense" ? "#FFF7E6" : "#fff", // light orange tint for Expense
      borderRadius: 8,
      marginBottom: 8,
      borderLeftWidth: 4,
      borderLeftColor:
        item.action === "Expense"
          ? "#FF9500" // orange for Expense
          : item.clientId
          ? "#007AFF" // blue for rented
          : "#1a1194ff",
      opacity: item.clientId || item.action === "Expense" ? 1 : 0.6,
      padding: 10,
    }}
  >
    <Text style={{ fontWeight: "bold" }}>
      {item.action || "History Entry"}
    </Text>

    {/* 🧾 Expense Details */}
    {item.action === "Expense" && (
      <>
        {item.date && <Text>📅 Date: {item.date}</Text>}
        {item.amount && <Text>💰 Amount: ₹{item.amount}</Text>}
        {item.description ? (
          <Text>📝 Note: {item.description}</Text>
        ) : (
          <Text style={{ color: "gray" }}>📝 Note: —</Text>
        )}
      </>
    )}

    {/* 👤 Rented Details */}
    {item.action === "Rented" && (
      <>
        {item.clientName && (
          <Text>
            👤 Client: <Text style={{ fontWeight: "bold" }}>{item.clientName}</Text>
          </Text>
        )}
        {item.date && <Text>📅 Date: {item.date}</Text>}
        {item.fromDate && <Text>From: {item.fromDate}</Text>}
        {item.toDate && <Text>To: {item.toDate}</Text>}
      </>
    )}
  </TouchableOpacity>
)}

        ListEmptyComponent={
          <Text
            style={{
              textAlign: "center",
              color: "gray",
              marginTop: 20,
            }}
          >
            No history yet.
          </Text>
        }
      />


    </View>
  );
}
