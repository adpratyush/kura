import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  Pressable,
  RefreshControl,
  SafeAreaView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { router, useFocusEffect } from "expo-router";

import { API_URL } from "../config";
import { getUsers, getGroups } from "../services/api";

export default function HomeScreen() {
  const [user, setUser] = useState<any>(null);

  const [users, setUsers] = useState<any[]>([]);
  const [groups, setGroups] = useState<any[]>([]);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // =====================================================
  // LOAD LOGGED-IN USER
  // =====================================================

  const loadUser = async () => {
    try {
      const savedUser =
        await AsyncStorage.getItem("currentUser");

      if (!savedUser) {
        router.replace("/login");
        return null;
      }

      const parsedUser = JSON.parse(savedUser);

      if (!parsedUser?._id) {
        await AsyncStorage.removeItem("currentUser");
        router.replace("/login");
        return null;
      }

      setUser(parsedUser);

      return parsedUser;
    } catch (error) {
      console.error("Could not load user:", error);

      await AsyncStorage.removeItem("currentUser");

      router.replace("/login");

      return null;
    }
  };

  // =====================================================
  // LOAD USERS + GROUPS
  // =====================================================

  const loadData = async (loggedInUser?: any) => {
    try {
      const current =
        loggedInUser || user;

      if (!current?._id) {
        return;
      }

      console.log("Loading users...");
      console.log("Loading groups for:", current._id);

      const [usersData, groupsData] =
        await Promise.all([
          getUsers(),
          getGroups(current._id),
        ]);

      console.log("Users response:", usersData);
      console.log("Groups response:", groupsData);

      // -------------------------------------------------
      // USERS
      // -------------------------------------------------

      let usersArray: any[] = [];

      if (Array.isArray(usersData)) {
        usersArray = usersData;
      } else if (Array.isArray(usersData?.users)) {
        usersArray = usersData.users;
      }

      // Don't show current user
      usersArray = usersArray.filter(
        (item) =>
          String(item?._id) !==
          String(current._id)
      );

      setUsers(usersArray);

      // -------------------------------------------------
      // GROUPS
      // -------------------------------------------------

      let groupsArray: any[] = [];

      if (Array.isArray(groupsData)) {
        groupsArray = groupsData;
      } else if (Array.isArray(groupsData?.groups)) {
        groupsArray = groupsData.groups;
      }

      setGroups(groupsArray);
    } catch (error: any) {
      console.error("Home data error:", error);

      Alert.alert(
        "Connection Error",
        error?.message ||
          "Could not load users and groups."
      );

      setUsers([]);
      setGroups([]);
    }
  };

  // =====================================================
  // INITIAL LOAD
  // =====================================================

  useEffect(() => {
    const initialize = async () => {
      setLoading(true);

      const loggedInUser = await loadUser();

      if (loggedInUser) {
        await loadData(loggedInUser);
      }

      setLoading(false);
    };

    initialize();
  }, []);

  // =====================================================
  // RELOAD WHEN HOME SCREEN GETS FOCUS
  // =====================================================

  useFocusEffect(
    useCallback(() => {
      if (user?._id) {
        loadData(user);
      }
    }, [user?._id])
  );

  // =====================================================
  // REFRESH
  // =====================================================

  const onRefresh = async () => {
    if (!user?._id) {
      return;
    }

    setRefreshing(true);

    await loadData(user);

    setRefreshing(false);
  };

  // =====================================================
  // LOGOUT
  // =====================================================

  const logout = async () => {
    try {
      await AsyncStorage.removeItem("currentUser");

      router.replace("/login");
    } catch (error) {
      console.error("Logout error:", error);
    }
  };

  // =====================================================
  // OPEN PRIVATE CHAT
  // =====================================================

  const openPrivateChat = (selectedUser: any) => {
    router.push({
      pathname: "/chat",
      params: {
        type: "private",
        userId: selectedUser._id,
        userName:
          selectedUser.name ||
          selectedUser.username ||
          "User",
        username:
          selectedUser.username || "",
        profilePhoto:
          selectedUser.profilePhoto || "",
      },
    });
  };

  // =====================================================
  // OPEN GROUP CHAT
  // =====================================================

  const openGroupChat = (group: any) => {
    router.push({
      pathname: "/chat",
      params: {
        type: "group",
        groupId: group._id,
        groupName:
          group.name || "Group",
      },
    });
  };

  // =====================================================
  // PHOTO URL
  // =====================================================

  const getPhotoUrl = (item: any) => {
    if (!item?.profilePhoto) {
      return "";
    }

    if (
      item.profilePhoto.startsWith("http://") ||
      item.profilePhoto.startsWith("https://")
    ) {
      return item.profilePhoto;
    }

    return `${API_URL}${item.profilePhoto}`;
  };

  // =====================================================
  // USER NAME
  // =====================================================

  const getUserName = (item: any) => {
    return (
      item?.name ||
      item?.username ||
      "User"
    );
  };

  // =====================================================
  // AVATAR
  // =====================================================

  const Avatar = ({
    item,
    group = false,
  }: {
    item?: any;
    group?: boolean;
  }) => {
    if (group) {
      return (
        <View style={styles.groupAvatar}>
          <Text style={styles.groupAvatarText}>
            👥
          </Text>
        </View>
      );
    }

    const photo = getPhotoUrl(item);

    if (photo) {
      return (
        <Image
          source={{ uri: photo }}
          style={styles.avatar}
        />
      );
    }

    return (
      <View style={styles.avatar}>
        <Text style={styles.avatarText}>
          {getUserName(item)
            .charAt(0)
            .toUpperCase()}
        </Text>
      </View>
    );
  };

  // =====================================================
  // LIST HEADER
  // =====================================================

  const ListHeader = () => {
    return (
      <View>
        {/* ---------------------------------------------
            PEOPLE
        --------------------------------------------- */}

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>
            People
          </Text>

          <Text style={styles.count}>
            {users.length}
          </Text>
        </View>

        {users.length === 0 ? (
          <View style={styles.emptySection}>
            <Text style={styles.emptySectionText}>
              No other users found.
            </Text>
          </View>
        ) : (
          users.map((item) => (
            <Pressable
              key={item._id}
              style={({ pressed }) => [
                styles.chatItem,
                pressed && styles.pressed,
              ]}
              onPress={() =>
                openPrivateChat(item)
              }
            >
              <Avatar item={item} />

              <View style={styles.chatInfo}>
                <Text
                  style={styles.chatName}
                  numberOfLines={1}
                >
                  {getUserName(item)}
                </Text>

                <Text
                  style={styles.chatUsername}
                  numberOfLines={1}
                >
                  @{item.username || "user"}
                </Text>
              </View>

              <Text style={styles.arrow}>
                ›
              </Text>
            </Pressable>
          ))
        )}

        {/* ---------------------------------------------
            GROUPS
        --------------------------------------------- */}

        <View style={styles.groupHeader}>
          <View style={styles.groupTitleContainer}>
            <Text style={styles.sectionTitle}>
              Groups
            </Text>

            <Text style={styles.count}>
              {groups.length}
            </Text>
          </View>

          <Pressable
            style={styles.createButton}
            onPress={() =>
              router.push("/create-group")
            }
          >
            <Text style={styles.createButtonText}>
              + Create
            </Text>
          </Pressable>
        </View>

        {groups.length === 0 ? (
          <View style={styles.emptySection}>
            <Text style={styles.emptyGroupIcon}>
              👥
            </Text>

            <Text style={styles.emptySectionTitle}>
              No groups yet
            </Text>

            <Text style={styles.emptySectionText}>
              Create a group to start chatting
              with multiple people.
            </Text>
          </View>
        ) : (
          groups.map((group) => (
            <Pressable
              key={group._id}
              style={({ pressed }) => [
                styles.chatItem,
                pressed && styles.pressed,
              ]}
              onPress={() =>
                openGroupChat(group)
              }
            >
              <Avatar
                item={group}
                group
              />

              <View style={styles.chatInfo}>
                <Text
                  style={styles.chatName}
                  numberOfLines={1}
                >
                  {group.name || "Group"}
                </Text>

                <Text
                  style={styles.chatUsername}
                  numberOfLines={1}
                >
                  {Array.isArray(
                    group.members
                  )
                    ? `${group.members.length} members`
                    : "Group chat"}
                </Text>
              </View>

              <Text style={styles.arrow}>
                ›
              </Text>
            </Pressable>
          ))
        )}

        <View style={styles.bottomSpace} />
      </View>
    );
  };

  // =====================================================
  // LOADING
  // =====================================================

  if (loading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator
          size="large"
        />

        <Text style={styles.loadingText}>
          Loading...
        </Text>
      </View>
    );
  }

  // =====================================================
  // SCREEN
  // =====================================================

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>

        {/* =============================================
            HEADER
        ============================================= */}

        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Text style={styles.title}>
              Messages
            </Text>

            <Text style={styles.subtitle}>
              Welcome,{" "}
              {getUserName(user)}
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

        {/* =============================================
            CONTENT
        ============================================= */}

        <FlatList
          data={[]}
          renderItem={null}
          ListHeaderComponent={
            <ListHeader />
          }
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
            />
          }
          showsVerticalScrollIndicator={false}
          contentContainerStyle={
            styles.listContent
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
    backgroundColor: "#F8FAFC",
  },

  loading: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F8FAFC",
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

  headerLeft: {
    flex: 1,
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
    paddingHorizontal: 13,
    paddingVertical: 8,
    borderRadius: 9,
    backgroundColor: "#FEE2E2",
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

  // ===================================================
  // SECTION
  // ===================================================

  sectionHeader: {
    paddingHorizontal: 20,
    paddingTop: 22,
    paddingBottom: 9,
    flexDirection: "row",
    alignItems: "center",
  },

  groupHeader: {
    paddingHorizontal: 20,
    paddingTop: 25,
    paddingBottom: 9,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  groupTitleContainer: {
    flexDirection: "row",
    alignItems: "center",
  },

  sectionTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: "#111827",
  },

  count: {
    marginLeft: 7,
    minWidth: 22,
    textAlign: "center",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
    overflow: "hidden",
    backgroundColor: "#E5E7EB",
    color: "#4B5563",
    fontSize: 11,
    fontWeight: "700",
  },

  // ===================================================
  // CHAT ITEM
  // ===================================================

  chatItem: {
    backgroundColor: "#FFFFFF",
    marginHorizontal: 12,
    marginVertical: 4,
    paddingHorizontal: 14,
    paddingVertical: 13,
    borderRadius: 14,
    flexDirection: "row",
    alignItems: "center",
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

  chatUsername: {
    marginTop: 3,
    fontSize: 13,
    color: "#6B7280",
  },

  arrow: {
    fontSize: 27,
    color: "#9CA3AF",
    marginLeft: 8,
  },

  // ===================================================
  // AVATAR
  // ===================================================

  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: "#DBEAFE",
    alignItems: "center",
    justifyContent: "center",
  },

  avatarText: {
    fontSize: 19,
    fontWeight: "800",
    color: "#2563EB",
  },

  groupAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: "#EDE9FE",
    alignItems: "center",
    justifyContent: "center",
  },

  groupAvatarText: {
    fontSize: 24,
  },

  // ===================================================
  // CREATE GROUP
  // ===================================================

  createButton: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 9,
    backgroundColor: "#DBEAFE",
  },

  createButtonText: {
    color: "#2563EB",
    fontSize: 12,
    fontWeight: "800",
  },

  // ===================================================
  // EMPTY
  // ===================================================

  emptySection: {
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 30,
    paddingVertical: 22,
    marginHorizontal: 12,
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
  },

  emptyGroupIcon: {
    fontSize: 32,
    marginBottom: 8,
  },

  emptySectionTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#374151",
    marginBottom: 4,
  },

  emptySectionText: {
    textAlign: "center",
    fontSize: 13,
    color: "#9CA3AF",
    lineHeight: 19,
  },

  bottomSpace: {
    height: 20,
  },
});