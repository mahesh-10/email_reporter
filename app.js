require("dotenv").config();
const express = require("express");
const port = process.env.PORT || 3000;
const { db } = require("./database");
const { getReportData } = require("./queries");
require("./queries");

const app = express();

(async () => {
  await getReportData();
})();

app.listen(port, () => {
  console.log("Server is listening on port : ", port);
});
