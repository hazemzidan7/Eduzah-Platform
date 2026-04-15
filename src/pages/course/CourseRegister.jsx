import { useState, useMemo } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { addDoc, collection, getDocs, query, where, doc, updateDoc, getDoc } from "firebase/firestore";
import { C } from "../../theme";
import { Btn, Input, Select } from "../../components/UI";
import { useData } from "../../context/DataContext";
import { useAuth } from "../../context/AuthContext";
import { useLang } from "../../context/LangContext";
import { submitToSheet } from "../../utils/sheets";
import { appendPlainNotification } from "../../utils/gamification";
import { auth, db } from "../../firebase";

const SITE_PHONE = "201044222881";
const INSTAPAY_PHONE = "01044222881";

const TRAINING_TYPES = [
  { v: "online", ar: "أونلاين مباشر (Live)", en: "Live Online" },
  { v: "offline", ar: "حضوري في فرع الشركة (Offline)", en: "Offline at company branch" },
];

function NextStepsTimeline({ ar }) {
  const steps = ar
    ? ["إرسال الطلب والدفع عبر InstaPay", "إرسال إيصال التحويل على واتساب", "مراجعة الإدارة (خلال 24 ساعة)", "منحك صلاحية الكورس على المنصة"]
    : ["Submit request & pay via InstaPay", "Send the transfer receipt on WhatsApp", "Admin review (within 24 hours)", "Course access unlocked on the platform"];
  return (
    <div style={{ background: "rgba(16,185,129,.07)", border: "1px solid rgba(16,185,129,.22)", borderRadius: 14, padding: 16, marginBottom: 20, textAlign: ar ? "right" : "left" }}>
      <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 10, color: "#10b981" }}>
        {ar ? "الخطوات التالية" : "What happens next?"}
      </div>
      <ol style={{ margin: 0, paddingInlineStart: 18, color: C.muted, fontSize: 12, lineHeight: 2 }}>
        {steps.map((s) => <li key={s}>{s}</li>)}
      </ol>
    </div>
  );
}

export default function CourseRegister() {
  const { slug }   = useParams();
  const navigate   = useNavigate();
  const { courses } = useData();
  const { currentUser, register, refreshUserProfile } = useAuth();
  const { lang } = useLang();
  const dir = lang === "ar" ? "rtl" : "ltr";
  const ar = lang === "ar";

  const course = courses.find(c => c.slug === slug);

  const [step, setStep] = useState(1);
  /** full = one payment with 5% discount; installments = 3× course.installment */
  const [paymentPlan, setPaymentPlan] = useState("full");
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
  const [emailAlreadyRegistered, setEmailAlreadyRegistered] = useState(false);
  const [confirming, setConfirming] = useState(false);

  if (!course) return <div style={{ padding: 80, textAlign: "center", color: C.muted }}>{ar ? "الكورس غير موجود" : "Course not found"}</div>;

  const set = (k, v) => {
    if (k === "email") setEmailAlreadyRegistered(false);
    setForm((p) => ({ ...p, [k]: v }));
  };

  const fullPayDiscounted = useMemo(
    () => Math.max(0, Math.round((Number(course?.price) || 0) * 0.95)),
    [course?.price],
  );

  const amountQuoted = paymentPlan === "full" ? fullPayDiscounted : (course?.installment ?? 0);

  const next2 = () => {
    if (!form.fname || !form.email || !form.phone) { setErr(ar ? "كمّل الاسم والإيميل والهاتف" : "Complete name, email and phone"); return; }
    if (!form.email.includes("@")) { setErr(ar ? "البريد غير صحيح" : "Invalid email"); return; }
    if (form.createAccount && !form.pass) { setErr(ar ? "أدخل كلمة المرور" : "Enter a password"); return; }
    setErr(""); setStep(2);
  };

  const confirm = async () => {
    if (confirming) return;
    setConfirming(true);
    setErr("");
    setEmailAlreadyRegistered(false);
    try {
      const em = form.email.trim().toLowerCase();
      const firebaseUid = auth.currentUser?.uid ?? null;
      let uidApply = firebaseUid ?? currentUser?.id ?? null;

      // Guests cannot list enrollmentRequests (Firestore rules). Signed-in users: narrow queries only.
      // If the index is missing or the query errors, skip duplicate check so confirm can still complete.
      let hasPending = false;
      if (firebaseUid) {
        try {
          const courseIdStr = String(course.id ?? "");
          const accountEmail = (currentUser?.email || auth.currentUser?.email || "").trim().toLowerCase();
          const byUid = await getDocs(
            query(collection(db, "enrollmentRequests"), where("courseId", "==", courseIdStr), where("userId", "==", firebaseUid)),
          );
          const byEmail = accountEmail
            ? await getDocs(
                query(collection(db, "enrollmentRequests"), where("courseId", "==", courseIdStr), where("studentEmail", "==", accountEmail)),
              )
            : { docs: [] };
          const seen = new Set();
          const merged = [];
          for (const d of [...byUid.docs, ...byEmail.docs]) {
            if (seen.has(d.id)) continue;
            seen.add(d.id);
            merged.push(d);
          }
          hasPending = merged.some((d) => (d.data().enrollmentStatus ?? "pending") === "pending");
        } catch (dupErr) {
          console.warn("[CourseRegister] pending duplicate check skipped:", dupErr?.code || dupErr);
        }
      }
      if (hasPending) {
        setErr(ar ? "لديك طلب قيد المراجعة لهذا الكورس." : "You already have a pending request for this course.");
        return;
      }

      if (!uidApply && form.createAccount) {
        const r = await register({
          name: `${form.fname} ${form.lname}`.trim(),
          email: form.email,
          pass: form.pass,
          phone: form.phone,
        });
        if (!r.ok) {
          if (r.code === "EMAIL_EXISTS") {
            setEmailAlreadyRegistered(true);
            setErr(ar ? "البريد الإلكتروني مسجّل بالفعل." : "This email is already registered.");
          } else if (r.code === "EMAIL_EXISTS_RESET_NEEDED") {
            setEmailAlreadyRegistered(true);
            setErr(ar
              ? "الإيميل ده كان مسجّل قبل — استخدم «نسيت كلمة المرور» لإعادة تعيينها."
              : "This email was registered before — use «Forgot password» to reset it.");
          } else {
            setErr(ar ? "تعذر إنشاء الحساب" : "Registration failed");
          }
          setStep(1);
          return;
        }
        uidApply = auth.currentUser?.uid ?? r.uid ?? null;
        await refreshUserProfile();
      }

      // Firestore rule: signed-in ⇒ userId must equal auth.uid; guest ⇒ userId must be null.
      const uidForDoc = auth.currentUser?.uid ?? null;

      await submitToSheet("enrollment", {
        name: `${form.fname} ${form.lname}`.trim(),
        phone: form.phone,
        email: form.email,
        course: course?.title || "",
        trainingType: form.trainingType || "",
        payment: "instapay",
        paymentPlan,
        amountQuoted,
        price: course?.price ?? "",
      });

      const courseIdStr = String(course.id ?? "");
      const courseTitleStr = String(course.title ?? course.title_en ?? "").trim();

      await addDoc(collection(db, "enrollmentRequests"), {
        courseId: courseIdStr,
        courseTitle: courseTitleStr,
        studentName: `${form.fname} ${form.lname}`.trim(),
        studentEmail: em,
        studentPhone: form.phone,
        userId: uidForDoc,
        trainingType: form.trainingType || "",
        level: form.level || "",
        source: form.source || "",
        paymentMethod: "instapay",
        paymentPlan,
        amountQuoted,
        // Prefer a unified status field; keep enrollmentStatus for backwards compatibility
        status: "pending",
        enrollmentStatus: "pending",
        createdAt: new Date().toISOString(),
      });

      // Proceed to success step — notification is a best-effort side effect
      setStep(3);

      // Fire notification without blocking the UI transition
      if (uidForDoc) {
        (async () => {
          try {
            const uref = doc(db, "users", uidForDoc);
            const us = await getDoc(uref);
            if (us.exists()) {
              const u = us.data();
              const msg =
                "استلمنا طلب التسجيل في الكورس — سنراجعه خلال 24 ساعة وسيتم إشعارك. | "
                + "We received your course request — we will review it within 24 hours.";
              const userNotifications = appendPlainNotification(u, msg);
              await updateDoc(uref, { userNotifications });
              await refreshUserProfile();
            }
          } catch (notifyErr) {
            console.warn("[CourseRegister] notification update skipped:", notifyErr?.code || notifyErr);
          }
        })();
      }
    } catch (e) {
      console.error(e);
      const code = e?.code || "";
      const perm = code === "permission-denied";
      setErr(
        perm
          ? (ar ? "صلاحية مرفوضة: تأكد من تسجيل الدخول أو أن بيانات الطلب صحيحة." : "Permission denied: check you are signed in and try again.")
          : (ar ? "حدث خطأ أثناء الحفظ. حاول مرة أخرى." : "Something went wrong. Please try again."),
      );
    } finally {
      setConfirming(false);
    }
  };

  const instapayInstructions = (
    <div style={{ background: "rgba(16,185,129,.08)", border: "1px solid rgba(16,185,129,.25)", borderRadius: 12, padding: 16, fontSize: 13, lineHeight: 2, color: "rgba(255,255,255,.9)" }}>
      <strong>{ar ? "الدفع عبر InstaPay على الرقم:" : "Pay via InstaPay to:"}</strong>
      <div style={{ fontSize: 22, fontWeight: 900, color: C.orange, margin: "10px 0", letterSpacing: 1 }}>{INSTAPAY_PHONE}</div>
      <div style={{ marginBottom: 8 }}>
        {paymentPlan === "full"
          ? (ar
            ? <>المبلغ المستحق بعد خصم 5%: <strong>{fullPayDiscounted.toLocaleString()} EGP</strong></>
            : <>Amount due (5% discount applied): <strong>{fullPayDiscounted.toLocaleString()} EGP</strong></>)
          : (ar
            ? <>القسط الأول الآن: <strong>{course.installment.toLocaleString()} EGP</strong> — ثم قسطان بنفس المبلغ لاحقاً حسب الاتفاق.</>
            : <>First installment now: <strong>{course.installment.toLocaleString()} EGP</strong> — two more installments as agreed.</>)}
      </div>
      {ar
        ? <>اكتب اسمك في رسالة التحويل وأرسل إيصال التحويل على واتساب للتأكيد.</>
        : <>Put your name in the transfer note and send the receipt on WhatsApp for confirmation.</>}
      <br />
      <a href={`https://wa.me/${SITE_PHONE}`} target="_blank" rel="noreferrer" style={{ color: "#25d366", fontWeight: 700, textDecoration: "none" }}>WhatsApp</a>
    </div>
  );

  return (
    <div dir={dir} style={{ background: "linear-gradient(135deg,#1a0a2e,#321d3d,#4a1f6e)", minHeight: "calc(100vh - 58px)", padding: "36px 4%", display: "flex", gap: 32, alignItems: "flex-start", flexWrap: "wrap" }}>

      {/* ── Form ── */}
      <div style={{ flex: "1 1 320px", maxWidth: 480 }}>

        {/* Progress Steps */}
        <div style={{ display: "flex", alignItems: "center", marginBottom: 24 }}>
          {[[ar?"بياناتك":"Details"], [ar?"الدفع":"Payment"], [ar?"تأكيد":"Confirm"]].map(([l], i, arr) => (
            <div key={i} style={{ display: "flex", alignItems: "center", flex: i < arr.length - 1 ? 1 : "auto" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <div style={{ width: 28, height: 28, borderRadius: "50%", background: step > i + 1 ? C.red : step === i + 1 ? "rgba(217,27,91,.15)" : "transparent", border: `2px solid ${step > i + 1 ? C.red : step === i + 1 ? C.red : C.border}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 800, color: step > i + 1 ? "#fff" : step === i + 1 ? C.red : C.muted, transition: "all .3s", flexShrink: 0 }}>
                  {step > i + 1 ? "✓" : i + 1}
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
            <h1 style={{ fontSize: "clamp(1.2rem,3vw,1.7rem)", fontWeight: 900, marginBottom: 6 }}>
              {ar ? `سجّل في ${course.title}` : `Enroll in ${course.title_en || course.title}`}
            </h1>
            <p style={{ color: C.muted, fontSize: 12, marginBottom: 20, lineHeight: 1.7 }}>
              {currentUser
                ? (ar ? "بياناتك محفوظة — أكمل الطلب والدفع. الموافقة على الكورس من الإدارة فقط." : "Your details are saved — complete payment. Course access is approved by the team.")
                : (ar ? "خطوة واحدة وتبدأ رحلتك. الأماكن محدودة." : "One step and your journey begins. Limited spots available.")}
            </p>

            {!currentUser && (
              <div style={{ background: "rgba(250,166,51,.1)", border: "1px solid rgba(250,166,51,.35)", borderRadius: 10, padding: "12px 14px", fontSize: 12, color: C.muted, marginBottom: 16, lineHeight: 1.75 }}>
                {ar
                  ? "بدون حساب: سيتم التواصل معك يدوياً عبر واتساب. لمتابعة تقدمك على المنصة، فعّل «إنشاء حساب» أو سجّل الدخول."
                  : "Without an account: we will follow up manually via WhatsApp. To track progress on the platform, turn on «Create a platform account» or sign in."}
              </div>
            )}

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <Input label={ar ? "الاسم الأول *" : "First name *"} value={form.fname} onChange={v => set("fname", v)} placeholder={ar ? "أحمد" : "John"} />
              <Input label={ar ? "الاسم الأخير" : "Last name"} value={form.lname} onChange={v => set("lname", v)} placeholder={ar ? "محمد" : "Doe"} />
            </div>
            <Input label={ar ? "البريد الإلكتروني *" : "Email *"} value={form.email} onChange={v => set("email", v)} type="email" placeholder="email@example.com" />
            <Input label={ar ? "رقم الهاتف *" : "Phone *"} value={form.phone} onChange={v => set("phone", v)} placeholder="+201xxxxxxxxx" />

            {/* Training Type */}
            {(course.trainingTypes||[]).length > 1 && (
              <div style={{marginBottom:14}}>
                <div style={{fontSize:12,color:C.muted,fontWeight:700,marginBottom:8}}>{ar ? "نوع التدريب المفضل *" : "Preferred Training Type *"}</div>
                <div style={{display:"flex",flexDirection:"column",gap:8}}>
                  {TRAINING_TYPES.filter(t=>(course.trainingTypes||[]).includes(t.v)).map(t=>(
                    <div key={t.v} onClick={()=>set("trainingType",t.v)}
                      style={{border:`1.5px solid ${form.trainingType===t.v?C.red:C.border}`,borderRadius:10,padding:"10px 14px",cursor:"pointer",background:form.trainingType===t.v?`${C.red}08`:"transparent",transition:"all .2s",display:"flex",alignItems:"center",gap:10}}>
                      <div style={{width:14,height:14,borderRadius:"50%",border:`2px solid ${form.trainingType===t.v?C.red:C.border}`,background:form.trainingType===t.v?C.red:"transparent",flexShrink:0}}/>
                      <span style={{fontSize:13,fontWeight:600}}>{ar ? t.ar : t.en}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <Select label={ar ? "مستواك الحالي" : "Your current level"} value={form.level} onChange={v => set("level", v)}
              options={[
                { v: "", l: ar ? "اختر مستواك" : "Choose your level" },
                { v: "beginner",     l: ar ? "مبتدئ تماماً"          : "Complete beginner" },
                { v: "basic",        l: ar ? "عندي أساسيات"          : "I know the basics" },
                { v: "intermediate", l: ar ? "متوسط"                  : "Intermediate" },
                { v: "advanced",     l: ar ? "متقدم وعايز أتطور"      : "Advanced, looking to improve" },
              ]} />
            <Select label={ar ? "عرفت عنا منين؟" : "How did you hear about us?"} value={form.source} onChange={v => set("source", v)}
              options={[
                { v: "Facebook / Instagram", l: "Facebook / Instagram" },
                { v: "Google",               l: "Google" },
                { v: "friend",               l: ar ? "من صاحب" : "From a friend" },
                { v: "YouTube",              l: "YouTube" },
                { v: "TikTok",               l: "TikTok" },
              ]} />

            {!currentUser && (
              <div style={{ marginBottom: 14 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 14px", background: "rgba(255,255,255,.05)", border: `1px solid ${form.createAccount ? C.orange + "55" : C.border}`, borderRadius: 10, cursor: "pointer", marginBottom: 10, transition: "all .2s" }}
                  onClick={() => set("createAccount", !form.createAccount)}>
                  <div style={{ width: 20, height: 20, borderRadius: 5, background: form.createAccount ? C.orange : "transparent", border: `2px solid ${form.createAccount ? C.orange : C.border}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, flexShrink: 0, transition: "all .2s" }}>
                    {form.createAccount ? "✓" : ""}
                  </div>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 700 }}>{ar ? "إنشاء حساب على المنصة" : "Create a platform account"}</div>
                    <div style={{ fontSize: 11, color: C.muted }}>{ar ? "متابعة الكورس والدروس بعد التسجيل" : "Track your course and lessons after enrollment"}</div>
                  </div>
                </div>
                {form.createAccount && (
                  <Input label={ar ? "كلمة المرور *" : "Password *"} value={form.pass} onChange={v => set("pass", v)} type="password" placeholder="••••••••" />
                )}
              </div>
            )}

            {err && <div style={{ background: "rgba(239,68,68,.1)", border: "1px solid rgba(239,68,68,.3)", borderRadius: 9, padding: "8px 12px", fontSize: 12, color: C.danger, marginBottom: 12 }}>{err}</div>}
            {emailAlreadyRegistered && (
              <div style={{ background: "rgba(250,166,51,.12)", border: `1px solid ${C.orange}40`, borderRadius: 10, padding: "10px 12px", fontSize: 12, color: C.muted, marginBottom: 12, lineHeight: 1.7 }}>
                {ar
                  ? "سجّل الدخول بهذا البريد، أو استخدم «نسيت كلمة المرور» لاستلام رابط في البريد وتعيين كلمة جديدة."
                  : "Sign in with this email, or use “Forgot password” to receive a link and set a new password."}
                <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginTop: 8 }}>
                  <Link to="/login" style={{ color: C.orange, fontWeight: 800, textDecoration: "none" }}>{ar ? "تسجيل الدخول" : "Sign in"}</Link>
                  <span style={{ opacity: 0.5 }}>|</span>
                  <Link to="/forgot-password" style={{ color: C.orange, fontWeight: 800, textDecoration: "none" }}>{ar ? "نسيت كلمة المرور" : "Forgot password"}</Link>
                </div>
              </div>
            )}

            <Btn children={ar ? "التالي — الدفع ←" : "Next — Payment →"} full onClick={next2} style={{ padding: "13px", fontSize: 14, marginTop: 4 }} />
            <p style={{ textAlign: "center", marginTop: 10, fontSize: 11, color: C.muted }}>
              <span style={{ color: C.orange, cursor: "pointer", fontWeight: 700 }} onClick={() => navigate(`/courses/${slug}`)}>
                {ar ? "← رجوع للكورس" : "← Back to course"}
              </span>
              {!currentUser && <>
                {" · "}
                <span style={{ color: C.muted }}>{ar ? "عندك حساب؟ " : "Have an account? "}</span>
                <span style={{ color: C.orange, cursor: "pointer", fontWeight: 700 }} onClick={() => navigate("/login")}>{ar ? "سجّل دخولك" : "Sign in"}</span>
              </>}
            </p>
          </div>
        )}

        {/* ── STEP 2 ── */}
        {step === 2 && (
          <div>
            <h1 style={{ fontSize: "clamp(1.2rem,3vw,1.7rem)", fontWeight: 900, marginBottom: 6 }}>
              {ar ? "اختر طريقة الدفع" : "Choose Payment Method"}
            </h1>
            <p style={{ color: C.muted, fontSize: 12, marginBottom: 18 }}>
              {ar ? "دفع آمن · ضمان استرداد 14 يوم" : "Secure payment · 14-day money-back guarantee"}
            </p>

            {/* Summary */}
            <div style={{ background: "rgba(250,166,51,.07)", border: "1px solid rgba(250,166,51,.22)", borderRadius: 11, padding: "12px 14px", marginBottom: 18, display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8 }}>
              <div>
                <div style={{ fontWeight: 700, fontSize: 13 }}>{ar ? course.title : (course.title_en || course.title)}</div>
                <div style={{ color: C.muted, fontSize: 11 }}>{course.duration} · {course.hours}h</div>
              </div>
              <div style={{ textAlign: ar ? "left" : "right" }}>
                <div style={{ fontSize: 11, color: C.muted, marginBottom: 2 }}>{ar ? "المستحق الآن" : "Due now"}</div>
                <div style={{ fontSize: 18, fontWeight: 900, color: C.orange }}>{amountQuoted.toLocaleString()} EGP</div>
                {paymentPlan === "full" && (
                  <div style={{ fontSize: 10, color: C.success, fontWeight: 600 }}>{ar ? "شامل خصم 5%" : "Includes 5% discount"}</div>
                )}
              </div>
            </div>

            <div style={{ fontWeight: 700, fontSize: 12, marginBottom: 8, color: C.muted }}>{ar ? "خطة الدفع" : "Payment plan"}</div>
            {[
              ["full", ar ? "دفع كامل (خصم 5%)" : "Full payment (5% off)", ar ? `بدل ${course.price.toLocaleString()} → ${fullPayDiscounted.toLocaleString()} EGP` : `${course.price.toLocaleString()} → ${fullPayDiscounted.toLocaleString()} EGP`],
              ["installments", ar ? "أقساط" : "Installments", ar ? `3 × ${course.installment.toLocaleString()} EGP` : `3 × ${course.installment.toLocaleString()} EGP`],
            ].map(([k, label, sub]) => (
              <div key={k} onClick={() => setPaymentPlan(k)}
                style={{ border: `1.5px solid ${paymentPlan === k ? C.red : C.border}`, borderRadius: 10, padding: "10px 12px", cursor: "pointer", transition: "all .2s", display: "flex", alignItems: "center", gap: 10, marginBottom: 8, background: paymentPlan === k ? `${C.red}08` : "transparent" }}>
                <div style={{ width: 14, height: 14, borderRadius: "50%", border: `2px solid ${paymentPlan === k ? C.red : C.border}`, background: paymentPlan === k ? C.red : "transparent", flexShrink: 0, transition: "all .2s" }} />
                <div>
                  <div style={{ fontWeight: 700, fontSize: 12 }}>{label}</div>
                  <div style={{ color: C.muted, fontSize: 10 }}>{sub}</div>
                </div>
              </div>
            ))}

            <div style={{ fontWeight: 700, fontSize: 12, margin: "14px 0 8px", color: C.muted }}>{ar ? "طريقة الدفع" : "Payment method"}</div>
            <div style={{ marginTop: 4 }}>{instapayInstructions}</div>

            {err && step === 2 && <div style={{ background: "rgba(239,68,68,.1)", border: "1px solid rgba(239,68,68,.3)", borderRadius: 9, padding: "8px 12px", fontSize: 12, color: C.danger, marginBottom: 12 }}>{err}</div>}
            <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
              <Btn children={ar ? "← رجوع" : "← Back"} v="outline" disabled={confirming} onClick={() => setStep(1)} style={{ padding: "11px 18px" }} />
              <Btn children={confirming ? (ar ? "جاري الإرسال…" : "Submitting…") : (ar ? "تأكيد الدفع" : "Confirm Payment")} onClick={confirm} disabled={confirming} style={{ flex: 1, padding: "12px", fontSize: 13 }} />
            </div>
            <div style={{ textAlign: "center", marginTop: 8, color: C.muted, fontSize: 10 }}>
              {ar ? "SSL مشفّر · ضمان استرداد 14 يوم" : "SSL Encrypted · 14-day money-back guarantee"}
            </div>
          </div>
        )}

        {/* ── STEP 3 — SUCCESS ── */}
        {step === 3 && (
          <div style={{ textAlign: "center", padding: "20px 0" }}>
            <div style={{ width: 68, height: 68, borderRadius: "50%", background: "rgba(16,185,129,.15)", border: "2px solid rgba(16,185,129,.4)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px", fontSize: 28, fontWeight: 900, color: "#10b981" }}>✓</div>
            <h2 style={{ fontSize: 22, fontWeight: 900, marginBottom: 8 }}>{ar ? "تم استلام طلبك" : "Request received"}</h2>
            <p style={{ color: C.muted, fontSize: 13, lineHeight: 1.8, marginBottom: 20 }}>
              {ar
                ? "طلب التسجيل في الكورس قيد المراجعة. لن يُفتح لك المحتوى قبل موافقة الإدارة. يمكنك متابعة الحالة من صفحة الكورس."
                : "Your course application is under review. You will not get course content until the team approves. Check status on the course page."}
            </p>
            <NextStepsTimeline ar={ar} />
            <div style={{ display: "flex", gap: 10, justifyContent: "center", flexWrap: "wrap" }}>
              <Btn children={ar ? "صفحة الكورس (حالة الطلب)" : "Course page (status)"} onClick={() => navigate(`/courses/${slug}`)} style={{ padding: "12px 24px" }} />
              <Btn children={ar ? "كورساتي" : "My courses"} v="outline" onClick={() => navigate("/my-courses")} style={{ padding: "12px 22px" }} />
              <Btn children={ar ? "لوحة التحكم" : "Dashboard"} v="outline" onClick={() => navigate("/dashboard")} style={{ padding: "12px 22px" }} />
            </div>
            <div style={{ marginTop: 16 }}>
              <a href="https://wa.me/201044222881" target="_blank" rel="noreferrer"
                style={{ color: "#25d366", fontSize: 12, fontWeight: 700, textDecoration: "none" }}>
                {ar ? "تابع مع فريقنا على واتساب" : "Follow up with our team on WhatsApp"}
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
            <div style={{ width: 44, height: 44, borderRadius: 12, background: `linear-gradient(135deg,${course.color},#321d3d)`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <span style={{ fontWeight: 900, color: "rgba(255,255,255,.6)", fontSize: 10 }}>{course.slug.slice(0,2).toUpperCase()}</span>
            </div>
            <div>
              <div style={{ fontWeight: 800, fontSize: 13 }}>{ar ? course.title : (course.title_en || course.title)}</div>
              <div style={{ color: C.muted, fontSize: 11 }}>{course.duration}</div>
            </div>
          </div>

          <div style={{ fontSize: 22, fontWeight: 900, color: C.orange, marginBottom: 2 }}>{course.price.toLocaleString()} EGP</div>
          <div style={{ color: C.muted, fontSize: 10, marginBottom: 14 }}>
            {ar ? "دفع كامل بخصم 5%:" : "Full payment −5%:"} {Math.round(course.price * 0.95).toLocaleString()} EGP · {ar ? "أو 3 ×" : "or 3 ×"} {course.installment.toLocaleString()}
          </div>
          <hr style={{ border: "none", borderTop: `1px solid ${C.border}`, marginBottom: 14 }} />

          {/* Features */}
          <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
            {[
              [`${course.hours}h ${ar ? "تدريب مكثف" : "intensive training"}`],
              [`${course.projects || 0}+ ${ar ? "مشروع حقيقي" : "real projects"}`],
              [ar ? "أدوات AI مدمجة" : "AI Tools included"],
              [ar ? "شهادة معتمدة" : "Certified credential"],
              [ar ? "دعم توظيف" : "Career support"],
              [ar ? "ضمان استرداد 14 يوم" : "14-day money-back"],
            ].map(([text]) => (
              <div key={text} style={{ display: "flex", alignItems: "center", gap: 10, background: "rgba(255,255,255,.04)", border: `1px solid ${C.border}`, borderRadius: 9, padding: "8px 12px", fontSize: 12 }}>
                <span style={{ color: "#10b981", fontWeight: 700, flexShrink: 0 }}>✓</span>
                {text}
              </div>
            ))}
          </div>

          <div style={{ marginTop: 14, background: "rgba(217,27,91,.08)", border: "1px solid rgba(217,27,91,.2)", borderRadius: 9, padding: "10px 12px", fontSize: 11, textAlign: "center", color: C.muted }}>
            <strong style={{ color: C.red }}>{ar ? "7 أماكن فقط" : "Only 7 spots"}</strong> {ar ? "متبقية في الدفعة" : "left in this batch"}
          </div>

          <a href="https://wa.me/201044222881" target="_blank" rel="noreferrer"
            style={{ display: "block", textAlign: "center", color: "#25d366", fontWeight: 700, fontSize: 12, marginTop: 12, textDecoration: "none" }}>
            {ar ? "استفسر عبر واتساب" : "Inquire on WhatsApp"}
          </a>
        </div>
      </div>
    </div>
  );
}
