import { createContext, useContext, useState, useEffect } from "react";
import {
  collection,
  doc,
  getDocs,
  addDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
} from "firebase/firestore";
import { db } from "../firebase";
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

export function DataProvider({ children }) {
  const [courses,      setCourses]      = useState(INIT_COURSES);
  const [news,         setNews]         = useState(INIT_NEWS);
  const [exams,        setExams]        = useState(INIT_EXAMS);
  const [trainers,     setTrainers]     = useState(INIT_TRAINERS);
  const [programs,     setPrograms]     = useState(INIT_PROGRAMS);
  const [testimonials, setTestimonials] = useState(INIT_TESTIMONIALS);
  const [team,         setTeam]         = useState(INIT_TEAM);
  const [vodafoneCash, setVodafoneCashState] = useState(SITE.vodafoneCash);
  const [seeded,       setSeeded]       = useState(false);

  // ── Seed & subscribe to Firestore ────────────────────
  useEffect(() => {
    let unsubs = [];

    const init = async () => {
      // Seed initial data on first run
      await Promise.all([
        seedCollection("courses",      INIT_COURSES.map(c => ({ ...c, id: c.slug || c.id }))),
        seedCollection("news",         INIT_NEWS.map(n => ({ ...n, id: String(n.id) }))),
        seedCollection("exams",        INIT_EXAMS.map(e => ({ ...e, id: String(e.id) }))),
        seedCollection("trainers",     INIT_TRAINERS),
        seedCollection("programs",     INIT_PROGRAMS),
        seedCollection("testimonials", INIT_TESTIMONIALS),
        seedCollection("team",         INIT_TEAM),
      ]);
      setSeeded(true);

      // Real-time listeners
      unsubs.push(onSnapshot(collection(db, "courses"),      s => setCourses(s.docs.map(d => ({ id: d.id, ...d.data() })))));
      unsubs.push(onSnapshot(collection(db, "news"),         s => setNews(s.docs.map(d => ({ id: d.id, ...d.data() })))));
      unsubs.push(onSnapshot(collection(db, "exams"),        s => setExams(s.docs.map(d => ({ id: d.id, ...d.data() })))));
      unsubs.push(onSnapshot(collection(db, "trainers"),     s => setTrainers(s.docs.map(d => ({ id: d.id, ...d.data() })))));
      unsubs.push(onSnapshot(collection(db, "programs"),     s => setPrograms(s.docs.map(d => ({ id: d.id, ...d.data() })))));
      unsubs.push(onSnapshot(collection(db, "testimonials"), s => setTestimonials(s.docs.map(d => ({ id: d.id, ...d.data() })))));
      unsubs.push(onSnapshot(collection(db, "team"),         s => setTeam(s.docs.map(d => ({ id: d.id, ...d.data() })))));
    };

    init();
    return () => unsubs.forEach(u => u());
  }, []);

  // ── COURSES ──────────────────────────────────────────
  const addCourse = async (form) => {
    const slug = form.title.toLowerCase().trim().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
    const nc = {
      slug,
      title: form.title, title_en: form.title_en || form.title,
      trackId: form.trackId || "technology", subtracks: [],
      cat: form.cat || "tech",
      icon: form.icon || "📚",
      color: form.color || "#d91b5b",
      image: form.image || null,
      price: Number(form.price) || 0,
      installment: Math.round((Number(form.price) || 0) / 3),
      trainingTypes: form.trainingTypes || ["online"],
      duration: form.duration || "12 أسبوع",
      hours: Number(form.hours) || 60,
      projects: Number(form.projects) || 3,
      rating: 0, students: 0, featured: false, badge: null,
      tagline: form.tagline || form.title, tagline_en: form.tagline_en || form.tagline || form.title,
      desc: form.desc || "", desc_en: form.desc_en || form.desc || "",
      bullets: form.bullets ? form.bullets.split("\n").filter(Boolean) : [],
      bullets_en: form.bullets_en ? form.bullets_en.split("\n").filter(Boolean) : [],
      outcomes: form.outcomes ? form.outcomes.split("\n").filter(Boolean) : [],
      outcomes_en: form.outcomes_en ? form.outcomes_en.split("\n").filter(Boolean) : [],
      techStack: [], curriculum: [], reviews: [],
      instructorId: form.instructorId || null,
      presentationUrl: null,
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

  return (
    <DataCtx.Provider value={{
      courses, news, exams, trainers, programs, testimonials, team, vodafoneCash,
      addCourse, updateCourse, toggleFeatured, deleteCourse,
      addNews, deleteNews,
      addExam, deleteExam,
      addTrainer, updateTrainer, deleteTrainer,
      addProgram, updateProgram, deleteProgram,
      addTestimonial, deleteTestimonial,
      addTeamMember, updateTeamMember, deleteTeamMember,
      setVodafoneCash,
    }}>
      {children}
    </DataCtx.Provider>
  );
}

export const useData = () => useContext(DataCtx);
