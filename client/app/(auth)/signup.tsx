import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Image,
  ScrollView,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useAuth } from "../../src/context/AuthContext";

const PASSWORD_RULES = [
  { label: "At least 8 characters", test: (p: string) => p.length >= 8 },
  { label: "Uppercase letter (A-Z)", test: (p: string) => /[A-Z]/.test(p) },
  { label: "Lowercase letter (a-z)", test: (p: string) => /[a-z]/.test(p) },
  { label: "Number (0-9)", test: (p: string) => /[0-9]/.test(p) },
  { label: "Special character (!@#$%^&*)", test: (p: string) => /[^A-Za-z0-9]/.test(p) },
];

const STRENGTH_LEVELS = [
  { label: "Very weak", color: "#ef4444" },
  { label: "Weak", color: "#f97316" },
  { label: "Fair", color: "#eab308" },
  { label: "Good", color: "#84cc16" },
  { label: "Strong", color: "#22c55e" },
];

function getStrength(password: string) {
  const passed = PASSWORD_RULES.filter((r) => r.test(password)).length;
  return { passed, ...STRENGTH_LEVELS[Math.max(0, passed - 1)] };
}

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export default function SignupScreen() {
  const router = useRouter();
  const { signUp } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitted, setSubmitted] = useState(false);

  const strength = getStrength(password);

  function validate(
    emailVal = email,
    passwordVal = password,
    confirmVal = confirmPassword
  ): Record<string, string> {
    const e: Record<string, string> = {};
    if (!emailVal.trim()) {
      e.email = "Email is required.";
    } else if (!isValidEmail(emailVal.trim())) {
      e.email = "Enter a valid email address.";
    }
    if (!passwordVal) {
      e.password = "Password is required.";
    } else if (!PASSWORD_RULES.every((r) => r.test(passwordVal))) {
      e.password = "Password does not meet all requirements below.";
    }
    if (!confirmVal) {
      e.confirmPassword = "Please confirm your password.";
    } else if (passwordVal !== confirmVal) {
      e.confirmPassword = "Passwords do not match.";
    }
    return e;
  }

  function handleEmailChange(val: string) {
    setEmail(val);
    if (!submitted) return;
    const e = { ...errors };
    if (!val.trim()) e.email = "Email is required.";
    else if (!isValidEmail(val.trim())) e.email = "Enter a valid email address.";
    else delete e.email;
    setErrors(e);
  }

  function handlePasswordChange(val: string) {
    setPassword(val);
    if (!submitted) return;
    const e = { ...errors };
    if (!val) {
      e.password = "Password is required.";
    } else if (!PASSWORD_RULES.every((r) => r.test(val))) {
      e.password = "Password does not meet all requirements below.";
    } else {
      delete e.password;
    }
    if (confirmPassword) {
      if (val !== confirmPassword) e.confirmPassword = "Passwords do not match.";
      else delete e.confirmPassword;
    }
    setErrors(e);
  }

  function handleConfirmChange(val: string) {
    setConfirmPassword(val);
    if (!submitted) return;
    const e = { ...errors };
    if (!val) e.confirmPassword = "Please confirm your password.";
    else if (val !== password) e.confirmPassword = "Passwords do not match.";
    else delete e.confirmPassword;
    setErrors(e);
  }

  async function handleSignup() {
    setSubmitted(true);
    const e = validate();
    setErrors(e);
    if (Object.keys(e).length > 0) return;

    setLoading(true);
    try {
      await signUp(email.trim(), password);
      router.replace("/(tabs)");
    } catch (err: any) {
      if (err.code === "auth/email-already-in-use") {
        setErrors({ email: "An account with this email already exists. Try signing in instead." });
      } else if (err.code === "auth/invalid-email") {
        setErrors({ email: "Invalid email address." });
      } else if (err.code === "auth/network-request-failed") {
        setErrors({ general: "Network error. Check your internet connection." });
      } else {
        setErrors({ general: "Sign up failed. Please try again." });
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.card}>
          <Image
            source={require("../../assets/images/logo.png")}
            style={styles.logo}
            resizeMode="contain"
          />
          <Text style={styles.title}>Create Account</Text>
          <Text style={styles.subtitle}>Set up your trolley management account</Text>

          {/* Email */}
          <Text style={styles.label}>Email</Text>
          <TextInput
            style={[styles.input, errors.email ? styles.inputError : null]}
            placeholder="you@example.com"
            placeholderTextColor="#9ca3af"
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            value={email}
            onChangeText={handleEmailChange}
          />
          {errors.email ? (
            <Text style={styles.errorText}>{errors.email}</Text>
          ) : null}

          {/* Password */}
          <Text style={styles.label}>Password</Text>
          <View style={[styles.inputRow, errors.password ? styles.inputError : null]}>
            <TextInput
              style={styles.inputFlex}
              placeholder="Create a strong password"
              placeholderTextColor="#9ca3af"
              secureTextEntry={!showPassword}
              value={password}
              onChangeText={handlePasswordChange}
            />
            <TouchableOpacity
              onPress={() => setShowPassword((v) => !v)}
              style={styles.eyeBtn}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Ionicons
                name={showPassword ? "eye-off-outline" : "eye-outline"}
                size={20}
                color="#6b7280"
              />
            </TouchableOpacity>
          </View>
          {errors.password ? (
            <Text style={styles.errorText}>{errors.password}</Text>
          ) : null}

          {/* Password strength bar + rules */}
          {password.length > 0 && (
            <View style={styles.strengthSection}>
              <View style={styles.strengthBars}>
                {[0, 1, 2, 3, 4].map((i) => (
                  <View
                    key={i}
                    style={[
                      styles.strengthBar,
                      {
                        backgroundColor:
                          i < strength.passed ? strength.color : "#e5e7eb",
                      },
                    ]}
                  />
                ))}
                <Text style={[styles.strengthLabel, { color: strength.color }]}>
                  {strength.label}
                </Text>
              </View>
              <View style={styles.rulesGrid}>
                {PASSWORD_RULES.map((rule) => {
                  const ok = rule.test(password);
                  return (
                    <View key={rule.label} style={styles.ruleRow}>
                      <Ionicons
                        name={ok ? "checkmark-circle" : "ellipse-outline"}
                        size={14}
                        color={ok ? "#22c55e" : "#9ca3af"}
                      />
                      <Text
                        style={[styles.ruleText, ok ? styles.ruleOk : styles.rulePending]}
                      >
                        {rule.label}
                      </Text>
                    </View>
                  );
                })}
              </View>
            </View>
          )}

          {/* Confirm Password */}
          <Text style={styles.label}>Confirm Password</Text>
          <View
            style={[styles.inputRow, errors.confirmPassword ? styles.inputError : null]}
          >
            <TextInput
              style={styles.inputFlex}
              placeholder="Re-enter your password"
              placeholderTextColor="#9ca3af"
              secureTextEntry={!showConfirm}
              value={confirmPassword}
              onChangeText={handleConfirmChange}
              onSubmitEditing={handleSignup}
              returnKeyType="done"
            />
            <TouchableOpacity
              onPress={() => setShowConfirm((v) => !v)}
              style={styles.eyeBtn}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Ionicons
                name={showConfirm ? "eye-off-outline" : "eye-outline"}
                size={20}
                color="#6b7280"
              />
            </TouchableOpacity>
          </View>
          {errors.confirmPassword ? (
            <Text style={styles.errorText}>{errors.confirmPassword}</Text>
          ) : null}

          {/* General server error */}
          {errors.general ? (
            <View style={styles.serverErrorBox}>
              <Ionicons name="alert-circle-outline" size={16} color="#dc2626" />
              <Text style={styles.serverErrorText}>{errors.general}</Text>
            </View>
          ) : null}

          <TouchableOpacity
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={handleSignup}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.buttonText}>Create Account</Text>
            )}
          </TouchableOpacity>

          <View style={styles.footer}>
            <Text style={styles.footerText}>Already have an account? </Text>
            <TouchableOpacity onPress={() => router.back()}>
              <Text style={styles.link}>Sign In</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f3f4f6",
  },
  scroll: {
    flexGrow: 1,
    justifyContent: "center",
    paddingHorizontal: 24,
    paddingVertical: 40,
  },
  card: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 28,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 4,
  },
  logo: {
    width: 72,
    height: 72,
    alignSelf: "center",
    marginBottom: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
    color: "#111827",
    textAlign: "center",
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: "#6b7280",
    textAlign: "center",
    marginBottom: 24,
  },
  label: {
    fontSize: 13,
    fontWeight: "600",
    color: "#374151",
    marginBottom: 6,
    marginTop: 4,
  },
  input: {
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: "#111827",
    backgroundColor: "#f9fafb",
    marginBottom: 4,
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderRadius: 10,
    backgroundColor: "#f9fafb",
    marginBottom: 4,
    paddingRight: 4,
  },
  inputFlex: {
    flex: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: "#111827",
  },
  eyeBtn: {
    padding: 8,
  },
  inputError: {
    borderColor: "#ef4444",
  },
  errorText: {
    fontSize: 12,
    color: "#ef4444",
    marginBottom: 10,
    marginTop: 2,
  },
  strengthSection: {
    marginBottom: 12,
  },
  strengthBars: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginBottom: 8,
  },
  strengthBar: {
    flex: 1,
    height: 4,
    borderRadius: 2,
  },
  strengthLabel: {
    fontSize: 11,
    fontWeight: "600",
    marginLeft: 8,
    minWidth: 55,
  },
  rulesGrid: {
    gap: 4,
  },
  ruleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  ruleText: {
    fontSize: 12,
  },
  ruleOk: {
    color: "#16a34a",
  },
  rulePending: {
    color: "#6b7280",
  },
  serverErrorBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#fef2f2",
    borderRadius: 8,
    padding: 10,
    marginBottom: 12,
    marginTop: 4,
  },
  serverErrorText: {
    fontSize: 13,
    color: "#dc2626",
    flex: 1,
  },
  button: {
    backgroundColor: "#2563eb",
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: 8,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  footer: {
    flexDirection: "row",
    justifyContent: "center",
    marginTop: 20,
  },
  footerText: {
    color: "#6b7280",
    fontSize: 14,
  },
  link: {
    color: "#2563eb",
    fontSize: 14,
    fontWeight: "600",
  },
});
