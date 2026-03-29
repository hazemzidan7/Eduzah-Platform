import { useNavigate } from "react-router-dom";
import { C } from "../../theme";
import { Btn, Card, PBar } from "../../components/UI";
import { useAuth } from "../../context/AuthContext";
import { useData } from "../../context/DataContext";

const MOTIS = ["أنت على بعد 3 دروس من إتقان هذه المهارة! استمر! 🎯","عمل رائع! الاستمرارية هي قوتك الخارقة. 🚀","كل درس تكمله يقربك من وظيفة أحلامك! 💪","أنت في أفضل 10% من الطلاب! ⭐"];

export default function StudentDashboard() {
  const { currentUser } = useAuth();
  const { courses } = useData();
  const navigate = useNavigate();
  const enrolled = courses.filter(c => currentUser?.enrolledCourses?.find(e => e.courseId===c.id));
  const getED = id => currentUser?.enrolledCourses?.find(e => e.courseId===id);
  const totalProg = enrolled.length>0 ? Math.round(enrolled.reduce((s,c)=>s+(getED(c.id)?.progress||0),0)/enrolled.length) : 0;
  const moti = MOTIS[Math.floor(Date.now()/60000)%MOTIS.length];

  return (
    <div style={{padding:"clamp(20px,4vw,32px) 5%"}}>
      <div style={{marginBottom:22,display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:12}}>
        <div><div style={{color:C.muted,fontSize:13,marginBottom:3}}>مرحباً بعودتك 👋</div><h1 style={{fontSize:"clamp(18px,4vw,26px)",fontWeight:900,margin:0}}>{currentUser?.name}</h1></div>
        <Btn children="+ استعرض كورسات" v="outline" sm onClick={()=>navigate("/courses")}/>
      </div>
      <div style={{background:"linear-gradient(135deg,rgba(250,166,51,.12),rgba(217,27,91,.12))",border:"1px solid rgba(250,166,51,.3)",borderRadius:14,padding:"12px 16px",marginBottom:20,display:"flex",alignItems:"center",gap:12}}>
        <span style={{fontSize:22}}>🚀</span><div><div style={{fontWeight:700,fontSize:13}}>{moti}</div><div style={{color:C.muted,fontSize:11}}>Keep it up!</div></div>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(120px,1fr))",gap:12,marginBottom:22}}>
        {[{l:"كورساتي",v:enrolled.length,i:"📚",c:C.red},{l:"التقدم",v:`${totalProg}%`,i:"📊",c:C.orange},{l:"شهادات",v:enrolled.filter(c=>(getED(c.id)?.progress||0)===100).length,i:"🏆",c:C.purple}].map(s=>(
          <Card key={s.l} style={{padding:"16px 14px"}}><div style={{fontSize:22,marginBottom:6}}>{s.i}</div><div style={{fontSize:22,fontWeight:900,color:s.c}}>{s.v}</div><div style={{color:C.muted,fontSize:12}}>{s.l}</div></Card>
        ))}
      </div>
      <div style={{fontWeight:800,fontSize:15,marginBottom:12}}>📚 كورساتي</div>
      {enrolled.length===0
        ? <Card style={{padding:40,textAlign:"center"}}><div style={{fontSize:40,marginBottom:12}}>📭</div><div style={{fontWeight:700,marginBottom:8}}>لا توجد كورسات بعد</div><div style={{color:C.muted,fontSize:13,marginBottom:18}}>استعرض الكورسات واشترك الآن</div><Btn children="استعرض الكورسات" onClick={()=>navigate("/courses")}/></Card>
        : <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(240px,1fr))",gap:14}}>
          {enrolled.map(c=>{const ed=getED(c.id);const prog=ed?.progress||0;return(
            <div key={c.id} onMouseEnter={e=>e.currentTarget.style.transform="translateY(-4px)"} onMouseLeave={e=>e.currentTarget.style.transform=""}
              onClick={()=>navigate(`/learn/${c.slug}`)}
              style={{background:"rgba(50,29,61,.6)",border:`1px solid ${C.border}`,borderRadius:16,overflow:"hidden",cursor:"pointer",transition:"all .25s"}}>
              <div style={{height:110,background:`linear-gradient(135deg,${c.color},#321d3d)`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:32,position:"relative"}}>
                {c.icon}{prog===100&&<div style={{position:"absolute",inset:0,background:"rgba(16,185,129,.4)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:24}}>🏆</div>}
                <div style={{position:"absolute",bottom:0,left:0,right:0,height:3}}><div style={{height:"100%",width:`${prog}%`,background:prog===100?C.success:C.orange}}/></div>
              </div>
              <div style={{padding:"12px 14px"}}>
                <div style={{fontWeight:800,fontSize:13,marginBottom:3}}>{c.title}</div>
                <PBar value={prog} color={prog===100?C.success:C.red} h={4}/>
                <div style={{display:"flex",justifyContent:"space-between",marginTop:6}}><span style={{color:C.muted,fontSize:11}}>{prog}%</span><span style={{color:prog===100?C.success:C.orange,fontSize:11,fontWeight:700}}>{prog===100?"✓ مكتمل":"متابعة ▶"}</span></div>
              </div>
            </div>
          );})}
        </div>}
    </div>
  );
}
