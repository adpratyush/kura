import { API_URL } from "../config";

// =====================================================
// GENERIC API REQUEST
// =====================================================

const request = async (endpoint, options = {}) => {
  try {
    const response = await fetch(`${API_URL}${endpoint}`, {
      ...options,

      headers: {
        "Content-Type": "application/json",
        ...(options.headers || {}),
      },
    });

    const text = await response.text();

    let data = {};

    try {
      data = text ? JSON.parse(text) : {};
    } catch (error) {
      console.error("Invalid JSON response:", text);

      throw new Error(
        "Server returned an invalid response."
      );
    }

    if (!response.ok) {
      throw new Error(
        data?.message || "Something went wrong."
      );
    }

    return data;
  } catch (error) {
    console.error(`API ${endpoint}:`, error);
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
  return request("/api/users");
};

// -----------------------------------------------------
// REGISTER USER
// POST /api/users/register
// -----------------------------------------------------

export const registerUser = async ({
  name,
  username,
  password,
  profilePhoto,
}) => {
  try {
    console.log("========== REGISTER ==========");
    console.log("Name:", name);
    console.log("Username:", username);
    console.log("Has photo:", !!profilePhoto);

    let cloudinaryUrl = "";

    // =================================================
    // UPLOAD PROFILE PHOTO DIRECTLY TO CLOUDINARY
    // =================================================

    if (profilePhoto?.uri) {
      console.log("Uploading profile photo...");

      const uri = profilePhoto.uri;

      const fileName =
        profilePhoto.fileName ||
        `profile-${Date.now()}.jpg`;

      const mimeType =
        profilePhoto.mimeType ||
        "image/jpeg";

      const cloudName =
        "undnmzf1";

      const uploadPreset =
        "kura_mobile";

      const cloudinaryForm =
        new FormData();

      cloudinaryForm.append(
        "file",
        {
          uri: uri,
          name: fileName,
          type: mimeType,
        }
      );

      cloudinaryForm.append(
        "upload_preset",
        uploadPreset
      );

      // This makes the image go into:
      //
      // kura/profiles/...
      //
      cloudinaryForm.append(
        "folder",
        "kura/profiles"
      );

      const cloudinaryResponse =
        await fetch(
          `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`,
          {
            method: "POST",
            body: cloudinaryForm,
          }
        );

      const cloudinaryText =
        await cloudinaryResponse.text();

      console.log(
        "Cloudinary status:",
        cloudinaryResponse.status
      );

      console.log(
        "Cloudinary response:",
        cloudinaryText
      );

      let cloudinaryData = {};

      try {
        cloudinaryData =
          cloudinaryText
            ? JSON.parse(cloudinaryText)
            : {};
      } catch {
        throw new Error(
          "Invalid Cloudinary response."
        );
      }

      if (!cloudinaryResponse.ok) {
        throw new Error(
          cloudinaryData?.error?.message ||
            "Profile photo upload failed."
        );
      }

      cloudinaryUrl =
        cloudinaryData.secure_url;

      if (!cloudinaryUrl) {
        throw new Error(
          "Cloudinary did not return an image URL."
        );
      }

      console.log(
        "Profile Cloudinary URL:",
        cloudinaryUrl
      );
    }

    // =================================================
    // REGISTER USER
    // =================================================

    const response = await fetch(
      `${API_URL}/api/users/register`,
      {
        method: "POST",

        headers: {
          "Content-Type":
            "application/json",
        },

        body: JSON.stringify({
          name: name.trim(),
          username: username.trim(),
          password: password,
          profilePhoto: cloudinaryUrl,
        }),
      }
    );

    const text =
      await response.text();

    console.log(
      "Registration status:",
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
    } catch {
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
      "Registration successful."
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
// GET /api/groups/user/:userId
// -----------------------------------------------------

export const getGroups = (userId) => {
  return request(
    `/api/groups/user/${userId}`
  );
};

// -----------------------------------------------------
// CREATE GROUP
// POST /api/groups
// -----------------------------------------------------

export const createGroup = ({
  name,
  admin,
  members,
}) => {
  return request("/api/groups", {
    method: "POST",

    body: JSON.stringify({
      name,
      admin,
      members,
    }),
  });
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
// UPLOAD IMAGE
// =====================================================
//
// Used for:
// - Private message images
// - Group message images
//
// React Native
//      ↓
// FormData
//      ↓
// Express
//      ↓
// Multer
//      ↓
// Cloudinary
//      ↓
// Cloudinary URL
//
// Backend should save images to:
// kura/messages
//
// IMPORTANT:
// Do NOT manually set Content-Type.
// =====================================================

export const uploadImage = async (image) => {
  try {
    // -------------------------------------------------
    // VALIDATE
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

    const uri = image.uri;

    // -------------------------------------------------
    // FILE NAME
    // -------------------------------------------------

    let fileName = image.fileName;

    if (!fileName) {
      fileName =
        uri.split("/").pop() ||
        `message-${Date.now()}.jpg`;
    }

    // -------------------------------------------------
    // MIME TYPE
    // -------------------------------------------------

    let mimeType = image.mimeType;

    if (!mimeType) {
      mimeType = "image/jpeg";
    }

    console.log(
      "================================="
    );

    console.log(
      "UPLOADING MESSAGE IMAGE"
    );

    console.log(
      "URI:",
      uri
    );

    console.log(
      "File name:",
      fileName
    );

    console.log(
      "MIME type:",
      mimeType
    );

    console.log(
      "Upload URL:",
      `${API_URL}/api/messages/upload-image`
    );

    console.log(
      "================================="
    );

    // -------------------------------------------------
    // CREATE FORMDATA
    // -------------------------------------------------

    const formData = new FormData();

    formData.append("image", {
      uri: uri,
      name: fileName,
      type: mimeType,
    });

    // -------------------------------------------------
    // UPLOAD
    // -------------------------------------------------

    const response = await fetch(
      `${API_URL}/api/messages/upload-image`,
      {
        method: "POST",
        body: formData,
      }
    );

    // -------------------------------------------------
    // RESPONSE
    // -------------------------------------------------

    const responseText =
      await response.text();

    console.log(
      "Upload status:",
      response.status
    );

    console.log(
      "Upload response:",
      responseText
    );

    let data = {};

    try {
      data = responseText
        ? JSON.parse(responseText)
        : {};
    } catch (error) {
      throw new Error(
        "Server returned an invalid upload response."
      );
    }

    if (!response.ok) {
      throw new Error(
        data?.message ||
          "Image upload failed."
      );
    }

    // -------------------------------------------------
    // GET CLOUDINARY URL
    // -------------------------------------------------

    const imageUrl =
      data?.imageUrl ||
      data?.url ||
      data?.secure_url ||
      data?.path;

    if (!imageUrl) {
      console.error(
        "Upload response did not contain image URL:",
        data
      );

      throw new Error(
        "Server did not return an image URL."
      );
    }

    console.log(
      "================================="
    );

    console.log(
      "CLOUDINARY IMAGE URL:"
    );

    console.log(imageUrl);

    console.log(
      "================================="
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

export const checkServer = async () => {
  try {
    const response = await fetch(
      `${API_URL}/`
    );

    const data = await response.json();

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