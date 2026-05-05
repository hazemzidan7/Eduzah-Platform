/**
 * Single master CRM spreadsheet + tab "enrollmentRequests".
 * Spreadsheet ID hardcoded below (created via Claude on 2026-05-05).
 */

var SHEET_TAB_NAME = "enrollmentRequests";
var HARDCODED_SPREADSHEET_ID = "1AnzgvWeyaH-I1b6ZtobEJD8po0u9st4WdAlTIATh2Us";
var DOC_PROP_SPREADSHEET_ID = "MASTER_CRM_SPREADSHEET_ID";
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
  "Governorate",
  "Education Level",
  "Has PC",
  "Programming Level",
  "Employment Status",
  "Contact Method",
  "Pay OK",
];

function jsonResponse_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

function num_(v) {
  if (v === null || v === undefined || v === "") return 0;
  var n = Number(v);
  return isNaN(n) ? 0 : n;
}

function round2_(n) {
  return Math.round((Number(n) + Number.EPSILON) * 100) / 100;
}

function str_(v) {
  return v === null || v === undefined ? "" : String(v).trim();
}

function getOrCreateSpreadsheet() {
  // Use hardcoded sheet first, then Script Properties as fallback
  var id = HARDCODED_SPREADSHEET_ID;
  if (!id) {
    var props = PropertiesService.getScriptProperties();
    id = props.getProperty(DOC_PROP_SPREADSHEET_ID);
  }
  if (id) {
    try {
      return SpreadsheetApp.openById(String(id).trim());
    } catch (err) {}
  }
  var ss = SpreadsheetApp.create("CRM Enrollments Master");
  var props = PropertiesService.getScriptProperties();
  props.setProperty(DOC_PROP_SPREADSHEET_ID, ss.getId());
  return ss;
}

function getOrCreateSheet(ss) {
  var sh = ss.getSheetByName(SHEET_TAB_NAME);
  if (!sh) {
    sh = ss.insertSheet(SHEET_TAB_NAME);
  }
  return sh;
}

function ensureHeaders(sh) {
  var needsUpdate = false;
  if (sh.getLastRow() < 1) {
    needsUpdate = true;
  } else {
    var lastCol = sh.getLastColumn();
    if (lastCol < HEADER_ROW.length) {
      needsUpdate = true;
    } else {
      var row = sh.getRange(1, 1, 1, HEADER_ROW.length).getValues()[0];
      for (var i = 0; i < HEADER_ROW.length; i++) {
        if (String(row[i]).trim() !== HEADER_ROW[i]) { needsUpdate = true; break; }
      }
    }
  }
  if (needsUpdate) {
    sh.getRange(1, 1, 1, HEADER_ROW.length).setValues([HEADER_ROW]);
    sh.getRange(1, 1, 1, HEADER_ROW.length).setFontWeight("bold");
  }
}

function parseRequest(e) {
  if (!e || !e.postData || e.postData.contents === undefined) {
    throw new Error("Empty request body");
  }
  var raw = String(e.postData.contents).trim();
  if (raw === "") throw new Error("Empty request body");
  var data;
  try { data = JSON.parse(raw); } catch (parseErr) { throw new Error("Invalid JSON"); }
  if (!data || typeof data !== "object") throw new Error("JSON body must be an object");
  var fullName = str_(data.fullName);
  var phone = str_(data.phone);
  if (!fullName || !phone) throw new Error("Missing required fields: fullName, phone");
  return data;
}

function calculateFields(data) {
  var courseCost = round2_(num_(data.courseCost));
  var deposit    = round2_(num_(data.deposit));
  var inst1      = round2_(num_(data.inst1));
  var inst2      = round2_(num_(data.inst2));
  var inst3      = round2_(num_(data.inst3));
  var paidSum    = round2_(deposit + inst1 + inst2 + inst3);
  var balance    = round2_(courseCost - paidSum);
  return { courseCost, deposit, inst1, inst2, inst3, paidSum, balance };
}

function buildRow_(data, calc) {
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
    calc.courseCost,
    calc.deposit,
    calc.inst1,
    calc.inst2,
    calc.inst3,
    calc.paidSum,
    calc.balance,
    str_(data.email),
    str_(data.governorate),
    str_(data.educationLevel),
    str_(data.hasPC),
    str_(data.programmingLevel),
    str_(data.employmentStatus),
    str_(data.contactMethod),
    str_(data.payOk),
  ];
}

function doPost(e) {
  try {
    var data = parseRequest(e);
    var ss = getOrCreateSpreadsheet();
    var sh = getOrCreateSheet(ss);
    ensureHeaders(sh);
    var calc = calculateFields(data);
    sh.appendRow(buildRow_(data, calc));
    return jsonResponse_({ success: true, message: "Row added successfully" });
  } catch (err) {
    return jsonResponse_({ success: false, message: err.message || String(err) });
  }
}

function doGet() {
  return jsonResponse_({ success: true, message: "CRM master Web App active. POST text/plain JSON body." });
}
