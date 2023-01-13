const mongoose = require("mongoose");

const Schema = mongoose.Schema;
const Chat_Message = mongoose.model(
  "chat_message",
  new Schema({}),
  "chat_messages"
);

module.exports = Chat_Message;
