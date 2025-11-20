
const mongoose = require('mongoose');

const bookingSchema = new mongoose.Schema({
  bookingNumber: {
    type: String,
    required: true,
    unique: true
  },

  // WEBSITE GUEST FIELDS
  firstName: { type: String },
  lastName: { type: String },
  email: { type: String },
  country: { type: String },
  phoneNumber: { type: String },

  // TRAVEL AGENCY FIELDS
  isAgencyBooking: { type: Boolean, default: false },
  agencyName: { type: String, default: "" },
  agentName: { type: String, default: "" },
  agencyEmail: { type: String, default: "" },
  agencyPhone: { type: String, default: "" },

  checkIn: { type: Date, required: true },
  checkOut: { type: Date, required: true },

  rooms: [
    {
      roomType: { type: String, required: true },
      quantity: { type: Number, required: true },
      pricePerNight: { type: Number, required: true }
    }
  ],

  meals: [{ type: String }],
  specialRequest: { type: String },

  totalPrice: { type: Number, required: true },

  status: {
    type: String,
    enum: [
      'pending',       // no payment
      'confirmed',     // deposit paid
      'guaranteed',    // full payment
      'rejected',
      'checked_in',
      'checked_out',
      "cancelled"
    ],
    default: 'pending'
  },

  assignedRoom: {
    type: [String],
    default: []
  },
  rejectReason: {
  type: String,
  default: ""
},
  cancelReason: {
  type: String,
  default: ""
},


  transactionNumber: { type: String }
}, { timestamps: true });

module.exports = mongoose.model('Booking', bookingSchema);
