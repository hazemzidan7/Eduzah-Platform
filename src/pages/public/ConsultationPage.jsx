import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { C, gHero } from "../../theme";
import { Btn, Card, Input } from "../../components/UI";
import { useLang } from "../../context/LangContext";
import { submitToSheet } from "../../utils/sheets";
import { SITE } from "../../data";

const REQUEST_TYPES = [
  { v:"track", ar:"اختيار مسار تعليمي", en:"Choose a Learning Track" },
  { v:"service", ar:"استشارة خدمة", en:"Service Consultation" },
  { v:"corporate", ar:"استشارة تدريب مؤسسي", en:"Corporate Training Consultation" },
  { v:"kids", ar:"برامج الأطفال", en:"Children Programs" },
  { v:"other", ar:"أخرى", en:"Other" },
];

const init = { name:"", phone:"", email:"", type:"track", message:"" };

export default function ConsultationPage() {
  const navigate = useNavigate();
  const { lang } = useLang();
  const dir = lang === "ar" ? "rtl" : "ltr";

  const [form, setForm]   = useState(init);
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [done, setDone]   = useState(false);

  const set = k => e => setForm(p => ({ ...p, [k]: e.target.value }));

  const validate = () => {
    const e = {};
    if (!form.name.trim()) e.name = lang==="ar" ? "الاسم مطلوب" : "Name is required";
    if (!form.phone.trim()) e.phone = lang==="ar" ? "رقم الهاتف مطلوب" : "Phone is required";
    if (form.email && !form.email.includes("@")) e.email = lang==="ar" ? "بريد غير صحيح" : "Invalid email";
    if (!form.message.trim()) e.message = lang==="ar" ? "الرسالة مطلوبة" : "Message is required";
    return e;
  };

  const submit = async () => {
    const e = validate();
    if (Object.keys(e).length) { setErrors(e); return; }
    setErrors({});
    setLoading(true);
    await submitToSheet("consultation", {
      name: form.name, phone: form.phone,
      email: form.email, type: form.type, message: form.message,
    });
    setLoading(false);
    setDone(true);
  };

  const ErrMsg = ({ field }) => errors[field]
    ? <div style={{color:C.danger,fontSize:11,marginTop:3}}>{errors[field]}</div> : null;

  return (
    <div dir={dir}>
      {/* Hero */}
      <div style={{background:gHero,padding:"clamp(40px,8vw,80px) 5%",position:"relative",overflow:"hidden"}}>
        <div style={{position:"absolute",top:"-20%",right:"-10%",width:500,height:500,background:`radial-gradient(circle,rgba(103,45,134,.3),transparent 70%)`,borderRadius:"50%",pointerEvents:"none"}}/>
        <div style={{position:"relative",zIndex:2,maxWidth:660}}>
          <div style={{display:"inline-flex",alignItems:"center",gap:8,background:`${C.orange}22`,border:`1px solid ${C.orange}44`,color:C.orange,borderRadius:50,padding:"5px 16px",fontSize:12,fontWeight:700,marginBottom:20}}>
            💬 {lang==="ar" ? "استشارة مجانية" : "Free Consultation"}
          </div>
          <h1 style={{fontSize:"clamp(1.8rem,4vw,3rem)",fontWeight:900,lineHeight:1.25,marginBottom:18}}>
            {lang==="ar"
              ? <>مش عارف تختار المسار؟<br/><span style={{color:C.orange}}>احنا نساعدك</span></>
              : <>Not Sure Which Path to Choose?<br/><span style={{color:C.orange}}>We'll Guide You</span></>
            }
          </h1>
          <p style={{color:C.muted,fontSize:15,lineHeight:1.85,maxWidth:540}}>
            {lang==="ar"
              ? "سواء كنت مبتدئاً أو محترفاً تبحث عن تطوير مهاراتك، فريقنا هنا للإجابة على كل أسئلتك وإرشادك للمسار الأنسب لأهدافك."
              : "Whether you're a beginner or a professional looking to upskill, our team is here to answer all your questions and guide you to the right path for your goals."
            }
          </p>
        </div>
      </div>

      {/* Features */}
      <div style={{background:"#321d3d",padding:"clamp(28px,5vw,50px) 5%"}}>
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(200px,1fr))",gap:16}}>
          {[
            {ar:"استشارة مجانية 100%", en:"100% Free Consultation", ar2:"بدون أي تكلفة", en2:"No cost whatsoever"},
            {ar:"رد خلال 24 ساعة", en:"Response in 24 Hours", ar2:"فريقنا متاح دائماً", en2:"Our team is always available"},
            {ar:"مدربون خبراء", en:"Expert Trainers", ar2:"توجيه من أفضل المحترفين", en2:"Guidance from top professionals"},
            {ar:"خطة شخصية", en:"Personal Plan", ar2:"مخصصة لأهدافك", en2:"Tailored to your goals"},
          ].map(f=>(
            <div key={f.ar} style={{background:"rgba(50,29,61,.6)",border:`1px solid ${C.border}`,borderRadius:14,padding:18,textAlign:"center"}}>
              <div style={{fontWeight:800,fontSize:13,marginBottom:5}}>{lang==="ar" ? f.ar : f.en}</div>
              <div style={{color:C.muted,fontSize:11}}>{lang==="ar" ? f.ar2 : f.en2}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Form */}
      <div style={{background:"#2a1540",padding:"clamp(36px,7vw,70px) 5%"}}>
        <div style={{maxWidth:640,margin:"0 auto"}}>
          <div style={{textAlign:"center",marginBottom:32}}>
            <h2 style={{fontSize:"clamp(1.4rem,3vw,2rem)",fontWeight:900,marginBottom:10}}>
              {lang==="ar" ? "اطلب استشارتك الآن" : "Request Your Consultation"}
            </h2>
            <p style={{color:C.muted,fontSize:13}}>
              {lang==="ar" ? "سيتواصل معك أحد مستشارينا خلال 24 ساعة" : "One of our consultants will contact you within 24 hours"}
            </p>
          </div>

          {done ? (
            <Card style={{padding:40,textAlign:"center"}}>
              <div style={{fontSize:64,marginBottom:16}}>🎉</div>
              <h3 style={{fontWeight:900,fontSize:22,marginBottom:10}}>
                {lang==="ar" ? "تم إرسال طلبك!" : "Request Sent!"}
              </h3>
              <p style={{color:C.muted,fontSize:14,marginBottom:24,lineHeight:1.8}}>
                {lang==="ar"
                  ? `شكراً ${form.name}، سيتواصل معك أحد مستشارينا خلال 24 ساعة على رقم ${form.phone}.`
                  : `Thank you ${form.name}, a consultant will reach you within 24 hours at ${form.phone}.`
                }
              </p>
              <div style={{display:"flex",gap:12,justifyContent:"center",flexWrap:"wrap"}}>
                <Btn children={lang==="ar" ? "طلب آخر" : "New Request"} onClick={()=>{setForm(init);setDone(false);}}/>
                <Btn children={lang==="ar" ? "الرئيسية" : "Home"} v="outline" onClick={()=>navigate("/")}/>
              </div>
              <a href={`https://wa.me/${SITE.phone.replace(/[^0-9]/g,"")}`} target="_blank" rel="noreferrer"
                style={{display:"block",marginTop:16,color:"#25d366",fontWeight:700,fontSize:13,textDecoration:"none"}}>
                💬 {lang==="ar" ? "أو تواصل معنا مباشرة على واتساب" : "Or contact us directly on WhatsApp"}
              </a>
            </Card>
          ) : (
            <Card style={{padding:28}}>
              {/* Name */}
              <div style={{marginBottom:14}}>
                <label style={{fontSize:12,color:C.muted,fontWeight:700,display:"block",marginBottom:6}}>
                  {lang==="ar" ? "الاسم الكامل *" : "Full Name *"}
                </label>
                <input value={form.name} onChange={set("name")}
                  placeholder={lang==="ar" ? "اكتب اسمك هنا" : "Write your name here"}
                  style={{width:"100%",boxSizing:"border-box",background:"rgba(50,29,61,.6)",border:`1.5px solid ${errors.name?C.danger:C.border}`,borderRadius:10,padding:"11px 14px",color:"#fff",fontFamily:"'Cairo',sans-serif",fontSize:13,outline:"none"}}/>
                <ErrMsg field="name"/>
              </div>

              {/* Phone + Email */}
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14,marginBottom:14}}>
                <div>
                  <label style={{fontSize:12,color:C.muted,fontWeight:700,display:"block",marginBottom:6}}>
                    {lang==="ar" ? "رقم الهاتف *" : "Phone Number *"}
                  </label>
                  <input value={form.phone} onChange={set("phone")} type="tel"
                    placeholder="+20 1XX XXX XXXX"
                    style={{width:"100%",boxSizing:"border-box",background:"rgba(50,29,61,.6)",border:`1.5px solid ${errors.phone?C.danger:C.border}`,borderRadius:10,padding:"11px 14px",color:"#fff",fontFamily:"'Cairo',sans-serif",fontSize:13,outline:"none"}}/>
                  <ErrMsg field="phone"/>
                </div>
                <div>
                  <label style={{fontSize:12,color:C.muted,fontWeight:700,display:"block",marginBottom:6}}>
                    {lang==="ar" ? "البريد الإلكتروني" : "Email (Optional)"}
                  </label>
                  <input value={form.email} onChange={set("email")} type="email"
                    placeholder="email@example.com"
                    style={{width:"100%",boxSizing:"border-box",background:"rgba(50,29,61,.6)",border:`1.5px solid ${errors.email?C.danger:C.border}`,borderRadius:10,padding:"11px 14px",color:"#fff",fontFamily:"'Cairo',sans-serif",fontSize:13,outline:"none"}}/>
                  <ErrMsg field="email"/>
                </div>
              </div>

              {/* Request Type */}
              <div style={{marginBottom:16}}>
                <label style={{fontSize:12,color:C.muted,fontWeight:700,display:"block",marginBottom:10}}>
                  {lang==="ar" ? "نوع الطلب *" : "Request Type *"}
                </label>
                <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
                  {REQUEST_TYPES.map(rt=>(
                    <button key={rt.v} onClick={()=>setForm(p=>({...p,type:rt.v}))}
                      style={{padding:"8px 14px",borderRadius:10,background:form.type===rt.v?`${C.red}22`:"transparent",border:`1.5px solid ${form.type===rt.v?C.red:C.border}`,color:form.type===rt.v?C.red:"#fff",fontFamily:"'Cairo',sans-serif",fontWeight:600,fontSize:12,cursor:"pointer",transition:"all .2s"}}>
                      {lang==="ar" ? rt.ar : rt.en}
                    </button>
                  ))}
                </div>
              </div>

              {/* Message */}
              <div style={{marginBottom:22}}>
                <label style={{fontSize:12,color:C.muted,fontWeight:700,display:"block",marginBottom:6}}>
                  {lang==="ar" ? "رسالتك *" : "Your Message *"}
                </label>
                <textarea value={form.message} onChange={set("message")} rows={4}
                  placeholder={lang==="ar"
                    ? "اشرح سؤالك أو ما تريد تعلمه أو الخدمة التي تحتاجها..."
                    : "Explain your question, what you want to learn, or the service you need..."}
                  style={{width:"100%",boxSizing:"border-box",background:"rgba(50,29,61,.6)",border:`1.5px solid ${errors.message?C.danger:C.border}`,borderRadius:10,padding:"11px 14px",color:"#fff",fontFamily:"'Cairo',sans-serif",fontSize:13,resize:"vertical",outline:"none"}}/>
                <ErrMsg field="message"/>
              </div>

              <Btn
                children={loading ? (lang==="ar"?"جاري الإرسال...":"Sending...") : (lang==="ar"?"إرسال الطلب":"Send Request")}
                onClick={submit}
                style={{width:"100%",padding:"13px",fontSize:15,opacity:loading?0.7:1}}
              />
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
