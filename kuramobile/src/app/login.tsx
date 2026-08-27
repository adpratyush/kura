import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { router } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";

const API_URL = "https://kura-jnzv.onrender.com";

export default function LoginScreen() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!username.trim() || !password) {
      Alert.alert(
        "Missing information",
        "Please enter your username and password."
      );
      return;
    }

    try {
      setLoading(true);

      const response = await axios.post(
        `${API_URL}/api/users/login`,
        {
          username: username.trim(),
          password,
        }
      );

      const user = response.data?.user || response.data;

      if (!user?._id) {
        throw new Error("Invalid login response.");
      }

      await AsyncStorage.setItem(
        "currentUser",
        JSON.stringify(user)
      );

      router.replace("/home");
    } catch (error: any) {
      console.error(
        "Login error:",
        error?.response?.data || error
      );

      const message =
        error?.response?.data?.message ||
        "Could not connect to the server.";

      Alert.alert("Login failed", message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={
          Platform.OS === "ios"
            ? "padding"
            : undefined
        }
      >
        <View style={styles.card}>
          <View style={styles.logo}>
            <Text style={styles.logoText}>K</Text>
          </View>

          <Text style={styles.title}>
            Welcome to Kura
          </Text>

          <Text style={styles.subtitle}>
            Connect and chat with your friends.
          </Text>

          <View style={styles.form}>
            <Text style={styles.label}>
              Username
            </Text>

            <TextInput
              style={styles.input}
              placeholder="Enter your username"
              placeholderTextColor="#9CA3AF"
              value={username}
              onChangeText={setUsername}
              autoCapitalize="none"
              autoCorrect={false}
            />

            <Text style={styles.label}>
              Password
            </Text>

            <TextInput
              style={styles.input}
              placeholder="Enter your password"
              placeholderTextColor="#9CA3AF"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              autoCapitalize="none"
            />

            <Pressable
              style={({ pressed }) => [
                styles.loginButton,
                pressed && styles.buttonPressed,
              ]}
              onPress={handleLogin}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.loginButtonText}>
                  Login
                </Text>
              )}
            </Pressable>

            <View style={styles.registerRow}>
              <Text style={styles.registerText}>
                Don't have an account?
              </Text>

              <Pressable
                onPress={() =>
                  router.push("/register")
                }
              >
                <Text style={styles.registerLink}>
                  {" "}
                  Register
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#F5F7FB",
  },

  container: {
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: 24,
  },

  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    padding: 28,
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 20,
    shadowOffset: {
      width: 0,
      height: 10,
    },
    elevation: 5,
  },

  logo: {
    width: 72,
    height: 72,
    borderRadius: 22,
    backgroundColor: "#4F46E5",
    alignItems: "center",
    justifyContent: "center",
    alignSelf: "center",
    marginBottom: 20,
  },

  logoText: {
    color: "#FFFFFF",
    fontSize: 38,
    fontWeight: "800",
  },

  title: {
    textAlign: "center",
    fontSize: 28,
    fontWeight: "800",
    color: "#111827",
  },

  subtitle: {
    textAlign: "center",
    color: "#6B7280",
    fontSize: 14,
    marginTop: 8,
    marginBottom: 30,
  },

  form: {
    width: "100%",
  },

  label: {
    color: "#374151",
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 8,
  },

  input: {
    height: 50,
    borderWidth: 1,
    borderColor: "#D1D5DB",
    borderRadius: 12,
    paddingHorizontal: 15,
    fontSize: 15,
    color: "#111827",
    backgroundColor: "#FFFFFF",
    marginBottom: 18,
  },

  loginButton: {
    height: 50,
    borderRadius: 12,
    backgroundColor: "#4F46E5",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 4,
  },

  buttonPressed: {
    opacity: 0.8,
  },

  loginButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
  },

  registerRow: {
    flexDirection: "row",
    justifyContent: "center",
    marginTop: 22,
  },

  registerText: {
    color: "#6B7280",
    fontSize: 14,
  },

  registerLink: {
    color: "#4F46E5",
    fontSize: 14,
    fontWeight: "700",
  },
});