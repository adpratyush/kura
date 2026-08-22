const express = require("express");
const multer = require("multer");
const path = require("path");

const Message = require("../models/Message");
const Group = require("../models/Group");

const router = express.Router();

// ==========================================
// MULTER IMAGE UPLOAD CONFIGURATION
// ==========================================

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "uploads/");
  },

  filename: (req, file, cb) => {
    const extension = path.extname(file.originalname);

    const filename =
      Date.now() +
      "-" +
      Math.round(Math.random() * 1e9) +
      extension;

    cb(null, filename);
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
      cb(new Error("Only image files are allowed"));
    }
  },
});

// ==========================================
// UPLOAD IMAGE
// ==========================================

router.post(
  "/upload-image",
  upload.single("image"),
  async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({
          message: "No image uploaded",
        });
      }

      const imageUrl = `/uploads/${req.file.filename}`;

      res.status(201).json({
        message: "Image uploaded successfully",
        imageUrl,
      });
    } catch (error) {
      console.error("Image upload error:", error);

      res.status(500).json({
        message: "Image upload failed",
      });
    }
  }
);

// ==========================================
// SEND PRIVATE MESSAGE
// ==========================================

router.post("/private", async (req, res) => {
  try {
    const {
      sender,
      receiver,
      type = "text",
      message = "",
      imageUrl = "",
    } = req.body;

    if (!sender || !receiver) {
      return res.status(400).json({
        message: "Sender and receiver are required",
      });
    }

    if (type === "text" && !message.trim()) {
      return res.status(400).json({
        message: "Message cannot be empty",
      });
    }

    if (type === "image" && !imageUrl) {
      return res.status(400).json({
        message: "Image URL is required",
      });
    }

    const newMessage = await Message.create({
      sender,
      receiver,
      type,
      message: type === "text" ? message : "",
      imageUrl: type === "image" ? imageUrl : "",
    });

    const populatedMessage = await Message.findById(
      newMessage._id
    )
      .populate("sender", "username name profilePhoto")
      .populate("receiver", "username name profilePhoto");

    res.status(201).json(populatedMessage);
  } catch (error) {
    console.error(error);

    res.status(500).json({
      message: "Server error",
    });
  }
});

// ==========================================
// GET PRIVATE CONVERSATION
// ==========================================

router.get(
  "/private/:user1/:user2",
  async (req, res) => {
    try {
      const { user1, user2 } = req.params;

      const messages = await Message.find({
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
        .sort({ createdAt: 1 });

      res.json(messages);
    } catch (error) {
      console.error(error);

      res.status(500).json({
        message: "Server error",
      });
    }
  }
);

// ==========================================
// SEND GROUP MESSAGE
// ==========================================

router.post("/group", async (req, res) => {
  try {
    const {
      sender,
      group,
      type = "text",
      message = "",
      imageUrl = "",
    } = req.body;

    if (!sender || !group) {
      return res.status(400).json({
        message: "Sender and group are required",
      });
    }

    const existingGroup =
      await Group.findById(group);

    if (!existingGroup) {
      return res.status(404).json({
        message: "Group not found",
      });
    }

    // Check whether sender belongs to group

    const isMember =
      existingGroup.members.some(
        (member) =>
          member.toString() === sender
      );

    if (!isMember) {
      return res.status(403).json({
        message:
          "You are not a member of this group",
      });
    }

    if (
      type === "text" &&
      !message.trim()
    ) {
      return res.status(400).json({
        message: "Message cannot be empty",
      });
    }

    if (
      type === "image" &&
      !imageUrl
    ) {
      return res.status(400).json({
        message: "Image URL is required",
      });
    }

    const newMessage =
      await Message.create({
        sender,
        group,
        type,
        message:
          type === "text"
            ? message
            : "",
        imageUrl:
          type === "image"
            ? imageUrl
            : "",
      });

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
          "name"
        );

    res.status(201).json(
      populatedMessage
    );
  } catch (error) {
    console.error(error);

    res.status(500).json({
      message: "Server error",
    });
  }
});

// ==========================================
// GET GROUP CONVERSATION
// ==========================================

router.get(
  "/group/:groupId",
  async (req, res) => {
    try {
      const messages =
        await Message.find({
          group:
            req.params.groupId,
        })
          .populate(
            "sender",
            "username name profilePhoto"
          )
          .populate(
            "group",
            "name"
          )
          .sort({
            createdAt: 1,
          });

      res.json(messages);
    } catch (error) {
      console.error(error);

      res.status(500).json({
        message: "Server error",
      });
    }
  }
);

module.exports = router;