import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { C } from "../../theme";
import { Btn, PBar, Badge } from "../../components/UI";
import { useAuth } from "../../context/AuthContext";
import { useData } from "../../context/DataContext";
import { useLang } from "../../context/LangContext";

// Convert YouTube / Vimeo URL to embed URL
const toEmbed = (url) => {
  if (!url) return null;
  const yt = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\n?#]+)/);
  if (yt) return `https://www.youtube.com/embed/${yt[1]}?rel=0&modestbranding=1`;
  const vim = url.match(/vimeo\.com\/(\d+)/);
  if (vim) return `https://player.vimeo.com/video/${vim[1]}`;
  return url; // direct video URL
};

export default function CourseViewer() {
  const { slug }   = useParams();
  const navigate   = useNavigate();
  const { currentUser, markLesson } = useAuth();
  const { courses } = useData();
  const { lang } = useLang();
  const ar = lang === "ar";
  const dir = ar ? "rtl" : "ltr";

  const [li,  setLi]  = useState(0);
  const [tab, setTab] = useState("lesson");

  const course = courses.find(c => c.slug === slug);
  if (!course) { navigate("/dashboard"); return null; }

  const ed = currentUser?.enrolledCourses?.find(e => e.courseId === course.id);
  if (!ed)  { navigate(`/courses/${slug}`); return null; }

  const prog       = ed.progress || 0;
  const done       = ed.completedLessons || [];
  const allLessons = course.curriculum.flatMap(ch => ch.lessons);
  const allVideos  = course.curriculum.flatMap(ch => ch.videoUrls || []);
  const total      = allLessons.length;
  const lesson     = allLessons[li] || (ar ? "درس" : "Lesson");
  const video      = allVideos[li];
  const embedUrl   = video ? toEmbed(video.url) : null;

  const isYouTube  = embedUrl && embedUrl.includes("youtube.com/embed");
  const isVimeo    = embedUrl && embedUrl.includes("player.vimeo.com");
  const isIframe   = isYouTube || isVimeo;
  const isDirectVid = embedUrl && !isIframe;

  const tabLabels = ar
    ? [["lesson", "الدرس"], ["about", "عن الكورس"], ["outcomes", "المهارات"]]
    : [["lesson", "Lesson"], ["about", "About"], ["outcomes", "Skills"]];

  return (
    <div dir={dir} style={{ display: "flex", flexDirection: "column", height: "calc(100vh - 60px)" }}>

      {/* ── Top bar ── */}
      <div style={{
        background: "#2a1540", borderBottom: `1px solid ${C.border}`,
        padding: "9px 4%", display: "flex", alignItems: "center",
        gap: 10, flexShrink: 0, flexWrap: "wrap",
      }}>
        <button type="button" onClick={() => navigate("/dashboard")}
          style={{ background: "transparent", border: `1px solid ${C.border}`, borderRadius: 8, padding: "4px 12px", color: C.muted, fontFamily: "'Cairo',sans-serif", fontSize: 12, cursor: "pointer" }}>
          {ar ? "← رجوع" : "← Back"}
        </button>
        <div style={{ fontWeight: 700, fontSize: 13, flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {course.title}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 140 }}>
          <PBar value={prog} color={C.orange} h={5} />
          <span style={{ color: C.orange, fontWeight: 800, fontSize: 12, whiteSpace: "nowrap" }}>{prog}%</span>
        </div>
      </div>

      {/* ── Main ── */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 260px", flex: 1, overflow: "hidden" }}>

        {/* ── Video / Content ── */}
        <div style={{ display: "flex", flexDirection: "column", overflow: "auto" }}>

          {/* Video player */}
          <div style={{ background: "#000", flexShrink: 0, position: "relative", aspectRatio: "16/9", maxHeight: "60vh" }}>
            {embedUrl && isIframe ? (
              <iframe
                src={embedUrl}
                title={video?.title || lesson}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                style={{ width: "100%", height: "100%", border: "none" }}
              />
            ) : embedUrl && isDirectVid ? (
              <video
                src={embedUrl}
                controls
                style={{ width: "100%", height: "100%" }}
              />
            ) : (
              /* Placeholder when no video */
              <div style={{ width: "100%", height: "100%", minHeight: 240, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 12 }}>
                <svg width="60" height="60" viewBox="0 0 24 24" fill="none" stroke={C.red} strokeWidth="1.5">
                  <circle cx="12" cy="12" r="10"/>
                  <polygon points="10,8 16,12 10,16" fill={C.red} stroke="none"/>
                </svg>
                <div style={{ color: C.muted, fontSize: 13 }}>
                  {allVideos.length === 0
                    ? (ar ? "المدرب لم يرفع فيديوهات بعد" : "No videos uploaded yet")
                    : (ar ? "لا يوجد فيديو لهذا الدرس" : "No video for this lesson")}
                </div>
              </div>
            )}
          </div>

          {/* Lesson title bar */}
          {video && (
            <div style={{ background: "rgba(50,29,61,.6)", borderBottom: `1px solid ${C.border}`, padding: "8px 14px" }}>
              <div style={{ fontWeight: 700, fontSize: 13 }}>{video.title}</div>
              {video.desc && <div style={{ color: C.muted, fontSize: 11, marginTop: 3 }}>{video.desc}</div>}
            </div>
          )}

          {/* Tabs */}
          <div style={{ display: "flex", borderBottom: `1px solid ${C.border}`, background: "rgba(50,29,61,.3)", flexShrink: 0 }}>
            {tabLabels.map(([k, l]) => (
              <button key={k} onClick={() => setTab(k)}
                style={{ background: "transparent", border: "none", borderBottom: tab===k ? `2px solid ${C.red}` : "2px solid transparent", color: tab===k ? C.red : C.muted, padding: "10px 14px", fontFamily: "'Cairo',sans-serif", fontWeight: 700, fontSize: 12, cursor: "pointer" }}>
                {l}
              </button>
            ))}
          </div>

          <div style={{ padding: "16px 18px", flex: 1 }}>
            {tab === "lesson" && (
              <div>
                <div style={{ fontWeight: 800, fontSize: 14, marginBottom: 8 }}>{lesson}</div>
                <p style={{ color: C.muted, lineHeight: 1.85, fontSize: 13, marginBottom: 16 }}>
                  {video?.desc || (ar ? "شاهد الفيديو ثم اضغط على زر الإكمال للانتقال للدرس التالي." : "Watch the video, then mark complete to go to the next lesson.")}
                </p>
                {done.includes(li)
                  ? <Badge color={C.success}>{ar ? "تم الإكمال" : "Completed"}</Badge>
                  : <Btn children={ar ? "تم مشاهدة الدرس" : "Mark as watched"} v="success" sm onClick={() => markLesson(course.id, li, total)} />
                }
              </div>
            )}
            {tab === "about" && (
              <p style={{ color: C.muted, fontSize: 13, lineHeight: 1.9 }}>{course.desc}</p>
            )}
            {tab === "outcomes" && (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(160px,1fr))", gap: 8 }}>
                {(course.outcomes || []).map(s => (
                  <div key={s} style={{ display: "flex", alignItems: "center", gap: 8, background: "rgba(255,255,255,.06)", borderRadius: 8, padding: "8px 10px" }}>
                    <span style={{ color: C.success, fontSize: 12, fontWeight: 800 }}>✓</span>
                    <span style={{ fontSize: 12, fontWeight: 600 }}>{s}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* ── Sidebar: lessons list ── */}
        <div style={{ borderInlineStart: `1px solid ${C.border}`, overflow: "auto", background: "rgba(50,29,61,.4)" }}>
          <div style={{
            padding: "10px 12px", fontWeight: 800, fontSize: 11,
            borderBottom: `1px solid ${C.border}`, color: C.muted,
            position: "sticky", top: 0, background: "rgba(42,21,64,.97)",
            display: "flex", justifyContent: "space-between",
          }}>
            <span>{ar ? "الدروس" : "Lessons"}</span>
            <span style={{ color: C.orange }}>{done.length}/{total}</span>
          </div>

          {course.curriculum.map((ch, ci) => (
            <div key={ci}>
              {/* Chapter header */}
              <div style={{ padding: "8px 12px", background: "rgba(103,45,134,.15)", borderBottom: `1px solid ${C.border}`, fontSize: 11, fontWeight: 800, color: C.orange }}>
                {ch.title}
              </div>
              {ch.lessons.map((l, li_local) => {
                const globalIdx = course.curriculum
                  .slice(0, ci)
                  .reduce((acc, c) => acc + c.lessons.length, 0) + li_local;
                const isDone = done.includes(globalIdx);
                const isAct  = globalIdx === li;
                return (
                  <div key={globalIdx}
                    onClick={() => { setLi(globalIdx); setTab("lesson"); }}
                    style={{
                      padding: "10px 11px",
                      background: isAct ? `${C.red}18` : "transparent",
                      borderInlineEnd: isAct ? `3px solid ${C.red}` : "3px solid transparent",
                      cursor: "pointer",
                      borderBottom: `1px solid ${C.border}`,
                      display: "flex", gap: 8, alignItems: "flex-start",
                      transition: "background .2s",
                    }}>
                    <div style={{
                      width: 20, height: 20, borderRadius: "50%", flexShrink: 0,
                      background: isDone ? C.success : "rgba(255,255,255,.07)",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontSize: 9, fontWeight: 800,
                      color: isDone ? "#fff" : C.muted,
                    }}>
                      {isDone ? "✓" : globalIdx + 1}
                    </div>
                    <div style={{ fontSize: 11, fontWeight: 600, color: isAct ? "#fff" : C.muted, lineHeight: 1.4 }}>{l}</div>
                  </div>
                );
              })}
            </div>
          ))}

          {course.curriculum.length === 0 && (
            <div style={{ padding: 24, textAlign: "center", color: C.muted, fontSize: 12 }}>
              {ar ? "لا توجد دروس بعد" : "No lessons yet"}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
