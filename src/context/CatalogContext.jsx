import { createContext, useContext, useState, useEffect } from "react";
import {
  collection,
  doc,
  addDoc,
  updateDoc,
  setDoc,
  getDoc,
  getDocs,
  onSnapshot,
} from "firebase/firestore";
import { db } from "../firebase";
import { useAuth } from "./AuthContext";
import { CATALOG_SEED } from "../data/catalogSeed";

const CatalogCtx = createContext(null);

export function CatalogProvider({ children }) {
  const { currentUser } = useAuth();
  const [nodes, setNodes] = useState([]);
  const [loading, setLoading] = useState(true);

  // Firestore rules restrict reads of `catalogNodes` to admins — only subscribe when signed in as one.
  useEffect(() => {
    if (currentUser?.role !== "admin") { setNodes([]); setLoading(false); return; }
    setLoading(true);
    const unsub = onSnapshot(
      collection(db, "catalogNodes"),
      (snap) => {
        setNodes(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
        setLoading(false);
      },
      () => setLoading(false),
    );
    return () => unsub();
  }, [currentUser?.id, currentUser?.role]);

  // Seed the 5 Business Units + their first-pass Category children — exactly once, ever.
  // Guarded by settings/seedState.catalogSeeded (mirrors the same pattern DataContext
  // uses for courses) so archiving/deleting every node later can never cause a silent
  // re-seed. The seed only bootstraps an empty database; Firestore is the source of
  // truth from that point on, permanently.
  useEffect(() => {
    if (currentUser?.role !== "admin") return;
    (async () => {
      let seeded = {};
      try {
        const s = await getDoc(doc(db, "settings", "seedState"));
        if (s.exists()) seeded = s.data() || {};
      } catch (_) {}
      if (seeded.catalogSeeded === true) return;

      const snap = await getDocs(collection(db, "catalogNodes"));
      if (!snap.empty) {
        // Data already exists (e.g. from before this guard existed) — mark seeded
        // without touching it, rather than assuming it's safe to add more on top.
        await setDoc(doc(db, "settings", "seedState"), { ...seeded, catalogSeeded: true, updatedAt: new Date().toISOString() }, { merge: true });
        return;
      }
      const now = new Date().toISOString();
      for (const [buOrder, bu] of CATALOG_SEED.entries()) {
        const buRef = await addDoc(collection(db, "catalogNodes"), {
          type: "business_unit",
          name_ar: bu.name_ar,
          name_en: bu.name_en,
          parentId: null,
          path: [],
          order: buOrder,
          isActive: true,
          archivedAt: null,
          createdAt: now,
          updatedAt: now,
        });
        for (const [childOrder, child] of bu.children.entries()) {
          await addDoc(collection(db, "catalogNodes"), {
            type: "category",
            name_ar: child.name_ar,
            name_en: child.name_en,
            parentId: buRef.id,
            path: [buRef.id],
            order: childOrder,
            isActive: true,
            archivedAt: null,
            createdAt: now,
            updatedAt: now,
          });
        }
      }
      await setDoc(doc(db, "settings", "seedState"), { ...seeded, catalogSeeded: true, updatedAt: new Date().toISOString() }, { merge: true });
    })().catch((e) => console.warn("Catalog seed failed:", e));
  }, [currentUser?.id, currentUser?.role]);

  // ── SELECTORS ────────────────────────────────────────
  const businessUnits = nodes
    .filter((n) => n.type === "business_unit" && n.isActive)
    .sort((a, b) => a.order - b.order);

  const childrenOf = (parentId) =>
    nodes.filter((n) => n.parentId === parentId && n.isActive).sort((a, b) => a.order - b.order);

  const nodeById = (id) => nodes.find((n) => n.id === id) || null;

  // Every descendant of a node, via the materialized `path` array — no recursive queries needed.
  const descendantsOf = (nodeId) =>
    nodes.filter((n) => Array.isArray(n.path) && n.path.includes(nodeId));

  // ── CREATE ───────────────────────────────────────────
  // `type` is a free string, not a fixed enum — the tree doesn't hardcode which
  // levels exist. `extraFields` is an open bag for whatever a given type needs
  // (a "batch" might want startDate/capacity, a future "company" might want
  // orgName/contactPerson) — no code change is needed here to support a new type.
  const addNode = async (form) => {
    const parent = form.parentId ? nodeById(form.parentId) : null;
    const path = parent ? [...(parent.path || []), parent.id] : [];
    const now = new Date().toISOString();
    const nn = {
      type: form.type,
      name_ar: form.name_ar || "",
      name_en: form.name_en || "",
      parentId: form.parentId || null,
      path,
      order: form.order ?? 0,
      isActive: true,
      archivedAt: null,
      ...(form.extraFields || {}),
      createdAt: now,
      updatedAt: now,
    };
    const ref = await addDoc(collection(db, "catalogNodes"), nn);
    return ref.id;
  };

  // ── UPDATE ───────────────────────────────────────────
  const updateNode = async (id, updates) => {
    await updateDoc(doc(db, "catalogNodes", id), { ...updates, updatedAt: new Date().toISOString() });
  };

  // ── ARCHIVE (never a hard delete) ────────────────────
  const archiveNode = async (id) => {
    await updateDoc(doc(db, "catalogNodes", id), {
      isActive: false,
      archivedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
  };

  return (
    <CatalogCtx.Provider value={{
      nodes, loading,
      businessUnits, childrenOf, nodeById, descendantsOf,
      addNode, updateNode, archiveNode,
    }}>
      {children}
    </CatalogCtx.Provider>
  );
}

export const useCatalog = () => useContext(CatalogCtx);
