import React, { useState, useEffect } from "react";
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  TextInput,
  Alert,
  ActivityIndicator
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useClients } from "../store/ClientsStore";

const parseDDMMYYYY = (str) => {
  if (!str) return new Date(0);
  const [day, month, year] = str.split("-");
  return new Date(`${year}-${month}-${day}T00:00:00`);
};

const formatDDMMYYYY = (date) => {
  const d = new Date(date);
  const day = String(d.getDate()).padStart(2, "0");
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const year = d.getFullYear();
  return `${day}-${month}-${year}`;
};

const addDays = (date, days) => {
  const newDate = new Date(date);
  newDate.setDate(newDate.getDate() + days);
  return newDate;
};

const getRentForCycle = (cycleDateStr, rentHistory, fallbackRent) => {
  if (!rentHistory || !rentHistory.length) return Number(fallbackRent);
  const cycleDate = parseDDMMYYYY(cycleDateStr);
  const sortedHistory = [...rentHistory].sort((a, b) => 
    parseDDMMYYYY(a.effectiveDate).getTime() - parseDDMMYYYY(b.effectiveDate).getTime()
  );
  let currentRent = Number(fallbackRent);
  for (const hist of sortedHistory) {
    if (parseDDMMYYYY(hist.effectiveDate).getTime() <= cycleDate.getTime()) {
      currentRent = Number(hist.amount);
    }
  }
  return currentRent;
};

export default function ManageRentCyclesModal({
  visible,
  onClose,
  client,
  rental, // active rental object
}) {
  const { editRentHistoryForCycle } = useClients();
  const [cycles, setCycles] = useState([]);
  const [editingCycleDate, setEditingCycleDate] = useState(null);
  const [editAmount, setEditAmount] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (visible && client && rental && rental.startDate) {
      generateCycles();
    } else {
      setCycles([]);
      setEditingCycleDate(null);
    }
  }, [visible, client, rental]);

  const generateCycles = () => {
    let list = [];
    const start = parseDDMMYYYY(rental.startDate);
    
    // Calculate cycles up to the nextRentDueDate (or lastRentAddedOn + 30 days)
    let lastDateStr = rental.nextRentDueDate || rental.lastRentAddedOn;
    if (!lastDateStr) lastDateStr = formatDDMMYYYY(addDays(start, 30));

    let iter = start;
    const end = parseDDMMYYYY(lastDateStr);

    let cycleNum = 1;
    // We add the initial start date cycle
    while (iter.getTime() < end.getTime()) {
      const cycleDateStr = formatDDMMYYYY(iter);
      const rentAmount = getRentForCycle(cycleDateStr, rental.rentHistory, rental.monthlyRent);
      
      list.push({
        num: cycleNum,
        date: cycleDateStr,
        rent: rentAmount
      });
      
      iter = addDays(iter, 30);
      cycleNum++;
    }
    setCycles(list);
  };

  const handleEditClick = (cycle) => {
    setEditingCycleDate(cycle.date);
    setEditAmount(cycle.rent.toString());
  };

  const handleSaveRent = async () => {
    if (!editAmount || isNaN(Number(editAmount))) {
      return Alert.alert("Error", "Please enter a valid amount");
    }

    setIsSaving(true);
    try {
      await editRentHistoryForCycle(
        client.id,
        rental.trolleyNo,
        editingCycleDate,
        Number(editAmount)
      );
      setEditingCycleDate(null);
      // Wait a moment for firestore snapshot to update client, then modal re-renders
    } catch (err) {
      console.error(err);
      Alert.alert("Error", "Failed to update rent history");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={styles.overlay}>
        <View style={styles.modalBox}>
          <Text style={styles.title}>Manage Rent History</Text>
          <Text style={styles.subtitle}>Trolley: {rental?.trolleyNo}</Text>

          <ScrollView style={styles.scrollArea}>
            {cycles.length === 0 ? (
              <Text style={{ textAlign: "center", color: "gray" }}>No rent cycles found.</Text>
            ) : (
              cycles.map((cycle) => (
                <View key={cycle.date} style={styles.cycleRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontWeight: "bold" }}>Month {cycle.num}</Text>
                    <Text style={{ color: "gray", fontSize: 12 }}>Cycle Start: {cycle.date}</Text>
                  </View>

                  {editingCycleDate === cycle.date ? (
                    <View style={styles.editContainer}>
                      <TextInput 
                        style={styles.input} 
                        value={editAmount}
                        onChangeText={setEditAmount}
                        keyboardType="numeric"
                        editable={!isSaving}
                      />
                      {isSaving ? (
                        <ActivityIndicator size="small" color="#000" />
                      ) : (
                        <TouchableOpacity onPress={handleSaveRent} style={styles.saveBtn}>
                          <Text style={{ color: "white", fontSize: 12 }}>Save</Text>
                        </TouchableOpacity>
                      )}
                      
                      {!isSaving && (
                        <TouchableOpacity onPress={() => setEditingCycleDate(null)}>
                          <Ionicons name="close-circle" size={24} color="red" />
                        </TouchableOpacity>
                      )}
                    </View>
                  ) : (
                    <View style={styles.readContainer}>
                      <Text style={{ fontWeight: "bold", color: "#16a34a", marginRight: 10 }}>₹{cycle.rent}</Text>
                      <TouchableOpacity onPress={() => handleEditClick(cycle)}>
                        <Ionicons name="create-outline" size={20} color="#007AFF" />
                      </TouchableOpacity>
                    </View>
                  )}
                </View>
              ))
            )}
          </ScrollView>

          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Text style={styles.closeText}>Close</Text>
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
    width: "90%",
    maxHeight: "80%",
  },
  title: {
    fontSize: 20,
    fontWeight: "bold",
    textAlign: "center",
  },
  subtitle: {
    fontSize: 14,
    color: "gray",
    textAlign: "center",
    marginBottom: 15,
  },
  scrollArea: {
    maxHeight: 400,
  },
  cycleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  editContainer: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    justifyContent: "flex-end",
  },
  readContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  input: {
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 4,
    padding: 4,
    width: 60,
    marginRight: 8,
    textAlign: "center",
  },
  saveBtn: {
    backgroundColor: "green",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 4,
    marginRight: 8,
  },
  closeButton: {
    marginTop: 15,
    padding: 12,
    backgroundColor: "#f3f4f6",
    borderRadius: 8,
  },
  closeText: {
    textAlign: "center",
    fontWeight: "bold",
    color: "#374151"
  }
});
