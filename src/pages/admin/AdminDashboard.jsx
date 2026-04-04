import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { C } from "../../theme";
import { Btn, Card, Badge, Modal, Input, Select } from "../../components/UI";
import AddSessionModal from "../../components/AddSessionModal";
import { useAuth } from "../../context/AuthContext";
import { useData } from "../../context/DataContext";
import { useLang } from "../../context/LangContext";

/* ─── small helpers ─── */
function formatNewsDateAdmin(n, lang) {
  if (n.dateIso) {
    const d = new Date(`${n.dateIso}T12:00:00`);
    return d.toLocaleDateString(lang === "ar" ? "ar-EG" : "en-US", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  }
  return n.date || "";
}

function newsTagAdmin(n, lang) {
  if (lang === "en" && n.tag_en) return n.tag_en;
  return n.tag;
}

const Row = ({ label, children }) => (
  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 14px", background: "rgba(255,255,255,.04)", borderRadius: 10, marginBottom: 8 }}>
    <span style={{ fontSize: 13, fontWeight: 600 }}>{label}</span>
    <div style={{ display: "flex", gap: 6 }}>{children}</div>
  </div>
);

export default function AdminDashboard() {
  const { users, approveUser, rejectUser, enrollUser, removeEnroll, assignInstructor, adminUpdateUser } = useAuth();
  const {
    courses, news, exams, trainers, programs, testimonials, team,
    vodafoneCash, setVodafoneCash,
    addCourse, updateCourse, toggleFeatured, deleteCourse,
    addNews, deleteNews,
    addExam, deleteExam,
    addTrainer, deleteTrainer,
    addProgram, updateProgram, deleteProgram,
    addTestimonial, deleteTestimonial,
    addTeamMember, updateTeamMember, deleteTeamMember,
  } = useData();
  const navigate = useNavigate();
  const { lang } = useLang();
  const ar = lang === "ar";
  const dir = ar ? "rtl" : "ltr";
  const tx = (a, e) => (ar ? a : e);

  const [tab,   setTab]   = useState("overview");
  const [modal, setModal] = useState(null);
  const [toast, setToast] = useState(null);

  const showT = (msg, type = "success") => { setToast({ msg, type }); setTimeout(() => setToast(null), 2800); };

  const pending     = users.filter(u => u.status === "pending");
  const students    = users.filter(u => u.role === "student");
  const instructors = users.filter(u => u.role === "instructor");

  const tabs = ar
    ? [
        ["overview", "نظرة عامة"],
        ["users", "المستخدمون"],
        ["requests", "الطلبات"],
        ["courses", "الكورسات"],
        ["news", "الأخبار"],
        ["exams", "الامتحانات"],
        ["trainers", "المدربون"],
        ["programs", "البرامج"],
        ["testimonials", "الآراء"],
        ["team", "الفريق"],
        ["settings", "الإعدادات"],
      ]
    : [
        ["overview", "Overview"],
        ["users", "Users"],
        ["requests", "Requests"],
        ["courses", "Courses"],
        ["news", "News"],
        ["exams", "Exams"],
        ["trainers", "Trainers"],
        ["programs", "Programs"],
        ["testimonials", "Testimonials"],
        ["team", "Team"],
        ["settings", "Settings"],
      ];

  /* ─────────── Add Course Form ─────────── */
  const AddCourseModal = () => {
    const [f, setF] = useState({
      title:"", title_en:"", cat:"tech", price:"", hours:"", projects:"", duration:"12 أسبوع",
      tagline:"", tagline_en:"", desc:"", desc_en:"", bullets:"", bullets_en:"", outcomes:"", outcomes_en:"", image:null,
    });
    const set = (k, v) => setF(p => ({ ...p, [k]: v }));
    const pickImg = e => { if (e.target.files[0]) readFile(e.target.files[0], d => set("image", d)); };
    const submit = () => {
      if (!f.title || !f.price) { showT("أدخل العنوان والسعر على الأقل", "error"); return; }
      addCourse(f);
      showT("تم إضافة الكورس بنجاح!");
      setModal(null);
    };
    return (
      <Modal title="إضافة كورس جديد" onClose={() => setModal(null)}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          <div style={{ gridColumn: "1/-1" }}>
            <Input label="عنوان الكورس (عربي/أساسي) *" value={f.title} onChange={v => set("title", v)} placeholder="دبلومة Front-End" />
          </div>
          <div style={{ gridColumn: "1/-1" }}>
            <Input label="Course title (English)" value={f.title_en} onChange={v => set("title_en", v)} placeholder="Front-End Web Development" />
          </div>
          <Input label="السعر (EGP) *" value={f.price} onChange={v => set("price", v)} placeholder="8500" />
          <Input label="المدة" value={f.duration} onChange={v => set("duration", v)} placeholder="16 أسبوع" />
          <Input label="الساعات" value={f.hours} onChange={v => set("hours", v)} placeholder="120" />
          <Input label="المشاريع" value={f.projects} onChange={v => set("projects", v)} placeholder="6" />
          <Select label="الفئة" value={f.cat} onChange={v => set("cat", v)}
            options={[{v:"tech",l:"Tech"},{v:"hr",l:"HR"},{v:"leadership",l:"Leadership"},{v:"soft",l:"Soft Skills"}]} />
          <div style={{ gridColumn: "1/-1" }}>
            {/* Course image upload */}
            <div style={{ marginBottom: 12 }}>
              <label style={{ fontSize: 12, color: "#aaa", fontWeight: 700, display: "block", marginBottom: 6 }}>صورة الكورس</label>
              <label style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer", background: "rgba(255,255,255,.05)", border: `1.5px dashed ${C.border}`, borderRadius: 10, padding: "10px 14px" }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={C.muted} strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
                <span style={{ fontSize: 12, color: "#aaa" }}>{f.image ? "تم رفع الصورة" : "اضغط لرفع صورة للكورس"}</span>
                <input type="file" accept="image/*" onChange={pickImg} style={{ display: "none" }} />
              </label>
              {f.image && (
                <div style={{ marginTop: 8, display: "flex", gap: 10, alignItems: "center" }}>
                  <img src={f.image} alt="" style={{ width: 90, height: 55, objectFit: "cover", borderRadius: 8 }} />
                  <Btn children="إزالة" sm v="danger" onClick={() => set("image", null)} />
                </div>
              )}
            </div>
            <Input label="Tagline (عربي)" value={f.tagline} onChange={v => set("tagline", v)} placeholder="دبلومة احترافية مدمجة بالـ AI" />
            <Input label="Tagline (English)" value={f.tagline_en} onChange={v => set("tagline_en", v)} placeholder="Professional diploma with AI" />
            <Input label="وصف الكورس (عربي)" value={f.desc} onChange={v => set("desc", v)} placeholder="وصف مختصر للكورس..." rows={2} />
            <Input label="Course description (English)" value={f.desc_en} onChange={v => set("desc_en", v)} placeholder="Short description..." rows={2} />
            <Input label="النقاط الرئيسية — عربي (سطر لكل نقطة)" value={f.bullets} onChange={v => set("bullets", v)} placeholder={"نقطة 1\nنقطة 2"} rows={3} />
            <Input label="Key points — English (one per line)" value={f.bullets_en} onChange={v => set("bullets_en", v)} placeholder={"Point 1\nPoint 2"} rows={3} />
            <Input label="المهارات — عربي (سطر لكل مهارة)" value={f.outcomes} onChange={v => set("outcomes", v)} placeholder={"مهارة 1\nمهارة 2"} rows={2} />
            <Input label="Outcomes — English (one per line)" value={f.outcomes_en} onChange={v => set("outcomes_en", v)} placeholder={"Skill 1\nSkill 2"} rows={2} />
          </div>
        </div>
        <Btn children="✅ إضافة الكورس" full onClick={submit} style={{ marginTop: 8 }} />
      </Modal>
    );
  };

  const EditCourseModal = ({ course: c }) => {
    const [f, setF] = useState({
      title: c.title || "",
      title_en: c.title_en || "",
      cat: c.cat || "tech",
      price: String(c.price ?? ""),
      hours: String(c.hours ?? ""),
      projects: String(c.projects ?? ""),
      duration: c.duration || "",
      tagline: c.tagline || "",
      tagline_en: c.tagline_en || "",
      desc: c.desc || "",
      desc_en: c.desc_en || "",
      bullets: (c.bullets || []).join("\n"),
      bullets_en: (c.bullets_en || []).join("\n"),
      outcomes: (c.outcomes || []).join("\n"),
      outcomes_en: (c.outcomes_en || []).join("\n"),
      image: c.image || null,
    });
    const set = (k, v) => setF(p => ({ ...p, [k]: v }));
    const pickImg = e => { if (e.target.files[0]) readFile(e.target.files[0], d => set("image", d)); };
    const submit = () => {
      if (!f.title || !f.price) { showT("أدخل العنوان والسعر على الأقل", "error"); return; }
      updateCourse(c.id, {
        title: f.title,
        title_en: f.title_en || f.title,
        cat: f.cat,
        price: Number(f.price) || 0,
        installment: Math.round((Number(f.price) || 0) / 3),
        hours: Number(f.hours) || 0,
        projects: Number(f.projects) || 0,
        duration: f.duration,
        tagline: f.tagline,
        tagline_en: f.tagline_en || f.tagline,
        desc: f.desc,
        desc_en: f.desc_en || f.desc,
        bullets: f.bullets.split("\n").map(s => s.trim()).filter(Boolean),
        bullets_en: f.bullets_en.split("\n").map(s => s.trim()).filter(Boolean),
        outcomes: f.outcomes.split("\n").map(s => s.trim()).filter(Boolean),
        outcomes_en: f.outcomes_en.split("\n").map(s => s.trim()).filter(Boolean),
        image: f.image,
      });
      showT(tx("تم تحديث الكورس", "Course updated"));
      setModal(null);
    };
    return (
      <Modal title={tx("✏️ تعديل الكورس", "✏️ Edit course")} onClose={() => setModal(null)}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          <div style={{ gridColumn: "1/-1" }}>
            <Input label="عنوان الكورس *" value={f.title} onChange={v => set("title", v)} />
          </div>
          <div style={{ gridColumn: "1/-1" }}>
            <Input label="Course title (EN)" value={f.title_en} onChange={v => set("title_en", v)} />
          </div>
          <Input label="السعر *" value={f.price} onChange={v => set("price", v)} />
          <Input label="المدة" value={f.duration} onChange={v => set("duration", v)} />
          <Input label="الساعات" value={f.hours} onChange={v => set("hours", v)} />
          <Input label="المشاريع" value={f.projects} onChange={v => set("projects", v)} />
          <Select label="الفئة" value={f.cat} onChange={v => set("cat", v)}
            options={[{v:"tech",l:"Tech"},{v:"hr",l:"HR"},{v:"leadership",l:"Leadership"},{v:"soft",l:"Soft Skills"}]} />
          <div style={{ gridColumn: "1/-1" }}>
            <div style={{ marginBottom: 12 }}>
              <label style={{ fontSize: 12, color: "#aaa", fontWeight: 700, display: "block", marginBottom: 6 }}>صورة الكورس</label>
              <label style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer", background: "rgba(255,255,255,.05)", border: `1.5px dashed ${C.border}`, borderRadius: 10, padding: "10px 14px" }}>
                <span style={{ fontSize: 12, color: "#aaa" }}>{f.image ? "تم رفع الصورة" : "رفع صورة"}</span>
                <input type="file" accept="image/*" onChange={pickImg} style={{ display: "none" }} />
              </label>
              {f.image && (
                <div style={{ marginTop: 8, display: "flex", gap: 10, alignItems: "center" }}>
                  <img src={f.image} alt="" style={{ width: 90, height: 55, objectFit: "cover", borderRadius: 8 }} />
                  <Btn children="إزالة" sm v="danger" onClick={() => set("image", null)} />
                </div>
              )}
            </div>
            <Input label="Tagline AR" value={f.tagline} onChange={v => set("tagline", v)} />
            <Input label="Tagline EN" value={f.tagline_en} onChange={v => set("tagline_en", v)} />
            <Input label="وصف AR" value={f.desc} onChange={v => set("desc", v)} rows={2} />
            <Input label="Description EN" value={f.desc_en} onChange={v => set("desc_en", v)} rows={2} />
            <Input label="Bullets AR" value={f.bullets} onChange={v => set("bullets", v)} rows={3} />
            <Input label="Bullets EN" value={f.bullets_en} onChange={v => set("bullets_en", v)} rows={3} />
            <Input label="Outcomes AR" value={f.outcomes} onChange={v => set("outcomes", v)} rows={2} />
            <Input label="Outcomes EN" value={f.outcomes_en} onChange={v => set("outcomes_en", v)} rows={2} />
          </div>
        </div>
        <Btn children={tx("✅ حفظ التعديلات", "✅ Save changes")} full onClick={submit} style={{ marginTop: 8 }} />
      </Modal>
    );
  };

  /* ─────────── Add News Modal ─────────── */
  const AddNewsModal = () => {
    const [f, setF] = useState({ title:"", tag:"إعلان", excerpt:"", featured:false, image:null });
    const set = (k, v) => setF(p => ({ ...p, [k]: v }));
    const pickImg = e => { if (e.target.files[0]) readFile(e.target.files[0], d => set("image", d)); };
    const submit = () => {
      if (!f.title || !f.excerpt) { showT("أدخل العنوان والمحتوى", "error"); return; }
      addNews(f);
      showT("تم نشر الخبر بنجاح!");
      setModal(null);
    };
    return (
      <Modal title="إضافة خبر جديد" onClose={() => setModal(null)}>
        <Input label="عنوان الخبر *" value={f.title} onChange={v => set("title", v)} placeholder="Eduzah تطلق كورسات جديدة..." />
        <Select label="التصنيف" value={f.tag} onChange={v => set("tag", v)}
          options={[{v:"إعلان",l:"إعلان"},{v:"إنجاز",l:"إنجاز"},{v:"شراكة",l:"شراكة"},{v:"تحديث",l:"تحديث"},{v:"حدث",l:"حدث"}]} />
        {/* News image upload */}
        <div style={{ marginBottom: 12 }}>
          <label style={{ fontSize: 12, color: "#aaa", fontWeight: 700, display: "block", marginBottom: 6 }}>صورة الخبر</label>
          <label style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer", background: "rgba(255,255,255,.05)", border: `1.5px dashed ${C.border}`, borderRadius: 10, padding: "10px 14px" }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={C.muted} strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
            <span style={{ fontSize: 12, color: "#aaa" }}>{f.image ? "تم رفع الصورة" : "اضغط لرفع صورة للخبر (اختياري)"}</span>
            <input type="file" accept="image/*" onChange={pickImg} style={{ display: "none" }} />
          </label>
          {f.image && (
            <div style={{ marginTop: 8, display: "flex", gap: 10, alignItems: "center" }}>
              <img src={f.image} alt="" style={{ width: 90, height: 55, objectFit: "cover", borderRadius: 8 }} />
              <Btn children="إزالة" sm v="danger" onClick={() => set("image", null)} />
            </div>
          )}
        </div>
        <Input label="محتوى الخبر *" value={f.excerpt} onChange={v => set("excerpt", v)} placeholder="اكتب تفاصيل الخبر هنا..." rows={3} />
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14, padding: "10px 12px", background: "rgba(255,255,255,.05)", borderRadius: 9, cursor: "pointer" }}
          onClick={() => set("featured", !f.featured)}>
          <div style={{ width: 20, height: 20, borderRadius: 5, background: f.featured ? C.orange : "transparent", border: `2px solid ${f.featured ? C.orange : C.border}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, transition: "all .2s" }}>
            {f.featured ? "✓" : ""}
          </div>
          <span style={{ fontSize: 13, color: C.muted }}>تمييز كخبر رئيسي (Featured)</span>
        </div>
        <Btn children="نشر الخبر" full onClick={submit} />
      </Modal>
    );
  };

  /* ─────────── Add Trainer Modal ─────────── */
  const AddTrainerModal = () => {
    const [f, setF] = useState({ name:"", name_en:"", username:"", password:"", specialty_ar:"", specialty_en:"", bio_ar:"", bio_en:"" });
    const set = (k, v) => setF(p => ({ ...p, [k]: v }));
    const submit = () => {
      if (!f.name || !f.username || !f.password) { showT("❗ أدخل الاسم واسم المستخدم وكلمة المرور", "error"); return; }
      addTrainer(f);
      showT("✅ تم إضافة المدرب بنجاح!");
      setModal(null);
    };
    return (
      <Modal title="➕ إضافة مدرب جديد" onClose={() => setModal(null)}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          <Input label="الاسم (عربي) *" value={f.name} onChange={v => set("name", v)} placeholder="م. أحمد محمد" />
          <Input label="Name (English)" value={f.name_en} onChange={v => set("name_en", v)} placeholder="Eng. Ahmed Mohamed" />
          <Input label="اسم المستخدم (Email) *" value={f.username} onChange={v => set("username", v)} placeholder="trainer@eduzah.com" />
          <Input label="كلمة المرور *" value={f.password} onChange={v => set("password", v)} placeholder="password123" type="password" />
          <Select label="التخصص" value={f.specialty_ar} onChange={v => set("specialty_ar", v)}
            options={[
              ...([...new Set(courses.map(c => c.cat))].map(cat => ({ v: cat, l: cat }))),
              {v:"tech",l:"Tech"},{v:"hr",l:"HR"},{v:"leadership",l:"Leadership"},{v:"soft",l:"Soft Skills"},{v:"english",l:"English"},{v:"kids",l:"Kids"},
            ].filter((o, i, arr) => arr.findIndex(x => x.v === o.v) === i)} />
          <Input label="Specialty (English)" value={f.specialty_en} onChange={v => set("specialty_en", v)} placeholder="Web Development" />
          <div style={{ gridColumn: "1/-1" }}>
            <Input label="نبذة (عربي)" value={f.bio_ar} onChange={v => set("bio_ar", v)} placeholder="نبذة مختصرة عن المدرب..." rows={2} />
            <Input label="Bio (English)" value={f.bio_en} onChange={v => set("bio_en", v)} placeholder="Short bio about the trainer..." rows={2} />
          </div>
        </div>
        <Btn children="✅ إضافة المدرب" full onClick={submit} style={{ marginTop: 8 }} />
      </Modal>
    );
  };

  /* ─────────── readFile helper ─────────── */
  const readFile = (file, cb) => {
    const r = new FileReader();
    r.onloadend = () => cb(r.result);
    r.readAsDataURL(file);
  };

  const EditUserModal = ({ user }) => {
    const [f, setF] = useState({ name: user.name, email: user.email, phone: user.phone || "" });
    const set = (k, v) => setF(p => ({ ...p, [k]: v }));
    const submit = () => {
      if (!f.name.trim() || !f.email.includes("@")) {
        showT(tx("❗ بيانات غير صالحة", "❗ Invalid data"), "error");
        return;
      }
      const dup = users.filter(x => x.id !== user.id).some(x => x.email.toLowerCase() === f.email.trim().toLowerCase());
      if (dup) {
        showT(tx("البريد مستخدم من قبل مستخدم آخر", "Email already used by another user"), "error");
        return;
      }
      adminUpdateUser(user.id, { name: f.name.trim(), email: f.email.trim(), phone: f.phone.trim() });
      showT(tx("تم تحديث المستخدم", "User updated"));
      setModal(null);
    };
    return (
      <Modal title={tx("تعديل مستخدم", "Edit user")} onClose={() => setModal(null)}>
        <Input label={tx("الاسم", "Name")} value={f.name} onChange={v => set("name", v)} />
        <Input label="Email" value={f.email} onChange={v => set("email", v)} />
        <Input label={tx("الهاتف", "Phone")} value={f.phone} onChange={v => set("phone", v)} />
        <Btn children={tx("حفظ", "Save")} full onClick={submit} style={{ marginTop: 10 }} />
      </Modal>
    );
  };

  /* ─────────── Add Program Modal ─────────── */
  const AddProgramModal = ({ editing = null }) => {
    const [f, setF] = useState(editing ? {
      title_ar: editing.title_ar, title_en: editing.title_en,
      desc_ar: editing.desc_ar || "", desc_en: editing.desc_en || "",
      image: editing.image || null,
    } : { title_ar:"", title_en:"", desc_ar:"", desc_en:"", image:null });
    const set = (k,v) => setF(p => ({ ...p, [k]:v }));

    const pickImage = e => {
      const file = e.target.files[0];
      if (file) readFile(file, data => set("image", data));
    };

    const submit = () => {
      if (!f.title_ar.trim() && !f.title_en.trim()) { showT("❗ أدخل عنوان البرنامج", "error"); return; }
      if (editing) {
        updateProgram(editing.id, f);
        showT("✅ تم تحديث البرنامج!");
      } else {
        addProgram(f);
        showT("✅ تم إضافة البرنامج!");
      }
      setModal(null);
    };

    return (
      <Modal title={editing ? "✏️ تعديل البرنامج" : "➕ إضافة برنامج جديد"} onClose={() => setModal(null)}>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
          <Input label="العنوان (عربي) *" value={f.title_ar} onChange={v=>set("title_ar",v)} placeholder="تطوير الويب الاحترافي" />
          <Input label="Title (English) *" value={f.title_en} onChange={v=>set("title_en",v)} placeholder="Professional Web Dev" />
          <div style={{ gridColumn:"1/-1" }}>
            <Input label="الوصف (عربي)" value={f.desc_ar} onChange={v=>set("desc_ar",v)} placeholder="وصف البرنامج بالعربي..." rows={2} />
          </div>
          <div style={{ gridColumn:"1/-1" }}>
            <Input label="Description (English)" value={f.desc_en} onChange={v=>set("desc_en",v)} placeholder="Program description in English..." rows={2} />
          </div>
        </div>

        {/* Image upload */}
        <div style={{ marginTop:10 }}>
          <label style={{ fontSize:12, color:"#aaa", fontWeight:700, display:"block", marginBottom:6 }}>صورة البرنامج</label>
          <label style={{ display:"flex", alignItems:"center", gap:10, cursor:"pointer", background:"rgba(255,255,255,.05)", border:`1.5px dashed ${C.border}`, borderRadius:10, padding:"10px 14px" }}>
            <span style={{ fontSize:20 }}>🖼</span>
            <span style={{ fontSize:12, color:"#aaa" }}>{f.image ? "✅ تم رفع الصورة" : "اضغط لرفع صورة (JPG/PNG)"}</span>
            <input type="file" accept="image/*" onChange={pickImage} style={{ display:"none" }} />
          </label>
          {f.image && (
            <div style={{ marginTop:8, display:"flex", alignItems:"center", gap:10 }}>
              <img src={f.image} alt="" style={{ width:80, height:50, objectFit:"cover", borderRadius:8 }} />
              <Btn children="🗑 إزالة" sm v="danger" onClick={()=>set("image",null)} />
            </div>
          )}
        </div>

        <Btn children={editing ? "✅ حفظ التعديلات" : "✅ إضافة البرنامج"} full onClick={submit} style={{ marginTop:14 }} />
      </Modal>
    );
  };

  /* ─────────── Add Testimonial Modal ─────────── */
  const AddTestimonialModal = () => {
    const [f, setF] = useState({ name:"", comment_ar:"", comment_en:"", course:"", rating:5, image:null });
    const set = (k,v) => setF(p => ({ ...p, [k]:v }));

    const pickImage = e => {
      const file = e.target.files[0];
      if (file) readFile(file, data => set("image", data));
    };

    const submit = () => {
      if (!f.name.trim() || !f.comment_ar.trim()) { showT("❗ أدخل الاسم والتعليق", "error"); return; }
      addTestimonial(f);
      showT("✅ تم إضافة الرأي!");
      setModal(null);
    };

    return (
      <Modal title="➕ إضافة رأي جديد" onClose={() => setModal(null)}>
        <Input label="اسم الطالب *" value={f.name} onChange={v=>set("name",v)} placeholder="أحمد محمد" />

        <div style={{ marginBottom:10 }}>
          <label style={{ fontSize:12, color:"#aaa", fontWeight:700, display:"block", marginBottom:6 }}>صورة الطالب (اختياري)</label>
          <label style={{ display:"flex", alignItems:"center", gap:10, cursor:"pointer", background:"rgba(255,255,255,.05)", border:`1.5px dashed ${C.border}`, borderRadius:10, padding:"10px 14px" }}>
            <span style={{ fontSize:20 }}>👤</span>
            <span style={{ fontSize:12, color:"#aaa" }}>{f.image ? "✅ تم رفع الصورة" : "اضغط لرفع صورة الطالب"}</span>
            <input type="file" accept="image/*" onChange={pickImage} style={{ display:"none" }} />
          </label>
          {f.image && (
            <div style={{ marginTop:8, display:"flex", alignItems:"center", gap:10 }}>
              <img src={f.image} alt="" style={{ width:44, height:44, objectFit:"cover", borderRadius:"50%" }} />
              <Btn children="🗑" sm v="danger" onClick={()=>set("image",null)} />
            </div>
          )}
        </div>

        <Input label="التعليق (عربي) *" value={f.comment_ar} onChange={v=>set("comment_ar",v)} placeholder="تجربة رائعة مع Eduzah..." rows={3} />
        <Input label="Comment (English)" value={f.comment_en} onChange={v=>set("comment_en",v)} placeholder="Amazing experience with Eduzah..." rows={2} />

        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10, marginTop:4 }}>
          <Input label="الكورس / الخدمة" value={f.course} onChange={v=>set("course",v)} placeholder="تطوير الويب" />
          <div>
            <label style={{ fontSize:12, color:"#aaa", fontWeight:700, display:"block", marginBottom:6 }}>التقييم</label>
            <div style={{ display:"flex", gap:6 }}>
              {[1,2,3,4,5].map(n => (
                <button key={n} onClick={()=>set("rating",n)}
                  style={{ background:"transparent", border:"none", cursor:"pointer", fontSize:20, color: n<=f.rating ? "#fbbf24":"#555", padding:0, transition:"transform .1s" }}
                  onMouseEnter={e=>e.currentTarget.style.transform="scale(1.2)"}
                  onMouseLeave={e=>e.currentTarget.style.transform=""}>
                  ★
                </button>
              ))}
            </div>
          </div>
        </div>

        <Btn children="✅ إضافة الرأي" full onClick={submit} style={{ marginTop:14 }} />
      </Modal>
    );
  };

  /* ─────────── Add / Edit Team Member Modal ─────────── */
  const AddTeamMemberModal = ({ editing }) => {
    const init = editing
      ? { name: editing.name, name_en: editing.name_en||"", role_ar: editing.role_ar||"", role_en: editing.role_en||"", bio_ar: editing.bio_ar||"", bio_en: editing.bio_en||"", email: editing.email||"", linkedin: editing.linkedin||"", image: editing.image||null }
      : { name:"", name_en:"", role_ar:"", role_en:"", bio_ar:"", bio_en:"", email:"", linkedin:"", image:null };
    const [f, setF] = useState(init);
    const set = (k,v) => setF(p => ({ ...p, [k]:v }));

    const pickImage = e => {
      const file = e.target.files[0];
      if (file) readFile(file, data => set("image", data));
    };

    const submit = () => {
      if (!f.name.trim() || !f.role_ar.trim()) { showT("❗ أدخل الاسم والمنصب", "error"); return; }
      const em = f.email.trim();
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(em)) {
        showT(tx("❗ بريد إلكتروني غير صالح", "❗ Invalid email"), "error");
        return;
      }
      const li = (f.linkedin || "").trim();
      if (li && !li.startsWith("https://www.linkedin.com/")) {
        showT(tx("❗ رابط LinkedIn يجب أن يبدأ بـ https://www.linkedin.com/", "❗ LinkedIn URL must start with https://www.linkedin.com/"), "error");
        return;
      }
      if (editing) {
        updateTeamMember(editing.id, { ...f, email: em, linkedin: li });
        showT("✅ تم تحديث بيانات العضو!");
      } else {
        addTeamMember({ ...f, email: em, linkedin: li });
        showT("✅ تم إضافة عضو الفريق!");
      }
      setModal(null);
    };

    return (
      <Modal title={editing ? "✏️ تعديل عضو الفريق" : "➕ إضافة عضو جديد"} onClose={() => setModal(null)}>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
          <Input label="الاسم (عربي) *"    value={f.name}    onChange={v=>set("name",v)}    placeholder="محمد أحمد" />
          <Input label="Name (English)"    value={f.name_en} onChange={v=>set("name_en",v)} placeholder="Mohamed Ahmed" />
        </div>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
          <Input label="المنصب (عربي) *"   value={f.role_ar} onChange={v=>set("role_ar",v)} placeholder="مدير تنفيذي" />
          <Input label="Role (English)"    value={f.role_en} onChange={v=>set("role_en",v)} placeholder="CEO" />
        </div>

        <div style={{ marginBottom:10 }}>
          <label style={{ fontSize:12, color:"#aaa", fontWeight:700, display:"block", marginBottom:6 }}>صورة العضو (اختياري)</label>
          <label style={{ display:"flex", alignItems:"center", gap:10, cursor:"pointer", background:"rgba(255,255,255,.05)", border:`1.5px dashed ${C.border}`, borderRadius:10, padding:"10px 14px" }}>
            <span style={{ fontSize:20 }}>👤</span>
            <span style={{ fontSize:12, color:"#aaa" }}>{f.image ? "✅ تم رفع الصورة" : "اضغط لرفع صورة العضو"}</span>
            <input type="file" accept="image/*" onChange={pickImage} style={{ display:"none" }} />
          </label>
          {f.image && (
            <div style={{ marginTop:8, display:"flex", alignItems:"center", gap:10 }}>
              <img src={f.image} alt="" style={{ width:48, height:48, objectFit:"cover", borderRadius:"50%" }} />
              <Btn children="🗑" sm v="danger" onClick={()=>set("image",null)} />
            </div>
          )}
        </div>

        <Input label="نبذة (عربي)"         value={f.bio_ar}   onChange={v=>set("bio_ar",v)}   placeholder="خبرة ..." rows={2} />
        <Input label="Bio (English)"       value={f.bio_en}   onChange={v=>set("bio_en",v)}   placeholder="Expert in ..." rows={2} />

        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
          <Input label="البريد الإلكتروني *" value={f.email}    onChange={v=>set("email",v)}    placeholder="name@eduzah.com" />
          <Input label={tx("LinkedIn (اختياري)", "LinkedIn (optional)")} value={f.linkedin} onChange={v=>set("linkedin",v)} placeholder="https://www.linkedin.com/in/..." />
        </div>

        <Btn children={editing ? "✅ حفظ التعديلات" : "✅ إضافة العضو"} full onClick={submit} style={{ marginTop:14 }} />
      </Modal>
    );
  };

  /* ─────────── Add Exam Modal ─────────── */
  const AddExamModal = () => {
    const [f, setF] = useState({ title:"", courseId: courses[0]?.id || "", type:"mcq", dueDate:"", duration:"45", description:"" });
    const set = (k, v) => setF(p => ({ ...p, [k]: v }));
    const submit = () => {
      if (!f.title || !f.courseId || !f.dueDate) { showT("❗ أكمل البيانات الأساسية", "error"); return; }
      addExam(f);
      showT("✅ تم إضافة الامتحان بنجاح!");
      setModal(null);
    };
    return (
      <Modal title="➕ إضافة امتحان / تاسك جديد" onClose={() => setModal(null)}>
        <Input label="عنوان الامتحان *" value={f.title} onChange={v => set("title", v)} placeholder="امتحان HTML & CSS الأول" />
        <Select label="الكورس *" value={f.courseId} onChange={v => set("courseId", v)}
          options={courses.map(c => ({ v: c.id, l: `${c.icon} ${c.title}` }))} />
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          <Select label="النوع" value={f.type} onChange={v => set("type", v)}
            options={[{v:"mcq",l:"📋 MCQ (أسئلة متعددة)"},{v:"task",l:"🛠 Task (مهمة عملية)"}]} />
          <Input label="الموعد النهائي *" value={f.dueDate} onChange={v => set("dueDate", v)} placeholder="15 أبريل 2025" />
        </div>
        {f.type === "mcq" && (
          <Input label="المدة (دقيقة)" value={f.duration} onChange={v => set("duration", v)} placeholder="45" />
        )}
        {f.type === "task" && (
          <Input label="وصف المهمة" value={f.description} onChange={v => set("description", v)} placeholder="ابني صفحة Landing Page باستخدام..." rows={3} />
        )}
        <Btn children="✅ إضافة الامتحان" full onClick={submit} style={{ marginTop: 8 }} />
      </Modal>
    );
  };

  return (
    <div dir={dir} style={{ display: "grid", gridTemplateColumns: "185px 1fr", minHeight: "calc(100vh - 58px)" }}>

      {/* Toast */}
      {toast && (
        <div style={{ position: "fixed", top: 65, left: "50%", transform: "translateX(-50%)", background: "#1a0f24", border: `1px solid ${toast.type === "success" ? C.success : C.danger}55`, borderRadius: 12, padding: "10px 20px", fontSize: 12, fontWeight: 700, zIndex: 9999, color: toast.type === "success" ? C.success : C.danger, whiteSpace: "nowrap", boxShadow: "0 4px 20px rgba(0,0,0,.5)" }}>
          {toast.msg}
        </div>
      )}

      {/* Sidebar */}
      <div style={{ background: "#2a1540", borderInlineEnd: `1px solid ${C.border}`, padding: "16px 0" }}>
        <div style={{ padding: "0 14px 14px", fontSize: 10, fontWeight: 700, color: C.muted, letterSpacing: 1 }}>{tx("لوحة التحكم", "ADMIN PANEL")}</div>
        {tabs.map(([k, l]) => (
          <div key={k} onClick={() => setTab(k)}
            style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "9px 14px", cursor: "pointer", color: tab === k ? C.red : C.muted, background: tab === k ? `${C.red}12` : "transparent", fontWeight: tab === k ? 700 : 400, fontSize: 12, transition: "all .2s" }}>
            {l}
            {k === "requests" && pending.length > 0 && (
              <span style={{ background: C.danger, borderRadius: "50%", width: 17, height: 17, fontSize: 9, display: "inline-flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>{pending.length}</span>
            )}
          </div>
        ))}
      </div>

      {/* Content */}
      <div style={{ padding: "22px", overflow: "auto" }}>

        {/* ── Overview ── */}
        {tab === "overview" && (
          <div>
            <h2 style={{ fontWeight: 900, fontSize: 20, marginBottom: 20 }}>{tx("نظرة عامة", "Dashboard overview")}</h2>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(130px,1fr))", gap: 12, marginBottom: 24 }}>
              {[
                { l: tx("الطلاب", "Students"),    v: students.length,     i:"👨‍🎓", c: C.red },
                { l: tx("المدربين", "Instructors"),  v: instructors.length,  i:"👨‍🏫", c: C.purple },
                { l: tx("الكورسات", "Courses"), v: courses.length,       i:"📚", c: C.orange },
                { l: tx("الطلبات", "Requests"),  v: pending.length,       i:"⏳", c: C.warning },
              ].map(s => (
                <Card key={s.l} style={{ padding: "14px 12px" }}>
                  <div style={{ fontSize: 20, marginBottom: 5 }}>{s.i}</div>
                  <div style={{ fontSize: 22, fontWeight: 900, color: s.c }}>{s.v}</div>
                  <div style={{ color: C.muted, fontSize: 12 }}>{s.l}</div>
                </Card>
              ))}
            </div>

            {pending.length > 0 && (
              <div>
                <div style={{ fontWeight: 800, fontSize: 14, marginBottom: 12, display: "flex", alignItems: "center", gap: 8 }}>
                  {tx("⏳ طلبات جديدة", "⏳ New requests")} <Badge color={C.danger}>{pending.length}</Badge>
                </div>
                {pending.map(u => (
                  <Card key={u.id} style={{ padding: "13px 15px", marginBottom: 9 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <div style={{ width: 36, height: 36, borderRadius: "50%", background: u.role === "instructor" ? "linear-gradient(135deg,#672d86,#321d3d)" : "linear-gradient(135deg,#d91b5b,#b51549)", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: 14, flexShrink: 0 }}>{u.avatar}</div>
                        <div>
                          <div style={{ fontWeight: 700, fontSize: 13 }}>{u.name}</div>
                          <div style={{ color: C.muted, fontSize: 11 }}>{u.email}</div>
                          <Badge color={u.role === "instructor" ? C.purple : C.orange}>{u.role}</Badge>
                        </div>
                      </div>
                      <div style={{ display: "flex", gap: 8 }}>
                        <Btn children={tx("✅ قبول", "✅ Approve")} v="success" sm onClick={() => { approveUser(u.id); showT(tx(`تم قبول ${u.name} ✅`, `${u.name} approved ✅`)); }} />
                        <Btn children={tx("❌ رفض", "❌ Reject")}  v="danger"  sm onClick={() => { rejectUser(u.id);  showT(tx("تم الرفض", "Rejected"), "error"); }} />
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── Users ── */}
        {tab === "users" && (
          <div>
            <h2 style={{ fontWeight: 900, fontSize: 18, marginBottom: 16 }}>{tx("إدارة المستخدمين", "User management")}</h2>
            <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
              {users.filter(u => u.role !== "admin").map(u => (
                <Card key={u.id} style={{ padding: "12px 14px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 9 }}>
                    <div style={{ display: "flex", gap: 9, alignItems: "center" }}>
                      <div style={{ width: 36, height: 36, borderRadius: "50%", background: u.role === "instructor" ? "linear-gradient(135deg,#672d86,#321d3d)" : "linear-gradient(135deg,#d91b5b,#b51549)", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: 14, flexShrink: 0 }}>{u.avatar}</div>
                      <div>
                        <div style={{ fontWeight: 700, fontSize: 13 }}>{u.name}</div>
                        <div style={{ color: C.muted, fontSize: 11 }}>{u.email}</div>
                        <div style={{ display: "flex", gap: 5, marginTop: 4, flexWrap: "wrap" }}>
                          <Badge color={u.role === "instructor" ? C.purple : C.orange}>{u.role}</Badge>
                          <Badge color={u.status === "approved" ? C.success : u.status === "pending" ? C.warning : C.danger}>{u.status}</Badge>
                          {u.enrolledCourses.length > 0 && <Badge color={C.muted}>📚 {u.enrolledCourses.length}</Badge>}
                        </div>
                      </div>
                    </div>
                    <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
                      <Btn children={tx("✏️ تعديل", "✏️ Edit")} sm v="outline" onClick={() => setModal({ type: "edit-user", user: u })} aria-label={tx("تعديل المستخدم", "Edit user")} />
                      {u.status === "pending"   && <><Btn children="✅" v="success" sm onClick={() => { approveUser(u.id); showT(tx("✅ تم القبول", "✅ Approved")); }} aria-label={tx("قبول", "Approve")} /><Btn children="❌" v="danger" sm onClick={() => { rejectUser(u.id); showT(tx("تم الرفض", "Rejected"), "error"); }} aria-label={tx("رفض", "Reject")} /></>}
                      {u.status === "rejected"  && <Btn children="🔄" v="success" sm onClick={() => { approveUser(u.id); showT(tx("✅ تم التفعيل", "✅ Reactivated")); }} aria-label={tx("إعادة تفعيل", "Reactivate")} />}
                      {u.role === "student"     && u.status === "approved" && <Btn children={tx("📚 كورسات", "📚 Courses")} v="orange"  sm onClick={() => setModal({ type: "enroll", user: u })} />}
                      {u.role === "instructor"  && u.status === "approved" && <Btn children={tx("🎓 تعيين", "🎓 Assign")}  v="purple"  sm onClick={() => setModal({ type: "assign", user: u })} />}
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* ── Requests ── */}
        {tab === "requests" && (
          <div>
            <h2 style={{ fontWeight: 900, fontSize: 18, marginBottom: 16 }}>{tx("طلبات التسجيل", "Registration requests")}</h2>
            {pending.length === 0
              ? <Card style={{ padding: 32, textAlign: "center" }}><div style={{ color: C.muted }}>{tx("✅ لا توجد طلبات معلقة", "✅ No pending requests")}</div></Card>
              : <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
                  {pending.map(u => (
                    <Card key={u.id} style={{ padding: "14px 16px" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10 }}>
                        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                          <div style={{ width: 40, height: 40, borderRadius: "50%", background: u.role === "instructor" ? "linear-gradient(135deg,#672d86,#321d3d)" : "linear-gradient(135deg,#d91b5b,#b51549)", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: 16, flexShrink: 0 }}>{u.avatar}</div>
                          <div>
                            <div style={{ fontWeight: 700, fontSize: 13 }}>{u.name}</div>
                            <div style={{ color: C.muted, fontSize: 12 }}>{u.email}</div>
                            <div style={{ display: "flex", gap: 5, marginTop: 4 }}>
                              <Badge color={u.role === "instructor" ? C.purple : C.orange}>{u.role}</Badge>
                              <Badge color={C.warning}>{tx("قيد المراجعة", "Pending review")}</Badge>
                            </div>
                          </div>
                        </div>
                        <div style={{ display: "flex", gap: 8 }}>
                          <Btn children={tx("✅ قبول", "✅ Approve")} v="success" onClick={() => { approveUser(u.id); showT(tx(`تم قبول ${u.name}`, `${u.name} approved`)); }} />
                          <Btn children={tx("❌ رفض", "❌ Reject")}  v="danger"  onClick={() => { rejectUser(u.id);  showT(tx("تم الرفض", "Rejected"), "error"); }} />
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>}
          </div>
        )}

        {/* ── Courses ── */}
        {tab === "courses" && (
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16, flexWrap: "wrap", gap: 10 }}>
              <h2 style={{ fontWeight: 900, fontSize: 18, margin: 0 }}>{tx("إدارة الكورسات", "Course management")}</h2>
              <Btn children={tx("➕ كورس جديد", "➕ New course")} onClick={() => setModal({ type: "add-course" })} style={{ background: C.red }} />
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
              {courses.map(c => {
                const inst = users.find(u => u.id === c.instructorId);
                const sc   = users.filter(u => u.enrolledCourses?.find(e => e.courseId === c.id)).length;
                return (
                  <Card key={c.id} style={{ padding: "12px 14px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 9 }}>
                      <div style={{ display: "flex", gap: 9, alignItems: "center" }}>
                        <div style={{ width: 38, height: 38, borderRadius: 10, background: `linear-gradient(135deg,${c.color},#321d3d)`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, flexShrink: 0 }}>{c.icon}</div>
                        <div>
                          <div style={{ fontWeight: 700, fontSize: 13 }}>{c.title}</div>
                          <div style={{ color: C.muted, fontSize: 11, marginTop: 2 }}>{c.price.toLocaleString()} EGP · 👨‍🎓 {sc} {tx("طالب", "students")} · {inst ? `👨‍🏫 ${inst.name}` : tx("بدون مدرب", "No instructor")}</div>
                          <div style={{ display: "flex", gap: 4, marginTop: 4 }}>
                            <Badge color={C.orange}>{c.cat}</Badge>
                            {c.featured && <Badge color={C.red}>⭐ Featured</Badge>}
                          </div>
                        </div>
                      </div>
                      <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
                        <Btn children={tx("فيديو", "Video")} sm v="outline" onClick={() => setModal({ type: "add-session", course: c })} />
                        <Btn children={tx("✏️ تعديل", "✏️ Edit")} sm v="outline" onClick={() => setModal({ type: "edit-course", course: c })} />
                        <Btn children={tx("📚 تسجيل", "📚 Enroll")}              sm v="purple"  onClick={() => setModal({ type: "enroll-course", course: c })} />
                        <Btn children={tx("🎓 مدرب", "🎓 Instructor")}               sm v="outline" onClick={() => setModal({ type: "assign-course", course: c })} />
                        <Btn children={c.featured ? tx("★ إلغاء", "★ Unfeature") : tx("⭐ تمييز", "⭐ Feature")} sm v={c.featured ? "orange" : "outline"} onClick={() => { toggleFeatured(c.id); showT(c.featured ? tx("تم إلغاء التمييز", "Unfeatured") : tx("⭐ تم التمييز", "⭐ Featured")); }} />
                        <Btn children="🗑"                     sm v="danger"  onClick={() => { deleteCourse(c.id); showT(tx("تم الحذف", "Deleted"), "error"); }} />
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          </div>
        )}

        {/* ── News ── */}
        {tab === "news" && (
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <h2 style={{ fontWeight: 900, fontSize: 18, margin: 0 }}>{tx("إدارة الأخبار", "News management")}</h2>
              <Btn children={tx("➕ خبر جديد", "➕ New article")} onClick={() => setModal({ type: "add-news" })} style={{ background: C.orange, color: C.pdark }} />
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
              {news.map(n => (
                <Card key={n.id} style={{ padding: "12px 14px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8, flexWrap: "wrap" }}>
                    <div style={{ display: "flex", gap: 9, alignItems: "flex-start" }}>
                      <div>
                        <div style={{ fontWeight: 700, fontSize: 12, marginBottom: 4 }}>{n.title}</div>
                        <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
                          <Badge color={C.orange}>{newsTagAdmin(n, lang)}</Badge>
                          {n.featured && <Badge color={C.red}>Featured</Badge>}
                          <span style={{ color: C.muted, fontSize: 10 }}>{formatNewsDateAdmin(n, lang)}</span>
                        </div>
                      </div>
                    </div>
                    <Btn children={tx("🗑 حذف", "🗑 Delete")} sm v="danger" onClick={() => { deleteNews(n.id); showT(tx("تم حذف الخبر", "Article deleted"), "error"); }} />
                  </div>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* ── Trainers ── */}
        {tab === "trainers" && (
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16, flexWrap: "wrap", gap: 10 }}>
              <h2 style={{ fontWeight: 900, fontSize: 18, margin: 0 }}>{tx("إدارة المدربين", "Trainer management")}</h2>
              <Btn children={tx("➕ مدرب جديد", "➕ New trainer")} onClick={() => setModal({ type: "add-trainer" })} v="purple" />
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {trainers.map(tr => (
                <Card key={tr.id} style={{ padding: "16px 18px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 10 }}>
                    <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                      <div style={{ width: 44, height: 44, borderRadius: "50%", background: "linear-gradient(135deg,#672d86,#321d3d)", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: 18, flexShrink: 0 }}>{tr.avatar}</div>
                      <div>
                        <div style={{ fontWeight: 800, fontSize: 14 }}>{tr.name}</div>
                        <div style={{ color: C.muted, fontSize: 11, marginBottom: 4 }}>📧 {tr.username}</div>
                        <div style={{ color: C.muted, fontSize: 11, marginBottom: 4 }}>🔑 {tr.password}</div>
                        {tr.specialty_ar && <Badge color={C.purple}>{tr.specialty_ar}</Badge>}
                      </div>
                    </div>
                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                      <Badge color={C.orange}>{tr.courses?.length || 0} {tx("كورس", "courses")}</Badge>
                      <Btn children={tx("🗑 حذف", "🗑 Delete")} sm v="danger" onClick={() => { deleteTrainer(tr.id); showT(tx("تم حذف المدرب", "Trainer deleted"), "error"); }} />
                    </div>
                  </div>
                  {tr.bio_ar && <div style={{ color: C.muted, fontSize: 11, marginTop: 8, lineHeight: 1.7 }}>{tr.bio_ar}</div>}
                </Card>
              ))}
              {trainers.length === 0 && <Card style={{ padding: 32, textAlign: "center" }}><div style={{ color: C.muted }}>{tx('لا يوجد مدربون بعد. اضغط "مدرب جديد" لإضافة أول مدرب.', 'No trainers yet. Use "New trainer" to add one.')}</div></Card>}
            </div>
          </div>
        )}

        {/* ── Programs ── */}
        {tab === "programs" && (
          <div>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:16, flexWrap:"wrap", gap:10 }}>
              <h2 style={{ fontWeight:900, fontSize:18, margin:0 }}>{tx("🌟 إدارة البرامج الرئيسية", "🌟 Programs")}</h2>
              <Btn children={tx("➕ برنامج جديد", "➕ New program")} onClick={()=>setModal({ type:"add-program" })} style={{ background:C.orange, color:C.pdark }} />
            </div>
            <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(300px,1fr))", gap:14 }}>
              {(programs||[]).map(pr => (
                <Card key={pr.id} style={{ padding:0, overflow:"hidden" }}>
                  {pr.image
                    ? <img src={pr.image} alt={pr.title_ar} style={{ width:"100%", height:140, objectFit:"cover" }} />
                    : <div style={{ width:"100%", height:140, background:`linear-gradient(135deg,${C.red}44,${C.purple}44)`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:40 }}>🌟</div>
                  }
                  <div style={{ padding:"14px 16px" }}>
                    <div style={{ fontWeight:800, fontSize:14, marginBottom:4 }}>{pr.title_ar}</div>
                    {pr.title_en && <div style={{ color:C.muted, fontSize:12, marginBottom:6 }}>{pr.title_en}</div>}
                    {pr.desc_ar  && <div style={{ color:C.muted, fontSize:11, lineHeight:1.6, marginBottom:10 }}>{pr.desc_ar.slice(0,80)}{pr.desc_ar.length>80?"…":""}</div>}
                    <div style={{ display:"flex", gap:8 }}>
                      <Btn children={tx("✏️ تعديل", "✏️ Edit")} sm v="outline" onClick={()=>setModal({ type:"edit-program", program:pr })} />
                      <Btn children={tx("🗑 حذف", "🗑 Delete")}   sm v="danger"  onClick={()=>{ deleteProgram(pr.id); showT(tx("تم حذف البرنامج","Program deleted"),"error"); }} />
                    </div>
                  </div>
                </Card>
              ))}
              {(!programs||programs.length===0) && (
                <Card style={{ padding:40, textAlign:"center", gridColumn:"1/-1" }}>
                  <div style={{ color:C.muted }}>{tx('لا توجد برامج بعد. اضغط "برنامج جديد" للإضافة.', 'No programs yet. Use "New program" to add one.')}</div>
                </Card>
              )}
            </div>
          </div>
        )}

        {/* ── Testimonials ── */}
        {tab === "testimonials" && (
          <div>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:16, flexWrap:"wrap", gap:10 }}>
              <h2 style={{ fontWeight:900, fontSize:18, margin:0 }}>{tx("⭐ إدارة آراء الطلاب", "⭐ Testimonials")}</h2>
              <Btn children={tx("➕ رأي جديد", "➕ New testimonial")} onClick={()=>setModal({ type:"add-testimonial" })} style={{ background:C.orange, color:C.pdark }} />
            </div>
            <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
              {(testimonials||[]).map(t => (
                <Card key={t.id} style={{ padding:"14px 18px" }}>
                  <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", flexWrap:"wrap", gap:10 }}>
                    <div style={{ display:"flex", gap:12, alignItems:"flex-start", flex:1, minWidth:0 }}>
                      {t.image
                        ? <img src={t.image} alt={t.name} style={{ width:44, height:44, borderRadius:"50%", objectFit:"cover", flexShrink:0 }} />
                        : <div style={{ width:44, height:44, borderRadius:"50%", background:"linear-gradient(135deg,#d91b5b,#b51549)", display:"flex", alignItems:"center", justifyContent:"center", fontWeight:800, fontSize:18, flexShrink:0 }}>{t.name[0]}</div>
                      }
                      <div style={{ minWidth:0 }}>
                        <div style={{ fontWeight:800, fontSize:13, marginBottom:2 }}>{t.name}</div>
                        {t.course && <div style={{ color:C.orange, fontSize:11, marginBottom:4 }}>📚 {t.course}</div>}
                        <div style={{ color:"#fbbf24", fontSize:13, marginBottom:4 }}>{"★".repeat(t.rating||5)}</div>
                        <div style={{ color:C.muted, fontSize:12, lineHeight:1.65 }}>{t.comment_ar}</div>
                      </div>
                    </div>
                    <Btn children={tx("🗑 حذف", "🗑 Delete")} sm v="danger" onClick={()=>{ deleteTestimonial(t.id); showT(tx("تم الحذف","Deleted"),"error"); }} />
                  </div>
                </Card>
              ))}
              {(!testimonials||testimonials.length===0) && (
                <Card style={{ padding:40, textAlign:"center" }}>
                  <div style={{ color:C.muted }}>{tx('لا توجد آراء بعد. اضغط "رأي جديد" للإضافة.', 'No testimonials yet. Use "New testimonial" to add one.')}</div>
                </Card>
              )}
            </div>
          </div>
        )}

        {/* ── Team ── */}
        {tab === "team" && (
          <div>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:16, flexWrap:"wrap", gap:10 }}>
              <h2 style={{ fontWeight:900, fontSize:18, margin:0 }}>{tx("👥 إدارة فريق العمل", "👥 Team")}</h2>
              <Btn children={tx("➕ عضو جديد", "➕ New member")} onClick={()=>setModal({ type:"add-team" })} />
            </div>
            <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(280px,1fr))", gap:14 }}>
              {(team||[]).map(m => (
                <Card key={m.id} style={{ padding:"16px 18px" }}>
                  <div style={{ display:"flex", gap:12, alignItems:"flex-start", marginBottom:10 }}>
                    {m.image
                      ? <img src={m.image} alt={m.name} style={{ width:48, height:48, borderRadius:"50%", objectFit:"cover", flexShrink:0 }} />
                      : <div style={{ width:48, height:48, borderRadius:"50%", background:"linear-gradient(135deg,#d91b5b,#b51549)", display:"flex", alignItems:"center", justifyContent:"center", fontWeight:800, fontSize:20, flexShrink:0 }}>{m.avatar||m.name[0]}</div>
                    }
                    <div style={{ flex:1, minWidth:0 }}>
                      <div style={{ fontWeight:800, fontSize:14 }}>{m.name}</div>
                      <div style={{ color:C.orange, fontSize:11, fontWeight:700 }}>{m.role_ar}</div>
                      {m.email && <div style={{ color:C.muted, fontSize:11 }}>{m.email}</div>}
                    </div>
                  </div>
                  {m.bio_ar && <div style={{ color:C.muted, fontSize:12, lineHeight:1.6, marginBottom:10 }}>{m.bio_ar.slice(0,100)}{m.bio_ar.length>100?"…":""}</div>}
                  <div style={{ display:"flex", gap:7 }}>
                    <Btn children={tx("✏️ تعديل", "✏️ Edit")} sm v="outline" onClick={()=>setModal({ type:"edit-team", member:m })} />
                    <Btn children={tx("🗑 حذف", "🗑 Delete")}   sm v="danger"  onClick={()=>{ deleteTeamMember(m.id); showT(tx("تم الحذف","Deleted"),"error"); }} />
                  </div>
                </Card>
              ))}
              {(!team||team.length===0) && (
                <Card style={{ padding:40, textAlign:"center", gridColumn:"1/-1" }}>
                  <div style={{ color:C.muted }}>{tx('لا يوجد أعضاء فريق. اضغط "عضو جديد" للإضافة.', 'No team members yet. Use "New member" to add one.')}</div>
                </Card>
              )}
            </div>
          </div>
        )}

        {/* ── Settings ── */}
        {tab === "settings" && (
          <div>
            <h2 style={{ fontWeight: 900, fontSize: 18, marginBottom: 20 }}>{tx("⚙️ إعدادات المنصة", "⚙️ Platform settings")}</h2>
            <Card style={{ padding: 24, maxWidth: 480 }}>
              <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 6 }}>{tx("📱 رقم Vodafone Cash", "📱 Vodafone Cash number")}</div>
              <div style={{ color: C.muted, fontSize: 12, marginBottom: 12, lineHeight: 1.6 }}>
                {tx("هذا الرقم يظهر للطلاب في صفحة الدفع عند اختيار Vodafone Cash", "This number is shown to students on checkout when they choose Vodafone Cash.")}
              </div>
              <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                <input
                  value={vodafoneCash}
                  onChange={e => setVodafoneCash(e.target.value)}
                  placeholder="01xxxxxxxxx"
                  style={{ flex: 1, background: "rgba(50,29,61,.6)", border: `1.5px solid ${C.border}`, borderRadius: 10, padding: "10px 14px", color: "#fff", fontFamily: "'Cairo',sans-serif", fontSize: 14, outline: "none" }}
                />
                <Btn children={tx("✅ حفظ", "✅ Save")} sm onClick={() => showT(tx("✅ تم حفظ الرقم بنجاح!", "✅ Number saved!"))} />
              </div>
            </Card>
          </div>
        )}

        {/* ── Exams ── */}
        {tab === "exams" && (
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <h2 style={{ fontWeight: 900, fontSize: 18, margin: 0 }}>{tx("إدارة الامتحانات", "Exam management")}</h2>
              <Btn children={tx("➕ امتحان جديد", "➕ New exam")} onClick={() => setModal({ type: "add-exam" })} v="purple" />
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
              {exams.map(e => {
                const c = courses.find(x => x.id === e.courseId);
                return (
                  <Card key={e.id} style={{ padding: "12px 14px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 9 }}>
                      <div>
                        <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 5 }}>{e.title}</div>
                        <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
                          <Badge color={e.type === "mcq" ? C.red : C.purple}>{e.type === "mcq" ? "MCQ" : "Task"}</Badge>
                          {c && <Badge color={C.orange}>{c.title.slice(0, 22)}</Badge>}
                          <span style={{ color: C.muted, fontSize: 10 }}>{e.dueDate}</span>
                          {e.type === "mcq" && <span style={{ color: C.muted, fontSize: 10 }}>{e.duration} {tx("دقيقة", "min")}</span>}
                        </div>
                      </div>
                      <Btn children={tx("🗑 حذف", "🗑 Delete")} sm v="danger" onClick={() => { deleteExam(e.id); showT(tx("تم حذف الامتحان", "Exam deleted"), "error"); }} />
                    </div>
                  </Card>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* ═══ Modals ═══ */}
      {modal?.type === "add-course"      && <AddCourseModal />}
      {modal?.type === "add-session"     && modal.course && (
        <AddSessionModal
          course={modal.course}
          onClose={() => setModal(null)}
          ar={ar}
          updateCourse={updateCourse}
          addExam={addExam}
          showToast={showT}
        />
      )}
      {modal?.type === "edit-course"     && modal.course && <EditCourseModal course={modal.course} />}
      {modal?.type === "edit-user"       && modal.user && <EditUserModal user={modal.user} />}
      {modal?.type === "add-news"        && <AddNewsModal />}
      {modal?.type === "add-exam"        && <AddExamModal />}
      {modal?.type === "add-trainer"     && <AddTrainerModal />}
      {modal?.type === "add-program"     && <AddProgramModal />}
      {modal?.type === "edit-program"    && <AddProgramModal editing={modal.program} />}
      {modal?.type === "add-testimonial" && <AddTestimonialModal />}
      {modal?.type === "add-team"        && <AddTeamMemberModal />}
      {modal?.type === "edit-team"       && <AddTeamMemberModal editing={modal.member} />}

      {modal?.type === "enroll" && (
        <Modal title={`📚 كورسات: ${modal.user.name}`} onClose={() => setModal(null)}>
          <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
            {courses.map(c => {
              const isE = !!users.find(u => u.id === modal.user.id)?.enrolledCourses.find(e => e.courseId === c.id);
              return (
                <div key={c.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 11px", background: "rgba(255,255,255,.06)", borderRadius: 9 }}>
                  <div><div style={{ fontWeight: 600, fontSize: 12 }}>{c.icon} {c.title}</div><div style={{ color: C.muted, fontSize: 10 }}>{c.price.toLocaleString()} EGP</div></div>
                  {isE
                    ? <Btn children="إزالة"   sm v="danger"  onClick={() => { removeEnroll(modal.user.id, c.id); showT("تم الإزالة", "error"); setModal(p => ({ ...p })); }} />
                    : <Btn children="+ تسجيل" sm v="success" onClick={() => { enrollUser(modal.user.id, c.id);  showT("✅ تم التسجيل"); setModal(p => ({ ...p })); }} />
                  }
                </div>
              );
            })}
          </div>
        </Modal>
      )}

      {modal?.type === "enroll-course" && (
        <Modal title={`👨‍🎓 تسجيل طلاب في: ${modal.course.title}`} onClose={() => setModal(null)}>
          <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
            {students.filter(u => u.status === "approved").map(u => {
              const isE = !!u.enrolledCourses.find(e => e.courseId === modal.course.id);
              return (
                <div key={u.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 11px", background: "rgba(255,255,255,.06)", borderRadius: 9 }}>
                  <div style={{ display: "flex", gap: 7, alignItems: "center" }}>
                    <div style={{ width: 26, height: 26, borderRadius: "50%", background: "linear-gradient(135deg,#d91b5b,#b51549)", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: 11, flexShrink: 0 }}>{u.avatar}</div>
                    <span style={{ fontWeight: 600, fontSize: 12 }}>{u.name}</span>
                  </div>
                  {isE
                    ? <Btn children="إزالة"   sm v="danger"  onClick={() => { removeEnroll(u.id, modal.course.id); showT("تم الإزالة", "error"); }} />
                    : <Btn children="+ تسجيل" sm v="success" onClick={() => { enrollUser(u.id, modal.course.id);  showT("✅ تم التسجيل"); }} />
                  }
                </div>
              );
            })}
          </div>
        </Modal>
      )}

      {modal?.type === "assign-course" && (
        <Modal title={`🎓 تعيين مدرب لـ: ${modal.course.title}`} onClose={() => setModal(null)}>
          <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
            {instructors.filter(u => u.status === "approved").map(u => {
              const isA = modal.course.instructorId === u.id;
              return (
                <div key={u.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 11px", background: "rgba(255,255,255,.06)", borderRadius: 9 }}>
                  <span style={{ fontWeight: 600, fontSize: 12 }}>{u.avatar} {u.name}</span>
                  {isA
                    ? <Badge color={C.success}>معيّن ✓</Badge>
                    : <Btn children="+ تعيين" sm v="success" onClick={() => { assignInstructor(u.id, modal.course.id); showT("✅ تم التعيين"); }} />
                  }
                </div>
              );
            })}
          </div>
        </Modal>
      )}

      {modal?.type === "assign" && (
        <Modal title={`🎓 تعيين كورسات للمدرب: ${modal.user.name}`} onClose={() => setModal(null)}>
          <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
            {courses.map(c => (
              <div key={c.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 11px", background: "rgba(255,255,255,.06)", borderRadius: 9 }}>
                <div style={{ fontWeight: 600, fontSize: 12 }}>{c.icon} {c.title}</div>
                <Btn children="+ تعيين" sm v="success" onClick={() => { assignInstructor(modal.user.id, c.id); showT("✅ تم التعيين"); }} />
              </div>
            ))}
          </div>
        </Modal>
      )}
    </div>
  );
}
