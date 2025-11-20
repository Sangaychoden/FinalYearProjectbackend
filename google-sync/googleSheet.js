const { google } = require("googleapis");
const credentials = require("../config/thimdorjiresort-6bcdac17290b.json");
const sheetMap = require("./sheetMap");
const roomRows = require("./roomRows");
const Booking = require("../models/bookingModels");

// Fix private key
const privateKey = credentials.private_key.replace(/\\n/g, "\n");

const auth = new google.auth.JWT({
  email: credentials.client_email,
  key: privateKey,
  scopes: ["https://www.googleapis.com/auth/spreadsheets"]
});

const sheets = google.sheets({ version: "v4", auth });

/* ------------------------------------------
 ✅ WRITE BOOKING ROW (Guest 1 & Guest 2 stay)
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
      symbol, "", booking.bookingNumber || "", "", "",
      "Guest 1", "", "", fullName || "", "", nationality, "", passport, checkout
    ],
    [
      "-", "", "", "", "",
      "Guest 2", "", "", "", "", "", "", "", ""
    ]
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
 ✅ Booking Symbol
-------------------------------------------*/
function getSymbol(status) {
  if (status === "pending") return "R";
  if (status === "confirmed") return "C";
  if (status === "guaranted") return "G";
  return "-";
}

/* ------------------------------------------
 ✅ WRITE BOOKING ACROSS STAY DATES
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
 ✅ EXPORT WRITE FUNCTIONS
-------------------------------------------*/
exports.addBookingToSheet = async booking => writeBooking(booking);
exports.updateBookingInSheet = async booking => writeBooking(booking);

/* ------------------------------------------
 ✅ Remove booking rows from sheets
-------------------------------------------*/
exports.removeBookingFromSheet = async function (booking) {
  if (!booking.assignedRoom) return;

  const row = roomRows[booking.assignedRoom];
  if (!row) return;

  let d = new Date(booking.checkIn);
  const end = new Date(booking.checkOut);
  d.setHours(0, 0, 0, 0);
  end.setHours(0, 0, 0, 0);

  while (d <= end) {
    const month = d.getMonth() + 1;
    const sheetId = sheetMap[month];
    const tab = String(d.getDate());

    if (sheetId) {
      await sheets.spreadsheets.values.update({
        spreadsheetId: sheetId,
        range: `${tab}!B${row}:O${row}`,
        valueInputOption: "USER_ENTERED",
        resource: { values: [["", "", "", "", "", "", "", "", "", "", "", "", "", ""]] }
      });
    }
    d.setDate(d.getDate() + 1);
  }

  console.log(`✅ Removed booking rows for ${booking.bookingNumber}`);
};

/* ------------------------------------------
 ✅ SYNC ALL DB BOOKINGS → SHEETS ON STARTUP
-------------------------------------------*/
async function syncAllBookingsToSheets() {
  const bookings = await Booking.find();
  console.log(`🔄 Syncing ${bookings.length} bookings...`);

  for (const b of bookings) await writeBooking(b);
  console.log("✅ Sync complete");
}
/* ------------------------------------------
 ✅ CLEAN SHEETS — REMOVE ORPHANED BOOKINGS (Batch Optimized)
    - Keeps A & G
    - Clears only B, D, J, L, O
    - Avoids quota errors
-------------------------------------------*/
async function cleanOrphanedSheetBookings() {
  console.log("🔍 Checking for orphaned bookings in sheets...");

  // 1. Get all booking numbers from DB
  const dbBookings = await Booking.find({}, "bookingNumber");
  const dbBookingNumbers = new Set(dbBookings.map(b => b.bookingNumber?.trim()).filter(Boolean));

  // 2. Loop through each month sheet
  for (const [month, sheetId] of Object.entries(sheetMap)) {
    try {
      // ✅ Fetch all existing tabs
      const meta = await sheets.spreadsheets.get({ spreadsheetId: sheetId });
      const existingTabs = meta.data.sheets.map(s => s.properties.title);

      for (const tab of existingTabs) {
        if (isNaN(tab)) continue; // skip non-date tabs like "Info", etc.

        const range = `${tab}!A:O`;
        const res = await sheets.spreadsheets.values.get({
          spreadsheetId: sheetId,
          range,
        });

        const values = res.data.values || [];
        if (values.length === 0) continue;

        let modified = false;

        // Go through rows once
        for (let i = 0; i < values.length; i++) {
          const row = values[i];
          const bookingNum = (row[2] || "").trim(); // column C

          if (bookingNum && !dbBookingNumbers.has(bookingNum)) {
            // Only clear B, D, J, L, O (indices 1, 3, 9, 11, 14)
            const colsToClear = [1, 3, 9, 11, 14];
            for (const col of colsToClear) {
              if (row[col]) row[col] = "";
            }
            modified = true;
          }
        }

        // Only write back if something changed
        if (modified) {
          await sheets.spreadsheets.values.update({
            spreadsheetId: sheetId,
            range,
            valueInputOption: "USER_ENTERED",
            resource: { values },
          });
          console.log(`🧹 Updated orphaned bookings in ${tab}/${month}`);
        }
      }
    } catch (err) {
      console.warn(`⚠️ Error cleaning sheet ${month}: ${err.message}`);
    }
  }

  console.log("✅ Selective batch cleanup complete!");
}


/* ------------------------------------------
 ✅ INIT
-------------------------------------------*/
(async () => {
  try {
    await sheets.spreadsheets.get({ spreadsheetId: sheetMap[1] });
    console.log("✅ Google Sheets connected");

    await syncAllBookingsToSheets();
    await cleanOrphanedSheetBookings(); // 🧹 Now clears only B,D,J,L,O
  } catch (err) {
    console.error("❌ Sheets connect failed:", err.message);
  }
})();
