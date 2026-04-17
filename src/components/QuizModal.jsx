import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useLang } from "../context/LangContext";
import { C, font } from "../theme";
import { normalizeCourseCategory } from "../constants/courseCategories";

const QUESTIONS_AR = [
  {
    q: "ما هدفك؟",
    opts: [
      { id: "job",         label: "الحصول على وظيفة 💼",       interest: "tech" },
      { id: "business",    label: "تطوير أعمالي 🏢",           interest: "management" },
      { id: "freelancing", label: "العمل الحر 🌍",             interest: "tech" },
      { id: "skills",      label: "تطوير مهاراتي ✨",          interest: "english" },
    ],
  },
  {
    q: "ما مستواك الحالي؟",
    opts: [
      { id: "beginner",     label: "مبتدئ 🌱",     exp: "beginner" },
      { id: "intermediate", label: "متوسط 📈",     exp: "intermediate" },
      { id: "advanced",     label: "متقدم 🚀",     exp: "advanced" },
    ],
  },
  {
    q: "كم ساعة تقدر تتعلم أسبوعياً؟",
    opts: [
      { id: "lt5",  label: "أقل من 5 ساعات ⏰",   time: "low" },
      { id: "5_10", label: "5-10 ساعات 🕐",       time: "medium" },
      { id: "gt10", label: "أكثر من 10 ساعات ⚡",  time: "high" },
    ],
  },
  {
    q: "أيه اللي بيشدك أكتر؟",
    opts: [
      { id: "tech",       label: "تكنولوجيا 💻",  cat: "tech" },
      { id: "management", label: "إدارة 📊",       cat: "management" },
      { id: "kids",       label: "تدريب الأطفال 👶", cat: "kids" },
      { id: "english",    label: "اللغة الإنجليزية 🗣️", cat: "english" },
    ],
  },
];

const QUESTIONS_EN = [
  {
    q: "What's your goal?",
    opts: [
      { id: "job",         label: "Get a Job 💼",             interest: "tech" },
      { id: "business",    label: "Grow my Business 🏢",      interest: "management" },
      { id: "freelancing", label: "Freelancing 🌍",           interest: "tech" },
      { id: "skills",      label: "Improve my Skills ✨",     interest: "english" },
    ],
  },
  {
    q: "What's your level?",
    opts: [
      { id: "beginner",     label: "Beginner 🌱",     exp: "beginner" },
      { id: "intermediate", label: "Intermediate 📈", exp: "intermediate" },
      { id: "advanced",     label: "Advanced 🚀",     exp: "advanced" },
    ],
  },
  {
    q: "Hours per week?",
    opts: [
      { id: "lt5",  label: "Less than 5h ⏰",  time: "low" },
      { id: "5_10", label: "5-10h 🕐",         time: "medium" },
      { id: "gt10", label: "10h+ ⚡",           time: "high" },
    ],
  },
  {
    q: "What interests you most?",
    opts: [
      { id: "tech",       label: "Technology 💻", cat: "tech" },
      { id: "management", label: "Management 📊", cat: "management" },
      { id: "kids",       label: "Children training 👶", cat: "kids" },
      { id: "english",    label: "English language 🗣️", cat: "english" },
    ],
  },
];

function scoreCourses(courses, answers) {
  const [goalAns, , , interestAns] = answers;
  const interestCat = interestAns?.cat || goalAns?.interest || "tech";

  return courses.map((course) => {
    let score = 0;
    const cat = normalizeCourseCategory(course.cat);
    const interestNorm = normalizeCourseCategory(interestCat);
    const goalInterestNorm = normalizeCourseCategory(goalAns?.interest);
    if (cat === interestNorm) score += 3;
    else if (cat === goalInterestNorm) score += 1;

    // Default bonus for any enrolled / featured
    if (course.featured) score += 1;
    score += 1; // base

    return { ...course, _score: score };
  })
    .filter(c => c._score > 0)
    .sort((a, b) => b._score - a._score)
    .slice(0, 3);
}

export default function QuizModal({ onClose, courses = [] }) {
  const { lang } = useLang();
  const navigate = useNavigate();
  const ar = lang === "ar";
  const QUESTIONS = ar ? QUESTIONS_AR : QUESTIONS_EN;

  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState([null, null, null, null]);
  const [selected, setSelected] = useState(null);
  const [done, setDone] = useState(false);
  const [recommended, setRecommended] = useState([]);
  const [animating, setAnimating] = useState(false);

  const question = QUESTIONS[step];

  const handleSelect = (opt) => {
    setSelected(opt);
  };

  const handleNext = () => {
    if (!selected) return;
    const newAnswers = [...answers];
    newAnswers[step] = selected;
    setAnswers(newAnswers);

    if (step < QUESTIONS.length - 1) {
      setAnimating(true);
      setTimeout(() => {
        setStep(s => s + 1);
        setSelected(null);
        setAnimating(false);
      }, 250);
    } else {
      const recs = scoreCourses(courses, newAnswers);
      setRecommended(recs);
      setDone(true);
    }
  };

  const handleBack = () => {
    if (step === 0) return;
    setAnimating(true);
    setTimeout(() => {
      setStep(s => s - 1);
      setSelected(answers[step - 1]);
      setAnimating(false);
    }, 200);
  };

  const handleRestart = () => {
    setStep(0);
    setAnswers([null, null, null, null]);
    setSelected(null);
    setDone(false);
    setRecommended([]);
  };

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed", inset: 0,
        background: "rgba(0,0,0,.85)",
        zIndex: 1200,
        display: "flex", alignItems: "center", justifyContent: "center",
        padding: 16,
        backdropFilter: "blur(4px)",
      }}>
      <style>{`
        @keyframes quizSlideIn {
          from { opacity:0; transform: translateY(30px) scale(.96); }
          to   { opacity:1; transform: translateY(0) scale(1); }
        }
        @keyframes quizFadeOut {
          from { opacity:1; transform: translateY(0); }
          to   { opacity:0; transform: translateY(-20px); }
        }
        @keyframes quizOptPulse {
          0%,100% { box-shadow: 0 0 0 0 rgba(217,27,91,.4); }
          50%      { box-shadow: 0 0 0 6px transparent; }
        }
      `}</style>

      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: "linear-gradient(160deg,#1a0a2e 0%,#321d3d 60%,#2a1540 100%)",
          border: `1px solid ${C.border}`,
          borderRadius: 24,
          padding: 28,
          maxWidth: 520,
          width: "100%",
          maxHeight: "90vh",
          overflow: "auto",
          fontFamily: font,
          animation: "quizSlideIn .35s ease both",
          boxShadow: "0 24px 80px rgba(0,0,0,.6)",
          direction: ar ? "rtl" : "ltr",
        }}>

        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
          <div>
            <div style={{ fontWeight: 900, fontSize: 18, marginBottom: 3 }}>
              {ar ? "🎯 اكتشف كورسك المثالي" : "🎯 Find Your Perfect Course"}
            </div>
            {!done && (
              <div style={{ color: C.muted, fontSize: 12 }}>
                {ar ? `السؤال ${step + 1} من ${QUESTIONS.length}` : `Question ${step + 1} of ${QUESTIONS.length}`}
              </div>
            )}
          </div>
          <button
            onClick={onClose}
            style={{
              background: "rgba(255,255,255,.08)",
              border: "none",
              borderRadius: "50%",
              width: 34, height: 34,
              display: "flex", alignItems: "center", justifyContent: "center",
              color: C.muted, fontSize: 16, cursor: "pointer", fontFamily: font,
            }}>✕</button>
        </div>

        {!done ? (
          <>
            {/* Step indicators */}
            <div style={{ display: "flex", gap: 6, marginBottom: 24 }}>
              {QUESTIONS.map((_, i) => (
                <div key={i} style={{
                  flex: 1, height: 4, borderRadius: 99,
                  background: i <= step
                    ? `linear-gradient(90deg,${C.red},${C.orange})`
                    : "rgba(255,255,255,.12)",
                  transition: "background .4s",
                }} />
              ))}
            </div>

            {/* Question */}
            <div style={{
              fontWeight: 800, fontSize: 17, marginBottom: 20,
              opacity: animating ? 0 : 1,
              transform: animating ? "translateY(-10px)" : "translateY(0)",
              transition: "all .25s",
            }}>
              {question.q}
            </div>

            {/* Options */}
            <div style={{
              display: "flex", flexDirection: "column", gap: 10,
              opacity: animating ? 0 : 1,
              transition: "opacity .25s",
            }}>
              {question.opts.map((opt) => {
                const isSelected = selected?.id === opt.id;
                return (
                  <button
                    key={opt.id}
                    onClick={() => handleSelect(opt)}
                    style={{
                      background: isSelected
                        ? `linear-gradient(135deg,rgba(217,27,91,.22),rgba(74,31,110,.22))`
                        : "rgba(255,255,255,.05)",
                      border: `2px solid ${isSelected ? C.red : C.border}`,
                      borderRadius: 12,
                      padding: "14px 18px",
                      color: "#fff",
                      fontFamily: font,
                      fontWeight: 700,
                      fontSize: 14,
                      cursor: "pointer",
                      textAlign: ar ? "right" : "left",
                      transition: "all .2s",
                      animation: isSelected ? "quizOptPulse 1.5s ease-in-out infinite" : "none",
                      boxShadow: isSelected ? `0 4px 20px rgba(217,27,91,.3)` : "none",
                      display: "flex",
                      alignItems: "center",
                      gap: 10,
                    }}
                    onMouseEnter={e => {
                      if (!isSelected) {
                        e.currentTarget.style.background = "rgba(255,255,255,.09)";
                        e.currentTarget.style.borderColor = "rgba(255,255,255,.3)";
                      }
                    }}
                    onMouseLeave={e => {
                      if (!isSelected) {
                        e.currentTarget.style.background = "rgba(255,255,255,.05)";
                        e.currentTarget.style.borderColor = C.border;
                      }
                    }}>
                    {isSelected && (
                      <span style={{
                        width: 20, height: 20, borderRadius: "50%",
                        background: C.red, display: "flex",
                        alignItems: "center", justifyContent: "center",
                        fontSize: 11, flexShrink: 0,
                      }}>✓</span>
                    )}
                    {opt.label}
                  </button>
                );
              })}
            </div>

            {/* Navigation */}
            <div style={{ display: "flex", justifyContent: "space-between", marginTop: 24, gap: 10 }}>
              {step > 0 ? (
                <button
                  onClick={handleBack}
                  style={{
                    background: "rgba(255,255,255,.08)",
                    border: `1px solid ${C.border}`,
                    borderRadius: 10, padding: "10px 20px",
                    color: C.muted, fontFamily: font, fontWeight: 700,
                    fontSize: 13, cursor: "pointer",
                  }}>
                  {ar ? "← السابق" : "← Back"}
                </button>
              ) : <div />}

              <button
                onClick={handleNext}
                disabled={!selected}
                style={{
                  background: selected
                    ? `linear-gradient(135deg,${C.red},${C.rdark})`
                    : "rgba(255,255,255,.08)",
                  border: "none",
                  borderRadius: 10, padding: "10px 28px",
                  color: selected ? "#fff" : C.muted,
                  fontFamily: font, fontWeight: 800, fontSize: 13,
                  cursor: selected ? "pointer" : "not-allowed",
                  transition: "all .2s",
                  boxShadow: selected ? `0 4px 16px rgba(217,27,91,.4)` : "none",
                }}>
                {step === QUESTIONS.length - 1
                  ? (ar ? "🎯 اعرف نتيجتي" : "🎯 See Results")
                  : (ar ? "التالي ←" : "Next →")}
              </button>
            </div>
          </>
        ) : (
          /* Results screen */
          <div>
            <div style={{
              textAlign: "center", marginBottom: 24,
              padding: "20px 0 16px",
              borderBottom: `1px solid ${C.border}`,
            }}>
              <div style={{ fontSize: 40, marginBottom: 8 }}>🎉</div>
              <div style={{ fontWeight: 900, fontSize: 18, marginBottom: 6 }}>
                {ar ? "الكورسات المقترحة ليك" : "Recommended courses for you"}
              </div>
              <div style={{ color: C.muted, fontSize: 13 }}>
                {ar ? "بناءً على إجاباتك، دي أفضل خياراتك" : "Based on your answers, here are your best picks"}
              </div>
            </div>

            {recommended.length === 0 ? (
              <div style={{ textAlign: "center", padding: "30px 0", color: C.muted }}>
                {ar ? "لم نجد كورسات مناسبة حالياً، تصفح كل الكورسات." : "No matching courses found. Browse all courses."}
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 20 }}>
                {recommended.map((course, i) => {
                  const title = ar ? course.title : (course.title_en || course.title);
                  const desc = ar ? (course.desc || "") : (course.desc_en || course.desc || "");
                  return (
                    <div
                      key={course.id}
                      onClick={() => { onClose(); navigate(`/courses/${course.slug}`); }}
                      style={{
                        background: `linear-gradient(135deg,${course.color || C.red}22,rgba(50,29,61,.8))`,
                        border: `1px solid ${course.color || C.red}44`,
                        borderRadius: 14, padding: "14px 16px",
                        cursor: "pointer", transition: "all .2s",
                        display: "flex", alignItems: "center", gap: 14,
                      }}
                      onMouseEnter={e => { e.currentTarget.style.transform = "translateX(-4px)"; }}
                      onMouseLeave={e => { e.currentTarget.style.transform = ""; }}>
                      <div style={{
                        width: 44, height: 44, borderRadius: 10, flexShrink: 0,
                        background: `linear-gradient(135deg,${course.color || C.red},#321d3d)`,
                        display: "flex", alignItems: "center", justifyContent: "center",
                        fontWeight: 900, fontSize: 16, color: "#fff",
                      }}>
                        {i + 1}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 800, fontSize: 14, marginBottom: 3 }}>{title}</div>
                        {desc && (
                          <div style={{ color: C.muted, fontSize: 12, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                            {desc.slice(0, 70)}{desc.length > 70 ? "…" : ""}
                          </div>
                        )}
                        <div style={{ display: "flex", gap: 8, marginTop: 5, alignItems: "center" }}>
                          {course.price && (
                            <span style={{ color: C.orange, fontWeight: 800, fontSize: 12 }}>
                              {Number(course.price).toLocaleString()} EGP
                            </span>
                          )}
                          {course.duration && (
                            <span style={{ color: C.muted, fontSize: 11 }}>{course.duration}</span>
                          )}
                        </div>
                      </div>
                      <span style={{ color: C.red, fontWeight: 800, fontSize: 18, flexShrink: 0 }}>
                        {ar ? "←" : "→"}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}

            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {recommended.length > 0 && (
                <button
                  onClick={() => { onClose(); navigate(`/courses/${recommended[0].slug}`); }}
                  style={{
                    background: `linear-gradient(135deg,${C.red},${C.rdark})`,
                    border: "none", borderRadius: 12, padding: "13px 24px",
                    color: "#fff", fontFamily: font, fontWeight: 800, fontSize: 14,
                    cursor: "pointer", width: "100%",
                    boxShadow: `0 6px 20px rgba(217,27,91,.4)`,
                  }}>
                  {ar ? "اشترك دلوقتي 🚀" : "Enroll Now 🚀"}
                </button>
              )}
              <div style={{ display: "flex", gap: 10 }}>
                <button
                  onClick={() => { onClose(); navigate("/courses"); }}
                  style={{
                    flex: 1, background: "rgba(255,255,255,.08)",
                    border: `1px solid ${C.border}`, borderRadius: 12, padding: "11px 16px",
                    color: "#fff", fontFamily: font, fontWeight: 700, fontSize: 13,
                    cursor: "pointer",
                  }}>
                  {ar ? "تصفح كل الكورسات" : "Browse All Courses"}
                </button>
                <button
                  onClick={handleRestart}
                  style={{
                    background: "rgba(255,255,255,.06)",
                    border: `1px solid ${C.border}`, borderRadius: 12, padding: "11px 16px",
                    color: C.muted, fontFamily: font, fontWeight: 700, fontSize: 13,
                    cursor: "pointer",
                  }}>
                  {ar ? "أعد الاختبار" : "Restart"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
