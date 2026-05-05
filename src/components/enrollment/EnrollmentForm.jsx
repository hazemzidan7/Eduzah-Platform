import { useCallback, useState, useMemo } from "react";
import { C } from "../../theme";
import { Btn, Input } from "../UI";
import { submitEnrollmentCrm } from "../../utils/submitEnrollmentCrm";

function isValidEmail(s) {
  if (!s || !String(s).trim()) return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(s).trim());
}

export default function EnrollmentForm({
  diploma,
  courseCost,
  ar = false,
}) {
  const dc = typeof courseCost === "number" && !Number.isNaN(courseCost) ? courseCost : Number(courseCost) || 0;

  const initial = useMemo(
    () => ({
      fullName: "",
      phone: "",
      email: "",
      bookingVia: "",
      plan: "",
      notes: "",
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

      if (!form.fullName.trim() || !form.phone.trim()) {
        setErr(ar ? "الاسم والهاتف مطلوبان" : "Full name and phone are required");
        return;
      }
      if (!isValidEmail(form.email)) {
        setErr(ar ? "صيغة البريد غير صحيحة" : "Invalid email format");
        return;
      }

      const payload = {
        fullName: form.fullName.trim(),
        phone: form.phone.trim(),
        email: form.email.trim(),
        diploma: diploma || "",
        bookingVia: form.bookingVia.trim() || "website",
        courseCost: dc,
        deposit: 0,
        inst1: 0,
        inst2: 0,
        inst3: 0,
        attendance: "",
        followUp: "",
        notes: form.notes.trim(),
        plan: form.plan.trim(),
        payOk: "",
      };

      setBusy(true);
      try {
        await submitEnrollmentCrm(payload);
        setSent(true);
        setForm(initial);
      } catch (x) {
        setErr(x.message || (ar ? "فشل الإرسال" : "Submit failed"));
      } finally {
        setBusy(false);
      }
    },
    [ar, busy, dc, diploma, form, initial],
  );

  if (sent) {
    return (
      <div
        style={{
          padding: 20,
          borderRadius: 14,
          background: "rgba(16,185,129,.1)",
          border: "1px solid rgba(16,185,129,.35)",
          color: "#10b981",
          fontWeight: 700,
          textAlign: ar ? "right" : "left",
        }}
        dir={ar ? "rtl" : "ltr"}
      >
        {ar ? "تم التسجيل بنجاح! سنتواصل معك قريباً." : "Registration sent successfully. We'll be in touch soon."}
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} dir={ar ? "rtl" : "ltr"} style={{ display: "grid", gap: 14, maxWidth: 480 }}>
      <fieldset disabled={busy} style={{ margin: 0, padding: 0, border: "none", minWidth: 0 }}>
      {err ? (
        <div style={{ color: "#ef4444", fontSize: 13, fontWeight: 700 }}>{err}</div>
      ) : null}
      <Input
        label={ar ? "الاسم بالكامل" : "Full name"}
        value={form.fullName}
        onChange={(v) => setField("fullName", v)}
      />
      <Input
        label={ar ? "الهاتف" : "Phone"}
        value={form.phone}
        onChange={(v) => setField("phone", v)}
      />
      <Input
        type="email"
        label={ar ? "البريد الإلكتروني" : "Email"}
        value={form.email}
        onChange={(v) => setField("email", v)}
      />
      <Input
        label={ar ? "كيف تعرفنا؟ (Booking via)" : "Booking via"}
        placeholder={ar ? "مثال: فيسبوك، إنستغرام..." : "e.g. Facebook, Instagram"}
        value={form.bookingVia}
        onChange={(v) => setField("bookingVia", v)}
      />
      <Input
        label={ar ? "الخطة / الدفع" : "Plan"}
        placeholder={ar ? "مثال: دفعة واحدة، أقساط..." : "e.g. lump sum, installments"}
        value={form.plan}
        onChange={(v) => setField("plan", v)}
      />
      <div>
        <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 6, color: "var(--page-muted)" }}>
          {ar ? "ملاحظات" : "Notes"}
        </div>
        <textarea
          value={form.notes}
          onChange={(e) => setField("notes", e.target.value)}
          rows={3}
          style={{
            width: "100%",
            boxSizing: "border-box",
            borderRadius: 12,
            border: "1.5px solid var(--input-border)",
            padding: "10px 12px",
            fontFamily: "inherit",
            fontSize: 13,
            background: "var(--input-bg)",
            color: "var(--page-text)",
          }}
        />
      </div>
      <div style={{ fontSize: 12, color: C.muted }}>
        {ar ? "المساق (Diploma): " : "Program (Diploma): "}
        <strong style={{ color: "var(--page-text)" }}>{diploma}</strong>
      </div>
      </fieldset>
      <Btn type="submit" disabled={busy} style={{ opacity: busy ? 0.7 : 1 }}>
        {busy ? (ar ? "جارٍ الإرسال..." : "Sending…") : ar ? "إرسال التسجيل" : "Submit registration"}
      </Btn>
    </form>
  );
}
