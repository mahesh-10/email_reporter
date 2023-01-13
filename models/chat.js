const mongoose = require("mongoose");

const Schema = mongoose.Schema;
const Chat = mongoose.model("Chat", new Schema({}), "chats");

module.exports = Chat;
