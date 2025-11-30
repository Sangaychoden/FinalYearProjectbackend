
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
// const contactRoutes = require("./routes/contactRoute");

// const app = express();

// // =======================
// // MIDDLEWARE
// // =======================
// app.use(express.json());
// app.use(express.urlencoded({ extended: true }));
// app.use(cookieParser());

// // =======================
// // ✔ FIXED CORS FOR RENDER + COOKIES
// // =======================
// // app.use(
// //   cors({
// //     origin: [
// //       "http://localhost:5173",          // local frontend
// //       process.env.FRONTEND_URL || ""    // deployed frontend (future)
// //     ],
// //     credentials: true,
// //   })
// // );
// app.use(
//   cors({
//     origin: [
//       "http://localhost:5173",
//       "http://localhost:5174",
//       "http://localhost:5175",
//       "https://thimdorjiwebsite.onrender.com",
//       "https://thimdorjiadmin.onrender.com",
//       "https://thimdorjireceptionist.onrender.com",
//       "https://thim-dorji-frontend.vercel.app",
//       "https://thim-dorji-frontend-ami1.vercel.app",
//       "https://thim-dorji-frontend-m6uj.vercel.app"
//     ],
//     credentials: true,
//   })
// );

// // app.use(
// //   cors({
// //     origin: [
// //       "http://localhost:5173",                 // local development
// //       "https://thim-dorji-frontend-m6uj.vercel.app",
// //       "https://thim-dorji-frontend.vercel.app",
// //       "https://thim-dorji-frontend-ami1.vercel.app"
// //     ],
// //     credentials: true,
// //   })
// // );

// // =======================
// // DATABASE CONNECTION
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
// app.use("/contact", contactRoutes);

// // Health check for Render
// app.get("/health", (req, res) => {
//   res.json({ status: "ok" });
// });

// // Welcome
// app.get("/", (req, res) => {
//   res.send("🚀 Backend running successfully on Render!");
// });

// // =======================
// // START SERVER
// // =======================
// const PORT = process.env.PORT || 3000;
// app.listen(PORT, () =>
//   console.log(`🚀 Server running on port ${PORT}`)
// );
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
const contactRoutes = require("./routes/contactRoute");

const app = express();

// =======================
// ⭐ REQUIRED FOR EXPRESS-RATE-LIMIT + RENDER
// =======================
app.set("trust proxy", 1);

// =======================
// MIDDLEWARE
// =======================
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// =======================
// CORS
// =======================
app.use(
  cors({
    origin: [
      "http://localhost:5173",
      "http://localhost:5174",
      "http://localhost:5175",
      "https://thimdorjiwebsite.onrender.com",
      "https://thimdorjiadmin.onrender.com",
      "https://thimdorjireceptionist.onrender.com",
      "https://thim-dorji-frontend.vercel.app",
      "https://thim-dorji-frontend-ami1.vercel.app",
      "https://thim-dorji-frontend-m6uj.vercel.app",
      "https://thimdorjiwebsite-vaaz.onrender.com",
      "https://thimdorjiadmin-ovza.onrender.com",
      "https://thimdorjireceptionist-zbce.onrender.com"
    ],
    credentials: true,
  })
);

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
app.use("/contact", contactRoutes);

// HEALTH CHECK
app.get("/health", (req, res) => {
  res.json({ status: "ok" });
});

// WELCOME ROUTE
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
