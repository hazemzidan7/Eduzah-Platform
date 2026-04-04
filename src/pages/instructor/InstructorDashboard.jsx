import { useState } from "react";
import { C, gPur } from "../../theme";
import { Card, Badge, Btn, Modal, Input, Select } from "../../components/UI";
import { useAuth } from "../../context/AuthContext";
import { useData } from "../../context/DataContext";
import { useLang } from "../../context/LangContext";

// ── Image upload helper ──
const readFile = (file, cb) => {
  const r = new FileReader();
  r.onloadend = () => cb(r.result);
  r.readAsDataURL(file);
};

// ── Small stat card ──
const Stat = ({ icon, label, value, color }) => (
  <Card style={{ padding: "16px 14px", textAlign: "center" }}>
    <div style={{ fontSize: 22, marginBottom: 6 }}>{icon}</div>
    <div style={{ fontSize: 22, fontWeight: 900, color }}>{value}</div>
    <div style={{ color: C.muted, fontSize: 12 }}>{label}</div>
  </Card>
);

export default function InstructorDashboard() {
  const { currentUser, users } = useAuth();
  const { courses, exams, updateCourse, addExam, deleteExam } = useData();
  const { lang } = useLang();
  const ar = lang === "ar";
  const dir = ar ? "rtl" : "ltr";
  const tx = (a, e) => (ar ? a : e);

  const [tab, setTab] = useState("overview");
  const [modal, setModal] = useState(null);
  const [toast, setToast] = useState(null);

  const showT = (msg, type = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 2800);
  };

  // Courses assigned via Admin "تعيين" OR courses with instructorId matching this user
  const myCourses = courses.filter(c =>
    c.instructorId === currentUser?.id ||
    (currentUser?.assignedCourses || []).includes(c.id)
  );
  const myExams    = exams.filter(e => myCourses.find(c => c.id === e.courseId));
  const myStudents = users.filter(u =>
    u.role === "student" && u.enrolledCourses.some(e => myCourses.find(c => c.id === e.courseId))
  );

  const tabs = ar
    ? [
        ["overview", "🏠 نظرة عامة"],
        ["courses", "📚 كورساتي"],
        ["students", "👨‍🎓 الطلاب"],
        ["sessions", "🎬 الفيديوهات"],
        ["materials", "📄 الملفات"],
        ["exams", "📝 الامتحانات"],
      ]
    : [
        ["overview", "🏠 Overview"],
        ["courses", "📚 My courses"],
        ["students", "👨‍🎓 Students"],
        ["sessions", "🎬 Videos"],
        ["materials", "📄 Materials"],
        ["exams", "📝 Exams"],
      ];

  /* ── Add Session Modal ── */
  const AddSessionModal = ({ course }) => {
    const [f, setF] = useState({ title: "", url: "", desc: "" });
    const set = k => e => setF(p => ({ ...p, [k]: e.target.value }));
    const submit = () => {
      if (!f.title || !f.url) { showT(tx("❗ أدخل العنوان والرابط", "❗ Enter title and URL"), "error"); return; }
      const existing = course.curriculum || [];
      // Add as a new chapter or append to last chapter
      const newLesson = f.title;
      let updated;
      if (existing.length === 0) {
        updated = [{ title: ar ? "جلسات" : "Sessions", lessons: [newLesson], videoUrls: [{ title: f.title, url: f.url, desc: f.desc }] }];
      } else {
        const chapters = [...existing];
        const last = { ...chapters[chapters.length - 1] };
        last.lessons = [...(last.lessons || []), newLesson];
        last.videoUrls = [...(last.videoUrls || []), { title: f.title, url: f.url, desc: f.desc }];
        chapters[chapters.length - 1] = last;
        updated = chapters;
      }
      updateCourse(course.id, { curriculum: updated });
      showT(tx("✅ تم إضافة الفيديو!", "✅ Video added!"));
      setModal(null);
    };
    return (
      <Modal title={tx(`🎬 إضافة فيديو – ${course.title}`, `🎬 Add video – ${course.title}`)} onClose={() => setModal(null)}>
        <Input label={tx("عنوان الدرس *", "Lesson title *")} value={f.title} onChange={v => setF(p => ({ ...p, title: v }))} placeholder={tx("مثال: درس 1 – HTML Basics", "e.g. Lesson 1 – HTML Basics")} />
        <Input label={tx("رابط الفيديو (YouTube / Vimeo) *", "Video URL (YouTube / Vimeo) *")} value={f.url} onChange={v => setF(p => ({ ...p, url: v }))} placeholder="https://youtu.be/..." />
        <Input label={tx("وصف الدرس (اختياري)", "Description (optional)")} value={f.desc} onChange={v => setF(p => ({ ...p, desc: v }))} placeholder={tx("ما الذي ستتعلمه في هذا الدرس...", "What you will learn...")} rows={2} />
        <Btn children={tx("✅ إضافة الفيديو", "✅ Add video")} full onClick={submit} style={{ marginTop: 8 }} />
      </Modal>
    );
  };

  /* ── Add Material Modal ── */
  const AddMaterialModal = ({ course }) => {
    const [f, setF] = useState({ title: "", url: "", type: "pdf" });
    const [fileData, setFileData] = useState(null);
    const set = k => e => setF(p => ({ ...p, [k]: e.target.value }));
    const submit = () => {
      if (!f.title) { showT(tx("❗ أدخل عنوان الملف", "❗ Enter file title"), "error"); return; }
      if (!f.url && !fileData) { showT(tx("❗ أدخل رابط أو ارفع ملف", "❗ Enter URL or upload a file"), "error"); return; }
      const materials = [...(course.materials || []), {
        id: Date.now(), title: f.title,
        type: f.type, url: fileData || f.url,
      }];
      updateCourse(course.id, { materials });
      showT(tx("✅ تم إضافة الملف!", "✅ File added!"));
      setModal(null);
    };
    return (
      <Modal title={tx(`📄 إضافة ملف – ${course.title}`, `📄 Add file – ${course.title}`)} onClose={() => setModal(null)}>
        <Input label={tx("اسم الملف *", "File name *")} value={f.title} onChange={v => setF(p => ({ ...p, title: v }))} placeholder={tx("مثال: شيت المراجعة – HTML", "e.g. Review sheet – HTML")} />
        <Select label={tx("نوع الملف", "File type")} value={f.type} onChange={v => setF(p => ({ ...p, type: v }))}
          options={[{ v: "pdf", l: "📄 PDF" }, { v: "doc", l: "📝 Word Doc" }, { v: "ppt", l: "📊 PowerPoint" }, { v: "other", l: tx("📎 أخرى", "📎 Other") }]} />
        <div style={{ marginBottom: 12 }}>
          <div style={{ fontSize: 12, color: C.muted, fontWeight: 700, marginBottom: 8 }}>{tx("رفع ملف من جهازك", "Upload from your device")}</div>
          <input type="file" accept=".pdf,.doc,.docx,.ppt,.pptx"
            onChange={e => { if (e.target.files[0]) readFile(e.target.files[0], setFileData); }}
            style={{ color: C.muted, fontSize: 12 }} />
        </div>
        <Input label={tx("أو رابط مباشر للملف", "Or direct file link")} value={f.url} onChange={v => setF(p => ({ ...p, url: v }))} placeholder="https://drive.google.com/..." />
        <Btn children={tx("✅ إضافة الملف", "✅ Add file")} full onClick={submit} style={{ marginTop: 8 }} />
      </Modal>
    );
  };

  /* ── Add Exam Modal ── */
  const AddExamModal = () => {
    const [f, setF] = useState({
      title: "", courseId: myCourses[0]?.id || "",
      type: "truefalse", dueDate: "", duration: "30", description: "",
    });
    const [questions, setQuestions] = useState([]);
    const [qText, setQText] = useState("");
    const [qAnswer, setQAnswer] = useState("true");

    const set = k => e => setF(p => ({ ...p, [k]: e.target.value }));

    const addQ = () => {
      if (!qText.trim()) return;
      if (f.type === "truefalse") {
        setQuestions(p => [...p, { q: qText, answer: qAnswer === "true" }]);
      } else {
        setQuestions(p => [...p, { q: qText }]);
      }
      setQText(""); setQAnswer("true");
    };

    const submit = () => {
      if (!f.title || !f.courseId || !f.dueDate) { showT(tx("❗ أكمل البيانات الأساسية", "❗ Fill required fields"), "error"); return; }
      addExam({ ...f, questions });
      showT(tx("✅ تم إضافة الامتحان!", "✅ Exam created!"));
      setModal(null);
    };

    return (
      <Modal title={tx("📝 إنشاء امتحان جديد", "📝 Create new exam")} onClose={() => setModal(null)}>
        <Input label={tx("عنوان الامتحان *", "Exam title *")} value={f.title} onChange={v => setF(p => ({ ...p, title: v }))} placeholder={tx("امتحان الوحدة الأولى", "Unit 1 exam")} />
        <Select label={tx("الكورس *", "Course *")} value={f.courseId} onChange={v => setF(p => ({ ...p, courseId: v }))}
          options={myCourses.map(c => ({ v: c.id, l: c.title }))} />
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          <Select label={tx("نوع الامتحان", "Exam type")} value={f.type} onChange={v => setF(p => ({ ...p, type: v }))}
            options={[
              { v: "truefalse", l: tx("✅ صح / خطأ", "✅ True / False") },
              { v: "essay", l: tx("📝 مقالي", "📝 Essay") },
              { v: "mcq", l: tx("📋 MCQ (اختيار متعدد)", "📋 Multiple choice") },
              { v: "task", l: tx("🛠 مهمة عملية", "🛠 Practical task") },
            ]} />
          <Input label={tx("الموعد النهائي *", "Due date *")} value={f.dueDate} onChange={v => setF(p => ({ ...p, dueDate: v }))} type="date" />
        </div>
        {(f.type === "task" || f.type === "essay") && (
          <Input label={tx("وصف المهمة / تعليمات", "Task / instructions")} value={f.description} onChange={v => setF(p => ({ ...p, description: v }))} placeholder={tx("اكتب تعليمات الامتحان هنا...", "Exam instructions...")} rows={3} />
        )}
        {(f.type === "truefalse" || f.type === "mcq") && (
          <div style={{ marginBottom: 12 }}>
            <div style={{ fontSize: 12, color: C.muted, fontWeight: 700, marginBottom: 8 }}>{tx("إضافة أسئلة", "Add questions")}</div>
            <Input label={tx("نص السؤال", "Question")} value={qText} onChange={v => setQText(v)} placeholder={tx("اكتب السؤال هنا...", "Type the question...")} />
            {f.type === "truefalse" && (
              <Select label={tx("الإجابة الصحيحة", "Correct answer")} value={qAnswer} onChange={v => setQAnswer(v)}
                options={[{ v: "true", l: tx("✅ صح", "✅ True") }, { v: "false", l: tx("❌ خطأ", "❌ False") }]} />
            )}
            <Btn children={tx("+ إضافة السؤال", "+ Add question")} sm v="outline" onClick={addQ} style={{ marginTop: 4 }} />
            {questions.length > 0 && (
              <div style={{ marginTop: 10 }}>
                <div style={{ fontSize: 11, color: C.muted, marginBottom: 6 }}>{questions.length} {tx("سؤال مضاف:", "question(s) added:")}</div>
                {questions.map((q, i) => (
                  <div key={i} style={{ fontSize: 11, padding: "5px 9px", background: "rgba(255,255,255,.05)", borderRadius: 7, marginBottom: 4, display: "flex", justifyContent: "space-between" }}>
                    <span>{i + 1}. {q.q.slice(0, 40)}</span>
                    {f.type === "truefalse" && <Badge color={q.answer ? C.success : C.danger}>{q.answer ? tx("صح", "T") : tx("خطأ", "F")}</Badge>}
                    <span style={{ color: C.danger, cursor: "pointer" }} onClick={() => setQuestions(p => p.filter((_, j) => j !== i))}>✕</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
        <Btn children={tx("✅ إنشاء الامتحان", "✅ Create exam")} full onClick={submit} style={{ marginTop: 8 }} />
      </Modal>
    );
  };

  return (
    <div dir={dir} style={{ display: "grid", gridTemplateColumns: "175px 1fr", minHeight: "calc(100vh - 58px)" }}>

      {/* Toast */}
      {toast && (
        <div style={{ position: "fixed", top: 65, left: "50%", transform: "translateX(-50%)", background: "#1a0f24", border: `1px solid ${toast.type === "success" ? C.success : C.danger}55`, borderRadius: 12, padding: "10px 20px", fontSize: 12, fontWeight: 700, zIndex: 9999, color: toast.type === "success" ? C.success : C.danger, whiteSpace: "nowrap", boxShadow: "0 4px 20px rgba(0,0,0,.5)" }}>
          {toast.msg}
        </div>
      )}

      {/* Sidebar */}
      <div style={{ background: "#2a1540", borderInlineEnd: `1px solid ${C.border}`, padding: "16px 0" }}>
        <div style={{ padding: "0 13px 12px", fontSize: 10, fontWeight: 700, color: C.muted, letterSpacing: 1 }}>{tx("مدرب", "TRAINER")}</div>
        {tabs.map(([k, l]) => (
          <div key={k} onClick={() => setTab(k)}
            style={{ padding: "9px 13px", cursor: "pointer", color: tab === k ? C.red : C.muted, background: tab === k ? `${C.red}12` : "transparent", fontWeight: tab === k ? 700 : 400, fontSize: 12, transition: "all .2s" }}>
            {l}
          </div>
        ))}
      </div>

      {/* Content */}
      <div style={{ padding: "22px", overflow: "auto" }}>

        {/* ── Overview ── */}
        {tab === "overview" && (
          <div>
            <div style={{ marginBottom: 20 }}>
              <div style={{ color: C.muted, fontSize: 12, marginBottom: 3 }}>{tx("مرحباً 👨‍🏫", "Welcome 👨‍🏫")}</div>
              <h1 style={{ fontWeight: 900, fontSize: 22, margin: 0 }}>{currentUser?.name}</h1>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(130px,1fr))", gap: 12, marginBottom: 22 }}>
              <Stat label={tx("كورساتي", "My courses")}   value={myCourses.length}  icon="📚" color={C.red}    />
              <Stat label={tx("الطلاب", "Students")}    value={myStudents.length} icon="👨‍🎓" color={C.orange} />
              <Stat label={tx("الامتحانات", "Exams")} value={myExams.length}   icon="📝" color={C.purple} />
              <Stat label={tx("الفيديوهات", "Videos")} value={myCourses.reduce((s,c)=>s+(c.curriculum?.flatMap(ch=>ch.lessons)||[]).length,0)} icon="🎬" color="#0ea5e9" />
            </div>
            {myCourses.length === 0 && (
              <Card style={{ padding: 32, textAlign: "center" }}>
                <div style={{ color: C.muted, fontSize: 14 }}>{tx("لم يتم تعيينك لأي كورس بعد. انتظر حتى يقوم الأدمن بالتعيين.", "You have not been assigned to any course yet. Please wait for admin assignment.")}</div>
              </Card>
            )}
          </div>
        )}

        {/* ── My Courses ── */}
        {tab === "courses" && (
          <div>
            <h2 style={{ fontWeight: 900, fontSize: 18, marginBottom: 16 }}>{tx("📚 كورساتي", "📚 My courses")}</h2>
            {myCourses.length === 0
              ? <Card style={{ padding: 32, textAlign: "center" }}><div style={{ color: C.muted }}>{tx("لم يتم تعيينك بعد", "Not assigned yet")}</div></Card>
              : <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(260px,1fr))", gap: 14 }}>
                {myCourses.map(c => {
                  const sc = users.filter(u => u.enrolledCourses.find(e => e.courseId === c.id)).length;
                  const vids = (c.curriculum || []).flatMap(ch => ch.lessons || []).length;
                  const mats = (c.materials || []).length;
                  return (
                    <Card key={c.id} style={{ padding: 18 }}>
                      {c.image
                        ? <img src={c.image} alt={c.title} style={{ width: "100%", height: 120, objectFit: "cover", borderRadius: 10, marginBottom: 12 }} />
                        : <div style={{ height: 90, borderRadius: 10, background: `linear-gradient(135deg,${c.color},#321d3d)`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 32, marginBottom: 12 }}>{c.icon}</div>
                      }
                      <div style={{ fontWeight: 800, fontSize: 14, marginBottom: 8 }}>{c.title}</div>
                      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 12 }}>
                        <Badge color={C.orange}>👨‍🎓 {sc} {tx("طالب", "students")}</Badge>
                        <Badge color="#0ea5e9">🎬 {vids} {tx("درس", "lessons")}</Badge>
                        <Badge color={C.purple}>📄 {mats} {tx("ملف", "files")}</Badge>
                      </div>
                      <div style={{ display: "flex", gap: 8 }}>
                        <Btn children={tx("+ فيديو", "+ Video")} sm v="outline" onClick={() => setModal({ type: "add-session", course: c })} />
                        <Btn children={tx("+ ملف", "+ File")} sm v="outline" onClick={() => setModal({ type: "add-material", course: c })} />
                      </div>
                    </Card>
                  );
                })}
              </div>
            }
          </div>
        )}

        {/* ── Students ── */}
        {tab === "students" && (
          <div>
            <h2 style={{ fontWeight: 900, fontSize: 18, marginBottom: 16 }}>{tx("👨‍🎓 طلابي", "👨‍🎓 My students")}</h2>
            {myStudents.length === 0
              ? <Card style={{ padding: 32, textAlign: "center" }}><div style={{ color: C.muted }}>{tx("لا يوجد طلاب مسجلون بعد", "No enrolled students yet")}</div></Card>
              : <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
                {myStudents.map(u => (
                  <Card key={u.id} style={{ padding: "12px 14px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 9 }}>
                      <div style={{ display: "flex", gap: 9, alignItems: "center" }}>
                        <div style={{ width: 36, height: 36, borderRadius: "50%", background: "linear-gradient(135deg,#d91b5b,#b51549)", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: 14, flexShrink: 0 }}>{u.avatar}</div>
                        <div>
                          <div style={{ fontWeight: 700, fontSize: 13 }}>{u.name}</div>
                          <div style={{ color: C.muted, fontSize: 11 }}>{u.email}</div>
                        </div>
                      </div>
                      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                        {u.enrolledCourses.filter(e => myCourses.find(c => c.id === e.courseId)).map(e => {
                          const c = courses.find(x => x.id === e.courseId);
                          return c ? <Badge key={e.courseId} color={C.purple}>{c.title.slice(0, 18)} – {e.progress}%</Badge> : null;
                        })}
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            }
          </div>
        )}

        {/* ── Sessions ── */}
        {tab === "sessions" && (
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16, flexWrap: "wrap", gap: 10 }}>
              <h2 style={{ fontWeight: 900, fontSize: 18, margin: 0 }}>{tx("🎬 الفيديوهات والجلسات", "🎬 Videos & sessions")}</h2>
              {myCourses.length > 0 && (
                <Select label="" value="" onChange={v => v && setModal({ type: "add-session", course: courses.find(c => c.id === v) })}
                  options={[{ v: "", l: tx("+ إضافة فيديو لكورس...", "+ Add video to course...") }, ...myCourses.map(c => ({ v: c.id, l: c.title }))]} />
              )}
            </div>
            {myCourses.map(c => {
              const allLessons = (c.curriculum || []).flatMap(ch => ch.videoUrls || ch.lessons.map(l => ({ title: l, url: null })));
              if (!allLessons.length) return null;
              return (
                <Card key={c.id} style={{ padding: 18, marginBottom: 14 }}>
                  <div style={{ fontWeight: 800, fontSize: 14, marginBottom: 12 }}>{c.title}</div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
                    {allLessons.map((l, i) => (
                      <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "9px 12px", background: "rgba(255,255,255,.05)", borderRadius: 9 }}>
                        <div>
                          <div style={{ fontSize: 12, fontWeight: 600 }}>🎬 {typeof l === "string" ? l : l.title}</div>
                          {l.url && <div style={{ fontSize: 10, color: C.muted, marginTop: 2 }}>{l.url.slice(0, 40)}...</div>}
                        </div>
                        {l.url && <a href={l.url} target="_blank" rel="noreferrer" style={{ color: C.orange, fontSize: 11, fontWeight: 700, textDecoration: "none" }}>{tx("▶ فتح", "▶ Open")}</a>}
                      </div>
                    ))}
                  </div>
                </Card>
              );
            })}
            {myCourses.every(c => !(c.curriculum || []).flatMap(ch => ch.lessons || []).length) && (
              <Card style={{ padding: 32, textAlign: "center" }}><div style={{ color: C.muted }}>{tx('لا توجد فيديوهات بعد. اضغط "+ إضافة فيديو" لإضافة أول درس.', 'No videos yet. Use "+ Add video" to add the first lesson.')}</div></Card>
            )}
          </div>
        )}

        {/* ── Materials ── */}
        {tab === "materials" && (
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16, flexWrap: "wrap", gap: 10 }}>
              <h2 style={{ fontWeight: 900, fontSize: 18, margin: 0 }}>{tx("📄 الملفات والمواد التعليمية", "📄 Files & materials")}</h2>
              {myCourses.length > 0 && (
                <Select label="" value="" onChange={v => v && setModal({ type: "add-material", course: courses.find(c => c.id === v) })}
                  options={[{ v: "", l: tx("+ إضافة ملف لكورس...", "+ Add file to course...") }, ...myCourses.map(c => ({ v: c.id, l: c.title }))]} />
              )}
            </div>
            {myCourses.map(c => {
              const mats = c.materials || [];
              if (!mats.length) return null;
              return (
                <Card key={c.id} style={{ padding: 18, marginBottom: 14 }}>
                  <div style={{ fontWeight: 800, fontSize: 14, marginBottom: 12 }}>{c.title}</div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
                    {mats.map((m, i) => (
                      <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "9px 12px", background: "rgba(255,255,255,.05)", borderRadius: 9 }}>
                        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                          <Badge color={C.purple}>{m.type.toUpperCase()}</Badge>
                          <span style={{ fontSize: 12, fontWeight: 600 }}>{m.title}</span>
                        </div>
                        {m.url && <a href={m.url} target="_blank" rel="noreferrer" style={{ color: C.orange, fontSize: 11, fontWeight: 700, textDecoration: "none" }}>{tx("⬇ تحميل", "⬇ Download")}</a>}
                      </div>
                    ))}
                  </div>
                </Card>
              );
            })}
            {myCourses.every(c => !(c.materials || []).length) && (
              <Card style={{ padding: 32, textAlign: "center" }}><div style={{ color: C.muted }}>{tx('لا توجد ملفات بعد. اضغط "+ إضافة ملف" لرفع أول ملف.', 'No files yet. Use "+ Add file" to upload the first file.')}</div></Card>
            )}
          </div>
        )}

        {/* ── Exams ── */}
        {tab === "exams" && (
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16, flexWrap: "wrap", gap: 10 }}>
              <h2 style={{ fontWeight: 900, fontSize: 18, margin: 0 }}>{tx("📝 الامتحانات", "📝 Exams")}</h2>
              <Btn children={tx("+ إنشاء امتحان", "+ Create exam")} onClick={() => setModal({ type: "add-exam" })} v="purple" />
            </div>
            {myExams.length === 0
              ? <Card style={{ padding: 32, textAlign: "center" }}><div style={{ color: C.muted }}>{tx("لا توجد امتحانات بعد.", "No exams yet.")}</div></Card>
              : <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
                {myExams.map(e => {
                  const c = courses.find(x => x.id === e.courseId);
                  return (
                    <Card key={e.id} style={{ padding: "13px 15px" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 9 }}>
                        <div>
                          <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 5 }}>{e.title}</div>
                          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                            <Badge color={e.type==="truefalse"?C.success:e.type==="essay"?C.orange:C.red}>
                              {e.type==="truefalse"?tx("✅ صح/خطأ","✅ T/F"):e.type==="essay"?tx("📝 مقالي","📝 Essay"):e.type==="mcq"?tx("📋 MCQ","📋 MCQ"):tx("🛠 مهمة","🛠 Task")}
                            </Badge>
                            {c && <Badge color={C.purple}>{c.title.slice(0, 22)}</Badge>}
                            <span style={{ color: C.muted, fontSize: 10 }}>📅 {e.dueDate}</span>
                            {e.questions?.length > 0 && <Badge color={C.muted}>{e.questions.length} {tx("سؤال", "Q")}</Badge>}
                          </div>
                        </div>
                        <Btn children={tx("🗑 حذف", "🗑 Delete")} sm v="danger" onClick={() => { deleteExam(e.id); showT(tx("تم حذف الامتحان", "Exam deleted"), "error"); }} />
                      </div>
                    </Card>
                  );
                })}
              </div>
            }
          </div>
        )}
      </div>

      {/* ── Modals ── */}
      {modal?.type === "add-session"  && <AddSessionModal  course={modal.course} />}
      {modal?.type === "add-material" && <AddMaterialModal course={modal.course} />}
      {modal?.type === "add-exam"     && <AddExamModal />}
    </div>
  );
}
