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
        <h2 style={{ fontSize:"clamp(1.4rem,3vw,2.4rem)", fontWeight:900, marginBottom:12, fontFamily:font }}>
          {ar ? "5 خطوات نحو مستقبلك" : "5 Steps to Your Future"}
        </h2>
        <p style={{ color:C.muted, fontSize:14, maxWidth:460, margin:"0 auto", lineHeight:1.8 }}>
          {ar
            ? "من التسجيل حتى التوظيف — Eduzah معك في كل خطوة من رحلتك"
            : "From registration to employment — Eduzah is with you every step of the way"}
        </p>
      </div>

      {/* Steps grid */}
      <div style={{
        display:"flex", flexWrap:"wrap", gap:12,
        justifyContent:"center", position:"relative",
      }}>
        {STEPS.map((step, i) => (
          <div key={step.num}
            style={{
              flex:"1 1 160px", maxWidth:210,
              textAlign:"center", padding:"24px 12px",
              background:"rgba(255,255,255,.03)",
              border:`1px solid ${step.color}33`,
              borderRadius:20,
              opacity: inView ? 1 : 0,
              transform: inView ? "translateY(0)" : "translateY(32px)",
              transition: `opacity .6s ease ${i * 0.12}s, transform .6s ease ${i * 0.12}s`,
            }}>
            {/* Step illustration */}
            <div style={{
              width: 92, height: 92, borderRadius: "50%",
              background: `linear-gradient(135deg,${step.color}28,${step.color}0d)`,
              border: `2px solid ${step.color}55`,
              display: "flex", alignItems: "center", justifyContent: "center",
              margin: "0 auto 18px",
              padding: 8,
              boxSizing: "border-box",
              overflow: "hidden",
              boxShadow: inView ? `0 0 28px ${step.color}40` : "none",
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
                  objectFit: "contain",
                  objectPosition: "center",
                  display: "block",
                  pointerEvents: "none",
                }}
              />
            </div>
            <div style={{ color:step.color, fontWeight:900, fontSize:10, letterSpacing:2, marginBottom:8 }}>
              STEP {step.num}
            </div>
            <div style={{ fontWeight:800, fontSize:14, marginBottom:8, fontFamily:font }}>
              {ar ? step.ar : step.en}
            </div>
            <div style={{ color:C.muted, fontSize:12, lineHeight:1.75 }}>
              {ar ? step.desc_ar : step.desc_en}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
