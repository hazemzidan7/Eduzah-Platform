import { useEffect } from "react";
import { useLang } from "../context/LangContext";

const LEVEL_NAMES_AR = ["", "مبتدئ", "متعلم", "متقدم", "محترف", "خبير", "معلم", "أستاذ", "نخبة", "أسطورة", "بطل"];
const LEVEL_NAMES_EN = ["", "Beginner", "Learner", "Advancing", "Professional", "Expert", "Mentor", "Master", "Elite", "Legend", "Champion"];

export default function LevelUpModal({ level, onClose }) {
  const { lang } = useLang();
  const ar = lang === "ar";
  const name = ar ? LEVEL_NAMES_AR[level] : LEVEL_NAMES_EN[level];

  useEffect(() => {
    const t = setTimeout(onClose, 4000);
    return () => clearTimeout(t);
  }, [onClose]);

  return (
    <div className="levelup-overlay" onClick={onClose} dir={ar ? "rtl" : "ltr"}>
      <div className="levelup-card" onClick={(e) => e.stopPropagation()}>
        <div style={{ fontSize: 56, marginBottom: 12 }}>🎉</div>
        <div style={{ fontWeight: 900, fontSize: 22, marginBottom: 6 }}>
          {ar ? "ارتقيت مستوى!" : "Level Up!"}
        </div>
        <div style={{ fontSize: 16, color: "rgba(248,250,252,.7)", marginBottom: 18 }}>
          {ar ? `أصبحت الآن في المستوى ${level}` : `You're now Level ${level}`}
          {name && <span style={{ marginInlineStart: 8, fontWeight: 800, color: "#ffb84d" }}>{name}</span>}
        </div>
        <button
          onClick={onClose}
          style={{ background: "#ffb84d", color: "#1a0a2e", border: "none", borderRadius: 12, padding: "10px 28px", fontWeight: 800, fontSize: 14, cursor: "pointer" }}
        >
          {ar ? "رائع! واصل" : "Awesome! Keep going"}
        </button>
      </div>
    </div>
  );
}
