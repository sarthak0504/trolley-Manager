import React, { useState } from "react";
import { Modal, View, Text, TextInput, Button } from "react-native";

export default function AddPaymentModal({ visible, onClose, onAdd }) {
  const [amount, setAmount] = useState("");

  function submit() {
    if (!amount) return;
    onAdd({
      id: Date.now().toString(),
      amount: Number(amount),
      date: new Date().toLocaleDateString(),
    });
    setAmount("");
    onClose();
  }

  return (
    <Modal visible={visible} animationType="slide">
      <View style={{ flex:1, padding:20 }}>
        <Text style={{ fontSize:22, fontWeight:"bold", marginBottom:10 }}>Add Payment</Text>

        <TextInput
          placeholder="Amount Paid (₹)"
          keyboardType="numeric"
          value={amount}
          onChangeText={setAmount}
          style={{ borderWidth:1, padding:8, borderRadius:6, marginBottom:20 }}
        />

        <Button title="Add Payment" onPress={submit} />
        <View style={{ marginTop:10 }}>
          <Button title="Cancel" color="red" onPress={onClose} />
        </View>
      </View>
    </Modal>
  );
}
