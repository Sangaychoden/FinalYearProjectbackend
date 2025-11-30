
// // const mongoose = require('mongoose');

// // const roomSchema = new mongoose.Schema({
// //   roomType: { type: String, required: true, unique: true },
// //   numberOfRooms: { type: Number, required: true }, 
// //   roomNumbers: { type: [String], required: true }, // ✅ Fixed rooms stored here

// //   size: { type: Number, required: true },
// //   beds: { type: Number, required: true },
// //   occupancy: { type: Number, required: true },
// //   // location: { type: String, required: true },

// //   roomDetails: { type: String, required: true },
// //   roomFeatures: { type: String },
// //   bathroomAmenities: { type: String },
// //   optional: { type: String },

// //   images: [{ type: String }],
// //   price: { type: Number, required: true }
// // }, { timestamps: true });

// // module.exports = mongoose.model('Room', roomSchema);
// const mongoose = require('mongoose');

// const roomSchema = new mongoose.Schema({
//   roomType: { type: String, required: true, unique: true },
//   numberOfRooms: { type: Number, required: true }, 

//   roomNumbers: { type: [String], required: true },


//   // ⭐ NEW FIELD (matches each room number)
//   roomOccupancy: { type: [String], default: [] }, 
//   // values: "single" or "double"

//   size: { type: Number, required: true },
//   beds: { type: Number, required: true },
//   occupancy: { type: Number, required: true },

//   roomDetails: { type: String, required: true },
//   roomFeatures: { type: String },
//   bathroomAmenities: { type: String },
//   optional: { type: String },

//   images: [{ type: String }],
//   price: { type: Number, required: true }
// }, { timestamps: true });

// module.exports = mongoose.model('Room', roomSchema);

const mongoose = require('mongoose');

const roomSchema = new mongoose.Schema(
  {
    roomType: { type: String, required: true, unique: true },
    numberOfRooms: { type: Number, required: true },

    roomNumbers: { type: [String], required: true },
    roomOccupancy: { type: [String], default: [] }, // "single" / "double"

    size: { type: Number, required: true },
    beds: { type: Number, required: true },
    occupancy: { type: Number, required: true },

    roomDetails: { type: String, required: true },
    roomFeatures: { type: String },
    bathroomAmenities: { type: String },
    optional: { type: String },

    images: [{ type: String }],

    // ⭐ PRICING FOR ALL PLANS
    pricing: {
      ep: {
        double: Number,
        single: Number
      },
      cp: {
        double: Number,
        single: Number
      },
      map: {
        double: Number,
        single: Number
      },
      ap: {
        double: Number,
        single: Number
      },

      // ⭐ Extra bed pricing for all plans
      extraBed: {
        ep: Number,
        cp: Number,
        mapDouble: Number,
        mapSingle: Number,
        ap: Number
      },

      // ⭐ Individual meals
      meals: {
        breakfast: Number,
        lunch: Number,
        dinner: Number
      },

      // ⭐ Child policy
      childPolicy: {
        age1to5: {
          price: Number
        },
        age6to11: {
          ep: Number,
          cp: Number,
          map: Number,
          ap: Number
        },
        age12plusIsAdult: Boolean
      },

      // ⭐ Tax settings (optionally used)
      tax: {
        gst: Number,
        serviceCharge: Number
      }
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model('Room', roomSchema);
