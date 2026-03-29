import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { C } from "../../theme";
import { Btn, Input, Select } from "../../components/UI";
import { useData } from "../../context/DataContext";
import { useAuth } from "../../context/AuthContext";
import { useLang } from "../../context/LangContext";
import { submitToSheet } from "../../utils/sheets";

const SITE_PHONE = "201044222881";

const TRAINING_TYPES = [
  { v:"recorded", ar:"🎥 مسجّل (أونلاين في أي وقت)", en:"🎥 Recorded (watch anytime)" },
  { v:"online",   ar:"💻 أونلاين مباشر (Live)", en:"💻 Live Online" },
  { v:"offline",  ar:"🏢 حضوري (في المقر)", en:"🏢 Offline (at HQ)" },
];

export default function CourseRegister() {
  const { slug }   = useParams();
  const navigate   = useNavigate();
  const { courses, vodafoneCash } = useData();
  const { currentUser, enrollUser, register } = useAuth();
  const { lang } = useLang();
  const dir = lang === "ar" ? "rtl" : "ltr";

  const course = courses.find(c => c.slug === slug);

  const [step,   setStep]   = useState(1);
  const [method, setMethod] = useState("vodafone");
  const [form,   setForm]   = useState({
    fname: currentUser?.name?.split(" ")[0] || "",
    lname: currentUser?.name?.split(" ").slice(1).join(" ") || "",
    email: currentUser?.email  || "",
    phone: currentUser?.phone  || "",
    level: "", source: "Facebook / Instagram",
    trainingType: (course?.trainingTypes || ["online"])[0],
    createAccount: false, pass: "",
  });
  const [err, setErr] = useState("");

  if (!course) return <div style={{ padding: 80, textAlign: "center", color: C.muted }}>{lang==="ar"?"الكورس غير موجود":"Course not found"}</div>;

  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  /* ── Step 1 validation ── */
  const next2 = () => {
    if (!form.fname || !form.email || !form.phone) { setErr("❗ كمّل الاسم والإيميل والهاتف"); return; }
    if (!form.email.includes("@")) { setErr("❗ البريد غير صحيح"); return; }
    if (form.createAccount && !form.pass) { setErr("❗ أدخل كلمة المرور"); return; }
    setErr(""); setStep(2);
  };

  /* ── Final confirm ── */
  const confirm = () => {
    if (currentUser) {
      enrollUser(currentUser.id, course.id);
    } else if (form.createAccount) {
      const r = register({ name: `${form.fname} ${form.lname}`.trim(), email: form.email, pass: form.pass, phone: form.phone, role: "student" });
      if (!r.ok) { setErr(r.msg); setStep(1); return; }
    }
    // Send enrollment data to Google Sheets
    submitToSheet("enrollment", {
      name:         `${form.fname} ${form.lname}`.trim(),
      phone:        form.phone,
      email:        form.email,
      course:       course?.title || "",
      trainingType: form.trainingType || "",
      payment:      method,
      price:        course?.price || "",
    });
    setStep(3);
  };

  /* ── Payment fields ── */
  const PayFields = {
    card: (
      <div>
        <Input label="رقم البطاقة" value="" onChange={() => {}} placeholder="1234 5678 9012 3456" />
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <Input label="تاريخ الانتهاء" value="" onChange={() => {}} placeholder="MM/YY" />
          <Input label="CVV" value="" onChange={() => {}} placeholder="123" />
        </div>
      </div>
    ),
    vodafone: (
      <div style={{background:"rgba(217,27,91,.07)",border:"1px solid rgba(217,27,91,.2)",borderRadius:12,padding:16,fontSize:13,lineHeight:2,color:"rgba(255,255,255,.85)"}}>
        📱 <strong>ابعت المبلغ على رقم Vodafone Cash:</strong><br/>
        <div style={{fontSize:22,fontWeight:900,color:C.orange,margin:"8px 0"}}>{vodafoneCash}</div>
        واكتب اسمك في رسالة التحويل، وابعت صورة التحويل على واتساب<br/>
        <a href={`https://wa.me/${SITE_PHONE}`} target="_blank" rel="noreferrer" style={{color:"#25d366",fontWeight:700,textDecoration:"none"}}>💬 واتساب</a>
      </div>
    ),
    installment: (
      <div>
        <div style={{ background: "rgba(250,166,51,.08)", border: "1px solid rgba(250,166,51,.22)", borderRadius: 10, padding: 13, fontSize: 13, lineHeight: 1.9, color: "rgba(255,255,255,.8)", marginBottom: 12 }}>
          📅 <strong>3 أقساط متساوية:</strong><br />
          • قسط 1: <strong style={{ color: C.orange }}>{course.installment.toLocaleString()} EGP</strong> عند التسجيل<br />
          • قسط 2: <strong style={{ color: C.orange }}>{course.installment.toLocaleString()} EGP</strong> بعد شهر<br />
          • قسط 3: <strong style={{ color: C.orange }}>{course.installment.toLocaleString()} EGP</strong> بعد شهرين
        </div>
        <Input label="رقم البطاقة للقسط الأول" value="" onChange={() => {}} placeholder="1234 5678..." />
      </div>
    ),
    fawry: (
      <div style={{ background: "rgba(255,255,255,.05)", borderRadius: 10, padding: 16, fontSize: 13, color: C.muted, lineHeight: 2 }}>
        روح أقرب فرع فوري وادفع:<br />
        <strong style={{ color: "#fff", fontSize: 17 }}>{course.price.toLocaleString()} EGP</strong><br />
        كود: <strong style={{ color: C.orange, fontSize: 15 }}>EDZ-{course.slug.toUpperCase()}-2025</strong>
      </div>
    ),
  };

  return (
    <div dir={dir} style={{ background: "linear-gradient(135deg,#1a0a2e,#321d3d,#4a1f6e)", minHeight: "calc(100vh - 58px)", padding: "36px 4%", display: "flex", gap: 32, alignItems: "flex-start", flexWrap: "wrap" }}>

      {/* ── Form ── */}
      <div style={{ flex: "1 1 320px", maxWidth: 480 }}>

        {/* Progress Steps */}
        <div style={{ display: "flex", alignItems: "center", marginBottom: 24 }}>
          {[["1", "بياناتك"], ["2", "الدفع"], ["3", "تأكيد"]].map(([n, l], i, arr) => (
            <div key={n} style={{ display: "flex", alignItems: "center", flex: i < arr.length - 1 ? 1 : "auto" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <div style={{ width: 28, height: 28, borderRadius: "50%", background: step > i + 1 ? C.red : step === i + 1 ? "rgba(217,27,91,.15)" : "transparent", border: `2px solid ${step > i + 1 ? C.red : step === i + 1 ? C.red : C.border}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 800, color: step > i + 1 ? "#fff" : step === i + 1 ? C.red : C.muted, transition: "all .3s", flexShrink: 0 }}>
                  {step > i + 1 ? "✓" : n}
                </div>
                <span style={{ fontSize: 10, color: step === i + 1 ? "#fff" : C.muted, fontWeight: 600 }}>{l}</span>
              </div>
              {i < arr.length - 1 && <div style={{ flex: 1, height: 1, background: step > i + 1 ? C.red : C.border, margin: "0 8px", transition: "background .3s" }} />}
            </div>
          ))}
        </div>

        {/* ── STEP 1 ── */}
        {step === 1 && (
          <div>
            <h1 style={{ fontSize: "clamp(1.2rem,3vw,1.7rem)", fontWeight: 900, marginBottom: 6 }}>سجّل في {course.title} 🚀</h1>
            <p style={{ color: C.muted, fontSize: 12, marginBottom: 20, lineHeight: 1.7 }}>
              {currentUser ? "بياناتك محفوظة — تأكد وكمّل التسجيل." : "خطوة واحدة وتبدأ رحلتك. الأماكن محدودة."}
            </p>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <Input label="الاسم الأول *" value={form.fname} onChange={v => set("fname", v)} placeholder="أحمد" />
              <Input label="الاسم الأخير" value={form.lname} onChange={v => set("lname", v)} placeholder="محمد" />
            </div>
            <Input label="البريد الإلكتروني *" value={form.email} onChange={v => set("email", v)} type="email" placeholder="email@example.com" />
            <Input label="رقم الهاتف *" value={form.phone} onChange={v => set("phone", v)} placeholder="+201xxxxxxxxx" />
            {/* Training Type */}
            {(course.trainingTypes||[]).length>1&&(
              <div style={{marginBottom:14}}>
                <div style={{fontSize:12,color:C.muted,fontWeight:700,marginBottom:8}}>{lang==="ar"?"نوع التدريب المفضل *":"Preferred Training Type *"}</div>
                <div style={{display:"flex",flexDirection:"column",gap:8}}>
                  {TRAINING_TYPES.filter(t=>(course.trainingTypes||[]).includes(t.v)).map(t=>(
                    <div key={t.v} onClick={()=>set("trainingType",t.v)}
                      style={{border:`1.5px solid ${form.trainingType===t.v?C.red:C.border}`,borderRadius:10,padding:"10px 14px",cursor:"pointer",background:form.trainingType===t.v?`${C.red}08`:"transparent",transition:"all .2s",display:"flex",alignItems:"center",gap:10}}>
                      <div style={{width:14,height:14,borderRadius:"50%",border:`2px solid ${form.trainingType===t.v?C.red:C.border}`,background:form.trainingType===t.v?C.red:"transparent",flexShrink:0}}/>
                      <span style={{fontSize:13,fontWeight:600}}>{lang==="ar"?t.ar:t.en}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <Select label="مستواك الحالي" value={form.level} onChange={v => set("level", v)}
              options={[{ v: "", l: "اختر مستواك" }, { v: "beginner", l: "🌱 مبتدئ تماماً" }, { v: "basic", l: "📖 عندي أساسيات" }, { v: "intermediate", l: "💡 متوسط" }, { v: "advanced", l: "🚀 متقدم وعايز أتطور" }]} />
            <Select label="عرفت عنا منين؟" value={form.source} onChange={v => set("source", v)}
              options={[{ v: "Facebook / Instagram", l: "📱 Facebook / Instagram" }, { v: "Google", l: "🔍 Google" }, { v: "friend", l: "👥 من صاحب" }, { v: "YouTube", l: "▶️ YouTube" }, { v: "TikTok", l: "🎵 TikTok" }]} />

            {/* Account creation option for non-logged-in */}
            {!currentUser && (
              <div style={{ marginBottom: 14 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 14px", background: "rgba(255,255,255,.05)", border: `1px solid ${form.createAccount ? C.orange + "55" : C.border}`, borderRadius: 10, cursor: "pointer", marginBottom: 10, transition: "all .2s" }}
                  onClick={() => set("createAccount", !form.createAccount)}>
                  <div style={{ width: 20, height: 20, borderRadius: 5, background: form.createAccount ? C.orange : "transparent", border: `2px solid ${form.createAccount ? C.orange : C.border}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, flexShrink: 0, transition: "all .2s" }}>
                    {form.createAccount ? "✓" : ""}
                  </div>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 700 }}>إنشاء حساب على المنصة</div>
                    <div style={{ fontSize: 11, color: C.muted }}>متابعة الكورس والدروس بعد التسجيل</div>
                  </div>
                </div>
                {form.createAccount && (
                  <Input label="كلمة المرور *" value={form.pass} onChange={v => set("pass", v)} type="password" placeholder="••••••••" />
                )}
              </div>
            )}

            {err && <div style={{ background: "rgba(239,68,68,.1)", border: "1px solid rgba(239,68,68,.3)", borderRadius: 9, padding: "8px 12px", fontSize: 12, color: C.danger, marginBottom: 12 }}>{err}</div>}

            <Btn children="التالي — الدفع ←" full onClick={next2} style={{ padding: "13px", fontSize: 14, marginTop: 4 }} />
            <p style={{ textAlign: "center", marginTop: 10, fontSize: 11, color: C.muted }}>
              <span style={{ color: C.orange, cursor: "pointer", fontWeight: 700 }} onClick={() => navigate(`/courses/${slug}`)}>← رجوع للكورس</span>
              {!currentUser && <> · <span style={{ color: C.muted }}>عندك حساب؟ </span><span style={{ color: C.orange, cursor: "pointer", fontWeight: 700 }} onClick={() => navigate("/login")}>سجّل دخولك</span></>}
            </p>
          </div>
        )}

        {/* ── STEP 2 ── */}
        {step === 2 && (
          <div>
            <h1 style={{ fontSize: "clamp(1.2rem,3vw,1.7rem)", fontWeight: 900, marginBottom: 6 }}>اختر طريقة الدفع 💳</h1>
            <p style={{ color: C.muted, fontSize: 12, marginBottom: 18 }}>دفع آمن · ضمان استرداد 14 يوم</p>

            {/* Summary */}
            <div style={{ background: "rgba(250,166,51,.07)", border: "1px solid rgba(250,166,51,.22)", borderRadius: 11, padding: "12px 14px", marginBottom: 18, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <div style={{ fontWeight: 700, fontSize: 13 }}>{course.title}</div>
                <div style={{ color: C.muted, fontSize: 11 }}>{course.duration} · {course.hours}h</div>
              </div>
              <div style={{ fontSize: 18, fontWeight: 900, color: C.orange }}>{course.price.toLocaleString()} EGP</div>
            </div>

            {/* Payment methods */}
            {[
              ["card",        "💳 بطاقة بنكية",  "Visa / Mastercard / Meeza"],
              ["vodafone",    "📱 Vodafone Cash", "محفظة موبايل"],
              ["installment", "📅 3 أقساط",      `3 × ${course.installment.toLocaleString()} EGP`],
              ["fawry",       "🏪 فوري",          "في أقرب منفذ"],
            ].map(([k, t, s]) => (
              <div key={k} onClick={() => setMethod(k)}
                style={{ border: `1.5px solid ${method === k ? C.red : C.border}`, borderRadius: 10, padding: "10px 12px", cursor: "pointer", transition: "all .2s", display: "flex", alignItems: "center", gap: 10, marginBottom: 8, background: method === k ? `${C.red}08` : "transparent" }}>
                <div style={{ width: 14, height: 14, borderRadius: "50%", border: `2px solid ${method === k ? C.red : C.border}`, background: method === k ? C.red : "transparent", flexShrink: 0, transition: "all .2s" }} />
                <div>
                  <div style={{ fontWeight: 700, fontSize: 12 }}>{t}</div>
                  <div style={{ color: C.muted, fontSize: 10 }}>{s}</div>
                </div>
              </div>
            ))}

            <div style={{ marginTop: 12 }}>{PayFields[method]}</div>

            <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
              <Btn children="← رجوع" v="outline" onClick={() => setStep(1)} style={{ padding: "11px 18px" }} />
              <Btn children="تأكيد الدفع 🔒" onClick={confirm} style={{ flex: 1, padding: "12px", fontSize: 13 }} />
            </div>
            <div style={{ textAlign: "center", marginTop: 8, color: C.muted, fontSize: 10 }}>🔒 SSL Encrypted · ↩ ضمان استرداد 14 يوم</div>
          </div>
        )}

        {/* ── STEP 3 — SUCCESS ── */}
        {step === 3 && (
          <div style={{ textAlign: "center", padding: "20px 0" }}>
            <div style={{ fontSize: 68, marginBottom: 16 }}>🎉</div>
            <h2 style={{ fontSize: 22, fontWeight: 900, marginBottom: 8 }}>تم التسجيل بنجاح!</h2>
            <p style={{ color: C.muted, fontSize: 13, lineHeight: 1.8, marginBottom: 20 }}>
              {currentUser ? "تم تسجيلك في الكورس. هيتواصل معاك فريق Eduzah خلال 24 ساعة." : "استلمنا بياناتك. هيتواصل معاك فريق Eduzah خلال 24 ساعة لتأكيد التسجيل."}
            </p>
            <div style={{ background: "rgba(16,185,129,.07)", border: "1px solid rgba(16,185,129,.22)", borderRadius: 14, padding: 16, marginBottom: 20, textAlign: "right" }}>
              <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 8, color: C.success }}>✅ الخطوات القادمة:</div>
              <div style={{ color: C.muted, fontSize: 12, lineHeight: 2 }}>
                1. راجع بريدك — رسالة تأكيد في الطريق 📧<br />
                2. انضم لـ WhatsApp Group الدفعة 📱<br />
                3. اتلقى لينك الـ Welcome Session 🎥<br />
                4. ابدأ الدبلومة وحقق حلمك 🚀
              </div>
            </div>
            <div style={{ display: "flex", gap: 10, justifyContent: "center", flexWrap: "wrap" }}>
              {currentUser
                ? <Btn children="اذهب للداشبورد 🎓" onClick={() => navigate("/dashboard")} style={{ padding: "12px 24px" }} />
                : <Btn children="سجّل حساب الآن 🚀" onClick={() => navigate("/register")} style={{ padding: "12px 24px" }} />
              }
              <Btn children="رجوع للرئيسية" v="outline" onClick={() => navigate("/")} style={{ padding: "12px 22px" }} />
            </div>
            <div style={{ marginTop: 16 }}>
              <a href="https://wa.me/201044222881" target="_blank" rel="noreferrer"
                style={{ color: "#25d366", fontSize: 12, fontWeight: 700, textDecoration: "none" }}>
                💬 تابع مع فريقنا على واتساب
              </a>
            </div>
          </div>
        )}
      </div>

      {/* ── Side Summary ── */}
      <div style={{ flex: "0 1 270px" }}>
        <div style={{ background: "rgba(50,29,61,.85)", backdropFilter: "blur(16px)", border: `1px solid ${C.border}`, borderRadius: 16, padding: 20, position: "sticky", top: 80 }}>
          {/* Course preview */}
          <div style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 16 }}>
            <div style={{ width: 44, height: 44, borderRadius: 12, background: `linear-gradient(135deg,${course.color},#321d3d)`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, flexShrink: 0 }}>{course.icon}</div>
            <div>
              <div style={{ fontWeight: 800, fontSize: 13 }}>{course.title}</div>
              <div style={{ color: C.muted, fontSize: 11 }}>{course.duration}</div>
            </div>
          </div>

          <div style={{ fontSize: 22, fontWeight: 900, color: C.orange, marginBottom: 2 }}>{course.price.toLocaleString()} EGP</div>
          <div style={{ color: C.muted, fontSize: 10, marginBottom: 14 }}>أو 3 × {course.installment.toLocaleString()} EGP</div>
          <hr style={{ border: "none", borderTop: `1px solid ${C.border}`, marginBottom: 14 }} />

          {/* Features */}
          <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
            {[
              ["📚", `${course.hours}h تدريب مكثف`],
              ["🛠", `${course.projects || 0}+ مشروع حقيقي`],
              ["🤖", "AI Tools مدمجة"],
              ["🏆", "شهادة معتمدة"],
              ["💼", "دعم توظيف"],
              ["↩", "ضمان استرداد 14 يوم"],
            ].map(([icon, text]) => (
              <div key={text} style={{ display: "flex", alignItems: "center", gap: 10, background: "rgba(255,255,255,.04)", border: `1px solid ${C.border}`, borderRadius: 9, padding: "8px 12px", fontSize: 12 }}>
                <span style={{ fontSize: 15 }}>{icon}</span>{text}
              </div>
            ))}
          </div>

          <div style={{ marginTop: 14, background: "rgba(217,27,91,.08)", border: "1px solid rgba(217,27,91,.2)", borderRadius: 9, padding: "10px 12px", fontSize: 11, textAlign: "center", color: C.muted }}>
            🔥 <strong style={{ color: C.red }}>7 أماكن فقط</strong> متبقية في الدفعة
          </div>

          <a href="https://wa.me/201044222881" target="_blank" rel="noreferrer"
            style={{ display: "block", textAlign: "center", color: "#25d366", fontWeight: 700, fontSize: 12, marginTop: 12, textDecoration: "none" }}>
            💬 استفسر عبر واتساب
          </a>
        </div>
      </div>
    </div>
  );
}
