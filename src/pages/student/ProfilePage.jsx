import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { C, gPur, gRed, gOr } from "../../theme";
import { Btn, Card, PBar, Badge } from "../../components/UI";
import { useAuth } from "../../context/AuthContext";
import { useData } from "../../context/DataContext";
import { useLang } from "../../context/LangContext";

const readFile = (file, cb) => {
  const r = new FileReader();
  r.onloadend = () => cb(r.result);
  r.readAsDataURL(file);
};

export default function ProfilePage() {
  const navigate = useNavigate();
  const { currentUser, updateProfile, logout } = useAuth();
  const { courses } = useData();
  const { lang } = useLang();
  const dir = lang === "ar" ? "rtl" : "ltr";

  const [editing, setEditing] = useState(false);
  const [saved,   setSaved]   = useState(false);
  const [form,    setForm]    = useState({
    name:  currentUser?.name  || "",
    phone: currentUser?.phone || "",
  });

  if (!currentUser) { navigate("/login"); return null; }

  const role     = currentUser.role;
  const avBg     = role === "admin" ? gOr : role === "instructor" ? gPur : gRed;
  const roleName = role === "admin"
    ? (lang==="ar" ? "مدير" : "Admin")
    : role === "instructor"
    ? (lang==="ar" ? "مدرب" : "Instructor")
    : (lang==="ar" ? "طالب" : "Student");

  // Enrolled courses with details
  const enrolled = (currentUser.enrolledCourses || []).map(ec => {
    const course = courses.find(c => c.id === ec.courseId);
    return course ? { ...ec, course } : null;
  }).filter(Boolean);

  const totalProgress = enrolled.length
    ? Math.round(enrolled.reduce((s, e) => s + (e.progress || 0), 0) / enrolled.length)
    : 0;

  const completed = enrolled.filter(e => e.progress === 100).length;

  const pickAvatar = e => {
    if (e.target.files[0]) readFile(e.target.files[0], data => {
      updateProfile({ avatar: data, avatarImg: data });
    });
  };

  const saveProfile = () => {
    if (!form.name.trim()) return;
    updateProfile({ name: form.name.trim(), phone: form.phone.trim() });
    setEditing(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  return (
    <div dir={dir} style={{ background: "#1a0f24", minHeight: "calc(100vh - 60px)", padding: "32px 4%" }}>
      <div style={{ maxWidth: 900, margin: "0 auto" }}>

        {/* ── Back button ── */}
        <button onClick={() => navigate("/dashboard")}
          style={{ background: "transparent", border: `1px solid ${C.border}`, borderRadius: 8, padding: "6px 14px", color: C.muted, fontFamily: "'Cairo',sans-serif", fontSize: 12, cursor: "pointer", marginBottom: 24 }}>
          {lang === "ar" ? "← رجوع" : "← Back"}
        </button>

        {/* ── Saved toast ── */}
        {saved && (
          <div style={{ position: "fixed", top: 72, left: "50%", transform: "translateX(-50%)", background: "#1a0f24", border: `1px solid ${C.success}55`, borderRadius: 12, padding: "10px 22px", fontSize: 13, fontWeight: 700, color: C.success, zIndex: 9999, whiteSpace: "nowrap" }}>
            {lang === "ar" ? "تم حفظ البيانات" : "Profile saved"}
          </div>
        )}

        <div style={{ display: "grid", gridTemplateColumns: "300px 1fr", gap: 20, alignItems: "start" }}>

          {/* ── Left: Profile card ── */}
          <Card style={{ padding: 28, textAlign: "center" }}>

            {/* Avatar */}
            <div style={{ position: "relative", display: "inline-block", marginBottom: 16 }}>
              <div style={{
                width: 96, height: 96, borderRadius: "50%",
                background: currentUser.avatarImg ? "transparent" : avBg,
                border: `3px solid ${C.red}`,
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 36, fontWeight: 900, overflow: "hidden",
                margin: "0 auto",
              }}>
                {currentUser.avatarImg
                  ? <img src={currentUser.avatarImg} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  : currentUser.avatar
                }
              </div>
              {/* Upload button */}
              <label style={{
                position: "absolute", bottom: 0, right: 0,
                width: 28, height: 28, borderRadius: "50%",
                background: C.red, cursor: "pointer",
                display: "flex", alignItems: "center", justifyContent: "center",
                border: "2px solid #1a0f24",
              }}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5">
                  <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/>
                  <polyline points="17 8 12 3 7 8"/>
                  <line x1="12" y1="3" x2="12" y2="15"/>
                </svg>
                <input type="file" accept="image/*" onChange={pickAvatar} style={{ display: "none" }} />
              </label>
            </div>

            {/* Name */}
            {editing ? (
              <input
                value={form.name}
                onChange={e => { const v = e.target.value; setForm(p => ({...p, name: v})); }}
                style={{ width: "100%", boxSizing: "border-box", background: "rgba(50,29,61,.6)", border: `1.5px solid ${C.red}`, borderRadius: 10, padding: "8px 12px", color: "#fff", fontFamily: "'Cairo',sans-serif", fontSize: 16, fontWeight: 700, textAlign: "center", outline: "none", marginBottom: 8 }}
              />
            ) : (
              <div style={{ fontWeight: 900, fontSize: 18, marginBottom: 6 }}>{currentUser.name}</div>
            )}

            <Badge color={role === "admin" ? C.orange : role === "instructor" ? C.purple : C.red}>
              {roleName}
            </Badge>

            {/* Stats */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginTop: 20, marginBottom: 20 }}>
              {[
                { label: lang==="ar" ? "الكورسات" : "Courses",    value: enrolled.length,  color: C.orange },
                { label: lang==="ar" ? "مكتمل"    : "Completed",  value: completed,         color: C.success },
                { label: lang==="ar" ? "متوسط التقدم" : "Avg. Progress", value: `${totalProgress}%`, color: C.red, span: true },
              ].map(s => (
                <div key={s.label} style={{ background: "rgba(255,255,255,.06)", borderRadius: 12, padding: "12px 8px", gridColumn: s.span ? "1/-1" : "auto" }}>
                  <div style={{ fontSize: 20, fontWeight: 900, color: s.color }}>{s.value}</div>
                  <div style={{ fontSize: 11, color: C.muted }}>{s.label}</div>
                </div>
              ))}
            </div>

            {/* Edit / Save buttons */}
            {editing ? (
              <div style={{ display: "flex", gap: 8, justifyContent: "center" }}>
                <Btn children={lang==="ar" ? "حفظ" : "Save"} v="success" sm onClick={saveProfile} />
                <Btn children={lang==="ar" ? "إلغاء" : "Cancel"} v="outline" sm onClick={() => { setEditing(false); setForm({ name: currentUser.name, phone: currentUser.phone || "" }); }} />
              </div>
            ) : (
              <Btn children={lang==="ar" ? "تعديل البيانات" : "Edit Profile"} v="outline" full onClick={() => setEditing(true)} />
            )}

            <div style={{ marginTop: 12 }}>
              <Btn children={lang==="ar" ? "تسجيل الخروج" : "Logout"} v="danger" full onClick={() => { logout(); navigate("/"); }} />
            </div>
          </Card>

          {/* ── Right: Details ── */}
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

            {/* Contact info */}
            <Card style={{ padding: 22 }}>
              <div style={{ fontWeight: 800, fontSize: 14, marginBottom: 16, color: C.orange }}>
                {lang==="ar" ? "البيانات الشخصية" : "Personal Info"}
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                <div>
                  <div style={{ fontSize: 11, color: C.muted, fontWeight: 700, marginBottom: 5 }}>
                    {lang==="ar" ? "البريد الإلكتروني" : "Email"}
                  </div>
                  <div style={{ fontSize: 12, fontWeight: 600, color: currentUser.email ? "#fff" : C.muted }}>
                    {currentUser.email || (lang==="ar" ? "غير محدد" : "Not set")}
                  </div>
                  <div style={{ fontSize: 10, color: C.muted, marginTop: 6 }}>
                    {lang==="ar" ? "لتغيير البريد، تواصل مع الإدارة أو استخدم إعدادات حساب Google/Firebase." : "To change email, contact support or use your account provider settings."}
                  </div>
                </div>
                {[
                  { label: lang==="ar" ? "رقم الهاتف" : "Phone",  key: "phone", type: "tel"   },
                ].map(({ label, key, type }) => (
                  <div key={key}>
                    <div style={{ fontSize: 11, color: C.muted, fontWeight: 700, marginBottom: 5 }}>{label}</div>
                    {editing ? (
                      <input
                        type={type}
                        value={form[key]}
                        onChange={e => { const v = e.target.value; setForm(p => ({...p, [key]: v})); }}
                        style={{ width: "100%", boxSizing: "border-box", background: "rgba(50,29,61,.6)", border: `1.5px solid ${C.border}`, borderRadius: 10, padding: "9px 12px", color: "#fff", fontFamily: "'Cairo',sans-serif", fontSize: 13, outline: "none" }}
                      />
                    ) : (
                      <div style={{ fontSize: 13, fontWeight: 600, color: form[key] || currentUser[key] ? "#fff" : C.muted }}>
                        {currentUser[key] || (lang==="ar" ? "غير محدد" : "Not set")}
                      </div>
                    )}
                  </div>
                ))}
                <div>
                  <div style={{ fontSize: 11, color: C.muted, fontWeight: 700, marginBottom: 5 }}>
                    {lang==="ar" ? "الدور" : "Role"}
                  </div>
                  <Badge color={role === "admin" ? C.orange : role === "instructor" ? C.purple : C.red}>{roleName}</Badge>
                </div>
                <div>
                  <div style={{ fontSize: 11, color: C.muted, fontWeight: 700, marginBottom: 5 }}>
                    {lang==="ar" ? "حالة الحساب" : "Account Status"}
                  </div>
                  <Badge color={currentUser.status === "approved" ? C.success : C.warning}>
                    {currentUser.status === "approved"
                      ? (lang==="ar" ? "مفعّل" : "Active")
                      : (lang==="ar" ? "قيد المراجعة" : "Pending")}
                  </Badge>
                </div>
              </div>
            </Card>

            {/* Enrolled courses */}
            {role === "student" && (
              <Card style={{ padding: 22 }}>
                <div style={{ fontWeight: 800, fontSize: 14, marginBottom: 16, color: C.orange }}>
                  {lang==="ar" ? "الكورسات المسجل فيها" : "Enrolled Courses"}
                  <Badge color={C.red} style={{ marginRight: 8, marginLeft: 8 }}>{enrolled.length}</Badge>
                </div>

                {enrolled.length === 0 ? (
                  <div style={{ textAlign: "center", color: C.muted, fontSize: 13, padding: "20px 0" }}>
                    {lang==="ar" ? "لم تسجل في أي كورس بعد" : "No courses enrolled yet"}
                  </div>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                    {enrolled.map(({ course, progress, enrollDate, completedLessons }) => (
                      <div key={course.id} style={{ background: "rgba(255,255,255,.05)", borderRadius: 12, padding: "14px 16px" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10, flexWrap: "wrap", gap: 8 }}>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            {course.image
                              ? <img src={course.image} alt={course.title} style={{ width: 40, height: 40, borderRadius: 8, objectFit: "cover", marginBottom: 6 }} />
                              : null
                            }
                            <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 3 }}>{course.title}</div>
                            {enrollDate && (
                              <div style={{ fontSize: 11, color: C.muted }}>
                                {lang==="ar" ? "تاريخ التسجيل:" : "Enrolled:"} {enrollDate}
                              </div>
                            )}
                          </div>
                          <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
                            <Badge color={progress === 100 ? C.success : C.orange}>
                              {progress === 100 ? (lang==="ar" ? "مكتمل" : "Done") : `${progress}%`}
                            </Badge>
                            <Btn children={lang==="ar" ? "متابعة" : "Continue"}
                              sm v="outline"
                              onClick={() => navigate(`/learn/${course.slug}`)} />
                          </div>
                        </div>
                        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                          <PBar value={progress} color={progress === 100 ? C.success : C.orange} h={6} />
                          <span style={{ fontSize: 11, color: C.muted, whiteSpace: "nowrap" }}>
                            {completedLessons?.length || 0} / {course.curriculum?.flatMap(c=>c.lessons).length || 0} {lang==="ar" ? "درس" : "lessons"}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </Card>
            )}

            {/* Instructor: assigned courses */}
            {role === "instructor" && (
              <Card style={{ padding: 22 }}>
                <div style={{ fontWeight: 800, fontSize: 14, marginBottom: 16, color: C.orange }}>
                  {lang==="ar" ? "الكورسات المعينة لك" : "Your Assigned Courses"}
                </div>
                {(currentUser.assignedCourses || []).length === 0 ? (
                  <div style={{ textAlign: "center", color: C.muted, fontSize: 13, padding: "20px 0" }}>
                    {lang==="ar" ? "لا توجد كورسات معينة بعد" : "No courses assigned yet"}
                  </div>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                    {(currentUser.assignedCourses || []).map(cid => {
                      const c = courses.find(x => x.id === cid);
                      return c ? (
                        <div key={cid} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: "rgba(255,255,255,.05)", borderRadius: 10, padding: "10px 14px" }}>
                          <div style={{ fontWeight: 700, fontSize: 13 }}>{c.title}</div>
                          <Badge color={C.purple}>{c.cat}</Badge>
                        </div>
                      ) : null;
                    })}
                  </div>
                )}
              </Card>
            )}

          </div>
        </div>
      </div>
    </div>
  );
}
