const URL = String(import.meta.env.VITE_APPS_SCRIPT_ENROLL_URL || "").trim();
const API_KEY = String(import.meta.env.VITE_ENROLLMENT_API_KEY || "").trim();

export function enrollmentCrmConfigured() {
  return Boolean(URL);
}

/**
 * Submit CRM enrollment payload to Google Apps Script (text/plain body).
 * Sends apiKey in JSON + query string + X-API-Key when VITE_ENROLLMENT_API_KEY is set
 * (Apps Script validates body/query; header is best-effort).
 */
export async function submitEnrollmentCrm(payload) {
  if (!URL) {
    throw new Error("Enrollment endpoint not configured (set VITE_APPS_SCRIPT_ENROLL_URL in .env)");
  }

  const bodyObj = { ...payload };
  if (API_KEY) bodyObj.apiKey = API_KEY;

  const body = JSON.stringify(bodyObj);
  const sep = URL.includes("?") ? "&" : "?";
  const urlWithKey = API_KEY ? `${URL}${sep}apiKey=${encodeURIComponent(API_KEY)}` : URL;

  let res;
  try {
    res = await fetch(urlWithKey, {
      method: "POST",
      mode: "cors",
      headers: {
        "Content-Type": "text/plain;charset=UTF-8",
        ...(API_KEY ? { "X-API-Key": API_KEY } : {}),
      },
      body,
    });
  } catch (netErr) {
    const msg = netErr instanceof Error ? netErr.message : String(netErr);
    throw new Error(
      /Failed to fetch|NetworkError|load failed/i.test(msg)
        ? "تعذّر الاتصال بالخادم. تحقق من الإنترنت أو من رابط التسجيل."
        : msg,
    );
  }

  const rawText = await res.text();
  let data = null;
  if (rawText) {
    try {
      data = JSON.parse(rawText);
    } catch {
      throw new Error(
        res.ok
          ? "استجابة غير صالحة من الخادم"
          : `HTTP ${res.status}: ${rawText.slice(0, 160)}`,
      );
    }
  }

  if (!res.ok) {
    throw new Error(
      (data && data.message) || `HTTP ${res.status}: ${res.statusText || "Request failed"}`,
    );
  }

  if (!data || data.success !== true) {
    throw new Error((data && data.message) || "Request failed");
  }

  return data;
}
