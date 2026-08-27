const express = require("express");
const bcrypt = require("bcryptjs");

const User = require("../models/User");

const router = express.Router();

// =====================================================
// REGISTER
// POST /api/users/register
// =====================================================

router.post(
  "/register",
  async (req, res) => {
    try {
      const {
        name,
        username,
        password,
        profilePhoto,
      } = req.body;

      // -------------------------------------------------
      // VALIDATE REQUIRED FIELDS
      // -------------------------------------------------

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

      // -------------------------------------------------
      // PASSWORD VALIDATION
      // -------------------------------------------------

      if (password.length < 6) {
        return res.status(400).json({
          message:
            "Password must be at least 6 characters.",
        });
      }

      // -------------------------------------------------
      // CLEAN USERNAME
      // -------------------------------------------------

      const cleanUsername =
        username
          .trim()
          .toLowerCase();

      // -------------------------------------------------
      // CHECK USERNAME
      // -------------------------------------------------

      const existingUser =
        await User.findOne({
          username:
            cleanUsername,
        });

      if (existingUser) {
        return res.status(400).json({
          message:
            "Username already exists.",
        });
      }

      // -------------------------------------------------
      // HASH PASSWORD
      // -------------------------------------------------

      const hashedPassword =
        await bcrypt.hash(
          password,
          10
        );

      // -------------------------------------------------
      // PROFILE PHOTO
      //
      // The iOS app uploads the image directly
      // to Cloudinary.
      //
      // The app then sends the Cloudinary URL here.
      // -------------------------------------------------

      const profilePhoto =
        profilePhoto ||
        "";

      // -------------------------------------------------
      // CREATE USER
      // -------------------------------------------------

      const user =
        await User.create({
          name:
            name.trim(),

          username:
            cleanUsername,

          password:
            hashedPassword,

          profilePhoto:
            profilePhoto,
        });

      // -------------------------------------------------
      // REMOVE PASSWORD FROM RESPONSE
      // -------------------------------------------------

      const safeUser =
        await User.findById(
          user._id
        ).select("-password");

      // -------------------------------------------------
      // RESPONSE
      // -------------------------------------------------

      return res.status(201).json({
        message:
          "User registered successfully.",

        user:
          safeUser,
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
  }
);

// =====================================================
// LOGIN
// POST /api/users/login
// =====================================================

router.post(
  "/login",
  async (req, res) => {
    try {
      const {
        username,
        password,
      } = req.body;

      // -------------------------------------------------
      // VALIDATE
      // -------------------------------------------------

      if (
        !username ||
        !password
      ) {
        return res.status(400).json({
          message:
            "Username and password are required.",
        });
      }

      // -------------------------------------------------
      // CLEAN USERNAME
      // -------------------------------------------------

      const cleanUsername =
        username
          .trim()
          .toLowerCase();

      // -------------------------------------------------
      // FIND USER
      // -------------------------------------------------

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

      // -------------------------------------------------
      // CHECK PASSWORD
      // -------------------------------------------------

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

      // -------------------------------------------------
      // REMOVE PASSWORD
      // -------------------------------------------------

      const safeUser =
        await User.findById(
          user._id
        ).select("-password");

      // -------------------------------------------------
      // RESPONSE
      // -------------------------------------------------

      return res.json({
        message:
          "Login successful.",

        user:
          safeUser,
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
// GET /api/users
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

// =====================================================
// EXPORT
// =====================================================

module.exports = router;