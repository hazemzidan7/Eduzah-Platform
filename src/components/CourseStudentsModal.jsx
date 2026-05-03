/**
 * CourseStudentsModal — in-platform student list viewer
 * Features: search, filter, sort, payment confirmation, Excel export
 */
import { useState, useEffect, useMemo, useCallback } from "react";
import { doc, updateDoc } from "firebase/firestore";
import { db } from "../firebase";
import { C, font } from "../theme";
import { fetchCourseStudents, fmtDate, exportCourseStudents } from "../utils/exportExcel";

// ─── Mini UI helpers ──────────────────────────────────────────────────────────
const STATUS_CFG = {
  approved:    { label:"مقبول",        bg:"rgba(52,211,153,.15)",  color:"#34d399", dot:"#34d399"  },
  pending:     { label:"قيد المراجعة", bg:"rgba(251,191,36,.15)",  color:"#fbbf24", dot:"#fbbf24"  },
  rejected:    { label:"مرفوض",        bg:"rgba(248,113,113,.15)", color:"#f87171", dot:"#f87171"  },
  "no-account":{ label:"بدون حساب",   bg:"rgba(255,255,255,.07)", color:C.muted,   dot:"rgba(255,255,255,.3)" },
};

function StatusBadge({ status }) {
  const cfg = STATUS_CFG[status] || STATUS_CFG["no-account"];
  return (
    <span style={{ display:"inline-flex", alignItems:"center", gap:5,
      background:cfg.bg, color:cfg.color, borderRadius:50,
      padding:"3px 10px", fontSize:11, fontWeight:700, whiteSpace:"nowrap" }}>
      <span style={{ width:6, height:6, borderRadius:"50%", background:cfg.dot, flexShrink:0 }}/>
      {cfg.label}
    </span>
  );
}

function Pill({ children, color }) {
  return (
    <span style={{ display:"inline-block", background:`${color}20`, color,
      border:`1px solid ${color}44`, borderRadius:6,
      padding:"2px 9px", fontSize:11, fontWeight:600, whiteSpace:"nowrap" }}>
      {children}
    </span>
  );
}

const CONTACT_CFG = {
  no_response:         { label: "مردش",                   color: "#94a3b8" },
  wont_book:          { label: "مش هيحجز",               color: "#f87171" },
  thinking:           { label: "هيفكر ويحجز",             color: "#fbbf24" },
  confirmed_will_pay: { label: "أكد وهيدفع",              color: "#a78bfa" },
  booked_paid:        { label: "حجز حالياً ودفع",         color: "#34d399" },
  future_round:       { label: "هيحجز في راوند قادمة",    color: "#60a5fa" },
  booked_previous:    { label: "حاجز في راوند سابقة",     color: "#fb7185" },
  attending_current:  { label: "بيحضر في الراوند الحالية", color: "#22c55e" },
};

function ContactPill({ value }) {
  const cfg = CONTACT_CFG[value] || CONTACT_CFG.no_response;
  return <Pill color={cfg.color}>{cfg.label}</Pill>;
}

function MoneyCell({ v }) {
  if (v === "" || v == null) return <span style={{ color: "rgba(255,255,255,.28)" }}>—</span>;
  const n = Number(v);
  if (!Number.isFinite(n)) return <span style={{ color: C.muted }}>—</span>;
  return (
    <span style={{ fontWeight: 800, fontSize: 12, whiteSpace: "nowrap" }}>
      {n.toLocaleString()}
      <span style={{ fontSize: 9, color: C.muted, fontWeight: 500, marginRight: 3 }}>ج</span>
    </span>
  );
}

function Stat({ label, value, sub, color="#fff", accent=false }) {
  return (
    <div style={{ background: accent ? "rgba(52,211,153,.08)" : "rgba(255,255,255,.04)",
      border:`1px solid ${accent ? "rgba(52,211,153,.25)" : C.border}`,
      borderRadius:12, padding:"12px 16px", flex:"1 1 110px", minWidth:100 }}>
      <div style={{ fontSize:20, fontWeight:900, color, fontFamily:font }}>{value}</div>
      <div style={{ fontSize:11, color:C.muted, marginTop:2 }}>{label}</div>
      {sub && <div style={{ fontSize:10, color:"rgba(255,255,255,.3)", marginTop:1 }}>{sub}</div>}
    </div>
  );
}

// ─── Editable amount cell ─────────────────────────────────────────────────────
function AmountCell({ row, onSave, saving }) {
  const [editing, setEditing] = useState(false);
  const [val,     setVal]     = useState(row.amount != null ? String(row.amount) : "");

  const commit = () => {
    const num = val.trim() === "" ? null : Number(val);
    if (isNaN(num) && val.trim() !== "") { setEditing(false); return; } // invalid
    setEditing(false);
    if (num !== row.amount) onSave(row, num);
  };

  if (editing) {
    return (
      <div style={{ display:"flex", alignItems:"center", gap:5 }}>
        <input
          autoFocus
          type="number"
          value={val}
          onChange={e => setVal(e.target.value)}
          onBlur={commit}
          onKeyDown={e => { if (e.key==="Enter") commit(); if (e.key==="Escape") setEditing(false); }}
          style={{
            width:90, padding:"4px 8px", borderRadius:7,
            background:"rgba(255,255,255,.1)", border:`1.5px solid ${C.purple}`,
            color:"#fff", fontFamily:font, fontSize:13, fontWeight:700,
            outline:"none", textAlign:"right",
          }}
        />
        <span style={{ fontSize:10, color:C.muted }}>EGP</span>
      </div>
    );
  }

  return (
    <div
      onClick={() => { if (!saving) setEditing(true); }}
      title="اضغط لتعديل المبلغ"
      style={{
        display:"inline-flex", alignItems:"center", gap:6,
        cursor: saving ? "wait" : "pointer",
        padding:"4px 8px", borderRadius:7,
        border:`1.5px dashed ${row.amount != null ? "rgba(52,211,153,.3)" : "rgba(255,255,255,.18)"}`,
        background: row.amount != null ? "rgba(52,211,153,.06)" : "rgba(255,255,255,.04)",
        transition:"all .15s", minWidth:70,
      }}
      onMouseEnter={e => { e.currentTarget.style.borderColor = C.purple; e.currentTarget.style.background = "rgba(125,61,158,.12)"; }}
      onMouseLeave={e => {
        e.currentTarget.style.borderColor = row.amount != null ? "rgba(52,211,153,.3)" : "rgba(255,255,255,.18)";
        e.currentTarget.style.background  = row.amount != null ? "rgba(52,211,153,.06)" : "rgba(255,255,255,.04)";
      }}>
      {saving
        ? <span style={{ width:12, height:12, border:"2px solid #34d399", borderTopColor:"transparent",
            borderRadius:"50%", animation:"spin .6s linear infinite", display:"inline-block" }}/>
        : row.amount != null
          ? <span style={{ fontWeight:800, fontSize:13, color:"#34d399" }}>
              {Number(row.amount).toLocaleString()}
              <small style={{ fontSize:10, color:C.muted, fontWeight:400, marginRight:3 }}>EGP</small>
            </span>
          : <span style={{ fontSize:11, color:"rgba(255,255,255,.35)" }}>+ أضف مبلغ</span>
      }
      {!saving && <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke={C.muted} strokeWidth="2.5">
        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
      </svg>}
    </div>
  );
}

// ─── Payment confirm button ───────────────────────────────────────────────────
function PayConfirmBtn({ row, onToggle, loading }) {
  const confirmed = row.paymentConfirmed;
  return (
    <button
      onClick={() => onToggle(row)}
      disabled={loading || !row.docId}
      title={row.docId ? (confirmed ? "إلغاء التأكيد" : "تأكيد استلام الدفع") : "لا يوجد معرف طلب"}
      style={{
        display:"inline-flex", alignItems:"center", gap:5,
        padding:"5px 11px", borderRadius:8, cursor: (loading || !row.docId) ? "not-allowed" : "pointer",
        fontFamily:font, fontWeight:700, fontSize:11,
        transition:"all .2s", border:"none",
        background: confirmed ? "rgba(52,211,153,.18)" : "rgba(255,255,255,.07)",
        color: confirmed ? "#34d399" : C.muted,
        outline: `1.5px solid ${confirmed ? "rgba(52,211,153,.45)" : C.border}`,
        opacity: (loading || !row.docId) ? 0.5 : 1,
      }}>
      {loading
        ? <span style={{ width:12, height:12, border:"2px solid currentColor",
            borderTopColor:"transparent", borderRadius:"50%",
            animation:"spin .6s linear infinite", display:"inline-block" }}/>
        : confirmed ? "✓" : "○"
      }
      {confirmed ? "مؤكد" : "تأكيد"}
    </button>
  );
}

// ─── Main modal ───────────────────────────────────────────────────────────────
export default function CourseStudentsModal({ course, allUsers, onClose }) {
  const [rows,       setRows]       = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [search,     setSearch]     = useState("");
  const [filterPlan, setFilterPlan] = useState("all");
  const [filterType, setFilterType] = useState("all");
  const [filterPay,  setFilterPay]  = useState("all"); // all | confirmed | pending
  const [sortCol,    setSortCol]    = useState("sheetDate");
  const [sortDir,    setSortDir]    = useState("desc");
  const [confirming,   setConfirming]   = useState(null); // docId being toggled
  const [savingAmount, setSavingAmount] = useState(null); // docId being saved
  const [savingContact, setSavingContact] = useState(null); // userId being updated
  const [contactPopup, setContactPopup] = useState(null); // { rowKey, row }
  const [exporting,    setExporting]    = useState(false);

  const loadRows = useCallback((opts = {}) => {
    const silent = opts.silent === true;
    if (!silent) setLoading(true);
    fetchCourseStudents(course, allUsers)
      // Show in 2 places:
      // - Requests tab: all enrollmentRequests
      // - Students tab (this modal): pending + approved (exclude rejected)
      .then((list) => setRows((list || []).filter((r) => (r.status || "pending") !== "rejected")))
      .catch(console.error)
      .finally(() => { if (!silent) setLoading(false); });
  }, [course, allUsers]);

  useEffect(() => { loadRows(); }, [loadRows]);

  // Close popup on ESC
  useEffect(() => {
    if (!contactPopup) return undefined;
    const onKey = (e) => { if (e.key === "Escape") setContactPopup(null); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [contactPopup]);

  // ── Toggle payment confirmation ───────────────────────────────────────────
  const handleTogglePay = async (row) => {
    if (!row.docId || confirming) return;
    setConfirming(row.docId);
    const newVal = !row.paymentConfirmed;
    try {
      await updateDoc(doc(db, "enrollmentRequests", row.docId), {
        paymentConfirmed: newVal,
        confirmedAt:      newVal ? new Date().toISOString() : null,
      });
      loadRows({ silent: true });
    } catch (err) {
      console.error("Payment confirm error:", err);
    } finally {
      setConfirming(null);
    }
  };

  // ── Save manual amount ────────────────────────────────────────────────────
  const handleSaveAmount = async (row, newAmount) => {
    if (!row.docId || savingAmount) return;
    setSavingAmount(row.docId);
    try {
      await updateDoc(doc(db, "enrollmentRequests", row.docId), {
        amountQuoted: newAmount,
      });
      loadRows({ silent: true });
    } catch (err) {
      console.error("Amount save error:", err);
    } finally {
      setSavingAmount(null);
    }
  };

  // ── Set contact status (per enrolled course) ─────────────────────────────
  const handleSetContact = async (row, nextStatusRaw) => {
    if (savingContact) return;
    const nextStatus = CONTACT_CFG[nextStatusRaw] ? nextStatusRaw : "no_response";

    const lockKey = row.userId || row.docId || "x";
    setSavingContact(lockKey);
    try {
      const nextAt = new Date().toISOString();
      const approved = (row.status || "pending") === "approved";

      // Always persist on enrollment request if we have it (works for guests + pending)
      if (row.docId) {
        await updateDoc(doc(db, "enrollmentRequests", row.docId), {
          contactStatus: nextStatus,
          contactUpdatedAt: nextAt,
        });
      }

      // If approved + has platform userId, also persist on user enrollment entry
      if (approved && row.userId) {
        const u = allUsers.find((x) => x.id === row.userId);
        const enrolled = Array.isArray(u?.enrolledCourses) ? u.enrolledCourses : [];
        const updatedEnrollments = enrolled.map((e) => {
          if (String(e.courseId) !== String(course.id)) return e;
          return { ...e, contactStatus: nextStatus, contactUpdatedAt: nextAt };
        });
        await updateDoc(doc(db, "users", row.userId), { enrolledCourses: updatedEnrollments });
      }

      // Update UI
      setRows((prev) => prev.map((r) => (
        (row.docId && r.docId === row.docId) || (row.userId && r.userId === row.userId)
          ? { ...r, contactStatus: nextStatus, contactUpdatedAt: nextAt }
          : r
      )));
    } catch (err) {
      console.error("Contact status update error:", err);
    } finally {
      setSavingContact(null);
    }
  };

  // ── Stats ─────────────────────────────────────────────────────────────────
  const confirmedRows    = rows.filter(r => r.paymentConfirmed);
  const pendingPayRows   = rows.filter(r => !r.paymentConfirmed && r.amount != null);
  const confirmedRevenue = confirmedRows.reduce((s,r) => s + (Number(r.amount)||0), 0);
  const pendingRevenue   = pendingPayRows.reduce((s,r) => s + (Number(r.amount)||0), 0);
  const fullCount        = rows.filter((r) => (r.payPlan || "").includes("كامل")).length;
  const instCount        = rows.filter((r) => (r.payPlan || "").includes("قساط")).length;

  // ── Filter + Sort ─────────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    let out = [...rows];
    if (search.trim()) {
      const q = search.toLowerCase();
      out = out.filter((r) => {
        const name = `${r.fullName || r.name || ""} ${r.name || ""}`.toLowerCase();
        return (
          name.includes(q) ||
          (r.email || "").toLowerCase().includes(q) ||
          (r.phone || "").includes(q) ||
          (r.notes || "").toLowerCase().includes(q) ||
          (r.bookingChannel || "").toLowerCase().includes(q)
        );
      });
    }
    if (filterPlan !== "all") {
      out = out.filter((r) =>
        filterPlan === "full" ? (r.payPlan || "").includes("كامل") : (r.payPlan || "").includes("قساط"),
      );
    }
    if (filterType !== "all") {
      out = out.filter((r) => {
        const tr = r.training || "";
        return filterType === "online"
          ? tr.includes("Online")
          : tr.includes("Offline") || tr.includes("Branch");
      });
    }
    if (filterPay !== "all") out = out.filter(r =>
      filterPay === "confirmed" ? r.paymentConfirmed : !r.paymentConfirmed
    );
    out.sort((a, b) => {
      const av = String(a[sortCol]||""); const bv = String(b[sortCol]||"");
      return sortDir === "asc" ? av.localeCompare(bv) : bv.localeCompare(av);
    });
    return out;
  }, [rows, search, filterPlan, filterType, filterPay, sortCol, sortDir]);

  const toggleSort = (col) => {
    if (sortCol === col) setSortDir(d => d==="asc"?"desc":"asc");
    else { setSortCol(col); setSortDir("asc"); }
  };

  const handleExport = async () => {
    setExporting(true);
    try { await exportCourseStudents(course, allUsers); }
    catch(e) { console.error(e); }
    finally { setExporting(false); }
  };

  const renderContactColumn = (r) => {
    const approved = (r.status || "pending") === "approved";
    const disabled = !r.docId && !r.userId;
    const loadingSel = savingContact === (r.userId || r.docId);
    const st = r.contactStatus || "no_response";
    const cfg = CONTACT_CFG[st] || CONTACT_CFG.no_response;
    const rowKey = r.userId || r.docId || null;
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 8, flexWrap: "wrap" }}>
        <ContactPill value={st} />
        <button
          type="button"
          onClick={() => {
            if (disabled || loadingSel || !rowKey) return;
            setContactPopup({ rowKey, row: r });
          }}
          disabled={disabled || loadingSel || !rowKey}
          title={
            disabled
              ? "لا يوجد طلب أو حساب مرتبط بهذا الصف"
              : (!approved ? "حالة متابعة للطلب (Pending)" : "حالة متابعة للطالب (Approved)")
          }
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            padding: "7px 10px",
            borderRadius: 10,
            background: disabled ? "rgba(255,255,255,.04)" : `${cfg.color}14`,
            color: disabled ? "rgba(255,255,255,.35)" : "#fff",
            border: `1.5px solid ${disabled ? C.border : `${cfg.color}55`}`,
            outline: "none",
            fontFamily: font,
            fontWeight: 900,
            fontSize: 11,
            cursor: (disabled || loadingSel) ? "not-allowed" : "pointer",
            minWidth: 160,
            justifyContent: "space-between",
            whiteSpace: "nowrap",
          }}
        >
          <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
            <span style={{ width: 8, height: 8, borderRadius: 99, background: cfg.color, boxShadow: `0 0 0 3px ${cfg.color}22` }} />
            <span>{cfg.label}</span>
          </span>
          <span style={{ color: disabled ? "rgba(255,255,255,.25)" : "rgba(255,255,255,.7)", fontSize: 12 }}>▾</span>
        </button>
      </div>
    );
  };

  // ── أعمدة الجدول (نمط spreadsheet) + عمود إدارة ───────────────────────
  const COLS = [
    { key: "#", label: "#", w: 34, render: (_, i) => <span style={{ color: C.muted, fontSize: 11 }}>{i + 1}</span> },
    {
      key: "sheetDate",
      label: "التاريخ",
      w: 96,
      sortable: true,
      render: (r) => <span style={{ whiteSpace: "nowrap", fontSize: 11, color: C.muted }}>{r.sheetDate || "—"}</span>,
    },
    {
      key: "fullName",
      label: "اسم الطالب رباعي",
      w: 200,
      sortable: true,
      render: (r) => (
        <div>
          <div style={{ fontWeight: 800, fontSize: 13, marginBottom: 2 }}>{r.fullName || r.name || "—"}</div>
          <div style={{ color: C.muted, fontSize: 10 }}>{r.email || ""}</div>
        </div>
      ),
    },
    {
      key: "phone",
      label: "رقم التليفون",
      w: 118,
      render: (r) => <span style={{ fontFamily: "monospace", fontSize: 12 }}>{r.phone || "—"}</span>,
    },
    {
      key: "age",
      label: "العمر",
      w: 52,
      render: (r) => <span style={{ fontSize: 12 }}>{r.age !== "" && r.age != null ? r.age : "—"}</span>,
    },
    {
      key: "attendanceAr",
      label: "حضور الكورس",
      w: 110,
      render: (r) => <span style={{ fontSize: 11 }}>{r.attendanceAr || "—"}</span>,
    },
    {
      key: "diplomaTitle",
      label: "اسم الدبلومة",
      w: 160,
      render: (r) => (
        <span style={{ fontSize: 11, lineHeight: 1.45, color: "rgba(255,255,255,.9)" }}>{r.diplomaTitle || "—"}</span>
      ),
    },
    {
      key: "bookingChannel",
      label: "حجز عن طريق",
      w: 120,
      render: (r) => <span style={{ fontSize: 11 }}>{r.bookingChannel || "—"}</span>,
    },
    {
      key: "notes",
      label: "ملاحظات",
      w: 140,
      render: (r) => {
        const t = r.notes || "";
        if (!t) return <span style={{ color: "rgba(255,255,255,.25)" }}>—</span>;
        const short = t.length > 48 ? `${t.slice(0, 48)}…` : t;
        return (
          <span title={t} style={{ fontSize: 11, lineHeight: 1.5, color: "rgba(255,255,255,.88)" }}>
            {short}
          </span>
        );
      },
    },
    { key: "courseCost", label: "تكلفة الكورس", w: 100, render: (r) => <MoneyCell v={r.courseCost} /> },
    { key: "deposit", label: "ديبوزت الحجز", w: 96, render: (r) => <MoneyCell v={r.deposit} /> },
    { key: "installment1", label: "القسط ١", w: 88, render: (r) => <MoneyCell v={r.installment1} /> },
    { key: "installment2", label: "القسط ٢", w: 88, render: (r) => <MoneyCell v={r.installment2} /> },
    { key: "installment3", label: "القسط ٣", w: 88, render: (r) => <MoneyCell v={r.installment3} /> },
    { key: "installment4", label: "القسط ٤", w: 88, render: (r) => <MoneyCell v={r.installment4} /> },
    { key: "totalPaid", label: "المدفوع", w: 92, render: (r) => <MoneyCell v={r.totalPaid} /> },
    {
      key: "remaining",
      label: "المتبقي",
      w: 92,
      render: (r) => <MoneyCell v={r.remaining} />,
    },
    {
      key: "_admin",
      label: "متابعة · دفع",
      w: 260,
      render: (r) => {
        const pp = r.payPlan || "—";
        const full = pp.includes("كامل");
        return (
          <div style={{ display: "flex", flexDirection: "column", gap: 8, alignItems: "flex-end" }}>
            {renderContactColumn(r)}
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6, justifyContent: "flex-end", alignItems: "center" }}>
              <Pill color={full ? "#34d399" : C.orange}>{pp}</Pill>
              <StatusBadge status={r.status} />
            </div>
            <AmountCell row={r} onSave={handleSaveAmount} saving={savingAmount === r.docId} />
            <div style={{ display: "flex", flexDirection: "column", gap: 3, alignItems: "flex-end" }}>
              <PayConfirmBtn row={r} onToggle={handleTogglePay} loading={confirming === r.docId} />
              {r.paymentConfirmed && r.confirmedAt && (
                <span style={{ fontSize: 10, color: "rgba(52,211,153,.6)", marginTop: 1 }}>
                  {typeof r.confirmedAt === "string" && r.confirmedAt.includes("T") ? fmtDate(r.confirmedAt) : r.confirmedAt}
                </span>
              )}
            </div>
            <span style={{ fontSize: 10, color: C.muted }}>تقدّم المنصّة: {r.progress || "—"}</span>
          </div>
        );
      },
    },
  ];

  const SortIcon = ({ col }) => sortCol===col
    ? <span style={{fontSize:10,color:C.orange}}>{sortDir==="asc"?"↑":"↓"}</span>
    : <span style={{opacity:.25,fontSize:10}}>↕</span>;

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      <div
        style={{ position:"fixed", inset:0, background:"rgba(0,0,0,.88)", zIndex:1200,
          display:"flex", alignItems:"flex-start", justifyContent:"center",
          padding:"20px 12px", overflowY:"auto" }}
        onClick={e => { if(e.target===e.currentTarget) onClose(); }}>

        <div style={{ background:"#1a0a2e", border:`1px solid ${C.border}`, borderRadius:20,
          width:"100%", maxWidth:"min(1680px, 98vw)", boxShadow:"0 30px 80px rgba(0,0,0,.65)",
          display:"flex", flexDirection:"column" }}
          onClick={e=>e.stopPropagation()}>

          {/* ── Header ── */}
          <div style={{ background:"linear-gradient(135deg,#2a1540,#3d1f5c)",
            borderRadius:"20px 20px 0 0", padding:"18px 22px",
            display:"flex", justifyContent:"space-between", alignItems:"center",
            flexWrap:"wrap", gap:10, borderBottom:`1px solid ${C.border}` }}>
            <div>
              <div style={{fontSize:10,color:C.muted,marginBottom:3,letterSpacing:1}}>قائمة الطلاب</div>
              <h2 style={{fontFamily:font,fontSize:17,fontWeight:900,margin:0}}>{course.title}</h2>
              {course.title_en && course.title_en!==course.title &&
                <div style={{color:C.muted,fontSize:12,marginTop:2}}>{course.title_en}</div>}
            </div>
            <div style={{display:"flex",gap:8,alignItems:"center"}}>
              <button onClick={handleExport} disabled={exporting||loading||rows.length===0}
                style={{ display:"flex", alignItems:"center", gap:6,
                  background:"#1D6F42", color:"#fff", border:"none",
                  borderRadius:9, padding:"8px 16px", fontFamily:font,
                  fontWeight:700, fontSize:12, cursor:"pointer",
                  opacity:(exporting||loading||rows.length===0)?.5:1 }}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                  <polyline points="14 2 14 8 20 8"/>
                  <line x1="12" y1="18" x2="12" y2="12"/>
                  <polyline points="9 15 12 18 15 15"/>
                </svg>
                {exporting ? "جاري التصدير..." : "تصدير Excel"}
              </button>
              <button onClick={onClose}
                style={{ width:34,height:34,borderRadius:8,background:"rgba(255,255,255,.08)",
                  border:`1px solid ${C.border}`,color:C.muted,cursor:"pointer",
                  fontSize:18,display:"flex",alignItems:"center",justifyContent:"center",fontFamily:font }}>
                ×
              </button>
            </div>
          </div>

          <div style={{padding:"18px 22px",display:"flex",flexDirection:"column",gap:16}}>

            {/* ── Stats bar ── */}
            {!loading && rows.length > 0 && (
              <div style={{display:"flex",gap:10,flexWrap:"wrap"}}>
                <Stat label="إجمالي الطلاب"      value={rows.length}/>
                <Stat label="دفع كامل"            value={fullCount}        color="#34d399"/>
                <Stat label="أقساط"               value={instCount}        color={C.orange}/>
                <Stat label="✅ إيرادات مؤكدة"    value={`${confirmedRevenue.toLocaleString()}`}
                      sub="EGP"  color="#34d399" accent={true}/>
                <Stat label="⏳ إيرادات متوقعة"   value={`${pendingRevenue.toLocaleString()}`}
                      sub="EGP"  color={C.orange}/>
                <Stat label="🎯 إجمالي كامل"      value={`${(confirmedRevenue+pendingRevenue).toLocaleString()}`}
                      sub="EGP"  color={C.muted}/>
              </div>
            )}

            {/* ── Filters ── */}
            <div style={{display:"flex",gap:10,flexWrap:"wrap",alignItems:"center"}}>
              {/* Search */}
              <div style={{flex:"1 1 200px",position:"relative"}}>
                <svg style={{position:"absolute",right:10,top:"50%",transform:"translateY(-50%)",pointerEvents:"none"}}
                  width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={C.muted} strokeWidth="2">
                  <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
                </svg>
                <input value={search} onChange={e=>setSearch(e.target.value)}
                  placeholder="ابحث باسم أو إيميل أو تليفون..."
                  style={{ width:"100%", padding:"8px 34px 8px 12px",
                    background:"rgba(255,255,255,.07)", border:`1px solid ${C.border}`,
                    borderRadius:9, color:"#fff", fontFamily:font, fontSize:12,
                    outline:"none", boxSizing:"border-box", direction:"rtl" }}/>
              </div>

              {/* Filter groups */}
              {[
                { state:filterPlan, set:setFilterPlan,
                  opts:[{v:"all",l:"كل الدفع"},{v:"full",l:"✓ كامل"},{v:"inst",l:"أقساط"}] },
                { state:filterType, set:setFilterType,
                  opts:[{v:"all",l:"كل الأنواع"},{v:"online",l:"أونلاين"},{v:"offline",l:"حضوري"}] },
                { state:filterPay, set:setFilterPay,
                  opts:[{v:"all",l:"كل الحالات"},{v:"confirmed",l:"✅ مؤكد"},{v:"pending",l:"⏳ غير مؤكد"}] },
              ].map((group, gi) => (
                <div key={gi} style={{display:"flex",gap:4}}>
                  {group.opts.map(o => (
                    <button key={o.v} onClick={()=>group.set(o.v)}
                      style={{ padding:"6px 12px", borderRadius:7, fontFamily:font,
                        fontSize:11, fontWeight:600, cursor:"pointer", transition:"all .2s",
                        background: group.state===o.v ? C.purple : "rgba(255,255,255,.06)",
                        color: group.state===o.v ? "#fff" : C.muted,
                        border:`1px solid ${group.state===o.v ? C.purple : C.border}` }}>
                      {o.l}
                    </button>
                  ))}
                </div>
              ))}

              {(search||filterPlan!=="all"||filterType!=="all"||filterPay!=="all") && (
                <span style={{fontSize:11,color:C.muted}}>{filtered.length} نتيجة</span>
              )}
            </div>

            <p style={{ margin: 0, fontSize: 10, color: "rgba(255,255,255,.4)", lineHeight: 1.6 }}>
              الأعمدة المالية (ديبوزت / أقساط / عمر / اسم رباعي / ملاحظات) تُقرأ من حقول اختيارية على طلب التسجيل في Firestore:
              <code style={{ fontSize: 9, marginRight: 6 }}> studentFullName · studentAge · adminNotes · depositAmount · installment1…4 · coursePriceOverride </code>
              — يمكن تعبئتها يدويًا أو لاحقًا من نموذج إداري.
            </p>

            {/* ── Table ── */}
            <div style={{ overflow: "visible", borderRadius: 12, border: `1px solid ${C.border}` }}>
              {/* Keep horizontal scroll without clipping dropdown menus */}
              <div style={{ overflowX: "auto", overflowY: "visible", maxHeight: "min(70vh, 720px)" }}>
                <table style={{width:"100%",borderCollapse:"collapse",fontFamily:font,fontSize:12}}>
                <thead>
                  <tr style={{background:"linear-gradient(135deg,#2a1540,#3d1f5c)"}}>
                    {COLS.map(col => (
                      <th key={col.key}
                        onClick={col.sortable ? ()=>toggleSort(col.key) : undefined}
                        style={{ padding:"11px 12px", textAlign:"right", color:"#fff",
                          fontWeight:700, fontSize:11, whiteSpace:"nowrap",
                          borderBottom:`1px solid ${C.border}`,
                          cursor:col.sortable?"pointer":"default",
                          userSelect:"none", minWidth:col.w }}>
                        <span style={{display:"flex",alignItems:"center",gap:5,justifyContent:"flex-end"}}>
                          {col.label}
                          {col.sortable && <SortIcon col={col.key}/>}
                        </span>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan={COLS.length} style={{padding:48,textAlign:"center",color:C.muted}}>
                        <div style={{display:"flex",alignItems:"center",justifyContent:"center",gap:10}}>
                          <div style={{width:20,height:20,border:`2px solid ${C.purple}`,borderTopColor:"transparent",borderRadius:"50%",animation:"spin .7s linear infinite"}}/>
                          جاري التحميل...
                        </div>
                      </td>
                    </tr>
                  ) : filtered.length === 0 ? (
                    <tr>
                      <td colSpan={COLS.length} style={{padding:48,textAlign:"center",color:C.muted}}>
                        {rows.length===0 ? "لا يوجد طلاب مسجلون بعد" : "لا توجد نتائج تطابق البحث"}
                      </td>
                    </tr>
                  ) : filtered.map((row, idx) => {
                    const confirmed = row.paymentConfirmed;
                    return (
                      <tr key={row.email+idx}
                        style={{
                          background: confirmed
                            ? "rgba(52,211,153,.04)"
                            : idx%2===0 ? "rgba(255,255,255,.02)" : "transparent",
                          transition:"background .15s",
                          borderRight: confirmed ? "3px solid rgba(52,211,153,.4)" : "3px solid transparent",
                        }}
                        onMouseEnter={e=>e.currentTarget.style.background="rgba(125,61,158,.12)"}
                        onMouseLeave={e=>e.currentTarget.style.background=
                          confirmed ? "rgba(52,211,153,.04)" : idx%2===0?"rgba(255,255,255,.02)":"transparent"}>
                        {COLS.map(col => (
                          <td key={col.key}
                            style={{ padding:"10px 12px",
                              borderBottom:`1px solid rgba(255,255,255,.04)`,
                              verticalAlign:"middle", textAlign:"right" }}>
                            {col.render ? col.render(row,idx) : (row[col.key]||"—")}
                          </td>
                        ))}
                      </tr>
                    );
                  })}
                </tbody>
                </table>
              </div>
            </div>

            {/* ── Footer ── */}
            {!loading && rows.length > 0 && (
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",
                borderTop:`1px solid ${C.border}`,paddingTop:12,flexWrap:"wrap",gap:8}}>
                <span style={{fontSize:11,color:C.muted}}>
                  {filtered.length} من {rows.length} طالب · {confirmedRows.length} مؤكد الدفع
                </span>
                <span style={{fontSize:11,color:"rgba(52,211,153,.7)",fontWeight:700}}>
                  إيرادات مؤكدة: {confirmedRevenue.toLocaleString()} EGP
                </span>
              </div>
            )}

          </div>
        </div>
      </div>

      {/* ── Contact status popup ── */}
      {contactPopup?.row && (
        <div
          onClick={() => setContactPopup(null)}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,.62)",
            zIndex: 1400,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 14,
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: "min(520px, 96vw)",
              background: "linear-gradient(135deg,#1a0a2e,#2a1540)",
              border: `1px solid ${C.border}`,
              borderRadius: 18,
              boxShadow: "0 30px 90px rgba(0,0,0,.7)",
              overflow: "hidden",
            }}
          >
            {(() => {
              const r = contactPopup.row;
              const approved = (r.status || "pending") === "approved";
              const st = r.contactStatus || "no_response";
              const cfg = CONTACT_CFG[st] || CONTACT_CFG.no_response;
              const lockKey = r.userId || r.docId;
              const saving = savingContact === lockKey;
              return (
                <>
                  <div style={{ padding: "14px 16px", display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: `1px solid ${C.border}` }}>
                    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                      <div style={{ fontWeight: 900, fontSize: 14 }}>حالة التواصل</div>
                      <div style={{ fontSize: 11, color: C.muted }}>
                        {approved ? "طالب (Approved)" : "طلب (Pending)"} · {r.name} · {r.email}
                      </div>
                    </div>
                    <button
                      onClick={() => setContactPopup(null)}
                      style={{ width: 34, height: 34, borderRadius: 10, background: "rgba(255,255,255,.06)", border: `1px solid ${C.border}`, color: "#fff", cursor: "pointer", fontSize: 18 }}
                      aria-label="close"
                    >
                      ×
                    </button>
                  </div>

                  <div style={{ padding: 16 }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, marginBottom: 12 }}>
                      <div style={{ display: "inline-flex", alignItems: "center", gap: 10 }}>
                        <span style={{ width: 10, height: 10, borderRadius: 99, background: cfg.color, boxShadow: `0 0 0 4px ${cfg.color}22` }} />
                        <div style={{ fontWeight: 900, fontSize: 13 }}>{cfg.label}</div>
                      </div>
                      {saving && <div style={{ fontSize: 11, color: cfg.color, fontWeight: 900 }}>جاري الحفظ…</div>}
                    </div>

                    <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 8 }}>
                      {Object.entries(CONTACT_CFG).map(([k, v]) => {
                        const active = k === st;
                        return (
                          <button
                            key={k}
                            type="button"
                            disabled={saving}
                            onClick={async () => {
                              await handleSetContact(r, k);
                              setContactPopup(null);
                            }}
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: 12,
                              width: "100%",
                              textAlign: "right",
                              padding: "12px 12px",
                              borderRadius: 14,
                              border: `1px solid ${active ? `${v.color}66` : "rgba(255,255,255,.10)"}`,
                              background: active ? `${v.color}18` : "rgba(255,255,255,.05)",
                              color: "#fff",
                              cursor: saving ? "wait" : "pointer",
                              fontFamily: font,
                              fontWeight: active ? 900 : 800,
                              fontSize: 13,
                              opacity: saving ? 0.8 : 1,
                              transition: "all .15s",
                            }}
                          >
                            <span style={{ width: 11, height: 11, borderRadius: 99, background: v.color, boxShadow: `0 0 0 4px ${v.color}22` }} />
                            <span style={{ flex: 1 }}>{v.label}</span>
                            {active && <span style={{ color: v.color, fontWeight: 900 }}>✓</span>}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </>
              );
            })()}
          </div>
        </div>
      )}
    </>
  );
}
