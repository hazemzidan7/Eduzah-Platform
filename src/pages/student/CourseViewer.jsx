import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { C } from "../../theme";
import { Btn, PBar, Badge } from "../../components/UI";
import { useAuth } from "../../context/AuthContext";
import { useData } from "../../context/DataContext";

export default function CourseViewer() {
  const { slug } = useParams();
  const navigate  = useNavigate();
  const { currentUser, markLesson } = useAuth();
  const { courses } = useData();
  const [li, setLi]       = useState(0);
  const [playing, setP]   = useState(false);
  const [tab, setTab]     = useState("lesson");

  const course = courses.find(c=>c.slug===slug);
  if (!course) { navigate("/dashboard"); return null; }

  const ed = currentUser?.enrolledCourses?.find(e=>e.courseId===course.id);
  if (!ed)  { navigate(`/courses/${slug}`); return null; }

  const prog = ed.progress||0;
  const done = ed.completedLessons||[];
  const allLessons = course.curriculum.flatMap(ch=>ch.lessons);
  const total = allLessons.length;
  const lesson = allLessons[li]||"Lesson";

  return (
    <div style={{display:"flex",flexDirection:"column",height:"calc(100vh - 58px)"}}>
      {/* topbar */}
      <div style={{background:"#2a1540",borderBottom:`1px solid ${C.border}`,padding:"9px 4%",display:"flex",alignItems:"center",gap:10,flexShrink:0,flexWrap:"wrap"}}>
        <button onClick={()=>navigate("/dashboard")} style={{background:"transparent",border:`1px solid ${C.border}`,borderRadius:8,padding:"4px 10px",color:C.muted,fontFamily:"'Cairo',sans-serif",fontSize:12,cursor:"pointer"}}>← رجوع</button>
        <div style={{fontWeight:700,fontSize:13,flex:1,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{course.title}</div>
        <div style={{display:"flex",alignItems:"center",gap:8,minWidth:150}}><PBar value={prog} color={C.orange} h={5}/><span style={{color:C.orange,fontWeight:800,fontSize:13,whiteSpace:"nowrap"}}>{prog}%</span></div>
      </div>

      <div style={{display:"grid",gridTemplateColumns:"1fr 250px",flex:1,overflow:"hidden"}}>
        {/* player */}
        <div style={{display:"flex",flexDirection:"column",overflow:"auto"}}>
          <div style={{background:"#000",minHeight:240,display:"flex",alignItems:"center",justifyContent:"center",position:"relative",flexShrink:0}}>
            <div onClick={()=>setP(!playing)} style={{width:60,height:60,borderRadius:"50%",background:playing?"rgba(255,255,255,.15)":`${C.red}cc`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:22,cursor:"pointer",transition:"all .2s",boxShadow:playing?"none":`0 0 30px ${C.red}66`}}>
              {playing?"⏸":"▶"}
            </div>
            <div style={{position:"absolute",bottom:0,left:0,right:0,background:"rgba(0,0,0,.85)",padding:"7px 12px"}}>
              <div style={{display:"flex",alignItems:"center",gap:9,marginBottom:3}}>
                <span style={{color:C.muted,fontSize:9}}>0:00</span>
                <div style={{flex:1,background:"rgba(255,255,255,.2)",borderRadius:99,height:2.5}}><div style={{width:playing?"45%":"0%",height:"100%",background:C.red,transition:"width 2s"}}/></div>
                <span style={{color:C.muted,fontSize:9}}>45 min</span>
              </div>
              <div style={{fontSize:11,color:"#fff",fontWeight:600}}>{lesson}</div>
            </div>
          </div>
          <div style={{display:"flex",borderBottom:`1px solid ${C.border}`,background:"rgba(50,29,61,.3)",flexShrink:0}}>
            {[["lesson","الدرس"],["about","عن الكورس"],["outcomes","Skills"]].map(([k,l])=>(
              <button key={k} onClick={()=>setTab(k)} style={{background:"transparent",border:"none",borderBottom:tab===k?`2px solid ${C.red}`:"2px solid transparent",color:tab===k?C.red:C.muted,padding:"9px 12px",fontFamily:"'Cairo',sans-serif",fontWeight:700,fontSize:11,cursor:"pointer"}}>{l}</button>
            ))}
          </div>
          <div style={{padding:"14px 16px",flex:1}}>
            {tab==="lesson"&&<div>
              <div style={{fontWeight:800,fontSize:13,marginBottom:7}}>📖 {lesson}</div>
              <p style={{color:C.muted,lineHeight:1.85,fontSize:12,marginBottom:12}}>في هذا الدرس هتتعلم المفاهيم الأساسية مع أمثلة عملية.</p>
              {done.includes(li)?<Badge color={C.success}>✓ تم الإكمال</Badge>
               :<Btn children="✅ تم مشاهدة الدرس" v="success" sm onClick={()=>markLesson(course.id,li,total)}/>}
            </div>}
            {tab==="about"&&<p style={{color:C.muted,fontSize:12,lineHeight:1.85}}>{course.desc}</p>}
            {tab==="outcomes"&&<div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(140px,1fr))",gap:7}}>
              {course.outcomes.map(s=><div key={s} style={{display:"flex",alignItems:"center",gap:6,background:"rgba(255,255,255,.06)",borderRadius:8,padding:"7px 9px"}}><span style={{color:C.success,fontSize:10}}>✓</span><span style={{fontSize:11,fontWeight:600}}>{s}</span></div>)}
            </div>}
          </div>
        </div>
        {/* sidebar */}
        <div style={{borderRight:`1px solid ${C.border}`,overflow:"auto",background:"rgba(50,29,61,.4)"}}>
          <div style={{padding:"9px 11px",fontWeight:800,fontSize:10,borderBottom:`1px solid ${C.border}`,color:C.muted,position:"sticky",top:0,background:"rgba(42,21,64,.97)"}}>
            📋 الدروس ({done.length}/{total})
          </div>
          {allLessons.map((l,i)=>{
            const isDone=done.includes(i);const isA=i===li;
            return <div key={i} onClick={()=>{setLi(i);setP(false);}} style={{padding:"9px 10px",background:isA?`${C.red}18`:"transparent",borderRight:isA?`3px solid ${C.red}`:"3px solid transparent",cursor:"pointer",borderBottom:`1px solid ${C.border}`,display:"flex",gap:7,alignItems:"flex-start",transition:"background .2s"}}>
              <div style={{width:19,height:19,borderRadius:"50%",flexShrink:0,background:isDone?C.success:"rgba(255,255,255,.07)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:8,fontWeight:800,color:isDone?"#fff":C.muted}}>{isDone?"✓":i+1}</div>
              <div style={{fontSize:10,fontWeight:600,color:isA?"#fff":C.muted,lineHeight:1.4}}>{l}</div>
            </div>;
          })}
        </div>
      </div>
    </div>
  );
}
