import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  StyleSheet,
  View,
  Text,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";

import LoginScreen from "./screens/LoginScreen";
import RegisterScreen from "./screens/RegisterScreen";
import HomeScreen from "./screens/HomeScreen";

// =====================================================
// API CONFIG
// =====================================================

// IMPORTANT:
// For iOS Simulator, localhost refers to your Mac.
//
// If your Node server is running on:
// http://localhost:5001
//
// then use this:
export const API_URL = "http://localhost:5001";

// If you later test on a REAL iPhone,
// replace localhost with your Mac's local IP.
// Example:
// export const API_URL = "http://192.168.1.10:5001";

// =====================================================
// APP
// =====================================================

export default function App() {
  const [currentUser, setCurrentUser] = useState(null);
  const [showRegister, setShowRegister] = useState(false);
  const [loading, setLoading] = useState(true);

  // ===================================================
  // LOAD SAVED USER
  // ===================================================

  useEffect(() => {
    loadSavedUser();
  }, []);

  const loadSavedUser = async () => {
    try {
      const savedUser =
        await AsyncStorage.getItem("currentUser");

      if (savedUser) {
        const user = JSON.parse(savedUser);

        if (user && user._id) {
          setCurrentUser(user);
        }
      }
    } catch (error) {
      console.error(
        "Could not load saved user:",
        error
      );
    } finally {
      setLoading(false);
    }
  };

  // ===================================================
  // LOGIN
  // ===================================================

  const handleLogin = async (user) => {
    try {
      if (!user || !user._id) {
        console.error(
          "Invalid user returned from login"
        );

        return;
      }

      await AsyncStorage.setItem(
        "currentUser",
        JSON.stringify(user)
      );

      setCurrentUser(user);
      setShowRegister(false);
    } catch (error) {
      console.error(
        "Could not save user:",
        error
      );
    }
  };

  // ===================================================
  // LOGOUT
  // ===================================================

  const handleLogout = async () => {
    try {
      await AsyncStorage.removeItem(
        "currentUser"
      );

      setCurrentUser(null);
      setShowRegister(false);
    } catch (error) {
      console.error(
        "Logout error:",
        error
      );
    }
  };

  // ===================================================
  // LOADING SCREEN
  // ===================================================

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator
          size="large"
          color="#007AFF"
        />

        <Text style={styles.loadingText}>
          Loading...
        </Text>
      </View>
    );
  }

  // ===================================================
  // AUTH
  // ===================================================

  if (!currentUser) {
    if (showRegister) {
      return (
        <RegisterScreen
          onLogin={handleLogin}
          goToLogin={() =>
            setShowRegister(false)
          }
        />
      );
    }

    return (
      <LoginScreen
        onLogin={handleLogin}
        goToRegister={() =>
          setShowRegister(true)
        }
      />
    );
  }

  // ===================================================
  // HOME
  // ===================================================

  return (
    <HomeScreen
      currentUser={currentUser}
      onLogout={handleLogout}
    />
  );
}

// =====================================================
// STYLES
// =====================================================

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#ffffff",
  },

  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: "#666666",
  },
});