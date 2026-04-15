import { useState, useCallback, useMemo, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { collection, getDocs, doc, updateDoc, orderBy, query, onSnapshot } from "firebase/firestore";
import { db } from "../../firebase";
import { C } from "../../theme";
import { Btn, Card, Badge, Modal, Input, Select } from "../../components/UI";
import AddSessionModal from "../../components/AddSessionModal";
import { useAuth } from "../../context/AuthContext";
import { useData } from "../../context/DataContext";
import { useLang } from "../../context/LangContext";
import { isSuperAdminEmail } from "../../config/superAdmin";
import { exportCourseStudents } from "../../utils/exportExcel";
import CourseStudentsModal from "../../components/CourseStudentsModal";
import { StatCard, BarChart, DonutChart } from "../../components/Charts";

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
  const {
    users, approveUser, rejectUser, deleteUser, enrollUser, removeEnroll, assignInstructor, unassignInstructorFromCourse, adminUpdateUser, createAdminAccount, createInstructorAccount, currentUser,
    approveEnrollmentRequest, rejectEnrollmentRequest,
  } = useAuth();
  const {
    courses, news, exams, trainers, programs, testimonials, team,
    vodafoneCash, setVodafoneCash,
    categoryIcons, saveCategoryIcon, deleteCategoryIcon,
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

  const [tab,        setTab]       = useState("overview");
  const [modal,      setModal]     = useState(null);
  const [toast,      setToast]     = useState(null);
  const [exportingId, setExportingId] = useState(null); // course id being exported
  const [leadsTab,   setLeadsTab]  = useState("consultation");
  const [consultationLeads, setConsultationLeads] = useState([]);
  const [hiringLeads,       setHiringLeads]       = useState([]);
  const [corporateLeads,    setCorporateLeads]     = useState([]);
  const [leadsLoading,      setLeadsLoading]       = useState(false);
  const [enrollmentRequests, setEnrollmentRequests] = useState([]);
  const [enrollFilter,     setEnrollFilter]      = useState("pending"); // pending | approved | rejected | all
  const [rejectModal,      setRejectModal]       = useState(null); // { id }
  const [rejectReason,     setRejectReason]      = useState("");
  const [enrollmentLoadError, setEnrollmentLoadError] = useState(null);

  const sortEnrollmentRows = useCallback((rows) => {
    const rowTime = (row) => {
      const c = row?.createdAt;
      if (c == null) return 0;
      if (typeof c.toMillis === "function") return c.toMillis();
      if (typeof c === "object" && typeof c.seconds === "number") return c.seconds * 1000;
      if (typeof c === "number") return c;
      return Date.parse(String(c)) || 0;
    };
    return [...rows].sort((a, b) => rowTime(b) - rowTime(a));
  }, []);

  const loadEnrollmentRequests = useCallback(async () => {
    try {
      setEnrollmentLoadError(null);
      const snap = await getDocs(query(collection(db, "enrollmentRequests"), orderBy("createdAt", "desc")));
      setEnrollmentRequests(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    } catch (e) {
      console.error(e);
      try {
        const snap = await getDocs(collection(db, "enrollmentRequests"));
        const rows = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        setEnrollmentRequests(sortEnrollmentRows(rows));
      } catch (e2) {
        console.error(e2);
        setEnrollmentLoadError(e?.message || String(e));
      }
    }
  }, [sortEnrollmentRows]);

  /** Real-time list for admins (courseId / courseTitle on each row) — full collection + client sort avoids index issues. */
  useEffect(() => {
    if (currentUser?.role !== "admin") {
      setEnrollmentRequests([]);
      setEnrollmentLoadError(null);
      return undefined;
    }
    const unsub = onSnapshot(
      collection(db, "enrollmentRequests"),
      (snap) => {
        setEnrollmentLoadError(null);
        const rows = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        setEnrollmentRequests(sortEnrollmentRows(rows));
      },
      (err) => {
        console.error(err);
        setEnrollmentLoadError(err?.message || String(err));
        loadEnrollmentRequests();
      },
    );
    return () => unsub();
  }, [currentUser?.role, sortEnrollmentRows, loadEnrollmentRequests]);

  useEffect(() => {
    if (tab !== "leads") return;
    setLeadsLoading(true);
    Promise.all([
      getDocs(query(collection(db, "consultationLeads"), orderBy("createdAt", "desc"))),
      getDocs(query(collection(db, "hiringLeads"),       orderBy("createdAt", "desc"))),
      getDocs(query(collection(db, "corporateLeads"),    orderBy("createdAt", "desc"))),
    ]).then(([c, h, co]) => {
      setConsultationLeads(c.docs.map(d => ({ id: d.id, ...d.data() })));
      setHiringLeads(h.docs.map(d => ({ id: d.id, ...d.data() })));
      setCorporateLeads(co.docs.map(d => ({ id: d.id, ...d.data() })));
    }).catch(console.error).finally(() => setLeadsLoading(false));
  }, [tab]);

  const markLeadContacted = async (collName, leadId, setter) => {
    try {
      await updateDoc(doc(db, collName, leadId), { status: "contacted" });
      setter(prev => prev.map(l => l.id === leadId ? { ...l, status: "contacted" } : l));
      showT(ar ? "تم تحديد كـ 'تم التواصل'" : "Marked as contacted");
    } catch (err) { console.error(err); }
  };

  const showT = (msg, type = "success") => { setToast({ msg, type }); setTimeout(() => setToast(null), 2800); };

  const handleExport = useCallback(async (course) => {
    setExportingId(course.id);
    try {
      const result = await exportCourseStudents(course, users);
      if (result.ok) {
        showT(ar
          ? `تم تصدير ${result.count} طالب → ${result.fileName}`
          : `Exported ${result.count} students → ${result.fileName}`
        );
      } else {
        showT(result.msg || (ar ? "لا يوجد بيانات للتصدير" : "No data to export"), "error");
      }
    } catch (err) {
      console.error("Export error:", err);
      showT(ar ? "حدث خطأ أثناء التصدير" : "Export failed", "error");
    } finally {
      setExportingId(null);
    }
  }, [users, ar]);

  const pending      = users.filter(u => u.status === "pending");
  const pendingEnrollments = enrollmentRequests.filter((r) => (r.enrollmentStatus ?? "pending") === "pending");
  const adminsList   = users.filter(u => u.role === "admin");
  const instructors  = users.filter(u => u.role === "instructor");
  const studentsEnr  = users.filter(u => (u.role === "student" || u.role === "user") && u.status === "approved" && (u.enrolledCourses || []).length > 0);
  const usersOnly    = users.filter(u => (u.role === "user" || u.role === "student") && u.status === "approved" && !(u.enrolledCourses || []).length);
  const approvedLearners = users.filter(u => (u.role === "student" || u.role === "user") && u.status === "approved");
  const superAdmin   = isSuperAdminEmail(currentUser?.email);

  const [analyticsRange, setAnalyticsRange] = useState("all");
  const cutoffMs = useMemo(() => {
    if (analyticsRange === "7d") return Date.now() - 7 * 864e5;
    if (analyticsRange === "30d") return Date.now() - 30 * 864e5;
    return 0;
  }, [analyticsRange]);
  const usersInRange = useMemo(() => {
    if (!cutoffMs) return users;
    return users.filter((u) => {
      const t = u.createdAt ? Date.parse(u.createdAt) : 0;
      return !Number.isNaN(t) && t >= cutoffMs;
    });
  }, [users, cutoffMs]);
  const totalEnrollments = useMemo(
    () => users.reduce((s, u) => s + (u.enrolledCourses?.length || 0), 0),
    [users],
  );
  const courseEnrollBars = useMemo(() => {
    const m = {};
    for (const u of users) {
      for (const e of u.enrolledCourses || []) {
        m[e.courseId] = (m[e.courseId] || 0) + 1;
      }
    }
    const max = Math.max(1, ...Object.values(m));
    return courses.map((c) => ({ c, n: m[c.id] || 0 })).filter((x) => x.n > 0).sort((a, b) => b.n - a.n).slice(0, 10).map((x) => ({ ...x, pct: Math.round((x.n / max) * 100) }));
  }, [users, courses]);

  /** Prefer stored courseTitle; fallback to live courses list by courseId (fixes empty titles in admin UI). */
  const enrollmentCourseLabel = useCallback((r) => {
    const raw = r.courseTitle != null ? String(r.courseTitle).trim() : "";
    if (raw) return raw;
    const c = courses.find((x) => String(x.id) === String(r.courseId));
    if (c) return ar ? c.title : (c.title_en || c.title);
    if (r.courseId != null && String(r.courseId)) return String(r.courseId);
    return "—";
  }, [courses, ar]);

  const requestCreatedMs = (r) => {
    const c = r?.createdAt;
    if (c == null) return 0;
    if (typeof c.toMillis === "function") return c.toMillis();
    if (typeof c === "object" && typeof c.seconds === "number") return c.seconds * 1000;
    return Date.parse(String(c)) || 0;
  };

  /** `enrollmentRequests` rows tied to this platform user (course registration form). */
  const courseFormRequestsForUser = useCallback(
    (u) => {
      const em = String(u.email || "").trim().toLowerCase();
      return enrollmentRequests.filter((r) => {
        const byUid = r.userId && String(r.userId) === String(u.id);
        const byEmail = em.length > 0 && String(r.studentEmail || "").trim().toLowerCase() === em;
        return byUid || byEmail;
      });
    },
    [enrollmentRequests],
  );

  /** Learners admins may add/remove from courses (includes pending accounts). */
  const learnersManageable = useMemo(
    () => users.filter((u) => (u.role === "student" || u.role === "user") && u.status !== "rejected"),
    [users],
  );

  const tabs = ar
    ? [
        ["overview",   "نظرة عامة"],
        ["users",      "المستخدمون"],
        ["requests",   "الطلبات"],
        ["leads",      "طلبات الخدمات"],
        ["courses",    "الكورسات"],
        ["news",       "الأخبار"],
        ["exams",      "الامتحانات"],
        ["trainers",   "المدربون"],
        ["programs",   "البرامج"],
        ["testimonials","الآراء"],
        ["team",       "الفريق"],
        ["icons",      "أيقونات الخدمات"],
        ["settings",   "الإعدادات"],
      ]
    : [
        ["overview",   "Overview"],
        ["users",      "Users"],
        ["requests",   "Requests"],
        ["leads",      "Service Leads"],
        ["courses",    "Courses"],
        ["news",       "News"],
        ["exams",      "Exams"],
        ["trainers",   "Trainers"],
        ["programs",   "Programs"],
        ["testimonials","Testimonials"],
        ["team",       "Team"],
        ["icons",      "Service Icons"],
        ["settings",   "Settings"],
      ];

  /* ─────────── Add Course Form ─────────── */
  const AddCourseModal = () => {
    const [f, setF] = useState({
      title:"", title_en:"", cat:"tech", price:"", hours:"", projects:"", duration:"12 أسبوع",
      tagline:"", tagline_en:"", desc:"", desc_en:"", bullets:"", bullets_en:"", outcomes:"", outcomes_en:"", image:null,
      presentationUrl:"", introVideoUrl:"", previewVideoUrl:"", freeLessonNote:"", upcomingSessionNote:"", sheetsTabName:"", notifyEmailsStr:"",
      who_ar:"", who_en:"", faq_ar:"", faq_en:"",
      techStackText:"",
    });
    const set = (k, v) => setF(p => ({ ...p, [k]: v }));
    const pickImg = e => { if (e.target.files[0]) readFile(e.target.files[0], d => set("image", d)); };
    const submit = () => {
      if (!f.title || !f.price) { showT("أدخل العنوان والسعر على الأقل", "error"); return; }
      addCourse({
        ...f,
        notifyEmails: f.notifyEmailsStr.split(/[\n,]+/).map(s => s.trim().toLowerCase()).filter(e => e.includes("@")),
      });
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
            {/* ── Course cover image ── */}
            <div style={{ marginBottom: 14 }}>
              <label style={{ fontSize: 12, color: "#aaa", fontWeight: 700, display: "block", marginBottom: 8 }}>صورة الغلاف (Cover Image)</label>
              {/* Preview / drop zone */}
              <label style={{ display: "block", cursor: "pointer", borderRadius: 12, overflow: "hidden", position: "relative", border: `2px dashed ${f.image ? "transparent" : C.border}` }}>
                {f.image
                  ? <img src={f.image} alt="" style={{ width: "100%", height: 160, objectFit: "cover", display: "block" }} />
                  : <div style={{ height: 130, background: "rgba(255,255,255,.04)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 8 }}>
                      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke={C.muted} strokeWidth="1.5"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
                      <span style={{ fontSize: 12, color: C.muted }}>اضغط لرفع صورة الكورس</span>
                      <span style={{ fontSize: 10, color: "rgba(255,255,255,.3)" }}>JPG / PNG / WEBP</span>
                    </div>
                }
                <input type="file" accept="image/*" onChange={pickImg} style={{ display: "none" }} />
              </label>
              {f.image && (
                <div style={{ marginTop: 6, display: "flex", gap: 8 }}>
                  <label style={{ flex: 1, cursor: "pointer", background: "rgba(255,255,255,.06)", border: `1px solid ${C.border}`, borderRadius: 8, padding: "6px 10px", fontSize: 11, color: C.muted, textAlign: "center" }}>
                    تغيير الصورة
                    <input type="file" accept="image/*" onChange={pickImg} style={{ display: "none" }} />
                  </label>
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
            <Input
              label={tx("ما ستتعلمه (Tech Stack) — كل سطر: المجموعة: item1, item2 (واكتب | ai للمجموعة)", "Tech Stack — per line: Group: item1, item2 (use | ai to highlight)")}
              value={f.techStackText}
              onChange={v => set("techStackText", v)}
              placeholder={"Front-End: HTML, CSS, JavaScript\nReact: React, Hooks, Router\nأدوات AI | ai: Prompting, Gemini"}
              rows={4}
            />
            <Input label={tx("هذا البرنامج مناسب إذا كنت… (عربي) — سطر لكل نقطة", "Who is this for (AR) — one per line")} value={f.who_ar} onChange={v => set("who_ar", v)} placeholder={"المبتدئين الذين يريدون دخول المجال من الصفر\nالمطورون الذين يريدون رفع مستواهم"} rows={3} />
            <Input label={tx("Who is this for (EN) — one per line", "Who is this for (EN) — one per line")} value={f.who_en} onChange={v => set("who_en", v)} placeholder={"Beginners who want to enter from scratch\nDevelopers who want to level up"} rows={3} />
            <Input label={tx("FAQ (عربي) — كل سطر: سؤال | إجابة", "FAQ (AR) — per line: Question | Answer")} value={f.faq_ar} onChange={v => set("faq_ar", v)} placeholder={"هل محتاج خبرة سابقة؟ | لا، الدبلومة تبدأ من الصفر...\nإيه طرق الدفع؟ | الدفع عبر InstaPay..."} rows={4} />
            <Input label={tx("FAQ (EN) — per line: Question | Answer", "FAQ (EN) — per line: Question | Answer")} value={f.faq_en} onChange={v => set("faq_en", v)} placeholder={"Do I need prior experience? | No, it starts from scratch...\nWhat payment methods? | InstaPay..."} rows={4} />
            <Input label={tx("رابط عرض المنهج (PDF)", "Curriculum presentation URL")} value={f.presentationUrl} onChange={v => set("presentationUrl", v)} placeholder="https://..." />
            <Input label={tx("فيديو تعريفي (رابط)", "Intro video URL")} value={f.introVideoUrl} onChange={v => set("introVideoUrl", v)} placeholder="https://youtube.com/..." />
            <Input label={tx("فيديو معاينة مجانية", "Free preview video URL")} value={f.previewVideoUrl} onChange={v => set("previewVideoUrl", v)} placeholder="https://..." />
            <Input label={tx("ملاحظة درس مجاني", "Free lesson note")} value={f.freeLessonNote} onChange={v => set("freeLessonNote", v)} rows={2} />
            <Input label={tx("جلسة قادمة (للطالب)", "Upcoming session note")} value={f.upcomingSessionNote} onChange={v => set("upcomingSessionNote", v)} rows={2} />
            <Input label={tx("تبويب Google Sheet", "Google Sheet tab name")} value={f.sheetsTabName} onChange={v => set("sheetsTabName", v)} placeholder="course-tab" />
            <Input label={tx("إيميلات إشعار التسجيل (فاصلة)", "Notification emails (comma-separated)")} value={f.notifyEmailsStr} onChange={v => set("notifyEmailsStr", v)} placeholder="a@x.com, b@x.com" rows={2} />
          </div>
        </div>
        <Btn children={tx("إضافة الكورس", "Add Course")} full onClick={submit} style={{ marginTop: 8 }} />
      </Modal>
    );
  };

  const EditCourseModal = ({ course: c }) => {
    const defaultWhoAr = [
      "المبتدئين الذين يريدون دخول المجال من الصفر",
      "أصحاب العمل الذين يريدون فهم التكنولوجيا",
      "المحترفون من مجالات أخرى الراغبون في التحول إلى التقنية",
      "المطورون الذين يريدون رفع مستواهم",
    ];
    const defaultWhoEn = [
      "Beginners who want to enter the field from scratch",
      "Business owners who want to understand technology",
      "Professionals from other fields looking to switch to Tech",
      "Developers who want to level up their skills",
    ];
    const defaultFaqAr = [
      { q:"هل محتاج خبرة سابقة؟",         a:"لا، الدبلومة تبدأ من الصفر وتوصلك للاحتراف. كل اللي محتاجه هو الرغبة والالتزام." },
      { q:"إيه طريقة التدريس؟",            a:"تدريب مباشر Online مع مدرب، مع تسجيلات لكل الجلسات. تقدر تشوف أي درس وقت ما تحب." },
      { q:"هل في شهادة في الآخر؟",          a:"أيوه، بتاخد شهادة معتمدة من Eduzah عند إتمام الدبلومة بنجاح." },
      { q:"إيه طرق الدفع المتاحة؟",         a:"الدفع عبر InstaPay على الرقم المعلن، مع خيار الدفع الكامل (خصم 5%) أو بالأقساط." },
      { q:"هل فيه دعم بعد انتهاء الكورس؟", a:"أيوه، بتنضم لمجتمع خريجي Eduzah ومتاح لك دعم التوظيف وربطك بالشركات." },
    ];
    const defaultFaqEn = [
      { q:"Do I need prior experience?",          a:"No, the diploma starts from scratch and takes you to a professional level. All you need is motivation and commitment." },
      { q:"What is the teaching method?",         a:"Live online training with an instructor, plus recordings of all sessions. You can watch any lesson whenever you want." },
      { q:"Is there a certificate at the end?",   a:"Yes, you receive an Eduzah-accredited certificate upon successfully completing the diploma." },
      { q:"What payment methods are available?",  a:"InstaPay to the published wallet number, with full payment (5% discount) or installments." },
      { q:"Is there support after the course?",   a:"Yes, you join the Eduzah alumni community with access to career support and company connections." },
    ];

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
      techStackText: (Array.isArray(c.techStack) && c.techStack.length)
        ? c.techStack.map((g) => `${g.label}${g.ai ? " | ai" : ""}: ${(g.items || []).join(", ")}`).join("\n")
        : "",
      who_ar: (Array.isArray(c.who_ar) && c.who_ar.length) ? c.who_ar.join("\n") : defaultWhoAr.join("\n"),
      who_en: (Array.isArray(c.who_en) && c.who_en.length) ? c.who_en.join("\n") : defaultWhoEn.join("\n"),
      faq_ar: (Array.isArray(c.faq_ar) && c.faq_ar.length)
        ? c.faq_ar.map(x => `${x.q} | ${x.a}`).join("\n")
        : defaultFaqAr.map(x => `${x.q} | ${x.a}`).join("\n"),
      faq_en: (Array.isArray(c.faq_en) && c.faq_en.length)
        ? c.faq_en.map(x => `${x.q} | ${x.a}`).join("\n")
        : defaultFaqEn.map(x => `${x.q} | ${x.a}`).join("\n"),
      image: c.image || null,
      presentationUrl: c.presentationUrl || "",
      introVideoUrl: c.introVideoUrl || "",
      previewVideoUrl: c.previewVideoUrl || "",
      freeLessonNote: c.freeLessonNote || "",
      upcomingSessionNote: c.upcomingSessionNote || "",
      sheetsTabName: c.sheetsTabName || c.slug || "",
      notifyEmailsStr: (Array.isArray(c.notifyEmails) ? c.notifyEmails : []).join(", "),
    });
    const set = (k, v) => setF(p => ({ ...p, [k]: v }));
    const pickImg = e => { if (e.target.files[0]) readFile(e.target.files[0], d => set("image", d)); };
    const submit = () => {
      if (!f.title || !f.price) { showT("أدخل العنوان والسعر على الأقل", "error"); return; }
      const parseLines = (v) => String(v || "").split("\n").map(s => s.trim()).filter(Boolean);
      const parseFaq = (v) => {
        const out = [];
        for (const line of parseLines(v)) {
          const parts = line.split("|");
          const q = String(parts[0] || "").trim();
          const a = String(parts.slice(1).join("|") || "").trim();
          if (!q || !a) continue;
          out.push({ q, a });
        }
        return out;
      };
      const parseTechStack = (v) => {
        const out = [];
        for (const line of parseLines(v)) {
          const [lhsRaw, rhsRaw] = line.split(":");
          const lhs = String(lhsRaw || "").trim();
          const rhs = String((rhsRaw ?? "")).trim();
          if (!lhs || !rhs) continue;
          const lhsParts = lhs.split("|").map(s => s.trim()).filter(Boolean);
          const label = lhsParts[0] || "";
          const ai = lhsParts.slice(1).some(p => p.toLowerCase() === "ai");
          const items = rhs.split(",").map(s => s.trim()).filter(Boolean);
          if (!label || items.length === 0) continue;
          out.push({ label, items, ...(ai ? { ai: true } : {}) });
        }
        return out;
      };
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
        techStack: parseTechStack(f.techStackText),
        who_ar: parseLines(f.who_ar),
        who_en: parseLines(f.who_en),
        faq_ar: parseFaq(f.faq_ar),
        faq_en: parseFaq(f.faq_en),
        image: f.image,
        presentationUrl: f.presentationUrl?.trim() || null,
        introVideoUrl: f.introVideoUrl?.trim() || null,
        previewVideoUrl: f.previewVideoUrl?.trim() || null,
        freeLessonNote: f.freeLessonNote?.trim() || "",
        upcomingSessionNote: f.upcomingSessionNote?.trim() || "",
        sheetsTabName: (f.sheetsTabName || "").trim() || c.slug || c.id,
        notifyEmails: f.notifyEmailsStr.split(/[\n,]+/).map(s => s.trim().toLowerCase()).filter(e => e.includes("@")),
      });
      showT(tx("تم تحديث الكورس", "Course updated"));
      setModal(null);
    };
    return (
      <Modal title={tx("تعديل الكورس", "Edit Course")} onClose={() => setModal(null)}>
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
            {/* ── Course cover image (edit) ── */}
            <div style={{ marginBottom: 14 }}>
              <label style={{ fontSize: 12, color: "#aaa", fontWeight: 700, display: "block", marginBottom: 8 }}>صورة الغلاف (Cover Image)</label>
              <label style={{ display: "block", cursor: "pointer", borderRadius: 12, overflow: "hidden", position: "relative", border: `2px dashed ${f.image ? "transparent" : C.border}` }}>
                {f.image
                  ? <img src={f.image} alt="" style={{ width: "100%", height: 160, objectFit: "cover", display: "block" }} />
                  : <div style={{ height: 130, background: "rgba(255,255,255,.04)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 8 }}>
                      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke={C.muted} strokeWidth="1.5"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
                      <span style={{ fontSize: 12, color: C.muted }}>اضغط لرفع صورة الكورس</span>
                      <span style={{ fontSize: 10, color: "rgba(255,255,255,.3)" }}>JPG / PNG / WEBP</span>
                    </div>
                }
                <input type="file" accept="image/*" onChange={pickImg} style={{ display: "none" }} />
              </label>
              {f.image && (
                <div style={{ marginTop: 6, display: "flex", gap: 8 }}>
                  <label style={{ flex: 1, cursor: "pointer", background: "rgba(255,255,255,.06)", border: `1px solid ${C.border}`, borderRadius: 8, padding: "6px 10px", fontSize: 11, color: C.muted, textAlign: "center" }}>
                    تغيير الصورة
                    <input type="file" accept="image/*" onChange={pickImg} style={{ display: "none" }} />
                  </label>
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
            <Input label={tx("رابط عرض المنهج (PDF أو رابط)", "Curriculum presentation URL (PDF or link)")} value={f.presentationUrl} onChange={v => set("presentationUrl", v)} placeholder="https://..." />
            <Input label={tx("رابط فيديو تعريفي (YouTube/Vimeo)", "Intro video URL (YouTube/Vimeo)")} value={f.introVideoUrl} onChange={v => set("introVideoUrl", v)} placeholder="https://youtube.com/..." />
            <Input label={tx("فيديو معاينة مجانية", "Free preview video URL")} value={f.previewVideoUrl} onChange={v => set("previewVideoUrl", v)} />
            <Input label={tx("ملاحظة درس مجاني", "Free lesson note")} value={f.freeLessonNote} onChange={v => set("freeLessonNote", v)} rows={2} />
            <Input label={tx("جلسة قادمة (للطالب)", "Upcoming session note")} value={f.upcomingSessionNote} onChange={v => set("upcomingSessionNote", v)} rows={2} />
            <Input label={tx("تبويب Google Sheet", "Google Sheet tab name")} value={f.sheetsTabName} onChange={v => set("sheetsTabName", v)} />
            <Input label={tx("إيميلات إشعار التسجيل (مفصولة بفاصلة)", "Enrollment notification emails (comma-separated)")} value={f.notifyEmailsStr} onChange={v => set("notifyEmailsStr", v)} placeholder="admin@example.com, team@example.com" rows={2} />
          </div>
        </div>
        <Btn children={tx("حفظ التعديلات", "Save Changes")} full onClick={submit} style={{ marginTop: 8 }} />
      </Modal>
    );
  };

  const CreateAdminModal = () => {
    const [f, setF] = useState({ name: "", email: "", password: "" });
    const set = (k, v) => setF(p => ({ ...p, [k]: v }));
    const submit = async () => {
      if (!f.name.trim() || !f.email.includes("@") || f.password.length < 8) {
        showT(tx("أدخل اسماً وبريداً صالحاً وكلمة مرور 8 أحرف على الأقل", "Enter name, valid email, and password (min 8 chars)"), "error");
        return;
      }
      const r = await createAdminAccount(f);
      if (!r.ok) {
        showT(r.code === "NOT_DEPLOYED"
          ? tx("فعّل Cloud Functions (createAdminAccount) من Firebase", "Deploy Cloud Functions (createAdminAccount) in Firebase")
          : tx("تعذر إنشاء الحساب", "Could not create account"), "error");
        return;
      }
      showT(tx("تم إنشاء حساب المدير", "Admin account created"));
      setModal(null);
    };
    return (
      <Modal title={tx("إضافة مدير جديد", "Create Admin Account")} onClose={() => setModal(null)}>
        <p style={{ fontSize: 12, color: C.muted, marginBottom: 12, lineHeight: 1.6 }}>
          {tx("يُنشئ حساباً بصلاحيات مدير كاملة. يتطلب نشر دالة createAdminAccount على Firebase.", "Creates a full-permission admin account. Requires the createAdminAccount Cloud Function to be deployed.")}
        </p>
        <Input label={tx("الاسم الكامل", "Full name")} value={f.name} onChange={v => set("name", v)} />
        <Input label="Email" value={f.email} onChange={v => set("email", v)} />
        <Input label={tx("كلمة المرور", "Password")} value={f.password} onChange={v => set("password", v)} type="password" />
        <Btn children={tx("إنشاء المدير", "Create Admin")} full onClick={submit} style={{ marginTop: 12 }} />
      </Modal>
    );
  };

  /* ─────────── Create Instructor Modal ─────────── */
  const CreateInstructorModal = () => {
    const [f, setF] = useState({ name: "", email: "", password: "", phone: "" });
    const set = (k, v) => setF(p => ({ ...p, [k]: v }));
    const [creating, setCreating] = useState(false);
    const submit = async () => {
      if (!f.name.trim() || !f.email.includes("@") || f.password.length < 6) {
        showT(tx("أدخل اسماً وبريداً صالحاً وكلمة مرور 6 أحرف على الأقل", "Enter name, valid email, and password (min 6 chars)"), "error");
        return;
      }
      setCreating(true);
      const r = await createInstructorAccount(f);
      setCreating(false);
      if (!r.ok) {
        showT(
          r.code === "EMAIL_EXISTS"
            ? tx("البريد الإلكتروني مسجّل بالفعل", "Email already registered")
            : tx("تعذر إنشاء الحساب: " + r.code, "Could not create account: " + r.code),
          "error"
        );
        return;
      }
      showT(tx("تم إنشاء حساب المدرب بنجاح", "Instructor account created"));
      setModal(null);
    };
    return (
      <Modal title={tx("إضافة مدرب جديد", "Create Instructor Account")} onClose={() => setModal(null)}>
        <p style={{ fontSize: 12, color: C.muted, marginBottom: 12, lineHeight: 1.6 }}>
          {tx("ينشئ حساب مدرب مباشرةً دون التأثير على جلستك الحالية.", "Creates an instructor account directly without affecting your current session.")}
        </p>
        <Input label={tx("الاسم الكامل *", "Full name *")} value={f.name} onChange={v => set("name", v)} />
        <Input label="Email *" value={f.email} onChange={v => set("email", v)} />
        <Input label={tx("رقم الهاتف", "Phone (optional)")} value={f.phone} onChange={v => set("phone", v)} placeholder="+201xxxxxxxxx" />
        <Input label={tx("كلمة المرور * (6 أحرف على الأقل)", "Password * (min 6 chars)")} value={f.password} onChange={v => set("password", v)} type="password" />
        <Btn children={creating ? tx("جاري الإنشاء…", "Creating…") : tx("إنشاء حساب المدرب", "Create Instructor")} full disabled={creating} onClick={submit} style={{ marginTop: 12, background: C.purple }} />
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
      if (!f.name || !f.username || !f.password) { showT(tx("أدخل الاسم واسم المستخدم وكلمة المرور", "Enter name, username and password"), "error"); return; }
      addTrainer(f);
      showT(tx("تم إضافة المدرب بنجاح", "Trainer added successfully"));
      setModal(null);
    };
    return (
      <Modal title={tx("إضافة مدرب جديد", "Add New Trainer")} onClose={() => setModal(null)}>
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
        <Btn children={tx("إضافة المدرب", "Add Trainer")} full onClick={submit} style={{ marginTop: 8 }} />
      </Modal>
    );
  };

  /* ─────────── readFile helper — resizes to max 900px & 200KB ─────────── */
  const readFile = (file, cb) => {
    const r = new FileReader();
    r.onloadend = () => {
      const img = new Image();
      img.onload = () => {
        const MAX = 900;
        let { width: w, height: h } = img;
        if (w > MAX) { h = Math.round(h * MAX / w); w = MAX; }
        const canvas = document.createElement("canvas");
        canvas.width = w; canvas.height = h;
        canvas.getContext("2d").drawImage(img, 0, 0, w, h);
        // Try quality 0.75 first, drop to 0.5 if still > 200 KB
        let data = canvas.toDataURL("image/jpeg", 0.75);
        if (data.length > 200_000) data = canvas.toDataURL("image/jpeg", 0.5);
        cb(data);
      };
      img.src = r.result;
    };
    r.readAsDataURL(file);
  };

  const EditUserModal = ({ user }) => {
    const [f, setF] = useState({
      name: user.name,
      email: user.email,
      phone: user.phone || "",
      role: user.role || "student",
    });
    const set = (k, v) => setF(p => ({ ...p, [k]: v }));
    const submit = () => {
      if (!f.name.trim() || !f.email.includes("@")) {
        showT(tx("بيانات غير صالحة", "Invalid data"), "error");
        return;
      }
      const dup = users.filter(x => x.id !== user.id).some(x => x.email.toLowerCase() === f.email.trim().toLowerCase());
      if (dup) {
        showT(tx("البريد مستخدم من قبل مستخدم آخر", "Email already used by another user"), "error");
        return;
      }
      adminUpdateUser(user.id, {
        name: f.name.trim(),
        email: f.email.trim(),
        phone: f.phone.trim(),
        ...(user.role !== "admin" && { role: f.role }),
      });
      showT(tx("تم تحديث المستخدم", "User updated"));
      setModal(null);
    };
    return (
      <Modal title={tx("تعديل مستخدم", "Edit user")} onClose={() => setModal(null)}>
        <Input label={tx("الاسم", "Name")} value={f.name} onChange={v => set("name", v)} />
        <Input label="Email" value={f.email} onChange={v => set("email", v)} />
        <Input label={tx("الهاتف", "Phone")} value={f.phone} onChange={v => set("phone", v)} />
        {user.role !== "admin" && (
          <Select
            label={tx("نوع الحساب", "Account type")}
            value={f.role}
            onChange={v => set("role", v)}
            options={[
              { v: "user", l: tx("مستخدم (بدون كورس)", "User (no course yet)") },
              { v: "student", l: tx("طالب", "Student") },
              { v: "instructor", l: tx("مدرب", "Instructor") },
            ]}
          />
        )}
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
      if (!f.title_ar.trim() && !f.title_en.trim()) { showT(tx("أدخل عنوان البرنامج", "Enter program title"), "error"); return; }
      if (editing) {
        updateProgram(editing.id, f);
        showT(tx("تم تحديث البرنامج", "Program updated"));
      } else {
        addProgram(f);
        showT(tx("تم إضافة البرنامج", "Program added"));
      }
      setModal(null);
    };

    return (
      <Modal title={editing ? tx("تعديل البرنامج","Edit Program") : tx("إضافة برنامج جديد","Add New Program")} onClose={() => setModal(null)}>
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
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#aaa" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
            <span style={{ fontSize:12, color:"#aaa" }}>{f.image ? tx("تم رفع الصورة","Image uploaded") : tx("اضغط لرفع صورة (JPG/PNG)","Click to upload image (JPG/PNG)")}</span>
            <input type="file" accept="image/*" onChange={pickImage} style={{ display:"none" }} />
          </label>
          {f.image && (
            <div style={{ marginTop:8, display:"flex", alignItems:"center", gap:10 }}>
              <img src={f.image} alt="" style={{ width:80, height:50, objectFit:"cover", borderRadius:8 }} />
              <Btn children={tx("إزالة","Remove")} sm v="danger" onClick={()=>set("image",null)} />
            </div>
          )}
        </div>

        <Btn children={editing ? tx("حفظ التعديلات","Save Changes") : tx("إضافة البرنامج","Add Program")} full onClick={submit} style={{ marginTop:14 }} />
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
      if (!f.name.trim() || !f.comment_ar.trim()) { showT(tx("أدخل الاسم والتعليق","Enter name and comment"), "error"); return; }
      addTestimonial(f);
      showT(tx("تم إضافة الرأي","Review added"));
      setModal(null);
    };

    return (
      <Modal title={tx("إضافة رأي جديد","Add New Review")} onClose={() => setModal(null)}>
        <Input label="اسم الطالب *" value={f.name} onChange={v=>set("name",v)} placeholder="أحمد محمد" />

        <div style={{ marginBottom:10 }}>
          <label style={{ fontSize:12, color:"#aaa", fontWeight:700, display:"block", marginBottom:6 }}>صورة الطالب (اختياري)</label>
          <label style={{ display:"flex", alignItems:"center", gap:10, cursor:"pointer", background:"rgba(255,255,255,.05)", border:`1.5px dashed ${C.border}`, borderRadius:10, padding:"10px 14px" }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#aaa" strokeWidth="2"><circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/></svg>
            <span style={{ fontSize:12, color:"#aaa" }}>{f.image ? tx("تم رفع الصورة","Image uploaded") : tx("اضغط لرفع صورة الطالب","Click to upload student photo")}</span>
            <input type="file" accept="image/*" onChange={pickImage} style={{ display:"none" }} />
          </label>
          {f.image && (
            <div style={{ marginTop:8, display:"flex", alignItems:"center", gap:10 }}>
              <img src={f.image} alt="" style={{ width:44, height:44, objectFit:"cover", borderRadius:"50%" }} />
              <Btn children={tx("إزالة","Remove")} sm v="danger" onClick={()=>set("image",null)} />
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

        <Btn children={tx("إضافة الرأي","Add Review")} full onClick={submit} style={{ marginTop:14 }} />
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
      if (!f.name.trim() || !f.role_ar.trim()) { showT(tx("أدخل الاسم والمنصب","Enter name and role"), "error"); return; }
      const em = f.email.trim();
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(em)) {
        showT(tx("بريد إلكتروني غير صالح", "Invalid email"), "error");
        return;
      }
      const li = (f.linkedin || "").trim();
      if (li && !li.startsWith("https://www.linkedin.com/")) {
        showT(tx("رابط LinkedIn غير صالح", "Invalid LinkedIn URL"), "error");
        return;
      }
      if (editing) {
        updateTeamMember(editing.id, { ...f, email: em, linkedin: li });
        showT(tx("تم تحديث بيانات العضو","Member updated"));
      } else {
        addTeamMember({ ...f, email: em, linkedin: li });
        showT(tx("تم إضافة عضو الفريق","Team member added"));
      }
      setModal(null);
    };

    return (
      <Modal title={editing ? tx("تعديل عضو الفريق","Edit Team Member") : tx("إضافة عضو جديد","Add New Member")} onClose={() => setModal(null)}>
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
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#aaa" strokeWidth="2"><circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/></svg>
            <span style={{ fontSize:12, color:"#aaa" }}>{f.image ? tx("تم رفع الصورة","Image uploaded") : tx("اضغط لرفع صورة العضو","Click to upload member photo")}</span>
            <input type="file" accept="image/*" onChange={pickImage} style={{ display:"none" }} />
          </label>
          {f.image && (
            <div style={{ marginTop:8, display:"flex", alignItems:"center", gap:10 }}>
              <img src={f.image} alt="" style={{ width:48, height:48, objectFit:"cover", borderRadius:"50%" }} />
              <Btn children={tx("إزالة","Remove")} sm v="danger" onClick={()=>set("image",null)} />
            </div>
          )}
        </div>

        <Input label="نبذة (عربي)"         value={f.bio_ar}   onChange={v=>set("bio_ar",v)}   placeholder="خبرة ..." rows={2} />
        <Input label="Bio (English)"       value={f.bio_en}   onChange={v=>set("bio_en",v)}   placeholder="Expert in ..." rows={2} />

        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
          <Input label="البريد الإلكتروني *" value={f.email}    onChange={v=>set("email",v)}    placeholder="name@eduzah.com" />
          <Input label={tx("LinkedIn (اختياري)", "LinkedIn (optional)")} value={f.linkedin} onChange={v=>set("linkedin",v)} placeholder="https://www.linkedin.com/in/..." />
        </div>

        <Btn children={editing ? tx("حفظ التعديلات","Save Changes") : tx("إضافة العضو","Add Member")} full onClick={submit} style={{ marginTop:14 }} />
      </Modal>
    );
  };

  /* ─────────── Add Exam Modal ─────────── */
  const AddExamModal = () => {
    const [f, setF] = useState({ title:"", courseId: courses[0]?.id || "", type:"mcq", dueDate:"", duration:"45", description:"" });
    const set = (k, v) => setF(p => ({ ...p, [k]: v }));

    const [questions,  setQuestions]  = useState([]);
    const [mcqText,    setMcqText]    = useState("");
    const [mcqChoices, setMcqChoices] = useState(["", "", "", ""]);
    const [mcqCorrect, setMcqCorrect] = useState(0);
    const choiceLabels = ["A", "B", "C", "D"];

    const addMCQQuestion = () => {
      if (!mcqText.trim()) { showT(tx("اكتب نص السؤال","Enter question text"), "error"); return; }
      if (mcqChoices.filter(c => c.trim()).length < 2) { showT(tx("أضف اختيارين على الأقل","Add at least 2 choices"), "error"); return; }
      if (!mcqChoices[mcqCorrect]?.trim()) { showT(tx("اختر الإجابة الصحيحة","Select correct answer"), "error"); return; }
      setQuestions(p => [...p, { q: mcqText, choices: mcqChoices, correct: mcqCorrect }]);
      setMcqText(""); setMcqChoices(["", "", "", ""]); setMcqCorrect(0);
    };

    const submit = () => {
      if (!f.title || !f.courseId || !f.dueDate) { showT(tx("أكمل البيانات الأساسية","Fill in the required fields"), "error"); return; }
      addExam({ ...f, questions });
      showT(tx("تم إضافة الامتحان بنجاح","Exam added successfully"));
      setModal(null);
    };

    return (
      <Modal title={tx("إضافة امتحان / تاسك جديد","Add Exam / Task")} onClose={() => setModal(null)}>
        <Input label="عنوان الامتحان *" value={f.title} onChange={v => set("title", v)} placeholder="امتحان HTML & CSS الأول" />
        <Select label="الكورس *" value={f.courseId} onChange={v => set("courseId", v)}
          options={courses.map(c => ({ v: c.id, l: c.title }))} />
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          <Select label="النوع" value={f.type} onChange={v => { set("type", v); setQuestions([]); }}
            options={[{v:"mcq",l:"MCQ"},{v:"task",l:"Task"}]} />
          <Input label="الموعد النهائي *" value={f.dueDate} onChange={v => set("dueDate", v)} placeholder="15 أبريل 2025" />
        </div>
        {f.type === "mcq" && (
          <Input label="المدة (دقيقة)" value={f.duration} onChange={v => set("duration", v)} placeholder="45" />
        )}
        {f.type === "task" && (
          <Input label="وصف المهمة" value={f.description} onChange={v => set("description", v)} placeholder="ابني صفحة Landing Page باستخدام..." rows={3} />
        )}

        {/* MCQ question builder */}
        {f.type === "mcq" && (
          <div style={{ marginBottom: 12, background: "rgba(255,255,255,.03)", border: `1px solid ${C.border}`, borderRadius: 12, padding: "14px 14px 10px" }}>
            <div style={{ fontSize: 12, color: C.orange, fontWeight: 700, marginBottom: 10 }}>{tx("إضافة سؤال اختيار متعدد","Add MCQ question")}</div>
            <Input label={tx("نص السؤال *","Question text *")} value={mcqText} onChange={v => setMcqText(v)} placeholder={tx("اكتب السؤال هنا...","Type the question...")} />
            <div style={{ fontSize: 12, color: C.muted, fontWeight: 700, margin: "8px 0 6px" }}>{tx("الاختيارات","Choices")}</div>
            {mcqChoices.map((ch, i) => (
              <div key={i} style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 7 }}>
                <div onClick={() => setMcqCorrect(i)} style={{ width: 18, height: 18, borderRadius: "50%", flexShrink: 0, cursor: "pointer", border: `2px solid ${mcqCorrect === i ? C.success : C.border}`, background: mcqCorrect === i ? C.success : "transparent", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  {mcqCorrect === i && <div style={{ width: 7, height: 7, borderRadius: "50%", background: "#fff" }} />}
                </div>
                <div style={{ width: 22, height: 22, borderRadius: 6, background: mcqCorrect === i ? `${C.success}22` : "rgba(255,255,255,.07)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 800, color: mcqCorrect === i ? C.success : C.muted, flexShrink: 0 }}>
                  {choiceLabels[i]}
                </div>
                <input value={ch} onChange={e => { const n = [...mcqChoices]; n[i] = e.target.value; setMcqChoices(n); }}
                  placeholder={tx(`الاختيار ${choiceLabels[i]}`,`Choice ${choiceLabels[i]}`)}
                  style={{ flex: 1, background: "rgba(255,255,255,.06)", border: `1.5px solid ${mcqCorrect === i ? C.success : C.border}`, borderRadius: 8, padding: "7px 10px", color: "#fff", fontFamily: "inherit", fontSize: 12, outline: "none" }} />
              </div>
            ))}
            <div style={{ fontSize: 10, color: C.muted, marginBottom: 8 }}>{tx("اضغط على الدائرة لتحديد الإجابة الصحيحة","Click the circle to mark the correct answer")}</div>
            <Btn children={tx("+ إضافة السؤال","+ Add question")} sm v="outline" onClick={addMCQQuestion} />
          </div>
        )}

        {/* Questions list */}
        {f.type === "mcq" && questions.length > 0 && (
          <div style={{ marginBottom: 12 }}>
            <div style={{ fontSize: 11, color: C.muted, marginBottom: 6 }}>{questions.length} {tx("سؤال مضاف","question(s) added")}</div>
            {questions.map((q, i) => (
              <div key={i} style={{ background: "rgba(255,255,255,.05)", borderRadius: 9, padding: "8px 11px", marginBottom: 6 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
                  <div style={{ fontSize: 12, fontWeight: 600, flex: 1 }}>{i + 1}. {q.q}</div>
                  <div style={{ display: "flex", gap: 6, alignItems: "center", flexShrink: 0 }}>
                    <Badge color={C.success}>{choiceLabels[q.correct]}: {q.choices[q.correct]?.slice(0, 20)}</Badge>
                    <span style={{ color: C.danger, cursor: "pointer", fontSize: 13 }} onClick={() => setQuestions(p => p.filter((_, j) => j !== i))}>✕</span>
                  </div>
                </div>
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 6 }}>
                  {q.choices.filter(c => c.trim()).map((c, ci) => (
                    <span key={ci} style={{ fontSize: 10, padding: "2px 8px", borderRadius: 5, background: ci === q.correct ? `${C.success}22` : "rgba(255,255,255,.06)", color: ci === q.correct ? C.success : C.muted, border: `1px solid ${ci === q.correct ? C.success : "transparent"}` }}>
                      {choiceLabels[ci]}. {c}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        <Btn children={tx("إضافة الامتحان","Add Exam")} full onClick={submit} style={{ marginTop: 8 }} />
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
            {k === "requests" && pendingEnrollments.length > 0 && (
              <span style={{ background: C.danger, borderRadius: "50%", width: 17, height: 17, fontSize: 9, display: "inline-flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>{pendingEnrollments.length}</span>
            )}
          </div>
        ))}
      </div>

      {/* Content */}
      <div style={{ padding: "22px", overflow: "auto" }}>
        {currentUser?.role === "admin" && enrollmentLoadError && (
          <div style={{ marginBottom: 14, padding: "12px 14px", borderRadius: 10, background: "rgba(239,68,68,.12)", border: "1px solid rgba(239,68,68,.35)", fontSize: 12, color: "#fecaca" }}>
            {tx("تعذر مزامنة طلبات التسجيل في الكورسات. تحقق من صلاحيات الأدمن في Firestore: ", "Could not sync course enrollment requests. Check admin Firestore permissions: ")}
            {enrollmentLoadError}
          </div>
        )}

        {/* ── Overview ── */}
        {tab === "overview" && (
          <div>
            <h2 style={{ fontWeight: 900, fontSize: 20, marginBottom: 20 }}>{tx("نظرة عامة", "Dashboard overview")}</h2>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(130px,1fr))", gap: 12, marginBottom: 24 }}>
              {[
                { l: tx("الطلاب", "Students"),     v: studentsEnr.length, c: C.red },
                { l: tx("المدربين", "Instructors"), v: instructors.length, c: C.purple },
                { l: tx("الكورسات", "Courses"),     v: courses.length,     c: C.orange },
                { l: tx("طلبات كورسات", "Course requests"), v: pendingEnrollments.length, c: C.warning },
              ].map(s => (
                <Card key={s.l} style={{ padding: "14px 12px" }}>
                  <div style={{ fontSize: 22, fontWeight: 900, color: s.c }}>{s.v}</div>
                  <div style={{ color: C.muted, fontSize: 12 }}>{s.l}</div>
                </Card>
              ))}
            </div>

            {/* ── Analytics filter ── */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12, marginBottom: 18 }}>
              <div style={{ fontWeight: 800, fontSize: 16 }}>{tx('تحليلات المنصة', 'Platform Analytics')}</div>
              <Select
                label=''
                value={analyticsRange}
                onChange={setAnalyticsRange}
                options={[
                  { v: 'all', l: tx('كل الفترة', 'All time') },
                  { v: '30d', l: tx('٣٠ يوم', '30 days') },
                  { v: '7d',  l: tx('٧ أيام', '7 days') },
                ]}
              />
            </div>

            {/* ── Stat cards ── */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(170px,1fr))', gap: 14, marginBottom: 22 }}>
              <StatCard label={tx('المستخدمون (الفترة)', 'Users (range)')} value={usersInRange.length} icon='👥' color={C.red} />
              <StatCard label={tx('متعلمون موافق عليهم', 'Approved learners')} value={approvedLearners.length} icon='✅' color={C.orange} />
              <StatCard label={tx('طلاب بكورسات', 'Active students')} value={studentsEnr.length} icon='🎓' color={C.success} />
              <StatCard label={tx('إجمالي التسجيلات', 'Total enrollments')} value={totalEnrollments} icon='📚' color={C.purple} />
            </div>

            {/* ── Charts ── */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(300px,1fr))', gap: 16, marginBottom: 22 }}>
              <BarChart
                title={tx('أكثر الكورسات تسجيلاً', 'Top courses by enrollments')}
                color={C.red}
                data={courseEnrollBars.map(({ c, n }) => ({
                  label: ar ? c.title : (c.title_en || c.title),
                  value: n,
                  color: c.color || C.red,
                }))}
              />
              <DonutChart
                title={tx('توزيع المستخدمين', 'User distribution')}
                data={[
                  { label: tx('طلاب', 'Students'), value: users.filter(u => u.role === 'student').length, color: C.red },
                  { label: tx('مستخدمون', 'Users'), value: users.filter(u => u.role === 'user').length, color: C.orange },
                  { label: tx('مدربون', 'Trainers'), value: instructors.length, color: C.purple },
                  { label: tx('مدراء', 'Admins'), value: adminsList.length, color: '#60a5fa' },
                ].filter(d => d.value > 0)}
              />
            </div>

            {pendingEnrollments.length > 0 && (
              <div>
                <div style={{ fontWeight: 800, fontSize: 14, marginBottom: 12, display: "flex", alignItems: "center", gap: 8 }}>
                  {tx("طلبات تسجيل كورسات", "New course applications")} <Badge color={C.danger}>{pendingEnrollments.length}</Badge>
                </div>
                {pendingEnrollments.slice(0, 5).map((r) => (
                  <Card key={r.id} style={{ padding: "13px 15px", marginBottom: 9 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10 }}>
                      <div>
                        <div style={{ fontWeight: 700, fontSize: 13 }}>{r.studentName}</div>
                        <div style={{ color: C.muted, fontSize: 11 }}>{r.studentEmail} · {r.studentPhone}</div>
                        <Badge color={C.orange}>{enrollmentCourseLabel(r)}</Badge>
                        {r.courseId != null && String(r.courseId) && (
                          <div style={{ fontSize: 10, color: C.muted, marginTop: 4 }}>{tx("معرّف الكورس", "Course ID")}: {String(r.courseId)}</div>
                        )}
                      </div>
                      <div style={{ display: "flex", gap: 8 }}>
                        <Btn children={tx("قبول", "Approve")} v="success" sm onClick={async () => { await approveEnrollmentRequest(r.id); await loadEnrollmentRequests(); showT(tx("تم قبول الطلب", "Request approved")); }} />
                        <Btn children={tx("رفض", "Reject")} v="danger" sm onClick={() => { setRejectReason(""); setRejectModal({ id: r.id }); }} />
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            )}
            {pending.length > 0 && (
              <div style={{ marginTop: 16 }}>
                <div style={{ fontWeight: 800, fontSize: 14, marginBottom: 12, color: C.muted }}>{tx("حسابات قديمة بانتظار الموافقة (ترحيل)", "Legacy accounts pending approval")}</div>
                {pending.map(u => (
                  <Card key={u.id} style={{ padding: "13px 15px", marginBottom: 9 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <div style={{ width: 36, height: 36, borderRadius: "50%", background: "linear-gradient(135deg,#d91b5b,#b51549)", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: 14, flexShrink: 0 }}>{u.avatar}</div>
                        <div>
                          <div style={{ fontWeight: 700, fontSize: 13 }}>{u.name}</div>
                          <div style={{ color: C.muted, fontSize: 11 }}>{u.email}</div>
                        </div>
                      </div>
                      <Btn children={tx("تفعيل الحساب", "Activate account")} v="success" sm onClick={() => { approveUser(u.id); showT(tx("تم التفعيل", "Activated")); }} />
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
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16, flexWrap: "wrap", gap: 10 }}>
              <div>
                <h2 style={{ fontWeight: 900, fontSize: 18, margin: 0 }}>{tx("إدارة المستخدمين", "User management")}</h2>
                <p style={{ color: C.muted, fontSize: 11, margin: "8px 0 0", lineHeight: 1.5, maxWidth: 560 }}>
                  {tx("للمتعلمين: زر «إضافة / إزالة كورس» يفتح قائمة كل الكورسات. من تبويب «الكورسات» يمكنك أيضاً «تسجيل» طلاب في كورس محدد.", "For learners: «Add / remove courses» lists all courses. From the «Courses» tab you can also «Enroll» students into one course.")}
                </p>
              </div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <Btn children={tx("+ مدرب جديد", "+ New Instructor")} onClick={() => setModal({ type: "create-instructor" })} style={{ background: C.purple }} />
                {superAdmin && (
                  <Btn children={tx("+ مدير جديد", "+ New Admin")} onClick={() => setModal({ type: "create-admin" })} style={{ background: C.orange, color: "#1a0f24" }} />
                )}
              </div>
            </div>

            {[
              [tx("المدراء", "Admins"), adminsList],
              [tx("المدربون", "Instructors"), instructors],
              [tx("الطلاب (مسجّلون في كورسات)", "Students (enrolled)"), studentsEnr],
              [tx("المستخدمون (مسجّلون دون تسجيل كورس)", "Users (registered, not enrolled)"), usersOnly],
            ].map(([sectionTitle, list]) => (
              <div key={String(sectionTitle)} style={{ marginBottom: 28 }}>
                <div style={{ fontWeight: 800, fontSize: 13, color: C.orange, marginBottom: 10, letterSpacing: 0.5 }}>{sectionTitle}</div>
                <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
                  {list.length === 0 && (
                    <Card style={{ padding: 16 }}><div style={{ color: C.muted, fontSize: 12 }}>{tx("لا يوجد", "None")}</div></Card>
                  )}
                  {list.map(u => (
                    <Card key={u.id} style={{ padding: "12px 14px" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 9 }}>
                        <div style={{ display: "flex", gap: 9, alignItems: "center" }}>
                          <div style={{ width: 36, height: 36, borderRadius: "50%", background: u.role === "instructor" ? "linear-gradient(135deg,#672d86,#321d3d)" : "linear-gradient(135deg,#d91b5b,#b51549)", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: 14, flexShrink: 0 }}>{u.avatar}</div>
                          <div>
                            <div style={{ fontWeight: 700, fontSize: 13 }}>{u.name}</div>
                            <div style={{ color: C.muted, fontSize: 11 }}>{u.email}</div>
                            <div style={{ display: "flex", gap: 5, marginTop: 4, flexWrap: "wrap" }}>
                              <Badge color={u.role === "instructor" ? C.purple : u.role === "admin" ? C.orange : C.red}>{u.role}</Badge>
                              <Badge color={u.status === "approved" ? C.success : u.status === "pending" ? C.warning : C.danger}>{u.status}</Badge>
                              {(u.enrolledCourses || []).length > 0 && <Badge color={C.muted}>{u.enrolledCourses.length} {tx("كورسات", "courses")}</Badge>}
                            </div>
                            {(u.role === "student" || u.role === "user") && (u.enrolledCourses || []).length > 0 && (
                              <div style={{ fontSize: 10, color: C.muted, marginTop: 6, lineHeight: 1.5, maxWidth: 420 }}>
                                <span style={{ fontWeight: 700, color: "#c4b5fd" }}>{tx("مسجّل في:", "Enrolled in:")} </span>
                                {(u.enrolledCourses || []).map((e) => {
                                  const c = courses.find((x) => String(x.id) === String(e.courseId));
                                  return c ? (ar ? c.title : (c.title_en || c.title)) : String(e.courseId);
                                }).join(ar ? "، " : ", ")}
                              </div>
                            )}
                            {(u.role === "student" || u.role === "user") && (() => {
                              const reqs = courseFormRequestsForUser(u).sort((a, b) => requestCreatedMs(b) - requestCreatedMs(a));
                              if (!reqs.length) return null;
                              return (
                                <div style={{ marginTop: 8, paddingTop: 8, borderTop: `1px solid ${C.border}` }}>
                                  <div style={{ fontSize: 10, fontWeight: 700, color: C.orange, marginBottom: 6 }}>{tx("فورم تسجيل كورس", "Course signup form")}</div>
                                  <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                                    {reqs.map((r) => {
                                      const st = r.enrollmentStatus ?? "pending";
                                      const col = st === "approved" ? C.success : st === "rejected" ? C.danger : C.warning;
                                      const stLabel = st === "approved" ? tx("مقبول", "Approved") : st === "rejected" ? tx("مرفوض", "Rejected") : tx("قيد المراجعة", "Pending");
                                      return (
                                        <div key={r.id} style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 6, fontSize: 11 }}>
                                          <Badge color={col}>{stLabel}</Badge>
                                          <span style={{ fontWeight: 600 }}>{enrollmentCourseLabel(r)}</span>
                                          <span style={{ color: C.muted, fontSize: 10 }}>({tx("معرّف", "ID")}: {String(r.courseId || "—")})</span>
                                        </div>
                                      );
                                    })}
                                  </div>
                                </div>
                              );
                            })()}
                          </div>
                        </div>
                        <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
                          {u.role !== "admin" && <Btn children={tx("تعديل", "Edit")} sm v="outline" onClick={() => setModal({ type: "edit-user", user: u })} aria-label={tx("تعديل المستخدم", "Edit user")} />}
                          {u.status === "pending" && u.role !== "admin" && (
                            <>
                              <Btn children="✅" v="success" sm onClick={() => { approveUser(u.id); showT(tx("تم القبول", "Approved")); }} aria-label={tx("قبول", "Approve")} />
                              <Btn children="❌" v="danger" sm onClick={() => { rejectUser(u.id); showT(tx("تم الرفض", "Rejected"), "error"); }} aria-label={tx("رفض", "Reject")} />
                            </>
                          )}
                          {u.status === "rejected" && u.role !== "admin" && <Btn children="🔄" v="success" sm onClick={() => { approveUser(u.id); showT(tx("تم التفعيل", "Reactivated")); }} aria-label={tx("إعادة تفعيل", "Reactivate")} />}
                          {(u.role === "student" || u.role === "user") && u.status !== "rejected" && (
                            <Btn children={tx("إضافة / إزالة كورس", "Add / remove courses")} v="orange" sm onClick={() => setModal({ type: "enroll", user: u })} title={tx("تسجيل الطالب في كورس أو إزالته منه", "Enroll this learner in a course or remove them")} />
                          )}
                          {u.role === "instructor" && u.status === "approved" && <Btn children={tx("تعيين", "Assign")} v="purple" sm onClick={() => setModal({ type: "assign", user: u })} />}
                          {u.role !== "admin" && u.id !== currentUser?.id && (
                            <Btn children={tx("حذف", "Delete")} sm v="danger"
                              onClick={async () => {
                                if (!window.confirm(ar ? `هل تريد حذف حساب "${u.name}" نهائياً؟` : `Permanently delete "${u.name}"?`)) return;
                                const r = await deleteUser(u.id);
                                if (r.ok) showT(ar ? `تم حذف ${u.name}` : `${u.name} deleted`);
                                else showT(ar ? "تعذر الحذف: " + r.code : "Delete failed: " + r.code, "error");
                              }}
                              aria-label={tx("حذف المستخدم", "Delete user")} />
                          )}
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ── Requests ── */}
        {tab === "requests" && (
          <div>
            <h2 style={{ fontWeight: 900, fontSize: 18, marginBottom: 8 }}>{tx("طلبات التسجيل في الكورسات", "Course enrollment requests")}</h2>
            <p style={{ color: C.muted, fontSize: 12, marginBottom: 16, lineHeight: 1.6 }}>
              {tx("الموافقة هنا تمنح الطالب صلاحية الكورس على المنصة فقط — لا تتحكم في إنشاء الحسابات.", "Approving here grants course access on the platform only — not account creation.")}
            </p>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 16 }}>
              {[
                ["pending", tx("معلقة", "Pending")],
                ["approved", tx("مقبولة", "Approved")],
                ["rejected", tx("مرفوضة", "Rejected")],
                ["all", tx("الكل", "All")],
              ].map(([v, l]) => (
                <Btn key={v} sm v={enrollFilter === v ? "primary" : "outline"} onClick={() => setEnrollFilter(v)} children={l} />
              ))}
            </div>
            {(() => {
              const filtered = enrollmentRequests.filter((r) => {
                const st = r.enrollmentStatus ?? "pending";
                if (enrollFilter === "all") return true;
                return st === enrollFilter;
              });
              if (filtered.length === 0) {
                return <Card style={{ padding: 32, textAlign: "center" }}><div style={{ color: C.muted }}>{tx("لا توجد طلبات", "No requests")}</div></Card>;
              }
              return (
                <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
                  {filtered.map((r) => {
                    const st = r.enrollmentStatus ?? "pending";
                    return (
                      <Card key={r.id} style={{ padding: "14px 16px" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 10 }}>
                          <div style={{ flex: 1, minWidth: 200 }}>
                            <div style={{ fontWeight: 800, fontSize: 15, color: "#c4b5fd" }}>{enrollmentCourseLabel(r)}</div>
                            <div style={{ fontWeight: 600, fontSize: 13, marginTop: 6 }}>{r.studentName}</div>
                            <div style={{ color: C.muted, fontSize: 12 }}>{r.studentEmail}{r.studentPhone ? ` · ${r.studentPhone}` : ""}</div>
                            <div style={{ display: "flex", gap: 6, marginTop: 8, flexWrap: "wrap" }}>
                              <Badge color={st === "approved" ? C.success : st === "rejected" ? C.danger : C.warning}>
                                {st === "approved" ? tx("مقبول","Approved") : st === "rejected" ? tx("مرفوض","Rejected") : tx("معلّق","Pending")}
                              </Badge>
                              {r.trainingType && (
                                <Badge color={r.trainingType === "offline" ? C.orange : C.purple}>
                                  {r.trainingType === "online" ? (ar ? "🖥 أونلاين" : "🖥 Online") : r.trainingType === "offline" ? (ar ? "🏢 حضوري" : "🏢 Offline") : r.trainingType}
                                </Badge>
                              )}
                              {r.paymentPlan && <Badge color={C.muted}>{r.paymentPlan === "full" ? tx("دفع كامل","Full pay") : tx("أقساط","Install.")}</Badge>}
                              {r.amountQuoted ? <Badge color="#1d6f42">{Number(r.amountQuoted).toLocaleString()} EGP</Badge> : null}
                              {r.userId ? <Badge color="#555">✓ account</Badge> : <Badge color={C.muted}>{tx("بدون حساب","No account")}</Badge>}
                            </div>
                            {r.level && <div style={{ marginTop: 4, fontSize: 11, color: C.muted }}>{tx("المستوى:","Level:")} {r.level}</div>}
                            {r.source && <div style={{ fontSize: 11, color: C.muted }}>{tx("المصدر:","Source:")} {r.source}</div>}
                            {r.rejectReason && <div style={{ marginTop: 8, fontSize: 12, color: C.danger }}>{r.rejectReason}</div>}
                          </div>
                          {st === "pending" && (
                            <div style={{ display: "flex", gap: 8 }}>
                              <Btn children={tx("قبول", "Approve")} v="success" sm onClick={async () => { await approveEnrollmentRequest(r.id); await loadEnrollmentRequests(); showT(tx("تم القبول", "Approved")); }} />
                              <Btn children={tx("رفض", "Reject")} v="danger" sm onClick={() => { setRejectReason(""); setRejectModal({ id: r.id }); }} />
                            </div>
                          )}
                        </div>
                      </Card>
                    );
                  })}
                </div>
              );
            })()}
            {rejectModal && (
              <Modal title={tx("سبب الرفض (اختياري)", "Rejection reason (optional)")} onClose={() => setRejectModal(null)}>
                <Input label={tx("السبب", "Reason")} value={rejectReason} onChange={setRejectReason} placeholder={tx("يظهر للطالب في الإشعارات", "Shown to the learner in notifications")} />
                <div style={{ display: "flex", gap: 8, marginTop: 14 }}>
                  <Btn v="outline" children={tx("إلغاء", "Cancel")} onClick={() => setRejectModal(null)} />
                  <Btn v="danger" children={tx("رفض الطلب", "Reject request")} onClick={async () => {
                    await rejectEnrollmentRequest(rejectModal.id, rejectReason);
                    setRejectModal(null);
                    await loadEnrollmentRequests();
                    showT(tx("تم الرفض", "Rejected"), "error");
                  }} />
                </div>
              </Modal>
            )}
          </div>
        )}

        {/* ── Service Leads ── */}
        {tab === "leads" && (() => {
          const CONSULT_TYPES = { track:"مسار تعليمي", service:"استشارة خدمة", corporate:"تدريب مؤسسي", kids:"برامج الأطفال", other:"أخرى" };
          const SPEC_LABELS   = { frontend:"Front-End", backend:"Back-End", flutter:"Flutter", uiux:"UI/UX", ai:"AI/Data", hr:"HR", instructor:"مدرب", other:"أخرى" };
          const fmtDate = iso => iso ? new Date(iso).toLocaleDateString(ar ? "ar-EG" : "en-US", { day:"numeric", month:"short", year:"numeric" }) : "—";

          const LeadCard = ({ lead, collName, setter, fields }) => (
            <Card key={lead.id} style={{ padding: "14px 16px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 10 }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                    <div style={{ fontWeight: 700, fontSize: 14 }}>{lead.name || lead.contact || "—"}</div>
                    {lead.company && <Badge color={C.purple}>{lead.company}</Badge>}
                    <Badge color={lead.status === "contacted" ? "#1d6f42" : C.orange}>
                      {lead.status === "contacted" ? (ar ? "تم التواصل" : "Contacted") : (ar ? "جديد" : "New")}
                    </Badge>
                  </div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: "4px 16px", fontSize: 12, color: C.muted }}>
                    {lead.phone   && <span>📞 {lead.phone}</span>}
                    {lead.email   && <span>✉️ {lead.email}</span>}
                    {fields}
                    <span>🕐 {fmtDate(lead.createdAt)}</span>
                  </div>
                  {lead.message && <div style={{ marginTop: 6, fontSize: 12, color: "#d1c4e9", background: "rgba(255,255,255,.05)", borderRadius: 8, padding: "6px 10px" }}>{lead.message}</div>}
                  {lead.notes   && <div style={{ marginTop: 6, fontSize: 12, color: "#d1c4e9", background: "rgba(255,255,255,.05)", borderRadius: 8, padding: "6px 10px" }}>{lead.notes}</div>}
                </div>
                {lead.status !== "contacted" && (
                  <Btn children={ar ? "تم التواصل ✓" : "Mark Contacted"} v="success" sm
                    onClick={() => markLeadContacted(collName, lead.id, setter)} />
                )}
              </div>
            </Card>
          );

          const subTabs = [
            { key: "consultation", ar: `استشارات (${consultationLeads.length})`, en: `Consultations (${consultationLeads.length})` },
            { key: "hiring",       ar: `توظيف (${hiringLeads.length})`,         en: `Hiring (${hiringLeads.length})` },
            { key: "corporate",    ar: `مؤسسي (${corporateLeads.length})`,      en: `Corporate (${corporateLeads.length})` },
          ];

          return (
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16, flexWrap: "wrap", gap: 10 }}>
                <h2 style={{ fontWeight: 900, fontSize: 18, margin: 0 }}>{tx("طلبات الخدمات", "Service Leads")}</h2>
                <div style={{ display: "flex", gap: 6 }}>
                  {subTabs.map(st => (
                    <button key={st.key} onClick={() => setLeadsTab(st.key)} style={{
                      padding: "6px 14px", borderRadius: 8, border: "none", cursor: "pointer",
                      fontWeight: 700, fontSize: 12, fontFamily: "'Cairo',sans-serif",
                      background: leadsTab === st.key ? C.purple : "rgba(255,255,255,.08)",
                      color: leadsTab === st.key ? "#fff" : C.muted,
                      transition: "all .2s",
                    }}>{ar ? st.ar : st.en}</button>
                  ))}
                </div>
              </div>

              {leadsLoading ? (
                <Card style={{ padding: 32, textAlign: "center" }}><div style={{ color: C.muted }}>{tx("جاري التحميل…", "Loading…")}</div></Card>
              ) : (
                <>
                  {leadsTab === "consultation" && (
                    <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
                      {consultationLeads.length === 0
                        ? <Card style={{ padding: 32, textAlign: "center" }}><div style={{ color: C.muted }}>{tx("لا توجد طلبات استشارة بعد", "No consultation requests yet")}</div></Card>
                        : consultationLeads.map(lead => (
                            <LeadCard key={lead.id} lead={lead} collName="consultationLeads" setter={setConsultationLeads}
                              fields={<><span>📋 {CONSULT_TYPES[lead.type] || lead.type}</span></>} />
                          ))}
                    </div>
                  )}
                  {leadsTab === "hiring" && (
                    <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
                      {hiringLeads.length === 0
                        ? <Card style={{ padding: 32, textAlign: "center" }}><div style={{ color: C.muted }}>{tx("لا توجد طلبات توظيف بعد", "No hiring requests yet")}</div></Card>
                        : hiringLeads.map(lead => (
                            <LeadCard key={lead.id} lead={{ ...lead, name: lead.contact }} collName="hiringLeads" setter={setHiringLeads}
                              fields={<><span>👤 {SPEC_LABELS[lead.specialty] || lead.specialty}</span>{lead.count && <span>🔢 {lead.count}</span>}{lead.date && <span>📅 {lead.date}</span>}</>} />
                          ))}
                    </div>
                  )}
                  {leadsTab === "corporate" && (
                    <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
                      {corporateLeads.length === 0
                        ? <Card style={{ padding: 32, textAlign: "center" }}><div style={{ color: C.muted }}>{tx("لا توجد طلبات تدريب مؤسسي بعد", "No corporate requests yet")}</div></Card>
                        : corporateLeads.map(lead => (
                            <LeadCard key={lead.id} lead={{ ...lead, name: lead.contact }} collName="corporateLeads" setter={setCorporateLeads}
                              fields={<>{lead.program && <span>📚 {lead.program}</span>}{lead.employees && <span>👥 {lead.employees}</span>}{lead.date && <span>📅 {lead.date}</span>}{lead.time && <span>🕐 {lead.time}</span>}</>} />
                          ))}
                    </div>
                  )}
                </>
              )}
            </div>
          );
        })()}

        {/* ── Courses ── */}
        {tab === "courses" && (
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16, flexWrap: "wrap", gap: 10 }}>
              <h2 style={{ fontWeight: 900, fontSize: 18, margin: 0 }}>{tx("إدارة الكورسات", "Course management")}</h2>
              <Btn children={tx("كورس جديد", "New Course")} onClick={() => setModal({ type: "add-course" })} style={{ background: C.red }} />
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
              {courses.map(c => {
                const inst = users.find(u => u.id === c.instructorId);
                const sc   = users.filter(u => u.enrolledCourses?.find(e => e.courseId === c.id)).length;
                return (
                  <Card key={c.id} style={{ padding: "12px 14px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 9 }}>
                      <div style={{ display: "flex", gap: 9, alignItems: "center" }}>
                        <div style={{ width: 38, height: 38, borderRadius: 10, background: `linear-gradient(135deg,${c.color||C.red},#321d3d)`, flexShrink: 0 }}></div>
                        <div>
                          <div style={{ fontWeight: 700, fontSize: 13 }}>{c.title}</div>
                          <div style={{ color: C.muted, fontSize: 11, marginTop: 2 }}>{c.price.toLocaleString()} EGP · {sc} {tx("طالب", "students")} · {inst ? inst.name : tx("بدون مدرب", "No instructor")}</div>
                          <div style={{ display: "flex", gap: 4, marginTop: 4 }}>
                            <Badge color={C.orange}>{c.cat}</Badge>
                            {c.featured && <Badge color={C.red}>{tx("مميز","Featured")}</Badge>}
                          </div>
                        </div>
                      </div>
                      <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
                        <Btn children={tx("فيديو", "Video")} sm v="outline" onClick={() => setModal({ type: "add-session", course: c })} />
                        <Btn children={tx("تعديل", "Edit")} sm v="outline" onClick={() => setModal({ type: "edit-course", course: c })} />
                        <Btn children={tx("تسجيل", "Enroll")}              sm v="purple"  onClick={() => setModal({ type: "enroll-course", course: c })} />
                        <Btn children={tx("مدرب", "Instructor")}               sm v="outline" onClick={() => setModal({ type: "assign-course", course: c })} />
                        <Btn children={c.featured ? tx("إلغاء التمييز", "Unfeature") : tx("تمييز", "Feature")} sm v={c.featured ? "orange" : "outline"} onClick={() => { toggleFeatured(c.id); showT(c.featured ? tx("تم إلغاء التمييز", "Unfeatured") : tx("تم التمييز", "Featured")); }} />
                        {/* ── Students viewer ── */}
                        <Btn
                          sm
                          onClick={() => setModal({ type: "course-students", course: c })}
                          style={{ background: "#1D6F42", color: "#fff", border: "none", display: "flex", alignItems: "center", gap: 5 }}
                          children={
                            <>
                              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ flexShrink: 0 }}>
                                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
                              </svg>
                              {ar ? "الطلاب" : "Students"}
                            </>
                          }
                        />
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
              <Btn children={tx("خبر جديد", "New Article")} onClick={() => setModal({ type: "add-news" })} style={{ background: C.orange, color: C.pdark }} />
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
                    <Btn children={tx("حذف", "Delete")} sm v="danger" onClick={() => { deleteNews(n.id); showT(tx("تم حذف الخبر", "Article deleted"), "error"); }} />
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
              <Btn children={tx("مدرب جديد", "New Trainer")} onClick={() => setModal({ type: "add-trainer" })} v="purple" />
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {trainers.map(tr => (
                <Card key={tr.id} style={{ padding: "16px 18px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 10 }}>
                    <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                      <div style={{ width: 44, height: 44, borderRadius: "50%", background: "linear-gradient(135deg,#672d86,#321d3d)", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: 18, flexShrink: 0 }}>{tr.avatar}</div>
                      <div>
                        <div style={{ fontWeight: 800, fontSize: 14 }}>{tr.name}</div>
                        <div style={{ color: C.muted, fontSize: 11, marginBottom: 4 }}>{tx("المستخدم","Username")}: {tr.username}</div>
                        <div style={{ color: C.muted, fontSize: 11, marginBottom: 4 }}>{tx("كلمة المرور","Password")}: {tr.password}</div>
                        {tr.specialty_ar && <Badge color={C.purple}>{tr.specialty_ar}</Badge>}
                      </div>
                    </div>
                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                      <Badge color={C.orange}>{tr.courses?.length || 0} {tx("كورس", "courses")}</Badge>
                      <Btn
                        children={tx("حذف", "Delete")}
                        sm
                        v="danger"
                        onClick={async () => {
                          try {
                            await deleteTrainer(tr.id);
                            showT(tx("تم حذف المدرب", "Trainer deleted"));
                          } catch (e) {
                            console.error(e);
                            showT(tx("تعذر حذف المدرب", "Could not delete trainer"), "error");
                          }
                        }}
                      />
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
              <h2 style={{ fontWeight:900, fontSize:18, margin:0 }}>{tx("إدارة البرامج", "Programs")}</h2>
              <Btn children={tx("برنامج جديد", "New Program")} onClick={()=>setModal({ type:"add-program" })} style={{ background:C.orange, color:C.pdark }} />
            </div>
            <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(300px,1fr))", gap:14 }}>
              {(programs||[]).map(pr => (
                <Card key={pr.id} style={{ padding:0, overflow:"hidden" }}>
                  {pr.image
                    ? <img src={pr.image} alt={pr.title_ar} style={{ width:"100%", height:140, objectFit:"cover" }} />
                    : <div style={{ width:"100%", height:140, background:`linear-gradient(135deg,${C.red}44,${C.purple}44)` }}></div>
                  }
                  <div style={{ padding:"14px 16px" }}>
                    <div style={{ fontWeight:800, fontSize:14, marginBottom:4 }}>{pr.title_ar}</div>
                    {pr.title_en && <div style={{ color:C.muted, fontSize:12, marginBottom:6 }}>{pr.title_en}</div>}
                    {pr.desc_ar  && <div style={{ color:C.muted, fontSize:11, lineHeight:1.6, marginBottom:10 }}>{pr.desc_ar.slice(0,80)}{pr.desc_ar.length>80?"…":""}</div>}
                    <div style={{ display:"flex", gap:8 }}>
                      <Btn children={tx("تعديل", "Edit")} sm v="outline" onClick={()=>setModal({ type:"edit-program", program:pr })} />
                      <Btn children={tx("حذف", "Delete")}   sm v="danger"  onClick={()=>{ deleteProgram(pr.id); showT(tx("تم حذف البرنامج","Program deleted"),"error"); }} />
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
              <h2 style={{ fontWeight:900, fontSize:18, margin:0 }}>{tx("آراء الطلاب", "Testimonials")}</h2>
              <Btn children={tx("رأي جديد", "New Testimonial")} onClick={()=>setModal({ type:"add-testimonial" })} style={{ background:C.orange, color:C.pdark }} />
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
                        {t.course && <div style={{ color:C.orange, fontSize:11, marginBottom:4 }}>{t.course}</div>}
                        <div style={{ color:"#fbbf24", fontSize:13, marginBottom:4 }}>{"★".repeat(t.rating||5)}</div>
                        <div style={{ color:C.muted, fontSize:12, lineHeight:1.65 }}>{t.comment_ar}</div>
                      </div>
                    </div>
                    <Btn children={tx("حذف", "Delete")} sm v="danger" onClick={()=>{ deleteTestimonial(t.id); showT(tx("تم الحذف","Deleted"),"error"); }} />
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
              <h2 style={{ fontWeight:900, fontSize:18, margin:0 }}>{tx("إدارة فريق العمل", "Team")}</h2>
              <Btn children={tx("عضو جديد", "New Member")} onClick={()=>setModal({ type:"add-team" })} />
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
                    <Btn children={tx("تعديل", "Edit")} sm v="outline" onClick={()=>setModal({ type:"edit-team", member:m })} />
                    <Btn children={tx("حذف", "Delete")}   sm v="danger"  onClick={()=>{ deleteTeamMember(m.id); showT(tx("تم الحذف","Deleted"),"error"); }} />
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
        {/* ── Service & Program Icons ── */}
        {tab === "icons" && (() => {
          const CORP = [
            { key:"TK", icon:"💻", label:tx("تدريب تقني","Technical Training") },
            { key:"MG", icon:"📊", label:tx("تدريب إداري","Management Training") },
            { key:"EN", icon:"🌐", label:tx("اللغة الإنجليزية","English Language") },
            { key:"KD", icon:"🧒", label:tx("تدريب الأطفال","Children Programs") },
            { key:"ED", icon:"📚", label:tx("استشارات تعليمية","Educational Consulting") },
            { key:"CT", icon:"🏆", label:tx("شهادات معتمدة","Certified Programs") },
          ];
          const SVCS = [
            { key:"web-development",  icon:"🌐", label:tx("تطوير الويب","Web Development") },
            { key:"mobile-apps",      icon:"📱", label:tx("تطبيقات الموبايل","Mobile Apps") },
            { key:"ai-solutions",     icon:"🤖", label:tx("الذكاء الاصطناعي","AI Solutions") },
            { key:"cybersecurity",    icon:"🔒", label:tx("الأمن السيبراني","Cybersecurity") },
            { key:"ui-ux-design",     icon:"🎨", label:"UI/UX Design" },
            { key:"cloud-devops",     icon:"☁️", label:"Cloud & DevOps" },
          ];
          const IconCard = ({ item }) => {
            const img = categoryIcons?.[item.key];
            return (
              <Card style={{ padding:0, overflow:"hidden", display:"flex", flexDirection:"column" }}>
                {/* Preview */}
                <div style={{ position:"relative", height:120, background:"rgba(255,255,255,.04)", display:"flex", alignItems:"center", justifyContent:"center", overflow:"hidden" }}>
                  {img
                    ? <img src={img} alt={item.label} style={{ width:"100%", height:"100%", objectFit:"cover" }}/>
                    : <span style={{ fontSize:48 }}>{item.icon}</span>
                  }
                  {img && (
                    <button
                      onClick={() => { deleteCategoryIcon(item.key); showT(tx("تم حذف الصورة","Image removed"),"error"); }}
                      style={{ position:"absolute", top:6, left:6, background:"rgba(200,0,0,.8)", border:"none", borderRadius:6, color:"#fff", cursor:"pointer", padding:"3px 8px", fontSize:11, fontWeight:700 }}>
                      ✕
                    </button>
                  )}
                </div>
                {/* Info + upload */}
                <div style={{ padding:"12px 14px", flex:1, display:"flex", flexDirection:"column", gap:10 }}>
                  <div style={{ fontWeight:700, fontSize:13 }}>{item.label}</div>
                  <label style={{ display:"flex", alignItems:"center", gap:8, cursor:"pointer",
                    background: "rgba(125,61,158,.2)", border:`1px dashed ${C.purple}`, borderRadius:8,
                    padding:"8px 12px", fontSize:12, color:C.muted, fontWeight:600 }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                      <polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/>
                    </svg>
                    {img ? tx("استبدال الصورة","Replace Image") : tx("رفع صورة","Upload Image")}
                    <input type="file" accept="image/*" style={{ display:"none" }}
                      onChange={e => {
                        if (!e.target.files[0]) return;
                        readFile(e.target.files[0], data => {
                          saveCategoryIcon(item.key, data);
                          showT(tx("تم حفظ الصورة ✓","Image saved ✓"));
                        });
                      }}
                    />
                  </label>
                </div>
              </Card>
            );
          };
          return (
            <div>
              <h2 style={{ fontWeight:900, fontSize:18, marginBottom:6 }}>{tx("أيقونات الخدمات والبرامج","Service & Program Icons")}</h2>
              <p style={{ color:C.muted, fontSize:13, marginBottom:24 }}>{tx("ارفع صورة لكل خدمة أو برنامج تحل محل الأيقونة الافتراضية","Upload an image for each service/program to replace the default emoji icon")}</p>

              <div style={{ fontWeight:700, fontSize:14, color:C.orange, marginBottom:12, letterSpacing:1 }}>
                {tx("البرامج المؤسسية","CORPORATE PROGRAMS")}
              </div>
              <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(200px,1fr))", gap:14, marginBottom:32 }}>
                {CORP.map(item => <IconCard key={item.key} item={item}/>)}
              </div>

              <div style={{ fontWeight:700, fontSize:14, color:C.orange, marginBottom:12, letterSpacing:1 }}>
                {tx("الخدمات","SERVICES")}
              </div>
              <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(200px,1fr))", gap:14 }}>
                {SVCS.map(item => <IconCard key={item.key} item={item}/>)}
              </div>
            </div>
          );
        })()}

        {tab === "settings" && (
          <div>
            <h2 style={{ fontWeight: 900, fontSize: 18, marginBottom: 20 }}>{tx("إعدادات المنصة", "Platform Settings")}</h2>
            <Card style={{ padding: 24, maxWidth: 480 }}>
              <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 6 }}>{tx("رقم Vodafone Cash", "Vodafone Cash Number")}</div>
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
                <Btn children={tx("حفظ", "Save")} sm onClick={() => showT(tx("تم حفظ الرقم بنجاح", "Number saved"))} />
              </div>
            </Card>
          </div>
        )}

        {/* ── Exams ── */}
        {tab === "exams" && (
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <h2 style={{ fontWeight: 900, fontSize: 18, margin: 0 }}>{tx("إدارة الامتحانات", "Exam management")}</h2>
              <Btn children={tx("امتحان جديد", "New Exam")} onClick={() => setModal({ type: "add-exam" })} v="purple" />
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
                      <Btn children={tx("حذف", "Delete")} sm v="danger" onClick={() => { deleteExam(e.id); showT(tx("تم حذف الامتحان", "Exam deleted"), "error"); }} />
                    </div>
                  </Card>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* ═══ Modals ═══ */}
      {modal?.type === "course-students" && modal.course && (
        <CourseStudentsModal
          course={modal.course}
          allUsers={users}
          onClose={() => setModal(null)}
        />
      )}
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
      {modal?.type === "create-admin"       && <CreateAdminModal />}
      {modal?.type === "create-instructor"  && <CreateInstructorModal />}
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
        <Modal title={`${tx("إدارة كورسات الطالب", "Manage learner courses")}: ${modal.user.name}`} onClose={() => setModal(null)}>
          {modal.user.status === "pending" && (
            <div style={{ fontSize: 11, color: C.muted, marginBottom: 12, lineHeight: 1.6, padding: "10px 12px", background: "rgba(250,166,51,.1)", borderRadius: 10, border: "1px solid rgba(250,166,51,.25)" }}>
              {tx("الحساب لا يزال بانتظار التفعيل. يمكنك ربطه بكورسات من هنا؛ يفضّل تفعيل الحساب أولاً من أزرار القبول.", "This account is still pending approval. You can link courses here; approving the account first is recommended.")}
            </div>
          )}
          <div style={{ fontSize: 11, color: C.muted, marginBottom: 10 }}>{tx("«تسجيل» يضيف الكورس على المنصة. «إزالة» يلغي الوصول فقط (لا يحذف حساب الطالب).", "“Enroll” grants course access on the platform. “Remove” only unenrolls — it does not delete the user.")}</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
            {courses.map(c => {
              const isE = !!users.find(u => u.id === modal.user.id)?.enrolledCourses.find(e => e.courseId === c.id);
              return (
                <div key={c.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 11px", background: "rgba(255,255,255,.06)", borderRadius: 9 }}>
                  <div><div style={{ fontWeight: 600, fontSize: 12 }}>{c.title}</div><div style={{ color: C.muted, fontSize: 10 }}>{c.price.toLocaleString()} EGP</div></div>
                  {isE
                    ? <Btn children={tx("إزالة","Remove")}   sm v="danger"  onClick={() => { removeEnroll(modal.user.id, c.id); showT(tx("تم الإزالة","Removed"), "error"); setModal(p => ({ ...p })); }} />
                    : <Btn children={tx("تسجيل","Enroll")} sm v="success" onClick={() => { enrollUser(modal.user.id, c.id);  showT(tx("تم التسجيل","Enrolled")); setModal(p => ({ ...p })); }} />
                  }
                </div>
              );
            })}
          </div>
        </Modal>
      )}

      {modal?.type === "enroll-course" && (
        <Modal title={`${tx("تسجيل طلاب في","Enroll students in")}: ${modal.course.title}`} onClose={() => setModal(null)}>
          <div style={{ fontSize: 11, color: C.muted, marginBottom: 10 }}>{tx("يظهر كل المستخدمين/الطلاب غير المرفوضين (بما فيهم بانتظار التفعيل).", "Shows all non-rejected users/students (including pending approval).")}</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
            {learnersManageable.map(u => {
              const isE = !!u.enrolledCourses.find(e => e.courseId === modal.course.id);
              return (
                <div key={u.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 11px", background: "rgba(255,255,255,.06)", borderRadius: 9 }}>
                  <div style={{ display: "flex", gap: 7, alignItems: "center", flexWrap: "wrap" }}>
                    <div style={{ width: 26, height: 26, borderRadius: "50%", background: "linear-gradient(135deg,#d91b5b,#b51549)", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: 11, flexShrink: 0 }}>{u.avatar}</div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                      <span style={{ fontWeight: 600, fontSize: 12 }}>{u.name}</span>
                      {u.status === "pending" && <Badge color={C.warning}>{tx("حساب بانتظار التفعيل", "Account pending")}</Badge>}
                    </div>
                  </div>
                  {isE
                    ? <Btn children={tx("إزالة","Remove")}   sm v="danger"  onClick={() => { removeEnroll(u.id, modal.course.id); showT(tx("تم الإزالة","Removed"), "error"); }} />
                    : <Btn children={tx("تسجيل","Enroll")} sm v="success" onClick={() => { enrollUser(u.id, modal.course.id);  showT(tx("تم التسجيل","Enrolled")); }} />
                  }
                </div>
              );
            })}
          </div>
        </Modal>
      )}

      {modal?.type === "assign-course" && (
        <Modal title={`${tx("تعيين مدرب لـ","Assign trainer to")}: ${modal.course.title}`} onClose={() => setModal(null)}>
          <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
            {modal.course.instructorId && (
              <Btn
                children={tx("إزالة المدرب من الكورس", "Remove instructor from course")}
                v="danger"
                sm
                onClick={async () => {
                  try {
                    await unassignInstructorFromCourse(modal.course.id);
                    setModal((m) => (m?.type === "assign-course" ? { ...m, course: { ...m.course, instructorId: null } } : m));
                    showT(tx("تمت إزالة المدرب", "Instructor removed"));
                  } catch (e) {
                    console.error(e);
                    showT(tx("تعذرت الإزالة", "Could not remove"), "error");
                  }
                }}
              />
            )}
            {instructors.filter(u => u.status === "approved").map(u => {
              const isA = modal.course.instructorId === u.id;
              return (
                <div key={u.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 11px", background: "rgba(255,255,255,.06)", borderRadius: 9 }}>
                  <span style={{ fontWeight: 600, fontSize: 12 }}>{u.name}</span>
                  {isA
                    ? <Badge color={C.success}>{tx("معيّن","Assigned")} ✓</Badge>
                    : <Btn children={tx("تعيين","Assign")} sm v="success" onClick={async () => { try { await assignInstructor(u.id, modal.course.id); setModal((m) => (m?.type === "assign-course" ? { ...m, course: { ...m.course, instructorId: u.id } } : m)); showT(tx("تم التعيين","Assigned")); } catch (e) { console.error(e); showT(tx("تعذر التعيين", "Assign failed"), "error"); } }} />
                  }
                </div>
              );
            })}
          </div>
        </Modal>
      )}

      {modal?.type === "assign" && (
        <Modal title={`${tx("تعيين كورسات للمدرب","Assign courses to")}: ${modal.user.name}`} onClose={() => setModal(null)}>
          <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
            {courses.map(c => {
              const isA = c.instructorId === modal.user.id;
              return (
                <div key={c.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 11px", background: "rgba(255,255,255,.06)", borderRadius: 9 }}>
                  <div style={{ fontWeight: 600, fontSize: 12 }}>{c.title}</div>
                  {isA
                    ? <Badge color={C.success}>{tx("معيّن","Assigned")} ✓</Badge>
                    : <Btn children={tx("تعيين","Assign")} sm v="success" onClick={async () => { try { await assignInstructor(modal.user.id, c.id); showT(tx("تم التعيين","Assigned")); } catch (e) { console.error(e); showT(tx("تعذر التعيين", "Assign failed"), "error"); } }} />
                  }
                </div>
              );
            })}
          </div>
        </Modal>
      )}
    </div>
  );
}
