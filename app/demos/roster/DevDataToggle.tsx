"use client";

import { useEffect, useState } from "react";

/**
 * Dev-only data switcher (break-ui). Flips the roster between the demo data and
 * the stress fixtures in lib/roster/seed-worst.ts via ?data=. Rendered only when
 * NODE_ENV !== "production", so it never reaches the live site.
 */
const OPTIONS = [
  { id: "demo", label: "Demo" },
  { id: "worst", label: "Worst case" },
  { id: "empty", label: "Empty" },
  { id: "one", label: "One" },
] as const;

export function DevDataToggle() {
  const [current, setCurrent] = useState<string>("demo");
  useEffect(() => {
    const read = () => setCurrent(new URLSearchParams(window.location.search).get("data") ?? "demo");
    read();
    window.addEventListener("popstate", read);
    return () => window.removeEventListener("popstate", read);
  }, []);

  const pick = (id: string) => {
    const url = new URL(window.location.href);
    url.searchParams.set("data", id);
    window.history.replaceState(null, "", url);
    setCurrent(id);
    window.dispatchEvent(new Event("rg-dev-data"));
  };

  return (
    <div
      role="radiogroup"
      aria-label="Dev data set"
      style={{
        position: "fixed",
        left: "50%",
        bottom: 8,
        transform: "translateX(-50%)",
        zIndex: 2147483000,
        display: "flex",
        gap: 2,
        padding: 3,
        borderRadius: 999,
        background: "#d4d4d8",
        boxShadow: "0 1px 4px rgba(0,0,0,0.2)",
        font: "500 12px/1 system-ui, -apple-system, sans-serif",
        color: "#18181b",
      }}
    >
      {OPTIONS.map((o) => (
        <button
          key={o.id}
          type="button"
          role="radio"
          aria-checked={current === o.id}
          onClick={() => pick(o.id)}
          style={{
            border: 0,
            borderRadius: 999,
            padding: "6px 10px",
            cursor: "pointer",
            font: "inherit",
            whiteSpace: "nowrap",
            background: current === o.id ? "#fff" : "transparent",
            color: "inherit",
            boxShadow: current === o.id ? "0 1px 2px rgba(0,0,0,0.15)" : "none",
          }}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
