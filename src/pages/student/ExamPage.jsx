import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { doc, addDoc, collection, query, where, getDocs } from "firebase/firestore";
import { db } from "../../firebase";
import { C, font } from "../../theme";
import { Btn, Badge } from "../../components/UI";
import { useAuth } from "../../context/AuthContext";
import { useData } from "../../context/DataContext";
import { useLang } from "../../context/LangContext";

const COLORS = { correct: "#22c55e", wrong: "#ef4444", selected: C.purple, default: "rgba(255,255,255,.07)" };

export default function ExamPage() {
  const { examId }  = useParams();
  const navigate    = useNavigate();
  const { currentUser } = useAuth();
  const { exams, courses } = useData();
  const { lang } = useLang();
  const ar = lang === "ar";
  const dir = ar ? "rtl" : "ltr";
  const tx = (a, e) => ar ? a : e;

  const exam    = exams.find(e => e.id === examId);
  const course  = exam ? courses.find(c => c.id === exam.courseId) : null;
  const qs      = exam?.questions || [];

  const [answers,   setAnswers]   = useState({});   // { qIndex: choiceIndex }
  const [submitted, setSubmitted] = useState(false);
  const [score,     setScore]     = useState(null);
  const [prevSub,   setPrevSub]   = useState(null); // previous submission
  const [loading,   setLoading]   = useState(true);
  const [saving,    setSaving]    = useState(false);
  const [timeLeft,  setTimeLeft]  = useState(null);

  // Load previous submission
  useEffect(() => {
    if (!examId || !currentUser) return;
    (async () => {
      try {
        const q = query(
          collection(db, "submissions"),
          where("examId", "==", examId),
          where("userId", "==", currentUser.id)
        );
        const snap = await getDocs(q);
        if (!snap.empty) {
          const sub = { id: snap.docs[0].id, ...snap.docs[0].data() };
          setPrevSub(sub);
          setAnswers(sub.answers || {});
          setScore(sub.score);
          setSubmitted(true);
        }
      } catch (err) {
        console.error("Load submission:", err);
      } finally {
        setLoading(false);
      }
    })();
  }, [examId, currentUser]);

  // Timer
  useEffect(() => {
    if (submitted || !exam?.duration || loading) return;
    const mins = parseInt(exam.duration) || 0;
    if (!mins) return;
    setTimeLeft(mins * 60);
  }, [exam?.duration, submitted, loading]);

  useEffect(() => {
    if (timeLeft === null || timeLeft <= 0 || submitted) return;
    const t = setTimeout(() => setTimeLeft(p => p - 1), 1000);
    return () => clearTimeout(t);
  }, [timeLeft, submitted]);

  // Auto-submit on timeout
  useEffect(() => {
    if (timeLeft === 0 && !submitted) handleSubmit();
  }, [timeLeft]);

  const handleSubmit = useCallback(async () => {
    if (saving || submitted) return;
    setSaving(true);
    let correct = 0;
    qs.forEach((q, i) => {
      if (q.correct !== undefined && answers[i] === q.correct) correct++;
    });
    const pct = qs.length > 0 ? Math.round((correct / qs.length) * 100) : 0;
    try {
      await addDoc(collection(db, "submissions"), {
        examId,
        examTitle: exam?.title || "",
        courseId:  exam?.courseId || "",
        userId:    currentUser.id,
        userName:  currentUser.name,
        answers,
        score:     pct,
        correct,
        total:     qs.length,
        submittedAt: new Date().toISOString(),
      });
      setScore(pct);
      setSubmitted(true);
    } catch (err) {
      console.error("Submit error:", err);
    } finally {
      setSaving(false);
    }
  }, [saving, submitted, answers, qs, exam, examId, currentUser]);

  const formatTime = (s) => {
    const m = Math.floor(s / 60), sec = s % 60;
    return `${String(m).padStart(2,"0")}:${String(sec).padStart(2,"0")}`;
  };

  if (!exam) return (
    <div dir={dir} style={{ minHeight: "80vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ color: C.muted }}>{tx("الامتحان غير موجود", "Exam not found")}</div>
    </div>
  );

  if (loading) return (
    <div dir={dir} style={{ minHeight: "80vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ color: C.muted }}>{tx("جاري التحميل...", "Loading...")}</div>
    </div>
  );

  const passed = score !== null && score >= 60;

  return (
    <div dir={dir} style={{ minHeight: "calc(100vh - 60px)", background: "linear-gradient(135deg,#1a0f24,#2a1540)", padding: "30px 16px" }}>
      <div style={{ maxWidth: 780, margin: "0 auto" }}>

        {/* Header */}
        <div style={{ background: "rgba(50,29,61,.9)", border: `1px solid ${C.border}`, borderRadius: 18, padding: "20px 24px", marginBottom: 24 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 12 }}>
            <div>
              <div style={{ color: C.muted, fontSize: 12, marginBottom: 4 }}>{course?.title}</div>
              <h1 style={{ fontFamily: font, fontSize: 20, fontWeight: 900, margin: 0 }}>{exam.title}</h1>
              <div style={{ display: "flex", gap: 8, marginTop: 8, flexWrap: "wrap" }}>
                <Badge color={C.purple}>{qs.length} {tx("سؤال", "questions")}</Badge>
                {exam.duration && <Badge color={C.orange}>{exam.duration} {tx("دقيقة", "min")}</Badge>}
                {exam.dueDate  && <Badge color={C.muted}>{tx("آخر موعد:", "Due:")} {exam.dueDate}</Badge>}
              </div>
            </div>
            {/* Timer */}
            {timeLeft !== null && !submitted && (
              <div style={{ background: timeLeft < 60 ? `${C.danger}22` : "rgba(255,255,255,.07)", border: `1.5px solid ${timeLeft < 60 ? C.danger : C.border}`, borderRadius: 12, padding: "10px 18px", textAlign: "center" }}>
                <div style={{ fontSize: 10, color: C.muted, marginBottom: 2 }}>{tx("الوقت المتبقي", "Time left")}</div>
                <div style={{ fontSize: 22, fontWeight: 900, fontFamily: "monospace", color: timeLeft < 60 ? C.danger : "#fff" }}>{formatTime(timeLeft)}</div>
              </div>
            )}
          </div>
        </div>

        {/* Result banner */}
        {submitted && score !== null && (
          <div style={{ background: passed ? `${COLORS.correct}18` : `${COLORS.wrong}18`, border: `1.5px solid ${passed ? COLORS.correct : COLORS.wrong}`, borderRadius: 16, padding: "20px 24px", marginBottom: 24, textAlign: "center" }}>
            <div style={{ fontSize: 42, fontWeight: 900, color: passed ? COLORS.correct : COLORS.wrong }}>{score}%</div>
            <div style={{ fontSize: 16, fontWeight: 700, marginTop: 4, color: passed ? COLORS.correct : COLORS.wrong }}>
              {passed ? tx("أحسنت! لقد اجتزت الامتحان", "Great job! You passed!") : tx("لم تجتز الامتحان، حاول مرة أخرى", "You didn't pass. Try again later.")}
            </div>
            <div style={{ color: C.muted, fontSize: 13, marginTop: 6 }}>
              {tx(`أجبت على ${prevSub?.correct ?? score > 0 ? Math.round(score * qs.length / 100) : 0} من ${qs.length} صح`, `${prevSub?.correct ?? 0} / ${qs.length} correct`)}
            </div>
          </div>
        )}

        {/* No questions */}
        {qs.length === 0 && (
          <div style={{ background: "rgba(50,29,61,.9)", border: `1px solid ${C.border}`, borderRadius: 16, padding: 40, textAlign: "center", color: C.muted }}>
            {tx("لا توجد أسئلة في هذا الامتحان بعد.", "No questions added to this exam yet.")}
          </div>
        )}

        {/* Questions */}
        {qs.map((q, qi) => {
          const chosen   = answers[qi] ?? null;
          const revealed = submitted;
          const isCorrect = q.correct !== undefined && chosen === q.correct;
          const choiceLabels = ["A", "B", "C", "D"];

          return (
            <div key={qi} style={{ background: "rgba(50,29,61,.85)", border: `1px solid ${revealed ? (isCorrect ? `${COLORS.correct}55` : `${COLORS.wrong}55`) : C.border}`, borderRadius: 16, padding: "20px 22px", marginBottom: 16 }}>
              {/* Question text */}
              <div style={{ display: "flex", gap: 12, alignItems: "flex-start", marginBottom: 16 }}>
                <div style={{ width: 28, height: 28, borderRadius: "50%", background: revealed ? (isCorrect ? COLORS.correct : COLORS.wrong) : C.purple, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 800, flexShrink: 0 }}>
                  {qi + 1}
                </div>
                <div style={{ fontSize: 15, fontWeight: 700, lineHeight: 1.5 }}>{q.q}</div>
              </div>

              {/* MCQ choices */}
              {q.choices && (
                <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
                  {q.choices.filter(c => c?.trim()).map((ch, ci) => {
                    const isSelected = chosen === ci;
                    const isRight    = q.correct === ci;
                    let bg = COLORS.default, border = "transparent", color = "#fff";
                    if (revealed) {
                      if (isRight)                    { bg = `${COLORS.correct}22`; border = COLORS.correct; color = COLORS.correct; }
                      else if (isSelected && !isRight){ bg = `${COLORS.wrong}22`;  border = COLORS.wrong;   color = COLORS.wrong; }
                    } else if (isSelected) {
                      bg = `${COLORS.selected}33`; border = C.purple; color = "#fff";
                    }
                    return (
                      <button key={ci} disabled={revealed}
                        onClick={() => !revealed && setAnswers(p => ({ ...p, [qi]: ci }))}
                        style={{ display: "flex", alignItems: "center", gap: 12, padding: "11px 14px", background: bg, border: `1.5px solid ${border}`, borderRadius: 10, cursor: revealed ? "default" : "pointer", transition: "all .15s", textAlign: "start", fontFamily: font }}>
                        <div style={{ width: 26, height: 26, borderRadius: 7, background: "rgba(255,255,255,.1)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 800, color, flexShrink: 0 }}>
                          {choiceLabels[ci]}
                        </div>
                        <span style={{ fontSize: 13, color, fontWeight: isSelected || (revealed && isRight) ? 700 : 400 }}>{ch}</span>
                        {revealed && isRight    && <span style={{ marginInlineStart: "auto", fontSize: 14 }}>✓</span>}
                        {revealed && isSelected && !isRight && <span style={{ marginInlineStart: "auto", fontSize: 14 }}>✗</span>}
                      </button>
                    );
                  })}
                </div>
              )}

              {/* True/False */}
              {q.answer !== undefined && !q.choices && (
                <div style={{ display: "flex", gap: 10 }}>
                  {[true, false].map(val => {
                    const isSelected = chosen === val;
                    const isRight    = q.answer === val;
                    let border = C.border, bg = COLORS.default;
                    if (revealed) {
                      if (isRight)                    { bg = `${COLORS.correct}22`; border = COLORS.correct; }
                      else if (isSelected && !isRight){ bg = `${COLORS.wrong}22`;  border = COLORS.wrong; }
                    } else if (isSelected) {
                      bg = `${COLORS.selected}33`; border = C.purple;
                    }
                    return (
                      <button key={String(val)} disabled={revealed}
                        onClick={() => !revealed && setAnswers(p => ({ ...p, [qi]: val }))}
                        style={{ flex: 1, padding: "12px", background: bg, border: `1.5px solid ${border}`, borderRadius: 10, color: "#fff", cursor: revealed ? "default" : "pointer", fontFamily: font, fontWeight: 700, fontSize: 14 }}>
                        {val ? tx("صح ✓", "True ✓") : tx("خطأ ✗", "False ✗")}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}

        {/* Submit / Back buttons */}
        <div style={{ display: "flex", gap: 12, marginTop: 8, flexWrap: "wrap" }}>
          {!submitted && qs.length > 0 && (
            <Btn
              children={saving ? tx("جاري الإرسال...", "Submitting...") : tx("تسليم الامتحان", "Submit exam")}
              full onClick={handleSubmit} disabled={saving}
              style={{ padding: "13px", fontSize: 15 }}
            />
          )}
          <Btn
            children={tx("← العودة للكورس", "← Back to course")}
            v="ghost" onClick={() => course ? navigate(`/learn/${course.slug || course.id}`) : navigate("/dashboard")}
            style={{ color: "#fff" }}
          />
        </div>

      </div>
    </div>
  );
}
