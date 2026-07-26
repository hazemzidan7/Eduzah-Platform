import { Card } from "../../../../components/UI";
import { C } from "../../../../theme";
import { useLang } from "../../../../context/LangContext";
import { useImportBatches } from "../../../../context/ImportBatchContext";
import { useImportProfiles } from "../../../../context/ImportProfileContext";

const th = { textAlign: "start", fontSize: 10.5, letterSpacing: 0.5, textTransform: "uppercase", color: C.muted, fontWeight: 700, padding: "12px 14px", borderBottom: `1px solid ${C.border}` };
const td = { padding: "11px 14px", fontSize: 12.5, borderBottom: "1px solid rgba(255,255,255,.06)" };

export default function ImportHistoryList() {
  const { lang } = useLang();
  const ar = lang === "ar";
  const tx = (a, e) => (ar ? a : e);
  const { batches, loading } = useImportBatches();
  const { profileById } = useImportProfiles();

  const fmt = (iso) => iso ? new Date(iso).toLocaleDateString(ar ? "ar-EG" : "en-US", { day: "numeric", month: "short", year: "numeric" }) : "—";

  if (loading) {
    return <Card style={{ padding: 32, textAlign: "center" }}><div style={{ color: C.muted }}>{tx("جاري التحميل…", "Loading…")}</div></Card>;
  }
  if (batches.length === 0) {
    return (
      <Card style={{ padding: 32, textAlign: "center" }}>
        <div style={{ color: C.muted, fontSize: 12.5 }}>
          {tx("لا توجد عمليات استيراد منفذة بعد — سيظهر السجل هنا بعد تفعيل التنفيذ الفعلي.", "No imports have been committed yet — history will appear here once actual committing is enabled.")}
        </div>
      </Card>
    );
  }

  return (
    <Card style={{ padding: 0, overflow: "hidden" }}>
      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 760 }}>
          <thead>
            <tr>
              <th style={th}>{tx("الملف", "File")}</th>
              <th style={th}>{tx("ملف الاستيراد", "Profile")}</th>
              <th style={th}>{tx("بواسطة", "By")}</th>
              <th style={th}>{tx("التاريخ", "Date")}</th>
              <th style={th}>{tx("منشأ", "Created")}</th>
              <th style={th}>{tx("محدّث", "Updated")}</th>
              <th style={th}>{tx("متخطى", "Skipped")}</th>
              <th style={th}>{tx("أخطاء", "Errors")}</th>
            </tr>
          </thead>
          <tbody>
            {batches.map((b) => (
              <tr key={b.id}>
                <td style={td}>{b.fileName}</td>
                <td style={td}>{profileById(b.importProfileId)?.name || "—"} (v{b.importProfileVersion})</td>
                <td style={td}>{b.importedByName || "—"}</td>
                <td style={td}>{fmt(b.createdAt)}</td>
                <td style={td}>{b.createdCount ?? 0}</td>
                <td style={td}>{b.updatedCount ?? 0}</td>
                <td style={td}>{b.skippedCount ?? 0}</td>
                <td style={td}>{b.errorCount ?? 0}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
