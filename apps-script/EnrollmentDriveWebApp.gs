/**
 * Master CRM spreadsheet on your Drive • tab enrollmentRequests
 *
 * خصائص Script (تلقائيًا أو عبر الدوال setup*):
 * - MASTER_CRM_SPREADSHEET_ID
 * - TEAM_EDITOR_EMAILS (إيميلات مفصولة بفاصلة)
 * - ENROLLMENT_API_KEY (إن وُجد، لازم الطلب يبعت نفس القيمة في JSON apiKey أو ?apiKey=)
 *
 * إعداد سريع:
 * 1) عدّل DEFAULT_TEAM_EDITORS_CSV أو نفّذ setupTeamEditorEmails_("a@...,b@...")
 * 2) نفّذ setupEnrollmentApiKey_("مفتاح-سري-طويل") أو أضف ENROLLMENT_API_KEY من إعدادات المشروع
 * 3) انشر Web App: doPost / doGet — تنفيذ باسمك، الوصول: Anyone
 */

var SHEET_TAB = "enrollmentRequests";
var PROP_SS_ID = "MASTER_CRM_SPREADSHEET_ID";
var PROP_TEAM = "TEAM_EDITOR_EMAILS";
var PROP_API_KEY = "ENROLLMENT_API_KEY";

/** عدّل الإيميلات هنا أو استخدم setupTeamEditorEmails_ */
var DEFAULT_TEAM_EDITORS_CSV = "team1@gmail.com,team2@gmail.com";

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

var SS_TITLE = "CRM Enrollments Master";

function jsonOut_(obj) {
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

function teamEmailsList_() {
  var csv = PropertiesService.getScriptProperties().getProperty(PROP_TEAM);
  if (!csv || !String(csv).trim()) csv = DEFAULT_TEAM_EDITORS_CSV;
  return String(csv)
    .split(/[,;\n]/)
    .map(function (s) {
      return s.trim();
    })
    .filter(Boolean);
}

function shareFileWithTeam_(fileId) {
  var file = DriveApp.getFileById(fileId);
  var list = teamEmailsList_();
  for (var i = 0; i < list.length; i++) {
    try {
      file.addEditor(list[i]);
    } catch (err) {
      /* invalid email or permission */
    }
  }
}

function getOrCreateSpreadsheet() {
  var props = PropertiesService.getScriptProperties();
  var id = props.getProperty(PROP_SS_ID);
  if (id) {
    try {
      var existing = SpreadsheetApp.openById(String(id).trim());
      shareFileWithTeam_(existing.getId());
      return existing;
    } catch (err) {
      props.deleteProperty(PROP_SS_ID);
    }
  }
  var ss = SpreadsheetApp.create(SS_TITLE);
  props.setProperty(PROP_SS_ID, ss.getId());
  shareFileWithTeam_(ss.getId());
  return ss;
}

function getOrCreateSheet(ss) {
  var sh = ss.getSheetByName(SHEET_TAB);
  if (!sh) sh = ss.insertSheet(SHEET_TAB);
  return sh;
}

function headersOk_(sh) {
  if (sh.getLastRow() < 1 || sh.getLastColumn() < HEADER_ROW.length) return false;
  var r = sh.getRange(1, 1, 1, HEADER_ROW.length).getValues()[0];
  for (var i = 0; i < HEADER_ROW.length; i++) {
    if (String(r[i]).trim() !== HEADER_ROW[i]) return false;
  }
  return true;
}

function ensureHeaders(sh) {
  if (!headersOk_(sh)) {
    var r = sh.getRange(1, 1, 1, HEADER_ROW.length);
    r.setValues([HEADER_ROW]);
    r.setFontWeight("bold");
  }
}

function validateHeadersExact(sh) {
  return headersOk_(sh);
}

function calculateFields(data) {
  var courseCost = round2_(num_(data.courseCost));
  var deposit = round2_(num_(data.deposit));
  var i1 = round2_(num_(data.inst1));
  var i2 = round2_(num_(data.inst2));
  var i3 = round2_(num_(data.inst3));
  var paid = round2_(deposit + i1 + i2 + i3);
  var balance = round2_(courseCost - paid);
  return { courseCost: courseCost, deposit: deposit, inst1: i1, inst2: i2, inst3: i3, paid: paid, balance: balance };
}

function verifyApiKey_(e, body) {
  var expected = PropertiesService.getScriptProperties().getProperty(PROP_API_KEY);
  if (!expected || !String(expected).trim()) return true;
  var fromBody = body && body.apiKey != null ? String(body.apiKey) : "";
  var fromQs = e && e.parameter && e.parameter.apiKey != null ? String(e.parameter.apiKey) : "";
  return String(fromBody || fromQs) === String(expected).trim();
}

function parseRequest(e) {
  if (!e || !e.postData || e.postData.contents === undefined) throw new Error("Empty request body");
  var raw = String(e.postData.contents).trim();
  if (!raw) throw new Error("Empty request body");
  var data;
  try {
    data = JSON.parse(raw);
  } catch (x) {
    throw new Error("Invalid JSON");
  }
  if (!data || typeof data !== "object") throw new Error("JSON body must be an object");
  if (!verifyApiKey_(e, data)) throw new Error("Invalid API key");
  if (data.apiKey !== undefined) delete data.apiKey;
  if (!str_(data.fullName) || !str_(data.phone)) throw new Error("Missing required fields: fullName, phone");
  return data;
}

function rowFrom_(data, c) {
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
    c.courseCost,
    c.deposit,
    c.inst1,
    c.inst2,
    c.inst3,
    c.paid,
    c.balance,
    str_(data.email),
    str_(data.payOk),
  ];
}

/** مرة واحدة: إيميلات الفريق (مفصولة بفاصلة) */
function setupTeamEditorEmails_(csv) {
  PropertiesService.getScriptProperties().setProperty(PROP_TEAM, String(csv).trim());
}

/** مرة واحدة: نفس المفتاح في VITE_ENROLLMENT_API_KEY */
function setupEnrollmentApiKey_(key) {
  PropertiesService.getScriptProperties().setProperty(PROP_API_KEY, String(key).trim());
}

function doPost(e) {
  try {
    if (!e || !e.postData) {
      return jsonOut_({ success: false, message: "Invalid request (use Web App POST with body)" });
    }
    var data = parseRequest(e);
    var ss = getOrCreateSpreadsheet();
    var sh = getOrCreateSheet(ss);
    ensureHeaders(sh);
    if (!validateHeadersExact(sh)) {
      return jsonOut_({ success: false, message: "Sheet headers do not match required format" });
    }
    var calc = calculateFields(data);
    sh.appendRow(rowFrom_(data, calc));
    return jsonOut_({ success: true, message: "Row added successfully" });
  } catch (err) {
    return jsonOut_({ success: false, message: err.message || String(err) });
  }
}

function doGet() {
  return jsonOut_({ success: true, message: "Enrollment Web App ready. POST text/plain JSON." });
}
