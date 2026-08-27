import React from "react";
import { useLocalSearchParams } from "expo-router";

import GroupChatScreen from "../screens/GroupChatScreen";

export default function GroupChatRoute() {
  const {
    groupId,
    groupName,
    groupPhoto,
  } = useLocalSearchParams();

  return (
    <GroupChatScreen
      groupId={String(groupId || "")}
      groupName={String(groupName || "Group")}
      groupPhoto={String(groupPhoto || "")}
    />
  );
}