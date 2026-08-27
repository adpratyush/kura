const express = require("express");
const multer = require("multer");
const {
  CloudinaryStorage,
} = require("multer-storage-cloudinary");

const cloudinary = require("../config/cloudinary");

const Message = require("../models/Message");
const Group = require("../models/Group");
const User = require("../models/User");

const router = express.Router();

// =====================================================
// CLOUDINARY MESSAGE IMAGE STORAGE
// =====================================================

const storage = new CloudinaryStorage({
  cloudinary,

  params: {
    folder: "kura/messages",
    allowed_formats: [
      "jpg",
      "jpeg",
      "png",
      "webp",
    ],
  },
});

const upload = multer({
  storage,

  limits: {
    fileSize: 5 * 1024 * 1024,
  },

  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith("image/")) {
      cb(null, true);
    } else {
      cb(
        new Error(
          "Only image files are allowed."
        )
      );
    }
  },
});

// =====================================================
// UPLOAD MESSAGE IMAGE
// POST /api/messages/upload-image
// =====================================================

router.post(
  "/upload-image",
  upload.single("image"),
  async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({
          message:
            "No image uploaded.",
        });
      }

      return res.status(201).json({
        success: true,

        imageUrl:
          req.file.path,
      });
    } catch (error) {
      console.error(
        "Message image upload error:",
        error
      );

      return res.status(500).json({
        message:
          "Image upload failed.",
      });
    }
  }
);

// =====================================================
// SEND PRIVATE MESSAGE
// POST /api/messages/private
// =====================================================

router.post(
  "/private",
  async (req, res) => {
    try {
      const {
        sender,
        receiver,
        type = "text",
        message = "",
        imageUrl = "",
      } = req.body;

      // -------------------------------------------------
      // VALIDATION
      // -------------------------------------------------

      if (!sender || !receiver) {
        return res.status(400).json({
          message:
            "Sender and receiver are required.",
        });
      }

      if (
        !User.db
      ) {
        return res.status(500).json({
          message:
            "Database unavailable.",
        });
      }

      // -------------------------------------------------
      // CHECK USERS
      // -------------------------------------------------

      const senderUser =
        await User.findById(sender);

      const receiverUser =
        await User.findById(receiver);

      if (!senderUser) {
        return res.status(404).json({
          message:
            "Sender not found.",
        });
      }

      if (!receiverUser) {
        return res.status(404).json({
          message:
            "Receiver not found.",
        });
      }

      // -------------------------------------------------
      // TEXT VALIDATION
      // -------------------------------------------------

      if (
        type !== "image" &&
        !String(message).trim()
      ) {
        return res.status(400).json({
          message:
            "Message cannot be empty.",
        });
      }

      // -------------------------------------------------
      // IMAGE VALIDATION
      // -------------------------------------------------

      if (
        type === "image" &&
        !imageUrl
      ) {
        return res.status(400).json({
          message:
            "Image URL is required.",
        });
      }

      // -------------------------------------------------
      // SAVE ONCE
      // -------------------------------------------------

      const newMessage =
        await Message.create({
          sender,

          receiver,

          type:
            type === "image"
              ? "image"
              : "text",

          message:
            type === "image"
              ? ""
              : String(
                  message
                ).trim(),

          imageUrl:
            type === "image"
              ? imageUrl
              : "",
        });

      // -------------------------------------------------
      // POPULATE
      // -------------------------------------------------

      const populatedMessage =
        await Message.findById(
          newMessage._id
        )
          .populate(
            "sender",
            "username name profilePhoto"
          )
          .populate(
            "receiver",
            "username name profilePhoto"
          );

      // -------------------------------------------------
      // SOCKET.IO BROADCAST
      // -------------------------------------------------

      const io =
        req.app.get("io");

      if (io) {
        const roomId =
          getPrivateRoomId(
            sender,
            receiver
          );

        io.to(roomId).emit(
          "new_message",
          populatedMessage
        );

        // Also send to receiver's
        // personal room.
        //
        // This allows the receiver to
        // receive notifications even when
        // they aren't inside the chat.

        io.to(
          `user_${String(receiver)}`
        ).emit(
          "new_message",
          populatedMessage
        );
      }

      // -------------------------------------------------
      // RESPONSE
      // -------------------------------------------------

      return res.status(201).json(
        populatedMessage
      );
    } catch (error) {
      console.error(
        "Private message error:",
        error
      );

      return res.status(500).json({
        message:
          "Could not send message.",
      });
    }
  }
);

// =====================================================
// GET PRIVATE CONVERSATION
// GET /api/messages/private/:user1/:user2
// =====================================================

router.get(
  "/private/:user1/:user2",
  async (req, res) => {
    try {
      const {
        user1,
        user2,
      } = req.params;

      const messages =
        await Message.find({
          $or: [
            {
              sender: user1,
              receiver: user2,
            },

            {
              sender: user2,
              receiver: user1,
            },
          ],
        })
          .populate(
            "sender",
            "username name profilePhoto"
          )
          .populate(
            "receiver",
            "username name profilePhoto"
          )
          .sort({
            createdAt: 1,
          });

      return res.json(messages);
    } catch (error) {
      console.error(
        "Get private messages error:",
        error
      );

      return res.status(500).json({
        message:
          "Could not load messages.",
      });
    }
  }
);

// =====================================================
// SEND GROUP MESSAGE
// POST /api/messages/group
// =====================================================

router.post(
  "/group",
  async (req, res) => {
    try {
      const {
        sender,
        group,
        type = "text",
        message = "",
        imageUrl = "",
      } = req.body;

      // -------------------------------------------------
      // VALIDATION
      // -------------------------------------------------

      if (!sender || !group) {
        return res.status(400).json({
          message:
            "Sender and group are required.",
        });
      }

      // -------------------------------------------------
      // FIND GROUP
      // -------------------------------------------------

      const existingGroup =
        await Group.findById(group);

      if (!existingGroup) {
        return res.status(404).json({
          message:
            "Group not found.",
        });
      }

      // -------------------------------------------------
      // CHECK MEMBERSHIP
      // -------------------------------------------------

      const isMember =
        existingGroup.members.some(
          (memberId) =>
            String(memberId) ===
            String(sender)
        );

      if (!isMember) {
        return res.status(403).json({
          message:
            "You are not a member of this group.",
        });
      }

      // -------------------------------------------------
      // VALIDATE MESSAGE
      // -------------------------------------------------

      if (
        type !== "image" &&
        !String(message).trim()
      ) {
        return res.status(400).json({
          message:
            "Message cannot be empty.",
        });
      }

      if (
        type === "image" &&
        !imageUrl
      ) {
        return res.status(400).json({
          message:
            "Image URL is required.",
        });
      }

      // -------------------------------------------------
      // SAVE MESSAGE ONCE
      // -------------------------------------------------

      const newMessage =
        await Message.create({
          sender,

          group,

          type:
            type === "image"
              ? "image"
              : "text",

          message:
            type === "image"
              ? ""
              : String(
                  message
                ).trim(),

          imageUrl:
            type === "image"
              ? imageUrl
              : "",
        });

      // -------------------------------------------------
      // POPULATE
      // -------------------------------------------------

      const populatedMessage =
        await Message.findById(
          newMessage._id
        )
          .populate(
            "sender",
            "username name profilePhoto"
          )
          .populate(
            "group",
            "name groupPhoto"
          );

      // -------------------------------------------------
      // SOCKET.IO BROADCAST
      // -------------------------------------------------

      const io =
        req.app.get("io");

      if (io) {
        const roomId =
          `group_${String(group)}`;

        io.to(roomId).emit(
          "new_group_message",
          populatedMessage
        );

        // Also notify members personally.
        //
        // We don't send this to the sender because
        // sender already received it through the group
        // room.

        for (
          const memberId of
            existingGroup.members
        ) {
          if (
            String(memberId) ===
            String(sender)
          ) {
            continue;
          }

          io.to(
            `user_${String(memberId)}`
          ).emit(
            "new_group_message",
            populatedMessage
          );
        }
      }

      return res.status(201).json(
        populatedMessage
      );
    } catch (error) {
      console.error(
        "Group message error:",
        error
      );

      return res.status(500).json({
        message:
          "Could not send group message.",
      });
    }
  }
);

// =====================================================
// GET GROUP MESSAGES
// GET /api/messages/group/:groupId
// =====================================================

router.get(
  "/group/:groupId",
  async (req, res) => {
    try {
      const {
        groupId,
      } = req.params;

      const messages =
        await Message.find({
          group: groupId,
        })
          .populate(
            "sender",
            "username name profilePhoto"
          )
          .populate(
            "group",
            "name groupPhoto"
          )
          .sort({
            createdAt: 1,
          });

      return res.json(messages);
    } catch (error) {
      console.error(
        "Get group messages error:",
        error
      );

      return res.status(500).json({
        message:
          "Could not load group messages.",
      });
    }
  }
);

// =====================================================
// PRIVATE ROOM HELPER
// =====================================================

function getPrivateRoomId(
  user1,
  user2
) {
  return [
    String(user1),
    String(user2),
  ]
    .sort()
    .join("_");
}

// =====================================================
// EXPORT
// =====================================================

module.exports = router;