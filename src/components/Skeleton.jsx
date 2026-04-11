/** Lightweight skeleton block — no extra deps */
export function Skeleton({ w = "100%", h = 14, r = 8, style = {} }) {
  return (
    <span
      aria-hidden
      style={{
        display: "inline-block",
        width: w,
        height: h,
        borderRadius: r,
        background: "linear-gradient(90deg,rgba(255,255,255,.06) 25%,rgba(255,255,255,.14) 40%,rgba(255,255,255,.06) 55%)",
        backgroundSize: "200% 100%",
        animation: "sk 1.1s ease-in-out infinite",
        ...style,
      }}
    />
  );
}

export function SkeletonStyles() {
  return (
    <style>{`
      @keyframes sk {
        0% { background-position: 200% 0; }
        100% { background-position: -200% 0; }
      }
    `}</style>
  );
}
