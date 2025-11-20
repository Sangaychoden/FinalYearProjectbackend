
// const express = require("express");
// const router = express.Router();
// const multer = require("multer");
// const roomController = require("../controllers/roomControler");
// const { authenticateAdmin } = require("../controllers/adminController");

// // ---------------- Multer memory storage ----------------
// const storage = multer.memoryStorage();
// const upload = multer({
//   storage,
//   limits: { fileSize: 5 * 1024 * 1024 }, // 5MB per file
// });

// // ---------------- ADMIN-PROTECTED ROUTES ----------------
// router.post("/rooms", authenticateAdmin, upload.array("images", 5), roomController.createRoom);
// router.put("/rooms/:id", authenticateAdmin, upload.array("images", 5), roomController.updateRoom);
// router.delete("/rooms/:id", authenticateAdmin, roomController.deleteRoom);

// // ---------------- PUBLIC ROUTES ----------------
// router.get("/rooms", roomController.getAllRooms);
// router.get("/rooms/firsttwo", roomController.getFirstTwoRooms);
// router.get("/rooms/:id", roomController.getRoomById);
// router.get("/available", roomController.getAvailableRoomsByDate);
// router.get("/:roomType/availability", roomController.getRoomAvailability);

// module.exports = router;
const express = require("express");
const router = express.Router();
const multer = require("multer");
const roomController = require("../controllers/roomControler");
const {
  authenticateAdmin,
  authenticateReceptionist,
} = require("../controllers/adminController");

// ---------------- Multer memory storage ----------------
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB per file
});

// ======================================================
// 🧑‍💼 ADMIN-PROTECTED ROUTES
// Only admins can create, update, or delete rooms
// ======================================================
router.post(
  "/rooms",
  authenticateAdmin,
  upload.array("images", 5),
  roomController.createRoom
);

router.put(
  "/rooms/:id",
  authenticateAdmin,
  upload.array("images", 5),
  roomController.updateRoom
);

router.delete("/rooms/:id", authenticateAdmin, roomController.deleteRoom);

// ======================================================
// 🧾 RECEPTIONIST-PROTECTED ROUTES
// Receptionists can view room details for dashboard/booking
// ======================================================
router.get(
  "/rooms/receptionist",
  authenticateReceptionist,
  roomController.getAllRooms
);

// ======================================================
// 🌍 PUBLIC ROUTES
// Anyone (user or guest) can view room info & availability
// ======================================================
router.get("/rooms", roomController.getAllRooms);
router.get("/rooms/firsttwo", roomController.getFirstTwoRooms);
router.get("/rooms/:id", roomController.getRoomById);
router.get("/available", roomController.getAvailableRoomsByDate);
router.get("/:roomType/availability", roomController.getRoomAvailability);
router.get("/room-types", roomController.getRoomTypes);
router.get(
  "/available-numbers/:roomType",
  roomController.getAvailableRoomNumbers
)
module.exports = router;
