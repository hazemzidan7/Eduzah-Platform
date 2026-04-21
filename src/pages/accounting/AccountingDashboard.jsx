import { useState, useMemo } from "react";
import { useAccounting } from "../../context/AccountingContext";
import { C, font } from "../../theme";
import * as XLSX from "xlsx";

const EXPENSE_CATS = ["مرافق", "أدوات وبرامج", "اشتراكات", "إيجار", "صيانة", "أخرى"];
const MARKETING_PLATFORMS = ["Facebook", "Instagram", "Google", "TikTok", "YouTube", "بريد إلكتروني", "أخرى"];
const MONTHS = [
  "يناير",
  "فبراير",
  "مارس",
  "أبريل",
  "مايو",
  "يونيو",
  "يوليو",
  "أغسطس",
  "سبتمبر",
  "أكتوبر",
  "نوفمبر",
  "ديسمبر",
];

const EGP = (v) => `${Number(v || 0).toLocaleString("ar-EG")} ج.م`;
const fmt = (iso) =>
  iso ? new Date(iso).toLocaleDateString("ar-EG", { day: "numeric", month: "short", year: "numeric" }) : "—";
const sum = (arr, key) => arr.reduce((s, r) => s + Number(r[key] || 0), 0);

const S = {
  page: {
    minHeight: "100vh",
    background: "linear-gradient(160deg,#1a0a2e 0%,#2a1540 50%,#1a0a2e 100%)",
    fontFamily: font,
    direction: "rtl",
    color: "#f0f0f0",
  },
  wrap: { maxWidth: 1280, margin: "0 auto", padding: "0 20px 40px" },
  card: {
    background: "rgba(50,29,61,.7)",
    border: "1px solid rgba(255,255,255,.1)",
    borderRadius: 16,
    padding: 20,
    backdropFilter: "blur(12px)",
  },
  inp: {
    width: "100%",
    padding: "9px 12px",
    background: "rgba(255,255,255,.07)",
    border: "1px solid rgba(255,255,255,.14)",
    borderRadius: 10,
    color: "#fff",
    fontFamily: font,
    fontSize: 13,
    outline: "none",
    boxSizing: "border-box",
  },
  label: { display: "block", marginBottom: 5, fontSize: 12, fontWeight: 600, color: "rgba(255,255,255,.7)" },
  th: {
    padding: "10px 14px",
    fontSize: 12,
    fontWeight: 700,
    color: "rgba(255,255,255,.6)",
    textAlign: "right",
    borderBottom: "1px solid rgba(255,255,255,.08)",
    whiteSpace: "nowrap",
  },
  td: { padding: "10px 14px", fontSize: 13, borderBottom: "1px solid rgba(255,255,255,.05)", verticalAlign: "middle" },
};

function Btn({ children, onClick, v = "primary", sm, disabled, style: sx = {}, type = "button" }) {
  const [h, setH] = useState(false);
  const bg =
    {
      primary: h ? C.rdark : C.red,
      success: h ? "#059669" : C.success,
      danger: h ? "#dc2626" : C.danger,
      outline: "transparent",
      ghost: "transparent",
      orange: h ? C.odark : C.orange,
      purple: h ? "#5b21b6" : C.purple,
    }[v] || C.red;
  const color = v === "orange" ? C.pdark : "#fff";
  return (
    <button
      type={type}
      disabled={disabled}
      onMouseEnter={() => setH(true)}
      onMouseLeave={() => setH(false)}
      onClick={onClick}
      style={{
        background: disabled ? "#444" : bg,
        color,
        border: v === "outline" ? "1.5px solid rgba(255,255,255,.2)" : "none",
        borderRadius: 9,
        padding: sm ? "5px 12px" : "8px 18px",
        fontFamily: font,
        fontWeight: 700,
        fontSize: sm ? 11 : 13,
        cursor: disabled ? "not-allowed" : "pointer",
        transition: "all .18s",
        opacity: disabled ? 0.55 : 1,
        ...sx,
      }}
    >
      {children}
    </button>
  );
}

function StatCard({ label, value, color = C.red, icon, sub }) {
  return (
    <div style={{ ...S.card, display: "flex", flexDirection: "column", gap: 6, borderTop: `3px solid ${color}` }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span style={{ fontSize: 12, color: "rgba(255,255,255,.55)", fontWeight: 600 }}>{label}</span>
        <span style={{ fontSize: 20 }}>{icon}</span>
      </div>
      <div style={{ fontSize: 22, fontWeight: 800, color }}>{value}</div>
      {sub && <div style={{ fontSize: 11, color: "rgba(255,255,255,.4)" }}>{sub}</div>}
    </div>
  );
}

function Modal({ title, onClose, children }) {
  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        background: "rgba(0,0,0,.65)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 16,
      }}
      onClick={onClose}
    >
      <div style={{ ...S.card, width: "100%", maxWidth: 540, maxHeight: "90vh", overflowY: "auto" }} onClick={(e) => e.stopPropagation()}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <h3 style={{ margin: 0, fontSize: 17, fontWeight: 800 }}>{title}</h3>
          <button
            onClick={onClose}
            style={{
              background: "none",
              border: "none",
              color: "rgba(255,255,255,.5)",
              fontSize: 22,
              cursor: "pointer",
              lineHeight: 1,
              padding: "0 4px",
            }}
          >
            ✕
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <label style={S.label}>{label}</label>
      {children}
    </div>
  );
}

function Select({ value, onChange, options }) {
  return (
    <select value={value} onChange={(e) => onChange(e.target.value)} style={{ ...S.inp, appearance: "none", cursor: "pointer" }}>
      {options.map((o) => (
        <option key={o.value ?? o} value={o.value ?? o} style={{ background: "#321d3d" }}>
          {o.label ?? o}
        </option>
      ))}
    </select>
  );
}

function Badge({ children, color = C.red }) {
  return (
    <span
      style={{
        background: color + "33",
        color: "#fff",
        border: `1px solid ${color}66`,
        borderRadius: 50,
        padding: "3px 10px",
        fontSize: 11,
        fontWeight: 700,
        whiteSpace: "nowrap",
      }}
    >
      {children}
    </span>
  );
}

function BarChart({ data, height = 140 }) {
  if (!data?.length) return <div style={{ textAlign: "center", padding: 24, color: "rgba(255,255,255,.3)", fontSize: 13 }}>لا توجد بيانات</div>;
  const maxVal = Math.max(...data.map((d) => d.value), 1);
  return (
    <div style={{ display: "flex", alignItems: "flex-end", gap: 8, height, padding: "0 4px" }}>
      {data.map((d, i) => (
        <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
          <div style={{ fontSize: 10, color: "rgba(255,255,255,.5)", textAlign: "center", wordBreak: "break-all" }}>
            {d.value > 0 ? (d.value / 1000).toFixed(0) + "k" : ""}
          </div>
          <div
            style={{
              width: "100%",
              background: d.color || C.red,
              borderRadius: "4px 4px 0 0",
              height: `${Math.max((d.value / maxVal) * (height - 40), d.value > 0 ? 4 : 0)}px`,
              transition: "height .4s",
              minWidth: 12,
            }}
            title={`${d.label}: ${EGP(d.value)}`}
          />
          <div style={{ fontSize: 10, color: "rgba(255,255,255,.5)", textAlign: "center", wordBreak: "break-all", maxWidth: 60 }}>{d.label}</div>
        </div>
      ))}
    </div>
  );
}

function DonutChart({ segments, size = 120 }) {
  const total = segments.reduce((s, g) => s + g.value, 0);
  if (!total)
    return (
      <div
        style={{
          width: size,
          height: size,
          borderRadius: "50%",
          background: "rgba(255,255,255,.06)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 11,
          color: "rgba(255,255,255,.3)",
        }}
      >
        فارغ
      </div>
    );
  let acc = 0;
  const r = 40,
    cx = 60,
    cy = 60,
    strokeW = 18;
  const circ = 2 * Math.PI * r;
  return (
    <svg width={size} height={size} viewBox="0 0 120 120">
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="rgba(255,255,255,.06)" strokeWidth={strokeW} />
      {segments.map((seg, i) => {
        const pct = seg.value / total;
        const dash = pct * circ;
        const offset = circ - acc * circ;
        acc += pct;
        return (
          <circle
            key={i}
            cx={cx}
            cy={cy}
            r={r}
            fill="none"
            stroke={seg.color}
            strokeWidth={strokeW}
            strokeDasharray={`${dash} ${circ - dash}`}
            strokeDashoffset={offset}
            transform="rotate(-90 60 60)"
            style={{ transition: "stroke-dasharray .5s" }}
          >
            <title>
              {seg.label}: {EGP(seg.value)}
            </title>
          </circle>
        );
      })}
      <text x={cx} y={cy + 4} textAnchor="middle" fontSize={10} fill="rgba(255,255,255,.7)" fontFamily={font}>
        {segments.length} بنود
      </text>
    </svg>
  );
}

function usePaged(items, size = 15) {
  const [page, setPage] = useState(0);
  const pages = Math.ceil(items.length / size);
  const slice = items.slice(page * size, page * size + size);
  return { slice, page, pages, setPage };
}

function Table({ columns, rows, onEdit, onDelete, emptyMsg = "لا توجد سجلات" }) {
  if (!rows.length)
    return (
      <div style={{ textAlign: "center", padding: "40px 20px", color: "rgba(255,255,255,.3)", fontSize: 14 }}>
        {emptyMsg}
      </div>
    );
  return (
    <div style={{ overflowX: "auto" }}>
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead>
          <tr style={{ background: "rgba(255,255,255,.03)" }}>
            {columns.map((c) => (
              <th key={c.key} style={S.th}>
                {c.label}
              </th>
            ))}
            <th style={{ ...S.th, width: 80 }}>إجراء</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr
              key={row.id}
              style={{ transition: "background .15s" }}
              onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(255,255,255,.03)")}
              onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
            >
              {columns.map((c) => (
                <td key={c.key} style={S.td}>
                  {c.render ? c.render(row) : row[c.key] ?? "—"}
                </td>
              ))}
              <td style={S.td}>
                <div style={{ display: "flex", gap: 6 }}>
                  <Btn sm v="outline" onClick={() => onEdit(row)}>
                    تعديل
                  </Btn>
                  <Btn sm v="danger" onClick={() => onDelete(row.id)}>
                    حذف
                  </Btn>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function useDateFilter(items, dateKey = "date") {
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const filtered = useMemo(() => {
    let r = [...items];
    if (from) r = r.filter((i) => (i[dateKey] || "") >= from);
    if (to) r = r.filter((i) => (i[dateKey] || "") <= to);
    return r;
  }, [items, from, to, dateKey]);
  const FilterUI = (
    <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
      <span style={{ fontSize: 12, color: "rgba(255,255,255,.5)" }}>من:</span>
      <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} style={{ ...S.inp, width: 140 }} />
      <span style={{ fontSize: 12, color: "rgba(255,255,255,.5)" }}>إلى:</span>
      <input type="date" value={to} onChange={(e) => setTo(e.target.value)} style={{ ...S.inp, width: 140 }} />
      {(from || to) && (
        <Btn sm v="ghost" onClick={() => { setFrom(""); setTo(""); }}>
          مسح
        </Btn>
      )}
    </div>
  );
  return { filtered, FilterUI };
}

function OverviewTab({ rounds, expenses, salaries, withdrawals, marketing, instructorPayments, mentorPayments }) {
  const totalRevenue = sum(rounds, "totalRevenue");
  const totalExpenses = sum(expenses, "amount");
  const totalSalaries = sum(salaries, "amount");
  const totalWithdrawals = sum(withdrawals, "amount");
  const totalMarketing = sum(marketing, "amount");
  const totalInstructor = sum(instructorPayments, "calculatedAmount");
  const totalMentor = sum(mentorPayments, "calculatedAmount");
  const totalOut = totalExpenses + totalSalaries + totalWithdrawals + totalMarketing + totalInstructor + totalMentor;
  const netProfit = totalRevenue - totalOut;

  const barData = [
    { label: "إيرادات", value: totalRevenue, color: C.success },
    { label: "مصاريف", value: totalExpenses, color: C.danger },
    { label: "رواتب", value: totalSalaries, color: C.orange },
    { label: "تسويق", value: totalMarketing, color: C.purple },
    { label: "مدربون", value: totalInstructor, color: "#38bdf8" },
    { label: "مرشدون", value: totalMentor, color: "#a78bfa" },
    { label: "سحوبات", value: totalWithdrawals, color: "#fb923c" },
  ];

  const donutSegs = [
    { label: "مصاريف تشغيلية", value: totalExpenses, color: C.danger },
    { label: "رواتب", value: totalSalaries, color: C.orange },
    { label: "تسويق", value: totalMarketing, color: C.purple },
    { label: "مدربون", value: totalInstructor, color: "#38bdf8" },
    { label: "مرشدون", value: totalMentor, color: "#a78bfa" },
    { label: "سحوبات", value: totalWithdrawals, color: "#fb923c" },
  ].filter((s) => s.value > 0);

  function exportAll() {
    const wb = XLSX.utils.book_new();
    const overviewData = [
      ["البيان", "المبلغ (ج.م)"],
      ["إجمالي الإيرادات", totalRevenue],
      ["إجمالي المصاريف التشغيلية", totalExpenses],
      ["إجمالي الرواتب", totalSalaries],
      ["إجمالي التسويق", totalMarketing],
      ["إجمالي مدفوعات المدربين", totalInstructor],
      ["إجمالي مدفوعات المرشدين", totalMentor],
      ["إجمالي السحوبات", totalWithdrawals],
      ["صافي الربح / الخسارة", netProfit],
    ];
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(overviewData), "الملخص");
    XLSX.writeFile(wb, `Eduzah_Financial_${new Date().toISOString().slice(0, 10)}.xlsx`);
  }

  return (
    <div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(200px,1fr))", gap: 16, marginBottom: 24 }}>
        <StatCard label="إجمالي الإيرادات" value={EGP(totalRevenue)} color={C.success} icon="💰" sub={`${rounds.length} دورة/جولة`} />
        <StatCard label="إجمالي المصروفات" value={EGP(totalOut)} color={C.danger} icon="📤" sub="كل الفئات" />
        <StatCard label="صافي الربح" value={EGP(netProfit)} color={netProfit >= 0 ? C.success : C.danger} icon={netProfit >= 0 ? "📈" : "📉"} />
        <StatCard label="رواتب الموظفين" value={EGP(totalSalaries)} color={C.orange} icon="👥" sub={`${salaries.length} سجل`} />
        <StatCard label="مصاريف تشغيلية" value={EGP(totalExpenses)} color="#f87171" icon="🔧" sub={`${expenses.length} بند`} />
        <StatCard label="مصاريف التسويق" value={EGP(totalMarketing)} color={C.purple} icon="📣" sub={`${marketing.length} حملة`} />
        <StatCard label="مدفوعات المدربين" value={EGP(totalInstructor)} color="#38bdf8" icon="🎓" />
        <StatCard label="سحوبات الموظفين" value={EGP(totalWithdrawals)} color="#fb923c" icon="💸" sub={`${withdrawals.length} سحب`} />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 20, marginBottom: 24, alignItems: "start" }}>
        <div style={{ ...S.card }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700 }}>مقارنة الإيرادات والمصاريف</h3>
            <Btn sm onClick={exportAll}>
              تصدير Excel
            </Btn>
          </div>
          <BarChart data={barData} height={160} />
        </div>
        <div style={{ ...S.card, minWidth: 220, display: "flex", flexDirection: "column", alignItems: "center", gap: 12 }}>
          <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700 }}>توزيع المصروفات</h3>
          <DonutChart segments={donutSegs} size={140} />
          <div style={{ width: "100%" }}>
            {donutSegs.map((s) => (
              <div key={s.label} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 5 }}>
                <div style={{ width: 10, height: 10, borderRadius: "50%", background: s.color, flexShrink: 0 }} />
                <span style={{ fontSize: 11, color: "rgba(255,255,255,.65)", flex: 1 }}>{s.label}</span>
                <span style={{ fontSize: 11, color: "#fff", fontWeight: 600 }}>{EGP(s.value)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function blank_round() {
  return { name: "", courseTitle: "", startDate: "", endDate: "", totalRevenue: "", instructorPercentage: "", mentorPercentage: "", notes: "" };
}

function RoundsTab({ rounds, addRound, updateRound, deleteRound }) {
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState(blank_round());
  const [busy, setBusy] = useState(false);

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  function openAdd() { setForm(blank_round()); setModal("add"); }
  function openEdit(r) { setForm({ ...r }); setModal("edit"); }

  async function save() {
    setBusy(true);
    try {
      const payload = {
        ...form,
        totalRevenue: Number(form.totalRevenue) || 0,
        instructorPercentage: Number(form.instructorPercentage) || 0,
        mentorPercentage: Number(form.mentorPercentage) || 0,
      };
      if (modal === "add") await addRound(payload);
      else await updateRound(form.id, payload);
      setModal(null);
    } finally {
      setBusy(false);
    }
  }

  async function del(id) {
    // eslint-disable-next-line no-alert
    if (!confirm("هل تريد حذف هذه الجولة؟")) return;
    await deleteRound(id);
  }

  function exportRounds() {
    const ws = XLSX.utils.json_to_sheet(
      rounds.map((r) => ({
        "اسم الجولة": r.name,
        الكورس: r.courseTitle || "",
        "تاريخ البدء": r.startDate || "",
        "تاريخ الانتهاء": r.endDate || "",
        "الإيراد الكلي": r.totalRevenue || 0,
        "نسبة المدرب %": r.instructorPercentage || 0,
        "نسبة المرشد %": r.mentorPercentage || 0,
        ملاحظات: r.notes || "",
      }))
    );
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "الجولات");
    XLSX.writeFile(wb, "Eduzah_Rounds.xlsx");
  }

  const totalRev = sum(rounds, "totalRevenue");

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20, flexWrap: "wrap", gap: 10 }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 18, fontWeight: 800 }}>الجولات والدورات</h2>
          <p style={{ margin: "4px 0 0", fontSize: 13, color: "rgba(255,255,255,.5)" }}>إجمالي الإيرادات: {EGP(totalRev)}</p>
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <Btn onClick={exportRounds} v="outline" sm>
            تصدير Excel
          </Btn>
          <Btn onClick={openAdd}>+ إضافة جولة</Btn>
        </div>
      </div>

      <div style={S.card}>
        <Table
          columns={[
            { key: "name", label: "اسم الجولة" },
            { key: "courseTitle", label: "الكورس" },
            { key: "startDate", label: "البدء", render: (r) => fmt(r.startDate) },
            { key: "endDate", label: "الانتهاء", render: (r) => fmt(r.endDate) },
            { key: "totalRevenue", label: "الإيراد", render: (r) => EGP(r.totalRevenue) },
            { key: "instructorPercentage", label: "مدرب %", render: (r) => `${r.instructorPercentage || 0}%` },
            { key: "mentorPercentage", label: "مرشد %", render: (r) => `${r.mentorPercentage || 0}%` },
          ]}
          rows={rounds}
          onEdit={openEdit}
          onDelete={del}
          emptyMsg="لم تُضف أي جولات بعد"
        />
      </div>

      {modal && (
        <Modal title={modal === "add" ? "إضافة جولة جديدة" : "تعديل الجولة"} onClose={() => setModal(null)}>
          <Field label="اسم الجولة *">
            <input value={form.name} onChange={set("name")} style={S.inp} placeholder="مثال: دورة Python الدفعة 3" />
          </Field>
          <Field label="عنوان الكورس">
            <input value={form.courseTitle} onChange={set("courseTitle")} style={S.inp} placeholder="اختياري" />
          </Field>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
            <Field label="تاريخ البدء">
              <input type="date" value={form.startDate} onChange={set("startDate")} style={S.inp} />
            </Field>
            <Field label="تاريخ الانتهاء">
              <input type="date" value={form.endDate} onChange={set("endDate")} style={S.inp} />
            </Field>
          </div>
          <Field label="إجمالي الإيرادات (ج.م) *">
            <input type="number" min="0" value={form.totalRevenue} onChange={set("totalRevenue")} style={S.inp} placeholder="0" />
          </Field>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
            <Field label="نسبة المدرب %">
              <input type="number" min="0" max="100" value={form.instructorPercentage} onChange={set("instructorPercentage")} style={S.inp} placeholder="0" />
            </Field>
            <Field label="نسبة المرشد %">
              <input type="number" min="0" max="100" value={form.mentorPercentage} onChange={set("mentorPercentage")} style={S.inp} placeholder="0" />
            </Field>
          </div>
          <Field label="ملاحظات">
            <textarea value={form.notes} onChange={set("notes")} rows={2} style={{ ...S.inp, resize: "vertical" }} />
          </Field>
          <Btn onClick={save} disabled={busy || !form.name}>
            {busy ? "جاري الحفظ..." : "حفظ"}
          </Btn>
        </Modal>
      )}
    </div>
  );
}

function blank_expense() {
  return { category: EXPENSE_CATS[0], description: "", amount: "", date: new Date().toISOString().slice(0, 10), roundId: "", notes: "" };
}

function ExpensesTab({ expenses, rounds, addExpense, updateExpense, deleteExpense }) {
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState(blank_expense());
  const [catFilter, setCatFilter] = useState("الكل");
  const [busy, setBusy] = useState(false);
  const { filtered, FilterUI } = useDateFilter(expenses);

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const displayed = useMemo(() => {
    if (catFilter === "الكل") return filtered;
    return filtered.filter((e) => e.category === catFilter);
  }, [filtered, catFilter]);

  const { slice, page, pages, setPage } = usePaged(displayed);

  function openAdd() { setForm(blank_expense()); setModal("add"); }
  function openEdit(r) { setForm({ ...r }); setModal("edit"); }

  async function save() {
    setBusy(true);
    try {
      const payload = { ...form, amount: Number(form.amount) || 0 };
      if (modal === "add") await addExpense(payload);
      else await updateExpense(form.id, payload);
      setModal(null);
    } finally {
      setBusy(false);
    }
  }

  async function del(id) {
    // eslint-disable-next-line no-alert
    if (!confirm("حذف هذه المصروفات؟")) return;
    await deleteExpense(id);
  }

  function exportExp() {
    const ws = XLSX.utils.json_to_sheet(
      displayed.map((e) => ({
        الفئة: e.category,
        الوصف: e.description,
        المبلغ: e.amount,
        التاريخ: e.date,
        ملاحظات: e.notes || "",
      }))
    );
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "المصاريف التشغيلية");
    XLSX.writeFile(wb, "Eduzah_Expenses.xlsx");
  }

  const roundOptions = [{ value: "", label: "— بدون جولة —" }, ...rounds.map((r) => ({ value: r.id, label: r.name }))];
  const catOptions = ["الكل", ...EXPENSE_CATS];

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16, flexWrap: "wrap", gap: 10 }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 18, fontWeight: 800 }}>المصاريف التشغيلية</h2>
          <p style={{ margin: "4px 0 0", fontSize: 13, color: "rgba(255,255,255,.5)" }}>الإجمالي: {EGP(sum(displayed, "amount"))}</p>
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <Btn onClick={exportExp} v="outline" sm>
            تصدير Excel
          </Btn>
          <Btn onClick={openAdd}>+ إضافة مصروف</Btn>
        </div>
      </div>

      <div style={{ display: "flex", gap: 12, marginBottom: 16, flexWrap: "wrap", alignItems: "center" }}>
        {FilterUI}
        <Select value={catFilter} onChange={setCatFilter} options={catOptions} />
      </div>

      <div style={S.card}>
        <Table
          columns={[
            { key: "date", label: "التاريخ", render: (r) => fmt(r.date) },
            { key: "category", label: "الفئة", render: (r) => <Badge color={C.danger}>{r.category}</Badge> },
            { key: "description", label: "الوصف" },
            { key: "amount", label: "المبلغ", render: (r) => EGP(r.amount) },
          ]}
          rows={slice}
          onEdit={openEdit}
          onDelete={del}
          emptyMsg="لا توجد مصاريف مسجّلة"
        />
        {pages > 1 && (
          <div style={{ display: "flex", gap: 8, justifyContent: "center", marginTop: 14 }}>
            {Array.from({ length: pages }, (_, i) => (
              <Btn key={i} sm v={i === page ? "primary" : "outline"} onClick={() => setPage(i)}>
                {i + 1}
              </Btn>
            ))}
          </div>
        )}
      </div>

      {modal && (
        <Modal title={modal === "add" ? "إضافة مصروف" : "تعديل المصروف"} onClose={() => setModal(null)}>
          <Field label="الفئة">
            <Select value={form.category} onChange={(v) => setForm((f) => ({ ...f, category: v }))} options={EXPENSE_CATS} />
          </Field>
          <Field label="الوصف *">
            <input value={form.description} onChange={set("description")} style={S.inp} placeholder="وصف المصروف" />
          </Field>
          <Field label="المبلغ (ج.م) *">
            <input type="number" min="0" value={form.amount} onChange={set("amount")} style={S.inp} placeholder="0" />
          </Field>
          <Field label="التاريخ">
            <input type="date" value={form.date} onChange={set("date")} style={S.inp} />
          </Field>
          <Field label="الجولة (اختياري)">
            <Select value={form.roundId} onChange={(v) => setForm((f) => ({ ...f, roundId: v }))} options={roundOptions} />
          </Field>
          <Field label="ملاحظات">
            <textarea value={form.notes} onChange={set("notes")} rows={2} style={{ ...S.inp, resize: "vertical" }} />
          </Field>
          <Btn onClick={save} disabled={busy || !form.description || !form.amount}>
            {busy ? "جاري الحفظ..." : "حفظ"}
          </Btn>
        </Modal>
      )}
    </div>
  );
}

function blank_salary() {
  return { employeeName: "", role: "", amount: "", month: "", date: new Date().toISOString().slice(0, 10), notes: "" };
}

function SalariesTab({ salaries, addSalary, updateSalary, deleteSalary }) {
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState(blank_salary());
  const [busy, setBusy] = useState(false);
  const { filtered, FilterUI } = useDateFilter(salaries);
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  function openAdd() { setForm(blank_salary()); setModal("add"); }
  function openEdit(r) { setForm({ ...r }); setModal("edit"); }

  async function save() {
    setBusy(true);
    try {
      const payload = { ...form, amount: Number(form.amount) || 0 };
      if (modal === "add") await addSalary(payload);
      else await updateSalary(form.id, payload);
      setModal(null);
    } finally {
      setBusy(false);
    }
  }

  async function del(id) {
    // eslint-disable-next-line no-alert
    if (!confirm("حذف سجل الراتب؟")) return;
    await deleteSalary(id);
  }

  function exportSal() {
    const ws = XLSX.utils.json_to_sheet(
      filtered.map((s) => ({
        "اسم الموظف": s.employeeName,
        المنصب: s.role,
        المبلغ: s.amount,
        الشهر: s.month,
        التاريخ: s.date,
        ملاحظات: s.notes || "",
      }))
    );
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "الرواتب");
    XLSX.writeFile(wb, "Eduzah_Salaries.xlsx");
  }

  const monthOptions = MONTHS.map((m, i) => ({
    value: `${new Date().getFullYear()}-${String(i + 1).padStart(2, "0")}`,
    label: m,
  }));

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16, flexWrap: "wrap", gap: 10 }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 18, fontWeight: 800 }}>الرواتب</h2>
          <p style={{ margin: "4px 0 0", fontSize: 13, color: "rgba(255,255,255,.5)" }}>إجمالي: {EGP(sum(filtered, "amount"))}</p>
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <Btn onClick={exportSal} v="outline" sm>
            تصدير Excel
          </Btn>
          <Btn onClick={openAdd}>+ إضافة راتب</Btn>
        </div>
      </div>
      <div style={{ marginBottom: 16 }}>{FilterUI}</div>
      <div style={S.card}>
        <Table
          columns={[
            { key: "date", label: "التاريخ", render: (r) => fmt(r.date) },
            { key: "employeeName", label: "الموظف" },
            { key: "role", label: "المنصب" },
            { key: "month", label: "الشهر" },
            { key: "amount", label: "الراتب", render: (r) => EGP(r.amount) },
          ]}
          rows={filtered}
          onEdit={openEdit}
          onDelete={del}
          emptyMsg="لا توجد رواتب مسجّلة"
        />
      </div>

      {modal && (
        <Modal title={modal === "add" ? "إضافة راتب" : "تعديل الراتب"} onClose={() => setModal(null)}>
          <Field label="اسم الموظف *">
            <input value={form.employeeName} onChange={set("employeeName")} style={S.inp} placeholder="الاسم الكامل" />
          </Field>
          <Field label="المنصب">
            <input value={form.role} onChange={set("role")} style={S.inp} placeholder="مثال: مطور، مسوّق..." />
          </Field>
          <Field label="المبلغ (ج.م) *">
            <input type="number" min="0" value={form.amount} onChange={set("amount")} style={S.inp} placeholder="0" />
          </Field>
          <Field label="الشهر">
            <Select value={form.month} onChange={(v) => setForm((f) => ({ ...f, month: v }))} options={[{ value: "", label: "—" }, ...monthOptions]} />
          </Field>
          <Field label="التاريخ">
            <input type="date" value={form.date} onChange={set("date")} style={S.inp} />
          </Field>
          <Field label="ملاحظات">
            <textarea value={form.notes} onChange={set("notes")} rows={2} style={{ ...S.inp, resize: "vertical" }} />
          </Field>
          <Btn onClick={save} disabled={busy || !form.employeeName || !form.amount}>
            {busy ? "جاري الحفظ..." : "حفظ"}
          </Btn>
        </Modal>
      )}
    </div>
  );
}

function InstructorPaymentsTab({ instructorPayments, rounds, addInstructorPayment, updateInstructorPayment, deleteInstructorPayment }) {
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState({
    instructorName: "",
    roundId: "",
    percentage: "",
    calculatedAmount: "",
    date: new Date().toISOString().slice(0, 10),
    paid: false,
    notes: "",
  });
  const [busy, setBusy] = useState(false);

  const roundOptions = [{ value: "", label: "— اختر جولة —" }, ...rounds.map((r) => ({ value: r.id, label: r.name }))];

  function recalc(newForm) {
    if (newForm.roundId && newForm.percentage) {
      const round = rounds.find((r) => r.id === newForm.roundId);
      if (round) {
        const calc = ((Number(round.totalRevenue) || 0) * (Number(newForm.percentage) || 0)) / 100;
        return { ...newForm, calculatedAmount: calc.toFixed(2) };
      }
    }
    return newForm;
  }

  function openAdd() {
    setForm({ instructorName: "", roundId: "", percentage: "", calculatedAmount: "", date: new Date().toISOString().slice(0, 10), paid: false, notes: "" });
    setModal("add");
  }
  function openEdit(r) {
    setForm({ ...r });
    setModal("edit");
  }

  function handleChange(k, v) {
    setForm((f) => recalc({ ...f, [k]: v }));
  }

  async function save() {
    setBusy(true);
    try {
      const payload = { ...form, percentage: Number(form.percentage) || 0, calculatedAmount: Number(form.calculatedAmount) || 0 };
      if (modal === "add") await addInstructorPayment(payload);
      else await updateInstructorPayment(form.id, payload);
      setModal(null);
    } finally {
      setBusy(false);
    }
  }

  async function del(id) {
    // eslint-disable-next-line no-alert
    if (!confirm("حذف؟")) return;
    await deleteInstructorPayment(id);
  }
  async function togglePaid(row) {
    await updateInstructorPayment(row.id, { paid: !row.paid });
  }

  function exportIns() {
    const ws = XLSX.utils.json_to_sheet(
      instructorPayments.map((p) => ({
        المدرب: p.instructorName,
        الجولة: rounds.find((r) => r.id === p.roundId)?.name || p.roundId,
        "النسبة %": p.percentage,
        "المبلغ المحسوب": p.calculatedAmount,
        التاريخ: p.date,
        "مدفوع؟": p.paid ? "نعم" : "لا",
      }))
    );
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "مدفوعات المدربين");
    XLSX.writeFile(wb, "Eduzah_InstructorPayments.xlsx");
  }

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16, flexWrap: "wrap", gap: 10 }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 18, fontWeight: 800 }}>نسب المدربين</h2>
          <p style={{ margin: "4px 0 0", fontSize: 13, color: "rgba(255,255,255,.5)" }}>إجمالي: {EGP(sum(instructorPayments, "calculatedAmount"))}</p>
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <Btn onClick={exportIns} v="outline" sm>
            تصدير Excel
          </Btn>
          <Btn onClick={openAdd}>+ إضافة</Btn>
        </div>
      </div>
      <div style={S.card}>
        <Table
          columns={[
            { key: "date", label: "التاريخ", render: (r) => fmt(r.date) },
            { key: "instructorName", label: "المدرب" },
            { key: "roundId", label: "الجولة", render: (r) => rounds.find((rd) => rd.id === r.roundId)?.name || "—" },
            { key: "percentage", label: "النسبة", render: (r) => `${r.percentage || 0}%` },
            { key: "calculatedAmount", label: "المبلغ", render: (r) => EGP(r.calculatedAmount) },
            {
              key: "paid",
              label: "الحالة",
              render: (r) => (
                <button onClick={() => togglePaid(r)} style={{ background: "none", border: "none", cursor: "pointer", padding: 0 }}>
                  <Badge color={r.paid ? C.success : C.warning}>{r.paid ? "✓ مدفوع" : "⏳ معلّق"}</Badge>
                </button>
              ),
            },
          ]}
          rows={instructorPayments}
          onEdit={openEdit}
          onDelete={del}
          emptyMsg="لا توجد مدفوعات للمدربين"
        />
      </div>

      {modal && (
        <Modal title={modal === "add" ? "إضافة مدفوعة مدرب" : "تعديل"} onClose={() => setModal(null)}>
          <Field label="اسم المدرب *">
            <input value={form.instructorName} onChange={(e) => handleChange("instructorName", e.target.value)} style={S.inp} />
          </Field>
          <Field label="الجولة">
            <Select value={form.roundId} onChange={(v) => handleChange("roundId", v)} options={roundOptions} />
          </Field>
          <Field label="النسبة % *">
            <input type="number" min="0" max="100" value={form.percentage} onChange={(e) => handleChange("percentage", e.target.value)} style={S.inp} placeholder="0" />
          </Field>
          <Field label="المبلغ المحسوب (ج.م)">
            <input type="number" min="0" value={form.calculatedAmount} onChange={(e) => handleChange("calculatedAmount", e.target.value)} style={S.inp} placeholder="يُحسب تلقائيًا" />
          </Field>
          <Field label="التاريخ">
            <input type="date" value={form.date} onChange={(e) => handleChange("date", e.target.value)} style={S.inp} />
          </Field>
          <Field label="الحالة">
            <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
              <input type="checkbox" checked={!!form.paid} onChange={(e) => setForm((f) => ({ ...f, paid: e.target.checked }))} />
              <span style={{ fontSize: 13 }}>تم الدفع</span>
            </label>
          </Field>
          <Field label="ملاحظات">
            <textarea value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} rows={2} style={{ ...S.inp, resize: "vertical" }} />
          </Field>
          <Btn onClick={save} disabled={busy || !form.instructorName}>
            {busy ? "جاري الحفظ..." : "حفظ"}
          </Btn>
        </Modal>
      )}
    </div>
  );
}

function MentorPaymentsTab({ mentorPayments, rounds, addMentorPayment, updateMentorPayment, deleteMentorPayment }) {
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState({
    mentorName: "",
    roundId: "",
    percentage: "",
    calculatedAmount: "",
    date: new Date().toISOString().slice(0, 10),
    paid: false,
    notes: "",
  });
  const [busy, setBusy] = useState(false);

  const roundOptions = [{ value: "", label: "— اختر جولة —" }, ...rounds.map((r) => ({ value: r.id, label: r.name }))];

  function recalc(newForm) {
    if (newForm.roundId && newForm.percentage) {
      const round = rounds.find((r) => r.id === newForm.roundId);
      if (round) {
        const calc = ((Number(round.totalRevenue) || 0) * (Number(newForm.percentage) || 0)) / 100;
        return { ...newForm, calculatedAmount: calc.toFixed(2) };
      }
    }
    return newForm;
  }

  function openAdd() {
    setForm({ mentorName: "", roundId: "", percentage: "", calculatedAmount: "", date: new Date().toISOString().slice(0, 10), paid: false, notes: "" });
    setModal("add");
  }
  function openEdit(r) {
    setForm({ ...r });
    setModal("edit");
  }
  function handleChange(k, v) {
    setForm((f) => recalc({ ...f, [k]: v }));
  }

  async function save() {
    setBusy(true);
    try {
      const payload = { ...form, percentage: Number(form.percentage) || 0, calculatedAmount: Number(form.calculatedAmount) || 0 };
      if (modal === "add") await addMentorPayment(payload);
      else await updateMentorPayment(form.id, payload);
      setModal(null);
    } finally {
      setBusy(false);
    }
  }

  async function del(id) {
    // eslint-disable-next-line no-alert
    if (!confirm("حذف؟")) return;
    await deleteMentorPayment(id);
  }
  async function togglePaid(row) {
    await updateMentorPayment(row.id, { paid: !row.paid });
  }

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16, flexWrap: "wrap", gap: 10 }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 18, fontWeight: 800 }}>نسب المرشدين</h2>
          <p style={{ margin: "4px 0 0", fontSize: 13, color: "rgba(255,255,255,.5)" }}>إجمالي: {EGP(sum(mentorPayments, "calculatedAmount"))}</p>
        </div>
        <Btn onClick={openAdd}>+ إضافة</Btn>
      </div>
      <div style={S.card}>
        <Table
          columns={[
            { key: "date", label: "التاريخ", render: (r) => fmt(r.date) },
            { key: "mentorName", label: "المرشد" },
            { key: "roundId", label: "الجولة", render: (r) => rounds.find((rd) => rd.id === r.roundId)?.name || "—" },
            { key: "percentage", label: "النسبة", render: (r) => `${r.percentage || 0}%` },
            { key: "calculatedAmount", label: "المبلغ", render: (r) => EGP(r.calculatedAmount) },
            {
              key: "paid",
              label: "الحالة",
              render: (r) => (
                <button onClick={() => togglePaid(r)} style={{ background: "none", border: "none", cursor: "pointer", padding: 0 }}>
                  <Badge color={r.paid ? C.success : C.warning}>{r.paid ? "✓ مدفوع" : "⏳ معلّق"}</Badge>
                </button>
              ),
            },
          ]}
          rows={mentorPayments}
          onEdit={openEdit}
          onDelete={del}
          emptyMsg="لا توجد مدفوعات للمرشدين"
        />
      </div>

      {modal && (
        <Modal title={modal === "add" ? "إضافة مدفوعة مرشد" : "تعديل"} onClose={() => setModal(null)}>
          <Field label="اسم المرشد *">
            <input value={form.mentorName} onChange={(e) => handleChange("mentorName", e.target.value)} style={S.inp} />
          </Field>
          <Field label="الجولة">
            <Select value={form.roundId} onChange={(v) => handleChange("roundId", v)} options={roundOptions} />
          </Field>
          <Field label="النسبة %">
            <input type="number" min="0" max="100" value={form.percentage} onChange={(e) => handleChange("percentage", e.target.value)} style={S.inp} placeholder="0" />
          </Field>
          <Field label="المبلغ (ج.م)">
            <input type="number" min="0" value={form.calculatedAmount} onChange={(e) => handleChange("calculatedAmount", e.target.value)} style={S.inp} placeholder="يُحسب تلقائيًا" />
          </Field>
          <Field label="التاريخ">
            <input type="date" value={form.date} onChange={(e) => handleChange("date", e.target.value)} style={S.inp} />
          </Field>
          <Field label="الحالة">
            <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
              <input type="checkbox" checked={!!form.paid} onChange={(e) => setForm((f) => ({ ...f, paid: e.target.checked }))} />
              <span style={{ fontSize: 13 }}>تم الدفع</span>
            </label>
          </Field>
          <Field label="ملاحظات">
            <textarea value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} rows={2} style={{ ...S.inp, resize: "vertical" }} />
          </Field>
          <Btn onClick={save} disabled={busy || !form.mentorName}>
            {busy ? "جاري الحفظ..." : "حفظ"}
          </Btn>
        </Modal>
      )}
    </div>
  );
}

function blank_withdrawal() {
  return { employeeName: "", amount: "", date: new Date().toISOString().slice(0, 10), reason: "", notes: "" };
}

function WithdrawalsTab({ withdrawals, addWithdrawal, updateWithdrawal, deleteWithdrawal }) {
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState(blank_withdrawal());
  const [busy, setBusy] = useState(false);
  const { filtered, FilterUI } = useDateFilter(withdrawals);
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  function openAdd() { setForm(blank_withdrawal()); setModal("add"); }
  function openEdit(r) { setForm({ ...r }); setModal("edit"); }

  async function save() {
    setBusy(true);
    try {
      const payload = { ...form, amount: Number(form.amount) || 0 };
      if (modal === "add") await addWithdrawal(payload);
      else await updateWithdrawal(form.id, payload);
      setModal(null);
    } finally {
      setBusy(false);
    }
  }

  async function del(id) {
    // eslint-disable-next-line no-alert
    if (!confirm("حذف السحب؟")) return;
    await deleteWithdrawal(id);
  }

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16, flexWrap: "wrap", gap: 10 }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 18, fontWeight: 800 }}>سحوبات الموظفين</h2>
          <p style={{ margin: "4px 0 0", fontSize: 13, color: "rgba(255,255,255,.5)" }}>إجمالي: {EGP(sum(filtered, "amount"))}</p>
        </div>
        <Btn onClick={openAdd}>+ إضافة سحب</Btn>
      </div>
      <div style={{ marginBottom: 16 }}>{FilterUI}</div>
      <div style={S.card}>
        <Table
          columns={[
            { key: "date", label: "التاريخ", render: (r) => fmt(r.date) },
            { key: "employeeName", label: "الموظف" },
            { key: "amount", label: "المبلغ", render: (r) => EGP(r.amount) },
            { key: "reason", label: "السبب" },
          ]}
          rows={filtered}
          onEdit={openEdit}
          onDelete={del}
          emptyMsg="لا توجد سحوبات مسجّلة"
        />
      </div>

      {modal && (
        <Modal title={modal === "add" ? "إضافة سحب" : "تعديل السحب"} onClose={() => setModal(null)}>
          <Field label="اسم الموظف *">
            <input value={form.employeeName} onChange={set("employeeName")} style={S.inp} />
          </Field>
          <Field label="المبلغ (ج.م) *">
            <input type="number" min="0" value={form.amount} onChange={set("amount")} style={S.inp} placeholder="0" />
          </Field>
          <Field label="التاريخ">
            <input type="date" value={form.date} onChange={set("date")} style={S.inp} />
          </Field>
          <Field label="السبب">
            <input value={form.reason} onChange={set("reason")} style={S.inp} placeholder="سبب السحب" />
          </Field>
          <Field label="ملاحظات">
            <textarea value={form.notes} onChange={set("notes")} rows={2} style={{ ...S.inp, resize: "vertical" }} />
          </Field>
          <Btn onClick={save} disabled={busy || !form.employeeName || !form.amount}>
            {busy ? "جاري الحفظ..." : "حفظ"}
          </Btn>
        </Modal>
      )}
    </div>
  );
}

function blank_marketing() {
  return { platform: MARKETING_PLATFORMS[0], description: "", amount: "", date: new Date().toISOString().slice(0, 10), roundId: "", notes: "" };
}

function MarketingTab({ marketing, rounds, addMarketing, updateMarketing, deleteMarketing }) {
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState(blank_marketing());
  const [busy, setBusy] = useState(false);
  const { filtered, FilterUI } = useDateFilter(marketing);
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  function openAdd() { setForm(blank_marketing()); setModal("add"); }
  function openEdit(r) { setForm({ ...r }); setModal("edit"); }

  async function save() {
    setBusy(true);
    try {
      const payload = { ...form, amount: Number(form.amount) || 0 };
      if (modal === "add") await addMarketing(payload);
      else await updateMarketing(form.id, payload);
      setModal(null);
    } finally {
      setBusy(false);
    }
  }

  async function del(id) {
    // eslint-disable-next-line no-alert
    if (!confirm("حذف؟")) return;
    await deleteMarketing(id);
  }

  function exportMkt() {
    const ws = XLSX.utils.json_to_sheet(
      filtered.map((m) => ({
        المنصة: m.platform,
        الوصف: m.description,
        المبلغ: m.amount,
        التاريخ: m.date,
        ملاحظات: m.notes || "",
      }))
    );
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "مصاريف التسويق");
    XLSX.writeFile(wb, "Eduzah_Marketing.xlsx");
  }

  const roundOptions = [{ value: "", label: "— بدون جولة —" }, ...rounds.map((r) => ({ value: r.id, label: r.name }))];

  const byPlatform = MARKETING_PLATFORMS.map((p) => ({
    label: p,
    value: sum(filtered.filter((m) => m.platform === p), "amount"),
    color: [C.red, C.orange, C.success, C.purple, "#38bdf8", "#f59e0b", "#a78bfa"][MARKETING_PLATFORMS.indexOf(p)],
  })).filter((p) => p.value > 0);

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16, flexWrap: "wrap", gap: 10 }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 18, fontWeight: 800 }}>مصاريف التسويق</h2>
          <p style={{ margin: "4px 0 0", fontSize: 13, color: "rgba(255,255,255,.5)" }}>إجمالي: {EGP(sum(filtered, "amount"))}</p>
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <Btn onClick={exportMkt} v="outline" sm>
            تصدير Excel
          </Btn>
          <Btn onClick={openAdd}>+ إضافة</Btn>
        </div>
      </div>

      {byPlatform.length > 0 && (
        <div style={{ ...S.card, marginBottom: 20 }}>
          <h3 style={{ margin: "0 0 14px", fontSize: 14, fontWeight: 700 }}>توزيع التسويق حسب المنصة</h3>
          <BarChart data={byPlatform} height={120} />
        </div>
      )}

      <div style={{ marginBottom: 16 }}>{FilterUI}</div>
      <div style={S.card}>
        <Table
          columns={[
            { key: "date", label: "التاريخ", render: (r) => fmt(r.date) },
            { key: "platform", label: "المنصة", render: (r) => <Badge color={C.purple}>{r.platform}</Badge> },
            { key: "description", label: "الوصف" },
            { key: "amount", label: "المبلغ", render: (r) => EGP(r.amount) },
          ]}
          rows={filtered}
          onEdit={openEdit}
          onDelete={del}
          emptyMsg="لا توجد مصاريف تسويق مسجّلة"
        />
      </div>

      {modal && (
        <Modal title={modal === "add" ? "إضافة مصروف تسويق" : "تعديل"} onClose={() => setModal(null)}>
          <Field label="المنصة">
            <Select value={form.platform} onChange={(v) => setForm((f) => ({ ...f, platform: v }))} options={MARKETING_PLATFORMS} />
          </Field>
          <Field label="الوصف *">
            <input value={form.description} onChange={set("description")} style={S.inp} placeholder="وصف الحملة الإعلانية" />
          </Field>
          <Field label="المبلغ (ج.م) *">
            <input type="number" min="0" value={form.amount} onChange={set("amount")} style={S.inp} placeholder="0" />
          </Field>
          <Field label="التاريخ">
            <input type="date" value={form.date} onChange={set("date")} style={S.inp} />
          </Field>
          <Field label="الجولة (اختياري)">
            <Select value={form.roundId} onChange={(v) => setForm((f) => ({ ...f, roundId: v }))} options={roundOptions} />
          </Field>
          <Field label="ملاحظات">
            <textarea value={form.notes} onChange={set("notes")} rows={2} style={{ ...S.inp, resize: "vertical" }} />
          </Field>
          <Btn onClick={save} disabled={busy || !form.description || !form.amount}>
            {busy ? "جاري الحفظ..." : "حفظ"}
          </Btn>
        </Modal>
      )}
    </div>
  );
}

const TABS = [
  { key: "overview", label: "📊 نظرة عامة" },
  { key: "rounds", label: "🎯 الجولات" },
  { key: "expenses", label: "🔧 المصاريف" },
  { key: "salaries", label: "👥 الرواتب" },
  { key: "instructors", label: "🎓 المدربون" },
  { key: "mentors", label: "🧑‍💼 المرشدون" },
  { key: "withdrawals", label: "💸 السحوبات" },
  { key: "marketing", label: "📣 التسويق" },
];

export default function AccountingDashboard() {
  const {
    accountingUser,
    logout,
    rounds,
    expenses,
    salaries,
    withdrawals,
    marketing,
    instructorPayments,
    mentorPayments,
    addRound,
    updateRound,
    deleteRound,
    addExpense,
    updateExpense,
    deleteExpense,
    addSalary,
    updateSalary,
    deleteSalary,
    addWithdrawal,
    updateWithdrawal,
    deleteWithdrawal,
    addMarketing,
    updateMarketing,
    deleteMarketing,
    addInstructorPayment,
    updateInstructorPayment,
    deleteInstructorPayment,
    addMentorPayment,
    updateMentorPayment,
    deleteMentorPayment,
  } = useAccounting();

  const [tab, setTab] = useState("overview");

  return (
    <div style={S.page}>
      <div style={{ background: "rgba(26,10,46,.95)", borderBottom: "1px solid rgba(255,255,255,.1)", backdropFilter: "blur(16px)", position: "sticky", top: 0, zIndex: 100 }}>
        <div style={{ maxWidth: 1280, margin: "0 auto", padding: "0 20px", display: "flex", alignItems: "center", justifyContent: "space-between", height: 60 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: "linear-gradient(135deg,#ff5c7a,#7d3d9e)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, flexShrink: 0 }}>
              💼
            </div>
            <div>
              <div style={{ fontSize: 15, fontWeight: 800, color: "#fff", lineHeight: 1.2 }}>النظام المالي</div>
              <div style={{ fontSize: 11, color: "rgba(255,255,255,.45)" }}>مرحبًا، {accountingUser?.name}</div>
            </div>
          </div>
          <Btn sm v="outline" onClick={logout}>
            تسجيل خروج
          </Btn>
        </div>
        <div style={{ maxWidth: 1280, margin: "0 auto", padding: "0 20px", overflowX: "auto", display: "flex", gap: 2 }}>
          {TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              style={{
                padding: "10px 16px",
                background: "none",
                border: "none",
                borderBottom: `2px solid ${tab === t.key ? C.red : "transparent"}`,
                color: tab === t.key ? "#fff" : "rgba(255,255,255,.5)",
                fontFamily: font,
                fontWeight: tab === t.key ? 700 : 500,
                fontSize: 13,
                cursor: "pointer",
                whiteSpace: "nowrap",
                transition: "all .18s",
                flexShrink: 0,
              }}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <div style={S.wrap}>
        <div style={{ paddingTop: 28 }}>
          {tab === "overview" && <OverviewTab rounds={rounds} expenses={expenses} salaries={salaries} withdrawals={withdrawals} marketing={marketing} instructorPayments={instructorPayments} mentorPayments={mentorPayments} />}
          {tab === "rounds" && <RoundsTab rounds={rounds} addRound={addRound} updateRound={updateRound} deleteRound={deleteRound} />}
          {tab === "expenses" && <ExpensesTab expenses={expenses} rounds={rounds} addExpense={addExpense} updateExpense={updateExpense} deleteExpense={deleteExpense} />}
          {tab === "salaries" && <SalariesTab salaries={salaries} addSalary={addSalary} updateSalary={updateSalary} deleteSalary={deleteSalary} />}
          {tab === "instructors" && <InstructorPaymentsTab instructorPayments={instructorPayments} rounds={rounds} addInstructorPayment={addInstructorPayment} updateInstructorPayment={updateInstructorPayment} deleteInstructorPayment={deleteInstructorPayment} />}
          {tab === "mentors" && <MentorPaymentsTab mentorPayments={mentorPayments} rounds={rounds} addMentorPayment={addMentorPayment} updateMentorPayment={updateMentorPayment} deleteMentorPayment={deleteMentorPayment} />}
          {tab === "withdrawals" && <WithdrawalsTab withdrawals={withdrawals} addWithdrawal={addWithdrawal} updateWithdrawal={updateWithdrawal} deleteWithdrawal={deleteWithdrawal} />}
          {tab === "marketing" && <MarketingTab marketing={marketing} rounds={rounds} addMarketing={addMarketing} updateMarketing={updateMarketing} deleteMarketing={deleteMarketing} />}
        </div>
      </div>
    </div>
  );
}

