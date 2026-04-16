import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { C } from "../../theme";
import { Btn, PBar } from "../../components/UI";
import { useAuth } from "../../context/AuthContext";
import { useData } from "../../context/DataContext";
import { useLang } from "../../context/LangContext";
import { TRACKS } from "../../data";

const TRAINING_TYPES = [
  { v: "all",      ar: "الكل",      en: "All" },
  { v: "online",   ar: "أونلاين",   en: "Live Online" },
  { v: "offline",  ar: "حضوري (فرع)", en: "Offline (branch)" },
];

const TYPE_COLORS = { online: "#0ea5e9", offline: "#10b981" };

export default function CoursesPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { currentUser } = useAuth();
  const { courses } = useData();
  const { lang } = useLang();
  const dir = lang === "ar" ? "rtl" : "ltr";

  const [track, setTrack]   = useState(searchParams.get("track") || "all");
  const [type,  setType]    = useState("all");
  const [search, setSearch] = useState("");

  useEffect(() => {
    const t = searchParams.get("track");
    if (t) setTrack(t);
  }, [searchParams]);

  const filtered = courses.filter(c => {
    const matchTrack  = track === "all" || c.trackId === track;
    const matchType   = type  === "all" || (c.trainingTypes || []).includes(type);
    const matchSearch = !search || c.title.toLowerCase().includes(search.toLowerCase()) || (c.title_en||"").toLowerCase().includes(search.toLowerCase());
    return matchTrack && matchType && matchSearch;
  });

  const dur = (d) => lang === "ar" ? d : d.replace(/أسابيع|أسبوع/g, "weeks").replace("ترمين سنوياً", "2 Terms/Year");

  return (
    <div style={{padding:"clamp(24px,5vw,44px) 5%"}} dir={dir}>
      {/* Header */}
      <div style={{textAlign:"center",marginBottom:36}}>
        <div style={{color:C.orange,fontWeight:700,fontSize:11,letterSpacing:2,marginBottom:8}}>
          {lang==="ar" ? "كل البرامج" : "ALL PROGRAMS"}
        </div>
        <h1 style={{fontSize:"clamp(1.5rem,3vw,2.4rem)",fontWeight:900,marginBottom:10,color:"var(--page-text)"}}>
          {lang==="ar" ? "كورسات التدريب المتخصصة" : "Specialized Training Courses"}
        </h1>
        <p style={{color:"var(--page-muted)",fontSize:14}}>{courses.length} {lang==="ar" ? "برنامج متخصص" : "specialized programs"}</p>
      </div>

      {/* Search */}
      <div style={{maxWidth:480,margin:"0 auto 28px"}}>
        <input
          value={search}
          onChange={e=>setSearch(e.target.value)}
          placeholder={lang==="ar" ? "ابحث عن كورس..." : "Search courses..."}
          style={{width:"100%",boxSizing:"border-box",background:"var(--input-bg)",border:"1.5px solid var(--input-border)",borderRadius:12,padding:"11px 16px",color:"var(--page-text)",fontFamily:"'Cairo',sans-serif",fontSize:13,outline:"none"}}
        />
      </div>

      {/* Track Filter */}
      <div style={{marginBottom:16}}>
        <div style={{color:"var(--page-muted)",fontSize:11,fontWeight:700,marginBottom:10,letterSpacing:1}}>
          {lang==="ar" ? "المسار:" : "TRACK:"}
        </div>
        <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
          <button onClick={()=>setTrack("all")} style={{padding:"7px 16px",borderRadius:50,background:track==="all"?C.red:"var(--chip-inactive-bg)",border:`1.5px solid ${track==="all"?C.red:"var(--chip-inactive-border)"}`,color:track==="all"?"#fff":"var(--chip-inactive-text)",fontFamily:"'Cairo',sans-serif",fontWeight:600,fontSize:12,cursor:"pointer",transition:"all .2s"}}>
            {lang==="ar" ? "الكل" : "All"}
          </button>
          {TRACKS.map(tr=>(
            <button key={tr.id} onClick={()=>setTrack(tr.id)} style={{padding:"7px 16px",borderRadius:50,background:track===tr.id?tr.color:"var(--chip-inactive-bg)",border:`1.5px solid ${track===tr.id?tr.color:"var(--chip-inactive-border)"}`,color:track===tr.id?"#fff":"var(--chip-inactive-text)",fontFamily:"'Cairo',sans-serif",fontWeight:600,fontSize:12,cursor:"pointer",transition:"all .2s"}}>
              {lang==="ar" ? tr.title_ar : tr.title_en}
            </button>
          ))}
        </div>
      </div>

      {/* Training Type Filter */}
      <div style={{marginBottom:28}}>
        <div style={{color:"var(--page-muted)",fontSize:11,fontWeight:700,marginBottom:10,letterSpacing:1}}>
          {lang==="ar" ? "نوع التدريب:" : "TRAINING TYPE:"}
        </div>
        <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
          {TRAINING_TYPES.map(t=>(
            <button key={t.v} onClick={()=>setType(t.v)} style={{padding:"6px 14px",borderRadius:50,background:type===t.v?"rgba(217,27,91,.22)":"var(--chip-inactive-bg)",border:`1.5px solid ${type===t.v?C.red:"var(--chip-inactive-border)"}`,color:type===t.v?C.red:"var(--chip-inactive-text)",fontFamily:"'Cairo',sans-serif",fontWeight:600,fontSize:12,cursor:"pointer",transition:"all .2s"}}>
              {lang==="ar" ? t.ar : t.en}
            </button>
          ))}
        </div>
      </div>

      {/* Results */}
      {filtered.length===0
        ? <div style={{textAlign:"center",color:"var(--page-muted)",padding:"60px 0",fontSize:14}}>
            {lang==="ar" ? "لا توجد كورسات مطابقة للبحث." : "No courses match your search."}
          </div>
        : <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(280px,1fr))",gap:20}}>
          {filtered.map(c=>{
            const enrolled  = currentUser?.enrolledCourses?.find(e=>e.courseId===c.id);
            const prog      = enrolled?.progress||0;
            const trackData = TRACKS.find(tr=>tr.id===c.trackId);
            return (
              <div
                key={c.id}
                onClick={() => navigate(`/courses/${c.slug}`)}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = "translateY(-5px)";
                  e.currentTarget.style.boxShadow = "0 18px 45px rgba(217,27,91,.2)";
                  e.currentTarget.style.background = "var(--surface-hover)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = "";
                  e.currentTarget.style.boxShadow = "";
                  e.currentTarget.style.background = "var(--surface)";
                }}
                style={{
                  background: "var(--surface)",
                  border: "1px solid var(--page-border)",
                  borderRadius: 20,
                  overflow: "hidden",
                  cursor: "pointer",
                  transition: "transform .3s, box-shadow .3s, background .2s",
                }}
              >
                <div style={{ position: "relative", height: 160, overflow: "hidden", flexShrink: 0 }}>
                  {c.image
                    ? <img src={c.image} alt={lang==="ar"?c.title:(c.title_en||c.title)} loading="lazy" style={{width:"100%",height:"100%",objectFit:"cover",display:"block"}}/>
                    : <div style={{width:"100%",height:"100%",background:`linear-gradient(135deg,${c.color||C.red}cc,#1a0f2e)`,position:"relative",overflow:"hidden"}}>
                        {/* decorative circles */}
                        <div style={{position:"absolute",top:-28,right:-28,width:110,height:110,borderRadius:"50%",background:"rgba(255,255,255,.07)"}}/>
                        <div style={{position:"absolute",bottom:-32,left:-18,width:130,height:130,borderRadius:"50%",background:"rgba(255,255,255,.05)"}}/>
                        <div style={{position:"absolute",top:"50%",left:"50%",transform:"translate(-50%,-50%)",width:70,height:70,borderRadius:"50%",background:"rgba(255,255,255,.06)",border:"1.5px solid rgba(255,255,255,.12)"}}/>
                        {/* big faded initial */}
                        <div style={{position:"absolute",inset:0,display:"flex",alignItems:"center",justifyContent:"center"}}>
                          <span style={{fontSize:64,fontWeight:900,color:"rgba(255,255,255,.13)",lineHeight:1,userSelect:"none",letterSpacing:-2}}>
                            {((lang==="ar"?c.title:(c.title_en||c.title))||"").charAt(0).toUpperCase()}
                          </span>
                        </div>
                      </div>
                  }
                  <div style={{position:"absolute",inset:0,background:"linear-gradient(to top,rgba(0,0,0,.65) 0%,transparent 55%)"}}/>
                  <span style={{position:"absolute",bottom:12,left:14,right:14,fontWeight:800,fontSize:13,lineHeight:1.4,color:"#fff",textShadow:"0 1px 4px rgba(0,0,0,.6)"}}>
                    {lang==="ar"?c.title:(c.title_en||c.title)}
                  </span>
                  {c.featured&&<div style={{position:"absolute",top:10,right:10,background:`${C.orange}dd`,borderRadius:7,padding:"3px 10px",fontSize:10,fontWeight:700,color:"#fff"}}>{lang==="ar"?"مميز":"Featured"}</div>}
                </div>
                <div style={{padding:"14px 16px 18px"}}>
                  {/* Track badge */}
                  {trackData&&<div style={{display:"inline-flex",alignItems:"center",gap:4,background:`${trackData.color}15`,color:trackData.color,border:`1px solid ${trackData.color}33`,borderRadius:50,padding:"2px 9px",fontSize:10,fontWeight:700,marginBottom:8}}>
                    {lang==="ar" ? trackData.title_ar : trackData.title_en}
                  </div>}

                  <div style={{ fontWeight: 800, fontSize: 14, marginBottom: 5, color: "var(--page-text)" }}>{lang==="ar"?c.title:(c.title_en||c.title)}</div>
                  <div style={{ color: "var(--page-muted)", fontSize: 12, marginBottom: 10, lineHeight: 1.6 }}>{(lang==="ar"?c.desc:(c.desc_en||c.desc)||"").slice(0,65)}...</div>

                  {/* Training type badges */}
                  <div style={{display:"flex",gap:6,marginBottom:10,flexWrap:"wrap"}}>
                    {(c.trainingTypes||[]).map(tt=>(
                      <span key={tt} style={{background:`${TYPE_COLORS[tt]}18`,color:TYPE_COLORS[tt],border:`1px solid ${TYPE_COLORS[tt]}33`,borderRadius:6,padding:"2px 8px",fontSize:10,fontWeight:700}}>
                        {lang==="ar" ? TRAINING_TYPES.find(x=>x.v===tt)?.ar : TRAINING_TYPES.find(x=>x.v===tt)?.en}
                      </span>
                    ))}
                  </div>

                  <div style={{display:"flex",gap:12,marginBottom:10}}>
                    <span style={{color:"var(--page-muted)",fontSize:11}}>{dur(c.duration)}</span>
                    <span style={{color:"var(--page-muted)",fontSize:11}}>{c.hours}h</span>
                    {c.rating>0&&<span style={{color:C.orange,fontSize:11}}>{c.rating} / 5</span>}
                  </div>

                  {enrolled&&<div style={{marginBottom:10}}><PBar value={prog} color={C.orange} h={4}/><div style={{color:"var(--page-muted)",fontSize:11,marginTop:3}}>{prog}% {lang==="ar"?"مكتمل":"completed"}</div></div>}

                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",borderTop:"1px solid var(--page-border)",paddingTop:10}}>
                    <div>
                      <span style={{fontWeight:900,fontSize:16,color:C.red}}>{c.price.toLocaleString()} <small style={{fontSize:10,color:"var(--page-muted)",fontWeight:400}}>EGP</small></span>
                      {c.installment>0&&<div style={{color:"var(--page-muted)",fontSize:10}}>{lang==="ar"?"أو":"or"} {c.installment.toLocaleString()} EGP &times; 3</div>}
                    </div>
                    <Btn children={enrolled?(lang==="ar"?"متابعة ▶":"Continue ▶"):(lang==="ar"?"سجّل الآن":"Enroll")} sm onClick={e=>{e.stopPropagation();navigate(`/courses/${c.slug}`);}}/>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      }
    </div>
  );
}
