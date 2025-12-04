import React, { useState, useEffect } from "react";
import axios from "axios";

const SHEET_URL =
  "https://script.google.com/macros/s/AKfycbx44GPBlqRl_rq3mQ7tF8yldPl3waKHJi1MlV03mFr6jqqv4Dlw5PN-6lz9UMYz9rf7/exec";

import {
  Modal,
  View,
  Text,
  TextInput,
  ScrollView,
  TouchableOpacity,
  Platform,
  StyleSheet,
  Alert,
} from "react-native";
import { Picker } from "@react-native-picker/picker";
import DateTimePicker from "@react-native-community/datetimepicker";
import { useTrolleys } from "../store/TrolleyStore";


// --- Utilities ---
const formatDate = (date) => {
  const d = new Date(date);
  const day = String(d.getDate()).padStart(2, "0");
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const year = d.getFullYear();
  return `${day}-${month}-${year}`;
};

const parseDateForPicker = (dateString) => {
  if (!dateString) return new Date();
  const parts = dateString.split("-");
  return new Date(`${parts[2]}-${parts[1]}-${parts[0]}T00:00:00`);
};

const getInitialFormState = () => ({
  name: "",
  trolleyNo: "",
  monthlyRent: "",
  rentStartDate: "",
  phone: "",
  address: "",
  email: "",
  jamamnatDaar: "",
  jamanatPhone: "",
  advance: "",
});

export default function AddClientModal({
  visible,
  onClose,
  onAdd,
  clientToEdit,
}) {
  const { trolleys } = useTrolleys();
  const availableTrolleys = trolleys.filter((t) => t.isAvailable);

  const [form, setForm] = useState(getInitialFormState());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [loading, setLoading] = useState(false);

  const isEditing = !!clientToEdit;

  // --- Prefill when editing ---
  useEffect(() => {
    if (visible) {
      if (clientToEdit) {
        const rental = clientToEdit.activeRentals?.[0] || {};

        setForm({
          id: clientToEdit.id,
          name: clientToEdit.name || "",
          phone: clientToEdit.phone || "",
          address: clientToEdit.address || "",
          email: clientToEdit.email || "",
          jamamnatDaar: clientToEdit.jamamnatDaar || "",
          jamanatPhone: clientToEdit.jamanatPhone || "",
          advance: String(clientToEdit.advance || 0),
          trolleyNo: rental.trolleyNo || "",
          monthlyRent: String(rental.monthlyRent || ""),
          rentStartDate: rental.startDate || "",
        });
      } else {
        setForm(getInitialFormState());
      }
    }
  }, [visible, clientToEdit]);

  const update = (key, value) => setForm({ ...form, [key]: value });

  // --- Submit ---
  const handleSubmit = async () => {
    if (loading) return;

    if (!form.name || !form.trolleyNo || !form.monthlyRent || !form.rentStartDate) {
      Alert.alert(
        "Validation Error",
        "Please fill all required fields: Name, Trolley, Rent, Start Date."
      );
      return;
    }

    setLoading(true);

    const monthlyRent = Number(form.monthlyRent);
    const advance = Number(form.advance) || 0;

    const rental = {
      trolleyNo: form.trolleyNo,
      monthlyRent,
      startDate: form.rentStartDate,
      pending: monthlyRent,
    };

    const payload = {
      name: form.name.trim(),
      phone: form.phone || null,
      address: form.address || null,
      email: form.email || null,
      jamamnatDaar: form.jamamnatDaar || null,
      jamanatPhone: form.jamanatPhone || null,
      advance,
      pendingAmount: form.pendingAmount || 0,
      totalPaidAmount: form.totalPaidAmount || 0,
      initialAdvance: form.initialAdvance || advance,
      activeRentals: isEditing
        ? clientToEdit.activeRentals.map((r) =>
            r.trolleyNo === rental.trolleyNo ? rental : r
          )
        : [rental],
      ...(isEditing && { id: clientToEdit.id }),
    };

    try {
      await axios.post(SHEET_URL, payload);
      onAdd(payload);
      onClose();
    } catch (err) {
      console.error("Sheet error:", err);
      Alert.alert("Error", "Failed to save client.");
    } finally {
      setLoading(false);
    }
  };

  const inputStyle = {
    borderWidth: 1,
    padding: 12,
    marginBottom: 15,
    borderRadius: 6,
    borderColor: "#ccc",
    backgroundColor: "#f9f9f9",
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
        <Text style={styles.title}>
          {isEditing ? "📝 Edit Client Details" : "➕ Add New Client"}
        </Text>

        {/* Name */}
        <TextInput
          placeholder="Client Name *"
          value={form.name}
          onChangeText={(v) => update("name", v)}
          style={inputStyle}
        />

        {/* Trolley Picker */}
        <Text style={styles.label}>Select Trolley *</Text>
        <Picker
          selectedValue={form.trolleyNo}
          onValueChange={(v) => update("trolleyNo", v)}
          style={styles.picker}
          enabled={!isEditing}
        >
          <Picker.Item
            label={isEditing ? form.trolleyNo : "Select Trolley"}
            value={form.trolleyNo}
          />
          {availableTrolleys.map((t) => (
            <Picker.Item key={t.id} label={t.id} value={t.id} />
          ))}
        </Picker>

        {/* Monthly Rent */}
        <TextInput
          placeholder="Monthly Rent (₹) *"
          keyboardType="numeric"
          value={form.monthlyRent}
          onChangeText={(v) => update("monthlyRent", v)}
          style={inputStyle}
        />

        {/* Start Date */}
        <Text style={styles.label}>Rent Start Date *</Text>
        <TouchableOpacity
          onPress={() => setShowDatePicker(true)}
          style={styles.datePickerButton}
        >
          <Text style={{ color: form.rentStartDate ? "#000" : "#888" }}>
            {form.rentStartDate || "Select Date"}
          </Text>
        </TouchableOpacity>

        {showDatePicker && (
          <DateTimePicker
            value={parseDateForPicker(form.rentStartDate)}
            mode="date"
            display={Platform.OS === "ios" ? "spinner" : "default"}
            onChange={(event, selectedDate) => {
              setShowDatePicker(false);
              if (selectedDate) update("rentStartDate", formatDate(selectedDate));
            }}
          />
        )}

        {/* Optional */}
        <Text style={styles.sectionHeader}>Optional Details</Text>

        <TextInput
          placeholder="Phone"
          keyboardType="phone-pad"
          value={form.phone}
          onChangeText={(v) => update("phone", v)}
          style={inputStyle}
        />

        <TextInput
          placeholder="Address"
          value={form.address}
          onChangeText={(v) => update("address", v)}
          style={inputStyle}
          multiline
        />

        <TextInput
          placeholder="Email"
          value={form.email}
          onChangeText={(v) => update("email", v)}
          keyboardType="email-address"
          style={inputStyle}
        />

        {/* Guarantor */}
        <Text style={styles.sectionHeader}>Guarantor Details</Text>

        <TextInput
          placeholder="Jamamnat Daar"
          value={form.jamamnatDaar}
          onChangeText={(v) => update("jamamnatDaar", v)}
          style={inputStyle}
        />

        <TextInput
          placeholder="Jamanat Phone"
          keyboardType="phone-pad"
          value={form.jamanatPhone}
          onChangeText={(v) => update("jamanatPhone", v)}
          style={inputStyle}
        />

        {/* Advance */}
        <TextInput
          placeholder="Advance Payment (₹)"
          value={form.advance}
          keyboardType="numeric"
          onChangeText={(v) => update("advance", v)}
          editable={!isEditing}
          style={[inputStyle, isEditing && { backgroundColor: "#e9ecef" }]}
        />

        {/* Submit Button */}
        <TouchableOpacity
          onPress={handleSubmit}
          disabled={loading}
          style={{
            backgroundColor: loading ? "#999" : "#2563eb",
            padding: 14,
            borderRadius: 8,
            alignItems: "center",
            marginTop: 10,
          }}
        >
          <Text style={{ color: "white", fontSize: 16, fontWeight: "bold" }}>
            {loading
              ? "Saving..."
              : isEditing
              ? "Save Changes"
              : "Add Client"}
          </Text>
        </TouchableOpacity>

        {/* Cancel */}
        <TouchableOpacity
          onPress={onClose}
          style={styles.cancelButtonContainer}
        >
          <Text style={{ color: "red", textAlign: "center", fontSize: 16 }}>
            Cancel
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </Modal>
  );
}

// --- Styles ---
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },
  contentContainer: { padding: 20, paddingBottom: 100 },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 20,
    textAlign: "center",
    color: "#2563eb",
  },
  label: { fontWeight: "bold", marginBottom: 8 },
  sectionHeader: {
    fontWeight: "bold",
    fontSize: 18,
    marginTop: 20,
    marginBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  datePickerButton: {
    borderWidth: 1,
    padding: 12,
    borderRadius: 6,
    marginBottom: 15,
    borderColor: "#ccc",
    backgroundColor: "#f9f9f9",
  },
  picker: {
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 6,
    backgroundColor: "#f9f9f9",
  },
  cancelButtonContainer: { marginTop: 20, marginBottom: 40 },
});
