
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

// Clean input
const sanitizeRoomInput = (body) => {
  const sanitized = {
    roomType: validator.escape(validator.trim(body.roomType || '')),
    numberOfRooms: Number(body.numberOfRooms),
    size: Number(body.size),
    beds: Number(body.beds),
    occupancy: Number(body.occupancy),
    location: validator.escape(validator.trim(body.location || '')),
    roomDetails: body.roomDetails ? validator.escape(validator.trim(body.roomDetails)) : '',
    roomFeatures: body.roomFeatures ? validator.escape(validator.trim(body.roomFeatures)) : '',
    bathroomAmenities: body.bathroomAmenities ? validator.escape(validator.trim(body.bathroomAmenities)) : '',
    optional: body.optional ? validator.escape(validator.trim(body.optional)) : '',
    price: Number(body.price)
  };

  if (!sanitized.roomType || isNaN(sanitized.numberOfRooms) || isNaN(sanitized.size) ||
      isNaN(sanitized.beds) || isNaN(sanitized.occupancy) ||
      !sanitized.location || isNaN(sanitized.price)) {
    throw new Error("Missing or invalid required fields");
  }
  if (sanitized.numberOfRooms <= 0 || sanitized.price <= 0) {
    throw new Error("Number of rooms and price must be greater than 0");
  }
  return sanitized;
};
exports.createRoom = async (req, res) => {
  try {
    // Validate required fields
    if (!req.body.roomType || !req.body.numberOfRooms || !req.body.price) {
      return res.status(400).json({
        success: false,
        message: "Missing required fields: roomType, numberOfRooms, price."
      });
    }

    // Sanitize input
    const cleanData = sanitizeRoomInput(req.body);

    // ⭐ FIX ROOM NUMBERS (AGGRESSIVE CLEAN)
    if (!req.body.roomNumbers || !req.body.roomNumbers.trim()) {
      return res.status(400).json({
        success: false,
        message: "Room numbers required (comma separated, e.g. 101,102,103)"
      });
    }

    let roomNumbersArr = [];

    // Case 1: JSON array from frontend
    try {
      const parsed = JSON.parse(req.body.roomNumbers);
      if (Array.isArray(parsed)) {
        roomNumbersArr = parsed.map((x) => String(x).trim());
      }
    } catch {
      // Case 2: Plain text: "101, 102, 103"
      roomNumbersArr = req.body.roomNumbers
        .replace(/[\[\]\"]/g, "") // Remove brackets & quotes
        .split(",")
        .map((x) => x.trim())
        .filter((x) => x !== "");
    }

    // ⭐ Validate number count
    if (roomNumbersArr.length !== Number(cleanData.numberOfRooms)) {
      return res.status(400).json({
        success: false,
        message: `Mismatch: numberOfRooms = ${cleanData.numberOfRooms}, but ${roomNumbersArr.length} room numbers provided.`
      });
    }

    // ⭐ Upload images
    let images = [];
    if (req.files?.length > 0) {
      try {
        images = await uploadImages(req.files);
      } catch (err) {
        return res.status(500).json({
          success: false,
          message: "Image upload failed",
          error: err.message
        });
      }
    }

    // ⭐ CREATE ROOM
    const newRoom = new Room({
      ...cleanData,
      roomNumbers: roomNumbersArr,   // FINAL CLEAN FIX
      images
    });

    await newRoom.save();

    return res.status(201).json({
      success: true,
      message: "Room created successfully",
      room: newRoom
    });

  } catch (error) {
    // Handle duplicated roomTypes
    if (error.code === 11000 && error.keyPattern?.roomType) {
      return res.status(400).json({
        success: false,
        message: `Room type '${req.body.roomType}' already exists. Use update instead or choose another roomType.`
      });
    }

    return res.status(500).json({
      success: false,
      message: "Server error while creating room",
      error: error.message
    });
  }
};

// exports.createRoom = async (req, res) => {
//   try {
//     // Validate required fields
//     if (!req.body.roomType || !req.body.numberOfRooms || !req.body.price) {
//       return res.status(400).json({
//         success: false,
//         message: "Missing required fields: roomType, numberOfRooms, price."
//       });
//     }

//     // Sanitize input
//     const cleanData = sanitizeRoomInput(req.body);

//     // ✅ Validate & parse room numbers
//     if (!req.body.roomNumbers || !req.body.roomNumbers.trim()) {
//       return res.status(400).json({
//         success: false,
//         message: "Room numbers required (comma separated, e.g. 101,102,103)"
//       });
//     }

//     const roomNumbers = req.body.roomNumbers.split(",").map(r => r.trim());

//     if (roomNumbers.length !== cleanData.numberOfRooms) {
//       return res.status(400).json({
//         success: false,
//         message: `Mismatch: numberOfRooms = ${cleanData.numberOfRooms}, but ${roomNumbers.length} room numbers provided.`
//       });
//     }

//     // ✅ Upload images if provided
//     let images = [];
//     if (req.files?.length > 0) {
//       try {
//         images = await uploadImages(req.files);
//       } catch (err) {
//         return res.status(500).json({
//           success: false,
//           message: "Image upload failed",
//           error: err.message
//         });
//       }
//     }

//     // ✅ Create room
//     const newRoom = new Room({
//       ...cleanData,
//       roomNumbers,
//       images
//     });

//     await newRoom.save();

//     return res.status(201).json({
//       success: true,
//       message: "Room created successfully",
//       room: newRoom
//     });

//   } catch (error) {
//     // Handle duplicate roomType case gracefully
//     if (error.code === 11000 && error.keyPattern?.roomType) {
//       return res.status(400).json({
//         success: false,
//         message: `Room type '${req.body.roomType}' already exists. Use update instead or provide a different roomType.`
//       });
//     }

//     return res.status(500).json({
//       success: false,
//       message: "Server error while creating room",
//       error: error.message
//     });
//   }
// };

// exports.updateRoom = async (req, res) => {
//   try {
//     const { id } = req.params;
//     const room = await Room.findById(id);
//     if (!room)
//       return res.status(404).json({ success: false, message: "Room not found" });

//     // ✅ Updatable fields
//     const updatableFields = [
//       "roomType",
//       "price",
//       "numberOfRooms",
//       "size",
//       "beds",
//       "occupancy",
//       "location",
//       "roomDetails",
//       "optional",
//     ];

//     // ✅ Update only changed and valid fields
//     updatableFields.forEach((field) => {
//       if (
//         req.body[field] !== undefined &&
//         req.body[field] !== null &&
//         req.body[field] !== ""
//       ) {
//         if (["price", "numberOfRooms", "size", "beds", "occupancy"].includes(field)) {
//           const newValue = Number(req.body[field]);
//           if (!isNaN(newValue) && newValue !== room[field]) {
//             room[field] = newValue;
//           }
//         } else if (req.body[field] !== room[field]) {
//           room[field] = validator.escape(validator.trim(req.body[field]));
//         }
//       }
//     });

//     // ✅ Handle room numbers
//     if (req.body.roomNumbers && req.body.roomNumbers.trim()) {
//       const roomNumbers = req.body.roomNumbers.split(",").map((r) => r.trim());
//       if (roomNumbers.length !== room.numberOfRooms) {
//         return res.status(400).json({
//           success: false,
//           message: `Count mismatch: ${roomNumbers.length} provided, but numberOfRooms is ${room.numberOfRooms}`,
//         });
//       }
//       room.roomNumbers = roomNumbers;
//     }

//     // ✅ Handle roomFeatures as STRING
//     if (req.body.roomFeatures) {
//       if (typeof req.body.roomFeatures === "string") {
//         room.roomFeatures = validator.escape(validator.trim(req.body.roomFeatures));
//       } else if (Array.isArray(req.body.roomFeatures)) {
//         room.roomFeatures = req.body.roomFeatures.join(", ");
//       }
//     }

//     // ✅ Handle bathroomAmenities as STRING
//     if (req.body.bathroomAmenities) {
//       if (typeof req.body.bathroomAmenities === "string") {
//         room.bathroomAmenities = validator.escape(validator.trim(req.body.bathroomAmenities));
//       } else if (Array.isArray(req.body.bathroomAmenities)) {
//         room.bathroomAmenities = req.body.bathroomAmenities.join(", ");
//       }
//     }

//     // ✅ Handle images (replace old with kept + new ones)
//     let updatedImages = [];

//     // 1️⃣ Keep existing image URLs if provided in request body
//     if (req.body.existingImages) {
//       try {
//         // Could come as JSON array or comma-separated string
//         const parsed =
//           typeof req.body.existingImages === "string"
//             ? JSON.parse(req.body.existingImages)
//             : req.body.existingImages;

//         if (Array.isArray(parsed)) {
//           updatedImages = parsed.filter((url) => typeof url === "string" && url.trim() !== "");
//         }
//       } catch (err) {
//         console.warn("Failed to parse existingImages:", err.message);
//       }
//     }

//     // 2️⃣ Upload new files (if any)
//     if (req.files && req.files.length > 0) {
//       try {
//         const newImages = await uploadImages(req.files);
//         updatedImages = [...updatedImages, ...newImages];
//       } catch (err) {
//         console.error("Cloudinary Upload Error:", err);
//         return res.status(500).json({
//           success: false,
//           message: "Image upload failed",
//           error: err.message,
//         });
//       }
//     }

//     // 3️⃣ Replace image list with updated array
//     if (updatedImages.length > 0) {
//       room.images = updatedImages;
//     }

//     // ✅ Save updated room
//     await room.save();

//     return res.status(200).json({
//       success: true,
//       message: "Room updated successfully",
//       room,
//     });
//   } catch (error) {
//     console.error("UPDATE ROOM ERROR:", error);
//     return res.status(500).json({
//       success: false,
//       message: "Server error while updating room",
//       error: error.message,
//     });
//   }
// };
// exports.updateRoom = async (req, res) => {
//   try {
//     const { id } = req.params;
//     const room = await Room.findById(id);
//     if (!room)
//       return res.status(404).json({ success: false, message: "Room not found" });

//     // FIELDS ALLOWED TO UPDATE
//     const updatableFields = [
//       "roomType",
//       "price",
//       "numberOfRooms",
//       "size",
//       "beds",
//       "occupancy",
//       "location",
//       "roomDetails",
//       "optional",
//     ];

//     // UPDATE BASIC FIELDS
//     updatableFields.forEach((field) => {
//       if (req.body[field] !== undefined && req.body[field] !== "") {
//         if (["price", "numberOfRooms", "size", "beds", "occupancy"].includes(field)) {
//           room[field] = Number(req.body[field]);
//         } else {
//           room[field] = validator.escape(validator.trim(req.body[field]));
//         }
//       }
//     });

//     // ⭐ UPDATE ROOM NUMBERS
//     if (req.body.roomNumbers) {
//       const roomNumbersArr = req.body.roomNumbers
//         .split(",")
//         .map((r) => r.trim())
//         .filter((s) => s !== "");

//       if (roomNumbersArr.length !== room.numberOfRooms) {
//         return res.status(400).json({
//           success: false,
//           message: `Room numbers count (${roomNumbersArr.length}) does not match numberOfRooms (${room.numberOfRooms}).`
//         });
//       }

//       room.roomNumbers = roomNumbersArr;
//     }

//     // ⭐ UPDATE ROOM FEATURES AS STRING
//     if (req.body.roomFeatures) {
//       if (Array.isArray(req.body.roomFeatures)) {
//         room.roomFeatures = req.body.roomFeatures.join(", ");
//       } else {
//         room.roomFeatures = validator.escape(validator.trim(req.body.roomFeatures));
//       }
//     }

//     // ⭐ UPDATE BATHROOM AMENITIES
//     if (req.body.bathroomAmenities) {
//       if (Array.isArray(req.body.bathroomAmenities)) {
//         room.bathroomAmenities = req.body.bathroomAmenities.join(", ");
//       } else {
//         room.bathroomAmenities = validator.escape(
//           validator.trim(req.body.bathroomAmenities)
//         );
//       }
//     }

//     // ⭐ UPDATE IMAGES (existing + new)
//     let updatedImages = [];

//     // EXISTING IMAGES FROM FRONTEND
//     if (req.body.existingImages) {
//       try {
//         const parsed =
//           typeof req.body.existingImages === "string"
//             ? JSON.parse(req.body.existingImages)
//             : req.body.existingImages;

//         if (Array.isArray(parsed)) {
//           updatedImages = parsed;
//         }
//       } catch (e) {
//         console.log("Error parsing existingImages:", e.message);
//       }
//     }

//     // NEW IMAGES UPLOADED
//     if (req.files && req.files.length > 0) {
//       const newImgs = await uploadImages(req.files);
//       updatedImages = [...updatedImages, ...newImgs];
//     }

//     if (updatedImages.length > 0) {
//       room.images = updatedImages;
//     }

//     // SAVE UPDATED ROOM
//     await room.save();

//     res.status(200).json({
//       success: true,
//       message: "Room updated successfully",
//       room,
//     });
//   } catch (error) {
//     console.error("UPDATE ROOM ERROR:", error);
//     res.status(500).json({
//       success: false,
//       message: "Server error while updating room",
//       error: error.message,
//     });
//   }
// };
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

    // ⭐ UPDATE GENERAL FIELDS
    const fields = [
      "roomType",
      "price",
      "numberOfRooms",
      "size",
      "beds",
      "occupancy",
      "location",
      "roomDetails",
      "optional",
    ];

    fields.forEach((field) => {
      if (req.body[field] !== undefined) {
        room[field] = validator.escape(validator.trim(req.body[field]));
      }
    });

    // ⭐ CLEAN + PARSE ROOM NUMBERS (FINAL FIX)
    if (req.body.roomNumbers) {
      let roomNumbersArr = [];

      // Try JSON parse first
      try {
        const parsed = JSON.parse(req.body.roomNumbers);

        if (Array.isArray(parsed)) {
          roomNumbersArr = parsed.map((x) => String(x).trim());
        }
      } catch {
        // If not JSON, treat as "101, 102, 103"
        roomNumbersArr = req.body.roomNumbers
          .replace(/[\[\]\"]/g, "") // remove brackets & quotes
          .split(",")
          .map((r) => r.trim())
          .filter((s) => s !== "");
      }

      // Validate number count
      if (roomNumbersArr.length !== Number(room.numberOfRooms)) {
        return res.status(400).json({
          success: false,
          message: `Room numbers count (${roomNumbersArr.length}) does not match numberOfRooms (${room.numberOfRooms}).`,
        });
      }

      room.roomNumbers = roomNumbersArr;
    }

    // ⭐ UPDATE ROOM FEATURES
    if (req.body.roomFeatures) {
      if (Array.isArray(req.body.roomFeatures)) {
        room.roomFeatures = req.body.roomFeatures.join(", ");
      } else {
        room.roomFeatures = validator.escape(
          validator.trim(req.body.roomFeatures)
        );
      }
    }

    // ⭐ UPDATE BATHROOM AMENITIES
    if (req.body.bathroomAmenities) {
      if (Array.isArray(req.body.bathroomAmenities)) {
        room.bathroomAmenities = req.body.bathroomAmenities.join(", ");
      } else {
        room.bathroomAmenities = validator.escape(
          validator.trim(req.body.bathroomAmenities)
        );
      }
    }

    // ⭐ IMAGE HANDLING
    let updatedImages = [];

    // Existing images
    if (req.body.existingImages) {
      try {
        const parsed =
          typeof req.body.existingImages === "string"
            ? JSON.parse(req.body.existingImages)
            : req.body.existingImages;

        if (Array.isArray(parsed)) {
          updatedImages = parsed;
        }
      } catch (e) {
        console.log("Error parsing existingImages:", e.message);
      }
    }

    // New uploaded images
    if (req.files && req.files.length > 0) {
      const newImgs = await uploadImages(req.files);
      updatedImages = [...updatedImages, ...newImgs];
    }

    if (updatedImages.length > 0) {
      room.images = updatedImages;
    }

    // ⭐ SAVE ROOM
    await room.save();

    res.status(200).json({
      success: true,
      message: "Room updated successfully",
      room,
    });
  } catch (error) {
    console.error("UPDATE ROOM ERROR:", error);
    res.status(500).json({
      success: false,
      message: "Server error while updating room",
      error: error.message,
    });
  }
};


// ---------------- Get all rooms ----------------
exports.getAllRooms = async (req, res) => {
  try {
    const rooms = await Room.find();
    res.status(200).json({ message: 'All Rooms retrieved successfully', rooms });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};
// ---------------- Get first two rooms ----------------
exports.getFirstTwoRooms = async (req, res) => {
  try {
    // Fetch only the first 2 rooms from the collection
    const rooms = await Room.find().limit(2);

    if (!rooms || rooms.length === 0) {
      return res.status(404).json({ message: 'No rooms found' });
    }

    res.status(200).json({
      message: 'First two rooms retrieved successfully',
      rooms,
    });
  } catch (error) {
    console.error('Error fetching first two rooms:', error);
    res.status(500).json({
      message: 'Server error',
      error: error.message,
    });
  }
};

// ---------------- Get room by ID ----------------
exports.getRoomById = async (req, res) => {
  try {
    const { id } = req.params;
    if (!validator.isMongoId(id)) return res.status(400).json({ message: 'Invalid Room ID' });

    const room = await Room.findById(id);
    if (!room) return res.status(404).json({ message: 'Room not found' });

    res.status(200).json({ message: 'Room retrieved successfully', room });
  } catch (error) {
    console.error('GET ROOM BY ID ERROR:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// ---------------- Delete room ----------------
exports.deleteRoom = async (req, res) => {
  try {
    const { id } = req.params;
    if (!validator.isMongoId(id)) return res.status(400).json({ message: 'Invalid Room ID' });

    const room = await Room.findById(id);
    if (!room) return res.status(404).json({ message: 'Room not found' });

    if (room.images && room.images.length > 0) {
      for (const url of room.images) {
        const publicId = url.split('/').pop().split('.')[0];
        await cloudinary.uploader.destroy(`rooms/${publicId}`).catch(err => console.warn(err));
      }
    }

    await room.deleteOne();
    res.status(200).json({ message: 'Room deleted successfully' });
  } catch (error) {
    console.error('DELETE ROOM ERROR:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

exports.getAvailableRoomsByDate = async (req, res) => {
  try {
    let { date, checkIn, checkOut, adults, children, roomsRequested } = req.query;

    // 🟢 If only a single date is provided, make it a 1-day inclusive range
    if (date && !checkIn && !checkOut) {
      checkIn = date;
      const nextDay = new Date(date);
      nextDay.setDate(nextDay.getDate() + 1);
      checkOut = nextDay.toISOString().split("T")[0];
    }

    // 🟢 Validate date input
    if (!checkIn || !checkOut)
      return res.status(400).json({ message: "Please provide check-in and check-out dates" });

    if (!validator.isISO8601(checkIn) || !validator.isISO8601(checkOut))
      return res.status(400).json({ message: "Invalid date format" });

    // Convert to Date objects
    checkIn = new Date(checkIn);
    checkOut = new Date(checkOut);

    // 🟢 Make both days inclusive — extend checkOut by 1 full day (so 12→13 blocks both)
    const inclusiveCheckOut = new Date(checkOut);
    inclusiveCheckOut.setDate(inclusiveCheckOut.getDate() + 1);

    const rooms = await Room.find();
    const availableRooms = [];

    for (const room of rooms) {
      // 🟢 Find all bookings that overlap (inclusive)
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

      // 🟢 Apply optional filters
      if ((adults && adults > room.occupancy) || (children && children > room.beds)) continue;
      if (roomsRequested && roomsRequested > availableCount) continue;

      // 🟢 Push formatted room data
      availableRooms.push({
        roomType: room.roomType,
        totalRooms: room.numberOfRooms,
        bookedRooms: roomsBooked,
        reservedRooms: roomsReserved,
        availableRooms: availableCount,
        price: room.price,
        occupancy: room.occupancy,
        size: room.size,
        beds: room.beds,
        location: room.location,
        roomDetails: room.roomDetails,
        roomFeatures: room.roomFeatures,
        bathroomAmenities: room.bathroomAmenities,
        optional: room.optional,
        images: room.images,
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
    console.error("GET AVAILABLE ROOMS ERROR:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// ---------------- Get room availability by type ----------------
exports.getRoomAvailability = async (req, res) => {
  try {
    const { roomType } = req.params;
    let { checkIn, checkOut, adults, children, roomsRequested } = req.query;

    if (!checkIn || !checkOut)
      return res.status(400).json({ message: "Please provide check-in and check-out dates" });

    if (!validator.isISO8601(checkIn) || !validator.isISO8601(checkOut))
      return res.status(400).json({ message: "Invalid date format" });

    const room = await Room.findOne({ roomType: validator.escape(roomType) });
    if (!room) return res.status(404).json({ message: `Room type ${roomType} not found` });

    checkIn = new Date(checkIn);
    checkOut = new Date(checkOut);

    const overlappingBookings = await Booking.find({
      'rooms.roomType': roomType,
      status: { $in: ['confirmed', 'checked_in', 'pending'] },
      $or: [{ checkIn: { $lt: checkOut }, checkOut: { $gt: checkIn } }]
    });

    let roomsBooked = 0, roomsReserved = 0;
    overlappingBookings.forEach(b => {
      const bookedRoom = b.rooms.find(r => r.roomType === roomType);
      if (!bookedRoom) return;
      if (b.status === 'pending') roomsReserved += bookedRoom.quantity;
      else roomsBooked += bookedRoom.quantity;
    });

    const roomsAvailable = room.numberOfRooms - (roomsReserved + roomsBooked);

    if (roomsAvailable <= 0 || (roomsRequested && roomsRequested > roomsAvailable))
      return res.status(200).json({ message: `No ${roomType} rooms available for selected dates.` });

    res.status(200).json({
      message: `${roomsAvailable} ${roomType} room(s) available.`,
      roomType,
      roomsAvailable,
      roomsReserved,
      roomsBooked,
      totalRooms: room.numberOfRooms,
      price: room.price,
      occupancy: room.occupancy,
      size: room.size,
      beds: room.beds,
      location: room.location,
      roomDetails: room.roomDetails,
      images: room.images
    });
  } catch (error) {
    console.error("GET ROOM AVAILABILITY ERROR:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};
// ---------------- Get room types WITH price ----------------
exports.getRoomTypes = async (req, res) => {
  try {
    // Fetch only roomType + price
    const rooms = await Room.find({}, "roomType price");

    if (!rooms || rooms.length === 0) {
      return res.status(404).json({
        success: false,
        message: "No room types found"
      });
    }

    // Format data: [{ roomType, price }]
    const roomTypes = rooms.map(r => ({
      roomType: r.roomType,
      price: r.price
    }));

    res.status(200).json({
      success: true,
      message: "Room types fetched successfully",
      roomTypes
    });

  } catch (error) {
    console.error("GET ROOM TYPES ERROR:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message
    });
  }
};
// ---------------- Get available room numbers for a room type ----------------
exports.getAvailableRoomNumbers = async (req, res) => {
  try {
    const { roomType } = req.params;
    let { checkIn, checkOut } = req.query;

    if (!roomType)
      return res.status(400).json({ message: "Room type is required" });

    if (!checkIn || !checkOut)
      return res.status(400).json({ message: "Please provide check-in and check-out dates" });

    if (!validator.isISO8601(checkIn) || !validator.isISO8601(checkOut))
      return res.status(400).json({ message: "Invalid date format" });

    checkIn = new Date(checkIn);
    checkOut = new Date(checkOut);

    const room = await Room.findOne({ roomType });
    if (!room)
      return res.status(404).json({ message: `Room type '${roomType}' not found` });

    const allRooms = room.roomNumbers;

    // Find bookings that overlap AND match the roomType
    const overlappingBookings = await Booking.find({
      "rooms.roomType": roomType,
      status: { $in: ["pending", "confirmed", "checked_in"] },
      checkIn: { $lt: checkOut },
      checkOut: { $gt: checkIn }
    });

    // Collect booked rooms from top-level assignedRoom array
    let bookedNumbers = [];

    overlappingBookings.forEach(b => {
      if (Array.isArray(b.assignedRoom)) {
        bookedNumbers.push(...b.assignedRoom);
      }
    });

    bookedNumbers = [...new Set(bookedNumbers)];

    const availableRoomNumbers = allRooms.filter(n => !bookedNumbers.includes(n));

    return res.status(200).json({
      success: true,
      message: "Available room numbers fetched successfully",
      roomType,
      totalRooms: allRooms.length,
      assignedRoom: bookedNumbers,
      availableRoomNumbers
    });

  } catch (error) {
    console.error("GET AVAILABLE ROOM NUMBERS ERROR:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

