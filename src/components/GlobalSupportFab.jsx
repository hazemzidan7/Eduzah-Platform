import { useLang } from "../context/LangContext";

const WA = "https://wa.me/201044222881";

export default function GlobalSupportFab() {
  const { lang } = useLang();
  const ar = lang === "ar";

  return (
    <div
      style={{
        position: "fixed",
        bottom: 88,
        [ar ? "left" : "right"]: 22,
        zIndex: 280,
        display: "flex",
        flexDirection: "column",
        gap: 10,
      }}
    >
      <a
        href={WA}
        target="_blank"
        rel="noreferrer"
        title={ar ? "دعم واتساب" : "WhatsApp support"}
        aria-label={ar ? "تواصل مع الدعم عبر واتساب" : "Contact support on WhatsApp"}
        style={{
          width: 48,
          height: 48,
          borderRadius: "50%",
          background: "linear-gradient(135deg,#0ea5e9,#0369a1)",
          color: "#fff",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          boxShadow: "0 6px 24px rgba(14,165,233,.45)",
          textDecoration: "none",
          fontWeight: 900,
          fontSize: 18,
          transition: "transform .2s, box-shadow .2s",
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = "scale(1.08)";
          e.currentTarget.style.boxShadow = "0 8px 28px rgba(14,165,233,.55)";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = "";
          e.currentTarget.style.boxShadow = "0 6px 24px rgba(14,165,233,.45)";
        }}
           >
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
          <circle cx="12" cy="12" r="10" />
          <path d="M9.5 9.5a2.5 2.5 0 1 1 4.2 1.8c-.7.6-1.2 1.2-1.2 2.2v.5" />
          <circle cx="12" cy="17" r="0.5" fill="currentColor" stroke="none" />
        </svg>
      </a>
    </div>
  );
}
