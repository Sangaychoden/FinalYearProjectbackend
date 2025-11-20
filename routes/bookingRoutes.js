
// const express = require('express');
// const router = express.Router();
// const bookingController = require('../controllers/bookingController');

// // ---------------------- USER ROUTES ----------------------
// router.post('/book-rooms', bookingController.createBooking); // User books rooms
// router.get('/search/:bookingNumber', bookingController.getBookingByNumber);

// // ---------------------- ADMIN ROUTES ----------------------
// router.put('/assign-room/:bookingId', bookingController.assignRoom); // Admin assigns room

// router.put('/confirm/:bookingId', bookingController.confirmBooking);
// // // Check-In route
// router.put('/checkin/:bookingId', bookingController.checkInBooking);

// // // Reject Booking
// router.put('/reject/:bookingId', bookingController.rejectBooking);
// router.put("/change-room/:bookingId", bookingController.changeRoom);

// // ---------------------- FETCH LISTS ----------------------
// router.get('/pending', bookingController.getPendingBookings);
// router.get('/confirmed', bookingController.getConfirmedBookings);
// router.get('/checked-in', bookingController.getCheckedInBookings);
// router.get("/dashboard/stats", bookingController.getDashboardStats);
// // Monthly Graph Data
// router.get("/dashboard/monthly",bookingController.getMonthlyStats);

// module.exports = router;
const express = require("express");
const router = express.Router();
const bookingController = require("../controllers/bookingController");

// ✅ Import authentication middlewares properly
const {
  authenticateAdmin,
  authenticateReceptionist,
  authenticateAdminOrReceptionist,
} = require("../controllers/adminController");

// ======================================================
// 🧑‍💼 PUBLIC ROUTES
// ======================================================
router.post("/book-rooms", bookingController.createBooking); // User books rooms
router.get("/search/:bookingNumber", bookingController.getBookingByNumber);

// ======================================================
// 👑 ADMIN ROUTES
// ======================================================
router.put("/assign-room/:bookingId", authenticateAdmin, bookingController.assignRoom); // Admin assigns room
router.put("/confirm/:bookingId", authenticateAdmin, bookingController.confirmBooking);
router.put("/reject/:bookingId", authenticateAdmin, bookingController.rejectBooking);

// ======================================================
// 🧑‍💼 RECEPTIONIST ROUTES
// ======================================================
router.put("/checkin/:bookingId", authenticateReceptionist, bookingController.checkInBooking);
router.put("/change-room/:bookingId", authenticateAdminOrReceptionist, bookingController.changeRoom);

// ======================================================
// 🔍 FETCH LISTS
// ======================================================
router.get("/pending", authenticateAdmin, bookingController.getPendingBookings);
router.get("/confirmed", authenticateAdminOrReceptionist, bookingController.getConfirmedBookings);
router.get("/checked-in", authenticateAdminOrReceptionist, bookingController.getCheckedInBookings);
router.get("/dashboard/stats", authenticateAdminOrReceptionist, bookingController.getDashboardStats);
router.get("/dashboard/monthly", authenticateAdminOrReceptionist, bookingController.getMonthlyStats);
// router.put("/guarantee/:bookingId", bookingController.guaranteeBooking);
router.put("/guarantee-booking/:bookingId", bookingController.guaranteeBooking);
router.get(
  "/confirmed-guaranteed-bookings",
  bookingController.getConfirmedAndGuaranteedBookings
);
router.put("/cancel/:bookingId", bookingController.cancelBooking);
router.get("/cancelled/all", bookingController.getAllCancelledBookings);

module.exports = router;
