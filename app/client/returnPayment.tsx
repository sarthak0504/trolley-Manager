import { View, Text, TextInput, Button, StyleSheet, Alert } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useState } from "react";
import { doc, updateDoc, getDoc } from "firebase/firestore";
import { db } from "../../config/firebaseConfig";

export default function ReturnPayment() {
  const router = useRouter();
  const params = useLocalSearchParams();

  const trolleyId = params.trolleyId;
  const userId = params.userId;
  const clientId = params.clientId;

  const clientName = params.clientName || "";
  const monthlyRent = Number(params.monthlyRent || 0);
  const pending = Number(params.pending || 0);
  const startDate = params.startDate || "";

  const [adjustPayment, setAdjustPayment] = useState(0);

  function getCurrentBillingStartDate(startDateStr) {
    if (!startDateStr) return "";

    const [d, m, y] = startDateStr.split("-");
    const start = new Date(y, m - 1, d);
    const today = new Date();

    let billingStart = new Date(start);

    while (true) {
      const next = new Date(billingStart);
      next.setMonth(next.getMonth() + 1);

      if (next > today) break;

      billingStart = next;
    }

    const day = String(billingStart.getDate()).padStart(2, "0");
    const month = String(billingStart.getMonth() + 1).padStart(2, "0");
    const year = billingStart.getFullYear();

    return `${day}-${month}-${year}`;
  }

  function formatDate(date) {
  const d = new Date(date);

  const day = String(d.getDate()).padStart(2, "0");
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const year = d.getFullYear();

  return `${day}-${month}-${year}`;
}
  const today = formatDate(new Date());
  const currentMonthStart = getCurrentBillingStartDate(startDate);

  // calculate days used
function calculateDays(start, end) {
  if (!start || !end) return 0;

  try {
    const [d1, m1, y1] = start.split("-").map(Number);
    const [d2, m2, y2] = end.split("-").map(Number);

    const startObj = new Date(y1, m1 - 1, d1);
    const endObj = new Date(y2, m2 - 1, d2);

    if (isNaN(startObj) || isNaN(endObj)) return 0;

    const diff = endObj.getTime() - startObj.getTime();

    return Math.max(0, Math.floor(diff / (1000 * 60 * 60 * 24)) + 1);
  } catch {
    return 0;
  }
}

  const daysUsed = calculateDays(currentMonthStart, today);

  const pendingTillLastMonth = Math.max(pending - monthlyRent, 0);
  const currentMonthPending = monthlyRent;

  const adjustedPending =
    pendingTillLastMonth + adjustPayment;

  const finalPending = adjustedPending < 0 ? 0 : adjustedPending;

  async function confirmReturn() {
    try {
      if (!userId || !trolleyId || !clientId) {
        Alert.alert("Error", "Missing data");
        return;
      }

      const clientRef = doc(db, `users/${userId}/clients/${clientId}`);
      const trolleyRef = doc(db, `users/${userId}/trolleys/${trolleyId}`);

      const clientSnap = await getDoc(clientRef);
      const clientData = clientSnap.data();

      const activeRentals = clientData.activeRentals || [];
      const pastRentals = clientData.pastRentals || [];

      const rental = activeRentals.find((r) => r.trolleyNo === trolleyId);

      if (!rental) {
        Alert.alert("Error", "Rental not found");
        return;
      }

      const newActive = activeRentals.filter((r) => r.trolleyNo !== trolleyId);

      const newPast = [
        ...pastRentals,
        {
          ...rental,
          returnedOn: today,

          rentStartDate: startDate,
          billingCycleStart: currentMonthStart,
          rentEndDate: today,

          daysUsedThisMonth: daysUsed,

          pendingTillLastMonth,
          currentMonthPending,
          adjustPayment,
          finalPending,
        },
      ];
      const newTotalPending =
        finalPending + newActive.reduce((sum, r) => sum + (r.pending || 0), 0);

      await updateDoc(clientRef, {
        activeRentals: newActive,
        pastRentals: newPast,
        pendingAmount: newTotalPending,
      });

      await updateDoc(trolleyRef, {
        isAvailable: true,
        currentClient: null,
        pending: finalPending,
      });

      Alert.alert("Success", "Trolley returned successfully");

      router.replace(`/client/${clientId}`);
    } catch (err) {
      console.error(err);
      Alert.alert("Error", err.message);
    }
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Return Summary</Text>

      <Text style={styles.row}>Client: {clientName}</Text>
      <Text style={styles.row}>Trolley: {trolleyId}</Text>
      <Text style={styles.row}>Rent Start Date: {startDate}</Text>

      <View style={styles.box}>
        <Text style={styles.section}>Pending Summary</Text>

        <Text>Pending till last month: ₹{pendingTillLastMonth}</Text>
        <Text>Current month rent: ₹{currentMonthPending}</Text>

        <Text style={styles.pending}>Total Pending: ₹{pending}</Text>
      </View>

      <View style={styles.box}>
        <Text style={styles.section}>Current Month Details</Text>

        <Text>
          Date Range: {currentMonthStart} → {today}
        </Text>
        <Text>Days Used: {daysUsed}</Text>

        <Text>Monthly Rent: ₹{monthlyRent}</Text>
      </View>

      <Text style={styles.label}>Adjust Payment (+ / -)</Text>

      <TextInput
        style={styles.input}
        keyboardType="numeric"
        value={String(adjustPayment)}
        onChangeText={(text) => {
          if (text === "" || text === "-") {
            setAdjustPayment(0);
          } else {
            const val = parseFloat(text);
            setAdjustPayment(isNaN(val) ? 0 : val);
          }
        }}
      />

      <View style={styles.box}>
        <Text>Pending till last month: ₹{pendingTillLastMonth}</Text>
        <Text>Current month: ₹{currentMonthPending}</Text>
        <Text>Adjustment: ₹{adjustPayment}</Text>

        <Text style={styles.final}>Final Pending: ₹{finalPending}</Text>
      </View>

      <Button title="Confirm Return" onPress={confirmReturn} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
  },

  title: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 20,
  },

  section: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 8,
  },

  row: {
    fontSize: 16,
    marginBottom: 5,
  },

  label: {
    marginTop: 20,
    marginBottom: 5,
  },

  input: {
    borderWidth: 1,
    padding: 10,
    borderRadius: 5,
  },

  box: {
    backgroundColor: "#f5f5f5",
    padding: 12,
    marginVertical: 10,
    borderRadius: 6,
  },

  pending: {
    marginTop: 5,
    fontWeight: "bold",
  },

  final: {
    marginTop: 8,
    fontSize: 18,
    fontWeight: "bold",
    color: "red",
  },
});
