
// // require("dotenv").config();
// // const express = require("express");
// // const mongoose = require("mongoose");
// // const cors = require("cors");
// // const cookieParser = require("cookie-parser"); // ✅ Needed for cookie-based auth

// // const bookingRoutes = require("./routes/bookingRoutes");
// // const adminRoutes = require("./routes/adminRoutes");
// // const roomRoutes = require("./routes/roomRoute");
// // const facilitiesRoute =require("./routes/facilitiesRoute")
// // const testimonialRoutes = require("./routes/testimonialRoute");
// // const receptionistRoutes = require("./routes/receptionistRoute");
// // const app = express();

// // // =======================
// // // MIDDLEWARE
// // // =======================
// // app.use(express.json());
// // app.use(express.urlencoded({ extended: true }));
// // app.use(cookieParser()); // ✅ Allows Express to read/write cookies


// // // ✅ CORS setup for cookie-based authentication
// // app.use(cors({
// //   origin: "http://localhost:5173", // Your React frontend
// //   methods: ["GET", "POST", "PUT", "PATCH", "DELETE"],
// //   credentials: true // ✅ Important: allows cookies to be sent across origins
// // }));

// // // =======================
// // // DATABASE CONNECTION
// // // =======================
// // mongoose.connect(process.env.MONGO_URI, {
// //   useNewUrlParser: true,
// //   useUnifiedTopology: true,
// // })
// // .then(() => console.log("✅ Connected to MongoDB"))
// // .catch((err) => console.error("❌ DB connection error:", err));

// // // =======================
// // // ROUTES
// // // =======================
// // app.use("/", adminRoutes);
// // app.use("/rooms", roomRoutes);
// // app.use("/bookings", bookingRoutes);
// // app.use("/facilities", facilitiesRoute);
// // app.use("/testimonials", testimonialRoutes);
// // app.use("/receptionists", receptionistRoutes);

// // // Test route
// // app.get("/", (req, res) => {
// //   res.send("🚀 Server is running securely with cookies!");
// // });

// // // =======================
// // // START SERVER
// // // =======================
// // const PORT = process.env.PORT || 3000;
// // app.listen(PORT, () => console.log(`✅ Server running on http://localhost:${PORT}`));
// require("dotenv").config();
// const express = require("express");
// const mongoose = require("mongoose");
// const cors = require("cors");
// const cookieParser = require("cookie-parser");

// const bookingRoutes = require("./routes/bookingRoutes");
// const adminRoutes = require("./routes/adminRoutes");
// const roomRoutes = require("./routes/roomRoute");
// const facilitiesRoute = require("./routes/facilitiesRoute");
// const testimonialRoutes = require("./routes/testimonialRoute");
// const receptionistRoutes = require("./routes/receptionistRoute");

// const app = express();

// // =======================
// // MIDDLEWARE
// // =======================
// app.use(express.json());
// app.use(express.urlencoded({ extended: true }));
// app.use(cookieParser());

// // =======================
// // CORS CONFIG (IMPORTANT FOR RENDER)
// // =======================

// const allowedOrigins = [
//   "http://localhost:5173",               // local React dev

// ];

// app.use(
//   cors({
//     origin: function (origin, callback) {
//       if (!origin || allowedOrigins.includes(origin)) {
//         callback(null, true);
//       } else {
//         callback(new Error("Not allowed by CORS"));
//       }
//     },
//     credentials: true,
//     methods: ["GET", "POST", "PUT", "PATCH", "DELETE"],
//   })
// );

// // =======================
// // DATABASE CONNECTION (RENDER FRIENDLY)
// // =======================

// mongoose
//   .connect(process.env.MONGO_URI, {
//     useNewUrlParser: true,
//     useUnifiedTopology: true,
//   })
//   .then(() => console.log("✅ Connected to MongoDB"))
//   .catch((err) => console.error("❌ DB connection error:", err));

// // =======================
// // ROUTES
// // =======================
// app.use("/", adminRoutes);
// app.use("/rooms", roomRoutes);
// app.use("/bookings", bookingRoutes);
// app.use("/facilities", facilitiesRoute);
// app.use("/testimonials", testimonialRoutes);
// app.use("/receptionists", receptionistRoutes);

// // Health check route for Render
// app.get("/health", (req, res) => {
//   res.json({ status: "ok" });
// });

// // Test route
// app.get("/", (req, res) => {
//   res.send("🚀 Backend running successfully on Render!");
// });

// // =======================
// // START SERVER
// // =======================
// const PORT = process.env.PORT || 3000;
// app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const cookieParser = require("cookie-parser");

const bookingRoutes = require("./routes/bookingRoutes");
const adminRoutes = require("./routes/adminRoutes");
const roomRoutes = require("./routes/roomRoute");
const facilitiesRoute = require("./routes/facilitiesRoute");
const testimonialRoutes = require("./routes/testimonialRoute");
const receptionistRoutes = require("./routes/receptionistRoute");

const app = express();

// =======================
// MIDDLEWARE
// =======================
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// =======================
// ✔ FIXED CORS FOR RENDER + COOKIES
// =======================
// app.use(
//   cors({
//     origin: [
//       "http://localhost:5173",          // local frontend
//       process.env.FRONTEND_URL || ""    // deployed frontend (future)
//     ],
//     credentials: true,
//   })
// );
app.use(
  cors({
    origin: [
      "http://localhost:5173",
      "https://thim-dorji-frontend.vercel.app",
      "https://thim-dorji-frontend-ami1.vercel.app",
      "https://thim-dorji-frontend-m6uj.vercel.app"
    ],
    credentials: true,
  })
);

// app.use(
//   cors({
//     origin: [
//       "http://localhost:5173",                 // local development
//       "https://thim-dorji-frontend-m6uj.vercel.app",
//       "https://thim-dorji-frontend.vercel.app",
//       "https://thim-dorji-frontend-ami1.vercel.app"
//     ],
//     credentials: true,
//   })
// );

// =======================
// DATABASE CONNECTION
// =======================
mongoose
  .connect(process.env.MONGO_URI, {
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

// Health check for Render
app.get("/health", (req, res) => {
  res.json({ status: "ok" });
});

// Welcome
app.get("/", (req, res) => {
  res.send("🚀 Backend running successfully on Render!");
});

// =======================
// START SERVER
// =======================
const PORT = process.env.PORT || 3000;
app.listen(PORT, () =>
  console.log(`🚀 Server running on port ${PORT}`)
);
