import { createContext, useContext, useState } from "react";
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

export function DataProvider({ children }) {
  const [courses,      setCourses]      = useState(INIT_COURSES);
  const [news,         setNews]         = useState(INIT_NEWS);
  const [exams,        setExams]        = useState(INIT_EXAMS);
  const [trainers,     setTrainers]     = useState(INIT_TRAINERS);
  const [programs,     setPrograms]     = useState(INIT_PROGRAMS);
  const [testimonials, setTestimonials] = useState(INIT_TESTIMONIALS);
  const [team,         setTeam]         = useState(INIT_TEAM);
  const [vodafoneCash, setVodafoneCash] = useState(SITE.vodafoneCash);

  // ── COURSES ──────────────────────────────────────────
  const addCourse = (form) => {
    const slug = form.title.toLowerCase().trim().replace(/\s+/g,"-").replace(/[^a-z0-9-]/g,"");
    const nc = {
      id: slug, slug,
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
      tagline: form.tagline || form.title, tagline_en: form.tagline_en || form.title,
      desc: form.desc || "", desc_en: form.desc_en || form.desc || "",
      bullets: form.bullets ? form.bullets.split("\n").filter(Boolean) : [],
      outcomes: form.outcomes ? form.outcomes.split("\n").filter(Boolean) : [],
      techStack: [], curriculum: [], reviews: [],
      instructorId: form.instructorId || null,
      presentationUrl: null,
    };
    setCourses(p => [...p, nc]);
    return slug;
  };

  const updateCourse = (id, updates) =>
    setCourses(p => p.map(c => c.id === id ? { ...c, ...updates } : c));

  const toggleFeatured = (id) =>
    setCourses(p => p.map(c => c.id === id ? { ...c, featured: !c.featured } : c));

  const deleteCourse = (id) =>
    setCourses(p => p.filter(c => c.id !== id));

  // ── NEWS ─────────────────────────────────────────────
  const addNews = (form) => {
    const nn = {
      id: Date.now(),
      title: form.title, title_en: form.title_en || form.title,
      tag: form.tag || "إعلان",
      icon: form.icon || "📢",
      images: form.images || [],
      excerpt: form.excerpt,
      date: new Date().toLocaleDateString("ar-EG", { day:"numeric", month:"long", year:"numeric" }),
      featured: form.featured || false,
    };
    setNews(p => [...p, nn]);
  };

  const deleteNews = (id) => setNews(p => p.filter(n => n.id !== id));

  // ── EXAMS ────────────────────────────────────────────
  const addExam = (form) => {
    const ne = {
      id: Date.now(),
      title: form.title, courseId: form.courseId,
      type: form.type || "mcq",
      dueDate: form.dueDate,
      duration: Number(form.duration) || 45,
      description: form.description || "",
      questions: [], submissions: [],
    };
    setExams(p => [...p, ne]);
  };

  const deleteExam = (id) => setExams(p => p.filter(e => e.id !== id));

  // ── TRAINERS ─────────────────────────────────────────
  const addTrainer = (form) => {
    const nt = {
      id: `t${Date.now()}`,
      name: form.name, name_en: form.name_en || form.name,
      username: form.username, password: form.password,
      specialty_ar: form.specialty_ar || "", specialty_en: form.specialty_en || "",
      bio_ar: form.bio_ar || "", bio_en: form.bio_en || "",
      avatar: form.name?.[0] || "T",
      courses: [], image: form.image || null,
    };
    setTrainers(p => [...p, nt]);
  };

  const updateTrainer = (id, updates) =>
    setTrainers(p => p.map(t => t.id === id ? { ...t, ...updates } : t));

  const deleteTrainer = (id) =>
    setTrainers(p => p.filter(t => t.id !== id));

  // ── PROGRAMS ─────────────────────────────────────────
  const addProgram = (form) => {
    const np = {
      id: `prog-${Date.now()}`,
      title_ar: form.title_ar || form.title_en,
      title_en: form.title_en || form.title_ar,
      desc_ar: form.desc_ar || "",
      desc_en: form.desc_en || "",
      image: form.image || null,
      featured: form.featured || false,
    };
    setPrograms(p => [...p, np]);
  };

  const updateProgram = (id, updates) =>
    setPrograms(p => p.map(pr => pr.id === id ? { ...pr, ...updates } : pr));

  const deleteProgram = (id) =>
    setPrograms(p => p.filter(pr => pr.id !== id));

  // ── TESTIMONIALS ─────────────────────────────────────
  const addTestimonial = (form) => {
    const nt = {
      id: `te-${Date.now()}`,
      name: form.name, name_en: form.name_en || form.name,
      course_ar: form.course_ar || "", course_en: form.course_en || "",
      comment_ar: form.comment_ar || form.comment || "",
      comment_en: form.comment_en || form.comment || "",
      rating: Number(form.rating) || 5,
      image: form.image || null,
      avatar: form.name?.[0] || "?",
    };
    setTestimonials(p => [...p, nt]);
  };

  const deleteTestimonial = (id) =>
    setTestimonials(p => p.filter(t => t.id !== id));

  // ── TEAM ─────────────────────────────────────────────
  const addTeamMember = (form) => {
    const nm = {
      id: `tm-${Date.now()}`,
      name: form.name, name_en: form.name_en || form.name,
      role_ar: form.role_ar || "", role_en: form.role_en || "",
      bio_ar: form.bio_ar || "", bio_en: form.bio_en || "",
      email: form.email || "",
      linkedin: form.linkedin || "",
      image: form.image || null,
      avatar: form.name?.[0] || "?",
      order: team.length + 1,
    };
    setTeam(p => [...p, nm]);
  };

  const updateTeamMember = (id, updates) =>
    setTeam(p => p.map(m => m.id === id ? { ...m, ...updates } : m));

  const deleteTeamMember = (id) =>
    setTeam(p => p.filter(m => m.id !== id));

  return (
    <DataCtx.Provider value={{
      // data
      courses, news, exams, trainers, programs, testimonials, team, vodafoneCash,
      // courses
      addCourse, updateCourse, toggleFeatured, deleteCourse,
      // news
      addNews, deleteNews,
      // exams
      addExam, deleteExam,
      // trainers
      addTrainer, updateTrainer, deleteTrainer,
      // programs
      addProgram, updateProgram, deleteProgram,
      // testimonials
      addTestimonial, deleteTestimonial,
      // team
      addTeamMember, updateTeamMember, deleteTeamMember,
      // settings
      setVodafoneCash,
    }}>
      {children}
    </DataCtx.Provider>
  );
}

export const useData = () => useContext(DataCtx);
