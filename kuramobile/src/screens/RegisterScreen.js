import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import { router } from "expo-router";

import { registerUser } from "../services/api";

export default function RegisterScreen() {
  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  const [profilePhoto, setProfilePhoto] = useState(null);
  const [loading, setLoading] = useState(false);

  // =====================================================
  // PICK PROFILE PHOTO
  // =====================================================

  const pickProfilePhoto = async () => {
    try {
      const permission =
        await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (!permission.granted) {
        Alert.alert(
          "Permission Required",
          "Please allow access to your photos."
        );
        return;
      }

      const result =
        await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ["images"],
          allowsEditing: true,
          aspect: [1, 1],
          quality: 0.8,
        });

      if (result.canceled) {
        return;
      }

      const asset = result.assets?.[0];

      if (!asset?.uri) {
        Alert.alert(
          "Error",
          "Could not get the selected image."
        );
        return;
      }

      const photo = {
        uri: asset.uri,
        fileName:
          asset.fileName ||
          `profile-${Date.now()}.jpg`,
        mimeType:
          asset.mimeType ||
          "image/jpeg",
      };

      console.log(
        "Selected profile photo:",
        photo
      );

      setProfilePhoto(photo);
    } catch (error) {
      console.error(
        "Pick profile photo error:",
        error
      );

      Alert.alert(
        "Error",
        "Could not select the profile photo."
      );
    }
  };

  // =====================================================
  // REGISTER
  // =====================================================

  const handleRegister = async () => {
    if (!name.trim()) {
      Alert.alert(
        "Error",
        "Please enter your name."
      );
      return;
    }

    if (!username.trim()) {
      Alert.alert(
        "Error",
        "Please enter your username."
      );
      return;
    }

    if (!password) {
      Alert.alert(
        "Error",
        "Please enter your password."
      );
      return;
    }

    if (password.length < 6) {
      Alert.alert(
        "Error",
        "Password must be at least 6 characters."
      );
      return;
    }

    try {
      setLoading(true);

      console.log(
        "================================="
      );
      console.log(
        "REGISTERING USER"
      );
      console.log(
        "Name:",
        name.trim()
      );
      console.log(
        "Username:",
        username.trim()
      );
      console.log(
        "Has photo:",
        !!profilePhoto
      );

      if (profilePhoto) {
        console.log(
          "Photo URI:",
          profilePhoto.uri
        );
        console.log(
          "Photo name:",
          profilePhoto.fileName
        );
        console.log(
          "Photo type:",
          profilePhoto.mimeType
        );
      }

      console.log(
        "================================="
      );

      const response =
        await registerUser({
          name: name.trim(),
          username: username.trim(),
          password,
          profilePhoto,
        });

      console.log(
        "Registration response:",
        response
      );

      Alert.alert(
        "Success",
        "Account created successfully.",
        [
          {
            text: "OK",
            onPress: () => {
              router.replace("/login");
            },
          },
        ]
      );
    } catch (error) {
      console.error(
        "Registration error:",
        error
      );

      Alert.alert(
        "Registration Failed",
        error?.message ||
          "Could not register user."
      );
    } finally {
      setLoading(false);
    }
  };

  // =====================================================
  // SCREEN
  // =====================================================

  return (
    <View style={styles.container}>

      <Text style={styles.title}>
        Create Account
      </Text>

      {/* PROFILE PHOTO */}

      <Pressable
        style={styles.photoButton}
        onPress={pickProfilePhoto}
        disabled={loading}
      >
        {profilePhoto?.uri ? (
          <Image
            source={{
              uri: profilePhoto.uri,
            }}
            style={styles.photo}
          />
        ) : (
          <Text style={styles.photoText}>
            Add Photo
          </Text>
        )}
      </Pressable>

      {/* NAME */}

      <TextInput
        style={styles.input}
        placeholder="Name"
        placeholderTextColor="#9CA3AF"
        value={name}
        onChangeText={setName}
        autoCapitalize="words"
        autoCorrect={false}
        editable={!loading}
      />

      {/* USERNAME */}

      <TextInput
        style={styles.input}
        placeholder="Username"
        placeholderTextColor="#9CA3AF"
        value={username}
        onChangeText={setUsername}
        autoCapitalize="none"
        autoCorrect={false}
        editable={!loading}
      />

      {/* PASSWORD */}

      <TextInput
        style={styles.input}
        placeholder="Password"
        placeholderTextColor="#9CA3AF"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        autoCapitalize="none"
        autoCorrect={false}
        editable={!loading}
      />

      {/* REGISTER */}

      <Pressable
        style={[
          styles.registerButton,
          loading &&
            styles.registerButtonDisabled,
        ]}
        onPress={handleRegister}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator
            size="small"
            color="#FFFFFF"
          />
        ) : (
          <Text style={styles.registerText}>
            Register
          </Text>
        )}
      </Pressable>

      {/* LOGIN */}

      <Pressable
        onPress={() =>
          router.replace("/login")
        }
        disabled={loading}
      >
        <Text style={styles.loginText}>
          Already have an account? Login
        </Text>
      </Pressable>

    </View>
  );
}

// =====================================================
// STYLES
// =====================================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 25,
    justifyContent: "center",
  },

  title: {
    fontSize: 28,
    fontWeight: "800",
    color: "#111827",
    textAlign: "center",
    marginBottom: 30,
  },

  photoButton: {
    width: 110,
    height: 110,
    borderRadius: 55,
    backgroundColor: "#E5E7EB",
    alignSelf: "center",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 25,
    overflow: "hidden",
  },

  photo: {
    width: "100%",
    height: "100%",
  },

  photoText: {
    color: "#6B7280",
    fontSize: 14,
    fontWeight: "600",
  },

  input: {
    height: 50,
    borderWidth: 1,
    borderColor: "#D1D5DB",
    borderRadius: 10,
    paddingHorizontal: 15,
    marginBottom: 14,
    fontSize: 16,
    color: "#111827",
    backgroundColor: "#FFFFFF",
  },

  registerButton: {
    height: 50,
    borderRadius: 10,
    backgroundColor: "#2563EB",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 5,
  },

  registerButtonDisabled: {
    opacity: 0.6,
  },

  registerText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
  },

  loginText: {
    textAlign: "center",
    marginTop: 20,
    color: "#2563EB",
    fontSize: 14,
  },
});