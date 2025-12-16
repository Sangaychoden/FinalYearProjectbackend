
const Receptionist = require("../models/receptionistModel");
const bcrypt = require("bcryptjs");
const { sendMailWithGmailApi } = require("../utils/gmailSender");

// Generate readable strong password
const generatePassword = () => {
  const randomNumber = Math.floor(10 + Math.random() * 90);
  const letters = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz";
  const r1 = letters.charAt(Math.floor(Math.random() * letters.length));
  const r2 = letters.charAt(Math.floor(Math.random() * letters.length));
  return `recep${randomNumber}${r1}${r2}`; // Example: recep41Ag
};

// =========================================================
// CREATE RECEPTIONIST (Using Gmail API)
// =========================================================
exports.createReceptionist = async (req, res) => {
  try {
    const { username, email } = req.body;

    if (!username || !email) {
      return res.status(400).json({ message: "Username and email are required" });
    }

    // Check duplicate
    const existing = await Receptionist.findOne({ email });
    if (existing) {
      return res.status(400).json({ message: "Receptionist already exists" });
    }

    // Generate + hash password
    const password = generatePassword();
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create receptionist
    const receptionist = await Receptionist.create({
      username,
      email,
      password: hashedPassword,
    });

    // Email HTML — Same style as OTP email
    const htmlContent = `
      <div style="font-family: Arial, sans-serif; padding: 15px; background-color: #f9f9f9;">
        <div style="max-width: 500px; margin: auto; background: white; border-radius: 10px; padding: 20px; border: 1px solid #ddd;">
          <h2 style="color: #006600;">Receptionist Account Created</h2>

          <p>Dear <strong>${username}</strong>,</p>
          <p>Your receptionist account has been created successfully.</p>
          
          <p><strong>Username:</strong> ${username}</p>
          <p><strong>Password:</strong> ${password}</p>

          <p>Please log in using these credentials and change your password immediately.</p>

          <p style="margin-top: 20px;">
            Best Regards,<br>
            <strong>ThimDorji Resort admin</strong>
          </p>
        </div>
      </div>
    `;

    // Send email using Google API (NO SMTP ERRORS EVER)
    await sendMailWithGmailApi(email, "Receptionist Account Login Details", htmlContent);

    res.status(201).json({
      message: "Receptionist created and email sent successfully",
      receptionist,
    });

  } catch (error) {
    console.error("❌ Create Receptionist Error:", error);
    res.status(500).json({ message: "Server error creating receptionist", error: error.message });
  }
};

// =========================================================
// ✅ GET ALL
// =========================================================
exports.getAllReceptionists = async (req, res) => {
  try {
    const receptionists = await Receptionist.find().select("-password");
    res.json({ receptionists });
  } catch (error) {
    console.error("❌ Fetch Receptionists Error:", error);
    res.status(500).json({ message: "Server error fetching receptionists" });
  }
};

// =========================================================
// ✅ DELETE
// =========================================================
exports.deleteReceptionist = async (req, res) => {
  try {
    const deleted = await Receptionist.findByIdAndDelete(req.params.id);

    if (!deleted) {
      return res.status(404).json({ message: "Receptionist not found" });
    }

    res.json({ message: "Receptionist deleted successfully" });

  } catch (error) {
    console.error("❌ Delete Receptionist Error:", error);
    res.status(500).json({ message: "Server error deleting receptionist" });
  }
};

// =========================================================
// ✅ CHANGE PASSWORD + SEND EMAIL (Gmail API)
// =========================================================
exports.changePassword = async (req, res) => {
  try {
    const { id } = req.params;
    const { username, newPassword, confirmNewPassword } = req.body;

    if (!id || !username || !newPassword || !confirmNewPassword) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    if (newPassword !== confirmNewPassword) {
      return res.status(400).json({ message: "Passwords do not match" });
    }

    const receptionist = await Receptionist.findById(id);
    if (!receptionist) {
      return res.status(404).json({ message: "Receptionist not found" });
    }

    if (receptionist.username !== username) {
      return res.status(400).json({ message: "Username does not match" });
    }

    receptionist.password = await bcrypt.hash(newPassword, 10);
    await receptionist.save();

    // Email HTML
    const htmlContent = `
      <div style="font-family: Arial, sans-serif; padding: 15px; background-color: #f9f9f9;">
        <div style="max-width: 500px; margin: auto; background: white; border-radius: 10px; padding: 20px; border: 1px solid #ddd;">
          <h2 style="color: #006600;">Password Updated</h2>
          <p>Dear <strong>${receptionist.username}</strong>,</p>

          <p>Your password has been successfully updated by the administrator.</p>

          <p><strong>New Password:</strong> ${newPassword}</p>

          <p>Please log in with this password and change it after login.</p>

          <p style="margin-top: 20px;">
            Best Regards,<br>
            <strong>ThimDorji Resort Admin</strong>
          </p>
        </div>
      </div>
    `;

    await sendMailWithGmailApi(receptionist.email, "Password Changed Successfully", htmlContent);

    res.json({ message: "Password updated and email sent" });

  } catch (error) {
    console.error("❌ Change Password Error:", error);
    res.status(500).json({ message: "Server error changing password", error: error.message });
  }
};
