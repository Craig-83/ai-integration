"use client";

import { useEffect, useState, type ReactNode } from "react";
import { SEVERITY_LABEL } from "@/lib/roster/engine";
import type { Flag, Severity, Staff } from "@/lib/roster/types";

export const SEV_COLOR: Record<Severity, string> = {
  critical: "var(--rg-critical)",
  high: "var(--rg-high)",
  medium: "var(--rg-medium)",
  low: "var(--rg-low)",
};
export const SEV_BG: Record<Severity, string> = {
  critical: "var(--rg-critical-bg)",
  high: "var(--rg-high-bg)",
  medium: "var(--rg-medium-bg)",
  low: "var(--rg-low-bg)",
};

export const money = (n: number, cents = false) =>
  `${n < 0 ? "-" : ""}$${Math.abs(n).toLocaleString("en-AU", {
    minimumFractionDigits: cents ? 2 : 0,
    maximumFractionDigits: cents ? 2 : 0,
  })}`;

export const signedMoney = (n: number) => (Math.round(n) === 0 ? "$0" : `${n > 0 ? "+" : "-"}${money(Math.abs(n))}`);

export function initials(name: string) {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return "?";
  const first = (w: string) => Array.from(w)[0] ?? "";
  // One word ("Jo") or a CJK name gets one initial, not the same letter twice
  if (words.length === 1) return first(words[0]).toUpperCase();
  return (first(words[0]) + first(words[words.length - 1])).toUpperCase();
}

const TYPE_HUE: Record<Staff["type"], string> = {
  FT: "#1f3a68",
  PT: "#3d7a5f",
  CAS: "#7a5aa6",
};

export function Avatar({
  staff,
  size = "md",
  flag,
  title,
}: {
  staff: Staff;
  size?: "sm" | "md" | "lg";
  flag?: Severity | null;
  title?: string;
}) {
  return (
    <span
      className={`rg-avatar ${size === "md" ? "" : size}`}
      style={{ background: TYPE_HUE[staff.type] }}
      title={title ?? staff.name}
    >
      {initials(staff.name)}
      {flag && <span className="rg-avatar-flag" style={{ background: SEV_COLOR[flag] }} />}
    </span>
  );
}

export function SevBadge({ severity }: { severity: Severity }) {
  return (
    <span className="rg-sev" style={{ background: SEV_BG[severity], color: SEV_COLOR[severity] }}>
      <span className="rg-dot" style={{ background: SEV_COLOR[severity] }} />
      {SEVERITY_LABEL[severity]}
    </span>
  );
}

export function FlagCard({ flag, children }: { flag: Flag; children?: ReactNode }) {
  return (
    <div className="rg-flag" style={{ ["--c" as string]: SEV_COLOR[flag.severity] }}>
      <div className="rg-flag-title">
        <span style={{ flex: 1 }}>{flag.title}</span>
        <SevBadge severity={flag.severity} />
      </div>
      <div className="rg-flag-detail">{flag.detail}</div>
      {children && <div className="rg-flag-actions">{children}</div>}
    </div>
  );
}

export function MiniFlag({ flag }: { flag: Flag }) {
  return (
    <div className="rg-mini-flag" style={{ color: SEV_COLOR[flag.severity] }}>
      <span className="rg-dot" style={{ background: SEV_COLOR[flag.severity], marginTop: 5 }} />
      <span>{flag.title}</span>
    </div>
  );
}

export function Bar({ value, max, color }: { value: number; max: number; color?: string }) {
  const pct = Math.min(100, (value / Math.max(max, 1)) * 100);
  const over = value > max;
  return (
    <div className="rg-bar">
      <span style={{ transform: `scaleX(${pct / 100})`, background: color ?? (over ? "var(--rg-critical)" : pct > 95 ? "var(--rg-medium)" : "var(--rg-ok)") }} />
    </div>
  );
}

export function Switch({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <button type="button" role="switch" aria-checked={checked} aria-label={label} className="rg-switch" onClick={() => onChange(!checked)} />
  );
}

export type IconName = keyof typeof PATHS;

export function Icon({ name, size = 16 }: { name: IconName; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {PATHS[name]}
    </svg>
  );
}

const PATHS = {
  sparkles: (
    <>
      <path d="M12 3l1.8 4.7L18.5 9.5l-4.7 1.8L12 16l-1.8-4.7L5.5 9.5l4.7-1.8z" />
      <path d="M19 15l.8 2.2L22 18l-2.2.8L19 21l-.8-2.2L16 18l2.2-.8z" />
    </>
  ),
  shield: <path d="M12 3l8 3v6c0 4.5-3.4 8.3-8 9-4.6-.7-8-4.5-8-9V6z" />,
  check: <path d="M20 6L9 17l-5-5" />,
  x: (
    <>
      <path d="M18 6L6 18" />
      <path d="M6 6l12 12" />
    </>
  ),
  undo: (
    <>
      <path d="M9 14L4 9l5-5" />
      <path d="M4 9h11a5 5 0 010 10h-3" />
    </>
  ),
  redo: (
    <>
      <path d="M15 14l5-5-5-5" />
      <path d="M20 9H9a5 5 0 000 10h3" />
    </>
  ),
  play: <path d="M7 4l13 8-13 8z" />,
  swap: (
    <>
      <path d="M7 4L3 8l4 4" />
      <path d="M3 8h14" />
      <path d="M17 20l4-4-4-4" />
      <path d="M21 16H7" />
    </>
  ),
  plus: (
    <>
      <path d="M12 5v14" />
      <path d="M5 12h14" />
    </>
  ),
  trash: (
    <>
      <path d="M4 7h16" />
      <path d="M10 11v6" />
      <path d="M14 11v6" />
      <path d="M6 7l1 13h10l1-13" />
      <path d="M9 7V4h6v3" />
    </>
  ),
  wand: (
    <>
      <path d="M15 4V2" />
      <path d="M15 10V8" />
      <path d="M11 6h2" />
      <path d="M17 6h2" />
      <path d="M3 21l12-12" />
    </>
  ),
  users: (
    <>
      <circle cx="9" cy="8" r="3.5" />
      <path d="M2.5 20c0-3.6 2.9-6 6.5-6s6.5 2.4 6.5 6" />
      <path d="M16 4.5a3.5 3.5 0 010 7" />
      <path d="M18 14c2.2.6 3.5 2.6 3.5 6" />
    </>
  ),
  alert: (
    <>
      <path d="M12 3l9.5 17h-19z" />
      <path d="M12 10v4" />
      <path d="M12 17.5v.5" />
    </>
  ),
  reset: (
    <>
      <path d="M3 12a9 9 0 109-9 9.5 9.5 0 00-6.7 2.8L3 8" />
      <path d="M3 3v5h5" />
    </>
  ),
  chevron: <path d="M6 9l6 6 6-6" />,
  grid: (
    <>
      <rect x="3" y="3" width="7" height="7" rx="1.5" />
      <rect x="14" y="3" width="7" height="7" rx="1.5" />
      <rect x="3" y="14" width="7" height="7" rx="1.5" />
      <rect x="14" y="14" width="7" height="7" rx="1.5" />
    </>
  ),
  clock: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </>
  ),
  more: (
    <>
      <circle cx="5" cy="12" r="1.5" />
      <circle cx="12" cy="12" r="1.5" />
      <circle cx="19" cy="12" r="1.5" />
    </>
  ),
  calendar: (
    <>
      <rect x="3" y="5" width="18" height="16" rx="2" />
      <path d="M3 10h18" />
      <path d="M8 3v4" />
      <path d="M16 3v4" />
    </>
  ),
  building: (
    <>
      <rect x="5" y="3" width="14" height="18" rx="1" />
      <path d="M9 7h1" />
      <path d="M14 7h1" />
      <path d="M9 11h1" />
      <path d="M14 11h1" />
      <path d="M9 15h1" />
      <path d="M14 15h1" />
      <path d="M11 21v-3h2v3" />
    </>
  ),
  chart: (
    <>
      <path d="M4 20V10" />
      <path d="M10 20V4" />
      <path d="M16 20v-7" />
      <path d="M22 20H2" />
    </>
  ),
  badge: (
    <>
      <rect x="4" y="3" width="16" height="18" rx="2" />
      <circle cx="12" cy="10" r="3" />
      <path d="M8 17c.8-1.5 2.2-2.2 4-2.2s3.2.7 4 2.2" />
    </>
  ),
};


/** True below the phone breakpoint. Starts false so server and first client render match. */
export function useNarrow(query = "(max-width: 760px)") {
  const [narrow, setNarrow] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia(query);
    const on = () => setNarrow(mq.matches);
    on();
    mq.addEventListener("change", on);
    return () => mq.removeEventListener("change", on);
  }, [query]);
  return narrow;
}
