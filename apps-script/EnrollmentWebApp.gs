/**
 * Enrollment form → Google Sheet (Web App)
 *
 * Setup (run once from the script editor):
 * 1. Open the script in script.google.com (standalone or container-bound to your Sheet).
 * 2. Run setupSpreadsheetId_('YOUR_SPREADSHEET_ID') once unless the script is bound to the target Sheet.
 * 3. Deploy → New deployment → Web app:
 *    - Execute as: Me
 *    - Who has access: Anyone (or "Anyone with Google account" — your choice; see deployment notes)
 *
 * Optional hardening: run setupEnrollmentSecret_('long-random-string') and send the same value as:
 *   - query param:  .../exec?token=YOUR_SECRET   (works well with fetch + JSON body)
 *   - or JSON field: { "token": "YOUR_SECRET", "name": ... }
 */

const SPREADSHEET_ID_HARDCODED = "";

const SHEET_NAME = "enrollmentRequests";

function jsonResponse_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

function getSpreadsheet_() {
  const id = SPREADSHEET_ID_HARDCODED || PropertiesService.getScriptProperties().getProperty("SPREADSHEET_ID");
  if (id) {
    return SpreadsheetApp.openById(id.trim());
  }
  return SpreadsheetApp.getActiveSpreadsheet();
}

/** One-time: store spreadsheet ID (standalone projects). */
function setupSpreadsheetId_(spreadsheetId) {
  PropertiesService.getScriptProperties().setProperty("SPREADSHEET_ID", String(spreadsheetId).trim());
}

/** Optional: require matching token (query or JSON body field "token"). */
function setupEnrollmentSecret_(secret) {
  PropertiesService.getScriptProperties().setProperty("ENROLLMENT_SECRET", String(secret).trim());
}

function getOrCreateSheet_(ss) {
  var sh = ss.getSheetByName(SHEET_NAME);
  if (!sh) {
    sh = ss.insertSheet(SHEET_NAME);
    sh.appendRow(["Timestamp", "Name", "Phone", "Email", "Course"]);
    sh.getRange(1, 1, 1, 5).setFontWeight("bold");
  }
  return sh;
}

function doPost(e) {
  try {
    if (!e.postData || e.postData.contents === undefined || String(e.postData.contents).trim() === "") {
      return jsonResponse_({ success: false, message: "Empty request body" });
    }

    var data;
    try {
      data = JSON.parse(e.postData.contents);
    } catch (parseErr) {
      return jsonResponse_({ success: false, message: "Invalid JSON body" });
    }

    var props = PropertiesService.getScriptProperties();
    var secret = props.getProperty("ENROLLMENT_SECRET");
    if (secret) {
      var qTok = e.parameter && e.parameter.token != null ? String(e.parameter.token) : "";
      var bodyTok = data.token != null ? String(data.token) : "";
      var provided = qTok || bodyTok;
      if (provided !== secret) {
        return jsonResponse_({ success: false, message: "Unauthorized" });
      }
    }
    if (data.token !== undefined) delete data.token;

    var name = String(data.name || "").trim();
    var phone = String(data.phone || "").trim();
    var email = String(data.email || "").trim();
    var course = String(data.course || "").trim();

    if (!name || !phone || !email || !course) {
      return jsonResponse_({
        success: false,
        message: "Missing or empty required fields: name, phone, email, course",
      });
    }

    var ss = getSpreadsheet_();
    var sh = getOrCreateSheet_(ss);
    sh.appendRow([new Date(), name, phone, email, course]);

    return jsonResponse_({ success: true, message: "Data added successfully" });
  } catch (err) {
    return jsonResponse_({
      success: false,
      message: err.message || String(err),
    });
  }
}

/** Verifies the Web App URL responds (GET returns JSON). */
function doGet(/* e */) {
  return jsonResponse_({
    success: true,
    message: "Enrollment Web App is running. POST JSON to this URL.",
  });
}
