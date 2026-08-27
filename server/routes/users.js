const express = require("express");
const bcrypt = require("bcryptjs");

const User = require("../models/User");

const router = express.Router();

// =====================================================
// REGISTER USER
// POST /api/users/register
// =====================================================
//
// The profile photo is uploaded directly from the app
// to Cloudinary.
//
// The server receives only the Cloudinary URL.
//
// Example:
// https://res.cloudinary.com/undnmzf1/image/upload/...
//
// =====================================================

router.post("/register", async (req, res) => {
  try {
    const {
      name,
      username,
      password,
      profilePhoto,
    } = req.body;

    console.log("========== REGISTER ==========");
    console.log("Name:", name);
    console.log("Username:", username);
    console.log("Has profile photo:", !!profilePhoto);
    console.log("Profile photo:", profilePhoto);

    // =================================================
    // VALIDATION
    // =================================================

    if (!name || !username || !password) {
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
    // CLEAN USERNAME
    // =================================================

    const cleanUsername =
      username.trim().toLowerCase();

    // =================================================
    // CHECK EXISTING USER
    // =================================================

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
    // HASH PASSWORD
    // =================================================

    const hashedPassword =
      await bcrypt.hash(password, 10);

    // =================================================
    // CREATE USER
    // =================================================

    const user = await User.create({
      name: name.trim(),

      username: cleanUsername,

      password: hashedPassword,

      profilePhoto:
        profilePhoto || "",
    });

    // =================================================
    // REMOVE PASSWORD FROM RESPONSE
    // =================================================

    const safeUser =
      await User.findById(
        user._id
      ).select("-password");

    console.log(
      "User registered successfully:",
      safeUser.username
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
      "Registration error:",
      error
    );

    return res.status(500).json({
      message:
        "Could not register user.",
    });
  }
});

// =====================================================
// LOGIN
// POST /api/users/login
// =====================================================

router.post("/login", async (req, res) => {
  try {
    const {
      username,
      password,
    } = req.body;

    if (!username || !password) {
      return res.status(400).json({
        message:
          "Username and password are required.",
      });
    }

    const cleanUsername =
      username.trim().toLowerCase();

    const user =
      await User.findOne({
        username: cleanUsername,
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
});

// =====================================================
// GET ALL USERS
// GET /api/users
// =====================================================

router.get("/", async (req, res) => {
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
});

module.exports = router;