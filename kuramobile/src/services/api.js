import { API_URL } from "../config";
import * as FileSystem from "expo-file-system/legacy";

// =====================================================
// CLOUDINARY CONFIG
// =====================================================

const CLOUDINARY_CLOUD_NAME = "undnmzf1";
const CLOUDINARY_UPLOAD_PRESET = "kura_mobile";

const CLOUDINARY_UPLOAD_URL =
  `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`;

// =====================================================
// GENERIC API REQUEST
// =====================================================

const request = async (endpoint, options = {}) => {
  try {
    const response = await fetch(
      `${API_URL}${endpoint}`,
      {
        ...options,

        headers: {
          "Content-Type": "application/json",
          ...(options.headers || {}),
        },
      }
    );

    const text = await response.text();

    let data = {};

    try {
      data = text ? JSON.parse(text) : {};
    } catch (error) {
      console.error(
        "Invalid JSON response:",
        text
      );

      throw new Error(
        "Server returned an invalid response."
      );
    }

    if (!response.ok) {
      throw new Error(
        data?.message ||
          "Something went wrong."
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
// CLOUDINARY UPLOAD
// =====================================================
//
// This function is used for:
//
// 1. Profile photos
// 2. Private message photos
// 3. Group message photos
//
// IMPORTANT:
// No FormData is used here.
//
// Expo FileSystem uploads the local file
// directly to Cloudinary.
//
// =====================================================

const uploadToCloudinary = async (
  uri,
  folder,
  mimeType = "image/jpeg"
) => {
  try {
    if (!uri) {
      throw new Error(
        "Image URI is missing."
      );
    }

    console.log(
      "================================="
    );

    console.log(
      "CLOUDINARY UPLOAD"
    );

    console.log(
      "URI:",
      uri
    );

    console.log(
      "Folder:",
      folder
    );

    console.log(
      "MIME:",
      mimeType
    );

    console.log(
      "Cloud name:",
      CLOUDINARY_CLOUD_NAME
    );

    console.log(
      "Upload preset:",
      CLOUDINARY_UPLOAD_PRESET
    );

    console.log(
      "================================="
    );

    // -------------------------------------------------
    // Upload directly to Cloudinary
    // -------------------------------------------------

    const result =
      await FileSystem.uploadAsync(
        CLOUDINARY_UPLOAD_URL,
        uri,
        {
          httpMethod: "POST",

          uploadType:
            FileSystem.FileSystemUploadType.MULTIPART,

          fieldName: "file",

          mimeType:
            mimeType || "image/jpeg",

          parameters: {
            upload_preset:
              CLOUDINARY_UPLOAD_PRESET,

            folder: folder,
          },
        }
      );

    console.log(
      "Cloudinary HTTP status:",
      result.status
    );

    console.log(
      "Cloudinary response:",
      result.body
    );

    // -------------------------------------------------
    // Check response
    // -------------------------------------------------

    if (
      result.status < 200 ||
      result.status >= 300
    ) {
      let errorMessage =
        "Cloudinary upload failed.";

      try {
        const errorData =
          JSON.parse(result.body);

        errorMessage =
          errorData?.error?.message ||
          errorMessage;
      } catch (error) {
        // Ignore JSON parsing error
      }

      throw new Error(
        errorMessage
      );
    }

    // -------------------------------------------------
    // Parse Cloudinary response
    // -------------------------------------------------

    let data = {};

    try {
      data =
        result.body
          ? JSON.parse(result.body)
          : {};
    } catch (error) {
      console.error(
        "Cloudinary JSON error:",
        result.body
      );

      throw new Error(
        "Invalid response from Cloudinary."
      );
    }

    // -------------------------------------------------
    // Get secure URL
    // -------------------------------------------------

    const imageUrl =
      data?.secure_url;

    if (!imageUrl) {
      console.error(
        "Cloudinary did not return secure_url:",
        data
      );

      throw new Error(
        "Cloudinary did not return an image URL."
      );
    }

    console.log(
      "================================="
    );

    console.log(
      "CLOUDINARY UPLOAD SUCCESS"
    );

    console.log(
      "Image URL:",
      imageUrl
    );

    console.log(
      "================================="
    );

    return imageUrl;
  } catch (error) {
    console.error(
      "Cloudinary upload error:",
      error
    );

    throw error;
  }
};

// =====================================================
// USERS
// =====================================================

// -----------------------------------------------------
// GET ALL USERS
// GET /api/users
// -----------------------------------------------------

export const getUsers = () => {
  return request(
    "/api/users"
  );
};

// -----------------------------------------------------
// REGISTER USER
// POST /api/users/register
// -----------------------------------------------------
//
// Profile photo is uploaded directly to:
//
// Cloudinary
//     ↓
// kura/profiles
//
// Then only the Cloudinary URL is sent
// to your Node.js server.
//
// -----------------------------------------------------

export const registerUser = async ({
  name,
  username,
  password,
  profilePhoto,
}) => {
  try {
    console.log(
      "================================="
    );

    console.log(
      "REGISTER USER"
    );

    console.log(
      "Name:",
      name
    );

    console.log(
      "Username:",
      username
    );

    console.log(
      "Has profile photo:",
      !!profilePhoto
    );

    console.log(
      "================================="
    );

    let profilePhotoUrl = "";

    // =================================================
    // UPLOAD PROFILE PHOTO
    // =================================================

    if (
      profilePhoto &&
      profilePhoto.uri
    ) {
      profilePhotoUrl =
        await uploadToCloudinary(
          profilePhoto.uri,
          "kura/profiles",
          profilePhoto.mimeType ||
            "image/jpeg"
        );
    }

    // =================================================
    // SEND USER TO SERVER
    // =================================================

    console.log(
      "Sending user information to server..."
    );

    const response =
      await fetch(
        `${API_URL}/api/users/register`,
        {
          method: "POST",

          headers: {
            "Content-Type":
              "application/json",
          },

          body: JSON.stringify({
            name: name.trim(),

            username:
              username.trim(),

            password,

            profilePhoto:
              profilePhotoUrl,
          }),
        }
      );

    const text =
      await response.text();

    console.log(
      "Registration HTTP status:",
      response.status
    );

    console.log(
      "Registration response:",
      text
    );

    let data = {};

    try {
      data = text
        ? JSON.parse(text)
        : {};
    } catch (error) {
      throw new Error(
        "Invalid server response."
      );
    }

    if (!response.ok) {
      throw new Error(
        data?.message ||
          "Could not register user."
      );
    }

    console.log(
      "================================="
    );

    console.log(
      "REGISTRATION SUCCESSFUL"
    );

    console.log(
      "Profile URL:",
      profilePhotoUrl
    );

    console.log(
      "================================="
    );

    return data;
  } catch (error) {
    console.error(
      "Registration error:",
      error
    );

    throw error;
  }
};

// =====================================================
// GROUPS
// =====================================================

// -----------------------------------------------------
// GET GROUPS FOR USER
// -----------------------------------------------------

export const getGroups = (
  userId
) => {
  return request(
    `/api/groups/user/${userId}`
  );
};

// -----------------------------------------------------
// CREATE GROUP
// -----------------------------------------------------

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

// -----------------------------------------------------
// GET PRIVATE MESSAGES
// -----------------------------------------------------

export const getPrivateMessages = (
  user1,
  user2
) => {
  return request(
    `/api/messages/private/${user1}/${user2}`
  );
};

// -----------------------------------------------------
// SEND PRIVATE MESSAGE
// -----------------------------------------------------

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

// -----------------------------------------------------
// GET GROUP MESSAGES
// -----------------------------------------------------

export const getGroupMessages = (
  groupId
) => {
  return request(
    `/api/messages/group/${groupId}`
  );
};

// -----------------------------------------------------
// SEND GROUP MESSAGE
// -----------------------------------------------------

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
// UPLOAD MESSAGE IMAGE
// =====================================================
//
// Used for:
//
// Private message image
// Group message image
//
// Upload:
//
// iOS
//   ↓
// Cloudinary
//   ↓
// kura/messages
//   ↓
// secure_url
//
// No FormData is used.
//
// =====================================================

export const uploadImage = async (
  image
) => {
  try {
    // -------------------------------------------------
    // Validate
    // -------------------------------------------------

    if (!image) {
      throw new Error(
        "No image selected."
      );
    }

    if (!image.uri) {
      throw new Error(
        "Image URI is missing."
      );
    }

    // -------------------------------------------------
    // Upload directly to Cloudinary
    // -------------------------------------------------

    const imageUrl =
      await uploadToCloudinary(
        image.uri,
        "kura/messages",
        image.mimeType ||
          "image/jpeg"
      );

    console.log(
      "Message image uploaded:"
    );

    console.log(
      imageUrl
    );

    return imageUrl;
  } catch (error) {
    console.error(
      "Upload image error:",
      error
    );

    throw error;
  }
};

// =====================================================
// SERVER HEALTH CHECK
// =====================================================

export const checkServer =
  async () => {
    try {
      const response =
        await fetch(
          `${API_URL}/`
        );

      const data =
        await response.json();

      return data;
    } catch (error) {
      console.error(
        "Server health check error:",
        error
      );

      throw error;
    }
  };

// =====================================================
// DEFAULT EXPORT
// =====================================================

export default {
  getUsers,
  registerUser,

  getGroups,
  createGroup,

  getPrivateMessages,
  sendPrivateMessage,

  getGroupMessages,
  sendGroupMessage,

  uploadImage,

  checkServer,
};