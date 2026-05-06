import { useMemo, useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { C } from "../../theme";
import { Btn, Card, PBar } from "../../components/UI";
import GamificationBar from "../../components/GamificationBar";
import { Skeleton } from "../../components/Skeleton";
import { useAuth } from "../../context/AuthContext";
import { useData } from "../../context/DataContext";
import { useLang } from "../../context/LangContext";
import { normalizeCourseCategory } from "../../constants/courseCategories";
import { useStreak } from "../../hooks/useStreak";


function recommendCourses(courses, currentUser, enrolledIds) {
  const activity = currentUser?.courseActivity || {};
  const scored = courses
    .filter((c) => !enrolledIds.has(c.id))
    .map((c) => {
      const v = activity[c.id]?.views || 0;
      let s = v * 2 + (c.featured ? 3 : 0);
      const last = currentUser?.lastViewedCourseId;
      if (last) {
        const lc = courses.find((x) => x.id === last);
        if (lc && normalizeCourseCategory(lc.cat) === normalizeCourseCategory(c.cat)) s += 2;
      }
      return { c, s };
    })
    .sort((a, b) => b.s - a.s);
  return scored.slice(0, 3).map((x) => x.c);
}

export default function StudentDashboard() {
  const { currentUser } = useAuth();
  const { courses } = useData();
  const { lang } = useLang();
  const navigate = useNavigate();
  const location = useLocation();
  const [accountCreatedBanner, setAccountCreatedBanner] = useState(false);
  const dir = lang === "ar" ? "rtl" : "ltr";
  const ar = lang === "ar";

  useEffect(() => {
    if (location.state?.accountCreated) {
      setAccountCreatedBanner(true);
      window.history.replaceState({}, document.title, `${location.pathname}${location.search || ""}`);
    }
  }, [location.pathname, location.search, location.state?.accountCreated]);

  const enrolled = courses.filter((c) => currentUser?.enrolledCourses?.find((e) => e.courseId === c.id));
  const getED = (id) => currentUser?.enrolledCourses?.find((e) => e.courseId === id);
  const enrolledIds = useMemo(
    () => new Set((currentUser?.enrolledCourses || []).map((e) => e.courseId)),
    [currentUser?.enrolledCourses],
  );

  const lessonsCompleted = useMemo(
    () => (currentUser?.enrolledCourses || []).reduce(
      (sum, e) => sum + (e.completedLessons?.length || 0), 0
    ),
    [currentUser?.enrolledCourses],
  );

  const lastCourse = useMemo(() => {
    const id = currentUser?.lastViewedCourseId;
    if (!id) return null;
    return courses.find((c) => c.id === id) || null;
  }, [courses, currentUser?.lastViewedCourseId]);

  const suggestions = useMemo(
    () => recommendCourses(courses, currentUser, enrolledIds),
    [courses, currentUser, enrolledIds],
  );

  const continueSlug = useMemo(() => {
    if (lastCourse?.slug) return lastCourse.slug;
    const inProg = enrolled.find((c) => {
      const p = getED(c.id)?.progress || 0;
      return p > 0 && p < 100;
    });
    if (inProg?.slug) return inProg.slug;
    return enrolled[0]?.slug || null;
  }, [lastCourse, enrolled, currentUser?.enrolledCourses]);

  useStreak();

  const notifications = (currentUser?.userNotifications || []).slice().reverse().slice(0, 8);
  const streak = currentUser?.streak || 0;

  const upcomingBlocks = useMemo(() => {
    return enrolled
      .map((c) => ({ c, note: c.upcomingSessionNote?.trim() }))
      .filter((x) => x.note)
      .slice(0, 4);
  }, [enrolled]);

  const certificates = enrolled.filter((c) => (getED(c.id)?.progress || 0) === 100).length;
  const statCards = ar
    ? [
        { l: "كورساتي", v: enrolled.length, c: C.red },
        { l: "دروس مكتملة", v: lessonsCompleted, c: C.orange },
        { l: "شهادات", v: certificates, c: C.purple },
      ]
    : [
        { l: "My courses", v: enrolled.length, c: C.red },
        { l: "Lessons done", v: lessonsCompleted, c: C.orange },
        { l: "Certificates", v: certificates, c: C.purple },
      ];

  if (!currentUser) {
    return (
      <div dir={dir} style={{ padding: "clamp(20px,4vw,32px) 5%" }}>
        <Skeleton h={120} w="100%" />
      </div>
    );
  }

  return (
    <div dir={dir} style={{ padding: "clamp(20px,4vw,32px) 5%", maxWidth: 1100, margin: "0 auto" }}>
      {accountCreatedBanner && (
        <div
          role="status"
          style={{
            background: "rgba(16,185,129,.12)",
            border: "1px solid rgba(16,185,129,.35)",
            borderRadius: 12,
            padding: "12px 16px",
            marginBottom: 18,
            fontSize: 13,
            color: ar ? "#d1fae5" : "#ecfdf5",
          }}
        >
          {ar
            ? "تم إنشاء حسابك بنجاح — يمكنك الآن استكشاف المنصة. عند التقديم على كورس سيُراجع الطلب من الإدارة قبل فتح المحتوى."
            : "Account created successfully — explore the platform. When you apply for a course, the team will review your request before content unlocks."}
        </div>
      )}
      <div style={{ marginBottom: 22, display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
        <div>
          <div style={{ color: C.muted, fontSize: 13, marginBottom: 3 }}>
            {ar ? "مرحباً بعودتك" : "Welcome back"}
            {currentUser?.name ? `، ${currentUser.name.split(" ")[0]}` : ""}
          </div>
          <h1 style={{ fontSize: "clamp(18px,4vw,26px)", fontWeight: 900, margin: 0 }}>{currentUser?.name}</h1>
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <Btn
            children={ar ? "\u0645\u0634 \u0639\u0627\u0631\u0641 \u062a\u0628\u062f\u0623 \u0645\u0646\u064a\u0646\u061f" : "Find my path"}
            v="outline"
            sm
            onClick={() => navigate("/find-path")}
          />
          <Btn children={ar ? "+ استعرض كورسات" : "+ Browse courses"} v="outline" sm onClick={() => navigate("/courses")} />
        </div>
      </div>

      {/* GamificationBar */}
      <div style={{ marginBottom: 20 }}>
        <GamificationBar
          xp={currentUser.xp || 0}
          level={currentUser.level || 1}
          badges={currentUser.badges || []}
          streak={streak}
        />
      </div>

      {/* Priority 1: Continue Learning card */}
      {continueSlug && lastCourse && (
        <div style={{
          background: "linear-gradient(135deg, rgba(217,27,91,.15) 0%, rgba(125,61,158,.15) 100%)",
          border: "1px solid rgba(217,27,91,.3)",
          borderRadius: 18,
          padding: "20px 22px",
          marginBottom: 20,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 16,
          flexWrap: "wrap",
        }}>
          <div>
            <div style={{ color: C.muted, fontSize: 11, marginBottom: 4 }}>
              {ar ? "آخر كورس شاهدته" : "Continue where you left off"}
            </div>
            <div style={{ fontWeight: 800, fontSize: 15 }}>
              {ar ? lastCourse.title : (lastCourse.title_en || lastCourse.title)}
            </div>
            <div style={{ color: C.muted, fontSize: 12, marginTop: 4 }}>
              {getED(lastCourse.id)?.progress || 0}% {ar ? "مكتمل" : "complete"}
            </div>
          </div>
          <Btn
            children={ar ? "كمل التعلم ▶" : "Continue ▶"}
            onClick={() => navigate(`/learn/${continueSlug}`)}
            style={{ padding: "12px 24px", fontSize: 14, borderRadius: 12, flexShrink: 0 }}
          />
        </div>
      )}

      {/* Priority 2: Stat row */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(110px,1fr))", gap: 12, marginBottom: 22 }}>
        {statCards.map((s) => (
          <Card key={s.l} style={{ padding: "16px 14px" }}>
            <div style={{ fontSize: 24, fontWeight: 900, color: s.c }}>{s.v}</div>
            <div style={{ color: C.muted, fontSize: 12 }}>{s.l}</div>
          </Card>
        ))}
      </div>

      {/* Priority 3: My Courses */}
      <div style={{ fontWeight: 800, fontSize: 15, marginBottom: 12 }}>{ar ? "كورساتي" : "My courses"}</div>
      {enrolled.length === 0 ? (
        <Card style={{ padding: 40, textAlign: "center" }}>
          <div style={{ fontWeight: 700, marginBottom: 8 }}>{ar ? "لا توجد كورسات بعد" : "No courses yet"}</div>
          <div style={{ color: C.muted, fontSize: 13, marginBottom: 18 }}>{ar ? "استعرض الكورسات واشترك الآن" : "Browse courses and enroll"}</div>
          <Btn children={ar ? "استعرض الكورسات" : "Browse courses"} onClick={() => navigate("/courses")} />
        </Card>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(240px,1fr))", gap: 14 }}>
          {enrolled.map((c) => {
            const ed = getED(c.id);
            const prog = ed?.progress || 0;
            return (
              <div
                key={c.id}
                onMouseEnter={(e) => { e.currentTarget.style.transform = "translateY(-4px)"; }}
                onMouseLeave={(e) => { e.currentTarget.style.transform = ""; }}
                onClick={() => navigate(`/learn/${c.slug}`)}
                style={{
                  background: "rgba(50,29,61,.6)",
                  border: `1px solid ${C.border}`,
                  borderRadius: 16,
                  overflow: "hidden",
                  cursor: "pointer",
                  transition: "all .25s",
                }}
              >
                <div style={{ height: 110, position: "relative", overflow: "hidden", background: `linear-gradient(135deg,${c.color},#321d3d)` }}>
                  {c.image ? (
                    <img src={c.image} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
                  ) : null}
                  {!(c.image && c.coverTitleInImage) && (
                    <div
                      style={{
                        position: "absolute",
                        inset: 0,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        background: c.image ? "linear-gradient(to top,rgba(0,0,0,.55) 0%,transparent 55%)" : "transparent",
                      }}
                    >
                      <span
                        style={{
                          fontWeight: 900,
                          color: c.image ? "#fff" : "rgba(255,255,255,.4)",
                          fontSize: "0.75rem",
                          textAlign: "center",
                          padding: "0 12px",
                          lineHeight: 1.4,
                          textShadow: c.image ? "0 1px 3px rgba(0,0,0,.55)" : undefined,
                        }}
                      >
                        {ar ? c.title : (c.title_en || c.title)}
                      </span>
                    </div>
                  )}
                  {prog === 100 && (
                    <div style={{ position: "absolute", inset: 0, background: "rgba(16,185,129,.4)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <span style={{ fontWeight: 900, fontSize: 13, color: "#fff" }}>{ar ? "مكتمل" : "Complete"}</span>
                    </div>
                  )}
                  <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: 3 }}>
                    <div style={{ height: "100%", width: `${prog}%`, background: prog === 100 ? C.success : C.orange }} />
                  </div>
                </div>
                <div style={{ padding: "12px 14px" }}>
                  <div style={{ fontWeight: 800, fontSize: 13, marginBottom: 3 }}>{c.title}</div>
                  <PBar value={prog} color={prog === 100 ? C.success : C.red} h={4} />
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 8, gap: 6 }}>
                    <span style={{ color: C.muted, fontSize: 11 }}>{prog}%</span>
                    {prog === 100 ? (
                      <span
                        onClick={(e) => { e.stopPropagation(); navigate(`/certificate/${c.slug || c.id}`); }}
                        style={{ color: C.success, fontSize: 11, fontWeight: 700, cursor: "pointer", background: `${C.success}18`, border: `1px solid ${C.success}44`, borderRadius: 6, padding: "2px 8px" }}
                      >
                        {ar ? "الشهادة" : "Certificate"}
                      </span>
                    ) : (
                      <span style={{ color: C.orange, fontSize: 11, fontWeight: 700 }}>{ar ? "متابعة" : "Continue"}</span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Recommendations */}
      {suggestions.length > 0 && (
        <div style={{ marginTop: 28, marginBottom: 22 }}>
          <div style={{ fontWeight: 800, fontSize: 15, marginBottom: 12 }}>{ar ? "موصى بها لك" : "Recommended for you"}</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(200px,1fr))", gap: 12 }}>
            {suggestions.map((c) => (
              <Card key={c.id} style={{ padding: 12 }} onClick={() => navigate(`/courses/${c.slug}`)}>
                <div style={{ fontWeight: 800, fontSize: 13, marginBottom: 6 }}>{ar ? c.title : (c.title_en || c.title)}</div>
                <div style={{ color: C.muted, fontSize: 11 }}>{c.price?.toLocaleString?.()} EGP</div>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Upcoming sessions */}
      {upcomingBlocks.length > 0 && (
        <Card style={{ padding: "14px 16px", marginBottom: 22 }}>
          <div style={{ fontWeight: 800, fontSize: 14, marginBottom: 10 }}>{ar ? "جلسات قادمة" : "Upcoming sessions"}</div>
          {upcomingBlocks.map(({ c, note }) => (
            <div key={c.id} style={{ fontSize: 13, marginBottom: 8, paddingBottom: 8, borderBottom: `1px solid ${C.border}` }}>
              <strong>{ar ? c.title : (c.title_en || c.title)}:</strong>{" "}
              <span style={{ color: C.muted }}>{note}</span>
            </div>
          ))}
        </Card>
      )}

      {/* Notifications */}
      {notifications.length > 0 && (
        <Card style={{ padding: "14px 16px", marginBottom: 22 }}>
          <div style={{ fontWeight: 800, fontSize: 14, marginBottom: 10 }}>{ar ? "إشعارات" : "Notifications"}</div>
          <ul style={{ margin: 0, paddingInlineStart: 18, color: C.muted, fontSize: 12, lineHeight: 1.7 }}>
            {notifications.map((n) => (
              <li key={n.id || n.createdAt} style={{ marginBottom: 6 }}>{n.message}</li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  );
}
