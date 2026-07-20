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
import { normalizeLeadStatus } from "../constants/leadStatus";

const LeadsCtx = createContext(null);

function genId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

export function LeadsProvider({ children }) {
  const { currentUser } = useAuth();
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);

  // Firestore rules restrict reads of `leads` to admins — only subscribe when signed in as one.
  useEffect(() => {
    if (currentUser?.role !== "admin") { setLeads([]); setLoading(false); return; }
    setLoading(true);
    const unsub = onSnapshot(
      collection(db, "leads"),
      (snap) => {
        setLeads(snap.docs.map((d) => ({ id: d.id, ...d.data(), status: normalizeLeadStatus(d.data().status) })));
        setLoading(false);
      },
      () => setLoading(false),
    );
    return () => unsub();
  }, [currentUser?.id, currentUser?.role]);

  // ── CREATE ───────────────────────────────────────────
  // `source` is "manual" (admin, via Add Lead modal) or "public_form" (public lead-capture page).
  const addLead = async (form, source = "manual") => {
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
      interestedCourseId: form.interestedCourseId || null,
      interestedCourse: form.interestedCourse || "",
      leadSource: form.leadSource || "",
      campaign: form.campaign || "",
      assignedTo: source === "manual" ? (form.assignedTo || null) : null,
      status: "new",
      lastContactDate: null,
      nextFollowUpDate: null,
      notes: form.notes || "",
      activityLog: [{
        id: genId(),
        type: "system",
        text: source === "public_form" ? "Lead created via public form" : "Lead created manually",
        byUid: currentUser?.id || null,
        byName: currentUser?.name || null,
        at: now,
      }],
      source,
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

  // ── STATUS CHANGE (patches status + appends a Timeline entry) ────
  const changeLeadStatus = async (id, newStatus) => {
    const status = normalizeLeadStatus(newStatus);
    const lead = leads.find((l) => l.id === id);
    const now = new Date().toISOString();
    await updateDoc(doc(db, "leads", id), {
      status,
      updatedAt: now,
      activityLog: arrayUnion({
        id: genId(),
        type: "status_change",
        statusFrom: lead?.status || null,
        statusTo: status,
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
    <LeadsCtx.Provider value={{ leads, loading, addLead, updateLead, changeLeadStatus, logLeadContact }}>
      {children}
    </LeadsCtx.Provider>
  );
}

export const useLeads = () => useContext(LeadsCtx);
