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
          background: "#25d366",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          boxShadow: "0 6px 24px rgba(37,211,102,.5)",
          textDecoration: "none",
          transition: "transform .2s, box-shadow .2s",
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = "scale(1.12)";
          e.currentTarget.style.boxShadow = "0 8px 30px rgba(37,211,102,.65)";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = "";
          e.currentTarget.style.boxShadow = "0 6px 24px rgba(37,211,102,.5)";
        }}
      >
        <svg width="28" height="28" viewBox="0 0 24 24" fill="#fff">
          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/>
          <path d="M12 2C6.477 2 2 6.477 2 12c0 1.89.525 3.66 1.438 5.168L2 22l4.978-1.413A9.956 9.956 0 0012 22c5.523 0 10-4.477 10-10S17.523 2 12 2zm0 18a7.946 7.946 0 01-4.048-1.107l-.29-.172-3.005.854.866-2.93-.19-.302A7.944 7.944 0 014 12c0-4.418 3.582-8 8-8s8 3.582 8 8-3.582 8-8 8z"/>
        </svg>
      </a>
    </div>
  );
}
