/** Canonical `lead.leadSource` values — a fixed list, not free text. */
export const LEAD_SOURCES = [
  "facebook_ads", "instagram", "tiktok", "whatsapp", "messenger",
  "walk_in", "phone_call", "referral", "ambassador", "workshop", "website", "other",
];

const LABELS = {
  facebook_ads: { ar: "إعلانات فيسبوك",     en: "Facebook Ads" },
  instagram:    { ar: "انستجرام",           en: "Instagram" },
  tiktok:       { ar: "تيك توك",            en: "TikTok" },
  whatsapp:     { ar: "واتساب",             en: "WhatsApp" },
  messenger:    { ar: "ماسنجر",             en: "Messenger" },
  walk_in:      { ar: "زيارة مباشرة",        en: "Walk-in" },
  phone_call:   { ar: "مكالمة هاتفية",       en: "Phone Call" },
  referral:     { ar: "إحالة",              en: "Referral" },
  ambassador:   { ar: "سفير",               en: "Ambassador" },
  workshop:     { ar: "ورشة عمل",           en: "Workshop" },
  website:      { ar: "الموقع الإلكتروني",   en: "Website" },
  other:        { ar: "أخرى",               en: "Other" },
};

export function normalizeLeadSource(source) {
  if (source == null || source === "") return "other";
  const s = String(source).trim().toLowerCase();
  return LEAD_SOURCES.includes(s) ? s : "other";
}

export function leadSourceLabel(source, lang) {
  const key = normalizeLeadSource(source);
  const L = LABELS[key] || LABELS.other;
  return lang === "ar" ? L.ar : L.en;
}

export function leadSourceSelectOptions(lang) {
  return LEAD_SOURCES.map((v) => ({
    v,
    l: leadSourceLabel(v, lang),
  }));
}
