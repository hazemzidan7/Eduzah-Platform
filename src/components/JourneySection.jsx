import { C, font } from "../theme";
import { useInView } from "../hooks/useInView";

/*
 * Activation step (old step 02) removed — manual review gates kill registrations.
 * Flow is now: Register → Start Course → Practice → Certificate → Get Hired (4 steps).
 */
const STEPS = [
  {
    num:     "01",
    image:   "/images/journey/Register.png",
    color:   "#d91b5b",
    ar:      "سجّل مجاناً",
    en:      "Register Free",
    desc_ar: "أنشئ حسابك في 30 ثانية — لا يلزم بطاقة ائتمان",
    desc_en: "Create your account in 30 seconds — no credit card needed",
    micro_ar:"وصول فوري",
    micro_en:"Instant access",
  },
  {
    num:     "02",
    image:   "/images/journey/Start_Course.png",
    color:   "#7d3d9e",
    ar:      "اختر مسارك",
    en:      "Pick Your Path",
    desc_ar: "استخدم اختبار المسار لاكتشاف الكورس المناسب لعمر وقدرات طفلك",
    desc_en: "Use the Path Quiz to find the right course for your child's age and level",
    micro_ar:"للأعمار 8–16",
    micro_en:"Ages 8–16",
  },
  {
    num:     "03",
    image:   "/images/journey/Practice_Learn.png",
    color:   "#0ea5e9",
    ar:      "تعلّم وتدرّب",
    en:      "Learn & Build",
    desc_ar: "فيديوهات تفاعلية ومشاريع حقيقية تُكسب الطفل خبرة عملية فعلية",
    desc_en: "Interactive videos and real projects that build genuine hands-on skills",
    micro_ar:"تقدّم تلقائي",
    micro_en:"Auto-tracked progress",
  },
  {
    num:     "04",
    image:   "/images/journey/Get_Hired.png",
    color:   "#34d399",
    ar:      "احصل على شهادتك",
    en:      "Earn Your Certificate",
    desc_ar: "شهادة مُعترف بها مع لوحة تحكم لمتابعة تقدم طفلك كل خطوة",
    desc_en: "A recognised certificate — with a parent dashboard to track every step",
    micro_ar:"شهادة موثّقة",
    micro_en:"Verified certificate",
  },
];

export default function JourneySection({ lang }) {
  const [ref, inView] = useInView();
  const ar = lang === "ar";

  return (
    <section ref={ref} style={{
      background: "linear-gradient(160deg,#1a0a2e 0%,#2a1540 50%,#1a0a2e 100%)",
      padding: "clamp(60px,8vw,100px) 5%",
      overflow: "hidden",
    }}>
      {/* Section header */}
      <div style={{ textAlign: "center", marginBottom: 64 }}>
        <div style={{
          display: "inline-flex", alignItems: "center", gap: 8,
          background: `${C.orange}18`, border: `1px solid ${C.orange}40`,
          borderRadius: 999, padding: "5px 16px", marginBottom: 16,
        }}>
          <span style={{ color: C.orange, fontWeight: 700, fontSize: 11, letterSpacing: 2 }}>
            {ar ? "رحلتك معنا" : "YOUR JOURNEY"}
          </span>
        </div>
        <h2 style={{
          fontSize: "clamp(1.5rem,3vw,2.6rem)", fontWeight: 900,
          marginBottom: 14, fontFamily: font, color: "#f8fafc",
        }}>
          {ar ? "4 خطوات لمستقبل طفلك التقني" : "4 Steps to Your Child's Tech Future"}
        </h2>
        <p style={{ color: C.muted, fontSize: 15, maxWidth: 500, margin: "0 auto", lineHeight: 1.9 }}>
          {ar
            ? "من التسجيل حتى الشهادة — الوصول فوري، لا انتظار"
            : "From sign-up to certificate — instant access, no waiting"}
        </p>
      </div>

      {/* Steps grid */}
      <div className="journey-grid" style={{
        maxWidth: 1100,
        margin: "0 auto",
        display: "grid",
        gridTemplateColumns: "repeat(4, 1fr)",
        gap: "0 16px",
        alignItems: "stretch",
      }}>
        {STEPS.map((step, i) => (
          <div key={step.num} style={{
            display:   "flex",
            flexDirection: "column",
            alignItems: "center",
            padding:   "0 6px",
            opacity:   inView ? 1 : 0,
            transform: inView ? "translateY(0)" : "translateY(40px)",
            transition:`opacity .6s ease ${i * 0.14}s, transform .6s ease ${i * 0.14}s`,
          }}>
            {/* Step number */}
            <div style={{
              width:      52, height: 52, borderRadius: "50%",
              background: `radial-gradient(circle at 30% 30%, ${step.color}cc, ${step.color}55)`,
              boxShadow:  `0 0 0 4px ${step.color}25, 0 0 24px ${step.color}55`,
              display:    "flex", alignItems: "center", justifyContent: "center",
              fontWeight: 900, fontSize: 14, color: "#fff", letterSpacing: 1,
              marginBottom: 20, flexShrink: 0,
              border:     `2px solid ${step.color}88`,
            }}>
              {step.num}
            </div>

            {/* Card */}
            <div style={{
              width:  "100%", flex: 1,
              background: "linear-gradient(165deg, rgba(255,255,255,.07) 0%, rgba(255,255,255,.02) 100%)",
              border:     `1px solid ${step.color}35`,
              borderTop:  `3px solid ${step.color}`,
              borderRadius: 20,
              padding:    "20px 14px 22px",
              display:    "flex", flexDirection: "column", alignItems: "center",
              textAlign:  "center",
              boxShadow:  inView ? `0 16px 48px rgba(0,0,0,.35)` : "none",
              transition: "box-shadow .8s ease",
            }}>
              {/* Image */}
              <div style={{
                width: "100%", aspectRatio: "4 / 3", maxHeight: 120,
                borderRadius: 14,
                background: `linear-gradient(145deg, rgba(0,0,0,.5) 0%, ${step.color}10 100%)`,
                border:     `1px solid ${step.color}30`,
                display:    "flex", alignItems: "center", justifyContent: "center",
                overflow:   "hidden", marginBottom: 16, padding: 8, boxSizing: "border-box",
              }}>
                <img
                  src={step.image}
                  alt={ar ? step.ar : step.en}
                  loading="lazy"
                  decoding="async"
                  draggable={false}
                  style={{ width: "100%", height: "100%", objectFit: "contain", objectPosition: "center", pointerEvents: "none" }}
                />
              </div>

              {/* Title */}
              <div style={{ fontWeight: 800, fontSize: 14, marginBottom: 8, fontFamily: font, color: "#f1f5f9", lineHeight: 1.35 }}>
                {ar ? step.ar : step.en}
              </div>

              {/* Description */}
              <div style={{ color: C.muted, fontSize: 11.5, lineHeight: 1.8, marginBottom: 10 }}>
                {ar ? step.desc_ar : step.desc_en}
              </div>

              {/* Micro badge */}
              <div style={{
                display: "inline-block",
                background: `${step.color}22`,
                border:     `1px solid ${step.color}55`,
                borderRadius: 999,
                padding:    "2px 10px",
                fontSize:   10,
                fontWeight: 700,
                color:      step.color,
                marginTop:  "auto",
              }}>
                {ar ? step.micro_ar : step.micro_en}
              </div>
            </div>
          </div>
        ))}
      </div>

      <style>{`
        @media (max-width: 900px)  { .journey-grid { grid-template-columns: repeat(2,1fr) !important; gap: 20px !important; } }
        @media (max-width: 480px)  { .journey-grid { grid-template-columns: 1fr !important; } }
      `}</style>
    </section>
  );
}
