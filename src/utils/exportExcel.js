/**
 * Eduzah — Excel Export Utility
 * Uses SheetJS (xlsx) to generate .xlsx files client-side.
 * Only callable by authenticated Admins (enforced by Firestore rules + UI guard).
 */
import * as XLSX from "xlsx";
import { collection, getDocs, query, where } from "firebase/firestore";
import { db } from "../firebase";

// ─── helpers ───────────────────────────────────────────────────────────────

/** Format ISO date string → "2024-04-09 14:30" */
function fmtDate(iso) {
  if (!iso) return "";
  try {
    const d = new Date(iso);
    const pad = (n) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
  } catch {
    return iso;
  }
}

/** Map internal training type value → readable label */
function fmtTrainingType(v) {
  const map = { online: "Live Online", offline: "Offline (Company Branch)" };
  return map[v] || v || "";
}

/** Map payment plan → readable label */
function fmtPaymentPlan(v) {
  const map = { full: "Full Payment (5% discount)", installments: "Installments (3×)" };
  return map[v] || v || "";
}

/** Map level value → readable label */
function fmtLevel(v) {
  const map = {
    beginner: "Complete Beginner",
    basic: "Knows the Basics",
    intermediate: "Intermediate",
    advanced: "Advanced",
  };
  return map[v] || v || "";
}

// ─── column header style (bold, colored) ──────────────────────────────────

function buildStyledSheet(headers, rows) {
  const wsData = [headers, ...rows];
  const ws = XLSX.utils.aoa_to_sheet(wsData);

  // Column widths
  ws["!cols"] = headers.map((h) => ({ wch: Math.max(h.length + 4, 20) }));

  // Bold header row
  const range = XLSX.utils.decode_range(ws["!ref"]);
  for (let C2 = range.s.c; C2 <= range.e.c; C2++) {
    const cell = ws[XLSX.utils.encode_cell({ r: 0, c: C2 })];
    if (cell) {
      cell.s = {
        font: { bold: true, color: { rgb: "FFFFFF" } },
        fill: { fgColor: { rgb: "3D1F5C" } },
        alignment: { horizontal: "center" },
      };
    }
  }
  return ws;
}

// ─── Main export function ──────────────────────────────────────────────────

/**
 * exportCourseStudents
 * @param {object} course   — Firestore course document
 * @param {Array}  allUsers — already-loaded users array from AuthContext
 */
export async function exportCourseStudents(course, allUsers = []) {
  // ── 1. Pull enrollment requests for this course ──────────────────────────
  let enrollmentRows = [];
  try {
    const q = query(
      collection(db, "enrollmentRequests"),
      where("courseId", "==", course.id)
    );
    const snap = await getDocs(q);
    enrollmentRows = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  } catch (err) {
    console.warn("enrollmentRequests query failed:", err.message);
  }

  // ── 2. Pull enrolled users for this course ───────────────────────────────
  const enrolledUsers = allUsers.filter((u) =>
    (u.enrolledCourses || []).some((e) => e.courseId === course.id)
  );

  // ── 3. Build unified row list (merge both sources, dedupe by email) ──────
  const seen = new Set();
  const combined = [];

  // From enrollmentRequests (most detailed — has paymentPlan, trainingType etc.)
  for (const r of enrollmentRows) {
    const key = (r.studentEmail || "").toLowerCase();
    seen.add(key);

    // Check if this student has a user profile
    const userProfile = allUsers.find(
      (u) => u.email?.toLowerCase() === key
    );
    const enrollment = userProfile?.enrolledCourses?.find(
      (e) => e.courseId === course.id
    );

    combined.push({
      name:           r.studentName || "",
      email:          r.studentEmail || "",
      phone:          r.studentPhone || userProfile?.phone || "",
      trainingType:   fmtTrainingType(r.trainingType),
      paymentMethod:  r.paymentMethod || "InstaPay",
      paymentPlan:    fmtPaymentPlan(r.paymentPlan),
      amountQuoted:   r.amountQuoted ? `${r.amountQuoted} EGP` : "",
      level:          fmtLevel(r.level),
      source:         r.source || "",
      accountStatus:  userProfile?.status || "No Account",
      progress:       enrollment ? `${enrollment.progress || 0}%` : "—",
      enrollDate:     enrollment?.enrollDate || fmtDate(r.createdAt),
      registeredAt:   fmtDate(r.createdAt),
      notes:          "",
    });
  }

  // From users who are enrolled but didn't go through enrollmentRequests form
  for (const u of enrolledUsers) {
    const key = (u.email || "").toLowerCase();
    if (seen.has(key)) continue; // already included above
    seen.add(key);

    const enrollment = u.enrolledCourses?.find((e) => e.courseId === course.id);
    combined.push({
      name:           u.name || "",
      email:          u.email || "",
      phone:          u.phone || "",
      trainingType:   "—",
      paymentMethod:  "—",
      paymentPlan:    "—",
      amountQuoted:   "—",
      level:          "—",
      source:         "—",
      accountStatus:  u.status || "",
      progress:       `${enrollment?.progress || 0}%`,
      enrollDate:     enrollment?.enrollDate || "",
      registeredAt:   u.createdAt ? fmtDate(u.createdAt) : "",
      notes:          "",
    });
  }

  if (combined.length === 0) {
    return { ok: false, msg: "لا يوجد طلاب مسجلون في هذا الكورس" };
  }

  // ── 4. Build Excel workbook ──────────────────────────────────────────────
  const wb = XLSX.utils.book_new();

  // Sheet 1 — Full student data
  const HEADERS = [
    "الاسم الكامل / Full Name",
    "البريد الإلكتروني / Email",
    "رقم الهاتف / Phone",
    "نوع التدريب / Training Type",
    "طريقة الدفع / Payment Method",
    "خطة الدفع / Payment Plan",
    "المبلغ / Amount",
    "المستوى / Level",
    "مصدر التعرف / Source",
    "حالة الحساب / Account Status",
    "التقدم / Progress",
    "تاريخ التسجيل / Enroll Date",
    "تاريخ الطلب / Request Date",
    "ملاحظات / Notes",
  ];

  const dataRows = combined.map((r) => [
    r.name,
    r.email,
    r.phone,
    r.trainingType,
    r.paymentMethod,
    r.paymentPlan,
    r.amountQuoted,
    r.level,
    r.source,
    r.accountStatus,
    r.progress,
    r.enrollDate,
    r.registeredAt,
    r.notes,
  ]);

  const ws1 = buildStyledSheet(HEADERS, dataRows);
  XLSX.utils.book_append_sheet(wb, ws1, "Students");

  // Sheet 2 — Summary stats
  const now = new Date();
  const summaryData = [
    ["Eduzah Platform — Course Export"],
    [],
    ["Course", course.title],
    ["Course (EN)", course.title_en || course.title],
    ["Price", `${(course.price || 0).toLocaleString()} EGP`],
    ["Duration", course.duration || ""],
    ["Export Date", fmtDate(now.toISOString())],
    [],
    ["Total Enrolled", combined.length],
    ["Full Payment", combined.filter((r) => r.paymentPlan.includes("Full")).length],
    ["Installments", combined.filter((r) => r.paymentPlan.includes("Install")).length],
    ["Live Online", combined.filter((r) => r.trainingType.includes("Online")).length],
    ["Offline", combined.filter((r) => r.trainingType.includes("Offline")).length],
    ["Approved Accounts", combined.filter((r) => r.accountStatus === "approved").length],
    ["Pending Accounts", combined.filter((r) => r.accountStatus === "pending").length],
  ];
  const ws2 = XLSX.utils.aoa_to_sheet(summaryData);
  ws2["!cols"] = [{ wch: 28 }, { wch: 36 }];
  XLSX.utils.book_append_sheet(wb, ws2, "Summary");

  // ── 5. Download ──────────────────────────────────────────────────────────
  const safeName = (course.title_en || course.title || "course")
    .replace(/[^a-zA-Z0-9\u0600-\u06FF]/g, "_")
    .slice(0, 40);
  const fileName = `Eduzah_${safeName}_Students.xlsx`;

  XLSX.writeFile(wb, fileName);
  return { ok: true, count: combined.length, fileName };
}
