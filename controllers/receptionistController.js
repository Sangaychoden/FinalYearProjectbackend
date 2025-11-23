const Receptionist = require("../models/receptionistModel");
const bcrypt = require("bcryptjs");
const nodemailer = require("nodemailer");
const crypto = require("crypto");

// ✅ Configure transporter for email
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

// ✅ Generate readable, slightly strong password like "recep27Xq"
const generatePassword = () => {
  const randomNumber = Math.floor(10 + Math.random() * 90); // 2-digit number (10–99)
  const letters = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz";
  const randomLetters =
    letters.charAt(Math.floor(Math.random() * letters.length)) +
    letters.charAt(Math.floor(Math.random() * letters.length));

  return `recep${randomNumber}${randomLetters}`; // Example: recep27Xq
};


// exports.createReceptionist = async (req, res) => {
//   try {
//     const { username, email } = req.body;

//     if (!username || !email) {
//       return res.status(400).json({ message: "Username and email are required" });
//     }

//     const existing = await Receptionist.findOne({ email });
//     if (existing) {
//       return res.status(400).json({ message: "Receptionist already exists" });
//     }

//     // ✅ Properly await the password string
//     const password = await generatePassword();  
//     const hashedPassword = await bcrypt.hash(String(password), 10);  // ensure it's a string

//     const receptionist = await Receptionist.create({
//       username,
//       email,
//       password: hashedPassword,
//     });

//     // ✅ Email the credentials
//     await transporter.sendMail({
//       from: process.env.EMAIL_USER,
//       to: email,
//       subject: "Your Receptionist Account Login Details",
//       html: `
//         <h3>Welcome, ${username}!</h3>
//         <p>Your receptionist account has been created successfully.</p>
//         <p><b>Username:</b> ${username}</p>
//         <p><b>Password:</b> ${password}</p>
//         <p>Please log in and change your password after your first login.</p>
//       `,
//     });

//     res.status(201).json({
//       message: "Receptionist created successfully",
//       receptionist,
//     });
//   } catch (error) {
//     console.error("❌ Create Receptionist Error:", error);
//     res.status(500).json({ message: "Server error creating receptionist" });
//   }
// };
exports.createReceptionist = async (req, res) => {
  try {
    const { username, email } = req.body;

    if (!username || !email) {
      return res.status(400).json({ message: "Username and email are required" });
    }

    const existing = await Receptionist.findOne({ email });
    if (existing) {
      return res.status(400).json({ message: "Receptionist already exists" });
    }

    const password = await generatePassword();
    const hashedPassword = await bcrypt.hash(String(password), 10);

    const receptionist = await Receptionist.create({
      username,
      email,
      password: hashedPassword,
    });

    // ---------- HTML EMAIL IN SAME FORMAT ----------
    const htmlContent = `
      <div style="font-family: Arial, sans-serif; padding: 15px; background-color: #f9f9f9;">
        <div style="max-width: 500px; margin: auto; background: white; border-radius: 10px; padding: 20px; border: 1px solid #ddd;">

          <h2 style="color: #006600;">Receptionist Account Created</h2>

          <p>Dear <strong>${username}</strong>,</p>
          <p>Your receptionist account has been successfully created. Use the credentials below to log in:</p>

          <p><strong>Username:</strong> ${username}</p>
          <p><strong>Password:</strong> ${password}</p>

          <p style="margin-top: 10px;">
            Please change your password immediately after your first login.
          </p>

          <p style="margin-top: 20px;">Best Regards,<br>
          <strong>Hotel Management Team</strong></p>

        </div>
      </div>
    `;

    await sendMailWithGmailApi(
      email,
      "Receptionist Account Login Details",
      htmlContent
    );

    res.status(201).json({
      message: "Receptionist created successfully",
      receptionist,
    });
  } catch (error) {
    console.error("❌ Create Receptionist Error:", error);
    res.status(500).json({ message: "Server error creating receptionist" });
  }
};

// ✅ Get all receptionists
exports.getAllReceptionists = async (req, res) => {
  try {
    const receptionists = await Receptionist.find().select("-password");
    res.json({ receptionists });
  } catch (error) {
    console.error("❌ Fetch Receptionists Error:", error);
    res.status(500).json({ message: "Server error fetching receptionists" });
  }
};

// ✅ Delete receptionist
exports.deleteReceptionist = async (req, res) => {
  try {
    const { id } = req.params;
    const deleted = await Receptionist.findByIdAndDelete(id);

    if (!deleted) {
      return res.status(404).json({ message: "Receptionist not found" });
    }

    res.json({ message: "Receptionist deleted successfully" });
  } catch (error) {
    console.error("❌ Delete Receptionist Error:", error);
    res.status(500).json({ message: "Server error deleting receptionist" });
  }
};

// // ✅ Change password using ID in URL + username in body
// exports.changePassword = async (req, res) => {
//   try {
//     const { id } = req.params;
//     const { username, newPassword, confirmNewPassword } = req.body;

//     // 🔹 Validate inputs
//     if (!id || !username || !newPassword || !confirmNewPassword) {
//       return res.status(400).json({
//         message: "ID, username, new password, and confirm password are required",
//       });
//     }

//     // 🔹 Match passwords
//     if (newPassword !== confirmNewPassword) {
//       return res.status(400).json({ message: "Passwords do not match" });
//     }

//     // 🔹 Find receptionist by ID
//     const receptionist = await Receptionist.findById(id);
//     if (!receptionist) {
//       return res.status(404).json({ message: "Receptionist not found" });
//     }

//     // ✅ Ensure username matches the found receptionist
//     if (receptionist.username !== username) {
//       return res
//         .status(400)
//         .json({ message: "Username does not match receptionist record" });
//     }

//     // 🔹 Hash new password and save
//     const hashedPassword = await bcrypt.hash(newPassword, 10);
//     receptionist.password = hashedPassword;
//     await receptionist.save();

//     // 🔹 Send email notification
//     const transporter = nodemailer.createTransport({
//       service: "gmail",
//       auth: {
//         user: process.env.EMAIL_USER,
//         pass: process.env.EMAIL_PASS,
//       },
//     });

//     const mailOptions = {
//       from: `"Hotel Admin" <${process.env.EMAIL_USER}>`,
//       to: receptionist.email,
//       subject: "Password Changed Successfully",
//       html: `
//         <div style="font-family: Arial, sans-serif; padding: 15px; background-color: #f9f9f9;">
//           <div style="max-width: 500px; margin: auto; background: white; border-radius: 10px; padding: 20px; border: 1px solid #ddd;">
//             <h2 style="color: #006600;">Password Updated</h2>
//             <p>Dear <strong>${receptionist.username}</strong>,</p>
//             <p>Your password has been successfully changed by the administrator.</p>
//             <p><strong>New Password:</strong> ${newPassword}</p>
//             <p>Please use this password to log in next time. For security, change it after login.</p>
//             <p style="margin-top: 20px;">Best Regards,<br><strong>Hotel Management Team</strong></p>
//           </div>
//         </div>
//       `,
//     };

//     await transporter.sendMail(mailOptions);

//     // ✅ Success
//     res.status(200).json({
//       message: "Password updated successfully and email notification sent.",
//     });
//   } catch (error) {
//     console.error("❌ Change Password Error:", error);
//     res.status(500).json({
//       message: "Server error while changing password",
//       error: error.message,
//     });
//   }
// };
exports.changePassword = async (req, res) => {
  try {
    const { id } = req.params;
    const { username, newPassword, confirmNewPassword } = req.body;

    if (!id || !username || !newPassword || !confirmNewPassword) {
      return res.status(400).json({
        message: "ID, username, new password, and confirm password are required",
      });
    }

    if (newPassword !== confirmNewPassword) {
      return res.status(400).json({ message: "Passwords do not match" });
    }

    const receptionist = await Receptionist.findById(id);

    if (!receptionist) {
      return res.status(404).json({ message: "Receptionist not found" });
    }

    if (receptionist.username !== username) {
      return res
        .status(400)
        .json({ message: "Username does not match receptionist record" });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    receptionist.password = hashedPassword;
    await receptionist.save();

    // ---------- HTML EMAIL SAME FORMAT ----------
    const htmlContent = `
      <div style="font-family: Arial, sans-serif; padding: 15px; background-color: #f9f9f9;">
        <div style="max-width: 500px; margin: auto; background: white; border-radius: 10px; padding: 20px; border: 1px solid #ddd;">

          <h2 style="color: #006600;">Password Updated</h2>

          <p>Dear <strong>${receptionist.username}</strong>,</p>
          <p>Your password has been updated by the administrator.</p>

          <p><strong>New Password:</strong> ${newPassword}</p>

          <p style="margin-top: 10px;">
            Please use this password next time you log in. 
            For security reasons, update it after logging in.
          </p>

          <p style="margin-top: 20px;">Best Regards,<br>
          <strong>Hotel Management Team</strong></p>

        </div>
      </div>
    `;

    await sendMailWithGmailApi(
      receptionist.email,
      "Your Password Has Been Changed",
      htmlContent
    );

    res.status(200).json({
      message: "Password updated successfully and email notification sent.",
    });
  } catch (error) {
    console.error("❌ Change Password Error:", error);
    res.status(500).json({
      message: "Server error while changing password",
      error: error.message,
    });
  }
};
