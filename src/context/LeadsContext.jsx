import { createContext, useContext, useState, useEffect } from "react";
import {
  collection,
  doc,
  addDoc,
  updateDoc,
  onSnapshot,
  arrayUnion,
} from "firebase/firestore";
import { db } from "../firebase";
import { useAuth } from "./AuthContext";
import { useLeadStatus } from "./LeadStatusContext";
import { normalizeLeadSource } from "../constants/leadSource";
import { normalizePhone, normalizeEmail } from "../utils/leadDedupe";

const LeadsCtx = createContext(null);

function genId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

export function LeadsProvider({ children }) {
  const { currentUser } = useAuth();
  const { globalStatuses } = useLeadStatus();
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);

  // Firestore rules restrict reads of `leads` to admins — only subscribe when signed in as one.
  useEffect(() => {
    if (currentUser?.role !== "admin") { setLeads([]); setLoading(false); return; }
    setLoading(true);
    const unsub = onSnapshot(
      collection(db, "leads"),
      (snap) => {
        // statusId is a Firestore reference now, not a fixed enum — no normalization needed,
        // whatever's stored is whatever leadStatuses doc it points to (or null/stale, handled at render time).
        setLeads(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
        setLoading(false);
      },
      () => setLoading(false),
    );
    return () => unsub();
  }, [currentUser?.id, currentUser?.role]);

  // ── DUPLICATE CHECK ────────────────────────────────────
  // Client-side lookup over the already-subscribed `leads` list (admins only ever see
  // their own real-time full collection, same pattern as everywhere else in this app).
  // Matches on phone OR email — either one matching an existing lead counts as the same person.
  // No auto-merge: this only ever returns a candidate for a human (the admin) to act on.
  const findDuplicateLead = ({ phone, email }) => {
    const np = normalizePhone(phone);
    const ne = email ? normalizeEmail(email) : null;
    if (!np && !ne) return null;
    return leads.find((l) => (np && l.normalizedPhone === np) || (ne && l.normalizedEmail === ne)) || null;
  };

  // ── CREATE ───────────────────────────────────────────
  // `entryMethod` is "manual" (admin, via Add Lead modal) or "public_form" (public lead-capture page).
  // `form.possibleDuplicateOfLeadId` is only ever set when an admin was shown a duplicate warning
  // (via findDuplicateLead) and explicitly chose to create a new lead anyway.
  const addLead = async (form, entryMethod = "manual") => {
    const now = new Date().toISOString();
    const nl = {
      fullName: form.fullName || "",
      phone: form.phone || "",
      whatsapp: form.whatsapp || "",
      email: form.email || "",
      university: form.university || "",
      faculty: form.faculty || "",
      academicYear: form.academicYear || "",
      city: form.city || "",
      courseId: form.courseId || null,
      courseName: form.courseName || "",
      leadSource: normalizeLeadSource(form.leadSource),
      campaign: form.campaign || "",
      assignedTo: entryMethod === "manual" ? (form.assignedTo || null) : null,
      statusId: globalStatuses.find((s) => s.isDefault)?.id || null,
      lastContactDate: null,
      nextFollowUpDate: null,
      notes: form.notes || "",
      activityLog: [{
        id: genId(),
        type: "system",
        text: entryMethod === "public_form" ? "Lead created via public form" : "Lead created manually",
        byUid: currentUser?.id || null,
        byName: currentUser?.name || null,
        at: now,
      }],
      entryMethod,
      normalizedPhone: normalizePhone(form.phone),
      normalizedEmail: form.email ? normalizeEmail(form.email) : null,
      possibleDuplicateOfLeadId: form.possibleDuplicateOfLeadId || null,
      utmSource: form.utmSource || null,
      utmMedium: form.utmMedium || null,
      utmCampaign: form.utmCampaign || null,
      utmContent: form.utmContent || null,
      convertedStudentId: null,
      createdAt: now,
      updatedAt: now,
    };
    const ref = await addDoc(collection(db, "leads"), nl);
    return ref.id;
  };

  // ── UPDATE (generic field patch — notes, assignment, follow-up date, etc.) ────
  const updateLead = async (id, updates) => {
    await updateDoc(doc(db, "leads", id), { ...updates, updatedAt: new Date().toISOString() });
  };

  // ── STATUS CHANGE (patches statusId + appends a Timeline entry) ────
  const changeLeadStatus = async (id, newStatusId) => {
    const lead = leads.find((l) => l.id === id);
    const now = new Date().toISOString();
    await updateDoc(doc(db, "leads", id), {
      statusId: newStatusId,
      updatedAt: now,
      activityLog: arrayUnion({
        id: genId(),
        type: "status_change",
        statusFrom: lead?.statusId || null,
        statusTo: newStatusId,
        byUid: currentUser?.id || null,
        byName: currentUser?.name || null,
        at: now,
      }),
    });
  };

  // ── LOG CONTACT (call / whatsapp / email / note — appends a Timeline entry) ────
  const logLeadContact = async (id, { type = "note", text = "" }) => {
    const now = new Date().toISOString();
    const isContact = type === "call" || type === "whatsapp" || type === "email";
    await updateDoc(doc(db, "leads", id), {
      updatedAt: now,
      ...(isContact ? { lastContactDate: now } : {}),
      activityLog: arrayUnion({
        id: genId(),
        type,
        text,
        byUid: currentUser?.id || null,
        byName: currentUser?.name || null,
        at: now,
      }),
    });
  };

  return (
    <LeadsCtx.Provider value={{ leads, loading, findDuplicateLead, addLead, updateLead, changeLeadStatus, logLeadContact }}>
      {children}
    </LeadsCtx.Provider>
  );
}

export const useLeads = () => useContext(LeadsCtx);
