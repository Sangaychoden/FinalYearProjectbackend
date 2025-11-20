

// const Admin = require("../models/adminModel");
// const Receptionist = require("../models/receptionistModel");
// const bcrypt = require("bcrypt");
// const jwt = require("jsonwebtoken");
// const nodemailer = require("nodemailer");

// // ======================================================
// // 🔐 UNIVERSAL AUTHENTICATION MIDDLEWARE
// // ======================================================
// const authenticateUser = async (req, res, next) => {
//   try {
//     const token = req.cookies?.adminToken;
//     if (!token) return res.status(401).json({ message: "No token provided" });

//     const decoded = jwt.verify(token, process.env.JWT_SECRET);
//     let user = null;

//     if (decoded.role === "admin") {
//       user = await Admin.findById(decoded.id);
//     } else if (decoded.role === "receptionist") {
//       user = await Receptionist.findById(decoded.id);
//     }

//     if (!user)
//       return res.status(404).json({ message: "User not found or deleted" });

//     req.user = user;
//     req.role = decoded.role;
//     next();
//   } catch (err) {
//     return res.status(401).json({
//       message: "Invalid or expired token",
//       error: err.message,
//     });
//   }
// };

// // ======================================================
// // 🔐 ADMIN-ONLY MIDDLEWARE
// // ======================================================
// const authenticateAdmin = async (req, res, next) => {
//   try {
//     const token = req.cookies?.adminToken;
//     if (!token) return res.status(401).json({ message: "No token provided" });

//     const decoded = jwt.verify(token, process.env.JWT_SECRET);

//     const admin = await Admin.findById(decoded.id);
//     if (!admin)
//       return res.status(404).json({ message: "Admin not found" });

//     if (decoded.role !== "admin") {
//       return res.status(403).json({ message: "Access denied: Admins only" });
//     }

//     req.admin = admin;
//     req.role = "admin";
//     next();
//   } catch (err) {
//     return res.status(401).json({
//       message: "Invalid or expired token",
//       error: err.message,
//     });
//   }
// };

// // ======================================================
// // 🧑‍💼 RECEPTIONIST-ONLY MIDDLEWARE
// // ======================================================
// const authenticateReceptionist = async (req, res, next) => {
//   try {
//     const token = req.cookies?.adminToken;
//     if (!token) return res.status(401).json({ message: "No token provided" });

//     const decoded = jwt.verify(token, process.env.JWT_SECRET);

//     const receptionist = await Receptionist.findById(decoded.id);
//     if (!receptionist)
//       return res.status(404).json({ message: "Receptionist not found" });

//     if (decoded.role !== "receptionist") {
//       return res.status(403).json({ message: "Access denied: Receptionists only" });
//     }

//     req.receptionist = receptionist;
//     req.role = "receptionist";
//     next();
//   } catch (err) {
//     return res.status(401).json({
//       message: "Invalid or expired token",
//       error: err.message,
//     });
//   }
// };
// // ======================================================
// // 🔄 ADMIN OR RECEPTIONIST MIDDLEWARE
// // ======================================================
// const authenticateAdminOrReceptionist = async (req, res, next) => {
//   try {
//     const token = req.cookies?.adminToken;
//     if (!token) return res.status(401).json({ message: "No token provided" });

//     const decoded = jwt.verify(token, process.env.JWT_SECRET);

//     // Try to find either admin or receptionist
//     const admin = await Admin.findById(decoded.id);
//     const receptionist = await Receptionist.findById(decoded.id);

//     if (!admin && !receptionist) {
//       return res
//         .status(404)
//         .json({ message: "User not found (Admin or Receptionist)" });
//     }

//     req.user = admin || receptionist;
//     req.role = admin ? "admin" : "receptionist";
//     next();
//   } catch (err) {
//     return res.status(401).json({
//       message: "Invalid or expired token",
//       error: err.message,
//     });
//   }
// };

// exports.login = async (req, res) => {
//   try {
//     const { username, password } = req.body;
//     const routePath = req.originalUrl; // e.g. '/admin/login' or '/receptionist/login'

//     let user = await Admin.findOne({ username });
//     let role = "admin";

//     if (!user) {
//       user = await Receptionist.findOne({ username });
//       role = "receptionist";
//     }

//     if (!user) return res.status(404).json({ message: "User not found" });

//     const isMatch = await bcrypt.compare(password, user.password);
//     if (!isMatch) return res.status(401).json({ message: "Invalid password" });

//     // 🚫 Enforce route-based access
//     if (routePath.includes("/receptionist") && role !== "receptionist") {
//       return res.status(403).json({ message: "Admins cannot log in here" });
//     }
//     if (routePath.includes("/admin") && role !== "admin") {
//       return res.status(403).json({ message: "Receptionists cannot log in here" });
//     }

//     const token = jwt.sign(
//       { id: user._id, username: user.username, role },
//       process.env.JWT_SECRET,
//       { expiresIn: "1h" }
//     );

//     // ✅ Store token in secure cookie
//     // res.cookie("adminToken", token, {
//     //   httpOnly: true,
//     //   secure: process.env.NODE_ENV === "production",
//     //   sameSite: "Strict",
//     //   maxAge: 60 * 60 * 1000,
//     //   path: "/",
//     // });
//           res.cookie("adminToken", token, {
//         httpOnly: true,
//         secure: process.env.NODE_ENV === "production",
//         sameSite: process.env.NODE_ENV === "production" ? "None" : "Lax",
//         maxAge: 60 * 60 * 1000,
//         path: "/",
//       });


//     res.status(200).json({
//       message: `${role.charAt(0).toUpperCase() + role.slice(1)} logged in successfully`,
//       role,
//     });
//   } catch (err) {
//     console.error("Login Error:", err);
//     res.status(500).json({ message: "Server error", error: err.message });
//   }
// };


// // ======================================================
// // 🚪 LOGOUT
// // ======================================================
// exports.logout = async (req, res) => {
//   try {
//     res.clearCookie("adminToken", {
//       httpOnly: true,
//       secure: process.env.NODE_ENV === "production",
//       sameSite: "Strict",
//       path: "/",
//     });
//     res.status(200).json({ message: "Logged out successfully" });
//   } catch (err) {
//     res.status(500).json({ message: "Logout failed", error: err.message });
//   }
// };

// // ======================================================
// // 🧑‍💼 CREATE ADMIN (One-time setup)
// // ======================================================
// exports.createAdminIfNotExists = async (req, res) => {
//   try {
//     const secretKey = req.headers["x-admin-key"];
//     if (secretKey !== process.env.ADMIN_SETUP_KEY) {
//       return res.status(403).json({ message: "Unauthorized" });
//     }

//     const existingAdmin = await Admin.findOne({});
//     if (existingAdmin)
//       return res.status(400).json({ message: "Admin already exists" });

//     const username = process.env.ADMIN_USERNAME;
//     const email = process.env.ADMIN_EMAIL;
//     const password = process.env.ADMIN_PASSWORD;

//     const hashedPassword = await bcrypt.hash(password, 10);
//     const newAdmin = new Admin({ username, email, password: hashedPassword });
//     await newAdmin.save();

//     res.status(201).json({ message: "Admin created successfully!" });
//   } catch (err) {
//     res.status(500).json({ message: "Server error", error: err.message });
//   }
// };

// // ======================================================
// // 🔄 FORGOT PASSWORD (OTP Email)
// // ======================================================
// exports.forgotPassword = async (req, res) => {
//   try {
//     const { email } = req.body;
//     if (!email || email.trim() === "")
//       return res.status(400).json({ message: "Email is required" });

//     const admin = await Admin.findOne({ email: email.trim().toLowerCase() });
//     if (!admin)
//       return res.status(403).json({ message: "Email not registered as admin" });

//     const otp = Math.floor(100000 + Math.random() * 900000).toString();
//     const expiry = new Date(Date.now() + 5 * 60 * 1000);

//     admin.resetOTP = otp;
//     admin.resetOTPExpiry = expiry;
//     await admin.save();

//     const transporter = nodemailer.createTransport({
//       service: "gmail",
//       auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS },
//     });

//     const mailOptions = {
//       from: `"Admin Panel" <${process.env.EMAIL_USER}>`,
//       to: admin.email,
//       subject: "Admin Password Reset OTP",
//       text: `Your OTP is ${otp}. It will expire in 5 minutes.`,
//     };

//     await transporter.sendMail(mailOptions);
//     res.status(200).json({ message: "OTP sent to admin's registered email." });
//   } catch (err) {
//     console.error("Forgot Password Error:", err);
//     res.status(500).json({ message: "Server error. Please try again later." });
//   }
// };

// // ======================================================
// // ✅ VERIFY OTP
// // ======================================================
// exports.verifyOTP = async (req, res) => {
//   try {
//     const { email, otp } = req.body;
//     const admin = await Admin.findOne({ email });

//     if (!admin) return res.status(404).json({ message: "Admin not found" });
//     if (!admin.resetOTP || admin.resetOTPExpiry < new Date())
//       return res.status(400).json({ message: "OTP expired or not generated" });
//     if (admin.resetOTP !== otp)
//       return res.status(400).json({ message: "Invalid OTP" });

//     admin.isOTPVerified = true;
//     await admin.save();
//     res.status(200).json({ message: "OTP verified successfully" });
//   } catch (err) {
//     res.status(500).json({ message: "Server error", error: err.message });
//   }
// };

// // ======================================================
// // 🔁 RESET PASSWORD
// // ======================================================
// exports.resetPassword = async (req, res) => {
//   try {
//     const { email, newPassword, confirmPassword } = req.body;
//     if (newPassword !== confirmPassword)
//       return res.status(400).json({ message: "Passwords do not match" });

//     const admin = await Admin.findOne({ email });
//     if (!admin) return res.status(404).json({ message: "Admin not found" });

//     if (!admin.isOTPVerified || admin.resetOTPExpiry < new Date())
//       return res
//         .status(400)
//         .json({ message: "OTP not verified or has expired" });

//     admin.password = await bcrypt.hash(newPassword, 10);
//     admin.resetOTP = null;
//     admin.resetOTPExpiry = null;
//     admin.isOTPVerified = false;
//     await admin.save();

//     res.status(200).json({ message: "Password reset successfully" });
//   } catch (err) {
//     res.status(500).json({ message: "Server error", error: err.message });
//   }
// };

// // ======================================================
// // 🔐 CHANGE PASSWORD (JWT Protected)
// // ======================================================
// exports.changePassword = [
//   authenticateAdmin,
//   async (req, res) => {
//     try {
//       const { currentPassword, newPassword, confirmNewPassword } = req.body;
//       const admin = req.admin;

//       if (newPassword !== confirmNewPassword)
//         return res.status(400).json({ message: "Passwords do not match" });

//       const isMatch = await bcrypt.compare(currentPassword, admin.password);
//       if (!isMatch)
//         return res.status(401).json({ message: "Current password incorrect" });

//       admin.password = await bcrypt.hash(newPassword, 10);
//       await admin.save();

//       res.status(200).json({ message: "Password changed successfully" });
//     } catch (err) {
//       res.status(500).json({ message: "Server error", error: err.message });
//     }
//   },
// ];

// // ======================================================
// // ✅ EXPORT ALL FUNCTIONS
// // ======================================================
// module.exports = {
//   authenticateAdmin,
//   authenticateReceptionist,
//   authenticateAdminOrReceptionist,
//   authenticateUser,
//   login: exports.login,
//   logout: exports.logout,
//   createAdminIfNotExists: exports.createAdminIfNotExists,
//   forgotPassword: exports.forgotPassword,
//   verifyOTP: exports.verifyOTP,
//   resetPassword: exports.resetPassword,
//   changePassword: exports.changePassword,
// };
const Admin = require("../models/adminModel");
const Receptionist = require("../models/receptionistModel");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const nodemailer = require("nodemailer");

// ======================================================
// 🔐 UNIVERSAL AUTHENTICATION MIDDLEWARE
// ======================================================
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

// ======================================================
// 🔐 ADMIN-ONLY MIDDLEWARE
// ======================================================
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

// ======================================================
// 🧑‍💼 RECEPTIONIST-ONLY MIDDLEWARE
// ======================================================
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

// ======================================================
// 🔄 ADMIN OR RECEPTIONIST MIDDLEWARE
// ======================================================
const authenticateAdminOrReceptionist = async (req, res, next) => {
  try {
    const token = req.cookies?.adminToken;
    if (!token) return res.status(401).json({ message: "No token provided" });

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

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

    let user = await Admin.findOne({ username });
    let role = "admin";

    if (!user) {
      user = await Receptionist.findOne({ username });
      role = "receptionist";
    }

    if (!user) return res.status(404).json({ message: "User not found" });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(401).json({ message: "Invalid password" });

    // Enforce route-based login
    if (routePath.includes("/receptionist") && role !== "receptionist") {
      return res.status(403).json({ message: "Admins cannot log in here" });
    }
    if (routePath.includes("/admin") && role !== "admin") {
      return res.status(403).json({ message: "Receptionists cannot log in here" });
    }

    const token = jwt.sign(
      { id: user._id, username: user.username, role },
      process.env.JWT_SECRET,
      { expiresIn: "1h" }
    );

    res.cookie("adminToken", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: process.env.NODE_ENV === "production" ? "None" : "Lax",
      maxAge: 60 * 60 * 1000,
      path: "/",
    });

    res.status(200).json({
      message: `${role.charAt(0).toUpperCase() + role.slice(1)} logged in successfully`,
      role,
    });
  } catch (err) {
    console.error("Login Error:", err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

// ======================================================
// 🚪 LOGOUT
// ======================================================
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

// ======================================================
// 🧑‍💼 CREATE ADMIN
// ======================================================
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

// ======================================================
// 🔄 FORGOT PASSWORD (OTP Email)
// ======================================================
exports.forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email || email.trim() === "")
      return res.status(400).json({ message: "Email is required" });

    const admin = await Admin.findOne({ email: email.trim().toLowerCase() });
    if (!admin)
      return res.status(403).json({ message: "Email not registered as admin" });

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiry = new Date(Date.now() + 5 * 60 * 1000);

    admin.resetOTP = otp;
    admin.resetOTPExpiry = expiry;
    await admin.save();

    // **********************************************
    // 🔥 GMAIL SMTP (Render Compatible)
    // **********************************************
    const transporter = nodemailer.createTransport({
      host: "smtp.gmail.com",
      port: 465,
      secure: true,
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    const mailOptions = {
      from: `"Admin Panel" <${process.env.EMAIL_USER}>`,
      to: admin.email,
      subject: "Admin Password Reset OTP",
      text: `Your OTP is ${otp}. It will expire in 5 minutes.`,
    };

    await transporter.sendMail(mailOptions);
    res.status(200).json({ message: "OTP sent to admin's registered email." });

  } catch (err) {
    console.error("Forgot Password Error:", err);
    res.status(500).json({ message: "Server error. Please try again later." });
  }
};

// ======================================================
// ✅ VERIFY OTP
// ======================================================
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
// 🔐 CHANGE PASSWORD
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
// EXPORT
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
