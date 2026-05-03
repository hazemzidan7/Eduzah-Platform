/**
 * Deploy: firebase deploy --only functions
 * Requires Blaze plan. Set Resend (optional): firebase functions:config:set resend.key="re_..."
 * Password reset OTP: needs RESEND_API_KEY (same as enrollment). Optional OTP_PEPPER for hashing.
 *
 * Google Sheets (enrollment + students):
 * - GOOGLE_SHEETS_SPREADSHEET_ID — target spreadsheet ID from the Sheet URL.
 * - GOOGLE_SERVICE_ACCOUNT_JSON — full service-account JSON as a string, **or**
 * - GOOGLE_SERVICE_ACCOUNT_JSON_B64 — same JSON base64-encoded (easier in Cloud Console).
 * - GOOGLE_SHEETS_STUDENTS_TAB — tab name for `students` collection sync (default: "Students").
 *
 * createAdminAccount — callable by any user with role "admin" in Firestore users/{uid}.
 * onEnrollmentRequestCreated — emails course notifyEmails + Super Admin when possible (Resend).
 * onStudentCreated — appends name, phone, email, course to Google Sheets (students tab).
 * requestPasswordResetOtp / confirmPasswordResetOtp — 8-digit code email + set password (Admin SDK).
 */
const functions = require("firebase-functions");
const admin = require("firebase-admin");
const crypto = require("crypto");
const { google } = require("googleapis");

admin.initializeApp();

const SHEETS_SCOPE = "https://www.googleapis.com/auth/spreadsheets";

function loadServiceAccountCredentials() {
  const raw = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
  const b64 = process.env.GOOGLE_SERVICE_ACCOUNT_JSON_B64;
  if (b64) {
    try {
      return JSON.parse(Buffer.from(String(b64).trim(), "base64").toString("utf8"));
    } catch (e) {
      functions.logger.error("Sheets: invalid GOOGLE_SERVICE_ACCOUNT_JSON_B64", { err: e.message });
      return null;
    }
  }
  if (raw) {
    try {
      return JSON.parse(raw);
    } catch (e) {
      functions.logger.error("Sheets: invalid GOOGLE_SERVICE_ACCOUNT_JSON", { err: e.message });
      return null;
    }
  }
  return null;
}

function getSpreadsheetId() {
  return String(process.env.GOOGLE_SHEETS_SPREADSHEET_ID || "").trim();
}

/** Build an authenticated Sheets v4 client, or null if env is incomplete. */
async function getSheetsClient() {
  const spreadsheetId = getSpreadsheetId();
  const creds = loadServiceAccountCredentials();
  if (!spreadsheetId || !creds || !creds.client_email || !creds.private_key) {
    functions.logger.warn(
      "Sheets disabled: set GOOGLE_SHEETS_SPREADSHEET_ID and GOOGLE_SERVICE_ACCOUNT_JSON (or _B64)."
    );
    return null;
  }
  const auth = new google.auth.JWT({
    email: creds.client_email,
    key: creds.private_key,
    scopes: [SHEETS_SCOPE],
  });
  return google.sheets({ version: "v4", auth });
}

function escapeSheetTabName(tabName) {
  return String(tabName || "Sheet1").replace(/'/g, "''").slice(0, 90);
}

/**
 * @param {number} status HTTP-like status from gaxios (e.g. err.response?.status)
 * @returns {boolean} true if Cloud Functions should retry the invocation
 */
function isSheetsErrorRetryable(status) {
  if (!status) return true;
  return status === 429 || status >= 500;
}

/**
 * Append a single row to a tab. Throws on retryable errors (so Firestore trigger retries).
 * Logs and returns on permanent/config errors.
 * @param {string} tabName
 * @param {string[]} row
 * @param {{ context?: string }} [opts]
 */
async function appendSheetRow(tabName, row, opts = {}) {
  const spreadsheetId = getSpreadsheetId();
  const sheets = await getSheetsClient();
  if (!sheets || !spreadsheetId) {
    return { ok: false, reason: "SHEETS_NOT_CONFIGURED" };
  }
  const safeTab = escapeSheetTabName(tabName);
  const range = `'${safeTab}'!A:Z`;
  const ctx = opts.context || "appendSheetRow";
  const docId = opts.docId;
  try {
    await sheets.spreadsheets.values.append({
      spreadsheetId,
      range,
      valueInputOption: "USER_ENTERED",
      insertDataOption: "INSERT_ROWS",
      requestBody: { values: [row] },
    });
    functions.logger.info("Sheets row appended", { context: ctx, tab: safeTab, docId });
    return { ok: true };
  } catch (err) {
    const status = err.response?.status;
    const msg = err.message || String(err);
    const apiErr = err.response?.data?.error?.message;
    functions.logger.error("Sheets append failed", {
      context: ctx,
      tab: safeTab,
      docId,
      status,
      message: msg,
      apiMessage: apiErr,
    });
    if (isSheetsErrorRetryable(status)) {
      throw err;
    }
    return { ok: false, reason: apiErr || msg, status };
  }
}

/** Append one enrollment row to a course tab. */
async function appendEnrollmentRowToSheet({ tabName, row }) {
  await appendSheetRow(tabName, row, { context: "onEnrollmentRequestCreated" });
}

function str(v) {
  return v == null ? "" : String(v).trim();
}

/** Map Firestore `students` doc to [name, phone, email, course]. */
function studentDocToSheetRow(data) {
  const name = str(data.name) || str(data.fullName) || str(data.studentName);
  const phone = str(data.phone) || str(data.studentPhone);
  const email = str(data.email) || str(data.studentEmail);
  const course =
    str(data.course) ||
    str(data.courseTitle) ||
    str(data.courseName) ||
    str(data.courseId);
  return [name, phone, email, course];
}

function studentsSheetTabName() {
  const t = str(process.env.GOOGLE_SHEETS_STUDENTS_TAB);
  return t || "Students";
}

const SUPER_ADMIN = "hazemzidan833@gmail.com";

function otpDocId(email) {
  return crypto.createHash("sha256").update(String(email).trim().toLowerCase()).digest("hex");
}

function hashOtpCode(code) {
  const pepper = process.env.OTP_PEPPER || "eduzah-otp-v1";
  return crypto.createHash("sha256").update(String(code) + pepper).digest("hex");
}

function assertPasswordPolicy(password) {
  const p = String(password || "");
  if (p.length < 8) throw new functions.https.HttpsError("invalid-argument", "PASSWORD_WEAK");
  if (!/[A-Z]/.test(p) || !/[a-z]/.test(p) || !/[0-9]/.test(p) || !/[^A-Za-z0-9]/.test(p)) {
    throw new functions.https.HttpsError("invalid-argument", "PASSWORD_WEAK");
  }
}

async function resendSend({ to, subject, text }) {
  const key = process.env.RESEND_API_KEY || (functions.config().resend && functions.config().resend.key);
  if (!key) return { ok: false, reason: "NO_KEY" };
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from: "Eduzah <onboarding@resend.dev>",
      to: Array.isArray(to) ? to : [to],
      subject,
      text,
    }),
  });
  if (!res.ok) {
    const body = await res.text();
    console.error("Resend error", res.status, body);
    return { ok: false, reason: body };
  }
  return { ok: true };
}

/** Public — sends 8-digit code if user exists and Resend is configured. */
exports.requestPasswordResetOtp = functions.https.onCall(async (data) => {
  const email = String(data?.email || "").trim().toLowerCase();
  if (!email.includes("@")) throw new functions.https.HttpsError("invalid-argument", "INVALID_EMAIL");

  const key = process.env.RESEND_API_KEY || (functions.config().resend && functions.config().resend.key);
  if (!key) throw new functions.https.HttpsError("failed-precondition", "NO_EMAIL_PROVIDER");

  let userExists = false;
  try {
    await admin.auth().getUserByEmail(email);
    userExists = true;
  } catch (e) {
    if (e.code !== "auth/user-not-found") throw new functions.https.HttpsError("internal", e.message || "auth");
  }
  if (!userExists) return { ok: true, sent: false };

  const ref = admin.firestore().collection("passwordResetOtps").doc(otpDocId(email));
  const snap = await ref.get();
  if (snap.exists) {
    const last = snap.data().requestedAt;
    const ms = last && last.toMillis ? last.toMillis() : 0;
    if (Date.now() - ms < 60 * 1000) {
      throw new functions.https.HttpsError("resource-exhausted", "WAIT_COOLDOWN");
    }
  }

  const code = String(Math.floor(10000000 + Math.random() * 90000000));
  const codeHash = hashOtpCode(code);
  const expiresAt = admin.firestore.Timestamp.fromDate(new Date(Date.now() + 15 * 60 * 1000));

  await ref.set({
    email,
    codeHash,
    expiresAt,
    attempts: 0,
    requestedAt: admin.firestore.FieldValue.serverTimestamp(),
  });

  const arBody = [
    "Eduzah — استعادة كلمة المرور",
    "",
    `رمز التحقق (8 أرقام): ${code}`,
    "الرمز صالح لمدة 15 دقيقة.",
    "إن لم تطلب هذا الرمز، تجاهل الرسالة.",
  ].join("\n");
  const enBody = [
    "Eduzah — Password reset",
    "",
    `Your verification code (8 digits): ${code}`,
    "This code expires in 15 minutes.",
    "If you did not request this, ignore this email.",
  ].join("\n");

  const sent = await resendSend({
    to: email,
    subject: "Eduzah — رمز استعادة كلمة المرور / Password reset code",
    text: `${arBody}\n\n---\n\n${enBody}`,
  });
  if (!sent.ok) {
    await ref.delete().catch(() => {});
    throw new functions.https.HttpsError("internal", "EMAIL_SEND_FAILED");
  }
  return { ok: true, sent: true };
});

/** Public — verify code and set new password via Admin SDK. */
exports.confirmPasswordResetOtp = functions.https.onCall(async (data) => {
  const email = String(data?.email || "").trim().toLowerCase();
  const code = String(data?.code || "").replace(/\D/g, "");
  const newPassword = String(data?.newPassword || "");
  if (!email.includes("@") || code.length !== 8) {
    throw new functions.https.HttpsError("invalid-argument", "INVALID_INPUT");
  }
  assertPasswordPolicy(newPassword);

  const ref = admin.firestore().collection("passwordResetOtps").doc(otpDocId(email));
  const snap = await ref.get();
  if (!snap.exists) throw new functions.https.HttpsError("not-found", "NO_CODE");

  const d = snap.data();
  const exp = d.expiresAt;
  if (!exp || !exp.toMillis || exp.toMillis() < Date.now()) {
    await ref.delete().catch(() => {});
    throw new functions.https.HttpsError("deadline-exceeded", "EXPIRED");
  }
  const attempts = d.attempts || 0;
  if (attempts >= 5) {
    await ref.delete().catch(() => {});
    throw new functions.https.HttpsError("resource-exhausted", "TOO_MANY_ATTEMPTS");
  }

  if (hashOtpCode(code) !== d.codeHash) {
    await ref.update({ attempts: admin.firestore.FieldValue.increment(1) });
    throw new functions.https.HttpsError("permission-denied", "BAD_CODE");
  }

  let user;
  try {
    user = await admin.auth().getUserByEmail(email);
  } catch (e) {
    await ref.delete().catch(() => {});
    throw new functions.https.HttpsError("not-found", "USER_GONE");
  }

  await admin.auth().updateUser(user.uid, { password: newPassword });
  await ref.delete().catch(() => {});
  return { ok: true };
});

exports.createAdminAccount = functions.https.onCall(async (data, context) => {
  if (!context.auth?.uid) {
    throw new functions.https.HttpsError("unauthenticated", "Sign in required.");
  }
  const callerSnap = await admin.firestore().doc(`users/${context.auth.uid}`).get();
  const caller = callerSnap.data();
  if (!caller || caller.role !== "admin") {
    throw new functions.https.HttpsError("permission-denied", "Admin only.");
  }
  const name = String(data?.name || "").trim();
  const email = String(data?.email || "").trim().toLowerCase();
  const password = String(data?.password || "");
  if (!name || !email.includes("@") || password.length < 8) {
    throw new functions.https.HttpsError("invalid-argument", "Invalid name, email, or password (min 8 chars).");
  }
  let userRecord;
  try {
    userRecord = await admin.auth().createUser({ email, password, displayName: name });
  } catch (e) {
    if (e.code === "auth/email-already-exists") {
      throw new functions.https.HttpsError("already-exists", "Email already in use.");
    }
    throw new functions.https.HttpsError("internal", e.message || "Auth error");
  }
  await admin.firestore().doc(`users/${userRecord.uid}`).set({
    name,
    email,
    role: "admin",
    status: "approved",
    avatar: name[0].toUpperCase(),
    phone: "",
    enrolledCourses: [],
    enrolledCourseIds: [],
    assignedCourses: [],
    xp: 0,
    level: 1,
    badges: [],
    userNotifications: [],
    courseActivity: {},
    createdAt: new Date().toISOString(),
  });
  return { uid: userRecord.uid };
});

exports.onEnrollmentRequestCreated = functions.firestore
  .document("enrollmentRequests/{id}")
  .onCreate(async (snap) => {
    const d = snap.data();
    const courseId = d.courseId;
    let notify = [];
    let sheetsTabName = courseId;
    try {
      const c = await admin.firestore().doc(`courses/${courseId}`).get();
      if (c.exists) {
        const cd = c.data();
        const raw = cd.notifyEmails;
        notify = Array.isArray(raw) ? raw.filter((e) => typeof e === "string" && e.includes("@")) : [];
        if (cd.sheetsTabName && String(cd.sheetsTabName).trim()) sheetsTabName = String(cd.sheetsTabName).trim();
      }
    } catch (_) {}
    try {
      await appendEnrollmentRowToSheet({
        tabName: sheetsTabName,
        row: [
          new Date().toISOString(),
          d.studentName || "",
          d.studentEmail || "",
          d.studentPhone || "",
          d.courseTitle || courseId,
          courseId,
          d.trainingType || "",
          d.paymentPlan || "",
          d.paymentMethod || "",
          d.amountQuoted != null ? String(d.amountQuoted) : "",
        ],
      });
    } catch (e) {
      console.error("Sheets append failed:", e.message || e);
    }
    const recipients = [...new Set([...notify, SUPER_ADMIN])];
    const subject = `Eduzah — تسجيل جديد في كورس: ${d.courseTitle || courseId}`;
    const text = [
      `طلب تسجيل جديد في كورس (قيد مراجعة الإدارة).`,
      ``,
      `الكورس: ${d.courseTitle}`,
      `الاسم: ${d.studentName}`,
      d.studentFullName ? `الاسم الرباعي: ${d.studentFullName}` : null,
      `البريد: ${d.studentEmail}`,
      `الهاتف: ${d.studentPhone || "—"}`,
      `حالة الطلب: ${d.enrollmentStatus || "pending"}`,
      `معرّف مستخدم: ${d.userId || "—"}`,
      `نوع التدريب: ${d.trainingType || "—"}`,
      `الدفع: ${d.paymentPlan || "—"} / ${d.paymentMethod || "—"}`,
      `المبلغ: ${d.amountQuoted != null ? d.amountQuoted : "—"}`,
      d.adminNotes ? `ملاحظات: ${d.adminNotes}` : null,
    ].filter(Boolean).join("\n");

    const key = process.env.RESEND_API_KEY || (functions.config().resend && functions.config().resend.key);
    if (!key) {
      console.log("No RESEND_API_KEY — enrollment logged only:", subject, recipients);
      return null;
    }
    try {
      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          from: "Eduzah <onboarding@resend.dev>",
          to: recipients,
          subject,
          text,
        }),
      });
      if (!res.ok) {
        console.error("Resend error", res.status, await res.text());
      }
    } catch (e) {
      console.error("Email send failed", e);
    }
    return null;
  });

/** When a Firestore doc is created under `students/{studentId}`, append one row: name, phone, email, course. */
exports.onStudentCreated = functions.firestore
  .document("students/{studentId}")
  .onCreate(async (snap, context) => {
    const studentId = context.params.studentId;
    const row = studentDocToSheetRow(snap.data() || {});
    const result = await appendSheetRow(studentsSheetTabName(), row, {
      context: "onStudentCreated",
      docId: studentId,
    });
    if (!result.ok && result.reason === "SHEETS_NOT_CONFIGURED") {
      functions.logger.info("onStudentCreated: Sheets env not configured, skipping append", {
        studentId,
      });
      return null;
    }
    if (!result.ok) {
      functions.logger.warn("onStudentCreated: permanent Sheets error, row not written", {
        studentId,
        reason: result.reason,
        status: result.status,
      });
    }
    return null;
  });
