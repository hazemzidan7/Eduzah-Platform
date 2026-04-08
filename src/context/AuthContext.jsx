import { createContext, useContext, useState } from "react";
import { INIT_USERS } from "../data";

const AuthCtx = createContext(null);

const stored = () => {
  try { return JSON.parse(localStorage.getItem("eduzah_users") || "null"); } catch { return null; }
};
const persist = (users) => localStorage.setItem("eduzah_users", JSON.stringify(users));

export function AuthProvider({ children }) {
  const [users, setUsers] = useState(() => stored() || INIT_USERS);
  const [currentUser, setCU] = useState(() => {
    try { return JSON.parse(sessionStorage.getItem("eduzah_cu") || "null"); } catch { return null; }
  });

  const saveUsers = (list) => { setUsers(list); persist(list); };
  const saveCU    = (u)    => { setCU(u); u ? sessionStorage.setItem("eduzah_cu", JSON.stringify(u)) : sessionStorage.removeItem("eduzah_cu"); };

  // ── Register ──────────────────────────────────────────
  const register = (d) => {
    if (users.find(u => u.email.toLowerCase() === d.email.trim().toLowerCase()))
      return { ok: false, code: "EMAIL_EXISTS" };
    const newUser = {
      id: `u-${Date.now()}`,
      name:   d.name,
      email:  d.email.trim().toLowerCase(),
      password: d.pass,
      role:   d.role || "student",
      status: "pending",
      avatar: d.name[0].toUpperCase(),
      phone:  d.phone || "",
      enrolledCourses: [],
      assignedCourses: [],
      createdAt: new Date().toISOString(),
    };
    saveUsers([...users, newUser]);
    return { ok: true };
  };

  // ── Login ─────────────────────────────────────────────
  const login = (email, pass) => {
    const u = users.find(
      x => x.email.toLowerCase() === email.trim().toLowerCase() && x.password === pass
    );
    if (!u)                    return { ok: false, code: "BAD_CREDENTIALS" };
    if (u.status === "pending")  return { ok: false, code: "PENDING" };
    if (u.status === "rejected") return { ok: false, code: "REJECTED" };
    saveCU(u);
    return { ok: true, role: u.role };
  };

  // ── Logout ────────────────────────────────────────────
  const logout = () => saveCU(null);

  // ── Admin: fetch users (already in state) ─────────────
  const fetchUsers = () => Promise.resolve(users);

  // ── Admin: approve / reject ───────────────────────────
  const approveUser = (id) => saveUsers(users.map(u => u.id === id ? { ...u, status: "approved" } : u));
  const rejectUser  = (id) => saveUsers(users.map(u => u.id === id ? { ...u, status: "rejected" } : u));

  // ── Admin: edit user ──────────────────────────────────
  const adminUpdateUser = (id, patch) => {
    const clean = {
      ...(patch.name  != null && { name:  String(patch.name).trim()  }),
      ...(patch.email != null && { email: String(patch.email).trim() }),
      ...(patch.phone != null && { phone: String(patch.phone).trim() }),
    };
    saveUsers(users.map(u => u.id === id ? { ...u, ...clean } : u));
    if (currentUser?.id === id) saveCU({ ...currentUser, ...clean });
  };

  // ── Enroll student ────────────────────────────────────
  const enrollUser = (uid, cid) => {
    const updated = users.map(u => {
      if (u.id !== uid) return u;
      if ((u.enrolledCourses || []).find(e => e.courseId === cid)) return u;
      return { ...u, enrolledCourses: [...(u.enrolledCourses || []), { courseId: cid, progress: 0, completedLessons: [], enrollDate: new Date().toLocaleDateString("ar-EG") }] };
    });
    saveUsers(updated);
    if (currentUser?.id === uid) saveCU(updated.find(u => u.id === uid));
  };

  const removeEnroll = (uid, cid) => {
    const updated = users.map(u => u.id !== uid ? u : { ...u, enrolledCourses: (u.enrolledCourses || []).filter(e => e.courseId !== cid) });
    saveUsers(updated);
    if (currentUser?.id === uid) saveCU(updated.find(u => u.id === uid));
  };

  // ── Assign instructor ─────────────────────────────────
  const assignInstructor = (uid, cid) => {
    saveUsers(users.map(u => u.id !== uid ? u : { ...u, assignedCourses: [...new Set([...(u.assignedCourses || []), cid])] }));
  };

  // ── Update own profile ────────────────────────────────
  const updateProfile = (updates) => {
    if (!currentUser) return;
    saveUsers(users.map(u => u.id === currentUser.id ? { ...u, ...updates } : u));
    saveCU({ ...currentUser, ...updates });
  };

  // ── Mark lesson complete ──────────────────────────────
  const markLesson = (cid, idx, total) => {
    if (!currentUser) return;
    const ec = (currentUser.enrolledCourses || []).map(e => {
      if (e.courseId !== cid) return e;
      const done = e.completedLessons.includes(idx) ? e.completedLessons : [...e.completedLessons, idx];
      return { ...e, completedLessons: done, progress: Math.round((done.length / total) * 100) };
    });
    updateProfile({ enrolledCourses: ec });
  };

  // ── Password reset (local — just log) ────────────────
  const requestPasswordReset = (email) => {
    console.log("Password reset requested for:", email);
    return Promise.resolve({ ok: true });
  };

  const changePassword = (newPassword) => {
    if (!currentUser) return Promise.resolve({ ok: false });
    saveUsers(users.map(u => u.id === currentUser.id ? { ...u, password: newPassword } : u));
    return Promise.resolve({ ok: true });
  };

  return (
    <AuthCtx.Provider value={{
      users, currentUser, loading: false,
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
