import { useNavigate } from "react-router-dom";
import { C, gHero, font } from "../../theme";
import { Btn } from "../../components/UI";
import { useLang } from "../../context/LangContext";

export default function NotFound() {
  const navigate = useNavigate();
  const { lang } = useLang();
  const ar = lang === "ar";

  return (
    <div dir={ar ? "rtl" : "ltr"} style={{ minHeight: "calc(100vh - 60px)", background: gHero, display: "flex", alignItems: "center", justifyContent: "center", padding: "40px 16px" }}>
      <div style={{ textAlign: "center", maxWidth: 480 }}>
        <div style={{ fontSize: 100, fontWeight: 900, fontFamily: font, background: `linear-gradient(135deg,${C.red},${C.orange})`, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", lineHeight: 1 }}>
          404
        </div>
        <h1 style={{ fontSize: 24, fontWeight: 800, margin: "16px 0 10px" }}>
          {ar ? "الصفحة غير موجودة" : "Page not found"}
        </h1>
        <p style={{ color: C.muted, fontSize: 14, lineHeight: 1.7, marginBottom: 28 }}>
          {ar
            ? "الصفحة اللي بتدور عليها مش موجودة أو اتنقلت لمكان تاني."
            : "The page you're looking for doesn't exist or has been moved."}
        </p>
        <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
          <Btn children={ar ? "← الرئيسية" : "← Home"} onClick={() => navigate("/")} />
          <Btn children={ar ? "الكورسات" : "Browse courses"} v="outline" onClick={() => navigate("/courses")}
            style={{ color: "#fff", border: `1.5px solid ${C.border}` }} />
        </div>
      </div>
    </div>
  );
}
