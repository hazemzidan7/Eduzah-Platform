import * as XLSX from "xlsx";

/** Trim keys and strip BOM so Arabic headers like "اسم الموظف" match after Excel export. */
export function normalizeRowKeys(row) {
  return Object.fromEntries(
    Object.entries(row).map(([k, v]) => [String(k).replace(/^\uFEFF/, "").trim(), v]),
  );
}

export async function readFirstSheetRows(file) {
  const buf = await file.arrayBuffer();
  const wb = XLSX.read(buf, { type: "array" });
  const sheet = wb.Sheets[wb.SheetNames[0]];
  const raw = XLSX.utils.sheet_to_json(sheet, { defval: "" });
  return raw.map(normalizeRowKeys);
}

export function str(v) {
  if (v == null) return "";
  if (typeof v === "number" && Number.isFinite(v)) return String(v);
  return String(v).trim();
}

export function num(v) {
  if (v == null || v === "") return 0;
  if (typeof v === "number" && Number.isFinite(v)) return v;
  let s = String(v).replace(/,/g, "").replace(/\s/g, "").trim().replace(/\u2212/g, "-");
  let neg = false;
  if (s.startsWith("(") && s.endsWith(")")) {
    neg = true;
    s = s.slice(1, -1).trim();
  }
  if (s.endsWith("-")) {
    neg = !neg;
    s = s.slice(0, -1);
  }
  if (s.startsWith("-")) {
    neg = !neg;
    s = s.slice(1);
  }
  const n = Number(s);
  if (!Number.isFinite(n)) return 0;
  return neg ? -Math.abs(n) : n;
}

/** First non-empty value for any of the given keys (Excel column headers). */
export function pick(row, ...keys) {
  for (const k of keys) {
    if (k in row && row[k] != null && str(row[k]) !== "") return row[k];
  }
  return "";
}

export function parseBoolAr(v) {
  const s = str(v).toLowerCase();
  return s === "نعم" || s === "yes" || s === "true" || s === "1" || s === "y";
}

export function matchRoundId(rounds, roundNameOrId) {
  const s = str(roundNameOrId);
  if (!s) return "";
  const byId = rounds.find((r) => String(r.id) === s);
  if (byId) return byId.id;
  const byName = rounds.find((r) => str(r.name) === s);
  if (byName) return byName.id;
  const loose = rounds.find((r) => str(r.name).includes(s) || s.includes(str(r.name)));
  return loose ? loose.id : "";
}

export function todayDate() {
  return new Date().toISOString().slice(0, 10);
}
