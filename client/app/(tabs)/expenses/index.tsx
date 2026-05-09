import React, { useState, useMemo } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  Button,
  Platform,
  Alert,
  StyleSheet,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import DateTimePicker from "@react-native-community/datetimepicker";
import * as Print from "expo-print";
import * as Sharing from "expo-sharing";

// Assuming useExpenses now includes deleteExpense and updateExpense
import { useExpenses } from "@/src/store/ExpensesStore";
import { useClients } from "@/src/store/ClientsStore";
import AddExpenseModal from "@/src/components/AddExpenseModal";

export default function ExpensesScreen() {
  // Assume deleteExpense and updateExpense are available from your store
  const { expenses, addExpense, deleteExpense, updateExpense } = useExpenses();
  const { clients } = useClients();
  const [modalVisible, setModalVisible] = useState(false);

  // 🆕 State for Editing
  const [expenseToEdit, setExpenseToEdit] = useState(null); // Holds the expense object if editing

  // Date Filter State
  const [filterStartDate, setFilterStartDate] = useState(null); // 'YYYY-MM-DD'
  const [filterEndDate, setFilterEndDate] = useState(null);     // 'YYYY-MM-DD'
  const [showPicker, setShowPicker] = useState(false);
  const [isPickingStart, setIsPickingStart] = useState(false);

  // --- Utility Functions ---

  // Helper to convert DD-MM-YYYY string (from expense data) to a Date object
  const dateStringToDate = (dateString) => {
    if (!dateString) return null;
    const [day, month, year] = dateString.split('-');
    return new Date(year, month - 1, day);
  };

  // Helper to format Date object to YYYY-MM-DD string (used for state/picker)
  const formatDateToIsoString = (date) => {
    return date.toISOString().split('T')[0];
  }

  // Helper to format YYYY-MM-DD string (from state) to DD-MM-YYYY string (for display/PDF)
  const formatDateToDisplay = (date) => {
    if (!date) return 'Date';
    const [year, month, day] = date.split('-');
    return `${day}-${month}-${year}`;
  }
  
  // --- Modal/Action Handlers ---
  
  // 🆕 Function to open modal for adding (expense=null) or editing
  const handleOpenModal = (expense = null) => {
    setExpenseToEdit(expense); 
    setModalVisible(true);
  };

  // 🆕 Function to close and reset modal state
  const handleCloseModal = () => {
    setModalVisible(false);
    setExpenseToEdit(null); // Clear the expense being edited
  };

  // 🆕 Function to handle save (either add or update) from the modal
  const handleSaveExpense = (details) => {
    if (details.id) {
      // If payload has an ID, call update
      updateExpense(details.id, details); 
    } else {
      // If no ID, call add
      addExpense(details);
    }
    handleCloseModal();
  };

  // 🆕 Handler for item press/long press to show action menu
  const handleExpenseActions = (item) => {
    Alert.alert(
      "Expense Actions",
      `Choose an action for: ${item.work}`,
      [
        { text: "Cancel", style: "cancel" },
        { 
          text: "Delete", 
          style: "destructive", 
          onPress: () => Alert.alert(
            "Confirm Delete",
            `Are you sure you want to delete the expense for '${item.work}'?`,
            [
              { text: "No", style: "cancel" },
              { text: "Yes", style: "destructive", onPress: () => deleteExpense(item.id) },
            ]
          ) 
        },
        { text: "Edit", onPress: () => handleOpenModal(item) },
      ]
    );
  };
  

  // --- Filtering Logic (Memoized) ---
  
  const filteredExpenses = useMemo(() => {
    let list = expenses;

    if (!filterStartDate && !filterEndDate) {
      return list;
    }

    const start = filterStartDate ? new Date(filterStartDate) : null;
    const end = filterEndDate ? new Date(filterEndDate) : null;

    const adjustedEnd = end ? new Date(end.getTime() + (24 * 60 * 60 * 1000) - 1) : null; 

    return list.filter(expense => {
      const expenseDateStr = expense.date; 
      if (!expenseDateStr) return false;

      const expenseDate = dateStringToDate(expenseDateStr);

      if (start && expenseDate.getTime() < start.getTime()) return false;
      if (adjustedEnd && expenseDate.getTime() > adjustedEnd.getTime()) return false;
      
      return true;
    });
  }, [expenses, filterStartDate, filterEndDate]);

  // Calculate total based on FILTERED expenses
  const totalFiltered = filteredExpenses.reduce((sum, e) => sum + e.amount, 0);

  // --- Date Picker Logic (Unchanged) ---

  const onDateChange = (event, selectedDate) => {
    const currentDate = selectedDate || new Date();
    setShowPicker(Platform.OS === 'ios');
    
    if (event.type === 'set') {
      const dateString = formatDateToIsoString(currentDate);
      
      if (isPickingStart) {
        setFilterStartDate(dateString);
      } else {
        setFilterEndDate(dateString);
      }
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

  // --- PDF Generation Logic (Unchanged) ---

  const generatePDFHtml = (data, total, startDate, endDate) => {
    let dateRangeTitle = "Full Expense History";
    const displayStart = startDate ? formatDateToDisplay(startDate) : 'Start';
    const displayEnd = endDate ? formatDateToDisplay(endDate) : 'End';

    if (startDate || endDate) {
      dateRangeTitle = `Expenses from ${displayStart} to ${displayEnd}`;
    }

    const rowsHtml = data
      .map(
        (item, index) => `
          <tr style="border-bottom: 1px solid #eee;">
            <td style="width: 5%; text-align: center;">${index + 1}</td>
            <td style="width: 35%; padding-left: 10px;">${item.work || "-"}</td>
            <td style="width: 20%; text-align: center;">${item.trolleyNo || "-"}</td>
            <td style="width: 20%; text-align: center;">${item.date || "-"}</td>
            <td style="width: 20%; text-align: right; font-weight: bold; padding-right: 10px;">
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
            h1 { text-align: center; color: #333; margin-bottom: 5px; }
            h2 { text-align: center; color: #555; margin-bottom: 20px; font-size: 16px; }
            table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
            th, td { padding: 8px; border-bottom: 1px solid #ddd; font-size: 12px; }
            th { background-color: #f2f2f2; text-align: center; font-weight: bold; }
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
          <h1>💸 Expenses Summary</h1>
          <h2>${dateRangeTitle}</h2>
          <table>
            <thead>
              <tr>
                <th>#</th>
                <th>Work/Description</th>
                <th>Trolley No.</th>
                <th>Date</th>
                <th>Amount</th>
              </tr>
            </thead>
            <tbody>
              ${rowsHtml}
            </tbody>
          </table>
          <div class="total">
            Total Expenses: ₹${total.toLocaleString('en-IN')}
          </div>
        </body>
      </html>
    `;
    return htmlContent;
  };

  const downloadPdf = async () => {
    if (filteredExpenses.length === 0) {
      Alert.alert("No Data", "No expenses found in the selected range.");
      return;
    }

    try {
      const html = generatePDFHtml(
        filteredExpenses, 
        totalFiltered, 
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
        dialogTitle: "Share Expense Summary PDF",
        UTI: "com.adobe.pdf",
      });
      
    } catch (error) {
      console.error("PDF generation or sharing failed:", error);
      Alert.alert("Error", "Failed to generate or share PDF.");
    }
  };


  // --- Render UI ---

  return (
    <View style={styles.container}>
      
      {/* Summary */}
      <View style={styles.summaryBox}>
        <Text style={styles.summaryText}>
          Total Expenses: ₹{totalFiltered.toLocaleString('en-IN')}
        </Text>
      </View>

      {/* Date Filter UI */}
      <View style={styles.filterContainer}>
        {/* Start Date Button */}
        <TouchableOpacity 
          onPress={showStartPicker}
          style={styles.dateButton}
        >
            <Text style={styles.dateButtonText}>
                Start: {formatDateToDisplay(filterStartDate)}
            </Text>
        </TouchableOpacity>
        
        {/* End Date Button */}
        <TouchableOpacity 
          onPress={showEndPicker}
          style={styles.dateButton}
        >
            <Text style={styles.dateButtonText}>
                End: {formatDateToDisplay(filterEndDate)}
            </Text>
        </TouchableOpacity>
      </View>

      {/* Action Buttons */}
      <View style={styles.actionContainer}>
        <View style={{ flex: 1, marginRight: 5 }}>
            {/* 🆕 Call the unified handleOpenModal for adding */}
            <Button title="➕ Add Expense" onPress={() => handleOpenModal()} color="#007AFF" />
        </View>
        <View style={{ flex: 1 }}>
            <TouchableOpacity
                onPress={downloadPdf}
                style={styles.pdfButton}
              >
              <Ionicons name="cloud-download-outline" size={18} color="white" style={{ marginRight: 5 }} />
              <Text style={{ color: "white", fontWeight: "bold" }}>
                Download PDF
              </Text>
            </TouchableOpacity>
        </View>
      </View>
      
      {/* Date Picker Component */}
      {showPicker && (
        <DateTimePicker
          testID="dateTimePicker"
          value={
            (isPickingStart && filterStartDate) 
            ? new Date(filterStartDate) 
            : (isPickingStart === false && filterEndDate) 
              ? new Date(filterEndDate) 
              : new Date()
          }
          mode="date"
          display={Platform.OS === 'ios' ? "spinner" : "default"}
          onChange={onDateChange}
        />
      )}

      {/* Expense List */}
      <FlatList
        data={filteredExpenses} // Use the filtered data here
        keyExtractor={(item, index) => item.id || index.toString()}
        renderItem={({ item }) => (
          // 🆕 Wrap item in TouchableOpacity to enable actions
          <TouchableOpacity
            onPress={() => handleExpenseActions(item)}
            style={styles.expenseItem}
          >
            <Text style={styles.expenseTitle}>{item.work}</Text>
            <View style={styles.expenseDetailsRow}>
                <Text style={styles.expenseDate}>
                  Date: {item.date}
                </Text>
                <Text style={styles.expenseAmount}>
                    ₹{item.amount.toLocaleString('en-IN')}
                </Text>
            </View>
            {item.trolleyNo ? <Text style={styles.expenseTrolley}>Trolley: {item.trolleyNo}</Text> : null}
          </TouchableOpacity>
        )}
        ListEmptyComponent={() => (
            <Text style={styles.emptyText}>
                No expenses found for the selected filter.
            </Text>
        )}
      />

      {/* Add/Edit Expense Modal */}
      <AddExpenseModal
        visible={modalVisible}
        onClose={handleCloseModal} // 🆕 Call unified close handler
        onSave={handleSaveExpense} // 🆕 Call unified save handler
        expenseToEdit={expenseToEdit} // 🆕 Pass the item if editing
        clients={clients}
      />
    </View>
  );
}

// 🆕 Define a StyleSheet for cleaner component structure
const styles = StyleSheet.create({
    container: {
        flex: 1,
        padding: 16,
    },
    summaryBox: {
        backgroundColor: "#d4edda",
        padding: 12,
        borderRadius: 8,
        marginBottom: 12,
    },
    summaryText: {
        fontSize: 18,
        fontWeight: "bold",
        color: "#155724",
    },
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
    actionContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 10,
    },
    pdfButton: {
        backgroundColor: "#4CAF50",
        padding: 8,
        borderRadius: 5,
        alignItems: 'center',
        justifyContent: 'center',
        height: 36,
        flexDirection: 'row',
    },
    expenseItem: {
        backgroundColor: "#fff",
        padding: 10,
        borderRadius: 8,
        marginBottom: 8,
        borderLeftWidth: 4,
        borderLeftColor: '#ef4444', // Highlight expense items
    },
    expenseTitle: {
        fontWeight: "bold",
        fontSize: 16
    },
    expenseDetailsRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginTop: 4
    },
    expenseDate: {
        color: '#555'
    },
    expenseAmount: {
        fontWeight: "bold",
        color: "#dc2626"
    },
    expenseTrolley: {
        color: '#888',
        fontSize: 12
    },
    emptyText: {
        textAlign: 'center',
        color: 'gray',
        marginTop: 20
    }
});