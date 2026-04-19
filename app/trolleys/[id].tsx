import React from "react";
import { View, Text, FlatList, TouchableOpacity, Alert } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useTrolleys } from "../../store/TrolleyStore";

export default function TrolleyDetailsScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const { trolleys } = useTrolleys();

  const trolley = trolleys.find((t) => t.id === id);

  if (!trolley)
    return <Text style={{ padding: 20 }}>Trolley not found</Text>;

  // 🚀 When history entry is pressed
  const handleHistoryPress = (item) => {
    if (!item.clientId) {
      Alert.alert("Info", "This record is not linked to any client.");
      return;
    }
    router.push(`/client/${item.clientId}`);
  };

  const historyData = trolley.history?.slice().reverse() || [];

  return (
    <View style={{ flex: 1, padding: 16, backgroundColor: "#fff" }}>
      {/* Back button */}
      <TouchableOpacity onPress={() => router.back()}>
        <Text style={{ fontSize: 16, marginBottom: 12 }}>⬅ Back</Text>
      </TouchableOpacity>

      {/* Header */}
      <Text style={{ fontSize: 24, fontWeight: "bold" }}>
        Trolley #{trolley.id}
      </Text>
      <Text style={{ marginBottom: 16 }}>
        Status: {trolley.isAvailable ? "✅ Available" : "❌ Rented"}
      </Text>

      <Text style={{ fontWeight: "bold", marginBottom: 8 }}>
        Usage History:
      </Text>

      <FlatList
        data={historyData}
        keyExtractor={(_, index) => index.toString()}
        renderItem={({ item }) => {
          const isExpense = item.action === "Expense";
          const isRent = item.action === "Rented";

          return (
            <TouchableOpacity
              onPress={() => handleHistoryPress(item)}
              disabled={!item.clientId}
              style={{
                backgroundColor: isExpense ? "#FFF7E6" : "#fff",
                borderRadius: 8,
                marginBottom: 10,
                padding: 12,
                borderLeftWidth: 5,
                borderLeftColor: isExpense
                  ? "#FF9500"
                  : item.clientId
                  ? "#007AFF"
                  : "#1a1194ff",
                opacity: item.clientId || isExpense ? 1 : 0.5,
                shadowColor: "#000",
                shadowOpacity: 0.1,
                shadowOffset: { width: 0, height: 2 },
                elevation: 2,
              }}
            >
              {/* Heading */}
              <Text style={{ fontWeight: "bold", fontSize: 16 }}>
                {item.action}
              </Text>

              {/* EXPENSE ENTRY */}
              {isExpense && (
                <>
                  {item.date && <Text>📅 Date: {item.date}</Text>}
                  {item.amount && <Text>💰 Amount: ₹{item.amount}</Text>}
                  <Text>
                    📝 Note:{" "}
                    {item.description ? item.description : "—"}
                  </Text>
                </>
              )}

              {/* RENTED ENTRY */}
              {isRent && (
                <>
                  <Text>
                    👤 Client:{" "}
                    <Text style={{ fontWeight: "bold" }}>
                      {item.clientName}
                    </Text>
                  </Text>

                  {item.date && <Text>📅 Rented On: {item.date}</Text>}
                  {item.fromDate && <Text>From: {item.fromDate}</Text>}
                  {item.toDate && <Text>To: {item.toDate}</Text>}
                </>
              )}
            </TouchableOpacity>
          );
        }}
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
