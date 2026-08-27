import { io } from "socket.io-client";
import { API_URL } from "../config";

let socket = null;

export const connectSocket = (userId) => {
  if (!userId) {
    return null;
  }

  if (socket?.connected) {
    return socket;
  }

  socket = io(API_URL, {
    transports: ["websocket", "polling"],
    reconnection: true,
    reconnectionAttempts: 10,
    reconnectionDelay: 1000,
  });

  socket.on("connect", () => {
    console.log(
      "Socket connected:",
      socket.id
    );

    socket.emit("register_user", {
      userId,
    });
  });

  socket.on("connect_error", (error) => {
    console.log(
      "Socket connection error:",
      error.message
    );
  });

  socket.on("disconnect", (reason) => {
    console.log(
      "Socket disconnected:",
      reason
    );
  });

  return socket;
};

export const getSocket = () => {
  return socket;
};

export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
};