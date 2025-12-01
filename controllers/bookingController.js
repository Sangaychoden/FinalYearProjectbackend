
const Booking = require('../models/bookingModels');
const Room = require('../models/roomModel');
const nodemailer = require('nodemailer');
const cron = require('node-cron');
const { addBookingToSheet, updateBookingInSheet, removeBookingFromSheet } = require("../google-sync/googleSheet");
const roomNumberList = require("../roomNumberList");
const { sendMailWithGmailApi } = require("../utils/gmailSender");
;
const adminEmail = process.env.ADMIN_EMAIL;

const validator = require("validator");
const sanitizeHtml = require("sanitize-html");
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
// exports.createBooking = async (req, res) => {
//   try {
//     const {
//       firstName,
//       lastName,
//       email,
//       country,
//       phone,
//       checkIn,
//       checkOut,
//       roomSelection,
//       specialRequest,
//       journalNumber,
//       statusOverride,
//       assignedRoom // <-- manual rooms from FE
//     } = req.body;

//     // ----------------------------------------------------
//     // BASIC VALIDATION
//     // ----------------------------------------------------
//     if (!roomSelection?.length)
//       return res.status(400).json({ message: "Room selection is required" });

//     if (!validator.isDate(checkIn) || !validator.isDate(checkOut))
//       return res.status(400).json({ message: "Invalid dates" });

//     const ci = new Date(checkIn);
//     const co = new Date(checkOut);
//     const nights = Math.ceil((co - ci) / 86400000);
//     if (nights <= 0)
//       return res.status(400).json({ message: "Check-out must be after check-in" });

//     let total = 0;
//     let roomDetails = [];

//     // ----------------------------------------------------
//     // FINAL ASSIGNED ROOMS (manual OR auto)
//     // ----------------------------------------------------
//     let assignedRoomsFinal = [];

//     // Manual selected rooms
//     const manualRooms =
//       Array.isArray(assignedRoom) && assignedRoom.length > 0
//         ? assignedRoom.map(r => String(r))
//         : [];

//     const isManual = manualRooms.length > 0;

//     // ====================================================
//     // ⭐ 1. DOUBLE BOOKING PREVENTION (MANUAL ROOMS)
//     // ====================================================
//     if (isManual) {
//       const conflict = await Booking.findOne({
//         assignedRoom: { $in: manualRooms },
//         checkIn: { $lte: co },
//         checkOut: { $gte: ci },
//         status: { $in: ["pending", "confirmed", "guaranteed", "checked_in"] }
//       });

//       if (conflict) {
//         return res.status(400).json({
//           message: `One or more selected rooms are already booked`
//         });
//       }

//       assignedRoomsFinal = [...manualRooms];
//     }

//     // ====================================================
//     // ⭐ 2. PROCESS ROOM TYPES
//     // ====================================================
//     for (const reqRoom of roomSelection) {
//       const {
//         roomType,
//         roomsRequested = 1,
//         occupancyType = [],
//         mealPlan,
//         adults,
//         childrenAges = [],
//         extraBed = 0
//       } = reqRoom;

//       const roomDoc = await Room.findOne({ roomType });
//       if (!roomDoc)
//         return res.status(400).json({ message: `Room ${roomType} not found` });

//       const pricing = roomDoc.pricing;

//       // ----------------------------------------------------
//       // ⭐ AUTO ASSIGN ROOMS IF MANUAL NOT PROVIDED
//       // ----------------------------------------------------
//       if (!isManual) {
//         const allowedRooms = roomDoc.roomNumbers.map(String);

//         const overlapping = await Booking.find({
//           "rooms.roomType": roomType,
//           checkIn: { $lte: co },
//           checkOut: { $gte: ci },
//           status: { $in: ["pending", "confirmed", "guaranteed", "checked_in"] }
//         });

//         const usedRooms = overlapping.flatMap(b => b.assignedRoom).map(String);

//         const freeRooms = allowedRooms.filter(r => !usedRooms.includes(r));

//         if (freeRooms.length < roomsRequested) {
//           return res.status(400).json({
//             message: `Only ${freeRooms.length} rooms available for ${roomType}`
//           });
//         }

//         assignedRoomsFinal.push(...freeRooms.slice(0, roomsRequested));
//       }

//       // ----------------------------------------------------
//       // ⭐ PRICING
//       // ----------------------------------------------------
//       let baseTotal = 0;

//       for (let i = 0; i < roomsRequested; i++) {
//         const occ = occupancyType[i] || "double";
//         const occKey = occ === "single" ? "single" : "double";
//         const price = pricing?.[mealPlan]?.[occKey] ?? 0;
//         baseTotal += price;
//       }

//       let childCost = 0;
//       childrenAges.forEach(age => {
//         if (age === "6-11")
//           childCost += pricing.childPolicy?.age6to11?.[mealPlan] ?? 0;

//         if (age === "12+") {
//           childCost += baseTotal / roomsRequested;
//         }
//       });

//       const doubleCount = occupancyType.filter(o => o === "double").length;
//       const appliedExtraBeds = Math.min(extraBed, doubleCount);
//       const extraBedPrice = pricing.extraBed?.[mealPlan] ?? 0;
//       const extraBedCost = appliedExtraBeds * extraBedPrice;

//       const perNightTotal = baseTotal + childCost + extraBedCost;
//       total += perNightTotal * nights;

//       roomDetails.push({
//         roomType,
//         quantity: roomsRequested,
//         occupancyType,
//         mealPlan,
//         adults,
//         children: childrenAges.map(age => ({ age })),
//         extraBeds: appliedExtraBeds,
//         extraBedPrice,
//         extraBedCostPerNight: extraBedCost,
//         childCostPerNight: childCost,
//         pricePerNight: baseTotal
//       });
//     }

//     // ====================================================
//     // ⭐ 3. FINAL — ALWAYS USE EXACT MANUAL ROOMS IF SET
//     // ====================================================
//     if (isManual) {
//       assignedRoomsFinal = manualRooms;
//     }

//     // ====================================================
//     // ⭐ 4. SAVE BOOKING
//     // ====================================================
//     const bookingNumber = await generateBookingNumber();

//     const booking = await Booking.create({
//       bookingNumber,
//       firstName,
//       lastName,
//       email,
//       country,
//       phoneNumber: phone,
//       checkIn: ci,
//       checkOut: co,
//       rooms: roomDetails,
//       meals: {
//         breakfast: roomDetails.some(r => r.mealPlan !== "ep"),
//         lunch: roomDetails.some(r => r.mealPlan === "ap"),
//         dinner: roomDetails.some(r => r.mealPlan === "map" || r.mealPlan === "ap")
//       },
//       specialRequest,
//       totalPrice: total,
//       transactionNumber: journalNumber || "",
//       assignedRoom: assignedRoomsFinal,
//       status: statusOverride || "pending"
//     });

//     // ====================================================
//     // ⭐ 5. EMAILS
//     // ====================================================
//     const htmlUser = `
//       <div style="font-family: Arial; padding: 20px;">
//         <h2 style="color:#006600;">Booking Received</h2>
//         <p>Assigned Rooms: ${assignedRoomsFinal.join(", ")}</p>
//         <p>Total: BTN ${total.toFixed(2)}</p>
//       </div>
//     `;

//     const htmlAdmin = `
//       <div style="font-family: Arial; padding: 20px;">
//         <h2 style="color:#006600;">New Booking</h2>
//         <p>Rooms: ${assignedRoomsFinal.join(", ")}</p>
//         <p>Total: BTN ${total.toFixed(2)}</p>
//       </div>
//     `;

//     try {
//       await sendMailWithGmailApi(email, `Booking ${bookingNumber}`, htmlUser);
//       await sendMailWithGmailApi(adminEmail, `New Booking ${bookingNumber}`, htmlAdmin);
//     } catch (err) {
//       console.log("Email error:", err.message);
//     }

//     return res.status(201).json({
//       message: "Booking created successfully",
//       booking
//     });
//   } catch (err) {
//     console.error("Booking creation error:", err);
//     return res.status(500).json({ message: "Server error" });
//   }
// };
// exports.createBooking = async (req, res) => {
//   try {
//     const {
//       firstName,
//       lastName,
//       email,
//       country,
//       phone,
//       checkIn,
//       checkOut,
//       roomSelection,
//       specialRequest,
//       journalNumber,
//       statusOverride,
//       assignedRoom
//     } = req.body;

//     // ----------------------------------------------------
//     // BASIC VALIDATION
//     // ----------------------------------------------------
//     if (!roomSelection?.length)
//       return res.status(400).json({ message: "Room selection is required" });

//     if (!validator.isDate(checkIn) || !validator.isDate(checkOut))
//       return res.status(400).json({ message: "Invalid dates" });

//     const ci = new Date(checkIn);
//     const co = new Date(checkOut);
//     const nights = Math.ceil((co - ci) / 86400000);

//     if (nights <= 0)
//       return res.status(400).json({
//         message: "Check-out must be after check-in"
//       });

//     let total = 0;
//     let roomDetails = [];

//     // ----------------------------------------------------
//     // FINAL ASSIGNED ROOMS (manual OR auto)
//     // ----------------------------------------------------
//     let assignedRoomsFinal = [];

//     const manualRooms =
//       Array.isArray(assignedRoom) && assignedRoom.length > 0
//         ? assignedRoom.map((r) => String(r))
//         : [];

//     const isManual = manualRooms.length > 0;

//     // ====================================================
//     // ⭐ 1. DOUBLE BOOKING PREVENTION (MANUAL ROOMS)
//     // ====================================================
//     if (isManual) {
//       const conflict = await Booking.findOne({
//         assignedRoom: { $in: manualRooms },
//         checkIn: { $lte: co },
//         checkOut: { $gte: ci },
//         status: {
//           $in: ["pending", "confirmed", "guaranteed", "checked_in"]
//         }
//       });

//       if (conflict)
//         return res.status(400).json({
//           message: "One or more selected rooms are already booked"
//         });

//       assignedRoomsFinal = [...manualRooms];
//     }

//     // ====================================================
//     // ⭐ 2. PROCESS ROOM TYPES
//     // ====================================================
//     for (const reqRoom of roomSelection) {
//       let {
//         roomType,
//         roomsRequested = 1,
//         occupancyType = [],
//         mealPlan,
//         adults,
//         childrenAges = [],
//         extraBed = 0
//       } = reqRoom;

//       const roomDoc = await Room.findOne({ roomType });
//       if (!roomDoc)
//         return res
//           .status(400)
//           .json({ message: `Room ${roomType} not found` });

//       const pricing = roomDoc.pricing;

//       // ----------------------------------------------------
//       // ⭐ FIX → Convert all "12+" into adults
//       // ----------------------------------------------------
//       let filteredChildren = [];
//       childrenAges.forEach((age) => {
//         if (age === "12+") adults += 1;
//         else filteredChildren.push(age);
//       });
//       childrenAges = filteredChildren;

//       // ----------------------------------------------------
//       // ⭐ AUTO ASSIGN ROOMS IF MANUAL NOT PROVIDED
//       // ----------------------------------------------------
//       if (!isManual) {
//         const allowedRooms = roomDoc.roomNumbers.map(String);

//         const overlapping = await Booking.find({
//           "rooms.roomType": roomType,
//           checkIn: { $lte: co },
//           checkOut: { $gte: ci },
//           status: {
//             $in: ["pending", "confirmed", "guaranteed", "checked_in"]
//           }
//         });

//         const usedRooms = overlapping.flatMap((b) => b.assignedRoom).map(String);
//         const freeRooms = allowedRooms.filter((r) => !usedRooms.includes(r));

//         if (freeRooms.length < roomsRequested) {
//           return res.status(400).json({
//             message: "No rooms available on this date"
//           });
//         }

//         assignedRoomsFinal.push(...freeRooms.slice(0, roomsRequested));
//       }

//       // ----------------------------------------------------
//       // ⭐ PRICING
//       // ----------------------------------------------------
//       let baseTotal = 0;

//       for (let i = 0; i < roomsRequested; i++) {
//         const occ = occupancyType[i] || "double";
//         const occKey = occ === "single" ? "single" : "double";
//         const price = pricing?.[mealPlan]?.[occKey] ?? 0;
//         baseTotal += price;
//       }

//       let childCost = 0;

//       // ⭐ ONLY 6–11 gets child pricing
//       childrenAges.forEach((age) => {
//         if (age === "6-11")
//           childCost += pricing.childPolicy?.age6to11?.[mealPlan] ?? 0;
//       });

//       const doubleCount = occupancyType.filter((o) => o === "double").length;
//       const appliedExtraBeds = Math.min(extraBed, doubleCount);

//       const extraBedPrice = pricing.extraBed?.[mealPlan] ?? 0;
//       const extraBedCost = appliedExtraBeds * extraBedPrice;

//       const perNightTotal = baseTotal + childCost + extraBedCost;

//       total += perNightTotal * nights;

//       roomDetails.push({
//         roomType,
//         quantity: roomsRequested,
//         occupancyType,
//         mealPlan,
//         adults,
//         children: childrenAges.map((age) => ({ age })),
//         extraBeds: appliedExtraBeds,
//         extraBedPrice,
//         extraBedCostPerNight: extraBedCost,
//         childCostPerNight: childCost,
//         pricePerNight: baseTotal
//       });
//     }

//     // ====================================================
//     // ⭐ 3. ALWAYS USE MANUAL IF PROVIDED
//     // ====================================================
//     if (isManual) assignedRoomsFinal = manualRooms;

//     // ====================================================
//     // ⭐ 4. SAVE BOOKING
//     // ====================================================
//     const bookingNumber = await generateBookingNumber();

//     const booking = await Booking.create({
//       bookingNumber,
//       firstName,
//       lastName,
//       email,
//       country,
//       phoneNumber: phone,
//       checkIn: ci,
//       checkOut: co,
//       rooms: roomDetails,
//       meals: {
//         breakfast: roomDetails.some((r) => r.mealPlan !== "ep"),
//         lunch: roomDetails.some((r) => r.mealPlan === "ap"),
//         dinner: roomDetails.some(
//           (r) => r.mealPlan === "map" || r.mealPlan === "ap"
//         )
//       },
//       specialRequest,
//       totalPrice: total,
//       transactionNumber: journalNumber || "",
//       assignedRoom: assignedRoomsFinal,
//       status: statusOverride || "pending"
//     });

//     // ====================================================
//     // ⭐ 5. EMAILS
//     // ====================================================
//     const htmlContentUser = `
//       <div style="font-family: Arial, sans-serif; padding: 15px; background-color: #f9f9f9;">
//         <div style="max-width: 600px; margin: auto; background: white; border-radius: 10px; padding: 20px; border: 1px solid #ddd;">
//           <h2 style="color: #006600;">Booking Received</h2>
//           <p>Dear <strong>${firstName}</strong>,</p>
//           <p>Your booking request has been <strong>received</strong>. We will contact you shortly.</p>
          
//           <h3 style="color:#444;">Booking Summary</h3>
//           <p><strong>Booking Number:</strong> ${bookingNumber}</p>
//           <p><strong>Check-in:</strong> ${ci.toDateString()}</p>
//           <p><strong>Check-out:</strong> ${co.toDateString()}</p>
//           <p><strong>Total Rooms:</strong> ${roomDetails.reduce((s,r)=>s+r.quantity,0)}</p>
//           <p><strong>Total Price:</strong> BTN ${total.toFixed(2)}</p>

//           <p style="margin-top: 20px;">Warm regards,<br><strong>Hotel Team</strong></p>
//         </div>
//       </div>
//     `;

//     const htmlContentAdmin = `
//       <div style="font-family: Arial, sans-serif; padding: 15px; background-color: #f9f9f9;">
//         <div style="max-width: 600px; margin: auto; background: white; border-radius: 10px; padding: 20px; border: 1px solid #ddd;">
//           <h2 style="color: #006600;">New Booking Received</h2>

//           <h3 style="color:#444;">Customer Info</h3>
//           <p><strong>${firstName} ${lastName}</strong></p>
//           <p>${email}</p>

//           <h3 style="color:#444;">Booking Summary</h3>
//           <p><strong>Booking Number:</strong> ${bookingNumber}</p>
//           <p><strong>Check-in:</strong> ${ci.toDateString()}</p>
//           <p><strong>Check-out:</strong> ${co.toDateString()}</p>
//           <p><strong>Total:</strong> BTN ${total.toFixed(2)}</p>
//         </div>
//       </div>
//     `;

//     try {
//       await sendMailWithGmailApi(
//         email,
//         `Booking ${bookingNumber}`,
//         htmlContentUser
//       );

//       await sendMailWithGmailApi(
//         adminEmail,
//         `New Booking ${bookingNumber}`,
//         htmlContentAdmin
//       );
//     } catch (err) {
//       console.log("Email error:", err.message);
//     }

//     return res.status(201).json({
//       message: "Booking created successfully",
//       booking
//     });
//   } catch (err) {
//     console.error("Booking creation error:", err);
//     return res.status(500).json({ message: "Server error" });
//   }
// };
// =====================================================
//  HELPERS
// =====================================================

function mealFlags(plan) {
  switch (plan) {
    case "ep":
      return { breakfast: false, lunch: false, dinner: false };

    case "cp":
      return { breakfast: true, lunch: false, dinner: false };

    case "map":
      return { breakfast: true, lunch: false, dinner: true }; // ✔ frontend = BF + dinner

    case "ap":
      return { breakfast: true, lunch: true, dinner: true };

    default:
      return { breakfast: false, lunch: false, dinner: false };
  }
}

// =====================================================
//  MAIN CONTROLLER
// =====================================================

// exports.createBooking = async (req, res) => {
//   try {
//     const {
//       firstName,
//       lastName,
//       email,
//       country,
//       phone,
//       checkIn,
//       checkOut,
//       roomSelection,
//       specialRequest,
//       journalNumber,
//       statusOverride,
//       assignedRoom,
//     } = req.body;

//     // ----------------------------------------------------
//     // BASIC VALIDATION
//     // ----------------------------------------------------
//     if (!roomSelection?.length)
//       return res.status(400).json({ message: "Room selection is required" });

//     if (!validator.isDate(checkIn) || !validator.isDate(checkOut))
//       return res.status(400).json({ message: "Invalid dates" });

//     const ci = new Date(checkIn);
//     const co = new Date(checkOut);
//     const nights = Math.ceil((co - ci) / 86400000);

//     if (nights <= 0)
//       return res
//         .status(400)
//         .json({ message: "Check-out must be after check-in" });

//     let total = 0;
//     let roomDetails = [];

//     // ----------------------------------------------------
//     // ASSIGNED ROOMS — manual or auto
//     // ----------------------------------------------------
//     let assignedRoomsFinal = [];

//     const manualRooms =
//       Array.isArray(assignedRoom) && assignedRoom.length > 0
//         ? assignedRoom.map((r) => String(r))
//         : [];

//     const isManual = manualRooms.length > 0;

//     // ====================================================
//     // 1. DOUBLE BOOKING PREVENTION
//     // ====================================================
//     if (isManual) {
//       const conflict = await Booking.findOne({
//         assignedRoom: { $in: manualRooms },
//         checkIn: { $lte: co },
//         checkOut: { $gte: ci },
//         status: ["pending", "confirmed", "guaranteed", "checked_in"],
//       });

//       if (conflict)
//         return res
//           .status(400)
//           .json({ message: "One or more selected rooms are already booked" });

//       assignedRoomsFinal = [...manualRooms];
//     }

//     // ====================================================
//     // 2. PROCESS EACH ROOM GROUP
//     // ====================================================
//     for (const reqRoom of roomSelection) {
//       let {
//         roomType,
//         roomsRequested = 1,
//         occupancyType = [],
//         mealPlan,
//         adults,
//         childrenAges = [],
//         extraBed = 0,
//       } = reqRoom;

//       const roomDoc = await Room.findOne({ roomType });
//       if (!roomDoc)
//         return res
//           .status(400)
//           .json({ message: `Room ${roomType} not found` });

//       const pricing = roomDoc.pricing;

//       // ----------------------------------------------------
//       // 12+ CHILDREN -> ADULT
//       // ----------------------------------------------------
//       let filteredChildren = [];

//       childrenAges.forEach((age) => {
//         if (age === "12+") adults += 1; // promote to adult
//         else filteredChildren.push(age);
//       });

//       childrenAges = filteredChildren;

//       // ----------------------------------------------------
//       // AUTO ASSIGN ROOMS IF NOT MANUAL
//       // ----------------------------------------------------
//       if (!isManual) {
//         const allowedRooms = roomDoc.roomNumbers.map(String);

//         const overlapping = await Booking.find({
//           "rooms.roomType": roomType,
//           checkIn: { $lte: co },
//           checkOut: { $gte: ci },
//           status: ["pending", "confirmed", "guaranteed", "checked_in"],
//         });

//         const usedRooms = overlapping.flatMap((b) => b.assignedRoom).map(String);

//         const freeRooms = allowedRooms.filter((r) => !usedRooms.includes(r));

//         if (freeRooms.length < roomsRequested) {
//           return res.status(400).json({ message: "No rooms available" });
//         }

//         assignedRoomsFinal.push(...freeRooms.slice(0, roomsRequested));
//       }

//       // ----------------------------------------------------
//       // PRICING (MATCHES FRONTEND)
//       // ----------------------------------------------------
//       let baseTotal = 0;

//       for (let i = 0; i < roomsRequested; i++) {
//         const occ = occupancyType[i] || "double";
//         const occKey = occ === "single" ? "single" : "double";
//         const price = pricing?.[mealPlan]?.[occKey] ?? 0;
//         baseTotal += price;
//       }

//       // Children 6–11
//       let childCost = 0;

//       childrenAges.forEach((age) => {
//         if (age === "6-11")
//           childCost += pricing.childPolicy?.age6to11?.[mealPlan] ?? 0;
//       });

//       // Extra Beds
//       const doubleCount = occupancyType.filter((o) => o === "double").length;
//       const appliedExtraBeds = Math.min(extraBed, doubleCount);

//       const extraBedPrice = pricing.extraBed?.[mealPlan] ?? 0;
//       const extraBedCost = appliedExtraBeds * extraBedPrice;

//       const perNightTotal = baseTotal + childCost + extraBedCost;

//       total += perNightTotal * nights;

//       roomDetails.push({
//         roomType,
//         quantity: roomsRequested,
//         occupancyType,
//         mealPlan,
//         adults,
//         children: childrenAges.map((age) => ({ age })),
//         extraBeds: appliedExtraBeds,
//         extraBedPrice,
//         extraBedCostPerNight: extraBedCost,
//         childCostPerNight: childCost,
//         pricePerNight: baseTotal,
//       });
//     }

//     if (isManual) assignedRoomsFinal = manualRooms;

//     // ----------------------------------------------------
//     // FINAL MEALS (MATCH FRONT-END EXACTLY)
//     // ----------------------------------------------------
//     let finalMeal = { breakfast: false, lunch: false, dinner: false };

//     roomDetails.forEach((r) => {
//       const m = mealFlags(r.mealPlan);
//       if (m.breakfast) finalMeal.breakfast = true;
//       if (m.lunch) finalMeal.lunch = true;
//       if (m.dinner) finalMeal.dinner = true;
//     });

//     // ----------------------------------------------------
//     // SAVE BOOKING
//     // ----------------------------------------------------
//     const bookingNumber = await generateBookingNumber();

//     const booking = await Booking.create({
//       bookingNumber,
//       firstName,
//       lastName,
//       email,
//       country,
//       phoneNumber: phone,
//       checkIn: ci,
//       checkOut: co,
//       rooms: roomDetails,
//       meals: finalMeal,
//       specialRequest,
//       totalPrice: total,
//       transactionNumber: journalNumber || "",
//       assignedRoom: assignedRoomsFinal,
//       status: statusOverride || "pending",
//     });

//     // ----------------------------------------------------
//     // SAFE FORMATTER
//     // ----------------------------------------------------
//     const safe = (v) => Number(v ?? 0).toFixed(2);

//     // ----------------------------------------------------
//     // EMAILS
//     // ----------------------------------------------------

//     const roomsHtml = booking.rooms
//       .map((r, i) => {
//         return `
//         <div style="padding:12px;margin-bottom:15px;border:1px solid #ccc;border-radius:8px;">
//           <h4>Room ${i + 1}: ${r.roomType}</h4>
//           <p><strong>Quantity:</strong> ${r.quantity}</p>
//           <p><strong>Occupancy:</strong> ${r.occupancyType.join(", ")}</p>
//           <p><strong>Meal Plan:</strong> ${r.mealPlan.toUpperCase()}</p>
//           <p><strong>Adults:</strong> ${r.adults}</p>
//           <p><strong>Children:</strong> ${r.children.map((c) => c.age).join(", ") || "None"}</p>
//           <p><strong>Extra Beds:</strong> ${r.extraBeds}</p>
//           <p><strong>Base Price:</strong> BTN ${safe(r.pricePerNight)}</p>
//           <p><strong>Child Cost:</strong> BTN ${safe(r.childCostPerNight)}</p>
//           <p><strong>Extra Bed:</strong> BTN ${safe(r.extraBedCostPerNight)}</p>
//         </div>`;
//       })
//       .join("");

//     const assignedRoomsList =
//       booking.assignedRoom.length > 0
//         ? booking.assignedRoom.join(", ")
//         : "Not Assigned";

//     const nightsCount = nights;

//     const mealsHtml = `
//       <p><strong>Breakfast:</strong> ${booking.meals.breakfast ? "Yes" : "No"}</p>
//       <p><strong>Lunch:</strong> ${booking.meals.lunch ? "Yes" : "No"}</p>
//       <p><strong>Dinner:</strong> ${booking.meals.dinner ? "Yes" : "No"}</p>
//     `;

//     const specialReqHtml = booking.specialRequest
//       ? `<p><strong>Special Request:</strong> ${booking.specialRequest}</p>`
//       : "";

//     const txnHtml = booking.transactionNumber
//       ? `<p><strong>Transaction Number:</strong> ${booking.transactionNumber}</p>`
//       : `<p><strong>Transaction Number:</strong> None</p>`;

//     // USER EMAIL
//     const htmlContentUser = `
//       <div style="font-family:Arial;padding:20px;background:#f9f9f9;">
//         <div style="max-width:650px;margin:auto;background:white;padding:20px;border-radius:10px;">
//           <h2 style="color:#006600;">Booking Confirmation</h2>
//           <p>Hello ${booking.firstName}, your booking is confirmed.</p>

//           <h3>Booking Info</h3>
//           <p><strong>Booking No:</strong> ${booking.bookingNumber}</p>

//           <h3>Stay Info</h3>
//           <p><strong>Check-in:</strong> ${booking.checkIn.toDateString()}</p>
//           <p><strong>Check-out:</strong> ${booking.checkOut.toDateString()}</p>
//           <p><strong>Nights:</strong> ${nightsCount}</p>

//           <h3>Meals</h3>
//           ${mealsHtml}

//           <h3>Rooms</h3>
//           ${roomsHtml}

//           <h3>Total</h3>
//           <p style="font-size:18px;"><strong>BTN ${safe(booking.totalPrice)}</strong></p>

//           ${txnHtml}
//           ${specialReqHtml}
//         </div>
//       </div>
//     `;

//     // ADMIN EMAIL
//     const htmlContentAdmin = htmlContentUser; // same layout OK

//     try {
//       await sendMailWithGmailApi(
//         email,
//         `Booking ${booking.bookingNumber}`,
//         htmlContentUser
//       );

//       await sendMailWithGmailApi(
//         adminEmail,
//         `New Booking ${booking.bookingNumber}`,
//         htmlContentAdmin
//       );
//     } catch (err) {
//       console.log("Email error:", err.message);
//     }

//     return res.status(201).json({
//       message: "Booking created successfully",
//       booking,
//     });
//   } catch (err) {
//     console.error("Booking creation error:", err);
//     return res.status(500).json({ message: "Server error" });
//   }
// };
// createBooking controller — full corrected version with meal-costs (meals x no. adults)
// exports.createBooking = async (req, res) => {
//   try {
//     const {
//       firstName,
//       lastName,
//       email,
//       country,
//       phone,
//       checkIn,
//       checkOut,
//       roomSelection,
//       specialRequest,
//       journalNumber,
//       statusOverride,
//       assignedRoom,
//     } = req.body;

//     // Accept meals as array or object from request (optional)
//     // - frontend may send { meals: ["breakfast","lunch"] } or { meals: { breakfast: true, lunch: true } }
//     let inputMeals = req.body.meals ?? null;
//     // Normalize to an object flags { breakfast: bool, lunch: bool, dinner: bool }
//     const mealsFlagsFromInput = (() => {
//       if (!inputMeals) return null;
//       if (Array.isArray(inputMeals)) {
//         return {
//           breakfast: inputMeals.includes("breakfast"),
//           lunch: inputMeals.includes("lunch"),
//           dinner: inputMeals.includes("dinner"),
//         };
//       }
//       if (typeof inputMeals === "object") {
//         return {
//           breakfast: Boolean(inputMeals.breakfast),
//           lunch: Boolean(inputMeals.lunch),
//           dinner: Boolean(inputMeals.dinner),
//         };
//       }
//       return null;
//     })();

//     // ----------------------------------------------------
//     // BASIC VALIDATION
//     // ----------------------------------------------------
//     if (!roomSelection?.length)
//       return res.status(400).json({ message: "Room selection is required" });

//     if (!validator.isDate(checkIn) || !validator.isDate(checkOut))
//       return res.status(400).json({ message: "Invalid dates" });

//     const ci = new Date(checkIn);
//     const co = new Date(checkOut);
//     const nights = Math.ceil((co - ci) / 86400000);

//     if (nights <= 0)
//       return res
//         .status(400)
//         .json({ message: "Check-out must be after check-in" });

//     let total = 0;
//     const roomDetails = [];

//     // ----------------------------------------------------
//     // ASSIGNED ROOMS — manual or auto
//     // ----------------------------------------------------
//     let assignedRoomsFinal = [];
//     const manualRooms =
//       Array.isArray(assignedRoom) && assignedRoom.length > 0
//         ? assignedRoom.map((r) => String(r))
//         : [];
//     const isManual = manualRooms.length > 0;

//     // prevent double booking for manual rooms
//     if (isManual) {
//       const conflict = await Booking.findOne({
//         assignedRoom: { $in: manualRooms },
//         checkIn: { $lte: co },
//         checkOut: { $gte: ci },
//         status: ["pending", "confirmed", "guaranteed", "checked_in"],
//       });
//       if (conflict)
//         return res
//           .status(400)
//           .json({ message: "One or more selected rooms are already booked" });
//       assignedRoomsFinal = [...manualRooms];
//     }

//     // ----------------------------------------------------
//     // PROCESS EACH ROOM GROUP
//     // ----------------------------------------------------
//     // roomSelection is an array of groups (roomType + roomsRequested + occupancyType[], mealPlan, adults, childrenAges[], extraBed)
//     for (const reqRoom of roomSelection) {
//       let {
//         roomType,
//         roomsRequested = 1,
//         occupancyType = [],
//         mealPlan,
//         adults = 1,
//         childrenAges = [],
//         extraBed = 0,
//       } = reqRoom;

//       const roomDoc = await Room.findOne({ roomType });
//       if (!roomDoc)
//         return res.status(400).json({ message: `Room ${roomType} not found` });

//       const pricing = roomDoc.pricing || {};

//       // promote "12+" children to adults
//       const filteredChildren = [];
//       for (const age of childrenAges) {
//         if (age === "12+") {
//           adults = Number(adults) + 1;
//         } else {
//           filteredChildren.push(age);
//         }
//       }
//       childrenAges = filteredChildren;

//       // AUTO-assign rooms (if not manual)
//       if (!isManual) {
//         const allowedRooms = (roomDoc.roomNumbers || []).map(String);

//         const overlapping = await Booking.find({
//           "rooms.roomType": roomType,
//           checkIn: { $lte: co },
//           checkOut: { $gte: ci },
//           status: ["pending", "confirmed", "guaranteed", "checked_in"],
//         });

//         const usedRooms = overlapping.flatMap((b) => b.assignedRoom || []).map(String);
//         const freeRooms = allowedRooms.filter((r) => !usedRooms.includes(r));

//         if (freeRooms.length < roomsRequested) {
//           return res.status(400).json({ message: "No rooms available" });
//         }

//         assignedRoomsFinal.push(...freeRooms.slice(0, roomsRequested));
//       }

//       // -------------------------
//       // Pricing calculations (per-night)
//       // -------------------------
//       // 1) Base room price (sum occupancy rates for each requested room)
//       let baseTotal = 0;
//       for (let i = 0; i < roomsRequested; i++) {
//         const occ = occupancyType[i] || "double";
//         const occKey = occ === "single" ? "single" : "double";
//         const p = Number(pricing?.[mealPlan]?.[occKey] ?? 0);
//         baseTotal += p;
//       }

//       // 2) Child costs (6-11)
//       let childCostPerNight = 0;
//       for (const age of childrenAges) {
//         if (age === "6-11") {
//           childCostPerNight += Number(pricing.childPolicy?.age6to11?.[mealPlan] ?? 0);
//         }
//         // 1-5 => 0
//       }

//       // 3) Extra bed price logic (applies only to double rooms per existing rules)
//       const doubleCount = (occupancyType || []).filter((o) => o === "double").length;
//       const appliedExtraBeds = Math.min(Number(extraBed) || 0, doubleCount);
//       const extraBedUnitPrice = Number(pricing.extraBed?.[mealPlan] ?? 0);
//       const extraBedCostPerNight = appliedExtraBeds * extraBedUnitPrice;

//       // 4) Meals: determine which meals are charged
//       // Prefers explicit input (mealsFlagsFromInput). If none provided, fallback to mealFlags(policy) for the roomPlan
//       const mealFlagsForCalc = mealsFlagsFromInput ?? mealFlags(mealPlan);

//       // Calculate per-adult meal unit (per night) depending on mealPlan
//       // EP: every selected meal is charged
//       // CP: breakfast included, lunch/dinner charged if selected
//       // MAP: assume breakfast included; one of lunch/dinner is included (we assume whichever flagged first), extras charged
//       // AP: all included (no extra meal charges)
//       let perAdultMealsUnit = 0;

//       if (mealPlan === "ep") {
//         if (mealFlagsForCalc.breakfast) perAdultMealsUnit += Number(pricing.meals?.breakfast ?? 0);
//         if (mealFlagsForCalc.lunch) perAdultMealsUnit += Number(pricing.meals?.lunch ?? 0);
//         if (mealFlagsForCalc.dinner) perAdultMealsUnit += Number(pricing.meals?.dinner ?? 0);
//       } else if (mealPlan === "cp") {
//         // breakfast included
//         if (mealFlagsForCalc.lunch) perAdultMealsUnit += Number(pricing.meals?.lunch ?? 0);
//         if (mealFlagsForCalc.dinner) perAdultMealsUnit += Number(pricing.meals?.dinner ?? 0);
//       } else if (mealPlan === "map") {
//         // assume breakfast included; lunch or dinner — first chosen is included, additional chosen charged
//         // If input flags are provided we use them; otherwise fall back to map policy (mealFlags returns breakfast:true,dinner:true per earlier helper)
//         // Determine included between lunch/dinner (prefer lunch if both true)
//         const chosenLunch = Boolean(mealFlagsForCalc.lunch);
//         const chosenDinner = Boolean(mealFlagsForCalc.dinner);
//         const firstIncluded = chosenLunch ? "lunch" : chosenDinner ? "dinner" : null;

//         if (chosenLunch) {
//           if (firstIncluded !== "lunch") perAdultMealsUnit += Number(pricing.meals?.lunch ?? 0);
//           // if firstIncluded === 'lunch' it's free
//         }
//         if (chosenDinner) {
//           if (firstIncluded !== "dinner") perAdultMealsUnit += Number(pricing.meals?.dinner ?? 0);
//           // if firstIncluded === 'dinner' it's free
//         }
//         // breakfast treated as included for MAP (common MAP semantics)
//       } else if (mealPlan === "ap") {
//         perAdultMealsUnit = 0; // all included
//       } else {
//         perAdultMealsUnit = 0;
//       }

//       // 5) Meals cost per night for this room-group = perAdultMealsUnit * adults (adults already includes promoted 12+)
//       const mealsCostPerNight = Number(perAdultMealsUnit) * Number(adults || 0);

//       // 6) Per-night total for this room group
//       const perNightTotal = Number(baseTotal) + Number(childCostPerNight) + Number(extraBedCostPerNight) + Number(mealsCostPerNight);

//       // 7) Accumulate total across nights
//       total += perNightTotal * nights;

//       // Save breakdown for this group
//       roomDetails.push({
//         roomType,
//         quantity: roomsRequested,
//         occupancyType,
//         mealPlan,
//         adults: Number(adults),
//         children: childrenAges.map((age) => ({ age })),
//         extraBeds: appliedExtraBeds,
//         extraBedUnitPrice,
//         extraBedCostPerNight,
//         childCostPerNight,
//         pricePerNight: baseTotal,
//         mealsPerAdultPrice: perAdultMealsUnit,
//         mealsCostPerNight,
//       });
//     } // end roomSelection loop

//     if (isManual) assignedRoomsFinal = manualRooms;

//     // ----------------------------------------------------
//     // FINAL MEAL FLAGS (store as object)
//     // Derive final meal flags either from user input or from roomPlans aggregated
//     // ----------------------------------------------------
//     let finalMeal = { breakfast: false, lunch: false, dinner: false };

//     // If user provided explicit flags, use them
//     if (mealsFlagsFromInput) {
//       finalMeal = { ...finalMeal, ...mealsFlagsFromInput };
//     } else {
//       // derive from roomPlans (if any roomPlan includes a meal, mark it true)
//       for (const r of roomDetails) {
//         const m = mealFlags(r.mealPlan);
//         if (m.breakfast) finalMeal.breakfast = true;
//         if (m.lunch) finalMeal.lunch = true;
//         if (m.dinner) finalMeal.dinner = true;
//       }
//     }

//     // ----------------------------------------------------
//     // SAVE BOOKING
//     // ----------------------------------------------------
//     const bookingNumber = await generateBookingNumber();

//     const booking = await Booking.create({
//       bookingNumber,
//       firstName,
//       lastName,
//       email,
//       country,
//       phoneNumber: phone,
//       checkIn: ci,
//       checkOut: co,
//       rooms: roomDetails,
//       meals: finalMeal, // store object (not array) — safe for .breakfast/.lunch/.dinner checks
//       specialRequest,
//       totalPrice: total,
//       transactionNumber: journalNumber || "",
//       assignedRoom: assignedRoomsFinal,
//       status: statusOverride || "pending",
//     });

//     // ----------------------------------------------------
//     // EMAIL / RESPONSE PREP
//     // ----------------------------------------------------
//     const safe = (v) => Number(v ?? 0).toFixed(2);

//     const roomsHtml = booking.rooms
//       .map((r, i) => {
//         return `
//         <div style="padding:12px;margin-bottom:15px;border:1px solid #ccc;border-radius:8px;">
//           <h4>Room ${i + 1}: ${r.roomType}</h4>
//           <p><strong>Quantity:</strong> ${r.quantity}</p>
//           <p><strong>Occupancy:</strong> ${Array.isArray(r.occupancyType) ? r.occupancyType.join(", ") : r.occupancyType}</p>
//           <p><strong>Meal Plan:</strong> ${String(r.mealPlan || "").toUpperCase()}</p>
//           <p><strong>Adults:</strong> ${r.adults}</p>
//           <p><strong>Children:</strong> ${r.children?.map((c) => c.age).join(", ") || "None"}</p>
//           <p><strong>Extra Beds:</strong> ${r.extraBeds}</p>
//           <p><strong>Base Price (rooms per night):</strong> BTN ${safe(r.pricePerNight)}</p>
//           <p><strong>Child Cost (per night):</strong> BTN ${safe(r.childCostPerNight)}</p>
//           <p><strong>Extra Bed Cost (per night):</strong> BTN ${safe(r.extraBedCostPerNight)}</p>
//           <p><strong>Meals per Adult (unit):</strong> BTN ${safe(r.mealsPerAdultPrice)}</p>
//           <p><strong>Meals Cost (per night for group):</strong> BTN ${safe(r.mealsCostPerNight)}</p>
//         </div>`;
//       })
//       .join("");

//     const assignedRoomsList =
//       booking.assignedRoom?.length > 0 ? booking.assignedRoom.join(", ") : "Not Assigned";

//     const nightsCount = nights;

//     const mealsHtml = `
//       <p><strong>Breakfast:</strong> ${booking.meals.breakfast ? "Yes" : "No"}</p>
//       <p><strong>Lunch:</strong> ${booking.meals.lunch ? "Yes" : "No"}</p>
//       <p><strong>Dinner:</strong> ${booking.meals.dinner ? "Yes" : "No"}</p>
//     `;

//     const specialReqHtml = booking.specialRequest ? `<p><strong>Special Request:</strong> ${booking.specialRequest}</p>` : "";
//     const txnHtml = booking.transactionNumber ? `<p><strong>Transaction Number:</strong> ${booking.transactionNumber}</p>` : `<p><strong>Transaction Number:</strong> None</p>`;

//     const htmlContentUser = `
//       <div style="font-family:Arial,Helvetica,sans-serif;padding:20px;background:#f7f7f7;">
//         <div style="max-width:700px;margin:auto;background:white;padding:20px;border-radius:8px;border:1px solid #e6e6e6;">
//           <h2 style="color:#006600;margin:0 0 12px 0;">Booking Confirmation — ${booking.bookingNumber}</h2>

//           <h3>Guest</h3>
//           <p><strong>Name:</strong> ${booking.firstName} ${booking.lastName}</p>
//           <p><strong>Email:</strong> ${booking.email || "-"}</p>
//           <p><strong>Phone:</strong> ${booking.phoneNumber || "-"}</p>

//           <h3>Stay</h3>
//           <p><strong>Check-in:</strong> ${booking.checkIn.toDateString()}</p>
//           <p><strong>Check-out:</strong> ${booking.checkOut.toDateString()}</p>
//           <p><strong>Nights:</strong> ${nightsCount}</p>

//           <h3>Assigned Rooms</h3>
//           <p>${assignedRoomsList}</p>

//           <h3>Meals</h3>
//           ${mealsHtml}

//           <h3>Room Breakdown</h3>
//           ${roomsHtml}

//           <h3>Total</h3>
//           <p style="font-size:18px;margin:6px 0 0 0;"><strong>BTN ${safe(booking.totalPrice)}</strong></p>

//           ${txnHtml}
//           ${specialReqHtml}

//           <p style="margin-top:18px;">Warm regards,<br/><strong>Your Hotel Team</strong></p>
//         </div>
//       </div>
//     `;

//     // Admin email — same layout (customize if needed)
//     const htmlContentAdmin = htmlContentUser;

//     // Attempt email (don't fail booking on email errors)
//     try {
//       if (booking.email) {
//         await sendMailWithGmailApi(booking.email, `Booking ${booking.bookingNumber}`, htmlContentUser);
//       }
//       await sendMailWithGmailApi(adminEmail, `New Booking ${booking.bookingNumber}`, htmlContentAdmin);
//     } catch (mailErr) {
//       console.error("Email send error:", mailErr);
//     }

//     return res.status(201).json({
//       message: "Booking created successfully",
//       booking,
//     });
//   } catch (err) {
//     console.error("Booking creation error:", err);
//     return res.status(500).json({ message: "Server error" });
//   }
// };
// Ensure these dependencies exist in the file scope:
// const Room = require('...');
// const Booking = require('...');
// const validator = require('validator');
// const { generateBookingNumber, sendMailWithGmailApi, adminEmail, mealFlags } = require('...');

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
      specialRequest,
      journalNumber,
      statusOverride,
      assignedRoom,
    } = req.body;

    // Accept meals as array or object from request (optional)
    // - frontend may send { meals: ["breakfast","lunch"] } or { meals: { breakfast: true, lunch: true } }
    let inputMeals = req.body.meals ?? null;
    // Normalize to an object flags { breakfast: bool, lunch: bool, dinner: bool }
    const mealsFlagsFromInput = (() => {
      if (!inputMeals) return null;
      if (Array.isArray(inputMeals)) {
        return {
          breakfast: inputMeals.includes("breakfast"),
          lunch: inputMeals.includes("lunch"),
          dinner: inputMeals.includes("dinner"),
        };
      }
      if (typeof inputMeals === "object") {
        return {
          breakfast: Boolean(inputMeals.breakfast),
          lunch: Boolean(inputMeals.lunch),
          dinner: Boolean(inputMeals.dinner),
        };
      }
      return null;
    })();

    // ----------------------------------------------------
    // BASIC VALIDATION
    // ----------------------------------------------------
    if (!roomSelection?.length)
      return res.status(400).json({ message: "Room selection is required" });

    if (!validator.isDate(checkIn) || !validator.isDate(checkOut))
      return res.status(400).json({ message: "Invalid dates" });

    const ci = new Date(checkIn);
    const co = new Date(checkOut);
    const nights = Math.ceil((co - ci) / 86400000);

    if (nights <= 0)
      return res
        .status(400)
        .json({ message: "Check-out must be after check-in" });

    let total = 0;
    const roomDetails = [];

    // ----------------------------------------------------
    // ASSIGNED ROOMS — manual or auto
    // ----------------------------------------------------
    let assignedRoomsFinal = [];
    const manualRooms =
      Array.isArray(assignedRoom) && assignedRoom.length > 0
        ? assignedRoom.map((r) => String(r))
        : [];
    const isManual = manualRooms.length > 0;

    // prevent double booking for manual rooms
    if (isManual) {
      const conflict = await Booking.findOne({
        assignedRoom: { $in: manualRooms },
        checkIn: { $lte: co },
        checkOut: { $gte: ci },
        status: ["pending", "confirmed", "guaranteed", "checked_in"],
      });
      if (conflict)
        return res
          .status(400)
          .json({ message: "One or more selected rooms are already booked" });
      assignedRoomsFinal = [...manualRooms];
    }

    // ----------------------------------------------------
    // PROCESS EACH ROOM GROUP
    // ----------------------------------------------------
    // roomSelection is an array of groups (roomType + roomsRequested + occupancyType[], mealPlan, adults, childrenAges[], extraBed)
    for (const reqRoom of roomSelection) {
      let {
        roomType,
        roomsRequested = 1,
        occupancyType = [],
        mealPlan,
        adults = 1,
        childrenAges = [],
        extraBed = 0,
      } = reqRoom;

      const roomDoc = await Room.findOne({ roomType });
      if (!roomDoc)
        return res.status(400).json({ message: `Room ${roomType} not found` });

      const pricing = roomDoc.pricing || {};

      // promote "12+" children to adults
      const filteredChildren = [];
      for (const age of childrenAges) {
        if (age === "12+") {
          adults = Number(adults) + 1;
        } else {
          filteredChildren.push(age);
        }
      }
      childrenAges = filteredChildren;

      // AUTO-assign rooms (if not manual)
      if (!isManual) {
        const allowedRooms = (roomDoc.roomNumbers || []).map(String);

        const overlapping = await Booking.find({
          "rooms.roomType": roomType,
          checkIn: { $lte: co },
          checkOut: { $gte: ci },
          status: ["pending", "confirmed", "guaranteed", "checked_in"],
        });

        const usedRooms = overlapping.flatMap((b) => b.assignedRoom || []).map(String);
        const freeRooms = allowedRooms.filter((r) => !usedRooms.includes(r));

        if (freeRooms.length < roomsRequested) {
          return res.status(400).json({ message: "No rooms available" });
        }

        assignedRoomsFinal.push(...freeRooms.slice(0, roomsRequested));
      }

      // -------------------------
      // Pricing calculations (per-night)
      // -------------------------
      // 1) Base room price (sum occupancy rates for each requested room)
      let baseTotal = 0;
      for (let i = 0; i < roomsRequested; i++) {
        const occ = occupancyType[i] || "double";
        const occKey = occ === "single" ? "single" : "double";
        const p = Number(pricing?.[mealPlan]?.[occKey] ?? 0);
        baseTotal += p;
      }

      // 2) Child costs (6-11)
      let childCostPerNight = 0;
      for (const age of childrenAges) {
        if (age === "6-11") {
          childCostPerNight += Number(pricing.childPolicy?.age6to11?.[mealPlan] ?? 0);
        }
        // 1-5 => 0
      }

      // 3) Extra bed price logic (applies only to double rooms per existing rules)
      const doubleCount = (occupancyType || []).filter((o) => o === "double").length;
      const appliedExtraBeds = Math.min(Number(extraBed) || 0, doubleCount);
      const extraBedUnitPrice = Number(pricing.extraBed?.[mealPlan] ?? 0);
      const extraBedCostPerNight = appliedExtraBeds * extraBedUnitPrice;

      // 4) Meals: determine which meals are charged
      // Prefers explicit input (mealsFlagsFromInput). If none provided, fallback to mealFlags(policy) for the roomPlan
      const mealFlagsForCalc = mealsFlagsFromInput ?? mealFlags(mealPlan);

      // Calculate per-adult meal unit (per night) depending on mealPlan
      // EP: every selected meal is charged
      // CP: breakfast included, lunch/dinner charged if selected
      // MAP: assume breakfast included; one of lunch/dinner is included (we assume whichever flagged first), extras charged
      // AP: all included (no extra meal charges)
      let perAdultMealsUnit = 0;

      if (mealPlan === "ep") {
        if (mealFlagsForCalc.breakfast) perAdultMealsUnit += Number(pricing.meals?.breakfast ?? 0);
        if (mealFlagsForCalc.lunch) perAdultMealsUnit += Number(pricing.meals?.lunch ?? 0);
        if (mealFlagsForCalc.dinner) perAdultMealsUnit += Number(pricing.meals?.dinner ?? 0);
      } else if (mealPlan === "cp") {
        // breakfast included
        if (mealFlagsForCalc.lunch) perAdultMealsUnit += Number(pricing.meals?.lunch ?? 0);
        if (mealFlagsForCalc.dinner) perAdultMealsUnit += Number(pricing.meals?.dinner ?? 0);
      } else if (mealPlan === "map") {
        // assume breakfast included; lunch or dinner — first chosen is included, additional chosen charged
        const chosenLunch = Boolean(mealFlagsForCalc.lunch);
        const chosenDinner = Boolean(mealFlagsForCalc.dinner);
        const firstIncluded = chosenLunch ? "lunch" : chosenDinner ? "dinner" : null;

        if (chosenLunch) {
          if (firstIncluded !== "lunch") perAdultMealsUnit += Number(pricing.meals?.lunch ?? 0);
        }
        if (chosenDinner) {
          if (firstIncluded !== "dinner") perAdultMealsUnit += Number(pricing.meals?.dinner ?? 0);
        }
        // breakfast treated as included for MAP
      } else if (mealPlan === "ap") {
        perAdultMealsUnit = 0; // all included
      } else {
        perAdultMealsUnit = 0;
      }

      // 5) Meals cost per night for this room-group = perAdultMealsUnit * adults (adults already includes promoted 12+)
      const mealsCostPerNight = Number(perAdultMealsUnit) * Number(adults || 0);

      // 6) Per-night total for this room group
      const perNightTotal = Number(baseTotal) + Number(childCostPerNight) + Number(extraBedCostPerNight) + Number(mealsCostPerNight);

      // 7) Accumulate total across nights
      total += perNightTotal * nights;

      // Save breakdown for this group
      roomDetails.push({
        roomType,
        quantity: roomsRequested,
        occupancyType,
        mealPlan,
        adults: Number(adults),
        children: childrenAges.map((age) => ({ age })),
        extraBeds: appliedExtraBeds,
        extraBedUnitPrice,
        extraBedCostPerNight,
        childCostPerNight,
        // pricePerNight now includes the full per-night charge for the group (rooms + child + extra bed + meals)
        pricePerNight: perNightTotal,
        mealsPerAdultPrice: perAdultMealsUnit,
        mealsCostPerNight,
      });
    } // end roomSelection loop

    if (isManual) assignedRoomsFinal = manualRooms;

    // ----------------------------------------------------
    // FINAL MEAL FLAGS (store as object)
    // Derive final meal flags either from user input or from roomPlans aggregated
    // ----------------------------------------------------
    let finalMeal = { breakfast: false, lunch: false, dinner: false };

    // If user provided explicit flags, use them
    if (mealsFlagsFromInput) {
      finalMeal = { ...finalMeal, ...mealsFlagsFromInput };
    } else {
      // derive from roomPlans (if any roomPlan includes a meal, mark it true)
      for (const r of roomDetails) {
        const m = mealFlags(r.mealPlan);
        if (m.breakfast) finalMeal.breakfast = true;
        if (m.lunch) finalMeal.lunch = true;
        if (m.dinner) finalMeal.dinner = true;
      }
    }

    // ----------------------------------------------------
    // SAVE BOOKING
    // ----------------------------------------------------
    const bookingNumber = await generateBookingNumber();

    const booking = await Booking.create({
      bookingNumber,
      firstName,
      lastName,
      email,
      country,
      phoneNumber: phone,
      checkIn: ci,
      checkOut: co,
      nights,                 // store nights for easy reference
      rooms: roomDetails,
      meals: finalMeal, // store object (not array) — safe for .breakfast/.lunch/.dinner checks
      specialRequest,
      totalPrice: total,
      transactionNumber: journalNumber || "",
      assignedRoom: assignedRoomsFinal,
      status: statusOverride || "pending",
    });

    // ----------------------------------------------------
    // EMAIL / RESPONSE PREP
    // ----------------------------------------------------
    const safe = (v) => Number(v ?? 0).toFixed(2);

    const roomsHtml = booking.rooms
      .map((r, i) => {
        return `
        <div style="padding:12px;margin-bottom:15px;border:1px solid #ccc;border-radius:8px;">
          <h4>Room ${i + 1}: ${r.roomType}</h4>
          <p><strong>Quantity:</strong> ${r.quantity}</p>
          <p><strong>Occupancy:</strong> ${Array.isArray(r.occupancyType) ? r.occupancyType.join(", ") : r.occupancyType}</p>
          <p><strong>Meal Plan:</strong> ${String(r.mealPlan || "").toUpperCase()}</p>
          <p><strong>Adults:</strong> ${r.adults}</p>
          <p><strong>Children:</strong> ${r.children?.map((c) => c.age).join(", ") || "None"}</p>
          <p><strong>Extra Beds:</strong> ${r.extraBeds}</p>
          <p><strong>Full Price Per Night (rooms + children + extra bed + meals):</strong> BTN ${safe(r.pricePerNight)}</p>
          <p><strong>Meals per Adult (unit):</strong> BTN ${safe(r.mealsPerAdultPrice)}</p>
          <p><strong>Meals Cost (per night for group):</strong> BTN ${safe(r.mealsCostPerNight)}</p>
        </div>`;
      })
      .join("");

    const assignedRoomsList =
      booking.assignedRoom?.length > 0 ? booking.assignedRoom.join(", ") : "Not Assigned";

    const nightsCount = nights;

    const mealsHtml = `
      <p><strong>Breakfast:</strong> ${booking.meals.breakfast ? "Yes" : "No"}</p>
      <p><strong>Lunch:</strong> ${booking.meals.lunch ? "Yes" : "No"}</p>
      <p><strong>Dinner:</strong> ${booking.meals.dinner ? "Yes" : "No"}</p>
    `;

    const specialReqHtml = booking.specialRequest ? `<p><strong>Special Request:</strong> ${booking.specialRequest}</p>` : "";
    const txnHtml = booking.transactionNumber ? `<p><strong>Transaction Number:</strong> ${booking.transactionNumber}</p>` : `<p><strong>Transaction Number:</strong> None</p>`;

    const htmlContentUser = `
      <div style="font-family:Arial,Helvetica,sans-serif;padding:20px;background:#f7f7f7;">
        <div style="max-width:700px;margin:auto;background:white;padding:20px;border-radius:8px;border:1px solid #e6e6e6;">
          <h2 style="color:#006600;margin:0 0 12px 0;">Booking Confirmation — ${booking.bookingNumber}</h2>

          <h3>Guest</h3>
          <p><strong>Name:</strong> ${booking.firstName} ${booking.lastName}</p>
          <p><strong>Email:</strong> ${booking.email || "-"}</p>
          <p><strong>Phone:</strong> ${booking.phoneNumber || "-"}</p>

          <h3>Stay</h3>
          <p><strong>Check-in:</strong> ${booking.checkIn.toDateString()}</p>
          <p><strong>Check-out:</strong> ${booking.checkOut.toDateString()}</p>
          <p><strong>Nights:</strong> ${nightsCount}</p>

          <h3>Assigned Rooms</h3>
          <p>${assignedRoomsList}</p>

          <h3>Meals</h3>
          ${mealsHtml}

          <h3>Room Breakdown</h3>
          ${roomsHtml}

          <h3>Total</h3>
          <p style="font-size:18px;margin:6px 0 0 0;"><strong>BTN ${safe(booking.totalPrice)}</strong></p>

          ${txnHtml}
          ${specialReqHtml}

          <p style="margin-top:18px;">Warm regards,<br/><strong>Your Hotel Team</strong></p>
        </div>
      </div>
    `;

    // Admin email — same layout (customize if needed)
    const htmlContentAdmin = htmlContentUser;

    // Attempt email (don't fail booking on email errors)
    try {
      if (booking.email) {
        await sendMailWithGmailApi(booking.email, `Booking ${booking.bookingNumber}`, htmlContentUser);
      }
      await sendMailWithGmailApi(adminEmail, `New Booking ${booking.bookingNumber}`, htmlContentAdmin);
    } catch (mailErr) {
      console.error("Email send error:", mailErr);
    }

    return res.status(201).json({
      message: "Booking created successfully",
      booking,
    });
  } catch (err) {
    console.error("Booking creation error:", err);
    return res.status(500).json({ message: "Server error" });
  }
};


// exports.createBooking = async (req, res) => {
//   try {
//     const {
//       firstName,
//       lastName,
//       email,
//       country,
//       phone,
//       checkIn,
//       checkOut,
//       roomSelection,
//       specialRequest,
//       journalNumber,
//       statusOverride,
//       assignedRoom
//     } = req.body;

//     // ----------------------------------------------------
//     // BASIC VALIDATION
//     // ----------------------------------------------------
//     if (!roomSelection?.length)
//       return res.status(400).json({ message: "Room selection is required" });

//     if (!validator.isDate(checkIn) || !validator.isDate(checkOut))
//       return res.status(400).json({ message: "Invalid dates" });

//     const ci = new Date(checkIn);
//     const co = new Date(checkOut);
//     const nights = Math.ceil((co - ci) / 86400000);

//     if (nights <= 0)
//       return res.status(400).json({
//         message: "Check-out must be after check-in"
//       });

//     let total = 0;
//     let roomDetails = [];

//     // ----------------------------------------------------
//     // FINAL ASSIGNED ROOMS (manual OR auto)
//     // ----------------------------------------------------
//     let assignedRoomsFinal = [];

//     const manualRooms =
//       Array.isArray(assignedRoom) && assignedRoom.length > 0
//         ? assignedRoom.map((r) => String(r))
//         : [];

//     const isManual = manualRooms.length > 0;

//     // ====================================================
//     // ⭐ 1. DOUBLE BOOKING PREVENTION (MANUAL ROOMS)
//     // ====================================================
//     if (isManual) {
//       const conflict = await Booking.findOne({
//         assignedRoom: { $in: manualRooms },
//         checkIn: { $lte: co },
//         checkOut: { $gte: ci },
//         status: {
//           $in: ["pending", "confirmed", "guaranteed", "checked_in"]
//         }
//       });

//       if (conflict)
//         return res.status(400).json({
//           message: "One or more selected rooms are already booked"
//         });

//       assignedRoomsFinal = [...manualRooms];
//     }

//     // ====================================================
//     // ⭐ 2. PROCESS ROOM TYPES
//     // ====================================================
//     for (const reqRoom of roomSelection) {
//       let {
//         roomType,
//         roomsRequested = 1,
//         occupancyType = [],
//         mealPlan,
//         adults,
//         childrenAges = [],
//         extraBed = 0
//       } = reqRoom;

//       const roomDoc = await Room.findOne({ roomType });
//       if (!roomDoc)
//         return res
//           .status(400)
//           .json({ message: `Room ${roomType} not found` });

//       const pricing = roomDoc.pricing;

//       // Convert all "12+" → adult
//       let filteredChildren = [];
//       childrenAges.forEach((age) => {
//         if (age === "12+") adults += 1;
//         else filteredChildren.push(age);
//       });
//       childrenAges = filteredChildren;

//       // AUTO ASSIGN ROOMS
//       if (!isManual) {
//         const allowedRooms = roomDoc.roomNumbers.map(String);

//         const overlapping = await Booking.find({
//           "rooms.roomType": roomType,
//           checkIn: { $lte: co },
//           checkOut: { $gte: ci },
//           status: [
//             "pending",
//             "confirmed",
//             "guaranteed",
//             "checked_in"
//           ]
//         });

//         const usedRooms = overlapping.flatMap((b) => b.assignedRoom).map(String);
//         const freeRooms = allowedRooms.filter((r) => !usedRooms.includes(r));

//         if (freeRooms.length < roomsRequested) {
//           return res.status(400).json({ message: "No rooms available" });
//         }

//         assignedRoomsFinal.push(...freeRooms.slice(0, roomsRequested));
//       }

//       // PRICING
//       let baseTotal = 0;

//       for (let i = 0; i < roomsRequested; i++) {
//         const occ = occupancyType[i] || "double";
//         const occKey = occ === "single" ? "single" : "double";
//         const price = pricing?.[mealPlan]?.[occKey] ?? 0;
//         baseTotal += price;
//       }

//       let childCost = 0;

//       childrenAges.forEach((age) => {
//         if (age === "6-11")
//           childCost += pricing.childPolicy?.age6to11?.[mealPlan] ?? 0;
//       });

//       const doubleCount = occupancyType.filter((o) => o === "double").length;
//       const appliedExtraBeds = Math.min(extraBed, doubleCount);

//       const extraBedPrice = pricing.extraBed?.[mealPlan] ?? 0;
//       const extraBedCost = appliedExtraBeds * extraBedPrice;

//       const perNightTotal = baseTotal + childCost + extraBedCost;

//       total += perNightTotal * nights;

//       roomDetails.push({
//         roomType,
//         quantity: roomsRequested,
//         occupancyType,
//         mealPlan,
//         adults,
//         children: childrenAges.map((age) => ({ age })),
//         extraBeds: appliedExtraBeds,
//         extraBedPrice,
//         extraBedCostPerNight: extraBedCost,
//         childCostPerNight: childCost,
//         pricePerNight: baseTotal
//       });
//     }

//     if (isManual) assignedRoomsFinal = manualRooms;

//     const bookingNumber = await generateBookingNumber();

//     const booking = await Booking.create({
//       bookingNumber,
//       firstName,
//       lastName,
//       email,
//       country,
//       phoneNumber: phone,
//       checkIn: ci,
//       checkOut: co,
//       rooms: roomDetails,
//       meals: {
//         breakfast: roomDetails.some((r) => r.mealPlan !== "ep"),
//         lunch: roomDetails.some((r) => r.mealPlan === "ap"),
//         dinner: roomDetails.some(
//           (r) => r.mealPlan === "map" || r.mealPlan === "ap"
//         )
//       },
//       specialRequest,
//       totalPrice: total,
//       transactionNumber: journalNumber || "",
//       assignedRoom: assignedRoomsFinal,
//       status: statusOverride || "pending"
//     });

//     // ====================================================
//     // ⭐ SAFE FORMATTER
//     // ====================================================
//     const safe = (v) => Number(v ?? 0).toFixed(2);

//     // ====================================================
//     // ⭐ ROOM HTML
//     // ====================================================
//     const roomsHtml = booking.rooms
//       .map((r, i) => {
//         return `
//         <div style="padding:12px;margin-bottom:15px;border:1px solid #ccc;border-radius:8px;">
//           <h4 style="margin:0 0 5px 0;">Room ${i + 1}: ${r.roomType}</h4>
//           <p><strong>Quantity:</strong> ${r.quantity}</p>
//           <p><strong>Occupancy:</strong> ${r.occupancyType.join(", ")}</p>
//           <p><strong>Meal Plan:</strong> ${r.mealPlan.toUpperCase()}</p>
//           <p><strong>Adults:</strong> ${r.adults}</p>
//           <p><strong>Children:</strong> ${r.children.length ? r.children.map(c => c.age).join(", ") : "None"}</p>
//           <p><strong>Extra Beds:</strong> ${r.extraBeds}</p>
//           <p><strong>Base Price Per Night:</strong> BTN ${safe(r.pricePerNight)}</p>
//           <p><strong>Child Cost Per Night:</strong> BTN ${safe(r.childCostPerNight)}</p>
//           <p><strong>Extra Bed Cost Per Night:</strong> BTN ${safe(r.extraBedCostPerNight)}</p>
//         </div>`;
//       })
//       .join("");

//     const assignedRoomsList =
//       booking.assignedRoom.length > 0
//         ? booking.assignedRoom.join(", ")
//         : "Not Assigned";

//     const nightsCount = nights;

//     const mealsHtml = `
//       <p><strong>Breakfast:</strong> ${booking.meals.breakfast ? "Yes" : "No"}</p>
//       <p><strong>Lunch:</strong> ${booking.meals.lunch ? "Yes" : "No"}</p>
//       <p><strong>Dinner:</strong> ${booking.meals.dinner ? "Yes" : "No"}</p>
//     `;

//     const specialReqHtml = booking.specialRequest
//       ? `<p><strong>Special Request:</strong> ${booking.specialRequest}</p>`
//       : "";

//     const txnHtml = booking.transactionNumber
//       ? `<p><strong>Transaction Number:</strong> ${booking.transactionNumber}</p>`
//       : `<p><strong>Transaction Number:</strong> None</p>`;

//     // ====================================================
//     // ⭐ USER EMAIL
//     // ====================================================
//     const htmlContentUser = `
//       <div style="font-family:Arial;padding:20px;background:#f9f9f9;">
//         <div style="max-width:650px;margin:auto;background:white;border-radius:10px;padding:20px;border:1px solid #ddd;">
//           <h2 style="color:#006600;">Booking Confirmation</h2>
//           <p>Hello ${booking.firstName}, your booking has been confirmed.</p>

//           <h3>Booking Info</h3>
//           <p><strong>Booking Number:</strong> ${booking.bookingNumber}</p>
//           <p><strong>Status:</strong> ${booking.status}</p>

//           <h3>Guest Info</h3>
//           <p><strong>Name:</strong> ${booking.firstName} ${booking.lastName}</p>
//           <p><strong>Email:</strong> ${booking.email}</p>
//           <p><strong>Country:</strong> ${booking.country}</p>
//           <p><strong>Phone:</strong> ${booking.phoneNumber}</p>

//           <h3>Stay Info</h3>
//           <p><strong>Check-in:</strong> ${booking.checkIn.toDateString()}</p>
//           <p><strong>Check-out:</strong> ${booking.checkOut.toDateString()}</p>
//           <p><strong>Nights:</strong> ${nightsCount}</p>

//           <h3>Assigned Rooms</h3>
//           <p>${assignedRoomsList}</p>

//           <h3>Meals</h3>
//           ${mealsHtml}

//           <h3>Room Details</h3>
//           ${roomsHtml}

//           <h3>Total Price</h3>
//           <p style="font-size:18px;"><strong>BTN ${safe(booking.totalPrice)}</strong></p>

//           ${txnHtml}
//           ${specialReqHtml}

//           <p style="margin-top:20px;">Warm regards,<br><strong>Hotel Team</strong></p>
//         </div>
//       </div>
//     `;

//     // ====================================================
//     // ⭐ ADMIN EMAIL
//     // ====================================================
//     const htmlContentAdmin = `
//       <div style="font-family:Arial;padding:20px;background:#f9f9f9;">
//         <div style="max-width:650px;margin:auto;background:white;border-radius:10px;padding:20px;border:1px solid #ddd;">

//           <h2 style="color:#006600;">New Booking Received</h2>

//           <h3>Booking Info</h3>
//           <p><strong>Booking Number:</strong> ${booking.bookingNumber}</p>
//           <p><strong>Status:</strong> ${booking.status}</p>

//           <h3>Guest</h3>
//           <p><strong>Name:</strong> ${booking.firstName} ${booking.lastName}</p>
//           <p><strong>Email:</strong> ${booking.email}</p>
//           <p><strong>Country:</strong> ${booking.country}</p>
//           <p><strong>Phone:</strong> ${booking.phoneNumber}</p>

//           <h3>Stay Info</h3>
//           <p><strong>Check-in:</strong> ${booking.checkIn.toDateString()}</p>
//           <p><strong>Check-out:</strong> ${booking.checkOut.toDateString()}</p>
//           <p><strong>Nights:</strong> ${nightsCount}</p>

//           <h3>Assigned Rooms</h3>
//           <p>${assignedRoomsList}</p>

//           <h3>Meals</h3>
//           ${mealsHtml}

//           <h3>Room Breakdown</h3>
//           ${roomsHtml}

//           <h3>Total Price</h3>
//           <p style="font-size:18px;"><strong>BTN ${safe(booking.totalPrice)}</strong></p>

//           ${txnHtml}
//           ${specialReqHtml}


//         </div>
//       </div>
//     `;

//     // SEND EMAILS
//     try {
//       await sendMailWithGmailApi(email, `Booking ${booking.bookingNumber}`, htmlContentUser);

//       await sendMailWithGmailApi(
//         adminEmail,
//         `New Booking ${booking.bookingNumber}`,
//         htmlContentAdmin
//       );
//     } catch (err) {
//       console.log("Email error:", err.message);
//     }

//     return res.status(201).json({
//       message: "Booking created successfully",
//       booking
//     });

//   } catch (err) {
//     console.error("Booking creation error:", err);
//     return res.status(500).json({ message: "Server error" });
//   }
// };

// exports.createBooking = async (req, res) => {
//   try {
//     const {
//       firstName,
//       lastName,
//       email,
//       country,
//       phone,
//       checkIn,
//       checkOut,
//       roomSelection,
//       specialRequest,
//       journalNumber,
//       statusOverride,
//       assignedRoom
//     } = req.body;

//     // ----------------------------------------------------
//     // BASIC VALIDATION
//     // ----------------------------------------------------
//     if (!roomSelection?.length)
//       return res.status(400).json({ message: "Room selection is required" });

//     if (!validator.isDate(checkIn) || !validator.isDate(checkOut))
//       return res.status(400).json({ message: "Invalid dates" });

//     const ci = new Date(checkIn);
//     const co = new Date(checkOut);
//     const nights = Math.ceil((co - ci) / 86400000);

//     if (nights <= 0)
//       return res.status(400).json({
//         message: "Check-out must be after check-in"
//       });

//     let total = 0;
//     let roomDetails = [];

//     // ----------------------------------------------------
//     // FINAL ASSIGNED ROOMS (manual OR auto)
//     // ----------------------------------------------------
//     let assignedRoomsFinal = [];

//     const manualRooms =
//       Array.isArray(assignedRoom) && assignedRoom.length > 0
//         ? assignedRoom.map(r => String(r))
//         : [];

//     const isManual = manualRooms.length > 0;

//     // ====================================================
//     // ⭐ 1. DOUBLE BOOKING PREVENTION (MANUAL ROOMS)
//     // ====================================================
//     if (isManual) {
//       const conflict = await Booking.findOne({
//         assignedRoom: { $in: manualRooms },
//         checkIn: { $lte: co },
//         checkOut: { $gte: ci },
//         status: {
//           $in: ["pending", "confirmed", "guaranteed", "checked_in"]
//         }
//       });

//       if (conflict)
//         return res.status(400).json({
//           message: "One or more selected rooms are already booked"
//         });

//       assignedRoomsFinal = [...manualRooms];
//     }

//     // ====================================================
//     // ⭐ 2. PROCESS ROOM TYPES
//     // ====================================================
//     for (const reqRoom of roomSelection) {
//       const {
//         roomType,
//         roomsRequested = 1,
//         occupancyType = [],
//         mealPlan,
//         adults,
//         childrenAges = [],
//         extraBed = 0
//       } = reqRoom;

//       const roomDoc = await Room.findOne({ roomType });
//       if (!roomDoc)
//         return res
//           .status(400)
//           .json({ message: `Room ${roomType} not found` });

//       const pricing = roomDoc.pricing;

//       // ----------------------------------------------------
//       // ⭐ AUTO ASSIGN ROOMS IF MANUAL NOT PROVIDED
//       // ----------------------------------------------------
//       if (!isManual) {
//         const allowedRooms = roomDoc.roomNumbers.map(String);

//         const overlapping = await Booking.find({
//           "rooms.roomType": roomType,
//           checkIn: { $lte: co },
//           checkOut: { $gte: ci },
//           status: {
//             $in: ["pending", "confirmed", "guaranteed", "checked_in"]
//           }
//         });

//         const usedRooms = overlapping.flatMap(b => b.assignedRoom).map(String);
//         const freeRooms = allowedRooms.filter(r => !usedRooms.includes(r));

//         // ⭐ FIXED MESSAGE ⭐
//         if (freeRooms.length < roomsRequested) {
//           return res.status(400).json({
//             message: "No rooms available on this date"
//           });
//         }

//         assignedRoomsFinal.push(
//           ...freeRooms.slice(0, roomsRequested)
//         );
//       }

//       // ----------------------------------------------------
//       // ⭐ PRICING
//       // ----------------------------------------------------
//       let baseTotal = 0;

//       for (let i = 0; i < roomsRequested; i++) {
//         const occ = occupancyType[i] || "double";
//         const occKey = occ === "single" ? "single" : "double";
//         const price = pricing?.[mealPlan]?.[occKey] ?? 0;
//         baseTotal += price;
//       }

//       let childCost = 0;

//       childrenAges.forEach(age => {
//         if (age === "6-11")
//           childCost +=
//             pricing.childPolicy?.age6to11?.[mealPlan] ?? 0;

//         if (age === "12+") childCost += baseTotal / roomsRequested;
//       });

//       const doubleCount = occupancyType.filter(o => o === "double").length;
//       const appliedExtraBeds = Math.min(extraBed, doubleCount);

//       const extraBedPrice = pricing.extraBed?.[mealPlan] ?? 0;
//       const extraBedCost = appliedExtraBeds * extraBedPrice;

//       const perNightTotal =
//         baseTotal + childCost + extraBedCost;

//       total += perNightTotal * nights;

//       roomDetails.push({
//         roomType,
//         quantity: roomsRequested,
//         occupancyType,
//         mealPlan,
//         adults,
//         children: childrenAges.map(age => ({ age })),
//         extraBeds: appliedExtraBeds,
//         extraBedPrice,
//         extraBedCostPerNight: extraBedCost,
//         childCostPerNight: childCost,
//         pricePerNight: baseTotal
//       });
//     }

//     // ====================================================
//     // ⭐ 3. ALWAYS USE MANUAL IF PROVIDED
//     // ====================================================
//     if (isManual) assignedRoomsFinal = manualRooms;

//     // ====================================================
//     // ⭐ 4. SAVE BOOKING
//     // ====================================================
//     const bookingNumber = await generateBookingNumber();

//     const booking = await Booking.create({
//       bookingNumber,
//       firstName,
//       lastName,
//       email,
//       country,
//       phoneNumber: phone,
//       checkIn: ci,
//       checkOut: co,
//       rooms: roomDetails,
//       meals: {
//         breakfast: roomDetails.some(r => r.mealPlan !== "ep"),
//         lunch: roomDetails.some(r => r.mealPlan === "ap"),
//         dinner: roomDetails.some(
//           r => r.mealPlan === "map" || r.mealPlan === "ap"
//         )
//       },
//       specialRequest,
//       totalPrice: total,
//       transactionNumber: journalNumber || "",
//       assignedRoom: assignedRoomsFinal,
//       status: statusOverride || "pending"
//     });

//     // ====================================================
//     // ⭐ 5. EMAILS (RENAMED & FIXED)
//     // ====================================================
//   const htmlContentUser = `
//       <div style="font-family: Arial, sans-serif; padding: 15px; background-color: #f9f9f9;">
//         <div style="max-width: 600px; margin: auto; background: white; border-radius: 10px; padding: 20px; border: 1px solid #ddd;">
//           <h2 style="color: #006600;">Booking Received</h2>
//           <p>Dear <strong>${firstName}</strong>,</p>
//           <p>Your booking request has been <strong>received</strong>. We will contact you shortly.</p>
          
//           <h3 style="color:#444;">Booking Summary</h3>
//           <p><strong>Booking Number:</strong> ${bookingNumber}</p>
//           <p><strong>Check-in:</strong> ${ci.toDateString()}</p>
//           <p><strong>Check-out:</strong> ${co.toDateString()}</p>
//           <p><strong>Total Rooms:</strong> ${roomDetails.reduce((s,r)=>s+r.quantity,0)}</p>
//           <p><strong>Total Price:</strong> BTN ${total.toFixed(2)}</p>

//           <p style="margin-top: 20px;">Warm regards,<br><strong>Hotel Team</strong></p>
//         </div>
//       </div>
//     `;

//     const htmlContentAdmin = `
//       <div style="font-family: Arial, sans-serif; padding: 15px; background-color: #f9f9f9;">
//         <div style="max-width: 600px; margin: auto; background: white; border-radius: 10px; padding: 20px; border: 1px solid #ddd;">
//           <h2 style="color: #006600;">New Booking Received</h2>

//           <h3 style="color:#444;">Customer Info</h3>
//           <p><strong>${firstName} ${lastName}</strong></p>
//           <p>${email}</p>

//           <h3 style="color:#444;">Booking Summary</h3>
//           <p><strong>Booking Number:</strong> ${bookingNumber}</p>
//           <p><strong>Check-in:</strong> ${ci.toDateString()}</p>
//           <p><strong>Check-out:</strong> ${co.toDateString()}</p>
//           <p><strong>Total:</strong> BTN ${total.toFixed(2)}</p>
//         </div>
//       </div>
//     `;


//     try {
//       await sendMailWithGmailApi(
//         email,
//         `Booking ${bookingNumber}`,
//         htmlContentUser
//       );

//       await sendMailWithGmailApi(
//         adminEmail,
//         `New Booking ${bookingNumber}`,
//         htmlContentAdmin
//       );
//     } catch (err) {
//       console.log("Email error:", err.message);
//     }

//     return res.status(201).json({
//       message: "Booking created successfully",
//       booking
//     });

//   } catch (err) {
//     console.error("Booking creation error:", err);
//     return res.status(500).json({ message: "Server error" });
//   }
// };

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
await removeBookingFromSheet(booking);
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
await removeBookingFromSheet(booking);
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
    const SAARC_COUNTRIES = [
      "Afghanistan",
      "Bangladesh",
      // "Bhutan",
      "India",
      "Maldives",
      "Nepal",
      "Pakistan",
      "Sri Lanka"
    ];

    const totalBookings = await Booking.countDocuments();

    // Local = Bhutan
    const localGuests = await Booking.countDocuments({
      country: "Bhutan",
    });

    // Regional = SAARC except Bhutan
    const regionalGuests = await Booking.countDocuments({
      country: { $in: SAARC_COUNTRIES.filter(c => c !== "Bhutan") }
    });

    // Foreign = NOT in SAARC
    const foreignGuests = await Booking.countDocuments({
      country: { $nin: SAARC_COUNTRIES },
    });

    res.status(200).json({
      totalBookings,
      localGuests,
      regionalGuests,
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

    const SAARC_COUNTRIES = [
      "Afghanistan",
      "Bangladesh",
      "Bhutan",
      "India",
      "Maldives",
      "Nepal",
      "Pakistan",
      "Sri Lanka"
    ];

    const months = [
      "Jan", "Feb", "Mar", "Apr", "May", "Jun",
      "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"
    ];

    const monthlyStats = months.map((m) => ({
      month: m,
      local: 0,
      regional: 0,
      foreign: 0,
    }));

    const startDate = new Date(`${year}-01-01`);
    const endDate = new Date(`${parseInt(year) + 1}-01-01`);

    const bookings = await Booking.find({
      createdAt: { $gte: startDate, $lt: endDate },
    }).select("country createdAt");

    bookings.forEach((b) => {
      const monthIndex = new Date(b.createdAt).getMonth();
      const country = (b.country || "").trim();

      if (country === "Bhutan") {
        monthlyStats[monthIndex].local += 1;
      } 
      else if (SAARC_COUNTRIES.includes(country)) {
        monthlyStats[monthIndex].regional += 1;
      } 
      else {
        monthlyStats[monthIndex].foreign += 1;
      }
    });

    res.status(200).json(monthlyStats);
  } catch (err) {
    console.error("📊 Monthly stats error:", err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
};
