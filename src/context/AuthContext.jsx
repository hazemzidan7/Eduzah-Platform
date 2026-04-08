import { createContext, useContext, useState, useEffect } from "react";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  updatePassword,
  sendPasswordResetEmail,
} from "firebase/auth";
import {
  doc, setDoc, getDoc, updateDoc, collection, getDocs, query, where,
} from "firebase/firestore";
import { auth, db } from "../firebase";
import { courseIdsFromEnrolled } from "../utils/enrollment";

const AuthCtx = createContext(null);

export { courseIdsFromEnrolled };

export function AuthProvider({ children }) {
  const [currentUser, setCU]  = useState(null);
  const [users,       setUsers] = useState([]);
  const [loading,   setLoading] = useState(true);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (firebaseUser) => {
      try {
        if (firebaseUser) {
          const snap = await getDoc(doc(db, "users", firebaseUser.uid));
          if (snap.exists()) {
            const data = snap.data();
            setCU({ id: firebaseUser.uid, ...data });
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
  }, []);

  /* One-time backfill of enrolledCourseIds for profiles created before this field existed. */
  useEffect(() => {
    if (!currentUser?.id) return;
    const ec = currentUser.enrolledCourses;
    if (!ec?.length || (currentUser.enrolledCourseIds && currentUser.enrolledCourseIds.length > 0)) return;
    const ids = courseIdsFromEnrolled(ec);
    if (ids.length) updateDoc(doc(db, "users", currentUser.id), { enrolledCourseIds: ids }).catch(() => {});
  }, [currentUser?.id, currentUser?.enrolledCourses, currentUser?.enrolledCourseIds]);

  /* Load directory users for admin (all) or instructor (students only). */
  useEffect(() => {
    if (!currentUser) {
      setUsers([]);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        if (currentUser.role === "admin") {
          const snap = await getDocs(collection(db, "users"));
          if (!cancelled) setUsers(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
        } else if (currentUser.role === "instructor") {
          const q = query(collection(db, "users"), where("role", "==", "student"));
          const snap = await getDocs(q);
          if (!cancelled) setUsers(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
        } else {
          setUsers([]);
        }
      } catch (e) {
        console.error("Users list load failed:", e);
        if (!cancelled) setUsers([]);
      }
    })();
    return () => { cancelled = true; };
  }, [currentUser?.id, currentUser?.role]);

  const fetchUsers = async () => {
    const snap = await getDocs(collection(db, "users"));
    const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    setUsers(list);
    return list;
  };

  /** New accounts are always students; instructors are promoted by an admin. */
  const register = async (d) => {
    try {
      const cred = await createUserWithEmailAndPassword(auth, d.email.trim(), d.pass);
      const enrolledCourses = [];
      await setDoc(doc(db, "users", cred.user.uid), {
        name: d.name,
        email: d.email.trim().toLowerCase(),
        role: "student",
        status: "pending",
        avatar: d.name[0].toUpperCase(),
        phone: d.phone || "",
        enrolledCourses,
        enrolledCourseIds: courseIdsFromEnrolled(enrolledCourses),
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

  const logout = () => signOut(auth).then(() => setCU(null));

  const approveUser = async (id) => {
    await updateDoc(doc(db, "users", id), { status: "approved" });
    setUsers((p) => p.map((u) => (u.id === id ? { ...u, status: "approved" } : u)));
  };
  const rejectUser = async (id) => {
    await updateDoc(doc(db, "users", id), { status: "rejected" });
    setUsers((p) => p.map((u) => (u.id === id ? { ...u, status: "rejected" } : u)));
  };

  const adminUpdateUser = async (id, patch) => {
    const clean = {
      ...(patch.name  != null && { name:  String(patch.name).trim()  }),
      ...(patch.email != null && { email: String(patch.email).trim().toLowerCase() }),
      ...(patch.phone != null && { phone: String(patch.phone).trim() }),
      ...(patch.role != null && ["student", "instructor"].includes(patch.role) && { role: patch.role }),
    };
    await updateDoc(doc(db, "users", id), clean);
    setUsers((p) => p.map((u) => (u.id === id ? { ...u, ...clean } : u)));
    if (currentUser?.id === id) setCU((prev) => ({ ...prev, ...clean }));
  };

  const enrollUser = async (uid, cid) => {
    const snap = await getDoc(doc(db, "users", uid));
    if (!snap.exists()) return;
    const u = snap.data();
    if ((u.enrolledCourses || []).find((e) => e.courseId === cid)) return;
    const updated = [...(u.enrolledCourses || []), {
      courseId: cid, progress: 0, completedLessons: [],
      enrollDate: new Date().toLocaleDateString("ar-EG"),
    }];
    const enrolledCourseIds = courseIdsFromEnrolled(updated);
    await updateDoc(doc(db, "users", uid), { enrolledCourses: updated, enrolledCourseIds });
    setUsers((p) => p.map((u) => (u.id === uid ? { ...u, enrolledCourses: updated, enrolledCourseIds } : u)));
    if (currentUser?.id === uid) setCU((prev) => ({ ...prev, enrolledCourses: updated, enrolledCourseIds }));
  };

  const removeEnroll = async (uid, cid) => {
    const snap = await getDoc(doc(db, "users", uid));
    if (!snap.exists()) return;
    const updated = (snap.data().enrolledCourses || []).filter((e) => e.courseId !== cid);
    const enrolledCourseIds = courseIdsFromEnrolled(updated);
    await updateDoc(doc(db, "users", uid), { enrolledCourses: updated, enrolledCourseIds });
    setUsers((p) => p.map((u) => (u.id === uid ? { ...u, enrolledCourses: updated, enrolledCourseIds } : u)));
    if (currentUser?.id === uid) setCU((prev) => ({ ...prev, enrolledCourses: updated, enrolledCourseIds }));
  };

  const assignInstructor = async (uid, cid) => {
    const snap = await getDoc(doc(db, "users", uid));
    if (!snap.exists()) return;
    const assigned = [...new Set([...(snap.data().assignedCourses || []), cid])];
    await updateDoc(doc(db, "users", uid), { assignedCourses: assigned });
    setUsers((p) => p.map((u) => (u.id === uid ? { ...u, assignedCourses: assigned } : u)));
  };

  const updateProfile = async (updates) => {
    if (!currentUser) return;
    const allowed = ["name", "phone", "avatar", "avatarImg"];
    const patch = {};
    for (const k of allowed) {
      if (Object.prototype.hasOwnProperty.call(updates, k)) patch[k] = updates[k];
    }
    if (Object.keys(patch).length === 0) return;
    await updateDoc(doc(db, "users", currentUser.id), patch);
    setCU((prev) => ({ ...prev, ...patch }));
  };

  const markLesson = async (cid, idx, total) => {
    if (!currentUser) return;
    const snap = await getDoc(doc(db, "users", currentUser.id));
    if (!snap.exists()) return;
    const ec = (snap.data().enrolledCourses || []).map((e) => {
      if (e.courseId !== cid) return e;
      const done = e.completedLessons.includes(idx) ? e.completedLessons : [...e.completedLessons, idx];
      return { ...e, completedLessons: done, progress: Math.round((done.length / total) * 100) };
    });
    const enrolledCourseIds = courseIdsFromEnrolled(ec);
    await updateDoc(doc(db, "users", currentUser.id), { enrolledCourses: ec, enrolledCourseIds });
    setCU((prev) => ({ ...prev, enrolledCourses: ec, enrolledCourseIds }));
  };

  const requestPasswordReset = async (email) => {
    try {
      await sendPasswordResetEmail(auth, email.trim());
      return { ok: true };
    } catch (err) {
      if (err.code === "auth/user-not-found") return { ok: true };
      return { ok: false, code: err.code || "unknown" };
    }
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
