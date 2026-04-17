/** Canonical `course.cat` values stored in Firestore. */
export const COURSE_CATEGORIES = ["tech", "management", "english", "kids"];

const LABELS = {
  tech: { ar: "تكنولوجيا", en: "Technology" },
  management: { ar: "إدارة", en: "Management" },
  english: { ar: "اللغة الإنجليزية", en: "English language" },
  kids: { ar: "تدريب الأطفال", en: "Children training" },
};

/** Legacy slugs from older admin UI / quizzes → canonical slug. */
const LEGACY_CAT_MAP = {
  hr: "management",
  leadership: "management",
  soft: "english",
  children: "kids",
  design: "tech",
};

export function normalizeCourseCategory(cat) {
  if (cat == null || cat === "") return "tech";
  const c = String(cat).trim().toLowerCase();
  if (COURSE_CATEGORIES.includes(c)) return c;
  return LEGACY_CAT_MAP[c] || "tech";
}

export function courseCategoryLabel(cat, lang) {
  const key = normalizeCourseCategory(cat);
  const L = LABELS[key] || LABELS.tech;
  return lang === "ar" ? L.ar : L.en;
}

export function courseCategorySelectOptions(lang) {
  return COURSE_CATEGORIES.map((v) => ({
    v,
    l: courseCategoryLabel(v, lang),
  }));
}
