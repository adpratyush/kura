const express = require("express");
const bcrypt = require("bcryptjs");
const multer = require("multer");
const {
  CloudinaryStorage,
} = require("multer-storage-cloudinary");

const cloudinary = require("../config/cloudinary");
const User = require("../models/User");

const router = express.Router();

// =====================================================
// MULTER + CLOUDINARY
// USED BY WEB APP
// =====================================================

const storage = new CloudinaryStorage({
  cloudinary,

  params: {
    folder: "kura/profilePhoto",
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
// REGISTER
//
// WEB:
// multipart/form-data
// profilePhoto = actual image
// ↓
// Multer
// ↓
// Cloudinary
//
// IOS:
// application/json
// profilePhoto = Cloudinary URL
// =====================================================

router.post(
  "/register",
  upload.single("profilePhoto"),
  async (req, res) => {
    try {
      console.log(
        "================================="
      );

      console.log(
        "REGISTER REQUEST"
      );

      console.log(
        "Content-Type:",
        req.headers["content-type"]
      );

      console.log(
        "Body:",
        req.body
      );

      console.log(
        "File:",
        req.file
      );

      console.log(
        "================================="
      );

      const {
        name,
        username,
        password,
      } = req.body;

      // =================================================
      // VALIDATION
      // =================================================

      if (
        !name ||
        !username ||
        !password
      ) {
        return res.status(400).json({
          message:
            "Name, username and password are required.",
        });
      }

      if (password.length < 6) {
        return res.status(400).json({
          message:
            "Password must be at least 6 characters.",
        });
      }

      // =================================================
      // USERNAME
      // =================================================

      const cleanUsername =
        username
          .trim()
          .toLowerCase();

      const existingUser =
        await User.findOne({
          username: cleanUsername,
        });

      if (existingUser) {
        return res.status(400).json({
          message:
            "Username already exists.",
        });
      }

      // =================================================
      // PASSWORD
      // =================================================

      const hashedPassword =
        await bcrypt.hash(
          password,
          10
        );

      // =================================================
      // PROFILE PHOTO
      // =================================================

      let profilePhoto = "";

      // -------------------------------------------------
      // WEB
      // Multer uploaded the photo to Cloudinary
      // -------------------------------------------------

      if (req.file) {
        profilePhoto =
          req.file.path;

        console.log(
          "WEB PHOTO URL:",
          profilePhoto
        );
      }

      // -------------------------------------------------
      // IOS
      // App already uploaded to Cloudinary
      // and sent the URL as JSON
      // -------------------------------------------------

      else if (
        req.body.profilePhoto
      ) {
        profilePhoto =
          req.body.profilePhoto;

        console.log(
          "IOS PHOTO URL:",
          profilePhoto
        );
      }

      // =================================================
      // CREATE USER
      // =================================================

      const user =
        await User.create({
          name: name.trim(),

          username:
            cleanUsername,

          password:
            hashedPassword,

          profilePhoto,
        });

      // =================================================
      // SAFE USER
      // =================================================

      const safeUser =
        await User.findById(
          user._id
        ).select("-password");

      console.log(
        "USER CREATED:",
        safeUser
      );

      // =================================================
      // RESPONSE
      // =================================================

      return res.status(201).json({
        message:
          "User registered successfully.",

        user: safeUser,
      });
    } catch (error) {
      console.error(
        "REGISTRATION ERROR:",
        error
      );

      return res.status(500).json({
        message:
          "Could not register user.",

        error:
          error.message,
      });
    }
  }
);

// =====================================================
// LOGIN
// =====================================================

router.post(
  "/login",
  async (req, res) => {
    try {
      const {
        username,
        password,
      } = req.body;

      if (
        !username ||
        !password
      ) {
        return res.status(400).json({
          message:
            "Username and password are required.",
        });
      }

      const cleanUsername =
        username
          .trim()
          .toLowerCase();

      const user =
        await User.findOne({
          username:
            cleanUsername,
        });

      if (!user) {
        return res.status(401).json({
          message:
            "Invalid username or password.",
        });
      }

      const passwordMatch =
        await bcrypt.compare(
          password,
          user.password
        );

      if (!passwordMatch) {
        return res.status(401).json({
          message:
            "Invalid username or password.",
        });
      }

      const safeUser =
        await User.findById(
          user._id
        ).select("-password");

      return res.json({
        message:
          "Login successful.",

        user: safeUser,
      });
    } catch (error) {
      console.error(
        "Login error:",
        error
      );

      return res.status(500).json({
        message:
          "Could not login.",
      });
    }
  }
);

// =====================================================
// GET ALL USERS
// =====================================================

router.get(
  "/",
  async (req, res) => {
    try {
      const users =
        await User.find()
          .select("-password")
          .sort({
            username: 1,
          });

      return res.json(users);
    } catch (error) {
      console.error(
        "Get users error:",
        error
      );

      return res.status(500).json({
        message:
          "Could not load users.",
      });
    }
  }
);

module.exports = router;