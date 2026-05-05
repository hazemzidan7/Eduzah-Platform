/**
 * Single master CRM spreadsheet + tab "enrollmentRequests".
 * Spreadsheet ID: PropertiesService key MASTER_CRM_SPREADSHEET_ID
 */

var SHEET_TAB_NAME = "enrollmentRequests";
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
  var props = PropertiesService.getScriptProperties();
  var id = props.getProperty(DOC_PROP_SPREADSHEET_ID);
  if (id) {
    try {
      return SpreadsheetApp.openById(String(id).trim());
    } catch (err) {
      props.deleteProperty(DOC_PROP_SPREADSHEET_ID);
    }
  }
  var ss = SpreadsheetApp.create("CRM Enrollments Master");
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

function headersMatchRow1_(sh) {
  if (sh.getLastRow() < 1) return false;
  if (sh.getLastColumn() < HEADER_ROW.length) return false;
  var row = sh.getRange(1, 1, 1, HEADER_ROW.length).getValues()[0];
  for (var i = 0; i < HEADER_ROW.length; i++) {
    if (String(row[i]).trim() !== HEADER_ROW[i]) return false;
  }
  return true;
}

function ensureHeaders(sh) {
  if (!headersMatchRow1_(sh)) {
    sh.getRange(1, 1, 1, HEADER_ROW.length).setValues([HEADER_ROW]);
    sh.getRange(1, 1, 1, HEADER_ROW.length).setFontWeight("bold");
  }
}

function validateHeadersExact(sh) {
  return headersMatchRow1_(sh);
}

function parseRequest(e) {
  if (!e || !e.postData || e.postData.contents === undefined) {
    throw new Error("Empty request body");
  }
  var raw = String(e.postData.contents).trim();
  if (raw === "") {
    throw new Error("Empty request body");
  }
  var data;
  try {
    data = JSON.parse(raw);
  } catch (parseErr) {
    throw new Error("Invalid JSON");
  }
  if (!data || typeof data !== "object") {
    throw new Error("JSON body must be an object");
  }
  var fullName = str_(data.fullName);
  var phone = str_(data.phone);
  if (!fullName || !phone) {
    throw new Error("Missing required fields: fullName, phone");
  }
  return data;
}

function calculateFields(data) {
  var courseCost = round2_(num_(data.courseCost));
  var deposit = round2_(num_(data.deposit));
  var inst1 = round2_(num_(data.inst1));
  var inst2 = round2_(num_(data.inst2));
  var inst3 = round2_(num_(data.inst3));
  var paidSum = round2_(deposit + inst1 + inst2 + inst3);
  var balance = round2_(courseCost - paidSum);
  return {
    courseCost: courseCost,
    deposit: deposit,
    inst1: inst1,
    inst2: inst2,
    inst3: inst3,
    paidSum: paidSum,
    balance: balance,
  };
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
    str_(data.payOk),
  ];
}

function doPost(e) {
  try {
    var data = parseRequest(e);
    var ss = getOrCreateSpreadsheet();
    var sh = getOrCreateSheet(ss);
    ensureHeaders(sh);
    if (!validateHeadersExact(sh)) {
      return jsonResponse_({
        success: false,
        message: "Sheet headers do not match required format",
      });
    }
    var calc = calculateFields(data);
    sh.appendRow(buildRow_(data, calc));
    return jsonResponse_({ success: true, message: "Row added successfully" });
  } catch (err) {
    return jsonResponse_({
      success: false,
      message: err.message || String(err),
    });
  }
}

function doGet() {
  try {
    return jsonResponse_({ success: true, message: "CRM master Web App active. POST text/plain JSON body." });
  } catch (err) {
    return jsonResponse_({ success: false, message: err.message || String(err) });
  }
}
