import { C, font } from "../theme";
import { useInView } from "../hooks/useInView";

const STEPS = [
  { num:"01", image:"/images/journey/Register.png",       color:"#d91b5b", ar:"سجّل حسابك",        en:"Register",         desc_ar:"أنشئ حسابك في دقيقة واحدة",                desc_en:"Create your account in just one minute" },
  { num:"02", image:"/images/journey/Get_Approved.png",   color:"#f59e0b", ar:"تفعيل حسابك", en:"Account activation", desc_ar:"نؤكد بياناتك لضمان جودة التدريب وحماية المجتمع — عادةً خلال ساعات قليلة", desc_en:"We verify your details for quality & community safety — usually within hours" },
  { num:"03", image:"/images/journey/Start_Course.png",   color:"#7d3d9e", ar:"ابدأ الكورس",       en:"Start Course",     desc_ar:"ادخل عالم التعلم واختر الكورس المناسب لك", desc_en:"Enter the learning world and pick your course" },
  { num:"04", image:"/images/journey/Practice_Learn.png", color:"#0ea5e9", ar:"تدرّب وتعلّم",      en:"Practice & Learn", desc_ar:"طبّق مشاريع حقيقية واكتسب خبرة عملية",    desc_en:"Apply real projects and gain hands-on skills" },
  { num:"05", image:"/images/journey/Get_Hired.png",      color:"#34d399", ar:"تخرّج وانضم",       en:"Get Hired",        desc_ar:"احصل على شهادتك وابدأ مسيرتك المهنية",    desc_en:"Get certified and launch your career" },
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
      <div style={{ textAlign:"center", marginBottom: 64 }}>
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
          marginBottom: 14, fontFamily: font, color: "#f8fafc", display: "block",
        }}>
          {ar ? "5 خطوات نحو مستقبلك" : "5 Steps to Your Future"}
        </h2>
        <p style={{ color: C.muted, fontSize: 15, maxWidth: 480, margin: "0 auto", lineHeight: 1.9 }}>
          {ar
            ? "من التسجيل حتى التوظيف — Eduzah معك في كل خطوة"
            : "From registration to employment — Eduzah is with you every step"}
        </p>
      </div>

      {/* Timeline row */}
      <div className="journey-grid" style={{
        maxWidth: 1300, margin: "0 auto",
        display: "grid",
        gridTemplateColumns: "repeat(5, 1fr)",
        gap: "0 12px",
        alignItems: "stretch",
      }}>

        {STEPS.map((step, i) => (
          <div key={step.num} style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            padding: "0 6px",
            opacity: inView ? 1 : 0,
            transform: inView ? "translateY(0)" : "translateY(40px)",
            transition: `opacity .6s ease ${i * 0.13}s, transform .6s ease ${i * 0.13}s`,
          }}>
            {/* Step number bubble */}
            <div style={{
              width: 52,
              height: 52,
              borderRadius: "50%",
              background: `radial-gradient(circle at 30% 30%, ${step.color}cc, ${step.color}55)`,
              boxShadow: `0 0 0 4px ${step.color}25, 0 0 24px ${step.color}55`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontWeight: 900,
              fontSize: 14,
              color: "#fff",
              letterSpacing: 1,
              marginBottom: 20,
              flexShrink: 0,
              border: `2px solid ${step.color}88`,
            }}>
              {step.num}
            </div>

            {/* Card */}
            <div style={{
              width: "100%",
              flex: 1,
              background: "linear-gradient(165deg, rgba(255,255,255,.07) 0%, rgba(255,255,255,.02) 100%)",
              border: `1px solid ${step.color}35`,
              borderTop: `3px solid ${step.color}`,
              borderRadius: 20,
              padding: "20px 14px 22px",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              textAlign: "center",
              boxShadow: inView
                ? `0 16px 48px rgba(0,0,0,.35), 0 0 0 1px ${step.color}10 inset`
                : "none",
              transition: "box-shadow .8s ease",
            }}>
              {/* Image frame */}
              <div style={{
                width: "100%",
                aspectRatio: "4 / 3",
                maxHeight: 130,
                borderRadius: 14,
                background: `linear-gradient(145deg, rgba(0,0,0,.5) 0%, ${step.color}10 100%)`,
                border: `1px solid ${step.color}30`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                overflow: "hidden",
                marginBottom: 16,
                padding: 8,
                boxSizing: "border-box",
              }}>
                <img
                  src={step.image}
                  alt={ar ? step.ar : step.en}
                  loading="lazy"
                  decoding="async"
                  draggable={false}
                  style={{
                    width: "100%",
                    height: "100%",
                    objectFit: "contain",
                    objectPosition: "center",
                    display: "block",
                    pointerEvents: "none",
                  }}
                />
              </div>

              {/* Title */}
              <div style={{
                fontWeight: 800,
                fontSize: 14,
                marginBottom: 8,
                fontFamily: font,
                color: "#f1f5f9",
                lineHeight: 1.35,
              }}>
                {ar ? step.ar : step.en}
              </div>

              {/* Description */}
              <div style={{
                color: C.muted,
                fontSize: 11.5,
                lineHeight: 1.8,
              }}>
                {ar ? step.desc_ar : step.desc_en}
              </div>
            </div>
          </div>
        ))}
      </div>

      <style>{`
        @media (max-width: 1000px) {
          .journey-grid {
            grid-template-columns: repeat(3, 1fr) !important;
            gap: 20px !important;
          }
        }
        @media (max-width: 640px) {
          .journey-grid {
            grid-template-columns: repeat(2, 1fr) !important;
            gap: 16px !important;
          }
        }
        @media (max-width: 400px) {
          .journey-grid {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </section>
  );
}
