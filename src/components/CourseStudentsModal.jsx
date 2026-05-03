/**
 * CourseStudentsModal — in-platform student list viewer
 * Features: search, filter, sort, payment confirmation, Excel export
 */
import { useState, useEffect, useMemo, useCallback } from "react";
import { doc, updateDoc } from "firebase/firestore";
import { db } from "../firebase";
import { C, font } from "../theme";
import { fetchCourseStudents, fmtDate, fmtPlan, exportCourseStudents, ledgerAmountForStats } from "../utils/exportExcel";

// ─── Mini UI helpers ──────────────────────────────────────────────────────────
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

/** Display / edit wrappers for currency cells — match ديبوزت الحجز (FinancePartCell) across columns */
const MONEY_CELL_BOX = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 8,
  padding: "6px 10px",
  borderRadius: 8,
  border: "1px solid rgba(255,255,255,.12)",
  background: "rgba(255,255,255,.04)",
  transition: "border-color .15s, background .15s",
  width: "100%",
  boxSizing: "border-box",
  minWidth: 0,
};

const MONEY_EDIT_ROW = {
  display: "flex",
  alignItems: "center",
  gap: 5,
  width: "100%",
  boxSizing: "border-box",
  minWidth: 0,
};

const moneyInputEditStyle = {
  flex: "1 1 0%",
  minWidth: 0,
  width: "100%",
  padding: "4px 8px",
  borderRadius: 7,
  background: "rgba(255,255,255,.1)",
  border: `1.5px solid ${C.purple}`,
  color: "#fff",
  fontFamily: font,
  fontSize: 13,
  fontWeight: 700,
  outline: "none",
  textAlign: "right",
  boxSizing: "border-box",
};

const MONEY_SUFFIX = { fontSize: 10, color: C.muted };
const MONEY_AMOUNT_INLINE_SUFFIX = {
  fontSize: 10,
  color: "rgba(255,255,255,.45)",
  fontWeight: 500,
  marginRight: 4,
};
const MONEY_SAVING_SPINNER = {
  width: 12,
  height: 12,
  border: "2px solid rgba(255,255,255,.35)",
  borderTopColor: "transparent",
  borderRadius: "50%",
  animation: "spin .6s linear infinite",
  display: "inline-block",
};
const EDIT_PENCIL_ICON_SZ = 12;

function moneyCellHoverProps() {
  return {
    onMouseEnter(e) {
      e.currentTarget.style.borderColor = "rgba(125,61,158,.45)";
      e.currentTarget.style.background = "rgba(125,61,158,.08)";
    },
    onMouseLeave(e) {
      e.currentTarget.style.borderColor = "rgba(255,255,255,.12)";
      e.currentTarget.style.background = "rgba(255,255,255,.04)";
    },
  };
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

/** تكلفة الكورس للطلب — يدويًا في `coursePriceOverride` (فارغ = سعر الكورس الافتراضي من الكتالوج) */
function CourseCostCell({ row, course, onSave, saving }) {
  const canEdit = !!(row.docId || row.userId);
  const catalog = course?.price != null ? Number(course.price) : null;
  const [editing, setEditing] = useState(false);
  const displayVal =
    row.courseCost != null && row.courseCost !== "" && Number.isFinite(Number(row.courseCost))
      ? String(row.courseCost)
      : "";
  const [val, setVal] = useState(displayVal);

  const commit = () => {
    setEditing(false);
    const t = val.trim();
    const num = t === "" ? null : Number(t);
    if (t !== "" && Number.isNaN(num)) return;
    const prevOr = row.coursePriceOverride;
    const prev =
      prevOr === "" || prevOr == null ? null : Number(prevOr);
    if (num === prev || (Number.isNaN(prev) && num == null)) return;
    if (
      num != null &&
      row.coursePriceOverride == null &&
      catalog != null &&
      Number.isFinite(catalog) &&
      num === catalog
    ) {
      return;
    }
    onSave(row, num);
  };

  if (!canEdit) {
    return <MoneyCell v={row.courseCost} />;
  }

  if (editing) {
    return (
      <div style={MONEY_EDIT_ROW}>
        <input
          autoFocus
          type="number"
          value={val}
          onChange={(e) => setVal(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => {
            if (e.key === "Enter") commit();
            if (e.key === "Escape") {
              setEditing(false);
              setVal(displayVal);
            }
          }}
          style={moneyInputEditStyle}
        />
        <span style={MONEY_SUFFIX}>EGP</span>
      </div>
    );
  }

  return (
    <div
      onClick={() => {
        if (!saving) {
          setVal(displayVal);
          setEditing(true);
        }
      }}
      title="اضغط لتعديل تكلفة الكورس لهذا الطالب. امسح القيمة لإلغاء التخصيص والاعتماد على سعر الكورس الافتراضي."
      style={{
        ...MONEY_CELL_BOX,
        cursor: saving ? "wait" : "pointer",
      }}
      {...moneyCellHoverProps()}
    >
      {saving ? (
        <span style={MONEY_SAVING_SPINNER} />
      ) : displayVal ? (
        <span style={{ fontWeight: 800, fontSize: 13, color: "rgba(255,255,255,.95)" }}>
          {Number(row.courseCost).toLocaleString()}
          <small style={MONEY_AMOUNT_INLINE_SUFFIX}>EGP</small>
        </span>
      ) : (
        <span style={{ fontSize: 11, color: "rgba(255,255,255,.38)" }}>حدّد التكلفة…</span>
      )}
      {!saving && (
        <svg width={EDIT_PENCIL_ICON_SZ} height={EDIT_PENCIL_ICON_SZ} viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,.4)" strokeWidth="2">
          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
          <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
        </svg>
      )}
    </div>
  );
}

/** ملاحظات إدارية — تُحفظ في `adminNotes` على الطلب أو اشتراك المستخدم */
function AdminNotesCell({ row, onSave, saving }) {
  const canEdit = !!(row.docId || row.userId);
  const displayVal = row.notes ?? "";
  const [val, setVal] = useState(displayVal);

  useEffect(() => {
    setVal(displayVal);
  }, [displayVal]);

  const commit = () => {
    const t = val.trim();
    const p = String(displayVal ?? "").trim();
    if (t === p) return;
    onSave(row, val);
  };

  if (!canEdit) {
    const t = String(displayVal || "").trim();
    if (!t) return <span style={{ color: "rgba(255,255,255,.25)" }}>—</span>;
    const short = t.length > 80 ? `${t.slice(0, 80)}…` : t;
    return (
      <span title={t} style={{ fontSize: 11, lineHeight: 1.5, color: "rgba(255,255,255,.88)" }}>
        {short}
      </span>
    );
  }

  return (
    <div style={{ position: "relative", width: "100%", minWidth: 0 }}>
      <textarea
        value={val}
        onChange={(e) => setVal(e.target.value)}
        onBlur={commit}
        disabled={saving}
        rows={3}
        dir="auto"
        title="اضغط خارج المربع لحفظ الملاحظة. اتركها فارغة لمسح الحقل."
        style={{
          width: "100%",
          minHeight: 52,
          boxSizing: "border-box",
          padding: "6px 8px",
          borderRadius: 8,
          border: `1px solid ${saving ? "rgba(125,61,158,.35)" : "rgba(255,255,255,.14)"}`,
          background: "rgba(255,255,255,.06)",
          color: "rgba(255,255,255,.92)",
          fontFamily: font,
          fontSize: 11,
          lineHeight: 1.45,
          resize: "vertical",
          outline: "none",
          opacity: saving ? 0.65 : 1,
        }}
      />
      {saving ? (
        <span
          style={{
            position: "absolute",
            left: 8,
            top: 8,
            width: 11,
            height: 11,
            border: "2px solid rgba(255,255,255,.35)",
            borderTopColor: "transparent",
            borderRadius: "50%",
            animation: "spin .6s linear infinite",
            display: "inline-block",
            pointerEvents: "none",
          }}
        />
      ) : null}
    </div>
  );
}

/** ديبوزت أو قسط — يُحفظ في Firestore؛ المدفوع الإجمالي يُحسب من المجموع */
function FinancePartCell({ row, firestoreField, valueKey, title, onSave, saving }) {
  const canEdit = !!(row.docId || row.userId);
  const [editing, setEditing] = useState(false);
  const raw = row[valueKey];
  const displayVal =
    raw != null && raw !== "" && Number.isFinite(Number(raw)) ? String(raw) : "";
  const [val, setVal] = useState(displayVal);

  const commit = () => {
    setEditing(false);
    const t = val.trim();
    const num = t === "" ? null : Number(t);
    if (t !== "" && Number.isNaN(num)) return;
    const prev = raw === "" || raw == null ? null : Number(raw);
    if (num === prev || (Number.isNaN(prev) && num == null)) return;
    onSave(row, firestoreField, num);
  };

  if (!canEdit) {
    return <MoneyCell v={raw} />;
  }

  if (editing) {
    return (
      <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
        <input
          autoFocus
          type="number"
          value={val}
          onChange={(e) => setVal(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => {
            if (e.key === "Enter") commit();
            if (e.key === "Escape") {
              setEditing(false);
              setVal(displayVal);
            }
          }}
          style={{
            width: 88,
            padding: "4px 8px",
            borderRadius: 7,
            background: "rgba(255,255,255,.1)",
            border: `1.5px solid ${C.purple}`,
            color: "#fff",
            fontFamily: font,
            fontSize: 13,
            fontWeight: 700,
            outline: "none",
            textAlign: "right",
          }}
        />
        <span style={{ fontSize: 10, color: C.muted }}>ج</span>
      </div>
    );
  }

  return (
    <div
      onClick={() => {
        if (!saving) {
          setVal(displayVal);
          setEditing(true);
        }
      }}
      title={title}
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 8,
        cursor: saving ? "wait" : "pointer",
        padding: "6px 10px",
        borderRadius: 8,
        border: "1px solid rgba(255,255,255,.12)",
        background: "rgba(255,255,255,.04)",
        transition: "border-color .15s, background .15s",
        width: "100%",
        boxSizing: "border-box",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = "rgba(125,61,158,.45)";
        e.currentTarget.style.background = "rgba(125,61,158,.08)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = "rgba(255,255,255,.12)";
        e.currentTarget.style.background = "rgba(255,255,255,.04)";
      }}
    >
      {saving ? (
        <span style={MONEY_SAVING_SPINNER} />
      ) : displayVal ? (
        <span style={{ fontWeight: 800, fontSize: 13, color: "rgba(255,255,255,.95)" }}>
          {Number(raw).toLocaleString()}        <small style={MONEY_AMOUNT_INLINE_SUFFIX}>ج</small>        </span>
      ) : (
        <span style={{ fontSize: 11, color: "rgba(255,255,255,.38)" }}>+ مبلغ</span>
      )}
      {!saving && (
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,.4)" strokeWidth="2">
          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
          <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
        </svg>
      )}
    </div>
  );
}

const PAYMENT_PLAN_VALUES = ["full", "installments"];

/** خطة الدفع — `full` | `installments` في Firestore؛ العرض بصيغة fmtPlan */
function PaymentPlanCell({ row, onSave, saving }) {
  const canEdit = !!(row.docId || row.userId);
  const raw = row.paymentPlan;
  const current = PAYMENT_PLAN_VALUES.includes(raw) ? raw : null;

  const readOnlyPill = (pp) => {
    const full = pp.includes("كامل");
    const payPlanColor = full ? "#5eead4" : C.orange;
    return (
      <span
        style={{
          fontSize: 10,
          fontWeight: 600,
          padding: "5px 10px",
          borderRadius: 8,
          background: `${payPlanColor}14`,
          color: payPlanColor,
          border: `1px solid ${payPlanColor}33`,
          maxWidth: "100%",
          display: "inline-block",
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
        }}
        title={pp}
      >
        {pp}
      </span>
    );
  };

  if (!canEdit) {
    const pp = row.payPlan || "";
    if (!pp || pp === "—") return <span style={{ color: "rgba(255,255,255,.25)", fontSize: 11 }}>—</span>;
    return readOnlyPill(pp);
  }

  return (
    <div
      style={{
        display: "flex",
        gap: 4,
        flexWrap: "wrap",
        alignItems: "center",
        justifyContent: "flex-end",
        direction: "rtl",
        minHeight: 28,
      }}
      title="خطة الدفع — اضغط لاختيار كامل أو أقساط (يُحفظ في Firestore)"
    >
      {saving ? (
        <span
          style={{
            width: 12,
            height: 12,
            border: "2px solid rgba(255,255,255,.35)",
            borderTopColor: "transparent",
            borderRadius: "50%",
            animation: "spin .6s linear infinite",
            display: "inline-block",
            flexShrink: 0,
          }}
        />
      ) : null}
      {PAYMENT_PLAN_VALUES.map((v) => {
        const active = current === v;
        const label = fmtPlan(v);
        const full = v === "full";
        const accent = full ? "#5eead4" : C.orange;
        return (
          <button
            key={v}
            type="button"
            disabled={saving}
            onClick={() => {
              if (saving || active) return;
              onSave(row, v);
            }}
            style={{
              padding: "5px 8px",
              borderRadius: 8,
              fontFamily: font,
              fontSize: 9,
              fontWeight: 700,
              cursor: saving ? "wait" : active ? "default" : "pointer",
              border: `1px solid ${active ? `${accent}88` : "rgba(255,255,255,.14)"}`,
              background: active ? `${accent}22` : "rgba(255,255,255,.05)",
              color: active ? accent : "rgba(255,255,255,.75)",
              whiteSpace: "nowrap",
              lineHeight: 1.25,
              flex: "1 1 auto",
              minWidth: 0,
            }}
          >
            {label}
          </button>
        );
      })}
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
        display:"inline-flex", alignItems:"center", gap:6,
        padding:"6px 12px", borderRadius:8, cursor: (loading || !row.docId) ? "not-allowed" : "pointer",
        fontFamily:font, fontWeight:700, fontSize:11,
        transition:"background .15s, color .15s", border:"none",
        background: confirmed ? "rgba(52,211,153,.22)" : "rgba(255,255,255,.06)",
        color: confirmed ? "#6ee7b7" : "rgba(255,255,255,.55)",
        boxShadow: confirmed ? "inset 0 0 0 1px rgba(52,211,153,.35)" : "inset 0 0 0 1px rgba(255,255,255,.1)",
        opacity: (loading || !row.docId) ? 0.45 : 1,
        flexShrink: 0,
      }}>
      {loading
        ? <span style={{ width:12, height:12, border:"2px solid currentColor",
            borderTopColor:"transparent", borderRadius:"50%",
            animation:"spin .6s linear infinite", display:"inline-block" }}/>
        : confirmed ? "✓" : "○"
      }
      {confirmed ? "مؤكد الدفع" : "تأكيد الدفع"}
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
  const [savingCourseCost, setSavingCourseCost] = useState(null);
  const [savingNotes, setSavingNotes] = useState(null); // docId||userId
  const [savingFinanceField, setSavingFinanceField] = useState(null); // "doc|user::depositAmount"
  const [savingContact, setSavingContact] = useState(null); // userId being updated
  const [savingPayPlan, setSavingPayPlan] = useState(null); // docId||userId
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

  const handleSaveFinancePart = async (row, firebaseField, newVal) => {
    const lock = row.docId || row.userId;
    const sk = lock ? `${lock}::${firebaseField}` : null;
    if (!sk) return;
    if (savingFinanceField === sk) return;
    setSavingFinanceField(sk);
    try {
      if (row.docId) {
        await updateDoc(doc(db, "enrollmentRequests", row.docId), { [firebaseField]: newVal });
      } else if (row.userId) {
        const u = allUsers.find((x) => x.id === row.userId);
        const enrolled = Array.isArray(u?.enrolledCourses) ? u.enrolledCourses : [];
        const updatedEnrollments = enrolled.map((e) => {
          if (String(e.courseId) !== String(course.id)) return e;
          return { ...e, [firebaseField]: newVal };
        });
        await updateDoc(doc(db, "users", row.userId), { enrolledCourses: updatedEnrollments });
      }
      loadRows({ silent: true });
    } catch (err) {
      console.error("Finance part save error:", err);
    } finally {
      setSavingFinanceField((cur) => (cur === sk ? null : cur));
    }
  };

  const financeSaving = (row, field) =>
    savingFinanceField === `${row.docId || row.userId}::${field}`;

  const handleSaveNotes = async (row, text) => {
    const lock = row.docId || row.userId;
    if (!lock || savingNotes) return;
    const trimmed = (text ?? "").trim();
    const newVal = trimmed === "" ? null : trimmed;
    const prevRaw = row.notes;
    const prev =
      prevRaw === "" || prevRaw == null ? null : String(prevRaw).trim();
    if (newVal === prev) return;

    setSavingNotes(lock);
    try {
      if (row.docId) {
        await updateDoc(doc(db, "enrollmentRequests", row.docId), { adminNotes: newVal });
      } else if (row.userId) {
        const u = allUsers.find((x) => x.id === row.userId);
        const enrolled = Array.isArray(u?.enrolledCourses) ? u.enrolledCourses : [];
        const updatedEnrollments = enrolled.map((e) => {
          if (String(e.courseId) !== String(course.id)) return e;
          return { ...e, adminNotes: newVal };
        });
        await updateDoc(doc(db, "users", row.userId), { enrolledCourses: updatedEnrollments });
      }
      loadRows({ silent: true });
    } catch (err) {
      console.error("Admin notes save error:", err);
    } finally {
      setSavingNotes(null);
    }
  };

  const handleSavePaymentPlan = async (row, rawValue) => {
    const lock = row.docId || row.userId;
    if (!lock || savingPayPlan === lock) return;
    const normalized =
      rawValue === "full" || rawValue === "installments" ? rawValue : null;
    if (!normalized) return;
    const prev =
      row.paymentPlan === "full" || row.paymentPlan === "installments"
        ? row.paymentPlan
        : null;
    if (prev === normalized) return;

    setSavingPayPlan(lock);
    try {
      if (row.docId) {
        await updateDoc(doc(db, "enrollmentRequests", row.docId), {
          paymentPlan: normalized,
        });
      } else if (row.userId) {
        const u = allUsers.find((x) => x.id === row.userId);
        const enrolled = Array.isArray(u?.enrolledCourses) ? u.enrolledCourses : [];
        const updatedEnrollments = enrolled.map((e) => {
          if (String(e.courseId) !== String(course.id)) return e;
          return { ...e, paymentPlan: normalized };
        });
        await updateDoc(doc(db, "users", row.userId), { enrolledCourses: updatedEnrollments });
      }
      loadRows({ silent: true });
    } catch (err) {
      console.error("Payment plan save error:", err);
    } finally {
      setSavingPayPlan((cur) => (cur === lock ? null : cur));
    }
  };

  const handleSaveCourseCost = async (row, newPrice) => {
    const lock = row.docId || row.userId;
    if (!lock || savingCourseCost) return;
    setSavingCourseCost(lock);
    try {
      if (row.docId) {
        await updateDoc(doc(db, "enrollmentRequests", row.docId), {
          coursePriceOverride: newPrice,
        });
      } else if (row.userId) {
        const u = allUsers.find((x) => x.id === row.userId);
        const enrolled = Array.isArray(u?.enrolledCourses) ? u.enrolledCourses : [];
        const updatedEnrollments = enrolled.map((e) => {
          if (String(e.courseId) !== String(course.id)) return e;
          return { ...e, coursePriceOverride: newPrice };
        });
        await updateDoc(doc(db, "users", row.userId), { enrolledCourses: updatedEnrollments });
      }
      loadRows({ silent: true });
    } catch (err) {
      console.error("Course cost save error:", err);
    } finally {
      setSavingCourseCost(null);
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
  const pendingPayRows   = rows.filter(r => !r.paymentConfirmed && ledgerAmountForStats(r) > 0);
  const confirmedRevenue = confirmedRows.reduce((s, r) => s + ledgerAmountForStats(r), 0);
  const pendingRevenue   = pendingPayRows.reduce((s, r) => s + ledgerAmountForStats(r), 0);
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
          (r.bookingChannel || "").toLowerCase().includes(q) ||
          (r.payPlan || "").toLowerCase().includes(q)
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

  const renderContactSelector = (r) => {
    const approved = (r.status || "pending") === "approved";
    const disabled = !r.docId && !r.userId;
    const loadingSel = savingContact === (r.userId || r.docId);
    const st = r.contactStatus || "no_response";
    const cfg = CONTACT_CFG[st] || CONTACT_CFG.no_response;
    const rowKey = r.userId || r.docId || null;
    return (
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
            : (!approved ? "تغيير حالة متابعة الطلب" : "تغيير حالة متابعة الطالب")
        }
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          padding: "8px 12px",
          borderRadius: 10,
          width: "100%",
          boxSizing: "border-box",
          direction: "rtl",
          background: disabled ? "rgba(255,255,255,.03)" : "rgba(255,255,255,.06)",
          color: disabled ? "rgba(255,255,255,.35)" : "rgba(255,255,255,.92)",
          border: `1px solid ${disabled ? C.border : `${cfg.color}40`}`,
          outline: "none",
          fontFamily: font,
          fontWeight: 600,
          fontSize: 11,
          lineHeight: 1.35,
          cursor: (disabled || loadingSel) ? "not-allowed" : "pointer",
          justifyContent: "space-between",
          textAlign: "right",
          transition: "border-color .15s, background .15s",
        }}
      >
        <span style={{ display: "inline-flex", alignItems: "center", gap: 8, minWidth: 0, flex: 1 }}>
          {loadingSel ? (
            <span
              style={{
                width: 14,
                height: 14,
                border: "2px solid rgba(255,255,255,.35)",
                borderTopColor: "transparent",
                borderRadius: "50%",
                animation: "spin .6s linear infinite",
                display: "inline-block",
                flexShrink: 0,
              }}
            />
          ) : (
            <span
              style={{
                width: 8,
                height: 8,
                borderRadius: 99,
                background: cfg.color,
                flexShrink: 0,
                boxShadow: `0 0 0 2px ${cfg.color}28`,
              }}
            />
          )}
          <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{cfg.label}</span>
        </span>
        <span style={{ color: disabled ? "rgba(255,255,255,.28)" : "rgba(255,255,255,.5)", fontSize: 11, flexShrink: 0 }}>▾</span>
      </button>
    );
  };

  /** شرح مختصر لكل عمود (يظهر عند الإيقاف على عنوان العمود) */
  const COLUMN_HINTS = {
    "#": "ترتيب الصف في القائمة",
    sheetDate: "تاريخ تسجيل الطلب أو بداية الاشتراك",
    fullName: "الاسم الرباعي والبريد الإلكتروني",
    phone: "رقم التليفون كما أدخله الطالب",
    attendanceAr: "نوع الحضور: أونلاين مباشر أو حضوري",
    diplomaTitle: "اسم الدبلومة/الكورس على المنصّة",
    bookingChannel: "مصدر الحجز (سوشيال، موقع، إحالة، …)",
    contactStatus:
      "آخر حالة متابعة اتصال أو حجز — اضغط لتغييرها (مردش، أكد وهيدفع، حجز ودفع، …)",
    notes: "ملاحظات إدارية — تُحرّر يدويًا في الخلية وتُحفظ في `adminNotes` في Firestore",
    payPlan:
      "خطة الدفع (`full` أو `installments` في Firestore) — أزرار كامل / أقساط؛ يُفضّل تصحيح الخطة عند خطأ الطالب أو بيانات قديمة",
    courseCost: "تكلفة الكورس لهذا الطالب — اضغط على الخلية للتعديل",
    deposit: "ديبوزت الحجز — يُدخل يدويًا؛ يُجمَّع ضمن عمود المدفوع",
    installment1: "القسط الأول — يُدخل يدويًا ويُضاف للمدفوع",
    installment2: "القسط الثاني — يُدخل يدويًا ويُضاف للمدفوع",
    installment3: "القسط الثالث — يُدخل يدويًا ويُضاف للمدفوع",
    totalPaid: "مجموع الديبوزت + الأقساط الثلاثة (تلقائي)؛ للبيانات القديمة بدون أجزاء يُعرض totalPaidManual إن وُجد",
    remaining: "المتبقي = تكلفة الكورس − المدفوع (حسب الأرقام المعروضة)",
    _admin: "تأكيد استلام الدفع (حالة المتابعة في العمود المنفصل)",
  };

  const TABLE_COL_DIVIDER = "1px solid rgba(255,255,255,.12)";
  const TABLE_COL_HEAD_BG = (i) => (i % 2 === 0 ? "rgba(0,0,0,.14)" : "rgba(0,0,0,.07)");

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
      key: "contactStatus",
      label: "حالة المتابعة",
      w: 200,
      sortable: true,
      render: (r) => <div style={{ minWidth: 0 }}>{renderContactSelector(r)}</div>,
    },
    {
      key: "notes",
      label: "ملاحظات",
      w: 200,
      render: (r) => (
        <AdminNotesCell
          row={r}
          onSave={handleSaveNotes}
          saving={savingNotes === (r.docId || r.userId)}
        />
      ),
    },
    {
      key: "payPlan",
      label: "خطة الدفع",
      w: 168,
      sortable: true,
      render: (r) => (
        <PaymentPlanCell
          row={r}
          onSave={handleSavePaymentPlan}
          saving={savingPayPlan === (r.docId || r.userId)}
        />
      ),
    },
    {
      key: "courseCost",
      label: "تكلفة الكورس",
      w: 108,
      render: (r) => (
        <CourseCostCell
          row={r}
          course={course}
          onSave={handleSaveCourseCost}
          saving={savingCourseCost === (r.docId || r.userId)}
        />
      ),
    },
    {
      key: "deposit",
      label: "ديبوزت الحجز",
      w: 96,
      render: (r) => (
        <FinancePartCell
          row={r}
          firestoreField="depositAmount"
          valueKey="deposit"
          title="ديبوزت الحجز — اضغط للتعديل (يُحفظ في Firestore ويُحدّث عمود المدفوع تلقائيًا)"
          onSave={handleSaveFinancePart}
          saving={financeSaving(r, "depositAmount")}
        />
      ),
    },
    {
      key: "installment1",
      label: "القسط ١",
      w: 88,
      render: (r) => (
        <FinancePartCell
          row={r}
          firestoreField="installment1"
          valueKey="installment1"
          title="القسط الأول — اضغط للتعديل"
          onSave={handleSaveFinancePart}
          saving={financeSaving(r, "installment1")}
        />
      ),
    },
    {
      key: "installment2",
      label: "القسط ٢",
      w: 88,
      render: (r) => (
        <FinancePartCell
          row={r}
          firestoreField="installment2"
          valueKey="installment2"
          title="القسط الثاني — اضغط للتعديل"
          onSave={handleSaveFinancePart}
          saving={financeSaving(r, "installment2")}
        />
      ),
    },
    {
      key: "installment3",
      label: "القسط ٣",
      w: 88,
      render: (r) => (
        <FinancePartCell
          row={r}
          firestoreField="installment3"
          valueKey="installment3"
          title="القسط الثالث — اضغط للتعديل"
          onSave={handleSaveFinancePart}
          saving={financeSaving(r, "installment3")}
        />
      ),
    },
    {
      key: "totalPaid",
      label: "المدفوع",
      w: 100,
      render: (r) => (
        <span
          title="مجموع الديبوزت والأقساط — يُحسب تلقائيًا من ديبوزت الحجز + القسط ١ + ٢ + ٣. إن لم تُدخل أجزاء قد تُستخدم قيمة يدوية قديمة في النظام فقط."
          style={{ display: "block" }}
        >
          <MoneyCell v={r.totalPaid} />
        </span>
      ),
    },
    {
      key: "remaining",
      label: "المتبقي",
      w: 92,
      render: (r) => <MoneyCell v={r.remaining} />,
    },
    {
      key: "_admin",
      label: "متابعة · دفع",
      w: 280,
      render: (r) => {
        const confirmedLine =
          r.paymentConfirmed && r.confirmedAt
            ? typeof r.confirmedAt === "string" && r.confirmedAt.includes("T")
              ? fmtDate(r.confirmedAt)
              : r.confirmedAt
            : null;
        const miniBase = {
          padding: "10px 11px",
          borderRadius: 10,
          background: "rgba(255,255,255,.04)",
          border: "1px solid rgba(255,255,255,.1)",
          boxSizing: "border-box",
          width: "100%",
          maxWidth: 260,
          display: "flex",
          flexDirection: "column",
        };
        const lbl = {
          fontSize: 9,
          fontWeight: 700,
          color: "rgba(255,255,255,.4)",
          marginBottom: 6,
          letterSpacing: 0.2,
        };
        return (
          <div
            style={{
              display: "flex",
              flexDirection: "row",
              flexWrap: "wrap",
              gap: 10,
              alignItems: "stretch",
              justifyContent: "flex-start",
              direction: "rtl",
              minWidth: 200,
            }}
          >
            <div style={miniBase}>
              <div style={lbl}>تأكيد استلام الدفع</div>
              <div style={{ display: "flex", justifyContent: "flex-end" }}>
                <PayConfirmBtn row={r} onToggle={handleTogglePay} loading={confirming === r.docId} />
              </div>
              {confirmedLine ? (
                <div
                  style={{
                    marginTop: 8,
                    paddingTop: 8,
                    borderTop: "1px solid rgba(255,255,255,.08)",
                    fontSize: 10,
                    color: "rgba(255,255,255,.48)",
                    textAlign: "right",
                  }}
                  title="تاريخ التأكيد"
                >
                  تاريخ التأكيد: {confirmedLine}
                </div>
              ) : null}
            </div>
          </div>
        );
      },
    },
  ];

  const SortIcon = ({ col }) => sortCol===col
    ? <span style={{fontSize:10,color:C.orange}}>{sortDir==="asc"?"↑":"↓"}</span>
    : <span style={{opacity:.25,fontSize:10}}>↕</span>;

  const tablePixelWidth = COLS.reduce((acc, c) => acc + c.w, 0);

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
              الديبوزت والأقساط تُدخل من الجدول وتُحفظ في Firestore؛ عمود «المدفوع» يُحدَّث تلقائيًا كمجموعها. الحقول الاختيارية الأخرى:
              <code style={{ fontSize: 9, marginRight: 6 }}> studentFullName · adminNotes · coursePriceOverride </code>
              — يمكن تعبئتها يدويًا أو في Firestore.
            </p>

            {/* ── Table ── */}
            <div style={{ overflow: "visible", borderRadius: 12, border: `1px solid ${C.border}` }}>
              {/* Keep horizontal scroll without clipping dropdown menus */}
              <div style={{ overflowX: "auto", overflowY: "visible", maxHeight: "min(70vh, 720px)" }}>
                <table
                  style={{
                    tableLayout: "fixed",
                    width: tablePixelWidth,
                    borderCollapse: "collapse",
                    fontFamily: font,
                    fontSize: 12,
                  }}
                >
                <colgroup>
                  {COLS.map((col) => (
                    <col key={col.key} style={{ width: col.w }} />
                  ))}
                </colgroup>
                <thead>
                  <tr style={{ background: "transparent" }}>
                    {COLS.map((col, ci) => (
                      <th
                        key={col.key}
                        title={COLUMN_HINTS[col.key] || col.label}
                        onClick={col.sortable ? () => toggleSort(col.key) : undefined}
                        style={{
                          padding: "11px 10px",
                          textAlign: "right",
                          color: "#fff",
                          fontWeight: 700,
                          fontSize: 11,
                          whiteSpace: "normal",
                          lineHeight: 1.35,
                          wordBreak: "break-word",
                          borderBottom: `2px solid rgba(255,255,255,.16)`,
                          borderInlineEnd: ci < COLS.length - 1 ? TABLE_COL_DIVIDER : "none",
                          background: `linear-gradient(180deg, ${TABLE_COL_HEAD_BG(ci)} 0%, rgba(45,21,70,.95) 100%)`,
                          cursor: col.sortable ? "pointer" : "default",
                          userSelect: "none",
                          boxSizing: "border-box",
                          verticalAlign: "middle",
                        }}
                      >
                        <span style={{ display: "flex", alignItems: "center", gap: 5, justifyContent: "flex-end" }}>
                          {col.label}
                          {col.sortable && <SortIcon col={col.key} />}
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
                        {COLS.map((col, ci) => (
                          <td
                            key={col.key}
                            title={COLUMN_HINTS[col.key] || col.label}
                            style={{
                              padding: "10px 10px",
                              borderBottom: `1px solid rgba(255,255,255,.07)`,
                              borderInlineEnd: ci < COLS.length - 1 ? TABLE_COL_DIVIDER : "none",
                              verticalAlign: "top",
                              textAlign: "right",
                              boxSizing: "border-box",
                              wordBreak: "break-word",
                              overflowWrap: "break-word",
                            }}
                          >
                            {col.render ? col.render(row, idx) : row[col.key] || "—"}
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
