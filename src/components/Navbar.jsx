import { useState, useEffect } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { C, gOr, gPur, gRed } from "../theme";
import { useAuth } from "../context/AuthContext";
import { useLang } from "../context/LangContext";
import { isSuperAdminEmail } from "../config/superAdmin";
import { useScrolled } from "../hooks/useScrolled";

const MenuIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
    <line x1="3" y1="6"  x2="21" y2="6"/>
    <line x1="3" y1="12" x2="21" y2="12"/>
    <line x1="3" y1="18" x2="21" y2="18"/>
  </svg>
);
const CloseIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
    <line x1="18" y1="6"  x2="6"  y2="18"/>
    <line x1="6"  y1="6"  x2="18" y2="18"/>
  </svg>
);

export default function Navbar() {
  const { currentUser, logout } = useAuth();
  const { lang, toggle }        = useLang();
  const navigate  = useNavigate();
  const location  = useLocation();
  const scrolled  = useScrolled(20);

  const [open,   setOpen]   = useState(false);
  const [mobile, setMobile] = useState(window.innerWidth < 900);

  useEffect(() => {
    const onResize = () => setMobile(window.innerWidth < 900);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  useEffect(() => { setOpen(false); }, [location.pathname]);

  const role = currentUser?.role;
  const avBg = role === "admin" ? gOr : role === "instructor" ? gPur : gRed;

  /* ── Link definitions ── */
  const publicLinks = [
    ["/",            lang === "ar" ? "الرئيسية"       : "Home"],
    ["/courses",     lang === "ar" ? "الكورسات"       : "Courses"],
    ["sep"],
    ["/corporate",   lang === "ar" ? "تدريب الشركات" : "Corporate"],
    ["/hiring",      lang === "ar" ? "التوظيف"        : "Hiring"],
    ["/services",    lang === "ar" ? "الخدمات"        : "Services"],
    ["sep"],
    ["/team",        lang === "ar" ? "فريقنا"         : "Our Team"],
    ["/consultation",lang === "ar" ? "استشارة مجانية": "Free Consult"],
    ["/news",        lang === "ar" ? "الأخبار"        : "News"],
  ];
  const studentLinks = [
    ["/dashboard",  lang === "ar" ? "لوحة التحكم" : "Dashboard"],
    ["/my-courses", lang === "ar" ? "كورساتي"     : "My Courses"],
    ["/courses",    lang === "ar" ? "الكورسات"    : "Courses"],
  ];
  const instructorLinks = [["/dashboard", lang === "ar" ? "لوحة التحكم" : "Dashboard"]];
  const adminLinks      = [["/dashboard", lang === "ar" ? "الداشبورد"   : "Dashboard"]];

  const links = !currentUser   ? publicLinks
    : role === "admin"         ? adminLinks
    : role === "instructor"    ? instructorLinks
    : studentLinks;

  const isActive = (path) =>
    path === "/" ? location.pathname === "/" : location.pathname.startsWith(path);

  const doLogout = () => { logout(); navigate("/"); setOpen(false); };

  const roleName = role === "admin"
    ? (isSuperAdminEmail(currentUser?.email)
      ? (lang === "ar" ? "Super Admin" : "Super Admin")
      : (lang === "ar" ? "مدير" : "Admin"))
    : role === "instructor" ? (lang === "ar" ? "مدرب"    : "Trainer")
    : role === "user"       ? (lang === "ar" ? "مستخدم"  : "User")
    :                         (lang === "ar" ? "طالب"    : "Student");

  const roleBadgeSx = role === "admin"
    ? { background: "#111827", color: "#fbbf24", border: "1px solid rgba(251,191,36,.35)" }
    : { color: "rgba(248,250,252,.6)", background: "transparent", border: "none" };

  return (
    <nav
      aria-label={lang === "ar" ? "التنقل الرئيسي" : "Main navigation"}
      dir={lang === "ar" ? "rtl" : "ltr"}
      style={{
        position:   "fixed",
        top:        0,
        zIndex:     200,
        width:      "100%",
        background: scrolled ? "var(--nav-bg-scrolled)" : "var(--nav-bg)",
        backdropFilter: "blur(12px)",
        WebkitBackdropFilter: "blur(12px)",
        borderBottom: "1px solid var(--nav-border)",
        boxShadow:  scrolled ? "0 4px 24px rgba(0,0,0,.35)" : "none",
        transition: "background 0.3s ease, box-shadow 0.3s ease",
        color:      "var(--nav-text)",
      }}
    >
      <div style={{
        display:        "flex",
        alignItems:     "center",
        justifyContent: "space-between",
        padding:        "0 4%",
        minHeight:      scrolled ? 54 : 64,
        maxWidth:       1400,
        margin:         "0 auto",
        transition:     "min-height 0.3s ease",
      }}>

        {/* ── Logo ── */}
        <Link to="/" style={{ textDecoration: "none", flexShrink: 0, display: "flex", alignItems: "center" }}>
          <img
            src={lang === "ar" ? "/logo-ar.png" : "/logo-en.png"}
            alt="Eduzah"
            style={{ height: 38, width: "auto", display: "block" }}
          />
        </Link>

        {/* ── Desktop links ── */}
        {!mobile && (
          <div style={{ display: "flex", gap: 4, flex: 1, justifyContent: "center", padding: "0 12px", alignItems: "center" }}>
            {links.map((item, idx) => {
              if (item[0] === "sep") {
                return <span key={`sep-${idx}`} aria-hidden="true" style={{ width: 1, height: 16, background: "rgba(255,255,255,.18)", flexShrink: 0, marginInline: 4 }} />;
              }
              const [path, label] = item;
              return (
                <Link
                  key={path}
                  to={path}
                  className={`nav-link${isActive(path) ? " active" : ""}`}
                >
                  {label}
                </Link>
              );
            })}
          </div>
        )}

        {/* ── Right controls ── */}
        <div style={{ display: "flex", gap: 8, alignItems: "center", flexShrink: 0 }}>

          {/* Language toggle */}
          <button
            type="button"
            onClick={toggle}
            aria-label={lang === "ar" ? "Switch to English" : "التبديل للعربية"}
            style={{
              background:   "rgba(255,255,255,.1)",
              border:       "1.5px solid rgba(255,255,255,.2)",
              borderRadius: 8,
              padding:      "5px 12px",
              color:        "var(--nav-text)",
              fontFamily:   "'Cairo',sans-serif",
              fontWeight:   800,
              fontSize:     11,
              cursor:       "pointer",
              letterSpacing:0.5,
              transition:   "background 0.2s",
            }}
            onMouseEnter={e => e.currentTarget.style.background = "rgba(255,255,255,.18)"}
            onMouseLeave={e => e.currentTarget.style.background = "rgba(255,255,255,.1)"}
          >
            {lang === "ar" ? "EN" : "عر"}
          </button>

          {/* Desktop auth */}
          {!mobile && (
            !currentUser ? (
              <>
                <button
                  className="btn-base btn-ghost btn-sm"
                  onClick={() => navigate("/login")}
                  style={{ color: "var(--nav-link-idle)" }}
                >
                  {lang === "ar" ? "دخول" : "Login"}
                </button>
                <button
                  className="btn-base btn-primary btn-sm"
                  onClick={() => navigate("/register")}
                >
                  {lang === "ar" ? "ابدأ مجاناً" : "Start Free"}
                </button>
              </>
            ) : (
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <div style={{ textAlign: lang === "ar" ? "right" : "left", minWidth: 0, paddingInlineEnd: 4 }}>
                  <div style={{ fontSize: 12, fontWeight: 700, lineHeight: 1.25 }}>
                    {currentUser.name?.split(" ")[0]}
                  </div>
                  <div style={{ fontSize: 10, fontWeight: 800, marginTop: 3, display: "inline-block", padding: "2px 7px", borderRadius: 6, ...roleBadgeSx }}>
                    {roleName}
                  </div>
                </div>
                {/* Avatar */}
                <button
                  onClick={() => navigate("/profile")}
                  title={lang === "ar" ? "بروفايلي" : "My Profile"}
                  aria-label={lang === "ar" ? "بروفايلي" : "My Profile"}
                  style={{
                    width: 34, height: 34, borderRadius: "50%",
                    background: currentUser.avatarImg ? "transparent" : avBg,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontWeight: 800, fontSize: 14, cursor: "pointer", flexShrink: 0,
                    overflow: "hidden", border: `2px solid ${avBg}`,
                    padding: 0,
                  }}
                >
                  {currentUser.avatarImg
                    ? <img src={currentUser.avatarImg} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                    : currentUser.avatar}
                </button>
                <button
                  className="btn-base btn-ghost btn-sm"
                  onClick={doLogout}
                  style={{ color: "rgba(248,250,252,.55)", border: "1px solid rgba(255,255,255,.15)" }}
                >
                  {lang === "ar" ? "خروج" : "Logout"}
                </button>
              </div>
            )
          )}

          {/* Hamburger */}
          {mobile && (
            <button
              onClick={() => setOpen(o => !o)}
              aria-label={open ? (lang === "ar" ? "إغلاق القائمة" : "Close menu") : (lang === "ar" ? "فتح القائمة" : "Open menu")}
              aria-expanded={open}
              style={{
                background:   "rgba(255,255,255,.08)",
                border:       "1.5px solid rgba(255,255,255,.2)",
                borderRadius: 8,
                padding:      "7px 9px",
                color:        "var(--nav-text)",
                cursor:       "pointer",
                display:      "flex",
                alignItems:   "center",
              }}
            >
              {open ? <CloseIcon /> : <MenuIcon />}
            </button>
          )}
        </div>
      </div>

      {/* ── Mobile menu ── */}
      {mobile && open && (
        <div style={{
          borderTop:  "1px solid var(--nav-border)",
          background: "var(--nav-bg-scrolled)",
          padding:    "12px 4% 24px",
          direction:  lang === "ar" ? "rtl" : "ltr",
        }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 4, marginBottom: 16 }}>
            {links.filter(item => item[0] !== "sep").map(([path, label]) => (
              <Link
                key={path}
                to={path}
                className={`nav-link${isActive(path) ? " active" : ""}`}
                style={{ padding: "14px 14px", fontSize: 14, minHeight: 48, display: "flex", alignItems: "center" }}
              >
                {label}
              </Link>
            ))}
          </div>

          <div style={{ borderTop: "1px solid var(--nav-border)", paddingTop: 14 }}>
            {!currentUser ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                <button
                  className="btn-base btn-outline btn-sm btn-full"
                  style={{ minHeight: 48, fontSize: 14 }}
                  onClick={() => { navigate("/login"); setOpen(false); }}
                >
                  {lang === "ar" ? "دخول" : "Login"}
                </button>
                <button
                  className="btn-base btn-primary btn-sm btn-full"
                  style={{ minHeight: 48, fontSize: 14 }}
                  onClick={() => { navigate("/register"); setOpen(false); }}
                >
                  {lang === "ar" ? "ابدأ مجاناً" : "Start Free"}
                </button>
              </div>
            ) : (
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <button
                    onClick={() => { navigate("/profile"); setOpen(false); }}
                    aria-label={lang === "ar" ? "بروفايلي" : "My Profile"}
                    style={{
                      width: 38, height: 38, borderRadius: "50%",
                      background: currentUser.avatarImg ? "transparent" : avBg,
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontWeight: 800, fontSize: 15, cursor: "pointer",
                      overflow: "hidden", border: `2px solid ${avBg}`, padding: 0,
                    }}
                  >
                    {currentUser.avatarImg
                      ? <img src={currentUser.avatarImg} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                      : currentUser.avatar}
                  </button>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 700 }}>{currentUser.name}</div>
                    <div style={{ fontSize: 10, fontWeight: 800, marginTop: 3, display: "inline-block", padding: "2px 7px", borderRadius: 6, ...roleBadgeSx }}>
                      {roleName}
                    </div>
                  </div>
                </div>
                <button className="btn-base btn-danger btn-sm" onClick={doLogout}>
                  {lang === "ar" ? "خروج" : "Logout"}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </nav>
  );
}
