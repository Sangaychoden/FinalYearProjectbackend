const mongoose = require("mongoose");

const testimonialSchema = new mongoose.Schema(
  {
    name: { 
      type: String, 
      required: true, 
      trim: true 
    },
    stayPeriod: { 
      type: String, 
      required: true, 
      trim: true 
    }, // e.g. "Nov 1–5, 2025"
    message: { 
      type: String, 
      required: true, 
      trim: true 
    },
    image: { 
      type: String, 
      required: false
    }, // ✅ one image only

    // 🟡 Archive status (for soft delete / restore)
    isArchived: { 
      type: Boolean, 
      default: false 
    },
  },
  { 
    timestamps: true // ✅ Adds createdAt and updatedAt automatically
  }
);

module.exports = mongoose.model("Testimonial", testimonialSchema);
