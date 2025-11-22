
// const express = require("express");
// const router = express.Router();
// const bookingController = require("../controllers/bookingController");

// //Import authentication middlewares properly
// const {
//   authenticateAdmin,
//   authenticateReceptionist,
//   authenticateAdminOrReceptionist,
// } = require("../controllers/adminController");


// //PUBLIC ROUTES

// router.post("/book-rooms", bookingController.createBooking); // User books rooms
// router.get("/search/:bookingNumber", bookingController.getBookingByNumber);


// // ADMIN ROUTES

// router.put("/assign-room/:bookingId", authenticateAdmin, bookingController.assignRoom); 
// router.put("/confirm/:bookingId", authenticateAdmin, bookingController.confirmBooking);
// router.put("/reject/:bookingId", authenticateAdmin, bookingController.rejectBooking);
// // 🧑‍💼 RECEPTIONIST ROUTES
// router.put("/checkin/:bookingId", authenticateReceptionist, bookingController.checkInBooking);
// router.put("/change-room/:bookingId", authenticateAdminOrReceptionist, bookingController.changeRoom);
// // 🔍 FETCH LISTS
// router.get("/pending", authenticateAdmin, bookingController.getPendingBookings);
// router.get("/confirmed", authenticateAdminOrReceptionist, bookingController.getConfirmedBookings);
// router.get("/checked-in", authenticateAdminOrReceptionist, bookingController.getCheckedInBookings);
// router.get("/dashboard/stats", authenticateAdminOrReceptionist, bookingController.getDashboardStats);
// router.get("/dashboard/monthly", authenticateAdminOrReceptionist, bookingController.getMonthlyStats);
// // router.put("/guarantee/:bookingId", bookingController.guaranteeBooking);
// router.put("/guarantee-booking/:bookingId", bookingController.guaranteeBooking);
// router.get(
//   "/confirmed-guaranteed-bookings",
//   bookingController.getConfirmedAndGuaranteedBookings
// );
// router.put("/cancel/:bookingId", bookingController.cancelBooking);
// router.get("/cancelled/all", bookingController.getAllCancelledBookings);

// module.exports = router;
const express = require("express");
const router = express.Router();
const bookingController = require("../controllers/bookingController");

const {
  authenticateAdmin,
  authenticateReceptionist,
  authenticateAdminOrReceptionist,
} = require("../controllers/adminController");


// -------------------------
// PUBLIC ROUTES
// -------------------------
router.post("/book-rooms", bookingController.createBooking);
router.get("/search/:bookingNumber", bookingController.getBookingByNumber);


// -------------------------
// GET ROUTES (ADMIN + RECEPTIONIST)
// -------------------------
router.get("/pending", authenticateAdminOrReceptionist, bookingController.getPendingBookings);
router.get("/confirmed", authenticateAdminOrReceptionist, bookingController.getConfirmedBookings);
router.get("/checked-in", authenticateAdminOrReceptionist, bookingController.getCheckedInBookings);
router.get("/cancelled/all", authenticateAdminOrReceptionist, bookingController.getAllCancelledBookings);

// Dashboard (both)
router.get("/dashboard/stats", authenticateAdminOrReceptionist, bookingController.getDashboardStats);
router.get("/dashboard/monthly", authenticateAdminOrReceptionist, bookingController.getMonthlyStats);


// -------------------------
// ACTION ROUTES (RECEPTIONIST ONLY)
// -------------------------
router.put("/assign-room/:bookingId", authenticateReceptionist, bookingController.assignRoom);
router.put("/confirm/:bookingId", authenticateReceptionist, bookingController.confirmBooking);
router.put("/reject/:bookingId", authenticateReceptionist, bookingController.rejectBooking);

router.put("/checkin/:bookingId", authenticateReceptionist, bookingController.checkInBooking);
router.put("/change-room/:bookingId", authenticateReceptionist, bookingController.changeRoom);

router.put("/guarantee-booking/:bookingId", authenticateReceptionist, bookingController.guaranteeBooking);

router.get("/confirmed-guaranteed-bookings", authenticateReceptionist, bookingController.getConfirmedAndGuaranteedBookings);

router.put("/cancel/:bookingId", authenticateReceptionist, bookingController.cancelBooking);


module.exports = router;
