/**
 * Firestore → Google Sheets v4 sync (Cloud Functions Admin SDK).
 *
 * Environment:
 * - GOOGLE_SHEETS_SPREADSHEET_ID (required)
 * - GOOGLE_SERVICE_ACCOUNT_JSON  OR  GOOGLE_SERVICE_ACCOUNT_JSON_B64 (required)
 * - GOOGLE_SHEETS_UNIFIED_TAB — optional: if set, all rows go to this tab (disables dynamic routing)
 *
 * Routing:
 * - Tab target is driven only by the Firestore **`course`** string (same for enrollmentRequests + students).
 * - Tab name = sanitized `course` (spaces removed; specials stripped; `\/*?:[]` removed for Sheets API safety).
 * - If `course` is missing/blank or sanitizes to empty → tab **`Students`** (logged as routing fallback).
 * - Row column **`Course`** (G) still uses your existing friendly labels (courseTitle, courseId, etc.) via value mappers below.
 *
 * Rows (A→G): Doc Id | Source | Created At | Name | Phone | Email | Course
 *
 * Dedup / retries:
 * - `integrations/sheetsOutbox/{collection}___{docId}` with exported:true after success.
 * - Before append, scans column A (from row 2) for `docId`; if present, marks outbox and skips (safe retries).
 */

const crypto = require("crypto");
const functions = require("firebase-functions");
const admin = require("firebase-admin");
const { google } = require("googleapis");

const SHEETS_SCOPE = "https://www.googleapis.com/auth/spreadsheets";

const OUTBOX = "integrations/sheetsOutbox";

const DEFAULT_TAB = "Students";

const HEADER_ROW = ["Doc Id", "Source", "Created At", "Name", "Phone", "Email", "Course"];

/** Max rows to scan for docId (bounded for production latency). */
const DOCID_SCAN_MAX_ROWS = 20000;

function loadServiceAccountCredentials() {
  const raw = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
  const b64 = process.env.GOOGLE_SERVICE_ACCOUNT_JSON_B64;
  if (b64) {
    try {
      return JSON.parse(Buffer.from(String(b64).trim(), "base64").toString("utf8"));
    } catch (e) {
      functions.logger.error("GOOGLE_SERVICE_ACCOUNT_JSON_B64 invalid", { err: e.message });
      return null;
    }
  }
  if (raw) {
    try {
      return JSON.parse(raw);
    } catch (e) {
      functions.logger.error("GOOGLE_SERVICE_ACCOUNT_JSON invalid", { err: e.message });
      return null;
    }
  }
  return null;
}

function spreadsheetIdEnv() {
  return String(process.env.GOOGLE_SHEETS_SPREADSHEET_ID || "").trim();
}

async function getSheetsV4() {
  const spreadsheetId = spreadsheetIdEnv();
  const creds = loadServiceAccountCredentials();
  if (!spreadsheetId || !creds?.client_email || !creds?.private_key) {
    return { sheets: null, spreadsheetId };
  }
  const auth = new google.auth.JWT({
    email: creds.client_email,
    key: creds.private_key,
    scopes: [SHEETS_SCOPE],
  });
  const sheets = google.sheets({ version: "v4", auth });
  return { spreadsheetId, sheets };
}

function escapeSheetTab(tab) {
  return String(tab || "Sheet1").replace(/'/g, "''").slice(0, 99);
}

function httpRetryable(status) {
  return !status || status === 429 || status >= 500;
}

function str(v) {
  return v == null ? "" : String(v).trim();
}

function isoCreated(v) {
  if (v == null) return "";
  if (typeof v === "string") return v;
  if (typeof v.toDate === "function") {
    try {
      return v.toDate().toISOString();
    } catch (_) {
      return "";
    }
  }
  if (typeof v.seconds === "number") {
    return new Date(v.seconds * 1000).toISOString();
  }
  return String(v);
}

function unifiedTabEnv() {
  return str(process.env.GOOGLE_SHEETS_UNIFIED_TAB);
}

/**
 * Sanitize for Google Sheets sheet title: no \ / ? * [ ] : — then remove spaces & disallowed symbols.
 * Keeps letters (any script), digits, underscore.
 */
function sanitizeTabTitle(raw) {
  let s = str(raw);
  if (!s) return "";
  s = s.replace(/[\[\]\*\/\\?:]/g, "");
  s = s.replace(/\s+/g, "");
  s = s.replace(/[^\p{L}\p{N}_]+/gu, "");
  return s.slice(0, 99);
}

/**
 * Resolve sheet tab from `course` field only (per product spec).
 */
function resolveTargetTab(snap /* collection unused but kept for API stability */) {
  const d = snap.data() || {};
  const raw = str(d.course);

  if (!raw) {
    return {
      tabTitle: DEFAULT_TAB,
      usedFallback: true,
      routingDetail: "course_field_missing",
      rawRoutingInput: "",
    };
  }

  const sanitized = sanitizeTabTitle(raw);
  if (!sanitized) {
    return {
      tabTitle: DEFAULT_TAB,
      usedFallback: true,
      routingDetail: "sanitize_empty_after_course",
      rawRoutingInput: raw,
    };
  }

  return {
    tabTitle: sanitized,
    usedFallback: false,
    routingDetail: "course",
    rawRoutingInput: raw,
  };
}

function obId(collection, docId) {
  return `${collection}___${docId}`;
}

function rowDigest(vals) {
  return crypto.createHash("sha256").update(JSON.stringify(vals)).digest("hex");
}

function isSheetAlreadyExistsError(err) {
  const msg = String(err?.response?.data?.error?.message || err?.message || "").toLowerCase();
  return msg.includes("already exists");
}

async function getSheetTitles(sheets, spreadsheetId) {
  const res = await sheets.spreadsheets.get({
    spreadsheetId,
    fields: "sheets.properties.title",
  });
  return (res.data.sheets || []).map((s) => s.properties.title);
}

/**
 * Ensure a tab named `title` exists; if newly created, writes header row.
 * @returns {{ tabTitle: string, tabCreated: boolean }}
 */
async function ensureTabWithHeaders(sheets, spreadsheetId, title, meta) {
  const tabTitle = str(title) || DEFAULT_TAB;
  let titles = await getSheetTitles(sheets, spreadsheetId);
  if (titles.includes(tabTitle)) {
    return { tabTitle, tabCreated: false };
  }

  let tabCreated = false;
  try {
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId,
      requestBody: {
        requests: [
          {
            addSheet: {
              properties: {
                title: tabTitle,
                gridProperties: { rowCount: 2000, columnCount: 16 },
              },
            },
          },
        ],
      },
    });
    tabCreated = true;
    functions.logger.info("Google Sheets tab created", {
      ...meta,
      tabName: tabTitle,
    });
  } catch (e) {
    if (isSheetAlreadyExistsError(e)) {
      functions.logger.info("Google Sheets tab already existed (create race or parallel run)", {
        ...meta,
        tabName: tabTitle,
      });
    } else {
      throw e;
    }
  }

  const esc = escapeSheetTab(tabTitle);
  if (tabCreated) {
    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: `'${esc}'!A1:G1`,
      valueInputOption: "USER_ENTERED",
      requestBody: { values: [HEADER_ROW] },
    });
  }

  return { tabTitle, tabCreated };
}

/**
 * True if column A (data rows, A2 downward) already contains this Firestore doc id.
 */
async function sheetColumnAHasDocId(sheets, spreadsheetId, tabTitle, docId, meta) {
  const esc = escapeSheetTab(tabTitle);
  const last = DOCID_SCAN_MAX_ROWS + 1;
  const range = `'${esc}'!A2:A${last}`;
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range,
    valueRenderOption: "UNFORMATTED_VALUE",
  });
  const rows = res.data.values || [];
  const found = rows.some((row) => row[0] != null && String(row[0]).trim() === docId);
  if (found) {
    functions.logger.info("Google Sheets dedupe: docId already present in tab column A", {
      ...meta,
      tabName: tabTitle,
      docId,
    });
  }
  return found;
}

async function spreadsheetAppend(tabName, valuesRow, sheets, spreadsheetId, meta) {
  const tab = escapeSheetTab(tabName);
  const range = `'${tab}'!A:G`;
  await sheets.spreadsheets.values.append({
    spreadsheetId,
    range,
    valueInputOption: "USER_ENTERED",
    insertDataOption: "INSERT_ROWS",
    requestBody: { values: [valuesRow] },
  });
  functions.logger.info("Google Sheets row inserted", {
    ...meta,
    spreadsheetIdShort: spreadsheetId.slice(0, 8) + "…",
    tabName: tabName,
  });
}

function enrollmentValues(snap) {
  const d = snap.data() || {};
  const cid = str(d.courseId);
  const name = str(d.studentName) || str(d.studentFullName);
  const created = isoCreated(d.createdAt) || new Date().toISOString();
  const phone = str(d.studentPhone);
  const email = str(d.studentEmail);
  const course = str(d.courseTitle) || cid || "—";
  return [snap.id, "enrollmentRequests", created, name, phone, email, course];
}

function studentValues(snap) {
  const d = snap.data() || {};
  const name = str(d.name) || str(d.fullName) || str(d.studentName);
  const created = isoCreated(d.createdAt) || new Date().toISOString();
  const phone = str(d.phone) || str(d.studentPhone);
  const email = str(d.email) || str(d.studentEmail);
  const course = str(d.course) || str(d.courseTitle) || str(d.courseName) || str(d.courseId) || "—";
  return [snap.id, "students", created, name, phone, email, course];
}

async function finalizeExport({ snap, collection, docId, eventId, tag, outRef, tabName, values }) {
  const sid = spreadsheetIdEnv();
  await snap.ref.set(
    {
      googleSheetsExport: {
        status: "ok",
        at: admin.firestore.FieldValue.serverTimestamp(),
        spreadsheetId: sid,
        tabName,
        eventId,
        rowDigest: rowDigest(values),
      },
    },
    { merge: true },
  );
  await outRef.set(
    {
      collection,
      docId,
      path: snap.ref.path,
      exported: true,
      exportedAt: admin.firestore.FieldValue.serverTimestamp(),
      tabName,
      spreadsheetId: sid,
      rowDigest: rowDigest(values),
      lastEventId: eventId,
    },
    { merge: true },
  );
}

/**
 * @param {FirebaseFirestore.DocumentSnapshot} snap
 * @param {'enrollmentRequests'|'students'} collection
 */
async function syncNewDocToSpreadsheet(snap, collection, eventContext = {}) {
  const docId = snap.id;
  const eventId = eventContext.eventId || "n/a";
  const tag = `${collection}:${docId}:${eventId}`;

  if (!snap.exists) {
    functions.logger.warn("sync skipped — missing doc", { tag });
    return;
  }

  const db = admin.firestore();
  const outRef = db.collection(OUTBOX).doc(obId(collection, docId));

  const prior = await outRef.get();
  if (prior.exists && prior.data()?.exported === true) {
    functions.logger.info("Google Sheets dedup skip (outbox already exported)", { tag });
    return;
  }

  const values = collection === "students" ? studentValues(snap) : enrollmentValues(snap);
  let route = resolveTargetTab(snap);
  const unified = unifiedTabEnv();
  if (unified) {
    route = {
      tabTitle: unified,
      usedFallback: false,
      routingDetail: "GOOGLE_SHEETS_UNIFIED_TAB",
      rawRoutingInput: "",
    };
    functions.logger.info("Google Sheets routing: using GOOGLE_SHEETS_UNIFIED_TAB", { tag, tabName: unified });
  } else if (route.usedFallback) {
    functions.logger.info("Google Sheets routing fallback: default tab Students", {
      tag,
      routingDetail: route.routingDetail,
      rawRoutingInput: route.rawRoutingInput ? "[set]" : "",
    });
  }

  const tabTarget = route.tabTitle;

  try {
    const { spreadsheetId, sheets } = await getSheetsV4();
    if (!sheets || !spreadsheetId) {
      functions.logger.warn("Google Sheets not configured — set SPREADSHEET_ID + service account JSON", { tag });
      return;
    }

    const metaBase = { tag, collection, routingDetail: route.routingDetail };
    await ensureTabWithHeaders(sheets, spreadsheetId, tabTarget, metaBase);

    const hasId = await sheetColumnAHasDocId(sheets, spreadsheetId, tabTarget, docId, metaBase);
    if (hasId) {
      await finalizeExport({ snap, collection, docId, eventId, tag, outRef, tabName: tabTarget, values });
      return;
    }

    try {
      await spreadsheetAppend(tabTarget, values, sheets, spreadsheetId, metaBase);
    } catch (e) {
      const status = e.response?.status;
      const apiErr = e.response?.data?.error?.message;
      functions.logger.error("Google Sheets rows.append failed", {
        tag,
        httpStatus: status,
        message: e.message,
        apiMessage: apiErr,
        tabName: tabTarget,
      });
      if (httpRetryable(status)) throw e;
      return;
    }

    await finalizeExport({ snap, collection, docId, eventId, tag, outRef, tabName: tabTarget, values });
  } catch (e) {
    functions.logger.error("syncNewDocToSpreadsheet failure", { tag, err: e.message });
    throw e;
  }
}

module.exports = {
  syncNewDocToSpreadsheet,
  spreadsheetIdEnv,
  sanitizeTabTitle,
  resolveTargetTab,
};
