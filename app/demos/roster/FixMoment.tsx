"use client";

import { useEffect, useState } from "react";
import type { FixMomentData } from "./RosterApp";
import { Icon, money } from "./ui";

/** Count from one number to another, ease-out, skipping the animation for reduced motion. */
function useTween(from: number, to: number, ms = 900) {
  const [v, setV] = useState(from);
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setV(to);
      return;
    }
    let raf = 0;
    const t0 = performance.now();
    const tick = (now: number) => {
      const p = Math.min(1, (now - t0) / ms);
      const e = 1 - Math.pow(1 - p, 3);
      setV(from + (to - from) * e);
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [from, to, ms]);
  return v;
}

/**
 * The after-fix moment: the roster's own numbers move from broken to fixed,
 * while the shifts that changed light up across the week behind it.
 */
export function FixMoment({ data, onDone, onUndo }: { data: FixMomentData; onDone: () => void; onUndo: () => void }) {
  const serious = useTween(data.before.serious, data.after.serious);
  const cost = useTween(data.before.cost, data.after.cost);
  const over = useTween(data.before.over, data.after.over);
  const saved = data.before.cost - data.after.cost;

  useEffect(() => {
    const t = window.setTimeout(onDone, 6500);
    const key = (e: KeyboardEvent) => {
      if (e.key === "Escape" || e.key === "Enter") {
        e.stopPropagation();
        onDone();
      }
    };
    window.addEventListener("keydown", key, true);
    return () => {
      window.clearTimeout(t);
      window.removeEventListener("keydown", key, true);
    };
  }, [onDone]);

  return (
    <div className="rg-moment" role="status" aria-live="polite">
      <div className="rg-moment-card" onClick={onDone}>
        <div className="rg-moment-top">
          <span className="rg-moment-tick">
            <Icon name="check" size={18} />
          </span>
          <span style={{ flex: 1 }}>
            Roster fixed · {data.changes} {data.changes === 1 ? "change" : "changes"}, highlighted on the board
          </span>
          <button
            className="rg-btn rg-btn-sm"
            onClick={(e) => {
              e.stopPropagation();
              onUndo();
            }}
          >
            Undo
          </button>
        </div>
        <div className="rg-moment-grid">
          <div>
            <span className="rg-moment-label">Breaches and high risks</span>
            <span className="rg-moment-num num">
              {data.before.serious} <span aria-hidden="true">→</span> <b>{Math.round(serious)}</b>
            </span>
          </div>
          <div>
            <span className="rg-moment-label">Labour this week</span>
            <span className="rg-moment-num num">
              <b>{money(cost)}</b>
            </span>
          </div>
          <div>
            <span className="rg-moment-label">Against budget</span>
            <span className="rg-moment-num num" style={{ color: over > 0 ? "#ff9b8c" : "#7fdcae" }}>
              <b>{over > 0 ? `${money(over)} over` : `${money(-over)} under`}</b>
            </span>
          </div>
        </div>
        {saved > 1 && (
          <div className="rg-moment-foot">
            <b className="num">{money(saved)}</b> back in the margin this week
            {data.after.serious === 0 ? ", and nobody working outside their visa, clearance or induction." : "."}
          </div>
        )}
      </div>
    </div>
  );
}
