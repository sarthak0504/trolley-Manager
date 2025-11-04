import React, { useState } from "react";
import { View, Text, FlatList, TouchableOpacity, Button } from "react-native";
import { useExpenses } from "../../store/ExpensesStore";
import { useClients } from "../../store/ClientsStore";
import AddExpenseModal from "../../components/AddExpenseModal";

export default function ExpensesScreen() {
  const { expenses, addExpense } = useExpenses();
  const { clients } = useClients();
  const [modalVisible, setModalVisible] = useState(false);

  const total = expenses.reduce((sum, e) => sum + e.amount, 0);

  return (
    <View style={{ flex: 1, padding: 16 }}>
      {/* Summary */}
      <View style={{ backgroundColor: "#d4edda", padding: 12, borderRadius: 8, marginBottom: 12 }}>
        <Text style={{ fontSize: 18, fontWeight: "bold", color: "#155724" }}>
          Total Expenses: ₹{total}
        </Text>
      </View>

      <Button title="➕ Add Expense" onPress={() => setModalVisible(true)} />

      <FlatList
        data={expenses}
        style={{ marginTop: 12 }}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View style={{ padding: 10, backgroundColor: "#fff", borderRadius: 8, marginBottom: 8 }}>
            <Text style={{ fontWeight: "bold" }}>{item.work}</Text>
            <Text>Date: {item.date}</Text>
            <Text>Trolley: {item.trolleyNo}</Text>
            <Text style={{ color: "green", marginTop: 4 }}>₹{item.amount}</Text>
          </View>
        )}
      />

      <AddExpenseModal
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        onAdd={addExpense}
        clients={clients}
      />
    </View>
  );
}
