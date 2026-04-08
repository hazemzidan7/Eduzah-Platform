import { createContext, useContext, useState, useEffect } from "react";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  sendPasswordResetEmail,
  updatePassword,
} from "firebase/auth";
import {
  doc,
  setDoc,
  getDoc,
  updateDoc,
  collection,
  getDocs,
} from "firebase/firestore";
import { auth, db } from "../firebase";

const AuthCtx = createContext(null);

export function AuthProvider({ children }) {
  const [currentUser, setCU] = useState(null);
  const [users, setUsers]    = useState([]);
  const [loading, setLoading] = useState(true);

  // ── Listen to Firebase auth state ────────────────────
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        const snap = await getDoc(doc(db, "users", firebaseUser.uid));
        if (snap.exists()) {
          setCU({ id: firebaseUser.uid, ...snap.data() });
        }
      } else {
        setCU(null);
      }
      setLoading(false);
    });
    return unsub;
  }, []);

  // ── Fetch all users (admin only) ─────────────────────
  const fetchUsers = async () => {
    const snap = await getDocs(collection(db, "users"));
    const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    setUsers(list);
    return list;
  };

  // ── Register ─────────────────────────────────────────
  const register = async (d) => {
    try {
      const cred = await createUserWithEmailAndPassword(
        auth,
        d.email.trim(),
        d.pass
      );
      const uid = cred.user.uid;
      const userData = {
        name: d.name,
        email: d.email.trim().toLowerCase(),
        role: d.role || "student",
        status: "pending",
        avatar: d.name[0].toUpperCase(),
        phone: d.phone || "",
        enrolledCourses: [],
        assignedCourses: [],
        createdAt: new Date().toISOString(),
      };
      await setDoc(doc(db, "users", uid), userData);
      // Sign out immediately — admin must approve first
      await signOut(auth);
      return { ok: true };
    } catch (err) {
      if (err.code === "auth/email-already-in-use")
        return { ok: false, code: "EMAIL_EXISTS" };
      return { ok: false, code: err.message };
    }
  };

  // ── Login ─────────────────────────────────────────────
  const login = async (email, pass) => {
    try {
      const cred = await signInWithEmailAndPassword(auth, email.trim(), pass);
      const snap = await getDoc(doc(db, "users", cred.user.uid));
      if (!snap.exists()) return { ok: false, code: "BAD_CREDENTIALS" };
      const u = snap.data();
      if (u.status === "pending")  { await signOut(auth); return { ok: false, code: "PENDING" }; }
      if (u.status === "rejected") { await signOut(auth); return { ok: false, code: "REJECTED" }; }
      setCU({ id: cred.user.uid, ...u });
      return { ok: true, role: u.role };
    } catch {
      return { ok: false, code: "BAD_CREDENTIALS" };
    }
  };

  // ── Logout ────────────────────────────────────────────
  const logout = () => signOut(auth).then(() => setCU(null));

  // ── Admin: approve / reject user ─────────────────────
  const approveUser = async (id) => {
    await updateDoc(doc(db, "users", id), { status: "approved" });
    setUsers((p) => p.map((u) => (u.id === id ? { ...u, status: "approved" } : u)));
  };

  const rejectUser = async (id) => {
    await updateDoc(doc(db, "users", id), { status: "rejected" });
    setUsers((p) => p.map((u) => (u.id === id ? { ...u, status: "rejected" } : u)));
  };

  // ── Admin: edit user ──────────────────────────────────
  const adminUpdateUser = async (id, patch) => {
    const clean = {
      ...(patch.name  != null && { name:  String(patch.name).trim()  }),
      ...(patch.email != null && { email: String(patch.email).trim() }),
      ...(patch.phone != null && { phone: String(patch.phone).trim() }),
    };
    await updateDoc(doc(db, "users", id), clean);
    setUsers((p) => p.map((u) => (u.id === id ? { ...u, ...clean } : u)));
    if (currentUser?.id === id) setCU((prev) => ({ ...prev, ...clean }));
  };

  // ── Enroll student in course ──────────────────────────
  const enrollUser = async (uid, cid) => {
    const snap = await getDoc(doc(db, "users", uid));
    if (!snap.exists()) return;
    const u = snap.data();
    const already = (u.enrolledCourses || []).find((e) => e.courseId === cid);
    if (already) return;
    const updated = [
      ...(u.enrolledCourses || []),
      {
        courseId: cid,
        progress: 0,
        completedLessons: [],
        enrollDate: new Date().toLocaleDateString("ar-EG"),
      },
    ];
    await updateDoc(doc(db, "users", uid), { enrolledCourses: updated });
    if (currentUser?.id === uid) setCU((prev) => ({ ...prev, enrolledCourses: updated }));
    setUsers((p) => p.map((u) => (u.id === uid ? { ...u, enrolledCourses: updated } : u)));
  };

  const removeEnroll = async (uid, cid) => {
    const snap = await getDoc(doc(db, "users", uid));
    if (!snap.exists()) return;
    const u = snap.data();
    const updated = (u.enrolledCourses || []).filter((e) => e.courseId !== cid);
    await updateDoc(doc(db, "users", uid), { enrolledCourses: updated });
    if (currentUser?.id === uid) setCU((prev) => ({ ...prev, enrolledCourses: updated }));
    setUsers((p) => p.map((u) => (u.id === uid ? { ...u, enrolledCourses: updated } : u)));
  };

  // ── Assign instructor to course ───────────────────────
  const assignInstructor = async (uid, cid) => {
    const snap = await getDoc(doc(db, "users", uid));
    if (!snap.exists()) return;
    const u = snap.data();
    const assigned = [...new Set([...(u.assignedCourses || []), cid])];
    await updateDoc(doc(db, "users", uid), { assignedCourses: assigned });
    setUsers((p) => p.map((u) => (u.id === uid ? { ...u, assignedCourses: assigned } : u)));
  };

  // ── Update own profile ────────────────────────────────
  const updateProfile = async (updates) => {
    if (!currentUser) return;
    await updateDoc(doc(db, "users", currentUser.id), updates);
    setCU((prev) => ({ ...prev, ...updates }));
  };

  // ── Mark lesson complete ──────────────────────────────
  const markLesson = async (cid, idx, total) => {
    if (!currentUser) return;
    const snap = await getDoc(doc(db, "users", currentUser.id));
    if (!snap.exists()) return;
    const u = snap.data();
    const ec = (u.enrolledCourses || []).map((e) => {
      if (e.courseId !== cid) return e;
      const done = e.completedLessons.includes(idx)
        ? e.completedLessons
        : [...e.completedLessons, idx];
      return { ...e, completedLessons: done, progress: Math.round((done.length / total) * 100) };
    });
    await updateDoc(doc(db, "users", currentUser.id), { enrolledCourses: ec });
    setCU((prev) => ({ ...prev, enrolledCourses: ec }));
  };

  // ── Password Reset via Firebase email ─────────────────
  const requestPasswordReset = async (email) => {
    try {
      await sendPasswordResetEmail(auth, email.trim());
      return { ok: true };
    } catch {
      // Always ok so we don't leak whether email exists
      return { ok: true };
    }
  };

  // ── Change password (logged-in user) ─────────────────
  const changePassword = async (newPassword) => {
    try {
      await updatePassword(auth.currentUser, newPassword);
      return { ok: true };
    } catch (err) {
      return { ok: false, code: err.message };
    }
  };

  if (loading) return null;

  return (
    <AuthCtx.Provider
      value={{
        users,
        currentUser,
        loading,
        fetchUsers,
        login,
        logout,
        register,
        approveUser,
        rejectUser,
        enrollUser,
        removeEnroll,
        assignInstructor,
        markLesson,
        updateProfile,
        adminUpdateUser,
        requestPasswordReset,
        changePassword,
      }}
    >
      {children}
    </AuthCtx.Provider>
  );
}

export const useAuth = () => useContext(AuthCtx);
