/**
 * Deploy: firebase deploy --only functions
 * Requires Blaze plan. Set Resend (optional): firebase functions:config:set resend.key="re_..."
 *
 * createAdminAccount — only callable by Super Admin email (see SUPER_ADMIN below).
 * onEnrollmentRequestCreated — emails course notifyEmails + Super Admin when possible (Resend).
 */
const functions = require("firebase-functions");
const admin = require("firebase-admin");
const { google } = require("googleapis");

admin.initializeApp();

/** Append one enrollment row to a course tab. Requires env GOOGLE_SHEETS_SPREADSHEET_ID + GOOGLE_SERVICE_ACCOUNT_JSON (full JSON). */
async function appendEnrollmentRowToSheet({ tabName, row }) {
  const spreadsheetId = process.env.GOOGLE_SHEETS_SPREADSHEET_ID;
  const raw = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
  if (!spreadsheetId || !raw) {
    console.log("Sheets: set GOOGLE_SHEETS_SPREADSHEET_ID and GOOGLE_SERVICE_ACCOUNT_JSON to enable.");
    return;
  }
  let creds;
  try {
    creds = JSON.parse(raw);
  } catch (e) {
    console.error("Sheets: invalid GOOGLE_SERVICE_ACCOUNT_JSON", e.message);
    return;
  }
  const safeTab = String(tabName || "Enrollments").replace(/'/g, "''").slice(0, 90);
  const auth = new google.auth.JWT({
    email: creds.client_email,
    key: creds.private_key,
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
  });
  const sheets = google.sheets({ version: "v4", auth });
  const range = `'${safeTab}'!A:Z`;
  await sheets.spreadsheets.values.append({
    spreadsheetId,
    range,
    valueInputOption: "USER_ENTERED",
    insertDataOption: "INSERT_ROWS",
    requestBody: { values: [row] },
  });
}

const SUPER_ADMIN = "hazemzidan833@gmail.com";

exports.createAdminAccount = functions.https.onCall(async (data, context) => {
  if (!context.auth?.token?.email || context.auth.token.email.toLowerCase() !== SUPER_ADMIN) {
    throw new functions.https.HttpsError("permission-denied", "Super Admin only.");
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
      `البريد: ${d.studentEmail}`,
      `الهاتف: ${d.studentPhone || "—"}`,
      `حالة الطلب: ${d.enrollmentStatus || "pending"}`,
      `معرّف مستخدم: ${d.userId || "—"}`,
      `نوع التدريب: ${d.trainingType || "—"}`,
      `الدفع: ${d.paymentPlan || "—"} / ${d.paymentMethod || "—"}`,
      `المبلغ: ${d.amountQuoted != null ? d.amountQuoted : "—"}`,
    ].join("\n");

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
