/**
 * Lightweight SVG-based charts — zero external dependencies.
 * Components: BarChart, DonutChart, LineSparkline, StatCard
 */
import { useRef } from "react";
import { C, font } from "../theme";
import { useInView } from "../hooks/useInView";

/* ── helpers ── */
const fmt = (n) => Number(n) >= 1000 ? `${(n / 1000).toFixed(1)}k` : String(n);

/* ─────────────────────────────────────────────
   StatCard
   ─────────────────────────────────────────────*/
export function StatCard({ label, value, icon, color = C.red, change, sub }) {
  const isPos = change > 0;
  return (
    <div style={{
      background: "rgba(50,29,61,.58)",
      border: `1px solid ${C.border}`,
      borderRadius: 18,
      padding: "20px 22px",
      backdropFilter: "blur(12px)",
      position: "relative",
      overflow: "hidden",
    }}>
      {/* background glow */}
      <div style={{
        position: "absolute", top: -20, insetInlineEnd: -20,
        width: 90, height: 90,
        borderRadius: "50%",
        background: `radial-gradient(circle,${color}22,transparent 70%)`,
        pointerEvents: "none",
      }} />

      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 10 }}>
        <div style={{
          width: 42, height: 42,
          borderRadius: 12,
          background: `${color}22`,
          border: `1px solid ${color}44`,
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 20,
        }}>
          {icon}
        </div>
        {change != null && (
          <span style={{
            fontSize: 11, fontWeight: 700, fontFamily: font,
            color: isPos ? C.success : C.danger,
            background: isPos ? `${C.success}18` : `${C.danger}18`,
            border: `1px solid ${isPos ? C.success : C.danger}44`,
            borderRadius: 6, padding: "3px 8px",
          }}>
            {isPos ? "↑" : "↓"} {Math.abs(change)}%
          </span>
        )}
      </div>

      <div style={{ fontFamily: font, fontWeight: 900, fontSize: 28, lineHeight: 1, color, marginBottom: 4 }}>
        {fmt(value)}
      </div>
      <div style={{ fontFamily: font, fontWeight: 600, fontSize: 13, color: "rgba(255,255,255,.72)" }}>
        {label}
      </div>
      {sub && (
        <div style={{ fontFamily: font, fontSize: 11, color: "rgba(255,255,255,.45)", marginTop: 4 }}>
          {sub}
        </div>
      )}
    </div>
  );
}

/* ─────────────────────────────────────────────
   BarChart  (horizontal)
   data = [{ label, value, color? }]
   ─────────────────────────────────────────────*/
export function BarChart({ data = [], title, color = C.red, height = 280 }) {
  const [ref, inView] = useInView({ threshold: 0.1 });
  const max = Math.max(1, ...data.map(d => d.value));
  const barH = Math.max(16, Math.floor((height - 48) / Math.max(data.length, 1)) - 8);

  return (
    <div ref={ref} style={{
      background: "rgba(50,29,61,.58)",
      border: `1px solid ${C.border}`,
      borderRadius: 18,
      padding: "20px 22px",
      backdropFilter: "blur(12px)",
    }}>
      {title && (
        <div style={{ fontFamily: font, fontWeight: 800, fontSize: 14, marginBottom: 18, color: "#fff" }}>
          {title}
        </div>
      )}
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {data.slice(0, 8).map((d, i) => {
          const pct = inView ? Math.round((d.value / max) * 100) : 0;
          const col = d.color || color;
          return (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{
                width: 110, minWidth: 110,
                fontFamily: font, fontSize: 11, fontWeight: 600,
                color: "rgba(255,255,255,.72)",
                overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                textAlign: "end",
              }}>
                {d.label}
              </div>
              <div style={{
                flex: 1, height: barH, borderRadius: barH,
                background: "rgba(255,255,255,.06)",
                overflow: "hidden",
                position: "relative",
              }}>
                <div style={{
                  position: "absolute", top: 0, bottom: 0, left: 0,
                  width: `${pct}%`,
                  background: `linear-gradient(90deg,${col},${col}bb)`,
                  borderRadius: barH,
                  transition: `width .8s cubic-bezier(.4,0,.2,1) ${i * 0.07}s`,
                  boxShadow: `0 0 12px ${col}44`,
                }} />
              </div>
              <div style={{
                width: 36, minWidth: 36,
                fontFamily: font, fontSize: 12, fontWeight: 800,
                color: col, textAlign: "start",
              }}>
                {d.value}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────
   DonutChart
   data = [{ label, value, color }]
   ─────────────────────────────────────────────*/
export function DonutChart({ data = [], title, size = 160 }) {
  const [ref, inView] = useInView({ threshold: 0.1 });
  const total = data.reduce((s, d) => s + d.value, 0) || 1;
  const r = size / 2 - 14;
  const cx = size / 2;
  const cy = size / 2;
  const strokeW = 24;

  let offset = 0;
  const slices = data.map((d) => {
    const pct = d.value / total;
    const len = pct * 2 * Math.PI * r;
    const gap = 0;
    const slice = { ...d, pct, dasharray: `${inView ? len - gap : 0} ${2 * Math.PI * r - len + gap}`, dashoffset: -(offset * 2 * Math.PI * r), start: offset };
    offset += pct;
    return slice;
  });

  return (
    <div ref={ref} style={{
      background: "rgba(50,29,61,.58)",
      border: `1px solid ${C.border}`,
      borderRadius: 18,
      padding: "20px 22px",
      backdropFilter: "blur(12px)",
    }}>
      {title && (
        <div style={{ fontFamily: font, fontWeight: 800, fontSize: 14, marginBottom: 18, color: "#fff" }}>
          {title}
        </div>
      )}
      <div style={{ display: "flex", alignItems: "center", gap: 24, flexWrap: "wrap" }}>
        <svg width={size} height={size} style={{ flexShrink: 0 }}>
          {/* track */}
          <circle cx={cx} cy={cy} r={r} fill="none" stroke="rgba(255,255,255,.06)" strokeWidth={strokeW} />
          {slices.map((s, i) => (
            <circle
              key={i}
              cx={cx}
              cy={cy}
              r={r}
              fill="none"
              stroke={s.color}
              strokeWidth={strokeW}
              strokeDasharray={s.dasharray}
              strokeDashoffset={s.dashoffset}
              strokeLinecap="butt"
              style={{
                transition: `stroke-dasharray .9s cubic-bezier(.4,0,.2,1) ${i * 0.12}s`,
                transformOrigin: `${cx}px ${cy}px`,
                transform: "rotate(-90deg)",
              }}
            />
          ))}
          {/* center label */}
          <text x={cx} y={cy - 6} textAnchor="middle" fill="#fff" fontFamily={font} fontWeight={900} fontSize={22}>{total}</text>
          <text x={cx} y={cy + 14} textAnchor="middle" fill="rgba(255,255,255,.55)" fontFamily={font} fontWeight={600} fontSize={11}>total</text>
        </svg>

        {/* legend */}
        <div style={{ display: "flex", flexDirection: "column", gap: 8, flex: 1, minWidth: 100 }}>
          {slices.map((s, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <div style={{ width: 10, height: 10, borderRadius: 3, background: s.color, flexShrink: 0 }} />
              <div style={{ fontFamily: font, fontSize: 12, color: "rgba(255,255,255,.72)", flex: 1 }}>{s.label}</div>
              <div style={{ fontFamily: font, fontSize: 12, fontWeight: 800, color: s.color }}>{s.value}</div>
              <div style={{ fontFamily: font, fontSize: 11, color: "rgba(255,255,255,.4)" }}>
                {Math.round(s.pct * 100)}%
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────
   LineSparkline  — tiny trend line
   data = number[]
   ─────────────────────────────────────────────*/
export function LineSparkline({ data = [], color = C.red, w = 120, h = 40, label }) {
  if (data.length < 2) return null;
  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;
  const stepX = w / (data.length - 1);

  const points = data.map((v, i) => [
    i * stepX,
    h - ((v - min) / range) * (h - 8) - 4,
  ]);
  const path = points.map((p, i) => `${i === 0 ? "M" : "L"}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(" ");
  const area = `${path} L${(data.length - 1) * stepX},${h} L0,${h} Z`;

  return (
    <div style={{ display: "inline-flex", flexDirection: "column", alignItems: "center", gap: 2 }}>
      <svg width={w} height={h} style={{ overflow: "visible" }}>
        <defs>
          <linearGradient id={`sg-${color.replace(/[^a-z0-9]/gi, "")}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.35" />
            <stop offset="100%" stopColor={color} stopOpacity="0.02" />
          </linearGradient>
        </defs>
        <path d={area} fill={`url(#sg-${color.replace(/[^a-z0-9]/gi, "")})`} />
        <path d={path} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        <circle cx={points[points.length - 1][0]} cy={points[points.length - 1][1]} r={3} fill={color} />
      </svg>
      {label && <div style={{ fontFamily: font, fontSize: 10, color: "rgba(255,255,255,.45)" }}>{label}</div>}
    </div>
  );
}
