import React, {
  useEffect,
  useRef,
  useState,
} from "react";

import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import AsyncStorage from "@react-native-async-storage/async-storage";
import { router } from "expo-router";
import * as ImagePicker from "expo-image-picker";

import {
  getGroupMessages,
  sendGroupMessage,
  uploadImage,
} from "../services/api";

import {
  connectSocket,
  getSocket,
} from "../services/socket";

import { API_URL } from "../config";

export default function GroupChatScreen({
  groupId,
  groupName,
}) {
  // =====================================================
  // STATE
  // =====================================================

  const [currentUser, setCurrentUser] =
    useState(null);

  const [messages, setMessages] =
    useState([]);

  const [text, setText] =
    useState("");

  const [loading, setLoading] =
    useState(true);

  const [sending, setSending] =
    useState(false);

  const [selectedImage, setSelectedImage] =
    useState(null);

  const flatListRef =
    useRef(null);

  const sendingRef =
    useRef(false);

  // =====================================================
  // LOAD CURRENT USER
  // =====================================================

  useEffect(() => {
    loadCurrentUser();
  }, []);

  const loadCurrentUser = async () => {
    try {
      const savedUser =
        await AsyncStorage.getItem(
          "currentUser"
        );

      if (!savedUser) {
        router.replace("/login");
        return;
      }

      const parsedUser =
        JSON.parse(savedUser);

      if (!parsedUser?._id) {
        router.replace("/login");
        return;
      }

      setCurrentUser(parsedUser);
    } catch (error) {
      console.error(
        "Load current user error:",
        error
      );

      router.replace("/login");
    }
  };

  // =====================================================
  // LOAD GROUP MESSAGES
  // =====================================================

  useEffect(() => {
    if (
      currentUser?._id &&
      groupId
    ) {
      loadMessages();
    }
  }, [
    currentUser?._id,
    groupId,
  ]);

  const loadMessages = async () => {
    try {
      setLoading(true);

      console.log(
        "Loading group messages:",
        groupId
      );

      const data =
        await getGroupMessages(
          groupId
        );

      console.log(
        "Group messages response:",
        data
      );

      let messageArray = [];

      if (Array.isArray(data)) {
        messageArray = data;
      } else if (
        Array.isArray(data?.messages)
      ) {
        messageArray = data.messages;
      }

      setMessages(messageArray);
    } catch (error) {
      console.error(
        "Load group messages error:",
        error
      );

      Alert.alert(
        "Error",
        error?.message ||
          "Could not load group messages."
      );

      setMessages([]);
    } finally {
      setLoading(false);
    }
  };

  // =====================================================
  // SOCKET
  // =====================================================

  useEffect(() => {
    if (
      !currentUser?._id ||
      !groupId
    ) {
      return;
    }

    console.log(
      "Connecting socket for group:",
      groupId
    );

    const socket =
      connectSocket(
        currentUser._id
      );

    if (!socket) {
      return;
    }

    // ===================================================
    // JOIN GROUP
    // ===================================================

    const joinGroup = () => {
      console.log(
        "Joining group room:",
        groupId
      );

      socket.emit(
        "join_group",
        String(groupId)
      );
    };

    if (socket.connected) {
      joinGroup();
    }

    socket.on(
      "connect",
      joinGroup
    );

    // ===================================================
    // RECEIVE GROUP MESSAGE
    // ===================================================

    const handleNewGroupMessage =
      (newMessage) => {
        console.log(
          "📨 New group message:",
          newMessage
        );

        if (!newMessage) {
          return;
        }

        const incomingGroup =
          typeof newMessage.group ===
          "object"
            ? newMessage.group?._id
            : newMessage.group;

        if (
          String(incomingGroup) !==
          String(groupId)
        ) {
          return;
        }

        setMessages(
          (previous) => {
            if (
              newMessage._id &&
              previous.some(
                (item) =>
                  String(
                    item?._id
                  ) ===
                  String(
                    newMessage._id
                  )
              )
            ) {
              return previous;
            }

            return [
              ...previous,
              newMessage,
            ];
          }
        );
      };

    socket.on(
      "new_group_message",
      handleNewGroupMessage
    );

    // ===================================================
    // CLEANUP
    // ===================================================

    return () => {
      socket.off(
        "connect",
        joinGroup
      );

      socket.off(
        "new_group_message",
        handleNewGroupMessage
      );

      socket.emit(
        "leave_group",
        String(groupId)
      );

      console.log(
        "Left group:",
        groupId
      );
    };
  }, [
    currentUser?._id,
    groupId,
  ]);

  // =====================================================
  // SCROLL
  // =====================================================

  useEffect(() => {
    if (!messages.length) {
      return;
    }

    setTimeout(() => {
      flatListRef.current?.scrollToEnd({
        animated: true,
      });
    }, 100);
  }, [messages]);

  // =====================================================
  // SEND TEXT
  // =====================================================

  const handleSendText =
    async () => {
      if (
        !currentUser?._id ||
        !groupId
      ) {
        return;
      }

      const cleanText =
        text.trim();

      if (!cleanText) {
        return;
      }

      if (
        sendingRef.current
      ) {
        return;
      }

      sendingRef.current = true;
      setSending(true);

      try {
        console.log(
          "Sending group message..."
        );

        const data =
          await sendGroupMessage({
            sender:
              currentUser._id,

            group:
              groupId,

            message:
              cleanText,

            type: "text",
          });

        console.log(
          "Group message saved:",
          data
        );

        if (data) {
          setMessages(
            (previous) => {
              if (
                data._id &&
                previous.some(
                  (item) =>
                    String(
                      item?._id
                    ) ===
                    String(
                      data._id
                    )
                )
              ) {
                return previous;
              }

              return [
                ...previous,
                data,
              ];
            }
          );
        }

        setText("");

        // =================================================
        // SOCKET BROADCAST
        // =================================================

        const socket =
          getSocket();

        if (
          socket?.connected
        ) {
          socket.emit(
            "group_message",
            {
              _id:
                data?._id,

              sender:
                currentUser._id,

              group:
                groupId,

              message:
                data?.message ||
                cleanText,

              type:
                data?.type ||
                "text",

              imageUrl:
                data?.imageUrl ||
                "",

              createdAt:
                data?.createdAt ||
                new Date(),
            }
          );

          console.log(
            "📤 Group socket message emitted"
          );
        } else {
          console.warn(
            "Group socket is not connected"
          );
        }
      } catch (error) {
        console.error(
          "Send group message error:",
          error
        );

        Alert.alert(
          "Message failed",
          error?.message ||
            "Could not send message."
        );
      } finally {
        sendingRef.current =
          false;

        setSending(false);
      }
    };

  // =====================================================
  // PICK IMAGE
  // =====================================================

  const pickImage =
    async () => {
      try {
        const permission =
          await ImagePicker.requestMediaLibraryPermissionsAsync();

        if (
          !permission.granted
        ) {
          Alert.alert(
            "Permission required",
            "Please allow photo library access."
          );

          return;
        }

        const result =
          await ImagePicker.launchImageLibraryAsync(
            {
              mediaTypes:
                ["images"],

              allowsEditing:
                true,

              quality: 0.8,
            }
          );

        if (
          result.canceled ||
          !result.assets?.length
        ) {
          return;
        }

        const image =
          result.assets[0];

        if (
          image.fileSize &&
          image.fileSize >
            5 * 1024 * 1024
        ) {
          Alert.alert(
            "Image too large",
            "Please select an image smaller than 5MB."
          );

          return;
        }

        setSelectedImage(
          image
        );
      } catch (error) {
        console.error(
          "Pick image error:",
          error
        );

        Alert.alert(
          "Error",
          "Could not select image."
        );
      }
    };

  // =====================================================
  // SEND IMAGE
  // =====================================================

  const handleSendImage =
    async () => {
      if (
        !selectedImage ||
        !currentUser?._id ||
        !groupId
      ) {
        return;
      }

      if (
        sendingRef.current
      ) {
        return;
      }

      sendingRef.current = true;
      setSending(true);

      try {
        console.log(
          "Uploading group image..."
        );

        const imageUrl =
          await uploadImage(
            selectedImage
          );

        if (!imageUrl) {
          throw new Error(
            "Server did not return image URL."
          );
        }

        const data =
          await sendGroupMessage({
            sender:
              currentUser._id,

            group:
              groupId,

            message: "",

            type: "image",

            imageUrl,
          });

        console.log(
          "Group image message saved:",
          data
        );

        if (data) {
          setMessages(
            (previous) => {
              if (
                data._id &&
                previous.some(
                  (item) =>
                    String(
                      item?._id
                    ) ===
                    String(
                      data._id
                    )
                )
              ) {
                return previous;
              }

              return [
                ...previous,
                data,
              ];
            }
          );
        }

        setSelectedImage(
          null
        );

        const socket =
          getSocket();

        if (
          socket?.connected
        ) {
          socket.emit(
            "group_message",
            {
              _id:
                data?._id,

              sender:
                currentUser._id,

              group:
                groupId,

              message: "",

              type:
                data?.type ||
                "image",

              imageUrl:
                data?.imageUrl ||
                imageUrl,

              createdAt:
                data?.createdAt ||
                new Date(),
            }
          );
        }
      } catch (error) {
        console.error(
          "Send group image error:",
          error
        );

        Alert.alert(
          "Image failed",
          error?.message ||
            "Could not send image."
        );
      } finally {
        sendingRef.current =
          false;

        setSending(false);
      }
    };

  // =====================================================
  // SEND
  // =====================================================

  const sendMessage = async () => {
    if (selectedImage) {
      await handleSendImage();
    } else {
      await handleSendText();
    }
  };

  // =====================================================
  // IMAGE URL
  // =====================================================

  const getImageUrl = (
    imageUrl
  ) => {
    if (!imageUrl) {
      return "";
    }

    if (
      imageUrl.startsWith(
        "http://"
      ) ||
      imageUrl.startsWith(
        "https://"
      )
    ) {
      return imageUrl;
    }

    return `${API_URL}${imageUrl}`;
  };

  // =====================================================
  // GET SENDER
  // =====================================================

  const getSenderName = (
    sender
  ) => {
    if (
      typeof sender ===
      "object"
    ) {
      return (
        sender?.name ||
        sender?.username ||
        "User"
      );
    }

    return "User";
  };

  // =====================================================
  // RENDER MESSAGE
  // =====================================================

  const renderMessage = ({
    item,
  }) => {
    if (!item) {
      return null;
    }

    const senderId =
      typeof item.sender ===
      "object"
        ? item.sender?._id
        : item.sender;

    const isMine =
      String(senderId) ===
      String(
        currentUser?._id
      );

    const isImage =
      item.type === "image";

    const messageImage =
      getImageUrl(
        item.imageUrl
      );

    return (
      <View
        style={[
          styles.messageRow,
          isMine
            ? styles.myMessageRow
            : styles.theirMessageRow,
        ]}
      >
        <View
          style={[
            styles.messageBubble,
            isMine
              ? styles.myBubble
              : styles.theirBubble,
          ]}
        >
          {!isMine && (
            <Text
              style={
                styles.senderName
              }
            >
              {getSenderName(
                item.sender
              )}
            </Text>
          )}

          {isImage &&
          messageImage ? (
            <Image
              source={{
                uri: messageImage,
              }}
              style={
                styles.messageImage
              }
              resizeMode="cover"
            />
          ) : (
            <Text
              style={[
                styles.messageText,
                isMine
                  ? styles.myMessageText
                  : styles.theirMessageText,
              ]}
            >
              {item.message ||
                ""}
            </Text>
          )}

          <Text
            style={[
              styles.time,
              isMine
                ? styles.myTime
                : styles.theirTime,
            ]}
          >
            {item.createdAt
              ? new Date(
                  item.createdAt
                ).toLocaleTimeString(
                  [],
                  {
                    hour: "2-digit",
                    minute:
                      "2-digit",
                  }
                )
              : ""}
          </Text>
        </View>
      </View>
    );
  };

  // =====================================================
  // LOADING
  // =====================================================

  if (
    loading ||
    !currentUser
  ) {
    return (
      <SafeAreaView
        style={styles.safeArea}
      >
        <View
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
            Loading group...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  // =====================================================
  // SCREEN
  // =====================================================

  return (
    <SafeAreaView
      style={styles.safeArea}
    >
      <KeyboardAvoidingView
        style={styles.container}
        behavior={
          Platform.OS === "ios"
            ? "padding"
            : undefined
        }
      >
        {/* HEADER */}

        <View
          style={styles.header}
        >
          <Pressable
            style={
              styles.backButton
            }
            onPress={() =>
              router.back()
            }
          >
            <Text
              style={
                styles.backText
              }
            >
              ‹
            </Text>
          </Pressable>

          <View
            style={styles.groupAvatar}
          >
            <Text
              style={
                styles.groupAvatarText
              }
            >
              👥
            </Text>
          </View>

          <View
            style={
              styles.headerInfo
            }
          >
            <Text
              style={
                styles.headerName
              }
              numberOfLines={1}
            >
              {groupName ||
                "Group"}
            </Text>

            <Text
              style={
                styles.headerSubtitle
              }
            >
              Group conversation
            </Text>
          </View>
        </View>

        {/* MESSAGES */}

        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={(
            item,
            index
          ) =>
            String(
              item?._id ||
                `${index}-${item?.createdAt}`
            )
          }
          renderItem={
            renderMessage
          }
          contentContainerStyle={
            messages.length === 0
              ? styles.emptyMessages
              : styles.messagesList
          }
          showsVerticalScrollIndicator={
            false
          }
          keyboardShouldPersistTaps="handled"
          ListEmptyComponent={
            <View
              style={
                styles.emptyChat
              }
            >
              <Text
                style={
                  styles.emptyIcon
                }
              >
                👥
              </Text>

              <Text
                style={
                  styles.emptyTitle
                }
              >
                Start the group conversation
              </Text>

              <Text
                style={
                  styles.emptyText
                }
              >
                Send a message to the group.
              </Text>
            </View>
          }
        />

        {/* IMAGE PREVIEW */}

        {selectedImage && (
          <View
            style={
              styles.imagePreviewContainer
            }
          >
            <Image
              source={{
                uri: selectedImage.uri,
              }}
              style={
                styles.imagePreview
              }
            />

            <Pressable
              style={
                styles.removeImageButton
              }
              onPress={() =>
                setSelectedImage(
                  null
                )
              }
            >
              <Text
                style={
                  styles.removeImageText
                }
              >
                ×
              </Text>
            </Pressable>
          </View>
        )}

        {/* INPUT */}

        <View
          style={styles.inputContainer}
        >
          <Pressable
            style={
              styles.attachButton
            }
            onPress={pickImage}
            disabled={sending}
          >
            <Text
              style={
                styles.attachText
              }
            >
              +
            </Text>
          </Pressable>

          <TextInput
            style={
              styles.textInput
            }
            placeholder={
              selectedImage
                ? "Photo selected"
                : "Type a message..."
            }
            placeholderTextColor="#9CA3AF"
            value={text}
            onChangeText={setText}
            editable={
              !selectedImage &&
              !sending
            }
            multiline
            maxLength={2000}
          />

          <Pressable
            style={[
              styles.sendButton,
              (!text.trim() &&
                !selectedImage) ||
              sending
                ? styles.sendDisabled
                : null,
            ]}
            onPress={
              sendMessage
            }
            disabled={
              (!text.trim() &&
                !selectedImage) ||
              sending
            }
          >
            {sending ? (
              <ActivityIndicator
                size="small"
                color="#FFFFFF"
              />
            ) : (
              <Text
                style={
                  styles.sendText
                }
              >
                ↑
              </Text>
            )}
          </Pressable>
        </View>
      </KeyboardAvoidingView>
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

  loading: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F8FAFC",
  },

  loadingText: {
    marginTop: 12,
    color: "#6B7280",
    fontSize: 14,
  },

  header: {
    height: 72,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
  },

  backButton: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 4,
  },

  backText: {
    fontSize: 36,
    fontWeight: "300",
    color: "#111827",
  },

  groupAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#EDE9FE",
    alignItems: "center",
    justifyContent: "center",
  },

  groupAvatarText: {
    fontSize: 23,
  },

  headerInfo: {
    flex: 1,
    marginLeft: 12,
  },

  headerName: {
    fontSize: 16,
    fontWeight: "700",
    color: "#111827",
  },

  headerSubtitle: {
    marginTop: 3,
    fontSize: 12,
    color: "#6B7280",
  },

  messagesList: {
    paddingHorizontal: 14,
    paddingVertical: 16,
  },

  emptyMessages: {
    flexGrow: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 30,
  },

  messageRow: {
    width: "100%",
    marginBottom: 8,
    flexDirection: "row",
  },

  myMessageRow: {
    justifyContent: "flex-end",
  },

  theirMessageRow: {
    justifyContent: "flex-start",
  },

  messageBubble: {
    maxWidth: "78%",
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 9,
  },

  myBubble: {
    backgroundColor: "#2563EB",
    borderBottomRightRadius: 5,
  },

  theirBubble: {
    backgroundColor: "#FFFFFF",
    borderBottomLeftRadius: 5,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },

  senderName: {
    fontSize: 11,
    fontWeight: "700",
    color: "#2563EB",
    marginBottom: 4,
  },

  messageText: {
    fontSize: 15,
    lineHeight: 21,
  },

  myMessageText: {
    color: "#FFFFFF",
  },

  theirMessageText: {
    color: "#111827",
  },

  time: {
    fontSize: 9,
    marginTop: 4,
    alignSelf: "flex-end",
  },

  myTime: {
    color: "#DBEAFE",
  },

  theirTime: {
    color: "#9CA3AF",
  },

  messageImage: {
    width: 220,
    height: 220,
    borderRadius: 12,
  },

  emptyChat: {
    alignItems: "center",
  },

  emptyIcon: {
    fontSize: 50,
    marginBottom: 15,
  },

  emptyTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#111827",
    textAlign: "center",
  },

  emptyText: {
    marginTop: 8,
    color: "#6B7280",
    textAlign: "center",
  },

  imagePreviewContainer: {
    height: 100,
    backgroundColor: "#FFFFFF",
    borderTopWidth: 1,
    borderTopColor: "#E5E7EB",
    padding: 10,
  },

  imagePreview: {
    width: 80,
    height: 80,
    borderRadius: 10,
  },

  removeImageButton: {
    position: "absolute",
    left: 78,
    top: 2,
    width: 25,
    height: 25,
    borderRadius: 13,
    backgroundColor: "#111827",
    alignItems: "center",
    justifyContent: "center",
  },

  removeImageText: {
    color: "#FFFFFF",
    fontSize: 18,
  },

  inputContainer: {
    minHeight: 62,
    backgroundColor: "#FFFFFF",
    borderTopWidth: 1,
    borderTopColor: "#E5E7EB",
    flexDirection: "row",
    alignItems: "flex-end",
    paddingHorizontal: 10,
    paddingVertical: 9,
  },

  attachButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#EFF6FF",
    marginRight: 8,
  },

  attachText: {
    fontSize: 27,
    color: "#2563EB",
  },

  textInput: {
    flex: 1,
    minHeight: 42,
    maxHeight: 110,
    backgroundColor: "#F3F4F6",
    borderRadius: 21,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 15,
    color: "#111827",
    marginRight: 8,
  },

  sendButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#2563EB",
  },

  sendDisabled: {
    opacity: 0.4,
  },

  sendText: {
    color: "#FFFFFF",
    fontSize: 25,
    fontWeight: "700",
  },
});