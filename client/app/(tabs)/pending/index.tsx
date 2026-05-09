import React, { useState } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  Linking,
  Platform,
  Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import DateTimePicker from "@react-native-community/datetimepicker";
import * as Print from "expo-print";
import * as Sharing from "expo-sharing";
import { useClients } from "../../../src/store/ClientsStore";

export default function PendingScreen() {
  const { clients } = useClients();

  // Date filter state
  const [filterStartDate, setFilterStartDate] = useState(null);
  const [filterEndDate, setFilterEndDate] = useState(null);
  const [showPicker, setShowPicker] = useState(false);
  const [isPickingStart, setIsPickingStart] = useState(false);

  // Convert DD-MM-YYYY -> Date
  const dateStringToDate = (str) => {
    if (!str) return null;
    const [d, m, y] = str.split("-");
    return new Date(y, m - 1, d);
  };

  // YYYY-MM-DD
  const formatDateToIsoString = (d) => d.toISOString().split("T")[0];

  // YYYY-MM-DD → DD-MM-YYYY
  const formatDateToDisplay = (str) => {
    if (!str) return "-";
    const [y, m, d] = str.split("-");
    return `${d}-${m}-${y}`;
  };

  const formatCurrency = (amt) =>
    (amt < 0 ? "-₹" : "₹") +
    Number(Math.abs(amt) || 0).toLocaleString("en-IN");

  // NEW: helper to get due date (Active OR Returned)
  const getClientDueDate = (client) => {
    return (
      client.activeRentals?.[0]?.nextRentDueDate ||
      client.returnedLastDueDate || // 👈 from return logic
      null
    );
  };

  // Filter clients with non-zero pending
  const clientsWithNonZeroPending = clients.filter(
    (c) => (c.pendingAmount || 0) !== 0
  );

  // SORTING by due date (active or returned)
  const pendingClients = clientsWithNonZeroPending.sort((a, b) => {
    const da = getClientDueDate(a);
    const db = getClientDueDate(b);

    const dateA = da ? dateStringToDate(da) : new Date("9999-12-31");
    const dateB = db ? dateStringToDate(db) : new Date("9999-12-31");

    return dateA - dateB;
  });

  const totalPending = pendingClients.reduce(
    (s, c) => s + (c.pendingAmount || 0),
    0
  );

  // Filtering for PDF
  const filterClientsByDate = (list, startStr, endStr) => {
    if (!startStr && !endStr) return list;

    const start = startStr ? new Date(startStr) : null;
    const end = endStr ? new Date(endStr) : null;
    const adjustedEnd = end ? new Date(end.getTime() + 86400000 - 1) : null;

    return list.filter((client) => {
      const dueStr = getClientDueDate(client);
      if (!dueStr) return false;

      const due = dateStringToDate(dueStr);

      if (start && due < start) return false;
      if (adjustedEnd && due > adjustedEnd) return false;

      return true;
    });
  };

  // Date picker handler
  const onDateChange = (event, selectedDate) => {
    const d = selectedDate || new Date();
    setShowPicker(Platform.OS === "ios");

    if (event.type === "set") {
      const iso = formatDateToIsoString(d);

      if (isPickingStart) setFilterStartDate(iso);
      else setFilterEndDate(iso);
    }
  };

  const showStartPicker = () => {
    setIsPickingStart(true);
    setShowPicker(true);
  };
  const showEndPicker = () => {
    setIsPickingStart(false);
    setShowPicker(true);
  };

  // PDF HTML generator
  const generatePDFHtml = (data, total, start, end) => {
    const displayStart = start ? formatDateToDisplay(start) : "Start";
    const displayEnd = end ? formatDateToDisplay(end) : "End";

    let dateRangeTitle =
      start || end
        ? `Summary Due Dates: ${displayStart} → ${displayEnd}`
        : "Full Summary";

    const rows = data
      .map((c, i) => {
        const due =
          c.activeRentals?.[0]?.nextRentDueDate ||
          c.returnedLastDueDate ||
          "-";

        return `
        <tr>
          <td>${i + 1}</td>
          <td>${c.activeRentals?.[0]?.trolleyNo || "-"}</td>
          <td>${c.name}</td>
          <td>${c.phone || "-"}</td>
          <td>${due}</td>
          <td style="color:${c.pendingAmount > 0 ? "red" : "green"};">
            ${formatCurrency(c.pendingAmount)}
          </td>
        </tr>`;
      })
      .join("");

    return `
      <html>
        <head>
          <style>
            body { font-family: Arial; padding: 20px; }
            table { width: 100%; border-collapse: collapse; }
            td, th { border-bottom: 1px solid #ddd; padding: 8px; font-size: 12px; }
            th { background: #eee; }
          </style>
        </head>
        <body>
          <h1 style="text-align:center;">💰 Mittal Trolley Pending Summary</h1>
          <h3 style="text-align:center;">${dateRangeTitle}</h3>
          <table>
            <tr>
              <th>#</th>
              <th>Trolley</th>
              <th>Name</th>
              <th>Phone</th>
              <th>Due Date</th>
              <th>Pending</th>
            </tr>
            ${rows}
          </table>
          <h2 style="text-align:right; margin-top:20px; color:${
            total > 0 ? "red" : "green"
          }">
            Total Outstanding: ${formatCurrency(total)}
          </h2>
        </body>
      </html>
    `;
  };

  const downloadPdf = async () => {
    const filtered = filterClientsByDate(
      pendingClients,
      filterStartDate,
      filterEndDate
    );
    const total = filtered.reduce((s, c) => s + (c.pendingAmount || 0), 0);

    if (filtered.length === 0) {
      Alert.alert("No Data", "No pending clients in selected date range.");
      return;
    }

    try {
      const html = generatePDFHtml(
        filtered,
        total,
        filterStartDate,
        filterEndDate
      );
      const { uri } = await Print.printToFileAsync({ html });

      if (!(await Sharing.isAvailableAsync())) {
        Alert.alert("Error", "Sharing not available");
        return;
      }

      await Sharing.shareAsync(uri, {
        mimeType: "application/pdf",
        dialogTitle: "Share Pending Summary PDF",
      });
    } catch (e) {
      console.log(e);
      Alert.alert("Error", "PDF generation failed");
    }
  };

  // Render each row
  const renderClientRow = ({ item, index }) => {
    const active = item.activeRentals?.[0];
    const due =
      active?.nextRentDueDate ||
      item.returnedLastDueDate || // 👈 FIX here
      "-";

    return (
      <View
        style={{
          flexDirection: "row",
          backgroundColor: index % 2 === 0 ? "#f9f9f9" : "#fff",
          paddingVertical: 10,
          borderBottomWidth: 1,
          borderColor: "#eee",
        }}
      >
        <Text style={{ flex: 0.3, textAlign: "center" }}>{index + 1}</Text>
        <Text style={{ flex: 0.6, textAlign: "center" }}>
          {active?.trolleyNo || "-"}
        </Text>
        <Text style={{ flex: 1.2, textAlign: "center" }}>{item.name}</Text>

        <TouchableOpacity
          style={{ flex: 1, alignItems: "center" }}
          onPress={() => item.phone && Linking.openURL(`tel:${item.phone}`)}
        >
          <Text style={{ color: "#007AFF" }}>{item.phone || "-"}</Text>
        </TouchableOpacity>

        <Text style={{ flex: 1, textAlign: "center" }}>{due}</Text>

        <Text
          style={{
            flex: 0.8,
            textAlign: "right",
            color: item.pendingAmount > 0 ? "red" : "green",
            fontWeight: "bold",
          }}
        >
          {formatCurrency(item.pendingAmount)}
        </Text>
      </View>
    );
  };

  return (
    <View style={{ flex: 1, backgroundColor: "#f8fafc", padding: 10 }}>
      <Text style={{ fontSize: 22, fontWeight: "bold", textAlign: "center" }}>
        🧾 Pending Summary
      </Text>

      {/* Date Filter */}
      <View style={{ flexDirection: "row", marginVertical: 10 }}>
        <TouchableOpacity
          onPress={showStartPicker}
          style={{
            flex: 1,
            borderWidth: 1,
            borderColor: "#3b82f6",
            marginRight: 5,
            padding: 10,
            borderRadius: 5,
            backgroundColor: "#e0f2fe",
            alignItems: "center",
          }}
        >
          <Text>Start: {formatDateToDisplay(filterStartDate)}</Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={showEndPicker}
          style={{
            flex: 1,
            borderWidth: 1,
            borderColor: "#3b82f6",
            padding: 10,
            borderRadius: 5,
            backgroundColor: "#e0f2fe",
            alignItems: "center",
          }}
        >
          <Text>End: {formatDateToDisplay(filterEndDate)}</Text>
        </TouchableOpacity>
      </View>

      {showPicker && (
        <DateTimePicker
          value={
            isPickingStart && filterStartDate
              ? new Date(filterStartDate)
              : !isPickingStart && filterEndDate
              ? new Date(filterEndDate)
              : new Date()
          }
          mode="date"
          onChange={onDateChange}
        />
      )}

      {/* PDF Button */}
      <TouchableOpacity
        onPress={downloadPdf}
        style={{
          backgroundColor: "#4CAF50",
          padding: 12,
          borderRadius: 8,
          flexDirection: "row",
          justifyContent: "center",
          marginVertical: 10,
        }}
      >
        <Ionicons
          name="cloud-download-outline"
          size={20}
          color="white"
          style={{ marginRight: 5 }}
        />
        <Text style={{ color: "white", fontWeight: "bold" }}>
          Download/Share PDF
        </Text>
      </TouchableOpacity>

      {/* Table Header */}
      <View
        style={{
          flexDirection: "row",
          backgroundColor: "#e2e8f0",
          paddingVertical: 8,
          borderRadius: 6,
        }}
      >
        <Text style={{ flex: 0.3, textAlign: "center", fontWeight: "bold" }}>
          #
        </Text>
        <Text style={{ flex: 0.6, textAlign: "center", fontWeight: "bold" }}>
          Trolley
        </Text>
        <Text style={{ flex: 1.2, textAlign: "center", fontWeight: "bold" }}>
          Name
        </Text>
        <Text style={{ flex: 1, textAlign: "center", fontWeight: "bold" }}>
          Phone
        </Text>
        <Text style={{ flex: 1, textAlign: "center", fontWeight: "bold" }}>
          Due Date
        </Text>
        <Text style={{ flex: 0.8, textAlign: "center", fontWeight: "bold" }}>
          Pending
        </Text>
      </View>

      {/* Data Rows */}
      {pendingClients.length === 0 ? (
        <Text style={{ textAlign: "center", color: "gray", marginTop: 20 }}>
          🎉 All accounts settled!
        </Text>
      ) : (
        <FlatList
          data={pendingClients}
          keyExtractor={(item) => item.id}
          renderItem={renderClientRow}
          ListFooterComponent={
            <View
              style={{
                marginTop: 10,
                backgroundColor: "#e2e8f0",
                paddingVertical: 10,
                borderRadius: 6,
              }}
            >
              <Text
                style={{
                  fontSize: 18,
                  fontWeight: "bold",
                  textAlign: "center",
                  color: totalPending > 0 ? "red" : "green",
                }}
              >
                Total Outstanding: {formatCurrency(totalPending)}
              </Text>
            </View>
          }
        />
      )}
    </View>
  );
}
