/**
 * CRM → Google Sheet Web App
 *
 * Columns (exact order): Date, Full name, Phone, Attendance, Diploma, Booking via,
 * Follow-up, Notes, Plan, Course cost, Deposit, Inst. 1, Inst. 2, Inst. 3,
 * Paid (sum), Balance, Email, Pay OK
 *
 * Setup:
 * 1) Bind this project to your CRM spreadsheet (Extensions → Apps Script) OR set SPREADSHEET_ID via script property.
 * 2) Adjust SHEET_NAME if your tab label differs.
 * 3) Deploy → Web app → Execute as: Me, Who has access: Anyone
 *
 * Optional: PropertiesService script property ENROLLMENT_SECRET + pass ?token= or JSON "token"
 */

var SHEET_NAME = "CRM";

var HEADER_ROW = [
  "Date",
  "Full name",
  "Phone",
  "Attendance",
  "Diploma",
  "Booking via",
  "Follow-up",
  "Notes",
  "Plan",
  "Course cost",
  "Deposit",
  "Inst. 1",
  "Inst. 2",
  "Inst. 3",
  "Paid (sum)",
  "Balance",
  "Email",
  "Pay OK",
];

var SPREADSHEET_ID_HARDCODED = "";

function jsonResponse_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

function getSpreadsheet_() {
  var id = SPREADSHEET_ID_HARDCODED || PropertiesService.getScriptProperties().getProperty("SPREADSHEET_ID");
  if (id) {
    return SpreadsheetApp.openById(String(id).trim());
  }
  return SpreadsheetApp.getActiveSpreadsheet();
}

/** One-time helper from the editor (standalone projects). */
function setupSpreadsheetId_(spreadsheetId) {
  PropertiesService.getScriptProperties().setProperty("SPREADSHEET_ID", String(spreadsheetId).trim());
}

function setupCrmSecret_(secret) {
  PropertiesService.getScriptProperties().setProperty("ENROLLMENT_SECRET", String(secret).trim());
}

function num_(v) {
  if (v === null || v === undefined || v === "") return 0;
  var n = Number(v);
  return isNaN(n) ? 0 : n;
}

/** Two-decimal rounding for currency-like numbers in the sheet. */
function round2_(n) {
  return Math.round((Number(n) + Number.EPSILON) * 100) / 100;
}

function str_(v) {
  return v === null || v === undefined ? "" : String(v).trim();
}

/** Returns true if row1 matches HEADER_ROW (same length + same string values). */
function rowMatchesHeaders_(sheet) {
  if (sheet.getLastRow() < 1) return false;
  var lastCol = sheet.getLastColumn();
  if (lastCol < HEADER_ROW.length) return false;
  var existing = sheet.getRange(1, 1, 1, HEADER_ROW.length).getValues()[0];
  for (var i = 0; i < HEADER_ROW.length; i++) {
    if (String(existing[i]).trim() !== HEADER_ROW[i]) return false;
  }
  return true;
}

/** Get or create sheet; ensure headers exist exactly once — never duplicate. */
function getOrEnsureCrmSheet_(ss) {
  var sh = ss.getSheetByName(SHEET_NAME);
  if (!sh) {
    sh = ss.insertSheet(SHEET_NAME);
    sh.appendRow(HEADER_ROW);
    sh.getRange(1, 1, 1, HEADER_ROW.length).setFontWeight("bold");
    return sh;
  }
  if (sh.getLastRow() === 0) {
    sh.appendRow(HEADER_ROW);
    sh.getRange(1, 1, 1, HEADER_ROW.length).setFontWeight("bold");
    return sh;
  }
  if (!rowMatchesHeaders_(sh)) {
    throw new Error(
      'Tab "' +
        SHEET_NAME +
        '" row 1 must match the expected CRM headers. Fix row 1 or use a new tab name (SHEET_NAME).'
    );
  }
  return sh;
}

function buildRowFromPayload_(data) {
  var courseCost = round2_(num_(data.courseCost));
  var deposit = round2_(num_(data.deposit));
  var inst1 = round2_(num_(data.inst1));
  var inst2 = round2_(num_(data.inst2));
  var inst3 = round2_(num_(data.inst3));
  var paidSum = round2_(deposit + inst1 + inst2 + inst3);
  var balance = round2_(courseCost - paidSum);

  return [
    new Date(),
    str_(data.fullName),
    str_(data.phone),
    str_(data.attendance),
    str_(data.diploma),
    str_(data.bookingVia),
    str_(data.followUp),
    str_(data.notes),
    str_(data.plan),
    courseCost,
    deposit,
    inst1,
    inst2,
    inst3,
    paidSum,
    balance,
    str_(data.email),
    str_(data.payOk),
  ];
}

function doPost(e) {
  try {
    if (!e.postData || e.postData.contents === undefined || String(e.postData.contents).trim() === "") {
      return jsonResponse_({ success: false, message: "Empty request body" });
    }

    var data;
    try {
      data = JSON.parse(e.postData.contents);
    } catch (ignoreParse) {
      return jsonResponse_({ success: false, message: "Invalid JSON body" });
    }
    if (!data || typeof data !== "object") {
      return jsonResponse_({ success: false, message: "JSON body must be an object" });
    }

    var secret = PropertiesService.getScriptProperties().getProperty("ENROLLMENT_SECRET");
    if (secret) {
      var qTok = e.parameter && e.parameter.token != null ? String(e.parameter.token) : "";
      var bodyTok = data.token != null ? String(data.token) : "";
      if ((qTok || bodyTok) !== secret) {
        return jsonResponse_({ success: false, message: "Unauthorized" });
      }
    }
    if (data.token !== undefined) delete data.token;

    var ss = getSpreadsheet_();
    var sh = getOrEnsureCrmSheet_(ss);
    var row = buildRowFromPayload_(data);
    sh.appendRow(row);

    return jsonResponse_({ success: true, message: "Row added successfully" });
  } catch (err) {
    return jsonResponse_({
      success: false,
      message: err.message || String(err),
    });
  }
}

function doGet() {
  return jsonResponse_({
    success: true,
    message: "CRM Web App is active. POST JSON to this URL.",
  });
}