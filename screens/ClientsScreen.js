import React, { useEffect, useState } from "react";
import { View, Text, FlatList, TouchableOpacity, Modal, Button } from "react-native";
import { collection, onSnapshot, query, orderBy } from "firebase/firestore";
import { db } from "../firebaseConfig";
import AddClientModal from "../components/AddClientModal";

export default function ClientsScreen({ userId }) {
  const [clients, setClients] = useState([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [totalPending, setTotalPending] = useState(0);

  useEffect(() => {
    const q = query(collection(db, `artifacts/default-app-id/users/${userId}/clients`), orderBy("pendingAmount", "desc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
      setClients(data);
      setTotalPending(data.reduce((sum, c) => sum + (c.pendingAmount || 0), 0));
    });
    return () => unsubscribe();
  }, []);

  return (
    <View style={{ flex: 1, padding: 16 }}>
      {/* ...header */}
      <FlatList
        data={clients}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={{ padding: 10, backgroundColor: "#fff", marginVertical: 5, borderRadius: 6 }}
            onPress={() => navigation.navigate("ClientDetails", { clientId: item.id, userId })}
          >
            <Text style={{ fontSize: 16, fontWeight: "bold" }}>{item.name}</Text>
            <Text>Trolley No: {item.trolleyNo}</Text>
            <Text style={{ color: "red" }}>Pending: ₹{item.pendingAmount}</Text>
          </TouchableOpacity>
        )}
      />
      {/* ...modal */}
    </View>
  );
}