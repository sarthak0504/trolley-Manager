import React, { useState } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  Linking,
  Alert,
  StyleSheet,
  TextInput,
} from "react-native";
import { Link } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

import AddClientModal from "../../components/AddClientModal";
import { useClients } from "../../store/ClientsStore";
import { useTrolleys } from "../../store/TrolleyStore";

export default function ClientsScreen() {
  const { assignTrolley } = useTrolleys();
  const { clients, addClient, deleteClient, updateClient } = useClients();

  const [modalVisible, setModalVisible] = useState(false);
  const [clientToEdit, setClientToEdit] = useState(null);
  const [searchText, setSearchText] = useState("");

  // ✅ Safely calculate total pending
  const totalPending = clients.reduce(
    (sum, c) => sum + (c.pendingAmount || 0),
    0,
  );
  const filteredClients = clients.filter((client) => {
    const search = searchText.toLowerCase();

    const name = client.name?.toLowerCase() || "";
    const phone = client.phone?.toLowerCase() || "";

    const trolleyNos =
      client.activeRentals
        ?.map((r) => r.trolleyNo)
        .join(" ")
        .toLowerCase() ||
      client.trolleyNo?.toLowerCase() ||
      "";

    return (
      name.includes(search) ||
      phone.includes(search) ||
      trolleyNos.includes(search)
    );
  });

  // --- Modal handlers
  const handleOpenModal = (client = null) => {
    setClientToEdit(client);
    setModalVisible(true);
  };

  const handleCloseModal = () => {
    setModalVisible(false);
    setClientToEdit(null);
  };

  const handleSaveClient = (details) => {
    if (details.id) {
      updateClient(details.id, details);
    } else {
      addClient(details);
      if (details.trolleyNo)
        assignTrolley(details.trolleyNo, details.id, details.name);
    }
    handleCloseModal();
  };

  // --- Action Handlers
  const handleCall = async (phone) => {
    if (!phone) return Alert.alert("No Phone", "Client has no phone number.");
    const url = `tel:${phone}`;
    const supported = await Linking.canOpenURL(url);
    if (supported) await Linking.openURL(url);
    else Alert.alert("Error", "Cannot open dialer on this device.");
  };

  const handleClientActions = (client) => {
    Alert.alert(
      "Client Actions",
      `What would you like to do with ${client.name}?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Edit Client",
          onPress: () => handleOpenModal(client),
        },
        {
          text: "Delete Client",
          style: "destructive",
          onPress: () =>
            Alert.alert(
              "Confirm Delete",
              `Are you sure you want to delete ${client.name}?`,
              [
                { text: "No", style: "cancel" },
                {
                  text: "Yes, Delete",
                  style: "destructive",
                  onPress: () => deleteClient(client.id),
                },
              ],
            ),
        },
      ],
    );
  };

  // --- Render Client Item
  const renderClient = ({ item }) => {
    const trolleyNos =
      item.activeRentals?.length > 0
        ? item.activeRentals.map((r) => r.trolleyNo).join(", ")
        : item.trolleyNo || "—";

    return (
      <View style={styles.clientCard}>
        <Link href={`/client/${item.id}`} asChild key={item.id}>
          <TouchableOpacity style={{ flex: 1 }}>
            <Text style={styles.clientName}>{item.name}</Text>

            {item.phone ? (
              <TouchableOpacity
                onPress={(e) => {
                  e.stopPropagation();
                  handleCall(item.phone);
                }}
              >
                <Text style={styles.clientPhone}>📞 {item.phone}</Text>
              </TouchableOpacity>
            ) : null}

            <Text style={styles.clientDetail}>🛒 Trolley(s): {trolleyNos}</Text>
            <Text style={styles.clientPending}>
              Pending: ₹{item.pendingAmount || 0}
            </Text>
          </TouchableOpacity>
        </Link>

        <TouchableOpacity
          onPress={() => handleClientActions(item)}
          style={styles.optionsButton}
        >
          <Ionicons name="ellipsis-vertical" size={20} color="#6c757d" />
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <FlatList
        data={filteredClients}
        keyExtractor={(item, index) => item.id || `client-${index}`}
        renderItem={renderClient}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
        ListHeaderComponent={
          <>
            <View style={styles.summaryBox}>
              <Text style={styles.summaryText}>
                Total Pending: ₹{totalPending.toLocaleString("en-IN")}
              </Text>
            </View>

            <TouchableOpacity
              onPress={() => handleOpenModal()}
              style={styles.addButton}
            >
              <Text style={styles.addButtonText}>＋ ADD CLIENT</Text>
            </TouchableOpacity>

            <TextInput
              placeholder="Search by name, phone, or trolley"
              value={searchText}
              onChangeText={setSearchText}
              style={styles.searchInput}
            />
          </>
        }
        ListEmptyComponent={
          <Text style={styles.emptyText}>No clients added yet.</Text>
        }
      />

      <AddClientModal
        visible={modalVisible}
        onClose={handleCloseModal}
        onAdd={handleSaveClient}
        clientToEdit={clientToEdit}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f4f5f7",
  },
  listContent: {
    paddingHorizontal: 12,
    paddingTop: 10,
    paddingBottom: 80,
    flexGrow: 1, // ✅ ensures scrollability
  },
  summaryBox: {
    backgroundColor: "#fee2e2",
    padding: 10,
    borderRadius: 8,
    marginBottom: 8,
    alignItems: "center",
  },
  summaryText: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#b91c1c",
  },
  addButton: {
    backgroundColor: "#2563eb",
    paddingVertical: 10,
    borderRadius: 8,
    marginBottom: 12,
    alignItems: "center",
  },
  addButtonText: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "bold",
  },
  clientCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 6,
    borderWidth: 0.5,
    borderColor: "#ddd",
    marginBottom: 5, // ✅ minimal gap
    padding: 10,
  },
  optionsButton: {
    paddingHorizontal: 8,
    justifyContent: "center",
  },
  clientName: {
    fontSize: 16,
    fontWeight: "bold",
    marginBottom: 2,
  },
  clientPhone: {
    color: "#007AFF",
    fontSize: 13,
    marginBottom: 2,
  },
  clientDetail: {
    color: "#555",
    fontSize: 13,
  },
  clientPending: {
    color: "red",
    fontSize: 14,
    marginTop: 2,
    fontWeight: "600",
  },
  emptyText: {
    textAlign: "center",
    color: "gray",
    marginTop: 40,
    fontSize: 16,
  },
});
