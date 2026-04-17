import { memo, useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { C, gHero } from "../../theme";
import { Btn, Card, Stars } from "../../components/UI";
import { SITE, TRACKS } from "../../data";
import { useAuth } from "../../context/AuthContext";
import { useData } from "../../context/DataContext";
import { useLang } from "../../context/LangContext";
import { Seo } from "../../components/Seo";
import JourneySection from "../../components/JourneySection";
import { useInView } from "../../hooks/useInView";

/** Cards stay centered as a group when items are added or removed */
const centeredRow = (gap = 20) => ({
  display: "flex",
  flexWrap: "wrap",
  justifyContent: "center",
  alignItems: "stretch",
  gap,
  maxWidth: 1240,
  marginInline: "auto",
});
const centeredCell = (basisPx) => ({
  flex: `0 1 ${basisPx}px`,
  width: `min(100%, ${basisPx}px)`,
  minWidth: 0,
  boxSizing: "border-box",
});

const CourseCard = memo(function CourseCard({ course, lang }) {
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const [hovered, setHovered] = useState(false);
  const enrolled = currentUser?.enrolledCourses?.find(e => e.courseId === course.id);
  const title = lang === "ar" ? course.title : (course.title_en || course.title);
  const desc = lang === "ar" ? (course.desc || "") : (course.desc_en || course.desc || "");
  const dur = (d) => lang === "ar" ? d : d.replace(/أسابيع|أسبوع/g, "weeks").replace("ترمين سنوياً", "2 Terms/Year");
  const graphicCover = course.image && course.coverTitleInImage;
  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={()=>navigate(`/courses/${course.slug}`)}
      style={{
        background:"rgba(50,29,61,.65)", border:`1px solid ${C.border}`,
        borderRadius:20, overflow:"hidden", cursor:"pointer",
        transition:"all .3s",
        transform: hovered ? "translateY(-8px) scale(1.01)" : "translateY(0) scale(1)",
        boxShadow: hovered ? `0 20px 50px rgba(217,27,91,.3)` : "none",
      }}>
      <div style={{position:"relative",height:160,overflow:"hidden",flexShrink:0}}>
        {course.image
          ? <img src={course.image} alt={title} loading="lazy" decoding="async"
              width="400" height="160"
              style={{width:"100%",height:"100%",objectFit:"cover",display:"block",
                transform: hovered ? "scale(1.06)" : "scale(1)", transition:"transform .4s ease"}}/>
          : <div style={{width:"100%",height:"100%",background:`linear-gradient(135deg,${course.color||C.red},#321d3d)`}}/>
        }
        {!graphicCover && (
          <>
            <div style={{position:"absolute",inset:0,background:"linear-gradient(to top,rgba(0,0,0,.65) 0%,transparent 55%)"}}/>
            <span style={{position:"absolute",bottom:12,left:14,right:14,fontWeight:800,fontSize:13,lineHeight:1.4,color:"#fff",textShadow:"0 1px 4px rgba(0,0,0,.6)"}}>{title}</span>
          </>
        )}
        {course.badge&&<div style={{position:"absolute",top:10,right:10,background:"rgba(217,27,91,.92)",borderRadius:7,padding:"3px 10px",fontSize:10,fontWeight:700,color:"#fff"}}>{lang==="ar"?course.badge:(course.badge_en||course.badge)}</div>}
        {/* Hover preview overlay */}
        {desc && (
          <div style={{
            position:"absolute", inset:0,
            background:"rgba(26,10,46,.92)",
            display:"flex", alignItems:"center", justifyContent:"center",
            padding:16, textAlign:"center",
            opacity: hovered ? 1 : 0,
            transition:"opacity .3s ease",
            pointerEvents:"none",
          }}>
            <p style={{color:"rgba(255,255,255,.9)",fontSize:12,lineHeight:1.8,margin:0}}>
              {desc.slice(0, 100)}{desc.length > 100 ? "…" : ""}
            </p>
          </div>
        )}
      </div>
      <div style={{padding:"14px 16px 16px"}}>
        <div style={{fontWeight:800,fontSize:13,marginBottom:4}}>{title}</div>
        <div style={{display:"flex",gap:10,marginBottom:10}}>
          <span style={{color:C.muted,fontSize:11}}>{dur(course.duration)}</span>
          <span style={{color:C.muted,fontSize:11}}>{course.hours}h</span>
        </div>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",borderTop:`1px solid ${C.border}`,paddingTop:10}}>
          <span style={{fontWeight:900,fontSize:15,color:C.red}}>{course.price.toLocaleString()} <small style={{fontSize:10,color:C.muted,fontWeight:400}}>EGP</small></span>
          <Btn children={enrolled?(lang==="ar"?"متابعة ▶":"Continue ▶"):(lang==="ar"?"سجّل الآن":"Enroll")} sm onClick={e=>{e.stopPropagation();navigate(`/courses/${course.slug}`);}}/>
        </div>
      </div>
    </div>
  );
});

export default function Landing() {
  const navigate = useNavigate();
  const { lang } = useLang();
  const { currentUser } = useAuth();
  const { courses, news, programs, testimonials } = useData();
  const featured    = courses.filter(c => c.featured).slice(0,3);
  const latestNews  = news.slice(0,3);
  const dir = lang === "ar" ? "rtl" : "ltr";

  // ── Animated counter hook ──────────────────────────────
  const [statsRef, statsInView] = useInView();
  const STATS = [
    { target: 5000, suffix: "+", label: lang==="ar"?"متدرب":"Trainees" },
    { target: 50,   suffix: "+", label: lang==="ar"?"مؤسسة شريكة":"Partners" },
    { target: 48,   suffix: "/5", label: lang==="ar"?"تقييم":"Rating", display:"4.8" },
    { target: 3,    suffix: "+", label: lang==="ar"?"سنوات":"Years" },
  ];
  const [counts, setCounts] = useState(STATS.map(() => 0));
  useEffect(() => {
    if (!statsInView) return;
    const duration = 1800;
    const steps = 60;
    const interval = duration / steps;
    let step = 0;
    const timer = setInterval(() => {
      step++;
      const progress = step / steps;
      const ease = 1 - Math.pow(1 - progress, 3); // easeOutCubic
      setCounts(STATS.map((s, i) => s.display ? s.display : Math.round(s.target * ease)));
      if (step >= steps) clearInterval(timer);
    }, interval);
    return () => clearInterval(timer);
  }, [statsInView]);

  // ── Testimonials slider ──────────────────────────────
  const [activeTestimonial, setActiveTestimonial] = useState(0);
  useEffect(() => {
    if (testimonials.length < 2) return;
    const t = setInterval(() => {
      setActiveTestimonial(i => (i + 1) % testimonials.length);
    }, 4000);
    return () => clearInterval(t);
  }, [testimonials.length]);

  const [testimonialsRef, testimonialsInView] = useInView();
  const [journeyRef, journeyInView] = useInView();

  return (
    <div dir={dir}>
      <style>{`
        @keyframes floatA {
          0%,100% { transform: translate(0,0) scale(1); }
          50%      { transform: translate(-30px,20px) scale(1.08); }
        }
        @keyframes floatB {
          0%,100% { transform: translate(0,0) scale(1); }
          50%      { transform: translate(20px,-25px) scale(1.05); }
        }
        @keyframes glowPulse {
          0%,100% { box-shadow: 0 8px 25px rgba(217,27,91,.4); }
          50%      { box-shadow: 0 12px 40px rgba(217,27,91,.7), 0 0 60px rgba(217,27,91,.2); }
        }
        @keyframes fadeSlideUp {
          from { opacity:0; transform:translateY(24px); }
          to   { opacity:1; transform:translateY(0); }
        }
        @keyframes spinSlow {
          to { transform: rotate(360deg); }
        }
        .hero-cta-primary {
          animation: glowPulse 2.5s ease-in-out infinite;
        }
        .hero-cta-primary:hover {
          animation: none;
          box-shadow: 0 14px 45px rgba(217,27,91,.75) !important;
        }
      `}</style>
      <Seo
        title={lang === "ar" ? "Eduzah" : "Eduzah"}
        description={lang === "ar" ? SITE.tagline : (SITE.tagline_en || SITE.tagline)}
      />
      {/* ── Hero ── */}
      <div style={{minHeight:"calc(100vh - 60px)",background:gHero,display:"flex",alignItems:"center",padding:"50px 5%",position:"relative",overflow:"hidden",gap:40,flexWrap:"wrap"}}>
        <div style={{position:"absolute",top:"-15%",right:"-8%",width:500,height:500,background:`radial-gradient(circle,rgba(103,45,134,.3),transparent 70%)`,borderRadius:"50%",pointerEvents:"none",animation:"floatA 8s ease-in-out infinite"}}/>
        <div style={{position:"absolute",bottom:"-15%",left:"-5%",width:400,height:400,background:`radial-gradient(circle,rgba(217,27,91,.25),transparent 70%)`,borderRadius:"50%",pointerEvents:"none",animation:"floatB 10s ease-in-out infinite"}}/>
        <div style={{position:"absolute",top:"30%",left:"20%",width:200,height:200,background:`radial-gradient(circle,rgba(255,184,77,.08),transparent 70%)`,borderRadius:"50%",pointerEvents:"none",animation:"floatB 7s ease-in-out infinite 2s"}}/>

        <div style={{flex:"1 1 300px",position:"relative",zIndex:2}}>
          <h1 style={{fontSize:"clamp(1.8rem,4.5vw,3.2rem)",fontWeight:900,lineHeight:1.2,marginBottom:16}}>
            {lang==="ar"
              ? <><span style={{color:C.orange}}>حوّل</span> مسيرتك المهنية<br/>مع <span style={{color:C.red}}>Eduzah</span></>
              : <>Transform Your Career<br/><span style={{color:C.orange}}>with</span> <span style={{color:C.red}}>Eduzah</span></>}
          </h1>
          <p style={{color:C.muted,fontSize:14,lineHeight:1.9,marginBottom:30,maxWidth:480}}>
            {lang==="ar"
              ? "شركة Eduzah تقدم حلولاً تدريبية احترافية للأفراد والمؤسسات في التكنولوجيا والإدارة واللغات وتدريب الأطفال."
              : "Eduzah provides professional training solutions for individuals and organizations in Technology, Management, Languages, and Children's Programs."
            }
          </p>
          <div style={{display:"flex",gap:12,flexWrap:"wrap",marginBottom:36}}>
            {!currentUser ? (
              <Btn
                className="hero-cta-primary"
                children={lang==="ar" ? "ابدأ رحلتك 🚀" : "Start Your Journey 🚀"}
                onClick={()=>navigate("/register")}
                style={{padding:"13px 28px",fontSize:14,borderRadius:12,background:"linear-gradient(135deg,#d91b5b,#b51549)"}}
              />
            ) : currentUser.role === "admin" ? (
              <Btn
                className="hero-cta-primary"
                children={lang==="ar" ? "لوحة التحكم ⚙️" : "Dashboard ⚙️"}
                onClick={()=>navigate("/dashboard")}
                style={{padding:"13px 28px",fontSize:14,borderRadius:12,background:"linear-gradient(135deg,#f59e0b,#d97706)"}}
              />
            ) : (
              <Btn
                className="hero-cta-primary"
                children={lang==="ar" ? "كمل التعلم ▶" : "Continue learning ▶"}
                onClick={()=>navigate("/dashboard")}
                style={{padding:"13px 28px",fontSize:14,borderRadius:12}}
              />
            )}
            <Btn children={lang==="ar" ? "\u0645\u0634 \u0639\u0627\u0631\u0641 \u062a\u0628\u062f\u0623 \u0645\u0646\u064a\u0646\u061f" : "Find my path"} v="outline" onClick={()=>navigate("/find-path")} style={{padding:"13px 28px",fontSize:14,borderRadius:12}}/>
            <Btn children={lang==="ar" ? "استشارة مجانية" : "Free Consultation"} v="outline" onClick={()=>navigate("/consultation")} style={{padding:"13px 28px",fontSize:14,borderRadius:12}}/>
          </div>
          <div ref={statsRef} style={{display:"flex",gap:"clamp(16px,4vw,40px)",flexWrap:"wrap",justifyContent:"center"}}>
            {STATS.map((s, i)=>(
              <div key={s.label}>
                <div style={{fontSize:"clamp(1.4rem,3vw,2rem)",fontWeight:900,color:C.orange}}>
                  {counts[i]}{s.suffix}
                </div>
                <div style={{color:C.muted,fontSize:11,marginTop:2}}>{s.label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Team photo — larger on desktop, scales down on small screens */}
        <div style={{ flex: "1 1 400px", maxWidth: "min(100%, 560px)", minWidth: 280, position: "relative", zIndex: 2, marginInline: "auto" }}>
          <div style={{ borderRadius: 20, overflow: "hidden", border: `2px solid ${C.border}`, boxShadow: `0 20px 60px rgba(0,0,0,.4)` }}>
            <img
              src="/images/team-office.webp"
              srcSet="/images/team-office-small.webp 500w, /images/team-office.webp 900w"
              sizes="(max-width: 767px) 100vw, (max-width: 1200px) 45vw, 560px"
              alt="Eduzah Team"
              loading="eager"
              fetchpriority="high"
              decoding="async"
              width="900"
              height="600"
              style={{
                width: "100%",
                height: "clamp(220px, 32vw, 420px)",
                maxHeight: "min(55vh, 440px)",
                objectFit: "cover",
                objectPosition: "center 28%",
                display: "block",
              }}
            />
            <div style={{background:"rgba(26,15,36,.92)",padding:"14px 18px"}}>
              <div style={{fontWeight:800,fontSize:13,marginBottom:2}}>
                {lang==="ar" ? "فريق Eduzah المتخصص" : "Eduzah Expert Team"}
              </div>
              <div style={{color:C.muted,fontSize:11}}>
                {lang==="ar" ? "مدربون خبراء متخصصون في مجالاتهم" : "Expert trainers specialized in their fields"}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── User Journey ── */}
      <JourneySection lang={lang} />

      {/* ── Tracks ── */}
      <div style={{background:"#2a1540",padding:"clamp(36px,7vw,70px) 5%"}}>
        <div style={{textAlign:"center",marginBottom:40}}>
          <div style={{color:C.orange,fontWeight:700,fontSize:11,letterSpacing:2,marginBottom:8}}>
            {lang==="ar" ? "مساراتنا التعليمية" : "LEARNING TRACKS"}
          </div>
          <h2 style={{fontSize:"clamp(1.4rem,3vw,2.4rem)",fontWeight:900,marginBottom:10}}>
            {lang==="ar" ? "4 مسارات تدريبية متخصصة" : "4 Specialized Training Tracks"}
          </h2>
        </div>
        <div style={centeredRow(20)}>
          {TRACKS.map(tr=>(
            <div key={tr.id}
              onMouseEnter={e=>{e.currentTarget.style.transform="translateY(-4px)";e.currentTarget.style.borderColor=tr.color;}}
              onMouseLeave={e=>{e.currentTarget.style.transform="";e.currentTarget.style.borderColor=C.border;}}
              onClick={()=>navigate(`/courses?track=${tr.id}`)}
              style={{...centeredCell(240),background:"rgba(50,29,61,.6)",border:`1.5px solid ${C.border}`,borderRadius:16,padding:22,cursor:"pointer",transition:"all .25s"}}>
              <div style={{width:52,height:52,borderRadius:14,background:`${tr.color}22`,border:`1.5px solid ${tr.color}44`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,fontWeight:900,color:tr.color,marginBottom:14,letterSpacing:1}}>
                {tr.icon}
              </div>
              <div style={{fontWeight:800,fontSize:15,marginBottom:6}}>{lang==="ar"?tr.title_ar:tr.title_en}</div>
              <div style={{color:C.muted,fontSize:12,lineHeight:1.7,marginBottom:12}}>{lang==="ar"?tr.desc_ar:tr.desc_en}</div>
              <div style={{display:"flex",flexWrap:"wrap",gap:5}}>
                {tr.subtracks.slice(0,3).map(s=>(
                  <span key={s.id} style={{background:`${tr.color}15`,color:tr.color,border:`1px solid ${tr.color}33`,borderRadius:50,padding:"2px 9px",fontSize:10,fontWeight:600}}>
                    {lang==="ar"?s.title_ar:s.title_en}
                  </span>
                ))}
                {tr.subtracks.length>3&&<span style={{color:C.muted,fontSize:10,padding:"2px 6px"}}>+{tr.subtracks.length-3}</span>}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Key Programs (Dynamic) ── */}
      {programs.length > 0 && (
        <div style={{padding:"clamp(36px,7vw,70px) 5%",background:"#321d3d"}}>
          <div style={{textAlign:"center",marginBottom:40}}>
            <div style={{color:C.orange,fontWeight:700,fontSize:11,letterSpacing:2,marginBottom:8}}>
              {lang==="ar" ? "أبرز برامجنا" : "KEY PROGRAMS"}
            </div>
            <h2 style={{fontSize:"clamp(1.4rem,3vw,2.4rem)",fontWeight:900,marginBottom:8}}>
              {lang==="ar" ? "برامج Eduzah المميزة" : "Eduzah Signature Programs"}
            </h2>
          </div>
          <div style={centeredRow(20)}>
            {programs.map(p=>(
              <div key={p.id}
                onMouseEnter={e=>{e.currentTarget.style.transform="translateY(-5px)";e.currentTarget.style.boxShadow=`0 16px 40px rgba(217,27,91,.2)`;}}
                onMouseLeave={e=>{e.currentTarget.style.transform="";e.currentTarget.style.boxShadow="";}}
                onClick={()=>navigate("/courses")}
                style={{...centeredCell(280),background:"rgba(50,29,61,.65)",border:`1px solid ${C.border}`,borderRadius:20,overflow:"hidden",cursor:"pointer",transition:"all .3s"}}>
                {p.image
                  ? <img src={p.image} alt={p.title_ar} style={{width:"100%",height:"clamp(160px, 22vw, 220px)",objectFit:"cover",display:"block"}}/>
                  : <div style={{height:140,background:`linear-gradient(135deg,#321d3d,#4a1f6e)`,display:"flex",alignItems:"center",justifyContent:"center"}}>
                      <span style={{color:C.muted,fontWeight:900,fontSize:13,textAlign:"center",padding:"0 16px"}}>{lang==="ar"?p.title_ar:p.title_en}</span>
                    </div>
                }
                <div style={{padding:"16px 18px"}}>
                  <div style={{fontWeight:800,fontSize:14,marginBottom:7}}>{lang==="ar"?p.title_ar:p.title_en}</div>
                  <div style={{color:C.muted,fontSize:12,lineHeight:1.7}}>{lang==="ar"?p.desc_ar:p.desc_en}</div>
                </div>
              </div>
            ))}
          </div>
          <div style={{textAlign:"center",marginTop:28}}>
            <Btn children={lang==="ar"?"عرض كل البرامج ←":"View All Programs →"} v="outline" onClick={()=>navigate("/courses")} style={{padding:"11px 26px"}}/>
          </div>
        </div>
      )}

      {/* ── Featured Courses ── */}
      <div style={{background:"#2a1540",padding:"clamp(36px,7vw,70px) 5%"}}>
        <div style={{textAlign:"center",marginBottom:36}}>
          <div style={{color:C.orange,fontWeight:700,fontSize:11,letterSpacing:2,marginBottom:8}}>
            {lang==="ar" ? "الكورسات المميزة" : "FEATURED COURSES"}
          </div>
          <h2 style={{fontSize:"clamp(1.4rem,3vw,2.4rem)",fontWeight:900}}>
            {lang==="ar" ? "أبرز كورساتنا" : "Our Top Courses"}
          </h2>
        </div>
        {featured.length===0
          ? <div style={{textAlign:"center",color:C.muted,padding:"40px 0"}}>{lang==="ar"?"لا توجد كورسات مميزة.":"No featured courses yet."}</div>
          : <div style={centeredRow(20)}>{featured.map(c=>(
              <div key={c.id} style={centeredCell(288)}>
                <CourseCard course={c} lang={lang}/>
              </div>
            ))}</div>}
        <div style={{textAlign:"center",marginTop:28}}>
          <Btn children={lang==="ar"?"عرض كل الكورسات ←":"View All Courses →"} v="outline" onClick={()=>navigate("/courses")} style={{padding:"11px 26px"}}/>
        </div>
      </div>

      {/* ── About / Team ── */}
      <div style={{background:"#321d3d",padding:"clamp(36px,7vw,70px) 5%"}}>
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(280px,1fr))",gap:44,alignItems:"center"}}>
          <div>
            <div style={{color:C.orange,fontWeight:700,fontSize:11,letterSpacing:2,marginBottom:12}}>
              {lang==="ar" ? "عن EDUZAH" : "ABOUT EDUZAH"}
            </div>
            <h2 style={{fontSize:"clamp(1.4rem,3vw,2.2rem)",fontWeight:900,marginBottom:16,lineHeight:1.3}}>
              {lang==="ar" ? "شركة تدريب متكاملة" : "A Complete Training Company"}
            </h2>
            <p style={{color:C.muted,fontSize:14,lineHeight:1.9,marginBottom:20}}>
              {lang==="ar"
                ? "شركة Eduzah متخصصة في تقديم حلول التدريب المهني للأفراد والمؤسسات والشركات في مصر. نهدف إلى بناء كوادر بشرية مؤهلة قادرة على المنافسة في سوق العمل."
                : "Eduzah specializes in professional training solutions for individuals, institutions, and companies in Egypt. Our mission is to build qualified human capital ready for the job market."
              }
            </p>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:24}}>
              {[
                [lang==="ar"?"مدربون خبراء معتمدون":"Certified Expert Trainers"],
                [lang==="ar"?"تدريب عملي على مشاريع حقيقية":"Real Project Training"],
                [lang==="ar"?"دعم توظيف لخريجينا":"Job Placement Support"],
                [lang==="ar"?"شهادات معتمدة ومعترف بها":"Recognized Certificates"],
              ].map(([l])=>(
                <div key={l} style={{display:"flex",alignItems:"center",gap:8,background:"rgba(255,255,255,.05)",borderRadius:10,padding:"9px 12px"}}>
                  <span style={{color:C.success,fontWeight:900}}>✓</span>
                  <span style={{fontSize:12,fontWeight:600}}>{l}</span>
                </div>
              ))}
            </div>
            <div style={{display:"flex",gap:12,flexWrap:"wrap"}}>
              <Btn onClick={()=>window.open(`https://wa.me/${SITE.phone.replace(/[^0-9]/g,"")}`)}>
                {lang==="ar"?"تواصل معنا":"Contact Us"}
              </Btn>
              <Btn children={lang==="ar"?"خدماتنا للشركات":"Corporate Services"} v="outline" onClick={()=>navigate("/corporate")}/>
            </div>
          </div>
          <div style={{borderRadius:20,overflow:"hidden",boxShadow:`0 20px 60px rgba(0,0,0,.4)`}}>
            <img
              src="/images/team-banner.webp"
              srcSet="/images/team-banner-small.webp 500w, /images/team-banner.webp 900w"
              sizes="(max-width:600px) 500px, 900px"
              alt="Eduzah Event"
              loading="lazy"
              style={{width:"100%",height:340,objectFit:"cover",display:"block"}}
            />
          </div>
        </div>
      </div>

      {/* ── Services ── */}
      <div style={{background:"#2a1540",padding:"clamp(36px,7vw,70px) 5%"}}>
        <div style={{textAlign:"center",marginBottom:36}}>
          <div style={{color:C.orange,fontWeight:700,fontSize:11,letterSpacing:2,marginBottom:8}}>
            {lang==="ar" ? "خدماتنا" : "OUR SERVICES"}
          </div>
          <h2 style={{fontSize:"clamp(1.4rem,3vw,2.4rem)",fontWeight:900}}>
            {lang==="ar" ? "حلول شاملة للأفراد والمؤسسات" : "Comprehensive Solutions for Individuals & Organizations"}
          </h2>
        </div>
        <div style={centeredRow(18)}>
          {[
            {ar:"تدريب الأفراد",en:"Individual Training",ar2:"كورسات مسجلة وأونلاين وحضورية",en2:"Recorded, Online & Offline courses",path:"/courses"},
            {ar:"تدريب الشركات",en:"Corporate Training",ar2:"برامج تدريبية مخصصة للمؤسسات",en2:"Customized programs for organizations",path:"/corporate"},
            {ar:"خدمة التوظيف",en:"Hiring Service",ar2:"نوفّر خريجينا المؤهلين للشركات",en2:"We supply qualified graduates to companies",path:"/hiring"},
            {ar:"استشارة مجانية",en:"Free Consultation",ar2:"احصل على توجيه مخصص لأهدافك",en2:"Get personalized guidance for your goals",path:"/consultation"},
          ].map(s=>(
            <div key={s.ar}
              onMouseEnter={e=>{e.currentTarget.style.transform="translateY(-4px)";e.currentTarget.style.borderColor=C.red;}}
              onMouseLeave={e=>{e.currentTarget.style.transform="";e.currentTarget.style.borderColor=C.border;}}
              onClick={()=>navigate(s.path)}
              style={{...centeredCell(228),background:"rgba(50,29,61,.6)",border:`1.5px solid ${C.border}`,borderRadius:16,padding:22,cursor:"pointer",transition:"all .25s",textAlign:"center"}}>
              <div style={{fontWeight:800,fontSize:14,marginBottom:8}}>{lang==="ar"?s.ar:s.en}</div>
              <div style={{color:C.muted,fontSize:12,lineHeight:1.6}}>{lang==="ar"?s.ar2:s.en2}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Testimonials Slider ── */}
      {testimonials.length > 0 && (
        <div ref={testimonialsRef} style={{background:"#321d3d",padding:"clamp(36px,7vw,70px) 5%",overflow:"hidden"}}>
          <div style={{textAlign:"center",marginBottom:36}}>
            <div style={{color:C.orange,fontWeight:700,fontSize:11,letterSpacing:2,marginBottom:8}}>
              {lang==="ar" ? "آراء عملائنا" : "TESTIMONIALS"}
            </div>
            <h2 style={{fontSize:"clamp(1.4rem,3vw,2.4rem)",fontWeight:900,marginBottom:8}}>
              {lang==="ar" ? "ماذا يقول متدربونا" : "What Our Trainees Say"}
            </h2>
            <div style={{display:"flex",alignItems:"center",justifyContent:"center",gap:8}}><Stars n={5}/><span style={{color:C.muted,fontSize:13}}>4.8 / 5.0</span></div>
          </div>

          {/* Featured testimonial (auto-sliding) */}
          <div style={{maxWidth:640,margin:"0 auto 28px",position:"relative",minHeight:200}}>
            {testimonials.map((tc, i) => (
              <div key={tc.id}
                style={{
                  position: i === 0 ? "relative" : "absolute",
                  inset: 0,
                  opacity: i === activeTestimonial ? 1 : 0,
                  transform: i === activeTestimonial ? "translateY(0)" : "translateY(16px)",
                  transition: "opacity .6s ease, transform .6s ease",
                  pointerEvents: i === activeTestimonial ? "auto" : "none",
                }}>
                <Card style={{padding:28,textAlign:"center"}}>
                  <Stars n={tc.rating||5}/>
                  <p style={{color:"rgba(255,255,255,.85)",fontSize:14,lineHeight:1.9,margin:"14px 0 20px",fontStyle:"italic"}}>
                    "{lang==="ar"?tc.comment_ar:(tc.comment_en||tc.comment_ar)}"
                  </p>
                  <div style={{display:"flex",alignItems:"center",justifyContent:"center",gap:12}}>
                    {tc.image
                      ? <img src={tc.image} alt={tc.name} style={{width:44,height:44,borderRadius:"50%",objectFit:"cover",flexShrink:0}}/>
                      : <div style={{width:44,height:44,borderRadius:"50%",background:"linear-gradient(135deg,#d91b5b,#b51549)",display:"flex",alignItems:"center",justifyContent:"center",fontWeight:700,fontSize:18,flexShrink:0}}>
                          {lang==="ar"?(tc.avatar||tc.name?.[0]):(tc.name_en?.[0]||tc.name?.[0])}
                        </div>
                    }
                    <div style={{textAlign:"start"}}>
                      <div style={{fontWeight:700,fontSize:14}}>{lang==="ar"?tc.name:(tc.name_en||tc.name)}</div>
                      <div style={{color:C.muted,fontSize:12}}>{lang==="ar"?tc.course_ar:(tc.course_en||tc.course_ar)}</div>
                    </div>
                  </div>
                </Card>
              </div>
            ))}
          </div>

          {/* Dot navigation */}
          {testimonials.length > 1 && (
            <div style={{display:"flex",justifyContent:"center",gap:8,marginBottom:32}}>
              {testimonials.map((_, i) => (
                <button key={i}
                  onClick={() => setActiveTestimonial(i)}
                  style={{
                    width: i === activeTestimonial ? 24 : 8,
                    height:8, borderRadius:4, border:"none",
                    background: i === activeTestimonial ? C.red : "rgba(255,255,255,.25)",
                    cursor:"pointer", transition:"all .35s ease",
                  }}
                />
              ))}
            </div>
          )}

          {/* Grid of remaining */}
          {testimonials.length > 1 && (
            <div style={centeredRow(14)}>
              {testimonials.filter((_,i)=>i!==activeTestimonial).slice(0,3).map(tc=>(
                <Card key={tc.id} style={{...centeredCell(248),padding:16}}>
                  <Stars n={tc.rating||5}/>
                  <p style={{color:C.muted,fontSize:12,lineHeight:1.8,margin:"10px 0 12px"}}>
                    "{(lang==="ar"?tc.comment_ar:(tc.comment_en||tc.comment_ar)).slice(0,90)}…"
                  </p>
                  <div style={{display:"flex",alignItems:"center",gap:8}}>
                    {tc.image
                      ? <img src={tc.image} alt={tc.name} style={{width:32,height:32,borderRadius:"50%",objectFit:"cover"}}/>
                      : <div style={{width:32,height:32,borderRadius:"50%",background:"linear-gradient(135deg,#d91b5b,#b51549)",display:"flex",alignItems:"center",justifyContent:"center",fontWeight:700,fontSize:13}}>
                          {lang==="ar"?(tc.avatar||tc.name?.[0]):(tc.name_en?.[0]||tc.name?.[0])}
                        </div>
                    }
                    <div>
                      <div style={{fontWeight:700,fontSize:12}}>{lang==="ar"?tc.name:(tc.name_en||tc.name)}</div>
                      <div style={{color:C.muted,fontSize:11}}>{lang==="ar"?tc.course_ar:(tc.course_en||tc.course_ar)}</div>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Latest News ── */}
      {latestNews.length > 0 && (
        <div style={{background:"#2a1540",padding:"clamp(36px,7vw,70px) 5%"}}>
          <div style={{textAlign:"center",marginBottom:36}}>
            <div style={{color:C.orange,fontWeight:700,fontSize:11,letterSpacing:2,marginBottom:8}}>
              {lang==="ar" ? "آخر الأخبار" : "LATEST NEWS"}
            </div>
            <h2 style={{fontSize:"clamp(1.4rem,3vw,2.4rem)",fontWeight:900}}>
              {lang==="ar" ? "أخبار Eduzah" : "Eduzah News"}
            </h2>
          </div>
          <div style={centeredRow(18)}>
            {latestNews.map(n=>(
              <Card key={n.id} style={{...centeredCell(288),padding:0,overflow:"hidden"}}>
                {n.images?.length>0
                  ? <img src={n.images[0]} alt={n.title} style={{width:"100%",height:160,objectFit:"cover",display:"block"}}/>
                  : <div style={{height:80,background:"linear-gradient(135deg,rgba(103,45,134,.4),rgba(217,27,91,.2))"}}/>
                }
                <div style={{padding:"14px 16px"}}>
                  <span style={{background:`${C.orange}22`,color:C.orange,border:`1px solid ${C.orange}44`,borderRadius:50,padding:"2px 9px",fontSize:11,fontWeight:700}}>
                    {lang==="ar" ? n.tag : (n.tag_en || n.tag)}
                  </span>
                  <div style={{fontWeight:800,fontSize:13,margin:"8px 0 6px",lineHeight:1.5}}>{lang==="ar"?n.title:(n.title_en||n.title)}</div>
                  <div style={{color:C.muted,fontSize:12,lineHeight:1.7}}>{(lang==="ar"?n.excerpt:(n.excerpt_en||n.excerpt)).slice(0,75)}...</div>
                  <div style={{color:C.muted,fontSize:11,marginTop:9}}>{n.date}</div>
                </div>
              </Card>
            ))}
          </div>
          <div style={{textAlign:"center",marginTop:26}}>
            <Btn children={lang==="ar"?"كل الأخبار ←":"All News →"} v="outline" onClick={()=>navigate("/news")} style={{padding:"10px 24px"}}/>
          </div>
        </div>
      )}

      {/* ── CTA ── */}
      <div style={{background:gHero,padding:"clamp(36px,7vw,60px) 5%",textAlign:"center"}}>
        <h2 style={{fontSize:"clamp(1.4rem,3vw,2.2rem)",fontWeight:900,marginBottom:12}}>
          {lang==="ar" ? "جاهز لتطوير مسيرتك أو مؤسستك؟" : "Ready to Elevate Your Career or Organization?"}
        </h2>
        <p style={{color:C.muted,fontSize:14,marginBottom:26}}>
          {lang==="ar" ? "انضم لأكثر من 5,000 متدرب اختاروا Eduzah" : "Join 5,000+ trainees who chose Eduzah"}
        </p>
        <div style={{display:"flex",gap:12,justifyContent:"center",flexWrap:"wrap"}}>
          {!currentUser
            ? <Btn className="hero-cta-primary" children={lang==="ar"?"ابدأ رحلتك 🚀":"Start Your Journey 🚀"} onClick={()=>navigate("/register")} style={{padding:"13px 30px",borderRadius:12,background:"linear-gradient(135deg,#d91b5b,#b51549)"}}/>
            : currentUser.role === "admin"
              ? <Btn className="hero-cta-primary" children={lang==="ar"?"\u0644\u0648\u062d\u0629 \u0627\u0644\u062a\u062d\u0643\u0645":"Dashboard"} onClick={()=>navigate("/dashboard")} style={{padding:"13px 30px",borderRadius:12,background:"linear-gradient(135deg,#f59e0b,#d97706)"}}/>
              : <Btn className="hero-cta-primary" children={lang==="ar"?"كمل التعلم ▶":"Continue learning ▶"} onClick={()=>navigate("/dashboard")} style={{padding:"13px 30px",borderRadius:12}}/>
          }
          <Btn children={lang==="ar"?"\u0645\u0634 \u0639\u0627\u0631\u0641 \u062a\u0628\u062f\u0623 \u0645\u0646\u064a\u0646\u061f":"Find my path"} v="outline" onClick={()=>navigate("/find-path")} style={{padding:"13px 30px"}}/>
          <Btn children={lang==="ar"?"تدريب الشركات":"Corporate Training"} v="outline" onClick={()=>navigate("/corporate")} style={{padding:"13px 30px"}}/>
          <Btn children={lang==="ar"?"استشارة مجانية":"Free Consultation"} v="outline" onClick={()=>navigate("/consultation")} style={{padding:"13px 30px"}}/>
        </div>
      </div>

      {/* Footer */}
      <footer style={{background:"#1a0f24",padding:"36px 5% 18px",borderTop:`1px solid ${C.border}`}}>
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(160px,1fr))",gap:24,marginBottom:20}}>
          <div>
            <div style={{fontWeight:900,fontSize:22,marginBottom:10}}><span style={{color:C.red}}>Edu</span><span style={{color:C.orange}}>zah</span></div>
            <p style={{color:C.muted,fontSize:12,lineHeight:1.9}}>{lang==="ar"?SITE.tagline:SITE.tagline_en}</p>
          </div>
          <div>
            <div style={{fontWeight:700,fontSize:13,marginBottom:12}}>{lang==="ar"?"روابط سريعة":"Quick Links"}</div>
            {[
              ["/courses",     lang==="ar"?"البرامج":"Programs"],
              ["/corporate",   lang==="ar"?"تدريب الشركات":"Corporate"],
              ["/hiring",      lang==="ar"?"التوظيف":"Hiring"],
              ["/consultation",lang==="ar"?"استشارة":"Consultation"],
              ["/news",        lang==="ar"?"الأخبار":"News"],
            ].map(([p,l])=>(
              <div key={p} style={{color:C.muted,fontSize:12,marginBottom:7,cursor:"pointer"}} onClick={()=>navigate(p)}>{l}</div>
            ))}
          </div>
          <div>
            <div style={{fontWeight:700,fontSize:13,marginBottom:12}}>{lang==="ar"?"تواصل معنا":"Contact"}</div>
            <div style={{color:C.muted,fontSize:12,marginBottom:6}}>{lang==="ar"?"الموقع:":"Location:"} {SITE.location}</div>
            <div style={{color:C.muted,fontSize:12,marginBottom:6}}>{lang==="ar"?"الهاتف:":"Phone:"} {SITE.phone}</div>
            <div style={{color:C.muted,fontSize:12,marginBottom:6}}>{lang==="ar"?"البريد:":"Email:"} {SITE.email}</div>
            <div style={{display:"flex",gap:10,marginTop:12}}>
              {/* Facebook */}
              <a href={SITE.social.facebook} target="_blank" rel="noreferrer"
                style={{width:38,height:38,background:"#1877F2",borderRadius:10,display:"flex",alignItems:"center",justifyContent:"center",textDecoration:"none",flexShrink:0,transition:"opacity .2s"}}
                onMouseEnter={e=>e.currentTarget.style.opacity=".8"}
                onMouseLeave={e=>e.currentTarget.style.opacity="1"}>
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="20" height="20" fill="#fff">
                  <path d="M24 12.073C24 5.404 18.627 0 12 0S0 5.404 0 12.073C0 18.1 4.388 23.094 10.125 24v-8.437H7.078v-3.49h3.047V9.41c0-3.025 1.792-4.697 4.533-4.697 1.313 0 2.686.236 2.686.236v2.97h-1.513c-1.491 0-1.956.93-1.956 1.886v2.267h3.328l-.532 3.49h-2.796V24C19.612 23.094 24 18.1 24 12.073z"/>
                </svg>
              </a>
              {/* Instagram */}
              <a href={SITE.social.instagram} target="_blank" rel="noreferrer"
                style={{width:38,height:38,background:"linear-gradient(45deg,#f09433,#e6683c 25%,#dc2743 50%,#cc2366 75%,#bc1888)",borderRadius:10,display:"flex",alignItems:"center",justifyContent:"center",textDecoration:"none",flexShrink:0,transition:"opacity .2s"}}
                onMouseEnter={e=>e.currentTarget.style.opacity=".8"}
                onMouseLeave={e=>e.currentTarget.style.opacity="1"}>
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="20" height="20" fill="#fff">
                  <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
                </svg>
              </a>
              {/* LinkedIn */}
              <a href={SITE.social.linkedin} target="_blank" rel="noreferrer"
                style={{width:38,height:38,background:"#0A66C2",borderRadius:10,display:"flex",alignItems:"center",justifyContent:"center",textDecoration:"none",flexShrink:0,transition:"opacity .2s"}}
                onMouseEnter={e=>e.currentTarget.style.opacity=".8"}
                onMouseLeave={e=>e.currentTarget.style.opacity="1"}>
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="20" height="20" fill="#fff">
                  <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
                </svg>
              </a>
            </div>
          </div>
        </div>
        <div style={{borderTop:`1px solid ${C.border}`,paddingTop:14,textAlign:"center",color:C.muted,fontSize:11}}>
          &copy; 2025 Eduzah. {lang==="ar"?"جميع الحقوق محفوظة.":"All rights reserved."}
        </div>
      </footer>
    </div>
  );
}
