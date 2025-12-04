import React, { useState, useEffect } from "react";
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
} from "react-native";

export default function AddPaymentModal({
  visible,
  onClose,
  onSave,
  paymentToEdit,
}) {
  const [amount, setAmount] = useState("");
  const [notes, setNotes] = useState("");

  useEffect(() => {
    if (paymentToEdit) {
      setAmount(paymentToEdit.amount?.toString() || "");
      setNotes(paymentToEdit.notes || "");
    } else {
      setAmount("");
      setNotes("");
    }
  }, [paymentToEdit, visible]);

  const handleSave = () => {
    if (!amount) return;
    onSave({
      id: paymentToEdit?.id, // ✅ preserve id when editing
      amount: Number(amount),
      notes,
    });
  };

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={styles.overlay}>
        <View style={styles.modalBox}>
          <Text style={styles.title}>
            {paymentToEdit ? "Edit Payment" : "Add Payment"}
          </Text>

          <TextInput
            placeholder="Amount (₹)"
            value={amount}
            onChangeText={setAmount}
            keyboardType="numeric"
            style={styles.input}
          />

          <TextInput
            placeholder="Notes (optional)"
            value={notes}
            onChangeText={setNotes}
            style={[styles.input, { height: 80 }]}
            multiline
          />

          <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
            <Text style={styles.saveButtonText}>
              {paymentToEdit ? "Save Changes" : "Add Payment"}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={onClose}>
            <Text style={styles.cancelText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalBox: {
    backgroundColor: "#fff",
    borderRadius: 10,
    padding: 20,
    width: "85%",
  },
  title: {
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 10,
    textAlign: "center",
  },
  input: {
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 6,
    padding: 10,
    marginBottom: 10,
  },
  saveButton: {
    backgroundColor: "green",
    padding: 12,
    borderRadius: 6,
    alignItems: "center",
  },
  saveButtonText: {
    color: "#fff",
    fontWeight: "bold",
  },
  cancelText: {
    color: "red",
    textAlign: "center",
    marginTop: 10,
  },
});
