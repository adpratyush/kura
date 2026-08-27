const express = require("express");
const http = require("http");
const mongoose = require("mongoose");
const cors = require("cors");
const dotenv = require("dotenv");
const dns = require("dns");

const { Server } = require("socket.io");

// =====================================================
// ROUTES
// =====================================================

const userRoutes = require("./routes/users");
const messageRoutes = require("./routes/messages");
const groupRoutes = require("./routes/groups");

// =====================================================
// ENVIRONMENT
// =====================================================

dotenv.config();

// =====================================================
// DNS
// =====================================================

dns.setServers([
  "1.1.1.1",
  "8.8.8.8",
]);

// =====================================================
// EXPRESS
// =====================================================

const app = express();

const server = http.createServer(app);

// =====================================================
// CORS
// =====================================================

const allowedOrigins = [
  "http://localhost:5173",
  "http://localhost:3000",
  process.env.FRONTEND_URL,
].filter(Boolean);

console.log(
  "Allowed frontend origins:",
  allowedOrigins
);

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests such as Postman
      if (!origin) {
        return callback(null, true);
      }

      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      console.warn(
        "Blocked CORS origin:",
        origin
      );

      return callback(
        new Error("Not allowed by CORS")
      );
    },

    credentials: true,

    methods: [
      "GET",
      "POST",
      "PUT",
      "PATCH",
      "DELETE",
      "OPTIONS",
    ],

    allowedHeaders: [
      "Content-Type",
      "Authorization",
    ],
  })
);

// =====================================================
// SOCKET.IO
// =====================================================

const io = new Server(server, {
  cors: {
    origin: allowedOrigins,

    methods: [
      "GET",
      "POST",
    ],

    credentials: true,
  },

  transports: [
    "websocket",
    "polling",
  ],
});

// Make Socket.IO available inside routes
app.set("io", io);

// =====================================================
// BODY PARSERS
// =====================================================

app.use(
  express.json({
    limit: "10mb",
  })
);

app.use(
  express.urlencoded({
    extended: true,
    limit: "10mb",
  })
);

// =====================================================
// HEALTH CHECK
// =====================================================

app.get("/", (req, res) => {
  res.json({
    success: true,
    message: "Kura messaging server is running.",
  });
});

app.get("/api", (req, res) => {
  res.json({
    success: true,
    message: "Kura messaging API is running.",
  });
});

// =====================================================
// API ROUTES
// =====================================================

app.use(
  "/api/users",
  userRoutes
);

app.use(
  "/api/messages",
  messageRoutes
);

app.use(
  "/api/groups",
  groupRoutes
);

// =====================================================
// ONLINE USERS
// =====================================================

// userId -> socketId
const onlineUsers = new Map();

// =====================================================
// PRIVATE ROOM HELPER
// =====================================================

function getPrivateRoomId(user1, user2) {
  return [
    String(user1),
    String(user2),
  ]
    .sort()
    .join("_");
}

// =====================================================
// SOCKET CONNECTION
// =====================================================

io.on("connection", (socket) => {
  console.log(
    "🔌 Socket connected:",
    socket.id
  );

  // ===================================================
  // REGISTER USER
  // ===================================================

  socket.on(
    "register_user",
    ({ userId }) => {
      if (!userId) {
        return;
      }

      const userIdString =
        String(userId);

      // -----------------------------------------------
      // Remove previous socket for same user
      // -----------------------------------------------

      const oldSocketId =
        onlineUsers.get(
          userIdString
        );

      if (
        oldSocketId &&
        oldSocketId !== socket.id
      ) {
        const oldSocket =
          io.sockets.sockets.get(
            oldSocketId
          );

        if (oldSocket) {
          oldSocket.disconnect(true);
        }
      }

      // -----------------------------------------------
      // Save new socket
      // -----------------------------------------------

      onlineUsers.set(
        userIdString,
        socket.id
      );

      socket.userId =
        userIdString;

      // -----------------------------------------------
      // Personal user room
      // -----------------------------------------------

      socket.join(
        `user_${userIdString}`
      );

      console.log(
        `👤 User ${userIdString} registered on socket ${socket.id}`
      );

      // -----------------------------------------------
      // Notify everyone
      // -----------------------------------------------

      io.emit(
        "user_online",
        {
          userId:
            userIdString,
        }
      );
    }
  );

  // ===================================================
  // JOIN PRIVATE CHAT
  // ===================================================

  socket.on(
    "join_private",
    ({
      user1,
      user2,
    }) => {
      if (
        !user1 ||
        !user2
      ) {
        return;
      }

      const roomId =
        getPrivateRoomId(
          user1,
          user2
        );

      socket.join(roomId);

      console.log(
        `💬 ${socket.id} joined private room ${roomId}`
      );
    }
  );

  // ===================================================
  // LEAVE PRIVATE CHAT
  // ===================================================

  socket.on(
    "leave_private",
    ({
      user1,
      user2,
    }) => {
      if (
        !user1 ||
        !user2
      ) {
        return;
      }

      const roomId =
        getPrivateRoomId(
          user1,
          user2
        );

      socket.leave(roomId);

      console.log(
        `🚪 ${socket.id} left private room ${roomId}`
      );
    }
  );

  // ===================================================
  // PRIVATE MESSAGE
  // ===================================================

  socket.on(
    "private_message",
    (messageData) => {
      try {
        console.log(
          "📨 Private message received:",
          messageData
        );

        if (!messageData) {
          return;
        }

        const {
          _id,
          sender,
          receiver,
          message,
          type,
          imageUrl,
          createdAt,
        } = messageData;

        if (
          !sender ||
          !receiver
        ) {
          console.error(
            "❌ Private message missing sender/receiver"
          );

          return;
        }

        const senderId =
          String(sender);

        const receiverId =
          String(receiver);

        // ---------------------------------------------
        // Message object
        // ---------------------------------------------

        const newMessage = {
          _id,

          sender:
            senderId,

          receiver:
            receiverId,

          message:
            message || "",

          type:
            type || "text",

          imageUrl:
            imageUrl || "",

          createdAt:
            createdAt ||
            new Date(),
        };

        // ---------------------------------------------
        // Find receiver socket
        // ---------------------------------------------

        const receiverSocketId =
          onlineUsers.get(
            receiverId
          );

        // ---------------------------------------------
        // Send ONLY to receiver
        //
        // This is important.
        //
        // The sender already adds the message
        // locally in App.jsx.
        // ---------------------------------------------

        if (receiverSocketId) {
          io.to(
            receiverSocketId
          ).emit(
            "new_message",
            newMessage
          );

          console.log(
            `✅ Private message sent to receiver ${receiverId}`
          );
        } else {
          console.log(
            `ℹ️ Receiver ${receiverId} is offline`
          );
        }

        // ---------------------------------------------
        // Also send through private room
        //
        // This allows the receiver to get the
        // message if their socket is in the room.
        //
        // Exclude sender socket to prevent duplicate.
        // ---------------------------------------------

        const roomId =
          getPrivateRoomId(
            senderId,
            receiverId
          );

        socket
          .to(roomId)
          .emit(
            "new_message",
            newMessage
          );
      } catch (error) {
        console.error(
          "❌ Private Socket.IO message error:",
          error
        );
      }
    }
  );

  // ===================================================
  // JOIN GROUP
  // ===================================================

  socket.on(
    "join_group",
    (groupId) => {
      if (!groupId) {
        return;
      }

      const roomId =
        `group_${String(
          groupId
        )}`;

      socket.join(roomId);

      console.log(
        `👥 ${socket.id} joined ${roomId}`
      );
    }
  );

  // ===================================================
  // LEAVE GROUP
  // ===================================================

  socket.on(
    "leave_group",
    (groupId) => {
      if (!groupId) {
        return;
      }

      const roomId =
        `group_${String(
          groupId
        )}`;

      socket.leave(roomId);

      console.log(
        `🚪 ${socket.id} left ${roomId}`
      );
    }
  );

  // ===================================================
  // GROUP MESSAGE
  // ===================================================

  socket.on(
    "group_message",
    (messageData) => {
      try {
        console.log(
          "👥 Group message received:",
          messageData
        );

        if (!messageData) {
          return;
        }

        const {
          _id,
          sender,
          group,
          message,
          type,
          imageUrl,
          createdAt,
        } = messageData;

        if (
          !sender ||
          !group
        ) {
          console.error(
            "❌ Group message missing sender/group"
          );

          return;
        }

        const senderId =
          String(sender);

        const groupId =
          String(group);

        const newMessage = {
          _id,

          sender:
            senderId,

          group:
            groupId,

          message:
            message || "",

          type:
            type || "text",

          imageUrl:
            imageUrl || "",

          createdAt:
            createdAt ||
            new Date(),
        };

        // ---------------------------------------------
        // Group room
        // ---------------------------------------------

        const roomId =
          `group_${groupId}`;

        // ---------------------------------------------
        // Send to everyone in group room EXCEPT
        // sender.
        // ---------------------------------------------

        socket
          .to(roomId)
          .emit(
            "new_group_message",
            newMessage
          );

        console.log(
          `✅ Group message broadcast to ${roomId}`
        );
      } catch (error) {
        console.error(
          "❌ Group Socket.IO message error:",
          error
        );
      }
    }
  );

  // ===================================================
  // DISCONNECT
  // ===================================================

  socket.on(
    "disconnect",
    (reason) => {
      console.log(
        "❌ Socket disconnected:",
        socket.id,
        reason
      );

      if (socket.userId) {
        const currentSocket =
          onlineUsers.get(
            socket.userId
          );

        // Only remove the user if this is still
        // their active socket.
        if (
          currentSocket ===
          socket.id
        ) {
          onlineUsers.delete(
            socket.userId
          );

          io.emit(
            "user_offline",
            {
              userId:
                socket.userId,
            }
          );

          console.log(
            `👤 User ${socket.userId} is offline`
          );
        }
      }
    }
  );
});

// =====================================================
// ERROR HANDLER
// =====================================================

app.use(
  (
    error,
    req,
    res,
    next
  ) => {
    console.error(
      "❌ Server error:",
      error
    );

    if (
      error.name ===
      "MulterError"
    ) {
      if (
        error.code ===
        "LIMIT_FILE_SIZE"
      ) {
        return res.status(400).json({
          message:
            "File is too large. Maximum size is 5MB.",
        });
      }

      return res.status(400).json({
        message:
          error.message,
      });
    }

    if (
      error.message ===
      "Only image files are allowed."
    ) {
      return res.status(400).json({
        message:
          error.message,
      });
    }

    if (
      error.message ===
      "Not allowed by CORS"
    ) {
      return res.status(403).json({
        message:
          "CORS policy blocked this request.",
      });
    }

    return res
      .status(
        error.status || 500
      )
      .json({
        message:
          error.message ||
          "Internal server error.",
      });
  }
);

// =====================================================
// MONGODB
// =====================================================

const MONGO_URI =
  process.env.MONGO_URI;

const PORT =
  process.env.PORT || 5001;

// =====================================================
// START SERVER
// =====================================================

async function startServer() {
  try {
    if (!MONGO_URI) {
      throw new Error(
        "MONGO_URI is not defined in .env"
      );
    }

    await mongoose.connect(
      MONGO_URI
    );

    console.log(
      "✅ MongoDB connected"
    );

    server.listen(
      PORT,
      () => {
        console.log(
          `🚀 Server running on port ${PORT}`
        );

        console.log(
          `🌐 API: http://localhost:${PORT}`
        );

        console.log(
          "🔌 Socket.IO ready"
        );
      }
    );
  } catch (error) {
    console.error(
      "❌ Server startup error:",
      error
    );

    process.exit(1);
  }
}

startServer();