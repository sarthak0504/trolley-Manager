import React, { useEffect, useState } from "react";
import { View, Text, FlatList, TouchableOpacity } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import AddPaymentModal from "../../components/AddPaymentModal";
import { useClients } from "../../store/ClientsStore";
import { usePayments } from "../../store/PaymentsStore";
import { db } from "../../config/firebaseConfig";
import { collection, onSnapshot } from "firebase/firestore";
import { userCollectionPath } from "../../config/firestorePaths";

export default function ClientDetailsScreen() {
  const { id } = useLocalSearchParams(); // clientId
  const router = useRouter();
  const { clients } = useClients();
  const { addPayment } = usePayments(); // ✅ use Firestore payment handler

  const client = clients.find((c) => c.id === id);
  const [modalVisible, setModalVisible] = useState(false);
  const [payments, setPayments] = useState([]);

  // ✅ Live load payment history
  useEffect(() => {
    if (!client) return;

    const paymentsRef = collection(
  db,
  `users/${client.userId}/clients/${id}/payments`
);


    const unsubscribe = onSnapshot(paymentsRef, (snapshot) => {
      const data = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
      setPayments(data.reverse()); // newest first
    });

    return () => unsubscribe();
  }, [client]);

  if (!client)
    return (
      <View style={{ padding: 20 }}>
        <Text>Client not found</Text>
      </View>
    );

  return (
    <View style={{ flex: 1, padding: 16 }}>
      {/* Back */}
      <TouchableOpacity onPress={() => router.back()}>
        <Text style={{ fontSize: 16, marginBottom: 12 }}>⬅ Back</Text>
      </TouchableOpacity>

      {/* Header */}
      <Text style={{ fontSize: 24, fontWeight: "bold" }}>
        {client.name} ({client.trolleyNo})
      </Text>

      {/* Status Summary */}
      <View style={{ backgroundColor: "#ffeeba", padding: 12, borderRadius: 8, marginVertical: 12 }}>
        <Text style={{ fontSize: 16 }}>Pending Amount: ₹{client.pendingAmount}</Text>
        <Text style={{ fontSize: 16 }}>Total Paid: ₹{client.totalPaidAmount || 0}</Text>
      </View>

      {/* Add Payment Button */}
      <TouchableOpacity
        onPress={() => setModalVisible(true)}
        style={{
          backgroundColor: "green",
          padding: 10,
          borderRadius: 6,
          marginBottom: 12,
          alignItems: "center",
        }}
      >
        <Text style={{ color: "white", fontSize: 16 }}>Add Payment</Text>
      </TouchableOpacity>

      {/* History Title */}
      <Text style={{ fontWeight: "bold", marginBottom: 8 }}>Payment History:</Text>

      {/* Payment List */}
      <FlatList
        data={payments}
        keyExtractor={(item) => item.id}
        ListEmptyComponent={<Text style={{ color: "gray" }}>No payments yet</Text>}
        renderItem={({ item }) => (
          <View
            style={{
              backgroundColor: "#fff",
              padding: 10,
              borderRadius: 8,
              marginBottom: 8,
            }}
          >
            <Text style={{ fontWeight: "bold" }}>₹{item.amount}</Text>
            <Text>Date: {item.date}</Text>
          </View>
        )}
      />

      {/* Payment Modal */}
      <AddPaymentModal
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        onAdd={(payment) =>
          addPayment(id, {
            ...payment,
            date: new Date().toLocaleDateString(),
          })
        }
      />
    </View>
  );
}
