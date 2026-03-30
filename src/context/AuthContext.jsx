import { createContext, useContext, useState } from "react";
import { INIT_USERS } from "../data";

const AuthCtx = createContext(null);

export function AuthProvider({ children }) {
  const [users, setUsers]    = useState(INIT_USERS);
  const [currentUser, setCU] = useState(null);

  const freshMe = () => currentUser ? users.find(u => u.id === currentUser.id) || currentUser : null;

  const login = (email, pass) => {
    const u = users.find(x => x.email === email && x.password === pass);
    if (!u)                    return { ok:false, msg:"بيانات الدخول غلط" };
    if (u.status==="pending")  return { ok:false, msg:"حسابك قيد المراجعة من الـ Admin" };
    if (u.status==="rejected") return { ok:false, msg:"تم رفض حسابك. تواصل مع الإدارة" };
    setCU(u); return { ok:true, role:u.role };
  };
  const logout   = () => setCU(null);
  const register = (d) => {
    if (users.find(u => u.email===d.email)) return { ok:false, msg:"البريد مسجل مسبقاً" };
    const nu = { id:`u${Date.now()}`, name:d.name, email:d.email, password:d.pass, role:d.role, status:"pending", avatar:d.name[0].toUpperCase(), phone:d.phone||"", enrolledCourses:[], assignedCourses:[] };
    setUsers(p => [...p, nu]);
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
    <AuthCtx.Provider value={{users,currentUser:freshMe(),login,logout,register,approveUser,rejectUser,enrollUser,removeEnroll,assignInstructor,markLesson,updateProfile}}>
      {children}
    </AuthCtx.Provider>
  );
}
export const useAuth = () => useContext(AuthCtx);
