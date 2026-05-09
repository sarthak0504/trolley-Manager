import React, { useState, useEffect } from "react";
import {
  Modal,
  View,
  Text,
  TextInput,
  Button,
  ScrollView,
  TouchableOpacity,
  Platform,
  StyleSheet, // Using StyleSheet for cleaner organization
} from "react-native";
import { Picker } from "@react-native-picker/picker";
import { useTrolleys } from "../store/TrolleyStore";
import DateTimePicker from "@react-native-community/datetimepicker";

// Define the default empty/reset form state
const defaultForm = {
  work: "",
  amount: "",
  date: "",
  trolleyNo: "",
};

// Helper to format Date object to dd-mm-yyyy
const formatDate = (date) => {
  const d = new Date(date);
  const day = String(d.getDate()).padStart(2, "0");
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const year = d.getFullYear();
  return `${day}-${month}-${year}`;
};

// Helper to parse dd-mm-yyyy string to Date object
const parseDateToDate = (dateString) => {
  if (!dateString) return new Date();

  const [day, month, year] = dateString.split("-").map(Number);

  // Construct date as: new Date(year, monthIndex, day)
  return new Date(year, month - 1, day);
};


// 🆕 Accept expenseToEdit and rename onAdd to onSave
export default function AddExpenseModal({ visible, onClose, onSave, expenseToEdit }) {
  const { trolleys } = useTrolleys();

  const [form, setForm] = useState(defaultForm);
  const [showDatePicker, setShowDatePicker] = useState(false);

  // 🆕 Determine if we are in Edit mode
  const isEditing = !!expenseToEdit;

  // --- Effect to Handle Edit Data ---
  useEffect(() => {
    if (visible) {
      if (expenseToEdit) {
        // PRE-FILL form for editing
        setForm({
          work: expenseToEdit.work || "",
          amount: String(expenseToEdit.amount) || "",
          date: expenseToEdit.date || formatDate(new Date()),
          trolleyNo: expenseToEdit.trolleyNo || "",
        });
      } else {
        // RESET form for adding new expense
        setForm({ ...defaultForm, date: formatDate(new Date()) });
      }
    }
  }, [visible, expenseToEdit]);

  function update(key, value) {
    setForm({ ...form, [key]: value });
  }

  function submit() {
    if (!form.work || !form.amount) {
      alert("Work description & Amount are required.");
      return;
    }

    // 🆕 The payload now includes the ID if we are editing
    const payload = {
      work: form.work,
      amount: Number(form.amount),
      date: form.date,
      trolleyNo: form.trolleyNo || null,
      ...(isEditing && { id: expenseToEdit.id }), // Include ID if editing
    };

    // 🆕 Call onSave which handles both adding and updating
    onSave(payload);

    // Reset form after saving
    setForm({ ...defaultForm, date: formatDate(new Date()) });
    onClose();
  }

  // --- Render UI ---
  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <ScrollView style={styles.container}>
        <Text style={styles.title}>
          {isEditing ? "📝 Edit Expense" : "➕ Add Expense"}
        </Text>

        <TextInput
          placeholder="Work / Description"
          value={form.work}
          onChangeText={(v) => update("work", v)}
          style={styles.input}
        />

        <TextInput
          placeholder="Amount (₹)"
          keyboardType="numeric"
          value={form.amount}
          onChangeText={(v) => update("amount", v)}
          style={styles.input}
        />

        <Text style={styles.label}>Date</Text>
        <TouchableOpacity
          onPress={() => setShowDatePicker(true)}
          style={styles.datePickerButton}
        >
          <Text style={{ color: form.date ? "#000" : "#888" }}>{form.date}</Text>
        </TouchableOpacity>

        {showDatePicker && (
          <DateTimePicker
            // Use the helper to convert the DD-MM-YYYY string back to a Date object
            value={parseDateToDate(form.date)}
            mode="date"
            display={Platform.OS === "ios" ? "spinner" : "default"}
            onChange={(event, selectedDate) => {
              setShowDatePicker(false);
              if (selectedDate) {
                update("date", formatDate(selectedDate));
              }
            }}
          />
        )}

        <Text style={styles.label}>
          Related Trolley (optional)
        </Text>
        <Picker
          selectedValue={form.trolleyNo}
          onValueChange={(v) => update("trolleyNo", v)}
          style={styles.picker}
        >
          <Picker.Item label="No Trolley" value="" />
          {trolleys.map((t) => (
            <Picker.Item key={t.id} label={t.id} value={t.id} />
          ))}
        </Picker>

        <Button 
          title={isEditing ? "Save Changes" : "Add Expense"} 
          onPress={submit} 
        />

        <View style={styles.cancelButtonContainer}>
          <Button title="Cancel" color="red" onPress={onClose} />
        </View>
      </ScrollView>
    </Modal>
  );
}

const styles = StyleSheet.create({
    container: {
        flex: 1, 
        padding: 20
    },
    title: {
        fontSize: 22, 
        fontWeight: "bold", 
        marginBottom: 20, 
        textAlign: 'center'
    },
    input: {
        borderWidth: 1, 
        padding: 12, 
        marginBottom: 15, 
        borderRadius: 6,
        borderColor: '#ccc'
    },
    label: {
        fontWeight: "bold", 
        marginBottom: 8
    },
    datePickerButton: {
        borderWidth: 1,
        padding: 12,
        borderRadius: 6,
        marginBottom: 15,
        borderColor: "#ccc",
        backgroundColor: '#f9f9f9'
    },
    picker: {
        marginBottom: 20
    },
    cancelButtonContainer: {
        marginTop: 15,
        marginBottom: 40,
    }
});