import React, { useState } from "react";
import { View, Text, FlatList, TouchableOpacity, Button, TextInput } from "react-native";
import { useTrolleys } from "../../store/TrolleyStore";
import { Link } from "expo-router";

export default function TrolleysScreen() {
  const { trolleys, addTrolley, toggleAvailability } = useTrolleys();
  const [adding, setAdding] = useState(false);
  const [newId, setNewId] = useState("");

  return (
    <View style={{ flex: 1, padding: 16 }}>
      <Text style={{ fontSize: 22, fontWeight: "bold", marginBottom: 12 }}>
        Trolley Management
      </Text>

      <Button
        title={adding ? "Cancel" : "➕ Add New Trolley"}
        onPress={() => setAdding(!adding)}
      />

      {adding && (
        <View style={{ marginVertical: 12 }}>
          <TextInput
            placeholder="Enter Trolley ID (e.g., T005)"
            value={newId}
            onChangeText={setNewId}
            style={{ borderWidth: 1, padding: 8, borderRadius: 6, marginBottom: 8 }}
          />
          <Button
            title="Add Trolley"
            onPress={() => {
              if (!newId.trim()) return;
              addTrolley(newId.trim());
              setNewId("");
              setAdding(false);
            }}
          />
        </View>
      )}

      <FlatList
        data={trolleys}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <Link href={`/trolleys/${item.id}`} asChild>
            <TouchableOpacity
              style={{
                backgroundColor: "#fff",
                padding: 10,
                borderRadius: 8,
                marginBottom: 8,
                borderLeftWidth: 5,
                borderLeftColor: item.isAvailable ? "green" : "red",
              }}
            >
              <Text style={{ fontSize: 16, fontWeight: "bold" }}>{item.id}</Text>
              <Text>Status: {item.isAvailable ? "Available ✅" : "Rented ❌"}</Text>

              {item.currentClient && (
                <Text>Currently rented by: {item.currentClient}</Text>
              )}

              <TouchableOpacity
                onPress={() => toggleAvailability(item.id)}
                style={{
                  marginTop: 8,
                  backgroundColor: item.isAvailable ? "orange" : "green",
                  padding: 8,
                  borderRadius: 6,
                }}
              >
                <Text style={{ color: "#fff", textAlign: "center" }}>
                  {item.isAvailable ? "Mark as Unavailable" : "Mark as Available"}
                </Text>
              </TouchableOpacity>
            </TouchableOpacity>
          </Link>
        )}
      />
    </View>
  );
}
