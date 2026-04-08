import { createContext, useContext, useState, useEffect } from "react";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  updatePassword,
} from "firebase/auth";
import {
  doc, setDoc, getDoc, updateDoc, collection, getDocs,
} from "firebase/firestore";
import { auth, db } from "../firebase";

const AuthCtx = createContext(null);

// ── Seed admin account once on first run ──────────────
async function seedAdminIfNeeded() {
  try {
    // Try signing in — if it works, admin already exists, sign back out
    await signInWithEmailAndPassword(auth, "admin@eduzah.com", "admin123");
    await signOut(auth);
  } catch (err) {
    if (err.code === "auth/user-not-found" || err.code === "auth/invalid-credential") {
      // Admin doesn't exist — create them
      try {
        const cred = await createUserWithEmailAndPassword(auth, "admin@eduzah.com", "admin123");
        await setDoc(doc(db, "users", cred.user.uid), {
          name: "Admin Eduzah",
          email: "admin@eduzah.com",
          role: "admin",
          status: "approved",
          avatar: "A",
          phone: "",
          enrolledCourses: [],
          assignedCourses: [],
          createdAt: new Date().toISOString(),
        });
        await signOut(auth);
        console.log("Admin account created successfully");
      } catch (createErr) {
        console.error("Failed to create admin:", createErr.message);
      }
    }
    // any other error (wrong-password etc.) = account exists with different pw, skip
  }
}

export function AuthProvider({ children }) {
  const [currentUser, setCU]  = useState(null);
  const [users,       setUsers] = useState([]);
  const [loading,   setLoading] = useState(true);

  // ── Seed admin + listen to auth state ────────────────
  useEffect(() => {
    // Seed admin on first load before subscribing
    seedAdminIfNeeded().finally(() => {
      const unsub = onAuthStateChanged(auth, async (firebaseUser) => {
        try {
          if (firebaseUser) {
            const snap = await getDoc(doc(db, "users", firebaseUser.uid));
            if (snap.exists()) {
              setCU({ id: firebaseUser.uid, ...snap.data() });
            } else {
              await signOut(auth);
              setCU(null);
            }
          } else {
            setCU(null);
          }
        } catch (err) {
          console.error("Auth state error:", err);
          setCU(null);
        } finally {
          setLoading(false);
        }
      });
      return unsub;
    });
  }, []);

  // ── Fetch all users (admin) ───────────────────────────
  const fetchUsers = async () => {
    const snap = await getDocs(collection(db, "users"));
    const list = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    setUsers(list);
    return list;
  };

  // ── Register ──────────────────────────────────────────
  const register = async (d) => {
    try {
      const cred = await createUserWithEmailAndPassword(auth, d.email.trim(), d.pass);
      await setDoc(doc(db, "users", cred.user.uid), {
        name: d.name,
        email: d.email.trim().toLowerCase(),
        role: d.role || "student",
        status: "pending",
        avatar: d.name[0].toUpperCase(),
        phone: d.phone || "",
        enrolledCourses: [],
        assignedCourses: [],
        createdAt: new Date().toISOString(),
      });
      await signOut(auth);
      return { ok: true };
    } catch (err) {
      if (err.code === "auth/email-already-in-use") return { ok: false, code: "EMAIL_EXISTS" };
      return { ok: false, code: err.message };
    }
  };

  // ── Login ─────────────────────────────────────────────
  const login = async (email, pass) => {
    try {
      const cred = await signInWithEmailAndPassword(auth, email.trim(), pass);
      const snap = await getDoc(doc(db, "users", cred.user.uid));
      if (!snap.exists()) { await signOut(auth); return { ok: false, code: "NO_PROFILE" }; }
      const u = snap.data();
      if (u.status === "pending")  { await signOut(auth); return { ok: false, code: "PENDING" }; }
      if (u.status === "rejected") { await signOut(auth); return { ok: false, code: "REJECTED" }; }
      setCU({ id: cred.user.uid, ...u });
      return { ok: true, role: u.role };
    } catch (err) {
      if (["auth/invalid-credential","auth/wrong-password","auth/user-not-found"].includes(err.code))
        return { ok: false, code: "BAD_CREDENTIALS" };
      return { ok: false, code: "FIREBASE_ERROR", msg: err.message };
    }
  };

  // ── Logout ────────────────────────────────────────────
  const logout = () => signOut(auth).then(() => setCU(null));

  // ── Admin: approve / reject ───────────────────────────
  const approveUser = async (id) => {
    await updateDoc(doc(db, "users", id), { status: "approved" });
    setUsers(p => p.map(u => u.id === id ? { ...u, status: "approved" } : u));
  };
  const rejectUser = async (id) => {
    await updateDoc(doc(db, "users", id), { status: "rejected" });
    setUsers(p => p.map(u => u.id === id ? { ...u, status: "rejected" } : u));
  };

  // ── Admin: edit user ──────────────────────────────────
  const adminUpdateUser = async (id, patch) => {
    const clean = {
      ...(patch.name  != null && { name:  String(patch.name).trim()  }),
      ...(patch.email != null && { email: String(patch.email).trim() }),
      ...(patch.phone != null && { phone: String(patch.phone).trim() }),
    };
    await updateDoc(doc(db, "users", id), clean);
    setUsers(p => p.map(u => u.id === id ? { ...u, ...clean } : u));
    if (currentUser?.id === id) setCU(prev => ({ ...prev, ...clean }));
  };

  // ── Enroll / remove enrollment ────────────────────────
  const enrollUser = async (uid, cid) => {
    const snap = await getDoc(doc(db, "users", uid));
    if (!snap.exists()) return;
    const u = snap.data();
    if ((u.enrolledCourses || []).find(e => e.courseId === cid)) return;
    const updated = [...(u.enrolledCourses || []), {
      courseId: cid, progress: 0, completedLessons: [],
      enrollDate: new Date().toLocaleDateString("ar-EG"),
    }];
    await updateDoc(doc(db, "users", uid), { enrolledCourses: updated });
    setUsers(p => p.map(u => u.id === uid ? { ...u, enrolledCourses: updated } : u));
    if (currentUser?.id === uid) setCU(prev => ({ ...prev, enrolledCourses: updated }));
  };

  const removeEnroll = async (uid, cid) => {
    const snap = await getDoc(doc(db, "users", uid));
    if (!snap.exists()) return;
    const updated = (snap.data().enrolledCourses || []).filter(e => e.courseId !== cid);
    await updateDoc(doc(db, "users", uid), { enrolledCourses: updated });
    setUsers(p => p.map(u => u.id === uid ? { ...u, enrolledCourses: updated } : u));
    if (currentUser?.id === uid) setCU(prev => ({ ...prev, enrolledCourses: updated }));
  };

  // ── Assign instructor ─────────────────────────────────
  const assignInstructor = async (uid, cid) => {
    const snap = await getDoc(doc(db, "users", uid));
    if (!snap.exists()) return;
    const assigned = [...new Set([...(snap.data().assignedCourses || []), cid])];
    await updateDoc(doc(db, "users", uid), { assignedCourses: assigned });
    setUsers(p => p.map(u => u.id === uid ? { ...u, assignedCourses: assigned } : u));
  };

  // ── Update own profile ────────────────────────────────
  const updateProfile = async (updates) => {
    if (!currentUser) return;
    await updateDoc(doc(db, "users", currentUser.id), updates);
    setCU(prev => ({ ...prev, ...updates }));
  };

  // ── Mark lesson complete ──────────────────────────────
  const markLesson = async (cid, idx, total) => {
    if (!currentUser) return;
    const snap = await getDoc(doc(db, "users", currentUser.id));
    if (!snap.exists()) return;
    const ec = (snap.data().enrolledCourses || []).map(e => {
      if (e.courseId !== cid) return e;
      const done = e.completedLessons.includes(idx) ? e.completedLessons : [...e.completedLessons, idx];
      return { ...e, completedLessons: done, progress: Math.round((done.length / total) * 100) };
    });
    await updateDoc(doc(db, "users", currentUser.id), { enrolledCourses: ec });
    setCU(prev => ({ ...prev, enrolledCourses: ec }));
  };

  // ── Password reset ────────────────────────────────────
  const requestPasswordReset = async (email) => {
    try {
      const { sendPasswordResetEmail } = await import("firebase/auth");
      await sendPasswordResetEmail(auth, email.trim());
    } catch {}
    return { ok: true };
  };

  const changePassword = async (newPassword) => {
    try {
      await updatePassword(auth.currentUser, newPassword);
      return { ok: true };
    } catch (err) {
      return { ok: false, code: err.message };
    }
  };

  if (loading) return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#1a0f24" }}>
      <div style={{ width: 36, height: 36, border: "3px solid rgba(217,27,91,.3)", borderTopColor: "#d91b5b", borderRadius: "50%", animation: "spin 0.7s linear infinite" }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );

  return (
    <AuthCtx.Provider value={{
      users, currentUser, loading,
      fetchUsers, login, logout, register,
      approveUser, rejectUser, enrollUser, removeEnroll,
      assignInstructor, markLesson, updateProfile, adminUpdateUser,
      requestPasswordReset, changePassword,
    }}>
      {children}
    </AuthCtx.Provider>
  );
}

export const useAuth = () => useContext(AuthCtx);
