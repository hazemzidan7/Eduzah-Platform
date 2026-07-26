import { useMemo } from "react";
import { Card, Btn } from "../../../../../components/UI";
import { C } from "../../../../../theme";
import { useLang } from "../../../../../context/LangContext";

function classifyRecord(record, index, wiz) {
  const requiredFields = wiz.profileVersion?.requiredFields || [];
  const missing = requiredFields.filter((f) => !record[f]);
  if (missing.length > 0) return { status: "missingRequired", detail: missing.join(", ") };

  const decision = wiz.duplicateDecisions[index];
  if (decision === "skip") return { status: "skipped", detail: null };
  if (decision === "merge") return { status: "duplicateMerge", detail: null };

  for (const [field, dictionaryType] of [["statusRaw", "status"], ["programRaw", "program"]]) {
    if (record[field]) {
      const resolved = wiz.valueMap[`${dictionaryType}:${record[field]}`];
      if (!resolved || !resolved.targetId) return { status: "unknownValue", detail: record[field] };
    }
  }
  return { status: "ready", detail: null };
}

const STATUS_META = {
  ready: { ar: "جاهز", en: "Ready", color: "#34d399" },
  duplicateMerge: { ar: "سيتم الدمج", en: "Will merge", color: "#7d3d9e" },
  skipped: { ar: "متخطى", en: "Skipped", color: "#9ca3af" },
  missingRequired: { ar: "حقل مطلوب ناقص", en: "Missing required field", color: "#f87171" },
  unknownValue: { ar: "قيمة غير محلولة", en: "Unresolved value", color: "#fbbf24" },
};

export default function ValidationSummaryStep({ wiz, onBack }) {
  const { lang } = useLang();
  const ar = lang === "ar";
  const tx = (a, e) => (ar ? a : e);

  const classified = useMemo(
    () => wiz.cleanedRecords.map((r, i) => ({ record: r, index: i, ...classifyRecord(r, i, wiz) })),
    [wiz],
  );

  const counts = classified.reduce((acc, c) => { acc[c.status] = (acc[c.status] || 0) + 1; return acc; }, {});

  return (
    <div>
      <h3 style={{ fontWeight: 800, fontSize: 15, marginTop: 0 }}>{tx("المراجعة النهائية والمعاينة", "Final Review & Preview")}</h3>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(120px,1fr))", gap: 10, marginBottom: 18 }}>
        {Object.entries(STATUS_META).map(([key, meta]) => (
          <Card key={key} style={{ padding: "12px 14px" }}>
            <div style={{ fontSize: 20, fontWeight: 900, color: meta.color }}>{counts[key] || 0}</div>
            <div style={{ fontSize: 11.5, color: C.muted }}>{ar ? meta.ar : meta.en}</div>
          </Card>
        ))}
      </div>

      <div style={{ overflowX: "auto", marginBottom: 18 }}>
        <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 640 }}>
          <thead>
            <tr>
              <th style={th}>{tx("الاسم", "Name")}</th>
              <th style={th}>{tx("الهاتف", "Phone")}</th>
              <th style={th}>{tx("الحالة", "Status")}</th>
              <th style={th}>{tx("التفاصيل", "Detail")}</th>
            </tr>
          </thead>
          <tbody>
            {classified.slice(0, 100).map((c) => {
              const meta = STATUS_META[c.status];
              return (
                <tr key={c.index}>
                  <td style={td}>{c.record.fullName || "—"}</td>
                  <td style={td}>{c.record.phone || "—"}</td>
                  <td style={{ ...td, color: meta.color, fontWeight: 700 }}>{ar ? meta.ar : meta.en}</td>
                  <td style={td}>{c.detail || "—"}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {classified.length > 100 && (
          <div style={{ fontSize: 11.5, color: C.muted, padding: "8px 4px" }}>
            {tx(`+ ${classified.length - 100} سجل إضافي`, `+ ${classified.length - 100} more records`)}
          </div>
        )}
      </div>

      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
        <Btn v="ghost" onClick={onBack}>{tx("رجوع", "Back")}</Btn>
        <Btn v="success" disabled title={tx("سيتم تفعيله في المرحلة التالية (تنفيذ الاستيراد)", "Enabled in the next phase (Commit)")}>
          {tx("تنفيذ الاستيراد", "Commit Import")}
        </Btn>
        <span style={{ fontSize: 11.5, color: C.muted }}>
          {tx("تنفيذ الاستيراد الفعلي غير متاح بعد — هذه معاينة فقط", "Actually committing isn't available yet — this is a preview only")}
        </span>
      </div>
    </div>
  );
}

const th = { textAlign: "start", fontSize: 10.5, letterSpacing: 0.5, textTransform: "uppercase", color: "#9ca3af", fontWeight: 700, padding: "10px 12px", borderBottom: "1px solid rgba(255,255,255,.14)" };
const td = { padding: "9px 12px", fontSize: 12.5, borderBottom: "1px solid rgba(255,255,255,.06)" };
