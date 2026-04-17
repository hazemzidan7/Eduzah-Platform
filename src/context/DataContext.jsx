import { createContext, useContext, useState, useEffect } from "react";
import {
  collection,
  doc,
  getDocs,
  getDoc,
  addDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
} from "firebase/firestore";
import { db } from "../firebase";
import { useAuth } from "./AuthContext";
import {
  COURSES as INIT_COURSES,
  NEWS as INIT_NEWS,
  EXAMS as INIT_EXAMS,
  TRAINERS as INIT_TRAINERS,
  PROGRAMS as INIT_PROGRAMS,
  TESTIMONIALS as INIT_TESTIMONIALS,
  TEAM_MEMBERS as INIT_TEAM,
  SITE,
} from "../data";

const DataCtx = createContext(null);

// Helper: seed a Firestore collection from local data if it's empty
async function seedCollection(colName, items) {
  const snap = await getDocs(collection(db, colName));
  if (snap.empty && items.length > 0) {
    for (const item of items) {
      const { id, ...rest } = item;
      await setDoc(doc(db, colName, String(id)), rest);
    }
  }
}

// Helper: patch existing docs that are missing certain fields (one-time migration)
async function patchMissingFields(colName, localItems, matchKey, fields) {
  try {
    const snap = await getDocs(collection(db, colName));
    for (const d of snap.docs) {
      const data = d.data();
      const local = localItems.find(l => l[matchKey] === data[matchKey]);
      if (!local) continue;
      const missing = {};
      for (const f of fields) {
        if (!data[f] && local[f]) missing[f] = local[f];
      }
      if (Object.keys(missing).length > 0) {
        await updateDoc(doc(db, colName, d.id), missing);
      }
    }
  } catch (_) { /* silently ignore — non-critical */ }
}

export function DataProvider({ children }) {
  const { currentUser } = useAuth();
  const [courses,      setCourses]      = useState(INIT_COURSES);
  const [news,         setNews]         = useState(INIT_NEWS);
  const [exams,        setExams]        = useState(INIT_EXAMS);
  const [trainers,     setTrainers]     = useState(INIT_TRAINERS);
  const [programs,     setPrograms]     = useState(INIT_PROGRAMS);
  const [testimonials, setTestimonials] = useState(INIT_TESTIMONIALS);
  const [team,         setTeam]         = useState(INIT_TEAM);
  const [vodafoneCash,   setVodafoneCashState] = useState(SITE.vodafoneCash);
  const [categoryIcons,  setCategoryIcons]     = useState({});

  // Real-time listeners — always add an error handler to avoid unhandled rejections
  useEffect(() => {
    const snap = (col, setter) =>
      onSnapshot(collection(db, col), s => setter(s.docs.map(d => ({ id: d.id, ...d.data() }))), () => {});
    const unsubs = [
      snap("courses",      setCourses),
      snap("news",         setNews),
      snap("trainers",     setTrainers),
      snap("programs",     setPrograms),
      snap("testimonials", setTestimonials),
      snap("team",         setTeam),
    ];
    return () => unsubs.forEach(u => u());
  }, []);

  useEffect(() => {
    const unsub = onSnapshot(doc(db, "settings", "vodafoneCash"), (snap) => {
      if (snap.exists()) setVodafoneCashState(snap.data().value ?? SITE.vodafoneCash);
    }, () => {});
    return () => unsub();
  }, []);

  useEffect(() => {
    const unsub = onSnapshot(doc(db, "settings", "categoryIcons"), (snap) => {
      if (snap.exists()) setCategoryIcons(snap.data());
    }, () => {});
    return () => unsub();
  }, []);

  // Exams require auth — subscribe only when signed in
  useEffect(() => {
    if (!currentUser) { setExams(INIT_EXAMS); return; }
    const unsub = onSnapshot(collection(db, "exams"),
      s => setExams(s.docs.map(d => ({ id: d.id, ...d.data() }))),
      () => {}
    );
    return () => unsub();
  }, [currentUser?.id]);

  // Seed empty collections only when an admin is signed in (Firestore rules require admin writes).
  useEffect(() => {
    if (currentUser?.role !== "admin") return;
    let cancelled = false;
    (async () => {
      // Prevent re-seeding after first successful seed.
      // Otherwise, deleting all docs in a collection will make them come back automatically.
      let seeded = {};
      try {
        const s = await getDoc(doc(db, "settings", "seedState"));
        if (s.exists()) seeded = s.data() || {};
      } catch (_) {}

      const markSeeded = async (patch) => {
        try {
          await setDoc(
            doc(db, "settings", "seedState"),
            { ...(seeded || {}), ...patch, updatedAt: new Date().toISOString() },
            { merge: true },
          );
        } catch (_) {}
      };

      await Promise.all([
        // Seed courses only once (unless settings/seedState.coursesSeeded !== true)
        seeded.coursesSeeded === true
          ? Promise.resolve()
          : seedCollection("courses", INIT_COURSES.map(c => ({ ...c, id: c.slug || c.id })))
              .then(() => markSeeded({ coursesSeeded: true })),
        seedCollection("news",         INIT_NEWS.map(n => ({ ...n, id: String(n.id) }))),
        seedCollection("exams",        INIT_EXAMS.map(e => ({ ...e, id: String(e.id) }))),
        seedCollection("trainers",     INIT_TRAINERS),
        seedCollection("programs",     INIT_PROGRAMS),
        seedCollection("testimonials", INIT_TESTIMONIALS),
        seedCollection("team",         INIT_TEAM),
        // ── one-time migration: patch missing bilingual fields ──────────────
        patchMissingFields("testimonials", INIT_TESTIMONIALS, "name", ["name_en", "course_en", "comment_en"]),
        patchMissingFields("trainers",     INIT_TRAINERS,     "name", ["name_en", "specialty_en", "bio_en"]),
        patchMissingFields("team",         INIT_TEAM,         "name", ["name_en", "role_en", "bio_en"]),
        patchMissingFields("news",         INIT_NEWS,         "title",["title_en", "excerpt_en", "tag_en"]),
      ]);
    })().catch((e) => { if (!cancelled) console.warn("Seed/patch failed:", e); });
    return () => { cancelled = true; };
  }, [currentUser?.id, currentUser?.role]);

  // ── COURSES ──────────────────────────────────────────
  const addCourse = async (form) => {
    const slug = form.title.toLowerCase().trim().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
    const parseLines = (v) => (String(v || "").split("\n").map(s => s.trim()).filter(Boolean));
    const parseFaq = (v) => {
      const lines = parseLines(v);
      const out = [];
      for (const line of lines) {
        const parts = line.split("|");
        const q = String(parts[0] || "").trim();
        const a = String(parts.slice(1).join("|") || "").trim();
        if (!q || !a) continue;
        out.push({ q, a });
      }
      return out;
    };
    const parseTechStack = (v) => {
      // Format per line:
      // Group label [| ai]: item1, item2, item3
      // Example:
      // Front-End: HTML, CSS, JS
      // أدوات AI | ai: Prompting, Gemini
      const out = [];
      for (const line of parseLines(v)) {
        const [lhsRaw, rhsRaw] = line.split(":");
        const lhs = String(lhsRaw || "").trim();
        const rhs = String((rhsRaw ?? "")).trim();
        if (!lhs || !rhs) continue;
        const lhsParts = lhs.split("|").map(s => s.trim()).filter(Boolean);
        const label = lhsParts[0] || "";
        const ai = lhsParts.slice(1).some(p => p.toLowerCase() === "ai");
        const items = rhs.split(",").map(s => s.trim()).filter(Boolean);
        if (!label || items.length === 0) continue;
        out.push({ label, items, ...(ai ? { ai: true } : {}) });
      }
      return out;
    };
    const parseCurriculum = (v) => {
      // Format per line:
      // Chapter title: lesson 1, lesson 2, lesson 3
      const out = [];
      for (const line of parseLines(v)) {
        const [lhsRaw, rhsRaw] = line.split(":");
        const title = String(lhsRaw || "").trim();
        const rhs = String((rhsRaw ?? "")).trim();
        if (!title || !rhs) continue;
        const lessons = rhs.split(",").map(s => s.trim()).filter(Boolean);
        if (lessons.length === 0) continue;
        out.push({ title, lessons });
      }
      return out;
    };
    const nc = {
      slug,
      title: form.title, title_en: form.title_en || form.title,
      trackId: form.trackId || "technology", subtracks: [],
      cat: form.cat || "tech",
      icon: form.icon || "📚",
      color: form.color || "#d91b5b",
      image: form.image || null,
      coverTitleInImage: !!form.coverTitleInImage,
      price: Number(form.price) || 0,
      installment: Math.round((Number(form.price) || 0) / 3),
      trainingTypes: form.trainingTypes || ["online"],
      duration: form.duration || "12 أسبوع",
      hours: Number(form.hours) || 60,
      projects: Number(form.projects) || 3,
      rating: 0, students: 0, featured: false, badge: null,
      tagline: form.tagline || form.title, tagline_en: form.tagline_en || form.tagline || form.title,
      desc: form.desc || "", desc_en: form.desc_en || form.desc || "",
      bullets: parseLines(form.bullets),
      bullets_en: parseLines(form.bullets_en),
      outcomes: parseLines(form.outcomes),
      outcomes_en: parseLines(form.outcomes_en),
      techStack: parseTechStack(form.techStackText),
      curriculum: parseCurriculum(form.curriculumText),
      reviews: [],
      who_ar: parseLines(form.who_ar),
      who_en: parseLines(form.who_en),
      faq_ar: parseFaq(form.faq_ar),
      faq_en: parseFaq(form.faq_en),
      instructorId: form.instructorId || null,
      presentationUrl: form.presentationUrl || null,
      introVideoUrl: form.introVideoUrl || null,
      previewVideoUrl: form.previewVideoUrl || null,
      priceCardVideoUrl: form.priceCardVideoUrl || null,
      priceCardImage: form.priceCardImage || null,
      freeLessonNote: form.freeLessonNote || "",
      upcomingSessionNote: form.upcomingSessionNote || "",
      sheetsTabName: form.sheetsTabName || slug,
      notifyEmails: Array.isArray(form.notifyEmails) ? form.notifyEmails : [],
    };
    await setDoc(doc(db, "courses", slug), nc);
    return slug;
  };

  const updateCourse = async (id, updates) => {
    await updateDoc(doc(db, "courses", id), updates);
  };

  const toggleFeatured = async (id) => {
    const c = courses.find(x => x.id === id);
    if (c) await updateDoc(doc(db, "courses", id), { featured: !c.featured });
  };

  const deleteCourse = async (id) => {
    await deleteDoc(doc(db, "courses", id));
  };

  // ── NEWS ─────────────────────────────────────────────
  const addNews = async (form) => {
    const tagEnMap = { إعلان: "Announcement", إنجاز: "Achievement", شراكة: "Partnership", تحديث: "Update", حدث: "Event" };
    const tag = form.tag || "إعلان";
    const nn = {
      title: form.title, title_en: form.title_en || form.title,
      tag, tag_en: form.tag_en || tagEnMap[tag] || tag,
      icon: null, images: form.images || [],
      excerpt: form.excerpt, excerpt_en: form.excerpt_en || form.excerpt,
      dateIso: form.dateIso || new Date().toISOString().slice(0, 10),
      date: new Date().toLocaleDateString("ar-EG", { day: "numeric", month: "long", year: "numeric" }),
      featured: form.featured || false,
    };
    await addDoc(collection(db, "news"), nn);
  };

  const deleteNews = async (id) => {
    await deleteDoc(doc(db, "news", String(id)));
  };

  // ── EXAMS ────────────────────────────────────────────
  const addExam = async (form) => {
    const lessonIndex = form.lessonIndex != null && form.lessonIndex !== "" ? Number(form.lessonIndex) : null;
    const ne = {
      title: form.title, courseId: form.courseId,
      type: form.type || "mcq", dueDate: form.dueDate,
      duration: Number(form.duration) || 45,
      description: form.description || "",
      questions: Array.isArray(form.questions) ? form.questions : [],
      submissions: [],
      ...(lessonIndex != null && !Number.isNaN(lessonIndex) ? { lessonIndex } : {}),
    };
    await addDoc(collection(db, "exams"), ne);
  };

  const deleteExam = async (id) => {
    await deleteDoc(doc(db, "exams", String(id)));
  };

  // ── TRAINERS ─────────────────────────────────────────
  const addTrainer = async (form) => {
    const nt = {
      name: form.name, name_en: form.name_en || form.name,
      username: form.username,
      specialty_ar: form.specialty_ar || "", specialty_en: form.specialty_en || "",
      bio_ar: form.bio_ar || "", bio_en: form.bio_en || "",
      avatar: form.name?.[0] || "T",
      courses: [], image: form.image || null,
    };
    await addDoc(collection(db, "trainers"), nt);
  };

  const updateTrainer = async (id, updates) => {
    await updateDoc(doc(db, "trainers", id), updates);
  };

  const deleteTrainer = async (id) => {
    await deleteDoc(doc(db, "trainers", id));
  };

  // ── PROGRAMS ─────────────────────────────────────────
  const addProgram = async (form) => {
    const np = {
      title_ar: form.title_ar || form.title_en,
      title_en: form.title_en || form.title_ar,
      desc_ar: form.desc_ar || "", desc_en: form.desc_en || "",
      image: form.image || null, featured: form.featured || false,
    };
    await addDoc(collection(db, "programs"), np);
  };

  const updateProgram = async (id, updates) => {
    await updateDoc(doc(db, "programs", id), updates);
  };

  const deleteProgram = async (id) => {
    await deleteDoc(doc(db, "programs", id));
  };

  // ── TESTIMONIALS ─────────────────────────────────────
  const addTestimonial = async (form) => {
    const nt = {
      name: form.name, name_en: form.name_en || form.name,
      course_ar: form.course_ar || "", course_en: form.course_en || "",
      comment_ar: form.comment_ar || form.comment || "",
      comment_en: form.comment_en || form.comment || "",
      rating: Number(form.rating) || 5,
      image: form.image || null, avatar: form.name?.[0] || "?",
    };
    await addDoc(collection(db, "testimonials"), nt);
  };

  const deleteTestimonial = async (id) => {
    await deleteDoc(doc(db, "testimonials", String(id)));
  };

  // ── TEAM ─────────────────────────────────────────────
  const addTeamMember = async (form) => {
    const nm = {
      name: form.name, name_en: form.name_en || form.name,
      role_ar: form.role_ar || "", role_en: form.role_en || "",
      bio_ar: form.bio_ar || "", bio_en: form.bio_en || "",
      email: form.email || "", linkedin: form.linkedin || "",
      image: form.image || null, avatar: form.name?.[0] || "?",
      order: team.length + 1,
    };
    await addDoc(collection(db, "team"), nm);
  };

  const updateTeamMember = async (id, updates) => {
    await updateDoc(doc(db, "team", id), updates);
  };

  const deleteTeamMember = async (id) => {
    await deleteDoc(doc(db, "team", id));
  };

  // ── Vodafone Cash setting ─────────────────────────────
  const setVodafoneCash = async (val) => {
    setVodafoneCashState(val);
    await setDoc(doc(db, "settings", "vodafoneCash"), { value: val });
  };

  // ── Category Icons (Corporate Programs + Services) ────
  const saveCategoryIcon = async (key, imageData) => {
    setCategoryIcons(prev => ({ ...prev, [key]: imageData }));
    await setDoc(doc(db, "settings", "categoryIcons"), { [key]: imageData }, { merge: true });
  };

  const deleteCategoryIcon = async (key) => {
    const next = { ...categoryIcons };
    delete next[key];
    setCategoryIcons(next);
    await setDoc(doc(db, "settings", "categoryIcons"), { [key]: null }, { merge: true });
  };

  return (
    <DataCtx.Provider value={{
      courses, news, exams, trainers, programs, testimonials, team, vodafoneCash, categoryIcons,
      addCourse, updateCourse, toggleFeatured, deleteCourse,
      addNews, deleteNews,
      addExam, deleteExam,
      addTrainer, updateTrainer, deleteTrainer,
      addProgram, updateProgram, deleteProgram,
      addTestimonial, deleteTestimonial,
      addTeamMember, updateTeamMember, deleteTeamMember,
      setVodafoneCash,
      saveCategoryIcon, deleteCategoryIcon,
    }}>
      {children}
    </DataCtx.Provider>
  );
}

export const useData = () => useContext(DataCtx);
