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
          width: 52,
          height: 52,
          borderRadius: "50%",
          background: "#ffffff",
          border: "1px solid rgba(0,0,0,.08)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          boxShadow: "0 6px 22px rgba(0,0,0,.2)",
          textDecoration: "none",
          overflow: "hidden",
          transition: "transform .2s, box-shadow .2s",
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = "scale(1.08)";
          e.currentTarget.style.boxShadow = "0 8px 28px rgba(0,0,0,.28)";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = "";
          e.currentTarget.style.boxShadow = "0 6px 22px rgba(0,0,0,.2)";
        }}
      >
        <img
          src={ar ? "/logo-ar.png" : "/logo-en.png"}
          alt=""
          style={{ width: 36, height: 36, objectFit: "contain", display: "block" }}
        />
      </a>
    </div>
  );
}
