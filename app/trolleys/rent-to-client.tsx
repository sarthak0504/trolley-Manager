import React, { useState } from "react";
import { View, Text, TextInput, Button, ScrollView } from "react-native";
import { Picker } from "@react-native-picker/picker";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useClients } from "../../store/ClientsStore";
import { useTrolleys } from "../../store/TrolleyStore";
import { db } from "../../config/firebaseConfig";
import { updateDoc, doc } from "firebase/firestore";
import { userCollectionPath } from "../../config/firestorePaths";

export default function RentToClientScreen() {
  const { id } = useLocalSearchParams(); // client firestore ID
  const router = useRouter();

  const { clients, setClients } = useClients();
  const { trolleys } = useTrolleys();

  const client = clients.find((c) => c.id === id);

  const availableTrolleys = trolleys.filter((t) => t.isAvailable);

  const [trolleyNo, setTrolleyNo] = useState("");
  const [monthlyRent, setMonthlyRent] = useState("");
  const [startDate, setStartDate] = useState("");

  if (!client) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <Text>Client not found.</Text>
      </View>
    );
  }

async function addRental() {
  if (!trolleyNo || !monthlyRent || !startDate) {
    alert("All fields are required.");
    return;
  }

  // Convert YYYY-MM-DD → DD-MM-YYYY
  const [year, month, day] = startDate.split("-");
  const formattedStart = `${day}-${month}-${year}`;

  const rent = Number(monthlyRent);
  const start = new Date(startDate);
  const today = new Date();

  // Calculate cycles passed
  const diffDays = Math.floor((today - start) / (1000 * 60 * 60 * 24));
  const cycles = diffDays >= 30 ? Math.floor(diffDays / 30) + 1 : 1;

  let pending = 0;
  let advance = client.advance || client.initialAdvance || 0;

  // Prepaid logic
  for (let i = 0; i < cycles; i++) {
    if (advance >= rent) {
      advance -= rent;
    } else {
      pending += (rent - advance);
      advance = 0;
    }
  }

  const nextDue = new Date(start);
  nextDue.setDate(start.getDate() + cycles * 30);

  const newRental = {
    trolleyNo,
    monthlyRent: rent,
    startDate: formattedStart,
    pending,
    nextRentDueDate: `${String(nextDue.getDate()).padStart(2, "0")}-${String(nextDue.getMonth() + 1).padStart(2, "0")}-${nextDue.getFullYear()}`,
    lastRentAddedOn: formattedStart,
  };

  const updatedClient = {
    ...client,
    activeRentals: [...(client.activeRentals || []), newRental],
    pendingAmount: (client.pendingAmount || 0) + pending,
    advance,
    initialAdvance: client.initialAdvance,
  };

  // Firestore update
  await updateDoc(
    doc(db, userCollectionPath(client.userId, "clients"), client.id),
    updatedClient
  );

  // Update trolley
  await updateDoc(
    doc(db, userCollectionPath(client.userId, "trolleys"), trolleyNo),
    {
      isAvailable: false,
      currentClient: client.name,
      history: [
        ...(trolleys.find(t => t.id === trolleyNo)?.history || []),
        {
          action: "Rented (Extra)",
          clientName: client.name,
          clientId: client.id,
          fromDate: formattedStart,
          toDate: null,
        }
      ],
    }
  );

  // Update UI immediately
  setClients(prev =>
    prev.map(c => (c.id === client.id ? updatedClient : c))
  );

  router.back();
}


  return (
    <ScrollView style={{ flex: 1, padding: 20 }}>
      <Text style={{ fontSize: 22, fontWeight: "bold", marginBottom: 12 }}>
        Add Another Trolley to {client.name}
      </Text>

      <Picker
        selectedValue={trolleyNo}
        onValueChange={(v) => setTrolleyNo(v)}
        style={{ marginBottom: 20 }}
      >
        <Picker.Item label="Select Available Trolley" value="" />
        {availableTrolleys.map((t) => (
          <Picker.Item key={t.id} label={t.id} value={t.id} />
        ))}
      </Picker>

      <TextInput
        placeholder="Monthly Rent (₹)"
        keyboardType="numeric"
        value={monthlyRent}
        onChangeText={setMonthlyRent}
        style={{ borderWidth: 1, padding: 8, borderRadius: 6, marginBottom: 14 }}
      />

      <TextInput
        placeholder="Start Date (YYYY-MM-DD)"
        value={startDate}
        onChangeText={setStartDate}
        style={{ borderWidth: 1, padding: 8, borderRadius: 6, marginBottom: 20 }}
      />

      <Button title="Add Rental" onPress={addRental} />

      <View style={{ marginTop: 12 }}>
        <Button title="Cancel" color="red" onPress={() => router.back()} />
      </View>
    </ScrollView>
  );
}
