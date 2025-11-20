// // const express = require("express");
// // const router = express.Router();
// // const {
// //   createReceptionist,
// //   getAllReceptionists,
// //   deleteReceptionist,
// //   changePassword,
// // } = require("../controllers/receptionistController");

// // // Create receptionist (auto password + send email)
// // router.post("/create", createReceptionist);

// // // Get all receptionists
// // router.get("/", getAllReceptionists);

// // // Delete a receptionist
// // router.delete("/:id", deleteReceptionist);

// // // Change password
// // router.post("/change-password", changePassword);

// // module.exports = router;
// const express = require("express");
// const router = express.Router();
// const {
//   createReceptionist,
//   getAllReceptionists,
//   deleteReceptionist,
//   changePassword,
// } = require("../controllers/receptionistController");

// const { authenticateAdmin } = require("../controllers/adminController"); // ✅ import middleware

// // ======================================================
// // 🧑‍💼 Create receptionist (Admin only)
// // ======================================================
// router.post("/create", authenticateAdmin, createReceptionist);

// // ======================================================
// // 📋 Get all receptionists (Admin only)
// // ======================================================
// router.get("/", authenticateAdmin, getAllReceptionists);

// // ======================================================
// // ❌ Delete a receptionist (Admin only)
// // ======================================================
// router.delete("/:id", authenticateAdmin, deleteReceptionist);

// // ======================================================
// // 🔑 Change receptionist password (Admin only)
// // ======================================================
// // router.post("/change-password", authenticateAdmin, changePassword);
// // ✅ Change password (with id in URL)
// router.post("/change-password/:id", changePassword);
// module.exports = router;
const express = require("express");
const router = express.Router();
const {
  createReceptionist,
  getAllReceptionists,
  deleteReceptionist,
  changePassword,
} = require("../controllers/receptionistController");

const { authenticateAdmin } = require("../controllers/adminController"); // ✅ Import middleware

// ======================================================
// 🧑‍💼 ADMIN-PROTECTED ROUTES
// Only admins can manage receptionists
// ======================================================

// ✅ Create receptionist (auto password + email notification)
router.post("/create", authenticateAdmin, createReceptionist);

// ✅ Get all receptionists
router.get("/", authenticateAdmin, getAllReceptionists);

// ✅ Delete a receptionist
router.delete("/:id", authenticateAdmin, deleteReceptionist);

// ✅ Change receptionist password (Admin only)
router.post("/change-password/:id", authenticateAdmin, changePassword);

module.exports = router;
