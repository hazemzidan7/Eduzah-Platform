import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { C, gHero } from "../../theme";
import { Btn, Card } from "../../components/UI";
import { useLang } from "../../context/LangContext";
import { submitToSheet } from "../../utils/sheets";
import { SITE } from "../../data";

const SPECIALTIES = [
  { v:"frontend",   ar:"Front-End Developer",    en:"Front-End Developer" },
  { v:"backend",    ar:"Back-End Developer",      en:"Back-End Developer" },
  { v:"flutter",    ar:"Flutter Developer",        en:"Flutter Developer" },
  { v:"uiux",       ar:"UI/UX Designer",           en:"UI/UX Designer" },
  { v:"ai",         ar:"AI / Data Scientist",      en:"AI / Data Scientist" },
  { v:"hr",         ar:"HR Specialist",            en:"HR Specialist" },
  { v:"instructor", ar:"مدرب / Trainer",           en:"Trainer" },
  { v:"other",      ar:"تخصص آخر",                en:"Other" },
];

const MEETING_PLATFORMS = [
  { v:"zoom",  label:"Zoom" },
  { v:"meet",  label:"Google Meet" },
  { v:"teams", label:"Microsoft Teams" },
  { v:"phone", label:"هاتف / Phone" },
];

const init = { company:"", contact:"", phone:"", email:"", specialty:"frontend", count:"1", platform:"meet", date:"", notes:"" };

export default function HiringPage() {
  const navigate = useNavigate();
  const { lang } = useLang();
  const dir = lang === "ar" ? "rtl" : "ltr";

  const [form,    setForm]    = useState(init);
  const [errors,  setErrors]  = useState({});
  const [loading, setLoading] = useState(false);
  const [done,    setDone]    = useState(false);

  const set = k => e => {
    const val = e.target.value;
    setForm(p => ({ ...p, [k]: val }));
  };

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
    await submitToSheet("hiring", {
      company: form.company, contact: form.contact,
      phone: form.phone, email: form.email,
      specialty: form.specialty, count: form.count,
      platform: form.platform, date: form.date, notes: form.notes,
    });
    setLoading(false);
    setDone(true);
  };

  const inputSx = (hasError) => ({
    width:"100%", boxSizing:"border-box",
    background:"rgba(50,29,61,.6)",
    border:`1.5px solid ${hasError ? C.danger : C.border}`,
    borderRadius:10, padding:"10px 14px",
    color:"#fff", fontFamily:"'Cairo',sans-serif", fontSize:13, outline:"none",
  });

  const FieldWrap = ({ label, error, children }) => (
    <div>
      <label style={{fontSize:12,color:C.muted,fontWeight:700,display:"block",marginBottom:6}}>{label}</label>
      {children}
      {error && <div style={{color:C.danger,fontSize:11,marginTop:3}}>{error}</div>}
    </div>
  );

  return (
    <div dir={dir}>
      {/* Hero */}
      <div style={{background:gHero,padding:"clamp(40px,8vw,80px) 5%",position:"relative",overflow:"hidden"}}>
        <div style={{position:"absolute",top:"-20%",left:"-10%",width:500,height:500,background:`radial-gradient(circle,rgba(217,27,91,.2),transparent 70%)`,borderRadius:"50%",pointerEvents:"none"}}/>
        <div style={{position:"relative",zIndex:2,maxWidth:700}}>
          <div style={{display:"inline-flex",alignItems:"center",gap:8,background:`${C.orange}22`,border:`1px solid ${C.orange}44`,color:C.orange,borderRadius:50,padding:"5px 16px",fontSize:12,fontWeight:700,marginBottom:20}}>
            {lang==="ar" ? "خدمة توظيف خريجي Eduzah" : "Hire Eduzah Graduates"}
          </div>
          <h1 style={{fontSize:"clamp(1.8rem,4vw,3rem)",fontWeight:900,lineHeight:1.25,marginBottom:18}}>
            {lang==="ar"
              ? <>وظّف <span style={{color:C.orange}}>خريجي Eduzah</span><br/>المؤهلين لشركتك</>
              : <>Hire <span style={{color:C.orange}}>Qualified Eduzah</span><br/>Graduates for Your Team</>}
          </h1>
          <p style={{color:C.muted,fontSize:15,lineHeight:1.85,marginBottom:30,maxWidth:560}}>
            {lang==="ar"
              ? "نوفّر للشركات كوادر بشرية مدرّبة تدريباً احترافياً في التكنولوجيا والإدارة. خريجونا جاهزون لسوق العمل بمهارات عملية ومشاريع حقيقية."
              : "We provide companies with professionally trained talent in Technology and Management. Our graduates are job-ready with real-world skills and projects."}
          </p>
          <div style={{display:"flex",gap:12,flexWrap:"wrap"}}>
            <Btn children={lang==="ar"?"اطلب موظفين الآن":"Request Employees Now"}
              onClick={()=>document.getElementById("hire-form").scrollIntoView({behavior:"smooth"})}
              style={{padding:"13px 28px",boxShadow:`0 8px 25px rgba(217,27,91,.44)`}}/>
            <a href={`https://wa.me/${SITE.phone.replace(/[^0-9]/g,"")}`} target="_blank" rel="noreferrer"
              style={{display:"inline-flex",alignItems:"center",gap:8,padding:"13px 22px",border:"1.5px solid #25d366",borderRadius:10,color:"#25d366",fontFamily:"'Cairo',sans-serif",fontWeight:700,fontSize:14,textDecoration:"none"}}>
              WhatsApp
            </a>
          </div>
        </div>
      </div>

      {/* Why section */}
      <div style={{background:"#321d3d",padding:"clamp(36px,7vw,70px) 5%"}}>
        <div style={{textAlign:"center",marginBottom:36}}>
          <h2 style={{fontSize:"clamp(1.4rem,3vw,2.4rem)",fontWeight:900,marginBottom:8}}>
            {lang==="ar" ? "لماذا خريجو Eduzah؟" : "Why Eduzah Graduates?"}
          </h2>
        </div>
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(240px,1fr))",gap:18}}>
          {[
            {ar:"تدريب عملي متخصص",en:"Specialized Practical Training",ar2:"تدريب على مشاريع حقيقية بإشراف خبراء",en2:"Trained on real projects supervised by experts"},
            {ar:"Portfolio قوي",en:"Strong Portfolio",ar2:"كل خريج معه مشاريع جاهزة للعرض",en2:"Every graduate has ready-to-show projects"},
            {ar:"شهادات معتمدة",en:"Certified Credentials",ar2:"شهادات Eduzah المعتمدة",en2:"Recognized Eduzah certified credentials"},
            {ar:"متحمسون ومستعدون",en:"Motivated & Prepared",ar2:"خريجون متحمسون لبدء مسيرتهم",en2:"Graduates eager to start their careers"},
          ].map(f=>(
            <Card key={f.ar} style={{padding:22}}>
              <div style={{fontWeight:800,fontSize:14,marginBottom:8}}>{lang==="ar"?f.ar:f.en}</div>
              <div style={{color:C.muted,fontSize:12,lineHeight:1.7}}>{lang==="ar"?f.ar2:f.en2}</div>
            </Card>
          ))}
        </div>
      </div>

      {/* Specialties */}
      <div style={{background:"#2a1540",padding:"clamp(28px,5vw,50px) 5%",textAlign:"center"}}>
        <h3 style={{fontWeight:900,fontSize:16,marginBottom:20}}>
          {lang==="ar" ? "التخصصات المتاحة" : "Available Specialties"}
        </h3>
        <div style={{display:"flex",gap:10,flexWrap:"wrap",justifyContent:"center"}}>
          {SPECIALTIES.filter(s=>s.v!=="other").map(s=>(
            <div key={s.v} style={{background:"rgba(50,29,61,.7)",border:`1.5px solid ${C.border}`,borderRadius:12,padding:"10px 18px",fontWeight:700,fontSize:12}}>
              {lang==="ar"?s.ar:s.en}
            </div>
          ))}
        </div>
      </div>

      {/* ── Request Form ── */}
      <div id="hire-form" style={{background:"#321d3d",padding:"clamp(36px,7vw,70px) 5%"}}>
        <div style={{maxWidth:700,margin:"0 auto"}}>
          <div style={{textAlign:"center",marginBottom:32}}>
            <h2 style={{fontSize:"clamp(1.4rem,3vw,2.2rem)",fontWeight:900,marginBottom:10}}>
              {lang==="ar" ? "اطلب موظفين من Eduzah" : "Request Eduzah Graduates"}
            </h2>
            <p style={{color:C.muted,fontSize:13}}>
              {lang==="ar" ? "سيتواصل معك فريقنا خلال 24 ساعة" : "Our team will contact you within 24 hours"}
            </p>
          </div>

          {done ? (
            <div style={{background:"rgba(16,185,129,.08)",border:"1px solid rgba(16,185,129,.25)",borderRadius:20,padding:40,textAlign:"center"}}>
              <div style={{width:60,height:60,borderRadius:"50%",background:"rgba(16,185,129,.15)",border:"2px solid rgba(16,185,129,.4)",display:"flex",alignItems:"center",justifyContent:"center",margin:"0 auto 16px",fontSize:22,fontWeight:900,color:"#10b981"}}>✓</div>
              <h3 style={{fontWeight:900,fontSize:20,marginBottom:10}}>{lang==="ar"?"تم إرسال طلبك!":"Request Sent!"}</h3>
              <p style={{color:C.muted,fontSize:13,marginBottom:22}}>
                {lang==="ar"
                  ? `شكراً ${form.contact}، سنتواصل معك قريباً لتزويدك بالكوادر المناسبة.`
                  : `Thank you ${form.contact}, we'll contact you soon to match you with the right talent.`}
              </p>
              <div style={{display:"flex",gap:12,justifyContent:"center"}}>
                <Btn children={lang==="ar"?"طلب آخر":"New Request"} onClick={()=>{setForm(init);setDone(false);}}/>
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
                  <input value={form.email} onChange={set("email")} type="email" style={inputSx(errors.email)} placeholder="hr@company.com"/>
                </FieldWrap>
              </div>

              {/* Specialty */}
              <div style={{marginBottom:16}}>
                <label style={{fontSize:12,color:C.muted,fontWeight:700,display:"block",marginBottom:10}}>
                  {lang==="ar"?"التخصص المطلوب *":"Required Specialty *"}
                </label>
                <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
                  {SPECIALTIES.map(s=>(
                    <button key={s.v} onClick={()=>setForm(p=>({...p,specialty:s.v}))}
                      style={{padding:"7px 14px",borderRadius:10,background:form.specialty===s.v?`${C.red}22`:"transparent",border:`1.5px solid ${form.specialty===s.v?C.red:C.border}`,color:form.specialty===s.v?C.red:"#fff",fontFamily:"'Cairo',sans-serif",fontWeight:600,fontSize:11,cursor:"pointer",transition:"all .2s"}}>
                      {lang==="ar"?s.ar:s.en}
                    </button>
                  ))}
                </div>
              </div>

              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:16,marginBottom:16}}>
                <FieldWrap label={lang==="ar"?"عدد الموظفين المطلوبين":"No. of Employees Needed"}>
                  <input value={form.count} onChange={set("count")} type="number" min="1" style={inputSx(false)} placeholder="1"/>
                </FieldWrap>
                <FieldWrap label={lang==="ar"?"التاريخ المناسب":"Preferred Date"}>
                  <input value={form.date} onChange={set("date")} type="date" style={inputSx(false)}/>
                </FieldWrap>
              </div>

              {/* Meeting Platform */}
              <div style={{marginBottom:18}}>
                <label style={{fontSize:12,color:C.muted,fontWeight:700,display:"block",marginBottom:10}}>
                  {lang==="ar"?"منصة الاجتماع المفضلة":"Preferred Meeting Platform"}
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

              <div style={{marginBottom:22}}>
                <label style={{fontSize:12,color:C.muted,fontWeight:700,display:"block",marginBottom:6}}>
                  {lang==="ar"?"ملاحظات إضافية":"Additional Notes"}
                </label>
                <textarea value={form.notes} onChange={set("notes")} rows={3}
                  placeholder={lang==="ar"?"اكتب متطلبات إضافية...":"Write additional requirements..."}
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
