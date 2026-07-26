import { createContext, useContext, useState, useEffect } from "react";
import { collection, onSnapshot } from "firebase/firestore";
import { db } from "../firebase";
import { useAuth } from "./AuthContext";

const ImportBatchCtx = createContext(null);

/**
 * Read-only for now — Commit (sub-phase 5) is what actually writes an
 * importBatches doc per completed import. This context exists now so the
 * History screen has a real place to read from; it will legitimately show
 * an empty state until commits exist.
 */
export function ImportBatchProvider({ children }) {
  const { currentUser } = useAuth();
  const [batches, setBatches] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (currentUser?.role !== "admin") { setBatches([]); setLoading(false); return; }
    setLoading(true);
    const unsub = onSnapshot(
      collection(db, "importBatches"),
      (snap) => { setBatches(snap.docs.map((d) => ({ id: d.id, ...d.data() }))); setLoading(false); },
      () => setLoading(false),
    );
    return () => unsub();
  }, [currentUser?.id, currentUser?.role]);

  const sorted = [...batches].sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || ""));
  const batchById = (id) => batches.find((b) => b.id === id) || null;

  return (
    <ImportBatchCtx.Provider value={{ batches: sorted, loading, batchById }}>
      {children}
    </ImportBatchCtx.Provider>
  );
}

export const useImportBatches = () => useContext(ImportBatchCtx);
