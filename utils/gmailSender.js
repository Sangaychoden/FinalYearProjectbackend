const { google } = require("googleapis");

async function sendMailWithGmailApi(to, subject, htmlContent) {
  const oauth2Client = new google.auth.OAuth2(
    process.env.GMAIL_CLIENT_ID,
    process.env.GMAIL_CLIENT_SECRET,
    process.env.REDIRECT_URI
  );

  oauth2Client.setCredentials({
    refresh_token: process.env.GMAIL_REFRESH_TOKEN,
  });

  const accessTokenObj = await oauth2Client.getAccessToken();
  const accessToken = accessTokenObj?.token || accessTokenObj;

  const gmail = google.gmail({ version: "v1", auth: oauth2Client });

  const messageParts = [
    `From: ${process.env.GMAIL_USER}`,
    `To: ${to}`,
    `Subject: ${subject}`,
    "MIME-Version: 1.0",
    "Content-Type: text/html; charset=UTF-8",
    "",
    htmlContent,
  ];

  const message = messageParts.join("\n");

  const encodedMessage = Buffer.from(message)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");

  await gmail.users.messages.send({
    userId: "me",
    requestBody: { raw: encodedMessage },
  });
}

module.exports = { sendMailWithGmailApi };
