/**
 * Eduzah — Excel export utilities
 * Student export uses ExcelJS so fills/fonts/borders appear in Excel (SheetJS CE does not write styles).
 */
import { collection, getDocs, query, where } from "firebase/firestore";
import { db } from "../firebase";

// ─── formatters ────────────────────────────────────────────────────────────
export const fmtDate = (iso) => {
  if (!iso) return "";
  try {
    const d = new Date(iso);
    const p = (n) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${p(d.getMonth()+1)}-${p(d.getDate())}  ${p(d.getHours())}:${p(d.getMinutes())}`;
  } catch { return iso; }
};

/** تاريخ فقط YYYY-MM-DD (لجدول الطلاب / Excel) */
export const fmtDateShort = (iso) => {
  if (!iso) return "";
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return String(iso).slice(0, 10);
    const p = (n) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
  } catch {
    return String(iso).slice(0, 10);
  }
};

export const attendanceLabelAr = (trainingType) => {
  if (trainingType === "offline") return "حضوري";
  if (trainingType === "online") return "أونلاين مباشر";
  return trainingType ? String(trainingType) : "—";
};

/** نص عربي يعرض في الجدول / Excel لحقل contactStatus */
export function contactStatusLabelAr(code) {
  const map = {
    no_response: "مردش",
    wont_book: "مش هيحجز",
    thinking: "هيفكر ويحجز",
    confirmed_will_pay: "أكد وهيدفع",
    booked_paid: "حجز حالياً ودفع",
    future_round: "هيحجز في راوند قادمة",
    booked_previous: "حاجز في راوند سابقة",
    attending_current: "بيحضر في الراوند الحالية",
  };
  return map[code] || "—";
}

/** حقول مالية على enrollmentRequests: depositAmount، installment1..3، coursePriceOverride، adminNotes. المدفوع = مجموع الديبوزت + الأقساط (مع احتياطي totalPaidManual للبيانات القديمة). */
export function computeStudentFinance(r, course) {
  const courseCost = Number(r.coursePriceOverride ?? course?.price ?? 0) || 0;
  const dep = r.depositAmount;
  const i1 = r.installment1;
  const i2 = r.installment2;
  const i3 = r.installment3;
  const toNum = (v) => {
    if (v === "" || v == null) return 0;
    const n = Number(v);
    return Number.isFinite(n) ? n : 0;
  };
  const sumParts = toNum(dep) + toNum(i1) + toNum(i2) + toNum(i3);
  let totalPaid = null;
  if (sumParts > 0) totalPaid = sumParts;
  else {
    const manualRaw = r.totalPaidManual;
    if (manualRaw != null && manualRaw !== "") {
      const m = Number(manualRaw);
      if (!Number.isNaN(m)) totalPaid = m;
    }
  }
  let remaining = null;
  if (courseCost > 0 && totalPaid != null && !Number.isNaN(totalPaid)) remaining = Math.max(0, courseCost - totalPaid);
  return {
    courseCost: courseCost || "",
    deposit: dep ?? "",
    installment1: i1 ?? "",
    installment2: i2 ?? "",
    installment3: i3 ?? "",
    totalPaid: totalPaid ?? "",
    remaining: remaining ?? "",
  };
}

export const fmtTraining = (v) => ({ online:"Live Online", offline:"Offline (Branch)" }[v] || v || "—");
export const fmtPlan     = (v) => ({ full:"دفع كامل (−5%)", installments:"أقساط (3×)" }[v] || v || "—");
export const fmtLevel    = (v) => ({ beginner:"مبتدئ", basic:"أساسيات", intermediate:"متوسط", advanced:"متقدم" }[v] || v || "—");

/**
 * Match `enrollmentRequests.courseId` / `enrolledCourses[].courseId` to a course doc.
 * Handles: string vs number, trim, and id vs slug when historical data disagrees.
 */
function sameCourseId(a, course) {
  if (a == null || course == null) return false;
  const av = String(a).trim();
  const id = course.id != null ? String(course.id).trim() : "";
  const slug = course.slug != null ? String(course.slug).trim() : "";
  if (av === "" || (!id && !slug)) return false;
  const nStored = Number(av);
  if (Number.isFinite(nStored) && String(nStored) === av) {
    const matchNum = id !== "" && String(Number(id)) === id.trim() && Number(id) === nStored;
    const matchSlugNum = slug !== "" && String(Number(slug)) === slug.trim() && Number(slug) === nStored;
    return av === id || av === slug || matchNum || matchSlugNum;
  }
  return av === id || (slug !== "" && av === slug);
}

function enrollmentDedupeKey(r) {
  const em = (r.studentEmail || "").toLowerCase().trim();
  if (em) return `email:${em}`;
  const ph = String(r.studentPhone ?? "").replace(/\s+/g, "");
  if (ph) return `phone:${ph}`;
  return `doc:${r.id || "?"}`;
}

// ─── Shared data fetcher ────────────────────────────────────────────────────
export async function fetchCourseStudents(course, allUsers = []) {
  let requests = [];
  const byDocId = new Map();
  const mergeSnap = (snap) => {
    for (const d of snap.docs) {
      if (!byDocId.has(d.id)) byDocId.set(d.id, { id: d.id, ...d.data() });
    }
  };
  const stringKeys = [
    ...new Set(
      [String(course?.id ?? "").trim(), String(course?.slug ?? "").trim()].filter(Boolean),
    ),
  ];
  let anyQueryOk = false;
  let lastQueryErr = null;
  try {
    for (const key of stringKeys) {
      try {
        mergeSnap(
          await getDocs(query(collection(db, "enrollmentRequests"), where("courseId", "==", key))),
        );
        anyQueryOk = true;
      } catch (e) {
        lastQueryErr = e;
        console.warn("enrollmentRequests(string courseId=", key, "):", e?.message || e);
      }
    }
    const numericVariants = new Set();
    for (const key of stringKeys) {
      const n = Number(key);
      if (key !== "" && Number.isFinite(n) && String(n) === String(key).trim()) numericVariants.add(n);
    }
    for (const n of numericVariants) {
      try {
        mergeSnap(
          await getDocs(query(collection(db, "enrollmentRequests"), where("courseId", "==", n))),
        );
        anyQueryOk = true;
      } catch (e) {
        lastQueryErr = e;
        console.warn("enrollmentRequests(number courseId=", n, "):", e?.message || e);
      }
    }
    requests = [...byDocId.values()];
    if (!anyQueryOk && stringKeys.length > 0 && lastQueryErr) {
      throw lastQueryErr;
    }
  } catch (err) {
    console.error("enrollmentRequests fetch failed:", err);
    throw err;
  }

  const reqByKey = new Map();
  for (const r of requests) {
    if (!sameCourseId(r.courseId, course)) continue;
    const dk = enrollmentDedupeKey(r);
    const ex = reqByKey.get(dk);
    const exTime = typeof ex?.createdAt?.toMillis === "function" ? ex.createdAt.toMillis() : 0;
    const rTime = typeof r.createdAt?.toMillis === "function" ? r.createdAt.toMillis() : 0;
    if (!ex || rTime >= exTime) reqByKey.set(dk, r);
  }

  /** Emails already covered by an enrollment-request row (skip duplicate user rows). */
  const seenEmails = new Set();
  const rows = [];

  for (const [, r] of reqByKey) {
    const em = (r.studentEmail || "").toLowerCase().trim();
    if (em) seenEmails.add(em);
    const profile = allUsers.find((u) => u.email?.toLowerCase() === em);
    const enrollment = profile?.enrolledCourses?.find((e) => sameCourseId(e.courseId, course));
    const reqSt = r.enrollmentStatus ?? "pending";
    const status = reqSt === "pending" && enrollment ? "approved" : reqSt;
    const contactStatus = (() => {
      const v = enrollment?.contactStatus ?? r.contactStatus;
      if (!v) return "no_response";
      // Backwards compatibility (old toggle values)
      if (v === "not_contacted") return "no_response";
      if (v === "contacted") return "confirmed_will_pay";
      return v;
    })();
    const effFinance = {
      ...r,
      coursePriceOverride: r.coursePriceOverride ?? enrollment?.coursePriceOverride,
      depositAmount: r.depositAmount ?? enrollment?.depositAmount,
      installment1: r.installment1 ?? enrollment?.installment1,
      installment2: r.installment2 ?? enrollment?.installment2,
      installment3: r.installment3 ?? enrollment?.installment3,
      totalPaidManual: r.totalPaidManual ?? enrollment?.totalPaidManual,
    };
    const effPaymentPlan = r.paymentPlan ?? enrollment?.paymentPlan ?? null;
    const fin = computeStudentFinance(effFinance, course);
    rows.push({
      docId:            r.id || null,           // Firestore doc ID for payment confirmation
      userId:           profile?.id || null,    // platform uid (if exists)
      name:             r.studentName || profile?.name || "",
      fullName:
        r.studentFullName
        || r.studentName
        || profile?.studentFullName
        || profile?.name
        || "",
      email:            r.studentEmail || "",
      phone:            r.studentPhone || profile?.phone || "",
      training:         fmtTraining(r.trainingType),
      attendanceAr:     attendanceLabelAr(r.trainingType),
      payMethod:        (r.paymentMethod || "InstaPay").toUpperCase(),
      paymentPlan:      effPaymentPlan,
      payPlan:          fmtPlan(effPaymentPlan),
      amount:           r.amountQuoted ?? null,
      level:            fmtLevel(r.level),
      source:           r.source || "—",
      bookingChannel:   r.source || "—",
      status,
      enrollDate:       enrollment?.enrollDate || fmtDate(r.createdAt),
      requestedAt:      fmtDate(r.createdAt),
      sheetDate:        fmtDateShort(r.createdAt),
      diplomaTitle:     course?.title || r.courseTitle || "—",
      notes:            enrollment?.adminNotes ?? r.adminNotes ?? "",
      courseCost:       fin.courseCost,
      deposit:          fin.deposit,
      installment1:     fin.installment1,
      installment2:     fin.installment2,
      installment3:     fin.installment3,
      totalPaid:        fin.totalPaid,
      remaining:        fin.remaining,
      totalPaidManual:  effFinance.totalPaidManual ?? null,
      paymentConfirmed: r.paymentConfirmed === true,
      confirmedAt:      r.confirmedAt || null,
      contactStatus,
      contactStatusLabel: contactStatusLabelAr(contactStatus),
      contactUpdatedAt: enrollment?.contactUpdatedAt || r.contactUpdatedAt || null,
      coursePriceOverride: effFinance.coursePriceOverride ?? null,
    });
  }

  // Enrolled users not in enrollmentRequests
  for (const u of allUsers) {
    const enrollment = (u.enrolledCourses || []).find((e) => sameCourseId(e.courseId, course));
    if (!enrollment) continue;
    const key = (u.email || "").toLowerCase().trim();
    if (key && seenEmails.has(key)) continue;
    if (key) seenEmails.add(key);
    const guestR = {
      depositAmount: enrollment?.depositAmount,
      installment1: enrollment?.installment1,
      installment2: enrollment?.installment2,
      installment3: enrollment?.installment3,
      totalPaidManual: enrollment?.totalPaidManual,
      coursePriceOverride: enrollment?.coursePriceOverride,
      amountQuoted: null,
      paymentConfirmed: false,
      confirmedAt: null,
    };
    const finG = computeStudentFinance(guestR, course);
    const guestPaymentPlan = enrollment?.paymentPlan ?? null;
    const enrollDateRaw = enrollment?.enrollDate;
    const sheetDateGuest =
      typeof enrollDateRaw === "string" && /^\d{4}-\d{2}-\d{2}/.test(enrollDateRaw)
        ? fmtDateShort(enrollDateRaw)
        : enrollDateRaw || fmtDateShort(u.createdAt) || "";
    const guestContactStatus = (() => {
      const v = enrollment?.contactStatus;
      if (!v) return "no_response";
      if (v === "not_contacted") return "no_response";
      if (v === "contacted") return "confirmed_will_pay";
      return v;
    })();
    rows.push({
      docId:            null,
      userId:           u.id || null,
      name:             u.name || "",
      fullName:         u.studentFullName || u.name || "",
      email:            u.email || "",
      phone:            u.phone || "",
      training:         "—",
      attendanceAr:     "—",
      payMethod:        "—",
      paymentPlan:      guestPaymentPlan,
      payPlan:          fmtPlan(guestPaymentPlan),
      amount:           null,
      level:            "—",
      source:           "—",
      bookingChannel:   "—",
      status:           "approved",
      enrollDate:       enrollment.enrollDate || "",
      requestedAt:      u.createdAt ? fmtDate(u.createdAt) : "",
      sheetDate:        sheetDateGuest,
      diplomaTitle:     course?.title || "—",
      notes:            enrollment?.adminNotes || "",
      courseCost:       finG.courseCost,
      deposit:          finG.deposit,
      installment1:     finG.installment1,
      installment2:     finG.installment2,
      installment3:     finG.installment3,
      totalPaid:        finG.totalPaid,
      remaining:        finG.remaining,
      totalPaidManual:  guestR.totalPaidManual ?? null,
      paymentConfirmed: false,
      confirmedAt:      null,
      contactStatus:    guestContactStatus,
      contactStatusLabel: contactStatusLabelAr(guestContactStatus),
      contactUpdatedAt: enrollment?.contactUpdatedAt || null,
      coursePriceOverride: enrollment?.coursePriceOverride ?? null,
    });
  }

  return rows;
}

/** مبلغ للإحصائيات: المدفوع اليدوي (`totalPaid`) أولًا، ثم `amount` القديم للتوافق. */
export function ledgerAmountForStats(r) {
  if (!r) return 0;
  const tp = r.totalPaid;
  if (tp !== "" && tp != null) {
    const n = Number(tp);
    if (Number.isFinite(n)) return n;
  }
  const a = Number(r.amount);
  return Number.isFinite(a) ? a : 0;
}

/** Same revenue rules as `CourseStudentsModal` stats (excludes rejected rows). */
export function computeCourseStudentRevenue(studentRows) {
  const rows = (studentRows || []).filter((r) => (r.status || "pending") !== "rejected");
  const confirmedRows = rows.filter((r) => r.paymentConfirmed);
  const pendingPayRows = rows.filter((r) => !r.paymentConfirmed && ledgerAmountForStats(r) > 0);
  const confirmedRevenue = confirmedRows.reduce((s, r) => s + ledgerAmountForStats(r), 0);
  const pendingRevenue = pendingPayRows.reduce((s, r) => s + ledgerAmountForStats(r), 0);
  return {
    studentCount: rows.length,
    confirmedRevenue,
    pendingRevenue,
    totalRevenue: confirmedRevenue + pendingRevenue,
  };
}

// ─── Excel export (students) ────────────────────────────────────────────────
const BORDER_ARGB = "FFB8A9D9";
const EX_BORDER = {
  top: { style: "thin", color: { argb: BORDER_ARGB } },
  left: { style: "thin", color: { argb: BORDER_ARGB } },
  bottom: { style: "thin", color: { argb: BORDER_ARGB } },
  right: { style: "thin", color: { argb: BORDER_ARGB } },
};
const TITLE_FILL = "FF2B1446";
const HEAD_FILL = "FF3D1F5C";
const STRIPE_A = "FFFFFFFF";
const STRIPE_B = "FFEDE8F5";
const HEADER_ROW_IDX = 3;
const DATA_START_IDX = 4;

const MONEY_KEYS = new Set([
  "courseCost",
  "deposit",
  "installment1",
  "installment2",
  "installment3",
  "totalPaid",
  "remaining",
]);

const EXPORT_COLS = [
  { key: "sheetDate", label: "التاريخ\nDate", w: 15 },
  { key: "fullName", label: "اسم الطالب رباعي\nFull name", w: 34 },
  { key: "phone", label: "رقم التليفون\nPhone", w: 18 },
  { key: "attendanceAr", label: "حضور الكورس\nAttendance", w: 18 },
  { key: "diplomaTitle", label: "اسم الدبلومة\nDiploma", w: 36 },
  { key: "bookingChannel", label: "حجز الكورس عن طريق\nBooking via", w: 30 },
  { key: "contactStatusLabel", label: "حالة المتابعة\nFollow-up", w: 28 },
  { key: "notes", label: "ملاحظات\nNotes", w: 42 },
  { key: "payPlan", label: "خطة الدفع\nPlan", w: 22 },
  { key: "courseCost", label: "تكلفة الكورس\nCourse cost", w: 16 },
  { key: "deposit", label: "ديبوزت الحجز\nDeposit", w: 14 },
  { key: "installment1", label: "القسط الأول\nInst. 1", w: 14 },
  { key: "installment2", label: "القسط الثاني\nInst. 2", w: 14 },
  { key: "installment3", label: "القسط الثالث\nInst. 3", w: 14 },
  { key: "totalPaid", label: "المدفوع (مجموع ديبوزت + أقساط)\nPaid (sum)", w: 18 },
  { key: "remaining", label: "المتبقي\nBalance", w: 14 },
  { key: "email", label: "البريد\nEmail", w: 36 },
  { key: "paymentConfirmed", label: "دفع مؤكد\nPay OK", w: 12 },
];

/** Build styled .xlsx for course students — dynamic import keeps bundle lighter until export. */
async function writeCourseStudentsExcelBuffer(course, rows) {
  const ExcelJS = (await import("exceljs")).default;
  const wb = new ExcelJS.Workbook();
  wb.creator = "Eduzah";
  wb.created = new Date();

  const ncol = EXPORT_COLS.length;

  const ws = wb.addWorksheet("Students", {
    views: [
      {
        rightToLeft: true,
        state: "frozen",
        xSplit: 0,
        ySplit: HEADER_ROW_IDX,
        topLeftCell: `A${DATA_START_IDX}`,
        activeCell: "A1",
      },
    ],
  });

  EXPORT_COLS.forEach((col, i) => {
    ws.getColumn(i + 1).width = col.w;
  });

  ws.mergeCells(1, 1, 1, ncol);
  const title = ws.getCell(1, 1);
  title.value = `Eduzah — ${course.title_en || course.title} | Student Export`;
  title.font = { bold: true, size: 15, color: { argb: "FFFFFFFF" } };
  title.fill = { type: "pattern", pattern: "solid", fgColor: { argb: TITLE_FILL } };
  title.alignment = { vertical: "middle", horizontal: "center", wrapText: true };
  title.border = EX_BORDER;
  ws.getRow(1).height = 38;
  ws.getRow(2).height = 8;

  EXPORT_COLS.forEach((col, c) => {
    const cell = ws.getCell(HEADER_ROW_IDX, c + 1);
    cell.value = col.label;
    cell.font = { bold: true, size: 11, color: { argb: "FFFFFFFF" } };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: HEAD_FILL } };
    cell.alignment = { vertical: "middle", horizontal: "center", wrapText: true };
    cell.border = EX_BORDER;
  });
  ws.getRow(HEADER_ROW_IDX).height = 46;

  rows.forEach((row, ri) => {
    const r = DATA_START_IDX + ri;
    const fg = ri % 2 === 0 ? STRIPE_A : STRIPE_B;
    EXPORT_COLS.forEach((col, c) => {
      const cell = ws.getCell(r, c + 1);
      const raw = row[col.key];
      if (col.key === "paymentConfirmed") {
        cell.value = raw ? "نعم" : "لا";
      } else if (MONEY_KEYS.has(col.key)) {
        if (raw === "" || raw == null) {
          cell.value = null;
        } else {
          const n = Number(raw);
          if (Number.isFinite(n)) {
            cell.value = n;
            cell.numFmt = "#,##0";
          } else {
            cell.value = String(raw);
          }
        }
      } else {
        cell.value = raw ?? "";
      }
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: fg } };
      cell.border = EX_BORDER;
      if (MONEY_KEYS.has(col.key)) {
        cell.font = { bold: true, size: 10, color: { argb: "FF1D6F42" } };
        cell.alignment = { vertical: "middle", horizontal: "center", wrapText: true };
      } else {
        cell.font = { size: 10 };
        cell.alignment = { vertical: "middle", horizontal: "right", wrapText: true };
      }
    });
  });

  const totalRevenue = rows.reduce((s, r) => s + ledgerAmountForStats(r), 0);
  const ws2 = wb.addWorksheet("Summary", { views: [{ rightToLeft: true }] });
  ws2.getColumn(1).width = 44;
  ws2.getColumn(2).width = 52;

  ws2.mergeCells(1, 1, 1, 2);
  const st = ws2.getCell(1, 1);
  st.value = `Eduzah — ${course.title_en || course.title} | Summary`;
  st.font = { bold: true, size: 14, color: { argb: "FFFFFFFF" } };
  st.fill = { type: "pattern", pattern: "solid", fgColor: { argb: TITLE_FILL } };
  st.alignment = { vertical: "middle", horizontal: "center", wrapText: true };
  st.border = EX_BORDER;
  ws2.getRow(1).height = 36;
  ws2.getRow(2).height = 8;

  const summaryRows = [
    ["الكورس / Course", course.title],
    ["Course EN", course.title_en || course.title],
    ["السعر / Price", `${(course.price || 0).toLocaleString()} EGP`],
    ["تاريخ التصدير / Export Date", fmtDate(new Date().toISOString())],
    null,
    ["إجمالي الطلاب / Total Students", rows.length],
    [
      "دفع كامل / Full Payment",
      rows.filter((r) => String(r.payPlan || "").includes("كامل") || String(r.payPlan || "").includes("Full"))
        .length,
    ],
    [
      "أقساط / Installments",
      rows.filter((r) => String(r.payPlan || "").includes("قساط") || String(r.payPlan || "").includes("Install"))
        .length,
    ],
    ["أونلاين / Online", rows.filter((r) => String(r.training || "").includes("Online")).length],
    [
      "حضوري / Offline",
      rows.filter(
        (r) =>
          String(r.training || "").includes("Offline") || String(r.training || "").includes("Branch"),
      ).length,
    ],
    null,
    ["إجمالي الإيرادات / Total Revenue", `${totalRevenue.toLocaleString()} EGP`],
  ];

  let rr = 3;
  for (const line of summaryRows) {
    if (line == null) {
      rr += 1;
      continue;
    }
    const [k, v] = line;
    const c1 = ws2.getCell(rr, 1);
    const c2 = ws2.getCell(rr, 2);
    c1.value = k;
    c2.value = v;
    c1.font = { bold: true, size: 10, color: { argb: "FF3D1F5C" } };
    c1.alignment = { vertical: "middle", horizontal: "right", wrapText: true };
    c2.font = { size: 10 };
    c2.alignment = { vertical: "middle", horizontal: "right", wrapText: true };
    c1.border = EX_BORDER;
    c2.border = EX_BORDER;
    rr += 1;
  }

  return wb.xlsx.writeBuffer();
}

export async function exportCourseStudents(course, allUsers = []) {
  let rows;
  try {
    rows = await fetchCourseStudents(course, allUsers);
  } catch (e) {
    console.error("exportCourseStudents fetchCourseStudents:", e);
    const code = e?.code || "";
    const denied = code === "permission-denied";
    const msg = denied
      ? "لا صلاحية لقراءة طلبات التسجيل. سجّل الدخولة كأدمن أو راجع قواعد Firestore."
      : `تعذر تحميل بيانات الطلاب (${e?.message || code || "خطأ شبكة"})`;
    return { ok: false, msg };
  }
  if (rows.length === 0) return { ok: false, msg: "لا يوجد طلاب مسجلون في هذا الكورس بعد (أو معرّف الكورس في الطلبات لا يطابق id/slug هذا الكورس)" };

  const safeName = (course.title_en || course.title || "course")
    .replace(/[^a-zA-Z0-9\u0600-\u06FF]/g, "_")
    .replace(/_+/g, "_")
    .slice(0, 40);
  const fileName = `Eduzah_${safeName}_Students.xlsx`;

  let wbout;
  try {
    wbout = await writeCourseStudentsExcelBuffer(course, rows);
  } catch (e) {
    console.error("ExcelJS export failed:", e);
    return { ok: false, msg: `فشل إنشاء ملف Excel: ${e?.message || e}` };
  }
  const blob = new Blob([wbout], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);

  return { ok: true, count: rows.length, fileName, rows };
}
