// const express = require("express");
// const router = express.Router();
// const multer = require("multer");
// const {
//   createFacility,
//   getFacilities,
//   getFacilityById,
//   updateFacility,
//   deleteFacility,
//   searchFacilities,
// } = require("../controllers/facilitiesController");
// const { authenticateAdmin } = require("../controllers/adminController");

// // ---------------- Multer memory storage ----------------
// const storage = multer.memoryStorage();
// const upload = multer({
//   storage,
//   limits: { fileSize: 5 * 1024 * 1024 }, // 5MB per file
// });

// // ---------------- ADMIN-PROTECTED ROUTES ----------------
// router.post("/", authenticateAdmin, upload.array("images", 5), createFacility);
// router.put("/:id", authenticateAdmin, upload.array("images", 5), updateFacility);
// router.delete("/:id", authenticateAdmin, deleteFacility);

// // ---------------- PUBLIC ROUTES ----------------
// router.get("/search", searchFacilities); // Must come before "/:id"
// router.get("/", getFacilities);
// router.get("/:id", getFacilityById);

// module.exports = router;
const express = require("express");
const router = express.Router();
const multer = require("multer");
const {
  createFacility,
  getFacilities,
  getFacilityById,
  updateFacility,
  deleteFacility,
  searchFacilities,
} = require("../controllers/facilitiesController");
const { authenticateAdmin } = require("../controllers/adminController");

// ======================================================
// 📸 Multer memory storage setup (5MB limit per image)
// ======================================================
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
});

// ======================================================
// 🧑‍💼 ADMIN-PROTECTED ROUTES
// Only admins can create, update, or delete facilities
// ======================================================
router.post(
  "/",
  authenticateAdmin,
  upload.array("images", 5),
  createFacility
);

router.put(
  "/:id",
  authenticateAdmin,
  upload.array("images", 5),
  updateFacility
);

router.delete("/:id", authenticateAdmin, deleteFacility);

// ======================================================
// 🌍 PUBLIC ROUTES
// Anyone (admin, receptionist, or guest) can view facilities
// ======================================================
router.get("/search", searchFacilities); // keep before "/:id" to avoid conflicts
router.get("/", getFacilities);
router.get("/:id", getFacilityById);

module.exports = router;
