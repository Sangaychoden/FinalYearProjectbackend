
const Facility = require("../models/facilitiesModel");
const cloudinary = require("cloudinary").v2;

// ✅ Cloudinary Configuration
cloudinary.config({
  cloud_name: process.env.CLOUD_NAME,
  api_key: process.env.CLOUD_API_KEY,
  api_secret: process.env.CLOUD_API_SECRET,
});

// ✅ Helper: Upload from buffer using Cloudinary stream
const uploadFromBuffer = (fileBuffer) => {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { folder: "facilities" },
      (error, result) => {
        if (error) reject(error);
        else resolve(result);
      }
    );
    stream.end(fileBuffer);
  });
};

// ✅ Create Facility
exports.createFacility = async (req, res) => {
  try {
    const { title, description } = req.body;

    if (!title || !description)
      return res.status(400).json({ message: "Title and description are required" });

    if (!req.files || req.files.length === 0)
      return res.status(400).json({ message: "Please upload at least one image" });

    const uploadedImages = [];
    for (const file of req.files) {
      const result = await uploadFromBuffer(file.buffer);
      uploadedImages.push(result.secure_url);
    }

    const facility = await Facility.create({
      title,
      description,
      images: uploadedImages,
    });

    res.status(201).json({
      message: "Facility created successfully",
      facility,
    });
  } catch (error) {
    console.error("Create facility error:", error);
    res.status(500).json({ message: "Server error creating facility" });
  }
};

// ✅ Get All Facilities
exports.getFacilities = async (req, res) => {
  try {
    const facilities = await Facility.find().sort({ createdAt: -1 });
    res.status(200).json({ facilities });
  } catch (error) {
    console.error("Get facilities error:", error);
    res.status(500).json({ message: "Failed to fetch facilities" });
  }
};

// ✅ Get Single Facility
exports.getFacilityById = async (req, res) => {
  try {
    const facility = await Facility.findById(req.params.id);
    if (!facility) return res.status(404).json({ message: "Facility not found" });
    res.status(200).json({ facility });
  } catch (error) {
    console.error("Get facility by ID error:", error);
    res.status(500).json({ message: "Error fetching facility" });
  }
};
// ✅ Update Facility (Keep old + add new + remove deleted)
exports.updateFacility = async (req, res) => {
  try {
    const { title, description, existingImages } = req.body;
    const facility = await Facility.findById(req.params.id);

    if (!facility) {
      return res.status(404).json({ message: "Facility not found" });
    }

    // Update text fields
    if (title) facility.title = title;
    if (description) facility.description = description;

    // Parse existingImages safely (frontend sends JSON.stringify([...]))
    let keptImages = [];
    if (existingImages) {
      try {
        keptImages = JSON.parse(existingImages);
      } catch {
        keptImages = [];
      }
    }

    // Upload new images (if any)
    const newUploadedImages = [];
    if (req.files && req.files.length > 0) {
      for (const file of req.files) {
        const uploaded = await uploadFromBuffer(file.buffer);
        newUploadedImages.push(uploaded.secure_url);
      }
    }

    // Combine old (kept) + new ones
    facility.images = [...keptImages, ...newUploadedImages];

    await facility.save();

    res.status(200).json({
      message: "Facility updated successfully",
      facility,
    });
  } catch (error) {
    console.error("❌ Update facility error:", error);
    res.status(500).json({ message: "Failed to update facility" });
  }
};

// ✅ Update Facility
// exports.updateFacility = async (req, res) => {
//   try {
//     const { title, description } = req.body;
//     const facility = await Facility.findById(req.params.id);
//     if (!facility) return res.status(404).json({ message: "Facility not found" });

//     if (title) facility.title = title;
//     if (description) facility.description = description;

//     if (req.files && req.files.length > 0) {
//       const newImages = [];
//       for (const file of req.files) {
//         const uploadRes = await uploadFromBuffer(file.buffer);
//         newImages.push(uploadRes.secure_url);
//       }
//       facility.images = newImages;
//     }

//     await facility.save();
//     res.status(200).json({
//       message: "Facility updated successfully",
//       facility,
//     });
//   } catch (error) {
//     console.error("Update facility error:", error);
//     res.status(500).json({ message: "Failed to update facility" });
//   }
// };

// ✅ Delete Facility
exports.deleteFacility = async (req, res) => {
  try {
    const facility = await Facility.findByIdAndDelete(req.params.id);
    if (!facility) return res.status(404).json({ message: "Facility not found" });
    res.status(200).json({ message: "Facility deleted successfully" });
  } catch (error) {
    console.error("Delete facility error:", error);
    res.status(500).json({ message: "Failed to delete facility" });
  }
};

// ✅ Search Facilities by Title
exports.searchFacilities = async (req, res) => {
  try {
    const { title } = req.query;
    if (!title || title.trim() === "")
      return res.status(400).json({ message: "Please provide a search title" });

    const facilities = await Facility.find({
      title: { $regex: title, $options: "i" },
    });

    if (facilities.length === 0)
      return res.status(404).json({ message: "No facilities found matching your search" });

    res.status(200).json({ facilities });
  } catch (error) {
    console.error("Search facilities error:", error);
    res.status(500).json({ message: "Server error while searching facilities" });
  }
};
