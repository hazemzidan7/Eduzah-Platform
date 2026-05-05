/**
 * Eduzah CRM — master enrollment spreadsheet.
 * • One tab per course (tab name = course/diploma title)
 * • Bilingual headers (Arabic + English) with purple styling
 * Spreadsheet ID: hardcoded below.
 */

var HARDCODED_SPREADSHEET_ID = "1AnzgvWeyaH-I1b6ZtobEJD8po0u9st4WdAlTIATh2Us";
var DOC_PROP_SPREADSHEET_ID  = "MASTER_CRM_SPREADSHEET_ID";

// Header row — bilingual Arabic / English
var HEADER_ROW = [
  "التاريخ\nDate",
  "اسم الطالب رباعي\nFull name",
  "رقم التليفون\nPhone",
  "حضور الكورس\nAttendance",
  "اسم الدبلومة\nDiploma",
  "حجز الكورس عن طريق\nBooking via",
  "حالة المتابعة\nFollow-up",
  "ملاحظات\nNotes",
  "خطة الدفع\nPlan",
  "تكلفة الكورس\nCourse cost",
  "المقدم\nDeposit",
  "قسط 1\nInst. 1",
  "قسط 2\nInst. 2",
  "قسط 3\nInst. 3",
  "إجمالي المدفوع\nPaid (sum)",
  "الرصيد\nBalance",
  "البريد الإلكتروني\nEmail",
  "المحافظة\nGovernorate",
  "المؤهل الدراسي\nEducation Level",
  "هل عنده PC\nHas PC",
  "مستوى البرمجة\nProgramming Level",
  "الحالة الوظيفية\nEmployment Status",
  "طريقة التواصل\nContact Method",
  "الدفع OK\nPay OK",
];

// Purple brand color (Eduzah)
var HEADER_BG    = "#321D3D";
var HEADER_FG    = "#FFFFFF";
var ALT_ROW_BG   = "#F5F0FA";

// ─── Helpers ────────────────────────────────────────────────

function jsonResponse_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
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

// ─── Spreadsheet / sheet access ─────────────────────────────

function getSpreadsheet() {
  var id = HARDCODED_SPREADSHEET_ID;
  if (id) {
    try { return SpreadsheetApp.openById(id); } catch (e) {}
  }
  var props = PropertiesService.getScriptProperties();
  id = props.getProperty(DOC_PROP_SPREADSHEET_ID);
  if (id) {
    try { return SpreadsheetApp.openById(id); } catch (e) {}
  }
  var ss = SpreadsheetApp.create("CRM Enrollments Master");
  PropertiesService.getScriptProperties()
    .setProperty(DOC_PROP_SPREADSHEET_ID, ss.getId());
  return ss;
}

function getOrCreateTab(ss, tabName) {
  var safe = tabName.replace(/[\/\\?\*\[\]]/g, "-").slice(0, 100);
  var sh = ss.getSheetByName(safe);
  if (!sh) {
    sh = ss.insertSheet(safe);
  }
  return sh;
}

// ─── Header + formatting ─────────────────────────────────────

function applyHeaderStyle_(sh) {
  var numCols = HEADER_ROW.length;
  var headerRange = sh.getRange(1, 1, 1, numCols);

  headerRange
    .setValues([HEADER_ROW])
    .setBackground(HEADER_BG)
    .setFontColor(HEADER_FG)
    .setFontWeight("bold")
    .setFontSize(10)
    .setHorizontalAlignment("center")
    .setVerticalAlignment("middle")
    .setWrap(true);

  sh.setRowHeight(1, 52);
  sh.setFrozenRows(1);

  // Column widths
  var widths = [90, 160, 110, 110, 180, 120, 110, 140,
                90, 90, 80, 70, 70, 70, 90, 80,
                160, 100, 110, 80, 110, 110, 110, 80];
  for (var i = 0; i < widths.length && i < numCols; i++) {
    sh.setColumnWidth(i + 1, widths[i]);
  }
}

function ensureHeaders_(sh) {
  var needsFormat = false;

  if (sh.getLastRow() < 1) {
    needsFormat = true;
  } else {
    var firstCell = sh.getRange(1, 1).getValue();
    if (String(firstCell).trim() !== HEADER_ROW[0]) needsFormat = true;
  }

  if (needsFormat) applyHeaderStyle_(sh);
}

// Stripe alternate rows for readability
function applyRowStripe_(sh, rowIndex) {
  if (rowIndex % 2 === 0) {
    sh.getRange(rowIndex, 1, 1, HEADER_ROW.length)
      .setBackground(ALT_ROW_BG);
  }
}

// ─── Request parsing ─────────────────────────────────────────

function parseRequest_(e) {
  if (!e || !e.postData || e.postData.contents === undefined) {
    throw new Error("Empty request body");
  }
  var raw = String(e.postData.contents).trim();
  if (!raw) throw new Error("Empty request body");
  var data;
  try { data = JSON.parse(raw); } catch (err) { throw new Error("Invalid JSON"); }
  if (!data || typeof data !== "object") throw new Error("JSON must be an object");
  if (!str_(data.fullName) || !str_(data.phone)) {
    throw new Error("Missing required fields: fullName, phone");
  }
  return data;
}

// ─── Financials ──────────────────────────────────────────────

function calcFinancials_(data) {
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

// ─── Web App endpoints ───────────────────────────────────────

function doPost(e) {
  try {
    var data   = parseRequest_(e);
    var ss     = getSpreadsheet();

    // One tab per course — fallback to "Enrollments" if no diploma
    var tabName = str_(data.diploma) || "Enrollments";
    var sh      = getOrCreateTab(ss, tabName);

    ensureHeaders_(sh);

    var calc     = calcFinancials_(data);
    var row      = buildRow_(data, calc);
    var newIndex = sh.getLastRow() + 1;

    sh.appendRow(row);
    applyRowStripe_(sh, newIndex);

    return jsonResponse_({ success: true, message: "Row added to tab: " + tabName });
  } catch (err) {
    return jsonResponse_({ success: false, message: err.message || String(err) });
  }
}

function doGet() {
  return jsonResponse_({ success: true, message: "Eduzah CRM Web App active." });
}

// ─── Manual helper: reformat all existing tabs ───────────────
// Run this once from the Apps Script editor after pasting the code.
function reformatAllTabs() {
  var ss   = getSpreadsheet();
  var tabs = ss.getSheets();
  for (var i = 0; i < tabs.length; i++) {
    applyHeaderStyle_(tabs[i]);
  }
  Logger.log("Done — formatted " + tabs.length + " tab(s).");
}
