import { useState } from "react";
import { Modal, Input, Select, Btn } from "../../../../components/UI";
import { useCatalog } from "../../../../context/CatalogContext";
import { useLang } from "../../../../context/LangContext";

const SUGGESTED_TYPES = ["category", "program", "batch"];

/** Add a child node under `parentNode` (parentNode null => a root-level Business Unit),
 * or edit `editNode` if given. Type is a free string — the suggested list is a
 * convenience, not a constraint, so a brand-new type (e.g. "company") just works. */
export default function CatalogNodeModal({ parentNode, editNode, onClose }) {
  const { addNode, updateNode } = useCatalog();
  const { lang } = useLang();
  const ar = lang === "ar";
  const tx = (a, e) => (ar ? a : e);
  const isRoot = !parentNode && !editNode;

  const [nameAr, setNameAr] = useState(editNode?.name_ar || "");
  const [nameEn, setNameEn] = useState(editNode?.name_en || "");
  const [type, setType] = useState(editNode?.type || (isRoot ? "business_unit" : "category"));
  const [customType, setCustomType] = useState(!isRoot && editNode && !SUGGESTED_TYPES.includes(editNode.type) ? editNode.type : "");
  const [useCustomType, setUseCustomType] = useState(!isRoot && editNode && !SUGGESTED_TYPES.includes(editNode.type));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const typeOptions = [
    ...SUGGESTED_TYPES.map((t) => ({ v: t, l: t })),
    { v: "__custom__", l: tx("نوع آخر...", "Other type...") },
  ];

  const onTypeChange = (v) => {
    if (v === "__custom__") { setUseCustomType(true); return; }
    setUseCustomType(false);
    setType(v);
  };

  const submit = async () => {
    if (!nameAr.trim() && !nameEn.trim()) { setError(tx("أدخل اسماً على الأقل", "Enter at least one name")); return; }
    const finalType = isRoot ? "business_unit" : (useCustomType ? customType.trim() : type);
    if (!finalType) { setError(tx("حدد النوع", "Choose a type")); return; }
    setSaving(true);
    try {
      if (editNode) {
        await updateNode(editNode.id, { name_ar: nameAr, name_en: nameEn, type: finalType });
      } else {
        await addNode({ name_ar: nameAr, name_en: nameEn, type: finalType, parentId: parentNode?.id || null });
      }
      onClose();
    } catch (e) {
      setError(e.message || tx("حدث خطأ", "Something went wrong"));
    } finally {
      setSaving(false);
    }
  };

  const title = editNode
    ? tx("تعديل عنصر", "Edit Node")
    : isRoot
      ? tx("إضافة وحدة عمل", "Add Business Unit")
      : tx("إضافة عنصر فرعي", "Add Child Node");

  return (
    <Modal title={title} onClose={onClose}>
      {parentNode && (
        <div style={{ fontSize: 12, marginBottom: 10, opacity: 0.75 }}>
          {tx("تحت:", "Under:")} {ar ? parentNode.name_ar : parentNode.name_en}
        </div>
      )}
      <Input label={tx("الاسم بالعربي", "Name (Arabic)")} value={nameAr} onChange={setNameAr} />
      <Input label={tx("الاسم بالإنجليزي", "Name (English)")} value={nameEn} onChange={setNameEn} />
      {!isRoot && (
        <>
          <Select label={tx("النوع", "Type")} value={useCustomType ? "__custom__" : type} onChange={onTypeChange} options={typeOptions} />
          {useCustomType && (
            <Input label={tx("اكتب النوع", "Type name")} value={customType} onChange={setCustomType} />
          )}
        </>
      )}
      {error && <div style={{ color: "#f87171", fontSize: 12, marginBottom: 10 }}>{error}</div>}
      <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 8 }}>
        <Btn v="ghost" onClick={onClose}>{tx("إلغاء", "Cancel")}</Btn>
        <Btn v="primary" disabled={saving} onClick={submit}>{tx("حفظ", "Save")}</Btn>
      </div>
    </Modal>
  );
}
