import React, { useEffect, useState, useMemo } from "react";
import { 
  View, 
  Text, 
  FlatList, 
  TouchableOpacity, 
  Alert, 
  ActivityIndicator,
  StyleSheet
} from "react-native";
import { collection, onSnapshot, addDoc, doc, updateDoc, deleteDoc } from "firebase/firestore";
import { db } from "../../config/firebaseConfig";
import AddExpenseModal from "../../components/AddExpenseModal";
import { Ionicons } from "@expo/vector-icons";

// Helper to format DD-MM-YYYY string to a Date object for comparison
const dateStringToDate = (dateString) => {
  if (!dateString) return null;
  const parts = dateString.split("-");
  return new Date(parts[2], parts[1] - 1, parts[0]);
};

export default function ExpensesScreen({ userId }) {
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [total, setTotal] = useState(0);
  const [trolleyTotals, setTrolleyTotals] = useState({});

  // 🆕 State for Editing
  const [expenseToEdit, setExpenseToEdit] = useState(null);

  // --- Firebase Interactions ---

  const getExpensesCollectionRef = () => collection(db, `users/${userId}/expenses`);
  
  const addExpenseToDb = async (details) => {
    try {
      await addDoc(getExpensesCollectionRef(), details);
    } catch (error) {
      Alert.alert("Error", "Failed to add expense.");
      console.error("Error adding document: ", error);
    }
  };

  const updateExpenseInDb = async (id, details) => {
    try {
      const expenseRef = doc(db, `users/${userId}/expenses`, id);
      await updateDoc(expenseRef, details);
    } catch (error) {
      Alert.alert("Error", "Failed to update expense.");
      console.error("Error updating document: ", error);
    }
  };

  const deleteExpenseFromDb = async (id) => {
    try {
      const expenseRef = doc(db, `users/${userId}/expenses`, id);
      await deleteDoc(expenseRef);
      Alert.alert("Success", "Expense deleted.");
    } catch (error) {
      Alert.alert("Error", "Failed to delete expense.");
      console.error("Error deleting document: ", error);
    }
  };


  // --- Data Loading and Listener ---
  useEffect(() => {
    if (!userId) return;
    setLoading(true);

    const unsubscribe = onSnapshot(
      getExpensesCollectionRef(),
      (snap) => {
        const data = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        setExpenses(data);

        // ✅ Grand total
        const totalSum = data.reduce((sum, e) => sum + (e.amount || 0), 0);
        setTotal(totalSum);

        // ✅ Trolley-wise total
        const totals = {};
        data.forEach((e) => {
          if (e.trolleyNo) {
            totals[e.trolleyNo] = (totals[e.trolleyNo] || 0) + (e.amount || 0);
          }
        });
        setTrolleyTotals(totals);
        setLoading(false);
      },
      (error) => {
        console.error("Firestore listener error:", error);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [userId]);

  // --- Sorting & Handlers ---

  // ✅ Sort expenses by most recent
  const sortedExpenses = useMemo(() => {
    return [...expenses].sort((a, b) => {
        const dateA = dateStringToDate(a.date);
        const dateB = dateStringToDate(b.date);
        // Ensure valid date comparison (descending order)
        return (dateB?.getTime() || 0) - (dateA?.getTime() || 0);
    });
  }, [expenses]);

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
  
  // 🆕 Unified save handler from modal (handles both Add and Edit)
  const handleSaveExpense = (details) => {
    if (details.id) {
      // Update existing expense
      updateExpenseInDb(details.id, details); 
    } else {
      // Add new expense
      addExpenseToDb(details);
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
              { text: "Yes", style: "destructive", onPress: () => deleteExpenseFromDb(item.id) },
            ]
          ) 
        },
        { text: "Edit", onPress: () => handleOpenModal(item) },
      ]
    );
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#007bff" />
        <Text style={{marginTop: 10}}>Loading Expenses...</Text>
      </View>
    );
  }

  // --- Render Functions ---
  
  const renderExpenseItem = ({ item }) => (
    // 🆕 Use TouchableOpacity to enable the action menu on press
    <TouchableOpacity
      onPress={() => handleExpenseActions(item)}
      style={styles.expenseItem}
    >
      <View style={{ flex: 1 }}>
        <Text style={styles.expenseWork}>{item.work}</Text>
        {item.trolleyNo && <Text style={styles.expenseDetail}>🛒 Trolley: {item.trolleyNo}</Text>}
        <Text style={styles.expenseDetail}>📅 Date: {item.date}</Text>
      </View>
      <View style={styles.expenseAmountContainer}>
        <Text style={styles.expenseAmount}>
          ₹{item.amount.toLocaleString('en-IN')}
        </Text>
        <Ionicons name="ellipsis-vertical" size={16} color="#6c757d" />
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      
      {/* Header */}
      <Text style={styles.header}>
        Trolley Expenses
      </Text>

      {/* Total Summary */}
      <View style={styles.totalSummaryBox}>
        <Text style={styles.totalSummaryText}>
          Grand Total: ₹{total.toLocaleString('en-IN')}
        </Text>
      </View>

      {/* Trolley-wise Summary */}
      {Object.keys(trolleyTotals).length > 0 && (
        <View style={styles.trolleySummaryBox}>
          <Text style={styles.trolleySummaryTitle}>
            Trolley-wise Totals:
          </Text>
          {Object.entries(trolleyTotals).map(([trolley, amount]) => (
            <Text key={trolley} style={styles.trolleySummaryDetail}>
              🛒 {trolley}: ₹{amount.toLocaleString('en-IN')}
            </Text>
          ))}
        </View>
      )}

      {/* Add Expense Button */}
      <TouchableOpacity
        style={styles.addButton}
        onPress={() => handleOpenModal()} // 🆕 Call handleOpenModal to reset form and open
      >
        <Text style={styles.addButtonText}>
          ➕ Add Expense
        </Text>
      </TouchableOpacity>

      {/* Expense List */}
      <FlatList
        data={sortedExpenses}
        keyExtractor={(item) => item.id}
        renderItem={renderExpenseItem}
        ListEmptyComponent={() => (
            <Text style={styles.emptyText}>No expenses recorded yet.</Text>
        )}
      />

      {/* Modal */}
      <AddExpenseModal
        visible={modalVisible}
        onClose={handleCloseModal}
        onSave={handleSaveExpense} // 🆕 Pass unified save handler
        expenseToEdit={expenseToEdit} // 🆕 Pass data for editing
        userId={userId}
      />
    </View>
  );
}

const styles = StyleSheet.create({
    container: { 
        flex: 1, 
        padding: 16, 
        backgroundColor: '#f4f4f4' 
    },
    centerContainer: {
        flex: 1, 
        justifyContent: "center", 
        alignItems: "center"
    },
    header: { 
        fontSize: 24, 
        fontWeight: "bold", 
        color: "green", 
        marginBottom: 10 
    },
    totalSummaryBox: {
        backgroundColor: "#d4edda",
        padding: 10,
        borderRadius: 8,
        marginBottom: 10,
    },
    totalSummaryText: { 
        color: "#155724", 
        fontSize: 16 
    },
    trolleySummaryBox: {
        backgroundColor: "#fff3cd",
        padding: 10,
        borderRadius: 8,
        marginBottom: 10,
    },
    trolleySummaryTitle: { 
        fontWeight: "bold", 
        marginBottom: 6 
    },
    trolleySummaryDetail: { 
        fontSize: 15 
    },
    addButton: {
        backgroundColor: "#28a745", // Green color
        padding: 12,
        borderRadius: 6,
        marginBottom: 15,
    },
    addButtonText: { 
        color: "white", 
        textAlign: "center", 
        fontSize: 16 
    },
    expenseItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 12,
        backgroundColor: "#fff",
        marginVertical: 4,
        borderRadius: 8,
        borderLeftWidth: 5,
        borderLeftColor: '#dc3545', // Use a red shade for general expenses
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 1,
        elevation: 2,
    },
    expenseWork: { 
        fontWeight: "bold",
        fontSize: 15 
    },
    expenseDetail: { 
        fontSize: 13, 
        color: '#6c757d' 
    },
    expenseAmountContainer: {
        alignItems: 'flex-end',
        flexDirection: 'row',
        gap: 5
    },
    expenseAmount: { 
        fontWeight: "bold", 
        fontSize: 16,
        color: '#dc3545'
    },
    emptyText: {
        textAlign: 'center',
        color: '#6c757d',
        marginTop: 20
    }
});