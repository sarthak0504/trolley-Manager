import React, { useEffect, useState, useMemo, useCallback } from "react";
import {
    View,
    Text,
    FlatList,
    TouchableOpacity,
    ActivityIndicator,
    Platform,
    Alert,
    StyleSheet,
    TextInput,
    RefreshControl,
} from "react-native";
import { collection, getDocs } from "firebase/firestore";
import { db } from "../../../config/firebaseConfig";
import { userCollectionPath } from "../../../config/firestorePaths";
import { useClients } from "../../../store/ClientsStore";

import DateTimePicker from "@react-native-community/datetimepicker";
import { Ionicons } from "@expo/vector-icons";
import * as Print from "expo-print";
import * as Sharing from "expo-sharing";

// ------------------- DATE HELPERS -------------------

const dateStringToDate = (dateString) => {
    if (!dateString || dateString === "-") return null;
    const parts = dateString.split("-");
    return new Date(parts[2], parts[1] - 1, parts[0]);
};

const formatDateToIsoString = (date) => date.toISOString().split("T")[0];

const formatDateToDisplay = (date) => {
    if (!date) return "Date";
    const [y, m, d] = date.split("-");
    return `${d}-${m}-${y}`;
};

const formatCurrency = (amount) =>
    `₹${Number(amount || 0).toLocaleString("en-IN")}`;

// ------------------- COMPONENT -------------------

export default function ProfitLossScreen() {
    const { clients } = useClients();
    const [allTransactions, setAllTransactions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    const [filterStartDate, setFilterStartDate] = useState(null);
    const [filterEndDate, setFilterEndDate] = useState(null);
    const [showPicker, setShowPicker] = useState(false);
    const [isPickingStart, setIsPickingStart] = useState(false);
    const [trolleyFilter, setTrolleyFilter] = useState("");

    // ------------------- FETCH DATA FUNCTION -------------------

    const fetchAll = useCallback(async () => {
        try {
            setLoading(true);

            if (!clients.length) return;

            const userId = clients[0]?.userId;
            const allTxns = [];

            // --- Payments ---
            const paymentPromises = clients.map((client) => {
                const ref = collection(
                    db,
                    `users/${client.userId}/clients/${client.id}/payments`
                );
                return getDocs(ref).then((snap) => ({ client, snap }));
            });

            const results = await Promise.all(paymentPromises);

            for (const { client, snap } of results) {
                const trolley = client.activeRentals
                    ?.map((r) => r.trolleyNo)
                    .join(", ") || "-";

                const firstStart = client.activeRentals?.[0]?.startDate;

                if (client.initialAdvance > 0 && firstStart) {
                    allTxns.push({
                        id: client.id + "-adv-init",
                        type: "profit",
                        name: client.name,
                        trolley,
                        date: firstStart,
                        amount: client.initialAdvance,
                        note: "Initial Advance Deposit",
                    });
                }

                snap.forEach((d) => {
                    const data = d.data();
                    if (data.type === "advance_auto" || data.type === "rent_auto")
                        return;

                    allTxns.push({
                        id: d.id + "-p",
                        type: "profit",
                        name: client.name,
                        trolley,
                        date: data.date,
                        amount: data.amount,
                        note: data.notes || "Payment received",
                    });
                });
            }

            // --- Expenses ---
            const expensesRef = collection(db, userCollectionPath(userId, "expenses"));
            const expSnap = await getDocs(expensesRef);

            expSnap.forEach((d) => {
                const data = d.data();
                allTxns.push({
                    id: d.id + "-e",
                    type: "loss",
                    name: data.work || "Expense",
                    trolley: data.trolleyNo || "-",
                    date: data.date || "-",
                    amount: data.amount,
                    note: data.work,
                });
            });

            // Sort by date desc
            allTxns.sort((a, b) => {
                const A = dateStringToDate(a.date) || new Date(0);
                const B = dateStringToDate(b.date) || new Date(0);
                return B - A;
            });

            setAllTransactions(allTxns);
        } catch (e) {
            console.error("Fetch error:", e);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [clients]);

    // Initial Load
    useEffect(() => {
        fetchAll();
    }, [clients]);

    // ------------------- PULL TO REFRESH -------------------

    const onRefresh = () => {
        setRefreshing(true);
        fetchAll();
    };

    // ------------------- FILTERING -------------------

    const filteredTransactions = useMemo(() => {
        let list = allTransactions;

        // Date filter
        if (filterStartDate || filterEndDate) {
            const start = filterStartDate ? new Date(filterStartDate) : null;
            const end = filterEndDate ? new Date(filterEndDate) : null;
            const adjustedEnd = end
                ? new Date(end.getTime() + 86400000 - 1)
                : null;

            list = list.filter((tx) => {
                const txDate = dateStringToDate(tx.date);
                if (!txDate) return false;

                if (start && txDate < start) return false;
                if (adjustedEnd && txDate > adjustedEnd) return false;

                return true;
            });
        }

        // Trolley filter
        if (trolleyFilter.trim()) {
            const key = trolleyFilter.toLowerCase();
            list = list.filter((tx) =>
                tx.trolley.toLowerCase().includes(key)
            );
        }

        return list;
    }, [allTransactions, filterStartDate, filterEndDate, trolleyFilter]);

    const totalProfit = useMemo(() => {
        return filteredTransactions.reduce(
            (sum, tx) => sum + (tx.type === "profit" ? tx.amount : -tx.amount),
            0
        );
    }, [filteredTransactions]);

    // ------------------- DATE PICKER -------------------

    const onDateChange = (event, selectedDate) => {
        const date = selectedDate || new Date();
        setShowPicker(false);

        if (isPickingStart) {
            setFilterStartDate(formatDateToIsoString(date));
        } else {
            setFilterEndDate(formatDateToIsoString(date));
        }
    };

    // ------------------- PDF DOWNLOAD -------------------

    const downloadPdf = async () => {
        if (!filteredTransactions.length) {
            Alert.alert("No Data", "No transactions for selected filters.");
            return;
        }

        try {
            const html = generatePDFHtml(
                filteredTransactions,
                totalProfit,
                filterStartDate,
                filterEndDate,
                trolleyFilter
            );

            const { uri } = await Print.printToFileAsync({ html });

            if (!(await Sharing.isAvailableAsync())) {
                Alert.alert("Error", "Sharing not supported.");
                return;
            }

            await Sharing.shareAsync(uri);
        } catch (err) {
            console.error(err);
            Alert.alert("Error", "PDF generation failed.");
        }
    };

    // ------------------- RENDER -------------------

    if (loading) {
        return (
            <View style={styles.centerContainer}>
                <ActivityIndicator size="large" color="#4f46e5" />
            </View>
        );
    }

    const renderItem = ({ item, index }) => (
        <View
            style={{
                backgroundColor: item.type === "profit" ? "#e6ffed" : "#fdecea",
                borderLeftWidth: 5,
                borderLeftColor: item.type === "profit" ? "green" : "red",
                padding: 10,
                borderRadius: 8,
                marginBottom: 8,
            }}
        >
            <Text style={{ fontWeight: "bold" }}>
                {index + 1}. {item.type === "profit" ? "💰 Income" : "💸 Expense"}
            </Text>
            <Text>📅 {item.date}</Text>
            <Text>👤 {item.name}</Text>
            <Text>🛒 Trolley: {item.trolley}</Text>
            <Text>📝 {item.note}</Text>

            <Text
                style={{
                    marginTop: 5,
                    fontWeight: "bold",
                    color: item.type === "profit" ? "green" : "red",
                }}
            >
                {item.type === "profit" ? "+ " : "- "}
                {formatCurrency(item.amount)}
            </Text>
        </View>
    );

    return (
        <View style={{ flex: 1, backgroundColor: "#fff", padding: 16 }}>
            {/* HEADER WITH RELOAD BUTTON */}
            <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                <Text style={{ fontSize: 22, fontWeight: "bold" }}>
                    📊 Profit & Loss Report
                </Text>

                <TouchableOpacity onPress={fetchAll}>
                    <Ionicons name="refresh" size={28} color="#2563eb" />
                </TouchableOpacity>
            </View>

            {/* SUMMARY */}
            <View style={styles.summaryBox}>
                <Text
                    style={{
                        fontSize: 18,
                        fontWeight: "bold",
                        textAlign: "center",
                        color: totalProfit >= 0 ? "green" : "red",
                    }}
                >
                    Net P/L: {totalProfit >= 0 ? "+ " : "- "}
                    {formatCurrency(Math.abs(totalProfit))}
                </Text>
            </View>

            {/* Trolley Filter */}
            <TextInput
                placeholder="Filter by Trolley No. (e.g., TR101)"
                value={trolleyFilter}
                onChangeText={setTrolleyFilter}
                style={styles.trolleyInput}
            />

            {/* Date Filter Buttons */}
            <View style={styles.filterContainer}>
                <TouchableOpacity
                    onPress={() => {
                        setIsPickingStart(true);
                        setShowPicker(true);
                    }}
                    style={styles.dateButton}
                >
                    <Text>Start: {formatDateToDisplay(filterStartDate)}</Text>
                </TouchableOpacity>

                <TouchableOpacity
                    onPress={() => {
                        setIsPickingStart(false);
                        setShowPicker(true);
                    }}
                    style={styles.dateButton}
                >
                    <Text>End: {formatDateToDisplay(filterEndDate)}</Text>
                </TouchableOpacity>
            </View>

            {/* PDF Button */}
            <TouchableOpacity onPress={downloadPdf} style={styles.pdfButton}>
                <Ionicons name="cloud-download-outline" size={20} color="#fff" />
                <Text style={styles.pdfText}>Download PDF</Text>
            </TouchableOpacity>

            {showPicker && (
                <DateTimePicker
                    value={new Date()}
                    mode="date"
                    onChange={onDateChange}
                />
            )}

            {/* LIST */}
            <FlatList
                data={filteredTransactions}
                renderItem={renderItem}
                keyExtractor={(_, i) => i.toString()}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
                }
                ListEmptyComponent={
                    <Text style={{ textAlign: "center", marginTop: 20, color: "gray" }}>
                        No transactions found.
                    </Text>
                }
            />
        </View>
    );
}

// ------------------- STYLES -------------------

const styles = StyleSheet.create({
    summaryBox: {
        padding: 12,
        marginTop: 10,
        marginBottom: 10,
        backgroundColor: "#e0f7e9",
        borderRadius: 8,
    },
    trolleyInput: {
        borderWidth: 1,
        borderColor: "#ccc",
        padding: 10,
        borderRadius: 5,
        marginBottom: 10,
    },
    filterContainer: {
        flexDirection: "row",
        justifyContent: "space-between",
        marginBottom: 10,
    },
    dateButton: {
        flex: 1,
        padding: 10,
        marginRight: 5,
        borderRadius: 5,
        borderWidth: 1,
        borderColor: "#3b82f6",
        backgroundColor: "#e0f2fe",
        alignItems: "center",
    },
    pdfButton: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "#4CAF50",
        padding: 12,
        borderRadius: 8,
        marginBottom: 16,
    },
    pdfText: {
        color: "#fff",
        fontWeight: "bold",
        marginLeft: 8,
    },
    centerContainer: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
    },
});
