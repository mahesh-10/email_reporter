const nodemailer = require("nodemailer");
const path = require("path");
const ejs = require("ejs");
const fs = require("fs");

function sendEmail(reportData) {
  let transporter = nodemailer.createTransport({
    service: "gmail",
    port: 587,
    secure: false,
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASSWORD,
    },
  });

  const col = Object.keys(reportData);
  const attachments = [];
  if (fs.existsSync(path.join(__dirname, "./tickets.csv"))) {
    attachments.push({
      filename: "tickets.csv",
      path: path.join(__dirname, "./tickets.csv"),
      contentType: "application/csv",
    });
  }
  if (fs.existsSync(path.join(__dirname, "./chats.csv"))) {
    attachments.push({
      filename: "chats.csv",
      path: path.join(__dirname, "./chats.csv"),
      contentType: "application/csv",
    });
  }
  if (fs.existsSync(path.join(__dirname, "./messages.csv"))) {
    attachments.push({
      filename: "messages.csv",
      path: path.join(__dirname, "./messages.csv"),
      contentType: "application/csv",
    });
  }
  if (fs.existsSync(path.join(__dirname, "./user_session.csv"))) {
    attachments.push({
      filename: "user_session.csv",
      path: path.join(__dirname, "./user_session.csv"),
      contentType: "application/csv",
    });
  }
  console.log(attachments);
  ejs.renderFile(
    __dirname + "/templates/report.ejs",
    { reportData, col },
    async (err, data) => {
      if (err) {
        console.log(err);
      } else {
        const mailOptions = {
          from: process.env.EMAIL_FROM,
          to: process.env.EMAIL_TO,
          subject: "Reports",
          html: data,
          attachments: attachments,
        };
        let info = await transporter.sendMail(mailOptions);
        console.log("Message successfully sent: %s", info.messageId);
      }
    }
  );
}

module.exports = {
  sendEmail,
};
