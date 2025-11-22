
const Booking = require('../models/bookingModels');
const Room = require('../models/roomModel');
const nodemailer = require('nodemailer');
const cron = require('node-cron');
const { addBookingToSheet, updateBookingInSheet, removeBookingFromSheet } = require("../google-sync/googleSheet");
const roomNumberList = require("../roomNumberList");
const { sendMailWithGmailApi } = require("../utils/gmailSender");
;

const generateBookingNumber = async () => {
  const lastBooking = await Booking.findOne().sort({ createdAt: -1 });

  let nextNumber = 1;

  if (lastBooking && lastBooking.bookingNumber) {
    const lastNum = parseInt(lastBooking.bookingNumber.replace("RN-", ""), 10);
    if (!isNaN(lastNum)) nextNumber = lastNum + 1;
  }

  // Convert number to 2-digit format: 1 → "01", 2 → "02"
  const twoDigit = nextNumber.toString().padStart(2, "0");

  return `RN-${twoDigit}`;
};

// CREATE BOOKING
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
      statusOverride
    } = req.body;

    // ------------------------------
    // VALIDATIONS
    // ------------------------------
    if (!checkIn || !checkOut || !roomSelection?.length) {
      return res.status(400).json({ message: "Missing required booking fields" });
    }

    if (!isAgencyBooking && (!firstName || !lastName || !email)) {
      return res.status(400).json({ message: "Guest details required" });
    }

    // ------------------------------
    // DATE + ROOM LOGIC
    // ------------------------------
    const ci = new Date(checkIn);
    const co = new Date(checkOut);
    const nights = Math.ceil((co - ci) / (1000 * 60 * 60 * 24));

    const roomRequest = roomSelection[0];
    const roomType = roomRequest.roomType;
    const roomQty = roomRequest.roomsRequested;

    const roomDoc = await Room.findOne({ roomType });
    if (!roomDoc)
      return res.status(400).json({ message: `Room type ${roomType} not found` });

    const allowedRooms = roomNumberList[roomType];
    const bookedRooms = await Booking.find({
      "rooms.roomType": roomType,
      checkIn: { $lte: co },
      checkOut: { $gte: ci },
      status: { $in: ["pending", "confirmed", "guaranteed", "checked_in"] }
    });

    const usedRooms = bookedRooms.flatMap(b => b.assignedRoom || []).filter(Boolean);

    const freeRooms = allowedRooms.filter(r => !usedRooms.includes(r));

    if (freeRooms.length < roomQty) {
      return res.status(400).json({ message: `Not enough available rooms for ${roomType}` });
    }

    const assignedRooms = freeRooms.slice(0, roomQty);

    const total = roomDoc.price * roomQty * nights;

    // ------------------------------
    // ⭐ FIXED — RN booking number
    // ------------------------------
    const bookingNumber = await generateBookingNumber();

    // ------------------------------
    // STATUS LOGIC
    // ------------------------------
    let finalStatus =
      statusOverride
        ? statusOverride
        : transactionNumber
        ? "confirmed"
        : "pending";

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
      transactionNumber: transactionNumber || ""
    });

    // ------------------------------
    // EMAIL SEND — Styled HTML
    // ------------------------------
    try {
      const recipient = isAgencyBooking ? agencyEmail : email;

      if (recipient) {
        const html = `
          <div style="font-family: Arial, sans-serif; padding: 15px; background-color: #f9f9f9;">
            <div style="max-width: 600px; margin: auto; background: white; border-radius: 10px; padding: 20px; border: 1px solid #ddd;">
              <h2 style="color: #006600;">Booking Confirmation</h2>

              <p>Dear <strong>${isAgencyBooking ? agentName : firstName}</strong>,</p>

              <p>Your booking has been successfully sent to admin.</p>

              <h3>Booking Details</h3>
              <p><strong>Booking Number:</strong> ${bookingNumber}</p>
              <p><strong>Room Type:</strong> ${roomType}</p>
              <p><strong>Check-in:</strong> ${ci.toDateString()}</p>
              <p><strong>Check-out:</strong> ${co.toDateString()}</p>
              <p><strong>Nights:</strong> ${nights}</p>
              <p><strong>Total Price:</strong> Nu. ${total}</p>

              <p style="margin-top: 20px;">
                Best Regards,<br>
                <strong>Hotel Management Team</strong>
              </p>
            </div>
          </div>
        `;

        await sendMailWithGmailApi(
          recipient,
          `Booking Confirmation - ${bookingNumber}`,
          html
        );
      }
    } catch (emailErr) {
      console.error("EMAIL SEND ERROR:", emailErr.message);
    }
    await addBookingToSheet(booking);


    // ------------------------------
    // RESPONSE
    // ------------------------------
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

    if (!transactionNumber) {
      return res.status(400).json({ message: 'Transaction number required' });
    }

    const booking = await Booking.findById(bookingId);
    if (!booking) {
      return res.status(404).json({ message: 'Booking not found' });
    }

    // Update booking status
    booking.status = "confirmed"; 
    booking.transactionNumber = transactionNumber;
    await booking.save();

    await updateBookingInSheet(booking);

    // -------------------------------------
    // SEND EMAIL USING GMAIL API
    // -------------------------------------

    try {
      const recipient = booking.isAgencyBooking 
        ? booking.agencyEmail 
        : booking.email;

      if (recipient) {
        const htmlContent = `
          <div style="font-family: Arial, sans-serif; padding: 15px; background-color: #f9f9f9;">
            <div style="max-width: 600px; margin: auto; background: white; border-radius: 10px; padding: 20px; border: 1px solid #ddd;">
              
              <h2 style="color: #006600;">Booking Confirmed</h2>

              <p>Dear <strong>${booking.isAgencyBooking ? booking.agentName : booking.firstName}</strong>,</p>

              <p>Your booking has been <strong>successfully confirmed</strong> after receiving the payment deposit.</p>

              <h3 style="color:#444;">Booking Details</h3>
              <p><strong>Booking Number:</strong> ${booking.bookingNumber}</p>
              <p><strong>Room Type:</strong> ${booking.rooms[0].roomType}</p>
              <p><strong>Check-in:</strong> ${new Date(booking.checkIn).toDateString()}</p>
              <p><strong>Check-out:</strong> ${new Date(booking.checkOut).toDateString()}</p>

              <h3 style="margin-top:20px;color:#444;">Payment</h3>
              <p><strong>Transaction Number:</strong> ${transactionNumber}</p>
              <p>Status: <span style="color:green;"><strong>Confirmed</strong></span></p>

              <p style="margin-top: 20px;">
                Best Regards,<br>
                <strong>Hotel Management Team</strong>
              </p>

            </div>
          </div>
        `;

        await sendMailWithGmailApi(
          recipient,
          `Booking Confirmed - ${booking.bookingNumber}`,
          htmlContent
        );
      }

    } catch (emailErr) {
      console.error("EMAIL SEND ERROR (confirmBooking):", emailErr.message);
    }

    // -------------------------------------
    // RESPONSE
    // -------------------------------------
    res.status(200).json({
      message: "Booking confirmed.",
      booking
    });

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
exports.guaranteeBooking = async (req, res) => {
  try {
    const { bookingId } = req.params;
    const { transactionNumber } = req.body;

    if (!transactionNumber)
      return res.status(400).json({ message: "Transaction number required" });

    const booking = await Booking.findById(bookingId);
    if (!booking)
      return res.status(404).json({ message: "Booking not found" });

    // Update booking
    booking.status = "guaranteed"; // full payment done
    booking.transactionNumber = transactionNumber;
    await booking.save();

    await updateBookingInSheet(booking);

    // -----------------------------------------------------------
    //  SEND EMAIL TO GUEST (same style template as changePassword)
    // -----------------------------------------------------------

    const fullName = booking.isAgencyBooking
      ? booking.agentName || "Guest"
      : `${booking.firstName} ${booking.lastName}`;

    const htmlContent = `
      <div style="font-family: Arial, sans-serif; padding: 15px; background-color: #f9f9f9;">
        <div style="max-width: 600px; margin: auto; background: white; border-radius: 10px; padding: 20px; border: 1px solid #ddd;">
          <h2 style="color: #006600;">Booking Guaranteed</h2>

          <p>Dear <strong>${fullName}</strong>,</p>

          <p>Your booking has been <strong>fully guaranteed</strong> after receiving your payment.</p>

          <h3 style="color:#333;">Booking Details</h3>

          <p><strong>Booking Number:</strong> ${booking.bookingNumber}</p>
          <p><strong>Room Type:</strong> ${booking.rooms[0].roomType}</p>
          
          <p><strong>Check-In:</strong> ${booking.checkIn.toDateString()}</p>
          <p><strong>Check-Out:</strong> ${booking.checkOut.toDateString()}</p>
          <p><strong>Transaction Number:</strong> ${transactionNumber}</p>

          <p style="margin-top:20px;">
            Thank you for choosing <strong>Hotel Thim-Dorji</strong>.  
            We look forward to welcoming you.
          </p>

          <p style="margin-top: 25px;">Best Regards,<br><strong>Hotel Reservation Team</strong></p>
        </div>
      </div>
    `;

    // Send email (Gmail API)
    const guestEmail = booking.isAgencyBooking
      ? booking.agencyEmail
      : booking.email;

    if (guestEmail) {
      await sendMailWithGmailApi(
        guestEmail,
        "Your Booking is Guaranteed",
        htmlContent
      );
    }

    // -----------------------------------------------------------

    res.status(200).json({
      message: "Booking guaranteed and email sent.",
      booking,
    });

  } catch (error) {
    console.error("Guarantee Booking Error:", error);
    res.status(500).json({ message: error.message });
  }
};
exports.rejectBooking = async (req, res) => {
  try {
    const { bookingId } = req.params;
    const { reason } = req.body;

    const booking = await Booking.findById(bookingId);
    if (!booking)
      return res.status(404).json({ message: "Booking not found" });

    // Only pending bookings can be rejected
    if (booking.status !== "pending") {
      return res.status(400).json({
        message: `Cannot reject booking in status: ${booking.status}`,
      });
    }

    // Update booking
    booking.status = "rejected";
    booking.rejectReason = reason || "No reason provided";
    booking.assignedRoom = [];
    await booking.save();

    await removeBookingFromSheet(booking);

    // -----------------------------------------------------------
    // 📧 SEND REJECTION EMAIL (Styled)
    // -----------------------------------------------------------

    const fullName = booking.isAgencyBooking
      ? booking.agentName || "Guest"
      : `${booking.firstName} ${booking.lastName}`;

    const htmlContent = `
      <div style="font-family: Arial, sans-serif; padding: 15px; background-color: #f9f9f9;">
        <div style="max-width: 600px; margin: auto; background: white; border-radius: 10px; padding: 20px; border: 1px solid #ddd;">
          
          <h2 style="color: #cc0000;">Booking Rejected</h2>

          <p>Dear <strong>${fullName}</strong>,</p>

          <p>We regret to inform you that your booking request has been <strong>rejected</strong>.</p>

          <h3 style="color:#333;">Booking Details</h3>

          <p><strong>Booking Number:</strong> ${booking.bookingNumber}</p>
          <p><strong>Room Type:</strong> ${booking.rooms[0].roomType}</p>
          <p><strong>Check-In:</strong> ${booking.checkIn.toDateString()}</p>
          <p><strong>Check-Out:</strong> ${booking.checkOut.toDateString()}</p>

          <h3 style="color:#333;">Reason for Rejection</h3>
          <p style="color:#cc0000;"><strong>${booking.rejectReason}</strong></p>

          <p style="margin-top:20px;">
            If you have any questions or wish to modify your booking, please contact our reservations team.
          </p>

          <p style="margin-top: 25px;">Best Regards,<br><strong>Hotel Reservation Team</strong></p>
        </div>
      </div>
    `;

    const guestEmail = booking.isAgencyBooking
      ? booking.agencyEmail
      : booking.email;

    if (guestEmail) {
      await sendMailWithGmailApi(
        guestEmail,
        "Your Booking Has Been Rejected",
        htmlContent
      );
    }

    // -----------------------------------------------------------

    res.status(200).json({
      message: "Booking rejected successfully, email sent.",
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
exports.cancelBooking = async (req, res) => {
  try {
    const { bookingId } = req.params;
    const { reason } = req.body;

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

    // ❌ RULE 4: Already cancelled / ended
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

    // ⭐ SAVE CANCELLATION REASON
    booking.cancelReason = reason || "No reason provided";

    // ✔ CANCEL BOOKING
    booking.status = "cancelled";
    booking.assignedRoom = [];
    await booking.save();

    await removeBookingFromSheet(booking);

    // -----------------------------------------------------------
    // 📧 SEND CANCELLATION EMAIL (HTML Styled)
    // -----------------------------------------------------------

    const fullName = booking.isAgencyBooking
      ? booking.agentName || "Guest"
      : `${booking.firstName} ${booking.lastName}`;

    const htmlContent = `
      <div style="font-family: Arial, sans-serif; padding: 15px; background-color: #f9f9f9;">
        <div style="max-width: 600px; margin: auto; background: white; border-radius: 10px; padding: 20px; border: 1px solid #ddd;">

          <h2 style="color: #cc0000;">Booking Cancelled</h2>

          <p>Dear <strong>${fullName}</strong>,</p>

          <p>Your booking has been <strong>cancelled</strong> by our reservation team.</p>

          <h3 style="color:#333;">Booking Details</h3>
          <p><strong>Booking Number:</strong> ${booking.bookingNumber}</p>
          <p><strong>Room Type:</strong> ${booking.rooms[0].roomType}</p>
          <p><strong>Check-In:</strong> ${booking.checkIn.toDateString()}</p>
          <p><strong>Check-Out:</strong> ${booking.checkOut.toDateString()}</p>

          <h3 style="color:#333;">Reason for Cancellation</h3>
          <p style="color:#cc0000;"><strong>${booking.cancelReason}</strong></p>

          <p style="margin-top:20px;">
            If you wish, you may create a new booking at any time.  
            Please contact us if you need assistance.
          </p>

          <p style="margin-top: 25px;">Best Regards,<br><strong>Hotel Reservation Team</strong></p>
        </div>
      </div>
    `;

    const guestEmail = booking.isAgencyBooking
      ? booking.agencyEmail
      : booking.email;

    if (guestEmail) {
      await sendMailWithGmailApi(
        guestEmail,
        "Your Booking Has Been Cancelled",
        htmlContent
      );
    }

    // -----------------------------------------------------------

    res.status(200).json({
      message: "Booking cancelled successfully. Email sent.",
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
