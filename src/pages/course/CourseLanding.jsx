import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { collection, query, where, onSnapshot } from "firebase/firestore";
import { C } from "../../theme";
import { Btn, Card, Stars, Badge } from "../../components/UI";
import { useData } from "../../context/DataContext";
import { useAuth } from "../../context/AuthContext";
import { useLang } from "../../context/LangContext";
import { db } from "../../firebase";

const FAQ_AR = [
  { q:"هل محتاج خبرة سابقة؟",         a:"لا، الدبلومة تبدأ من الصفر وتوصلك للاحتراف. كل اللي محتاجه هو الرغبة والالتزام." },
  { q:"إيه طريقة التدريس؟",            a:"تدريب مباشر Online مع مدرب، مع تسجيلات لكل الجلسات. تقدر تشوف أي درس وقت ما تحب." },
  { q:"هل في شهادة في الآخر؟",          a:"أيوه، بتاخد شهادة معتمدة من Eduzah عند إتمام الدبلومة بنجاح." },
  { q:"إيه طرق الدفع المتاحة؟",         a:"الدفع عبر InstaPay على الرقم المعلن، مع خيار الدفع الكامل (خصم 5%) أو بالأقساط." },
  { q:"هل فيه دعم بعد انتهاء الكورس؟", a:"أيوه، بتنضم لمجتمع خريجي Eduzah ومتاح لك دعم التوظيف وربطك بالشركات." },
];
const FAQ_EN = [
  { q:"Do I need prior experience?",          a:"No, the diploma starts from scratch and takes you to a professional level. All you need is motivation and commitment." },
  { q:"What is the teaching method?",         a:"Live online training with an instructor, plus recordings of all sessions. You can watch any lesson whenever you want." },
  { q:"Is there a certificate at the end?",   a:"Yes, you receive an Eduzah-accredited certificate upon successfully completing the diploma." },
  { q:"What payment methods are available?",  a:"InstaPay to the published wallet number, with full payment (5% discount) or installments." },
  { q:"Is there support after the course?",   a:"Yes, you join the Eduzah alumni community with access to career support and company connections." },
];

const WHO_AR = [
  "المبتدئين الذين يريدون دخول المجال من الصفر",
  "أصحاب العمل الذين يريدون فهم التكنولوجيا",
  "المحترفون من مجالات أخرى الراغبون في التحول إلى التقنية",
  "المطورون الذين يريدون رفع مستواهم",
];
const WHO_EN = [
  "Beginners who want to enter the field from scratch",
  "Business owners who want to understand technology",
  "Professionals from other fields looking to switch to Tech",
  "Developers who want to level up their skills",
];

// Strip leading "Project:" prefix from lesson names for display
function stripLessonPrefix(l) {
  return l.replace(/^Project:\s*/i, "").replace(/^Video:\s*/i, "");
}

function isProjectLesson(l) {
  return l.startsWith("Project:");
}

function toEmbedIntro(url) {
  if (!url) return null;
  const yt = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\n?#]+)/);
  if (yt) return `https://www.youtube.com/embed/${yt[1]}?rel=0&modestbranding=1`;
  const vim = url.match(/vimeo\.com\/(\d+)/);
  if (vim) return `https://player.vimeo.com/video/${vim[1]}`;
  return url;
}

export default function CourseLanding() {
  const { slug }    = useParams();
  const navigate    = useNavigate();
  const { courses } = useData();
  const { currentUser } = useAuth();
  const { lang } = useLang();
  const dir = lang === "ar" ? "rtl" : "ltr";

  const [openCurr, setOpenCurr] = useState(0);
  const [openFaq,  setOpenFaq]  = useState(null);
  const [enrollmentReqStatus, setEnrollmentReqStatus] = useState(null);
  const prevReqStatus = useRef(null);

  const courseFaq = lang === "ar" ? (course.faq_ar || course.faq || null) : (course.faq_en || course.faq || null);
  const courseWho = lang === "ar" ? (course.who_ar || course.who || null) : (course.who_en || course.who || null);
  const FAQ = (Array.isArray(courseFaq) && courseFaq.length) ? courseFaq : (lang === "ar" ? FAQ_AR : FAQ_EN);
  const WHO = (Array.isArray(courseWho) && courseWho.length) ? courseWho : (lang === "ar" ? WHO_AR : WHO_EN);
  const dur = (d) => lang === "ar" ? d : d.replace(/أسابيع|أسبوع/g, "weeks").replace("ترمين سنوياً", "2 Terms/Year");

  const course = courses.find(c => c.slug === slug);
  if (!course) return (
    <div style={{ padding: "80px 5%", textAlign: "center", color: C.muted }} dir={dir}>
      <div style={{ fontSize: 48, marginBottom: 16, color: C.muted }}>—</div>
      <h2 style={{ marginBottom: 8 }}>{lang === "ar" ? "الكورس غير موجود" : "Course not found"}</h2>
      <Btn children={lang === "ar" ? "← الكورسات" : "← Courses"} onClick={() => navigate("/courses")} />
    </div>
  );

  const enrolled = currentUser?.enrolledCourses?.find(e => e.courseId === course.id);

  useEffect(() => {
    if (!course?.id || !currentUser?.id) {
      setEnrollmentReqStatus(null);
      return undefined;
    }
    const emailNorm = (currentUser.email || "").trim().toLowerCase();
    const q = query(collection(db, "enrollmentRequests"), where("courseId", "==", course.id));
    const unsub = onSnapshot(q, (snap) => {
      const rows = snap.docs
        .map((d) => ({ ...d.data(), _id: d.id }))
        .filter((row) => row.userId === currentUser.id
          || (emailNorm && (row.studentEmail || "").trim().toLowerCase() === emailNorm));
      rows.sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || ""));
      const latest = rows[0];
      setEnrollmentReqStatus(latest ? (latest.enrollmentStatus ?? "pending") : null);
    }, () => {});
    return () => unsub();
  }, [course?.id, currentUser?.id, currentUser?.email]);

  useEffect(() => {
    const was = prevReqStatus.current;
    if (was === "pending" && enrollmentReqStatus === "approved" && enrolled) {
      navigate(`/learn/${slug}`, { replace: true });
    }
    prevReqStatus.current = enrollmentReqStatus;
  }, [enrollmentReqStatus, enrolled, slug, navigate]);

  const displayBullets = lang === "ar"
    ? (course.bullets || [])
    : ((course.bullets_en && course.bullets_en.length) ? course.bullets_en : (course.bullets || []));
  const displayOutcomes = lang === "ar"
    ? (course.outcomes || [])
    : ((course.outcomes_en && course.outcomes_en.length) ? course.outcomes_en : (course.outcomes || []));

  const priceNum = Number(course.price) || 0;
  const installmentNum = Number(course.installment) || (priceNum ? Math.round(priceNum / 3) : 0);
  const hoursNum = Number(course.hours) || 0;
  const projectsNum = Number(course.projects) || 0;

  const handleEnroll = () => {
    if (enrollmentReqStatus === "pending") return;
    navigate(`/courses/${slug}/register`);
  };

    const enrollBtnLabel = enrolled
    ? (lang === "ar" ? "متابعة التعلم ▶" : "Continue Learning ▶")
    : enrollmentReqStatus === "pending"
      ? (lang === "ar" ? "طلب قيد المراجعة" : "Request pending")
      : enrollmentReqStatus === "rejected"
        ? (lang === "ar" ? "إعادة التقديم" : "Apply again")
        : (lang === "ar" ? "سجّل الآن" : "Enroll Now");
  const goLearn = () => {
    if (!currentUser) { navigate("/login"); return; }
    navigate(`/learn/${slug}`);
  };

  const openCurriculumPresentation = () => {
    const url = course.presentationUrl?.trim();
    if (url) {
      window.open(url, "_blank", "noopener,noreferrer");
      return;
    }
    document.getElementById("curriculum")?.scrollIntoView({ behavior: "smooth" });
  };

  const introEmbed = course.introVideoUrl ? toEmbedIntro(course.introVideoUrl) : null;
  const freePreviewEmbed = !enrolled && course.previewVideoUrl ? toEmbedIntro(course.previewVideoUrl) : null;
  const freeNote = !enrolled && course.freeLessonNote?.trim();

  return (
    <div style={{ paddingBottom: 70 }} dir={dir}>

      {/* ── Course cover (full width) ── */}
      {course.image && (
        <div style={{ width: "100%", maxHeight: "min(48vh, 420px)", overflow: "hidden", borderBottom: `1px solid ${C.border}` }}>
          <img
            src={course.image}
            alt={lang === "ar" ? course.title : (course.title_en || course.title)}
            style={{ width: "100%", height: "min(48vh, 420px)", objectFit: "cover", objectPosition: "center", display: "block" }}
          />
        </div>
      )}

      {/* ── HERO ── */}
      <div style={{ background: "linear-gradient(135deg,#1a0a2e 0%,#321d3d 45%,#4a1f6e 100%)", padding: "clamp(40px,7vw,64px) 4%", display: "flex", alignItems: "center", gap: 36, flexWrap: "wrap", position: "relative", overflow: "hidden" }}>
        <div style={{ position: "absolute", top: "-15%", right: "-8%", width: 420, height: 420, background: `radial-gradient(circle,rgba(103,45,134,.28),transparent 70%)`, borderRadius: "50%", pointerEvents: "none" }} />
        <div style={{ position: "absolute", bottom: "-15%", left: "-5%", width: 360, height: 360, background: `radial-gradient(circle,rgba(217,27,91,.18),transparent 70%)`, borderRadius: "50%", pointerEvents: "none" }} />

        {/* Left content */}
        <div style={{ flex: "1 1 300px", position: "relative", zIndex: 2 }}>
          {course.badge && (
            <div style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "rgba(250,166,51,.14)", border: "1px solid rgba(250,166,51,.3)", color: C.orange, borderRadius: 50, padding: "4px 14px", fontSize: 11, fontWeight: 700, marginBottom: 16 }}>
              {lang === "ar" ? course.badge : (course.badge_en || course.badge)}
            </div>
          )}

          <h1 style={{ fontSize: "clamp(1.5rem,4vw,2.7rem)", fontWeight: 900, lineHeight: 1.2, marginBottom: 12 }}>
            {lang === "ar" ? (course.tagline || course.title) : (course.tagline_en || course.title_en || course.title)}
          </h1>
          <p style={{ color: C.muted, fontSize: 14, lineHeight: 1.9, marginBottom: 20, maxWidth: 500 }}>
            {lang === "ar" ? course.desc : (course.desc_en || course.desc)}
          </p>

          {/* Bullets */}
          <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 24 }}>
            {displayBullets.map((b, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 13, fontWeight: 600 }}>
                <span style={{ width: 24, height: 24, borderRadius: 7, background: "rgba(16,185,129,.15)", border: "1px solid rgba(16,185,129,.3)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, flexShrink: 0, color: C.success }}>✓</span>
                {b}
              </div>
            ))}
          </div>

          {/* Rating row */}
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 22, flexWrap: "wrap" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
              <Stars n={Math.round(course.rating || 5)} />
              <span style={{ fontWeight: 800, color: C.orange, fontSize: 13 }}>{course.rating || "5.0"}</span>
            </div>
            <span style={{ color: C.muted, fontSize: 12 }}>({course.students || 0}+ {lang === "ar" ? "خريج" : "graduates"})</span>
            <Badge color={C.orange}>{dur(course.duration)}</Badge>
            <Badge color={C.purple}>{course.hours}h</Badge>
          </div>

          {/* CTA buttons */}
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            {enrolled
              ? <Btn children={enrollBtnLabel} onClick={goLearn} style={{ padding: "13px 28px", fontSize: 14, borderRadius: 12 }} />
              : <Btn children={enrollBtnLabel} onClick={handleEnroll} disabled={enrollmentReqStatus === "pending"} style={{ padding: "13px 28px", fontSize: 14, borderRadius: 12, animation: enrollmentReqStatus === "pending" ? "none" : "pulse 2s infinite", opacity: enrollmentReqStatus === "pending" ? 0.75 : 1 }} />
            }
            <Btn children={lang === "ar" ? "استعرض المنهج" : "View Curriculum"} v="outline"
              onClick={openCurriculumPresentation}
              style={{ padding: "13px 22px", fontSize: 14, borderRadius: 12 }} />
          </div>
        </div>

        {/* Price Card */}
        <div style={{ flex: "0 1 290px", position: "relative", zIndex: 2 }}>
          <div style={{ background: "rgba(255,255,255,.05)", backdropFilter: "blur(18px)", border: "1px solid rgba(255,255,255,.13)", borderRadius: 18, overflow: "hidden", boxShadow: "0 20px 60px rgba(0,0,0,.45)" }}>
            <div style={{ height: 160, background: `linear-gradient(135deg,${course.color||C.red},#321d3d)`, display: "flex", alignItems: "center", justifyContent: "center", position: "relative" }}>
              <span style={{ fontWeight: 900, color: "rgba(255,255,255,.35)", fontSize: "0.75rem", textAlign: "center", padding: "0 16px", lineHeight: 1.4 }}>
                {lang === "ar" ? course.title : (course.title_en || course.title)}
              </span>
              {course.badge && <div style={{ position: "absolute", top: 10, right: 10, background: "rgba(217,27,91,.9)", borderRadius: 7, padding: "3px 9px", fontSize: 10, fontWeight: 700 }}>{lang === "ar" ? course.badge : (course.badge_en || course.badge)}</div>}
            </div>
            <div style={{ padding: 18 }}>
              <div style={{ fontSize: 24, fontWeight: 900, color: C.orange, marginBottom: 2 }}>{priceNum.toLocaleString()} EGP</div>
              <div style={{ color: C.muted, fontSize: 11, marginBottom: 14 }}>
                {lang === "ar" ? `أو 3 أقساط × ${installmentNum.toLocaleString()} EGP` : `or 3 installments × ${installmentNum.toLocaleString()} EGP`}
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 14 }}>
                {[
                  [course.duration?.split(" ")[0] || "—", lang === "ar" ? "أسبوع" : "weeks"],
                  [hoursNum + "", lang === "ar" ? "ساعة" : "hours"],
                  [projectsNum + "+", lang === "ar" ? "مشروع" : "projects"],
                  [(course.rating || 5) + "", lang === "ar" ? "تقييم" : "rating"],
                ].map(([v, l]) => (
                  <div key={l} style={{ textAlign: "center" }}>
                    <div style={{ fontWeight: 800, fontSize: 14 }}>{v}</div>
                    <div style={{ color: C.muted, fontSize: 10 }}>{l}</div>
                  </div>
                ))}
              </div>
              <hr style={{ border: "none", borderTop: `1px solid ${C.border}`, marginBottom: 14 }} />
              {enrolled
                ? <Btn children={enrollBtnLabel} full onClick={goLearn} style={{ marginBottom: 8 }} />
                : <Btn children={enrollBtnLabel} full onClick={handleEnroll} disabled={enrollmentReqStatus === "pending"} style={{ marginBottom: 8, animation: enrollmentReqStatus === "pending" ? "none" : "pulse 2s infinite", opacity: enrollmentReqStatus === "pending" ? 0.75 : 1 }} />
              }
              <Btn children={lang === "ar" ? "استعرض المنهج" : "View Curriculum"} v="outline" full onClick={openCurriculumPresentation} style={{ fontSize: 12 }} />
              <div style={{ textAlign: "center", marginTop: 10, color: C.muted, fontSize: 10 }}>
                {lang === "ar" ? "ضمان استرداد 14 يوم" : "14-day money-back guarantee"}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Free preview (guests — boosts conversion) ── */}
      {(freePreviewEmbed || freeNote) && (
        <div style={{ background: "linear-gradient(180deg,#1a0f24 0%,#321d3d 100%)", padding: "clamp(24px,5vw,48px) 4%", borderBottom: `1px solid ${C.border}` }}>
          <div style={{ maxWidth: 920, margin: "0 auto" }}>
            <div style={{ color: C.success, fontWeight: 700, fontSize: 11, letterSpacing: 2, marginBottom: 8, textAlign: "center" }}>
              {lang === "ar" ? "معاينة مجانية" : "FREE PREVIEW"}
            </div>
            <h2 style={{ fontSize: "clamp(1.1rem,2.5vw,1.5rem)", fontWeight: 900, marginBottom: 14, textAlign: "center" }}>
              {lang === "ar" ? "جرّب قبل التسجيل" : "Try before you enroll"}
            </h2>
            {freeNote && (
              <p style={{ color: C.muted, fontSize: 14, lineHeight: 1.85, textAlign: "center", marginBottom: freePreviewEmbed ? 18 : 0, maxWidth: 640, marginInline: "auto" }}>
                {freeNote}
              </p>
            )}
            {freePreviewEmbed && (
              <div style={{ position: "relative", paddingBottom: "56.25%", height: 0, borderRadius: 14, overflow: "hidden", border: `1px solid ${C.border}`, boxShadow: "0 12px 40px rgba(0,0,0,.35)" }}>
                <iframe
                  title={lang === "ar" ? "معاينة مجانية" : "Free preview"}
                  src={freePreviewEmbed}
                  style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%", border: "none" }}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Intro video (only if Admin set introVideoUrl) ── */}
      {introEmbed && (
        <div style={{ background: "#1a0f24", padding: "clamp(24px,5vw,48px) 4%", borderBottom: `1px solid ${C.border}` }}>
          <div style={{ maxWidth: 920, margin: "0 auto" }}>
            <div style={{ color: C.orange, fontWeight: 700, fontSize: 11, letterSpacing: 2, marginBottom: 8, textAlign: "center" }}>
              {lang === "ar" ? "مقدمة عن البرنامج" : "COURSE INTRO"}
            </div>
            <h2 style={{ fontSize: "clamp(1.1rem,2.5vw,1.5rem)", fontWeight: 900, marginBottom: 16, textAlign: "center" }}>
              {lang === "ar" ? "فيديو تعريفي" : "Intro video"}
            </h2>
            <div style={{ position: "relative", paddingBottom: "56.25%", height: 0, borderRadius: 14, overflow: "hidden", border: `1px solid ${C.border}`, boxShadow: "0 12px 40px rgba(0,0,0,.35)" }}>
              <iframe
                title={lang === "ar" ? "فيديو تعريفي" : "Course intro"}
                src={introEmbed}
                style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%", border: "none" }}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            </div>
          </div>
        </div>
      )}

      {/* ── WHO IS THIS FOR ── */}
      <div style={{ background: "#2a1540", padding: "clamp(32px,6vw,56px) 4%" }}>
        <div style={{ textAlign: "center", marginBottom: 28 }}>
          <div style={{ color: C.orange, fontWeight: 700, fontSize: 11, letterSpacing: 2, marginBottom: 8 }}>
            {lang === "ar" ? "هل هذا البرنامج لك؟" : "IS THIS FOR YOU?"}
          </div>
          <h2 style={{ fontSize: "clamp(1.2rem,3vw,2rem)", fontWeight: 900 }}>
            {lang === "ar" ? "هذا البرنامج مناسب إذا كنت..." : "This program is right for you if you are..."}
          </h2>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(240px,1fr))", gap: 12, maxWidth: 760, margin: "0 auto" }}>
          {WHO.map((w, i) => (
            <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 10, background: "rgba(255,255,255,.05)", border: `1px solid ${C.border}`, borderRadius: 12, padding: "14px 16px", fontSize: 13, fontWeight: 600 }}>
              <span style={{ width: 6, height: 6, borderRadius: "50%", background: C.orange, flexShrink: 0, marginTop: 7, display: "inline-block" }}></span>
              {w}
            </div>
          ))}
        </div>
      </div>

      {/* ── TECH STACK ── */}
      {course.techStack?.length > 0 && (
        <div style={{ padding: "clamp(32px,6vw,56px) 4%" }}>
          <div style={{ textAlign: "center", marginBottom: 28 }}>
            <div style={{ color: C.orange, fontWeight: 700, fontSize: 11, letterSpacing: 2, marginBottom: 8 }}>
              {lang === "ar" ? "التقنيات" : "TECHNOLOGIES"}
            </div>
            <h2 style={{ fontSize: "clamp(1.2rem,3vw,2rem)", fontWeight: 900 }}>
              {lang === "ar" ? "ما ستتعلمه" : "What You Will Learn"}
            </h2>
          </div>
          <div style={{ maxWidth: 760, margin: "0 auto" }}>
            {course.techStack.map((group, gi) => (
              <div key={gi} style={{ marginBottom: 18 }}>
                <div style={{ fontWeight: 700, fontSize: 12, color: group.ai ? C.red : C.orange, marginBottom: 10, display: "flex", alignItems: "center", gap: 7 }}>
                  <span style={{ width: 3, height: 14, background: group.ai ? C.red : C.orange, borderRadius: 2, display: "inline-block" }}></span>
                  {group.label}
                </div>
                <div style={{ lineHeight: 2.2 }}>
                  {group.items.map(item => (
                    <span key={item} style={{ background: group.ai ? "rgba(250,166,51,.1)" : "rgba(255,255,255,.06)", border: `1px solid ${group.ai ? "rgba(250,166,51,.3)" : "rgba(255,255,255,.11)"}`, color: group.ai ? C.orange : "#fff", borderRadius: 50, padding: "6px 14px", fontSize: 12, fontWeight: 600, display: "inline-block", margin: "3px" }}>
                      {item}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── CURRICULUM ── */}
      {course.curriculum?.length > 0 && (
        <div style={{ background: "#2a1540", padding: "clamp(32px,6vw,56px) 4%" }} id="curriculum">
          <div style={{ textAlign: "center", marginBottom: 28 }}>
            <div style={{ color: C.orange, fontWeight: 700, fontSize: 11, letterSpacing: 2, marginBottom: 8 }}>
              {lang === "ar" ? "المنهج" : "CURRICULUM"}
            </div>
            <h2 style={{ fontSize: "clamp(1.2rem,3vw,2rem)", fontWeight: 900 }}>
              {lang === "ar" ? "محتوى البرنامج" : "Program Content"}
            </h2>
            <p style={{ color: C.muted, fontSize: 13, marginTop: 6 }}>
              {course.curriculum.length} {lang === "ar" ? "وحدة · " : "units · "}{course.hours} {lang === "ar" ? "ساعة تدريب" : "training hours"}
            </p>
          </div>
          <div style={{ maxWidth: 720, margin: "0 auto" }}>
            {course.curriculum.map((ch, ci) => (
              <div key={ci} style={{ border: `1px solid ${openCurr === ci ? C.red + "55" : C.border}`, borderRadius: 13, overflow: "hidden", marginBottom: 8, transition: "border-color .2s" }}>
                <div onClick={() => setOpenCurr(openCurr === ci ? null : ci)}
                  style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "13px 18px", background: openCurr === ci ? `${C.red}10` : "rgba(255,255,255,.04)", cursor: "pointer" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, fontWeight: 700, fontSize: 13 }}>
                    <div style={{ width: 26, height: 26, borderRadius: 7, background: "rgba(217,27,91,.18)", border: "1px solid rgba(217,27,91,.28)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 800, color: C.red, flexShrink: 0 }}>{ci + 1}</div>
                    {ch.title}
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <span style={{ color: C.muted, fontSize: 11 }}>{ch.lessons?.length || 0} {lang === "ar" ? "درس" : "lessons"}</span>
                    <span style={{ color: C.muted, fontSize: 16, transition: "transform .25s", transform: openCurr === ci ? "rotate(180deg)" : "" }}>⌄</span>
                  </div>
                </div>
                {openCurr === ci && (
                  <div style={{ padding: "12px 18px", borderTop: `1px solid ${C.border}` }}>
                    <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
                      {ch.lessons?.map((l, li) => (
                        <div key={li} style={{ color: C.muted, fontSize: 13, display: "flex", alignItems: "flex-start", gap: 10 }}>
                          <span style={{ width: 6, height: 6, borderRadius: "50%", background: isProjectLesson(l) ? C.orange : C.muted, flexShrink: 0, marginTop: 6, display: "inline-block" }}></span>
                          <span>
                            {isProjectLesson(l) && <span style={{ color: C.orange, fontWeight: 700, fontSize: 11, marginInlineEnd: 6 }}>{lang === "ar" ? "مشروع" : "Project"}:</span>}
                            {stripLessonPrefix(l)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── OUTCOMES ── */}
      {displayOutcomes?.length > 0 && (
        <div style={{ padding: "clamp(32px,6vw,56px) 4%" }}>
          <div style={{ textAlign: "center", marginBottom: 28 }}>
            <div style={{ color: C.orange, fontWeight: 700, fontSize: 11, letterSpacing: 2, marginBottom: 8 }}>
              {lang === "ar" ? "مخرجات التعلم" : "OUTCOMES"}
            </div>
            <h2 style={{ fontSize: "clamp(1.2rem,3vw,2rem)", fontWeight: 900 }}>
              {lang === "ar" ? "مهاراتك بعد البرنامج" : "Your Skills After the Program"}
            </h2>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(210px,1fr))", gap: 10, maxWidth: 800, margin: "0 auto" }}>
            {displayOutcomes.map((o, i) => (
              <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 9, background: "rgba(255,255,255,.05)", border: `1px solid ${C.border}`, borderRadius: 12, padding: 13 }}>
                <div style={{ width: 20, height: 20, borderRadius: 6, background: "rgba(16,185,129,.15)", border: "1px solid rgba(16,185,129,.3)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, color: C.success, flexShrink: 0, marginTop: 1 }}>✓</div>
                <span style={{ fontSize: 13, fontWeight: 600, lineHeight: 1.5 }}>{o}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── REVIEWS ── */}
      {course.reviews?.length > 0 && (
        <div style={{ background: "#2a1540", padding: "clamp(32px,6vw,56px) 4%" }}>
          <div style={{ textAlign: "center", marginBottom: 28 }}>
            <div style={{ color: C.orange, fontWeight: 700, fontSize: 11, letterSpacing: 2, marginBottom: 8 }}>
              {lang === "ar" ? "آراء الطلاب" : "STUDENT REVIEWS"}
            </div>
            <h2 style={{ fontSize: "clamp(1.2rem,3vw,2rem)", fontWeight: 900, marginBottom: 4 }}>
              {lang === "ar" ? "ماذا قال الطلاب" : "What Students Say"}
            </h2>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 7 }}>
              <Stars n={5} />
              <span style={{ color: C.muted, fontSize: 13 }}>{course.rating} / 5.0 · {course.reviews.length} {lang === "ar" ? "تقييم" : "reviews"}</span>
            </div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(240px,1fr))", gap: 14 }}>
            {course.reviews.map((r, i) => (
              <Card key={i} style={{ padding: 18 }}>
                <Stars n={r.rating} />
                <p style={{ color: C.muted, fontSize: 12, lineHeight: 1.8, margin: "8px 0 12px" }}>"{r.text}"</p>
                <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
                  <div style={{ width: 34, height: 34, borderRadius: "50%", background: "linear-gradient(135deg,#d91b5b,#b51549)", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: 13, flexShrink: 0 }}>{r.avatar}</div>
                  <div><div style={{ fontWeight: 700, fontSize: 12 }}>{r.name}</div><div style={{ color: C.muted, fontSize: 10 }}>{r.role}</div></div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* ── FAQ ── */}
      <div style={{ padding: "clamp(32px,6vw,56px) 4%" }}>
        <div style={{ textAlign: "center", marginBottom: 28 }}>
          <div style={{ color: C.orange, fontWeight: 700, fontSize: 11, letterSpacing: 2, marginBottom: 8 }}>
            {lang === "ar" ? "الأسئلة الشائعة" : "FAQ"}
          </div>
          <h2 style={{ fontSize: "clamp(1.2rem,3vw,2rem)", fontWeight: 900 }}>
            {lang === "ar" ? "هل لديك سؤال؟" : "Have a Question?"}
          </h2>
        </div>
        <div style={{ maxWidth: 680, margin: "0 auto" }}>
          {FAQ.map((faq, fi) => (
            <div key={fi} style={{ border: `1px solid ${openFaq === fi ? C.orange + "55" : C.border}`, borderRadius: 12, overflow: "hidden", marginBottom: 8, transition: "border-color .2s" }}>
              <div onClick={() => setOpenFaq(openFaq === fi ? null : fi)}
                style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "14px 18px", background: openFaq === fi ? `${C.orange}10` : "rgba(255,255,255,.04)", cursor: "pointer" }}>
                <span style={{ fontWeight: 700, fontSize: 13 }}>{faq.q}</span>
                <span style={{ color: C.muted, fontSize: 18, transition: "transform .25s", transform: openFaq === fi ? "rotate(45deg)" : "" }}>+</span>
              </div>
              {openFaq === fi && (
                <div style={{ padding: "12px 18px", borderTop: `1px solid ${C.border}` }}>
                  <p style={{ color: C.muted, fontSize: 13, lineHeight: 1.8 }}>{faq.a}</p>
                </div>
              )}
            </div>
          ))}
        </div>
        <div style={{ textAlign: "center", marginTop: 20 }}>
          <span style={{ color: C.muted, fontSize: 13 }}>{lang === "ar" ? "هل لديك سؤال آخر؟ " : "Have another question? "}</span>
          <a href="https://wa.me/201044222881" target="_blank" rel="noreferrer"
            style={{ color: "#25d366", fontWeight: 700, fontSize: 13, textDecoration: "none" }}>
            {lang === "ar" ? "تواصل معنا عبر واتساب" : "Chat with us on WhatsApp"}
          </a>
        </div>
      </div>

      {/* ── BOTTOM CTA ── */}
      <div style={{ background: "linear-gradient(135deg,#1a0a2e,#4a1f6e)", border: `1px solid rgba(217,27,91,.2)`, borderRadius: 20, padding: "clamp(24px,5vw,44px)", textAlign: "center", margin: "0 4% 80px", position: "relative", overflow: "hidden" }}>
        <div style={{ position: "absolute", top: "-30px", right: "-30px", width: 200, height: 200, background: "radial-gradient(circle,rgba(217,27,91,.22),transparent 70%)", borderRadius: "50%" }} />
        <h2 style={{ fontSize: "clamp(1.2rem,3vw,1.8rem)", fontWeight: 900, marginBottom: 8, position: "relative" }}>
          {lang === "ar" ? "ابدأ رحلتك الآن" : "Start Your Journey Now"}
        </h2>
        <p style={{ color: C.muted, fontSize: 13, marginBottom: 22, position: "relative" }}>
          {lang === "ar" ? "الدفعة القادمة محدودة — الأماكن تمتلئ بسرعة" : "Next batch is limited — spots fill up fast"}
        </p>
        <div style={{ display: "flex", gap: 10, justifyContent: "center", flexWrap: "wrap", position: "relative" }}>
          <Btn children={enrolled ? enrollBtnLabel : `${enrollBtnLabel} — ${priceNum.toLocaleString()} EGP`} onClick={enrolled ? goLearn : handleEnroll} disabled={!enrolled && enrollmentReqStatus === "pending"} style={{ padding: "13px 30px", fontSize: 14, borderRadius: 12 }} />
          <a href="https://wa.me/201044222881" target="_blank" rel="noreferrer"
            style={{ background: "#25d366", color: "#fff", padding: "13px 24px", borderRadius: 12, fontFamily: "'Cairo',sans-serif", fontWeight: 700, fontSize: 13, textDecoration: "none", display: "inline-flex", alignItems: "center", gap: 8 }}>
            {lang === "ar" ? "استفسر عبر واتساب" : "Ask on WhatsApp"}
          </a>
        </div>
        <div style={{ marginTop: 12, color: C.muted, fontSize: 11, position: "relative" }}>
          {lang === "ar" ? "دفع آمن · ضمان استرداد 14 يوم · شهادة معتمدة" : "Secure payment · 14-day money-back · Accredited certificate"}
        </div>
      </div>

      {/* ── STICKY BAR ── */}
      <div style={{ position: "fixed", bottom: 0, left: 0, right: 0, background: "rgba(26,10,46,.97)", backdropFilter: "blur(16px)", borderTop: `1px solid ${C.border}`, padding: "10px 4%", display: "flex", alignItems: "center", justifyContent: "space-between", zIndex: 90, gap: 12, flexWrap: "wrap" }}>
        <div>
          <div style={{ fontWeight: 800, fontSize: 13 }}>{lang === "ar" ? course.title : (course.title_en || course.title)}</div>
          <div style={{ color: C.muted, fontSize: 11 }}>{dur(course.duration)} · {hoursNum}h · {projectsNum}+ {lang === "ar" ? "مشروع" : "projects"}</div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ fontSize: 18, fontWeight: 900, color: C.orange }}>{priceNum.toLocaleString()} EGP</div>
          {enrolled
            ? <Btn children={enrollBtnLabel} sm onClick={goLearn} />
            : <Btn children={enrollBtnLabel} sm onClick={handleEnroll} disabled={enrollmentReqStatus === "pending"} />
          }
        </div>
      </div>
    </div>
  );
}
