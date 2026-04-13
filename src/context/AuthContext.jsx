import { createContext, useContext, useState, useEffect } from "react";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  updatePassword,
  sendPasswordResetEmail,
  fetchSignInMethodsForEmail,
} from "firebase/auth";
import {
  doc, setDoc, getDoc, updateDoc, collection, getDocs, query, where, limit, onSnapshot,
} from "firebase/firestore";
import { getFunctions, httpsCallable } from "firebase/functions";
import { auth, db, app } from "../firebase";
import { courseIdsFromEnrolled } from "../utils/enrollment";
import { isSuperAdminEmail } from "../config/superAdmin";
import {
  appendPlainNotification,
  patchAfterEnroll,
  patchAfterLesson,
  patchCourseComplete,
} from "../utils/gamification";

const AuthCtx = createContext(null);

export { courseIdsFromEnrolled };

export function AuthProvider({ children }) {
  const [currentUser, setCU]  = useState(null);
  const [users,       setUsers] = useState([]);
  const [loading,   setLoading] = useState(true);

  useEffect(() => {
    // Safety net: if Firebase doesn't respond in 8 s, unblock the UI
    const timer = setTimeout(() => setLoading(false), 8000);

    const unsub = onAuthStateChanged(auth, async (firebaseUser) => {
      clearTimeout(timer);
      try {
        if (firebaseUser) {
          const snap = await getDoc(doc(db, "users", firebaseUser.uid));
          if (snap.exists()) {
            const data = snap.data();
            const merged = {
              ...data,
              xp: data.xp ?? 0,
              level: data.level ?? 1,
              badges: Array.isArray(data.badges) ? data.badges : [],
              userNotifications: Array.isArray(data.userNotifications) ? data.userNotifications : [],
              courseActivity: data.courseActivity && typeof data.courseActivity === "object" ? data.courseActivity : {},
            };
            setCU({ id: firebaseUser.uid, ...merged });
            const persist = {};
            if (data.xp == null) persist.xp = 0;
            if (data.level == null) persist.level = 1;
            if (!Array.isArray(data.badges)) persist.badges = [];
            if (!Array.isArray(data.userNotifications)) persist.userNotifications = [];
            if (data.courseActivity == null) persist.courseActivity = {};
            if (Object.keys(persist).length) {
              updateDoc(doc(db, "users", firebaseUser.uid), persist).catch(() => {});
            }
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
    return () => { clearTimeout(timer); unsub(); };
  }, []);

  /* Live-sync profile when admins grant course access or update the user document. */
  useEffect(() => {
    if (!currentUser?.id) return undefined;
    const uid = currentUser.id;
    const unsub = onSnapshot(doc(db, "users", uid), (snap) => {
      if (!snap.exists()) return;
      const data = snap.data();
      setCU((prev) => {
        if (!prev || prev.id !== uid) return prev;
        return {
          ...prev,
          ...data,
          id: uid,
          xp: data.xp ?? 0,
          level: data.level ?? 1,
          badges: Array.isArray(data.badges) ? data.badges : [],
          userNotifications: Array.isArray(data.userNotifications) ? data.userNotifications : [],
          courseActivity: data.courseActivity && typeof data.courseActivity === "object" ? data.courseActivity : {},
        };
      });
    });
    return () => unsub();
  }, [currentUser?.id]);

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
          const q = query(collection(db, "users"), where("role", "in", ["student", "user"]));
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

  /**
   * Public registration — account is active immediately (no admin approval).
   */
  const register = async (d) => {
    const email = d.email.trim().toLowerCase();
    try {
      const methods = await fetchSignInMethodsForEmail(auth, email);
      if (methods.length > 0) return { ok: false, code: "EMAIL_EXISTS" };
    } catch {
      /* If enumeration protection blocks this, we still rely on createUser below. */
    }
    try {
      const cred = await createUserWithEmailAndPassword(auth, email, d.pass);
      const enrolledCourses = [];
      const welcomeMsg =
        "تم إنشاء حسابك بنجاح — يمكنك الآن استكشاف المنصة والتقديم على الكورسات. | "
        + "Your account is ready — explore the platform and apply for courses.";
      const userNotifications = appendPlainNotification({ userNotifications: [] }, welcomeMsg);
      await setDoc(doc(db, "users", cred.user.uid), {
        name: d.name,
        email,
        role: "user",
        status: "approved",
        avatar: (d.name && d.name[0]) ? d.name[0].toUpperCase() : "?",
        phone: d.phone || "",
        enrolledCourses,
        enrolledCourseIds: courseIdsFromEnrolled(enrolledCourses),
        assignedCourses: [],
        xp: 0,
        level: 1,
        badges: [],
        userNotifications,
        lastViewedCourseId: null,
        lastViewedAt: null,
        courseActivity: {},
        createdAt: new Date().toISOString(),
      });
      return { ok: true, uid: cred.user.uid };
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

  /** Re-load Firestore profile for the signed-in user (e.g. after notification writes). */
  const refreshUserProfile = async () => {
    const uid = auth.currentUser?.uid;
    if (!uid) return;
    const snap = await getDoc(doc(db, "users", uid));
    if (!snap.exists()) return;
    const data = snap.data();
    setCU({
      id: uid,
      ...data,
      xp: data.xp ?? 0,
      level: data.level ?? 1,
      badges: Array.isArray(data.badges) ? data.badges : [],
      userNotifications: Array.isArray(data.userNotifications) ? data.userNotifications : [],
      courseActivity: data.courseActivity && typeof data.courseActivity === "object" ? data.courseActivity : {},
    });
  };

  /** Legacy / admin: unblock user account only (course access is via enrollment requests). */
  const approveUser = async (id) => {
    await updateDoc(doc(db, "users", id), { status: "approved", pendingEnrollmentCourseId: null });
    setUsers((p) => p.map((usr) => (usr.id === id ? { ...usr, status: "approved", pendingEnrollmentCourseId: null } : usr)));
    if (currentUser?.id === id) {
      setCU((prev) => (prev ? { ...prev, status: "approved", pendingEnrollmentCourseId: null } : prev));
    }
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
      ...(patch.role != null && ["user", "student", "instructor"].includes(patch.role) && { role: patch.role }),
    };
    await updateDoc(doc(db, "users", id), clean);
    setUsers((p) => p.map((u) => (u.id === id ? { ...u, ...clean } : u)));
    if (currentUser?.id === id) setCU((prev) => ({ ...prev, ...clean }));
  };

  /** Guest requests may omit userId; resolve platform uid by profile email (admin approve / notify). */
  const resolveUserIdForEnrollmentRequest = async (r) => {
    if (r.userId) return r.userId;
    const em = String(r.studentEmail || "").trim().toLowerCase();
    if (!em.includes("@")) return null;
    try {
      const qs = await getDocs(query(collection(db, "users"), where("email", "==", em), limit(1)));
      if (qs.empty) return null;
      return qs.docs[0].id;
    } catch (_) {
      return null;
    }
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
    const roleNext = u.role === "user" ? "student" : u.role;
    let courseTitle = "";
    try {
      const cs = await getDoc(doc(db, "courses", cid));
      if (cs.exists()) courseTitle = cs.data().title || "";
    } catch (_) {}
    const gam = patchAfterEnroll(u, courseTitle);
    await updateDoc(doc(db, "users", uid), {
      enrolledCourses: updated,
      enrolledCourseIds,
      ...(roleNext !== u.role ? { role: roleNext } : {}),
      xp: gam.xp,
      level: gam.level,
      badges: gam.badges,
      userNotifications: gam.userNotifications,
    });
    setUsers((p) => p.map((usr) => (usr.id === uid ? {
      ...usr,
      enrolledCourses: updated,
      enrolledCourseIds,
      role: roleNext,
      xp: gam.xp,
      level: gam.level,
      badges: gam.badges,
      userNotifications: gam.userNotifications,
    } : usr)));
    if (currentUser?.id === uid) {
      setCU((prev) => ({
        ...prev,
        enrolledCourses: updated,
        enrolledCourseIds,
        role: roleNext,
        xp: gam.xp,
        level: gam.level,
        badges: gam.badges,
        userNotifications: gam.userNotifications,
      }));
    }
  };

  const approveEnrollmentRequest = async (requestId) => {
    const refReq = doc(db, "enrollmentRequests", requestId);
    const snap = await getDoc(refReq);
    if (!snap.exists()) return { ok: false, code: "NOT_FOUND" };
    const r = snap.data();
    const st = r.enrollmentStatus ?? "pending";
    if (st === "approved") return { ok: true };
    if (st === "rejected") return { ok: false, code: "ALREADY_REJECTED" };

    const uid = await resolveUserIdForEnrollmentRequest(r);
    if (uid) {
      await enrollUser(uid, r.courseId);
      const uRef = doc(db, "users", uid);
      const uSnap = await getDoc(uRef);
      if (uSnap.exists()) {
        const u = uSnap.data();
        const msg =
          "تمت الموافقة على طلبك — يمكنك الآن البدء في الكورس من «كورساتي». | "
          + "Your enrollment was approved — open My Courses to start learning.";
        const userNotifications = appendPlainNotification(u, msg);
        await updateDoc(uRef, { userNotifications });
        if (currentUser?.id === uid) setCU((prev) => (prev ? { ...prev, userNotifications } : prev));
      }
    }

    await updateDoc(refReq, {
      enrollmentStatus: "approved",
      reviewedAt: new Date().toISOString(),
      ...(currentUser?.id ? { reviewedBy: currentUser.id } : {}),
      ...(!r.userId && uid ? { userId: uid } : {}),
    });
    return { ok: true };
  };

  const rejectEnrollmentRequest = async (requestId, reason = "") => {
    const refReq = doc(db, "enrollmentRequests", requestId);
    const snap = await getDoc(refReq);
    if (!snap.exists()) return { ok: false, code: "NOT_FOUND" };
    const r = snap.data();
    await updateDoc(refReq, {
      enrollmentStatus: "rejected",
      rejectReason: String(reason || "").trim(),
      reviewedAt: new Date().toISOString(),
      ...(currentUser?.id ? { reviewedBy: currentUser.id } : {}),
    });
    const uid = await resolveUserIdForEnrollmentRequest(r);
    if (uid) {
      const uRef = doc(db, "users", uid);
      const uSnap = await getDoc(uRef);
      if (uSnap.exists()) {
        const u = uSnap.data();
        const base =
          "لم تتم الموافقة على طلب التسجيل في الكورس. | Your course enrollment request was not approved.";
        const msg = reason?.trim()
          ? `${base} (${reason.trim()})`
          : `${base}`;
        const userNotifications = appendPlainNotification(u, msg);
        await updateDoc(uRef, { userNotifications });
        if (currentUser?.id === uid) setCU((prev) => (prev ? { ...prev, userNotifications } : prev));
      }
    }
    return { ok: true };
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

  const markLesson = async (cid, idx, total, courseTitle = "") => {
    if (!currentUser) return;
    const ref = doc(db, "users", currentUser.id);
    const snap = await getDoc(ref);
    if (!snap.exists()) return;
    const u = snap.data();
    const entryBefore = (u.enrolledCourses || []).find((e) => e.courseId === cid);
    const wasDone = entryBefore?.completedLessons?.includes(idx);
    const prevProg = entryBefore?.progress || 0;

    const ec = (u.enrolledCourses || []).map((e) => {
      if (e.courseId !== cid) return e;
      const done = e.completedLessons.includes(idx) ? e.completedLessons : [...e.completedLessons, idx];
      return { ...e, completedLessons: done, progress: Math.round((done.length / total) * 100) };
    });
    const entryAfter = ec.find((e) => e.courseId === cid);
    const newProg = entryAfter?.progress || 0;
    const enrolledCourseIds = courseIdsFromEnrolled(ec);

    let patch = { enrolledCourses: ec, enrolledCourseIds };
    let base = { ...u, ...patch };

    if (!wasDone) {
      const totalLessonsDone = ec.reduce((sum, e) => sum + (e.completedLessons?.length || 0), 0);
      const pl = patchAfterLesson(u, totalLessonsDone);
      patch = { ...patch, xp: pl.xp, level: pl.level, badges: pl.badges, userNotifications: pl.userNotifications };
      base = { ...base, ...pl };
    }
    if (newProg === 100 && prevProg < 100) {
      const pc = patchCourseComplete(base, courseTitle);
      patch = { ...patch, xp: pc.xp, level: pc.level, badges: pc.badges, userNotifications: pc.userNotifications };
    }

    await updateDoc(ref, patch);
    setCU((prev) => (prev ? { ...prev, ...patch } : prev));
  };

  const recordCourseView = async (courseId) => {
    if (!currentUser?.id || !courseId) return;
    const ref = doc(db, "users", currentUser.id);
    const snap = await getDoc(ref);
    if (!snap.exists()) return;
    const u = snap.data();
    const activity = { ...(u.courseActivity || {}) };
    const cur = activity[courseId] || { views: 0 };
    activity[courseId] = { views: (cur.views || 0) + 1, lastAt: new Date().toISOString() };
    const patch = {
      lastViewedCourseId: courseId,
      lastViewedAt: new Date().toISOString(),
      courseActivity: activity,
    };
    await updateDoc(ref, patch);
    setCU((prev) => (prev ? { ...prev, ...patch } : prev));
  };

  const requestPasswordReset = async (email) => {
    const e = email.trim().toLowerCase();
    if (!e.includes("@")) return { ok: false, code: "invalid-email" };
    try {
      const continueUrl = typeof window !== "undefined" ? `${window.location.origin}/reset-password` : undefined;
      await sendPasswordResetEmail(
        auth,
        e,
        continueUrl ? { url: continueUrl, handleCodeInApp: true } : undefined,
      );
      return { ok: true };
    } catch (err) {
      if (err.code === "auth/user-not-found") return { ok: true };
      if (err.code === "auth/invalid-email") return { ok: false, code: "invalid-email" };
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

  /** Super Admin only — requires deployed Cloud Function `createAdminAccount`. */
  const createAdminAccount = async ({ name, email, password }) => {
    if (!isSuperAdminEmail(currentUser?.email)) {
      return { ok: false, code: "FORBIDDEN" };
    }
    try {
      const functions = getFunctions(app, "us-central1");
      const callable = httpsCallable(functions, "createAdminAccount");
      await callable({ name: String(name).trim(), email: String(email).trim().toLowerCase(), password: String(password) });
      await fetchUsers();
      return { ok: true };
    } catch (err) {
      const code = err.code || err.message;
      return { ok: false, code: code === "functions/not-found" ? "NOT_DEPLOYED" : code };
    }
  };

  if (loading) return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "var(--page-bg, #1a0f24)", color: "var(--page-text, #f8fafc)" }}>
      <div style={{ width: 36, height: 36, border: "3px solid rgba(217,27,91,.3)", borderTopColor: "#d91b5b", borderRadius: "50%", animation: "spin 0.7s linear infinite" }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );

  return (
    <AuthCtx.Provider value={{
      users, currentUser, loading,
      fetchUsers, login, logout, register, refreshUserProfile,
      approveUser, rejectUser, approveEnrollmentRequest, rejectEnrollmentRequest,
      enrollUser, removeEnroll,
      assignInstructor, markLesson, recordCourseView, updateProfile, adminUpdateUser,
      requestPasswordReset, changePassword,
      createAdminAccount,
    }}>
      {children}
    </AuthCtx.Provider>
  );
}

export const useAuth = () => useContext(AuthCtx);
