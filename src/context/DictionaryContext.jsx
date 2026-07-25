import { createContext, useContext, useState, useEffect } from "react";
import { collection, doc, addDoc, updateDoc, onSnapshot } from "firebase/firestore";
import { db } from "../firebase";
import { useAuth } from "./AuthContext";

const DictionaryCtx = createContext(null);

export function normalizeForDictionary(text) {
  return String(text || "").trim().toLowerCase().replace(/\s+/g, " ");
}

/**
 * Learning Dictionaries: no seed data at all — every entry here is either
 * learned from an admin resolving an unknown value during import, or a
 * correction to a prior wrong suggestion. This context only provides
 * storage, exact-match lookup, and reuse tracking; the fuzzy/heuristic
 * matching that decides what counts as "close enough to suggest" belongs
 * in the parsing engine (sub-phase 3), not here.
 */
export function DictionaryProvider({ children }) {
  const { currentUser } = useAuth();
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (currentUser?.role !== "admin") { setEntries([]); setLoading(false); return; }
    setLoading(true);
    const unsub = onSnapshot(
      collection(db, "dictionaries"),
      (snap) => { setEntries(snap.docs.map((d) => ({ id: d.id, ...d.data() }))); setLoading(false); },
      () => setLoading(false),
    );
    return () => unsub();
  }, [currentUser?.id, currentUser?.role]);

  const activeEntries = entries.filter((e) => e.isActive);

  // Exact-match lookup (after normalization) — the only kind this context
  // performs. `businessUnitId` matters only for scoped types like "status".
  const findMapping = (dictionaryType, rawValue, businessUnitId = null) => {
    const norm = normalizeForDictionary(rawValue);
    if (!norm) return null;
    return activeEntries.find((e) =>
      e.dictionaryType === dictionaryType && e.synonymNormalized === norm
      && (e.businessUnitId == null || e.businessUnitId === businessUnitId)) || null;
  };

  const entriesForType = (dictionaryType) => activeEntries.filter((e) => e.dictionaryType === dictionaryType);

  // The "ask once, remember" write — called after an admin resolves an
  // unknown value (or corrects a wrong suggestion) during import review.
  const recordMapping = async (form) => {
    const now = new Date().toISOString();
    const ref = await addDoc(collection(db, "dictionaries"), {
      dictionaryType: form.dictionaryType,
      synonymNormalized: normalizeForDictionary(form.rawValue),
      synonymDisplay: form.rawValue,
      targetType: form.targetType || null,
      targetId: form.targetId || null,
      canonicalText: form.canonicalText || null,
      businessUnitId: form.businessUnitId || null,
      isActive: true,
      createdBy: currentUser?.id || null,
      createdAt: now,
      timesReused: 0,
      lastUsedAt: now,
    });
    return ref.id;
  };

  const recordReuse = async (id) => {
    const entry = entries.find((e) => e.id === id);
    await updateDoc(doc(db, "dictionaries", id), {
      timesReused: (entry?.timesReused || 0) + 1,
      lastUsedAt: new Date().toISOString(),
    });
  };

  // A correction: the old suggestion was wrong, so deactivate it rather than
  // delete it (still archive-based) and record what the admin picked instead.
  const deactivateMapping = async (id) => {
    await updateDoc(doc(db, "dictionaries", id), { isActive: false });
  };

  return (
    <DictionaryCtx.Provider value={{
      entries, activeEntries, loading,
      findMapping, entriesForType, recordMapping, recordReuse, deactivateMapping,
    }}>
      {children}
    </DictionaryCtx.Provider>
  );
}

export const useDictionary = () => useContext(DictionaryCtx);
