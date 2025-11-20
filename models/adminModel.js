const mongoose = require("mongoose");

const adminSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  resetOTP: { type: String },
  resetOTPExpiry: { type: Date },
  isOTPVerified: { type: Boolean, default: false }, // ✅ NEW FIELD
});

module.exports = mongoose.model("Admin", adminSchema);
