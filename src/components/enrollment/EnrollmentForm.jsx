import { useCallback, useState, useMemo } from "react";
import { C } from "../../theme";
import { Btn, Input } from "../UI";
import { submitEnrollmentCrm } from "../../utils/submitEnrollmentCrm";

// ─── helpers ────────────────────────────────────────────────────────────────
function isValidEmail(s) {
  if (!s || !String(s).trim()) return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(s).trim());
}

// ─── dropdown options ────────────────────────────────────────────────────────
const GOVERNORATES = [
  "القاهرة","الجيزة","الإسكندرية","الدقهلية","البحيرة","الفيوم",
  "الغربية","الإسماعيلية","المنوفية","المنيا","القليوبية","أسيوط",
  "سوهاج","الشرقية","الأقصر","أسوان","بني سويف","بور سعيد",
  "دمياط","كفر الشيخ","مطروح","جنوب سيناء","شمال سيناء",
  "البحر الأحمر","الوادي الجديد","السويس",
];

const EDUCATION_LEVELS = [
  "طالب ثانوي",
  "طالب جامعي",
  "خريج",
  "دراسات عليا",
  "أخرى",
];

const PROGRAMMING_LEVELS = [
  "مبتدئ - لا أعرف شيئاً",
  "أساسي - أعرف قليلاً",
  "متوسط",
  "متقدم",
];

const EMPLOYMENT_STATUS = [
  "طالب",
  "موظف",
  "فريلانسر",
  "باحث عن عمل",
  "أخرى",
];

const CONTACT_METHODS = [
  "واتساب",
  "مكالمة هاتفية",
  "بريد إلكتروني",
];

const BOOKING_VIA = [
  "فيسبوك",
  "إنستغرام",
  "يوتيوب",
  "صديق أو معارف",
  "جوجل",
  "أخرى",
];

// ─── shared styles ────────────────────────────────────────────────────────────
const selectStyle = {
  width: "100%",
  boxSizing: "border-box",
  borderRadius: 12,
  border: "1.5px solid var(--input-border)",
  padding: "10px 12px",
  fontFamily: "inherit",
  fontSize: 13,
  background: "var(--input-bg)",
  color: "var(--page-text)",
  appearance: "none",
  cursor: "pointer",
};

const labelStyle = {
  fontSize: 12,
  fontWeight: 700,
  marginBottom: 6,
  color: "var(--page-muted)",
  display: "block",
};

function SelectField({ label, value, onChange, options, required = false }) {
  return (
    <div>
      <label style={labelStyle}>
        {label}{required && <span style={{ color: "#ef4444", marginRight: 2 }}>*</span>}
      </label>
      <select style={selectStyle} value={value} onChange={(e) => onChange(e.target.value)}>
        <option value="">— اختر —</option>
        {options.map((o) => (
          <option key={o} value={o}>{o}</option>
        ))}
      </select>
    </div>
  );
}

// ─── main component ───────────────────────────────────────────────────────────
export default function EnrollmentForm({ diploma, courseCost }) {
  const dc =
    typeof courseCost === "number" && !Number.isNaN(courseCost)
      ? courseCost
      : Number(courseCost) || 0;

  const initial = useMemo(
    () => ({
      fullName: "",
      phone: "",
      email: "",
      governorate: "",
      educationLevel: "",
      hasPC: "",
      programmingLevel: "",
      employmentStatus: "",
      contactMethod: "",
      bookingVia: "",
      notes: "",
      createAccount: false,
    }),
    [],
  );

  const [form, setForm] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [err, setErr] = useState("");

  const setField = useCallback((k, v) => {
    setForm((p) => ({ ...p, [k]: v }));
  }, []);

  const onSubmit = useCallback(
    async (e) => {
      e.preventDefault();
      if (busy) return;
      setErr("");

      if (!form.fullName.trim())      return setErr("الاسم رباعي مطلوب");
      if (!form.phone.trim())         return setErr("رقم التليفون مطلوب");
      if (!isValidEmail(form.email))  return setErr("صيغة البريد الإلكتروني غير صحيحة");
      if (!form.governorate)          return setErr("يرجى اختيار المحافظة");
      if (!form.educationLevel)       return setErr("يرجى اختيار المؤهل الدراسي");
      if (!form.programmingLevel)     return setErr("يرجى اختيار مستواك في البرمجة");

      const payload = {
        fullName:         form.fullName.trim(),
        phone:            form.phone.trim(),
        email:            form.email.trim(),
        diploma:          diploma || "",
        governorate:      form.governorate,
        educationLevel:   form.educationLevel,
        hasPC:            form.hasPC || "لم يُحدد",
        programmingLevel: form.programmingLevel,
        employmentStatus: form.employmentStatus || "",
        contactMethod:    form.contactMethod || "",
        bookingVia:       form.bookingVia || "",
        notes:            form.notes.trim(),
        createAccount:    form.createAccount,
        courseCost:       dc,
        deposit: 0, inst1: 0, inst2: 0, inst3: 0,
        attendance: "", followUp: "", plan: "", payOk: "",
      };

      setBusy(true);
      try {
        await submitEnrollmentCrm(payload);
        setSent(true);
        setForm(initial);
      } catch (x) {
        setErr(x.message || "فشل الإرسال، حاول مرة أخرى");
      } finally {
        setBusy(false);
      }
    },
    [busy, dc, diploma, form, initial],
  );

  if (sent) {
    return (
      <div dir="rtl" style={{
        padding: 20, borderRadius: 14,
        background: "rgba(16,185,129,.1)",
        border: "1px solid rgba(16,185,129,.35)",
        color: "#10b981", fontWeight: 700, textAlign: "right",
      }}>
        تم التسجيل بنجاح! سنتواصل معك قريباً 🎉
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} dir="rtl" style={{ display: "grid", gap: 14, maxWidth: 480 }}>
      <fieldset disabled={busy} style={{ margin: 0, padding: 0, border: "none", minWidth: 0 }}>

        {err && (
          <div style={{ color: "#ef4444", fontSize: 13, fontWeight: 700, marginBottom: 4 }}>{err}</div>
        )}

        <Input label="الاسم رباعي *" placeholder="أحمد محمد علي حسن"
          value={form.fullName} onChange={(v) => setField("fullName", v)} />

        <Input label="رقم التليفون *" placeholder="+201xxxxxxxxx"
          value={form.phone} onChange={(v) => setField("phone", v)} />

        <Input type="email" label="البريد الإلكتروني *" placeholder="email@example.com"
          value={form.email} onChange={(v) => setField("email", v)} />

        <SelectField label="المحافظة" required value={form.governorate}
          onChange={(v) => setField("governorate", v)} options={GOVERNORATES} />

        <SelectField label="المؤهل الدراسي / المرحلة التعليمية" required value={form.educationLevel}
          onChange={(v) => setField("educationLevel", v)} options={EDUCATION_LEVELS} />

        <div>
          <label style={labelStyle}>هل لديك جهاز كمبيوتر شخصي؟</label>
          <div style={{ display: "flex", gap: 12 }}>
            {["نعم", "لأ"].map((opt) => (
              <label key={opt} style={{ display: "flex", alignItems: "center", gap: 6, cursor: "pointer", fontSize: 13, fontWeight: form.hasPC === opt ? 700 : 400 }}>
                <input type="radio" name="hasPC" value={opt} checked={form.hasPC === opt} onChange={() => setField("hasPC", opt)} />
                {opt}
              </label>
            ))}
          </div>
        </div>

        <SelectField label="مستواك في البرمجة" required value={form.programmingLevel}
          onChange={(v) => setField("programmingLevel", v)} options={PROGRAMMING_LEVELS} />

        <SelectField label="الحالة الوظيفية" value={form.employmentStatus}
          onChange={(v) => setField("employmentStatus", v)} options={EMPLOYMENT_STATUS} />

        <SelectField label="طريقة التواصل المفضلة" value={form.contactMethod}
          onChange={(v) => setField("contactMethod", v)} options={CONTACT_METHODS} />

        <SelectField label="عرفتنا منين؟" value={form.bookingVia}
          onChange={(v) => setField("bookingVia", v)} options={BOOKING_VIA} />

        <div>
          <label style={labelStyle}>ملاحظة / تعليق (اختياري)</label>
          <textarea value={form.notes} onChange={(e) => setField("notes", e.target.value)}
            placeholder="أي تفاصيل تريد إبلاغ الفريق بها..." rows={3}
            style={{ width: "100%", boxSizing: "border-box", borderRadius: 12,
              border: "1.5px solid var(--input-border)", padding: "10px 12px",
              fontFamily: "inherit", fontSize: 13, background: "var(--input-bg)",
              color: "var(--page-text)", resize: "vertical" }} />
        </div>

        <label style={{ display: "flex", alignItems: "flex-start", gap: 10, cursor: "pointer" }}>
          <input type="checkbox" checked={form.createAccount}
            onChange={(e) => setField("createAccount", e.target.checked)} style={{ marginTop: 2 }} />
          <div>
            <div style={{ fontSize: 13, fontWeight: 700 }}>إنشاء حساب على المنصة</div>
            <div style={{ fontSize: 11, color: C.muted }}>لمتابعة الكورسات والدروس بعد التسجيل</div>
          </div>
        </label>

        <div style={{ fontSize: 12, color: C.muted }}>
          الدبلومة: <strong style={{ color: "var(--page-text)" }}>{diploma}</strong>
        </div>

      </fieldset>
      <Btn type="submit" disabled={busy} style={{ opacity: busy ? 0.7 : 1 }}>
        {busy ? "جارٍ الإرسال..." : "إرسال التسجيل"}
      </Btn>
    </form>
  );
}
