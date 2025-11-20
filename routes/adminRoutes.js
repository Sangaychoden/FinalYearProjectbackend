
// // // const express = require("express");
// // // const router = express.Router();
// // // const {
// // //   login,
// // //   createAdminIfNotExists,
// // //   forgotPassword,
// // //   verifyOTP,
// // //   resetPassword,
// // //   changePassword
// // // } = require("../controllers/adminController");

// // // // Public routes
// // // router.post("/login", login);
// // // router.post("/setup", createAdminIfNotExists);
// // // router.post("/forgot-password", forgotPassword);
// // // router.post("/verify-otp", verifyOTP);
// // // router.post("/reset-password", resetPassword);

// // // // Protected route
// // // router.put("/change-password", changePassword); // middleware already inside controller

// // // module.exports = router;
// // const express = require("express");

// // const router = express.Router();
// // const {
// //   login,
// //   logout,
// //   createAdminIfNotExists,
// //   forgotPassword,
// //   verifyOTP,
// //   resetPassword,
// //   changePassword,
// // } = require("../controllers/adminController");

// // // ======================================================
// // // 🌍 PUBLIC ROUTES
// // // Accessible to everyone (before login)
// // // ======================================================

// // // 🧑‍💻 Admin login
// // // router.post("/login", login);
// // // routes/adminRoute.js
// // router.post("/admin/login", adminController.login);

// // // routes/receptionistRoute.js
// // router.post("/receptionist/login", adminController.login);


// // // 🚪 Admin logout
// // router.post("/logout", logout);

// // // 🧱 One-time setup to create the first admin (with secret key)
// // router.post("/setup", createAdminIfNotExists);

// // // 🔄 Forgot password (send OTP)
// // router.post("/forgot-password", forgotPassword);

// // // ✅ Verify OTP (after receiving email)
// // router.post("/verify-otp", verifyOTP);

// // // 🔁 Reset password (after OTP verification)
// // router.post("/reset-password", resetPassword);

// // // ======================================================
// // // 🔐 PROTECTED ROUTE (ADMIN AUTH REQUIRED)
// // // Middleware is already inside controller
// // // ======================================================
// // router.put("/change-password", changePassword);

// // module.exports = router;
// const express = require("express");
// const router = express.Router();

// // ✅ Import the full controller object
// const adminController = require("../controllers/adminController");

// // ======================================================
// // 🌍 PUBLIC ROUTES (Accessible before login)
// // ======================================================

// // 🧑‍💻 Separate login endpoints for Admin and Receptionist
// router.post("/admin/login", adminController.login);
// router.post("/receptionist/login", adminController.login);

// // 🚪 Logout (shared for both roles)
// router.post("/logout", adminController.logout);

// // 🧱 One-time setup to create the first admin (with secret key)
// router.post("/setup", adminController.createAdminIfNotExists);

// // 🔄 Forgot password (send OTP)
// router.post("/forgot-password", adminController.forgotPassword);

// // ✅ Verify OTP (after receiving email)
// router.post("/verify-otp", adminController.verifyOTP);

// // 🔁 Reset password (after OTP verification)
// router.post("/reset-password", adminController.resetPassword);

// // ======================================================
// // 🔐 PROTECTED ROUTES (JWT-protected, admin only)
// // Middleware is already applied inside controller
// // ======================================================
// router.put("/change-password", adminController.changePassword);

// module.exports = router;
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
