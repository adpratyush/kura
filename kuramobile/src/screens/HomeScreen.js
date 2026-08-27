import React, { useCallback, useEffect, useState } from "react";

import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  RefreshControl,
  SafeAreaView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import { API_URL } from "../App";

// =====================================================
// HOME SCREEN
// =====================================================

export default function HomeScreen({
  currentUser,
  onLogout,
}) {
  const [users, setUsers] = useState([]);
  const [groups, setGroups] = useState([]);

  const [loadingUsers, setLoadingUsers] = useState(true);
  const [loadingGroups, setLoadingGroups] = useState(true);

  const [refreshing, setRefreshing] = useState(false);

  // ===================================================
  // LOAD USERS
  // ===================================================

  const loadUsers = async () => {
    try {
      setLoadingUsers(true);

      const response = await fetch(
        `${API_URL}/api/users`
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.message || "Could not load users"
        );
      }

      if (Array.isArray(data)) {
        // Don't show current user
        const otherUsers = data.filter(
          (user) =>
            String(user?._id) !==
            String(currentUser?._id)
        );

        setUsers(otherUsers);
      } else {
        setUsers([]);
      }
    } catch (error) {
      console.error(
        "Users error:",
        error
      );

      Alert.alert(
        "Error",
        "Could not load users."
      );

      setUsers([]);
    } finally {
      setLoadingUsers(false);
    }
  };

  // ===================================================
  // LOAD GROUPS
  // ===================================================

  const loadGroups = async () => {
    if (!currentUser?._id) {
      return;
    }

    try {
      setLoadingGroups(true);

      const response = await fetch(
        `${API_URL}/api/groups/user/${currentUser._id}`
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.message ||
            "Could not load groups"
        );
      }

      setGroups(
        Array.isArray(data)
          ? data
          : []
      );
    } catch (error) {
      console.error(
        "Groups error:",
        error
      );

      setGroups([]);
    } finally {
      setLoadingGroups(false);
    }
  };

  // ===================================================
  // INITIAL LOAD
  // ===================================================

  useEffect(() => {
    loadUsers();
    loadGroups();
  }, [currentUser?._id]);

  // ===================================================
  // REFRESH
  // ===================================================

  const onRefresh = useCallback(
    async () => {
      setRefreshing(true);

      await Promise.all([
        loadUsers(),
        loadGroups(),
      ]);

      setRefreshing(false);
    },
    [currentUser?._id]
  );

  // ===================================================
  // USER HELPERS
  // ===================================================

  const getUserName = (user) => {
    if (!user) {
      return "User";
    }

    return (
      user.name ||
      user.username ||
      "User"
    );
  };

  const getUserInitial = (user) => {
    const name = getUserName(user);

    return name
      .charAt(0)
      .toUpperCase();
  };

  // ===================================================
  // PHOTO URL
  // ===================================================

  const getPhotoUrl = (user) => {
    if (
      !user ||
      typeof user !== "object"
    ) {
      return "";
    }

    if (!user.profilePhoto) {
      return "";
    }

    if (
      user.profilePhoto.startsWith(
        "http://"
      ) ||
      user.profilePhoto.startsWith(
        "https://"
      )
    ) {
      return user.profilePhoto;
    }

    return `${API_URL}${user.profilePhoto}`;
  };

  // ===================================================
  // USER AVATAR
  // ===================================================

  const UserAvatar = ({
    user,
    group = false,
  }) => {
    if (group) {
      return (
        <View
          style={[
            styles.avatar,
            styles.groupAvatar,
          ]}
        >
          <Text style={styles.groupEmoji}>
            👥
          </Text>
        </View>
      );
    }

    const photo = getPhotoUrl(user);

    return (
      <View style={styles.avatar}>
        {photo ? (
          <Image
            source={{
              uri: photo,
            }}
            style={styles.avatarImage}
          />
        ) : (
          <Text style={styles.avatarText}>
            {getUserInitial(user)}
          </Text>
        )}
      </View>
    );
  };

  // ===================================================
  // OPEN PRIVATE CHAT
  // ===================================================

  const openPrivateChat = (user) => {
    console.log(
      "Opening private chat:",
      user
    );

    /*
     * We will connect this to
     * PrivateChatScreen next.
     */

    Alert.alert(
      "Private Chat",
      `Opening chat with ${getUserName(
        user
      )}`
    );
  };

  // ===================================================
  // OPEN GROUP CHAT
  // ===================================================

  const openGroupChat = (group) => {
    console.log(
      "Opening group chat:",
      group
    );

    /*
     * We will connect this to
     * GroupChatScreen next.
     */

    Alert.alert(
      "Group Chat",
      `Opening ${group.name || "Group"}`
    );
  };

  // ===================================================
  // LOGOUT CONFIRMATION
  // ===================================================

  const confirmLogout = () => {
    Alert.alert(
      "Logout",
      "Are you sure you want to logout?",
      [
        {
          text: "Cancel",
          style: "cancel",
        },
        {
          text: "Logout",
          style: "destructive",
          onPress: onLogout,
        },
      ]
    );
  };

  // ===================================================
  // USER ITEM
  // ===================================================

  const renderUser = ({
    item,
  }) => {
    return (
      <TouchableOpacity
        style={styles.chatItem}
        activeOpacity={0.7}
        onPress={() =>
          openPrivateChat(item)
        }
      >
        <UserAvatar user={item} />

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

        <Text style={styles.chevron}>
          ›
        </Text>
      </TouchableOpacity>
    );
  };

  // ===================================================
  // GROUP ITEM
  // ===================================================

  const renderGroup = ({
    item,
  }) => {
    const memberCount =
      Array.isArray(item.members)
        ? item.members.length
        : 0;

    return (
      <TouchableOpacity
        style={styles.chatItem}
        activeOpacity={0.7}
        onPress={() =>
          openGroupChat(item)
        }
      >
        <UserAvatar group />

        <View style={styles.chatInfo}>
          <Text
            style={styles.chatName}
            numberOfLines={1}
          >
            {item.name || "Group"}
          </Text>

          <Text style={styles.chatUsername}>
            {memberCount}{" "}
            {memberCount === 1
              ? "member"
              : "members"}
          </Text>
        </View>

        <Text style={styles.chevron}>
          ›
        </Text>
      </TouchableOpacity>
    );
  };

  // ===================================================
  // EMPTY USERS
  // ===================================================

  const renderEmptyUsers = () => {
    if (loadingUsers) {
      return null;
    }

    return (
      <View style={styles.emptySection}>
        <Text style={styles.emptyIcon}>
          👤
        </Text>

        <Text style={styles.emptyTitle}>
          No other users
        </Text>

        <Text style={styles.emptyText}>
          Other registered users will
          appear here.
        </Text>
      </View>
    );
  };

  // ===================================================
  // EMPTY GROUPS
  // ===================================================

  const renderEmptyGroups = () => {
    if (loadingGroups) {
      return null;
    }

    return (
      <View style={styles.emptySection}>
        <Text style={styles.emptyIcon}>
          👥
        </Text>

        <Text style={styles.emptyTitle}>
          No groups
        </Text>

        <Text style={styles.emptyText}>
          Groups you belong to will
          appear here.
        </Text>
      </View>
    );
  };

  // ===================================================
  // LOADING
  // ===================================================

  if (
    loadingUsers &&
    loadingGroups
  ) {
    return (
      <SafeAreaView
        style={styles.safeArea}
      >
        <View
          style={styles.loadingContainer}
        >
          <ActivityIndicator
            size="large"
            color="#007AFF"
          />

          <Text
            style={styles.loadingText}
          >
            Loading Kura...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  // ===================================================
  // MAIN
  // ===================================================

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        {/* =============================================
            HEADER
        ============================================= */}

        <View style={styles.header}>
          <View>
            <Text style={styles.title}>
              Messages
            </Text>

            <Text style={styles.subtitle}>
              Stay connected with your
              friends
            </Text>
          </View>

          <TouchableOpacity
            style={styles.profileButton}
            onPress={confirmLogout}
            activeOpacity={0.7}
          >
            <UserAvatar
              user={currentUser}
            />
          </TouchableOpacity>
        </View>

        {/* =============================================
            CURRENT USER
        ============================================= */}

        <View
          style={
            styles.currentUserCard
          }
        >
          <UserAvatar
            user={currentUser}
          />

          <View
            style={
              styles.currentUserInfo
            }
          >
            <Text
              style={
                styles.currentUserName
              }
            >
              {getUserName(
                currentUser
              )}
            </Text>

            <Text
              style={
                styles.currentUserUsername
              }
            >
              @
              {currentUser.username ||
                "user"}
            </Text>
          </View>

          <View
            style={styles.onlineContainer}
          >
            <View
              style={styles.onlineDot}
            />

            <Text
              style={styles.onlineText}
            >
              Online
            </Text>
          </View>
        </View>

        {/* =============================================
            CONTENT
        ============================================= */}

        <FlatList
          data={users}
          keyExtractor={(item) =>
            String(item._id)
          }
          renderItem={renderUser}
          ListHeaderComponent={
            <>
              {/* PEOPLE */}

              <View
                style={styles.sectionHeader}
              >
                <Text
                  style={
                    styles.sectionTitle
                  }
                >
                  People
                </Text>

                <Text
                  style={
                    styles.sectionCount
                  }
                >
                  {users.length}
                </Text>
              </View>
            </>
          }
          ListEmptyComponent={
            renderEmptyUsers
          }
          ListFooterComponent={
            <>
              {/* =====================================
                  GROUPS
              ===================================== */}

              <View
                style={[
                  styles.sectionHeader,
                  styles.groupsHeader,
                ]}
              >
                <Text
                  style={
                    styles.sectionTitle
                  }
                >
                  Groups
                </Text>

                <Text
                  style={
                    styles.sectionCount
                  }
                >
                  {groups.length}
                </Text>
              </View>

              {loadingGroups ? (
                <View
                  style={
                    styles.smallLoading
                  }
                >
                  <ActivityIndicator
                    size="small"
                    color="#007AFF"
                  />

                  <Text
                    style={
                      styles.smallLoadingText
                    }
                  >
                    Loading groups...
                  </Text>
                </View>
              ) : groups.length ===
                0 ? (
                renderEmptyGroups()
              ) : (
                groups.map((group) => (
                  <View
                    key={String(
                      group._id
                    )}
                  >
                    {renderGroup({
                      item: group,
                    })}
                  </View>
                ))
              )}

              <View
                style={
                  styles.bottomSpace
                }
              />
            </>
          }
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
            />
          }
          showsVerticalScrollIndicator={
            false
          }
          contentContainerStyle={
            styles.listContent
          }
        />

        {/* =============================================
            BOTTOM NAVIGATION
        ============================================= */}

        <View style={styles.bottomNav}>
          <View
            style={[
              styles.navItem,
              styles.activeNavItem,
            ]}
          >
            <Text style={styles.navIcon}>
              💬
            </Text>

            <Text
              style={
                styles.activeNavText
              }
            >
              Chats
            </Text>
          </View>

          <TouchableOpacity
            style={styles.navItem}
            onPress={() =>
              Alert.alert(
                "Coming Soon",
                "Settings will be added soon."
              )
            }
          >
            <Text style={styles.navIcon}>
              ⚙️
            </Text>

            <Text style={styles.navText}>
              Settings
            </Text>
          </TouchableOpacity>
        </View>
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
    backgroundColor: "#F7F8FA",
  },

  container: {
    flex: 1,
    backgroundColor: "#F7F8FA",
  },

  // ================================================
  // LOADING
  // ================================================

  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#F7F8FA",
  },

  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: "#666",
  },

  smallLoading: {
    paddingVertical: 20,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
  },

  smallLoadingText: {
    marginLeft: 10,
    fontSize: 14,
    color: "#777",
  },

  // ================================================
  // HEADER
  // ================================================

  header: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#FFFFFF",
  },

  title: {
    fontSize: 30,
    fontWeight: "700",
    color: "#111827",
  },

  subtitle: {
    marginTop: 3,
    fontSize: 14,
    color: "#8A8F98",
  },

  profileButton: {
    padding: 2,
  },

  // ================================================
  // CURRENT USER
  // ================================================

  currentUserCard: {
    marginHorizontal: 16,
    marginTop: 14,
    marginBottom: 8,
    padding: 14,
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    flexDirection: "row",
    alignItems: "center",

    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.05,
    shadowRadius: 5,

    elevation: 2,
  },

  currentUserInfo: {
    flex: 1,
    marginLeft: 12,
  },

  currentUserName: {
    fontSize: 16,
    fontWeight: "700",
    color: "#17191C",
  },

  currentUserUsername: {
    marginTop: 2,
    fontSize: 13,
    color: "#858A91",
  },

  onlineContainer: {
    flexDirection: "row",
    alignItems: "center",
  },

  onlineDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#34C759",
    marginRight: 5,
  },

  onlineText: {
    fontSize: 12,
    color: "#34C759",
    fontWeight: "600",
  },

  // ================================================
  // SECTIONS
  // ================================================

  sectionHeader: {
    marginTop: 18,
    marginBottom: 8,
    paddingHorizontal: 20,
    flexDirection: "row",
    alignItems: "center",
  },

  groupsHeader: {
    marginTop: 28,
  },

  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#20242A",
  },

  sectionCount: {
    marginLeft: 8,
    minWidth: 24,
    paddingHorizontal: 7,
    paddingVertical: 2,
    textAlign: "center",
    borderRadius: 10,
    overflow: "hidden",
    backgroundColor: "#E9F2FF",
    color: "#007AFF",
    fontSize: 12,
    fontWeight: "700",
  },

  // ================================================
  // CHAT ITEM
  // ================================================

  chatItem: {
    marginHorizontal: 16,
    marginVertical: 4,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 14,
    backgroundColor: "#FFFFFF",
    flexDirection: "row",
    alignItems: "center",

    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.03,
    shadowRadius: 3,

    elevation: 1,
  },

  chatInfo: {
    flex: 1,
    marginLeft: 12,
  },

  chatName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#181B1F",
  },

  chatUsername: {
    marginTop: 3,
    fontSize: 13,
    color: "#858A91",
  },

  chevron: {
    marginLeft: 8,
    fontSize: 28,
    lineHeight: 28,
    color: "#B4B8BE",
  },

  // ================================================
  // AVATAR
  // ================================================

  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: "#E9EEF5",
    justifyContent: "center",
    alignItems: "center",
    overflow: "hidden",
  },

  avatarImage: {
    width: "100%",
    height: "100%",
  },

  avatarText: {
    fontSize: 20,
    fontWeight: "700",
    color: "#4B5563",
  },

  groupAvatar: {
    backgroundColor: "#E8F1FF",
  },

  groupEmoji: {
    fontSize: 24,
  },

  // ================================================
  // EMPTY
  // ================================================

  emptySection: {
    marginHorizontal: 20,
    marginTop: 12,
    marginBottom: 10,
    padding: 25,
    borderRadius: 14,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
  },

  emptyIcon: {
    fontSize: 30,
    marginBottom: 8,
  },

  emptyTitle: {
    fontSize: 15,
    fontWeight: "600",
    color: "#30343A",
  },

  emptyText: {
    marginTop: 5,
    fontSize: 13,
    color: "#8A8F98",
    textAlign: "center",
  },

  // ================================================
  // LIST
  // ================================================

  listContent: {
    paddingBottom: 10,
  },

  bottomSpace: {
    height: 20,
  },

  // ================================================
  // BOTTOM NAV
  // ================================================

  bottomNav: {
    height: 70,
    paddingBottom: 8,
    backgroundColor: "#FFFFFF",
    borderTopWidth: 1,
    borderTopColor: "#E8E9EB",
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "center",
  },

  navItem: {
    flex: 1,
    height: 60,
    justifyContent: "center",
    alignItems: "center",
  },

  activeNavItem: {
    opacity: 1,
  },

  navIcon: {
    fontSize: 22,
    marginBottom: 3,
  },

  navText: {
    fontSize: 12,
    color: "#8A8F98",
  },

  activeNavText: {
    fontSize: 12,
    color: "#007AFF",
    fontWeight: "700",
  },
});