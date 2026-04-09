import { useState } from "react";
import { confirmPasswordReset } from "firebase/auth";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { auth } from "../../firebase";
import { C, gHero, font } from "../../theme";
import { Btn } from "../../components/UI";
import { useAuth } from "../../context/AuthContext";
import { useLang } from "../../context/LangContext";
import { Seo } from "../../components/Seo";

/* ── Eye icon ── */
const EyeIcon = ({ off }) => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    {off ? (
      <>
        <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94"/>
        <path d="M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19"/>
        <line x1="1" y1="1" x2="23" y2="23"/>
      </>
    ) : (
      <>
        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
        <circle cx="12" cy="12" r="3"/>
      </>
    )}
  </svg>
);

/* ── Field wrapper ── */
const Field = ({ label, children, error }) => (
  <div style={{ marginBottom: 12 }}>
    {label && <label style={{ fontSize: 12, fontWeight: 700, color: C.muted, display: "block", marginBottom: 5 }}>{label}</label>}
    {children}
    {error && <div style={{ fontSize: 11, color: C.danger, marginTop: 4 }}>{error}</div>}
  </div>
);

const inputSx = (err) => ({
  width: "100%", boxSizing: "border-box",
  background: "rgba(50,29,61,.6)",
  border: `1.5px solid ${err ? C.danger : C.border}`,
  borderRadius: 10, padding: "10px 13px",
  color: "#fff", fontFamily: font, fontSize: 13, outline: "none",
});

/* ── Password strength ── */
const validatePassword = (p) => {
  const rules = [
    { ok: p.length >= 8,         ar: "8 أحرف على الأقل",       en: "At least 8 characters" },
    { ok: /[A-Z]/.test(p),       ar: "حرف كبير واحد",           en: "One uppercase letter" },
    { ok: /[a-z]/.test(p),       ar: "حرف صغير واحد",           en: "One lowercase letter" },
    { ok: /[0-9]/.test(p),       ar: "رقم واحد",                en: "One number" },
    { ok: /[^A-Za-z0-9]/.test(p),ar: "رمز خاص (!@#$...)",       en: "One special character" },
  ];
  return rules;
};

const PassRules = ({ pass, lang }) => {
  if (!pass) return null;
  const rules = validatePassword(pass);
  return (
    <div style={{ marginTop: 6, display: "flex", flexDirection: "column", gap: 3 }}>
      {rules.map((r, i) => (
        <div key={i} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11 }}>
          <span style={{ color: r.ok ? C.success : C.danger, fontWeight: 800 }}>{r.ok ? "✓" : "✗"}</span>
          <span style={{ color: r.ok ? C.success : C.muted }}>{lang === "ar" ? r.ar : r.en}</span>
        </div>
      ))}
    </div>
  );
};

/* ── Password field with toggle ── */
const PassField = ({ label, value, onChange, error, placeholder, lang }) => {
  const [show, setShow] = useState(false);
  return (
    <Field label={label} error={error}>
      <div style={{ position: "relative" }}>
        <input
          type={show ? "text" : "password"}
          value={value}
          onChange={e => { const v = e.target.value; onChange(v); }}
          placeholder={placeholder}
          style={{ ...inputSx(error), paddingLeft: lang === "ar" ? 13 : 40, paddingRight: lang === "ar" ? 40 : 13 }}
        />
        <button type="button" onClick={() => setShow(s => !s)}
          aria-label={lang === "ar" ? (show ? "إخفاء كلمة المرور" : "إظهار كلمة المرور") : (show ? "Hide password" : "Show password")}
          style={{
            position: "absolute", top: "50%", transform: "translateY(-50%)",
            [lang === "ar" ? "right" : "left"]: 0,
            background: "none", border: "none", color: C.muted,
            cursor: "pointer", padding: "0 12px", display: "flex", alignItems: "center",
          }}>
          <EyeIcon off={!show} />
        </button>
      </div>
    </Field>
  );
};

/* ══════════════════════════════════════════
   LOGIN PAGE
══════════════════════════════════════════ */
const loginErr = (code, lang, msg) => {
  if (code === "BAD_CREDENTIALS") return lang === "ar" ? "البريد الإلكتروني أو كلمة المرور غير صحيحة" : "Invalid email or password";
  if (code === "PENDING")         return lang === "ar" ? "حسابك قيد المراجعة من الإدارة. انتظر الموافقة." : "Your account is pending admin approval";
  if (code === "REJECTED")        return lang === "ar" ? "تم رفض حسابك. تواصل مع الإدارة." : "Your account was rejected. Contact support";
  if (code === "NO_PROFILE")      return lang === "ar" ? "الحساب موجود لكن بياناتك غير مكتملة. تواصل مع الإدارة." : "Account exists but profile missing. Contact support";
  if (code === "FIREBASE_ERROR")  return lang === "ar" ? `خطأ في الاتصال: ${msg}` : `Connection error: ${msg}`;
  return lang === "ar" ? "تعذر تسجيل الدخول، حاول مرة أخرى" : "Login failed, please try again";
};

export function LoginPage() {
  const { login }  = useAuth();
  const { lang }   = useLang();
  const navigate   = useNavigate();
  const [email, setEmail] = useState("");
  const [pass,  setPass]  = useState("");
  const [err,   setErr]   = useState("");

  const submit = async () => {
    if (!email || !pass) { setErr(lang === "ar" ? "أدخل البريد وكلمة المرور" : "Enter email and password"); return; }
    const r = await login(email, pass);
    if (!r.ok) { setErr(loginErr(r.code, lang, r.msg)); return; }
    navigate("/dashboard");
  };

  return (
    <div dir={lang === "ar" ? "rtl" : "ltr"} style={{ minHeight: "calc(100vh - 60px)", background: gHero, display: "flex", alignItems: "center", justifyContent: "center", padding: "40px 16px" }}>
      <Seo
        title={lang === "ar" ? "تسجيل الدخول — Eduzah" : "Login — Eduzah"}
        description={lang === "ar" ? "سجّل دخولك إلى منصة Eduzah للتدريب المهني." : "Sign in to the Eduzah professional training platform."}
      />
      <div role="form" aria-label={lang === "ar" ? "تسجيل الدخول" : "Login"}
        style={{ background: "rgba(50,29,61,.92)", backdropFilter: "blur(24px)", border: `1px solid ${C.border}`, borderRadius: 22, padding: 28, width: "100%", maxWidth: 380 }}>

        <div style={{ textAlign: "center", marginBottom: 24 }}>
          <div style={{ display:"inline-block", background:"#fff", borderRadius:14, padding:"10px 20px", marginBottom:8 }}>
              <img src="/logo-en.png" alt="Eduzah" style={{ height: 52, width: "auto", maxWidth: 200, objectFit: "contain", display:"block" }} />
            </div>
          <div style={{ color: C.muted, fontSize: 13 }}>
            {lang === "ar" ? "مرحباً بعودتك" : "Welcome back"}
          </div>
        </div>

        <Field label={lang === "ar" ? "البريد الإلكتروني" : "Email"}>
          <input type="email" value={email} onChange={e => setEmail(e.target.value)}
            placeholder="email@example.com" style={inputSx(false)}
            aria-label="Email" />
        </Field>

        <PassField
          label={lang === "ar" ? "كلمة المرور" : "Password"}
          value={pass} onChange={setPass}
          placeholder="••••••••" lang={lang}
        />

        <div style={{ textAlign: lang === "ar" ? "right" : "left", marginBottom: 12 }}>
          <Link to="/forgot-password" style={{ color: C.orange, fontSize: 12, fontWeight: 700, textDecoration: "none" }}>
            {lang === "ar" ? "نسيت كلمة المرور؟" : "Forgot password?"}
          </Link>
        </div>

        {err && (
          <div role="alert" style={{ background: `${C.danger}18`, border: `1px solid ${C.danger}44`, borderRadius: 9, padding: "9px 12px", fontSize: 12, color: C.danger, marginBottom: 12 }}>
            {err}
          </div>
        )}

        <Btn children={lang === "ar" ? "تسجيل الدخول" : "Login"} full onClick={submit}
          style={{ padding: "12px", fontSize: 14, boxShadow: `0 8px 25px rgba(217,27,91,.4)` }} />

        <div style={{ textAlign: "center", marginTop: 14, fontSize: 12, color: C.muted }}>
          {lang === "ar" ? "مش عندك حساب؟" : "Don't have an account?"}{" "}
          <span style={{ color: C.orange, cursor: "pointer", fontWeight: 700 }} onClick={() => navigate("/register")}>
            {lang === "ar" ? "سجّل دلوقتي" : "Register now"}
          </span>
        </div>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════
   REGISTER PAGE
══════════════════════════════════════════ */
export function RegisterPage() {
  const { register } = useAuth();
  const { lang }     = useLang();
  const navigate     = useNavigate();

  const [f,    setF]    = useState({ name: "", email: "", pass: "", confirm: "", phone: "" });
  const [errs, setErrs] = useState({});
  const [ok,   setOk]   = useState(false);

  const set = (k, v) => setF(p => ({ ...p, [k]: v }));

  const validate = () => {
    const e = {};
    if (!f.name.trim())  e.name  = lang === "ar" ? "الاسم مطلوب" : "Name required";
    if (!f.phone.trim()) e.phone = lang === "ar" ? "الهاتف مطلوب" : "Phone required";
    if (!f.email.includes("@")) e.email = lang === "ar" ? "بريد غير صحيح" : "Invalid email";

    const rules = validatePassword(f.pass);
    if (rules.some(r => !r.ok)) e.pass = lang === "ar" ? "كلمة المرور لا تستوفي الشروط" : "Password doesn't meet requirements";
    if (f.pass !== f.confirm) e.confirm = lang === "ar" ? "كلمة المرور غير متطابقة" : "Passwords don't match";
    return e;
  };

  const submit = async () => {
    const e = validate();
    if (Object.keys(e).length) { setErrs(e); return; }
    setErrs({});
    const r = await register(f);
    if (!r.ok) {
      if (r.code === "EMAIL_EXISTS") {
        setErrs({ email: lang === "ar" ? "هذا البريد مسجل مسبقاً" : "This email is already registered" });
      } else {
        setErrs({ email: lang === "ar" ? "تعذر إنشاء الحساب" : "Registration failed" });
      }
      return;
    }
    setOk(true);
  };

  if (ok) return (
    <div style={{ minHeight: "calc(100vh - 60px)", background: gHero, display: "flex", alignItems: "center", justifyContent: "center", padding: 40 }}>
      <div style={{ textAlign: "center", maxWidth: 420 }}>
        <div style={{ width: 70, height: 70, borderRadius: "50%", background: `${C.success}22`, border: `2px solid ${C.success}`, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px", fontSize: 28 }}>✓</div>
        <h2 style={{ fontWeight: 900, fontSize: 22, marginBottom: 8 }}>
          {lang === "ar" ? "تم التسجيل بنجاح" : "Registration successful"}
        </h2>
        <p style={{ color: C.muted, marginBottom: 24, lineHeight: 1.75, fontSize: 14 }}>
          {lang === "ar"
            ? "تم التسجيل بنجاح، سيتم مراجعة بياناتك من قبل الإدارة. بعد الموافقة يمكنك تسجيل الدخول."
            : "Your registration was successful. The administration will review your details. You can sign in after approval."}
        </p>
        <Btn children={lang === "ar" ? "تسجيل الدخول" : "Login"} onClick={() => navigate("/login")} />
      </div>
    </div>
  );

  return (
    <div dir={lang === "ar" ? "rtl" : "ltr"} style={{ minHeight: "calc(100vh - 60px)", background: gHero, display: "flex", alignItems: "center", justifyContent: "center", padding: "40px 16px" }}>
      <Seo
        title={lang === "ar" ? "إنشاء حساب — Eduzah" : "Register — Eduzah"}
        description={lang === "ar" ? "أنشئ حساباً على Eduzah للتدريب المهني والكورسات." : "Create your Eduzah account for professional training and courses."}
      />
      <div role="form" aria-label={lang === "ar" ? "إنشاء حساب" : "Register"}
        style={{ background: "rgba(50,29,61,.92)", backdropFilter: "blur(24px)", border: `1px solid ${C.border}`, borderRadius: 22, padding: 28, width: "100%", maxWidth: 440 }}>

        <div style={{ textAlign: "center", marginBottom: 22 }}>
          <div style={{ display:"inline-block", background:"#fff", borderRadius:14, padding:"10px 20px", marginBottom:8 }}>
              <img src="/logo-en.png" alt="Eduzah" style={{ height: 52, width: "auto", maxWidth: 200, objectFit: "contain", display:"block" }} />
            </div>
          <div style={{ color: C.muted, fontSize: 13 }}>
            {lang === "ar" ? "انضم لـ Eduzah" : "Join Eduzah"}
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <Field label={lang === "ar" ? "الاسم *" : "Name *"} error={errs.name}>
            <input value={f.name} onChange={e => set("name", e.target.value)}
              placeholder={lang === "ar" ? "أحمد محمد" : "Ahmed Mohamed"} style={inputSx(errs.name)} />
          </Field>
          <Field label={lang === "ar" ? "الهاتف *" : "Phone *"} error={errs.phone}>
            <input value={f.phone} onChange={e => set("phone", e.target.value)}
              type="tel" placeholder="+201..." style={inputSx(errs.phone)} />
          </Field>
        </div>

        <Field label={lang === "ar" ? "البريد الإلكتروني *" : "Email *"} error={errs.email}>
          <input value={f.email} onChange={e => set("email", e.target.value)}
            type="email" placeholder="email@example.com" style={inputSx(errs.email)} />
        </Field>

        <PassField label={lang === "ar" ? "كلمة المرور *" : "Password *"}
          value={f.pass} onChange={v => set("pass", v)}
          placeholder="••••••••" error={errs.pass} lang={lang} />
        <PassRules pass={f.pass} lang={lang} />

        <div style={{ marginTop: 10 }}>
          <PassField label={lang === "ar" ? "تأكيد كلمة المرور *" : "Confirm Password *"}
            value={f.confirm} onChange={v => set("confirm", v)}
            placeholder="••••••••" error={errs.confirm} lang={lang} />
        </div>

        <div style={{ background: `${C.orange}18`, border: `1px solid ${C.orange}33`, borderRadius: 9, padding: "9px 12px", fontSize: 12, color: C.orange, marginBottom: 14 }}>
          {lang === "ar"
            ? "التسجيل كطالب فقط. لتسجيل حساب مدرب، تواصل مع الإدارة بعد إنشاء حسابك."
            : "Student accounts only. For instructor access, contact the team after registering."}
          {" "}
          {lang === "ar" ? "سيتم مراجعة حسابك من الإدارة خلال 24 ساعة." : "Your account will be reviewed within 24 hours."}
        </div>

        <Btn children={lang === "ar" ? "إنشاء الحساب" : "Create Account"} full onClick={submit}
          style={{ padding: "12px", fontSize: 14, boxShadow: `0 8px 25px rgba(217,27,91,.4)` }} />

        <div style={{ textAlign: "center", marginTop: 12, fontSize: 12, color: C.muted }}>
          {lang === "ar" ? "عندك حساب؟" : "Already have an account?"}{" "}
          <span style={{ color: C.orange, cursor: "pointer", fontWeight: 700 }} onClick={() => navigate("/login")}>
            {lang === "ar" ? "سجّل دخولك" : "Login"}
          </span>
        </div>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════
   FORGOT / RESET PASSWORD (Firebase)
   Configure Firebase Console → Auth → Templates → Action URL to:
   https://YOUR_DOMAIN/reset-password
══════════════════════════════════════════ */
export function ForgotPasswordPage() {
  const { requestPasswordReset } = useAuth();
  const { lang } = useLang();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [done, setDone] = useState(false);
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    setErr("");
    if (!email.trim() || !email.includes("@")) {
      setErr(lang === "ar" ? "أدخل بريداً صالحاً" : "Enter a valid email");
      return;
    }
    setLoading(true);
    const r = await requestPasswordReset(email);
    setLoading(false);
    if (!r.ok) {
      setErr(lang === "ar" ? "تعذر إرسال الرسالة. حاول لاحقاً." : "Could not send email. Try again later.");
      return;
    }
    setDone(true);
  };

  return (
    <div dir={lang === "ar" ? "rtl" : "ltr"} style={{ minHeight: "calc(100vh - 60px)", background: gHero, display: "flex", alignItems: "center", justifyContent: "center", padding: "40px 16px" }}>
      <Seo
        title={lang === "ar" ? "استعادة كلمة المرور — Eduzah" : "Forgot password — Eduzah"}
        description={lang === "ar" ? "استعد الوصول إلى حسابك على Eduzah." : "Recover access to your Eduzah account."}
      />
      <div style={{ background: "rgba(50,29,61,.92)", border: `1px solid ${C.border}`, borderRadius: 22, padding: 28, width: "100%", maxWidth: 420 }}>
        <h1 style={{ fontSize: 20, marginBottom: 8 }}>{lang === "ar" ? "نسيت كلمة المرور؟" : "Forgot password?"}</h1>
        <p style={{ color: C.muted, fontSize: 13, marginBottom: 16, lineHeight: 1.6 }}>
          {lang === "ar"
            ? "أدخل بريدك المسجل. ستصلك رسالة من Firebase تحتوي رابط إعادة التعيين (تحقق من البريد غير المرغوب)."
            : "Enter your registered email. Firebase will send a reset link (check spam)."}
        </p>
        {!done ? (
          <>
            <Field label={lang === "ar" ? "البريد الإلكتروني" : "Email"}>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} style={inputSx(!!err)} disabled={loading} />
            </Field>
            {err && <div role="alert" style={{ color: C.danger, fontSize: 12, marginBottom: 10 }}>{err}</div>}
            <Btn children={loading ? "…" : (lang === "ar" ? "متابعة" : "Continue")} full onClick={submit} />
          </>
        ) : (
          <div>
            <p style={{ color: C.muted, fontSize: 13, marginBottom: 12 }}>
              {lang === "ar"
                ? "إذا كان البريد مسجلاً لدينا، ستصلك رابط إعادة التعيين قريباً."
                : "If the email is registered, you will receive a reset link shortly."}
            </p>
          </div>
        )}
        <div style={{ marginTop: 18 }}>
          <button type="button" onClick={() => navigate("/login")} style={{ background: "none", border: "none", color: C.muted, cursor: "pointer", fontSize: 12 }}>
            ← {lang === "ar" ? "العودة لتسجيل الدخول" : "Back to login"}
          </button>
        </div>
      </div>
    </div>
  );
}

export function ResetPasswordPage() {
  const { lang } = useLang();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const oobCode = searchParams.get("oobCode") || "";

  const [pass, setPass] = useState("");
  const [confirm, setConfirm] = useState("");
  const [errs, setErrs] = useState({});
  const [ok, setOk] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const submit = async () => {
    const e = {};
    const rules = validatePassword(pass);
    if (rules.some(r => !r.ok)) e.pass = lang === "ar" ? "كلمة المرور لا تستوفي الشروط" : "Password doesn't meet requirements";
    if (pass !== confirm) e.confirm = lang === "ar" ? "غير متطابقة" : "Passwords don't match";
    if (Object.keys(e).length) { setErrs(e); return; }
    if (!oobCode) {
      setErrs({ pass: lang === "ar" ? "رابط غير صالح" : "Invalid link" });
      return;
    }
    setSubmitting(true);
    try {
      await confirmPasswordReset(auth, oobCode, pass);
      setOk(true);
    } catch {
      setErrs({ pass: lang === "ar" ? "الرابط منتهي أو غير صالح" : "Invalid or expired link" });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div dir={lang === "ar" ? "rtl" : "ltr"} style={{ minHeight: "calc(100vh - 60px)", background: gHero, display: "flex", alignItems: "center", justifyContent: "center", padding: "40px 16px" }}>
      <Seo
        title={lang === "ar" ? "إعادة تعيين كلمة المرور — Eduzah" : "Reset password — Eduzah"}
        description={lang === "ar" ? "عيّن كلمة مرور جديدة لحساب Eduzah." : "Set a new password for your Eduzah account."}
      />
      <div style={{ background: "rgba(50,29,61,.92)", border: `1px solid ${C.border}`, borderRadius: 22, padding: 28, width: "100%", maxWidth: 400 }}>
        {!oobCode ? (
          <p style={{ color: C.danger }}>{lang === "ar" ? "رابط غير صالح. افتح الرابط من البريد الإلكتروني." : "Invalid link. Open the link from your email."}</p>
        ) : ok ? (
          <>
            <h1 style={{ fontSize: 20, marginBottom: 12 }}>{lang === "ar" ? "تم التحديث" : "Password updated"}</h1>
            <Btn children={lang === "ar" ? "تسجيل الدخول" : "Login"} full onClick={() => navigate("/login")} />
          </>
        ) : (
          <>
            <h1 style={{ fontSize: 20, marginBottom: 16 }}>{lang === "ar" ? "كلمة مرور جديدة" : "New password"}</h1>
            <PassField label={lang === "ar" ? "كلمة المرور" : "Password"} value={pass} onChange={setPass} error={errs.pass} placeholder="••••••••" lang={lang} />
            <PassRules pass={pass} lang={lang} />
            <div style={{ marginTop: 10 }}>
              <PassField label={lang === "ar" ? "تأكيد" : "Confirm"} value={confirm} onChange={setConfirm} error={errs.confirm} placeholder="••••••••" lang={lang} />
            </div>
            <Btn children={submitting ? "…" : (lang === "ar" ? "حفظ" : "Save")} full onClick={submit} style={{ marginTop: 16 }} disabled={submitting} />
          </>
        )}
      </div>
    </div>
  );
}
