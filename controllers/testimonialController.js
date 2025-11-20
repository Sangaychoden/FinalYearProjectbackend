// const Testimonial = require("../models/testimonialModel");
// const cloudinary = require("cloudinary").v2;

// // ✅ Cloudinary Configuration (same as facility)
// cloudinary.config({
//   cloud_name: process.env.CLOUD_NAME,
//   api_key: process.env.CLOUD_API_KEY,
//   api_secret: process.env.CLOUD_API_SECRET,
// });

// // ✅ Helper: Upload from buffer using Cloudinary stream
// const uploadFromBuffer = (fileBuffer) => {
//   return new Promise((resolve, reject) => {
//     const stream = cloudinary.uploader.upload_stream(
//       { folder: "testimonials" },
//       (error, result) => {
//         if (error) reject(error);
//         else resolve(result);
//       }
//     );
//     stream.end(fileBuffer);
//   });
// };

// // ✅ Create Testimonial (only one image)
// exports.createTestimonial = async (req, res) => {
//   try {
//     const { name, stayPeriod, message } = req.body;

//     if (!name || !stayPeriod || !message)
//       return res
//         .status(400)
//         .json({ message: "Name, stay period, and message are required" });

//     if (!req.file)
//       return res.status(400).json({ message: "Please upload one image" });

//     // Upload single image to Cloudinary
//     const result = await uploadFromBuffer(req.file.buffer);

//     const testimonial = await Testimonial.create({
//       name,
//       stayPeriod,
//       message,
//       image: result.secure_url,
//     });

//     res.status(201).json({
//       message: "Testimonial created successfully",
//       testimonial,
//     });
//   } catch (error) {
//     console.error("❌ Create testimonial error:", error);
//     res.status(500).json({ message: "Server error creating testimonial" });
//   }
// };

// // ✅ Get All Testimonials
// exports.getAllTestimonials = async (req, res) => {
//   try {
//     const testimonials = await Testimonial.find().sort({ createdAt: -1 });
//     res.status(200).json({ testimonials });
//   } catch (error) {
//     console.error("❌ Get testimonials error:", error);
//     res.status(500).json({ message: "Failed to fetch testimonials" });
//   }
// };

// // ✅ Get Single Testimonial
// exports.getTestimonialById = async (req, res) => {
//   try {
//     const testimonial = await Testimonial.findById(req.params.id);
//     if (!testimonial)
//       return res.status(404).json({ message: "Testimonial not found" });
//     res.status(200).json({ testimonial });
//   } catch (error) {
//     console.error("❌ Get testimonial error:", error);
//     res.status(500).json({ message: "Error fetching testimonial" });
//   }
// };

// // ✅ Update Testimonial (one image)
// exports.updateTestimonial = async (req, res) => {
//   try {
//     const { name, stayPeriod, message } = req.body;
//     const testimonial = await Testimonial.findById(req.params.id);

//     if (!testimonial)
//       return res.status(404).json({ message: "Testimonial not found" });

//     if (name) testimonial.name = name;
//     if (stayPeriod) testimonial.stayPeriod = stayPeriod;
//     if (message) testimonial.message = message;

//     // If new image uploaded
//     if (req.file) {
//       const uploadRes = await uploadFromBuffer(req.file.buffer);
//       testimonial.image = uploadRes.secure_url;
//     }

//     await testimonial.save();

//     res.status(200).json({
//       message: "Testimonial updated successfully",
//       testimonial,
//     });
//   } catch (error) {
//     console.error("❌ Update testimonial error:", error);
//     res.status(500).json({ message: "Failed to update testimonial" });
//   }
// };

// // ✅ Delete Testimonial
// exports.deleteTestimonial = async (req, res) => {
//   try {
//     const testimonial = await Testimonial.findByIdAndDelete(req.params.id);
//     if (!testimonial)
//       return res.status(404).json({ message: "Testimonial not found" });
//     res.status(200).json({ message: "Testimonial deleted successfully" });
//   } catch (error) {
//     console.error("❌ Delete testimonial error:", error);
//     res.status(500).json({ message: "Failed to delete testimonial" });
//   }
// };
const Testimonial = require("../models/testimonialModel");
const cloudinary = require("cloudinary").v2;

// ✅ Cloudinary Configuration (same as facility)
cloudinary.config({
  cloud_name: process.env.CLOUD_NAME,
  api_key: process.env.CLOUD_API_KEY,
  api_secret: process.env.CLOUD_API_SECRET,
});

// ✅ Helper: Upload from buffer using Cloudinary stream
const uploadFromBuffer = (fileBuffer) => {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { folder: "testimonials" },
      (error, result) => {
        if (error) reject(error);
        else resolve(result);
      }
    );
    stream.end(fileBuffer);
  });
};

// ✅ Create Testimonial (image optional)
exports.createTestimonial = async (req, res) => {
  try {
    const { name, stayPeriod, message } = req.body;

    // ✅ Validate required fields
    if (!name || !stayPeriod || !message) {
      return res
        .status(400)
        .json({ message: "Name, stay period, and message are required" });
    }

    let imageUrl = null;

    // ✅ Upload image only if provided
    if (req.file) {
      try {
        const result = await uploadFromBuffer(req.file.buffer);
        imageUrl = result.secure_url;
      } catch (uploadErr) {
        console.error("❌ Cloudinary upload failed:", uploadErr);
        return res.status(500).json({ message: "Failed to upload image" });
      }
    }

    // ✅ Save testimonial (with or without image)
    const testimonial = await Testimonial.create({
      name,
      stayPeriod,
      message,
      image: imageUrl, // can be null if no image uploaded
    });

    res.status(201).json({
      message: "Testimonial created successfully",
      testimonial,
    });
  } catch (error) {
    console.error("❌ Create testimonial error:", error);
    res.status(500).json({ message: "Server error creating testimonial" });
  }
};

// ✅ Get All Active Testimonials (not archived)
exports.getAllTestimonials = async (req, res) => {
  try {
    const testimonials = await Testimonial.find({ isArchived: false }).sort({
      createdAt: -1,
    });
    res.status(200).json({ testimonials });
  } catch (error) {
    console.error("❌ Get testimonials error:", error);
    res.status(500).json({ message: "Failed to fetch testimonials" });
  }
};

// ✅ Get Archived Testimonials only
exports.getArchivedTestimonials = async (req, res) => {
  try {
    const testimonials = await Testimonial.find({ isArchived: true }).sort({
      createdAt: -1,
    });
    res.status(200).json({ testimonials });
  } catch (error) {
    console.error("❌ Get archived testimonials error:", error);
    res.status(500).json({ message: "Failed to fetch archived testimonials" });
  }
};

// ✅ Get Single Testimonial
exports.getTestimonialById = async (req, res) => {
  try {
    const testimonial = await Testimonial.findById(req.params.id);
    if (!testimonial)
      return res.status(404).json({ message: "Testimonial not found" });
    res.status(200).json({ testimonial });
  } catch (error) {
    console.error("❌ Get testimonial error:", error);
    res.status(500).json({ message: "Error fetching testimonial" });
  }
};

// ✅ Update Testimonial (image optional + removable)
exports.updateTestimonial = async (req, res) => {
  try {
    const { name, stayPeriod, message, removeImage } = req.body;
    const testimonial = await Testimonial.findById(req.params.id);

    if (!testimonial)
      return res.status(404).json({ message: "Testimonial not found" });

    if (name) testimonial.name = name;
    if (stayPeriod) testimonial.stayPeriod = stayPeriod;
    if (message) testimonial.message = message;

    // ✅ Remove image if requested
    if (removeImage === "true") {
      testimonial.image = null;
    }
    // ✅ Or upload new one if provided
    else if (req.file) {
      const uploadRes = await uploadFromBuffer(req.file.buffer);
      testimonial.image = uploadRes.secure_url;
    }

    await testimonial.save();

    res.status(200).json({
      message: "✅ Testimonial updated successfully",
      testimonial,
    });
  } catch (error) {
    console.error("❌ Update testimonial error:", error);
    res.status(500).json({ message: "Failed to update testimonial" });
  }
};

// ✅ Archive Testimonial (soft delete)
exports.archiveTestimonial = async (req, res) => {
  try {
    const testimonial = await Testimonial.findById(req.params.id);
    if (!testimonial)
      return res.status(404).json({ message: "Testimonial not found" });

    testimonial.isArchived = true;
    await testimonial.save();

    res
      .status(200)
      .json({ message: "Testimonial archived successfully", testimonial });
  } catch (error) {
    console.error("❌ Archive testimonial error:", error);
    res.status(500).json({ message: "Failed to archive testimonial" });
  }
};

// ✅ Restore Testimonial
exports.restoreTestimonial = async (req, res) => {
  try {
    const testimonial = await Testimonial.findById(req.params.id);
    if (!testimonial)
      return res.status(404).json({ message: "Testimonial not found" });

    testimonial.isArchived = false;
    await testimonial.save();

    res
      .status(200)
      .json({ message: "Testimonial restored successfully", testimonial });
  } catch (error) {
    console.error("❌ Restore testimonial error:", error);
    res.status(500).json({ message: "Failed to restore testimonial" });
  }
};

// ✅ Delete Testimonial
exports.deleteTestimonial = async (req, res) => {
  try {
    const testimonial = await Testimonial.findByIdAndDelete(req.params.id);
    if (!testimonial)
      return res.status(404).json({ message: "Testimonial not found" });
    res.status(200).json({ message: "Testimonial deleted successfully" });
  } catch (error) {
    console.error("❌ Delete testimonial error:", error);
    res.status(500).json({ message: "Failed to delete testimonial" });
  }
};
