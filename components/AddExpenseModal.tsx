import React, { useState } from "react";
import { Modal, View, Text, TextInput, Button } from "react-native";
import { Picker } from "@react-native-picker/picker";

export default function AddExpenseModal({ visible, onClose, onAdd, clients }) {
  const [form, setForm] = useState({
    work: "",
    amount: "",
    trolleyNo: "",
  });

  function update(key, value) {
    setForm({ ...form, [key]: value });
  }

  function submit() {
    if (!form.work || !form.amount || !form.trolleyNo) return;

    onAdd({
      id: Date.now().toString(),
      work: form.work,
      amount: Number(form.amount),
      trolleyNo: form.trolleyNo,
      date: new Date().toLocaleDateString(),
    });

    setForm({ work: "", amount: "", trolleyNo: "" });
    onClose();
  }

  return (
    <Modal visible={visible} animationType="slide">
      <View style={{ flex: 1, padding: 20 }}>
        <Text style={{ fontSize: 22, fontWeight: "bold", marginBottom: 10 }}>Add Expense</Text>

        <TextInput
          placeholder="Work / Description"
          value={form.work}
          onChangeText={(v) => update("work", v)}
          style={{ borderWidth: 1, padding: 8, marginBottom: 10, borderRadius: 6 }}
        />

        <TextInput
          placeholder="Amount (₹)"
          keyboardType="numeric"
          value={form.amount}
          onChangeText={(v) => update("amount", v)}
          style={{ borderWidth: 1, padding: 8, marginBottom: 10, borderRadius: 6 }}
        />

        <Picker
          selectedValue={form.trolleyNo}
          onValueChange={(v) => update("trolleyNo", v)}
          style={{ marginBottom: 20 }}
        >
          <Picker.Item label="Select Trolley" value="" />
          {clients.map((c) => (
            <Picker.Item key={c.id} label={`${c.trolleyNo} - ${c.name}`} value={c.trolleyNo} />
          ))}
        </Picker>

        <Button title="Add Expense" onPress={submit} />
        <View style={{ marginTop: 10 }}>
          <Button title="Cancel" color="red" onPress={onClose} />
        </View>
      </View>
    </Modal>
  );
}
