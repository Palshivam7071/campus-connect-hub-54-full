// models/ChatMessage.js
const mongoose = require("mongoose");

const ChatMessageSchema = new mongoose.Schema(
  {
    roomId: { type: String, required: true }, // typically studentId
    senderRole: { type: String, enum: ["admin", "student"], required: true },
    senderName: { type: String },
    message: { type: String, required: true },
    timestamp: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

// Instead of exporting the model directly, export a function that binds it to a custom connection
module.exports = (connection) => connection.model("chatmessages", ChatMessageSchema);
