const Pool = require("pg").Pool;
const mongoose = require("mongoose");

const pool = new Pool({
  user: process.env.PGSQL_USERNAME,
  host: process.env.PGSQL_HOST,
  database: process.env.PGSQL_DB_NAME,
  password: process.env.PGSQL_PWD,
  port: process.env.PGSQL_PORT,
});

mongoose.set("strictQuery", false);
mongoose.connect(process.env.MONGO_URL, {
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
