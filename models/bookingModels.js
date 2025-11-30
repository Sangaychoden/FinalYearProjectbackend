
// const mongoose = require('mongoose');

// const bookingSchema = new mongoose.Schema({
//   bookingNumber: {
//     type: String,
//     required: true,
//     unique: true
//   },

//   // WEBSITE GUEST FIELDS
//   firstName: { type: String },
//   lastName: { type: String },
//   email: { type: String },
//   country: { type: String },
//   phoneNumber: { type: String },

//   // TRAVEL AGENCY FIELDS
//   isAgencyBooking: { type: Boolean, default: false },
//   agencyName: { type: String, default: "" },
//   agentName: { type: String, default: "" },
//   agencyEmail: { type: String, default: "" },
//   agencyPhone: { type: String, default: "" },

//   checkIn: { type: Date, required: true },
//   checkOut: { type: Date, required: true },

//   rooms: [
//     {
//       roomType: { type: String, required: true },
//       quantity: { type: Number, required: true },
//       pricePerNight: { type: Number, required: true }
//     }
//   ],

//   meals: [{ type: String }],
//   specialRequest: { type: String },

//   totalPrice: { type: Number, required: true },

//   status: {
//     type: String,
//     enum: [
//       'pending',       // no payment
//       'confirmed',     // deposit paid
//       'guaranteed',    // full payment
//       'rejected',
//       'checked_in',
//       'checked_out',
//       "cancelled"
//     ],
//     default: 'pending'
//   },

//   assignedRoom: {
//     type: [String],
//     default: []
//   },
//   rejectReason: {
//   type: String,
//   default: ""
// },
//   cancelReason: {
//   type: String,
//   default: ""
// },


//   transactionNumber: { type: String }
// }, { timestamps: true });

// module.exports = mongoose.model('Booking', bookingSchema);
const mongoose = require('mongoose');

const bookingSchema = new mongoose.Schema({
  bookingNumber: {
    type: String,
    required: true,
    unique: true
  },

  // Guest fields
  firstName: String,
  lastName: String,
  email: String,
  country: String,
  phoneNumber: String,

  // Agency booking fields
  isAgencyBooking: { type: Boolean, default: false },
  agencyName: String,
  agentName: String,
  agencyEmail: String,
  agencyPhone: String,

  checkIn: { type: Date, required: true },
  checkOut: { type: Date, required: true },

  // Room details (full info)
  rooms: [
    {
      roomType: String,
      quantity: Number,
      occupancyType: [String],   // <-- ARRAY OF STRINGS

      // occupancyType: String,   // single / double
      mealPlan: String,        // EP / CP / MAP / AP
      adults: Number,
      children: [
        {
          age: String
        }
      ],
      extraBeds: Number,
      pricePerNight: Number
    }
  ],

  // ⭐ NEW — MEALS FOR BOOKING (simple and clean)
  meals: {
    breakfast: { type: Boolean, default: false },
    lunch: { type: Boolean, default: false },
    dinner: { type: Boolean, default: false }
  },

  specialRequest: String,
  totalPrice: Number,

  status: {
    type: String,
    enum: [
      'pending',
      'confirmed',
      'guaranteed',
      'rejected',
      'checked_in',
      'checked_out',
      'cancelled'
    ],
    default: 'pending'
  },

  assignedRoom: [String],

  rejectReason: { type: String, default: "" },
  cancelReason: { type: String, default: "" },

  transactionNumber: String

}, { timestamps: true });

module.exports = mongoose.model('Booking', bookingSchema);
