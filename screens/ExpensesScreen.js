import React, { useEffect, useState } from "react";
import { View, Text, FlatList, Button } from "react-native";
import { collection, onSnapshot } from "firebase/firestore";
import { db } from "../firebaseConfig";
import AddExpenseModal from "../components/AddExpenseModal";

export default function ExpensesScreen({ userId }) {
  const [expenses, setExpenses] = useState([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, `artifacts/default-app-id/users/${userId}/expenses`), (snap) => {
      const data = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      setExpenses(data);
      setTotal(data.reduce((sum, e) => sum + (e.amount || 0), 0));
    });
    return () => unsubscribe();
  }, []);

  return (
    <View style={{ flex: 1, padding: 16 }}>
      <Text style={{ fontSize: 24, fontWeight: "bold", color: "green", marginBottom: 10 }}>Trolley Expenses</Text>
      <View style={{ backgroundColor: "#d4edda", padding: 10, borderRadius: 8, marginBottom: 10 }}>
        <Text style={{ color: "#155724", fontSize: 16 }}>Total Expense: ₹{total}</Text>
      </View>
      <Button title="Add Expense" color="green" onPress={() => setModalVisible(true)} />
      <FlatList
        data={expenses}
        keyExtractor={(i) => i.id}
        renderItem={({ item }) => (
          <View style={{ padding: 10, backgroundColor: "#fff", marginVertical: 5, borderRadius: 6 }}>
            <Text style={{ fontWeight: "bold" }}>{item.work}</Text>
            <Text>Trolley: {item.trolleyNo}</Text>
            <Text>Date: {item.date}</Text>
            <Text>Amount: ₹{item.amount}</Text>
          </View>
        )}
      />
      <AddExpenseModal visible={modalVisible} onClose={() => setModalVisible(false)} userId={userId} />
    </View>
  );
}
