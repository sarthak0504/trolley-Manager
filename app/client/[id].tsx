import React, { useEffect, useState, useMemo } from "react";
import {
    View,
    Text,
    TouchableOpacity,
    Linking,
    Alert,
    ScrollView,
    Platform,
    StyleSheet,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { collection, onSnapshot, doc, updateDoc, deleteDoc } from "firebase/firestore";
import { db } from "../../config/firebaseConfig";
import { userCollectionPath } from "../../config/firestorePaths";
import { useClients } from "../../store/ClientsStore";
import { usePayments } from "../../store/PaymentsStore";
import { useTrolleys } from "../../store/TrolleyStore";
import AddPaymentModal from "../../components/AddPaymentModal";

// Imports for Filtering and PDF
import DateTimePicker from "@react-native-community/datetimepicker";
import { Ionicons } from "@expo/vector-icons";
import * as Print from "expo-print";
import * as Sharing from "expo-sharing";

// --- Date Utilities ---
const dateStringToDate = (dateString) => {
    if (!dateString) return null;
    const parts = dateString.split("-");
    // Date constructor expects YYYY, MM (0-indexed), DD
    return new Date(parts[2], parts[1] - 1, parts[0]);
};

const formatDateToIsoString = (date) => {
    return date.toISOString().split("T")[0];
};

const formatDateToDisplay = (date) => {
    if (!date) return 'Date';
    const [year, month, day] = date.split('-');
    return `${day}-${month}-${year}`;
}

const parseDateForPicker = (dateString) => {
    if (!dateString) return new Date();
    // Convert YYYY-MM-DD (from state) back to Date object for picker value
    return new Date(dateString);
}


// --- Component Start ---

export default function ClientDetailsScreen() {
    const { id } = useLocalSearchParams();
    const router = useRouter();
    const { clients, setClients, updateClient } = useClients(); 
    const { addPayment, updatePayment, deletePayment } = usePayments(); 
    const { markReturned } = useTrolleys();

    const client = clients.find((c) => c.id === id);
    const [payments, setPayments] = useState([]);
    const [modalVisible, setModalVisible] = useState(false);
    
    const [paymentToEdit, setPaymentToEdit] = useState(null);
    const [filterStartDate, setFilterStartDate] = useState(null); 
    const [filterEndDate, setFilterEndDate] = useState(null); 
    const [showPicker, setShowPicker] = useState(false);
    const [isPickingStart, setIsPickingStart] = useState(false);

    const formatDate = (date) => {
        const d = new Date(date);
        const day = String(d.getDate()).padStart(2, "0");
        const month = String(d.getMonth() + 1).padStart(2, "0");
        const year = d.getFullYear();
        return `${day}-${month}-${year}`;
    };

    // --- Utility Refs ---
    const getPaymentsColRef = () => collection(db, `users/${client.userId}/clients/${id}/payments`);
    
    // --- Firestore Data Fetching ---
    useEffect(() => {
        if (!client) return;
        const paymentsRef = getPaymentsColRef();
        
        const unsub = onSnapshot(paymentsRef, (snapshot) => {
            const list = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
            setPayments(list); 
        });
        return () => unsub();
    }, [client]);

    // --- Modal Handlers ---
    const handleOpenPaymentModal = (payment = null) => {
        setPaymentToEdit(payment);
        setModalVisible(true);
    };
    
    const handleClosePaymentModal = () => {
        setModalVisible(false);
        setPaymentToEdit(null);
    };
    
    const handleSavePayment = (details) => {
        if (details.id) {
            const oldPayment = payments.find(p => p.id === details.id);
            if (oldPayment) {
                updatePayment(id, details.id, details, oldPayment.amount);
            }
        } else {
            addPayment(id, { ...details, date: formatDate(new Date()) });
        }
        handleClosePaymentModal();
    };

    const handlePaymentActions = (item) => {
        Alert.alert(
            "Payment Actions",
            `Amount: ₹${item.amount.toLocaleString('en-IN')}`,
            [
                { text: "Cancel", style: "cancel" },
                { 
                    text: "Delete", 
                    style: "destructive", 
                    onPress: () => Alert.alert(
                        "Confirm Delete",
                        `Are you sure you want to delete this payment?`,
                        [
                            { text: "No", style: "cancel" },
                            { text: "Yes", style: "destructive", onPress: () => deletePayment(id, item.id, item.amount) }, 
                        ]
                    ) 
                },
                { text: "Edit", onPress: () => handleOpenPaymentModal(item) },
            ]
        );
    };


    // --- Filtering and Sorting Logic ---
    const filteredAndSortedPayments = useMemo(() => {
      let list = payments;
  
      if (filterStartDate || filterEndDate) {
          const start = filterStartDate ? parseDateForPicker(filterStartDate) : null;
          const end = filterEndDate ? parseDateForPicker(filterEndDate) : null;
          const adjustedEnd = end ? new Date(end.getTime() + (24 * 60 * 60 * 1000) - 1) : null; 
    
          list = list.filter(payment => {
            const paymentDate = dateStringToDate(payment.date); 
            if (!paymentDate) return false;
            if (start && paymentDate.getTime() < start.getTime()) return false;
            if (adjustedEnd && paymentDate.getTime() > adjustedEnd.getTime()) return false;
            return true;
          });
      }
  
      return list.sort((a, b) => {
          const dateA = dateStringToDate(a.date);
          const dateB = dateStringToDate(b.date);
          return dateB.getTime() - dateA.getTime();
      });
    }, [payments, filterStartDate, filterEndDate]);
    
    // --- Date Picker Handlers & PDF Logic ---
    const onDateChange = (event, selectedDate) => { 
        const currentDate = selectedDate || new Date();
        setShowPicker(Platform.OS === 'ios');
        
        if (event.type === 'set') {
          // Convert the selected Date object to YYYY-MM-DD string
          const dateString = formatDateToIsoString(currentDate); 
          if (isPickingStart) {
            setFilterStartDate(dateString);
          } else {
            setFilterEndDate(dateString);
          }
        }
    };
    const showStartPicker = () => { setIsPickingStart(true); setShowPicker(true); };
    const showEndPicker = () => { setIsPickingStart(false); setShowPicker(true); };
    
    const generatePDFHtml = (data, client, startDate, endDate) => {
      let dateRangeTitle = "Full Payment History";
      const displayStart = startDate ? formatDateToDisplay(startDate) : 'Start';
      const displayEnd = endDate ? formatDateToDisplay(endDate) : 'End';

      if (startDate || endDate) {
          dateRangeTitle = `Payments from ${displayStart} to ${displayEnd}`;
      }

      const totalPaid = data.reduce((sum, item) => sum + item.amount, 0);

      const clientDetailsHtml = `
          <table style="width: 100%; margin-bottom: 20px; font-size: 12px; border: 1px solid #ddd;">
              <tr>
                  <td style="width: 25%; font-weight: bold; background-color: #f7f7f7;">Client Name:</td>
                  <td style="width: 25%;">${client.name}</td>
                  <td style="width: 25%; font-weight: bold; background-color: #f7f7f7;">Guarantor:</td>
                  <td style="width: 25%;">${client.jamamnatDaar || "-"}</td>
              </tr>
              <tr>
                  <td style="font-weight: bold; background-color: #f7f7f7;">Phone:</td>
                  <td>${client.phone || "-"}</td>
                  <td style="font-weight: bold; background-color: #f7f7f7;">Guarantor Phone:</td>
                  <td>${client.jamanatPhone || "-"}</td>
              </tr>
              <tr>
                  <td style="font-weight: bold; background-color: #f7f7f7;">Address:</td>
                  <td>${client.address || "-"}</td>
                  <td style="font-weight: bold; background-color: #f7f7f7;">Trolley No:</td>
                  <td>${client.activeRentals?.map(r => r.trolleyNo).join(", ") || "-"}</td>
              </tr>
          </table>
      `;

      const rowsHtml = data
          .map(
              (item, index) => `
                  <tr style="border-bottom: 1px solid #eee;">
                      <td style="width: 5%; text-align: center;">${index + 1}</td>
                      <td style="width: 30%; text-align: center;">${item.date}</td>
                      <td style="width: 45%; padding-left: 10px;">${item.notes || "-"}</td>
                      <td style="width: 20%; text-align: right; font-weight: bold; padding-right: 10px; color: #16a34a;">
                          ₹${item.amount.toLocaleString('en-IN')}
                      </td>
                  </tr>
              `
          )
          .join("");

      const htmlContent = `
          <html>
              <head>
                  <style>
                      body { font-family: Arial, sans-serif; padding: 20px; }
                      h1 { text-align: center; color: #333; margin-bottom: 20px; }
                      h3 { text-align: center; color: #16a34a; margin-top: 20px; margin-bottom: 20px; font-size: 16px; }
                      table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
                      th, td { padding: 8px; border-bottom: 1px solid #ddd; font-size: 12px; }
                      th { background-color: #f0fdf4; text-align: center; font-weight: bold; }
                      .total {
                          text-align: right;
                          font-size: 18px;
                          font-weight: bold;
                          margin-top: 20px;
                          padding: 10px;
                          background-color: #d4edda;
                          color: #155724;
                          border-radius: 5px;
                      }
                  </style>
              </head>
              <body>
                  <h1>💳 Payment History Report</h1>
                  ${clientDetailsHtml}
                  <h3>${dateRangeTitle}</h3>
                  <table style="margin-top: 10px;">
                      <thead>
                          <tr>
                              <th>#</th>
                              <th>Date</th>
                              <th>Notes</th>
                              <th>Amount Paid</th>
                          </tr>
                      </thead>
                      <tbody>
                          ${rowsHtml}
                      </tbody>
                  </table>
                  <div class="total">
                      Total Paid in Range: ₹${totalPaid.toLocaleString('en-IN')}
                  </div>
              </body>
          </html>
      `;
      return htmlContent;
    };
    
    const downloadPdf = async () => {
        if (filteredAndSortedPayments.length === 0) {
          Alert.alert("No Data", "No payments found in the selected date range.");
          return;
        }
    
        try {
          const html = generatePDFHtml(
            filteredAndSortedPayments, 
            client, 
            filterStartDate, 
            filterEndDate
          );
    
          const { uri } = await Print.printToFileAsync({ html, base64: false });
    
          if (Platform.OS === 'web') {
             Alert.alert("Unsupported", "PDF download is only supported on native (iOS/Android).");
             return;
          }
          
          if (!(await Sharing.isAvailableAsync())) {
            Alert.alert("Error", "Sharing is not available on your device.");
            return;
          }
    
          await Sharing.shareAsync(uri, {
            mimeType: "application/pdf",
            dialogTitle: `Share Payment History for ${client.name}`,
            UTI: "com.adobe.pdf",
          });
          
        } catch (error) {
          console.error("PDF generation or sharing failed:", error);
          Alert.alert("Error", "Failed to generate or share PDF.");
        }
    };
    
    // --- Other Handlers (Remaining the same) ---
   const handleCall = async (phone) => {
  if (!phone) {
    Alert.alert("No Phone Number", "This client does not have a phone number.");
    return;
  }

  const url = `tel:${phone}`;
  try {
    const supported = await Linking.canOpenURL(url);
    if (supported) {
      await Linking.openURL(url);
    } else {
      Alert.alert("Error", "Unable to open the phone dialer on this device.");
    }
  } catch (error) {
    console.error("Dialer error:", error);
    Alert.alert("Error", "Something went wrong while trying to make the call.");
  }
};

  // --- Inside ClientDetailsScreen.js ---
// --- Inside ClientDetailsScreen.js ---

const handleMarkReturned = async (rental) => {
    // 📞 Ensure client and userId are available immediately
    if (!client || !client.userId) {
        return Alert.alert("Error", "Client data or User ID is missing.");
    }
    
    Alert.alert(
        "Confirm Return",
        `Mark trolley ${rental.trolleyNo} as returned?`,
        [
            { text: "Cancel", style: "cancel" },
            {
                text: "Yes",
                onPress: async () => {
                    try {
                        const clientRef = doc(
                            db,
                            userCollectionPath(client.userId, "clients"),
                            client.id
                        );
                        
                        // 1. Prepare updates
                       // 1. Prepare updates
                        const newActive = client.activeRentals.filter(
                            (r) => r.trolleyNo !== rental.trolleyNo
                        );

                        const newPast = [
    ...(client.pastRentals || []),
    {
        ...rental,
        returnedOn: formatDate(new Date()),
        returnedLastDueDate: rental.nextRentDueDate || null, // 👈 keeps last due date
    }
];


                        // Pending from returned trolley
                        const returnedPending = rental.pending || 0;

                        // Recalculate pending amount: add pending from returned + active rentals
                        const newTotalPendingAmount =
                            returnedPending + newActive.reduce((sum, r) => sum + (r.pending || 0), 0);

                        const updatedClientData = {
        activeRentals: newActive,
        pastRentals: newPast,
        pendingAmount: newTotalPendingAmount,
        returnedLastDueDate: rental.nextRentDueDate || null   // 👈 Add this
    };


                        // 3. Update Client in Firestore
                        await updateDoc(clientRef, updatedClientData);

                        // 4. Update Trolley status
                        await markReturned(rental.trolleyNo, formatDate(new Date()));
                        
                        // 5. Update local client state immediately (using the full updated data structure)
                        setClients((prev) =>
                            prev.map((c) => (c.id === client.id ? { ...c, ...updatedClientData } : c))
                        );

                        Alert.alert("✅ Success", `Trolley ${rental.trolleyNo} marked as returned.`);
                    } catch (err) {
                        console.error("RETURN PROCESS FAILED:", err);
                        Alert.alert("❌ Error", `Failed to mark returned: ${err.message}`);
                    }
                },
            },
        ]
    );
};


    // --- Render UI ---
    if (!client) {
      return (
        <View style={{ padding: 20 }}>
          <Text>Client not found.</Text>
        </View>
      );
    }

    return (
      <View style={{ flex: 1, backgroundColor: "#fff" }}>
        <ScrollView
          contentContainerStyle={{ padding: 16, paddingBottom: 80 }}
          showsVerticalScrollIndicator={false}
        >
          {/* 🔙 Back */}
          <TouchableOpacity onPress={() => router.back()}>
            <Text style={{ fontSize: 16, marginBottom: 12 }}>⬅ Back</Text>
          </TouchableOpacity>

          {/* 🧾 Client Info, Guarantor, Active Rentals, Financial Summary (Remaining the same) */}
          <Text style={{ fontSize: 26, fontWeight: "bold" }}>{client.name}</Text>
          <Text style={{ color: "gray", marginBottom: 12 }}>{client.email || ""}</Text>
          
          {/* Existing views for phone, address, guarantor, advance, and rentals */}
          
          {(client.phone || client.address) && (
              <View style={{ backgroundColor: "#fff", padding: 12, borderRadius: 8, marginBottom: 12, borderLeftWidth: 4, borderLeftColor: "#4f46e5" }}>
              {client.phone && (<TouchableOpacity onPress={() => handleCall(client.phone)}><Text style={{ color: "#007AFF", fontWeight: "bold" }}>📞 Call: {client.phone}</Text></TouchableOpacity>)}
              {client.address && <Text>🏠 {client.address}</Text>}
              </View>
          )}

          {(client.jamamnatDaar || client.jamanatPhone || client.advance > 0) && (
              <View style={{ backgroundColor: "#f0fdf4", padding: 12, borderRadius: 8, marginBottom: 12, borderLeftWidth: 4, borderLeftColor: "#16a34a" }}>
              <Text style={{ fontWeight: "bold", fontSize: 16, marginBottom: 4 }}>Guarantor Details</Text>
              {client.jamamnatDaar && (<Text>👤 Name: {client.jamamnatDaar}</Text>)}
              {client.jamanatPhone && (<TouchableOpacity onPress={() => handleCall(client.jamanatPhone)}><Text style={{ color: "#007AFF" }}>📱 Phone: {client.jamanatPhone}</Text></TouchableOpacity>)}
              {client.initialAdvance > 0 && ( <Text>💰 Advance Paid: ₹{client.initialAdvance}</Text>)}

              </View>
          )}

          <Text style={{ fontWeight: "bold", fontSize: 18, marginBottom: 8 }}>Active Rentals</Text>
          {client.activeRentals?.length ? (
              client.activeRentals.map((r) => (
              <View key={r.trolleyNo} style={{ backgroundColor: "#f9fafb", padding: 10, borderRadius: 8, marginBottom: 10, borderLeftWidth: 5, borderLeftColor: "orange" }}>
                  <Text style={{ fontWeight: "bold" }}>🛒 Trolley: {r.trolleyNo}</Text>
                  <Text>📅 Rent Start: {r.startDate}</Text>
                  <Text>📆 Next Due: {r.nextRentDueDate || "Not Set"}</Text>
                  <Text>💵 Monthly Rent: ₹{r.monthlyRent}</Text>
                  <Text>⏳ Pending: ₹{r.pending || 0}</Text>
                  <TouchableOpacity onPress={() => handleMarkReturned(r)} style={{ backgroundColor: "orange", padding: 8, borderRadius: 6, marginTop: 8 }}><Text style={{ color: "white", textAlign: "center" }}>Mark Returned 🔄</Text></TouchableOpacity>
              </View>
              ))
          ) : (<Text style={{ color: "gray" }}>No active rentals.</Text>)}
          
          <View style={{ backgroundColor: "#fee2e2", padding: 12, borderRadius: 8, marginBottom: 16 }}>
              <Text style={{ fontWeight: "bold", fontSize: 18 }}>Financial Summary</Text>
              <Text style={{ color: "red", fontSize: 16 }}>Pending Total: ₹{client.pendingAmount || 0}</Text>
              <Text style={{ fontSize: 16 }}>Advance Paid: ₹{client.initialAdvance || 0}</Text>
              <Text style={{ fontSize: 16 }}>Total Paid: ₹{client.totalPaidAmount || 0}</Text>
          </View>

          {/* 🟢 Add Payment Button (SHIFTED UP) */}
          <TouchableOpacity
              onPress={() => handleOpenPaymentModal()} 
              style={styles.addPaymentButton}
          >
              <Text style={styles.addPaymentButtonText}>Add Payment</Text>
          </TouchableOpacity>

          {/* 💳 Payment History Section */}
          <Text style={styles.sectionHeader}>
              Payment History
          </Text>
          
          {/* Date Filter UI */}
          <View style={styles.filterContainer}>
              <TouchableOpacity onPress={showStartPicker} style={styles.dateButton}>
                  <Text style={styles.dateButtonText}>Start: {formatDateToDisplay(filterStartDate)}</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={showEndPicker} style={styles.dateButton}>
                  <Text style={styles.dateButtonText}>End: {formatDateToDisplay(filterEndDate)}</Text>
              </TouchableOpacity>
          </View>
          
          {/* Action Buttons */}
          <TouchableOpacity onPress={downloadPdf} style={styles.pdfButton}>
              <Ionicons name="cloud-download-outline" size={18} color="white" style={{ marginRight: 5 }} />
              <Text style={{ color: "white", fontWeight: "bold", fontSize: 16 }}>Download PDF</Text>
          </TouchableOpacity>

          {/* 🆕 Date Picker Component (Rendered conditionally) */}
          {showPicker && (
            <DateTimePicker
              testID="dateTimePicker"
              value={
                (isPickingStart && filterStartDate) 
                ? dateStringToDate(formatDateToDisplay(filterStartDate))
                : (isPickingStart === false && filterEndDate) 
                  ? dateStringToDate(formatDateToDisplay(filterEndDate))
                  : new Date()
              }
              mode="date"
              display={Platform.OS === 'ios' ? "spinner" : "default"}
              onChange={onDateChange}
            />
          )}

          {/* Payment List (using filteredAndSortedPayments) */}
          {filteredAndSortedPayments.length ? (
              filteredAndSortedPayments.map((item) => (
              <TouchableOpacity
                  key={item.id}
                  onPress={() => handlePaymentActions(item)}
                  style={styles.paymentItem}
              >
                  <View style={styles.paymentContent}>
                      <Text style={styles.paymentAmountText}>
                          + ₹{item.amount.toLocaleString('en-IN')}
                      </Text>
                      <Text style={styles.paymentDateText}>
                          Date: {item.date}
                      </Text>
                      <Ionicons name="ellipsis-vertical" size={18} color="#6c757d" />
                  </View>
                  {item.notes && <Text style={styles.paymentNotesText}>Notes: {item.notes}</Text>}
              </TouchableOpacity>
              ))
          ) : (
              <Text style={styles.emptyPaymentText}>
              {payments.length === 0 
                  ? "No payments yet." 
                  : "No payments found for the selected date range."
              }
              </Text>
          )}
        </ScrollView>
        
        {/* Modal MUST be rendered outside ScrollView but inside the main container View */}
        <AddPaymentModal
            visible={modalVisible}
            onClose={handleClosePaymentModal}
            onSave={handleSavePayment} 
            paymentToEdit={paymentToEdit} 
            clientId={id}
        />
      </View>
    );
}

const styles = StyleSheet.create({
    filterContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 10,
    },
    dateButton: {
        padding: 10,
        borderWidth: 1,
        borderColor: '#3b82f6',
        flex: 1,
        marginRight: 5,
        borderRadius: 5,
        backgroundColor: '#e0f2fe',
        alignItems: 'center',
    },
    dateButtonText: {
        color: '#1e3a8a',
        fontWeight: '500',
    },
    pdfButton: {
        backgroundColor: "#4CAF50",
        padding: 12,
        borderRadius: 8,
        marginBottom: 16,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
    },
    sectionHeader: {
        fontWeight: "bold", 
        fontSize: 18, 
        marginBottom: 8, 
        marginTop: 15, // Added margin top for separation after the button
    },
    // Payment List Styles
    paymentItem: {
        backgroundColor: "#f9fafb",
        padding: 10,
        borderRadius: 8,
        marginBottom: 8,
        borderLeftWidth: 4,
        borderLeftColor: '#16a34a',
    },
    paymentContent: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    paymentAmountText: {
        fontWeight: "bold",
        fontSize: 16,
        color: '#16a34a',
    },
    paymentDateText: {
        color: 'gray',
        flexGrow: 1,
        textAlign: 'right',
        paddingRight: 10,
    },
    paymentNotesText: {
        marginTop: 4,
    },
    emptyPaymentText: {
        textAlign: "center", 
        color: "gray", 
        marginTop: 10
    },
    addPaymentButton: {
        backgroundColor: "green",
        padding: 12,
        borderRadius: 6,
        // 🔑 SHIFTED UP: Removed marginTop: 20
        marginBottom: 10, // Added margin bottom for spacing before history section
    },
    addPaymentButtonText: {
        color: "#fff", 
        textAlign: "center", 
        fontSize: 16
    }
});