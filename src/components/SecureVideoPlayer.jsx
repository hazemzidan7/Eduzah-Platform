import { useRef, useEffect } from "react";

/**
 * Best-effort learner protections for embedded or HTML5 video.
 * True DRM / HLS signing requires a backend (e.g. Cloudflare Stream, Mux).
 */
export default function SecureVideoPlayer({ children, watermarkText, ariaLabel }) {
  const wrapRef = useRef(null);

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const blockMenu = (e) => e.preventDefault();
    el.addEventListener("contextmenu", blockMenu);
    return () => el.removeEventListener("contextmenu", blockMenu);
  }, []);

  useEffect(() => {
    const onVis = () => {
      if (document.hidden) {
        const v = wrapRef.current?.querySelector("video");
        if (v) v.pause();
      }
    };
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, []);

  return (
    <div
      ref={wrapRef}
      role="region"
      aria-label={ariaLabel || "Video lesson"}
      style={{ position: "relative", width: "100%", height: "100%", minHeight: 200 }}
    >
      {children}
      {watermarkText ? (
        <div
          aria-hidden
          style={{
            position: "absolute",
            inset: "auto 8px 8px 8px",
            pointerEvents: "none",
            fontSize: 10,
            fontWeight: 700,
            color: "rgba(255,255,255,.45)",
            textShadow: "0 0 6px #000, 0 1px 2px #000",
            lineHeight: 1.3,
            wordBreak: "break-all",
          }}
        >
          {watermarkText}
        </div>
      ) : null}
    </div>
  );
}
