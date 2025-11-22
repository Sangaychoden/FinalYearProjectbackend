
// const { google } = require("googleapis");
// const sheetMap = require("./sheetMap");
// const roomRows = require("./roomRows");
// const Booking = require("../models/bookingModels");

// /* ------------------------------------------
//  ✅ LOAD GOOGLE CREDENTIALS FROM ENV
// -------------------------------------------*/
// if (!process.env.GOOGLE_SERVICE_ACCOUNT_JSON) {
//   throw new Error("❌ Missing GOOGLE_SERVICE_ACCOUNT_JSON environment variable.");
// }

// const credentials = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON);

// // Fix private key newlines
// const privateKey = credentials.private_key.replace(/\\n/g, "\n");

// /* ------------------------------------------
//  ✅ GOOGLE AUTH
// -------------------------------------------*/
// const auth = new google.auth.JWT({
//   email: credentials.client_email,
//   key: privateKey,
//   scopes: ["https://www.googleapis.com/auth/spreadsheets"],
// });

// const sheets = google.sheets({ version: "v4", auth });

// /* ------------------------------------------
//  ✅ SYMBOLS FOR BOOKING STATUS
// -------------------------------------------*/
// function getSymbol(status) {
//   if (status === "pending") return "R";     // Reserved
//   if (status === "confirmed") return "C";   // Confirmed
//   if (status === "guaranteed") return "G";  // FULL PAYMENT ✔ FIXED SPELLING
//   return "-";
// }

// /* ------------------------------------------
//  ✅ WRITE A BOOKING ROW
// -------------------------------------------*/
// async function writeBookingRow(sheetId, tab, row, booking, symbol) {
//   const range = `${tab}!B${row}:O${row + 1}`;

//   const fullName = `${booking.firstName || ""} ${booking.lastName || ""}`.trim();
//   const nationality = booking.country || "";
//   const passport = booking.passportNumber || "";

//   const checkout = booking.checkOut
//     ? new Date(booking.checkOut).toLocaleDateString("en-GB")
//     : "";

//   const values = [
//     [
//       symbol,
//       "",
//       booking.bookingNumber || "",
//       "",
//       "",
//       "Guest 1",
//       "",
//       "",
//       fullName,
//       "",
//       nationality,
//       "",
//       passport,
//       checkout,
//     ],
//     [
//       "-",
//       "",
//       "",
//       "",
//       "",
//       "Guest 2",
//       "",
//       "",
//       "",
//       "",
//       "",
//       "",
//       "",
//       "",
//     ],
//   ];

//   await sheets.spreadsheets.values.update({
//     spreadsheetId: sheetId,
//     range,
//     valueInputOption: "USER_ENTERED",
//     resource: { values },
//   });

//   console.log(`✅ Sheet updated → ${booking.bookingNumber} (${symbol})`);
// }

// /* ------------------------------------------
//  ✅ WRITE BOOKING ACROSS ALL STAY DAYS
// -------------------------------------------*/
// async function writeBooking(booking) {
//   if (!booking.assignedRoom) return;

//   const assignedRooms = Array.isArray(booking.assignedRoom)
//     ? booking.assignedRoom
//     : [booking.assignedRoom];

//   const symbol = getSymbol(booking.status);
//   if (!symbol) return;

//   let d = new Date(booking.checkIn);
//   const end = new Date(booking.checkOut);

//   d.setHours(0, 0, 0, 0);
//   end.setHours(0, 0, 0, 0);

//   while (d <= end) {
//     const month = d.getMonth() + 1;
//     const sheetId = sheetMap[month];
//     const tab = String(d.getDate());

//     if (sheetId) {
//       for (const roomNum of assignedRooms) {
//         const row = roomRows[roomNum];
//         if (row) {
//           await writeBookingRow(sheetId, tab, row, booking, symbol);
//         } else {
//           console.log(`❌ Room row not mapped: ${roomNum}`);
//         }
//       }
//     }

//     d.setDate(d.getDate() + 1);
//   }
// }

// /* ------------------------------------------
//  ✅ EXPORTS
// -------------------------------------------*/
// exports.addBookingToSheet = async (b) => writeBooking(b);
// exports.updateBookingInSheet = async (b) => writeBooking(b);

// /* ------------------------------------------
//  ❌ REMOVE BOOKING FROM SHEETS
// -------------------------------------------*/
// exports.removeBookingFromSheet = async function (booking) {
//   if (!booking.assignedRoom) return;

//   const assignedRooms = Array.isArray(booking.assignedRoom)
//     ? booking.assignedRoom
//     : [booking.assignedRoom];

//   let d = new Date(booking.checkIn);
//   const end = new Date(booking.checkOut);
//   d.setHours(0, 0, 0, 0);
//   end.setHours(0, 0, 0, 0);

//   while (d <= end) {
//     const month = d.getMonth() + 1;
//     const sheetId = sheetMap[month];
//     const tab = String(d.getDate());

//     if (sheetId) {
//       for (const room of assignedRooms) {
//         const row = roomRows[room];
//         if (!row) continue;

//         await sheets.spreadsheets.values.update({
//           spreadsheetId: sheetId,
//           range: `${tab}!B${row}:O${row}`,
//           valueInputOption: "USER_INPUT",
//           resource: {
//             values: [["", "", "", "", "", "", "", "", "", "", "", "", "", ""]],
//           },
//         });
//       }
//     }

//     d.setDate(d.getDate() + 1);
//   }

//   console.log(`🗑️ Removed booking rows for ${booking.bookingNumber}`);
// };

// /* ------------------------------------------
//  🔄 SYNC ALL BOOKINGS FROM DB → SHEET
// -------------------------------------------*/
// async function syncAllBookingsToSheets() {
//   const bookings = await Booking.find();
//   console.log(`🔄 Syncing ${bookings.length} bookings...`);

//   for (const b of bookings) {
//     await writeBooking(b);
//   }

//   console.log("✅ Sync complete");
// }

// /* ------------------------------------------
//  🧹 CLEAN ORPHANED SHEET ENTRIES
// -------------------------------------------*/
// async function cleanOrphanedSheetBookings() {
//   console.log("🔍 Checking for orphaned bookings...");

//   const dbBookings = await Booking.find({}, "bookingNumber");
//   const dbSet = new Set(
//     dbBookings.map((b) => b.bookingNumber?.trim()).filter(Boolean)
//   );

//   for (const [month, sheetId] of Object.entries(sheetMap)) {
//     try {
//       const meta = await sheets.spreadsheets.get({ spreadsheetId: sheetId });
//       const tabs = meta.data.sheets.map((s) => s.properties.title);

//       for (const tab of tabs) {
//         if (isNaN(tab)) continue;

//         const range = `${tab}!A:O`;
//         const res = await sheets.spreadsheets.values.get({
//           spreadsheetId: sheetId,
//           range,
//         });

//         const values = res.data.values || [];
//         if (!values.length) continue;

//         let modified = false;

//         for (let i = 0; i < values.length; i++) {
//           const bookingNum = (values[i][2] || "").trim();

//           if (bookingNum && !dbSet.has(bookingNum)) {
//             [1, 3, 9, 11, 14].forEach((col) => (values[i][col] = ""));
//             modified = true;
//           }
//         }

//         if (modified) {
//           await sheets.spreadsheets.values.update({
//             spreadsheetId: sheetId,
//             range,
//             valueInputOption: "USER_ENTERED",
//             resource: { values },
//           });
//           console.log(`🧹 Cleaned ${tab}/${month}`);
//         }
//       }
//     } catch (err) {
//       console.warn(`⚠️ Error cleaning month ${month}: ${err.message}`);
//     }
//   }

//   console.log("✅ Cleanup complete!");
// }

// /* ------------------------------------------
//  🚀 INIT – VERIFY CONNECTION
// -------------------------------------------*/
// (async () => {
//   try {
//     await sheets.spreadsheets.get({ spreadsheetId: sheetMap[1] });
//     console.log("✅ Google Sheets connected");

//     await syncAllBookingsToSheets();
//     await cleanOrphanedSheetBookings();
//   } catch (err) {
//     console.error("❌ Sheets connect failed:", err.message);
//   }
// })();
const { google } = require("googleapis");
const sheetMap = require("./sheetMap");
const roomRows = require("./roomRows");
const Booking = require("../models/bookingModels");

/* ------------------------------------------
 ✅ LOAD GOOGLE CREDENTIALS FROM ENV
-------------------------------------------*/
if (!process.env.GOOGLE_SERVICE_ACCOUNT_JSON) {
  throw new Error("❌ Missing GOOGLE_SERVICE_ACCOUNT_JSON environment variable.");
}

const credentials = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON);

// Fix private key newlines
const privateKey = credentials.private_key.replace(/\\n/g, "\n");

/* ------------------------------------------
 ✅ GOOGLE AUTH
-------------------------------------------*/
const auth = new google.auth.JWT({
  email: credentials.client_email,
  key: privateKey,
  scopes: ["https://www.googleapis.com/auth/spreadsheets"],
});

const sheets = google.sheets({ version: "v4", auth });

/* ------------------------------------------
 ✅ SYMBOLS FOR BOOKING STATUS
-------------------------------------------*/
function getSymbol(status) {
  if (status === "pending") return "R";     // Reserved
  if (status === "confirmed") return "C";   // Confirmed
  if (status === "guaranteed") return "G";  // FULL PAYMENT
  return "-";
}

/* ------------------------------------------
 ✅ WRITE A BOOKING ROW
-------------------------------------------*/
async function writeBookingRow(sheetId, tab, row, booking, symbol) {
  const range = `${tab}!B${row}:O${row + 1}`;

  const fullName = `${booking.firstName || ""} ${booking.lastName || ""}`.trim();
  const nationality = booking.country || "";
  const passport = booking.passportNumber || "";

  const checkout = booking.checkOut
    ? new Date(booking.checkOut).toLocaleDateString("en-GB")
    : "";

  const values = [
    [
      symbol,
      "",
      booking.bookingNumber || "",
      "",
      "",
      "Guest 1",
      "",
      "",
      fullName,
      "",
      nationality,
      "",
      passport,
      checkout,
    ],
    [
      "-",
      "",
      "",
      "",
      "",
      "Guest 2",
      "",
      "",
      "",
      "",
      "",
      "",
      "",
      "",
    ],
  ];

  await sheets.spreadsheets.values.update({
    spreadsheetId: sheetId,
    range,
    valueInputOption: "USER_ENTERED",
    resource: { values },
  });

  console.log(`✅ Sheet updated → ${booking.bookingNumber} (${symbol})`);
}

/* ------------------------------------------
 ✅ WRITE BOOKING ACROSS ALL STAY DAYS
-------------------------------------------*/
async function writeBooking(booking) {
  if (!booking.assignedRoom) return;

  const assignedRooms = Array.isArray(booking.assignedRoom)
    ? booking.assignedRoom
    : [booking.assignedRoom];

  const symbol = getSymbol(booking.status);
  if (!symbol) return;

  let d = new Date(booking.checkIn);
  const end = new Date(booking.checkOut);

  d.setHours(0, 0, 0, 0);
  end.setHours(0, 0, 0, 0);

  while (d <= end) {
    const month = d.getMonth() + 1;
    const sheetId = sheetMap[month];
    const tab = String(d.getDate());

    if (sheetId) {
      for (const roomNum of assignedRooms) {
        const row = roomRows[roomNum];
        if (row) {
          await writeBookingRow(sheetId, tab, row, booking, symbol);
        } else {
          console.log(`❌ Room row not mapped: ${roomNum}`);
        }
      }
    }

    d.setDate(d.getDate() + 1);
  }
}

/* ------------------------------------------
 ❌ REMOVE BOOKING FROM SHEETS
-------------------------------------------*/
exports.removeBookingFromSheet = async function (booking) {
  if (!booking.assignedRoom) return;

  const assignedRooms = Array.isArray(booking.assignedRoom)
    ? booking.assignedRoom
    : [booking.assignedRoom];

  let d = new Date(booking.checkIn);
  const end = new Date(booking.checkOut);
  d.setHours(0, 0, 0, 0);
  end.setHours(0, 0, 0, 0);

  while (d <= end) {
    const month = d.getMonth() + 1;
    const sheetId = sheetMap[month];
    const tab = String(d.getDate());

    if (sheetId) {
      for (const room of assignedRooms) {
        const row = roomRows[room];
        if (!row) continue;

        await sheets.spreadsheets.values.update({
          spreadsheetId: sheetId,
          range: `${tab}!B${row}:O${row}`,
          valueInputOption: "USER_INPUT",
          resource: {
            values: [["", "", "", "", "", "", "", "", "", "", "", "", "", ""]],
          },
        });
      }
    }

    d.setDate(d.getDate() + 1);
  }

  console.log(`🗑️ Removed booking rows for ${booking.bookingNumber}`);
};

/* ------------------------------------------
 ✅ EXPORTS (FIXED)
-------------------------------------------*/
exports.addBookingToSheet = async (b) => writeBooking(b);

// ⭐ FIXED: update = remove old rows + write new rows
exports.updateBookingInSheet = async (booking) => {
  try {
    await module.exports.removeBookingFromSheet(booking);   // clear old status
    await writeBooking(booking);                            // write new status
    console.log(`🔄 Updated booking in sheet → ${booking.bookingNumber}`);
  } catch (err) {
    console.error("❌ updateBookingInSheet failed:", err.message);
  }
};

/* ------------------------------------------
 🔄 SYNC ALL BOOKINGS FROM DB → SHEET
-------------------------------------------*/
async function syncAllBookingsToSheets() {
  const bookings = await Booking.find();
  console.log(`🔄 Syncing ${bookings.length} bookings...`);

  for (const b of bookings) {
    await writeBooking(b);
  }

  console.log("✅ Sync complete");
}

/* ------------------------------------------
 🧹 CLEAN ORPHANED SHEET ENTRIES
-------------------------------------------*/
async function cleanOrphanedSheetBookings() {
  console.log("🔍 Checking for orphaned bookings...");

  const dbBookings = await Booking.find({}, "bookingNumber");
  const dbSet = new Set(
    dbBookings.map((b) => b.bookingNumber?.trim()).filter(Boolean)
  );

  for (const [month, sheetId] of Object.entries(sheetMap)) {
    try {
      const meta = await sheets.spreadsheets.get({ spreadsheetId: sheetId });
      const tabs = meta.data.sheets.map((s) => s.properties.title);

      for (const tab of tabs) {
        if (isNaN(tab)) continue;

        const range = `${tab}!A:O`;
        const res = await sheets.spreadsheets.values.get({
          spreadsheetId: sheetId,
          range,
        });

        const values = res.data.values || [];
        if (!values.length) continue;

        let modified = false;

        for (let i = 0; i < values.length; i++) {
          const bookingNum = (values[i][2] || "").trim();

          if (bookingNum && !dbSet.has(bookingNum)) {
            [1, 3, 9, 11, 14].forEach((col) => (values[i][col] = ""));
            modified = true;
          }
        }

        if (modified) {
          await sheets.spreadsheets.values.update({
            spreadsheetId: sheetId,
            range,
            valueInputOption: "USER_ENTERED",
            resource: { values },
          });
          console.log(`🧹 Cleaned ${tab}/${month}`);
        }
      }
    } catch (err) {
      console.warn(`⚠️ Error cleaning month ${month}: ${err.message}`);
    }
  }

  console.log("✅ Cleanup complete!");
}

/* ------------------------------------------
 🚀 INIT – VERIFY CONNECTION
-------------------------------------------*/
(async () => {
  try {
    await sheets.spreadsheets.get({ spreadsheetId: sheetMap[1] });
    console.log("✅ Google Sheets connected");

    await syncAllBookingsToSheets();
    await cleanOrphanedSheetBookings();
  } catch (err) {
    console.error("❌ Sheets connect failed:", err.message);
  }
})();
