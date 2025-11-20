const mongoose = require("mongoose");

const facilitySchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, "Facility title is required"],
      trim: true,
    },
    description: {
      type: String,
      required: [true, "Facility description is required"],
    },
    images: {
      type: [String],
      required: true,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Facility", facilitySchema);
