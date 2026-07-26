import { useState, useMemo } from "react";
import { Card, Btn } from "../../../components/UI";
import { C } from "../../../theme";
import { useLeads } from "../../../context/LeadsContext";
import { useAuth } from "../../../context/AuthContext";
import { useLeadStatus } from "../../../context/LeadStatusContext";
import { useLang } from "../../../context/LangContext";
import { leadSourceLabel } from "../../../constants/leadSource";
import LeadStatusBadge from "../../../components/crm/LeadStatusBadge";
import AddLeadModal from "./AddLeadModal";

const th = { textAlign: "start", fontSize: 10.5, letterSpacing: 0.5, textTransform: "uppercase", color: C.muted, fontWeight: 700, padding: "12px 14px", borderBottom: `1px solid ${C.border}`, whiteSpace: "nowrap" };
const td = { padding: "11px 14px", fontSize: 12.5, borderBottom: "1px solid rgba(255,255,255,.06)", verticalAlign: "middle", whiteSpace: "nowrap" };

export default function LeadsListTab() {
  const { leads, loading } = useLeads();
  const { users } = useAuth();
  // Leads don't carry a businessUnitId yet (that lands with the Customer/Engagement
  // migration), so only global statuses are offered here for now — Business-Unit-
  // specific statuses become selectable once a lead can be linked to a catalog node.
  const { globalStatuses } = useLeadStatus();
  const { lang } = useLang();
  const ar = lang === "ar";
  const tx = (a, e) => (ar ? a : e);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [showAdd, setShowAdd] = useState(false);

  const employeeName = (uid) => {
    if (!uid) return tx("غير معيّن", "Unassigned");
    const u = users.find((x) => x.id === uid);
    return u ? (u.name || u.email) : tx("غير معيّن", "Unassigned");
  };

  const counts = useMemo(() => {
    const c = { all: leads.length };
    for (const s of globalStatuses) c[s.id] = leads.filter((l) => l.statusId === s.id).length;
    return c;
  }, [leads, globalStatuses]);

  const filtered = useMemo(() => {
    let rows = leads;
    if (statusFilter !== "all") rows = rows.filter((l) => l.statusId === statusFilter);
    const q = search.trim().toLowerCase();
    if (q) {
      rows = rows.filter((l) =>
        (l.fullName || "").toLowerCase().includes(q) ||
        (l.phone || "").includes(q) ||
        (l.email || "").toLowerCase().includes(q),
      );
    }
    return [...rows].sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || ""));
  }, [leads, statusFilter, search]);

  const fmtDate = (iso) => iso ? new Date(iso).toLocaleDateString(ar ? "ar-EG" : "en-US", { day: "numeric", month: "short" }) : "—";

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14, flexWrap: "wrap", gap: 10 }}>
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={tx("بحث بالاسم أو الهاتف أو البريد…", "Search name, phone, email…")}
          style={{ background: "rgba(255,255,255,.06)", border: `1.5px solid ${C.border}`, borderRadius: 10, padding: "9px 13px", color: "#fff", fontFamily: "'Cairo',sans-serif", fontSize: 12.5, outline: "none", minWidth: 220 }}
        />
        <Btn v="primary" onClick={() => setShowAdd(true)}>{tx("+ إضافة عميل محتمل", "+ Add Lead")}</Btn>
      </div>

      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 14 }}>
        <button onClick={() => setStatusFilter("all")} style={pillStyle(statusFilter === "all", C.purple)}>
          {tx("الكل", "All")} <span style={{ opacity: 0.7 }}>({counts.all})</span>
        </button>
        {globalStatuses.map((s) => (
          <button key={s.id} onClick={() => setStatusFilter(s.id)} style={pillStyle(statusFilter === s.id, s.color || C.purple, isLightColor(s.color))}>
            {ar ? s.name_ar : s.name_en} <span style={{ opacity: 0.7 }}>({counts[s.id] || 0})</span>
          </button>
        ))}
      </div>

      {loading ? (
        <Card style={{ padding: 32, textAlign: "center" }}><div style={{ color: C.muted }}>{tx("جاري التحميل…", "Loading…")}</div></Card>
      ) : filtered.length === 0 ? (
        <Card style={{ padding: 32, textAlign: "center" }}><div style={{ color: C.muted }}>{tx("لا يوجد عملاء محتملون بعد", "No leads yet")}</div></Card>
      ) : (
        <Card style={{ padding: 0, overflow: "hidden" }}>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 880 }}>
              <thead>
                <tr>
                  <th style={th}>{tx("العميل المحتمل", "Lead")}</th>
                  <th style={th}>{tx("الهاتف", "Phone")}</th>
                  <th style={th}>{tx("الكورس", "Course")}</th>
                  <th style={th}>{tx("المصدر", "Source")}</th>
                  <th style={th}>{tx("الموظف المسؤول", "Assigned")}</th>
                  <th style={th}>{tx("الحالة", "Status")}</th>
                  <th style={th}>{tx("المتابعة القادمة", "Next follow-up")}</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((l) => (
                  <tr key={l.id}>
                    <td style={td}>
                      <div style={{ fontWeight: 800, color: "#fff" }}>{l.fullName || "—"}</div>
                      {(l.university || l.academicYear) && (
                        <div style={{ fontSize: 11, color: C.muted, marginTop: 2 }}>
                          {[l.university, l.academicYear].filter(Boolean).join(" · ")}
                        </div>
                      )}
                    </td>
                    <td style={td}>{l.phone || "—"}</td>
                    <td style={td}>{l.courseName || tx("لم يتحدد", "—")}</td>
                    <td style={td}>{leadSourceLabel(l.leadSource, lang)}</td>
                    <td style={td}>{employeeName(l.assignedTo)}</td>
                    <td style={td}><LeadStatusBadge statusId={l.statusId} /></td>
                    <td style={td}>{fmtDate(l.nextFollowUpDate)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {showAdd && <AddLeadModal onClose={() => setShowAdd(false)} />}
    </div>
  );
}

// Status colors are now admin-defined data, not fixed keys — so instead of a
// hardcoded set of "light" statuses, compute it from the actual color's luminance.
function isLightColor(hex) {
  if (!hex || !/^#[0-9a-f]{6}$/i.test(hex)) return false;
  const r = parseInt(hex.slice(1, 3), 16), g = parseInt(hex.slice(3, 5), 16), b = parseInt(hex.slice(5, 7), 16);
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255 > 0.6;
}

function pillStyle(active, color, lightBg) {
  return {
    padding: "6px 13px", borderRadius: 99, border: "none", cursor: "pointer",
    fontWeight: 800, fontSize: 11.5, fontFamily: "'Cairo',sans-serif",
    background: active ? color : "rgba(255,255,255,.06)",
    color: active ? (lightBg ? "#2a1a00" : "#fff") : C.muted,
    transition: "all .2s",
  };
}
