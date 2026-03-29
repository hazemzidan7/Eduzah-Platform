import { useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { C, font, gRed, gOr, gPur } from "../theme";
import { useAuth } from "../context/AuthContext";
import { useLang } from "../context/LangContext";
import { Btn } from "./UI";

export default function Navbar() {
  const { currentUser, logout } = useAuth();
  const { lang, toggle, t }    = useLang();
  const navigate  = useNavigate();
  const location  = useLocation();
  const [open, setOpen] = useState(false);

  const role = currentUser?.role;

  const publicLinks = [
    ["/", lang==="ar"?"الرئيسية":"Home"],
    ["/courses", lang==="ar"?"الكورسات":"Courses"],
    ["/corporate", lang==="ar"?"تدريب الشركات":"Corporate"],
    ["/hiring", lang==="ar"?"التوظيف":"Hiring"],
    ["/services", lang==="ar"?"الخدمات":"Services"],
    ["/consultation", lang==="ar"?"استشارة مجانية":"Free Consult"],
    ["/news", lang==="ar"?"الأخبار":"News"],
  ];
  const studentLinks = [
    ["/dashboard", lang==="ar"?"لوحة التحكم":"Dashboard"],
    ["/my-courses", lang==="ar"?"كورساتي":"My Courses"],
    ["/courses", lang==="ar"?"الكورسات":"Courses"],
  ];
  const instructorLinks = [
    ["/dashboard", lang==="ar"?"لوحة التحكم":"Dashboard"],
  ];
  const adminLinks = [
    ["/dashboard", lang==="ar"?"الداشبورد":"Dashboard"],
  ];

  const links = !currentUser ? publicLinks
    : role === "admin"      ? adminLinks
    : role === "instructor" ? instructorLinks
    : studentLinks;

  const avBg    = role === "admin" ? gOr : role === "instructor" ? gPur : gRed;
  const avColor = role === "admin" ? C.pdark : "#fff";

  const doLogout = () => { logout(); navigate("/"); setOpen(false); };

  const LangBtn = () => (
    <button
      onClick={toggle}
      title={lang === "ar" ? "Switch to English" : "التبديل للعربية"}
      style={{
        background: "rgba(255,255,255,.07)",
        border: `1.5px solid ${C.border}`,
        borderRadius: 8,
        padding: "5px 11px",
        color: "#fff",
        fontFamily: font,
        fontWeight: 800,
        fontSize: 11,
        cursor: "pointer",
        display: "flex",
        alignItems: "center",
        gap: 4,
        transition: "all .2s",
        flexShrink: 0,
        letterSpacing: 0.5,
      }}
      onMouseEnter={e => e.currentTarget.style.background = `${C.red}22`}
      onMouseLeave={e => e.currentTarget.style.background = "rgba(255,255,255,.07)"}
    >
      🌐 {lang === "ar" ? "EN" : "ع"}
    </button>
  );

  return (
    <>
      <nav style={{
        position: "sticky", top: 0, zIndex: 200,
        background: "rgba(26,15,36,.97)", backdropFilter: "blur(20px)",
        borderBottom: `1px solid ${C.border}`,
        direction: lang === "ar" ? "rtl" : "ltr",
        boxSizing: "border-box",
      }}>
        <div style={{
          display: "flex", alignItems: "center",
          justifyContent: "space-between",
          padding: "0 4%", height: 60,
          maxWidth: 1400, margin: "0 auto",
        }}>
          {/* Logo */}
          <Link to="/" style={{ fontWeight: 900, fontSize: 22, fontFamily: font, textDecoration: "none", flexShrink: 0 }}>
            <span style={{ color: C.red }}>Edu</span><span style={{ color: C.orange }}>zah</span>
          </Link>

          {/* Desktop links */}
          <div style={{ display: "flex", gap: 2, overflowX: "auto", padding: "0 8px" }}>
            {links.map(([path, label]) => {
              const isActive = path === "/" ? location.pathname === "/" : location.pathname.startsWith(path);
              return (
                <Link key={path} to={path}
                  style={{
                    background: isActive ? "rgba(217,27,91,.18)" : "transparent",
                    border: isActive ? `1px solid ${C.red}44` : "1px solid transparent",
                    color: isActive ? C.red : C.muted,
                    borderRadius: 8, padding: "6px 12px",
                    fontFamily: font, fontSize: 12, fontWeight: 600,
                    cursor: "pointer", transition: "all .2s",
                    whiteSpace: "nowrap", textDecoration: "none", display: "inline-block",
                  }}
                  onMouseEnter={e => { if (!isActive) { e.currentTarget.style.color="#fff"; e.currentTarget.style.background="rgba(255,255,255,.06)"; }}}
                  onMouseLeave={e => { if (!isActive) { e.currentTarget.style.color=C.muted; e.currentTarget.style.background="transparent"; }}}
                >
                  {label}
                </Link>
              );
            })}
          </div>

          {/* Auth + Lang */}
          <div style={{ display: "flex", gap: 8, alignItems: "center", flexShrink: 0 }}>
            <LangBtn />
            {!currentUser ? (
              <>
                <Btn children={lang==="ar"?"دخول":"Login"}    v="outline" sm onClick={() => navigate("/login")} />
                <Btn children={lang==="ar"?"سجّل":"Register"} sm          onClick={() => navigate("/register")} />
              </>
            ) : (
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <div style={{ textAlign: lang === "ar" ? "right" : "left" }}>
                  <div style={{ fontSize: 12, fontWeight: 700 }}>{currentUser.name.split(" ")[0]}</div>
                  <div style={{ fontSize: 10, color: C.muted }}>
                    {role === "admin" ? (lang==="ar"?"مدير":"Admin") : role === "instructor" ? (lang==="ar"?"مدرب":"Trainer") : (lang==="ar"?"طالب":"Student")}
                  </div>
                </div>
                <div
                  style={{
                    width: 34, height: 34, borderRadius: "50%",
                    background: avBg, display: "flex", alignItems: "center",
                    justifyContent: "center", fontWeight: 800, fontSize: 14,
                    color: avColor, flexShrink: 0, cursor: "pointer",
                  }}
                  onClick={() => navigate("/dashboard")}>
                  {currentUser.avatar}
                </div>
                <Btn children={lang==="ar"?"خروج":"Logout"} v="ghost" sm onClick={doLogout} />
              </div>
            )}
          </div>
        </div>
      </nav>

      {/* WhatsApp FAB */}
      <a href="https://wa.me/201044222881" target="_blank" rel="noreferrer"
        style={{
          position: "fixed", bottom: 22,
          [lang === "ar" ? "right" : "left"]: 22,
          width: 50, height: 50, background: "#25d366",
          borderRadius: "50%", display: "flex",
          alignItems: "center", justifyContent: "center",
          boxShadow: "0 4px 20px rgba(37,211,102,.5)",
          zIndex: 300, fontSize: 22, textDecoration: "none",
          transition: "transform .2s",
        }}
        onMouseEnter={e=>e.currentTarget.style.transform="scale(1.1)"}
        onMouseLeave={e=>e.currentTarget.style.transform=""}>
        💬
      </a>
    </>
  );
}
