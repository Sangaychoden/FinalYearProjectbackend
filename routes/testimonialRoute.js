
// const express = require("express");
// const router = express.Router();
// const multer = require("multer");
// const testimonialController = require("../controllers/testimonialController");
// const { authenticateAdmin } = require("../controllers/adminController");

// const storage = multer.memoryStorage();
// const upload = multer({
//   storage,
//   limits: { fileSize: 5 * 1024 * 1024 },
// });

// // ---------------- ADMIN ROUTES ----------------
// router.post(
//   "/testimonials",
//   authenticateAdmin,
//   upload.single("image"),
//   testimonialController.createTestimonial
// );

// router.put(
//   "/testimonials/:id",
//   authenticateAdmin,
//   upload.single("image"),
//   testimonialController.updateTestimonial
// );

// router.patch(
//   "/testimonials/:id/archive",
//   authenticateAdmin,
//   testimonialController.archiveTestimonial
// );

// router.patch(
//   "/testimonials/:id/restore",
//   authenticateAdmin,
//   testimonialController.restoreTestimonial
// );

// router.delete(
//   "/testimonials/:id",
//   authenticateAdmin,
//   testimonialController.deleteTestimonial
// );

// // ---------------- PUBLIC ROUTES ----------------
// router.get("/testimonials", testimonialController.getAllTestimonials);
// router.get("/testimonials/archived", testimonialController.getArchivedTestimonials);
// router.get("/testimonials/:id", testimonialController.getTestimonialById);

// module.exports = router;
const express = require("express");
const router = express.Router();
const multer = require("multer");
const testimonialController = require("../controllers/testimonialController");
const { authenticateAdmin } = require("../controllers/adminController");

// ---------------- Multer memory storage ----------------
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB max
});

// ======================================================
// 🧑‍💼 ADMIN-PROTECTED ROUTES
// Only admins can manage testimonials
// ======================================================
router.post(
  "/testimonials",
  authenticateAdmin,
  upload.single("image"),
  testimonialController.createTestimonial
);

router.put(
  "/testimonials/:id",
  authenticateAdmin,
  upload.single("image"),
  testimonialController.updateTestimonial
);

router.patch(
  "/testimonials/:id/archive",
  authenticateAdmin,
  testimonialController.archiveTestimonial
);

router.patch(
  "/testimonials/:id/restore",
  authenticateAdmin,
  testimonialController.restoreTestimonial
);

router.delete(
  "/testimonials/:id",
  authenticateAdmin,
  testimonialController.deleteTestimonial
);

// ======================================================
// 🌍 PUBLIC ROUTES
// Everyone (admin, receptionist, or guest) can view testimonials
// ======================================================
router.get("/testimonials", testimonialController.getAllTestimonials);
router.get("/testimonials/archived", testimonialController.getArchivedTestimonials);
router.get("/testimonials/:id", testimonialController.getTestimonialById);

module.exports = router;
