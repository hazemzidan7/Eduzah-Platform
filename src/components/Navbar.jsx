import { useState, useEffect } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { C, font, gRed, gOr, gPur } from "../theme";
import { useAuth } from "../context/AuthContext";
import { useLang } from "../context/LangContext";
import { Btn } from "./UI";

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

  const linkSx = (path, isMobile = false) => ({
    display: "block",
    padding: isMobile ? "11px 14px" : "6px 12px",
    borderRadius: 8,
    background: isActive(path) ? "rgba(217,27,91,.18)" : "transparent",
    border: isActive(path) ? `1px solid ${C.red}44` : "1px solid transparent",
    color: isActive(path) ? C.red : C.muted,
    fontFamily: font, fontSize: isMobile ? 14 : 12, fontWeight: 600,
    textDecoration: "none", whiteSpace: "nowrap",
    transition: "all .2s",
  });

  return (
    <>
      <nav aria-label={lang === "ar" ? "التنقل الرئيسي" : "Main navigation"} style={{
        position: "sticky", top: 0, zIndex: 200,
        background: "rgba(26,15,36,.97)", backdropFilter: "blur(20px)",
        borderBottom: `1px solid ${C.border}`,
        direction: lang === "ar" ? "rtl" : "ltr",
      }}>
        <div style={{
          display: "flex", alignItems: "center",
          justifyContent: "space-between",
          padding: "0 4%", height: 60,
          maxWidth: 1400, margin: "0 auto",
        }}>

          {/* ── Logo ── */}
          <Link to="/" style={{ textDecoration: "none", flexShrink: 0, display: "flex", alignItems: "center" }}>
            <img src="/logo.png" alt="Eduzah" style={{
              height: 34, width: "auto", display: "block",
              background: "#fff",
              borderRadius: 8,
              padding: "4px 10px",
            }} />
          </Link>

          {/* ── Desktop links ── */}
          {!mobile && (
            <div style={{ display: "flex", gap: 2, flex: 1, justifyContent: "center", padding: "0 12px", overflow: "hidden" }}>
              {links.map(([path, label]) => (
                <Link key={path} to={path} style={linkSx(path)}
                  onMouseEnter={e => {
                    if (!isActive(path)) {
                      e.currentTarget.style.color = "#fff";
                      e.currentTarget.style.background = "rgba(255,255,255,.06)";
                    }
                  }}
                  onMouseLeave={e => {
                    if (!isActive(path)) {
                      e.currentTarget.style.color = C.muted;
                      e.currentTarget.style.background = "transparent";
                    }
                  }}
                >{label}</Link>
              ))}
            </div>
          )}

          {/* ── Right controls ── */}
          <div style={{ display: "flex", gap: 8, alignItems: "center", flexShrink: 0 }}>
            {/* Language toggle */}
            <button type="button" onClick={toggle}
              aria-label={lang === "ar" ? "التبديل إلى الإنجليزية" : "Switch to Arabic"}
              style={{
                background: "rgba(255,255,255,.07)",
                border: `1.5px solid ${C.border}`,
                borderRadius: 8, padding: "5px 12px",
                color: "#fff", fontFamily: font, fontWeight: 800,
                fontSize: 11, cursor: "pointer", letterSpacing: 0.5,
              }}>
              {lang === "ar" ? "EN" : "عر"}
            </button>

            {/* Desktop auth */}
            {!mobile && (
              !currentUser ? (
                <>
                  <Btn children={lang==="ar" ? "دخول"  : "Login"}    v="outline" sm onClick={() => navigate("/login")} />
                  <Btn children={lang==="ar" ? "سجّل"  : "Register"} sm          onClick={() => navigate("/register")} />
                </>
              ) : (
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <div style={{ textAlign: lang === "ar" ? "right" : "left" }}>
                    <div style={{ fontSize: 12, fontWeight: 700 }}>{currentUser.name.split(" ")[0]}</div>
                    <div style={{ fontSize: 10, color: C.muted }}>
                      {role === "admin" ? (lang==="ar" ? "مدير" : "Admin")
                        : role === "instructor" ? (lang==="ar" ? "مدرب" : "Trainer")
                        : (lang==="ar" ? "طالب" : "Student")}
                    </div>
                  </div>
                  <div onClick={() => navigate("/profile")}
                    title={lang==="ar" ? "بروفايلي" : "My Profile"}
                    style={{ width: 34, height: 34, borderRadius: "50%", background: currentUser.avatarImg ? "transparent" : avBg, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: 14, cursor: "pointer", flexShrink: 0, overflow: "hidden", border: `2px solid ${avBg}` }}>
                    {currentUser.avatarImg
                      ? <img src={currentUser.avatarImg} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                      : currentUser.avatar}
                  </div>
                  <Btn children={lang==="ar" ? "خروج" : "Logout"} v="ghost" sm onClick={doLogout} />
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
                  border: `1.5px solid ${C.border}`,
                  borderRadius: 8, padding: "7px 9px",
                  color: "#fff", cursor: "pointer",
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
            borderTop: `1px solid ${C.border}`,
            background: "rgba(20,10,30,.99)",
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
            <div style={{ borderTop: `1px solid ${C.border}`, paddingTop: 14 }}>
              {!currentUser ? (
                <div style={{ display: "flex", gap: 10 }}>
                  <Btn children={lang==="ar" ? "دخول"  : "Login"}
                    v="outline" sm onClick={() => { navigate("/login"); setOpen(false); }} />
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
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 700 }}>{currentUser.name}</div>
                      <div style={{ fontSize: 11, color: C.muted }}>
                        {role === "admin"
                          ? (lang === "ar" ? "مدير" : "Admin")
                          : role === "instructor"
                            ? (lang === "ar" ? "مدرب" : "Trainer")
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

      {/* WhatsApp FAB */}
      <a href="https://wa.me/201044222881" target="_blank" rel="noreferrer"
        title="WhatsApp"
        aria-label={lang === "ar" ? "تواصل عبر واتساب" : "Contact on WhatsApp"}
        style={{
          position: "fixed", bottom: 22,
          [lang === "ar" ? "right" : "left"]: 22,
          width: 50, height: 50,
          background: "#25d366", borderRadius: "50%",
          display: "flex", alignItems: "center", justifyContent: "center",
          boxShadow: "0 4px 20px rgba(37,211,102,.5)",
          zIndex: 300, textDecoration: "none", transition: "transform .2s",
        }}
        onMouseEnter={e => e.currentTarget.style.transform = "scale(1.1)"}
        onMouseLeave={e => e.currentTarget.style.transform = ""}>
        <svg width="24" height="24" viewBox="0 0 24 24" fill="#fff">
          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/>
          <path d="M12 2C6.477 2 2 6.477 2 12c0 1.89.525 3.66 1.438 5.168L2 22l4.978-1.413A9.956 9.956 0 0012 22c5.523 0 10-4.477 10-10S17.523 2 12 2zm0 18a7.946 7.946 0 01-4.048-1.107l-.29-.172-3.005.854.866-2.93-.19-.302A7.944 7.944 0 014 12c0-4.418 3.582-8 8-8s8 3.582 8 8-3.582 8-8 8z"/>
        </svg>
      </a>
    </>
  );
}
