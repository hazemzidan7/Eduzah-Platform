import { createContext, useContext, useState, useEffect, useCallback } from "react";
import {
  collection,
  doc,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  limit,
  orderBy,
  onSnapshot,
  setDoc,
  Timestamp,
} from "firebase/firestore";
import { signInAnonymously, signOut } from "firebase/auth";
import { db, auth } from "../firebase";

const AccountingContext = createContext(null);

const SALT = "eduzah_acc_2024_";
const SESSION_KEY = "eduzah_acc_session";

async function hashPassword(password) {
  const encoder = new TextEncoder();
  const data = encoder.encode(SALT + password);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function nowIso() {
  return new Date().toISOString();
}

function subCrud(colName, setter) {
  const q = query(collection(db, colName), orderBy("createdAt", "desc"));
  return onSnapshot(q, (snap) => setter(snap.docs.map((d) => ({ id: d.id, ...d.data() }))));
}

async function crudAdd(colName, data) {
  return addDoc(collection(db, colName), { ...data, createdAt: nowIso() });
}
async function crudUpdate(colName, id, data) {
  return updateDoc(doc(db, colName, id), data);
}
async function crudDelete(colName, id) {
  return deleteDoc(doc(db, colName, id));
}

export function AccountingProvider({ children }) {
  const [accountingUser, setAccountingUser] = useState(null);
  const [sessionLoading, setSessionLoading] = useState(true);
  const [hasUsers, setHasUsers] = useState(null);

  const [rounds, setRounds] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [salaries, setSalaries] = useState([]);
  const [withdrawals, setWithdrawals] = useState([]);
  const [marketing, setMarketing] = useState([]);
  const [instructorPayments, setInstructorPayments] = useState([]);
  const [mentorPayments, setMentorPayments] = useState([]);

  // Restore session
  useEffect(() => {
    const raw = localStorage.getItem(SESSION_KEY);
    if (raw) {
      try {
        const parsed = JSON.parse(atob(raw));
        if (parsed?.userId) setAccountingUser(parsed);
      } catch (_) {
        localStorage.removeItem(SESSION_KEY);
      }
    }
    setSessionLoading(false);
  }, []);

  // Check if any accounting users exist
  useEffect(() => {
    getDocs(collection(db, "accountingUsers"))
      .then((snap) => setHasUsers(snap.size > 0))
      .catch(() => setHasUsers(false));
  }, []);

  // Subscribe to all data collections when logged in
  useEffect(() => {
    if (!accountingUser) return;
    const unsubs = [
      subCrud("accountingRounds", setRounds),
      subCrud("accountingExpenses", setExpenses),
      subCrud("accountingSalaries", setSalaries),
      subCrud("accountingWithdrawals", setWithdrawals),
      subCrud("accountingMarketing", setMarketing),
      subCrud("accountingInstructorPayments", setInstructorPayments),
      subCrud("accountingMentorPayments", setMentorPayments),
    ];
    return () => unsubs.forEach((u) => u());
  }, [accountingUser]);

  const login = useCallback(async (username, password) => {
    const snap = await getDocs(collection(db, "accountingUsers"));
    const users = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    const user = users.find((u) => u.username === username.trim());
    if (!user) throw new Error("اسم المستخدم أو كلمة المرور غير صحيحة");
    const hash = await hashPassword(password);
    if (hash !== user.passwordHash) throw new Error("اسم المستخدم أو كلمة المرور غير صحيحة");

    // Sign in anonymously to Firebase to get a UID for Firestore rules
    const { user: anonUser } = await signInAnonymously(auth);
    const expiresAt = Timestamp.fromMillis(Date.now() + 8 * 60 * 60 * 1000); // 8 hours
    await setDoc(doc(db, "accountingSessionTokens", anonUser.uid), { expiresAt });

    const session = { userId: user.id, name: user.name, username: user.username };
    localStorage.setItem(SESSION_KEY, btoa(JSON.stringify(session)));
    setAccountingUser(session);
  }, []);

  const logout = useCallback(async () => {
    localStorage.removeItem(SESSION_KEY);
    setAccountingUser(null);
    // Sign out of Firebase anonymous session
    try {
      await signOut(auth);
    } catch (_) {}
  }, []);

  const submitAccountingAccessRequest = useCallback(async ({ fullName, username, password, note }) => {
    const u = String(username || "").trim();
    if (!u) throw new Error("أدخل اسم المستخدم");
    if (!password || password.length < 8) throw new Error("كلمة المرور 8 أحرف على الأقل");

    const hash = await hashPassword(password);

    // Prevent duplicate pending requests for same username
    const dupQ = query(
      collection(db, "accountingUserRequests"),
      where("username", "==", u),
      where("status", "==", "pending"),
      limit(1),
    );
    const dup = await getDocs(dupQ);
    if (!dup.empty) throw new Error("يوجد طلب قيد المراجعة لنفس اسم المستخدم");

    // Prevent requesting if user already exists
    const usersSnap = await getDocs(collection(db, "accountingUsers"));
    const exists = usersSnap.docs.some((d) => (d.data().username || "").trim() === u);
    if (exists) throw new Error("اسم المستخدم موجود بالفعل — يمكنك تسجيل الدخول");

    await addDoc(collection(db, "accountingUserRequests"), {
      fullName: String(fullName || "").trim(),
      username: u,
      passwordHash: hash,
      note: String(note || "").trim(),
      status: "pending",
      createdAt: nowIso(),
    });
  }, []);

  // ── Rounds ──────────────────────────────────────────────
  const addRound = useCallback((d) => crudAdd("accountingRounds", d), []);
  const updateRound = useCallback((id, d) => crudUpdate("accountingRounds", id, d), []);
  const deleteRound = useCallback((id) => crudDelete("accountingRounds", id), []);

  // ── Expenses ─────────────────────────────────────────────
  const addExpense = useCallback((d) => crudAdd("accountingExpenses", d), []);
  const updateExpense = useCallback((id, d) => crudUpdate("accountingExpenses", id, d), []);
  const deleteExpense = useCallback((id) => crudDelete("accountingExpenses", id), []);

  // ── Salaries ─────────────────────────────────────────────
  const addSalary = useCallback((d) => crudAdd("accountingSalaries", d), []);
  const updateSalary = useCallback((id, d) => crudUpdate("accountingSalaries", id, d), []);
  const deleteSalary = useCallback((id) => crudDelete("accountingSalaries", id), []);

  // ── Withdrawals ───────────────────────────────────────────
  const addWithdrawal = useCallback((d) => crudAdd("accountingWithdrawals", d), []);
  const updateWithdrawal = useCallback((id, d) => crudUpdate("accountingWithdrawals", id, d), []);
  const deleteWithdrawal = useCallback((id) => crudDelete("accountingWithdrawals", id), []);

  // ── Marketing ─────────────────────────────────────────────
  const addMarketing = useCallback((d) => crudAdd("accountingMarketing", d), []);
  const updateMarketing = useCallback((id, d) => crudUpdate("accountingMarketing", id, d), []);
  const deleteMarketing = useCallback((id) => crudDelete("accountingMarketing", id), []);

  // ── Instructor Payments ───────────────────────────────────
  const addInstructorPayment = useCallback((d) => crudAdd("accountingInstructorPayments", d), []);
  const updateInstructorPayment = useCallback(
    (id, d) => crudUpdate("accountingInstructorPayments", id, d),
    []
  );
  const deleteInstructorPayment = useCallback(
    (id) => crudDelete("accountingInstructorPayments", id),
    []
  );

  // ── Mentor Payments ───────────────────────────────────────
  const addMentorPayment = useCallback((d) => crudAdd("accountingMentorPayments", d), []);
  const updateMentorPayment = useCallback((id, d) => crudUpdate("accountingMentorPayments", id, d), []);
  const deleteMentorPayment = useCallback((id) => crudDelete("accountingMentorPayments", id), []);

  return (
    <AccountingContext.Provider
      value={{
        accountingUser,
        sessionLoading,
        hasUsers,
        login,
        logout,
        submitAccountingAccessRequest,
        rounds,
        expenses,
        salaries,
        withdrawals,
        marketing,
        instructorPayments,
        mentorPayments,
        addRound,
        updateRound,
        deleteRound,
        addExpense,
        updateExpense,
        deleteExpense,
        addSalary,
        updateSalary,
        deleteSalary,
        addWithdrawal,
        updateWithdrawal,
        deleteWithdrawal,
        addMarketing,
        updateMarketing,
        deleteMarketing,
        addInstructorPayment,
        updateInstructorPayment,
        deleteInstructorPayment,
        addMentorPayment,
        updateMentorPayment,
        deleteMentorPayment,
      }}
    >
      {children}
    </AccountingContext.Provider>
  );
}

export const useAccounting = () => useContext(AccountingContext);
