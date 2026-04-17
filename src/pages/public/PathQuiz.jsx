import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { addDoc, collection } from "firebase/firestore";
import { C } from "../../theme";
import { Btn, Card } from "../../components/UI";
import { useAuth } from "../../context/AuthContext";
import { useData } from "../../context/DataContext";
import { useLang } from "../../context/LangContext";
import { db } from "../../firebase";
import {
  buildPathOutcome,
  buildWhyBullets,
  JOURNEY_AR,
  JOURNEY_EN,
} from "../../constants/pathQuizConfig";

export default function PathQuiz() {
  const navigate = useNavigate();
  const { lang } = useLang();
  const { courses } = useData();
  const { currentUser } = useAuth();
  const ar = lang === "ar";
  const dir = ar ? "rtl" : "ltr";
  const journey = ar ? JOURNEY_AR : JOURNEY_EN;

  const steps = journey.steps;
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState({});
  const [done, setDone] = useState(false);
  const [saving, setSaving] = useState(false);

  const outcome = useMemo(() => {
    if (!done || !answers.q4) return null;
    return buildPathOutcome(answers, courses);
  }, [done, answers, courses]);

  const whyLines = useMemo(() => {
    if (!done || !answers.q4) return [];
    return buildWhyBullets(answers, ar);
  }, [done, answers, ar]);

  const pick = (questionId, value) => {
    setAnswers((p) => ({ ...p, [questionId]: value }));
    if (step < steps.length - 1) setStep((s) => s + 1);
    else setDone(true);
  };

  const saveResults = async () => {
    if (!currentUser) {
      navigate("/login");
      return;
    }
    if (!outcome) return;
    setSaving(true);
    try {
      await addDoc(collection(db, "pathQuizResults"), {
        userId: currentUser.id,
        email: currentUser.email || "",
        pathTrackId: outcome.winner,
        answers,
        learnerComfort: answers.q3,
        recommendedCourseIds: outcome.extended.map((c) => c.id),
        createdAt: new Date().toISOString(),
      });
    } catch (e) {
      console.warn("pathQuiz save", e);
    } finally {
      setSaving(false);
    }
  };

  const trackTitle = outcome ? (ar ? outcome.meta.title_ar : outcome.meta.title_en) : "";

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

      <h1 style={{ fontSize: "clamp(1.25rem,4vw,1.75rem)", fontWeight: 900, marginBottom: 10, lineHeight: 1.35 }}>
        {journey.hookTitle}
      </h1>
      <p style={{ color: C.muted, fontSize: 14, lineHeight: 1.85, marginBottom: 26 }}>
        {journey.hookBody}
      </p>

      {!done ? (
        <Card style={{ padding: "22px 20px" }}>
          <div style={{ fontSize: 12, color: C.orange, fontWeight: 800, marginBottom: 8 }}>
            {journey.stepLabel(step + 1, steps.length)}
          </div>
          <div style={{ fontSize: 12, color: C.muted, marginBottom: 14, lineHeight: 1.6 }}>
            {journey.comfortLine}
          </div>
          <div style={{ fontWeight: 800, fontSize: 16, marginBottom: 18, lineHeight: 1.55 }}>
            {steps[step].q}
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {steps[step].options.map((o) => (
              <button
                key={o.v}
                type="button"
                onClick={() => pick(steps[step].id, o.v)}
                style={{
                  textAlign: dir === "rtl" ? "right" : "left",
                  padding: "14px 16px",
                  borderRadius: 12,
                  border: `1px solid ${C.border}`,
                  background: "rgba(255,255,255,.04)",
                  color: "inherit",
                  fontFamily: "'Cairo',sans-serif",
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
                <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 6 }}>{o.label}</div>
                <div style={{ fontSize: 12, color: C.muted, lineHeight: 1.55, fontWeight: 500 }}>{o.hint}</div>
              </button>
            ))}
          </div>
        </Card>
      ) : (
        outcome && (
          <div>
            <Card style={{ padding: "22px 20px", marginBottom: 18 }}>
              <div style={{ fontWeight: 800, fontSize: 15, marginBottom: 10 }}>{journey.resultTitle}</div>
              <div style={{ fontSize: 13, color: C.muted, marginBottom: 6 }}>
                {journey.resultPathPrefix}
              </div>
              <div style={{ fontSize: "clamp(1.05rem,3vw,1.25rem)", fontWeight: 900, marginBottom: 16 }}>
                {trackTitle}
              </div>

              <div style={{ fontSize: 13, fontWeight: 800, marginBottom: 8, color: C.orange }}>
                {journey.resultWhyTitle}
              </div>
              <ul
                style={{
                  margin: "0 0 18px 0",
                  paddingInlineStart: 20,
                  color: C.muted,
                  fontSize: 13,
                  lineHeight: 1.75,
                }}
              >
                {whyLines.map((line, idx) => (
                  <li key={idx} style={{ marginBottom: 6 }}>
                    {line}
                  </li>
                ))}
              </ul>

              {outcome.hasCatalogGap && (
                <div
                  style={{
                    fontSize: 13,
                    color: C.muted,
                    marginBottom: 16,
                    padding: 12,
                    borderRadius: 10,
                    border: `1px dashed ${C.border}`,
                    lineHeight: 1.65,
                  }}
                >
                  {journey.catalogHint}
                </div>
              )}

              {outcome.starters.length > 0 && (
                <>
                  <div style={{ fontSize: 13, fontWeight: 800, marginBottom: 10 }}>{journey.resultStartTitle}</div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 16 }}>
                    {outcome.starters.map((c, i) => {
                      const isPrep =
                        outcome.needPrep &&
                        outcome.meta.prepCourseIds?.includes(c.id) &&
                        !outcome.meta.courseIds.includes(c.id);
                      return (
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
                          onMouseEnter={(e) => {
                            e.currentTarget.style.transform = "translateY(-3px)";
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.transform = "";
                          }}
                        >
                          <div
                            style={{
                              width: 36,
                              height: 36,
                              borderRadius: "50%",
                              background: `${C.red}22`,
                              border: `1px solid ${C.red}55`,
                              color: C.red,
                              fontWeight: 900,
                              fontSize: 14,
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              flexShrink: 0,
                            }}
                          >
                            {i + 1}
                          </div>
                          <div
                            style={{
                              width: 52,
                              height: 52,
                              borderRadius: 10,
                              background: c.image
                                ? `url(${c.image}) center/cover`
                                : `linear-gradient(135deg,${c.color || C.red},#321d3d)`,
                              flexShrink: 0,
                            }}
                          />
                          <div style={{ flex: 1, minWidth: 0 }}>
                            {isPrep && (
                              <div style={{ fontSize: 10, fontWeight: 800, color: C.orange, marginBottom: 4 }}>
                                {ar ? "\u062e\u0637\u0648\u0629 \u062a\u062d\u0636\u064a\u0631\u064a\u0629" : "Prep step"}
                              </div>
                            )}
                            <div style={{ fontWeight: 800, fontSize: 14 }}>{ar ? c.title : (c.title_en || c.title)}</div>
                            <div style={{ color: C.muted, fontSize: 12, marginTop: 4 }}>
                              {c.hours != null ? `${c.hours} ${ar ? "\u0633\u0627\u0639\u0629" : "hrs"} · ` : ""}
                              {c.price?.toLocaleString?.() ?? c.price} EGP
                            </div>
                          </div>
                          <span style={{ color: C.red, fontWeight: 800 }}>{"\u2190"}</span>
                        </div>
                      );
                    })}
                  </div>
                </>
              )}

              {outcome.extended.length > outcome.starters.length && (
                <>
                  <div style={{ fontSize: 13, fontWeight: 800, marginBottom: 6 }}>
                    {ar ? "\u0644\u0648 \u0643\u0645\u0644\u062a\u060c \u0627\u0644\u062a\u0631\u062a\u064a\u0628 \u0639\u0644\u0649 \u0627\u0644\u0645\u0646\u0635\u0629" : "If you continue, on-platform order"}
                  </div>
                  <div style={{ color: C.muted, fontSize: 12, marginBottom: 10, lineHeight: 1.6 }}>
                    {ar
                      ? "\u0645\u0646 \u0623\u0642\u0644 \u0633\u0627\u0639\u0627\u062a \u0625\u0644\u0649 \u0623\u0643\u062b\u0631 \u0636\u0645\u0646 \u0646\u0641\u0633 \u0627\u0644\u0645\u0633\u0627\u0631."
                      : "Fewer hours to more within the same track."}
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {outcome.extended.slice(outcome.starters.length).map((c) => (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => navigate(`/courses/${c.slug}`)}
                        style={{
                          textAlign: dir === "rtl" ? "right" : "left",
                          padding: "10px 12px",
                          borderRadius: 10,
                          border: `1px solid ${C.border}`,
                          background: "rgba(255,255,255,.03)",
                          color: "inherit",
                          fontFamily: "'Cairo',sans-serif",
                          fontSize: 13,
                          fontWeight: 600,
                          cursor: "pointer",
                        }}
                      >
                        {ar ? c.title : (c.title_en || c.title)}
                      </button>
                    ))}
                  </div>
                </>
              )}

              <p style={{ color: C.muted, fontSize: 12, marginTop: 18, lineHeight: 1.65, marginBottom: 0 }}>
                {journey.resultReassure}
              </p>
            </Card>

            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              <Btn children={ar ? "\u0627\u062d\u0641\u0638 \u0627\u0644\u0646\u062a\u064a\u062c\u0629" : "Save results"} onClick={saveResults} disabled={saving} />
              <Btn children={ar ? "\u0643\u0644 \u0627\u0644\u0643\u0648\u0631\u0633\u0627\u062a" : "All courses"} v="outline" onClick={() => navigate("/courses")} />
              <Btn
                children={ar ? "\u0625\u0639\u0627\u062f\u0629 \u0627\u0644\u0631\u062d\u0644\u0629" : "Start again"}
                v="outline"
                onClick={() => {
                  setAnswers({});
                  setStep(0);
                  setDone(false);
                }}
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
        )
      )}
    </div>
  );
}
