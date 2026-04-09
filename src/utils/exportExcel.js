/**
 * Eduzah — Excel Export Utility  (SheetJS / xlsx)
 * - Deduplicates by email (keeps latest request)
 * - Full professional styling: header, alternating rows, borders, freeze pane
 */
import * as XLSX from "xlsx";
import { collection, getDocs, query, where } from "firebase/firestore";
import { db } from "../firebase";

// ─── formatters ────────────────────────────────────────────────────────────
const fmtDate = (iso) => {
  if (!iso) return "";
  try {
    const d = new Date(iso);
    const p = (n) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${p(d.getMonth()+1)}-${p(d.getDate())}  ${p(d.getHours())}:${p(d.getMinutes())}`;
  } catch { return iso; }
};

const fmtTraining = (v) => ({ online:"Live Online", offline:"Offline (Company Branch)" }[v] || v || "—");
const fmtPlan     = (v) => ({ full:"Full Payment (−5%)", installments:"Installments (3×)" }[v] || v || "—");
const fmtLevel    = (v) => ({ beginner:"Beginner", basic:"Basic", intermediate:"Intermediate", advanced:"Advanced" }[v] || v || "—");
const fmtStatus   = (v) => ({ approved:"✅ Approved", pending:"⏳ Pending", rejected:"❌ Rejected" }[v] || v || "No Account");

// ─── XLSX cell style builders ───────────────────────────────────────────────
const PURPLE   = "3D1F5C";
const PURPLE_L = "EDE7F6";
const GOLD     = "FAA633";
const WHITE    = "FFFFFF";
const LIGHT    = "F5F0FA";
const BORDER_C = "C8B8E8";

const border = () => ({
  top:    { style: "thin", color: { rgb: BORDER_C } },
  bottom: { style: "thin", color: { rgb: BORDER_C } },
  left:   { style: "thin", color: { rgb: BORDER_C } },
  right:  { style: "thin", color: { rgb: BORDER_C } },
});

const headerStyle = () => ({
  font:      { bold: true, sz: 11, color: { rgb: WHITE }, name: "Cairo" },
  fill:      { fgColor: { rgb: PURPLE } },
  alignment: { horizontal: "center", vertical: "center", wrapText: true },
  border:    border(),
});

const subHeaderStyle = () => ({
  font:      { bold: true, sz: 10, color: { rgb: PURPLE } },
  fill:      { fgColor: { rgb: PURPLE_L } },
  alignment: { horizontal: "center", vertical: "center" },
  border:    border(),
});

const cellStyle = (rowIdx) => ({
  font:      { sz: 10, name: "Cairo" },
  fill:      { fgColor: { rgb: rowIdx % 2 === 0 ? WHITE : LIGHT } },
  alignment: { horizontal: "right", vertical: "center", wrapText: false },
  border:    border(),
});

const amountStyle = (rowIdx) => ({
  font:      { sz: 10, bold: true, color: { rgb: "1D6F42" } },
  fill:      { fgColor: { rgb: rowIdx % 2 === 0 ? WHITE : LIGHT } },
  alignment: { horizontal: "center", vertical: "center" },
  border:    border(),
  numFmt:    '#,##0 "EGP"',
});

const statusStyle = (val, rowIdx) => ({
  font: {
    sz: 10, bold: true,
    color: { rgb: val === "approved" ? "1D6F42" : val === "pending" ? "9B5D00" : "C00000" },
  },
  fill: { fgColor: { rgb: rowIdx % 2 === 0 ? WHITE : LIGHT } },
  alignment: { horizontal: "center", vertical: "center" },
  border: border(),
});

// ─── Apply styles to a range ────────────────────────────────────────────────
function applyStyles(ws, rows) {
  rows.forEach(({ r, c, style, value }) => {
    const addr = XLSX.utils.encode_cell({ r, c });
    if (!ws[addr]) ws[addr] = { v: value ?? "", t: "s" };
    ws[addr].s = style;
  });
}

// ─── Main export ─────────────────────────────────────────────────────────────
export async function exportCourseStudents(course, allUsers = []) {

  // ── 1. Fetch enrollmentRequests ───────────────────────────────────────────
  let requests = [];
  try {
    const snap = await getDocs(
      query(collection(db, "enrollmentRequests"), where("courseId", "==", course.id))
    );
    requests = snap.docs.map(d => ({ id: d.id, ...d.data() }));
  } catch (err) {
    console.warn("enrollmentRequests query:", err.message);
  }

  // ── 2. Deduplicate enrollmentRequests by email (keep latest) ─────────────
  const reqByEmail = new Map();
  for (const r of requests) {
    const key = (r.studentEmail || "").toLowerCase().trim();
    if (!key) continue;
    const existing = reqByEmail.get(key);
    // Keep the most recent submission
    if (!existing || (r.createdAt || "") > (existing.createdAt || "")) {
      reqByEmail.set(key, r);
    }
  }

  // ── 3. Build unified row list ─────────────────────────────────────────────
  const seen = new Set();
  const rows = [];

  // From deduplicated enrollmentRequests
  for (const [key, r] of reqByEmail) {
    seen.add(key);
    const profile   = allUsers.find(u => u.email?.toLowerCase() === key);
    const enrollment = profile?.enrolledCourses?.find(e => e.courseId === course.id);
    rows.push({
      name:         r.studentName || profile?.name || "",
      email:        r.studentEmail || "",
      phone:        r.studentPhone || profile?.phone || "",
      training:     fmtTraining(r.trainingType),
      payMethod:    (r.paymentMethod || "InstaPay").toUpperCase(),
      payPlan:      fmtPlan(r.paymentPlan),
      amount:       r.amountQuoted ?? null,
      level:        fmtLevel(r.level),
      source:       r.source || "—",
      status:       profile?.status || "no-account",
      progress:     enrollment ? `${enrollment.progress || 0}%` : "—",
      enrollDate:   enrollment?.enrollDate || fmtDate(r.createdAt),
      requestedAt:  fmtDate(r.createdAt),
    });
  }

  // From enrolled users not in enrollmentRequests
  const enrolledUsers = allUsers.filter(u =>
    (u.enrolledCourses || []).some(e => e.courseId === course.id)
  );
  for (const u of enrolledUsers) {
    const key = (u.email || "").toLowerCase().trim();
    if (seen.has(key)) continue;
    seen.add(key);
    const enrollment = u.enrolledCourses.find(e => e.courseId === course.id);
    rows.push({
      name:         u.name || "",
      email:        u.email || "",
      phone:        u.phone || "",
      training:     "—",
      payMethod:    "—",
      payPlan:      "—",
      amount:       null,
      level:        "—",
      source:       "—",
      status:       u.status || "",
      progress:     `${enrollment?.progress || 0}%`,
      enrollDate:   enrollment?.enrollDate || "",
      requestedAt:  u.createdAt ? fmtDate(u.createdAt) : "",
    });
  }

  if (rows.length === 0) {
    return { ok: false, msg: "لا يوجد طلاب مسجلون في هذا الكورس بعد" };
  }

  // ── 4. Build workbook ─────────────────────────────────────────────────────
  const wb = XLSX.utils.book_new();

  // ════════════ SHEET 1 — Students ═══════════════════════════════════════════
  const COLS = [
    { key: "name",        label: "الاسم الكامل\nFull Name",        w: 26 },
    { key: "email",       label: "البريد الإلكتروني\nEmail",       w: 30 },
    { key: "phone",       label: "رقم الهاتف\nPhone",              w: 18 },
    { key: "training",    label: "نوع التدريب\nTraining Type",     w: 22 },
    { key: "payMethod",   label: "طريقة الدفع\nPayment Method",    w: 18 },
    { key: "payPlan",     label: "خطة الدفع\nPayment Plan",        w: 24 },
    { key: "amount",      label: "المبلغ\nAmount (EGP)",           w: 16 },
    { key: "level",       label: "المستوى\nLevel",                 w: 18 },
    { key: "source",      label: "مصدر التعرف\nSource",            w: 22 },
    { key: "status",      label: "الحالة\nStatus",                 w: 18 },
    { key: "progress",    label: "التقدم\nProgress",               w: 12 },
    { key: "enrollDate",  label: "تاريخ التسجيل\nEnroll Date",     w: 20 },
    { key: "requestedAt", label: "تاريخ الطلب\nRequest Date",      w: 20 },
  ];

  // Title row (merged) + header row + data rows
  const TITLE_ROW  = 0;
  const HEADER_ROW = 2;
  const DATA_START = 3;

  // Build sheet with raw data first
  const aoa = [
    // Row 0: title placeholder (will be styled)
    [`Eduzah — ${course.title_en || course.title} | Student Export`],
    // Row 1: empty separator
    [],
    // Row 2: headers
    COLS.map(c => c.label),
    // Rows 3+: data
    ...rows.map(r => COLS.map(col => {
      if (col.key === "amount") return r.amount ?? "";
      if (col.key === "status") return fmtStatus(r.status);
      return r[col.key] ?? "";
    })),
  ];

  const ws = XLSX.utils.aoa_to_sheet(aoa);

  // Column widths
  ws["!cols"] = COLS.map(c => ({ wch: c.w }));

  // Row heights
  ws["!rows"] = [
    { hpx: 36 }, // title
    { hpx: 6  }, // spacer
    { hpx: 44 }, // header (two lines)
    ...rows.map(() => ({ hpx: 24 })),
  ];

  // Merge title across all columns
  ws["!merges"] = [
    { s: { r: TITLE_ROW, c: 0 }, e: { r: TITLE_ROW, c: COLS.length - 1 } },
  ];

  // Freeze header
  ws["!freeze"] = { xSplit: 0, ySplit: DATA_START };

  // ── Title cell style ──
  const titleAddr = XLSX.utils.encode_cell({ r: TITLE_ROW, c: 0 });
  ws[titleAddr] = {
    v: `Eduzah — ${course.title_en || course.title} | Student Export`,
    t: "s",
    s: {
      font:      { bold: true, sz: 14, color: { rgb: WHITE }, name: "Cairo" },
      fill:      { fgColor: { rgb: "1a0a2e" } },
      alignment: { horizontal: "center", vertical: "center" },
      border:    border(),
    },
  };

  // ── Header row styles ──
  COLS.forEach((col, c) => {
    const addr = XLSX.utils.encode_cell({ r: HEADER_ROW, c });
    ws[addr] = { v: col.label, t: "s", s: headerStyle() };
  });

  // ── Data row styles ──
  rows.forEach((row, ri) => {
    const r = DATA_START + ri;
    COLS.forEach((col, c) => {
      const addr = XLSX.utils.encode_cell({ r, c });
      if (!ws[addr]) ws[addr] = { v: "", t: "s" };

      if (col.key === "amount") {
        const num = row.amount;
        ws[addr] = {
          v: num != null ? Number(num) : "",
          t: num != null ? "n" : "s",
          s: amountStyle(ri),
        };
      } else if (col.key === "status") {
        ws[addr].s = statusStyle(row.status, ri);
      } else {
        ws[addr].s = cellStyle(ri);
      }
    });
  });

  // Update sheet ref to include all rows
  ws["!ref"] = XLSX.utils.encode_range({
    s: { r: 0, c: 0 },
    e: { r: DATA_START + rows.length - 1, c: COLS.length - 1 },
  });

  XLSX.utils.book_append_sheet(wb, ws, "Students");

  // ════════════ SHEET 2 — Summary ════════════════════════════════════════════
  const now = new Date();
  const fullCount   = rows.filter(r => r.payPlan.includes("Full")).length;
  const instCount   = rows.filter(r => r.payPlan.includes("Install")).length;
  const onlineCount = rows.filter(r => r.training.includes("Online")).length;
  const offlineCount= rows.filter(r => r.training.includes("Offline")).length;
  const approvedCount = rows.filter(r => r.status === "approved").length;
  const pendingCount  = rows.filter(r => r.status === "pending").length;
  const totalRevenue  = rows.reduce((sum, r) => sum + (Number(r.amount) || 0), 0);

  const summaryAoa = [
    ["Eduzah Platform — Export Summary"],
    [],
    ["Field", "Value"],
    ["Course (AR)", course.title],
    ["Course (EN)", course.title_en || course.title],
    ["Price", `${(course.price || 0).toLocaleString()} EGP`],
    ["Duration", course.duration || ""],
    ["Export Date", fmtDate(now.toISOString())],
    [],
    ["📊 Statistics", ""],
    ["Total Students", rows.length],
    ["Full Payment", fullCount],
    ["Installments", instCount],
    ["Live Online", onlineCount],
    ["Offline", offlineCount],
    [],
    ["Approved Accounts", approvedCount],
    ["Pending Accounts", pendingCount],
    [],
    ["💰 Revenue", ""],
    ["Total Quoted Revenue", `${totalRevenue.toLocaleString()} EGP`],
  ];

  const ws2 = XLSX.utils.aoa_to_sheet(summaryAoa);
  ws2["!cols"] = [{ wch: 28 }, { wch: 36 }];
  ws2["!rows"] = [{ hpx: 36 }, ...summaryAoa.slice(1).map(() => ({ hpx: 22 }))];

  // Style summary sheet
  const styleCell = (r, c, style) => {
    const addr = XLSX.utils.encode_cell({ r, c });
    if (ws2[addr]) ws2[addr].s = style;
  };

  // Title
  ws2["!merges"] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: 1 } }];
  styleCell(0, 0, {
    font:      { bold: true, sz: 13, color: { rgb: WHITE } },
    fill:      { fgColor: { rgb: "1a0a2e" } },
    alignment: { horizontal: "center", vertical: "center" },
  });

  // Sub-headers (Field / Value, Statistics, Revenue)
  [2, 9, 19].forEach(r => {
    [0, 1].forEach(c => styleCell(r, c, subHeaderStyle()));
  });

  // Data rows
  summaryAoa.forEach((row, r) => {
    if (r <= 2) return;
    [0, 1].forEach(c => {
      const addr = XLSX.utils.encode_cell({ r, c });
      if (ws2[addr]) {
        ws2[addr].s = {
          font:      { sz: 10, bold: c === 0 },
          fill:      { fgColor: { rgb: r % 2 === 0 ? WHITE : LIGHT } },
          alignment: { horizontal: c === 0 ? "left" : "right", vertical: "center" },
          border:    border(),
        };
      }
    });
  });

  XLSX.utils.book_append_sheet(wb, ws2, "Summary");

  // ── Download ──────────────────────────────────────────────────────────────
  const safeName = (course.title_en || course.title || "course")
    .replace(/[^a-zA-Z0-9\u0600-\u06FF]/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_|_$/g, "")
    .slice(0, 40);
  const fileName = `Eduzah_${safeName}_Students.xlsx`;

  XLSX.writeFile(wb, fileName, { cellStyles: true });
  return { ok: true, count: rows.length, fileName };
}
