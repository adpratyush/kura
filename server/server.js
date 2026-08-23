const express = require("express");
const path = require("path");
const mongoose = require("mongoose");
const cors = require("cors");
const dotenv = require("dotenv");
const http = require("http");
const { Server } = require("socket.io");
const dns = require("dns");

// ==========================================
// MONGODB ATLAS DNS
// ==========================================

dns.setServers(["1.1.1.1", "8.8.8.8"]);

dotenv.config();

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
    origin: allowedOrigins,
    methods: ["GET", "POST", "PUT", "DELETE"],
    credentials: true,
  })
);

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
// MIDDLEWARE
// ==========================================

app.use(express.json());

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
  res.json({
    message: "Messaging API is running",
  });
});

// ==========================================
// HEALTH CHECK
// ==========================================

app.get("/health", (req, res) => {
  res.status(200).json({
    status: "OK",
  });
});

// ==========================================
// MONGODB
// ==========================================

mongoose
  .connect(process.env.MONGO_URI)
  .then(() => {
    console.log("MongoDB connected");
  })
  .catch((error) => {
    console.error(
      "MongoDB connection error:",
      error
    );
  });

// ==========================================
// SOCKET.IO
// ==========================================

io.on("connection", (socket) => {
  console.log(
    "User connected:",
    socket.id
  );

  // ========================================
  // JOIN PRIVATE CONVERSATION
  // ========================================

  socket.on(
    "join_private",
    ({ user1, user2 }) => {
      if (!user1 || !user2) {
        return;
      }

      const roomId = [
        user1,
        user2,
      ]
        .sort()
        .join("_");

      socket.join(roomId);

      console.log(
        `Socket ${socket.id} joined private room: ${roomId}`
      );
    }
  );

  // ========================================
  // JOIN GROUP
  // ========================================

  socket.on(
    "join_group",
    (groupId) => {
      if (!groupId) {
        return;
      }

      socket.join(groupId);

      console.log(
        `Socket ${socket.id} joined group: ${groupId}`
      );
    }
  );

  // ========================================
  // PRIVATE MESSAGE
  // ========================================

  socket.on(
    "private_message",
    (data) => {
      try {
        const {
          sender,
          receiver,
          message,
          type = "text",
          imageUrl = "",
        } = data || {};

        if (
          !sender ||
          !receiver
        ) {
          console.error(
            "Invalid private message:",
            data
          );

          return;
        }

        const roomId = [
          sender,
          receiver,
        ]
          .sort()
          .join("_");

        /*
         * IMPORTANT:
         *
         * socket.to(roomId).emit()
         * sends the message to every
         * socket in the room EXCEPT
         * the sender.
         *
         * The sender already adds the
         * saved message to its own UI
         * from the POST /private request.
         */

        socket
          .to(roomId)
          .emit("new_message", {
            sender,
            receiver,
            message,
            type,
            imageUrl,
            createdAt:
              new Date(),
          });

        console.log(
          `Private message sent to room: ${roomId}`
        );
      } catch (error) {
        console.error(
          "Private Socket.IO error:",
          error
        );
      }
    }
  );

  // ========================================
  // GROUP MESSAGE
  // ========================================

  socket.on(
    "group_message",
    (data) => {
      try {
        const {
          sender,
          group,
          message,
          type = "text",
          imageUrl = "",
        } = data || {};

        if (
          !sender ||
          !group
        ) {
          console.error(
            "Invalid group message:",
            data
          );

          return;
        }

        /*
         * Send to everyone in the group
         * EXCEPT the sender.
         *
         * The sender already adds the
         * saved message locally.
         */

        socket
          .to(group)
          .emit(
            "new_group_message",
            {
              sender,
              group,
              message,
              type,
              imageUrl,
              createdAt:
                new Date(),
            }
          );

        console.log(
          `Group message sent to group: ${group}`
        );
      } catch (error) {
        console.error(
          "Group Socket.IO error:",
          error
        );
      }
    }
  );

  // ========================================
  // DISCONNECT
  // ========================================

  socket.on(
    "disconnect",
    (reason) => {
      console.log(
        `User disconnected: ${socket.id}`,
        reason
      );
    }
  );
});

// ==========================================
// SERVER
// ==========================================

const PORT =
  process.env.PORT || 5001;

server.listen(PORT, () => {
  console.log(
    `Server running on port ${PORT}`
  );
});