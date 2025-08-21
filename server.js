import { createServer } from "http";
import { parse } from "url";
import next from "next";
import { Server } from "socket.io";
// const { createServer } = require("http");
// const { parse } = require("url");
// const next = require("next");

const dev = process.env.NODE_ENV !== "production";
const app = next({ dev });
const handle = app.getRequestHandler();

import mongoose from "mongoose";
// const mongoose = require("mongoose");

// Simple database connection
async function connectDB() {
  try {
    await mongoose.connect(
      process.env.MONGODB_URI || "mongodb://localhost:27017/chat-app",
    );
    console.log("Connected to MongoDB");
  } catch (error) {
    console.log("MongoDB connection error:", error);
  }
}

// Simple message schema
const MessageSchema = new mongoose.Schema(
  {
    room: String,
    user: String,
    text: String,
    timestamp: String,
  },
  { timestamps: true },
);

const Message =
  mongoose.models.Message || mongoose.model("Message", MessageSchema);

// Your simple socket service (adapted from your original)
class SocketService {
  constructor() {
    this.io = null;
    this.currentActiveUsers = [];
    this.rooms = [
      { name: "General", userCount: 0 },
      { name: "Tech Talk", userCount: 0 },
      { name: "Random", userCount: 0 },
    ];
  }

  initializeServer(server) {
    this.io = new Server(server, {
      cors: {
        origin: [
          "https://chat.khush.pro",           // Your production domain
          "http://chat.khush.pro",            // HTTP version (if needed)
          `http://localhost:${process.env.PORT || 3001}`, // Server's own port
          `https://localhost:${process.env.PORT || 3001}`, // HTTPS version
        ],
        methods: ["GET", "POST"],
        credentials: false,
      },
    });
    this.setupHandlers();
  }

  setupHandlers() {
    this.io.on("connect", (socket) => {
      console.log(`connected User = ${socket.id}`);

      // Get rooms
      socket.on("get-rooms", () => {
        socket.emit("rooms-list", this.rooms);
      });

      // Create room
      socket.on("create-room", (data) => {
        const existingRoom = this.rooms.find(
          (room) => room.name === data.roomName,
        );
        if (!existingRoom) {
          const newRoom = { name: data.roomName, userCount: 0 };
          this.rooms.push(newRoom);
          this.io.emit("room-created", newRoom);
        }
      });

      // Join Room
      socket.on("join-room", async (data) => {
        const { username, roomName } = data;

        this.currentActiveUsers.push({
          socketId: socket.id,
          user: username,
          room: roomName,
        });

        socket.join(roomName);

        // Update room user count
        const room = this.rooms.find((r) => r.name === roomName);
        if (room) {
          room.userCount += 1;
        }

        // Get messages from database
        const roomMessages = await Message.find({ room: roomName })
          .sort({ createdAt: -1 })
          .limit(50)
          .lean();

        roomMessages.reverse(); // Show oldest first

        socket.emit("room-joined", {
          messages: roomMessages,
          userCount: room ? room.userCount : 1,
        });

        this.io
          .to(roomName)
          .emit("user-count-updated", room ? room.userCount : 1);
      });

      // Send Message
      socket.on("send-message", async (data) => {
        const user = this.currentActiveUsers.find(
          (u) => u.socketId === socket.id,
        );
        if (user) {
          const message = new Message({
            room: user.room,
            user: user.user,
            text: data.text,
            timestamp: new Date().toLocaleTimeString(),
          });

          // Save to database
          await message.save();

          this.io.to(user.room).emit("message-received", message);
        }
      });

      // Leave Room
      socket.on("leave-room", () => {
        const userIndex = this.currentActiveUsers.findIndex(
          (u) => u.socketId === socket.id,
        );
        if (userIndex !== -1) {
          const user = this.currentActiveUsers[userIndex];
          const room = this.rooms.find((r) => r.name === user.room);
          if (room && room.userCount > 0) {
            room.userCount -= 1;
          }
          socket.leave(user.room);
          this.currentActiveUsers.splice(userIndex, 1);
          this.io
            .to(user.room)
            .emit("user-count-updated", room ? room.userCount : 0);
        }
      });

      // Disconnect
      socket.on("disconnect", () => {
        const userIndex = this.currentActiveUsers.findIndex(
          (u) => u.socketId === socket.id,
        );
        if (userIndex !== -1) {
          const user = this.currentActiveUsers[userIndex];
          const room = this.rooms.find((r) => r.name === user.room);
          if (room && room.userCount > 0) {
            room.userCount -= 1;
          }
          socket.leave(user.room);
          this.currentActiveUsers.splice(userIndex, 1);
          this.io
            .to(user.room)
            .emit("user-count-updated", room ? room.userCount : 0);
        }
      });
    });
  }
}

const socketService = new SocketService();

await connectDB();

app.prepare().then(() => {
  const server = createServer((req, res) => {
    const parsedUrl = parse(req.url, true);
    handle(req, res, parsedUrl);
  });

  socketService.initializeServer(server);

  const PORT = process.env.PORT || 3001;

  server.listen(PORT, (err) => {
    if (err) throw err;
    console.log(`> Ready on http://localhost:${PORT}`);
  });
});
