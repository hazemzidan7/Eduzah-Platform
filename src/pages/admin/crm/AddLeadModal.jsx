import { useState } from "react";
import { Modal, Input, Select, Btn, Card } from "../../../components/UI";
import { C } from "../../../theme";
import { useLeads } from "../../../context/LeadsContext";
import { useData } from "../../../context/DataContext";
import { useAuth } from "../../../context/AuthContext";
import { useLang } from "../../../context/LangContext";
import { leadSourceSelectOptions } from "../../../constants/leadSource";
import LeadStatusBadge from "../../../components/crm/LeadStatusBadge";

export default function AddLeadModal({ onClose }) {
  const { findDuplicateLead, addLead } = useLeads();
  const { courses } = useData();
  const { users } = useAuth();
  const { lang } = useLang();
  const ar = lang === "ar";
  const tx = (a, e) => (ar ? a : e);
  const adminsList = users.filter((u) => u.role === "admin");

  const [f, setF] = useState({
    fullName: "", phone: "", whatsapp: "", email: "",
    university: "", faculty: "", academicYear: "", city: "",
    courseId: "", courseName: "",
    leadSource: "", campaign: "", assignedTo: "",
  });
  const set = (k, v) => setF((p) => ({ ...p, [k]: v }));
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [dupLead, setDupLead] = useState(null);

  const courseOptions = [
    { v: "", l: tx("لم يتحدد بعد", "Not sure yet") },
    ...courses.map((c) => ({ v: c.id, l: ar ? c.title : (c.title_en || c.title) })),
  ];
  const onCourseChange = (courseId) => {
    const c = courses.find((x) => String(x.id) === String(courseId));
    setF((p) => ({ ...p, courseId, courseName: c ? (ar ? c.title : (c.title_en || c.title)) : "" }));
  };

  const sourceOptions = leadSourceSelectOptions(lang);
  const assigneeOptions = [
    { v: "", l: tx("غير معيّن", "Unassigned") },
    ...adminsList.map((a) => ({ v: a.id, l: a.name || a.email })),
  ];

  const validate = () => {
    const e = {};
    if (!f.fullName.trim()) e.fullName = tx("مطلوب", "Required");
    if (!f.phone.trim()) e.phone = tx("مطلوب", "Required");
    return e;
  };

  const doCreate = async (possibleDuplicateOfLeadId = null) => {
    setSaving(true);
    try {
      await addLead({ ...f, possibleDuplicateOfLeadId }, "manual");
      onClose();
    } finally {
      setSaving(false);
    }
  };

  const trySubmit = () => {
    const e = validate();
    if (Object.keys(e).length) { setErrors(e); return; }
    const dup = findDuplicateLead({ phone: f.phone, email: f.email });
    if (dup) { setDupLead(dup); return; }
    doCreate();
  };

  if (dupLead) {
    return (
      <Modal title={tx("عميل محتمل مطابق موجود بالفعل", "A matching lead already exists")} onClose={onClose}>
        <p style={{ fontSize: 13, color: C.muted, marginBottom: 14 }}>
          {tx(
            "رقم الهاتف أو البريد الإلكتروني يطابق عميلاً محتملاً موجوداً بالفعل:",
            "This phone number or email matches an existing lead:",
          )}
        </p>
        <Card style={{ padding: "12px 14px", marginBottom: 16 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
            <div style={{ fontWeight: 800, fontSize: 14 }}>{dupLead.fullName || "—"}</div>
            <LeadStatusBadge status={dupLead.status} />
          </div>
          <div style={{ fontSize: 12, color: C.muted }}>
            {dupLead.phone}{dupLead.email ? ` · ${dupLead.email}` : ""}
          </div>
        </Card>
        <p style={{ fontSize: 12, color: C.muted, marginBottom: 16 }}>
          {tx(
            "يمكنك العثور على هذا العميل في قائمة العملاء المحتملين، أو إنشاء عميل جديد إذا كان هذا شخصاً مختلفاً.",
            "You can find this lead in the Leads list, or create a new one if this is genuinely a different person.",
          )}
        </p>
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
          <Btn v="ghost" onClick={() => setDupLead(null)}>{tx("رجوع", "Back")}</Btn>
          <Btn v="danger" disabled={saving} onClick={() => doCreate(dupLead.id)}>
            {tx("إنشاء عميل جديد على أي حال", "Create new lead anyway")}
          </Btn>
        </div>
      </Modal>
    );
  }

  return (
    <Modal title={tx("إضافة عميل محتمل", "Add Lead")} onClose={onClose}>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 12px" }}>
        <Input label={tx("الاسم الكامل", "Full name")} value={f.fullName} onChange={(v) => set("fullName", v)} error={errors.fullName} />
        <Input label={tx("الهاتف", "Phone")} value={f.phone} onChange={(v) => set("phone", v)} error={errors.phone} />
        <Input label={tx("واتساب", "WhatsApp")} value={f.whatsapp} onChange={(v) => set("whatsapp", v)} />
        <Input label={tx("البريد الإلكتروني", "Email")} value={f.email} onChange={(v) => set("email", v)} />
        <Input label={tx("الجامعة", "University")} value={f.university} onChange={(v) => set("university", v)} />
        <Input label={tx("الكلية", "Faculty")} value={f.faculty} onChange={(v) => set("faculty", v)} />
        <Input label={tx("السنة الدراسية", "Academic year")} value={f.academicYear} onChange={(v) => set("academicYear", v)} />
        <Input label={tx("المدينة", "City")} value={f.city} onChange={(v) => set("city", v)} />
      </div>

      <Select label={tx("الكورس المهتم به", "Interested course")} value={f.courseId} onChange={onCourseChange} options={courseOptions} />

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 12px" }}>
        <Select label={tx("مصدر العميل", "Lead source")} value={f.leadSource} onChange={(v) => set("leadSource", v)} options={sourceOptions} />
        <Input label={tx("الحملة الإعلانية", "Campaign")} value={f.campaign} onChange={(v) => set("campaign", v)} />
      </div>

      <Select label={tx("الموظف المسؤول", "Assigned employee")} value={f.assignedTo} onChange={(v) => set("assignedTo", v)} options={assigneeOptions} />

      <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 8 }}>
        <Btn v="ghost" onClick={onClose}>{tx("إلغاء", "Cancel")}</Btn>
        <Btn v="primary" disabled={saving} onClick={trySubmit}>{tx("حفظ العميل المحتمل", "Save Lead")}</Btn>
      </div>
    </Modal>
  );
}
