import { useState } from "react";
import { C, gHero } from "../../theme";
import { Card } from "../../components/UI";
import { useData } from "../../context/DataContext";
import { useLang } from "../../context/LangContext";

function formatNewsDate(n, lang) {
  const iso = n.dateIso;
  if (iso) {
    const d = new Date(`${iso}T12:00:00`);
    return d.toLocaleDateString(lang === "ar" ? "ar-EG" : "en-US", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  }
  return n.date || "";
}

function newsTag(n, lang) {
  if (lang === "en" && n.tag_en) return n.tag_en;
  return n.tag;
}

export default function NewsPage() {
  const { news } = useData();
  const { lang } = useLang();
  const dir = lang === "ar" ? "rtl" : "ltr";
  const [selected, setSelected] = useState(null);

  const featured = news.filter((n) => n.featured)[0];
  const rest = news.filter((n) => !n.featured);

  return (
    <div style={{ padding: "clamp(24px,5vw,44px) 5%" }} dir={dir}>
      <div style={{ textAlign: "center", marginBottom: 36 }}>
        <div style={{ color: C.orange, fontWeight: 700, fontSize: 11, letterSpacing: 2, marginBottom: 8 }}>
          {lang === "ar" ? "آخر الأخبار" : "LATEST NEWS"}
        </div>
        <h1 style={{ fontSize: "clamp(1.5rem,3vw,2.4rem)", fontWeight: 900 }}>
          {lang === "ar" ? "أخبار Eduzah" : "Eduzah News"}
        </h1>
      </div>

      {featured && (
        <div
          onClick={() => setSelected(featured)}
          style={{
            background: gHero,
            borderRadius: 20,
            marginBottom: 24,
            cursor: "pointer",
            overflow: "hidden",
            border: `1px solid ${C.border}`,
            transition: "all .25s",
          }}
          onMouseEnter={(e) => (e.currentTarget.style.transform = "translateY(-3px)")}
          onMouseLeave={(e) => (e.currentTarget.style.transform = "")}
        >
          {featured.images?.length > 0 && (
            <img src={featured.images[0]} alt={featured.title} style={{ width: "100%", height: 260, objectFit: "cover", display: "block" }} />
          )}
          <div style={{ padding: "28px 30px" }}>
            {!featured.images?.length && (
              <div
                style={{
                  height: 100,
                  marginBottom: 16,
                  borderRadius: 12,
                  background: "linear-gradient(135deg,rgba(103,45,134,.35),rgba(217,27,91,.2))",
                }}
              />
            )}
            <span
              style={{
                background: `${C.orange}22`,
                color: C.orange,
                borderRadius: 50,
                padding: "3px 12px",
                fontSize: 11,
                fontWeight: 700,
              }}
            >
              {newsTag(featured, lang)}
            </span>
            <h2 style={{ fontSize: "clamp(1.2rem,3vw,1.9rem)", fontWeight: 900, margin: "12px 0 10px" }}>
              {lang === "ar" ? featured.title : featured.title_en || featured.title}
            </h2>
            <p style={{ color: C.muted, fontSize: 14, maxWidth: 600, lineHeight: 1.8 }}>
              {lang === "ar" ? featured.excerpt : featured.excerpt_en || featured.excerpt}
            </p>
            <div style={{ color: C.muted, fontSize: 12, marginTop: 14 }}>{formatNewsDate(featured, lang)}</div>
          </div>
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(260px,1fr))", gap: 18 }}>
        {rest.map((n) => (
          <Card
            key={n.id}
            style={{ padding: 0, overflow: "hidden", cursor: "pointer", transition: "all .25s" }}
            onMouseEnter={(e) => (e.currentTarget.style.transform = "translateY(-4px)")}
            onMouseLeave={(e) => (e.currentTarget.style.transform = "")}
            onClick={() => setSelected(n)}
          >
            {n.images?.length > 0 ? (
              <img src={n.images[0]} alt={n.title} style={{ width: "100%", height: 160, objectFit: "cover", display: "block" }} />
            ) : (
              <div
                style={{
                  height: 100,
                  background: "linear-gradient(135deg,rgba(103,45,134,.4),rgba(217,27,91,.2))",
                }}
              />
            )}
            <div style={{ padding: "16px 18px" }}>
              <span
                style={{
                  background: `${C.purple}22`,
                  color: "#c084fc",
                  borderRadius: 50,
                  padding: "2px 10px",
                  fontSize: 11,
                  fontWeight: 700,
                }}
              >
                {newsTag(n, lang)}
              </span>
              <div style={{ fontWeight: 800, fontSize: 14, margin: "10px 0 7px", lineHeight: 1.5 }}>
                {lang === "ar" ? n.title : n.title_en || n.title}
              </div>
              <div style={{ color: C.muted, fontSize: 12, lineHeight: 1.7 }}>
                {(lang === "ar" ? n.excerpt : n.excerpt_en || n.excerpt).slice(0, 80)}...
              </div>
              <div style={{ color: C.muted, fontSize: 11, marginTop: 10 }}>{formatNewsDate(n, lang)}</div>
            </div>
          </Card>
        ))}
      </div>

      {selected && (
        <div
          onClick={() => setSelected(null)}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,.75)",
            zIndex: 500,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "5%",
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: "#2a1540",
              borderRadius: 20,
              maxWidth: 700,
              width: "100%",
              maxHeight: "85vh",
              overflowY: "auto",
              border: `1px solid ${C.border}`,
            }}
          >
            {selected.images?.length > 0 && (
              <img
                src={selected.images[0]}
                alt={selected.title}
                style={{ width: "100%", height: 240, objectFit: "cover", borderRadius: "20px 20px 0 0", display: "block" }}
              />
            )}
            <div style={{ padding: "24px 28px" }}>
              <div style={{ display: "flex", gap: 8, marginBottom: 14, flexWrap: "wrap" }}>
                <span
                  style={{
                    background: `${C.orange}22`,
                    color: C.orange,
                    borderRadius: 50,
                    padding: "3px 12px",
                    fontSize: 11,
                    fontWeight: 700,
                  }}
                >
                  {newsTag(selected, lang)}
                </span>
                <span style={{ color: C.muted, fontSize: 11, padding: "3px 0" }}>{formatNewsDate(selected, lang)}</span>
              </div>
              <h2 style={{ fontWeight: 900, fontSize: "clamp(1.2rem,2.5vw,1.7rem)", marginBottom: 14, lineHeight: 1.4 }}>
                {lang === "ar" ? selected.title : selected.title_en || selected.title}
              </h2>
              <p style={{ color: C.muted, fontSize: 14, lineHeight: 1.9 }}>
                {lang === "ar" ? selected.excerpt : selected.excerpt_en || selected.excerpt}
              </p>
              {selected.images?.length > 1 && (
                <div style={{ display: "flex", gap: 10, marginTop: 18, flexWrap: "wrap" }}>
                  {selected.images.slice(1).map((img, i) => (
                    <img key={i} src={img} alt="" style={{ height: 120, borderRadius: 10, objectFit: "cover", flex: "0 0 auto", maxWidth: "48%" }} />
                  ))}
                </div>
              )}
              <button
                onClick={() => setSelected(null)}
                style={{
                  marginTop: 22,
                  background: "transparent",
                  border: `1px solid ${C.border}`,
                  borderRadius: 10,
                  padding: "9px 20px",
                  color: C.muted,
                  fontFamily: "'Cairo',sans-serif",
                  fontSize: 12,
                  cursor: "pointer",
                }}
              >
                {lang === "ar" ? "إغلاق" : "Close"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
