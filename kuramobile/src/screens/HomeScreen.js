import React, { useCallback, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  SafeAreaView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { router, useFocusEffect } from "expo-router";

import { getUsers, getGroups } from "../services/api";

export default function HomeScreen() {
  const [currentUser, setCurrentUser] = useState(null);

  const [users, setUsers] = useState([]);
  const [groups, setGroups] = useState([]);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [userError, setUserError] = useState("");
  const [groupError, setGroupError] = useState("");

  // =====================================================
  // LOAD DATA
  // =====================================================

  const loadData = async (isRefresh = false) => {
    try {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      setUserError("");
      setGroupError("");

      // =================================================
      // GET CURRENT USER
      // =================================================

      const savedUser =
        await AsyncStorage.getItem("currentUser");

      if (!savedUser) {
        router.replace("/login");
        return;
      }

      const parsedUser = JSON.parse(savedUser);

      if (!parsedUser?._id) {
        await AsyncStorage.removeItem("currentUser");
        router.replace("/login");
        return;
      }

      setCurrentUser(parsedUser);

      console.log(
        "Current mobile user:",
        parsedUser._id
      );

      // =================================================
      // LOAD USERS AND GROUPS
      // =================================================

      const [usersResult, groupsResult] =
        await Promise.allSettled([
          getUsers(),
          getGroups(parsedUser._id),
        ]);

      // =================================================
      // USERS
      // =================================================

      if (usersResult.status === "fulfilled") {
        const usersData = usersResult.value;

        console.log(
          "Users received:",
          usersData
        );

        if (Array.isArray(usersData)) {
          setUsers(
            usersData.filter(
              (user) =>
                String(user?._id) !==
                String(parsedUser._id)
            )
          );
        } else {
          setUsers([]);
        }
      } else {
        console.error(
          "Could not load users:",
          usersResult.reason
        );

        setUserError(
          usersResult.reason?.message ||
            "Could not load users."
        );

        setUsers([]);
      }

      // =================================================
      // GROUPS
      // =================================================

      if (groupsResult.status === "fulfilled") {
        const groupsData = groupsResult.value;

        console.log(
          "Groups received:",
          groupsData
        );

        if (Array.isArray(groupsData)) {
          setGroups(groupsData);
        } else {
          console.warn(
            "Groups response is not an array:",
            groupsData
          );

          setGroups([]);
        }
      } else {
        console.error(
          "Could not load groups:",
          groupsResult.reason
        );

        setGroupError(
          groupsResult.reason?.message ||
            "Could not load groups."
        );

        setGroups([]);
      }
    } catch (error) {
      console.error(
        "Home loading error:",
        error
      );

      setGroupError(
        error?.message ||
          "Could not load data."
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // =====================================================
  // LOAD WHEN SCREEN OPENS
  // =====================================================

  useFocusEffect(
    useCallback(() => {
      loadData(false);
    }, [])
  );

  // =====================================================
  // REFRESH
  // =====================================================

  const onRefresh = () => {
    loadData(true);
  };

  // =====================================================
  // LOGOUT
  // =====================================================

  const logout = async () => {
    try {
      await AsyncStorage.removeItem(
        "currentUser"
      );

      setCurrentUser(null);
      setUsers([]);
      setGroups([]);

      router.replace("/login");
    } catch (error) {
      console.error(
        "Logout error:",
        error
      );
    }
  };

  // =====================================================
  // OPEN PRIVATE CHAT
  // =====================================================

  const openPrivateChat = (user) => {
    if (!user?._id) {
      return;
    }

    console.log(
      "Opening private chat:",
      user._id
    );

    router.push({
      pathname: "/chat",
      params: {
        type: "private",
        userId: String(user._id),
        userName:
          user.name ||
          user.username ||
          "User",
      },
    });
  };

  // =====================================================
  // OPEN GROUP CHAT
  // =====================================================

  const openGroupChat = (group) => {
    if (!group?._id) {
      console.error(
        "Cannot open group: missing group ID",
        group
      );

      return;
    }

    console.log(
      "Opening group chat:",
      group._id,
      group.name
    );

    router.push({
      pathname: "/chat",
      params: {
        type: "group",
        groupId: String(group._id),
        groupName:
          group.name || "Group",
      },
    });
  };

  // =====================================================
  // USER NAME
  // =====================================================

  const getUserName = (user) => {
    return (
      user?.name ||
      user?.username ||
      "User"
    );
  };

  // =====================================================
  // USER INITIAL
  // =====================================================

  const getUserInitial = (user) => {
    return getUserName(user)
      .charAt(0)
      .toUpperCase();
  };

  // =====================================================
  // GROUP ITEM
  // =====================================================

  const renderGroup = ({ item }) => {
    return (
      <Pressable
        style={({ pressed }) => [
          styles.chatItem,
          pressed && styles.pressed,
        ]}
        onPress={() =>
          openGroupChat(item)
        }
      >
        <View style={styles.groupAvatar}>
          <Text style={styles.groupAvatarText}>
            👥
          </Text>
        </View>

        <View style={styles.chatInfo}>
          <Text
            style={styles.chatName}
            numberOfLines={1}
          >
            {item.name || "Group"}
          </Text>

          <Text style={styles.chatSubtitle}>
            {Array.isArray(item.members)
              ? `${item.members.length} members`
              : "Group conversation"}
          </Text>
        </View>

        <Text style={styles.arrow}>
          ›
        </Text>
      </Pressable>
    );
  };

  // =====================================================
  // USER ITEM
  // =====================================================

  const renderUser = ({ item }) => {
    return (
      <Pressable
        style={({ pressed }) => [
          styles.chatItem,
          pressed && styles.pressed,
        ]}
        onPress={() =>
          openPrivateChat(item)
        }
      >
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>
            {getUserInitial(item)}
          </Text>
        </View>

        <View style={styles.chatInfo}>
          <Text
            style={styles.chatName}
            numberOfLines={1}
          >
            {getUserName(item)}
          </Text>

          <Text style={styles.chatSubtitle}>
            @{item.username || "user"}
          </Text>
        </View>

        <Text style={styles.arrow}>
          ›
        </Text>
      </Pressable>
    );
  };

  // =====================================================
  // LOADING
  // =====================================================

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator
            size="large"
          />

          <Text style={styles.loadingText}>
            Loading conversations...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  // =====================================================
  // MAIN
  // =====================================================

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>

        {/* =================================================
            HEADER
        ================================================= */}

        <View style={styles.header}>
          <View>
            <Text style={styles.title}>
              Messages
            </Text>

            <Text style={styles.subtitle}>
              Welcome,{" "}
              {getUserName(currentUser)}
            </Text>
          </View>

          <Pressable
            style={styles.logoutButton}
            onPress={logout}
          >
            <Text style={styles.logoutText}>
              Logout
            </Text>
          </Pressable>
        </View>

        {/* =================================================
            CONTENT
        ================================================= */}

        <FlatList
          data={[
            {
              type: "section",
              id: "people",
              title: "People",
            },
            ...users.map((user) => ({
              type: "user",
              id: `user-${user._id}`,
              user,
            })),

            {
              type: "section",
              id: "groups",
              title: "Groups",
            },

            ...groups.map((group) => ({
              type: "group",
              id: `group-${group._id}`,
              group,
            })),
          ]}
          keyExtractor={(item) =>
            item.id
          }
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
            />
          }
          contentContainerStyle={
            styles.listContent
          }
          renderItem={({ item }) => {

            // =================================================
            // SECTION
            // =================================================

            if (
              item.type === "section"
            ) {
              const isPeople =
                item.id === "people";

              return (
                <View
                  style={
                    styles.sectionHeader
                  }
                >
                  <Text
                    style={
                      styles.sectionTitle
                    }
                  >
                    {item.title}
                  </Text>

                  {isPeople &&
                    userError && (
                      <Text
                        style={
                          styles.errorText
                        }
                      >
                        {userError}
                      </Text>
                    )}

                  {!isPeople &&
                    groupError && (
                      <Text
                        style={
                          styles.errorText
                        }
                      >
                        {groupError}
                      </Text>
                    )}
                </View>
              );
            }

            // =================================================
            // USER
            // =================================================

            if (
              item.type === "user"
            ) {
              return renderUser({
                item: item.user,
              });
            }

            // =================================================
            // GROUP
            // =================================================

            if (
              item.type === "group"
            ) {
              return renderGroup({
                item: item.group,
              });
            }

            return null;
          }}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={styles.emptyIcon}>
                💬
              </Text>

              <Text
                style={styles.emptyTitle}
              >
                No conversations
              </Text>

              <Text
                style={styles.emptyText}
              >
                No users or groups are
                available yet.
              </Text>
            </View>
          }
        />
      </View>
    </SafeAreaView>
  );
}

// =====================================================
// STYLES
// =====================================================

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#F8FAFC",
  },

  container: {
    flex: 1,
  },

  // ===================================================
  // LOADING
  // ===================================================

  loadingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },

  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: "#6B7280",
  },

  // ===================================================
  // HEADER
  // ===================================================

  header: {
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 20,
    paddingVertical: 18,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",

    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  title: {
    fontSize: 26,
    fontWeight: "800",
    color: "#111827",
  },

  subtitle: {
    marginTop: 4,
    fontSize: 13,
    color: "#6B7280",
  },

  logoutButton: {
    backgroundColor: "#FEE2E2",
    paddingHorizontal: 13,
    paddingVertical: 8,
    borderRadius: 9,
  },

  logoutText: {
    color: "#DC2626",
    fontSize: 12,
    fontWeight: "700",
  },

  // ===================================================
  // LIST
  // ===================================================

  listContent: {
    paddingBottom: 30,
  },

  sectionHeader: {
    paddingHorizontal: 20,
    paddingTop: 22,
    paddingBottom: 8,
  },

  sectionTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: "#374151",
  },

  // ===================================================
  // CHAT ITEM
  // ===================================================

  chatItem: {
    minHeight: 72,
    backgroundColor: "#FFFFFF",

    paddingHorizontal: 20,
    paddingVertical: 12,

    flexDirection: "row",
    alignItems: "center",

    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },

  pressed: {
    opacity: 0.7,
  },

  chatInfo: {
    flex: 1,
    marginLeft: 13,
  },

  chatName: {
    fontSize: 16,
    fontWeight: "700",
    color: "#111827",
  },

  chatSubtitle: {
    marginTop: 4,
    fontSize: 13,
    color: "#6B7280",
  },

  arrow: {
    fontSize: 28,
    color: "#9CA3AF",
    marginLeft: 10,
  },

  // ===================================================
  // USER AVATAR
  // ===================================================

  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,

    backgroundColor: "#E0E7FF",

    alignItems: "center",
    justifyContent: "center",
  },

  avatarText: {
    fontSize: 18,
    fontWeight: "800",
    color: "#3730A3",
  },

  // ===================================================
  // GROUP AVATAR
  // ===================================================

  groupAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,

    backgroundColor: "#EDE9FE",

    alignItems: "center",
    justifyContent: "center",
  },

  groupAvatarText: {
    fontSize: 23,
  },

  // ===================================================
  // ERROR
  // ===================================================

  errorText: {
    marginTop: 5,
    color: "#DC2626",
    fontSize: 12,
  },

  // ===================================================
  // EMPTY
  // ===================================================

  empty: {
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 30,
    paddingTop: 100,
  },

  emptyIcon: {
    fontSize: 50,
    marginBottom: 15,
  },

  emptyTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: "#111827",
  },

  emptyText: {
    marginTop: 7,
    textAlign: "center",
    color: "#6B7280",
    lineHeight: 21,
  },
});