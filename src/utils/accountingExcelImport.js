import * as XLSX from "xlsx";

export async function readFirstSheetRows(file) {
  const buf = await file.arrayBuffer();
  const wb = XLSX.read(buf, { type: "array" });
  const sheet = wb.Sheets[wb.SheetNames[0]];
  return XLSX.utils.sheet_to_json(sheet, { defval: "" });
}

export function str(v) {
  if (v == null) return "";
  if (typeof v === "number" && Number.isFinite(v)) return String(v);
  return String(v).trim();
}

export function num(v) {
  const n = Number(String(v).replace(/,/g, "").replace(/\s/g, "").trim());
  return Number.isFinite(n) ? n : 0;
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
