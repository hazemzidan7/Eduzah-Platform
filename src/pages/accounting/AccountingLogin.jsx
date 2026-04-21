import { useState } from "react";
import { useAccounting } from "../../context/AccountingContext";
import { C, font } from "../../theme";

const inp = {
  width: "100%",
  padding: "11px 14px",
  background: "rgba(255,255,255,.06)",
  border: `1.5px solid rgba(255,255,255,.14)`,
  borderRadius: 10,
  color: "#fff",
  fontFamily: font,
  fontSize: 14,
  outline: "none",
  boxSizing: "border-box",
  transition: "border-color .2s",
};

function Field({ label, children }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <label
        style={{
          display: "block",
          marginBottom: 6,
          fontSize: 13,
          fontWeight: 600,
          color: "rgba(255,255,255,.8)",
        }}
      >
        {label}
      </label>
      {children}
    </div>
  );
}

export default function AccountingLogin() {
  const { login, hasUsers, submitAccountingAccessRequest } = useAccounting();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [mode, setMode] = useState("login"); // login | request
  const [requestSent, setRequestSent] = useState(false);

  // Once at least one approved accounting user exists in Firestore, allow requesting additional access.
  const canRequest = hasUsers === true;

  async function handleSubmit(e) {
    e.preventDefault();
    setErr("");
    if (mode === "request") {
      if (!name.trim()) return setErr("أدخل الاسم الكامل");
      if (password.length < 8) return setErr("كلمة المرور 8 أحرف على الأقل");
    }
    setBusy(true);
    try {
      if (mode === "request") {
        await submitAccountingAccessRequest({ fullName: name, username, password, note });
        setRequestSent(true);
        setPassword("");
        return;
      }
      await login(username, password);
    } catch (ex) {
      setErr(ex.message);
    } finally {
      setBusy(false);
    }
  }

  if (hasUsers === null) {
    return (
      <div
        style={{
          minHeight: "100vh",
          background: "linear-gradient(135deg,#1a0a2e,#321d3d,#4a1f6e)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <div
          style={{
            width: 32,
            height: 32,
            border: "3px solid rgba(255,92,122,.3)",
            borderTopColor: C.red,
            borderRadius: "50%",
            animation: "spin .7s linear infinite",
          }}
        />
        <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      </div>
    );
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "linear-gradient(135deg,#1a0a2e 0%,#321d3d 40%,#4a1f6e 100%)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: font,
        direction: "rtl",
        padding: "24px 16px",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 440,
          background: "rgba(50,29,61,.88)",
          border: "1px solid rgba(255,255,255,.13)",
          borderRadius: 24,
          padding: 36,
          backdropFilter: "blur(18px)",
          boxShadow: "0 24px 80px rgba(0,0,0,.5)",
        }}
      >
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <div
            style={{
              width: 60,
              height: 60,
              borderRadius: 18,
              background: "linear-gradient(135deg,#ff5c7a,#7d3d9e)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              margin: "0 auto 16px",
              fontSize: 30,
              boxShadow: "0 8px 24px rgba(255,92,122,.35)",
            }}
          >
            💼
          </div>
          <h1 style={{ margin: 0, color: "#fff", fontSize: 22, fontWeight: 800, letterSpacing: -0.5 }}>
            {mode === "request" ? "طلب صلاحية المحاسبة" : "النظام المالي"}
          </h1>
          <p style={{ margin: "8px 0 0", color: "rgba(255,255,255,.5)", fontSize: 13 }}>
            {mode === "request"
              ? "سيتم مراجعة طلبك من قبل إدارة المنصة قبل تفعيل الدخول"
              : "دخول مقيّد ومنفصل عن باقي النظام"}
          </p>
        </div>

        <div
          style={{
            background: "rgba(255,184,77,.08)",
            border: "1px solid rgba(255,184,77,.3)",
            borderRadius: 12,
            padding: "10px 14px",
            marginBottom: 24,
            display: "flex",
            alignItems: "center",
            gap: 8,
            fontSize: 12,
            color: C.warning,
          }}
        >
          <span>🔒</span>
          <span>هذا القسم مشفّر ومنفصل تمامًا — لا يمكن الوصول إليه بحسابات النظام الرئيسي</span>
        </div>

        {err && (
          <div
            style={{
              background: "rgba(248,113,113,.12)",
              border: "1px solid rgba(248,113,113,.4)",
              borderRadius: 10,
              padding: "10px 14px",
              marginBottom: 20,
              color: C.danger,
              fontSize: 13,
            }}
          >
            ⚠️ {err}
          </div>
        )}

        {hasUsers === false && (
          <div
            style={{
              background: "rgba(59,130,246,.10)",
              border: "1px solid rgba(59,130,246,.35)",
              borderRadius: 10,
              padding: "10px 14px",
              marginBottom: 20,
              color: "#93c5fd",
              fontSize: 13,
              lineHeight: 1.5,
            }}
          >
            ℹ️ لم يتم تفعيل أول حساب محاسبة بعد. الأدمن يقوم بإنشاء/تفعيل أول مستخدم من لوحة التحكم، وبعدها يمكن للموظفين تقديم طلب صلاحية من هنا.
          </div>
        )}

        {requestSent && mode === "request" && (
          <div
            style={{
              background: "rgba(34,197,94,.12)",
              border: "1px solid rgba(34,197,94,.35)",
              borderRadius: 10,
              padding: "10px 14px",
              marginBottom: 20,
              color: "#86efac",
              fontSize: 13,
            }}
          >
            ✅ تم إرسال الطلب. بعد موافقة الأدمن ستتمكن من تسجيل الدخول هنا بنفس اسم المستخدم وكلمة المرور.
          </div>
        )}

        <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap" }}>
          <button
            type="button"
            onClick={() => { setMode("login"); setErr(""); setRequestSent(false); }}
            style={{
              flex: 1,
              padding: "10px 12px",
              borderRadius: 12,
              border: mode === "login" ? `1px solid ${C.red}` : "1px solid rgba(255,255,255,.14)",
              background: mode === "login" ? "rgba(255,92,122,.12)" : "transparent",
              color: "#fff",
              cursor: "pointer",
              fontFamily: font,
              fontWeight: 700,
              fontSize: 12,
            }}
          >
            تسجيل دخول
          </button>
          <button
            type="button"
            disabled={!canRequest}
            onClick={() => { if (!canRequest) return; setMode("request"); setErr(""); }}
            style={{
              flex: 1,
              padding: "10px 12px",
              borderRadius: 12,
              border: mode === "request" ? `1px solid ${C.red}` : "1px solid rgba(255,255,255,.14)",
              background: mode === "request" ? "rgba(255,92,122,.12)" : "transparent",
              color: "#fff",
              cursor: !canRequest ? "not-allowed" : "pointer",
              opacity: !canRequest ? 0.45 : 1,
              fontFamily: font,
              fontWeight: 700,
              fontSize: 12,
            }}
            title={!canRequest ? "لا يمكن طلب صلاحية قبل تفعيل أول حساب محاسبة من الأدمن" : ""}
          >
            طلب صلاحية
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          {mode === "request" && (
            <Field label="الاسم الكامل">
              <input value={name} onChange={(e) => setName(e.target.value)} placeholder="مثال: أحمد محمد" required style={inp} />
            </Field>
          )}

          <Field label="اسم المستخدم">
            <input
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="اسم المستخدم"
              required
              autoComplete="username"
              style={inp}
            />
          </Field>

          <Field label="كلمة المرور">
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              autoComplete={mode === "request" ? "new-password" : "current-password"}
              style={{ ...inp, marginBottom: mode === "request" ? 0 : 8 }}
            />
          </Field>

          {mode === "request" && (
            <Field label="ملاحظة (اختياري)">
              <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={3} style={{ ...inp, resize: "vertical" }} placeholder="سبب الطلب / أي تفاصيل تساعد الإدارة" />
            </Field>
          )}

          <button
            type="submit"
            disabled={busy}
            style={{
              width: "100%",
              padding: "13px 0",
              marginTop: 8,
              background: busy ? "#555" : "linear-gradient(135deg,#ff5c7a,#7d3d9e)",
              color: "#fff",
              border: "none",
              borderRadius: 12,
              fontFamily: font,
              fontWeight: 700,
              fontSize: 15,
              cursor: busy ? "not-allowed" : "pointer",
              transition: "all .2s",
              boxShadow: busy ? "none" : "0 4px 18px rgba(255,92,122,.35)",
            }}
          >
            {busy ? "جاري التحقق..." : mode === "request" ? "إرسال الطلب" : "دخول"}
          </button>
        </form>

        <p style={{ textAlign: "center", marginTop: 20, fontSize: 11, color: "rgba(255,255,255,.28)" }}>
          Eduzah Financial System — Restricted Access
        </p>
      </div>
    </div>
  );
}

