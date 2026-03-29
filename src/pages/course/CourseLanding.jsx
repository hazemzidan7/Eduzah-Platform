import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { C } from "../../theme";
import { Btn, Card, Stars, Badge } from "../../components/UI";
import { useData } from "../../context/DataContext";
import { useAuth } from "../../context/AuthContext";

const FAQ_DEFAULT = [
  { q:"هل محتاج خبرة سابقة؟",         a:"لا، الدبلومة تبدأ من الصفر وتوصلك للاحتراف. كل اللي محتاجه هو الرغبة والالتزام." },
  { q:"إيه طريقة التدريس؟",            a:"تدريب مباشر Online مع مدرب، مع تسجيلات لكل الجلسات. تقدر تشوف أي درس وقت ما تحب." },
  { q:"هل في شهادة في الآخر؟",          a:"أيوه، بتاخد شهادة معتمدة من Eduzah عند إتمام الدبلومة بنجاح." },
  { q:"إيه طرق الدفع المتاحة؟",         a:"كارت بنكي، Vodafone Cash، فوري، أو نظام 3 أقساط مريحة." },
  { q:"هل فيه دعم بعد انتهاء الكورس؟", a:"أيوه، بتنضم لمجتمع خريجي Eduzah ومتاح لك دعم التوظيف وربطك بالشركات." },
];

export default function CourseLanding() {
  const { slug }    = useParams();
  const navigate    = useNavigate();
  const { courses } = useData();
  const { currentUser } = useAuth();

  const [openCurr, setOpenCurr] = useState(0);
  const [openFaq,  setOpenFaq]  = useState(null);

  const course   = courses.find(c => c.slug === slug);
  if (!course) return (
    <div style={{ padding: "80px 5%", textAlign: "center", color: C.muted }}>
      <div style={{ fontSize: 48, marginBottom: 16 }}>😕</div>
      <h2 style={{ marginBottom: 8 }}>الكورس مش موجود</h2>
      <Btn children="← الكورسات" onClick={() => navigate("/courses")} />
    </div>
  );

  const enrolled = currentUser?.enrolledCourses?.find(e => e.courseId === course.id);

  const handleEnroll = () => {
    navigate(`/courses/${slug}/register`);
  };

  const goLearn = () => {
    if (!currentUser) { navigate("/login"); return; }
    navigate(`/learn/${slug}`);
  };

  /* ── Who is this for ── */
  const WHO = [
    "🎯 المبتدئين اللي عايزين يدخلوا المجال من الصفر",
    "💼 أصحاب العمل اللي عايزين يفهموا التكنولوجيا",
    "🔄 اللي شغلانتهم في مجال تاني وعايزين يتحولوا للـ Tech",
    "📈 المطورين اللي عايزين يرفعوا مستواهم",
  ];

  return (
    <div style={{ paddingBottom: 70 }}>

      {/* ══ HERO ══ */}
      <div style={{ background: "linear-gradient(135deg,#1a0a2e 0%,#321d3d 45%,#4a1f6e 100%)", padding: "clamp(40px,7vw,64px) 4%", display: "flex", alignItems: "center", gap: 36, flexWrap: "wrap", position: "relative", overflow: "hidden" }}>
        <div style={{ position: "absolute", top: "-15%", right: "-8%", width: 420, height: 420, background: `radial-gradient(circle,rgba(103,45,134,.28),transparent 70%)`, borderRadius: "50%", pointerEvents: "none" }} />
        <div style={{ position: "absolute", bottom: "-15%", left: "-5%", width: 360, height: 360, background: `radial-gradient(circle,rgba(217,27,91,.18),transparent 70%)`, borderRadius: "50%", pointerEvents: "none" }} />

        {/* Left content */}
        <div style={{ flex: "1 1 300px", position: "relative", zIndex: 2 }}>
          {course.badge && (
            <div style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "rgba(250,166,51,.14)", border: "1px solid rgba(250,166,51,.3)", color: C.orange, borderRadius: 50, padding: "4px 14px", fontSize: 11, fontWeight: 700, marginBottom: 16 }}>
              {course.badge}
            </div>
          )}

          <h1 style={{ fontSize: "clamp(1.5rem,4vw,2.7rem)", fontWeight: 900, lineHeight: 1.2, marginBottom: 12 }}>{course.tagline || course.title}</h1>
          <p style={{ color: C.muted, fontSize: 14, lineHeight: 1.9, marginBottom: 20, maxWidth: 500 }}>{course.desc}</p>

          {/* Bullets */}
          <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 24 }}>
            {course.bullets.map((b, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 13, fontWeight: 600 }}>
                <span style={{ width: 24, height: 24, borderRadius: 7, background: "rgba(16,185,129,.15)", border: "1px solid rgba(16,185,129,.3)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, flexShrink: 0, color: C.success }}>✓</span>
                {b}
              </div>
            ))}
          </div>

          {/* Rating row */}
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 22, flexWrap: "wrap" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
              <Stars n={Math.round(course.rating || 5)} />
              <span style={{ fontWeight: 800, color: C.orange, fontSize: 13 }}>{course.rating || "5.0"}</span>
            </div>
            <span style={{ color: C.muted, fontSize: 12 }}>({course.students || 0}+ خريج)</span>
            <Badge color={C.orange}>⏱ {course.duration}</Badge>
            <Badge color={C.purple}>📚 {course.hours}h</Badge>
          </div>

          {/* CTA buttons */}
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            {enrolled
              ? <Btn children="متابعة التعلم ▶" onClick={goLearn} style={{ padding: "13px 28px", fontSize: 14, borderRadius: 12 }} />
              : <Btn children="سجّل الآن 🚀" onClick={handleEnroll} style={{ padding: "13px 28px", fontSize: 14, borderRadius: 12, animation: "pulse 2s infinite" }} />
            }
            <Btn children="استعرض المنهج" v="outline"
              onClick={() => document.getElementById("curriculum")?.scrollIntoView({ behavior: "smooth" })}
              style={{ padding: "13px 22px", fontSize: 14, borderRadius: 12 }} />
          </div>
        </div>

        {/* Price Card */}
        <div style={{ flex: "0 1 290px", position: "relative", zIndex: 2 }}>
          <div style={{ background: "rgba(255,255,255,.05)", backdropFilter: "blur(18px)", border: "1px solid rgba(255,255,255,.13)", borderRadius: 18, overflow: "hidden", boxShadow: "0 20px 60px rgba(0,0,0,.45)" }}>
            <div style={{ height: 160, background: `linear-gradient(135deg,${course.color},#321d3d)`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 52, position: "relative" }}>
              {course.icon}
              {course.badge && <div style={{ position: "absolute", top: 10, right: 10, background: "rgba(217,27,91,.9)", borderRadius: 7, padding: "3px 9px", fontSize: 10, fontWeight: 700 }}>{course.badge}</div>}
            </div>
            <div style={{ padding: 18 }}>
              <div style={{ fontSize: 24, fontWeight: 900, color: C.orange, marginBottom: 2 }}>{course.price.toLocaleString()} EGP</div>
              <div style={{ color: C.muted, fontSize: 11, marginBottom: 14 }}>أو 3 أقساط × {course.installment.toLocaleString()} EGP</div>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 14 }}>
                {[[course.duration?.split(" ")[0] || "—", "أسبوع"], [course.hours + "", "ساعة"], [(course.projects || 0) + "+", "مشروع"], [(course.rating || 5) + "★", "تقييم"]].map(([v, l]) => (
                  <div key={l} style={{ textAlign: "center" }}>
                    <div style={{ fontWeight: 800, fontSize: 14 }}>{v}</div>
                    <div style={{ color: C.muted, fontSize: 10 }}>{l}</div>
                  </div>
                ))}
              </div>
              <hr style={{ border: "none", borderTop: `1px solid ${C.border}`, marginBottom: 14 }} />
              {enrolled
                ? <Btn children="متابعة التعلم ▶" full onClick={goLearn} style={{ marginBottom: 8 }} />
                : <Btn children="سجّل الآن 🚀" full onClick={handleEnroll} style={{ marginBottom: 8, animation: "pulse 2s infinite" }} />
              }
              <Btn children="استعرض المنهج" v="outline" full onClick={() => document.getElementById("curriculum")?.scrollIntoView({ behavior: "smooth" })} style={{ fontSize: 12 }} />
              <div style={{ textAlign: "center", marginTop: 10, color: C.muted, fontSize: 10 }}>🔒 ضمان استرداد 14 يوم</div>
            </div>
          </div>
        </div>
      </div>

      {/* ══ WHO IS THIS FOR ══ */}
      <div style={{ background: "#2a1540", padding: "clamp(32px,6vw,56px) 4%" }}>
        <div style={{ textAlign: "center", marginBottom: 28 }}>
          <div style={{ color: C.orange, fontWeight: 700, fontSize: 11, letterSpacing: 2, marginBottom: 8 }}>المحتوى ده ليك؟</div>
          <h2 style={{ fontSize: "clamp(1.2rem,3vw,2rem)", fontWeight: 900 }}>الدبلومة دي مناسبة إذا كنت...</h2>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(240px,1fr))", gap: 12, maxWidth: 760, margin: "0 auto" }}>
          {WHO.map((w, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 12, background: "rgba(255,255,255,.05)", border: `1px solid ${C.border}`, borderRadius: 12, padding: "14px 16px", fontSize: 13, fontWeight: 600 }}>
              {w}
            </div>
          ))}
        </div>
      </div>

      {/* ══ TECH STACK ══ */}
      {course.techStack?.length > 0 && (
        <div style={{ padding: "clamp(32px,6vw,56px) 4%" }}>
          <div style={{ textAlign: "center", marginBottom: 28 }}>
            <div style={{ color: C.orange, fontWeight: 700, fontSize: 11, letterSpacing: 2, marginBottom: 8 }}>التقنيات</div>
            <h2 style={{ fontSize: "clamp(1.2rem,3vw,2rem)", fontWeight: 900 }}>اللي هتتعلمه</h2>
          </div>
          <div style={{ maxWidth: 760, margin: "0 auto" }}>
            {course.techStack.map((group, gi) => (
              <div key={gi} style={{ marginBottom: 18 }}>
                <div style={{ fontWeight: 700, fontSize: 12, color: group.ai ? C.red : C.orange, marginBottom: 10, display: "flex", alignItems: "center", gap: 7 }}>
                  <span style={{ width: 3, height: 14, background: group.ai ? C.red : C.orange, borderRadius: 2, display: "inline-block" }}></span>
                  {group.label}
                </div>
                <div style={{ lineHeight: 2.2 }}>
                  {group.items.map(item => (
                    <span key={item} style={{ background: group.ai ? "rgba(250,166,51,.1)" : "rgba(255,255,255,.06)", border: `1px solid ${group.ai ? "rgba(250,166,51,.3)" : "rgba(255,255,255,.11)"}`, color: group.ai ? C.orange : "#fff", borderRadius: 50, padding: "6px 14px", fontSize: 12, fontWeight: 600, display: "inline-block", margin: "3px" }}>
                      {item}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ══ CURRICULUM ══ */}
      {course.curriculum?.length > 0 && (
        <div style={{ background: "#2a1540", padding: "clamp(32px,6vw,56px) 4%" }} id="curriculum">
          <div style={{ textAlign: "center", marginBottom: 28 }}>
            <div style={{ color: C.orange, fontWeight: 700, fontSize: 11, letterSpacing: 2, marginBottom: 8 }}>المنهج</div>
            <h2 style={{ fontSize: "clamp(1.2rem,3vw,2rem)", fontWeight: 900 }}>محتوى الدبلومة</h2>
            <p style={{ color: C.muted, fontSize: 13, marginTop: 6 }}>{course.curriculum.length} وحدة · {course.hours} ساعة تدريب</p>
          </div>
          <div style={{ maxWidth: 720, margin: "0 auto" }}>
            {course.curriculum.map((ch, ci) => (
              <div key={ci} style={{ border: `1px solid ${openCurr === ci ? C.red + "55" : C.border}`, borderRadius: 13, overflow: "hidden", marginBottom: 8, transition: "border-color .2s" }}>
                <div onClick={() => setOpenCurr(openCurr === ci ? null : ci)}
                  style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "13px 18px", background: openCurr === ci ? `${C.red}10` : "rgba(255,255,255,.04)", cursor: "pointer" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, fontWeight: 700, fontSize: 13 }}>
                    <div style={{ width: 26, height: 26, borderRadius: 7, background: "rgba(217,27,91,.18)", border: "1px solid rgba(217,27,91,.28)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 800, color: C.red, flexShrink: 0 }}>{ci + 1}</div>
                    {ch.title}
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <span style={{ color: C.muted, fontSize: 11 }}>{ch.lessons?.length || 0} درس</span>
                    <span style={{ color: C.muted, fontSize: 16, transition: "transform .25s", transform: openCurr === ci ? "rotate(180deg)" : "" }}>⌄</span>
                  </div>
                </div>
                {openCurr === ci && (
                  <div style={{ padding: "12px 18px", borderTop: `1px solid ${C.border}` }}>
                    <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
                      {ch.lessons?.map((l, li) => (
                        <div key={li} style={{ color: C.muted, fontSize: 13, display: "flex", alignItems: "center", gap: 8 }}>
                          <span style={{ fontSize: 12 }}>{l.startsWith("🛠") ? "🛠" : "📹"}</span>
                          {l.replace("🛠 ", "").replace("📹 ", "")}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ══ OUTCOMES ══ */}
      {course.outcomes?.length > 0 && (
        <div style={{ padding: "clamp(32px,6vw,56px) 4%" }}>
          <div style={{ textAlign: "center", marginBottom: 28 }}>
            <div style={{ color: C.orange, fontWeight: 700, fontSize: 11, letterSpacing: 2, marginBottom: 8 }}>هتخرج بإيه؟</div>
            <h2 style={{ fontSize: "clamp(1.2rem,3vw,2rem)", fontWeight: 900 }}>مهاراتك بعد الدبلومة</h2>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(210px,1fr))", gap: 10, maxWidth: 800, margin: "0 auto" }}>
            {course.outcomes.map((o, i) => (
              <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 9, background: "rgba(255,255,255,.05)", border: `1px solid ${C.border}`, borderRadius: 12, padding: 13 }}>
                <div style={{ width: 20, height: 20, borderRadius: 6, background: "rgba(16,185,129,.15)", border: "1px solid rgba(16,185,129,.3)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, color: C.success, flexShrink: 0, marginTop: 1 }}>✓</div>
                <span style={{ fontSize: 13, fontWeight: 600, lineHeight: 1.5 }}>{o}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ══ REVIEWS ══ */}
      {course.reviews?.length > 0 && (
        <div style={{ background: "#2a1540", padding: "clamp(32px,6vw,56px) 4%" }}>
          <div style={{ textAlign: "center", marginBottom: 28 }}>
            <div style={{ color: C.orange, fontWeight: 700, fontSize: 11, letterSpacing: 2, marginBottom: 8 }}>آراء الطلاب</div>
            <h2 style={{ fontSize: "clamp(1.2rem,3vw,2rem)", fontWeight: 900, marginBottom: 4 }}>قالوا إيه عن الدبلومة</h2>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 7 }}>
              <Stars n={5} /><span style={{ color: C.muted, fontSize: 13 }}>{course.rating} / 5.0 · {course.reviews.length} تقييم</span>
            </div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(240px,1fr))", gap: 14 }}>
            {course.reviews.map((r, i) => (
              <Card key={i} style={{ padding: 18 }}>
                <Stars n={r.rating} />
                <p style={{ color: C.muted, fontSize: 12, lineHeight: 1.8, margin: "8px 0 12px" }}>"{r.text}"</p>
                <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
                  <div style={{ width: 34, height: 34, borderRadius: "50%", background: "linear-gradient(135deg,#d91b5b,#b51549)", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: 13, flexShrink: 0 }}>{r.avatar}</div>
                  <div><div style={{ fontWeight: 700, fontSize: 12 }}>{r.name}</div><div style={{ color: C.muted, fontSize: 10 }}>{r.role}</div></div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* ══ FAQ ══ */}
      <div style={{ padding: "clamp(32px,6vw,56px) 4%" }}>
        <div style={{ textAlign: "center", marginBottom: 28 }}>
          <div style={{ color: C.orange, fontWeight: 700, fontSize: 11, letterSpacing: 2, marginBottom: 8 }}>الأسئلة الشائعة</div>
          <h2 style={{ fontSize: "clamp(1.2rem,3vw,2rem)", fontWeight: 900 }}>عندك سؤال؟</h2>
        </div>
        <div style={{ maxWidth: 680, margin: "0 auto" }}>
          {FAQ_DEFAULT.map((faq, fi) => (
            <div key={fi} style={{ border: `1px solid ${openFaq === fi ? C.orange + "55" : C.border}`, borderRadius: 12, overflow: "hidden", marginBottom: 8, transition: "border-color .2s" }}>
              <div onClick={() => setOpenFaq(openFaq === fi ? null : fi)}
                style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "14px 18px", background: openFaq === fi ? `${C.orange}10` : "rgba(255,255,255,.04)", cursor: "pointer" }}>
                <span style={{ fontWeight: 700, fontSize: 13 }}>{faq.q}</span>
                <span style={{ color: C.muted, fontSize: 18, transition: "transform .25s", transform: openFaq === fi ? "rotate(45deg)" : "" }}>+</span>
              </div>
              {openFaq === fi && (
                <div style={{ padding: "12px 18px", borderTop: `1px solid ${C.border}` }}>
                  <p style={{ color: C.muted, fontSize: 13, lineHeight: 1.8 }}>{faq.a}</p>
                </div>
              )}
            </div>
          ))}
        </div>
        <div style={{ textAlign: "center", marginTop: 20 }}>
          <span style={{ color: C.muted, fontSize: 13 }}>عندك سؤال تاني؟ </span>
          <a href="https://wa.me/201044222881" target="_blank" rel="noreferrer"
            style={{ color: "#25d366", fontWeight: 700, fontSize: 13, textDecoration: "none" }}>تكلمنا على واتساب 💬</a>
        </div>
      </div>

      {/* ══ BOTTOM CTA ══ */}
      <div style={{ background: "linear-gradient(135deg,#1a0a2e,#4a1f6e)", border: `1px solid rgba(217,27,91,.2)`, borderRadius: 20, padding: "clamp(24px,5vw,44px)", textAlign: "center", margin: "0 4% 80px", position: "relative", overflow: "hidden" }}>
        <div style={{ position: "absolute", top: "-30px", right: "-30px", width: 200, height: 200, background: "radial-gradient(circle,rgba(217,27,91,.22),transparent 70%)", borderRadius: "50%" }} />
        <h2 style={{ fontSize: "clamp(1.2rem,3vw,1.8rem)", fontWeight: 900, marginBottom: 8, position: "relative" }}>مستنى إيه؟ ابدأ رحلتك دلوقتي 🚀</h2>
        <p style={{ color: C.muted, fontSize: 13, marginBottom: 22, position: "relative" }}>الدفعة القادمة محدودة — الأماكن بتتملى بسرعة</p>
        <div style={{ display: "flex", gap: 10, justifyContent: "center", flexWrap: "wrap", position: "relative" }}>
          <Btn children={`سجّل الآن — ${course.price.toLocaleString()} EGP`} onClick={handleEnroll} style={{ padding: "13px 30px", fontSize: 14, borderRadius: 12 }} />
          <a href="https://wa.me/201044222881" target="_blank" rel="noreferrer"
            style={{ background: "#25d366", color: "#fff", padding: "13px 24px", borderRadius: 12, fontFamily: "'Cairo',sans-serif", fontWeight: 700, fontSize: 13, textDecoration: "none", display: "inline-flex", alignItems: "center", gap: 8 }}>
            💬 استفسر عبر واتساب
          </a>
        </div>
        <div style={{ marginTop: 12, color: C.muted, fontSize: 11, position: "relative" }}>🔒 دفع آمن · ضمان استرداد 14 يوم · شهادة معتمدة</div>
      </div>

      {/* ══ STICKY BAR ══ */}
      <div style={{ position: "fixed", bottom: 0, left: 0, right: 0, background: "rgba(26,10,46,.97)", backdropFilter: "blur(16px)", borderTop: `1px solid ${C.border}`, padding: "10px 4%", display: "flex", alignItems: "center", justifyContent: "space-between", zIndex: 90, gap: 12, flexWrap: "wrap" }}>
        <div>
          <div style={{ fontWeight: 800, fontSize: 13 }}>{course.title}</div>
          <div style={{ color: C.muted, fontSize: 11 }}>{course.duration} · {course.hours}h · {course.projects}+ مشروع</div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ fontSize: 18, fontWeight: 900, color: C.orange }}>{course.price.toLocaleString()} EGP</div>
          {enrolled
            ? <Btn children="متابعة ▶" sm onClick={goLearn} />
            : <Btn children="سجّل الآن 🚀" sm onClick={handleEnroll} />
          }
        </div>
      </div>
    </div>
  );
}
