/**
 * ── Google Sheets Integration ────────────────────────────────
 *
 * SETUP INSTRUCTIONS:
 * 1. Go to script.google.com → New Project
 * 2. Paste the Apps Script code below
 * 3. Deploy → Web App → Execute as Me → Anyone can access
 * 4. Copy the Web App URL and paste it below for each form
 *
 * ── Apps Script Code (paste in Google Apps Script editor) ────
 *
 * function doPost(e) {
 *   try {
 *     var data = JSON.parse(e.postData.contents);
 *     var ss = SpreadsheetApp.openById("YOUR_SPREADSHEET_ID");
 *     var sheetName = data._sheet || "Sheet1";
 *     var sheet = ss.getSheetByName(sheetName) || ss.insertSheet(sheetName);
 *     delete data._sheet;
 *     var keys = Object.keys(data);
 *     if (sheet.getLastRow() === 0) sheet.appendRow(["Timestamp", ...keys]);
 *     sheet.appendRow([new Date().toLocaleString("ar-EG"), ...keys.map(k => data[k])]);
 *     return ContentService.createTextOutput(JSON.stringify({result:"ok"}))
 *       .setMimeType(ContentService.MimeType.JSON);
 *   } catch(err) {
 *     return ContentService.createTextOutput(JSON.stringify({result:"error",msg:err.toString()}))
 *       .setMimeType(ContentService.MimeType.JSON);
 *   }
 * }
 *
 * ── Paste your Web App URLs here ────────────────────────────
 */

export const SHEETS_ENDPOINTS = {
  enrollment:   "", // Course Enrollment Form
  services:     "", // Services Request Form
  consultation: "", // Consultation Form
  corporate:    "", // Company Training Form
  hiring:       "", // Hiring / Recruitment Form
};

/**
 * Submit data to a Google Sheet via Apps Script Web App
 * @param {string} formType - key from SHEETS_ENDPOINTS
 * @param {object} data     - form data to submit
 * @returns {Promise<boolean>} - true if sent (even if no-cors)
 */
export const submitToSheet = async (formType, data) => {
  const url = SHEETS_ENDPOINTS[formType];
  if (!url) {
    // Not configured yet – log silently and continue
    console.info(`[Sheets] "${formType}" endpoint not configured. Data:`, data);
    return true;
  }
  try {
    await fetch(url, {
      method: "POST",
      mode: "no-cors", // Apps Script doesn't always return CORS headers
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ _sheet: formType, ...data, timestamp: new Date().toISOString() }),
    });
    return true;
  } catch (err) {
    console.warn("[Sheets] Submit failed:", err);
    return false;
  }
};
