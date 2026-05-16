const SESSION_KEY = "eduzah_utm";

/**
 * Reads UTM params from the current URL.
 * Persists to sessionStorage so they survive navigation to the register page.
 * On subsequent pages (no UTMs in URL), reads from sessionStorage.
 */
export function getUtmParams() {
  const params = new URLSearchParams(window.location.search);

  let stored = {};
  try {
    const s = sessionStorage.getItem(SESSION_KEY);
    if (s) stored = JSON.parse(s);
  } catch {}

  const utm = {
    utmSource:   params.get("utm_source")   || stored.utmSource   || "",
    utmMedium:   params.get("utm_medium")   || stored.utmMedium   || "",
    utmCampaign: params.get("utm_campaign") || stored.utmCampaign || "",
    utmContent:  params.get("utm_content")  || stored.utmContent  || "",
    utmTerm:     params.get("utm_term")     || stored.utmTerm     || "",
  };

  if (params.has("utm_source") || params.has("utm_campaign")) {
    try { sessionStorage.setItem(SESSION_KEY, JSON.stringify(utm)); } catch {}
  }

  return utm;
}

/** Maps utm_source value to the "عرفتنا منين؟" dropdown options */
export function utmSourceToBookingVia(utmSource) {
  const s = (utmSource || "").toLowerCase();
  if (s.includes("facebook") || s.includes("fb") || s.includes("instagram") || s.includes("ig")) return "Facebook / Instagram";
  if (s.includes("google"))   return "Google";
  if (s.includes("youtube"))  return "YouTube";
  if (s.includes("tiktok"))   return "TikTok";
  if (s.includes("friend"))   return "friend";
  return "";
}

/** Fire a Facebook Pixel event safely */
export function trackFbEvent(event, data = {}) {
  try { window.fbq?.("track", event, data); } catch {}
}
