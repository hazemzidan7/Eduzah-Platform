import { C } from "../theme";

/** Canonical `lead.status` values stored in Firestore. */
export const LEAD_STATUSES = ["new", "contacted", "interested", "follow_up", "deposit_paid", "converted", "lost"];

const LABELS = {
  new:          { ar: "جديد",             en: "New" },
  contacted:    { ar: "تم التواصل",        en: "Contacted" },
  interested:   { ar: "مهتم",              en: "Interested" },
  follow_up:    { ar: "متابعة",            en: "Follow-up" },
  deposit_paid: { ar: "تم دفع العربون",    en: "Deposit Paid" },
  converted:    { ar: "تم التحويل لطالب",  en: "Converted" },
  lost:         { ar: "خسارة",             en: "Lost" },
};

/** Badge color per status. `new` has no brand token (neutral/unworked state), the rest reuse theme.js `C`. */
const COLORS = {
  new:          "#9ca3af",
  contacted:    C.purple,
  interested:   C.orange,
  follow_up:    C.warning,
  deposit_paid: C.success,
  converted:    C.red,
  lost:         C.danger,
};

export function normalizeLeadStatus(status) {
  if (status == null || status === "") return "new";
  const s = String(status).trim().toLowerCase();
  return LEAD_STATUSES.includes(s) ? s : "new";
}

export function leadStatusLabel(status, lang) {
  const key = normalizeLeadStatus(status);
  const L = LABELS[key] || LABELS.new;
  return lang === "ar" ? L.ar : L.en;
}

export function leadStatusColor(status) {
  return COLORS[normalizeLeadStatus(status)] || COLORS.new;
}

export function leadStatusSelectOptions(lang) {
  return LEAD_STATUSES.map((v) => ({
    v,
    l: leadStatusLabel(v, lang),
  }));
}
