import React, { useState, useEffect } from "react";
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
} from "react-native";

import DateTimePicker from "@react-native-community/datetimepicker";

/* Convert JS Date → DD-MM-YYYY */
const formatDate = (date) => {
  const d = new Date(date);
  const day = String(d.getDate()).padStart(2, "0");
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const year = d.getFullYear();
  return `${day}-${month}-${year}`;
};

/* Convert DD-MM-YYYY → JS Date */
const parseDate = (str) => {
  if (!str) return new Date();
  const [d, m, y] = str.split("-");
  return new Date(`${y}-${m}-${d}`);
};

export default function AddPaymentModal({
  visible,
  onClose,
  onSave,
  paymentToEdit,
}) {
  const [amount, setAmount] = useState("");
  const [notes, setNotes] = useState("");
  const [date, setDate] = useState(formatDate(new Date()));
  const [showPicker, setShowPicker] = useState(false);

  /* Load values when editing */
  useEffect(() => {
    if (paymentToEdit) {
      setAmount(paymentToEdit.amount?.toString() || "");
      setNotes(paymentToEdit.notes || "");
      setDate(paymentToEdit.date || formatDate(new Date()));
    } else {
      setAmount("");
      setNotes("");
      setDate(formatDate(new Date()));
    }
  }, [paymentToEdit, visible]);

  const handleSave = () => {
    if (!amount) return;

    onSave({
      id: paymentToEdit?.id,
      amount: Number(amount),
      notes,
      date, // <-- IMPORTANT
    });
  };

  const onDateChange = (event, selected) => {
    setShowPicker(false);
    if (selected) {
      setDate(formatDate(selected));
    }
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

          {/* DATE FIELD */}
          <TouchableOpacity
            style={[styles.input, styles.dateBox]}
            onPress={() => setShowPicker(true)}
          >
            <Text style={{ fontSize: 16 }}>{date}</Text>
          </TouchableOpacity>

          {showPicker && (
            <DateTimePicker
              value={parseDate(date)}
              mode="date"
              onChange={onDateChange}
            />
          )}

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
  dateBox: {
    justifyContent: "center",
    backgroundColor: "#f0f0f0",
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
