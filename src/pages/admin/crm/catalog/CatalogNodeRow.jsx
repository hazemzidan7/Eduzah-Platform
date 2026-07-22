import { useState } from "react";
import { Btn, Modal } from "../../../../components/UI";
import { C } from "../../../../theme";
import { useCatalog } from "../../../../context/CatalogContext";
import { useLang } from "../../../../context/LangContext";
import CatalogNodeModal from "./CatalogNodeModal";

/** Renders a node and recurses into its own children via childrenOf() — no fixed
 * depth is assumed, so a future 5th/6th hierarchy level needs no changes here. */
export default function CatalogNodeRow({ node, depth }) {
  const { childrenOf, archiveNode } = useCatalog();
  const { lang } = useLang();
  const ar = lang === "ar";
  const tx = (a, e) => (ar ? a : e);

  const [expanded, setExpanded] = useState(true);
  const [modal, setModal] = useState(null); // "addChild" | "edit" | null
  const [confirmArchive, setConfirmArchive] = useState(false);

  const kids = childrenOf(node.id);

  return (
    <div>
      <div style={{
        display: "flex", alignItems: "center", gap: 8,
        padding: "8px 10px", borderRadius: 8,
        marginInlineStart: depth * 22,
        background: depth === 0 ? "rgba(255,255,255,.04)" : "transparent",
        borderBottom: `1px solid ${C.border}`,
      }}>
        <button
          onClick={() => setExpanded((v) => !v)}
          disabled={kids.length === 0}
          style={{ background: "none", border: "none", color: C.muted, cursor: kids.length ? "pointer" : "default", width: 16, fontSize: 11 }}
        >
          {kids.length ? (expanded ? "▾" : "▸") : ""}
        </button>
        <span style={{ fontWeight: depth === 0 ? 800 : 600, fontSize: depth === 0 ? 14 : 13 }}>
          {ar ? node.name_ar : node.name_en}
        </span>
        <span style={{ fontSize: 10, color: C.muted, background: "rgba(255,255,255,.08)", borderRadius: 20, padding: "2px 8px" }}>
          {node.type}
        </span>
        <div style={{ marginInlineStart: "auto", display: "flex", gap: 6 }}>
          <Btn sm v="ghost" onClick={() => setModal("addChild")}>{tx("+ فرعي", "+ Child")}</Btn>
          <Btn sm v="ghost" onClick={() => setModal("edit")}>{tx("تعديل", "Edit")}</Btn>
          <Btn sm v="danger" onClick={() => setConfirmArchive(true)}>{tx("أرشفة", "Archive")}</Btn>
        </div>
      </div>

      {expanded && kids.map((child) => (
        <CatalogNodeRow key={child.id} node={child} depth={depth + 1} />
      ))}

      {modal === "addChild" && <CatalogNodeModal parentNode={node} onClose={() => setModal(null)} />}
      {modal === "edit" && <CatalogNodeModal editNode={node} onClose={() => setModal(null)} />}

      {confirmArchive && (
        <Modal title={tx("أرشفة العنصر؟", "Archive this node?")} onClose={() => setConfirmArchive(false)}>
          <p style={{ fontSize: 13, color: C.muted, marginBottom: 16 }}>
            {tx(
              `سيتم إخفاء "${node.name_ar || node.name_en}" ولن يظهر في القوائم، لكنه لن يُحذف نهائياً.`,
              `"${node.name_en || node.name_ar}" will be hidden from lists, not permanently deleted.`,
            )}
          </p>
          <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
            <Btn v="ghost" onClick={() => setConfirmArchive(false)}>{tx("إلغاء", "Cancel")}</Btn>
            <Btn v="danger" onClick={async () => { await archiveNode(node.id); setConfirmArchive(false); }}>
              {tx("أرشفة", "Archive")}
            </Btn>
          </div>
        </Modal>
      )}
    </div>
  );
}
