"use client";
import React, { useEffect, useRef, useState } from "react";
import { io } from "socket.io-client";

let socket;

export default function Home() {
  const [currentScreen, setCurrentScreen] = useState("join");
  const [userCount, setUserCount] = useState(0);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [username, setUsername] = useState("");
  const [selectedRoom, setSelectedRoom] = useState("");
  const [rooms, setRooms] = useState([]);
  const [newRoomName, setNewRoomName] = useState("");
  const [isConnected, setIsConnected] = useState(false);
  const [connectionError, setConnectionError] = useState("");
  const [activeTab, setActiveTab] = useState("join");

  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  // Auto-scroll when messages change
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    socketInitializer();
    return () => {
      if (socket) {
        socket.disconnect();
      }
    };
  }, []);

  const socketInitializer = async () => {
    try {
      socket = io(`http://localhost:${process.env.PORT || 3001}`, {

      });
      // socket = io();

      socket.on("connect", () => {
        console.log(`Socket connected: ${socket.id}`);
        setIsConnected(true);
        setConnectionError("");
        socket.emit("get-rooms");
      });

      socket.on("connect_error", (error) => {
        console.error("Connection error:", error);
        setConnectionError("Failed to connect to server");
        setIsConnected(false);
      });

      socket.on("disconnect", () => {
        setIsConnected(false);
        setCurrentScreen("join");
      });

      socket.on("rooms-list", (roomsList) => {
        setRooms(roomsList);
      });

      socket.on("room-joined", (data) => {
        setMessages(data.messages);
        setUserCount(data.userCount);
        setCurrentScreen("chat");
      });

      socket.on("user-count-updated", (count) => {
        setUserCount(count);
      });

      socket.on("message-received", (message) => {
        setMessages((prev) => [...prev, message]);
      });

      socket.on("room-created", (room) => {
        setRooms((prev) => [...prev, room]);
        setNewRoomName("");
      });
    } catch (error) {
      console.error("Socket initialization error:", error);
      setConnectionError("Failed to initialize connection");
    }
  };

  const joinRoom = () => {
    if (!isConnected) {
      setConnectionError("Please wait for connection to establish");
      return;
    }

    if (username.trim() && selectedRoom.trim()) {
      socket.emit("join-room", {
        username: username.trim(),
        roomName: selectedRoom,
      });
    }
  };

  const createRoom = () => {
    if (!isConnected) return;

    if (newRoomName.trim() && username.trim()) {
      socket.emit('create-room', { roomName: newRoomName.trim() });
      setSelectedRoom(newRoomName.trim());
      setNewRoomName("");
    }
  };


  const leaveRoom = () => {
    if (socket) {
      socket.emit("leave-room");
    }
    setCurrentScreen("join");
    setUserCount(0);
    setMessages([]);
    setSelectedRoom("");
  };

  const sendMessage = () => {
    if (!isConnected) return;

    if (newMessage.trim()) {
      socket.emit("send-message", {
        text: newMessage.trim(),
        roomName: selectedRoom,
      });
      setNewMessage("");
    }
  };

  const handleKeyPress = (e, action) => {
    if (e.key === "Enter") {
      action();
    }
  };

  if (!isConnected && currentScreen === "join") {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="bg-gray-800 p-8 rounded-lg shadow-xl max-w-md w-full border border-gray-700">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-400 mx-auto mb-4"></div>
            <h2 className="text-xl font-semibold mb-2 text-gray-100">
              Connecting to Chat Server...
            </h2>
            {connectionError && (
              <p className="text-red-400 text-sm">{connectionError}</p>
            )}
          </div>
        </div>
      </div>
    );
  }

  if (currentScreen === "join") {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
        <div className="bg-gray-800 p-8 rounded-lg shadow-xl max-w-md w-full border border-gray-700">
          <h1 className="text-2xl font-bold text-center mb-6 text-gray-100">
            Join Chat Room
          </h1>

          {/* Username Input */}
          <div className="mb-6">
            <label className="block text-gray-300 text-sm font-bold mb-2">
              Your Name
            </label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-100 placeholder-gray-400"
              placeholder="Enter your username"
              maxLength={20}
            />
          </div>

          {/* Tab Navigation */}
          <div className="flex mb-4 bg-gray-700 rounded-lg p-1">
            <button
              onClick={() => setActiveTab("join")}
              className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
                activeTab === "join"
                  ? "bg-blue-600 text-white"
                  : "text-gray-300 hover:text-white"
              }`}
            >
              Join Room
            </button>
            <button
              onClick={() => setActiveTab("create")}
              className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
                activeTab === "create"
                  ? "bg-green-600 text-white"
                  : "text-gray-300 hover:text-white"
              }`}
            >
              Create Room
            </button>
          </div>

          {/* Tab Content */}
          {activeTab === "join" ? (
            <div>
              <div className="mb-6">
                <label className="block text-gray-300 text-sm font-bold mb-2">
                  Select Room
                </label>
                <select
                  value={selectedRoom}
                  onChange={(e) => setSelectedRoom(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-100"
                >
                  <option value="">Choose a room...</option>
                  {rooms.map((room, index) => (
                    <option key={index} value={room.name}>
                      {room.name} ({room.userCount} users)
                    </option>
                  ))}
                </select>
              </div>
              <button
                onClick={joinRoom}
                disabled={!username.trim() || !selectedRoom.trim()}
                className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 disabled:bg-gray-600 font-medium"
              >
                Join Room
              </button>
            </div>
          ) : (
            <div>
              <div className="mb-6">
                <label className="block text-gray-300 text-sm font-bold mb-2">
                  Room Name
                </label>
                <input
                  type="text"
                  value={newRoomName}
                  onChange={(e) => setNewRoomName(e.target.value)}
                  onKeyPress={(e) => handleKeyPress(e, createRoom)}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 text-gray-100 placeholder-gray-400"
                  placeholder="Enter room name"
                  maxLength={30}
                />
              </div>
              <button
                onClick={() => {
                  createRoom();
                  setActiveTab("join");
                }}
                disabled={!username.trim() || !newRoomName.trim()}
                className="w-full bg-green-600 text-white py-2 px-4 rounded-lg hover:bg-green-700 disabled:bg-gray-600 font-medium"
              >
                Create & Join Room
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-gray-100">
      <div className="bg-gray-800 shadow-sm border-b border-gray-700 px-4 py-3">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-xl font-semibold text-gray-100">
              Room: {selectedRoom}
            </h1>
            <p className="text-sm text-gray-400">{userCount} users online</p>
          </div>
          <button
            onClick={leaveRoom}
            className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700"
          >
            Leave Room
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 pb-20 max-h-screen">
        <div className="max-w-3xl mx-auto">
          {messages.map((message) => (
            <div
              key={message.id}
              className={`mb-4 p-3 rounded-lg max-w-xs ${
                message.user === username
                  ? "bg-blue-600 text-white ml-auto"
                  : message.user === "System" || message.user === "Server"
                    ? "bg-gray-700 text-gray-300 mx-auto text-center"
                    : "bg-gray-700 shadow-sm text-gray-100"
              }`}
            >
              {message.user !== "System" &&
                message.user !== "Server" &&
                message.user !== username && (
                  <div className="text-xs font-semibold mb-1 text-gray-300">
                    {message.user}
                  </div>
                )}
              <div className="text-sm">{message.text}</div>
              <div className="text-xs opacity-70 mt-1">{message.timestamp}</div>
            </div>
          ))}
          <div ref={messagesEndRef}/>
        </div>
      </div>

      <div className="fixed bottom-0 left-0 right-0 bg-gray-800 border-t border-gray-700 p-4">
        <div className="max-w-3xl mx-auto flex gap-2">
          <input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyPress={(e) => handleKeyPress(e, sendMessage)}
            className="flex-1 px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-100 placeholder-gray-400"
            placeholder="Type your message..."
            maxLength={500}
          />
          <button
            onClick={sendMessage}
            disabled={!newMessage.trim()}
            className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 disabled:bg-gray-600"
          >
            Send
          </button>
        </div>
      </div>
    </div>
  );
}
