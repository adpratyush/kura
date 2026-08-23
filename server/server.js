const express = require("express");
const path = require("path");
const mongoose = require("mongoose");
const cors = require("cors");
const dotenv = require("dotenv");
const http = require("http");
const { Server } = require("socket.io");
const dns = require("dns");

// Load environment variables
dotenv.config();

// Use reliable DNS servers for MongoDB Atlas
dns.setServers(["1.1.1.1", "8.8.8.8"]);

const app = express();
const server = http.createServer(app);

// ==========================================
// CORS
// ==========================================

const allowedOrigins = [
  "http://localhost:5173",
  process.env.FRONTEND_URL,
].filter(Boolean);

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests without an origin
      // such as Postman/server-to-server requests
      if (!origin) {
        return callback(null, true);
      }

      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      return callback(
        new Error(`CORS blocked for origin: ${origin}`)
      );
    },
    methods: ["GET", "POST", "PUT", "DELETE"],
    credentials: true,
  })
);

// ==========================================
// BODY PARSER
// ==========================================

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ==========================================
// STATIC UPLOADS
// ==========================================

app.use(
  "/uploads",
  express.static(path.join(__dirname, "uploads"))
);

// ==========================================
// ROUTES
// ==========================================

const userRoutes = require("./routes/users");
const messageRoutes = require("./routes/messages");
const groupRoutes = require("./routes/groups");

app.use("/api/users", userRoutes);
app.use("/api/messages", messageRoutes);
app.use("/api/groups", groupRoutes);

// ==========================================
// BASIC API TEST
// ==========================================

app.get("/", (req, res) => {
  res.status(200).json({
    success: true,
    message: "Messaging API is running",
  });
});

// ==========================================
// HEALTH CHECK
// ==========================================

app.get("/health", (req, res) => {
  res.status(200).json({
    success: true,
    status: "OK",
    database:
      mongoose.connection.readyState === 1
        ? "connected"
        : "disconnected",
  });
});

// ==========================================
// SOCKET.IO
// ==========================================

const io = new Server(server, {
  cors: {
    origin: allowedOrigins,
    methods: ["GET", "POST"],
    credentials: true,
  },
});

// ==========================================
// SOCKET CONNECTION
// ==========================================

io.on("connection", (socket) => {
  console.log("User connected:", socket.id);

  // ------------------------------------------
  // PRIVATE CHAT ROOM
  // ------------------------------------------

  socket.on("join_private", ({ user1, user2 }) => {
    if (!user1 || !user2) {
      return;
    }

    const roomId = [user1, user2].sort().join("_");

    socket.join(roomId);

    console.log(
      `Socket ${socket.id} joined private room: ${roomId}`
    );
  });

  // ------------------------------------------
  // GROUP CHAT ROOM
  // ------------------------------------------

  socket.on("join_group", (groupId) => {
    if (!groupId) {
      return;
    }

    socket.join(groupId);

    console.log(
      `Socket ${socket.id} joined group: ${groupId}`
    );
  });

  // ------------------------------------------
  // PRIVATE MESSAGE
  // ------------------------------------------

  socket.on("private_message", (data) => {
    const {
      sender,
      receiver,
      message,
      type = "text",
      imageUrl = "",
    } = data || {};

    if (!sender || !receiver || !message) {
      return;
    }

    const roomId = [sender, receiver].sort().join("_");

    const messageData = {
      sender,
      receiver,
      message,
      type,
      imageUrl,
      createdAt: new Date(),
    };

    io.to(roomId).emit("new_message", messageData);
  });

  // ------------------------------------------
  // GROUP MESSAGE
  // ------------------------------------------

  socket.on("group_message", (data) => {
    const {
      sender,
      group,
      message,
      type = "text",
      imageUrl = "",
    } = data || {};

    if (!sender || !group || !message) {
      return;
    }

    const messageData = {
      sender,
      group,
      message,
      type,
      imageUrl,
      createdAt: new Date(),
    };

    io.to(group).emit("new_group_message", messageData);
  });

  // ------------------------------------------
  // DISCONNECT
  // ------------------------------------------

  socket.on("disconnect", (reason) => {
    console.log(
      `User disconnected: ${socket.id} (${reason})`
    );
  });
});

// ==========================================
// MONGODB CONNECTION
// ==========================================

const connectDatabase = async () => {
  try {
    if (!process.env.MONGO_URI) {
      throw new Error(
        "MONGO_URI is not defined in environment variables."
      );
    }

    if (mongoose.connection.readyState === 1) {
      console.log("MongoDB already connected");
      return;
    }

    await mongoose.connect(process.env.MONGO_URI);

    console.log("MongoDB connected");
  } catch (error) {
    console.error(
      "MongoDB connection error:",
      error.message
    );

    process.exit(1);
  }
};

// ==========================================
// START SERVER
// ==========================================

const PORT = process.env.PORT || 5001;

const startServer = async () => {
  await connectDatabase();

  server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`API: http://localhost:${PORT}`);
    console.log(`Socket.IO: http://localhost:${PORT}`);
  });
};

startServer();

// ==========================================
// ERROR HANDLING
// ==========================================

process.on("unhandledRejection", (error) => {
  console.error("Unhandled Promise Rejection:", error);
});

process.on("uncaughtException", (error) => {
  console.error("Uncaught Exception:", error);
});