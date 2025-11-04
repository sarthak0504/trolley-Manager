import React, { useState } from "react";
import { View, Text, FlatList, TouchableOpacity, Button } from "react-native";
import AddClientModal from "../components/AddClientModal";
import { Link } from "expo-router";
import { useClients } from "../store/ClientsStore"; // ✅ IMPORTANT
import { useTrolleys } from "../store/TrolleyStore";

export default function ClientsScreen() {
  const { assignTrolley } = useTrolleys();
  const { clients, addClient } = useClients(); // ✅ USE GLOBAL STATE
  const [modalVisible, setModalVisible] = useState(false);

  const totalPending = clients.reduce((sum, c) => sum + c.pendingAmount, 0);

  return (
    <View style={{ flex:1, padding:16 }}>

      {/* Summary Card */}
      <View style={{ backgroundColor:"#f8d7da", padding:12, borderRadius:8, marginBottom:12 }}>
        <Text style={{ fontSize:18, fontWeight:"bold", color:"#721c24" }}>
          Total Pending: ₹{totalPending}
        </Text>
      </View>

      <Button title="➕ Add Client" onPress={() => setModalVisible(true)} />

      {/* Client List */}
      <FlatList
        data={clients}
        style={{ marginTop:12 }}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <Link href={`/client/${item.id}`} asChild>
            <TouchableOpacity style={{ padding:12, backgroundColor:"#fff", borderRadius:8, marginBottom:8 }}>
              <Text style={{ fontSize:16, fontWeight:"bold" }}>{item.name}</Text>
              <Text>Trolley No: {item.trolleyNo}</Text>
              <Text style={{ color:"red", marginTop:4 }}>Pending: ₹{item.pendingAmount}</Text>
            </TouchableOpacity>
          </Link>
        )}
      />

      {/* Modal */}
    <AddClientModal
  visible={modalVisible}
  onClose={() => setModalVisible(false)}
  onAdd={(client) => {
    addClient(client);
    assignTrolley(client.trolleyNo, client.id, client.name);
  }}
/>
    </View>
  );
}
