import { useNavigate } from "react-router-dom";
import { C, gHero } from "../../theme";
import { Btn, Card, Stars } from "../../components/UI";
import { SITE, TRACKS } from "../../data";
import { useAuth } from "../../context/AuthContext";
import { useData } from "../../context/DataContext";
import { useLang } from "../../context/LangContext";
import { Seo } from "../../components/Seo";

function CourseCard({ course, lang }) {
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const enrolled = currentUser?.enrolledCourses?.find(e => e.courseId === course.id);
  const title = lang === "ar" ? course.title : (course.title_en || course.title);
  const dur = (d) => lang === "ar" ? d : d.replace(/أسابيع|أسبوع/g, "weeks").replace("ترمين سنوياً", "2 Terms/Year");
  return (
    <div
      onMouseEnter={e=>{e.currentTarget.style.transform="translateY(-6px)";e.currentTarget.style.boxShadow=`0 18px 45px rgba(217,27,91,.25)`;}}
      onMouseLeave={e=>{e.currentTarget.style.transform="";e.currentTarget.style.boxShadow="";}}
      onClick={()=>navigate(`/courses/${course.slug}`)}
      style={{background:"rgba(50,29,61,.65)",border:`1px solid ${C.border}`,borderRadius:20,overflow:"hidden",cursor:"pointer",transition:"all .3s"}}>
      <div style={{position:"relative",height:160,overflow:"hidden",flexShrink:0}}>
        {course.image
          ? <img src={course.image} alt={title} loading="lazy" decoding="async" style={{width:"100%",height:"100%",objectFit:"cover",display:"block"}}/>
          : <div style={{width:"100%",height:"100%",background:`linear-gradient(135deg,${course.color||C.red},#321d3d)`}}/>
        }
        {/* dim overlay + title at bottom */}
        <div style={{position:"absolute",inset:0,background:"linear-gradient(to top,rgba(0,0,0,.65) 0%,transparent 55%)"}}/>
        <span style={{position:"absolute",bottom:12,left:14,right:14,fontWeight:800,fontSize:13,lineHeight:1.4,color:"#fff",textShadow:"0 1px 4px rgba(0,0,0,.6)"}}>{title}</span>
        {course.badge&&<div style={{position:"absolute",top:10,right:10,background:"rgba(217,27,91,.92)",borderRadius:7,padding:"3px 10px",fontSize:10,fontWeight:700,color:"#fff"}}>{lang === "ar" ? course.badge : (course.badge_en || course.badge)}</div>}
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
}

export default function Landing() {
  const navigate = useNavigate();
  const { lang } = useLang();
  const { courses, news, programs, testimonials } = useData();
  const featured    = courses.filter(c => c.featured).slice(0,3);
  const latestNews  = news.slice(0,3);
  const dir = lang === "ar" ? "rtl" : "ltr";

  return (
    <div dir={dir}>
      <Seo
        title={lang === "ar" ? "Eduzah" : "Eduzah"}
        description={lang === "ar" ? SITE.tagline : (SITE.tagline_en || SITE.tagline)}
      />
      {/* ── Hero ── */}
      <div style={{minHeight:"calc(100vh - 60px)",background:gHero,display:"flex",alignItems:"center",padding:"50px 5%",position:"relative",overflow:"hidden",gap:40,flexWrap:"wrap"}}>
        <div style={{position:"absolute",top:"-15%",right:"-8%",width:500,height:500,background:`radial-gradient(circle,rgba(103,45,134,.3),transparent 70%)`,borderRadius:"50%",pointerEvents:"none"}}/>
        <div style={{position:"absolute",bottom:"-15%",left:"-5%",width:400,height:400,background:`radial-gradient(circle,rgba(217,27,91,.25),transparent 70%)`,borderRadius:"50%",pointerEvents:"none"}}/>

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
            <Btn children={lang==="ar" ? "استعرض البرامج" : "Explore Programs"} onClick={()=>navigate("/courses")} style={{padding:"12px 26px",fontSize:14,boxShadow:`0 8px 25px rgba(217,27,91,.4)`}}/>
            <Btn children={lang==="ar" ? "استشارة مجانية" : "Free Consultation"} v="outline" onClick={()=>navigate("/consultation")} style={{padding:"12px 26px",fontSize:14}}/>
          </div>
          <div style={{display:"flex",gap:"clamp(16px,4vw,40px)",flexWrap:"wrap"}}>
            {[
              ["5,000+", lang==="ar"?"متدرب":"Trainees"],
              ["50+",    lang==="ar"?"مؤسسة شريكة":"Partners"],
              ["4.8/5",  lang==="ar"?"تقييم":"Rating"],
              ["3+",     lang==="ar"?"سنوات":"Years"]
            ].map(([n,l])=>(
              <div key={l}><div style={{fontSize:"clamp(1.4rem,3vw,2rem)",fontWeight:900,color:C.orange}}>{n}</div><div style={{color:C.muted,fontSize:11,marginTop:2}}>{l}</div></div>
            ))}
          </div>
        </div>

        {/* Team photo — larger on desktop, scales down on small screens */}
        <div style={{ flex: "1 1 400px", maxWidth: "min(100%, 560px)", minWidth: 280, position: "relative", zIndex: 2, marginInline: "auto" }}>
          <div style={{ borderRadius: 20, overflow: "hidden", border: `2px solid ${C.border}`, boxShadow: `0 20px 60px rgba(0,0,0,.4)` }}>
            <img
              src="/images/team-office.webp"
              srcSet="/images/team-office-small.webp 500w, /images/team-office.webp 900w"
              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 45vw, 560px"
              alt="Eduzah Team"
              loading="eager"
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
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(240px,1fr))",gap:20}}>
          {TRACKS.map(tr=>(
            <div key={tr.id}
              onMouseEnter={e=>{e.currentTarget.style.transform="translateY(-4px)";e.currentTarget.style.borderColor=tr.color;}}
              onMouseLeave={e=>{e.currentTarget.style.transform="";e.currentTarget.style.borderColor=C.border;}}
              onClick={()=>navigate(`/courses?track=${tr.id}`)}
              style={{background:"rgba(50,29,61,.6)",border:`1.5px solid ${C.border}`,borderRadius:16,padding:22,cursor:"pointer",transition:"all .25s"}}>
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
          <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(260px,1fr))",gap:20}}>
            {programs.map(p=>(
              <div key={p.id}
                onMouseEnter={e=>{e.currentTarget.style.transform="translateY(-5px)";e.currentTarget.style.boxShadow=`0 16px 40px rgba(217,27,91,.2)`;}}
                onMouseLeave={e=>{e.currentTarget.style.transform="";e.currentTarget.style.boxShadow="";}}
                onClick={()=>navigate("/courses")}
                style={{background:"rgba(50,29,61,.65)",border:`1px solid ${C.border}`,borderRadius:20,overflow:"hidden",cursor:"pointer",transition:"all .3s"}}>
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
          : <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(270px,1fr))",gap:20}}>{featured.map(c=><CourseCard key={c.id} course={c} lang={lang}/>)}</div>}
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
              <Btn children={lang==="ar"?"تواصل معنا":"Contact Us"} onClick={()=>window.open(`https://wa.me/${SITE.phone.replace(/[^0-9]/g,"")}`)}>تواصل معنا</Btn>
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
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(220px,1fr))",gap:18}}>
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
              style={{background:"rgba(50,29,61,.6)",border:`1.5px solid ${C.border}`,borderRadius:16,padding:22,cursor:"pointer",transition:"all .25s",textAlign:"center"}}>
              <div style={{fontWeight:800,fontSize:14,marginBottom:8}}>{lang==="ar"?s.ar:s.en}</div>
              <div style={{color:C.muted,fontSize:12,lineHeight:1.6}}>{lang==="ar"?s.ar2:s.en2}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Testimonials (Dynamic) ── */}
      {testimonials.length > 0 && (
        <div style={{background:"#321d3d",padding:"clamp(36px,7vw,70px) 5%"}}>
          <div style={{textAlign:"center",marginBottom:36}}>
            <div style={{color:C.orange,fontWeight:700,fontSize:11,letterSpacing:2,marginBottom:8}}>
              {lang==="ar" ? "آراء عملائنا" : "TESTIMONIALS"}
            </div>
            <h2 style={{fontSize:"clamp(1.4rem,3vw,2.4rem)",fontWeight:900,marginBottom:8}}>
              {lang==="ar" ? "ماذا يقول متدربونا" : "What Our Trainees Say"}
            </h2>
            <div style={{display:"flex",alignItems:"center",justifyContent:"center",gap:8}}><Stars n={5}/><span style={{color:C.muted,fontSize:13}}>4.8 / 5.0</span></div>
          </div>
          <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(250px,1fr))",gap:18}}>
            {testimonials.map(tc=>(
              <Card key={tc.id} style={{padding:20}}>
                <Stars n={tc.rating||5}/>
                <p style={{color:C.muted,fontSize:13,lineHeight:1.85,margin:"12px 0 16px"}}>
                  "{lang==="ar"?tc.comment_ar:tc.comment_en}"
                </p>
                <div style={{display:"flex",alignItems:"center",gap:10}}>
                  {tc.image
                    ? <img src={tc.image} alt={tc.name} style={{width:36,height:36,borderRadius:"50%",objectFit:"cover",flexShrink:0}}/>
                    : <div style={{width:36,height:36,borderRadius:"50%",background:"linear-gradient(135deg,#d91b5b,#b51549)",display:"flex",alignItems:"center",justifyContent:"center",fontWeight:700,fontSize:15,flexShrink:0}}>{tc.avatar||tc.name?.[0]}</div>
                  }
                  <div>
                    <div style={{fontWeight:700,fontSize:13}}>{tc.name}</div>
                    <div style={{color:C.muted,fontSize:11}}>{lang==="ar"?tc.course_ar:tc.course_en}</div>
                  </div>
                </div>
              </Card>
            ))}
          </div>
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
          <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(270px,1fr))",gap:18}}>
            {latestNews.map(n=>(
              <Card key={n.id} style={{padding:0,overflow:"hidden"}}>
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
          <Btn children={lang==="ar"?"ابدأ الآن":"Get Started"} onClick={()=>navigate("/register")} style={{padding:"13px 30px",boxShadow:`0 8px 25px rgba(217,27,91,.44)`}}/>
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
