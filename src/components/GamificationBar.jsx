import { useLang } from "../context/LangContext";
import { C, font } from "../theme";

const XP_LEVELS = [0, 200, 500, 1000, 2000, 3500, 5000, 7000, 10000, 15000, Infinity];

const LEVEL_NAMES_AR = ["", "مبتدئ", "متعلم", "متقدم", "محترف", "خبير", "معلم", "أستاذ", "نخبة", "أسطورة", "بطل"];
const LEVEL_NAMES_EN = ["", "Beginner", "Learner", "Advancing", "Professional", "Expert", "Mentor", "Master", "Elite", "Legend", "Champion"];

const BADGE_META = {
  first_course:   { emoji: "🎯", ar: "أول كورس",      en: "First Course" },
  first_step:     { emoji: "🎯", ar: "أول خطوة",       en: "First Step" },
  lesson_5:       { emoji: "📚", ar: "5 دروس مكتملة", en: "5 Lessons Done" },
  lessons_10:     { emoji: "📚", ar: "10 دروس",        en: "10 Lessons" },
  lesson_20:      { emoji: "🔥", ar: "20 درس",         en: "20 Lessons" },
  course_done:    { emoji: "🏆", ar: "كورس مكتمل",    en: "Course Complete" },
  course_graduate:{ emoji: "🏆", ar: "خريج",           en: "Graduate" },
  xp_500:         { emoji: "⚡", ar: "500 XP",         en: "500 XP" },
  xp_2000:        { emoji: "💎", ar: "2000 XP",        en: "2000 XP" },
};

const LEVEL_GRADIENTS = [
  "",
  "linear-gradient(135deg,#6b7280,#9ca3af)",      // 1 - gray
  "linear-gradient(135deg,#22c55e,#16a34a)",      // 2 - green
  "linear-gradient(135deg,#3b82f6,#2563eb)",      // 3 - blue
  "linear-gradient(135deg,#8b5cf6,#7c3aed)",      // 4 - purple
  "linear-gradient(135deg,#f59e0b,#d97706)",      // 5 - amber
  "linear-gradient(135deg,#ef4444,#dc2626)",      // 6 - red
  "linear-gradient(135deg,#ec4899,#db2777)",      // 7 - pink
  "linear-gradient(135deg,#06b6d4,#0891b2)",      // 8 - cyan
  "linear-gradient(135deg,#f97316,#ea580c)",      // 9 - orange
  "linear-gradient(135deg,#ffd700,#ff8c00)",      // 10 - gold
];

const LEVEL_GLOW = [
  "",
  "rgba(107,114,128,.5)", "rgba(34,197,94,.5)", "rgba(59,130,246,.5)",
  "rgba(139,92,246,.5)", "rgba(245,158,11,.5)", "rgba(239,68,68,.5)",
  "rgba(236,72,153,.5)", "rgba(6,182,212,.5)", "rgba(249,115,22,.5)",
  "rgba(255,215,0,.6)",
];

export default function GamificationBar({ xp = 0, level = 1, badges = [], streak = 0 }) {
  const { lang } = useLang();
  const ar = lang === "ar";

  const safeLevel = Math.min(Math.max(level, 1), 10);
  const currentThreshold = XP_LEVELS[safeLevel - 1];
  const nextThreshold = XP_LEVELS[safeLevel];
  const isMaxLevel = safeLevel === 10;

  const progressXp = xp - currentThreshold;
  const rangeXp = isMaxLevel ? 1 : nextThreshold - currentThreshold;
  const progressPct = isMaxLevel ? 100 : Math.min(100, Math.round((progressXp / rangeXp) * 100));

  const levelName = ar ? LEVEL_NAMES_AR[safeLevel] : LEVEL_NAMES_EN[safeLevel];
  const gradient = LEVEL_GRADIENTS[safeLevel];
  const glow = LEVEL_GLOW[safeLevel];


  return (
    <div style={{
      background: "rgba(50,29,61,.58)",
      border: `1px solid ${C.border}`,
      borderRadius: 18,
      padding: "16px 20px",
      backdropFilter: "blur(12px)",
      display: "flex",
      alignItems: "center",
      gap: 18,
      flexWrap: "wrap",
    }}>
      <style>{`
        @keyframes xpPulse {
          0%,100% { box-shadow: 0 0 0 0 ${glow}; }
          50%      { box-shadow: 0 0 0 8px transparent; }
        }
        @keyframes barFill {
          from { width: 0%; }
          to   { width: ${progressPct}%; }
        }
        @keyframes badgePop {
          0%   { transform: scale(0.8); opacity:0; }
          60%  { transform: scale(1.1); }
          100% { transform: scale(1);   opacity:1; }
        }
      `}</style>

      {/* Level badge */}
      <div style={{
        width: 56,
        height: 56,
        borderRadius: "50%",
        background: gradient,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0,
        animation: "xpPulse 2.5s ease-in-out infinite",
        fontFamily: font,
        fontWeight: 900,
        fontSize: 20,
        color: "#fff",
        boxShadow: `0 4px 16px ${glow}`,
        position: "relative",
      }}>
        {safeLevel}
        {safeLevel === 10 && (
          <div style={{
            position: "absolute",
            top: -4,
            right: -4,
            fontSize: 14,
          }}>👑</div>
        )}
      </div>

      {/* XP info + progress bar */}
      <div style={{ flex: 1, minWidth: 160 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
          <div>
            <span style={{ fontWeight: 800, fontSize: 14, fontFamily: font }}>
              {ar ? `المستوى ${safeLevel}` : `Level ${safeLevel}`}
            </span>
            <span style={{
              marginInlineStart: 8,
              background: gradient,
              color: "#fff",
              borderRadius: 50,
              padding: "2px 10px",
              fontSize: 11,
              fontWeight: 700,
              fontFamily: font,
            }}>
              {levelName}
            </span>
          </div>
          <span style={{ color: C.orange, fontWeight: 800, fontSize: 13, fontFamily: font }}>
            {xp.toLocaleString()} XP
          </span>
        </div>

        {/* Progress bar */}
        <div style={{
          background: "rgba(255,255,255,.08)",
          borderRadius: 99,
          height: 8,
          overflow: "hidden",
          marginBottom: 5,
        }}>
          <div style={{
            height: "100%",
            width: `${progressPct}%`,
            background: gradient,
            borderRadius: 99,
            animation: "barFill .8s ease-out forwards",
            boxShadow: `0 0 8px ${glow}`,
            transition: "width .6s ease",
          }} />
        </div>

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          {streak > 0 && (
            <span className="streak-badge" style={{ fontSize: 11, padding: "2px 10px" }}>
              🔥 {streak} {ar ? "يوم" : streak === 1 ? "day" : "days"}
            </span>
          )}
          {!isMaxLevel && (
            <span style={{ color: C.muted, fontSize: 11, fontFamily: font }}>
              {(nextThreshold - xp).toLocaleString()} {ar ? "للمستوى التالي" : "to next level"}
            </span>
          )}
          {isMaxLevel && (
            <span style={{ color: C.orange, fontSize: 11, fontWeight: 700, fontFamily: font }}>
              {ar ? "المستوى الأقصى! 🏆" : "Max Level! 🏆"}
            </span>
          )}
        </div>
      </div>

      {/* Badges */}
      {badges && badges.length > 0 && (
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", flexShrink: 0, maxWidth: 160 }}>
          {badges.slice(0, 6).map((badgeId, i) => {
            const meta = BADGE_META[badgeId];
            return (
              <div
                key={badgeId}
                title={meta ? (ar ? meta.ar : meta.en) : badgeId}
                aria-label={meta ? (ar ? meta.ar : meta.en) : badgeId}
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: "50%",
                  background: "rgba(255,255,255,.08)",
                  border: `1px solid ${C.border}`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 16,
                  animation: `badgePop .4s ease ${i * 0.1}s both`,
                  cursor: "default",
                }}>
                {meta ? meta.emoji : "🎖️"}
              </div>
            );
          })}
          {badges.length > 6 && (
            <div style={{
              width: 32, height: 32, borderRadius: "50%",
              background: "rgba(255,255,255,.08)",
              border: `1px solid ${C.border}`,
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 10, fontWeight: 700, color: C.muted, fontFamily: font,
            }}>
              +{badges.length - 6}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
