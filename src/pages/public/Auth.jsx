import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { C, gHero } from "../../theme";
import { Btn, Input, Select } from "../../components/UI";
import { useAuth } from "../../context/AuthContext";

export function LoginPage() {
  const { login } = useAuth();
  const navigate  = useNavigate();
  const [email,setEmail] = useState("");
  const [pass,setPass]   = useState("");
  const [err,setErr]     = useState("");
  const submit = () => {
    const r = login(email,pass);
    if (!r.ok) { setErr(r.msg); return; }
    navigate("/dashboard");
  };
  return (
    <div style={{minHeight:"calc(100vh - 58px)",background:gHero,display:"flex",alignItems:"center",justifyContent:"center",padding:"40px 16px"}}>
      <div style={{background:"rgba(50,29,61,.92)",backdropFilter:"blur(24px)",border:`1px solid ${C.border}`,borderRadius:22,padding:28,width:"100%",maxWidth:380}}>
        <div style={{textAlign:"center",marginBottom:22}}>
          <div style={{fontWeight:900,fontSize:24,marginBottom:4}}><span style={{color:C.red}}>Edu</span><span style={{color:C.orange}}>zah</span></div>
          <div style={{color:C.muted,fontSize:13}}>مرحباً بعودتك 👋</div>
        </div>
        <Input label="البريد الإلكتروني" value={email} onChange={setEmail} type="email" placeholder="email@example.com"/>
        <Input label="كلمة المرور" value={pass} onChange={setPass} type="password" placeholder="••••••••"/>
        {err&&<div style={{background:`${C.danger}18`,border:`1px solid ${C.danger}44`,borderRadius:9,padding:"9px 12px",fontSize:12,color:C.danger,marginBottom:12}}>{err}</div>}
        <Btn children="دخول 🚀" full onClick={submit} style={{padding:"12px",fontSize:14,boxShadow:`0 8px 25px rgba(217,27,91,.4)`}}/>
        <div style={{textAlign:"center",marginTop:14,fontSize:12,color:C.muted}}>مش عندك حساب؟ <span style={{color:C.orange,cursor:"pointer",fontWeight:700}} onClick={()=>navigate("/register")}>سجّل دلوقتي</span></div>
        <div style={{marginTop:14,padding:"10px 12px",background:"rgba(255,255,255,.06)",borderRadius:9,fontSize:11,color:C.muted}}>
          <b>للتجربة:</b><br/>Admin: admin@eduzah.com / admin123<br/>Student: ahmed@test.com / 123456<br/>Instructor: khalid@test.com / 123456
        </div>
      </div>
    </div>
  );
}

export function RegisterPage() {
  const { register } = useAuth();
  const navigate     = useNavigate();
  const [f,setF]     = useState({name:"",email:"",pass:"",phone:"",role:"student"});
  const [err,setErr] = useState("");
  const [ok,setOk]   = useState(false);
  const set = (k,v) => setF(p=>({...p,[k]:v}));
  const submit = () => {
    if (!f.name||!f.email||!f.pass||!f.phone){setErr("كمّل البيانات كلها");return;}
    const r = register(f);
    if (!r.ok){setErr(r.msg);return;}
    setOk(true);
  };
  if (ok) return (
    <div style={{minHeight:"calc(100vh - 58px)",background:gHero,display:"flex",alignItems:"center",justifyContent:"center",padding:40}}>
      <div style={{textAlign:"center"}}>
        <div style={{fontSize:60,marginBottom:16}}>✅</div>
        <h2 style={{fontWeight:900,fontSize:22,marginBottom:8}}>تم إنشاء حسابك!</h2>
        <p style={{color:C.muted,marginBottom:24}}>في انتظار موافقة الـ Admin.</p>
        <Btn children="تسجيل الدخول" onClick={()=>navigate("/login")}/>
      </div>
    </div>
  );
  return (
    <div style={{minHeight:"calc(100vh - 58px)",background:gHero,display:"flex",alignItems:"center",justifyContent:"center",padding:"40px 16px"}}>
      <div style={{background:"rgba(50,29,61,.92)",backdropFilter:"blur(24px)",border:`1px solid ${C.border}`,borderRadius:22,padding:28,width:"100%",maxWidth:420}}>
        <div style={{textAlign:"center",marginBottom:22}}>
          <div style={{fontWeight:900,fontSize:24,marginBottom:4}}><span style={{color:C.red}}>Edu</span><span style={{color:C.orange}}>zah</span></div>
          <div style={{color:C.muted,fontSize:13}}>انضم لـ Eduzah 🚀</div>
        </div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
          <Input label="الاسم *" value={f.name} onChange={v=>set("name",v)} placeholder="أحمد محمد"/>
          <Input label="الهاتف *" value={f.phone} onChange={v=>set("phone",v)} placeholder="+201..."/>
        </div>
        <Input label="البريد *" value={f.email} onChange={v=>set("email",v)} type="email" placeholder="email@example.com"/>
        <Input label="كلمة المرور *" value={f.pass} onChange={v=>set("pass",v)} type="password" placeholder="••••••••"/>
        <Select label="نوع الحساب" value={f.role} onChange={v=>set("role",v)} options={[{v:"student",l:"👨‍🎓 طالب"},{v:"instructor",l:"👨‍🏫 Instructor"}]}/>
        <div style={{background:`${C.orange}18`,border:`1px solid ${C.orange}33`,borderRadius:9,padding:"9px 12px",fontSize:12,color:C.orange,marginBottom:14}}>⚠️ حسابك هيتراجع من Admin خلال 24 ساعة</div>
        {err&&<div style={{background:`${C.danger}18`,border:`1px solid ${C.danger}44`,borderRadius:9,padding:"9px 12px",fontSize:12,color:C.danger,marginBottom:12}}>{err}</div>}
        <Btn children="إنشاء الحساب ✨" full onClick={submit} style={{padding:"12px",fontSize:14,boxShadow:`0 8px 25px rgba(217,27,91,.4)`}}/>
        <div style={{textAlign:"center",marginTop:12,fontSize:12,color:C.muted}}>عندك حساب؟ <span style={{color:C.orange,cursor:"pointer",fontWeight:700}} onClick={()=>navigate("/login")}>سجّل دخولك</span></div>
      </div>
    </div>
  );
}
