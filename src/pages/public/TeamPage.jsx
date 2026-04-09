import { C, gHero, font } from "../../theme";
import { useData } from "../../context/DataContext";
import { useLang } from "../../context/LangContext";
import { Seo } from "../../components/Seo";

const LinkedInIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
    <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
  </svg>
);

const MailIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
    <polyline points="22,6 12,13 2,6"/>
  </svg>
);

export default function TeamPage() {
  const { team } = useData();
  const { lang } = useLang();

  const sorted = [...team].sort((a, b) => (a.order || 0) - (b.order || 0));

  return (
    <div style={{ minHeight: "calc(100vh - 60px)", background: gHero, direction: lang === "ar" ? "rtl" : "ltr" }}>
      <Seo
        title={lang === "ar" ? "فريق العمل — Eduzah" : "Our Team — Eduzah"}
        description={lang === "ar"
          ? "تعرّف على فريق Eduzah: مدربون وخبراء يقدمون تدريباً مهنياً احترافياً في مصر."
          : "Meet the Eduzah team: trainers and experts delivering professional training in Egypt."}
      />
      {/* ── Hero ── */}
      <section aria-labelledby="team-page-title" style={{ textAlign: "center", padding: "64px 16px 40px" }}>
        <h1 id="team-page-title" style={{ fontFamily: font, fontWeight: 900, fontSize: "clamp(28px, 5vw, 44px)", margin: 0, marginBottom: 12 }}>
          {lang === "ar" ? "فريق " : "Meet the "}
          <span style={{ color: C.red }}>Edu</span>
          <span style={{ color: C.orange }}>zah</span>
          {lang === "ar" ? "" : " Team"}
        </h1>
        <p style={{ color: C.muted, fontSize: 15, maxWidth: 540, margin: "0 auto" }}>
          {lang === "ar"
            ? "تعرّف على الفريق المتخصص الذي يعمل خلف الكواليس لتوفير أفضل تجربة تدريبية لك."
            : "Get to know the dedicated team working behind the scenes to provide you with the best training experience."}
        </p>
      </section>

      {/* ── Team Grid ── */}
      <section style={{ maxWidth: 1100, margin: "0 auto", padding: "0 16px 80px" }}>
        {sorted.length === 0 ? (
          <div style={{ textAlign: "center", color: C.muted, padding: 60, fontSize: 15 }}>
            {lang === "ar" ? "لا يوجد أعضاء فريق حتى الآن." : "No team members yet."}
          </div>
        ) : (
          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))",
            gap: 28,
          }}>
            {sorted.map(member => (
              <MemberCard key={member.id} member={member} lang={lang} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function MemberCard({ member, lang }) {
  const name    = lang === "ar" ? member.name    : (member.name_en    || member.name);
  const role    = lang === "ar" ? member.role_ar : (member.role_en    || member.role_ar);
  const bio     = lang === "ar" ? member.bio_ar  : (member.bio_en     || member.bio_ar);
  const initial = lang === "ar"
    ? (member.avatar || member.name?.[0] || "?")
    : (member.name_en?.[0] || member.avatar || member.name?.[0] || "?");

  return (
    <article style={{
      background: "rgba(50,29,61,.7)",
      backdropFilter: "blur(16px)",
      border: `1px solid ${C.border}`,
      borderRadius: 18,
      overflow: "hidden",
      display: "flex",
      flexDirection: "column",
      transition: "transform .2s, box-shadow .2s",
    }}
      onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-4px)"; e.currentTarget.style.boxShadow = `0 16px 40px rgba(217,27,91,.2)`; }}
      onMouseLeave={e => { e.currentTarget.style.transform = ""; e.currentTarget.style.boxShadow = ""; }}
    >
      {/* Avatar */}
      <div style={{ height: 180, background: "linear-gradient(135deg,rgba(217,27,91,.3),rgba(138,43,226,.3))", display: "flex", alignItems: "center", justifyContent: "center", position: "relative" }}>
        {member.image ? (
          <img src={member.image} alt={name}
            style={{ width: "100%", height: "100%", objectFit: "cover", position: "absolute", inset: 0 }} />
        ) : (
          <div style={{
            width: 90, height: 90, borderRadius: "50%",
            background: "linear-gradient(135deg,#d91b5b,#b51549)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontFamily: font, fontWeight: 900, fontSize: 36, color: "#fff",
            border: "3px solid rgba(255,255,255,.2)",
          }}>
            {initial}
          </div>
        )}
      </div>

      {/* Info */}
      <div style={{ padding: "20px 20px 16px", flex: 1, display: "flex", flexDirection: "column" }}>
        <h3 style={{ fontFamily: font, fontWeight: 800, fontSize: 17, margin: "0 0 4px" }}>{name}</h3>
        <div style={{ color: C.orange, fontWeight: 700, fontSize: 12, marginBottom: 10 }}>{role}</div>
        {bio && (
          <p style={{ color: C.muted, fontSize: 12, lineHeight: 1.6, margin: "0 0 16px", flex: 1 }}>{bio}</p>
        )}

        {/* Links */}
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {member.email && (
            <a href={`mailto:${member.email}`}
              style={{ display: "inline-flex", alignItems: "center", gap: 5, color: C.muted, textDecoration: "none", fontSize: 12, padding: "6px 12px", background: "rgba(255,255,255,.09)", borderRadius: 7, border: `1px solid ${C.border}`, transition: "color .15s, background .15s" }}
              onMouseEnter={e => { e.currentTarget.style.color = "#fff"; e.currentTarget.style.background = "rgba(255,255,255,.12)"; }}
              onMouseLeave={e => { e.currentTarget.style.color = C.muted; e.currentTarget.style.background = "rgba(255,255,255,.09)"; }}
              aria-label={lang === "ar" ? `تواصل عبر البريد مع ${name}` : `Contact ${name} by email`}>
              <MailIcon /> {lang === "ar" ? "تواصل" : "Contact"}
            </a>
          )}
          {member.linkedin && (
            <a href={member.linkedin} target="_blank" rel="noopener noreferrer"
              style={{ display: "inline-flex", alignItems: "center", gap: 5, color: C.muted, textDecoration: "none", fontSize: 12, padding: "6px 12px", background: "rgba(255,255,255,.09)", borderRadius: 7, border: `1px solid ${C.border}`, transition: "color .15s" }}
              onMouseEnter={e => e.currentTarget.style.color = "#0a66c2"}
              onMouseLeave={e => e.currentTarget.style.color = C.muted}
              aria-label={lang === "ar" ? `ملف ${name} على LinkedIn` : `${name} on LinkedIn`}>
              <LinkedInIcon /> LinkedIn
            </a>
          )}
        </div>
      </div>
    </article>
  );
}
