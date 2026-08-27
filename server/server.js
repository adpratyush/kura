const express = require("express");
const http = require("http");
const mongoose = require("mongoose");
const cors = require("cors");
const dotenv = require("dotenv");
const path = require("path");
const fs = require("fs");
const multer = require("multer");
const dns = require("dns");

const { Server } = require("socket.io");

// =====================================================
// ENVIRONMENT
// =====================================================

dotenv.config();

// =====================================================
// DNS
// Useful for MongoDB Atlas SRV connection issues
// =====================================================

dns.setServers([
  "1.1.1.1",
  "8.8.8.8",
]);

// =====================================================
// APP
// =====================================================

const app = express();

const server = http.createServer(app);

// =====================================================
// CORS
// =====================================================

const allowedOrigins = [
  "http://localhost:5173",
  "http://localhost:3000",

  // Put your Vercel frontend URL in .env
  // FRONTEND_URL=https://your-app.vercel.app
  process.env.FRONTEND_URL,
].filter(Boolean);

console.log(
  "Allowed frontend origins:",
  allowedOrigins
);

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests without Origin
      // such as Postman/server-to-server
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
        new Error(
          "Not allowed by CORS"
        )
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

// =====================================================
// MIDDLEWARE
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
// DIRECTORIES
// =====================================================

const uploadsDirectory =
  path.join(
    __dirname,
    "uploads"
  );

const profileUploadsDirectory =
  path.join(
    uploadsDirectory,
    "profiles"
  );

const messageUploadsDirectory =
  path.join(
    uploadsDirectory,
    "messages"
  );

if (
  !fs.existsSync(
    uploadsDirectory
  )
) {
  fs.mkdirSync(
    uploadsDirectory,
    {
      recursive: true,
    }
  );
}

if (
  !fs.existsSync(
    profileUploadsDirectory
  )
) {
  fs.mkdirSync(
    profileUploadsDirectory,
    {
      recursive: true,
    }
  );
}

if (
  !fs.existsSync(
    messageUploadsDirectory
  )
) {
  fs.mkdirSync(
    messageUploadsDirectory,
    {
      recursive: true,
    }
  );
}

// =====================================================
// STATIC UPLOADS
// =====================================================

app.use(
  "/uploads",
  express.static(
    uploadsDirectory
  )
);

// =====================================================
// DATABASE
// =====================================================

const MONGO_URI =
  process.env.MONGO_URI;

if (!MONGO_URI) {
  console.error(
    "❌ MONGODB_URI is missing in .env"
  );
}

// =====================================================
// SCHEMAS
// =====================================================

const userSchema =
  new mongoose.Schema(
    {
      name: {
        type: String,
        required: true,
        trim: true,
      },

      username: {
        type: String,
        required: true,
        unique: true,
        trim: true,
        lowercase: true,
      },

      password: {
        type: String,
        required: true,
      },

      profilePhoto: {
        type: String,
        default: "",
      },
    },
    {
      timestamps: true,
    }
  );

const messageSchema =
  new mongoose.Schema(
    {
      sender: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
      },

      receiver: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        default: null,
      },

      group: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Group",
        default: null,
      },

      type: {
        type: String,
        enum: [
          "text",
          "image",
        ],
        default: "text",
      },

      message: {
        type: String,
        default: "",
      },

      imageUrl: {
        type: String,
        default: "",
      },
    },
    {
      timestamps: true,
    }
  );

const groupSchema =
  new mongoose.Schema(
    {
      name: {
        type: String,
        required: true,
        trim: true,
      },

      admin: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
      },

      members: [
        {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
        },
      ],
    },
    {
      timestamps: true,
    }
  );

const User =
  mongoose.models.User ||
  mongoose.model(
    "User",
    userSchema
  );

const Message =
  mongoose.models.Message ||
  mongoose.model(
    "Message",
    messageSchema
  );

const Group =
  mongoose.models.Group ||
  mongoose.model(
    "Group",
    groupSchema
  );

// =====================================================
// MULTER
// =====================================================

const storage =
  multer.diskStorage({
    destination: (
      req,
      file,
      cb
    ) => {
      cb(
        null,
        messageUploadsDirectory
      );
    },

    filename: (
      req,
      file,
      cb
    ) => {
      const extension =
        path.extname(
          file.originalname
        );

      const filename =
        `${Date.now()}-${Math.round(
          Math.random() * 1e9
        )}${extension}`;

      cb(
        null,
        filename
      );
    },
  });

const upload =
  multer({
    storage,

    limits: {
      fileSize:
        5 * 1024 * 1024,
    },

    fileFilter: (
      req,
      file,
      cb
    ) => {
      if (
        file.mimetype.startsWith(
          "image/"
        )
      ) {
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
// HEALTH CHECK
// =====================================================

app.get(
  "/",
  (req, res) => {
    res.json({
      success: true,
      message:
        "Messaging server is running",
    });
  }
);

app.get(
  "/api",
  (req, res) => {
    res.json({
      success: true,
      message:
        "Messaging API is running",
    });
  }
);

// =====================================================
// USERS
// =====================================================

// GET ALL USERS

app.get(
  "/api/users",
  async (req, res) => {
    try {
      const users =
        await User.find()
          .select(
            "-password"
          )
          .sort({
            createdAt: -1,
          });

      res.json(users);
    } catch (error) {
      console.error(
        "Get users error:",
        error
      );

      res.status(500).json({
        message:
          "Could not load users",
      });
    }
  }
);

// =====================================================
// REGISTER
// =====================================================

app.post(
  "/api/users/register",
  uploadProfilePhotoMiddleware(),
  async (req, res) => {
    try {
      const {
        name,
        username,
        password,
      } = req.body;

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

      const cleanUsername =
        username
          .trim()
          .toLowerCase();

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

      let profilePhoto =
        "";

      if (req.file) {
        profilePhoto =
          `/uploads/profiles/${req.file.filename}`;
      }

      const user =
        await User.create({
          name:
            name.trim(),

          username:
            cleanUsername,

          password,

          profilePhoto,
        });

      const safeUser =
        await User.findById(
          user._id
        ).select(
          "-password"
        );

      res.status(201).json({
        message:
          "Registration successful.",
        user: safeUser,
      });
    } catch (error) {
      console.error(
        "Register error:",
        error
      );

      res.status(500).json({
        message:
          "Could not register user.",
      });
    }
  }
);

// =====================================================
// LOGIN
// =====================================================

app.post(
  "/api/users/login",
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

      const user =
        await User.findOne({
          username:
            username
              .trim()
              .toLowerCase(),
        });

      if (!user) {
        return res.status(401).json({
          message:
            "Invalid username or password.",
        });
      }

      if (
        user.password !==
        password
      ) {
        return res.status(401).json({
          message:
            "Invalid username or password.",
        });
      }

      const safeUser =
        await User.findById(
          user._id
        ).select(
          "-password"
        );

      res.json({
        message:
          "Login successful.",
        user: safeUser,
      });
    } catch (error) {
      console.error(
        "Login error:",
        error
      );

      res.status(500).json({
        message:
          "Could not login.",
      });
    }
  }
);

// =====================================================
// PROFILE PHOTO MIDDLEWARE
// =====================================================

function uploadProfilePhotoMiddleware() {
  const profileStorage =
    multer.diskStorage({
      destination: (
        req,
        file,
        cb
      ) => {
        cb(
          null,
          profileUploadsDirectory
        );
      },

      filename: (
        req,
        file,
        cb
      ) => {
        const extension =
          path.extname(
            file.originalname
          );

        const filename =
          `${Date.now()}-${Math.round(
            Math.random() * 1e9
          )}${extension}`;

        cb(
          null,
          filename
        );
      },
    });

  const profileUpload =
    multer({
      storage:
        profileStorage,

      limits: {
        fileSize:
          5 * 1024 * 1024,
      },

      fileFilter: (
        req,
        file,
        cb
      ) => {
        if (
          file.mimetype.startsWith(
            "image/"
          )
        ) {
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

  return profileUpload.single(
    "profilePhoto"
  );
}

// =====================================================
// IMAGE UPLOAD
// =====================================================

app.post(
  "/api/messages/upload-image",
  upload.single("image"),
  async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({
          message:
            "No image uploaded.",
        });
      }

      const imageUrl =
        `/uploads/messages/${req.file.filename}`;

      res.json({
        success: true,
        imageUrl,
      });
    } catch (error) {
      console.error(
        "Image upload error:",
        error
      );

      res.status(500).json({
        message:
          "Image upload failed.",
      });
    }
  }
);

// =====================================================
// PRIVATE MESSAGE
// =====================================================

app.post(
  "/api/messages/private",
  async (req, res) => {
    try {
      const {
        sender,
        receiver,
        type,
        message,
        imageUrl,
      } = req.body;

      if (
        !sender ||
        !receiver
      ) {
        return res.status(400).json({
          message:
            "Sender and receiver are required.",
        });
      }

      if (
        !mongoose.Types.ObjectId.isValid(
          sender
        ) ||
        !mongoose.Types.ObjectId.isValid(
          receiver
        )
      ) {
        return res.status(400).json({
          message:
            "Invalid sender or receiver.",
        });
      }

      if (
        String(sender) ===
        String(receiver)
      ) {
        return res.status(400).json({
          message:
            "You cannot send a message to yourself.",
        });
      }

      if (
        type !== "image" &&
        (!message ||
          !String(
            message
          ).trim())
      ) {
        return res.status(400).json({
          message:
            "Message cannot be empty.",
        });
      }

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
                  message || ""
                ).trim(),

          imageUrl:
            type === "image"
              ? imageUrl ||
                ""
              : "",
        });

      const populatedMessage =
        await Message.findById(
          newMessage._id
        )
          .populate(
            "sender",
            "-password"
          )
          .populate(
            "receiver",
            "-password"
          );

      res.status(201).json(
        populatedMessage
      );
    } catch (error) {
      console.error(
        "Private message error:",
        error
      );

      res.status(500).json({
        message:
          "Could not send message.",
      });
    }
  }
);

// =====================================================
// GET PRIVATE MESSAGES
// =====================================================

app.get(
  "/api/messages/private/:user1/:user2",
  async (req, res) => {
    try {
      const {
        user1,
        user2,
      } = req.params;

      if (
        !mongoose.Types.ObjectId.isValid(
          user1
        ) ||
        !mongoose.Types.ObjectId.isValid(
          user2
        )
      ) {
        return res.status(400).json({
          message:
            "Invalid user ID.",
        });
      }

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
            "-password"
          )
          .populate(
            "receiver",
            "-password"
          )
          .sort({
            createdAt: 1,
          });

      res.json(messages);
    } catch (error) {
      console.error(
        "Get private messages error:",
        error
      );

      res.status(500).json({
        message:
          "Could not load messages.",
      });
    }
  }
);

// =====================================================
// GROUP CREATION
// =====================================================

app.post(
  "/api/groups",
  async (req, res) => {
    try {
      const {
        name,
        admin,
        members,
      } = req.body;

      if (
        !name ||
        !admin
      ) {
        return res.status(400).json({
          message:
            "Group name and admin are required.",
        });
      }

      if (
        !mongoose.Types.ObjectId.isValid(
          admin
        )
      ) {
        return res.status(400).json({
          message:
            "Invalid admin ID.",
        });
      }

      let memberIds =
        Array.isArray(
          members
        )
          ? members
          : [];

      memberIds = [
        admin,
        ...memberIds,
      ];

      memberIds =
        memberIds
          .filter(Boolean)
          .map((id) =>
            String(id)
          );

      // Remove duplicates
      memberIds = [
        ...new Set(
          memberIds
        ),
      ];

      const validMembers = [];

      for (
        const memberId of memberIds
      ) {
        if (
          mongoose.Types.ObjectId.isValid(
            memberId
          )
        ) {
          validMembers.push(
            memberId
          );
        }
      }

      const group =
        await Group.create({
          name:
            name.trim(),

          admin,

          members:
            validMembers,
        });

      const populatedGroup =
        await Group.findById(
          group._id
        )
          .populate(
            "admin",
            "-password"
          )
          .populate(
            "members",
            "-password"
          );

      res.status(201).json({
        message:
          "Group created successfully.",
        group:
          populatedGroup,
      });
    } catch (error) {
      console.error(
        "Create group error:",
        error
      );

      res.status(500).json({
        message:
          "Could not create group.",
      });
    }
  }
);

// =====================================================
// GET USER GROUPS
// =====================================================

app.get(
  "/api/groups/user/:userId",
  async (req, res) => {
    try {
      const {
        userId,
      } = req.params;

      if (
        !mongoose.Types.ObjectId.isValid(
          userId
        )
      ) {
        return res.status(400).json({
          message:
            "Invalid user ID.",
        });
      }

      const groups =
        await Group.find({
          members: userId,
        })
          .populate(
            "admin",
            "-password"
          )
          .populate(
            "members",
            "-password"
          )
          .sort({
            createdAt: -1,
          });

      res.json(groups);
    } catch (error) {
      console.error(
        "Get groups error:",
        error
      );

      res.status(500).json({
        message:
          "Could not load groups.",
      });
    }
  }
);

// =====================================================
// GROUP MESSAGE
// =====================================================

app.post(
  "/api/messages/group",
  async (req, res) => {
    try {
      const {
        sender,
        group,
        type,
        message,
        imageUrl,
      } = req.body;

      if (
        !sender ||
        !group
      ) {
        return res.status(400).json({
          message:
            "Sender and group are required.",
        });
      }

      if (
        !mongoose.Types.ObjectId.isValid(
          sender
        ) ||
        !mongoose.Types.ObjectId.isValid(
          group
        )
      ) {
        return res.status(400).json({
          message:
            "Invalid sender or group ID.",
        });
      }

      const existingGroup =
        await Group.findById(
          group
        );

      if (!existingGroup) {
        return res.status(404).json({
          message:
            "Group not found.",
        });
      }

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

      if (
        type !== "image" &&
        (!message ||
          !String(
            message
          ).trim())
      ) {
        return res.status(400).json({
          message:
            "Message cannot be empty.",
        });
      }

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
                  message || ""
                ).trim(),

          imageUrl:
            type === "image"
              ? imageUrl ||
                ""
              : "",
        });

      const populatedMessage =
        await Message.findById(
          newMessage._id
        ).populate(
          "sender",
          "-password"
        );

      res.status(201).json(
        populatedMessage
      );
    } catch (error) {
      console.error(
        "Group message error:",
        error
      );

      res.status(500).json({
        message:
          "Could not send group message.",
      });
    }
  }
);

// =====================================================
// GET GROUP MESSAGES
// =====================================================

app.get(
  "/api/messages/group/:groupId",
  async (req, res) => {
    try {
      const {
        groupId,
      } = req.params;

      if (
        !mongoose.Types.ObjectId.isValid(
          groupId
        )
      ) {
        return res.status(400).json({
          message:
            "Invalid group ID.",
        });
      }

      const messages =
        await Message.find({
          group: groupId,
        })
          .populate(
            "sender",
            "-password"
          )
          .sort({
            createdAt: 1,
          });

      res.json(messages);
    } catch (error) {
      console.error(
        "Get group messages error:",
        error
      );

      res.status(500).json({
        message:
          "Could not load group messages.",
      });
    }
  }
);

// =====================================================
// SOCKET.IO
// =====================================================

// Maps userId -> socketId
const onlineUsers =
  new Map();

// =====================================================
// SOCKET CONNECTION
// =====================================================

io.on(
  "connection",
  (socket) => {
    console.log(
      "Socket connected:",
      socket.id
    );

    // =================================================
    // REGISTER USER
    // =================================================

    socket.on(
      "register_user",
      ({ userId }) => {
        if (!userId) {
          return;
        }

        const userIdString =
          String(userId);

        onlineUsers.set(
          userIdString,
          socket.id
        );

        socket.userId =
          userIdString;

        console.log(
          `User ${userIdString} registered on socket ${socket.id}`
        );

        // Put user into personal room
        socket.join(
          `user_${userIdString}`
        );

        // Notify everyone that online
        io.emit(
          "user_online",
          {
            userId:
              userIdString,
          }
        );
      }
    );

    // =================================================
    // JOIN PRIVATE CHAT
    // =================================================

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

        socket.join(
          roomId
        );

        console.log(
          `Socket ${socket.id} joined private room ${roomId}`
        );
      }
    );

    // =================================================
    // LEAVE PRIVATE CHAT
    // =================================================

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

        socket.leave(
          roomId
        );
      }
    );

    // =================================================
    // JOIN GROUP
    // =================================================

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

        socket.join(
          roomId
        );

        console.log(
          `Socket ${socket.id} joined group room ${roomId}`
        );
      }
    );

    // =================================================
    // LEAVE GROUP
    // =================================================

    socket.on(
      "leave_group",
      (groupId) => {
        if (!groupId) {
          return;
        }

        socket.leave(
          `group_${String(
            groupId
          )}`
        );
      }
    );

    // =================================================
    // PRIVATE MESSAGE
    // =================================================

    socket.on(
      "private_message",
      async (payload) => {
        try {
          if (!payload) {
            return;
          }

          const {
            sender,
            receiver,
            message,
            type,
            imageUrl,
          } = payload;

          if (
            !sender ||
            !receiver
          ) {
            return;
          }

          const roomId =
            getPrivateRoomId(
              sender,
              receiver
            );

          // ---------------------------------------------
          // IMPORTANT
          //
          // The REST API already saved the message.
          //
          // We DO NOT create another MongoDB message here.
          //
          // We only broadcast it.
          // ---------------------------------------------

          let messageToSend = null;

          // Try to find the latest message
          // from this sender to this receiver.
          messageToSend =
            await Message.findOne({
              sender,
              receiver,
            })
              .sort({
                createdAt: -1,
              })
              .populate(
                "sender",
                "-password"
              )
              .populate(
                "receiver",
                "-password"
              );

          // ---------------------------------------------
          // Fallback socket object
          // ---------------------------------------------

          if (!messageToSend) {
            messageToSend = {
              _id:
                `${Date.now()}-${Math.random()}`,

              sender,

              receiver,

              message:
                message || "",

              type:
                type || "text",

              imageUrl:
                imageUrl || "",

              createdAt:
                new Date(),
            };
          }

          // ---------------------------------------------
          // SEND TO ROOM
          //
          // This includes both sender and receiver
          // if both have joined the room.
          // ---------------------------------------------

          io.to(roomId).emit(
            "new_message",
            messageToSend
          );

          // ---------------------------------------------
          // ALSO SEND DIRECTLY TO RECEIVER'S
          // PERSONAL ROOM
          //
          // This is important because the receiver
          // may not currently have the conversation
          // open.
          // ---------------------------------------------

          const receiverSocket =
            onlineUsers.get(
              String(receiver)
            );

          if (
            receiverSocket
          ) {
            io.to(
              receiverSocket
            ).emit(
              "new_message",
              messageToSend
            );
          }

          console.log(
            "Private message broadcast:",
            {
              sender,
              receiver,
              roomId,
            }
          );
        } catch (error) {
          console.error(
            "Socket private message error:",
            error
          );
        }
      }
    );

    // =================================================
    // GROUP MESSAGE
    // =================================================

    socket.on(
      "group_message",
      async (payload) => {
        try {
          if (!payload) {
            return;
          }

          const {
            sender,
            group,
            message,
            type,
            imageUrl,
          } = payload;

          if (
            !sender ||
            !group
          ) {
            return;
          }

          const roomId =
            `group_${String(
              group
            )}`;

          // ---------------------------------------------
          // Get latest saved group message
          // ---------------------------------------------

          let messageToSend =
            await Message.findOne({
              sender,
              group,
            })
              .sort({
                createdAt: -1,
              })
              .populate(
                "sender",
                "-password"
              );

          // ---------------------------------------------
          // Fallback
          // ---------------------------------------------

          if (!messageToSend) {
            messageToSend = {
              _id:
                `${Date.now()}-${Math.random()}`,

              sender,

              group,

              message:
                message || "",

              type:
                type || "text",

              imageUrl:
                imageUrl || "",

              createdAt:
                new Date(),
            };
          }

          // ---------------------------------------------
          // Broadcast to group
          // ---------------------------------------------

          io.to(roomId).emit(
            "new_group_message",
            messageToSend
          );

          // ---------------------------------------------
          // Also notify all group members
          //
          // This makes the group appear highlighted
          // even if the user is not currently inside
          // the group chat.
          // ---------------------------------------------

          const existingGroup =
            await Group.findById(
              group
            ).select(
              "members"
            );

          if (
            existingGroup
          ) {
            for (
              const memberId of
                existingGroup.members
            ) {
              const memberSocket =
                onlineUsers.get(
                  String(
                    memberId
                  )
                );

              if (
                memberSocket &&
                String(
                  memberId
                ) !==
                  String(
                    sender
                  )
              ) {
                io.to(
                  memberSocket
                ).emit(
                  "new_group_message",
                  messageToSend
                );
              }
            }
          }

          console.log(
            "Group message broadcast:",
            {
              sender,
              group,
              roomId,
            }
          );
        } catch (error) {
          console.error(
            "Socket group message error:",
            error
          );
        }
      }
    );

    // =================================================
    // DISCONNECT
    // =================================================

    socket.on(
      "disconnect",
      () => {
        console.log(
          "Socket disconnected:",
          socket.id
        );

        if (
          socket.userId
        ) {
          const currentSocket =
            onlineUsers.get(
              socket.userId
            );

          // Only delete if this exact socket
          // is still registered.
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
          }
        }
      }
    );
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
      "Server error:",
      error
    );

    if (
      error instanceof
      multer.MulterError
    ) {
      if (
        error.code ===
        "LIMIT_FILE_SIZE"
      ) {
        return res
          .status(400)
          .json({
            message:
              "File is too large. Maximum size is 5MB.",
          });
      }

      return res
        .status(400)
        .json({
          message:
            error.message,
        });
    }

    if (
      error.message ===
      "Only image files are allowed."
    ) {
      return res
        .status(400)
        .json({
          message:
            error.message,
        });
    }

    if (
      error.message ===
      "Not allowed by CORS"
    ) {
      return res
        .status(403)
        .json({
          message:
            "CORS policy blocked this request.",
        });
    }

    res
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
// MONGODB CONNECTION
// =====================================================

const PORT =
  process.env.PORT ||
  5001;

async function startServer() {
  try {
    if (!MONGO_URI) {
      throw new Error(
        "MONGODB_URI is not defined."
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
          `🔌 Socket.IO ready`
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