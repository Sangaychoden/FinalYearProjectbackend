
// // const Room = require('../models/roomModel');
// // const Booking = require('../models/bookingModels');
// // const cloudinary = require('cloudinary').v2;
// // const validator = require('validator');

// // cloudinary.config({
// //   cloud_name: process.env.CLOUD_NAME,
// //   api_key: process.env.CLOUD_API_KEY,
// //   api_secret: process.env.CLOUD_API_SECRET
// // });

// // // Upload images
// // const uploadImages = async (files) => {
// //   const images = [];
// //   for (const file of files.slice(0, 5)) {
// //     const result = await new Promise((resolve, reject) => {
// //       const stream = cloudinary.uploader.upload_stream(
// //         { folder: 'rooms' },
// //         (error, result) => error ? reject(error) : resolve(result)
// //       );
// //       stream.end(file.buffer);
// //     });
// //     images.push(result.secure_url);
// //   }
// //   return images;
// // };

// // // Clean input
// // const sanitizeRoomInput = (body) => {
// //   const sanitized = {
// //     roomType: validator.escape(validator.trim(body.roomType || '')),
// //     numberOfRooms: Number(body.numberOfRooms),
// //     size: Number(body.size),
// //     beds: Number(body.beds),
// //     occupancy: Number(body.occupancy),
// //     // location: validator.escape(validator.trim(body.location || '')),
// //     roomDetails: body.roomDetails ? validator.escape(validator.trim(body.roomDetails)) : '',
// //     roomFeatures: body.roomFeatures ? validator.escape(validator.trim(body.roomFeatures)) : '',
// //     bathroomAmenities: body.bathroomAmenities ? validator.escape(validator.trim(body.bathroomAmenities)) : '',
// //     optional: body.optional ? validator.escape(validator.trim(body.optional)) : '',
// //     price: Number(body.price)
// //   };

// //   if (!sanitized.roomType || isNaN(sanitized.numberOfRooms) || isNaN(sanitized.size) ||
// //       isNaN(sanitized.beds) || isNaN(sanitized.occupancy) ||
// //       !sanitized.location || isNaN(sanitized.price)) {
// //     throw new Error("Missing or invalid required fields");
// //   }
// //   if (sanitized.numberOfRooms <= 0 || sanitized.price <= 0) {
// //     throw new Error("Number of rooms and price must be greater than 0");
// //   }
// //   return sanitized;
// // };
// // exports.createRoom = async (req, res) => {
// //   try {
// //     // Validate required fields
// //     if (!req.body.roomType || !req.body.numberOfRooms || !req.body.price) {
// //       return res.status(400).json({
// //         success: false,
// //         message: "Missing required fields: roomType, numberOfRooms, price."
// //       });
// //     }

// //     // Sanitize input
// //     const cleanData = sanitizeRoomInput(req.body);

// //     // ⭐ FIX ROOM NUMBERS (AGGRESSIVE CLEAN)
// //     if (!req.body.roomNumbers || !req.body.roomNumbers.trim()) {
// //       return res.status(400).json({
// //         success: false,
// //         message: "Room numbers required (comma separated, e.g. 101,102,103)"
// //       });
// //     }

// //     let roomNumbersArr = [];

// //     // Case 1: JSON array from frontend
// //     try {
// //       const parsed = JSON.parse(req.body.roomNumbers);
// //       if (Array.isArray(parsed)) {
// //         roomNumbersArr = parsed.map((x) => String(x).trim());
// //       }
// //     } catch {
// //       // Case 2: Plain text: "101, 102, 103"
// //       roomNumbersArr = req.body.roomNumbers
// //         .replace(/[\[\]\"]/g, "") // Remove brackets & quotes
// //         .split(",")
// //         .map((x) => x.trim())
// //         .filter((x) => x !== "");
// //     }

// //     // ⭐ Validate number count
// //     if (roomNumbersArr.length !== Number(cleanData.numberOfRooms)) {
// //       return res.status(400).json({
// //         success: false,
// //         message: `Mismatch: numberOfRooms = ${cleanData.numberOfRooms}, but ${roomNumbersArr.length} room numbers provided.`
// //       });
// //     }

// //     // ⭐ Upload images
// //     let images = [];
// //     if (req.files?.length > 0) {
// //       try {
// //         images = await uploadImages(req.files);
// //       } catch (err) {
// //         return res.status(500).json({
// //           success: false,
// //           message: "Image upload failed",
// //           error: err.message
// //         });
// //       }
// //     }

// //     // ⭐ CREATE ROOM
// //     const newRoom = new Room({
// //       ...cleanData,
// //       roomNumbers: roomNumbersArr,   // FINAL CLEAN FIX
// //       images
// //     });

// //     await newRoom.save();

// //     return res.status(201).json({
// //       success: true,
// //       message: "Room created successfully",
// //       room: newRoom
// //     });

// //   } catch (error) {
// //     // Handle duplicated roomTypes
// //     if (error.code === 11000 && error.keyPattern?.roomType) {
// //       return res.status(400).json({
// //         success: false,
// //         message: `Room type '${req.body.roomType}' already exists. Use update instead or choose another roomType.`
// //       });
// //     }

// //     return res.status(500).json({
// //       success: false,
// //       message: "Server error while creating room",
// //       error: error.message
// //     });
// //   }
// // };

// // exports.updateRoom = async (req, res) => {
// //   try {
// //     const roomId = req.params.id;
// //     const room = await Room.findById(roomId);

// //     if (!room) {
// //       return res.status(404).json({
// //         success: false,
// //         message: "Room not found",
// //       });
// //     }

// //     // ⭐ UPDATE GENERAL FIELDS
// //     const fields = [
// //       "roomType",
// //       "price",
// //       "numberOfRooms",
// //       "size",
// //       "beds",
// //       "occupancy",
// //       // "location",
// //       "roomDetails",
// //       "optional",
// //     ];

// //     fields.forEach((field) => {
// //       if (req.body[field] !== undefined) {
// //         room[field] = validator.escape(validator.trim(req.body[field]));
// //       }
// //     });

// //     // ⭐ CLEAN + PARSE ROOM NUMBERS (FINAL FIX)
// //     if (req.body.roomNumbers) {
// //       let roomNumbersArr = [];

// //       // Try JSON parse first
// //       try {
// //         const parsed = JSON.parse(req.body.roomNumbers);

// //         if (Array.isArray(parsed)) {
// //           roomNumbersArr = parsed.map((x) => String(x).trim());
// //         }
// //       } catch {
// //         // If not JSON, treat as "101, 102, 103"
// //         roomNumbersArr = req.body.roomNumbers
// //           .replace(/[\[\]\"]/g, "") // remove brackets & quotes
// //           .split(",")
// //           .map((r) => r.trim())
// //           .filter((s) => s !== "");
// //       }

// //       // Validate number count
// //       if (roomNumbersArr.length !== Number(room.numberOfRooms)) {
// //         return res.status(400).json({
// //           success: false,
// //           message: `Room numbers count (${roomNumbersArr.length}) does not match numberOfRooms (${room.numberOfRooms}).`,
// //         });
// //       }

// //       room.roomNumbers = roomNumbersArr;
// //     }

// //     // ⭐ UPDATE ROOM FEATURES
// //     if (req.body.roomFeatures) {
// //       if (Array.isArray(req.body.roomFeatures)) {
// //         room.roomFeatures = req.body.roomFeatures.join(", ");
// //       } else {
// //         room.roomFeatures = validator.escape(
// //           validator.trim(req.body.roomFeatures)
// //         );
// //       }
// //     }

// //     // ⭐ UPDATE BATHROOM AMENITIES
// //     if (req.body.bathroomAmenities) {
// //       if (Array.isArray(req.body.bathroomAmenities)) {
// //         room.bathroomAmenities = req.body.bathroomAmenities.join(", ");
// //       } else {
// //         room.bathroomAmenities = validator.escape(
// //           validator.trim(req.body.bathroomAmenities)
// //         );
// //       }
// //     }

// //     // ⭐ IMAGE HANDLING
// //     let updatedImages = [];

// //     // Existing images
// //     if (req.body.existingImages) {
// //       try {
// //         const parsed =
// //           typeof req.body.existingImages === "string"
// //             ? JSON.parse(req.body.existingImages)
// //             : req.body.existingImages;

// //         if (Array.isArray(parsed)) {
// //           updatedImages = parsed;
// //         }
// //       } catch (e) {
// //         console.log("Error parsing existingImages:", e.message);
// //       }
// //     }

// //     // New uploaded images
// //     if (req.files && req.files.length > 0) {
// //       const newImgs = await uploadImages(req.files);
// //       updatedImages = [...updatedImages, ...newImgs];
// //     }

// //     if (updatedImages.length > 0) {
// //       room.images = updatedImages;
// //     }

// //     // ⭐ SAVE ROOM
// //     await room.save();

// //     res.status(200).json({
// //       success: true,
// //       message: "Room updated successfully",
// //       room,
// //     });
// //   } catch (error) {
// //     console.error("UPDATE ROOM ERROR:", error);
// //     res.status(500).json({
// //       success: false,
// //       message: "Server error while updating room",
// //       error: error.message,
// //     });
// //   }
// // };


// // // ---------------- Get all rooms ----------------
// // exports.getAllRooms = async (req, res) => {
// //   try {
// //     const rooms = await Room.find();
// //     res.status(200).json({ message: 'All Rooms retrieved successfully', rooms });
// //   } catch (error) {
// //     console.error(error);
// //     res.status(500).json({ message: 'Server error', error: error.message });
// //   }
// // };
// // // ---------------- Get first two rooms ----------------
// // exports.getFirstTwoRooms = async (req, res) => {
// //   try {
// //     // Fetch only the first 2 rooms from the collection
// //     const rooms = await Room.find().limit(2);

// //     if (!rooms || rooms.length === 0) {
// //       return res.status(404).json({ message: 'No rooms found' });
// //     }

// //     res.status(200).json({
// //       message: 'First two rooms retrieved successfully',
// //       rooms,
// //     });
// //   } catch (error) {
// //     console.error('Error fetching first two rooms:', error);
// //     res.status(500).json({
// //       message: 'Server error',
// //       error: error.message,
// //     });
// //   }
// // };

// // // ---------------- Get room by ID ----------------
// // exports.getRoomById = async (req, res) => {
// //   try {
// //     const { id } = req.params;
// //     if (!validator.isMongoId(id)) return res.status(400).json({ message: 'Invalid Room ID' });

// //     const room = await Room.findById(id);
// //     if (!room) return res.status(404).json({ message: 'Room not found' });

// //     res.status(200).json({ message: 'Room retrieved successfully', room });
// //   } catch (error) {
// //     console.error('GET ROOM BY ID ERROR:', error);
// //     res.status(500).json({ message: 'Server error', error: error.message });
// //   }
// // };

// // // ---------------- Delete room ----------------
// // exports.deleteRoom = async (req, res) => {
// //   try {
// //     const { id } = req.params;
// //     if (!validator.isMongoId(id)) return res.status(400).json({ message: 'Invalid Room ID' });

// //     const room = await Room.findById(id);
// //     if (!room) return res.status(404).json({ message: 'Room not found' });

// //     if (room.images && room.images.length > 0) {
// //       for (const url of room.images) {
// //         const publicId = url.split('/').pop().split('.')[0];
// //         await cloudinary.uploader.destroy(`rooms/${publicId}`).catch(err => console.warn(err));
// //       }
// //     }

// //     await room.deleteOne();
// //     res.status(200).json({ message: 'Room deleted successfully' });
// //   } catch (error) {
// //     console.error('DELETE ROOM ERROR:', error);
// //     res.status(500).json({ message: 'Server error', error: error.message });
// //   }
// // };

// // exports.getAvailableRoomsByDate = async (req, res) => {
// //   try {
// //     let { date, checkIn, checkOut, adults, children, roomsRequested } = req.query;

// //     // 🟢 If only a single date is provided, make it a 1-day inclusive range
// //     if (date && !checkIn && !checkOut) {
// //       checkIn = date;
// //       const nextDay = new Date(date);
// //       nextDay.setDate(nextDay.getDate() + 1);
// //       checkOut = nextDay.toISOString().split("T")[0];
// //     }

// //     // 🟢 Validate date input
// //     if (!checkIn || !checkOut)
// //       return res.status(400).json({ message: "Please provide check-in and check-out dates" });

// //     if (!validator.isISO8601(checkIn) || !validator.isISO8601(checkOut))
// //       return res.status(400).json({ message: "Invalid date format" });

// //     // Convert to Date objects
// //     checkIn = new Date(checkIn);
// //     checkOut = new Date(checkOut);

// //     // 🟢 Make both days inclusive — extend checkOut by 1 full day (so 12→13 blocks both)
// //     const inclusiveCheckOut = new Date(checkOut);
// //     inclusiveCheckOut.setDate(inclusiveCheckOut.getDate() + 1);

// //     const rooms = await Room.find();
// //     const availableRooms = [];

// //     for (const room of rooms) {
// //       // 🟢 Find all bookings that overlap (inclusive)
// //       const overlappingBookings = await Booking.find({
// //         "rooms.roomType": room.roomType,
// //         status: { $in: ["confirmed", "checked_in", "pending"] },
// //         checkIn: { $lt: inclusiveCheckOut },
// //         checkOut: { $gte: checkIn },
// //       });

// //       let roomsBooked = 0;
// //       let roomsReserved = 0;

// //       overlappingBookings.forEach((b) => {
// //         const bookedRoom = b.rooms.find((r) => r.roomType === room.roomType);
// //         if (!bookedRoom) return;
// //         if (b.status === "pending") roomsReserved += bookedRoom.quantity;
// //         else roomsBooked += bookedRoom.quantity;
// //       });

// //       const availableCount = room.numberOfRooms - (roomsBooked + roomsReserved);
// //       if (availableCount <= 0) continue;

// //       // 🟢 Apply optional filters
// //       if ((adults && adults > room.occupancy) || (children && children > room.beds)) continue;
// //       if (roomsRequested && roomsRequested > availableCount) continue;

// //       // 🟢 Push formatted room data
// //       availableRooms.push({
// //         roomType: room.roomType,
// //         totalRooms: room.numberOfRooms,
// //         bookedRooms: roomsBooked,
// //         reservedRooms: roomsReserved,
// //         availableRooms: availableCount,
// //         price: room.price,
// //         occupancy: room.occupancy,
// //         size: room.size,
// //         beds: room.beds,
// //         location: room.location,
// //         roomDetails: room.roomDetails,
// //         roomFeatures: room.roomFeatures,
// //         bathroomAmenities: room.bathroomAmenities,
// //         optional: room.optional,
// //         images: room.images,
// //       });
// //     }

// //     res.status(200).json({
// //       message:
// //         availableRooms.length > 0
// //           ? "Available rooms fetched successfully."
// //           : "No rooms available for the selected date(s).",
// //       availableRooms,
// //     });
// //   } catch (error) {
// //     console.error("GET AVAILABLE ROOMS ERROR:", error);
// //     res.status(500).json({ message: "Server error", error: error.message });
// //   }
// // };

// // // ---------------- Get room availability by type ----------------
// // exports.getRoomAvailability = async (req, res) => {
// //   try {
// //     const { roomType } = req.params;
// //     let { checkIn, checkOut, adults, children, roomsRequested } = req.query;

// //     if (!checkIn || !checkOut)
// //       return res.status(400).json({ message: "Please provide check-in and check-out dates" });

// //     if (!validator.isISO8601(checkIn) || !validator.isISO8601(checkOut))
// //       return res.status(400).json({ message: "Invalid date format" });

// //     const room = await Room.findOne({ roomType: validator.escape(roomType) });
// //     if (!room) return res.status(404).json({ message: `Room type ${roomType} not found` });

// //     checkIn = new Date(checkIn);
// //     checkOut = new Date(checkOut);

// //     const overlappingBookings = await Booking.find({
// //       'rooms.roomType': roomType,
// //       status: { $in: ['confirmed', 'checked_in', 'pending'] },
// //       $or: [{ checkIn: { $lt: checkOut }, checkOut: { $gt: checkIn } }]
// //     });

// //     let roomsBooked = 0, roomsReserved = 0;
// //     overlappingBookings.forEach(b => {
// //       const bookedRoom = b.rooms.find(r => r.roomType === roomType);
// //       if (!bookedRoom) return;
// //       if (b.status === 'pending') roomsReserved += bookedRoom.quantity;
// //       else roomsBooked += bookedRoom.quantity;
// //     });

// //     const roomsAvailable = room.numberOfRooms - (roomsReserved + roomsBooked);

// //     if (roomsAvailable <= 0 || (roomsRequested && roomsRequested > roomsAvailable))
// //       return res.status(200).json({ message: `No ${roomType} rooms available for selected dates.` });

// //     res.status(200).json({
// //       message: `${roomsAvailable} ${roomType} room(s) available.`,
// //       roomType,
// //       roomsAvailable,
// //       roomsReserved,
// //       roomsBooked,
// //       totalRooms: room.numberOfRooms,
// //       price: room.price,
// //       occupancy: room.occupancy,
// //       size: room.size,
// //       beds: room.beds,
// //       location: room.location,
// //       roomDetails: room.roomDetails,
// //       images: room.images
// //     });
// //   } catch (error) {
// //     console.error("GET ROOM AVAILABILITY ERROR:", error);
// //     res.status(500).json({ message: "Server error", error: error.message });
// //   }
// // };
// // // ---------------- Get room types WITH price ----------------
// // exports.getRoomTypes = async (req, res) => {
// //   try {
// //     // Fetch only roomType + price
// //     const rooms = await Room.find({}, "roomType price");

// //     if (!rooms || rooms.length === 0) {
// //       return res.status(404).json({
// //         success: false,
// //         message: "No room types found"
// //       });
// //     }

// //     // Format data: [{ roomType, price }]
// //     const roomTypes = rooms.map(r => ({
// //       roomType: r.roomType,
// //       price: r.price
// //     }));

// //     res.status(200).json({
// //       success: true,
// //       message: "Room types fetched successfully",
// //       roomTypes
// //     });

// //   } catch (error) {
// //     console.error("GET ROOM TYPES ERROR:", error);
// //     res.status(500).json({
// //       success: false,
// //       message: "Server error",
// //       error: error.message
// //     });
// //   }
// // };
// // // ---------------- Get available room numbers for a room type ----------------
// // exports.getAvailableRoomNumbers = async (req, res) => {
// //   try {
// //     const { roomType } = req.params;
// //     let { checkIn, checkOut } = req.query;

// //     if (!roomType)
// //       return res.status(400).json({ message: "Room type is required" });

// //     if (!checkIn || !checkOut)
// //       return res.status(400).json({ message: "Please provide check-in and check-out dates" });

// //     if (!validator.isISO8601(checkIn) || !validator.isISO8601(checkOut))
// //       return res.status(400).json({ message: "Invalid date format" });

// //     checkIn = new Date(checkIn);
// //     checkOut = new Date(checkOut);

// //     const room = await Room.findOne({ roomType });
// //     if (!room)
// //       return res.status(404).json({ message: `Room type '${roomType}' not found` });

// //     const allRooms = room.roomNumbers;

// //     // Find bookings that overlap AND match the roomType
// //     const overlappingBookings = await Booking.find({
// //       "rooms.roomType": roomType,
// //       status: { $in: ["pending", "confirmed", "checked_in"] },
// //       checkIn: { $lt: checkOut },
// //       checkOut: { $gt: checkIn }
// //     });

// //     // Collect booked rooms from top-level assignedRoom array
// //     let bookedNumbers = [];

// //     overlappingBookings.forEach(b => {
// //       if (Array.isArray(b.assignedRoom)) {
// //         bookedNumbers.push(...b.assignedRoom);
// //       }
// //     });

// //     bookedNumbers = [...new Set(bookedNumbers)];

// //     const availableRoomNumbers = allRooms.filter(n => !bookedNumbers.includes(n));

// //     return res.status(200).json({
// //       success: true,
// //       message: "Available room numbers fetched successfully",
// //       roomType,
// //       totalRooms: allRooms.length,
// //       assignedRoom: bookedNumbers,
// //       availableRoomNumbers
// //     });

// //   } catch (error) {
// //     console.error("GET AVAILABLE ROOM NUMBERS ERROR:", error);
// //     res.status(500).json({ message: "Server error", error: error.message });
// //   }
// // };

// const Room = require('../models/roomModel');
// const Booking = require('../models/bookingModels');
// const cloudinary = require('cloudinary').v2;
// const validator = require('validator');

// cloudinary.config({
//   cloud_name: process.env.CLOUD_NAME,
//   api_key: process.env.CLOUD_API_KEY,
//   api_secret: process.env.CLOUD_API_SECRET
// });

// // Upload images
// const uploadImages = async (files) => {
//   const images = [];
//   for (const file of files.slice(0, 5)) {
//     const result = await new Promise((resolve, reject) => {
//       const stream = cloudinary.uploader.upload_stream(
//         { folder: 'rooms' },
//         (error, result) => error ? reject(error) : resolve(result)
//       );
//       stream.end(file.buffer);
//     });
//     images.push(result.secure_url);
//   }
//   return images;
// };

// // Sanitize room input (FIXED — removed location)
// const sanitizeRoomInput = (body) => {
//   const sanitized = {
//     roomType: validator.escape(validator.trim(body.roomType || '')),
//     numberOfRooms: Number(body.numberOfRooms),
//     size: Number(body.size),
//     beds: Number(body.beds),
//     occupancy: Number(body.occupancy),
//     roomDetails: body.roomDetails ? validator.escape(validator.trim(body.roomDetails)) : '',
//     roomFeatures: body.roomFeatures ? validator.escape(validator.trim(body.roomFeatures)) : '',
//     bathroomAmenities: body.bathroomAmenities ? validator.escape(validator.trim(body.bathroomAmenities)) : '',
//     optional: body.optional ? validator.escape(validator.trim(body.optional)) : '',
//     price: Number(body.price)
//   };

//   if (
//     !sanitized.roomType ||
//     isNaN(sanitized.numberOfRooms) ||
//     isNaN(sanitized.size) ||
//     isNaN(sanitized.beds) ||
//     isNaN(sanitized.occupancy) ||
//     isNaN(sanitized.price)
//   ) {
//     throw new Error("Missing or invalid required fields");
//   }

//   if (sanitized.numberOfRooms <= 0 || sanitized.price <= 0) {
//     throw new Error("Number of rooms and price must be greater than 0");
//   }

//   return sanitized;
// };

// // ================================
// // CREATE ROOM  (FIXED)
// // ================================
// exports.createRoom = async (req, res) => {
//   try {
//     if (!req.body.roomType || !req.body.numberOfRooms || !req.body.price) {
//       return res.status(400).json({
//         success: false,
//         message: "Missing required fields: roomType, numberOfRooms, price."
//       });
//     }

//     const cleanData = sanitizeRoomInput(req.body);

//     if (!req.body.roomNumbers || !req.body.roomNumbers.trim()) {
//       return res.status(400).json({
//         success: false,
//         message: "Room numbers required (comma separated)."
//       });
//     }

//     let roomNumbersArr = [];

//     try {
//       const parsed = JSON.parse(req.body.roomNumbers);
//       if (Array.isArray(parsed)) {
//         roomNumbersArr = parsed.map((x) => String(x).trim());
//       }
//     } catch {
//       roomNumbersArr = req.body.roomNumbers
//         .replace(/[\[\]\"]/g, "")
//         .split(",")
//         .map((x) => x.trim())
//         .filter((x) => x !== "");
//     }

//     if (roomNumbersArr.length !== Number(cleanData.numberOfRooms)) {
//       return res.status(400).json({
//         success: false,
//         message: `Mismatch: numberOfRooms = ${cleanData.numberOfRooms}, but ${roomNumbersArr.length} room numbers provided.`
//       });
//     }

//     let images = [];
//     if (req.files?.length > 0) {
//       images = await uploadImages(req.files);
//     }

//     const newRoom = new Room({
//       ...cleanData,
//       roomNumbers: roomNumbersArr,
//       images
//     });

//     await newRoom.save();

//     return res.status(201).json({
//       success: true,
//       message: "Room created successfully",
//       room: newRoom
//     });
//   } catch (error) {
//     if (error.code === 11000 && error.keyPattern?.roomType) {
//       return res.status(400).json({
//         success: false,
//         message: `Room type '${req.body.roomType}' already exists`
//       });
//     }

//     return res.status(500).json({
//       success: false,
//       message: "Server error while creating room",
//       error: error.message
//     });
//   }
// };

// // ================================
// // UPDATE ROOM (FIXED — removed location)
// // ================================
// exports.updateRoom = async (req, res) => {
//   try {
//     const roomId = req.params.id;
//     const room = await Room.findById(roomId);

//     if (!room) {
//       return res.status(404).json({ success: false, message: "Room not found" });
//     }

//     const fields = [
//       "roomType",
//       "price",
//       "numberOfRooms",
//       "size",
//       "beds",
//       "occupancy",
//       "roomDetails",
//       "optional",
//     ];

//     fields.forEach((field) => {
//       if (req.body[field] !== undefined) {
//         room[field] = validator.escape(validator.trim(req.body[field]));
//       }
//     });

//     if (req.body.roomNumbers) {
//       let roomNumbersArr = [];

//       try {
//         const parsed = JSON.parse(req.body.roomNumbers);
//         if (Array.isArray(parsed)) {
//           roomNumbersArr = parsed.map((x) => String(x).trim());
//         }
//       } catch {
//         roomNumbersArr = req.body.roomNumbers
//           .replace(/[\[\]\"]/g, "")
//           .split(",")
//           .map((r) => r.trim())
//           .filter((s) => s !== "");
//       }

//       if (roomNumbersArr.length !== Number(room.numberOfRooms)) {
//         return res.status(400).json({
//           success: false,
//           message: `Room numbers count (${roomNumbersArr.length}) does not match numberOfRooms (${room.numberOfRooms}).`,
//         });
//       }

//       room.roomNumbers = roomNumbersArr;
//     }

//     if (req.body.roomFeatures) {
//       room.roomFeatures = Array.isArray(req.body.roomFeatures)
//         ? req.body.roomFeatures.join(", ")
//         : validator.escape(validator.trim(req.body.roomFeatures));
//     }

//     if (req.body.bathroomAmenities) {
//       room.bathroomAmenities = Array.isArray(req.body.bathroomAmenities)
//         ? req.body.bathroomAmenities.join(", ")
//         : validator.escape(validator.trim(req.body.bathroomAmenities));
//     }

//     let updatedImages = [];

//     if (req.body.existingImages) {
//       try {
//         updatedImages =
//           typeof req.body.existingImages === "string"
//             ? JSON.parse(req.body.existingImages)
//             : req.body.existingImages;
//       } catch {}
//     }

//     if (req.files && req.files.length > 0) {
//       const newImgs = await uploadImages(req.files);
//       updatedImages = [...updatedImages, ...newImgs];
//     }

//     if (updatedImages.length > 0) {
//       room.images = updatedImages;
//     }

//     await room.save();

//     res.status(200).json({ success: true, message: "Room updated successfully", room });
//   } catch (error) {
//     res.status(500).json({
//       success: false,
//       message: "Server error while updating room",
//       error: error.message
//     });
//   }
// };

// // ================================
// // GET all rooms
// // ================================
// exports.getAllRooms = async (req, res) => {
//   try {
//     const rooms = await Room.find();
//     res.status(200).json({ message: "All Rooms retrieved successfully", rooms });
//   } catch (error) {
//     res.status(500).json({ message: "Server error", error: error.message });
//   }
// };

// // ================================
// // GET first 2 rooms
// // ================================
// exports.getFirstTwoRooms = async (req, res) => {
//   try {
//     const rooms = await Room.find().limit(2);
//     if (!rooms || rooms.length === 0) {
//       return res.status(404).json({ message: "No rooms found" });
//     }
//     res.status(200).json({ message: "First two rooms retrieved successfully", rooms });
//   } catch (error) {
//     res.status(500).json({ message: "Server error", error: error.message });
//   }
// };

// // ================================
// // GET room by ID
// // ================================
// exports.getRoomById = async (req, res) => {
//   try {
//     const { id } = req.params;
//     if (!validator.isMongoId(id)) {
//       return res.status(400).json({ message: "Invalid Room ID" });
//     }

//     const room = await Room.findById(id);
//     if (!room) return res.status(404).json({ message: "Room not found" });

//     res.status(200).json({ message: "Room retrieved successfully", room });
//   } catch (error) {
//     res.status(500).json({ message: "Server error", error: error.message });
//   }
// };

// // ================================
// // DELETE room
// // ================================
// exports.deleteRoom = async (req, res) => {
//   try {
//     const { id } = req.params;
//     if (!validator.isMongoId(id)) {
//       return res.status(400).json({ message: "Invalid Room ID" });
//     }

//     const room = await Room.findById(id);
//     if (!room) return res.status(404).json({ message: "Room not found" });

//     if (room.images && room.images.length > 0) {
//       for (const url of room.images) {
//         const publicId = url.split('/').pop().split('.')[0];
//         await cloudinary.uploader.destroy(`rooms/${publicId}`).catch(() => {});
//       }
//     }

//     await room.deleteOne();
//     res.status(200).json({ message: "Room deleted successfully" });
//   } catch (error) {
//     res.status(500).json({ message: "Server error", error: error.message });
//   }
// };

// // ================================
// // FIXED — Get Available Rooms (NO LOCATION)
// // ================================
// exports.getAvailableRoomsByDate = async (req, res) => {
//   try {
//     let { date, checkIn, checkOut, adults, children, roomsRequested } = req.query;

//     if (date && !checkIn && !checkOut) {
//       checkIn = date;
//       const nextDay = new Date(date);
//       nextDay.setDate(nextDay.getDate() + 1);
//       checkOut = nextDay.toISOString().split("T")[0];
//     }

//     if (!checkIn || !checkOut) {
//       return res.status(400).json({ message: "Please provide check-in and check-out dates" });
//     }

//     if (!validator.isISO8601(checkIn) || !validator.isISO8601(checkOut)) {
//       return res.status(400).json({ message: "Invalid date format" });
//     }

//     checkIn = new Date(checkIn);
//     checkOut = new Date(checkOut);

//     const inclusiveCheckOut = new Date(checkOut);
//     inclusiveCheckOut.setDate(inclusiveCheckOut.getDate() + 1);

//     const rooms = await Room.find();
//     const availableRooms = [];

//     for (const room of rooms) {
//       const overlappingBookings = await Booking.find({
//         "rooms.roomType": room.roomType,
//         status: { $in: ["confirmed", "checked_in", "pending"] },
//         checkIn: { $lt: inclusiveCheckOut },
//         checkOut: { $gte: checkIn },
//       });

//       let roomsBooked = 0;
//       let roomsReserved = 0;

//       overlappingBookings.forEach((b) => {
//         const bookedRoom = b.rooms.find((r) => r.roomType === room.roomType);
//         if (!bookedRoom) return;
//         if (b.status === "pending") roomsReserved += bookedRoom.quantity;
//         else roomsBooked += bookedRoom.quantity;
//       });

//       const availableCount = room.numberOfRooms - (roomsBooked + roomsReserved);
//       if (availableCount <= 0) continue;

//       availableRooms.push({
//         roomType: room.roomType,
//         totalRooms: room.numberOfRooms,
//         bookedRooms: roomsBooked,
//         reservedRooms: roomsReserved,
//         availableRooms: availableCount,
//         price: room.price,
//         occupancy: room.occupancy,
//         size: room.size,
//         beds: room.beds,
//         roomDetails: room.roomDetails,
//         roomFeatures: room.roomFeatures,
//         bathroomAmenities: room.bathroomAmenities,
//         optional: room.optional,
//         images: room.images,
//       });
//     }

//     res.status(200).json({
//       message:
//         availableRooms.length > 0
//           ? "Available rooms fetched successfully."
//           : "No rooms available for the selected date(s).",
//       availableRooms,
//     });
//   } catch (error) {
//     res.status(500).json({ message: "Server error", error: error.message });
//   }
// };

// // ================================
// // FIXED — Get Room Availability (NO LOCATION)
// // ================================
// exports.getRoomAvailability = async (req, res) => {
//   try {
//     const { roomType } = req.params;
//     let { checkIn, checkOut } = req.query;

//     if (!checkIn || !checkOut) {
//       return res.status(400).json({ message: "Please provide check-in and check-out dates" });
//     }

//     if (!validator.isISO8601(checkIn) || !validator.isISO8601(checkOut)) {
//       return res.status(400).json({ message: "Invalid date format" });
//     }

//     const room = await Room.findOne({ roomType: validator.escape(roomType) });
//     if (!room) {
//       return res.status(404).json({ message: `Room type ${roomType} not found` });
//     }

//     checkIn = new Date(checkIn);
//     checkOut = new Date(checkOut);

//     const overlappingBookings = await Booking.find({
//       "rooms.roomType": roomType,
//       status: { $in: ["confirmed", "checked_in", "pending"] },
//       $or: [{ checkIn: { $lt: checkOut }, checkOut: { $gt: checkIn } }],
//     });

//     let roomsBooked = 0;
//     let roomsReserved = 0;

//     overlappingBookings.forEach((b) => {
//       const bookedRoom = b.rooms.find((r) => r.roomType === roomType);
//       if (!bookedRoom) return;
//       if (b.status === "pending") roomsReserved += bookedRoom.quantity;
//       else roomsBooked += bookedRoom.quantity;
//     });

//     const roomsAvailable = room.numberOfRooms - (roomsReserved + roomsBooked);

//     if (roomsAvailable <= 0) {
//       return res.status(200).json({ message: `No ${roomType} rooms available for selected dates.` });
//     }

//     res.status(200).json({
//       message: `${roomsAvailable} ${roomType} room(s) available.`,
//       roomType,
//       roomsAvailable,
//       roomsReserved,
//       roomsBooked,
//       totalRooms: room.numberOfRooms,
//       price: room.price,
//       occupancy: room.occupancy,
//       size: room.size,
//       beds: room.beds,
//       roomDetails: room.roomDetails,
//       images: room.images
//     });
//   } catch (error) {
//     res.status(500).json({ message: "Server error", error: error.message });
//   }
// };

// // ================================
// // Get Room Types with Price
// // ================================
// exports.getRoomTypes = async (req, res) => {
//   try {
//     const rooms = await Room.find({}, "roomType price");

//     if (!rooms || rooms.length === 0) {
//       return res.status(404).json({ success: false, message: "No room types found" });
//     }

//     const roomTypes = rooms.map((r) => ({
//       roomType: r.roomType,
//       price: r.price
//     }));

//     res.status(200).json({
//       success: true,
//       message: "Room types fetched successfully",
//       roomTypes
//     });
//   } catch (error) {
//     res.status(500).json({ success: false, message: "Server error", error: error.message });
//   }
// };

// // ================================
// // Get available room numbers
// // ================================
// exports.getAvailableRoomNumbers = async (req, res) => {
//   try {
//     const { roomType } = req.params;
//     let { checkIn, checkOut } = req.query;

//     if (!roomType) {
//       return res.status(400).json({ message: "Room type is required" });
//     }

//     if (!checkIn || !checkOut) {
//       return res.status(400).json({ message: "Please provide check-in and check-out dates" });
//     }

//     if (!validator.isISO8601(checkIn) || !validator.isISO8601(checkOut)) {
//       return res.status(400).json({ message: "Invalid date format" });
//     }

//     checkIn = new Date(checkIn);
//     checkOut = new Date(checkOut);

//     const room = await Room.findOne({ roomType });
//     if (!room) {
//       return res.status(404).json({ message: `Room type '${roomType}' not found` });
//     }

//     const allRooms = room.roomNumbers;

//     const overlappingBookings = await Booking.find({
//       "rooms.roomType": roomType,
//       status: { $in: ["pending", "confirmed", "checked_in"] },
//       checkIn: { $lt: checkOut },
//       checkOut: { $gt: checkIn },
//     });

//     let bookedNumbers = [];

//     overlappingBookings.forEach((b) => {
//       if (Array.isArray(b.assignedRoom)) {
//         bookedNumbers.push(...b.assignedRoom);
//       }
//     });

//     bookedNumbers = [...new Set(bookedNumbers)];

//     const availableRoomNumbers = allRooms.filter((n) => !bookedNumbers.includes(n));

//     return res.status(200).json({
//       success: true,
//       message: "Available room numbers fetched successfully",
//       roomType,
//       totalRooms: allRooms.length,
//       assignedRoom: bookedNumbers,
//       availableRoomNumbers,
//     });
//   } catch (error) {
//     res.status(500).json({ message: "Server error", error: error.message });
//   }
// };

// const Room = require('../models/roomModel');
// const Booking = require('../models/bookingModels');
// const cloudinary = require('cloudinary').v2;
// const validator = require('validator');

// cloudinary.config({
//   cloud_name: process.env.CLOUD_NAME,
//   api_key: process.env.CLOUD_API_KEY,
//   api_secret: process.env.CLOUD_API_SECRET
// });

// // Upload images
// const uploadImages = async (files) => {
//   const images = [];
//   for (const file of files.slice(0, 5)) {
//     const result = await new Promise((resolve, reject) => {
//       const stream = cloudinary.uploader.upload_stream(
//         { folder: 'rooms' },
//         (error, result) => error ? reject(error) : resolve(result)
//       );
//       stream.end(file.buffer);
//     });
//     images.push(result.secure_url);
//   }
//   return images;
// };

// // Clean input
// const sanitizeRoomInput = (body) => {
//   const sanitized = {
//     roomType: validator.escape(validator.trim(body.roomType || '')),
//     numberOfRooms: Number(body.numberOfRooms),
//     size: Number(body.size),
//     beds: Number(body.beds),
//     occupancy: Number(body.occupancy),
//     // location: validator.escape(validator.trim(body.location || '')),
//     roomDetails: body.roomDetails ? validator.escape(validator.trim(body.roomDetails)) : '',
//     roomFeatures: body.roomFeatures ? validator.escape(validator.trim(body.roomFeatures)) : '',
//     bathroomAmenities: body.bathroomAmenities ? validator.escape(validator.trim(body.bathroomAmenities)) : '',
//     optional: body.optional ? validator.escape(validator.trim(body.optional)) : '',
//     price: Number(body.price)
//   };

//   if (!sanitized.roomType || isNaN(sanitized.numberOfRooms) || isNaN(sanitized.size) ||
//       isNaN(sanitized.beds) || isNaN(sanitized.occupancy) ||
//       !sanitized.location || isNaN(sanitized.price)) {
//     throw new Error("Missing or invalid required fields");
//   }
//   if (sanitized.numberOfRooms <= 0 || sanitized.price <= 0) {
//     throw new Error("Number of rooms and price must be greater than 0");
//   }
//   return sanitized;
// };
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

//     // ⭐ FIX ROOM NUMBERS (AGGRESSIVE CLEAN)
//     if (!req.body.roomNumbers || !req.body.roomNumbers.trim()) {
//       return res.status(400).json({
//         success: false,
//         message: "Room numbers required (comma separated, e.g. 101,102,103)"
//       });
//     }

//     let roomNumbersArr = [];

//     // Case 1: JSON array from frontend
//     try {
//       const parsed = JSON.parse(req.body.roomNumbers);
//       if (Array.isArray(parsed)) {
//         roomNumbersArr = parsed.map((x) => String(x).trim());
//       }
//     } catch {
//       // Case 2: Plain text: "101, 102, 103"
//       roomNumbersArr = req.body.roomNumbers
//         .replace(/[\[\]\"]/g, "") // Remove brackets & quotes
//         .split(",")
//         .map((x) => x.trim())
//         .filter((x) => x !== "");
//     }

//     // ⭐ Validate number count
//     if (roomNumbersArr.length !== Number(cleanData.numberOfRooms)) {
//       return res.status(400).json({
//         success: false,
//         message: `Mismatch: numberOfRooms = ${cleanData.numberOfRooms}, but ${roomNumbersArr.length} room numbers provided.`
//       });
//     }

//     // ⭐ Upload images
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

//     // ⭐ CREATE ROOM
//     const newRoom = new Room({
//       ...cleanData,
//       roomNumbers: roomNumbersArr,   // FINAL CLEAN FIX
//       images
//     });

//     await newRoom.save();

//     return res.status(201).json({
//       success: true,
//       message: "Room created successfully",
//       room: newRoom
//     });

//   } catch (error) {
//     // Handle duplicated roomTypes
//     if (error.code === 11000 && error.keyPattern?.roomType) {
//       return res.status(400).json({
//         success: false,
//         message: `Room type '${req.body.roomType}' already exists. Use update instead or choose another roomType.`
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
//     const roomId = req.params.id;
//     const room = await Room.findById(roomId);

//     if (!room) {
//       return res.status(404).json({
//         success: false,
//         message: "Room not found",
//       });
//     }

//     // ⭐ UPDATE GENERAL FIELDS
//     const fields = [
//       "roomType",
//       "price",
//       "numberOfRooms",
//       "size",
//       "beds",
//       "occupancy",
//       // "location",
//       "roomDetails",
//       "optional",
//     ];

//     fields.forEach((field) => {
//       if (req.body[field] !== undefined) {
//         room[field] = validator.escape(validator.trim(req.body[field]));
//       }
//     });

//     // ⭐ CLEAN + PARSE ROOM NUMBERS (FINAL FIX)
//     if (req.body.roomNumbers) {
//       let roomNumbersArr = [];

//       // Try JSON parse first
//       try {
//         const parsed = JSON.parse(req.body.roomNumbers);

//         if (Array.isArray(parsed)) {
//           roomNumbersArr = parsed.map((x) => String(x).trim());
//         }
//       } catch {
//         // If not JSON, treat as "101, 102, 103"
//         roomNumbersArr = req.body.roomNumbers
//           .replace(/[\[\]\"]/g, "") // remove brackets & quotes
//           .split(",")
//           .map((r) => r.trim())
//           .filter((s) => s !== "");
//       }

//       // Validate number count
//       if (roomNumbersArr.length !== Number(room.numberOfRooms)) {
//         return res.status(400).json({
//           success: false,
//           message: `Room numbers count (${roomNumbersArr.length}) does not match numberOfRooms (${room.numberOfRooms}).`,
//         });
//       }

//       room.roomNumbers = roomNumbersArr;
//     }

//     // ⭐ UPDATE ROOM FEATURES
//     if (req.body.roomFeatures) {
//       if (Array.isArray(req.body.roomFeatures)) {
//         room.roomFeatures = req.body.roomFeatures.join(", ");
//       } else {
//         room.roomFeatures = validator.escape(
//           validator.trim(req.body.roomFeatures)
//         );
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

//     // ⭐ IMAGE HANDLING
//     let updatedImages = [];

//     // Existing images
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

//     // New uploaded images
//     if (req.files && req.files.length > 0) {
//       const newImgs = await uploadImages(req.files);
//       updatedImages = [...updatedImages, ...newImgs];
//     }

//     if (updatedImages.length > 0) {
//       room.images = updatedImages;
//     }

//     // ⭐ SAVE ROOM
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


// // ---------------- Get all rooms ----------------
// exports.getAllRooms = async (req, res) => {
//   try {
//     const rooms = await Room.find();
//     res.status(200).json({ message: 'All Rooms retrieved successfully', rooms });
//   } catch (error) {
//     console.error(error);
//     res.status(500).json({ message: 'Server error', error: error.message });
//   }
// };
// // ---------------- Get first two rooms ----------------
// exports.getFirstTwoRooms = async (req, res) => {
//   try {
//     // Fetch only the first 2 rooms from the collection
//     const rooms = await Room.find().limit(2);

//     if (!rooms || rooms.length === 0) {
//       return res.status(404).json({ message: 'No rooms found' });
//     }

//     res.status(200).json({
//       message: 'First two rooms retrieved successfully',
//       rooms,
//     });
//   } catch (error) {
//     console.error('Error fetching first two rooms:', error);
//     res.status(500).json({
//       message: 'Server error',
//       error: error.message,
//     });
//   }
// };

// // ---------------- Get room by ID ----------------
// exports.getRoomById = async (req, res) => {
//   try {
//     const { id } = req.params;
//     if (!validator.isMongoId(id)) return res.status(400).json({ message: 'Invalid Room ID' });

//     const room = await Room.findById(id);
//     if (!room) return res.status(404).json({ message: 'Room not found' });

//     res.status(200).json({ message: 'Room retrieved successfully', room });
//   } catch (error) {
//     console.error('GET ROOM BY ID ERROR:', error);
//     res.status(500).json({ message: 'Server error', error: error.message });
//   }
// };

// // ---------------- Delete room ----------------
// exports.deleteRoom = async (req, res) => {
//   try {
//     const { id } = req.params;
//     if (!validator.isMongoId(id)) return res.status(400).json({ message: 'Invalid Room ID' });

//     const room = await Room.findById(id);
//     if (!room) return res.status(404).json({ message: 'Room not found' });

//     if (room.images && room.images.length > 0) {
//       for (const url of room.images) {
//         const publicId = url.split('/').pop().split('.')[0];
//         await cloudinary.uploader.destroy(`rooms/${publicId}`).catch(err => console.warn(err));
//       }
//     }

//     await room.deleteOne();
//     res.status(200).json({ message: 'Room deleted successfully' });
//   } catch (error) {
//     console.error('DELETE ROOM ERROR:', error);
//     res.status(500).json({ message: 'Server error', error: error.message });
//   }
// };

// exports.getAvailableRoomsByDate = async (req, res) => {
//   try {
//     let { date, checkIn, checkOut, adults, children, roomsRequested } = req.query;

//     // 🟢 If only a single date is provided, make it a 1-day inclusive range
//     if (date && !checkIn && !checkOut) {
//       checkIn = date;
//       const nextDay = new Date(date);
//       nextDay.setDate(nextDay.getDate() + 1);
//       checkOut = nextDay.toISOString().split("T")[0];
//     }

//     // 🟢 Validate date input
//     if (!checkIn || !checkOut)
//       return res.status(400).json({ message: "Please provide check-in and check-out dates" });

//     if (!validator.isISO8601(checkIn) || !validator.isISO8601(checkOut))
//       return res.status(400).json({ message: "Invalid date format" });

//     // Convert to Date objects
//     checkIn = new Date(checkIn);
//     checkOut = new Date(checkOut);

//     // 🟢 Make both days inclusive — extend checkOut by 1 full day (so 12→13 blocks both)
//     const inclusiveCheckOut = new Date(checkOut);
//     inclusiveCheckOut.setDate(inclusiveCheckOut.getDate() + 1);

//     const rooms = await Room.find();
//     const availableRooms = [];

//     for (const room of rooms) {
//       // 🟢 Find all bookings that overlap (inclusive)
//       const overlappingBookings = await Booking.find({
//         "rooms.roomType": room.roomType,
//         status: { $in: ["confirmed", "checked_in", "pending"] },
//         checkIn: { $lt: inclusiveCheckOut },
//         checkOut: { $gte: checkIn },
//       });

//       let roomsBooked = 0;
//       let roomsReserved = 0;

//       overlappingBookings.forEach((b) => {
//         const bookedRoom = b.rooms.find((r) => r.roomType === room.roomType);
//         if (!bookedRoom) return;
//         if (b.status === "pending") roomsReserved += bookedRoom.quantity;
//         else roomsBooked += bookedRoom.quantity;
//       });

//       const availableCount = room.numberOfRooms - (roomsBooked + roomsReserved);
//       if (availableCount <= 0) continue;

//       // 🟢 Apply optional filters
//       if ((adults && adults > room.occupancy) || (children && children > room.beds)) continue;
//       if (roomsRequested && roomsRequested > availableCount) continue;

//       // 🟢 Push formatted room data
//       availableRooms.push({
//         roomType: room.roomType,
//         totalRooms: room.numberOfRooms,
//         bookedRooms: roomsBooked,
//         reservedRooms: roomsReserved,
//         availableRooms: availableCount,
//         price: room.price,
//         occupancy: room.occupancy,
//         size: room.size,
//         beds: room.beds,
//         location: room.location,
//         roomDetails: room.roomDetails,
//         roomFeatures: room.roomFeatures,
//         bathroomAmenities: room.bathroomAmenities,
//         optional: room.optional,
//         images: room.images,
//       });
//     }

//     res.status(200).json({
//       message:
//         availableRooms.length > 0
//           ? "Available rooms fetched successfully."
//           : "No rooms available for the selected date(s).",
//       availableRooms,
//     });
//   } catch (error) {
//     console.error("GET AVAILABLE ROOMS ERROR:", error);
//     res.status(500).json({ message: "Server error", error: error.message });
//   }
// };

// // ---------------- Get room availability by type ----------------
// exports.getRoomAvailability = async (req, res) => {
//   try {
//     const { roomType } = req.params;
//     let { checkIn, checkOut, adults, children, roomsRequested } = req.query;

//     if (!checkIn || !checkOut)
//       return res.status(400).json({ message: "Please provide check-in and check-out dates" });

//     if (!validator.isISO8601(checkIn) || !validator.isISO8601(checkOut))
//       return res.status(400).json({ message: "Invalid date format" });

//     const room = await Room.findOne({ roomType: validator.escape(roomType) });
//     if (!room) return res.status(404).json({ message: `Room type ${roomType} not found` });

//     checkIn = new Date(checkIn);
//     checkOut = new Date(checkOut);

//     const overlappingBookings = await Booking.find({
//       'rooms.roomType': roomType,
//       status: { $in: ['confirmed', 'checked_in', 'pending'] },
//       $or: [{ checkIn: { $lt: checkOut }, checkOut: { $gt: checkIn } }]
//     });

//     let roomsBooked = 0, roomsReserved = 0;
//     overlappingBookings.forEach(b => {
//       const bookedRoom = b.rooms.find(r => r.roomType === roomType);
//       if (!bookedRoom) return;
//       if (b.status === 'pending') roomsReserved += bookedRoom.quantity;
//       else roomsBooked += bookedRoom.quantity;
//     });

//     const roomsAvailable = room.numberOfRooms - (roomsReserved + roomsBooked);

//     if (roomsAvailable <= 0 || (roomsRequested && roomsRequested > roomsAvailable))
//       return res.status(200).json({ message: `No ${roomType} rooms available for selected dates.` });

//     res.status(200).json({
//       message: `${roomsAvailable} ${roomType} room(s) available.`,
//       roomType,
//       roomsAvailable,
//       roomsReserved,
//       roomsBooked,
//       totalRooms: room.numberOfRooms,
//       price: room.price,
//       occupancy: room.occupancy,
//       size: room.size,
//       beds: room.beds,
//       location: room.location,
//       roomDetails: room.roomDetails,
//       images: room.images
//     });
//   } catch (error) {
//     console.error("GET ROOM AVAILABILITY ERROR:", error);
//     res.status(500).json({ message: "Server error", error: error.message });
//   }
// };
// // ---------------- Get room types WITH price ----------------
// exports.getRoomTypes = async (req, res) => {
//   try {
//     // Fetch only roomType + price
//     const rooms = await Room.find({}, "roomType price");

//     if (!rooms || rooms.length === 0) {
//       return res.status(404).json({
//         success: false,
//         message: "No room types found"
//       });
//     }

//     // Format data: [{ roomType, price }]
//     const roomTypes = rooms.map(r => ({
//       roomType: r.roomType,
//       price: r.price
//     }));

//     res.status(200).json({
//       success: true,
//       message: "Room types fetched successfully",
//       roomTypes
//     });

//   } catch (error) {
//     console.error("GET ROOM TYPES ERROR:", error);
//     res.status(500).json({
//       success: false,
//       message: "Server error",
//       error: error.message
//     });
//   }
// };
// // ---------------- Get available room numbers for a room type ----------------
// exports.getAvailableRoomNumbers = async (req, res) => {
//   try {
//     const { roomType } = req.params;
//     let { checkIn, checkOut } = req.query;

//     if (!roomType)
//       return res.status(400).json({ message: "Room type is required" });

//     if (!checkIn || !checkOut)
//       return res.status(400).json({ message: "Please provide check-in and check-out dates" });

//     if (!validator.isISO8601(checkIn) || !validator.isISO8601(checkOut))
//       return res.status(400).json({ message: "Invalid date format" });

//     checkIn = new Date(checkIn);
//     checkOut = new Date(checkOut);

//     const room = await Room.findOne({ roomType });
//     if (!room)
//       return res.status(404).json({ message: `Room type '${roomType}' not found` });

//     const allRooms = room.roomNumbers;

//     // Find bookings that overlap AND match the roomType
//     const overlappingBookings = await Booking.find({
//       "rooms.roomType": roomType,
//       status: { $in: ["pending", "confirmed", "checked_in"] },
//       checkIn: { $lt: checkOut },
//       checkOut: { $gt: checkIn }
//     });

//     // Collect booked rooms from top-level assignedRoom array
//     let bookedNumbers = [];

//     overlappingBookings.forEach(b => {
//       if (Array.isArray(b.assignedRoom)) {
//         bookedNumbers.push(...b.assignedRoom);
//       }
//     });

//     bookedNumbers = [...new Set(bookedNumbers)];

//     const availableRoomNumbers = allRooms.filter(n => !bookedNumbers.includes(n));

//     return res.status(200).json({
//       success: true,
//       message: "Available room numbers fetched successfully",
//       roomType,
//       totalRooms: allRooms.length,
//       assignedRoom: bookedNumbers,
//       availableRoomNumbers
//     });

//   } catch (error) {
//     console.error("GET AVAILABLE ROOM NUMBERS ERROR:", error);
//     res.status(500).json({ message: "Server error", error: error.message });
//   }
// };

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


// ================================
// CREATE ROOM  (FIXED)
// ================================
// exports.createRoom = async (req, res) => {
//   try {
//     if (!req.body.roomType || !req.body.numberOfRooms || !req.body.price) {
//       return res.status(400).json({
//         success: false,
//         message: "Missing required fields: roomType, numberOfRooms, price."
//       });
//     }

//     const cleanData = sanitizeRoomInput(req.body);

//     if (!req.body.roomNumbers || !req.body.roomNumbers.trim()) {
//       return res.status(400).json({
//         success: false,
//         message: "Room numbers required (comma separated)."
//       });
//     }

//     let roomNumbersArr = [];

//     try {
//       const parsed = JSON.parse(req.body.roomNumbers);
//       if (Array.isArray(parsed)) {
//         roomNumbersArr = parsed.map((x) => String(x).trim());
//       }
//     } catch {
//       roomNumbersArr = req.body.roomNumbers
//         .replace(/[\[\]\"]/g, "")
//         .split(",")
//         .map((x) => x.trim())
//         .filter((x) => x !== "");
//     }

//     if (roomNumbersArr.length !== Number(cleanData.numberOfRooms)) {
//       return res.status(400).json({
//         success: false,
//         message: `Mismatch: numberOfRooms = ${cleanData.numberOfRooms}, but ${roomNumbersArr.length} room numbers provided.`
//       });
//     }

//     let images = [];
//     if (req.files?.length > 0) {
//       images = await uploadImages(req.files);
//     }

//     const newRoom = new Room({
//       ...cleanData,
//       roomNumbers: roomNumbersArr,
//       images
//     });

//     await newRoom.save();

//     return res.status(201).json({
//       success: true,
//       message: "Room created successfully",
//       room: newRoom
//     });
//   } catch (error) {
//     if (error.code === 11000 && error.keyPattern?.roomType) {
//       return res.status(400).json({
//         success: false,
//         message: `Room type '${req.body.roomType}' already exists`
//       });
//     }

//     return res.status(500).json({
//       success: false,
//       message: "Server error while creating room",
//       error: error.message
//     });
//   }
// };
// ================================
// CREATE ROOM (WITH SINGLE / DOUBLE INPUTS)
// ================================
// exports.createRoom = async (req, res) => {
//   try {
//     if (!req.body.roomType || !req.body.numberOfRooms || !req.body.price) {
//       return res.status(400).json({
//         success: false,
//         message: "Missing required fields: roomType, numberOfRooms, price."
//       });
//     }

//     const cleanData = sanitizeRoomInput(req.body);

//     // ================================
//     // 1. GET SINGLE OCCUPANCY ROOMS
//     // ================================
//     let singleRooms = [];
//     if (req.body.singleRooms) {
//       try {
//         singleRooms = JSON.parse(req.body.singleRooms);
//       } catch {
//         singleRooms = req.body.singleRooms
//           .replace(/[\[\]\"]/g, "")
//           .split(",")
//           .map(x => x.trim())
//           .filter(x => x !== "");
//       }
//     }

//     // ================================
//     // 2. GET DOUBLE OCCUPANCY ROOMS
//     // ================================
//     let doubleRooms = [];
//     if (req.body.doubleRooms) {
//       try {
//         doubleRooms = JSON.parse(req.body.doubleRooms);
//       } catch {
//         doubleRooms = req.body.doubleRooms
//           .replace(/[\[\]\"]/g, "")
//           .split(",")
//           .map(x => x.trim())
//           .filter(x => x !== "");
//       }
//     }

//     // ================================
//     // 3. COMBINE THEM INTO FINAL ARRAYS
//     // ================================
//     const roomNumbersArr = [...singleRooms, ...doubleRooms];

//     const roomOccupancyArr = [
//       ...singleRooms.map(() => "single"),
//       ...doubleRooms.map(() => "double")
//     ];

//     // ================================
//     // Validate room count
//     // ================================
//     if (roomNumbersArr.length !== Number(cleanData.numberOfRooms)) {
//       return res.status(400).json({
//         success: false,
//         message: `Mismatch: numberOfRooms = ${cleanData.numberOfRooms}, but ${roomNumbersArr.length} room numbers provided.`
//       });
//     }

//     // ================================
//     // Upload Images
//     // ================================
//     let images = [];
//     if (req.files?.length > 0) {
//       images = await uploadImages(req.files);
//     }

//     // ================================
//     // Save Room
//     // ================================
//     const newRoom = new Room({
//       ...cleanData,
//       roomNumbers: roomNumbersArr,
//       roomOccupancy: roomOccupancyArr,
//       images
//     });

//     await newRoom.save();

//     return res.status(201).json({
//       success: true,
//       message: "Room created successfully",
//       room: newRoom
//     });

//   } catch (error) {
//     if (error.code === 11000 && error.keyPattern?.roomType) {
//       return res.status(400).json({
//         success: false,
//         message: `Room type '${req.body.roomType}' already exists`
//       });
//     }

//     return res.status(500).json({
//       success: false,
//       message: "Server error while creating room",
//       error: error.message
//     });
//   }
// // };
// exports.createRoom = async (req, res) => {
//   try {
//     if (!req.body.roomType || !req.body.numberOfRooms || !req.body.price) {
//       return res.status(400).json({
//         success: false,
//         message: "Missing required fields: roomType, numberOfRooms, price."
//       });
//     }

//     const cleanData = sanitizeRoomInput(req.body);

//     // ===================================================
//     // SAFE NUMBER PARSER (prevents NaN errors)
//     // ===================================================
//     const toNumber = (value) => {
//       const num = Number(value);
//       return isNaN(num) ? 0 : num;
//     };

//     // ===================================================
//     // 1. SINGLE ROOMS
//     // ===================================================
//     let singleRooms = [];
//     if (req.body.singleRooms) {
//       try {
//         singleRooms = JSON.parse(req.body.singleRooms);
//       } catch {
//         singleRooms = req.body.singleRooms
//           .replace(/[\[\]\"]/g, "")
//           .split(",")
//           .map(x => x.trim())
//           .filter(x => x !== "");
//       }
//     }

//     // ===================================================
//     // 2. DOUBLE ROOMS
//     // ===================================================
//     let doubleRooms = [];
//     if (req.body.doubleRooms) {
//       try {
//         doubleRooms = JSON.parse(req.body.doubleRooms);
//       } catch {
//         doubleRooms = req.body.doubleRooms
//           .replace(/[\[\]\"]/g, "")
//           .split(",")
//           .map(x => x.trim())
//           .filter(x => x !== "");
//       }
//     }

//     // ===================================================
//     // 3. MERGE ROOMS + OCCUPANCY
//     // ===================================================
//     const roomNumbersArr = [...singleRooms, ...doubleRooms];
//     const roomOccupancyArr = [
//       ...singleRooms.map(() => "single"),
//       ...doubleRooms.map(() => "double")
//     ];

//     if (roomNumbersArr.length !== Number(cleanData.numberOfRooms)) {
//       return res.status(400).json({
//         success: false,
//         message: `Mismatch: numberOfRooms = ${cleanData.numberOfRooms}, but ${roomNumbersArr.length} room numbers provided.`
//       });
//     }

//     // ===================================================
//     // 4. IMAGES
//     // ===================================================
//     let images = [];
//     if (req.files?.length > 0) {
//       images = await uploadImages(req.files);
//     }

//     // ===================================================
//     // 5. PRICING (MEAL PLANS + EXTRA BED + MEALS + TAX)
//     // ===================================================
//     const pricing = {
//       ep: {
//         double: toNumber(req.body.epDouble),
//         single: toNumber(req.body.epSingle)
//       },
//       cp: {
//         double: toNumber(req.body.cpDouble),
//         single: toNumber(req.body.cpSingle)
//       },
//       map: {
//         double: toNumber(req.body.mapDouble),
//         single: toNumber(req.body.mapSingle)
//       },
//       ap: {
//         double: toNumber(req.body.apDouble),
//         single: toNumber(req.body.apSingle)
//       },

//       extraBed: {
//         ep: toNumber(req.body.extraBedEP),
//         cp: toNumber(req.body.extraBedCP),
//         mapDouble: toNumber(req.body.extraBedMAPDouble),
//         mapSingle: toNumber(req.body.extraBedMAPSingle),
//         ap: toNumber(req.body.extraBedAP)
//       },

//       // ⭐ Meals typed manually
//       meals: {
//         breakfast: toNumber(req.body.mealBreakfast),
//         lunch: toNumber(req.body.mealLunch),
//         dinner: toNumber(req.body.mealDinner)
//       },

//       childPolicy: {
//         age1to5: { price: 0 },
//         age6to11: {
//           ep: toNumber(req.body.childEP),
//           cp: toNumber(req.body.childCP),
//           map: toNumber(req.body.childMAP),
//           ap: toNumber(req.body.childAP)
//         },
//         age12plusIsAdult: true
//       },

//       // ⭐ GST + service charge typed manually
//       tax: {
//         gst: toNumber(req.body.taxGST),
//         serviceCharge: toNumber(req.body.taxServiceCharge)
//       }
//     };

//     // ===================================================
//     // 6. SAVE ROOM
//     // ===================================================
//     const newRoom = new Room({
//       ...cleanData,
//       roomNumbers: roomNumbersArr,
//       roomOccupancy: roomOccupancyArr,
//       images,
//       pricing
//     });

//     await newRoom.save();

//     return res.status(201).json({
//       success: true,
//       message: "Room created successfully",
//       room: newRoom
//     });

//   } catch (error) {
//     if (error.code === 11000 && error.keyPattern?.roomType) {
//       return res.status(400).json({
//         success: false,
//         message: `Room type '${req.body.roomType}' already exists`
//       });
//     }

//     return res.status(500).json({
//       success: false,
//       message: "Server error while creating room",
//       error: error.message
//     });
//   }
// };
// exports.createRoom = async (req, res) => {
//   try {
//     // ===================================================
//     // REQUIRED FIELDS
//     // ===================================================
//     if (!req.body.roomType || !req.body.numberOfRooms) {
//       return res.status(400).json({
//         success: false,
//         message: "Missing required fields: roomType, numberOfRooms."
//       });
//     }

//     const cleanData = sanitizeRoomInput(req.body);

//     // ===================================================
//     // SAFE NUMBER PARSER
//     // ===================================================
//     const toNumber = (value) => {
//       const num = Number(value);
//       return isNaN(num) ? 0 : num;
//     };

//     // ===================================================
//     // ⭐ ONE UNIFIED ROOM NUMBER LIST
//     // Expecting: ["101", "102"] or "101,102"
//     // ===================================================
//     let roomNumbersArr = [];

//     if (req.body.roomNumbers) {
//       try {
//         // Try parse as JSON array
//         roomNumbersArr = JSON.parse(req.body.roomNumbers);
//       } catch {
//         // Fallback: comma-separated string
//         roomNumbersArr = req.body.roomNumbers
//           .replace(/[\[\]\"]/g, "")
//           .split(",")
//           .map(x => x.trim())
//           .filter(x => x !== "");
//       }
//     }

//     // ===================================================
//     // VALIDATION: NUMBER OF ROOMS MUST MATCH LENGTH
//     // ===================================================
//     if (roomNumbersArr.length !== Number(cleanData.numberOfRooms)) {
//       return res.status(400).json({
//         success: false,
//         message: `Mismatch: numberOfRooms = ${cleanData.numberOfRooms}, but ${roomNumbersArr.length} room numbers provided.`
//       });
//     }

//     // ===================================================
//     // IMAGES
//     // ===================================================
//     let images = [];
//     if (req.files?.length > 0) {
//       images = await uploadImages(req.files);
//     }

//     // ===================================================
//     // PRICING
//     // ===================================================
//     const pricing = {
//       ep: {
//         double: toNumber(req.body.epDouble),
//         single: toNumber(req.body.epSingle)
//       },
//       cp: {
//         double: toNumber(req.body.cpDouble),
//         single: toNumber(req.body.cpSingle)
//       },
//       map: {
//         double: toNumber(req.body.mapDouble),
//         single: toNumber(req.body.mapSingle)
//       },
//       ap: {
//         double: toNumber(req.body.apDouble),
//         single: toNumber(req.body.apSingle)
//       },

//       extraBed: {
//         ep: toNumber(req.body.extraBedEP),
//         cp: toNumber(req.body.extraBedCP),
//         mapDouble: toNumber(req.body.extraBedMAPDouble),
//         mapSingle: toNumber(req.body.extraBedMAPSingle),
//         ap: toNumber(req.body.extraBedAP)
//       },

//       meals: {
//         breakfast: toNumber(req.body.mealBreakfast),
//         lunch: toNumber(req.body.mealLunch),
//         dinner: toNumber(req.body.mealDinner)
//       },

//       childPolicy: {
//         age1to5: { price: 0 },
//         age6to11: {
//           ep: toNumber(req.body.childEP),
//           cp: toNumber(req.body.childCP),
//           map: toNumber(req.body.childMAP),
//           ap: toNumber(req.body.childAP)
//         },
//         age12plusIsAdult: true
//       },

//       tax: {
//         gst: toNumber(req.body.taxGST),
//         serviceCharge: toNumber(req.body.taxServiceCharge)
//       }
//     };

//     // ===================================================
//     // SAVE ROOM
//     // ===================================================
//     const newRoom = new Room({
//       ...cleanData,
//       roomNumbers: roomNumbersArr,
//       images,
//       pricing
//     });

//     await newRoom.save();

//     return res.status(201).json({
//       success: true,
//       message: "Room created successfully",
//       room: newRoom
//     });

//   } catch (error) {
//     if (error.code === 11000 && error.keyPattern?.roomType) {
//       return res.status(400).json({
//         success: false,
//         message: `Room type '${req.body.roomType}' already exists`
//       });
//     }

//     return res.status(500).json({
//       success: false,
//       message: "Server error while creating room",
//       error: error.message
//     });
//   }
// };
// exports.createRoom = async (req, res) => {
//   try {
//     // ===================================================
//     // REQUIRED FIELDS
//     // ===================================================
//     if (!req.body.roomType || !req.body.numberOfRooms) {
//       return res.status(400).json({
//         success: false,
//         message: "Missing required fields: roomType, numberOfRooms."
//       });
//     }

//     const cleanData = sanitizeRoomInput(req.body);

//     // ===================================================
//     // SAFE NUMBER PARSER
//     // ===================================================
//     const toNumber = (value) => {
//       const num = Number(value);
//       return isNaN(num) ? 0 : num;
//     };

//     // ===================================================
//     // ⭐ ROOM NUMBERS HANDLING
//     // ===================================================
//     let roomNumbersArr = [];

//     if (req.body.roomNumbers) {
//       try {
//         roomNumbersArr = JSON.parse(req.body.roomNumbers);
//       } catch {
//         roomNumbersArr = req.body.roomNumbers
//           .replace(/[\[\]\"]/g, "")
//           .split(",")
//           .map(x => x.trim())
//           .filter(x => x !== "");
//       }
//     }

//     if (roomNumbersArr.length !== Number(cleanData.numberOfRooms)) {
//       return res.status(400).json({
//         success: false,
//         message: `Mismatch: numberOfRooms = ${cleanData.numberOfRooms}, but ${roomNumbersArr.length} room numbers provided.`
//       });
//     }

//     // ===================================================
//     // ⭐ OCCUPANCY TYPE HANDLING — "single,double"
//     // ===================================================
//     let occupancyTypes = [];

//     if (req.body.roomOccupancyType) {
//       occupancyTypes = req.body.roomOccupancyType
//         .split(",")
//         .map(x => x.trim().toLowerCase())
//         .filter(x => x !== "");
//     }

//     // ===================================================
//     // IMAGES UPLOAD
//     // ===================================================
//     let images = [];
//     if (req.files?.length > 0) {
//       images = await uploadImages(req.files);
//     }

//     // ===================================================
//     // PRICING
//     // ===================================================
//     const pricing = {
//       ep: {
//         double: toNumber(req.body.epDouble),
//         single: toNumber(req.body.epSingle)
//       },
//       cp: {
//         double: toNumber(req.body.cpDouble),
//         single: toNumber(req.body.cpSingle)
//       },
//       map: {
//         double: toNumber(req.body.mapDouble),
//         single: toNumber(req.body.mapSingle)
//       },
//       ap: {
//         double: toNumber(req.body.apDouble),
//         single: toNumber(req.body.apSingle)
//       },

//       extraBed: {
//         ep: toNumber(req.body.extraBedEP),
//         cp: toNumber(req.body.extraBedCP),
//         mapDouble: toNumber(req.body.extraBedMAPDouble),
//         mapSingle: toNumber(req.body.extraBedMAPSingle),
//         ap: toNumber(req.body.extraBedAP)
//       },

//       meals: {
//         breakfast: toNumber(req.body.mealBreakfast),
//         lunch: toNumber(req.body.mealLunch),
//         dinner: toNumber(req.body.mealDinner)
//       },

//       childPolicy: {
//         age1to5: { price: 0 },
//         age6to11: {
//           ep: toNumber(req.body.childEP),
//           cp: toNumber(req.body.childCP),
//           map: toNumber(req.body.childMAP),
//           ap: toNumber(req.body.childAP)
//         },
//         age12plusIsAdult: true
//       },

//       tax: {
//         gst: toNumber(req.body.taxGST),
//         serviceCharge: toNumber(req.body.taxServiceCharge)
//       }
//     };

//     // ===================================================
//     // SAVE ROOM
//     // ===================================================
//     const newRoom = new Room({
//       ...cleanData,
//       roomNumbers: roomNumbersArr,
//       roomOccupancyType: occupancyTypes,
//       images,
//       pricing
//     });

//     await newRoom.save();

//     return res.status(201).json({
//       success: true,
//       message: "Room created successfully",
//       room: newRoom
//     });

//   } catch (error) {
//     if (error.code === 11000 && error.keyPattern?.roomType) {
//       return res.status(400).json({
//         success: false,
//         message: `Room type '${req.body.roomType}' already exists`
//       });
//     }

//     return res.status(500).json({
//       success: false,
//       message: "Server error while creating room",
//       error: error.message
//     });
//   }
// };
exports.createRoom = async (req, res) => {
  try {
    // ===================================================
    // REQUIRED FIELDS
    // ===================================================
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

    // ===================================================
    // ⭐ ROOM NUMBERS
    // ===================================================
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

    // ===================================================
    // ⭐ OCCUPANCY TYPE — ARRAY
    // ===================================================
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

// ================================
// GET room by ID
// ================================
// exports.getRoomById = async (req, res) => {
//   try {
//     const { id } = req.params;
//     if (!validator.isMongoId(id)) {
//       return res.status(400).json({ message: "Invalid Room ID" });
//     }

//     const room = await Room.findById(id);
//     if (!room) return res.status(404).json({ message: "Room not found" });

//     res.status(200).json({ message: "Room retrieved successfully", room });
//   } catch (error) {
//     res.status(500).json({ message: "Server error", error: error.message });
//   }
// };
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
// ---------------- Get room availability by type ----------------
// exports.getRoomAvailability = async (req, res) => {
//   try {
//     const { roomType } = req.params;
//     let { checkIn, checkOut, adults, children, roomsRequested } = req.query;

//     if (!checkIn || !checkOut) {
//       return res.status(400).json({
//         success: false,
//         message: "Please provide check-in and check-out dates"
//       });
//     }

//     if (!validator.isISO8601(checkIn) || !validator.isISO8601(checkOut)) {
//       return res.status(400).json({
//         success: false,
//         message: "Invalid date format"
//       });
//     }

//     const room = await Room.findOne({ roomType: validator.escape(roomType) });
//     if (!room) {
//       return res.status(404).json({
//         success: false,
//         message: `Room type ${roomType} not found`
//       });
//     }

//     checkIn = new Date(checkIn);
//     checkOut = new Date(checkOut);

//     // Find overlapping bookings
//     const overlappingBookings = await Booking.find({
//       "rooms.roomType": roomType,
//       status: { $in: ["confirmed", "checked_in", "pending"] },
//       $or: [
//         { checkIn: { $lt: checkOut } },
//         { checkOut: { $gt: checkIn } }
//       ]
//     });

//     let roomsBooked = 0;
//     let roomsReserved = 0;

//     overlappingBookings.forEach(b => {
//       const bookedRoom = b.rooms.find(r => r.roomType === roomType);
//       if (!bookedRoom) return;

//       if (b.status === "pending") roomsReserved += bookedRoom.quantity;
//       else roomsBooked += bookedRoom.quantity;
//     });

//     const availableRooms =
//       room.numberOfRooms - (roomsReserved + roomsBooked);

//     // Create a single room object matching the "availableRooms[]" format
//     const roomDetailsResponse = {
//       _id: room._id,
//       roomType: room.roomType,
//       totalRooms: room.numberOfRooms,
//       bookedRooms: roomsBooked,
//       reservedRooms: roomsReserved,
//       availableRooms: availableRooms,
//       occupancy: room.occupancy,
//       size: room.size,
//       beds: room.beds,
//       roomDetails: room.roomDetails,
//       roomFeatures: room.roomFeatures,
//       bathroomAmenities: room.bathroomAmenities,
//       optional: room.optional,
//       images: room.images,
//       pricing: room.pricing,
//       tax: room.tax
//     };

//     // If unavailable
//     if (availableRooms <= 0 || (roomsRequested && roomsRequested > availableRooms)) {
//       return res.status(200).json({
//         success: true,
//         available: false,
//         message: `No ${roomType} rooms available for selected dates.`,
//         room: roomDetailsResponse
//       });
//     }

//     // Available
//     return res.status(200).json({
//       success: true,
//       available: true,
//       message: `${availableRooms} ${roomType} room(s) available.`,
//       room: roomDetailsResponse
//     });

//   } catch (error) {
//     console.error("GET ROOM AVAILABILITY ERROR:", error);
//     res.status(500).json({
//       success: false,
//       message: "Server error",
//       error: error.message
//     });
//   }
// };
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

// ================================
// // FIXED — Get Available Rooms (NO LOCATION)

// exports.getAvailableRoomsByDate = async (req, res) => {
//   try {
//     let { date, checkIn, checkOut, adults, children, roomsRequested } = req.query;

//     if (date && !checkIn && !checkOut) {
//       checkIn = date;
//       const nextDay = new Date(date);
//       nextDay.setDate(nextDay.getDate() + 1);
//       checkOut = nextDay.toISOString().split("T")[0];
//     }

//     if (!checkIn || !checkOut) {
//       return res.status(400).json({ message: "Please provide check-in and check-out dates" });
//     }

//     if (!validator.isISO8601(checkIn) || !validator.isISO8601(checkOut)) {
//       return res.status(400).json({ message: "Invalid date format" });
//     }

//     checkIn = new Date(checkIn);
//     checkOut = new Date(checkOut);

//     const inclusiveCheckOut = new Date(checkOut);
//     inclusiveCheckOut.setDate(inclusiveCheckOut.getDate() + 1);

//     const rooms = await Room.find();
//     const availableRooms = [];

//     for (const room of rooms) {
//       const overlappingBookings = await Booking.find({
//         "rooms.roomType": room.roomType,
//         status: { $in: ["confirmed", "checked_in", "pending"] },
//         checkIn: { $lt: inclusiveCheckOut },
//         checkOut: { $gte: checkIn },
//       });

//       let roomsBooked = 0;
//       let roomsReserved = 0;

//       overlappingBookings.forEach((b) => {
//         const bookedRoom = b.rooms.find((r) => r.roomType === room.roomType);
//         if (!bookedRoom) return;
//         if (b.status === "pending") roomsReserved += bookedRoom.quantity;
//         else roomsBooked += bookedRoom.quantity;
//       });

//       const availableCount = room.numberOfRooms - (roomsBooked + roomsReserved);
//       if (availableCount <= 0) continue;

//       availableRooms.push({
//         roomType: room.roomType,
//         totalRooms: room.numberOfRooms,
//         bookedRooms: roomsBooked,
//         reservedRooms: roomsReserved,
//         availableRooms: availableCount,
//         price: room.price,
//         occupancy: room.occupancy,
//         size: room.size,
//         beds: room.beds,
//         roomDetails: room.roomDetails,
//         roomFeatures: room.roomFeatures,
//         bathroomAmenities: room.bathroomAmenities,
//         optional: room.optional,
//         images: room.images,
//       });
//     }

//     res.status(200).json({
//       message:
//         availableRooms.length > 0
//           ? "Available rooms fetched successfully."
//           : "No rooms available for the selected date(s).",
//       availableRooms,
//     });
//   } catch (error) {
//     res.status(500).json({ message: "Server error", error: error.message });
//   }
// };



// ================================
// Get Room Types with Price
// ================================
// exports.getRoomTypes = async (req, res) => {
//   try {
//     const rooms = await Room.find({}, "roomType price");

//     if (!rooms || rooms.length === 0) {
//       return res.status(404).json({ success: false, message: "No room types found" });
//     }

//     const roomTypes = rooms.map((r) => ({
//       roomType: r.roomType,
//       price: r.price
//     }));

//     res.status(200).json({
//       success: true,
//       message: "Room types fetched successfully",
//       roomTypes
//     });
//   } catch (error) {
//     res.status(500).json({ success: false, message: "Server error", error: error.message });
//   }
// };
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
