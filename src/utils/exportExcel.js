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

export const fmtTraining = (v) => ({ online:"Live Online", offline:"Offline (Branch)" }[v] || v || "—");
export const fmtPlan     = (v) => ({ full:"دفع كامل (−5%)", installments:"أقساط (3×)" }[v] || v || "—");
export const fmtLevel    = (v) => ({ beginner:"مبتدئ", basic:"أساسيات", intermediate:"متوسط", advanced:"متقدم" }[v] || v || "—");

// ─── Shared data fetcher ────────────────────────────────────────────────────
export async function fetchCourseStudents(course, allUsers = []) {
  let requests = [];
  try {
    const snap = await getDocs(
      query(collection(db, "enrollmentRequests"), where("courseId", "==", course.id))
    );
    requests = snap.docs.map(d => ({ id: d.id, ...d.data() }));
  } catch (err) {
    console.warn("enrollmentRequests:", err.message);
  }

  // Deduplicate by email — keep latest
  const reqByEmail = new Map();
  for (const r of requests) {
    const key = (r.studentEmail || "").toLowerCase().trim();
    if (!key) continue;
    const ex = reqByEmail.get(key);
    if (!ex || (r.createdAt || "") > (ex.createdAt || "")) reqByEmail.set(key, r);
  }

  const seen = new Set();
  const rows = [];

  for (const [key, r] of reqByEmail) {
    seen.add(key);
    const profile    = allUsers.find(u => u.email?.toLowerCase() === key);
    const enrollment = profile?.enrolledCourses?.find(e => e.courseId === course.id);
    const reqSt = r.enrollmentStatus ?? "pending";
    const status = reqSt === "pending" && enrollment ? "approved" : reqSt;
    rows.push({
      docId:            r.id || null,           // Firestore doc ID for payment confirmation
      name:             r.studentName || profile?.name || "",
      email:            r.studentEmail || "",
      phone:            r.studentPhone || profile?.phone || "",
      training:         fmtTraining(r.trainingType),
      payMethod:        (r.paymentMethod || "InstaPay").toUpperCase(),
      payPlan:          fmtPlan(r.paymentPlan),
      amount:           r.amountQuoted ?? null,
      level:            fmtLevel(r.level),
      source:           r.source || "—",
      status,
      progress:         enrollment ? `${enrollment.progress || 0}%` : "—",
      enrollDate:       enrollment?.enrollDate || fmtDate(r.createdAt),
      requestedAt:      fmtDate(r.createdAt),
      paymentConfirmed: r.paymentConfirmed === true,
      confirmedAt:      r.confirmedAt || null,
    });
  }

  // Enrolled users not in enrollmentRequests
  for (const u of allUsers) {
    const enrollment = (u.enrolledCourses || []).find(e => e.courseId === course.id);
    if (!enrollment) continue;
    const key = (u.email || "").toLowerCase().trim();
    if (seen.has(key)) continue;
    seen.add(key);
    rows.push({
      docId:            null,
      name:             u.name || "",
      email:            u.email || "",
      phone:            u.phone || "",
      training:         "—", payMethod: "—", payPlan: "—",
      amount:           null, level: "—", source: "—",
      status:           "approved",
      progress:         `${enrollment.progress || 0}%`,
      enrollDate:       enrollment.enrollDate || "",
      requestedAt:      u.createdAt ? fmtDate(u.createdAt) : "",
      paymentConfirmed: false,
      confirmedAt:      null,
    });
  }

  return rows;
}

// ─── Excel export ─────────────────────────────────────────────────────────────
const PURPLE = "3D1F5C"; const LIGHT = "F5F0FA"; const WHITE = "FFFFFF";
const BORDER_C = "C8B8E8";
const border = () => ({ top:{style:"thin",color:{rgb:BORDER_C}}, bottom:{style:"thin",color:{rgb:BORDER_C}}, left:{style:"thin",color:{rgb:BORDER_C}}, right:{style:"thin",color:{rgb:BORDER_C}} });
const hStyle = () => ({ font:{bold:true,sz:11,color:{rgb:WHITE}}, fill:{fgColor:{rgb:PURPLE}}, alignment:{horizontal:"center",vertical:"center",wrapText:true}, border:border() });
const dStyle = (ri) => ({ font:{sz:10}, fill:{fgColor:{rgb:ri%2===0?WHITE:LIGHT}}, alignment:{horizontal:"right",vertical:"center"}, border:border() });
const aStyle = (ri) => ({ font:{sz:10,bold:true,color:{rgb:"1D6F42"}}, fill:{fgColor:{rgb:ri%2===0?WHITE:LIGHT}}, alignment:{horizontal:"center",vertical:"center"}, border:border() });
const sStyle = (v,ri) => ({ font:{sz:10,bold:true,color:{rgb:v==="approved"?"1D6F42":v==="pending"?"9B5D00":"C00000"}}, fill:{fgColor:{rgb:ri%2===0?WHITE:LIGHT}}, alignment:{horizontal:"center",vertical:"center"}, border:border() });

const COLS = [
  { key:"name",        label:"الاسم الكامل\nFull Name",      w:26 },
  { key:"email",       label:"البريد الإلكتروني\nEmail",     w:30 },
  { key:"phone",       label:"الهاتف\nPhone",                w:18 },
  { key:"training",    label:"نوع التدريب\nTraining",        w:22 },
  { key:"payMethod",   label:"طريقة الدفع\nPayment",         w:16 },
  { key:"payPlan",     label:"خطة الدفع\nPlan",              w:22 },
  { key:"amount",      label:"المبلغ\nAmount (EGP)",         w:16 },
  { key:"level",       label:"المستوى\nLevel",               w:16 },
  { key:"source",      label:"المصدر\nSource",               w:20 },
  { key:"status",      label:"الحالة\nStatus",               w:18 },
  { key:"progress",    label:"التقدم\nProgress",             w:12 },
  { key:"enrollDate",  label:"تاريخ التسجيل\nEnroll Date",  w:20 },
  { key:"requestedAt", label:"تاريخ الطلب\nRequest Date",   w:20 },
];

export async function exportCourseStudents(course, allUsers = []) {
  const rows = await fetchCourseStudents(course, allUsers);
  if (rows.length === 0) return { ok:false, msg:"لا يوجد طلاب مسجلون في هذا الكورس بعد" };

  const wb = XLSX.utils.book_new();
  const TITLE_ROW=0, HEADER_ROW=2, DATA_START=3;

  const aoa = [
    [`Eduzah — ${course.title_en||course.title} | Student Export`],
    [],
    COLS.map(c=>c.label),
    ...rows.map(r => COLS.map(col => {
      if (col.key==="amount") return r.amount??""
      if (col.key==="status") return r.status==="approved"?"Approved":r.status==="pending"?"Pending":r.status==="rejected"?"Rejected":"—"
      return r[col.key]??""
    })),
  ];

  const ws = XLSX.utils.aoa_to_sheet(aoa);
  ws["!cols"]   = COLS.map(c=>({wch:c.w}));
  ws["!rows"]   = [{hpx:36},{hpx:6},{hpx:44},...rows.map(()=>({hpx:24}))];
  ws["!merges"] = [{s:{r:TITLE_ROW,c:0},e:{r:TITLE_ROW,c:COLS.length-1}}];

  // Title
  const ta = XLSX.utils.encode_cell({r:TITLE_ROW,c:0});
  ws[ta] = { v:aoa[0][0], t:"s", s:{font:{bold:true,sz:14,color:{rgb:WHITE}},fill:{fgColor:{rgb:"1a0a2e"}},alignment:{horizontal:"center",vertical:"center"}} };

  // Headers
  COLS.forEach((col,c) => { const a=XLSX.utils.encode_cell({r:HEADER_ROW,c}); ws[a]={v:col.label,t:"s",s:hStyle()}; });

  // Data
  rows.forEach((row,ri) => {
    const r=DATA_START+ri;
    COLS.forEach((col,c) => {
      const addr=XLSX.utils.encode_cell({r,c});
      if (!ws[addr]) ws[addr]={v:"",t:"s"};
      if (col.key==="amount") {
        ws[addr]={ v:row.amount!=null?Number(row.amount):"", t:row.amount!=null?"n":"s", s:aStyle(ri) };
      } else if (col.key==="status") {
        ws[addr].s=sStyle(row.status,ri);
      } else {
        ws[addr].s=dStyle(ri);
      }
    });
  });

  ws["!ref"]=XLSX.utils.encode_range({s:{r:0,c:0},e:{r:DATA_START+rows.length-1,c:COLS.length-1}});
  XLSX.utils.book_append_sheet(wb,"Students",ws);

  // Summary sheet
  const totalRevenue = rows.reduce((s,r)=>s+(Number(r.amount)||0),0);
  const sumAoa=[
    [`Eduzah — ${course.title_en||course.title} | Summary`],[],
    ["الكورس / Course", course.title],
    ["Course EN", course.title_en||course.title],
    ["السعر / Price", `${(course.price||0).toLocaleString()} EGP`],
    ["تاريخ التصدير / Export Date", fmtDate(new Date().toISOString())],[],
    ["إجمالي الطلاب / Total Students", rows.length],
    ["دفع كامل / Full Payment", rows.filter(r=>r.payPlan.includes("كامل")||r.payPlan.includes("Full")).length],
    ["أقساط / Installments", rows.filter(r=>r.payPlan.includes("قساط")||r.payPlan.includes("Install")).length],
    ["أونلاين / Online", rows.filter(r=>r.training.includes("Online")).length],
    ["حضوري / Offline", rows.filter(r=>r.training.includes("Offline")||r.training.includes("Branch")).length],[],
    ["إجمالي الإيرادات / Total Revenue", `${totalRevenue.toLocaleString()} EGP`],
  ];
  const ws2=XLSX.utils.aoa_to_sheet(sumAoa);
  ws2["!cols"]=[{wch:32},{wch:36}];
  XLSX.utils.book_append_sheet(wb,"Summary",ws2);

  const safeName=(course.title_en||course.title||"course").replace(/[^a-zA-Z0-9\u0600-\u06FF]/g,"_").replace(/_+/g,"_").slice(0,40);
  const fileName=`Eduzah_${safeName}_Students.xlsx`;

  // Use blob URL download — works reliably in all browsers without xlsx Pro
  const wbout = XLSX.write(wb, { bookType: "xlsx", type: "array" });
  const blob  = new Blob([wbout], { type: "application/octet-stream" });
  const url   = URL.createObjectURL(blob);
  const a     = document.createElement("a");
  a.href = url; a.download = fileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);

  return { ok:true, count:rows.length, fileName, rows };
}
