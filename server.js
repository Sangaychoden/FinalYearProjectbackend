
// // require("dotenv").config();
// // const express = require("express");
// // const mongoose = require("mongoose");
// // const bookingRoutes = require('./routes/bookingRoutes');
// // const adminRoutes = require("./routes/adminRoutes"); // Make sure this exports a router
// // const roomRoutes = require('./routes/roomRoute'); // Corrected to match your file
// // const app = express();

// // // Middleware
// // app.use(express.json()); // For JSON requests
// // app.use(express.urlencoded({ extended: true })); // For form-data text fields

// // // Connect to MongoDB
// // mongoose.connect(process.env.MONGO_URI, {
// //   useNewUrlParser: true,
// //   useUnifiedTopology: true,
// // })
// // .then(() => console.log("✅ Connected to MongoDB"))
// // .catch((err) => console.error("❌ DB connection error:", err));

// // // Routes
// // app.use("/admin", adminRoutes); 
// // app.use('/rooms', roomRoutes);
// // app.use('/bookings', bookingRoutes);

// // // Test route
// // app.get("/", (req, res) => {
// //   res.send("Server is running!");
// // });

// // // Start server
// // const PORT = process.env.PORT || 3000;
// // app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
// require("dotenv").config();
// const express = require("express");
// const mongoose = require("mongoose");
// const cors = require("cors"); // <-- import cors
// const bookingRoutes = require('./routes/bookingRoutes');
// const adminRoutes = require("./routes/adminRoutes"); // Make sure this exports a router
// const roomRoutes = require('./routes/roomRoute'); // Corrected to match your file

// const app = express();

// // =======================
// // MIDDLEWARE
// // =======================
// app.use(express.json()); // For JSON requests
// app.use(express.urlencoded({ extended: true })); // For form-data text fields

// // Enable CORS for your frontend
// app.use(cors({
//   origin: "http://localhost:5173", // React frontend URL
//   methods: ["GET", "POST", "PUT", "DELETE"],
//   credentials: true // if you need cookies
// }));

// // =======================
// // DATABASE CONNECTION
// // =======================
// mongoose.connect(process.env.MONGO_URI, {
//   useNewUrlParser: true,
//   useUnifiedTopology: true,
// })
// .then(() => console.log("✅ Connected to MongoDB"))
// .catch((err) => console.error("❌ DB connection error:", err));

// // =======================
// // ROUTES
// // =======================
// app.use("/admin", adminRoutes); 
// app.use('/rooms', roomRoutes);
// app.use('/bookings', bookingRoutes);

// // Test route
// app.get("/", (req, res) => {
//   res.send("Server is running!");
// });

// // =======================
// // START SERVER
// // =======================
// const PORT = process.env.PORT || 3000;
// app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const cookieParser = require("cookie-parser"); // ✅ Needed for cookie-based auth

const bookingRoutes = require("./routes/bookingRoutes");
const adminRoutes = require("./routes/adminRoutes");
const roomRoutes = require("./routes/roomRoute");
const facilitiesRoute =require("./routes/facilitiesRoute")
const testimonialRoutes = require("./routes/testimonialRoute");
const receptionistRoutes = require("./routes/receptionistRoute");
const app = express();

// =======================
// MIDDLEWARE
// =======================
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser()); // ✅ Allows Express to read/write cookies


// ✅ CORS setup for cookie-based authentication
app.use(cors({
  origin: "http://localhost:5173", // Your React frontend
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE"],
  credentials: true // ✅ Important: allows cookies to be sent across origins
}));

// =======================
// DATABASE CONNECTION
// =======================
mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => console.log("✅ Connected to MongoDB"))
.catch((err) => console.error("❌ DB connection error:", err));

// =======================
// ROUTES
// =======================
app.use("/", adminRoutes);
app.use("/rooms", roomRoutes);
app.use("/bookings", bookingRoutes);
app.use("/facilities", facilitiesRoute);
app.use("/testimonials", testimonialRoutes);
app.use("/receptionists", receptionistRoutes);

// Test route
app.get("/", (req, res) => {
  res.send("🚀 Server is running securely with cookies!");
});

// =======================
// START SERVER
// =======================
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`✅ Server running on http://localhost:${PORT}`));
