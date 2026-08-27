import React from "react";
import { useLocalSearchParams } from "expo-router";

import ChatScreen from "../screens/ChatScreen";
import GroupChatScreen from "../screens/GroupChatScreen";

export default function ChatRoute() {
  const params =
    useLocalSearchParams();

  const type =
    Array.isArray(params.type)
      ? params.type[0]
      : params.type;

  const userId =
    Array.isArray(params.userId)
      ? params.userId[0]
      : params.userId;

  const userName =
    Array.isArray(params.userName)
      ? params.userName[0]
      : params.userName;

  const username =
    Array.isArray(params.username)
      ? params.username[0]
      : params.username;

  const profilePhoto =
    Array.isArray(params.profilePhoto)
      ? params.profilePhoto[0]
      : params.profilePhoto;

  const groupId =
    Array.isArray(params.groupId)
      ? params.groupId[0]
      : params.groupId;

  const groupName =
    Array.isArray(params.groupName)
      ? params.groupName[0]
      : params.groupName;

  // ===================================================
  // GROUP CHAT
  // ===================================================

  if (
    type === "group" &&
    groupId
  ) {
    return (
      <GroupChatScreen
        groupId={groupId}
        groupName={
          groupName || "Group"
        }
      />
    );
  }

  // ===================================================
  // PRIVATE CHAT
  // ===================================================

  if (
    type === "private" &&
    userId
  ) {
    return (
      <ChatScreen
        userId={userId}
        name={userName}
        username={username}
        profilePhoto={
          profilePhoto
        }
      />
    );
  }

  return null;
}