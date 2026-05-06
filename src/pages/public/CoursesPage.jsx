import { useState, useEffect, useMemo, useCallback } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { C } from "../../theme";
import { Btn, PBar } from "../../components/UI";
import { useAuth } from "../../context/AuthContext";
import { useData } from "../../context/DataContext";
import { useLang } from "../../context/LangContext";
import { TRACKS } from "../../data";

const TRAINING_TYPES = [
  { v: "all",     ar: "الكل",          en: "All" },
  { v: "online",  ar: "أونلاين",       en: "Live Online" },
  { v: "offline", ar: "حضوري (فرع)",   en: "Offline (branch)" },
];

const SORT_OPTIONS = [
  { v: "default",     ar: "الافتراضي",      en: "Default" },
  { v: "price_asc",   ar: "السعر: الأقل",   en: "Price: Low to High" },
  { v: "price_desc",  ar: "السعر: الأعلى",  en: "Price: High to Low" },
  { v: "rating_desc", ar: "الأعلى تقييماً", en: "Top Rated" },
  { v: "newest",      ar: "الأحدث",         en: "Newest" },
];

const TYPE_COLORS = { online: "#0ea5e9", offline: "#10b981" };
const PAGE_SIZE = 12;

function useDebounce(value, delay) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

export default function CoursesPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { currentUser, toggleWishlist } = useAuth();
  const { courses } = useData();
  const { lang } = useLang();
  const dir = lang === "ar" ? "rtl" : "ltr";

  const [track,        setTrack]        = useState(searchParams.get("track") || "all");
  const [type,         setType]         = useState("all");
  const [search,       setSearch]       = useState("");
  const [sort,         setSort]         = useState("default");
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  const debouncedSearch = useDebounce(search, 300);

  useEffect(() => {
    const t = searchParams.get("track");
    if (t) setTrack(t);
  }, [searchParams]);

  useEffect(() => { setVisibleCount(PAGE_SIZE); }, [track, type, debouncedSearch, sort]);

  const filtered = useMemo(() => {
    let list = courses.filter(c => {
      const matchTrack  = track === "all" || c.trackId === track;
      const matchType   = type  === "all" || (c.trainingTypes || []).includes(type);
      const q = debouncedSearch.toLowerCase();
      const matchSearch = !q
        || c.title.toLowerCase().includes(q)
        || (c.title_en || "").toLowerCase().includes(q)
        || (c.desc || "").toLowerCase().includes(q)
        || (c.desc_en || "").toLowerCase().includes(q);
      return matchTrack && matchType && matchSearch;
    });

    switch (sort) {
      case "price_asc":   return [...list].sort((a, b) => a.price - b.price);
      case "price_desc":  return [...list].sort((a, b) => b.price - a.price);
      case "rating_desc": return [...list].sort((a, b) => (b.rating || 0) - (a.rating || 0));
      case "newest":      return [...list].sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
      default:            return list;
    }
  }, [courses, track, type, debouncedSearch, sort]);

  const clearAll = useCallback(() => {
    setTrack("all"); setType("all"); setSearch(""); setSort("default");
  }, []);

  const dur = (d) => lang === "ar" ? d : d.replace(/أسابيع|أسبوع/g, "weeks").replace("ترمين سنوياً", "2 Terms/Year");

  const chipSx = (active, color = C.red) => ({
    padding: "7px 16px",
    borderRadius: 50,
    background: active ? color : "var(--chip-inactive-bg)",
    border: `1.5px solid ${active ? color : "var(--chip-inactive-border)"}`,
    color: active ? "#fff" : "var(--chip-inactive-text)",
    fontFamily: "'Cairo',sans-serif",
    fontWeight: 600,
    fontSize: 12,
    cursor: "pointer",
    transition: "all .2s",
  });

  return (
    <div style={{ padding: "clamp(24px,5vw,44px) 5%" }} dir={dir}>

      {/* Header */}
      <div style={{ textAlign: "center", marginBottom: 36 }}>
        <div style={{ color: C.orange, fontWeight: 700, fontSize: 11, letterSpacing: 2, marginBottom: 8 }}>
          {lang === "ar" ? "كل البرامج" : "ALL PROGRAMS"}
        </div>
        <h1 style={{ fontSize: "clamp(1.5rem,3vw,2.4rem)", fontWeight: 900, marginBottom: 10, color: "var(--page-text)" }}>
          {lang === "ar" ? "كورسات التدريب المتخصصة" : "Specialized Training Courses"}
        </h1>
        <p style={{ color: "var(--page-muted)", fontSize: 14 }}>
          <span style={{ fontWeight: 700, color: C.orange }}>{filtered.length}</span>
          {filtered.length !== courses.length && (
            <span style={{ color: "var(--page-muted)", fontWeight: 400 }}> / {courses.length}</span>
          )}
          {" "}{lang === "ar" ? "برنامج متخصص" : "specialized programs"}
        </p>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 12, justifyContent: "center", marginTop: 20 }}>
          <Link to="/courses/ai" style={{ textDecoration: "none" }}>
            <span style={{ fontWeight: 800, fontSize: 13, color: "#d91b5b", border: "2px solid rgba(217,27,91,.45)", borderRadius: 12, padding: "10px 18px", display: "inline-block" }}>
              {lang === "ar" ? "دبلوم الذكاء الاصطناعي →" : "AI diploma program →"}
            </span>
          </Link>
          <Link to="/courses/frontend" style={{ textDecoration: "none" }}>
            <span style={{ fontWeight: 800, fontSize: 13, color: "#d91b5b", border: "2px solid rgba(217,27,91,.45)", borderRadius: 12, padding: "10px 18px", display: "inline-block" }}>
              {lang === "ar" ? "دبلوم الواجهات (Frontend) →" : "Frontend diploma program →"}
            </span>
          </Link>
        </div>
      </div>

      {/* Search + Sort row */}
      <div style={{ display: "flex", gap: 12, maxWidth: 680, margin: "0 auto 28px", alignItems: "center" }}>
        <div style={{ flex: 1, position: "relative" }}>
          <label htmlFor="course-search" style={{ position: "absolute", width: 1, height: 1, overflow: "hidden", opacity: 0 }}>
            {lang === "ar" ? "البحث في الكورسات" : "Search courses"}
          </label>
          <input
            id="course-search"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder={lang === "ar" ? "ابحث عن كورس..." : "Search courses..."}
            dir={dir}
            autoComplete="off"
            style={{ width: "100%", boxSizing: "border-box", background: "var(--input-bg)", border: "1.5px solid var(--input-border)", borderRadius: 12, padding: "11px 16px", color: "var(--page-text)", fontFamily: "'Cairo',sans-serif", fontSize: 13, outline: "none", transition: "border-color .2s" }}
            onFocus={e => e.target.style.borderColor = "#d91b5b"}
            onBlur={e => e.target.style.borderColor = "var(--input-border)"}
          />
          {search && (
            <button
              onClick={() => setSearch("")}
              aria-label={lang === "ar" ? "مسح البحث" : "Clear search"}
              style={{ position: "absolute", top: "50%", transform: "translateY(-50%)", [dir === "rtl" ? "left" : "right"]: 12, background: "none", border: "none", color: "var(--page-muted)", cursor: "pointer", fontSize: 16, lineHeight: 1 }}
            >×</button>
          )}
        </div>

        {/* Sort */}
        <select
          value={sort}
          onChange={e => setSort(e.target.value)}
          aria-label={lang === "ar" ? "ترتيب الكورسات" : "Sort courses"}
          style={{ background: "var(--input-bg)", border: "1.5px solid var(--input-border)", borderRadius: 12, padding: "11px 14px", color: "var(--page-text)", fontFamily: "'Cairo',sans-serif", fontSize: 12, outline: "none", cursor: "pointer", flexShrink: 0 }}
        >
          {SORT_OPTIONS.map(o => (
            <option key={o.v} value={o.v}>{lang === "ar" ? o.ar : o.en}</option>
          ))}
        </select>
      </div>

      {/* Track Filter */}
      <div style={{ marginBottom: 16 }}>
        <div style={{ color: "var(--page-muted)", fontSize: 11, fontWeight: 700, marginBottom: 10, letterSpacing: 1 }}>
          {lang === "ar" ? "المسار:" : "TRACK:"}
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button
            onClick={() => setTrack("all")}
            aria-pressed={track === "all"}
            style={chipSx(track === "all")}
          >
            {lang === "ar" ? "الكل" : "All"}
          </button>
          {TRACKS.map(tr => (
            <button
              key={tr.id}
              onClick={() => setTrack(tr.id)}
              aria-pressed={track === tr.id}
              style={chipSx(track === tr.id, tr.color)}
            >
              {lang === "ar" ? tr.title_ar : tr.title_en}
            </button>
          ))}
        </div>
      </div>

      {/* Training Type Filter */}
      <div style={{ marginBottom: 28 }}>
        <div style={{ color: "var(--page-muted)", fontSize: 11, fontWeight: 700, marginBottom: 10, letterSpacing: 1 }}>
          {lang === "ar" ? "نوع التدريب:" : "TRAINING TYPE:"}
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {TRAINING_TYPES.map(t => (
            <button
              key={t.v}
              onClick={() => setType(t.v)}
              aria-pressed={type === t.v}
              style={{ ...chipSx(type === t.v), padding: "6px 14px" }}
            >
              {lang === "ar" ? t.ar : t.en}
            </button>
          ))}
        </div>
      </div>

      {/* Results */}
      {filtered.length === 0 ? (
        <div style={{ textAlign: "center", padding: "60px 0" }}>
          <div style={{ fontSize: 40, marginBottom: 16 }}>🔍</div>
          <div style={{ color: "var(--page-muted)", fontSize: 14, marginBottom: 16 }}>
            {lang === "ar" ? "لا توجد كورسات مطابقة للبحث." : "No courses match your search."}
          </div>
          <button onClick={clearAll} className="btn-base btn-outline btn-sm">
            {lang === "ar" ? "إعادة ضبط الفلاتر" : "Clear all filters"}
          </button>
        </div>
      ) : (
        <>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(260px,1fr))", gap: 20 }}>
            {filtered.slice(0, visibleCount).map(c => {
              const enrolledEntry = currentUser?.enrolledCourses?.find(e => e.courseId === c.id);
              const prog      = enrolledEntry?.progress || 0;
              const trackData = TRACKS.find(tr => tr.id === c.trackId);
              const graphicCover = c.image && c.coverTitleInImage;
              const title = lang === "ar" ? c.title : (c.title_en || c.title);

              return (
                <article
                  key={c.id}
                  role="button"
                  tabIndex={0}
                  aria-label={title}
                  onClick={() => navigate(`/courses/${c.slug}`)}
                  onKeyDown={e => (e.key === "Enter" || e.key === " ") && navigate(`/courses/${c.slug}`)}
                  onMouseEnter={e => {
                    e.currentTarget.style.transform = "translateY(-5px)";
                    e.currentTarget.style.boxShadow = "0 18px 45px rgba(217,27,91,.2)";
                    e.currentTarget.style.background = "var(--surface-hover)";
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.transform = "";
                    e.currentTarget.style.boxShadow = "";
                    e.currentTarget.style.background = "var(--surface)";
                  }}
                  style={{
                    background: "var(--surface)",
                    border: "1px solid var(--page-border)",
                    borderRadius: 20,
                    overflow: "hidden",
                    cursor: "pointer",
                    transition: "transform .3s, box-shadow .3s, background .2s",
                    outline: "none",
                  }}
                  onFocus={e => e.currentTarget.style.boxShadow = `0 0 0 2px ${C.red}`}
                  onBlur={e => e.currentTarget.style.boxShadow = ""}
                >
                  {/* Cover */}
                  <div style={{ position: "relative", height: 160, overflow: "hidden", flexShrink: 0 }}>
                    {c.image
                      ? <img src={c.image} alt={title} loading="lazy" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
                      : <div style={{ width: "100%", height: "100%", background: `linear-gradient(135deg,${c.color || C.red}cc,#1a0f2e)`, position: "relative", overflow: "hidden" }}>
                          <div style={{ position: "absolute", top: -28, right: -28, width: 110, height: 110, borderRadius: "50%", background: "rgba(255,255,255,.07)" }} />
                          <div style={{ position: "absolute", bottom: -32, left: -18, width: 130, height: 130, borderRadius: "50%", background: "rgba(255,255,255,.05)" }} />
                          <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
                            <span style={{ fontSize: 64, fontWeight: 900, color: "rgba(255,255,255,.13)", lineHeight: 1, userSelect: "none" }}>
                              {title.charAt(0).toUpperCase()}
                            </span>
                          </div>
                        </div>
                    }
                    {!graphicCover && (
                      <>
                        <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to top,rgba(0,0,0,.65) 0%,transparent 55%)" }} />
                        <span style={{ position: "absolute", bottom: 12, left: 14, right: 14, fontWeight: 800, fontSize: 13, lineHeight: 1.4, color: "#fff", textShadow: "0 1px 4px rgba(0,0,0,.6)" }}>
                          {title}
                        </span>
                      </>
                    )}
                    {c.featured && (
                      <div style={{ position: "absolute", top: 10, right: 10, background: `${C.orange}dd`, borderRadius: 7, padding: "3px 10px", fontSize: 10, fontWeight: 700, color: "#fff" }}>
                        {lang === "ar" ? "مميز" : "Featured"}
                      </div>
                    )}
                    {currentUser && (
                      <button
                        aria-label={lang === "ar" ? "حفظ للمفضلة" : "Save to wishlist"}
                        title={lang === "ar" ? "حفظ للمفضلة" : "Save to wishlist"}
                        onClick={e => { e.stopPropagation(); toggleWishlist(c.id); }}
                        style={{
                          position: "absolute", top: 10, left: 10,
                          background: "rgba(0,0,0,.55)", border: "none",
                          borderRadius: "50%", width: 30, height: 30,
                          display: "flex", alignItems: "center", justifyContent: "center",
                          cursor: "pointer", fontSize: 16, lineHeight: 1,
                          transition: "transform .15s",
                        }}
                        onMouseEnter={e => e.currentTarget.style.transform = "scale(1.2)"}
                        onMouseLeave={e => e.currentTarget.style.transform = ""}
                      >
                        {(currentUser.wishlist || []).includes(c.id) ? "❤️" : "🤍"}
                      </button>
                    )}
                  </div>

                  {/* Body */}
                  <div style={{ padding: "14px 16px 18px" }}>
                    {trackData && (
                      <div style={{ display: "inline-flex", alignItems: "center", gap: 4, background: `${trackData.color}15`, color: trackData.color, border: `1px solid ${trackData.color}33`, borderRadius: 50, padding: "2px 9px", fontSize: 10, fontWeight: 700, marginBottom: 8 }}>
                        {lang === "ar" ? trackData.title_ar : trackData.title_en}
                      </div>
                    )}

                    <h3 style={{ fontWeight: 800, fontSize: 14, marginBottom: 5, color: "var(--page-text)", margin: "0 0 5px" }}>{title}</h3>
                    <p style={{ color: "var(--page-muted)", fontSize: 12, marginBottom: 10, lineHeight: 1.6, margin: "0 0 10px" }}>
                      {(lang === "ar" ? c.desc : (c.desc_en || c.desc) || "").slice(0, 65)}...
                    </p>

                    {/* Training type badges */}
                    {(c.trainingTypes || []).length > 0 && (
                      <div style={{ display: "flex", gap: 6, marginBottom: 10, flexWrap: "wrap" }}>
                        {(c.trainingTypes || []).map(tt => (
                          <span key={tt} style={{ background: `${TYPE_COLORS[tt]}18`, color: TYPE_COLORS[tt], border: `1px solid ${TYPE_COLORS[tt]}33`, borderRadius: 6, padding: "2px 8px", fontSize: 10, fontWeight: 700 }}>
                            {lang === "ar" ? TRAINING_TYPES.find(x => x.v === tt)?.ar : TRAINING_TYPES.find(x => x.v === tt)?.en}
                          </span>
                        ))}
                      </div>
                    )}

                    <div style={{ display: "flex", gap: 12, marginBottom: 10 }}>
                      <span style={{ color: "var(--page-muted)", fontSize: 11 }}>{dur(c.duration)}</span>
                      <span style={{ color: "var(--page-muted)", fontSize: 11 }}>{c.hours}h</span>
                      {c.rating > 0 && <span style={{ color: C.orange, fontSize: 11 }}>★ {c.rating}</span>}
                    </div>

                    {enrolledEntry && (
                      <div style={{ marginBottom: 10 }}>
                        <PBar value={prog} color={C.orange} h={4} />
                        <div style={{ color: "var(--page-muted)", fontSize: 11, marginTop: 3 }}>
                          {prog}% {lang === "ar" ? "مكتمل" : "completed"}
                        </div>
                      </div>
                    )}

                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderTop: "1px solid var(--page-border)", paddingTop: 10 }}>
                      <div>
                        <span style={{ fontWeight: 900, fontSize: 16, color: C.red }}>
                          {c.price.toLocaleString()} <small style={{ fontSize: 10, color: "var(--page-muted)", fontWeight: 400 }}>EGP</small>
                        </span>
                        {c.installment > 0 && (
                          <div style={{ color: "var(--page-muted)", fontSize: 10 }}>
                            {lang === "ar" ? "أو" : "or"} {c.installment.toLocaleString()} EGP &times; 3
                          </div>
                        )}
                      </div>
                      <Btn
                        children={enrolledEntry ? (lang === "ar" ? "متابعة ▶" : "Continue ▶") : (lang === "ar" ? "سجّل الآن" : "Enroll")}
                        sm
                        onClick={e => { e.stopPropagation(); navigate(`/courses/${c.slug}`); }}
                      />
                    </div>
                  </div>
                </article>
              );
            })}
          </div>

          {visibleCount < filtered.length && (
            <div style={{ textAlign: "center", marginTop: 36 }}>
              <button
                onClick={() => setVisibleCount(v => v + PAGE_SIZE)}
                className="btn-base btn-outline btn-md"
              >
                {lang === "ar"
                  ? `عرض المزيد (${filtered.length - visibleCount} متبقّي)`
                  : `Load more (${filtered.length - visibleCount} remaining)`}
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
