
const Admin = require("../models/adminModel");
const Receptionist = require("../models/receptionistModel");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const nodemailer = require("nodemailer");
const { google } = require("googleapis");
const { sendMailWithGmailApi } = require("../utils/gmailSender");
const OAuth2 = google.auth.OAuth2;
const loginAttempts = {};
const oauth2Client = new OAuth2(
  process.env.GMAIL_CLIENT_ID,
  process.env.GMAIL_CLIENT_SECRET,
  process.env.REDIRECT_URI
);

oauth2Client.setCredentials({
  refresh_token: process.env.GMAIL_REFRESH_TOKEN,
});
console.log("CLIENT ID LOADED:", process.env.GMAIL_CLIENT_ID);
console.log("CLIENT SECRET LOADED:", process.env.GMAIL_CLIENT_SECRET);
console.log("REFRESH TOKEN LOADED:", process.env.GMAIL_REFRESH_TOKEN.substring(0, 12) + "...");


// UNIVERSAL AUTHENTICATION MIDDLEWARE

const authenticateUser = async (req, res, next) => {
  try {
    const token = req.cookies?.adminToken;
    if (!token) return res.status(401).json({ message: "No token provided" });

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    let user = null;

    if (decoded.role === "admin") {
      user = await Admin.findById(decoded.id);
    } else if (decoded.role === "receptionist") {
      user = await Receptionist.findById(decoded.id);
    }

    if (!user)
      return res.status(404).json({ message: "User not found or deleted" });

    req.user = user;
    req.role = decoded.role;
    next();
  } catch (err) {
    return res.status(401).json({
      message: "Invalid or expired token",
      error: err.message,
    });
  }
};


// ADMIN-ONLY MIDDLEWARE

const authenticateAdmin = async (req, res, next) => {
  try {
    const token = req.cookies?.adminToken;
    if (!token) return res.status(401).json({ message: "No token provided" });

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const admin = await Admin.findById(decoded.id);
    if (!admin)
      return res.status(404).json({ message: "Admin not found" });

    if (decoded.role !== "admin") {
      return res.status(403).json({ message: "Access denied: Admins only" });
    }

    req.admin = admin;
    req.role = "admin";
    next();
  } catch (err) {
    return res.status(401).json({
      message: "Invalid or expired token",
      error: err.message,
    });
  }
};


// RECEPTIONIST-ONLY MIDDLEWARE

const authenticateReceptionist = async (req, res, next) => {
  try {
    const token = req.cookies?.adminToken;
    if (!token) return res.status(401).json({ message: "No token provided" });

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const receptionist = await Receptionist.findById(decoded.id);
    if (!receptionist)
      return res.status(404).json({ message: "Receptionist not found" });

    if (decoded.role !== "receptionist") {
      return res.status(403).json({ message: "Access denied: Receptionists only" });
    }

    req.receptionist = receptionist;
    req.role = "receptionist";
    next();
  } catch (err) {
    return res.status(401).json({
      message: "Invalid or expired token",
      error: err.message,
    });
  }
};

//ADMIN OR RECEPTIONIST MIDDLEWARE

const authenticateAdminOrReceptionist = async (req, res, next) => {
  try {
    const token = req.cookies?.adminToken;
    if (!token) return res.status(401).json({ message: "No token provided" });

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Try to find either admin or receptionist
    const admin = await Admin.findById(decoded.id);
    const receptionist = await Receptionist.findById(decoded.id);

    if (!admin && !receptionist) {
      return res
        .status(404)
        .json({ message: "User not found (Admin or Receptionist)" });
    }

    req.user = admin || receptionist;
    req.role = admin ? "admin" : "receptionist";
    next();
  } catch (err) {
    return res.status(401).json({
      message: "Invalid or expired token",
      error: err.message,
    });
  }
};

exports.login = async (req, res) => {
  try {
    const { username, password } = req.body;
    const routePath = req.originalUrl;

    const now = Date.now();

    
    // BRUTE-FORCE PROTECTION
  
    if (!loginAttempts[username]) {
      loginAttempts[username] = { attempts: 0, lockUntil: 0 };
    }

    // Check lock status
    if (now < loginAttempts[username].lockUntil) {
      return res.status(429).json({
        message: "Too many failed login attempts. Try again in 10 minutes.",
      });
    }


    // ⭐ FIND USER (Admin or Reception)
    let user = await Admin.findOne({ username });
    let role = "admin";

    if (!user) {
      user = await Receptionist.findOne({ username });
      role = "receptionist";
    }

    // We do NOT say “user not found” for security reasons
    // We pretend password is wrong to give a generic error
    if (!user) {
      loginAttempts[username].attempts += 1;

      // Lock after 5 failed attempts
      if (loginAttempts[username].attempts >= 5) {
        loginAttempts[username].lockUntil = now + 10 * 60 * 1000; // 10 minutes
      }

      return res.status(401).json({
        message: "Invalid username or password",
      });
    }


    // VERIFY PASSWORD
    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      loginAttempts[username].attempts += 1;

      if (loginAttempts[username].attempts >= 5) {
        loginAttempts[username].lockUntil = now + 10 * 60 * 1000;
      }

      return res.status(401).json({
        message: "Invalid username or password",
      });
    }

    // Reset attempt counter after successful login
    loginAttempts[username] = { attempts: 0, lockUntil: 0 };


    // ROUTE ACCESS VALIDATION
 
    if (routePath.includes("/receptionist") && role !== "receptionist") {
      return res.status(403).json({ message: "Admins cannot log in here" });
    }
    if (routePath.includes("/admin") && role !== "admin") {
      return res.status(403).json({ message: "Receptionists cannot log in here" });
    }


    // GENERATE JWT

    const token = jwt.sign(
      { id: user._id, username: user.username, role },
      process.env.JWT_SECRET,
      { expiresIn: "1h" }
    );

   
    // // SECURE COOKIE
    // res.cookie("adminToken", token, {
    //   httpOnly: true,
    //   secure: true,         // HTTPS ONLY (Render/Vercel)
    //   sameSite: "None",     // Required for cross-domain cookies
    //   path: "/",            // Accessible globally
    //   maxAge: 60 * 60 * 1000, // 1 hour
    // });
        res.cookie("adminToken", token, {
          httpOnly: true,
          secure: process.env.NODE_ENV === "production", // 🔥 works both locally & on Render
          sameSite: process.env.NODE_ENV === "production" ? "None" : "Lax",
          path: "/",
          maxAge: 60 * 60 * 1000,
        });

   
    // SUCCESS RESPONSE
    return res.status(200).json({
      message: `${role.charAt(0).toUpperCase() + role.slice(1)} logged in successfully`,
      role,
    });

  } catch (err) {
    console.error("Login Error:", err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
};



//LOGOUT

exports.logout = async (req, res) => {
  try {
    res.clearCookie("adminToken", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "Strict",
      path: "/",
    });
    res.status(200).json({ message: "Logged out successfully" });
  } catch (err) {
    res.status(500).json({ message: "Logout failed", error: err.message });
  }
};


// CREATE ADMIN (One-time setup)

exports.createAdminIfNotExists = async (req, res) => {
  try {
    const secretKey = req.headers["x-admin-key"];
    if (secretKey !== process.env.ADMIN_SETUP_KEY) {
      return res.status(403).json({ message: "Unauthorized" });
    }

    const existingAdmin = await Admin.findOne({});
    if (existingAdmin)
      return res.status(400).json({ message: "Admin already exists" });

    const username = process.env.ADMIN_USERNAME;
    const email = process.env.ADMIN_EMAIL;
    const password = process.env.ADMIN_PASSWORD;

    const hashedPassword = await bcrypt.hash(password, 10);
    const newAdmin = new Admin({ username, email, password: hashedPassword });
    await newAdmin.save();

    res.status(201).json({ message: "Admin created successfully!" });
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

const otpRequestTracker = {}; // { email: { count: n, lockUntil: timestamp } }
const OTP_REQUEST_LIMIT = 5;         // Max 5 OTP requests
const OTP_LOCK_TIME = 10 * 60 * 1000; // 10 min lock

exports.forgotPassword = async (req, res) => {
  try {
    let { email } = req.body;

    if (!email || email.trim() === "") {
      return res.status(400).json({ message: "Invalid request" });
    }

    email = email.trim().toLowerCase();
    const now = Date.now();

    // Initialize tracker for email
    if (!otpRequestTracker[email]) {
      otpRequestTracker[email] = { count: 0, lockUntil: 0 };
    }

    // Check lockout
    if (now < otpRequestTracker[email].lockUntil) {
      return res.status(429).json({
        message: "Too many OTP requests. Try again later."
      });
    }

    // Look up admin
    const admin = await Admin.findOne({ email });

    // Generic message (do not reveal if email exists)
    const genericResponse = {
      message: "If this email is registered, an OTP has been sent."
    };

    // If admin does not exist, still respond generic
    if (!admin) {
      return res.status(200).json(genericResponse);
    }

    // Prevent spamming OTP (admin already has a valid OTP)
    if (admin.resetOTPExpiry && admin.resetOTPExpiry > new Date()) {
      return res.status(200).json(genericResponse);
    }

    // Track OTP request count
    otpRequestTracker[email].count++;

    if (otpRequestTracker[email].count >= OTP_REQUEST_LIMIT) {
      otpRequestTracker[email].lockUntil = now + OTP_LOCK_TIME;
      return res.status(429).json({
        message: "Too many OTP requests. Try again later."
      });
    }

    // Generate OTP
    const rawOtp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiry = new Date(Date.now() + 5 * 60 * 1000);

    // Hash OTP before saving (do NOT store plain OTP)
    const hashedOtp = await bcrypt.hash(rawOtp, 10);

    admin.resetOTP = hashedOtp;
    admin.resetOTPExpiry = expiry;
    await admin.save();

    // Email HTML content
    const htmlContent = `
      <div style="font-family: Arial, sans-serif; padding: 15px; background-color: #f9f9f9;">
        <div style="max-width: 500px; margin: auto; background: white; border-radius: 10px; padding: 20px; border: 1px solid #ddd;">
          <h2 style="color: #006600;">Password Reset OTP</h2>
          <p>Dear <strong>${admin.username}</strong>,</p>
          <p>You requested to reset your password. Use the OTP below:</p>

          <h1 style="color: #333; text-align:center; letter-spacing: 5px;">
            ${rawOtp}
          </h1>

          <p>This OTP will expire in <strong>5 minutes</strong>.</p>

          <p style="margin-top: 20px;">
            Best Regards,<br>
            <strong>Hotel Management Team</strong>
          </p>
        </div>
      </div>
    `;

    // Send email
    await sendMailWithGmailApi(admin.email, "Admin Password Reset OTP", htmlContent);

    return res.status(200).json(genericResponse);

  } catch (err) {
    console.error("Forgot Password Error");
    res.status(500).json({ message: "Server error. Please try again later." });
  }
};


// // ======================================================
// // ✅ VERIFY OTP
// // ======================================================
exports.verifyOTP = async (req, res) => {
  try {
    const { email, otp } = req.body;
    const admin = await Admin.findOne({ email });

    if (!admin) return res.status(404).json({ message: "Admin not found" });
    if (!admin.resetOTP || admin.resetOTPExpiry < new Date())
      return res.status(400).json({ message: "OTP expired or not generated" });
    if (admin.resetOTP !== otp)
      return res.status(400).json({ message: "Invalid OTP" });

    admin.isOTPVerified = true;
    await admin.save();
    res.status(200).json({ message: "OTP verified successfully" });
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
};



// // Send email using Gmail API (not SMTP)
// async function sendMailWithGmailApi(to, subject, textBody) {
//   const oauth2Client = new google.auth.OAuth2(
//     process.env.GMAIL_CLIENT_ID,
//     process.env.GMAIL_CLIENT_SECRET,
//     process.env.REDIRECT_URI
//   );
//   oauth2Client.setCredentials({
//     refresh_token: process.env.GMAIL_REFRESH_TOKEN,
//   });

//   const accessTokenObj = await oauth2Client.getAccessToken();
//   const accessToken = accessTokenObj?.token || accessTokenObj;

//   const gmail = google.gmail({ version: "v1", auth: oauth2Client });

//   const message = [
//     `From: ${process.env.GMAIL_USER}`,
//     `To: ${to}`,
//     `Subject: ${subject}`,
//     "MIME-Version: 1.0",
//     "Content-Type: text/plain; charset=UTF-8",
//     "",
//     textBody,
//   ].join("\n");

//   const encodedMessage = Buffer.from(message)
//     .toString("base64")
//     .replace(/\+/g, "-")
//     .replace(/\//g, "_")
//     .replace(/=+$/, "");

//   await gmail.users.messages.send({
//     userId: "me",
//     requestBody: { raw: encodedMessage },
//   });
// }

// // ======================================================
// // 🔄 FIXED FORGOT PASSWORD — Works on Render
// // ======================================================
// exports.forgotPassword = async (req, res) => {
//   try {
//     const { email } = req.body;
//     if (!email || email.trim() === "")
//       return res.status(400).json({ message: "Email is required" });

//     const admin = await Admin.findOne({ email: email.trim().toLowerCase() });
//     if (!admin)
//       return res.status(403).json({ message: "Email not registered as admin" });

//     // Generate OTP
//     const otp = Math.floor(100000 + Math.random() * 900000).toString();
//     const expiry = new Date(Date.now() + 5 * 60 * 1000);

//     admin.resetOTP = otp;
//     admin.resetOTPExpiry = expiry;
//     await admin.save();

//     // Send OTP using Gmail API
//     await sendMailWithGmailApi(
//       admin.email,
//       "Admin Password Reset OTP",
//       `Your OTP is ${otp}. It will expire in 5 minutes.`
//     );

//     res.status(200).json({ message: "OTP sent to admin's registered email." });
//   } catch (err) {
//     console.error("Forgot Password Error:", err);
//     res.status(500).json({ message: "Server error. Please try again later." });
//   }
// };

// ======================================================
// 🔁 RESET PASSWORD
// ======================================================
exports.resetPassword = async (req, res) => {
  try {
    const { email, newPassword, confirmPassword } = req.body;
    if (newPassword !== confirmPassword)
      return res.status(400).json({ message: "Passwords do not match" });

    const admin = await Admin.findOne({ email });
    if (!admin) return res.status(404).json({ message: "Admin not found" });

    if (!admin.isOTPVerified || admin.resetOTPExpiry < new Date())
      return res
        .status(400)
        .json({ message: "OTP not verified or has expired" });

    admin.password = await bcrypt.hash(newPassword, 10);
    admin.resetOTP = null;
    admin.resetOTPExpiry = null;
    admin.isOTPVerified = false;
    await admin.save();

    res.status(200).json({ message: "Password reset successfully" });
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

// ======================================================
// 🔐 CHANGE PASSWORD (JWT Protected)
// ======================================================
exports.changePassword = [
  authenticateAdmin,
  async (req, res) => {
    try {
      const { currentPassword, newPassword, confirmNewPassword } = req.body;
      const admin = req.admin;

      if (newPassword !== confirmNewPassword)
        return res.status(400).json({ message: "Passwords do not match" });

      const isMatch = await bcrypt.compare(currentPassword, admin.password);
      if (!isMatch)
        return res.status(401).json({ message: "Current password incorrect" });

      admin.password = await bcrypt.hash(newPassword, 10);
      await admin.save();

      res.status(200).json({ message: "Password changed successfully" });
    } catch (err) {
      res.status(500).json({ message: "Server error", error: err.message });
    }
  },
];

// ======================================================
// ✅ EXPORT ALL FUNCTIONS
// ======================================================
module.exports = {
  authenticateAdmin,
  authenticateReceptionist,
  authenticateAdminOrReceptionist,
  authenticateUser,
  login: exports.login,
  logout: exports.logout,
  createAdminIfNotExists: exports.createAdminIfNotExists,
  forgotPassword: exports.forgotPassword,
  verifyOTP: exports.verifyOTP,
  resetPassword: exports.resetPassword,
  changePassword: exports.changePassword,
};
