// const mongoose = require('mongoose');

// const roomSchema = new mongoose.Schema({
//   roomType: { type: String, required: true },
//   numberOfRooms: { type: Number, required: true }, // total rooms of this type
//   size: { type: Number, required: true },
//   beds: { type: Number, required: true },
//   occupancy: { type: Number, required: true },
//   location: { type: String, required: true },
//   roomDetails: { type: String, required: true },
//   roomFeatures: { type: String },
//   bathroomAmenities: { type: String },
//   optional: { type: String },
//   images: [{ type: String }],
//   price: { type: Number, required: true },
// }, { timestamps: true });

// module.exports = mongoose.model('Room', roomSchema);
const mongoose = require('mongoose');

const roomSchema = new mongoose.Schema({
  roomType: { type: String, required: true, unique: true },
  numberOfRooms: { type: Number, required: true }, 
  roomNumbers: { type: [String], required: true }, // ✅ Fixed rooms stored here

  size: { type: Number, required: true },
  beds: { type: Number, required: true },
  occupancy: { type: Number, required: true },
  location: { type: String, required: true },

  roomDetails: { type: String, required: true },
  roomFeatures: { type: String },
  bathroomAmenities: { type: String },
  optional: { type: String },

  images: [{ type: String }],
  price: { type: Number, required: true }
}, { timestamps: true });

module.exports = mongoose.model('Room', roomSchema);
