import { useState } from "react";
import { C, gPur } from "../../theme";
import { Card, Badge, Btn, Modal, Input, Select } from "../../components/UI";
import AddSessionModal from "../../components/AddSessionModal";
import { flattenLessonsWithVideos } from "../../utils/courseVideos";
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
const Stat = ({ label, value, color }) => (
  <Card style={{ padding: "16px 14px", textAlign: "center" }}>
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
        ["overview",  "نظرة عامة"],
        ["courses",   "كورساتي"],
        ["students",  "الطلاب"],
        ["sessions",  "الفيديوهات"],
        ["materials", "الملفات"],
        ["exams",     "الامتحانات"],
      ]
    : [
        ["overview",  "Overview"],
        ["courses",   "My courses"],
        ["students",  "Students"],
        ["sessions",  "Videos"],
        ["materials", "Materials"],
        ["exams",     "Exams"],
      ];

  /* ── Add Material Modal ── */
  const AddMaterialModal = ({ course }) => {
    const [f, setF] = useState({ title: "", url: "", type: "pdf" });
    const [fileData, setFileData] = useState(null);
    const submit = () => {
      if (!f.title) { showT(tx("أدخل عنوان الملف", "Enter file title"), "error"); return; }
      if (!f.url && !fileData) { showT(tx("أدخل رابط أو ارفع ملف", "Enter URL or upload a file"), "error"); return; }
      const materials = [...(course.materials || []), {
        id: Date.now(), title: f.title,
        type: f.type, url: fileData || f.url,
      }];
      updateCourse(course.id, { materials });
      showT(tx("تم إضافة الملف!", "File added!"));
      setModal(null);
    };
    return (
      <Modal title={tx(`إضافة ملف – ${course.title}`, `Add file – ${course.title}`)} onClose={() => setModal(null)}>
        <Input label={tx("اسم الملف *", "File name *")} value={f.title} onChange={v => setF(p => ({ ...p, title: v }))} placeholder={tx("مثال: شيت المراجعة – HTML", "e.g. Review sheet – HTML")} />
        <Select label={tx("نوع الملف", "File type")} value={f.type} onChange={v => setF(p => ({ ...p, type: v }))}
          options={[{ v: "pdf", l: "PDF" }, { v: "doc", l: "Word Doc" }, { v: "ppt", l: "PowerPoint" }, { v: "other", l: tx("أخرى", "Other") }]} />
        <div style={{ marginBottom: 12 }}>
          <div style={{ fontSize: 12, color: C.muted, fontWeight: 700, marginBottom: 8 }}>{tx("رفع ملف من جهازك", "Upload from your device")}</div>
          <input type="file" accept=".pdf,.doc,.docx,.ppt,.pptx"
            onChange={e => { if (e.target.files[0]) readFile(e.target.files[0], setFileData); }}
            style={{ color: C.muted, fontSize: 12 }} />
        </div>
        <Input label={tx("أو رابط مباشر للملف", "Or direct file link")} value={f.url} onChange={v => setF(p => ({ ...p, url: v }))} placeholder="https://drive.google.com/..." />
        <Btn children={tx("إضافة الملف", "Add file")} full onClick={submit} style={{ marginTop: 8 }} />
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
    // True/False state
    const [qText, setQText]     = useState("");
    const [qAnswer, setQAnswer] = useState("true");
    // MCQ state
    const [mcqText,    setMcqText]    = useState("");
    const [mcqChoices, setMcqChoices] = useState(["", "", "", ""]);
    const [mcqCorrect, setMcqCorrect] = useState(0);

    const addTFQuestion = () => {
      if (!qText.trim()) return;
      setQuestions(p => [...p, { q: qText, answer: qAnswer === "true" }]);
      setQText(""); setQAnswer("true");
    };

    const addMCQQuestion = () => {
      if (!mcqText.trim()) { showT(tx("اكتب نص السؤال", "Enter question text"), "error"); return; }
      const filled = mcqChoices.filter(c => c.trim());
      if (filled.length < 2) { showT(tx("أضف اختيارين على الأقل", "Add at least 2 choices"), "error"); return; }
      if (!mcqChoices[mcqCorrect]?.trim()) { showT(tx("اختر الإجابة الصحيحة", "Select correct answer"), "error"); return; }
      setQuestions(p => [...p, { q: mcqText, choices: mcqChoices, correct: mcqCorrect }]);
      setMcqText(""); setMcqChoices(["", "", "", ""]); setMcqCorrect(0);
    };

    const submit = () => {
      if (!f.title || !f.courseId || !f.dueDate) { showT(tx("أكمل البيانات الأساسية", "Fill required fields"), "error"); return; }
      addExam({ ...f, questions });
      showT(tx("تم إضافة الامتحان!", "Exam created!"));
      setModal(null);
    };

    const choiceLabels = ["A", "B", "C", "D"];

    return (
      <Modal title={tx("إنشاء امتحان جديد", "Create new exam")} onClose={() => setModal(null)}>
        <Input label={tx("عنوان الامتحان *", "Exam title *")} value={f.title} onChange={v => setF(p => ({ ...p, title: v }))} placeholder={tx("امتحان الوحدة الأولى", "Unit 1 exam")} />
        <Select label={tx("الكورس *", "Course *")} value={f.courseId} onChange={v => setF(p => ({ ...p, courseId: v }))}
          options={myCourses.map(c => ({ v: c.id, l: c.title }))} />
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          <Select label={tx("نوع الامتحان", "Exam type")} value={f.type} onChange={v => { setF(p => ({ ...p, type: v })); setQuestions([]); }}
            options={[
              { v: "truefalse", l: tx("صح / خطأ", "True / False") },
              { v: "essay",     l: tx("مقالي", "Essay") },
              { v: "mcq",       l: tx("MCQ (اختيار متعدد)", "Multiple choice") },
              { v: "task",      l: tx("مهمة عملية", "Practical task") },
            ]} />
          <Input label={tx("الموعد النهائي *", "Due date *")} value={f.dueDate} onChange={v => setF(p => ({ ...p, dueDate: v }))} type="date" />
        </div>

        {(f.type === "task" || f.type === "essay") && (
          <Input label={tx("وصف المهمة / تعليمات", "Task / instructions")} value={f.description} onChange={v => setF(p => ({ ...p, description: v }))} placeholder={tx("اكتب تعليمات الامتحان هنا...", "Exam instructions...")} rows={3} />
        )}

        {/* True/False questions */}
        {f.type === "truefalse" && (
          <div style={{ marginBottom: 12 }}>
            <div style={{ fontSize: 12, color: C.muted, fontWeight: 700, marginBottom: 8 }}>{tx("إضافة أسئلة", "Add questions")}</div>
            <Input label={tx("نص السؤال", "Question")} value={qText} onChange={v => setQText(v)} placeholder={tx("اكتب السؤال هنا...", "Type the question...")} />
            <Select label={tx("الإجابة الصحيحة", "Correct answer")} value={qAnswer} onChange={v => setQAnswer(v)}
              options={[{ v: "true", l: tx("صح", "True") }, { v: "false", l: tx("خطأ", "False") }]} />
            <Btn children={tx("+ إضافة السؤال", "+ Add question")} sm v="outline" onClick={addTFQuestion} style={{ marginTop: 4 }} />
          </div>
        )}

        {/* MCQ questions */}
        {f.type === "mcq" && (
          <div style={{ marginBottom: 12, background: "rgba(255,255,255,.03)", border: `1px solid ${C.border}`, borderRadius: 12, padding: "14px 14px 10px" }}>
            <div style={{ fontSize: 12, color: C.orange, fontWeight: 700, marginBottom: 10 }}>{tx("إضافة سؤال اختيار متعدد", "Add MCQ question")}</div>
            <Input label={tx("نص السؤال *", "Question text *")} value={mcqText} onChange={v => setMcqText(v)} placeholder={tx("اكتب السؤال هنا...", "Type the question...")} />

            <div style={{ fontSize: 12, color: C.muted, fontWeight: 700, margin: "8px 0 6px" }}>{tx("الاختيارات", "Choices")}</div>
            {mcqChoices.map((ch, i) => (
              <div key={i} style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 7 }}>
                {/* correct radio */}
                <div
                  onClick={() => setMcqCorrect(i)}
                  title={tx("صح", "Correct")}
                  style={{
                    width: 18, height: 18, borderRadius: "50%", flexShrink: 0, cursor: "pointer",
                    border: `2px solid ${mcqCorrect === i ? C.success : C.border}`,
                    background: mcqCorrect === i ? C.success : "transparent",
                    display: "flex", alignItems: "center", justifyContent: "center",
                  }}>
                  {mcqCorrect === i && <div style={{ width: 7, height: 7, borderRadius: "50%", background: "#fff" }} />}
                </div>
                <div style={{ width: 22, height: 22, borderRadius: 6, background: mcqCorrect === i ? `${C.success}22` : "rgba(255,255,255,.07)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 800, color: mcqCorrect === i ? C.success : C.muted, flexShrink: 0 }}>
                  {choiceLabels[i]}
                </div>
                <input
                  value={ch}
                  onChange={e => { const n = [...mcqChoices]; n[i] = e.target.value; setMcqChoices(n); }}
                  placeholder={tx(`الاختيار ${choiceLabels[i]}`, `Choice ${choiceLabels[i]}`)}
                  style={{ flex: 1, background: "rgba(255,255,255,.06)", border: `1.5px solid ${mcqCorrect === i ? C.success : C.border}`, borderRadius: 8, padding: "7px 10px", color: "#fff", fontFamily: "inherit", fontSize: 12, outline: "none" }}
                />
              </div>
            ))}
            <div style={{ fontSize: 10, color: C.muted, marginBottom: 8 }}>
              {tx("اضغط على الدائرة لتحديد الإجابة الصحيحة", "Click the circle to mark the correct answer")}
            </div>
            <Btn children={tx("+ إضافة السؤال", "+ Add question")} sm v="outline" onClick={addMCQQuestion} />
          </div>
        )}

        {/* Questions list */}
        {(f.type === "truefalse" || f.type === "mcq") && questions.length > 0 && (
          <div style={{ marginBottom: 12 }}>
            <div style={{ fontSize: 11, color: C.muted, marginBottom: 6 }}>{questions.length} {tx("سؤال مضاف:", "question(s) added:")}</div>
            {questions.map((q, i) => (
              <div key={i} style={{ background: "rgba(255,255,255,.05)", borderRadius: 9, padding: "8px 11px", marginBottom: 6 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
                  <div style={{ fontSize: 12, fontWeight: 600, flex: 1 }}>{i + 1}. {q.q}</div>
                  <div style={{ display: "flex", gap: 6, alignItems: "center", flexShrink: 0 }}>
                    {f.type === "truefalse" && <Badge color={q.answer ? C.success : C.danger}>{q.answer ? tx("صح", "True") : tx("خطأ", "False")}</Badge>}
                    {f.type === "mcq" && <Badge color={C.success}>{choiceLabels[q.correct]}: {q.choices[q.correct]?.slice(0, 20)}</Badge>}
                    <span style={{ color: C.danger, cursor: "pointer", fontSize: 13 }} onClick={() => setQuestions(p => p.filter((_, j) => j !== i))}>✕</span>
                  </div>
                </div>
                {f.type === "mcq" && (
                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 6 }}>
                    {q.choices.filter(c => c.trim()).map((c, ci) => (
                      <span key={ci} style={{ fontSize: 10, padding: "2px 8px", borderRadius: 5, background: ci === q.correct ? `${C.success}22` : "rgba(255,255,255,.06)", color: ci === q.correct ? C.success : C.muted, border: `1px solid ${ci === q.correct ? C.success : "transparent"}` }}>
                        {choiceLabels[ci]}. {c}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        <Btn children={tx("إنشاء الامتحان", "Create exam")} full onClick={submit} style={{ marginTop: 8 }} />
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
              <div style={{ color: C.muted, fontSize: 12, marginBottom: 3 }}>{tx("مرحباً", "Welcome")}</div>
              <h1 style={{ fontWeight: 900, fontSize: 22, margin: 0 }}>{currentUser?.name}</h1>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(130px,1fr))", gap: 12, marginBottom: 22 }}>
              <Stat label={tx("كورساتي", "My courses")}   value={myCourses.length}  color={C.red}    />
              <Stat label={tx("الطلاب", "Students")}      value={myStudents.length} color={C.orange} />
              <Stat label={tx("الامتحانات", "Exams")}     value={myExams.length}    color={C.purple} />
              <Stat label={tx("الفيديوهات", "Videos")}    value={myCourses.reduce((s,c)=>s+(c.curriculum?.flatMap(ch=>ch.lessons)||[]).length,0)} color="#0ea5e9" />
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
            <h2 style={{ fontWeight: 900, fontSize: 18, marginBottom: 16 }}>{tx("كورساتي", "My courses")}</h2>
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
                        : <div style={{ height: 90, borderRadius: 10, background: `linear-gradient(135deg,${c.color},#321d3d)`, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 12 }}>
                            <span style={{ fontWeight: 900, color: "rgba(255,255,255,.4)", fontSize: "0.75rem", textAlign: "center", padding: "0 10px" }}>{c.title}</span>
                          </div>
                      }
                      <div style={{ fontWeight: 800, fontSize: 14, marginBottom: 8 }}>{c.title}</div>
                      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 12 }}>
                        <Badge color={C.orange}>{sc} {tx("طالب", "students")}</Badge>
                        <Badge color="#0ea5e9">{vids} {tx("درس", "lessons")}</Badge>
                        <Badge color={C.purple}>{mats} {tx("ملف", "files")}</Badge>
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
            <h2 style={{ fontWeight: 900, fontSize: 18, marginBottom: 16 }}>{tx("طلابي", "My students")}</h2>
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
              <h2 style={{ fontWeight: 900, fontSize: 18, margin: 0 }}>{tx("الفيديوهات والجلسات", "Videos & sessions")}</h2>
              {myCourses.length > 0 && (
                <Select label="" value="" onChange={v => v && setModal({ type: "add-session", course: courses.find(c => c.id === v) })}
                  options={[{ v: "", l: tx("+ إضافة فيديو لكورس...", "+ Add video to course...") }, ...myCourses.map(c => ({ v: c.id, l: c.title }))]} />
              )}
            </div>
            {myCourses.map(c => {
              const rows = flattenLessonsWithVideos(c);
              if (!rows.length) return null;
              return (
                <Card key={c.id} style={{ padding: 18, marginBottom: 14 }}>
                  <div style={{ fontWeight: 800, fontSize: 14, marginBottom: 12 }}>{c.title}</div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
                    {rows.map((row, i) => (
                      <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "9px 12px", background: "rgba(255,255,255,.05)", borderRadius: 9, gap: 10 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
                          {row.video?.thumbnail && (
                            <img src={row.video.thumbnail} alt="" style={{ width: 56, height: 32, objectFit: "cover", borderRadius: 4, flexShrink: 0 }} />
                          )}
                          <div style={{ minWidth: 0 }}>
                            <div style={{ fontSize: 12, fontWeight: 600 }}>{row.lessonTitle}</div>
                            {row.video?.url && <div style={{ fontSize: 10, color: C.muted, marginTop: 2, wordBreak: "break-all" }}>{String(row.video.url).slice(0, 48)}…</div>}
                          </div>
                        </div>
                        {row.video?.url && <a href={row.video.url} target="_blank" rel="noreferrer" style={{ color: C.orange, fontSize: 11, fontWeight: 700, textDecoration: "none", flexShrink: 0 }}>{tx("فتح", "Open")}</a>}
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
              <h2 style={{ fontWeight: 900, fontSize: 18, margin: 0 }}>{tx("الملفات والمواد التعليمية", "Files & materials")}</h2>
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
                        {m.url && <a href={m.url} target="_blank" rel="noreferrer" style={{ color: C.orange, fontSize: 11, fontWeight: 700, textDecoration: "none" }}>{tx("تحميل", "Download")}</a>}
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
              <h2 style={{ fontWeight: 900, fontSize: 18, margin: 0 }}>{tx("الامتحانات", "Exams")}</h2>
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
                              {e.type==="truefalse"?tx("صح/خطأ","T/F"):e.type==="essay"?tx("مقالي","Essay"):e.type==="mcq"?"MCQ":tx("مهمة","Task")}
                            </Badge>
                            {c && <Badge color={C.purple}>{c.title.slice(0, 22)}</Badge>}
                            <span style={{ color: C.muted, fontSize: 10 }}>{e.dueDate}</span>
                            {e.questions?.length > 0 && <Badge color={C.muted}>{e.questions.length} {tx("سؤال", "Q")}</Badge>}
                          </div>
                        </div>
                        <Btn children={tx("حذف", "Delete")} sm v="danger" onClick={() => { deleteExam(e.id); showT(tx("تم حذف الامتحان", "Exam deleted"), "error"); }} />
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
      {modal?.type === "add-session" && modal.course && (
        <AddSessionModal
          course={modal.course}
          onClose={() => setModal(null)}
          ar={ar}
          updateCourse={updateCourse}
          addExam={addExam}
          showToast={showT}
        />
      )}
      {modal?.type === "add-material" && <AddMaterialModal course={modal.course} />}
      {modal?.type === "add-exam"     && <AddExamModal />}
    </div>
  );
}
