import { useNavigate } from "react-router-dom";
import { C, gHero } from "../../theme";
import { Card, Badge, Btn } from "../../components/UI";
import { useLang } from "../../context/LangContext";
import { SITE } from "../../data";

const SERVICES = [
  { slug:"web-development",  abbr:"WD", color:C.red,
    title_ar:"تطوير المواقع والتطبيقات", title_en:"Web Development",
    desc_ar:"مواقع وتطبيقات ويب احترافية بأحدث التقنيات — React, Next.js, Node.js.",
    desc_en:"Professional websites and web apps with modern tech — React, Next.js, Node.js.",
    tags:["React","Node.js","TypeScript","Next.js"],
  },
  { slug:"mobile-apps",      abbr:"MA", color:"#4a1f6e",
    title_ar:"تطبيقات الموبايل", title_en:"Mobile Apps",
    desc_ar:"تطبيقات iOS & Android عالية الأداء باستخدام Flutter من كود واحد.",
    desc_en:"High-performance iOS & Android apps using Flutter from a single codebase.",
    tags:["Flutter","Dart","Firebase","iOS/Android"],
  },
  { slug:"ai-solutions",     abbr:"AI", color:C.purple,
    title_ar:"حلول الذكاء الاصطناعي", title_en:"AI Solutions",
    desc_ar:"Chatbots ذكية، نماذج ML، وتكامل OpenAI في منتجاتك لمضاعفة الكفاءة.",
    desc_en:"Smart chatbots, ML models, and OpenAI integration to multiply your efficiency.",
    tags:["Python","OpenAI","TensorFlow","LangChain"],
  },
  { slug:"cybersecurity",    abbr:"CS", color:C.danger,
    title_ar:"الأمن السيبراني", title_en:"Cybersecurity",
    desc_ar:"اختبارات اختراق، تدقيق أمني، وحماية شاملة من التهديدات الرقمية.",
    desc_en:"Penetration testing, security audits, and comprehensive digital threat protection.",
    tags:["OWASP","Pentest","Kali Linux","SIEM"],
  },
  { slug:"ui-ux-design",     abbr:"UX", color:C.orange,
    title_ar:"تصميم UI/UX", title_en:"UI/UX Design",
    desc_ar:"تجارب مستخدم استثنائية تجمع الجمال البصري والسهولة الوظيفية بـ Figma.",
    desc_en:"Exceptional user experiences combining visual beauty and functional ease with Figma.",
    tags:["Figma","Prototyping","UX Research","Design Systems"],
  },
  { slug:"cloud-devops",     abbr:"CD", color:C.success,
    title_ar:"الكلاود وـ DevOps", title_en:"Cloud & DevOps",
    desc_ar:"بنية تحتية سحابية موثوقة، CI/CD Pipelines، وإدارة Kubernetes.",
    desc_en:"Reliable cloud infrastructure, CI/CD Pipelines, and Kubernetes management.",
    tags:["AWS","Docker","Kubernetes","Terraform"],
  },
];

export default function ServicesPage() {
  const navigate = useNavigate();
  const { lang, t } = useLang();

  const dir = lang === "ar" ? "rtl" : "ltr";
  return (
    <div dir={dir}>
      {/* Hero */}
      <div style={{ background: gHero, padding: "clamp(40px,7vw,70px) 5%", textAlign: "center", position: "relative", overflow: "hidden" }}>
        <div style={{ position: "absolute", top: "-20%", right: "-5%", width: 400, height: 400, background: "radial-gradient(circle,rgba(103,45,134,.3),transparent 70%)", borderRadius: "50%", pointerEvents: "none" }} />
        <div style={{ position: "relative", zIndex: 2 }}>
          <div style={{ color: C.orange, fontWeight: 700, fontSize: 11, letterSpacing: 2, marginBottom: 8 }}>TECHNICAL SERVICES</div>
          <h1 style={{ fontSize: "clamp(1.6rem,3.5vw,2.6rem)", fontWeight: 900, marginBottom: 12 }}>{t("servicesHero")}</h1>
          <p style={{ color: C.muted, fontSize: 14, maxWidth: 560, margin: "0 auto 28px" }}>{t("servicesSub")}</p>
          <a href={`https://wa.me/${SITE.phone.replace(/\D/g,"")}`} target="_blank" rel="noreferrer"
            style={{ background: "#25d366", color: "#fff", padding: "11px 24px", borderRadius: 10, fontFamily:"'Cairo',sans-serif", fontWeight: 700, fontSize: 13, textDecoration: "none", display: "inline-flex", alignItems: "center", gap: 8 }}>
            {t("contactWA")}
          </a>
        </div>
      </div>

      {/* Services Grid */}
      <div style={{ padding: "clamp(36px,7vw,64px) 5%", background: "#2a1540" }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(300px,1fr))", gap: 18 }}>
          {SERVICES.map(svc => (
            <div key={svc.slug}
              onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-4px)"; e.currentTarget.style.boxShadow = `0 14px 35px ${svc.color}30`; }}
              onMouseLeave={e => { e.currentTarget.style.transform = ""; e.currentTarget.style.boxShadow = ""; }}
              style={{ background: "rgba(50,29,61,.58)", border: `1px solid ${C.border}`, borderRadius: 18, padding: "24px 20px", transition: "all .25s", cursor: "pointer", display: "flex", flexDirection: "column", gap: 0 }}
              onClick={() => navigate(`/services/${svc.slug}`)}>

              {/* Icon + Title */}
              <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
                <div style={{ width: 48, height: 48, borderRadius: 14, background: `${svc.color}22`, border: `1px solid ${svc.color}44`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 900, color: svc.color, flexShrink: 0, letterSpacing: 1 }}>
                  {svc.abbr}
                </div>
                <div style={{ fontWeight: 800, fontSize: 15 }}>{lang === "ar" ? svc.title_ar : svc.title_en}</div>
              </div>

              {/* Description */}
              <p style={{ color: C.muted, fontSize: 13, lineHeight: 1.75, marginBottom: 14, flex: 1 }}>
                {lang === "ar" ? svc.desc_ar : svc.desc_en}
              </p>

              {/* Tags */}
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 16 }}>
                {svc.tags.map(tag => (
                  <Badge key={tag} color={svc.color}>{tag}</Badge>
                ))}
              </div>

              {/* CTA */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderTop: `1px solid ${C.border}`, paddingTop: 14 }}>
                <span style={{ color: svc.color, fontSize: 12, fontWeight: 700 }}>
                  {lang === "ar" ? "اعرف أكثر ←" : "Learn More →"}
                </span>
                <div style={{ width: 32, height: 32, borderRadius: "50%", background: `${svc.color}22`, border: `1px solid ${svc.color}44`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 9, fontWeight: 900, color: svc.color, letterSpacing: 0.5 }}>
                  {svc.abbr}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* CTA Section */}
      <div style={{ padding: "clamp(40px,7vw,60px) 5%", textAlign: "center" }}>
        <div style={{ background: "linear-gradient(135deg,#2a1540,#4a1f6e)", border: `1px solid ${C.border}`, borderRadius: 20, padding: "clamp(28px,5vw,48px)", maxWidth: 700, margin: "0 auto", position: "relative", overflow: "hidden" }}>
          <div style={{ position: "absolute", top: "-30px", right: "-30px", width: 180, height: 180, background: "radial-gradient(circle,rgba(217,27,91,.2),transparent 70%)", borderRadius: "50%" }} />
          <h2 style={{ fontSize: "clamp(1.3rem,3vw,2rem)", fontWeight: 900, marginBottom: 10, position: "relative" }}>
            {t("needProject")}
          </h2>
          <p style={{ color: C.muted, fontSize: 14, marginBottom: 24, position: "relative" }}>
            {lang === "ar" ? "احكيلنا عن مشروعك واحصل على عرض سعر مجاني خلال 24 ساعة" : "Tell us about your project and get a free quote within 24 hours"}
          </p>
          <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap", position: "relative" }}>
            <a href={`https://wa.me/${SITE.phone.replace(/\D/g,"")}`} target="_blank" rel="noreferrer"
              style={{ background: "#25d366", color: "#fff", padding: "12px 26px", borderRadius: 10, fontFamily:"'Cairo',sans-serif", fontWeight: 700, fontSize: 13, textDecoration: "none", display: "inline-flex", alignItems: "center", gap: 8 }}>
              {t("contactWA")}
            </a>
            <Btn children={lang === "ar" ? "استعرض الكورسات" : "Browse Courses"} v="outline" onClick={() => navigate("/courses")} style={{ padding: "12px 26px" }} />
          </div>
          <div style={{ marginTop: 16, color: C.muted, fontSize: 11 }}>
            {lang === "ar" ? "استشارة مجانية · رد خلال 24 ساعة · بدون التزام" : "Free consultation · 24h response · No commitment"}
          </div>
        </div>
      </div>
    </div>
  );
}
