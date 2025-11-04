import React, { useState } from "react";
import { Modal, View, Text, TextInput, Button } from "react-native";
import { Picker } from "@react-native-picker/picker";
import { useTrolleys } from "../store/TrolleyStore";

export default function AddClientModal({ visible, onClose, onAdd }) {
    const { trolleys } = useTrolleys(); // ✅ get trolley list
  const availableTrolleys = trolleys.filter(t => t.isAvailable);
  const [form, setForm] = useState({
    name: "",
    trolleyNo: "",
    pendingAmount: "",
  });

  function update(key, value) {
    setForm({ ...form, [key]: value });
  }

  function handleSubmit() {
    if (!form.name || !form.trolleyNo || !form.pendingAmount) return;
    onAdd({
      id: Date.now().toString(),
      name: form.name,
      trolleyNo: form.trolleyNo,
      pendingAmount: Number(form.pendingAmount),
    });
    setForm({ name: "", trolleyNo: "", pendingAmount: "" });
    onClose();
  }

  return (
    <Modal visible={visible} animationType="slide">
      <View style={{ flex:1, padding:20 }}>
        <Text style={{ fontSize:22, fontWeight:"bold", marginBottom:10 }}>Add Client</Text>

        <TextInput
          placeholder="Client Name"
          value={form.name}
          onChangeText={(v) => update("name", v)}
          style={{ borderWidth:1, padding:8, marginBottom:10, borderRadius:6 }}
        />

        <Picker
  selectedValue={form.trolleyNo}
  onValueChange={(v) => update("trolleyNo", v)}
  style={{ marginBottom: 20 }}
>
  <Picker.Item label="Select Trolley" value="" />
  {availableTrolleys.map((t) => (
    <Picker.Item key={t.id} label={t.id} value={t.id} />
  ))}
</Picker>

        <TextInput
          placeholder="Pending Amount (₹)"
          keyboardType="numeric"
          value={form.pendingAmount}
          onChangeText={(v) => update("pendingAmount", v)}
          style={{ borderWidth:1, padding:8, marginBottom:20, borderRadius:6 }}
        />

        <Button title="Add Client" onPress={handleSubmit} />
        <View style={{ marginTop:10 }}>
          <Button title="Cancel" color="red" onPress={onClose} />
        </View>
      </View>
    </Modal>
  );
}
