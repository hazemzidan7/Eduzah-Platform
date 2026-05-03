/**
 * Eduzah — Excel Export Utility  (SheetJS / xlsx)
 * Also exports `fetchCourseStudents` for in-platform table view.
 */
import * as XLSX from "xlsx";
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

// ─── Excel export ─────────────────────────────────────────────────────────────
const PURPLE = "3D1F5C"; const LIGHT = "F5F0FA"; const WHITE = "FFFFFF";
const BORDER_C = "C8B8E8";
const border = () => ({ top:{style:"thin",color:{rgb:BORDER_C}}, bottom:{style:"thin",color:{rgb:BORDER_C}}, left:{style:"thin",color:{rgb:BORDER_C}}, right:{style:"thin",color:{rgb:BORDER_C}} });
const hStyle = () => ({ font:{bold:true,sz:11,color:{rgb:WHITE}}, fill:{fgColor:{rgb:PURPLE}}, alignment:{horizontal:"center",vertical:"center",wrapText:true}, border:border() });
const dStyle = (ri) => ({ font:{sz:10}, fill:{fgColor:{rgb:ri%2===0?WHITE:LIGHT}}, alignment:{horizontal:"right",vertical:"center"}, border:border() });
const aStyle = (ri) => ({ font:{sz:10,bold:true,color:{rgb:"1D6F42"}}, fill:{fgColor:{rgb:ri%2===0?WHITE:LIGHT}}, alignment:{horizontal:"center",vertical:"center"}, border:border() });
const sStyle = (v,ri) => ({ font:{sz:10,bold:true,color:{rgb:v==="approved"?"1D6F42":v==="pending"?"9B5D00":"C00000"}}, fill:{fgColor:{rgb:ri%2===0?WHITE:LIGHT}}, alignment:{horizontal:"center",vertical:"center"}, border:border() });

/** Strip per-cell `s` styles before XLSX.write — avoids corrupt / blank files with community `xlsx`. */
function stripWorkbookCellStyles(wb) {
  if (!wb?.SheetNames) return;
  for (const name of wb.SheetNames) {
    const ws = wb.Sheets[name];
    if (!ws || typeof ws !== "object") continue;
    for (const addr of Object.keys(ws)) {
      if (addr.startsWith("!")) continue;
      const cell = ws[addr];
      if (cell && typeof cell === "object" && Object.prototype.hasOwnProperty.call(cell, "s")) delete cell.s;
    }
  }
}

const EXPORT_COLS = [
  { key: "sheetDate", label: "التاريخ\nDate", w: 14 },
  { key: "fullName", label: "اسم الطالب رباعي\nFull name", w: 28 },
  { key: "phone", label: "رقم التليفون\nPhone", w: 16 },
  { key: "attendanceAr", label: "حضور الكورس\nAttendance", w: 16 },
  { key: "diplomaTitle", label: "اسم الدبلومة\nDiploma", w: 26 },
  { key: "bookingChannel", label: "حجز الكورس عن طريق\nBooking via", w: 20 },
  { key: "contactStatusLabel", label: "حالة المتابعة\nFollow-up", w: 22 },
  { key: "notes", label: "ملاحظات\nNotes", w: 32 },
  { key: "payPlan", label: "خطة الدفع\nPlan", w: 18 },
  { key: "courseCost", label: "تكلفة الكورس\nCourse cost", w: 14 },
  { key: "deposit", label: "ديبوزت الحجز\nDeposit", w: 12 },
  { key: "installment1", label: "القسط الأول\nInst. 1", w: 12 },
  { key: "installment2", label: "القسط الثاني\nInst. 2", w: 12 },
  { key: "installment3", label: "القسط الثالث\nInst. 3", w: 12 },
  { key: "totalPaid", label: "المدفوع (مجموع ديبوزت + أقساط)\nPaid (sum)", w: 14 },
  { key: "remaining", label: "المتبقي\nBalance", w: 12 },
  { key: "email", label: "البريد\nEmail", w: 30 },
  { key: "paymentConfirmed", label: "دفع مؤكد\nPay OK", w: 10 },
];

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

  const wb = XLSX.utils.book_new();
  const TITLE_ROW=0, HEADER_ROW=2, DATA_START=3;

  const aoa = [
    [`Eduzah — ${course.title_en||course.title} | Student Export`],
    [],
    EXPORT_COLS.map((c) => c.label),
    ...rows.map((r) =>
      EXPORT_COLS.map((col) => {
        const v = r[col.key];
        if (col.key === "paymentConfirmed") return v ? "نعم" : "لا";
        if (["courseCost", "deposit", "installment1", "installment2", "installment3", "totalPaid", "remaining"].includes(col.key)) {
          if (v === "" || v == null) return "";
          const n = Number(v);
          return Number.isFinite(n) ? n : "";
        }
        return v ?? "";
      }),
    ),
  ];

  const ws = XLSX.utils.aoa_to_sheet(aoa);
  ws["!cols"]   = EXPORT_COLS.map((c) => ({ wch: c.w }));
  ws["!rows"]   = [{ hpx: 36 }, { hpx: 6 }, { hpx: 44 }, ...rows.map(() => ({ hpx: 24 }))];
  ws["!merges"] = [{ s: { r: TITLE_ROW, c: 0 }, e: { r: TITLE_ROW, c: EXPORT_COLS.length - 1 } }];

  // Title
  const ta = XLSX.utils.encode_cell({r:TITLE_ROW,c:0});
  ws[ta] = { v:aoa[0][0], t:"s", s:{font:{bold:true,sz:14,color:{rgb:WHITE}},fill:{fgColor:{rgb:"1a0a2e"}},alignment:{horizontal:"center",vertical:"center"}} };

  // Headers
  EXPORT_COLS.forEach((col, c) => {
    const a = XLSX.utils.encode_cell({ r: HEADER_ROW, c });
    ws[a] = { v: col.label, t: "s", s: hStyle() };
  });

  // Data
  rows.forEach((row, ri) => {
    const r = DATA_START + ri;
    EXPORT_COLS.forEach((col, c) => {
      const addr = XLSX.utils.encode_cell({ r, c });
      if (!ws[addr]) ws[addr] = { v: "", t: "s" };
      if (["courseCost", "deposit", "installment1", "installment2", "installment3", "totalPaid", "remaining"].includes(col.key)) {
        const v = row[col.key];
        const n = v === "" || v == null ? "" : Number(v);
        ws[addr] = {
          v: n === "" ? "" : n,
          t: n === "" ? "s" : "n",
          s: aStyle(ri),
        };
      } else {
        ws[addr].s = dStyle(ri);
      }
    });
  });

  ws["!ref"] = XLSX.utils.encode_range({ s: { r: 0, c: 0 }, e: { r: DATA_START + rows.length - 1, c: EXPORT_COLS.length - 1 } });
  XLSX.utils.book_append_sheet(wb, ws, "Students");

  // Summary sheet
  const totalRevenue = rows.reduce((s, r) => s + ledgerAmountForStats(r), 0);
  const sumAoa=[
    [`Eduzah — ${course.title_en||course.title} | Summary`],[],
    ["الكورس / Course", course.title],
    ["Course EN", course.title_en||course.title],
    ["السعر / Price", `${(course.price||0).toLocaleString()} EGP`],
    ["تاريخ التصدير / Export Date", fmtDate(new Date().toISOString())],[],
    ["إجمالي الطلاب / Total Students", rows.length],
    [
      "دفع كامل / Full Payment",
      rows.filter((r) =>
        String(r.payPlan || "").includes("كامل") || String(r.payPlan || "").includes("Full")
      ).length,
    ],
    [
      "أقساط / Installments",
      rows.filter((r) =>
        String(r.payPlan || "").includes("قساط") || String(r.payPlan || "").includes("Install")
      ).length,
    ],
    ["أونلاين / Online", rows.filter((r) => String(r.training || "").includes("Online")).length],
    [
      "حضوري / Offline",
      rows.filter(
        (r) =>
          String(r.training || "").includes("Offline") || String(r.training || "").includes("Branch")
      ).length,
    ],[],
    ["إجمالي الإيرادات / Total Revenue", `${totalRevenue.toLocaleString()} EGP`],
  ];
  const ws2=XLSX.utils.aoa_to_sheet(sumAoa);
  ws2["!cols"]=[{wch:32},{wch:36}];
  XLSX.utils.book_append_sheet(wb, ws2, "Summary");

  const safeName=(course.title_en||course.title||"course").replace(/[^a-zA-Z0-9\u0600-\u06FF]/g,"_").replace(/_+/g,"_").slice(0,40);
  const fileName=`Eduzah_${safeName}_Students.xlsx`;

  stripWorkbookCellStyles(wb);
  let wbout;
  try {
    wbout = XLSX.write(wb, { bookType: "xlsx", type: "array" });
  } catch (e) {
    console.error("XLSX.write failed:", e);
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
