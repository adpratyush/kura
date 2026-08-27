import { API_URL } from "../config";

const request = async (
  endpoint,
  options = {}
) => {
  try {
    const response = await fetch(
      `${API_URL}${endpoint}`,
      {
        ...options,

        headers: {
          "Content-Type":
            "application/json",

          ...(options.headers || {}),
        },
      }
    );

    const data =
      await response.json();

    if (!response.ok) {
      throw new Error(
        data.message ||
          "Something went wrong"
      );
    }

    return data;
  } catch (error) {
    console.error(
      `API ${endpoint}:`,
      error
    );

    throw error;
  }
};

// =====================================================
// USERS
// =====================================================

export const getUsers = () => {
  return request("/api/users");
};

// =====================================================
// GROUPS
// =====================================================

export const getGroups = (
  userId
) => {
  return request(
    `/api/groups/user/${userId}`
  );
};

export const createGroup = ({
  name,
  admin,
  members,
}) => {
  return request(
    "/api/groups",
    {
      method: "POST",

      body: JSON.stringify({
        name,
        admin,
        members,
      }),
    }
  );
};

// =====================================================
// PRIVATE MESSAGES
// =====================================================

export const getPrivateMessages = (
  user1,
  user2
) => {
  return request(
    `/api/messages/private/${user1}/${user2}`
  );
};

export const sendPrivateMessage = ({
  sender,
  receiver,
  message,
  type = "text",
  imageUrl = "",
}) => {
  return request(
    "/api/messages/private",
    {
      method: "POST",

      body: JSON.stringify({
        sender,
        receiver,
        message,
        type,
        imageUrl,
      }),
    }
  );
};

// =====================================================
// GROUP MESSAGES
// =====================================================

export const getGroupMessages = (
  groupId
) => {
  return request(
    `/api/messages/group/${groupId}`
  );
};

export const sendGroupMessage = ({
  sender,
  group,
  message,
  type = "text",
  imageUrl = "",
}) => {
  return request(
    "/api/messages/group",
    {
      method: "POST",

      body: JSON.stringify({
        sender,
        group,
        message,
        type,
        imageUrl,
      }),
    }
  );
};

// =====================================================
// IMAGE UPLOAD
// =====================================================

export const uploadImage = async (
  image
) => {
  const formData =
    new FormData();

  formData.append("image", {
    uri: image.uri,
    name:
      image.fileName ||
      `image-${Date.now()}.jpg`,
    type:
      image.mimeType ||
      "image/jpeg",
  });

  const response =
    await fetch(
      `${API_URL}/api/messages/upload-image`,
      {
        method: "POST",

        body: formData,
      }
    );

  const data =
    await response.json();

  if (!response.ok) {
    throw new Error(
      data.message ||
        "Image upload failed"
    );
  }

  return (
    data.imageUrl ||
    data.url ||
    data.path
  );
};