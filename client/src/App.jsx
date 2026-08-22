import { useEffect, useRef, useState } from "react";
import { io } from "socket.io-client";
import "./App.css";
import Login from "./Login";
import Register from "./Register";

const API_URL = "http://localhost:5001";

function App() {
  const socketRef = useRef(null);

  // ==========================================
  // AUTH
  // ==========================================

  const [currentUser, setCurrentUser] = useState(() => {
    try {
      const savedUser = localStorage.getItem("currentUser");

      if (!savedUser) {
        return null;
      }

      return JSON.parse(savedUser);
    } catch (error) {
      console.error("Could not load saved user:", error);
      localStorage.removeItem("currentUser");
      return null;
    }
  });

  const [showRegister, setShowRegister] = useState(false);

  // ==========================================
  // DATA
  // ==========================================

  const [users, setUsers] = useState([]);
  const [groups, setGroups] = useState([]);
  const [selectedChat, setSelectedChat] = useState(null);
  const [messages, setMessages] = useState([]);
  const [message, setMessage] = useState("");
  const [selectedPhoto, setSelectedPhoto] = useState(null);

  // ==========================================
  // GROUP CREATION
  // ==========================================

  const [showGroupModal, setShowGroupModal] = useState(false);
  const [groupName, setGroupName] = useState("");
  const [selectedMembers, setSelectedMembers] = useState([]);
  const [creatingGroup, setCreatingGroup] = useState(false);
  const [groupError, setGroupError] = useState("");

  // ==========================================
  // LOGIN
  // ==========================================

  const handleLogin = (user) => {
    if (!user || !user._id) {
      console.error("Invalid user returned from login");
      return;
    }

    localStorage.setItem("currentUser", JSON.stringify(user));
    setCurrentUser(user);
    setShowRegister(false);
  };

  // ==========================================
  // LOGOUT
  // ==========================================

  const handleLogout = () => {
    if (socketRef.current) {
      socketRef.current.disconnect();
      socketRef.current = null;
    }

    localStorage.removeItem("currentUser");

    setCurrentUser(null);
    setSelectedChat(null);
    setMessages([]);
    setUsers([]);
    setGroups([]);
    setMessage("");
    setSelectedPhoto(null);
  };

  // ==========================================
  // LOAD USERS
  // ==========================================

  useEffect(() => {
    if (!currentUser?._id) {
      return;
    }

    const loadUsers = async () => {
      try {
        const response = await fetch(`${API_URL}/api/users`);

        const data = await response.json();

        if (!response.ok) {
          throw new Error(
            data.message || "Could not load users"
          );
        }

        setUsers(Array.isArray(data) ? data : []);
      } catch (error) {
        console.error("Users error:", error);
        setUsers([]);
      }
    };

    loadUsers();
  }, [currentUser]);

  // ==========================================
  // LOAD GROUPS
  // ==========================================

  const loadGroups = async () => {
    if (!currentUser?._id) {
      return;
    }

    try {
      const response = await fetch(
        `${API_URL}/api/groups/user/${currentUser._id}`
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.message || "Could not load groups"
        );
      }

      setGroups(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Groups error:", error);
      setGroups([]);
    }
  };

  useEffect(() => {
    if (!currentUser?._id) {
      return;
    }

    loadGroups();
  }, [currentUser]);

  // ==========================================
  // NORMALIZE MESSAGE
  // ==========================================
  //
  // This fixes the error:
  //
  // Objects are not valid as a React child
  //
  // because socket messages can sometimes arrive as:
  //
  // {
  //    message: {
  //       _id: "...",
  //       message: "hello"
  //    }
  // }
  //
  // instead of directly:
  //
  // {
  //    _id: "...",
  //    message: "hello"
  // }
  // ==========================================

  const normalizeMessage = (incoming) => {
    if (!incoming) {
      return null;
    }

    let msg = incoming;

    // Unwrap socket wrapper
    if (
      msg &&
      typeof msg === "object" &&
      msg.message &&
      typeof msg.message === "object" &&
      !Array.isArray(msg.message)
    ) {
      msg = msg.message;
    }

    if (!msg || typeof msg !== "object") {
      return null;
    }

    return msg;
  };

  // ==========================================
  // ADD MESSAGE SAFELY
  // ==========================================

  const addMessageSafely = (incoming) => {
    const newMessage = normalizeMessage(incoming);

    if (!newMessage) {
      return;
    }

    setMessages((previous) => {
      if (
        newMessage._id &&
        previous.some(
          (item) =>
            String(item?._id) ===
            String(newMessage._id)
        )
      ) {
        return previous;
      }

      return [...previous, newMessage];
    });
  };

  // ==========================================
  // SOCKET.IO
  // ==========================================

  useEffect(() => {
    if (!currentUser?._id) {
      return;
    }

    const socket = io(API_URL, {
      transports: ["websocket", "polling"],
    });

    socketRef.current = socket;

    socket.on("connect", () => {
      console.log("Socket connected:", socket.id);

      socket.emit("register_user", {
        userId: currentUser._id,
      });
    });

    socket.on("disconnect", (reason) => {
      console.log("Socket disconnected:", reason);
    });

    socket.on("connect_error", (error) => {
      console.error("Socket connection error:", error);
    });

    // ========================================
    // PRIVATE MESSAGE
    // ========================================

    socket.on("new_message", (incomingMessage) => {
      console.log(
        "New private message received:",
        incomingMessage
      );

      addMessageSafely(incomingMessage);
    });

    // ========================================
    // GROUP MESSAGE
    // ========================================

    socket.on(
      "new_group_message",
      (incomingMessage) => {
        console.log(
          "New group message received:",
          incomingMessage
        );

        addMessageSafely(incomingMessage);
      }
    );

    return () => {
      console.log("Cleaning socket connection");

      socket.disconnect();

      if (socketRef.current === socket) {
        socketRef.current = null;
      }
    };
  }, [currentUser]);

  // ==========================================
  // SAFE USER HELPERS
  // ==========================================

  const getUserName = (user) => {
    if (!user) {
      return "User";
    }

    if (typeof user === "string") {
      return "User";
    }

    return user.name || user.username || "User";
  };

  const getUserInitial = (user) => {
    const name = getUserName(user);

    return name.charAt(0).toUpperCase();
  };

  // ==========================================
  // PROFILE PHOTO URL
  // ==========================================

  const getPhotoUrl = (user) => {
    if (!user || typeof user !== "object") {
      return "";
    }

    if (!user.profilePhoto) {
      return "";
    }

    if (
      user.profilePhoto.startsWith("http://") ||
      user.profilePhoto.startsWith("https://")
    ) {
      return user.profilePhoto;
    }

    return `${API_URL}${user.profilePhoto}`;
  };

  // ==========================================
  // AVATAR
  // ==========================================

  const Avatar = ({
    user,
    size = "normal",
    group = false,
  }) => {
    if (group) {
      return (
        <div
          className={`avatar ${size} group-avatar`}
        >
          👥
        </div>
      );
    }

    const photo = getPhotoUrl(user);

    return (
      <div className={`avatar ${size}`}>
        {photo ? (
          <img
            src={photo}
            alt={getUserName(user)}
            onError={(event) => {
              console.error(
                "Profile image failed:",
                photo
              );

              event.currentTarget.style.display =
                "none";
            }}
          />
        ) : (
          getUserInitial(user)
        )}
      </div>
    );
  };

  // ==========================================
  // OPEN PRIVATE CHAT
  // ==========================================

  const openPrivateChat = async (user) => {
    if (!user?._id || !currentUser?._id) {
      return;
    }

    setSelectedChat({
      type: "private",
      user,
    });

    setMessages([]);
    setSelectedPhoto(null);
    setMessage("");

    socketRef.current?.emit("join_private", {
      user1: currentUser._id,
      user2: user._id,
    });

    try {
      const response = await fetch(
        `${API_URL}/api/messages/private/${currentUser._id}/${user._id}`
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.message || "Could not load messages"
        );
      }

      const normalizedMessages = Array.isArray(data)
        ? data
            .map((item) =>
              normalizeMessage(item)
            )
            .filter(Boolean)
        : [];

      setMessages(normalizedMessages);
    } catch (error) {
      console.error(
        "Private messages error:",
        error
      );

      setMessages([]);
    }
  };

  // ==========================================
  // OPEN GROUP CHAT
  // ==========================================

  const openGroupChat = async (group) => {
    if (!group?._id) {
      return;
    }

    setSelectedChat({
      type: "group",
      group,
    });

    setMessages([]);
    setSelectedPhoto(null);
    setMessage("");

    socketRef.current?.emit(
      "join_group",
      group._id
    );

    try {
      const response = await fetch(
        `${API_URL}/api/messages/group/${group._id}`
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.message ||
            "Could not load group messages"
        );
      }

      const normalizedMessages = Array.isArray(data)
        ? data
            .map((item) =>
              normalizeMessage(item)
            )
            .filter(Boolean)
        : [];

      setMessages(normalizedMessages);
    } catch (error) {
      console.error(
        "Group messages error:",
        error
      );

      setMessages([]);
    }
  };

  // ==========================================
  // SEND TEXT MESSAGE
  // ==========================================

  const sendTextMessage = async () => {
    if (
      !currentUser?._id ||
      !selectedChat ||
      !message.trim()
    ) {
      return;
    }

    const textToSend = message.trim();

    try {
      let response;

      // ========================================
      // PRIVATE
      // ========================================

      if (selectedChat.type === "private") {
        response = await fetch(
          `${API_URL}/api/messages/private`,
          {
            method: "POST",

            headers: {
              "Content-Type": "application/json",
            },

            body: JSON.stringify({
              sender: currentUser._id,
              receiver:
                selectedChat.user._id,
              type: "text",
              message: textToSend,
            }),
          }
        );
      }

      // ========================================
      // GROUP
      // ========================================

      else {
        response = await fetch(
          `${API_URL}/api/messages/group`,
          {
            method: "POST",

            headers: {
              "Content-Type": "application/json",
            },

            body: JSON.stringify({
              sender: currentUser._id,
              group:
                selectedChat.group._id,
              type: "text",
              message: textToSend,
            }),
          }
        );
      }

      const data = await response.json();

      console.log(
        "Message POST response:",
        data
      );

      if (!response.ok) {
        console.error(
          "Send message error:",
          data
        );

        return;
      }

      // ========================================
      // ADD SAVED MESSAGE
      // ========================================

      addMessageSafely(data);

      // Clear input
      setMessage("");

      /*
       IMPORTANT:

       We DO NOT emit private_message/group_message
       here.

       Your backend should emit new_message or
       new_group_message after saving the message.

       Emitting again here can cause duplicate
       messages.
      */
    } catch (error) {
      console.error(
        "Send text error:",
        error
      );
    }
  };

  // ==========================================
  // IMAGE SELECT
  // ==========================================

  const handlePhotoSelect = (event) => {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    if (!file.type.startsWith("image/")) {
      alert("Please select an image file.");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      alert("Image must be smaller than 5MB.");
      return;
    }

    setSelectedPhoto(file);

    event.target.value = "";
  };

  // ==========================================
  // SEND IMAGE
  // ==========================================

  const sendImage = async () => {
    if (
      !selectedPhoto ||
      !selectedChat ||
      !currentUser?._id
    ) {
      return;
    }

    try {
      const formData = new FormData();

      formData.append("image", selectedPhoto);

      const uploadResponse = await fetch(
        `${API_URL}/api/upload`,
        {
          method: "POST",
          body: formData,
        }
      );

      const uploadData =
        await uploadResponse.json();

      if (!uploadResponse.ok) {
        console.error(
          "Image upload failed:",
          uploadData
        );

        alert(
          uploadData.message ||
            "Image upload failed."
        );

        return;
      }

      const imageUrl =
        uploadData.imageUrl ||
        uploadData.url ||
        uploadData.path;

      if (!imageUrl) {
        alert(
          "Server did not return an image URL."
        );

        return;
      }

      let response;

      // ========================================
      // PRIVATE IMAGE
      // ========================================

      if (selectedChat.type === "private") {
        response = await fetch(
          `${API_URL}/api/messages/private`,
          {
            method: "POST",

            headers: {
              "Content-Type": "application/json",
            },

            body: JSON.stringify({
              sender: currentUser._id,
              receiver:
                selectedChat.user._id,
              type: "image",
              imageUrl,
            }),
          }
        );
      }

      // ========================================
      // GROUP IMAGE
      // ========================================

      else {
        response = await fetch(
          `${API_URL}/api/messages/group`,
          {
            method: "POST",

            headers: {
              "Content-Type": "application/json",
            },

            body: JSON.stringify({
              sender: currentUser._id,
              group:
                selectedChat.group._id,
              type: "image",
              imageUrl,
            }),
          }
        );
      }

      const data = await response.json();

      if (!response.ok) {
        console.error(
          "Save image message error:",
          data
        );

        return;
      }

      addMessageSafely(data);

      setSelectedPhoto(null);

      /*
       Do not manually emit here.
       The backend/socket should broadcast
       the saved message.
      */
    } catch (error) {
      console.error(
        "Image send error:",
        error
      );

      alert("Could not send image.");
    }
  };

  // ==========================================
  // SEND
  // ==========================================

  const sendMessage = async () => {
    if (selectedPhoto) {
      await sendImage();
      return;
    }

    await sendTextMessage();
  };

  // ==========================================
  // CREATE GROUP
  // ==========================================

  const createGroup = async () => {
    if (!groupName.trim()) {
      setGroupError(
        "Enter a group name."
      );

      return;
    }

    if (!currentUser?._id) {
      return;
    }

    setCreatingGroup(true);
    setGroupError("");

    try {
      const response = await fetch(
        `${API_URL}/api/groups`,
        {
          method: "POST",

          headers: {
            "Content-Type": "application/json",
          },

          body: JSON.stringify({
            name: groupName.trim(),

            admin: currentUser._id,

            members: [
              currentUser._id,
              ...selectedMembers,
            ],
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        setGroupError(
          data.message ||
            "Could not create group."
        );

        return;
      }

      const newGroup = data.group;

      if (newGroup) {
        setGroups((previous) => [
          newGroup,
          ...previous,
        ]);

        setGroupName("");
        setSelectedMembers([]);
        setShowGroupModal(false);

        openGroupChat(newGroup);
      }
    } catch (error) {
      console.error(
        "Create group error:",
        error
      );

      setGroupError(
        "Could not connect to the server."
      );
    } finally {
      setCreatingGroup(false);
    }
  };

  // ==========================================
  // TOGGLE MEMBER
  // ==========================================

  const toggleMember = (userId) => {
    setSelectedMembers((previous) => {
      if (previous.includes(userId)) {
        return previous.filter(
          (id) => id !== userId
        );
      }

      return [...previous, userId];
    });
  };

  // ==========================================
  // AUTH SCREEN
  // ==========================================

  if (!currentUser) {
    if (showRegister) {
      return (
        <Register
          onLogin={handleLogin}
        />
      );
    }

    return (
      <Login
        onLogin={handleLogin}
        goToRegister={() =>
          setShowRegister(true)
        }
      />
    );
  }

  // ==========================================
  // MAIN APPLICATION
  // ==========================================

  return (
    <div className="app">

      {/* ======================================
          SIDEBAR
      ====================================== */}

      <aside className="sidebar">

        <div className="sidebar-header">

          <h2>Messages</h2>

          <div className="current-user">

            <Avatar
              user={currentUser}
              size="small"
            />

            <div className="current-user-info">

              <strong>
                {getUserName(currentUser)}
              </strong>

              <span>
                @{currentUser.username ||
                  "user"}
              </span>

            </div>

            <button
              className="logout-button"
              onClick={handleLogout}
            >
              Logout
            </button>

          </div>

        </div>

        {/* ====================================
            PEOPLE
        ==================================== */}

        <div className="section">

          <h3>People</h3>

          {users.filter(
            (user) =>
              String(user?._id) !==
              String(currentUser?._id)
          ).length === 0 ? (

            <div className="no-users">
              No other users yet.
            </div>

          ) : (

            users
              .filter(
                (user) =>
                  String(user?._id) !==
                  String(currentUser?._id)
              )
              .map((user) => (

                <button
                  className="chat-item"
                  key={user._id}
                  onClick={() =>
                    openPrivateChat(user)
                  }
                >

                  <Avatar user={user} />

                  <div>

                    <strong>
                      {getUserName(user)}
                    </strong>

                    <span>
                      @{user.username ||
                        "user"}
                    </span>

                  </div>

                </button>

              ))

          )}

        </div>

        {/* ====================================
            GROUPS
        ==================================== */}

        <div className="section">

          <div className="section-title">

            <h3>Groups</h3>

            <button
              className="create-group-button"
              onClick={() => {
                setGroupError("");
                setGroupName("");
                setSelectedMembers([]);
                setShowGroupModal(true);
              }}
            >
              + Create
            </button>

          </div>

          {groups.length === 0 ? (

            <div className="no-users">
              No groups yet.
            </div>

          ) : (

            groups.map((group) => (

              <button
                className="chat-item"
                key={group._id}
                onClick={() =>
                  openGroupChat(group)
                }
              >

                <Avatar group />

                <div>

                  <strong>
                    {group.name ||
                      "Group"}
                  </strong>

                  <span>
                    {Array.isArray(
                      group.members
                    )
                      ? group.members.length
                      : 0}{" "}
                    members
                  </span>

                </div>

              </button>

            ))

          )}

        </div>

      </aside>

      {/* ======================================
          CHAT
      ====================================== */}

      <main className="chat">

        {!selectedChat ? (

          <div className="empty-chat">

            <div className="empty-icon">
              💬
            </div>

            <h1>
              Welcome to Messaging App
            </h1>

            <p>
              Select a person or group to
              start chatting.
            </p>

          </div>

        ) : (

          <>

            {/* =================================
                CHAT HEADER
            ================================= */}

            <header className="chat-header">

              {selectedChat.type ===
              "private" ? (

                <Avatar
                  user={
                    selectedChat.user
                  }
                />

              ) : (

                <Avatar group />

              )}

              <div>

                <h2>

                  {selectedChat.type ===
                  "private"
                    ? getUserName(
                        selectedChat.user
                      )
                    : selectedChat.group
                        ?.name ||
                      "Group"}

                </h2>

                <span>

                  {selectedChat.type ===
                  "private"
                    ? "Private conversation"
                    : `${
                        Array.isArray(
                          selectedChat.group
                            ?.members
                        )
                          ? selectedChat
                              .group
                              .members
                              .length
                          : 0
                      } members`}

                </span>

              </div>

            </header>

            {/* =================================
                MESSAGES
            ================================= */}

            <div className="messages">

              {messages.length === 0 ? (

                <div className="no-messages">
                  No messages yet. Say hello! 👋
                </div>

              ) : (

                messages.map(
                  (rawMessage, index) => {

                    // --------------------------------
                    // SAFETY NORMALIZATION
                    // --------------------------------

                    const msg =
                      normalizeMessage(
                        rawMessage
                      );

                    if (!msg) {
                      return null;
                    }

                    // --------------------------------
                    // SENDER
                    // --------------------------------

                    const sender =
                      msg.sender;

                    const senderId =
                      typeof sender ===
                      "object"
                        ? sender?._id
                        : sender;

                    const isMine =
                      String(
                        senderId
                      ) ===
                      String(
                        currentUser._id
                      );

                    // --------------------------------
                    // MESSAGE TYPE
                    // --------------------------------

                    const messageType =
                      msg.type || "text";

                    // --------------------------------
                    // MESSAGE TEXT
                    // --------------------------------

                    let messageText = "";

                    if (
                      typeof msg.message ===
                      "string"
                    ) {
                      messageText =
                        msg.message;
                    }

                    // If somehow message is
                    // still an object, safely
                    // extract its text.

                    else if (
                      msg.message &&
                      typeof msg.message ===
                        "object"
                    ) {
                      messageText =
                        typeof msg.message
                          .message ===
                        "string"
                          ? msg.message
                              .message
                          : "";
                    }

                    // --------------------------------
                    // IMAGE URL
                    // --------------------------------

                    let imageUrl =
                      msg.imageUrl || "";

                    if (
                      imageUrl &&
                      !imageUrl.startsWith(
                        "http://"
                      ) &&
                      !imageUrl.startsWith(
                        "https://"
                      )
                    ) {
                      imageUrl =
                        `${API_URL}${imageUrl}`;
                    }

                    return (

                      <div
                        key={
                          msg._id ||
                          `${index}-${msg.createdAt || ""}`
                        }
                        className={`message-row ${
                          isMine
                            ? "mine"
                            : "theirs"
                        }`}
                      >

                        <div className="message-bubble">

                          {/* GROUP SENDER */}

                          {selectedChat.type ===
                            "group" &&
                            !isMine && (

                              <small>

                                {getUserName(
                                  sender
                                )}

                              </small>

                            )}

                          {/* IMAGE */}

                          {messageType ===
                            "image" &&
                          imageUrl ? (

                            <img
                              className="message-image"
                              src={imageUrl}
                              alt="Sent"
                              onError={(
                                event
                              ) => {
                                console.error(
                                  "Message image failed:",
                                  imageUrl
                                );

                                event.currentTarget.style.display =
                                  "none";
                              }}
                            />

                          ) : (

                            /* TEXT */

                            <p>
                              {messageText}
                            </p>

                          )}

                          {/* TIME */}

                          <time>

                            {msg.createdAt
                              ? new Date(
                                  msg.createdAt
                                ).toLocaleTimeString(
                                  [],
                                  {
                                    hour:
                                      "2-digit",
                                    minute:
                                      "2-digit",
                                  }
                                )
                              : ""}

                          </time>

                        </div>

                      </div>

                    );
                  }
                )

              )}

            </div>

            {/* =================================
                SELECTED PHOTO
            ================================= */}

            {selectedPhoto && (

              <div className="selected-photo-preview">

                <div>

                  <strong>
                    Photo selected
                  </strong>

                  <span>
                    {selectedPhoto.name}
                  </span>

                </div>

                <button
                  onClick={() =>
                    setSelectedPhoto(null)
                  }
                >
                  ✕
                </button>

              </div>

            )}

            {/* =================================
                MESSAGE INPUT
            ================================= */}

            <div className="message-input">

              <label className="attachment-button">

                📷

                <input
                  type="file"
                  accept="image/*"
                  onChange={
                    handlePhotoSelect
                  }
                  hidden
                />

              </label>

              <input
                type="text"
                placeholder={
                  selectedPhoto
                    ? "Press Send to send photo"
                    : "Type a message..."
                }
                value={message}
                disabled={
                  !!selectedPhoto
                }
                onChange={(event) =>
                  setMessage(
                    event.target.value
                  )
                }
                onKeyDown={(event) => {

                  if (
                    event.key ===
                      "Enter" &&
                    !event.shiftKey
                  ) {
                    event.preventDefault();

                    sendMessage();
                  }

                }}
              />

              <button
                className="send-button"
                onClick={sendMessage}
                disabled={
                  !message.trim() &&
                  !selectedPhoto
                }
              >
                Send
              </button>

            </div>

          </>

        )}

      </main>

      {/* ======================================
          CREATE GROUP MODAL
      ====================================== */}

      {showGroupModal && (

        <div
          className="modal-overlay"
          onClick={(event) => {

            if (
              event.target ===
              event.currentTarget
            ) {
              setShowGroupModal(false);
            }

          }}
        >

          <div className="group-modal">

            <div className="modal-header">

              <div>

                <h2>
                  Create Group
                </h2>

                <p>
                  Choose people to add to
                  your group.
                </p>

              </div>

              <button
                className="close-modal"
                onClick={() =>
                  setShowGroupModal(false)
                }
              >
                ×
              </button>

            </div>

            {/* GROUP NAME */}

            <div className="form-group">

              <label>
                Group Name
              </label>

              <input
                type="text"
                placeholder="Enter group name"
                value={groupName}
                onChange={(event) =>
                  setGroupName(
                    event.target.value
                  )
                }
              />

            </div>

            {/* MEMBERS */}

            <div className="form-group">

              <label>
                Select Members
              </label>

              <div className="member-list">

                {users
                  .filter(
                    (user) =>
                      String(
                        user?._id
                      ) !==
                      String(
                        currentUser?._id
                      )
                  )
                  .map((user) => {

                    const selected =
                      selectedMembers.includes(
                        user._id
                      );

                    return (

                      <button
                        type="button"
                        key={user._id}
                        className={`member-option ${
                          selected
                            ? "selected"
                            : ""
                        }`}
                        onClick={() =>
                          toggleMember(
                            user._id
                          )
                        }
                      >

                        <div className="member-avatar">

                          {getPhotoUrl(
                            user
                          ) ? (

                            <img
                              src={getPhotoUrl(
                                user
                              )}
                              alt={getUserName(
                                user
                              )}
                              onError={(
                                event
                              ) => {
                                event.currentTarget.style.display =
                                  "none";
                              }}
                            />

                          ) : (

                            getUserInitial(
                              user
                            )

                          )}

                        </div>

                        <div className="member-info">

                          <strong>
                            {getUserName(
                              user
                            )}
                          </strong>

                          <span>
                            @{user.username ||
                              "user"}
                          </span>

                        </div>

                        <div className="check-box">

                          {selected
                            ? "✓"
                            : ""}

                        </div>

                      </button>

                    );
                  })}

              </div>

            </div>

            {/* ERROR */}

            {groupError && (

              <div className="auth-message">
                {groupError}
              </div>

            )}

            {/* SELECTED COUNT */}

            <div className="selected-count">

              {selectedMembers.length}{" "}
              additional member
              {selectedMembers.length !==
              1
                ? "s"
                : ""}{" "}
              selected

              <span>
                You will automatically be
                added as the admin.
              </span>

            </div>

            {/* ACTIONS */}

            <div className="modal-actions">

              <button
                className="cancel-button"
                onClick={() =>
                  setShowGroupModal(false)
                }
              >
                Cancel
              </button>

              <button
                className="create-button"
                disabled={
                  creatingGroup ||
                  !groupName.trim()
                }
                onClick={createGroup}
              >
                {creatingGroup
                  ? "Creating..."
                  : "Create Group"}
              </button>

            </div>

          </div>

        </div>

      )}

    </div>
  );
}

export default App;