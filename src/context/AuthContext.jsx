import { createContext, useContext, useState } from "react";
import { INIT_USERS } from "../data";
import { createResetToken, getValidResetEmail, invalidateResetToken } from "../utils/passwordReset";

const AuthCtx = createContext(null);

export function AuthProvider({ children }) {
  const [users, setUsers]    = useState(INIT_USERS);
  const [currentUser, setCU] = useState(null);

  const freshMe = () => currentUser ? users.find(u => u.id === currentUser.id) || currentUser : null;

  const login = (email, pass) => {
    const norm = email.trim().toLowerCase();
    const u = users.find(x => x.email.toLowerCase() === norm && x.password === pass);
    if (!u)                    return { ok:false, code:"BAD_CREDENTIALS" };
    if (u.status==="pending")  return { ok:false, code:"PENDING" };
    if (u.status==="rejected") return { ok:false, code:"REJECTED" };
    setCU(u); return { ok:true, role:u.role };
  };

  const logout   = () => setCU(null);

  const register = (d) => {
    const norm = d.email.trim().toLowerCase();
    if (users.find(u => u.email.toLowerCase() === norm))
      return { ok:false, code:"EMAIL_EXISTS" };
    const nu = {
      id:`u${Date.now()}`,
      name:d.name,
      email:d.email.trim(),
      password:d.pass,
      role:d.role,
      status:"pending",
      avatar:d.name[0].toUpperCase(),
      phone:d.phone||"",
      enrolledCourses:[],
      assignedCourses:[],
    };
    setUsers(p => [...p, nu]);
    return { ok:true };
  };

  /** Admin edits another user (name, email, phone). */
  const adminUpdateUser = (id, patch) => {
    const merge = (u) => {
      if (u.id !== id) return u;
      return {
        ...u,
        ...patch,
        email: patch.email != null ? String(patch.email).trim() : u.email,
        phone: patch.phone != null ? String(patch.phone).trim() : u.phone,
        name: patch.name != null ? String(patch.name).trim() : u.name,
      };
    };
    setUsers(p => p.map(merge));
    setCU(cu => (cu && cu.id === id ? merge(cu) : cu));
  };

  /** Demo reset: returns token for same-origin reset link (no email server). */
  const requestPasswordReset = (email) => {
    const norm = email.trim().toLowerCase();
    const u = users.find(x => x.email.toLowerCase() === norm);
    if (!u) return { ok:true, token: null };
    const token = createResetToken(u.email);
    return { ok:true, token };
  };

  const resetPasswordWithToken = (token, newPassword) => {
    const em = getValidResetEmail(token);
    if (!em) return { ok:false, code:"INVALID_TOKEN" };
    setUsers(p => p.map(u => (u.email.toLowerCase() === em ? { ...u, password: newPassword } : u)));
    if (currentUser?.email.toLowerCase() === em) {
      setCU(prev => (prev ? { ...prev, password: newPassword } : null));
    }
    invalidateResetToken(token);
    return { ok:true };
  };

  const approveUser    = id  => setUsers(p => p.map(u => u.id===id ? {...u,status:"approved"} : u));
  const rejectUser     = id  => setUsers(p => p.map(u => u.id===id ? {...u,status:"rejected"} : u));
  const enrollUser     = (uid,cid) => setUsers(p => p.map(u => {
    if (u.id!==uid) return u;
    if (u.enrolledCourses.find(e=>e.courseId===cid)) return u;
    const updated = {...u, enrolledCourses:[...u.enrolledCourses,{courseId:cid,progress:0,completedLessons:[],enrollDate:new Date().toLocaleDateString("ar-EG")}]};
    if (currentUser?.id===uid) setCU(updated);
    return updated;
  }));
  const removeEnroll   = (uid,cid) => setUsers(p => p.map(u => u.id!==uid ? u : {...u,enrolledCourses:u.enrolledCourses.filter(e=>e.courseId!==cid)}));
  const assignInstructor = (uid,cid) => setUsers(p => p.map(u => u.id!==uid ? u : {...u,assignedCourses:[...(u.assignedCourses||[]).filter(x=>x!==cid),cid]}));
  const updateProfile = (updates) => setUsers(p => p.map(u => {
    if (u.id !== currentUser?.id) return u;
    const updated = { ...u, ...updates };
    setCU(updated);
    return updated;
  }));

  const markLesson = (cid,idx,total) => setUsers(p => p.map(u => {
    if (u.id!==currentUser?.id) return u;
    const ec = u.enrolledCourses.map(e => {
      if (e.courseId!==cid) return e;
      const done = e.completedLessons.includes(idx) ? e.completedLessons : [...e.completedLessons,idx];
      return {...e, completedLessons:done, progress:Math.round((done.length/total)*100)};
    });
    const updated = {...u, enrolledCourses:ec};
    setCU(updated); return updated;
  }));

  return (
    <AuthCtx.Provider value={{
      users,
      currentUser:freshMe(),
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
      resetPasswordWithToken,
    }}>
      {children}
    </AuthCtx.Provider>
  );
}
export const useAuth = () => useContext(AuthCtx);
