import React, {
  useEffect,
  useState,
} from "react";

import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  SafeAreaView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import AsyncStorage from "@react-native-async-storage/async-storage";

import {
  getUsers,
  getGroups,
} from "../services/api";

import {
  connectSocket,
  disconnectSocket,
} from "../services/socket";

const HomeScreen = ({
  navigation,
}) => {
  const [currentUser, setCurrentUser] =
    useState(null);

  const [users, setUsers] = useState([]);
  const [groups, setGroups] = useState([]);

  const [loading, setLoading] =
    useState(true);

  // =====================================================
  // LOAD CURRENT USER
  // =====================================================

  useEffect(() => {
    loadUser();
  }, []);

  const loadUser = async () => {
    try {
      const savedUser =
        await AsyncStorage.getItem(
          "currentUser"
        );

      if (!savedUser) {
        navigation.replace("Login");
        return;
      }

      const user =
        JSON.parse(savedUser);

      setCurrentUser(user);

      connectSocket(user._id);

      await loadData(user._id);
    } catch (error) {
      console.error(
        "Load user error:",
        error
      );

      Alert.alert(
        "Error",
        "Could not load your account."
      );
    }
  };

  // =====================================================
  // LOAD USERS + GROUPS
  // =====================================================

  const loadData = async (userId) => {
    try {
      setLoading(true);

      const [
        usersData,
        groupsData,
      ] = await Promise.all([
        getUsers(),
        getGroups(userId),
      ]);

      setUsers(
        Array.isArray(usersData)
          ? usersData
          : []
      );

      setGroups(
        Array.isArray(groupsData)
          ? groupsData
          : []
      );
    } catch (error) {
      console.error(
        "Load data error:",
        error
      );

      Alert.alert(
        "Connection Error",
        "Could not connect to the server."
      );
    } finally {
      setLoading(false);
    }
  };

  // =====================================================
  // LOGOUT
  // =====================================================

  const logout = async () => {
    try {
      disconnectSocket();

      await AsyncStorage.removeItem(
        "currentUser"
      );

      navigation.replace("Login");
    } catch (error) {
      console.error(
        "Logout error:",
        error
      );
    }
  };

  // =====================================================
  // AVATAR
  // =====================================================

  const getAvatar = (user) => {
    if (
      user?.profilePhoto
    ) {
      if (
        user.profilePhoto.startsWith(
          "http"
        )
      ) {
        return user.profilePhoto;
      }

      return `https://kura-jnzv.onrender.com${user.profilePhoto}`;
    }

    return null;
  };

  // =====================================================
  // USER ITEM
  // =====================================================

  const renderUser = ({
    item,
  }) => {
    if (
      String(item._id) ===
      String(currentUser?._id)
    ) {
      return null;
    }

    const photo =
      getAvatar(item);

    return (
      <TouchableOpacity
        style={styles.chatItem}
        onPress={() =>
          navigation.navigate(
            "PrivateChat",
            {
              user: item,
              currentUser,
            }
          )
        }
      >
        {photo ? (
          <Image
            source={{
              uri: photo,
            }}
            style={styles.avatar}
          />
        ) : (
          <View
            style={styles.avatarPlaceholder}
          >
            <Text style={styles.avatarText}>
              {(
                item.name ||
                item.username ||
                "U"
              )
                .charAt(0)
                .toUpperCase()}
            </Text>
          </View>
        )}

        <View
          style={
            styles.chatItemContent
          }
        >
          <Text
            style={styles.chatName}
          >
            {item.name ||
              item.username ||
              "User"}
          </Text>

          <Text
            style={styles.username}
          >
            @{item.username || "user"}
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  // =====================================================
  // GROUP ITEM
  // =====================================================

  const renderGroup = ({
    item,
  }) => {
    return (
      <TouchableOpacity
        style={styles.chatItem}
        onPress={() =>
          navigation.navigate(
            "GroupChat",
            {
              group: item,
              currentUser,
            }
          )
        }
      >
        <View
          style={styles.groupAvatar}
        >
          <Text style={styles.groupIcon}>
            👥
          </Text>
        </View>

        <View
          style={
            styles.chatItemContent
          }
        >
          <Text
            style={styles.chatName}
          >
            {item.name || "Group"}
          </Text>

          <Text
            style={styles.username}
          >
            {Array.isArray(
              item.members
            )
              ? item.members.length
              : 0}{" "}
            members
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  // =====================================================
  // LOADING
  // =====================================================

  if (loading) {
    return (
      <SafeAreaView
        style={styles.loading}
      >
        <ActivityIndicator
          size="large"
        />

        <Text
          style={
            styles.loadingText
          }
        >
          Loading...
        </Text>
      </SafeAreaView>
    );
  }

  // =====================================================
  // HOME
  // =====================================================

  return (
    <SafeAreaView
      style={styles.container}
    >
      {/* HEADER */}

      <View
        style={styles.header}
      >
        <View>
          <Text
            style={styles.title}
          >
            Messages
          </Text>

          <Text
            style={styles.subtitle}
          >
            Welcome{" "}
            {currentUser?.name ||
              currentUser?.username ||
              "User"}
          </Text>
        </View>

        <TouchableOpacity
          onPress={logout}
          style={
            styles.logoutButton
          }
        >
          <Text
            style={
              styles.logoutText
            }
          >
            Logout
          </Text>
        </TouchableOpacity>
      </View>

      {/* PEOPLE */}

      <View
        style={styles.section}
      >
        <Text
          style={styles.sectionTitle}
        >
          People
        </Text>

        {users.filter(
          (user) =>
            String(user._id) !==
            String(
              currentUser?._id
            )
        ).length === 0 ? (
          <Text
            style={
              styles.emptyText
            }
          >
            No other users yet.
          </Text>
        ) : (
          <FlatList
            data={users}
            keyExtractor={(item) =>
              String(item._id)
            }
            renderItem={
              renderUser
            }
          />
        )}
      </View>

      {/* GROUPS */}

      <View
        style={styles.section}
      >
        <View
          style={
            styles.sectionHeader
          }
        >
          <Text
            style={styles.sectionTitle}
          >
            Groups
          </Text>

          <TouchableOpacity
            style={
              styles.createButton
            }
            onPress={() =>
              navigation.navigate(
                "CreateGroup",
                {
                  currentUser,
                  users,
                }
              )
            }
          >
            <Text
              style={
                styles.createButtonText
              }
            >
              + Create
            </Text>
          </TouchableOpacity>
        </View>

        {groups.length === 0 ? (
          <Text
            style={
              styles.emptyText
            }
          >
            No groups yet.
          </Text>
        ) : (
          <FlatList
            data={groups}
            keyExtractor={(item) =>
              String(item._id)
            }
            renderItem={
              renderGroup
            }
          />
        )}
      </View>
    </SafeAreaView>
  );
};

export default HomeScreen;

// =====================================================
// STYLES
// =====================================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#ffffff",
  },

  loading: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#ffffff",
  },

  loadingText: {
    marginTop: 10,
    fontSize: 16,
  },

  header: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderBottomWidth: 1,
    borderBottomColor: "#eeeeee",
  },

  title: {
    fontSize: 28,
    fontWeight: "700",
  },

  subtitle: {
    marginTop: 4,
    color: "#777777",
  },

  logoutButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
  },

  logoutText: {
    color: "#e53935",
    fontWeight: "600",
  },

  section: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 16,
  },

  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 10,
  },

  createButton: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
    backgroundColor: "#111111",
  },

  createButtonText: {
    color: "#ffffff",
    fontWeight: "600",
  },

  chatItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#eeeeee",
  },

  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
  },

  avatarPlaceholder: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: "#dddddd",
    alignItems: "center",
    justifyContent: "center",
  },

  avatarText: {
    fontSize: 20,
    fontWeight: "700",
  },

  groupAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: "#eeeeee",
    alignItems: "center",
    justifyContent: "center",
  },

  groupIcon: {
    fontSize: 24,
  },

  chatItemContent: {
    marginLeft: 14,
    flex: 1,
  },

  chatName: {
    fontSize: 16,
    fontWeight: "600",
  },

  username: {
    marginTop: 3,
    color: "#777777",
    fontSize: 13,
  },

  emptyText: {
    color: "#888888",
    paddingVertical: 10,
  },
});