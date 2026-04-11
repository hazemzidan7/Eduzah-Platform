import { C, font } from "../theme";
import { useInView } from "../hooks/useInView";

const STEPS = [
  { num:"01", image:"/images/journey/Register.png",       color:"#d91b5b", ar:"سجّل حسابك",        en:"Register",         desc_ar:"أنشئ حسابك في دقيقة واحدة",                    desc_en:"Create your account in just one minute" },
  { num:"02", image:"/images/journey/Get_Approved.png",   color:"#f59e0b", ar:"احصل على الموافقة", en:"Get Approved",     desc_ar:"يراجع فريقنا طلبك ويوافق عليه بسرعة",           desc_en:"Our team reviews and approves your request" },
  { num:"03", image:"/images/journey/Start_Course.png",   color:"#7d3d9e", ar:"ابدأ الكورس",       en:"Start Course",     desc_ar:"ادخل عالم التعلم واختر الكورس المناسب لك",       desc_en:"Enter the learning world and pick your course" },
  { num:"04", image:"/images/journey/Practice_Learn.png", color:"#0ea5e9", ar:"تدرّب وتعلّم",      en:"Practice & Learn", desc_ar:"طبّق مشاريع حقيقية واكتسب خبرة عملية",         desc_en:"Apply real projects and gain hands-on skills" },
  { num:"05", image:"/images/journey/Get_Hired.png",      color:"#34d399", ar:"تخرّج وانضم",       en:"Get Hired",        desc_ar:"احصل على شهادتك وابدأ مسيرتك المهنية",          desc_en:"Get certified and launch your career" },
];

export default function JourneySection({ lang }) {
  const [ref, inView] = useInView();
  const ar = lang === "ar";

  return (
    <section ref={ref} style={{
      background: "linear-gradient(160deg,#1a0a2e 0%,#2a1540 50%,#1a0a2e 100%)",
      padding: "clamp(50px,8vw,80px) 5%",
      overflow: "hidden",
    }}>
      {/* Section header */}
      <div style={{ textAlign:"center", marginBottom:52 }}>
        <div style={{ color:C.orange, fontWeight:700, fontSize:11, letterSpacing:2, marginBottom:8 }}>
          {ar ? "رحلتك معنا" : "YOUR JOURNEY"}
        </div>
        <h2 style={{ fontSize:"clamp(1.4rem,3vw,2.4rem)", fontWeight:900, marginBottom:12, fontFamily:font, color:"#f8fafc" }}>
          {ar ? "5 خطوات نحو مستقبلك" : "5 Steps to Your Future"}
        </h2>
        <p style={{ color:C.muted, fontSize:14, maxWidth:460, margin:"0 auto", lineHeight:1.8 }}>
          {ar
            ? "من التسجيل حتى التوظيف — Eduzah معك في كل خطوة من رحلتك"
            : "From registration to employment — Eduzah is with you every step of the way"}
        </p>
      </div>

      {/* Steps grid — wide illustrations use a rounded frame, not a circle */}
      <div style={{
        display: "flex", flexWrap: "wrap", gap: 16,
        justifyContent: "center", position: "relative",
        maxWidth: 1280, margin: "0 auto",
      }}>
        {STEPS.map((step, i) => (
          <div key={step.num}
            style={{
              flex: "0 1 248px",
              width: "min(100%, 248px)",
              minWidth: 0,
              textAlign: "center",
              padding: "22px 16px 20px",
              display: "flex",
              flexDirection: "column",
              alignItems: "stretch",
              background: "linear-gradient(165deg, rgba(255,255,255,.06) 0%, rgba(255,255,255,.02) 100%)",
              border: `1px solid ${step.color}38`,
              borderRadius: 22,
              opacity: inView ? 1 : 0,
              transform: inView ? "translateY(0)" : "translateY(32px)",
              transition: `opacity .6s ease ${i * 0.12}s, transform .6s ease ${i * 0.12}s`,
              boxShadow: inView ? `0 12px 40px rgba(0,0,0,.28), 0 0 0 1px ${step.color}14 inset` : "none",
            }}>
            <div style={{
              width: "100%",
              aspectRatio: "5 / 4",
              maxHeight: 148,
              margin: "0 auto 16px",
              borderRadius: 16,
              background: `linear-gradient(160deg, rgba(0,0,0,.45) 0%, ${step.color}12 55%, rgba(0,0,0,.2) 100%)`,
              border: `1px solid ${step.color}45`,
              boxSizing: "border-box",
              padding: 10,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              overflow: "hidden",
              boxShadow: inView
                ? `0 4px 20px rgba(0,0,0,.35), inset 0 1px 0 ${step.color}30`
                : "0 4px 16px rgba(0,0,0,.25)",
              transition: "box-shadow .8s ease",
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
                  maxHeight: 128,
                  objectFit: "contain",
                  objectPosition: "center",
                  display: "block",
                  pointerEvents: "none",
                }}
              />
            </div>
            <div style={{ color: step.color, fontWeight: 900, fontSize: 10, letterSpacing: 2, marginBottom: 8 }}>
              STEP {step.num}
            </div>
            <div style={{
              fontWeight: 800, fontSize: 15, marginBottom: 8, fontFamily: font,
              color: "#f1f5f9", lineHeight: 1.35,
            }}>
              {ar ? step.ar : step.en}
            </div>
            <div style={{ color: C.muted, fontSize: 12, lineHeight: 1.75, flexGrow: 1 }}>
              {ar ? step.desc_ar : step.desc_en}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
