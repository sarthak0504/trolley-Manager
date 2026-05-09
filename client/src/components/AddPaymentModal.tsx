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
  const [amountError, setAmountError] = useState("");
  const [notes, setNotes] = useState("");
  const [date, setDate] = useState(formatDate(new Date()));
  const [showPicker, setShowPicker] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

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
    setAmountError("");
    setIsSaving(false);
  }, [paymentToEdit, visible]);

  const handleSave = async () => {
    const parsed = Number(amount);
    if (!amount.trim() || isNaN(parsed) || parsed <= 0) {
      setAmountError("Enter a valid amount greater than ₹0.");
      return;
    }
    if (isSaving) return;

    setAmountError("");
    setIsSaving(true);
    try {
      await onSave({
        id: paymentToEdit?.id,
        amount: parsed,
        notes,
        date,
      });
    } catch (err) {
      console.error(err);
    } finally {
      setIsSaving(false);
    }
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
            onChangeText={(text) => {
              setAmount(text);
              if (amountError) setAmountError("");
            }}
            keyboardType="numeric"
            style={[styles.input, amountError ? styles.inputError : null]}
          />
          {amountError ? (
            <Text style={styles.errorText}>{amountError}</Text>
          ) : null}

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

          <TouchableOpacity 
            style={[styles.saveButton, isSaving && { opacity: 0.7 }]} 
            onPress={handleSave}
            disabled={isSaving}
          >
            <Text style={styles.saveButtonText}>
              {isSaving ? "Saving..." : (paymentToEdit ? "Save Changes" : "Add Payment")}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={onClose} disabled={isSaving}>
            <Text style={[styles.cancelText, isSaving && { color: "gray" }]}>Cancel</Text>
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
  inputError: {
    borderColor: "#ef4444",
  },
  errorText: {
    color: "#ef4444",
    fontSize: 12,
    marginTop: -6,
    marginBottom: 8,
  },
});
