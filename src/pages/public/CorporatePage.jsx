import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { C, gHero } from "../../theme";
import { Btn, Card } from "../../components/UI";
import { useLang } from "../../context/LangContext";
import { useData } from "../../context/DataContext";
import { submitToSheet } from "../../utils/sheets";
import { SITE } from "../../data";

const MEETING_PLATFORMS = [
  { v:"zoom",  label:"Zoom" },
  { v:"meet",  label:"Google Meet" },
  { v:"teams", label:"Microsoft Teams" },
  { v:"phone", label:"هاتف / Phone" },
];

const PROGRAMS = [
  { abbr:"TK", icon:"💻", color:"#d91b5b", ar:"تدريب تقني",           en:"Technical Training",       desc_ar:"Front-End, Back-End, Flutter, AI, UI/UX",              desc_en:"Front-End, Back-End, Flutter, AI, UI/UX" },
  { abbr:"MG", icon:"📊", color:"#faa633", ar:"تدريب إداري",          en:"Management Training",      desc_ar:"HR, Soft Skills, القيادة, التصميم التعليمي",           desc_en:"HR, Soft Skills, Leadership, Instructional Design" },
  { abbr:"EN", icon:"🌐", color:"#0ea5e9", ar:"اللغة الإنجليزية",     en:"English Language",         desc_ar:"من المبتدئ حتى المتقدم + إنجليزي متخصص",              desc_en:"Beginner to advanced + business English" },
  { abbr:"KD", icon:"🧒", color:"#10b981", ar:"تدريب الأطفال",        en:"Children Programs",        desc_ar:"برمجة وإنجليزي للأطفال",                              desc_en:"Coding and English for children" },
  { abbr:"ED", icon:"📚", color:"#672d86", ar:"الاستشارات التعليمية", en:"Educational Consulting",   desc_ar:"تصميم برامج تدريبية مخصصة",                           desc_en:"Custom training program design" },
  { abbr:"CT", icon:"🏆", color:"#f59e0b", ar:"شهادات معتمدة",        en:"Certified Programs",       desc_ar:"برامج بشهادات معترف بها",                             desc_en:"Internationally recognized certificates" },
];

const initForm = { company:"", contact:"", phone:"", email:"", program:"", employees:"", platform:"meet", date:"", time:"", notes:"" };

export default function CorporatePage() {
  const navigate = useNavigate();
  const { lang } = useLang();
  const { categoryIcons } = useData();
  const dir = lang === "ar" ? "rtl" : "ltr";

  const [form,    setForm]    = useState(initForm);
  const [errors,  setErrors]  = useState({});
  const [loading, setLoading] = useState(false);
  const [done,    setDone]    = useState(false);

  const set = k => e => setForm(p => ({ ...p, [k]: e.target.value }));

  const validate = () => {
    const e = {};
    if (!form.company.trim()) e.company = lang==="ar" ? "اسم الشركة مطلوب" : "Company name required";
    if (!form.contact.trim()) e.contact = lang==="ar" ? "اسم المسؤول مطلوب" : "Contact name required";
    if (!form.phone.trim())   e.phone   = lang==="ar" ? "رقم الهاتف مطلوب" : "Phone number required";
    if (form.email && !form.email.includes("@")) e.email = lang==="ar" ? "بريد غير صحيح" : "Invalid email";
    return e;
  };

  const submit = async () => {
    const e = validate();
    if (Object.keys(e).length) { setErrors(e); return; }
    setErrors({});
    setLoading(true);
    await submitToSheet("corporate", {
      company: form.company, contact: form.contact,
      phone: form.phone, email: form.email,
      program: form.program, employees: form.employees,
      platform: form.platform, date: form.date,
      time: form.time, notes: form.notes,
    });
    setLoading(false);
    setDone(true);
  };

  const FieldWrap = ({ label, error, children }) => (
    <div>
      <label style={{fontSize:12,color:C.muted,fontWeight:700,display:"block",marginBottom:6}}>{label}</label>
      {children}
      {error && <div style={{color:C.danger,fontSize:11,marginTop:3}}>{error}</div>}
    </div>
  );

  const inputSx = (hasError) => ({
    width:"100%", boxSizing:"border-box",
    background:"rgba(50,29,61,.6)",
    border:`1.5px solid ${hasError ? C.danger : C.border}`,
    borderRadius:10, padding:"10px 14px",
    color:"#fff", fontFamily:"'Cairo',sans-serif", fontSize:13, outline:"none",
  });

  return (
    <div dir={dir}>
      {/* Hero */}
      <div style={{background:gHero,padding:"clamp(40px,8vw,80px) 5%",position:"relative",overflow:"hidden"}}>
        <div style={{position:"absolute",top:"-20%",right:"-8%",width:500,height:500,background:`radial-gradient(circle,rgba(103,45,134,.35),transparent 70%)`,borderRadius:"50%",pointerEvents:"none"}}/>
        <div style={{position:"relative",zIndex:2,maxWidth:700}}>
          <div style={{display:"inline-flex",alignItems:"center",gap:8,background:`${C.orange}22`,border:`1px solid ${C.orange}44`,color:C.orange,borderRadius:50,padding:"5px 16px",fontSize:12,fontWeight:700,marginBottom:20}}>
            {lang==="ar" ? "حلول تدريب الشركات والمؤسسات" : "Corporate & Institutional Training Solutions"}
          </div>
          <h1 style={{fontSize:"clamp(1.8rem,4vw,3rem)",fontWeight:900,lineHeight:1.25,marginBottom:18}}>
            {lang==="ar"
              ? <>حلول تدريبية متكاملة<br/><span style={{color:C.red}}>لمؤسستك</span></>
              : <>Complete Training Solutions<br/><span style={{color:C.red}}>for Your Organization</span></>}
          </h1>
          <p style={{color:C.muted,fontSize:15,lineHeight:1.85,marginBottom:30,maxWidth:560}}>
            {lang==="ar"
              ? "نقدم برامج تدريبية مخصصة للشركات والجهات الحكومية في مجالات التكنولوجيا والإدارة واللغات. هدفنا رفع كفاءة فريقك وتحقيق أهداف مؤسستك."
              : "We offer customized training programs for companies and government bodies in Technology, Management, and Languages. Our goal is elevating your team's performance."
            }
          </p>
          <div style={{display:"flex",gap:12,flexWrap:"wrap"}}>
            <Btn children={lang==="ar" ? "اطلب استشارة مجانية" : "Request Free Consultation"}
              onClick={()=>document.getElementById("corp-form").scrollIntoView({behavior:"smooth"})}
              style={{padding:"13px 28px",boxShadow:`0 8px 25px rgba(217,27,91,.44)`}}/>
            <a href={`https://wa.me/${SITE.phone.replace(/[^0-9]/g,"")}`} target="_blank" rel="noreferrer"
              style={{display:"inline-flex",alignItems:"center",gap:8,padding:"13px 22px",border:"1.5px solid #25d366",borderRadius:10,color:"#25d366",fontFamily:"'Cairo',sans-serif",fontWeight:700,fontSize:14,textDecoration:"none"}}>
              WhatsApp
            </a>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div style={{background:"#321d3d",padding:"clamp(24px,5vw,44px) 5%"}}>
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(150px,1fr))",gap:18}}>
          {[
            ["50+", lang==="ar"?"مؤسسة شريكة":"Partner Organizations"],
            ["5,000+", lang==="ar"?"موظف مدرَّب":"Trained Employees"],
            ["100%", lang==="ar"?"رضا العملاء":"Client Satisfaction"],
            ["3+", lang==="ar"?"سنوات خبرة مؤسسية":"Years of Corporate Training"],
          ].map(([v,l])=>(
            <div key={l} style={{textAlign:"center",background:"rgba(50,29,61,.6)",border:`1px solid ${C.border}`,borderRadius:16,padding:"22px 16px"}}>
              <div style={{fontSize:"clamp(1.6rem,3vw,2.4rem)",fontWeight:900,color:C.orange}}>{v}</div>
              <div style={{color:C.muted,fontSize:12,marginTop:6}}>{l}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Programs */}
      <div style={{background:"#2a1540",padding:"clamp(36px,7vw,70px) 5%"}}>
        <div style={{textAlign:"center",marginBottom:36}}>
          <div style={{color:C.orange,fontWeight:700,fontSize:11,letterSpacing:2,marginBottom:10}}>
            {lang==="ar" ? "برامجنا المؤسسية" : "CORPORATE PROGRAMS"}
          </div>
          <h2 style={{fontSize:"clamp(1.4rem,3vw,2.4rem)",fontWeight:900}}>
            {lang==="ar" ? "ما الذي نقدمه لمؤسستك؟" : "What We Offer Your Organization"}
          </h2>
        </div>
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(250px,1fr))",gap:18}}>
          {PROGRAMS.map(p=>{
            const uploadedImg = categoryIcons?.[p.abbr];
            return (
              <div key={p.ar} style={{background:"rgba(50,29,61,.6)",border:`1px solid ${C.border}`,borderRadius:16,padding:22,transition:"all .25s"}}
                onMouseEnter={e=>{e.currentTarget.style.borderColor=p.color+"66";e.currentTarget.style.transform="translateY(-3px)";}}
                onMouseLeave={e=>{e.currentTarget.style.borderColor="";e.currentTarget.style.transform="";}}>
                <div style={{width:60,height:60,borderRadius:14,background:`${p.color}18`,border:`1.5px solid ${p.color}44`,overflow:"hidden",marginBottom:14,display:"flex",alignItems:"center",justifyContent:"center"}}>
                  {uploadedImg
                    ? <img src={uploadedImg} alt={p.en} style={{width:"100%",height:"100%",objectFit:"cover"}}/>
                    : <span style={{fontSize:28}}>{p.icon}</span>
                  }
                </div>
                <div style={{fontWeight:800,fontSize:15,marginBottom:7}}>{lang==="ar"?p.ar:p.en}</div>
                <div style={{color:C.muted,fontSize:12,lineHeight:1.7}}>{lang==="ar"?p.desc_ar:p.desc_en}</div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Process */}
      <div style={{background:"#321d3d",padding:"clamp(36px,7vw,60px) 5%"}}>
        <div style={{textAlign:"center",marginBottom:36}}>
          <h2 style={{fontSize:"clamp(1.4rem,3vw,2.2rem)",fontWeight:900}}>
            {lang==="ar" ? "كيف نعمل معك؟" : "How We Work With You"}
          </h2>
        </div>
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(200px,1fr))",gap:18}}>
          {[
            {n:"01",ar:"استشارة مجانية",en:"Free Consultation",ar2:"نفهم احتياجات مؤسستك",en2:"We understand your needs"},
            {n:"02",ar:"تصميم مخصص",en:"Custom Design",ar2:"نصمم برنامج مخصص لكم",en2:"We design a tailored program"},
            {n:"03",ar:"تنفيذ احترافي",en:"Professional Delivery",ar2:"مدربون خبراء يتولون التنفيذ",en2:"Expert trainers execute it"},
            {n:"04",ar:"تقييم وشهادات",en:"Assessment & Certificates",ar2:"تقييم الموظفين وإصدار شهادات",en2:"Employee assessment & certificates"},
          ].map(s=>(
            <div key={s.n} style={{background:"rgba(50,29,61,.6)",border:`1px solid ${C.border}`,borderRadius:16,padding:22}}>
              <div style={{fontSize:"2.5rem",fontWeight:900,color:`${C.red}44`,marginBottom:10}}>{s.n}</div>
              <div style={{fontWeight:800,fontSize:14,marginBottom:7}}>{lang==="ar"?s.ar:s.en}</div>
              <div style={{color:C.muted,fontSize:12,lineHeight:1.7}}>{lang==="ar"?s.ar2:s.en2}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Request Form ── */}
      <div id="corp-form" style={{background:"#2a1540",padding:"clamp(36px,7vw,70px) 5%"}}>
        <div style={{maxWidth:700,margin:"0 auto"}}>
          <div style={{textAlign:"center",marginBottom:32}}>
            <h2 style={{fontSize:"clamp(1.4rem,3vw,2.2rem)",fontWeight:900,marginBottom:10}}>
              {lang==="ar" ? "اطلب استشارة مجانية" : "Request a Free Consultation"}
            </h2>
            <p style={{color:C.muted,fontSize:13}}>
              {lang==="ar" ? "سيتواصل معك فريقنا خلال 24 ساعة" : "Our team will contact you within 24 hours"}
            </p>
          </div>

          {done ? (
            <div style={{background:"rgba(16,185,129,.08)",border:"1px solid rgba(16,185,129,.25)",borderRadius:20,padding:40,textAlign:"center"}}>
              <div style={{width:60,height:60,borderRadius:"50%",background:"rgba(16,185,129,.15)",border:"2px solid rgba(16,185,129,.4)",display:"flex",alignItems:"center",justifyContent:"center",margin:"0 auto 16px",fontSize:22,fontWeight:900,color:"#10b981"}}>✓</div>
              <h3 style={{fontWeight:900,fontSize:20,marginBottom:10}}>{lang==="ar" ? "تم إرسال طلبك!" : "Request Sent!"}</h3>
              <p style={{color:C.muted,fontSize:13,marginBottom:24}}>
                {lang==="ar"
                  ? `شكراً ${form.contact}، سيتواصل معك فريقنا خلال 24 ساعة.`
                  : `Thank you ${form.contact}, our team will contact you within 24 hours.`}
              </p>
              <div style={{display:"flex",gap:12,justifyContent:"center",flexWrap:"wrap"}}>
                <Btn children={lang==="ar"?"طلب آخر":"New Request"} onClick={()=>{setForm(initForm);setDone(false);}}/>
                <Btn children={lang==="ar"?"الرئيسية":"Home"} v="outline" onClick={()=>navigate("/")}/>
              </div>
            </div>
          ) : (
            <div style={{background:"rgba(50,29,61,.5)",border:`1px solid ${C.border}`,borderRadius:20,padding:28}}>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:16,marginBottom:16}}>
                <FieldWrap label={lang==="ar"?"اسم الشركة *":"Company Name *"} error={errors.company}>
                  <input value={form.company} onChange={set("company")} style={inputSx(errors.company)} placeholder={lang==="ar"?"شركة ABC":"ABC Company"}/>
                </FieldWrap>
                <FieldWrap label={lang==="ar"?"اسم المسؤول *":"Contact Person *"} error={errors.contact}>
                  <input value={form.contact} onChange={set("contact")} style={inputSx(errors.contact)} placeholder={lang==="ar"?"اسمك الكامل":"Your full name"}/>
                </FieldWrap>
                <FieldWrap label={lang==="ar"?"رقم الهاتف *":"Phone *"} error={errors.phone}>
                  <input value={form.phone} onChange={set("phone")} type="tel" style={inputSx(errors.phone)} placeholder="+20 1XX XXX XXXX"/>
                </FieldWrap>
                <FieldWrap label={lang==="ar"?"البريد الإلكتروني":"Email"} error={errors.email}>
                  <input value={form.email} onChange={set("email")} type="email" style={inputSx(errors.email)} placeholder="email@company.com"/>
                </FieldWrap>
                <FieldWrap label={lang==="ar"?"المجال المطلوب":"Requested Program"}>
                  <input value={form.program} onChange={set("program")} style={inputSx(false)} placeholder={lang==="ar"?"مثال: تدريب HR":"e.g. HR Training"}/>
                </FieldWrap>
                <FieldWrap label={lang==="ar"?"عدد الموظفين":"No. of Employees"}>
                  <input value={form.employees} onChange={set("employees")} type="number" style={inputSx(false)} placeholder="20"/>
                </FieldWrap>
              </div>

              {/* Meeting Platform */}
              <div style={{marginBottom:18}}>
                <label style={{fontSize:12,color:C.muted,fontWeight:700,display:"block",marginBottom:10}}>
                  {lang==="ar" ? "منصة الاجتماع المفضلة" : "Preferred Meeting Platform"}
                </label>
                <div style={{display:"flex",gap:10,flexWrap:"wrap"}}>
                  {MEETING_PLATFORMS.map(mp=>(
                    <button key={mp.v} onClick={()=>setForm(p=>({...p,platform:mp.v}))}
                      style={{padding:"9px 16px",borderRadius:10,background:form.platform===mp.v?`${C.red}22`:"transparent",border:`1.5px solid ${form.platform===mp.v?C.red:C.border}`,color:form.platform===mp.v?C.red:"#fff",fontFamily:"'Cairo',sans-serif",fontWeight:600,fontSize:12,cursor:"pointer",transition:"all .2s",display:"flex",alignItems:"center",gap:6}}>
                      {mp.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Date & Time */}
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:16,marginBottom:18}}>
                <FieldWrap label={lang==="ar"?"التاريخ المناسب":"Preferred Date"}>
                  <input value={form.date} onChange={set("date")} type="date" style={inputSx(false)}/>
                </FieldWrap>
                <FieldWrap label={lang==="ar"?"الوقت المناسب":"Preferred Time"}>
                  <input value={form.time} onChange={set("time")} type="time" style={inputSx(false)}/>
                </FieldWrap>
              </div>

              {/* Notes */}
              <div style={{marginBottom:24}}>
                <label style={{fontSize:12,color:C.muted,fontWeight:700,display:"block",marginBottom:6}}>
                  {lang==="ar"?"ملاحظات إضافية":"Additional Notes"}
                </label>
                <textarea value={form.notes} onChange={set("notes")} rows={3}
                  placeholder={lang==="ar"?"اكتب تفاصيل احتياجاتك هنا...":"Describe your training needs here..."}
                  style={{width:"100%",boxSizing:"border-box",background:"rgba(50,29,61,.6)",border:`1.5px solid ${C.border}`,borderRadius:10,padding:"11px 14px",color:"#fff",fontFamily:"'Cairo',sans-serif",fontSize:13,resize:"vertical",outline:"none"}}/>
              </div>

              <Btn
                children={loading ? (lang==="ar"?"جاري الإرسال...":"Sending...") : (lang==="ar"?"إرسال الطلب":"Send Request")}
                onClick={submit}
                style={{width:"100%",padding:"13px",fontSize:15,opacity:loading?0.7:1}}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
