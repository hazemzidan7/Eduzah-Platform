import { Helmet } from "react-helmet-async";
import { useNavigate } from "react-router-dom";
import { Btn } from "../../components/UI";
import { C } from "../../theme";
import { useLang } from "../../context/LangContext";
import EnrollmentForm from "../../components/enrollment/EnrollmentForm";
import { enrollmentCrmConfigured } from "../../utils/submitEnrollmentCrm";
import { useState } from "react";

const PROGRAMS = {
  ai: {
    diplomaEn: "AI & Machine Learning Diploma",
    diplomaAr: "دبلوم الذكاء الاصطناعي وتعلم الآلة",
    price: 9500,
    descEn:
      "Hands-on programme covering fundamentals of AI, neural networks, and practical projects suitable for aspiring ML engineers.",
    descAr:
      "برنامج عملي يغطي أساسيات الذكاء الاصطناعي والشبكات العصبية ومشاريع تطبيقية للراغبين في مجال تعلم الآلة.",
  },
  frontend: {
    diplomaEn: "Frontend Development Diploma",
    diplomaAr: "دبلوم تطوير الواجهات (Frontend)",
    price: 7200,
    descEn:
      "Modern HTML, CSS, JavaScript and React patterns with UI best practices — from beginner to portfolio-ready builds.",
    descAr:
      "HTML وCSS وجافاسكريبت ورياكت بتطبيق أفضل الممارسات — من الأساسيات حتى مشاريع جاهزة للمعرض الشخصي.",
  },
};

export default function SheetsCoursePage({ courseKey }) {
  const cfg = PROGRAMS[courseKey];
  const { lang } = useLang();
  const navigate = useNavigate();
  const ar = lang === "ar";
  const [showForm, setShowForm] = useState(false);

  if (!cfg) {
    return null;
  }

  const diploma = ar ? cfg.diplomaAr : cfg.diplomaEn;
  const desc = ar ? cfg.descAr : cfg.descEn;
  const priceLabel = ar ? `${cfg.price.toLocaleString("ar-EG")} ج.م` : `EGP ${cfg.price.toLocaleString("en-EG")}`;
  const configured = enrollmentCrmConfigured();

  return (
    <div style={{ padding: "clamp(24px,5vw,48px) 5%", maxWidth: 920, margin: "0 auto" }} dir={ar ? "rtl" : "ltr"}>
      <Helmet>
        <title>{diploma} | Eduzah</title>
      </Helmet>
      <div style={{ marginBottom: 12 }}>
        <Btn v="ghost" type="button" onClick={() => navigate("/courses")}>
          {ar ? "← الكورسات" : "← Courses"}
        </Btn>
      </div>
      <h1 style={{ fontWeight: 900, fontSize: "clamp(1.4rem,3vw,2rem)", marginBottom: 12, color: "var(--page-text)" }}>
        {diploma}
      </h1>
      <p style={{ color: "var(--page-muted)", lineHeight: 1.65, marginBottom: 18, fontSize: 15 }}>{desc}</p>
      <div
        style={{
          display: "inline-block",
          background: "rgba(217,27,91,.1)",
          color: "#d91b5b",
          fontWeight: 900,
          fontSize: 18,
          padding: "10px 18px",
          borderRadius: 14,
          marginBottom: 22,
        }}
      >
        {ar ? "السعر:" : "Price:"} {priceLabel}
      </div>
      <div style={{ marginBottom: 20 }}>
        <Btn disabled={!configured} onClick={() => configured && setShowForm(true)}>
          {!configured ? (ar ? "إعداد عنوان النموذج (env)" : "Configure Web App URL (env)") : ar ? "التسجيل" : "Register"}
        </Btn>
      </div>
      {!configured && (
        <p style={{ color: C.orange, fontSize: 13 }}>
          Set <code>VITE_APPS_SCRIPT_ENROLL_URL</code> in <code>.env</code> (see <code>.env.example</code>).
        </p>
      )}
      {showForm && configured ? (
        <section style={{ marginTop: 28, paddingTop: 24, borderTop: "1px solid var(--glass-border,#eee)" }}>
          <h2 style={{ fontWeight: 800, marginBottom: 16, fontSize: 17 }}>{ar ? "نموذج التسجيل" : "Enrollment form"}</h2>
          <EnrollmentForm diploma={diploma} courseCost={cfg.price} ar={ar} />
        </section>
      ) : null}
    </div>
  );
}
