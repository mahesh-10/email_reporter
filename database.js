const Pool = require("pg").Pool;
const mongoose = require("mongoose");

const pool = new Pool({
  user: "postgres",
  host: "localhost",
  database: "little_joys",
  password: "1234",
  port: 5432,
});

mongoose.set("strictQuery", false);
mongoose.connect("mongodb://localhost:27017/tellephant", {
  useNewUrlParser: true,
});

const db = mongoose.connection;
db.on("error", console.error.bind(console, "connection error: "));
db.once("open", function () {
  console.log("Connected to database successfully");
});

module.exports = {
  db,
  pool,
};
