import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { addDoc, collection } from "firebase/firestore";
import { C } from "../../theme";
import { Btn, Card } from "../../components/UI";
import { useAuth } from "../../context/AuthContext";
import { useData } from "../../context/DataContext";
import { useLang } from "../../context/LangContext";
import { db } from "../../firebase";

const Q_AR = [
  {
    id: "level",
    q: "\u0645\u0627 \u0645\u0633\u062a\u0648\u0627\u0643 \u0627\u0644\u062d\u0627\u0644\u064a \u0641\u064a \u0627\u0644\u0645\u062c\u0627\u0644 \u0627\u0644\u0630\u064a \u062a\u0631\u064a\u062f \u062a\u0639\u0644\u0645\u0647\u061f",
    options: [
      { v: "beginner", l: "\u0645\u0628\u062a\u062f\u0626 \u2014 \u0623\u0628\u062f\u0623 \u0645\u0646 \u0627\u0644\u0635\u0641\u0631" },
      { v: "intermediate", l: "\u0645\u062a\u0648\u0633\u0637 \u2014 \u0639\u0646\u062f\u064a \u0623\u0633\u0627\u0633\u064a\u0627\u062a" },
      { v: "advanced", l: "\u0645\u062a\u0642\u062f\u0645 \u2014 \u0623\u0631\u0641\u0639 \u0645\u0633\u062a\u0648\u0627\u064a" },
    ],
  },
  {
    id: "field",
    q: "\u0623\u064a \u0645\u062c\u0627\u0644 \u064a\u0634\u062f\u0643 \u0623\u0643\u062b\u0631 \u0627\u0644\u0622\u0646\u061f",
    options: [
      { v: "tech", l: "\u062a\u0642\u0646\u064a\u0629 \u0648\u0628\u0631\u0645\u062c\u0629" },
      { v: "hr", l: "\u0645\u0648\u0627\u0631\u062f \u0628\u0634\u0631\u064a\u0629" },
      { v: "leadership", l: "\u0642\u064a\u0627\u062f\u0629 \u0648\u0625\u062f\u0627\u0631\u0629" },
      { v: "soft", l: "\u0645\u0647\u0627\u0631\u0627\u062a \u0634\u062e\u0635\u064a\u0629" },
    ],
  },
  {
    id: "goal",
    q: "\u0645\u0627 \u0647\u062f\u0641\u0643 \u0627\u0644\u0623\u0633\u0627\u0633\u064a \u0645\u0646 \u0627\u0644\u062a\u0639\u0644\u0645\u061f",
    options: [
      { v: "job", l: "\u0627\u0644\u062d\u0635\u0648\u0644 \u0639\u0644\u0649 \u0648\u0638\u064a\u0641\u0629" },
      { v: "promo", l: "\u062a\u0631\u0642\u064a\u0629 \u0623\u0648 \u062a\u0637\u0648\u064a\u0631 \u062f\u0627\u062e\u0644 \u0627\u0644\u0639\u0645\u0644" },
      { v: "freelance", l: "\u0639\u0645\u0644 \u062d\u0631 / \u0645\u0634\u0627\u0631\u064a\u0639" },
      { v: "explore", l: "\u0627\u0643\u062a\u0634\u0627\u0641 \u0627\u0644\u0645\u062c\u0627\u0644" },
    ],
  },
  {
    id: "time",
    q: "\u0643\u0645 \u0633\u0627\u0639\u0629 \u0623\u0633\u0628\u0648\u0639\u064a\u0627\u064b \u064a\u0645\u0643\u0646\u0643 \u0627\u0644\u062a\u062e\u0635\u064a\u0635\u0647\u0627\u061f",
    options: [
      { v: "low", l: "\u0623\u0642\u0644 \u0645\u0646 5 \u0633\u0627\u0639\u0627\u062a" },
      { v: "mid", l: "5\u201310 \u0633\u0627\u0639\u0627\u062a" },
      { v: "high", l: "\u0623\u0643\u062b\u0631 \u0645\u0646 10 \u0633\u0627\u0639\u0627\u062a" },
    ],
  },
];

const Q_EN = [
  {
    id: "level",
    q: "What is your current level in the field you want to learn?",
    options: [
      { v: "beginner", l: "Beginner — starting from scratch" },
      { v: "intermediate", l: "Intermediate — I have basics" },
      { v: "advanced", l: "Advanced — levelling up" },
    ],
  },
  {
    id: "field",
    q: "Which area interests you most?",
    options: [
      { v: "tech", l: "Technology & coding" },
      { v: "hr", l: "Human resources" },
      { v: "leadership", l: "Leadership & management" },
      { v: "soft", l: "Soft skills" },
    ],
  },
  {
    id: "goal",
    q: "What is your main learning goal?",
    options: [
      { v: "job", l: "Get a job" },
      { v: "promo", l: "Promotion / upskill at work" },
      { v: "freelance", l: "Freelance / projects" },
      { v: "explore", l: "Explore the field" },
    ],
  },
  {
    id: "time",
    q: "How many hours per week can you study?",
    options: [
      { v: "low", l: "Under 5 hours" },
      { v: "mid", l: "5–10 hours" },
      { v: "high", l: "More than 10 hours" },
    ],
  },
];

function recommend(answers, courses, activity) {
  const field = answers.field || "tech";
  const level = answers.level || "beginner";
  const time = answers.time || "mid";
  const goal = answers.goal || "job";

  const scored = courses.map((c) => {
    let s = 0;
    if (c.cat === field) s += 5;
    if (c.featured) s += 2;
    const v = activity?.[c.id]?.views || 0;
    s += Math.min(2, v);

    const hours = Number(c.hours) || 60;
    if (level === "beginner" && hours <= 90) s += 1;
    if (level === "advanced" && hours >= 80) s += 2;
    if (time === "low" && hours <= 70) s += 1;
    if (time === "high" && hours >= 90) s += 1;
    if (goal === "job" && (c.badge || c.students > 20)) s += 1;

    return { c, s };
  });

  scored.sort((a, b) => b.s - a.s);
  const top = scored.filter((x) => x.s > 0).slice(0, 3).map((x) => x.c);
  if (top.length > 0) return top;
  return scored.slice(0, 3).map((x) => x.c);
}

export default function PathQuiz() {
  const navigate = useNavigate();
  const { lang } = useLang();
  const { courses } = useData();
  const { currentUser } = useAuth();
  const ar = lang === "ar";
  const dir = ar ? "rtl" : "ltr";

  const questions = ar ? Q_AR : Q_EN;
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState({});
  const [done, setDone] = useState(false);
  const [saving, setSaving] = useState(false);

  const picks = useMemo(
    () => recommend(answers, courses, currentUser?.courseActivity),
    [answers, courses, currentUser?.courseActivity],
  );

  const pick = (id, v) => {
    setAnswers((p) => ({ ...p, [id]: v }));
    if (step < questions.length - 1) setStep((s) => s + 1);
    else setDone(true);
  };

  const saveResults = async () => {
    if (!currentUser) {
      navigate("/login");
      return;
    }
    setSaving(true);
    try {
      await addDoc(collection(db, "pathQuizResults"), {
        userId: currentUser.id,
        email: currentUser.email || "",
        answers,
        recommendedCourseIds: picks.map((c) => c.id),
        createdAt: new Date().toISOString(),
      });
    } catch (e) {
      console.warn("pathQuiz save", e);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div dir={dir} style={{ padding: "clamp(24px,5vw,48px) 5%", maxWidth: 720, margin: "0 auto" }}>
      <button
        type="button"
        onClick={() => navigate(-1)}
        style={{
          background: "transparent",
          border: `1px solid ${C.border}`,
          borderRadius: 8,
          padding: "6px 14px",
          color: C.muted,
          cursor: "pointer",
          marginBottom: 20,
          fontFamily: "'Cairo',sans-serif",
          fontSize: 12,
        }}
      >
        {ar ? "\u2190 \u0631\u062c\u0648\u0639" : "\u2190 Back"}
      </button>

      <h1 style={{ fontSize: "clamp(1.25rem,4vw,1.75rem)", fontWeight: 900, marginBottom: 8 }}>
        {ar
          ? "\u0645\u0634 \u0639\u0627\u0631\u0641 \u062a\u0628\u062f\u0623 \u0645\u0646\u064a\u0646\u061f"
          : "Not sure where to start?"}
      </h1>
      <p style={{ color: C.muted, fontSize: 14, lineHeight: 1.8, marginBottom: 28 }}>
        {ar
          ? "\u062c\u0627\u0648\u0628 \u0639\u0644\u0649 \u0623\u0631\u0628\u0639 \u0623\u0633\u0626\u0644\u0629 \u0633\u0631\u064a\u0639\u0629 \u0648\u0646\u0642\u062a\u0631\u062d \u0639\u0644\u064a\u0643 \u0643\u0648\u0631\u0633\u0627\u062a \u062a\u0646\u0627\u0633\u0628\u0643."
          : "Answer four quick questions and we will suggest courses that fit you."}
      </p>

      {!done ? (
        <Card style={{ padding: "22px 20px" }}>
          <div style={{ fontSize: 12, color: C.orange, fontWeight: 800, marginBottom: 12 }}>
            {ar
              ? `\u0633\u0624\u0627\u0644 ${step + 1} \u0645\u0646 ${questions.length}`
              : `Question ${step + 1} of ${questions.length}`}
          </div>
          <div style={{ fontWeight: 800, fontSize: 16, marginBottom: 18, lineHeight: 1.5 }}>
            {questions[step].q}
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {questions[step].options.map((o) => (
              <button
                key={o.v}
                type="button"
                onClick={() => pick(questions[step].id, o.v)}
                style={{
                  textAlign: dir === "rtl" ? "right" : "left",
                  padding: "14px 16px",
                  borderRadius: 12,
                  border: `1px solid ${C.border}`,
                  background: "rgba(255,255,255,.04)",
                  color: "inherit",
                  fontFamily: "'Cairo',sans-serif",
                  fontWeight: 600,
                  fontSize: 14,
                  cursor: "pointer",
                  transition: "transform .15s, border-color .15s, background .15s",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = `${C.red}66`;
                  e.currentTarget.style.background = `${C.red}12`;
                  e.currentTarget.style.transform = "translateY(-2px)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = C.border;
                  e.currentTarget.style.background = "rgba(255,255,255,.04)";
                  e.currentTarget.style.transform = "";
                }}
              >
                {o.l}
              </button>
            ))}
          </div>
        </Card>
      ) : (
        <div>
          <Card style={{ padding: "22px 20px", marginBottom: 18 }}>
            <div style={{ fontWeight: 900, fontSize: 16, marginBottom: 14 }}>
              {ar ? "\u0627\u0642\u062a\u0631\u0627\u062d\u0627\u062a \u0644\u0643" : "Suggested for you"}
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {picks.map((c) => (
                <div
                  key={c.id}
                  role="button"
                  tabIndex={0}
                  onClick={() => navigate(`/courses/${c.slug}`)}
                  onKeyDown={(e) => e.key === "Enter" && navigate(`/courses/${c.slug}`)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 14,
                    padding: 12,
                    borderRadius: 12,
                    border: `1px solid ${C.border}`,
                    cursor: "pointer",
                    transition: "transform .2s",
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.transform = "translateY(-3px)"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.transform = ""; }}
                >
                  <div
                    style={{
                      width: 52,
                      height: 52,
                      borderRadius: 10,
                      background: c.image ? `url(${c.image}) center/cover` : `linear-gradient(135deg,${c.color || C.red},#321d3d)`,
                      flexShrink: 0,
                    }}
                  />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 800, fontSize: 14 }}>{ar ? c.title : (c.title_en || c.title)}</div>
                    <div style={{ color: C.muted, fontSize: 12, marginTop: 4 }}>
                      {c.price?.toLocaleString?.() ?? c.price} EGP
                    </div>
                  </div>
                  <span style={{ color: C.red, fontWeight: 800 }}>{"\u2190"}</span>
                </div>
              ))}
            </div>
          </Card>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <Btn
              children={ar ? "\u0627\u062d\u0641\u0638 \u0627\u0644\u0646\u062a\u064a\u062c\u0629" : "Save results"}
              onClick={saveResults}
              disabled={saving}
            />
            <Btn
              children={ar ? "\u0643\u0644 \u0627\u0644\u0643\u0648\u0631\u0633\u0627\u062a" : "All courses"}
              v="outline"
              onClick={() => navigate("/courses")}
            />
            <Btn
              children={ar ? "\u0625\u0639\u0627\u062f\u0629 \u0627\u0644\u0627\u062e\u062a\u0628\u0627\u0631" : "Retake"}
              v="outline"
              onClick={() => { setAnswers({}); setStep(0); setDone(false); }}
            />
          </div>
          {!currentUser && (
            <p style={{ color: C.muted, fontSize: 12, marginTop: 14 }}>
              {ar
                ? "\u0633\u062c\u0651\u0644 \u0627\u0644\u062f\u062e\u0648\u0644 \u0644\u062d\u0641\u0638 \u0646\u062a\u064a\u062c\u062a\u0643 \u0641\u064a \u062d\u0633\u0627\u0628\u0643."
                : "Sign in to save your result to your profile."}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
