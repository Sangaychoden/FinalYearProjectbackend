const { sendMailWithGmailApi } = require("../utils/gmailSender");

exports.sendContactMessage = async (req, res) => {
  try {
    const { name, email, subject, message } = req.body;

    if (!name || !email || !subject || !message) {
      return res.status(400).json({
        message: "All fields are required: name, email, subject, message",
      });
    }

    // Styled email (same style as booking / OTP emails)
    const html = `
      <div style="font-family: Arial, sans-serif; padding: 15px; background-color: #f9f9f9;">
        <div style="max-width: 600px; margin: auto; background: white; border-radius: 10px; padding: 20px; border: 1px solid #ddd;">
          <h2 style="color: #006600;">New Contact Form Message</h2>

          <p><strong>Name:</strong> ${name}</p>
          <p><strong>Email:</strong> ${email}</p>
          <p><strong>Subject:</strong> ${subject}</p>

          <h3>Message:</h3>
          <p>${message}</p>

          <p style="margin-top: 20px;">
            Best Regards,<br>
            <strong>Hotel Management Team</strong>
          </p>
        </div>
      </div>
    `;

    // send email to admin or hotel email
    await sendMailWithGmailApi(
      process.env.ADMIN_EMAIL,       // RECEIVER (you)
      `New Contact Message: ${subject}`,
      html
    );

    res.status(200).json({
      message: "Your message has been sent successfully. Thank you!",
    });

  } catch (err) {
    console.error("CONTACT FORM ERROR:", err);
    res.status(500).json({
      message: "Failed to send message. Try again later.",
    });
  }
};
