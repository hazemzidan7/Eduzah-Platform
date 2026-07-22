import { useState } from "react";
import { Card, Btn } from "../../../../components/UI";
import { C } from "../../../../theme";
import { useCatalog } from "../../../../context/CatalogContext";
import { useLang } from "../../../../context/LangContext";
import CatalogNodeRow from "./CatalogNodeRow";
import CatalogNodeModal from "./CatalogNodeModal";

export default function CatalogManager() {
  const { businessUnits, loading } = useCatalog();
  const { lang } = useLang();
  const ar = lang === "ar";
  const tx = (a, e) => (ar ? a : e);
  const [showAddRoot, setShowAddRoot] = useState(false);

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
        <div>
          <h3 style={{ fontWeight: 800, fontSize: 15, margin: 0 }}>{tx("شجرة الكتالوج", "Catalog Tree")}</h3>
          <div style={{ fontSize: 12, color: C.muted, marginTop: 4 }}>
            {tx(
              "وحدات العمل، الفئات، البرامج، والدفعات — كلها بيانات، لا يوجد أي مستوى ثابت في الكود.",
              "Business Units, Categories, Programs, Batches — all data-driven, no fixed level hardcoded in code.",
            )}
          </div>
        </div>
        <Btn v="primary" onClick={() => setShowAddRoot(true)}>{tx("+ وحدة عمل جديدة", "+ Add Business Unit")}</Btn>
      </div>

      {loading ? (
        <Card style={{ padding: 32, textAlign: "center" }}><div style={{ color: C.muted }}>{tx("جاري التحميل…", "Loading…")}</div></Card>
      ) : businessUnits.length === 0 ? (
        <Card style={{ padding: 32, textAlign: "center" }}><div style={{ color: C.muted }}>{tx("لا توجد وحدات عمل بعد", "No Business Units yet")}</div></Card>
      ) : (
        <Card style={{ padding: 10 }}>
          {businessUnits.map((bu) => (
            <CatalogNodeRow key={bu.id} node={bu} depth={0} />
          ))}
        </Card>
      )}

      {showAddRoot && <CatalogNodeModal onClose={() => setShowAddRoot(false)} />}
    </div>
  );
}
