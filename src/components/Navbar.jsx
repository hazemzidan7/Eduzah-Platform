import { useState, useEffect } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { C, font, gRed, gOr, gPur } from "../theme";
import { useAuth } from "../context/AuthContext";
import { useLang } from "../context/LangContext";
import { Btn } from "./UI";
import { isSuperAdminEmail } from "../config/superAdmin";
import { useScrolled } from "../hooks/useScrolled";

const MenuIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
    <line x1="3" y1="6" x2="21" y2="6"/>
    <line x1="3" y1="12" x2="21" y2="12"/>
    <line x1="3" y1="18" x2="21" y2="18"/>
  </svg>
);

const CloseIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
    <line x1="18" y1="6" x2="6" y2="18"/>
    <line x1="6" y1="6" x2="18" y2="18"/>
  </svg>
);

export default function Navbar() {
  const { currentUser, logout } = useAuth();
  const { lang, toggle }        = useLang();
  const navigate  = useNavigate();
  const location  = useLocation();

  const scrolled = useScrolled(20);

  const [open,   setOpen]   = useState(false);
  const [mobile, setMobile] = useState(window.innerWidth < 900);

  useEffect(() => {
    const onResize = () => setMobile(window.innerWidth < 900);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  // Close mobile menu on route change
  useEffect(() => { setOpen(false); }, [location.pathname]);

  const role = currentUser?.role;
  const avBg = role === "admin" ? gOr : role === "instructor" ? gPur : gRed;

  const publicLinks = [
    ["/",            lang==="ar" ? "الرئيسية"       : "Home"],
    ["/courses",     lang==="ar" ? "الكورسات"       : "Courses"],
    ["/corporate",   lang==="ar" ? "تدريب الشركات"  : "Corporate"],
    ["/hiring",      lang==="ar" ? "التوظيف"        : "Hiring"],
    ["/services",    lang==="ar" ? "الخدمات"        : "Services"],
    ["/team",        lang==="ar" ? "فريقنا"         : "Our Team"],
    ["/consultation",lang==="ar" ? "استشارة مجانية" : "Free Consult"],
    ["/news",        lang==="ar" ? "الأخبار"        : "News"],
  ];
  const studentLinks = [
    ["/dashboard",  lang==="ar" ? "لوحة التحكم" : "Dashboard"],
    ["/my-courses", lang==="ar" ? "كورساتي"     : "My Courses"],
    ["/courses",    lang==="ar" ? "الكورسات"    : "Courses"],
  ];
  const instructorLinks = [["/dashboard", lang==="ar" ? "لوحة التحكم" : "Dashboard"]];
  const adminLinks      = [["/dashboard", lang==="ar" ? "الداشبورد"   : "Dashboard"]];

  const links = !currentUser ? publicLinks
    : role === "admin"      ? adminLinks
    : role === "instructor" ? instructorLinks
    : studentLinks;

  const isActive = (path) =>
    path === "/" ? location.pathname === "/" : location.pathname.startsWith(path);

  const doLogout = () => { logout(); navigate("/"); setOpen(false); };

  const linkIdle = "rgba(255,255,255,.78)";

  const linkSx = (path, isMobile = false) => ({
    display: "block",
    padding: isMobile ? "11px 14px" : "6px 12px",
    borderRadius: 8,
    background: isActive(path) ? "rgba(217,27,91,.10)" : "transparent",
    border: isActive(path) ? `1px solid ${C.red}33` : "1px solid transparent",
    color: isActive(path) ? C.red : "rgba(255,255,255,.78)",
    fontFamily: font, fontSize: isMobile ? 14 : 12, fontWeight: 600,
    textDecoration: "none", whiteSpace: "nowrap",
    transition: "all .2s",
  });

  return (
    <>
      <nav aria-label={lang === "ar" ? "التنقل الرئيسي" : "Main navigation"} style={{
        position: "fixed", top: 0, zIndex: 200,
        width: "100%",
        color: "var(--nav-text)",
        background: scrolled ? "var(--nav-bg-scrolled)" : "var(--nav-bg)",
        backdropFilter: scrolled ? "blur(20px)" : "none",
        WebkitBackdropFilter: scrolled ? "blur(20px)" : "none",
        boxShadow: scrolled
          ? "0 4px 24px rgba(0,0,0,.45)"
          : "0 1px 8px rgba(0,0,0,.25)",
        transition: "all .35s cubic-bezier(.4,0,.2,1)",
        borderBottom: "1px solid var(--nav-border)",
        direction: lang === "ar" ? "rtl" : "ltr",
      }}>
        <div style={{
          display: "flex", alignItems: "center",
          justifyContent: "space-between",
          padding: "0 4%",
          minHeight: scrolled ? 54 : 64,
          transition: "min-height .35s cubic-bezier(.4,0,.2,1)",
          maxWidth: 1400, margin: "0 auto",
        }}>

          {/* ── Logo ── */}
          <Link to="/" style={{ textDecoration: "none", flexShrink: 0, display: "flex", alignItems: "center" }}>
            <img
              src={lang === "ar" ? "/logo-ar.png" : "/logo-en.png"}
              alt="Eduzah"
              style={{ height: 40, width: "auto", display: "block" }}
            />
          </Link>

          {/* ── Desktop links ── */}
          {!mobile && (
            <div style={{ display: "flex", gap: 2, flex: 1, justifyContent: "center", padding: "0 8px 0 12px", overflow: "hidden", minWidth: 0 }}>
              {links.map(([path, label]) => (
                <Link key={path} to={path} style={linkSx(path)}
                  onMouseEnter={e => {
                    if (!isActive(path)) {
                      e.currentTarget.style.color = C.red;
                      e.currentTarget.style.background = "rgba(217,27,91,.06)";
                    }
                  }}
                  onMouseLeave={e => {
                    if (!isActive(path)) {
                      e.currentTarget.style.color = "rgba(255,255,255,.78)";
                      e.currentTarget.style.background = "transparent";
                    }
                  }}
                >{label}</Link>
              ))}
            </div>
          )}

          {/* ── Right controls ── */}
          <div style={{ display: "flex", gap: 8, alignItems: "center", flexShrink: 0 }}>
            <button type="button" onClick={toggle}
              aria-label={lang === "ar" ? "التبديل إلى الإنجليزية" : "Switch to Arabic"}
              style={{
                background: "rgba(255,255,255,.08)",
                border: "1.5px solid rgba(255,255,255,.15)",
                borderRadius: 8, padding: "5px 12px",
                color: "rgba(255,255,255,.85)", fontFamily: font, fontWeight: 800,
                fontSize: 11, cursor: "pointer", letterSpacing: 0.5,
              }}>
              {lang === "ar" ? "EN" : "عر"}
            </button>

            {/* Desktop auth */}
            {!mobile && (
              !currentUser ? (
                <>
                  <Btn children={lang==="ar" ? "دخول"  : "Login"}    sm onClick={() => navigate("/login")} />
                  <Btn children={lang==="ar" ? "سجّل"  : "Register"} sm          onClick={() => navigate("/register")} />
                </>
              ) : (
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <div style={{ textAlign: lang === "ar" ? "right" : "left", minWidth: 0, paddingInlineEnd: 4 }}>
                    <div style={{ fontSize: 12, fontWeight: 700, lineHeight: 1.25 }}>{currentUser.name.split(" ")[0]}</div>
                    <div style={{
                      fontSize: 10,
                      fontWeight: 800,
                      marginTop: 3,
                      display: "inline-block",
                      padding: "3px 8px",
                      borderRadius: 6,
                      maxWidth: "100%",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                      ...(role === "admin"
                        ? { background: "#111827", color: "#fbbf24", border: "1px solid rgba(251,191,36,.35)" }
                        : { color: "#6b7280", background: "transparent", border: "none", fontWeight: 600 }),
                    }}>
                      {role === "admin"
                        ? (isSuperAdminEmail(currentUser.email)
                          ? (lang === "ar" ? "مدير — Super Admin" : "Admin — Super Admin")
                          : (lang === "ar" ? "مدير / Admin" : "Admin"))
                        : role === "instructor" ? (lang === "ar" ? "مدرب" : "Trainer")
                          : role === "user" ? (lang === "ar" ? "مستخدم" : "User")
                            : (lang === "ar" ? "طالب" : "Student")}
                    </div>
                  </div>
                  <div onClick={() => navigate("/profile")}
                    title={lang==="ar" ? "بروفايلي" : "My Profile"}
                    style={{ width: 34, height: 34, borderRadius: "50%", background: currentUser.avatarImg ? "transparent" : avBg, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: 14, cursor: "pointer", flexShrink: 0, overflow: "hidden", border: `2px solid ${avBg}` }}>
                    {currentUser.avatarImg
                      ? <img src={currentUser.avatarImg} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                      : currentUser.avatar}
                  </div>
                  <Btn children={lang==="ar" ? "خروج" : "Logout"} v="ghost" sm onClick={doLogout} style={{ color: linkIdle, border: "1px solid rgba(255,255,255,.2)" }} />
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
                  background: "transparent",
                  border: "1.5px solid rgba(255,255,255,.2)",
                  borderRadius: 8, padding: "7px 9px",
                  color: linkIdle, cursor: "pointer",
                  display: "flex", alignItems: "center",
                }}>
                {open ? <CloseIcon /> : <MenuIcon />}
              </button>
            )}
          </div>
        </div>

        {/* ── Mobile menu ── */}
        {mobile && open && (
          <div style={{
            borderTop: "1px solid rgba(255,255,255,.12)",
            background: "rgba(26,15,36,.98)",
            padding: "10px 4% 20px",
            direction: lang === "ar" ? "rtl" : "ltr",
          }}>
            {/* Nav links */}
            <div style={{ display: "flex", flexDirection: "column", gap: 4, marginBottom: 16 }}>
              {links.map(([path, label]) => (
                <Link key={path} to={path} style={linkSx(path, true)}>{label}</Link>
              ))}
            </div>

            {/* Divider */}
            <div style={{ borderTop: "1px solid rgba(255,255,255,.12)", paddingTop: 14 }}>
              {!currentUser ? (
                <div style={{ display: "flex", gap: 10 }}>
                  <Btn children={lang==="ar" ? "دخول"  : "Login"}
                    sm onClick={() => { navigate("/login"); setOpen(false); }} />
                  <Btn children={lang==="ar" ? "سجّل"  : "Register"}
                    sm onClick={() => { navigate("/register"); setOpen(false); }} />
                </div>
              ) : (
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <div onClick={() => { navigate("/profile"); setOpen(false); }}
                    style={{ width: 36, height: 36, borderRadius: "50%", background: currentUser.avatarImg ? "transparent" : avBg, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: 15, cursor: "pointer", overflow: "hidden", border: `2px solid ${avBg}` }}>
                    {currentUser.avatarImg
                      ? <img src={currentUser.avatarImg} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                      : currentUser.avatar}
                  </div>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 700 }}>{currentUser.name}</div>
                      <div style={{
                        fontSize: 10,
                        fontWeight: 800,
                        marginTop: 4,
                        display: "inline-block",
                        padding: "3px 8px",
                        borderRadius: 6,
                        ...(role === "admin"
                          ? { background: "#111827", color: "#fbbf24" }
                          : { color: "#6b7280" }),
                      }}>
                        {role === "admin"
                          ? (isSuperAdminEmail(currentUser.email)
                            ? (lang === "ar" ? "مدير — Super Admin" : "Admin — Super Admin")
                            : (lang === "ar" ? "مدير / Admin" : "Admin"))
                          : role === "instructor"
                            ? (lang === "ar" ? "مدرب" : "Trainer")
                            : role === "user"
                              ? (lang === "ar" ? "مستخدم" : "User")
                              : (lang === "ar" ? "طالب" : "Student")}
                      </div>
                    </div>
                  </div>
                  <Btn children={lang==="ar" ? "خروج" : "Logout"} v="danger" sm onClick={doLogout} />
                </div>
              )}
            </div>
          </div>
        )}
      </nav>
    </>
  );
}
