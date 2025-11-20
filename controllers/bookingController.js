
const Booking = require('../models/bookingModels');
const Room = require('../models/roomModel');
const nodemailer = require('nodemailer');
const cron = require('node-cron');
const { addBookingToSheet, updateBookingInSheet, removeBookingFromSheet } = require("../google-sync/googleSheet");
const roomNumberList = require("../roomNumberList");

const adminEmail = process.env.ADMIN_EMAIL;

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

// Booking number generator
const generateBookingNumber = async () => {
  const lastBooking = await Booking.findOne().sort({ createdAt: -1 });
  let nextNumber = 1001;
  if (lastBooking && lastBooking.bookingNumber) {
    const lastNum = parseInt(lastBooking.bookingNumber.replace('BKN', ''));
    if (!isNaN(lastNum)) nextNumber = lastNum + 1;
  }
  return `BKN${nextNumber}`;
};
exports.createBooking = async (req, res) => {
  try {
    const {
      firstName,
      lastName,
      email,
      country,
      phone,
      checkIn,
      checkOut,
      roomSelection,
      meals,
      specialRequest,
      isAgencyBooking,
      agencyName,
      agentName,
      agencyEmail,
      agencyPhone,
      transactionNumber,
      statusOverride   // ⭐ NEW: admin can send "confirmed" or "guaranteed"
    } = req.body;


    // ------------------------------
    // VALIDATIONS
    // ------------------------------
    if (!isAgencyBooking) {
      if (!firstName || !lastName || !email || !phone || !country) {
        return res.status(400).json({ message: "Missing required guest fields" });
      }
    }

    if (isAgencyBooking) {
      if (!agencyName) return res.status(400).json({ message: "Agency name is required" });
      if (!agentName) return res.status(400).json({ message: "Agent name is required" });
      if (!country) return res.status(400).json({ message: "Country is required" });
    }

    if (!checkIn || !checkOut || !roomSelection?.length) {
      return res.status(400).json({ message: "Missing required booking fields" });
    }


    // ------------------------------
    // DATES + ROOM LOGIC
    // ------------------------------
    const ci = new Date(checkIn);
    const co = new Date(checkOut);
    const nights = Math.ceil((co - ci) / (1000 * 60 * 60 * 24));

    const roomRequest = roomSelection[0];
    const roomType = roomRequest.roomType;
    const roomQty = roomRequest.roomsRequested;

    const roomDoc = await Room.findOne({ roomType });
    if (!roomDoc) return res.status(400).json({ message: `Room type ${roomType} not found` });

    const allowedRooms = roomNumberList[roomType];
    if (!allowedRooms?.length) {
      return res.status(400).json({ message: `No rooms configured for ${roomType}` });
    }

    const bookedRooms = await Booking.find({
      "rooms.roomType": roomType,
      checkIn: { $lte: co },
      checkOut: { $gte: ci },
      status: { $in: ["pending", "confirmed", "guaranteed", "checked_in"] },
    }).select("assignedRoom");

    const usedRooms = bookedRooms
      .flatMap((b) => Array.isArray(b.assignedRoom) ? b.assignedRoom : [b.assignedRoom])
      .filter(Boolean);

    const freeRooms = allowedRooms.filter((r) => !usedRooms.includes(r));

    if (freeRooms.length < roomQty) {
      return res.status(400).json({ message: `Not enough available rooms for ${roomType}` });
    }

    const assignedRooms = freeRooms.slice(0, roomQty);

    const total = roomDoc.price * roomQty * nights;
    const bookingNumber = await generateBookingNumber();


    // ------------------------------
    // ⭐ STATUS LOGIC (WEBSITE + ADMIN)
    // ------------------------------

    let finalStatus;

    if (statusOverride) {
      // ADMIN chooses pending / confirmed / guaranteed
      const allowed = ["pending", "confirmed", "guaranteed"];
      finalStatus = allowed.includes(statusOverride)
        ? statusOverride
        : "pending";

    } else {
      // WEBSITE LOGIC (unchanged)
      finalStatus = transactionNumber ? "confirmed" : "pending";
    }


    // ------------------------------
    // CREATE BOOKING
    // ------------------------------
    const booking = await Booking.create({
      bookingNumber,

      firstName: isAgencyBooking ? "" : firstName,
      lastName: isAgencyBooking ? "" : lastName,
      email: isAgencyBooking ? "" : email,

      country,
      phoneNumber: isAgencyBooking ? "" : phone,

      isAgencyBooking,
      agencyName: isAgencyBooking ? agencyName : "",
      agentName: isAgencyBooking ? agentName : "",
      agencyEmail: isAgencyBooking ? agencyEmail || "" : "",
      agencyPhone: isAgencyBooking ? agencyPhone || "" : "",

      checkIn: ci,
      checkOut: co,
      rooms: [
        { roomType, quantity: roomQty, pricePerNight: roomDoc.price }
      ],
      meals,
      specialRequest,
      totalPrice: total,

      status: finalStatus,
      assignedRoom: assignedRooms,
      transactionNumber: transactionNumber || "",
    });

    res.status(201).json({
      message: `Booking created successfully as ${finalStatus}`,
      booking,
    });

  } catch (err) {
    console.error("Booking creation error:", err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
};



// ASSIGN ROOM
exports.assignRoom = async (req, res) => {
  try {
    const { bookingId } = req.params;
    const { assignedRoom } = req.body;

    const booking = await Booking.findById(bookingId);
    if (!booking) return res.status(404).json({ message: "Booking not found" });

    const bookingRoomType = booking.rooms?.[0]?.roomType;
    const validRooms = roomNumberList[bookingRoomType] || [];

    const roomsToAssign = Array.isArray(assignedRoom)
      ? assignedRoom
      : [assignedRoom];

    const invalidRooms = roomsToAssign.filter((r) => !validRooms.includes(r));
    if (invalidRooms.length > 0) {
      return res.status(400).json({
        message: `Invalid room(s) for ${bookingRoomType}: ${invalidRooms.join(", ")}`,
      });
    }

    booking.assignedRoom = roomsToAssign;
    await booking.save();

    await addBookingToSheet(booking);

    res.status(200).json({
      message: `Room(s) ${booking.assignedRoom.join(", ")} assigned successfully.`,
      booking,
    });
  } catch (err) {
    console.error("Room assignment error:", err);
    res.status(500).json({ error: err.message });
  }
};

exports.confirmBooking = async (req, res) => {
  try {
    const { bookingId } = req.params;
    const { transactionNumber } = req.body;

    if (!transactionNumber)
      return res.status(400).json({ message: 'Transaction number required' });

    const booking = await Booking.findById(bookingId);
    if (!booking) return res.status(404).json({ message: 'Booking not found' });

    booking.status = "confirmed"; // deposit
    booking.transactionNumber = transactionNumber;
    await booking.save();

    await updateBookingInSheet(booking);

    res.status(200).json({ message: 'Booking confirmed.', booking });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
// ** NEW: GUARANTEE BOOKING (full payment) **
exports.guaranteeBooking = async (req, res) => {
  try {
    const { bookingId } = req.params;
    const { transactionNumber } = req.body;

    if (!transactionNumber)
      return res.status(400).json({ message: 'Transaction number required' });

    const booking = await Booking.findById(bookingId);
    if (!booking) return res.status(404).json({ message: 'Booking not found' });

    booking.status = "guaranteed"; // full payment done
    booking.transactionNumber = transactionNumber;
    await booking.save();

    await updateBookingInSheet(booking);

    res.status(200).json({ message: 'Booking guaranteed.', booking });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
// // REJECT BOOKING
// exports.rejectBooking = async (req, res) => {
//   try {
//     const { bookingId } = req.params;

//     const booking = await Booking.findById(bookingId);
//     if (!booking) return res.status(404).json({ message: 'Booking not found' });

//     booking.status = "rejected";
//     await booking.save();

//     await removeBookingFromSheet(booking);

//     res.status(200).json({ message: 'Booking rejected', booking });
//   } catch (err) {
//     res.status(500).json({ error: err.message });
//   }
// };
// REJECT BOOKING (with reason)
exports.rejectBooking = async (req, res) => {
  try {
    const { bookingId } = req.params;
    const { reason } = req.body;   // ⭐ NEW: reject reason

    const booking = await Booking.findById(bookingId);
    if (!booking) return res.status(404).json({ message: "Booking not found" });

    // Cannot reject confirmed / guaranteed / checked-in
    if (booking.status !== "pending") {
      return res.status(400).json({
        message: `Cannot reject booking in status: ${booking.status}`,
      });
    }

    booking.status = "rejected";
    booking.rejectReason = reason || "No reason provided";  // ⭐ Store reason
    booking.assignedRoom = []; // Free room

    await booking.save();
    await removeBookingFromSheet(booking);

    res.status(200).json({
      message: "Booking rejected successfully.",
      booking,
    });

  } catch (err) {
    console.error("Reject booking error:", err);
    res.status(500).json({ message: err.message });
  }
};

// CHECK-IN
exports.checkInBooking = async (req, res) => {
  try {
    const { bookingId } = req.params;
    const booking = await Booking.findById(bookingId);
    if (!booking) return res.status(404).json({ message: 'Booking not found' });

    booking.status = "checked_in";
    await booking.save();

    await updateBookingInSheet(booking);
    res.status(200).json({ message: 'Guest checked in', booking });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// AUTO CHECKOUT
cron.schedule("0 0 * * *", async () => {
  const today = new Date();
  const bookings = await Booking.find({ status: "checked_in", checkOut: { $lte: today } });
  for (const booking of bookings) {
    booking.status = "checked_out";
    await booking.save();
    await updateBookingInSheet(booking);
  }
});

// CHANGE ROOM
exports.changeRoom = async (req, res) => {
  try {
    const { bookingId } = req.params;
    let { newRoom } = req.body;

    if (!newRoom || !String(newRoom).trim()) {
      return res.status(400).json({ message: "Please provide at least one room number." });
    }

    const newRooms = Array.isArray(newRoom)
      ? newRoom.map((r) => r.trim())
      : String(newRoom)
          .split(",")
          .map((r) => r.trim())
          .filter(Boolean);

    if (newRooms.length === 0) {
      return res.status(400).json({ message: "Please provide at least one valid room number." });
    }

    const booking = await Booking.findById(bookingId);
    if (!booking) return res.status(404).json({ message: "Booking not found." });

    const roomType = booking.rooms[0].roomType;

    const roomDoc = await Room.findOne({ roomType });
    if (!roomDoc)
      return res.status(404).json({ message: `Room type '${roomType}' not found.` });

    const allowedRooms = roomDoc.roomNumbers.map((r) =>
      String(r).replace(/["[\]]/g, "").trim()
    );

    const invalidRooms = newRooms.filter((r) => !allowedRooms.includes(r));
    if (invalidRooms.length > 0) {
      return res.status(400).json({
        message: `Invalid room(s): ${invalidRooms.join(", ")} for ${roomType}. 
Allowed rooms: ${allowedRooms.join(", ")}`,
      });
    }

    const overlapping = await Booking.find({
      _id: { $ne: bookingId },
      assignedRoom: { $in: newRooms },
      checkIn: { $lte: booking.checkOut },
      checkOut: { $gte: booking.checkIn },
      status: { $in: ["pending", "confirmed", "checked_in"] },
    });

    if (overlapping.length > 0) {
      const taken = overlapping.map((b) => b.assignedRoom).flat();
      const conflict = newRooms.filter((r) => taken.includes(r));
      return res.status(400).json({
        message: `Room(s) ${conflict.join(", ")} already booked or unavailable.`,
      });
    }

    const oldRooms = booking.assignedRoom || [];
    booking.assignedRoom = newRooms;
    await booking.save();

    res.status(200).json({
      success: true,
      message: `Room(s) changed from [${oldRooms.join(", ")}] → [${newRooms.join(", ")}]`,
      booking,
    });
  } catch (err) {
    console.error("CHANGE ROOM ERROR:", err);
    res.status(500).json({
      success: false,
      message: "An error occurred while changing room(s).",
      error: err.message,
    });
  }
};

// GET BOOKINGS
exports.getBookingByNumber = async (req, res) => {
  try {
    const { bookingNumber } = req.params;
    const booking = await Booking.findOne({ bookingNumber });
    if (!booking) return res.status(404).json({ message: 'Not found' });
    res.json(booking);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getPendingBookings = async (_, res) => {
  try {
    const bookings = await Booking.find({ status: 'pending' }).sort({ createdAt: -1 });
    res.json({ bookings });
  } catch {
    res.status(500).json({ message: 'Error' });
  }
};

exports.getConfirmedBookings = async (_, res) => {
  try {
    const bookings = await Booking.find({ status: 'confirmed' }).sort({ createdAt: -1 });
    res.json({ bookings });
  } catch {
    res.status(500).json({ message: 'Error' });
  }
};

exports.getCheckedInBookings = async (_, res) => {
  try {
    const bookings = await Booking.find({ status: 'checked_in' }).sort({ checkIn: 1 });
    res.json({ bookings });
  } catch {
    res.status(500).json({ message: 'Error' });
  }
};
exports.getConfirmedAndGuaranteedBookings = async (_, res) => {
  try {
    const bookings = await Booking.find({
      status: { $in: ['confirmed', 'guaranteed'] }
    }).sort({ createdAt: -1 });

    res.json({ bookings });
  } catch {
    res.status(500).json({ message: 'Error fetching bookings' });
  }
};
// CANCEL BOOKING (only for confirmed)
exports.cancelBooking = async (req, res) => {
  try {
    const { bookingId } = req.params;
    const { reason } = req.body;  // ⭐ NEW: cancellation reason

    const booking = await Booking.findById(bookingId);
    if (!booking) {
      return res.status(404).json({ message: "Booking not found" });
    }

    // ❌ RULE 1: Cannot cancel pending → use rejectBooking instead
    if (booking.status === "pending") {
      return res.status(400).json({
        message: "Pending bookings cannot be cancelled. Use reject option."
      });
    }

    // ❌ RULE 2: Cannot cancel guaranteed
    if (booking.status === "guaranteed") {
      return res.status(400).json({
        message: "Guaranteed bookings cannot be cancelled."
      });
    }

    // ❌ RULE 3: Cannot cancel after check-in
    if (booking.status === "checked_in") {
      return res.status(400).json({
        message: "Cannot cancel a checked-in booking."
      });
    }

    // ❌ RULE 4: Block if already ended or cancelled/rejected
    if (["checked_out", "rejected", "cancelled"].includes(booking.status)) {
      return res.status(400).json({
        message: `Booking already ${booking.status}.`
      });
    }

    // ✔ RULE 5: Only confirmed can be cancelled
    if (booking.status !== "confirmed") {
      return res.status(400).json({
        message: "Only confirmed bookings can be cancelled."
      });
    }

    // ⭐ SAVE THE CANCELLATION REASON
    booking.cancelReason = reason || "No reason provided"; 

    // ✔ CANCEL BOOKING
    booking.status = "cancelled";
    booking.assignedRoom = []; // Free rooms

    await booking.save();

    await removeBookingFromSheet(booking);

    res.status(200).json({
      message: "Booking cancelled successfully.",
      booking,
    });

  } catch (err) {
    console.error("Cancel booking error:", err);
    res.status(500).json({ message: err.message });
  }
};
exports.getAllCancelledBookings = async (_, res) => {
  try {
    const bookings = await Booking.find({ status: "cancelled" })
      .sort({ cancelledAt: -1 });

    res.json({ bookings });
  } catch {
    res.status(500).json({ message: "Error fetching cancelled bookings" });
  }
};


// DASHBOARD STATS
exports.getDashboardStats = async (req, res) => {
  try {
    const totalBookings = await Booking.countDocuments();
    const localGuests = await Booking.countDocuments({ country: "Bhutan" });
    const foreignGuests = await Booking.countDocuments({
      country: { $ne: "Bhutan" },
    });

    res.status(200).json({
      totalBookings,
      localGuests,
      foreignGuests,
    });
  } catch (err) {
    console.error("Dashboard stats error:", err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

// MONTHLY GRAPH DATA
exports.getMonthlyStats = async (req, res) => {
  try {
    const { year } = req.query;

    if (!year) {
      return res.status(400).json({ message: "Year is required" });
    }

    const months = [
      "Jan", "Feb", "Mar", "Apr", "May", "Jun",
      "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"
    ];

    const monthlyStats = months.map((m) => ({
      month: m,
      foreign: 0,
      local: 0,
    }));

    const startDate = new Date(`${year}-01-01`);
    const endDate = new Date(`${parseInt(year) + 1}-01-01`);

    const bookings = await Booking.find({
      createdAt: { $gte: startDate, $lt: endDate },
    }).select("country createdAt");

    bookings.forEach((b) => {
      const monthIndex = new Date(b.createdAt).getMonth();
      if (b.country && b.country.toLowerCase() === "bhutan") {
        monthlyStats[monthIndex].local += 1;
      } else {
        monthlyStats[monthIndex].foreign += 1;
      }
    });

    res.status(200).json(monthlyStats);
  } catch (err) {
    console.error("📊 Monthly stats error:", err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
};
