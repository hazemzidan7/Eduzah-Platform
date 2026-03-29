import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { C } from "../../theme";
import { Btn, PBar } from "../../components/UI";
import { useAuth } from "../../context/AuthContext";
import { useData } from "../../context/DataContext";
import { useLang } from "../../context/LangContext";
import { TRACKS } from "../../data";

const TRAINING_TYPES = [
  { v: "all", ar: "الكل", en: "All" },
  { v: "recorded", ar: "مسجّل", en: "Recorded" },
  { v: "online", ar: "أونلاين", en: "Live Online" },
  { v: "offline", ar: "حضوري", en: "Offline" },
];

const TYPE_ICONS = { recorded: "🎥", online: "💻", offline: "🏢" };
const TYPE_COLORS = { recorded: C.purple, online: "#0ea5e9", offline: "#10b981" };

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
    const matchTrack = track === "all" || c.trackId === track;
    const matchType  = type  === "all" || (c.trainingTypes || []).includes(type);
    const matchSearch = !search || c.title.toLowerCase().includes(search.toLowerCase()) || (c.title_en||"").toLowerCase().includes(search.toLowerCase());
    return matchTrack && matchType && matchSearch;
  });

  const dir2 = lang === "ar" ? "rtl" : "ltr";

  return (
    <div style={{padding:"clamp(24px,5vw,44px) 5%"}} dir={dir2}>
      {/* Header */}
      <div style={{textAlign:"center",marginBottom:36}}>
        <div style={{color:C.orange,fontWeight:700,fontSize:11,letterSpacing:2,marginBottom:8}}>
          {lang==="ar" ? "كل البرامج" : "ALL PROGRAMS"}
        </div>
        <h1 style={{fontSize:"clamp(1.5rem,3vw,2.4rem)",fontWeight:900,marginBottom:10}}>
          {lang==="ar" ? "كورسات التدريب المتخصصة" : "Specialized Training Courses"}
        </h1>
        <p style={{color:C.muted,fontSize:14}}>{courses.length} {lang==="ar" ? "برنامج متخصص" : "specialized programs"}</p>
      </div>

      {/* Search */}
      <div style={{maxWidth:480,margin:"0 auto 28px"}}>
        <input
          value={search}
          onChange={e=>setSearch(e.target.value)}
          placeholder={lang==="ar" ? "ابحث عن كورس..." : "Search courses..."}
          style={{width:"100%",boxSizing:"border-box",background:"rgba(50,29,61,.6)",border:`1.5px solid ${C.border}`,borderRadius:12,padding:"11px 16px",color:"#fff",fontFamily:"'Cairo',sans-serif",fontSize:13,outline:"none"}}
        />
      </div>

      {/* Track Filter */}
      <div style={{marginBottom:16}}>
        <div style={{color:C.muted,fontSize:11,fontWeight:700,marginBottom:10,letterSpacing:1}}>
          {lang==="ar" ? "المسار:" : "TRACK:"}
        </div>
        <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
          <button onClick={()=>setTrack("all")} style={{padding:"7px 16px",borderRadius:50,background:track==="all"?C.red:"transparent",border:`1.5px solid ${track==="all"?C.red:C.border}`,color:"#fff",fontFamily:"'Cairo',sans-serif",fontWeight:600,fontSize:12,cursor:"pointer",transition:"all .2s"}}>
            {lang==="ar" ? "الكل" : "All"}
          </button>
          {TRACKS.map(tr=>(
            <button key={tr.id} onClick={()=>setTrack(tr.id)} style={{padding:"7px 16px",borderRadius:50,background:track===tr.id?tr.color:"transparent",border:`1.5px solid ${track===tr.id?tr.color:C.border}`,color:"#fff",fontFamily:"'Cairo',sans-serif",fontWeight:600,fontSize:12,cursor:"pointer",transition:"all .2s",display:"flex",alignItems:"center",gap:6}}>
              <span>{tr.icon}</span> {lang==="ar" ? tr.title_ar : tr.title_en}
            </button>
          ))}
        </div>
      </div>

      {/* Training Type Filter */}
      <div style={{marginBottom:28}}>
        <div style={{color:C.muted,fontSize:11,fontWeight:700,marginBottom:10,letterSpacing:1}}>
          {lang==="ar" ? "نوع التدريب:" : "TRAINING TYPE:"}
        </div>
        <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
          {TRAINING_TYPES.map(t=>(
            <button key={t.v} onClick={()=>setType(t.v)} style={{padding:"6px 14px",borderRadius:50,background:type===t.v?"rgba(217,27,91,.2)":"transparent",border:`1.5px solid ${type===t.v?C.red:C.border}`,color:type===t.v?C.red:"#fff",fontFamily:"'Cairo',sans-serif",fontWeight:600,fontSize:12,cursor:"pointer",transition:"all .2s"}}>
              {t.v!=="all"&&<span style={{marginInlineEnd:5}}>{TYPE_ICONS[t.v]}</span>}
              {lang==="ar" ? t.ar : t.en}
            </button>
          ))}
        </div>
      </div>

      {/* Results */}
      {filtered.length===0
        ? <div style={{textAlign:"center",color:C.muted,padding:"60px 0",fontSize:14}}>
            {lang==="ar" ? "لا توجد كورسات مطابقة للبحث." : "No courses match your search."}
          </div>
        : <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(280px,1fr))",gap:20}}>
          {filtered.map(c=>{
            const enrolled = currentUser?.enrolledCourses?.find(e=>e.courseId===c.id);
            const prog = enrolled?.progress||0;
            const trackData = TRACKS.find(tr=>tr.id===c.trackId);
            return (
              <div key={c.id}
                onMouseEnter={e=>{e.currentTarget.style.transform="translateY(-5px)";e.currentTarget.style.boxShadow=`0 18px 45px rgba(217,27,91,.2)`;}}
                onMouseLeave={e=>{e.currentTarget.style.transform="";e.currentTarget.style.boxShadow="";}}
                onClick={()=>navigate(`/courses/${c.slug}`)}
                style={{background:"rgba(50,29,61,.65)",border:`1px solid ${C.border}`,borderRadius:20,overflow:"hidden",cursor:"pointer",transition:"all .3s"}}>

                {c.image
                  ? <img src={c.image} alt={c.title} style={{width:"100%",height:150,objectFit:"cover"}}/>
                  : <div style={{height:150,background:`linear-gradient(135deg,${c.color},#321d3d)`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:48,position:"relative"}}>
                      {c.icon}
                      {c.featured&&<div style={{position:"absolute",top:10,right:10,background:`${C.orange}22`,border:`1px solid ${C.orange}44`,color:C.orange,borderRadius:50,padding:"3px 10px",fontSize:10,fontWeight:700}}>⭐ {lang==="ar"?"مميز":"Featured"}</div>}
                    </div>
                }
                <div style={{padding:"14px 16px 18px"}}>
                  {/* Track badge */}
                  {trackData&&<div style={{display:"inline-flex",alignItems:"center",gap:4,background:`${trackData.color}15`,color:trackData.color,border:`1px solid ${trackData.color}33`,borderRadius:50,padding:"2px 9px",fontSize:10,fontWeight:700,marginBottom:8}}>
                    {trackData.icon} {lang==="ar" ? trackData.title_ar : trackData.title_en}
                  </div>}

                  <div style={{fontWeight:800,fontSize:14,marginBottom:5}}>{lang==="ar"?c.title:(c.title_en||c.title)}</div>
                  <div style={{color:C.muted,fontSize:12,marginBottom:10,lineHeight:1.6}}>{(c.desc||"").slice(0,65)}...</div>

                  {/* Training types */}
                  <div style={{display:"flex",gap:6,marginBottom:10,flexWrap:"wrap"}}>
                    {(c.trainingTypes||[]).map(tt=>(
                      <span key={tt} style={{background:`${TYPE_COLORS[tt]}18`,color:TYPE_COLORS[tt],border:`1px solid ${TYPE_COLORS[tt]}33`,borderRadius:6,padding:"2px 8px",fontSize:10,fontWeight:700}}>
                        {TYPE_ICONS[tt]} {lang==="ar" ? TRAINING_TYPES.find(x=>x.v===tt)?.ar : TRAINING_TYPES.find(x=>x.v===tt)?.en}
                      </span>
                    ))}
                  </div>

                  <div style={{display:"flex",gap:12,marginBottom:10}}>
                    <span style={{color:C.muted,fontSize:11}}>⏱ {c.duration}</span>
                    <span style={{color:C.muted,fontSize:11}}>📚 {c.hours}h</span>
                    {c.rating>0&&<span style={{color:C.orange,fontSize:11}}>⭐ {c.rating}</span>}
                  </div>

                  {enrolled&&<div style={{marginBottom:10}}><PBar value={prog} color={C.orange} h={4}/><div style={{color:C.muted,fontSize:11,marginTop:3}}>{prog}% {lang==="ar"?"مكتمل":"completed"}</div></div>}

                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",borderTop:`1px solid ${C.border}`,paddingTop:10}}>
                    <div>
                      <span style={{fontWeight:900,fontSize:16,color:C.red}}>{c.price.toLocaleString()} <small style={{fontSize:10,color:C.muted,fontWeight:400}}>EGP</small></span>
                      {c.installment>0&&<div style={{color:C.muted,fontSize:10}}>{lang==="ar"?"أو":"or"} {c.installment.toLocaleString()} EGP × 3</div>}
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
