import React, { useEffect, useState } from "react";
import { View, Text, FlatList, Button, Modal } from "react-native";
import { doc, getDoc, collection, onSnapshot } from "firebase/firestore";
import { db } from "../firebaseConfig";
import AddPaymentModal from "../components/AddPaymentModal";

export default function ClientDetailsScreen({ route, navigation }) {
  const { clientId, userId } = route.params;
  const [client, setClient] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [modalVisible, setModalVisible] = useState(false);

  useEffect(() => {
    const loadClient = async () => {
      const snap = await getDoc(doc(db, `artifacts/default-app-id/users/${userId}/clients/${clientId}`));
      setClient(snap.data());
    };
    loadClient();

    const unsub = onSnapshot(
      collection(db, `artifacts/default-app-id/users/${userId}/clients/${clientId}/transactions`),
      (snap) => setTransactions(snap.docs.map((d) => d.data()))
    );

    return () => unsub();
  }, []);

  if (!client) return <Text>Loading...</Text>;

  return (
    <View style={{ flex: 1, padding: 16 }}>
      <Button title="Back" onPress={() => navigation.goBack()} />
      <Text style={{ fontSize: 24, fontWeight: "bold", marginVertical: 10 }}>
        {client.name} ({client.trolleyNo})
      </Text>

      <View style={{ backgroundColor: "#f1f1f1", padding: 10, borderRadius: 8, marginBottom: 10 }}>
        <Text>Mobile: {client.mobile}</Text>
        <Text>City: {client.city}</Text>
        <Text>Guarantor: {client.guarantor}</Text>
        <Text>Rent Start: {client.rentStart}</Text>
      </View>

      <View style={{ backgroundColor: "#ffeeba", padding: 10, borderRadius: 8, marginBottom: 10 }}>
        <Text>Pending: ₹{client.pendingAmount}</Text>
        <Text>Monthly Rent: ₹{client.rent}</Text>
        <Text>Total Paid: ₹{client.totalPaid}</Text>
      </View>

      <Button title="Add Payment" color="green" onPress={() => setModalVisible(true)} />

      <Text style={{ marginTop: 15, fontWeight: "bold" }}>Payment History:</Text>
      <FlatList
        data={transactions}
        keyExtractor={(i, idx) => idx.toString()}
        renderItem={({ item }) => (
          <View style={{ backgroundColor: "#fff", padding: 8, marginVertical: 4, borderRadius: 6 }}>
            <Text>Amount: ₹{item.amountPaid}</Text>
            <Text>From: {item.fromDate}</Text>
            <Text>To: {item.toDate}</Text>
            <Text>Remaining: ₹{item.balanceAfter}</Text>
            <Text>Notes: {item.notes}</Text>
          </View>
        )}
      />

      <AddPaymentModal visible={modalVisible} onClose={() => setModalVisible(false)} clientId={clientId} userId={userId} />
    </View>
  );
}
