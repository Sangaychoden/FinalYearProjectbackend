

const Room = require('../models/roomModel');
const Booking = require('../models/bookingModels');
const cloudinary = require('cloudinary').v2;
const validator = require('validator');

cloudinary.config({
  cloud_name: process.env.CLOUD_NAME,
  api_key: process.env.CLOUD_API_KEY,
  api_secret: process.env.CLOUD_API_SECRET
});

// Upload images
const uploadImages = async (files) => {
  const images = [];
  for (const file of files.slice(0, 5)) {
    const result = await new Promise((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        { folder: 'rooms' },
        (error, result) => error ? reject(error) : resolve(result)
      );
      stream.end(file.buffer);
    });
    images.push(result.secure_url);
  }
  return images;
};

// Sanitize room input (FIXED — removed location)
const sanitizeRoomInput = (body) => {
  const sanitized = {
    roomType: validator.trim(body.roomType || ''),

    numberOfRooms: Number(body.numberOfRooms),
    size: Number(body.size),
    beds: Number(body.beds),
    occupancy: Number(body.occupancy),

    roomDetails: body.roomDetails ? validator.trim(body.roomDetails) : '',
    optional: body.optional ? validator.trim(body.optional) : '',

    // Keep comma-separated lists intact — do NOT escape commas!
    roomFeatures: body.roomFeatures ? validator.trim(body.roomFeatures) : '',
    bathroomAmenities: body.bathroomAmenities ? validator.trim(body.bathroomAmenities) : ''
  };

  // REQUIRED FIELD CHECKS (updated)
  if (!sanitized.roomType) {
    throw new Error("Missing or invalid required fields: roomType");
  }
  if (isNaN(sanitized.numberOfRooms) || sanitized.numberOfRooms <= 0) {
    throw new Error("Missing or invalid required fields: numberOfRooms");
  }
  if (isNaN(sanitized.size) || sanitized.size <= 0) {
    throw new Error("Missing or invalid required fields: size");
  }
  if (isNaN(sanitized.beds) || sanitized.beds <= 0) {
    throw new Error("Missing or invalid required fields: beds");
  }
  if (isNaN(sanitized.occupancy) || sanitized.occupancy <= 0) {
    throw new Error("Missing or invalid required fields: occupancy");
  }
  if (!sanitized.roomDetails) {
    throw new Error("Missing or invalid required fields: roomDetails");
  }
  if (!sanitized.roomFeatures) {
    throw new Error("Missing or invalid required fields: roomFeatures");
  }
  if (!sanitized.bathroomAmenities) {
    throw new Error("Missing or invalid required fields: bathroomAmenities");
  }

  return sanitized;
};

exports.createRoom = async (req, res) => {
  try {
    // REQUIRED FIELDS
    if (!req.body.roomType || !req.body.numberOfRooms) {
      return res.status(400).json({
        success: false,
        message: "Missing required fields: roomType, numberOfRooms.",
      });
    }

    const cleanData = sanitizeRoomInput(req.body);

    const toNumber = (value) => {
      const num = Number(value);
      return isNaN(num) ? 0 : num;
    };

   
    // ROOM NUMBERS
    let roomNumbersArr = [];

    if (req.body.roomNumbers) {
      try {
        roomNumbersArr = JSON.parse(req.body.roomNumbers);
      } catch (err) {
        roomNumbersArr = req.body.roomNumbers
          .replace(/[\[\]\"]/g, "")
          .split(",")
          .map((x) => x.trim())
          .filter((x) => x !== "");
      }
    }

    if (roomNumbersArr.length !== Number(cleanData.numberOfRooms)) {
      return res.status(400).json({
        success: false,
        message: `Mismatch: numberOfRooms = ${cleanData.numberOfRooms}, but ${roomNumbersArr.length} room numbers provided.`,
      });
    }


    //OCCUPANCY TYPE — ARRAY

    let occupancyTypes = [];

    if (req.body.roomOccupancyType) {
      occupancyTypes = req.body.roomOccupancyType
        .split(",")
        .map((x) => x.trim().toLowerCase())
        .filter((x) => x !== "");
    }

    // ===================================================
    // ⭐ IMAGE UPLOAD
    // ===================================================
    let images = [];
    try {
      if (req.files?.length > 0) {
        images = await uploadImages(req.files);
      }
    } catch (uploadErr) {
      console.error("IMAGE UPLOAD ERROR:", uploadErr);
      return res.status(500).json({
        success: false,
        message: "Image upload failed.",
        error: uploadErr.message,
      });
    }

    // ===================================================
    // ⭐ PRICING OBJECT
    // ===================================================
    const pricing = {
      ep: {
        double: toNumber(req.body.epDouble),
        single: toNumber(req.body.epSingle),
      },
      cp: {
        double: toNumber(req.body.cpDouble),
        single: toNumber(req.body.cpSingle),
      },
      map: {
        double: toNumber(req.body.mapDouble),
        single: toNumber(req.body.mapSingle),
      },
      ap: {
        double: toNumber(req.body.apDouble),
        single: toNumber(req.body.apSingle),
      },

      extraBed: {
        ep: toNumber(req.body.extraBedEP),
        cp: toNumber(req.body.extraBedCP),
        mapDouble: toNumber(req.body.extraBedMAPDouble),
        mapSingle: toNumber(req.body.extraBedMAPSingle),
        ap: toNumber(req.body.extraBedAP),
      },

      meals: {
        breakfast: toNumber(req.body.mealBreakfast),
        lunch: toNumber(req.body.mealLunch),
        dinner: toNumber(req.body.mealDinner),
      },

      childPolicy: {
        age1to5: { price: 0 },
        age6to11: {
          ep: toNumber(req.body.childEP),
          cp: toNumber(req.body.childCP),
          map: toNumber(req.body.childMAP),
          ap: toNumber(req.body.childAP),
        },
        age12plusIsAdult: true,
      },

      tax: {
        gst: toNumber(req.body.taxGST),
        serviceCharge: toNumber(req.body.taxServiceCharge),
      },
    };

    // ===================================================
    // ⭐ SAVE ROOM
    // ===================================================
    const newRoom = new Room({
      ...cleanData,
      roomNumbers: roomNumbersArr,
      roomOccupancyType: occupancyTypes,
      images,
      pricing,
    });

    await newRoom.save();

    return res.status(201).json({
      success: true,
      message: "Room created successfully",
      room: newRoom,
    });
  } catch (error) {
    console.error("ROOM CREATION ERROR:", error);

    // Duplicate roomType
    if (error.code === 11000 && error.keyPattern?.roomType) {
      return res.status(400).json({
        success: false,
        message: `Room type '${req.body.roomType}' already exists.`,
      });
    }

    return res.status(500).json({
      success: false,
      message: "Server error while creating room.",
      error: error.message,
      stack: error.stack, // 🔥 added detailed debugging
    });
  }
};


exports.updateRoom = async (req, res) => {
  try {
    const roomId = req.params.id;
    const room = await Room.findById(roomId);

    if (!room) {
      return res.status(404).json({
        success: false,
        message: "Room not found",
      });
    }

    const safeNumber = (v) => (isNaN(Number(v)) ? 0 : Number(v));

    // ============================================================
    // 1. BASIC TEXT FIELDS
    // ============================================================
    const basicFields = [
      "roomType",
      "numberOfRooms",
      "size",
      "beds",
      "occupancy",
      "roomDetails",
      "roomFeatures",
      "bathroomAmenities",
      "optional",
    ];

    basicFields.forEach((field) => {
      if (req.body[field] !== undefined) {
        room[field] = String(req.body[field]).trim();
      }
    });

    // ============================================================
    // 2. ROOM NUMBERS HANDLING — unified list like: "101,102"
    // ============================================================
    if (req.body.roomNumbers) {
      let updatedRoomNumbers = [];

      try {
        updatedRoomNumbers = JSON.parse(req.body.roomNumbers);
      } catch {
        updatedRoomNumbers = req.body.roomNumbers
          .replace(/[\[\]\"]/g, "")
          .split(",")
          .map((x) => x.trim())
          .filter(Boolean);
      }

      if (updatedRoomNumbers.length !== Number(room.numberOfRooms)) {
        return res.status(400).json({
          success: false,
          message: `Mismatch: numberOfRooms=${room.numberOfRooms}, but ${updatedRoomNumbers.length} room numbers provided`,
        });
      }

      room.roomNumbers = updatedRoomNumbers;
    }

    // ============================================================
    // 3. OCCUPANCY TYPE — accepts: single,double
    // ============================================================
    if (req.body.roomOccupancyType) {
      room.roomOccupancyType = req.body.roomOccupancyType
        .split(",")
        .map((x) => x.trim().toLowerCase())
        .filter(Boolean);
    }

    // ============================================================
    // 4. PRICING SECTION
    // ============================================================
    room.pricing = {
      ep: {
        single: safeNumber(req.body.epSingle),
        double: safeNumber(req.body.epDouble),
      },
      cp: {
        single: safeNumber(req.body.cpSingle),
        double: safeNumber(req.body.cpDouble),
      },
      map: {
        single: safeNumber(req.body.mapSingle),
        double: safeNumber(req.body.mapDouble),
      },
      ap: {
        single: safeNumber(req.body.apSingle),
        double: safeNumber(req.body.apDouble),
      },

      extraBed: {
        ep: safeNumber(req.body.extraBedEP),
        cp: safeNumber(req.body.extraBedCP),
        mapSingle: safeNumber(req.body.extraBedMAPSingle),
        mapDouble: safeNumber(req.body.extraBedMAPDouble),
        ap: safeNumber(req.body.extraBedAP),
      },

      meals: {
        breakfast: safeNumber(req.body.mealBreakfast),
        lunch: safeNumber(req.body.mealLunch),
        dinner: safeNumber(req.body.mealDinner),
      },

      childPolicy: {
        age1to5: { price: 0 },
        age6to11: {
          ep: safeNumber(req.body.childEP),
          cp: safeNumber(req.body.childCP),
          map: safeNumber(req.body.childMAP),
          ap: safeNumber(req.body.childAP),
        },
        age12plusIsAdult: true,
      },

      tax: {
        gst: safeNumber(req.body.taxGST),
        serviceCharge: safeNumber(req.body.taxServiceCharge),
      },
    };

    // ============================================================
    // 5. IMAGES (existing + new)
    // ============================================================
    let updatedImages = [];

    if (req.body.existingImages) {
      try {
        updatedImages =
          typeof req.body.existingImages === "string"
            ? JSON.parse(req.body.existingImages)
            : req.body.existingImages;
      } catch {}
    }

    // Add new uploaded images
    if (req.files && req.files.length > 0) {
      const newUploaded = await uploadImages(req.files);
      updatedImages = [...updatedImages, ...newUploaded];
    }

    if (updatedImages.length > 0) {
      room.images = updatedImages;
    }

    // ============================================================
    // 6. SAVE ROOM
    // ============================================================
    await room.save();

    res.status(200).json({
      success: true,
      message: "Room updated successfully",
      room,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Server error while updating room",
      error: error.message,
    });
  }
};

// ================================
// GET all rooms
// ================================
exports.getAllRooms = async (req, res) => {
  try {
    const rooms = await Room.find();
    res.status(200).json({ message: "All Rooms retrieved successfully", rooms });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// ================================
// GET first 2 rooms
// ================================
exports.getFirstTwoRooms = async (req, res) => {
  try {
    const rooms = await Room.find().limit(2);
    if (!rooms || rooms.length === 0) {
      return res.status(404).json({ message: "No rooms found" });
    }
    res.status(200).json({ message: "First two rooms retrieved successfully", rooms });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

exports.getRoomById = async (req, res) => {
  try {
    const { id } = req.params;

    if (!validator.isMongoId(id)) {
      return res.status(400).json({ success: false, message: "Invalid Room ID" });
    }

    const room = await Room.findById(id).lean();

    if (!room) {
      return res.status(404).json({ success: false, message: "Room not found" });
    }

    res.status(200).json({
      success: true,
      message: "Room retrieved successfully",
      room: {
        _id: room._id,
        roomType: room.roomType,
        numberOfRooms: room.numberOfRooms,
        size: room.size,
        beds: room.beds,
        occupancy: room.occupancy,
        roomDetails: room.roomDetails,
        roomFeatures: room.roomFeatures,
        bathroomAmenities: room.bathroomAmenities,
        optional: room.optional,
        roomNumbers: room.roomNumbers || [],
        roomOccupancyType: room.roomOccupancyType || [],
        images: room.images || [],

        // ⭐ Correct — pricing contains everything
        pricing: room.pricing || {},

        createdAt: room.createdAt,
        updatedAt: room.updatedAt,
      },
    });

  } catch (error) {
    console.error("Error retrieving room:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};


// ================================
// DELETE room
// ================================
exports.deleteRoom = async (req, res) => {
  try {
    const { id } = req.params;
    if (!validator.isMongoId(id)) {
      return res.status(400).json({ message: "Invalid Room ID" });
    }

    const room = await Room.findById(id);
    if (!room) return res.status(404).json({ message: "Room not found" });

    if (room.images && room.images.length > 0) {
      for (const url of room.images) {
        const publicId = url.split('/').pop().split('.')[0];
        await cloudinary.uploader.destroy(`rooms/${publicId}`).catch(() => {});
      }
    }

    await room.deleteOne();
    res.status(200).json({ message: "Room deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};
// FIXED — Get Available Rooms (NO LOCATION)
exports.getAvailableRoomsByDate = async (req, res) => {
  try {
    let { date, checkIn, checkOut, adults, children, roomsRequested } = req.query;

    if (date && !checkIn && !checkOut) {
      checkIn = date;
      const nextDay = new Date(date);
      nextDay.setDate(nextDay.getDate() + 1);
      checkOut = nextDay.toISOString().split("T")[0];
    }

    if (!checkIn || !checkOut) {
      return res.status(400).json({ message: "Please provide check-in and check-out dates" });
    }

    if (!validator.isISO8601(checkIn) || !validator.isISO8601(checkOut)) {
      return res.status(400).json({ message: "Invalid date format" });
    }

    checkIn = new Date(checkIn);
    checkOut = new Date(checkOut);

    const inclusiveCheckOut = new Date(checkOut);
    inclusiveCheckOut.setDate(inclusiveCheckOut.getDate() + 1);

    // IMPORTANT: fetch full room documents including _id
    const rooms = await Room.find();

    const availableRooms = [];

    for (const room of rooms) {
      const overlappingBookings = await Booking.find({
        "rooms.roomType": room.roomType,
        status: { $in: ["confirmed", "checked_in", "pending"] },
        checkIn: { $lt: inclusiveCheckOut },
        checkOut: { $gte: checkIn },
      });

      let roomsBooked = 0;
      let roomsReserved = 0;

      overlappingBookings.forEach((b) => {
        const bookedRoom = b.rooms.find((r) => r.roomType === room.roomType);
        if (!bookedRoom) return;
        if (b.status === "pending") roomsReserved += bookedRoom.quantity;
        else roomsBooked += bookedRoom.quantity;
      });

      const availableCount = room.numberOfRooms - (roomsBooked + roomsReserved);
      if (availableCount <= 0) continue;

      // ⭐ FIXED: include full room._id
      availableRooms.push({
        _id: room._id,                     // <-- REQUIRED!
        roomType: room.roomType,
        totalRooms: room.numberOfRooms,
        bookedRooms: roomsBooked,
        reservedRooms: roomsReserved,
        availableRooms: availableCount,
        price: room.price,
        occupancy: room.occupancy,
        size: room.size,
        beds: room.beds,
        roomDetails: room.roomDetails,
        roomFeatures: room.roomFeatures,
        bathroomAmenities: room.bathroomAmenities,
        optional: room.optional,
        images: room.images,
        pricing: room.pricing,              // newly added
        meals: room.meals,                  // newly added
        childPolicy: room.childPolicy,      // newly added
        tax: room.tax                       // newly added
      });
    }

    res.status(200).json({
      message:
        availableRooms.length > 0
          ? "Available rooms fetched successfully."
          : "No rooms available for the selected date(s).",
      availableRooms,
    });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

exports.getRoomAvailability = async (req, res) => {
  try {
    const { roomType } = req.params;
    let { checkIn, checkOut, adults, children, roomsRequested } = req.query;

    if (!checkIn || !checkOut) {
      return res.status(400).json({
        success: false,
        message: "Please provide check-in and check-out dates"
      });
    }

    if (!validator.isISO8601(checkIn) || !validator.isISO8601(checkOut)) {
      return res.status(400).json({
        success: false,
        message: "Invalid date format (must be yyyy-mm-dd)"
      });
    }

    // ❗ IMPORTANT – DO NOT ESCAPE roomType (breaks names with spaces)
    const room = await Room.findOne({ roomType });
    if (!room) {
      return res.status(404).json({
        success: false,
        message: `Room type "${roomType}" not found`
      });
    }

    checkIn = new Date(checkIn);
    checkOut = new Date(checkOut);

    // -----------------------------------------------------
    // 🔍 Find overlapping bookings
    // A booking overlaps if:
    //   booking.checkIn < selectedCheckOut
    //       AND
    //   booking.checkOut > selectedCheckIn
    // -----------------------------------------------------
    const overlappingBookings = await Booking.find({
      "rooms.roomType": roomType,
      status: { $in: ["pending", "confirmed", "checked_in"] },
      checkIn: { $lt: checkOut },
      checkOut: { $gt: checkIn }
    });

    let roomsBooked = 0;
    let roomsReserved = 0;

    overlappingBookings.forEach(b => {
      const bookedRoom = b.rooms.find(r => r.roomType === roomType);
      if (!bookedRoom) return;

      if (b.status === "pending") roomsReserved += bookedRoom.quantity;
      else roomsBooked += bookedRoom.quantity;
    });

    const availableRooms = room.numberOfRooms - (roomsBooked + roomsReserved);

    // Format response room object
    const roomDetailsResponse = {
      _id: room._id,
      roomType: room.roomType,
      totalRooms: room.numberOfRooms,
      bookedRooms: roomsBooked,
      reservedRooms: roomsReserved,
      availableRooms,
      occupancy: room.occupancy,
      size: room.size,
      beds: room.beds,
      roomDetails: room.roomDetails,
      roomFeatures: room.roomFeatures,
      bathroomAmenities: room.bathroomAmenities,
      optional: room.optional,
      images: room.images,
      pricing: room.pricing,
      tax: room.tax
    };

    // -----------------------------------------------------
    // ❌ Not available
    // -----------------------------------------------------
    if (availableRooms <= 0 || (roomsRequested && roomsRequested > availableRooms)) {
      return res.status(200).json({
        success: true,
        available: false,
        message: `No ${roomType} rooms available for selected dates.`,
        room: roomDetailsResponse
      });
    }

    // -----------------------------------------------------
    // ✅ Available
    // -----------------------------------------------------
    return res.status(200).json({
      success: true,
      available: true,
      message: `${availableRooms} ${roomType} room(s) available.`,
      room: roomDetailsResponse
    });

  } catch (error) {
    console.error("GET ROOM AVAILABILITY ERROR:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message
    });
  }
};


// GET ALL ROOM TYPES WITH FULL PRICING
exports.getRoomTypes = async (req, res) => {
  try {
    const rooms = await Room.find({}, "roomType pricing occupancy beds size roomDetails roomFeatures bathroomAmenities images");

    if (!rooms || rooms.length === 0) {
      return res.status(404).json({
        success: false,
        message: "No room types found"
      });
    }

    const roomTypes = rooms.map((r) => ({
      roomType: r.roomType,

      // ⭐ ADD FULL PRICING
      pricing: r.pricing,

      // ⭐ EXTRA OPTIONAL INFO (not required but useful)
      occupancy: r.occupancy,
      beds: r.beds,
      size: r.size,
      roomDetails: r.roomDetails,
      roomFeatures: r.roomFeatures,
      bathroomAmenities: r.bathroomAmenities,
      images: r.images
    }));

    return res.status(200).json({
      success: true,
      message: "Room types fetched successfully",
      roomTypes
    });

  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message
    });
  }
};


// ================================
// Get available room numbers
// ================================
exports.getAvailableRoomNumbers = async (req, res) => {
  try {
    const { roomType } = req.params;
    let { checkIn, checkOut } = req.query;

    if (!roomType) {
      return res.status(400).json({ message: "Room type is required" });
    }

    if (!checkIn || !checkOut) {
      return res.status(400).json({ message: "Please provide check-in and check-out dates" });
    }

    if (!validator.isISO8601(checkIn) || !validator.isISO8601(checkOut)) {
      return res.status(400).json({ message: "Invalid date format" });
    }

    checkIn = new Date(checkIn);
    checkOut = new Date(checkOut);

    const room = await Room.findOne({ roomType });
    if (!room) {
      return res.status(404).json({ message: `Room type '${roomType}' not found` });
    }

    const allRooms = room.roomNumbers;

    const overlappingBookings = await Booking.find({
      "rooms.roomType": roomType,
      status: { $in: ["pending", "confirmed", "checked_in"] },
      checkIn: { $lt: checkOut },
      checkOut: { $gt: checkIn },
    });

    let bookedNumbers = [];

    overlappingBookings.forEach((b) => {
      if (Array.isArray(b.assignedRoom)) {
        bookedNumbers.push(...b.assignedRoom);
      }
    });

    bookedNumbers = [...new Set(bookedNumbers)];

    const availableRoomNumbers = allRooms.filter((n) => !bookedNumbers.includes(n));

    return res.status(200).json({
      success: true,
      message: "Available room numbers fetched successfully",
      roomType,
      totalRooms: allRooms.length,
      assignedRoom: bookedNumbers,
      availableRoomNumbers,
    });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};
