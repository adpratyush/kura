const express = require("express");
const bcrypt = require("bcryptjs");
const multer = require("multer");
const path = require("path");
const fs = require("fs");

const User = require("../models/User");

const router = express.Router();

// ==========================================
// PROFILE PHOTO UPLOAD
// ==========================================

const uploadDir = path.join(__dirname, "../uploads/profiles");

if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, {
    recursive: true,
  });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },

  filename: (req, file, cb) => {
    const extension = path.extname(file.originalname);

    cb(
      null,
      `${Date.now()}-${Math.round(Math.random() * 1e9)}${extension}`
    );
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
// REGISTER
// ==========================================

router.post("/register", upload.single("profilePhoto"), async (req, res) => {
  try {
    const { name, username, password } = req.body;

    if (!name || !username || !password) {
      return res.status(400).json({
        message: "Name, username and password are required",
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        message: "Password must be at least 6 characters",
      });
    }

    const cleanUsername = username.trim().toLowerCase();

    const existingUser = await User.findOne({
      username: cleanUsername,
    });

    if (existingUser) {
      return res.status(400).json({
        message: "Username already exists",
      });
    }

    // Hash the password before saving
    const hashedPassword = await bcrypt.hash(password, 10);

    let profilePhoto = "";

    if (req.file) {
      profilePhoto = `/uploads/profiles/${req.file.filename}`;
    }

    const user = await User.create({
      name: name.trim(),
      username: cleanUsername,
      password: hashedPassword,
      profilePhoto,
    });

    res.status(201).json({
      message: "User registered successfully",

      user: {
        _id: user._id,
        name: user.name,
        username: user.username,
        profilePhoto: user.profilePhoto,
      },
    });
  } catch (error) {
    console.error("Registration error:", error);

    res.status(500).json({
      message: "Server error",
    });
  }
});

// ==========================================
// LOGIN
// ==========================================

router.post("/login", async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({
        message: "Username and password are required",
      });
    }

    const user = await User.findOne({
      username: username.trim().toLowerCase(),
    });

    if (!user) {
      return res.status(401).json({
        message: "Invalid username or password",
      });
    }

    const passwordMatch = await bcrypt.compare(
      password,
      user.password
    );

    if (!passwordMatch) {
      return res.status(401).json({
        message: "Invalid username or password",
      });
    }

    res.json({
      message: "Login successful",

      user: {
        _id: user._id,
        name: user.name,
        username: user.username,
        profilePhoto: user.profilePhoto,
      },
    });
  } catch (error) {
    console.error("Login error:", error);

    res.status(500).json({
      message: "Server error",
    });
  }
});

// ==========================================
// GET ALL USERS
// ==========================================

router.get("/", async (req, res) => {
  try {
    const users = await User.find()
      .select("-password")
      .sort({ username: 1 });

    res.json(users);
  } catch (error) {
    console.error("Get users error:", error);

    res.status(500).json({
      message: "Server error",
    });
  }
});

module.exports = router;
