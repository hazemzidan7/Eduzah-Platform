import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
} from "firebase/auth";
import { doc, setDoc, getDoc, deleteDoc } from "firebase/firestore";
import { auth, db } from "../../firebase";
import { courseIdsFromEnrolled } from "../../utils/enrollment";
import { C, gHero, font } from "../../theme";
import { Btn } from "../../components/UI";

// Seed accounts — same as old INIT_USERS
const SEED_USERS = [
  { name: "Admin Eduzah",   email: "admin@eduzah.com",  pass: "admin123", role: "admin",      status: "approved", avatar: "A", enrolledCourses: [], assignedCourses: [] },
  { name: "م. خالد حسن",   email: "khalid@test.com",   pass: "123456",   role: "instructor", status: "approved", avatar: "خ", enrolledCourses: [], assignedCourses: ["front-end","ai-ml"] },
  { name: "م. منى أحمد",   email: "mona@test.com",     pass: "123456",   role: "instructor", status: "approved", avatar: "م", enrolledCourses: [], assignedCourses: ["mobile-dev","ui-ux"] },
  { name: "أحمد محمد",     email: "ahmed@test.com",    pass: "123456",   role: "student",    status: "approved", avatar: "أ", enrolledCourses: [{courseId:"front-end",progress:65,completedLessons:[0,1,2,3]},{courseId:"ai-ml",progress:30,completedLessons:[0,1]}], assignedCourses: [] },
  { name: "سارة علي",      email: "sara@test.com",     pass: "123456",   role: "student",    status: "pending",  avatar: "س", enrolledCourses: [], assignedCourses: [] },
];

export default function DevSeed() {
  const navigate  = useNavigate();
  const [log,     setLog]     = useState([]);
  const [running, setRunning] = useState(false);
  const [done,    setDone]    = useState(false);

  const addLog = (msg, ok = true) =>
    setLog(p => [...p, { msg, ok, t: new Date().toLocaleTimeString() }]);

  const seedUser = async (u) => {
    // 1. Try creating in Firebase Auth
    let uid;
    try {
      const cred = await createUserWithEmailAndPassword(auth, u.email, u.pass);
      uid = cred.user.uid;
      addLog(`✓ Created Firebase Auth: ${u.email}`);
    } catch (err) {
      if (err.code === "auth/email-already-in-use") {
        try {
          const cred = await signInWithEmailAndPassword(auth, u.email, u.pass);
          uid = cred.user.uid;
          addLog(`ℹ Already exists in Auth: ${u.email}`);
        } catch {
          addLog(`✗ Cannot get UID for ${u.email} (wrong password?)`, false);
          return;
        }
      } else {
        addLog(`✗ Auth error for ${u.email}: ${err.message}`, false);
        return;
      }
    }

    // 2. Write Firestore profile WHILE still signed in
    const ref  = doc(db, "users", uid);
    const snap = await getDoc(ref);
    if (snap.exists()) {
      addLog(`ℹ Firestore profile already exists: ${u.email}`);
    } else {
      const ec = u.enrolledCourses || [];
      await setDoc(ref, {
        name:              u.name,
        email:             u.email.toLowerCase(),
        role:              u.role,
        status:            u.status,
        avatar:            u.avatar,
        phone:             "",
        enrolledCourses:   ec,
        enrolledCourseIds: courseIdsFromEnrolled(ec),
        assignedCourses:   u.assignedCourses || [],
        createdAt:         new Date().toISOString(),
      });
      addLog(`✓ Firestore profile created: ${u.email}`);
    }

    // 3. Sign out after writing
    await signOut(auth);
  };

  const run = async () => {
    setRunning(true);
    setLog([]);
    addLog("بدء الـ seed...");
    try {
      // Check bootstrap flag
      const bsSnap = await getDoc(doc(db, "settings", "bootstrap"));
      if (!bsSnap.exists() || bsSnap.data().enabled !== true) {
        addLog("✗ settings/bootstrap.enabled != true — أنشئ المستند أولاً في Firebase Console", false);
        setRunning(false);
        return;
      }

      for (const u of SEED_USERS) {
        await seedUser(u);
      }

      // Delete bootstrap flag
      try {
        await deleteDoc(doc(db, "settings", "bootstrap"));
        addLog("✓ تم حذف settings/bootstrap");
      } catch {
        addLog("⚠ تعذر حذف settings/bootstrap — احذفه يدوياً من Console");
      }

      addLog("✓ الـ Seed اكتمل! سجّل دخول بـ admin@eduzah.com / admin123");
      setDone(true);
    } catch (err) {
      addLog(`✗ خطأ عام: ${err.message}`, false);
    }
    setRunning(false);
  };

  return (
    <div dir="rtl" style={{ minHeight: "calc(100vh - 60px)", background: gHero, display: "flex", alignItems: "center", justifyContent: "center", padding: "40px 16px" }}>
      <div style={{ background: "rgba(50,29,61,.95)", border: `1px solid ${C.border}`, borderRadius: 22, padding: 28, width: "100%", maxWidth: 560 }}>

        <h1 style={{ fontFamily: font, fontSize: 20, marginBottom: 4 }}>Dev Seed — إنشاء الحسابات التجريبية</h1>
        <p style={{ color: C.muted, fontSize: 12, marginBottom: 16, lineHeight: 1.7 }}>
          بتنشئ الحسابات دي في Firebase Auth + Firestore:<br />
          <span style={{ color: C.orange }}>admin@eduzah.com / admin123</span> · khalid@test.com / mona@test.com / ahmed@test.com / sara@test.com (كلهم 123456)
        </p>

        <div style={{ background: "rgba(255,165,0,.08)", border: `1px solid ${C.orange}44`, borderRadius: 10, padding: "10px 14px", marginBottom: 16, fontSize: 12, color: C.orange, lineHeight: 1.7 }}>
          قبل تشغيل الـ Seed:<br />
          Firebase Console → Firestore → أنشئ collection <b>settings</b> → document <b>bootstrap</b> → field <b>enabled = true (boolean)</b>
        </div>

        {!done && (
          <Btn
            children={running ? "جاري الـ Seed..." : "▶ تشغيل الـ Seed"}
            full
            onClick={run}
            disabled={running}
            style={{ marginBottom: 16 }}
          />
        )}

        {log.length > 0 && (
          <div style={{ background: "#0d0a14", borderRadius: 10, padding: "12px 14px", fontSize: 11, fontFamily: "monospace", maxHeight: 280, overflowY: "auto" }}>
            {log.map((l, i) => (
              <div key={i} style={{ color: l.ok ? "#86efac" : "#fca5a5", marginBottom: 3 }}>
                <span style={{ color: "#6b7280", marginLeft: 8 }}>{l.t}</span> {l.msg}
              </div>
            ))}
          </div>
        )}

        {done && (
          <Btn children="← الذهاب لتسجيل الدخول" full v="outline" onClick={() => navigate("/login")} style={{ marginTop: 14 }} />
        )}

        {!done && (
          <button onClick={() => navigate("/login")} style={{ marginTop: 12, background: "none", border: "none", color: C.muted, cursor: "pointer", fontSize: 12, display: "block" }}>
            ← تسجيل الدخول
          </button>
        )}
      </div>
    </div>
  );
}
