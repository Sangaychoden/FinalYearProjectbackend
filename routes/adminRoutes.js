
const express = require("express");
const router = express.Router();
const adminController = require("../controllers/adminController");

// ======================================================
// 🌍 PUBLIC ROUTES
// ======================================================

// 🧑‍💻 Separate login endpoints for Admin and Receptionist
router.post("/admin/login", adminController.login);
router.post("/receptionist/login", adminController.login);

// 🚪 Logout (shared for both roles)
router.post("/logout", adminController.logout);

// 🧱 One-time setup for the first admin
router.post("/setup", adminController.createAdminIfNotExists);

// 🔄 Forgot password (Admin only)
router.post("/forgot-password", adminController.forgotPassword);

// ✅ Verify OTP
router.post("/verify-otp", adminController.verifyOTP);

// 🔁 Reset password
router.post("/reset-password", adminController.resetPassword);

// ======================================================
// 🔐 PROTECTED (JWT inside controller middleware)
// ======================================================
router.put("/change-password", adminController.changePassword);

module.exports = router;
