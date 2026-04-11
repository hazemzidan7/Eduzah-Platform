import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { C } from "../../theme";
import { Btn, Card, PBar } from "../../components/UI";
import GamificationBar from "../../components/GamificationBar";
import { Skeleton } from "../../components/Skeleton";
import { useAuth } from "../../context/AuthContext";
import { useData } from "../../context/DataContext";
import { useLang } from "../../context/LangContext";

const MOTIS_AR = ["أنت على بعد خطوات من إتقان المهارة! استمر!", "الاستمرارية هي قوتك.", "كل درس يقربك من هدفك!", "متابعة رائعة!"];
const MOTIS_EN = ["You're steps away from mastering this skill!", "Consistency is your strength.", "Every lesson brings you closer!", "Great momentum!"];

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
        if (lc && lc.cat === c.cat) s += 2;
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
  const dir = lang === "ar" ? "rtl" : "ltr";
  const ar = lang === "ar";

  const enrolled = courses.filter((c) => currentUser?.enrolledCourses?.find((e) => e.courseId === c.id));
  const getED = (id) => currentUser?.enrolledCourses?.find((e) => e.courseId === id);
  const enrolledIds = useMemo(
    () => new Set((currentUser?.enrolledCourses || []).map((e) => e.courseId)),
    [currentUser?.enrolledCourses],
  );

  const totalProg = enrolled.length > 0
    ? Math.round(enrolled.reduce((s, c) => s + (getED(c.id)?.progress || 0), 0) / enrolled.length)
    : 0;

  const motis = ar ? MOTIS_AR : MOTIS_EN;
  const moti = motis[Math.floor(Date.now() / 60000) % motis.length];

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

  const notifications = (currentUser?.userNotifications || []).slice().reverse().slice(0, 8);

  const upcomingBlocks = useMemo(() => {
    return enrolled
      .map((c) => ({ c, note: c.upcomingSessionNote?.trim() }))
      .filter((x) => x.note)
      .slice(0, 4);
  }, [enrolled]);

  const statCards = ar
    ? [
        { l: "كورساتي", v: enrolled.length, c: C.red },
        { l: "التقدم", v: `${totalProg}%`, c: C.orange },
        { l: "شهادات", v: enrolled.filter((c) => (getED(c.id)?.progress || 0) === 100).length, c: C.purple },
      ]
    : [
        { l: "My courses", v: enrolled.length, c: C.red },
        { l: "Progress", v: `${totalProg}%`, c: C.orange },
        { l: "Certificates", v: enrolled.filter((c) => (getED(c.id)?.progress || 0) === 100).length, c: C.purple },
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

      <div style={{ marginBottom: 20 }}>
        <GamificationBar
          xp={currentUser.xp || 0}
          level={currentUser.level || 1}
          badges={currentUser.badges || []}
        />
      </div>

      {continueSlug && (
        <div style={{ marginBottom: 20 }}>
          <Btn
            children={ar ? "كمل التعلم" : "Continue learning"}
            onClick={() => navigate(`/learn/${continueSlug}`)}
            style={{ padding: "14px 28px", fontSize: 15, borderRadius: 14 }}
          />
        </div>
      )}

      <div style={{ background: "linear-gradient(135deg,rgba(250,166,51,.12),rgba(217,27,91,.12))", border: "1px solid rgba(250,166,51,.3)", borderRadius: 14, padding: "12px 16px", marginBottom: 20 }}>
        <div style={{ fontWeight: 700, fontSize: 13 }}>{moti}</div>
        <div style={{ color: C.muted, fontSize: 11 }}>{ar ? "واصل التعلم!" : "Keep it up!"}</div>
      </div>

      {lastCourse && (
        <Card style={{ padding: "14px 16px", marginBottom: 18 }}>
          <div style={{ fontWeight: 800, fontSize: 13, marginBottom: 8 }}>{ar ? "آخر كورس شاهدته" : "Last viewed course"}</div>
          <div
            role="button"
            tabIndex={0}
            onClick={() => navigate(`/learn/${lastCourse.slug}`)}
            onKeyDown={(e) => e.key === "Enter" && navigate(`/learn/${lastCourse.slug}`)}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 12,
              cursor: "pointer",
              padding: 10,
              borderRadius: 10,
              border: `1px solid ${C.border}`,
              transition: "background .2s",
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(255,255,255,.06)"; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
          >
            <span style={{ fontWeight: 700, fontSize: 14 }}>{ar ? lastCourse.title : (lastCourse.title_en || lastCourse.title)}</span>
            <span style={{ color: C.orange, fontWeight: 800, fontSize: 12 }}>{ar ? "متابعة" : "Resume"}</span>
          </div>
        </Card>
      )}

      {suggestions.length > 0 && (
        <div style={{ marginBottom: 22 }}>
          <div style={{ fontWeight: 800, fontSize: 15, marginBottom: 12 }}>{ar ? "موصى بها لك" : "Recommended for you"}</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(200px,1fr))", gap: 12 }}>
            {suggestions.map((c) => (
              <Card
                key={c.id}
                style={{ padding: 12 }}
                onClick={() => navigate(`/courses/${c.slug}`)}
              >
                <div style={{ fontWeight: 800, fontSize: 13, marginBottom: 6 }}>{ar ? c.title : (c.title_en || c.title)}</div>
                <div style={{ color: C.muted, fontSize: 11 }}>{c.price?.toLocaleString?.()} EGP</div>
              </Card>
            ))}
          </div>
        </div>
      )}

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

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(120px,1fr))", gap: 12, marginBottom: 22 }}>
        {statCards.map((s) => (
          <Card key={s.l} style={{ padding: "16px 14px" }}>
            <div style={{ fontSize: 22, fontWeight: 900, color: s.c }}>{s.v}</div>
            <div style={{ color: C.muted, fontSize: 12 }}>{s.l}</div>
          </Card>
        ))}
      </div>

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
                <div style={{ height: 110, background: `linear-gradient(135deg,${c.color},#321d3d)`, display: "flex", alignItems: "center", justifyContent: "center", position: "relative" }}>
                  <span style={{ fontWeight: 900, color: "rgba(255,255,255,.4)", fontSize: "0.75rem", textAlign: "center", padding: "0 12px", lineHeight: 1.4 }}>
                    {ar ? c.title : (c.title_en || c.title)}
                  </span>
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
    </div>
  );
}
