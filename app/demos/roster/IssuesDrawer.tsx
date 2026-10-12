"use client";

import { useMemo, useState } from "react";
import { rankCandidates, SEVERITY_LABEL, SEVERITY_ORDER } from "@/lib/roster/engine";
import type { Flag, Severity } from "@/lib/roster/types";
import { useRoster } from "./store";
import { FlagCard, Icon, SEV_COLOR, signedMoney } from "./ui";

const EXPLAIN: Record<Severity, string> = {
  critical: "Legal or contractual breach. Visa conditions, security clearance, child safety, double-booking.",
  high: "Will cause a real problem: missing inductions, unfilled cleans, fatigue, over budget.",
  medium: "Costs money or needs sign-off: overtime, escorts, overstaffing.",
  low: "Watch list: expiring credentials, people close to a cap.",
};

export function IssuesDrawer({ severity }: { severity?: Severity }) {
  const r = useRoster();
  const [sev, setSev] = useState<Severity | "all">(severity ?? "all");
  const flags = r.analysis.flags.filter((f) => sev === "all" || f.severity === sev);

  return (
    <aside className="rg-drawer" aria-label="Issues">
      <div className="rg-drawer-head">
        <button className="rg-btn rg-btn-ghost rg-icon-btn rg-close" onClick={() => r.setDrawer(null)} aria-label="Close">
          <Icon name="x" />
        </button>
        <div className="rg-drawer-title">
          <Icon name="alert" size={18} /> Issues this week
        </div>
        <div className="rg-drawer-sub">Nothing is blocked. Everything is flagged, ranked by how much it matters.</div>
        <div className="rg-filters" style={{ marginTop: 10 }}>
          <button className="rg-filter" aria-pressed={sev === "all"} onClick={() => setSev("all")}>
            All {r.analysis.flags.length}
          </button>
          {SEVERITY_ORDER.map((s) => (
            <button key={s} className="rg-filter" aria-pressed={sev === s} onClick={() => setSev(s)} style={sev === s ? { background: SEV_COLOR[s], borderColor: SEV_COLOR[s] } : undefined}>
              {SEVERITY_LABEL[s]} {r.analysis.totals.counts[s]}
            </button>
          ))}
        </div>
        {sev !== "all" && <div style={{ fontSize: 12, color: "var(--rg-muted)", marginTop: 8 }}>{EXPLAIN[sev]}</div>}
      </div>
      <div className="rg-drawer-body">
        {flags.length === 0 && (
          <div style={{ textAlign: "center", padding: "40px 10px", color: "var(--rg-muted)" }}>
            <div style={{ width: 48, height: 48, borderRadius: "50%", background: "var(--rg-ok-bg)", color: "var(--rg-ok)", display: "grid", placeItems: "center", margin: "0 auto 10px" }}>
              <Icon name="check" size={24} />
            </div>
            Nothing here. The roster is clean at this level.
          </div>
        )}
        {flags.map((f) => (
          <IssueCard key={f.id} flag={f} />
        ))}
      </div>
    </aside>
  );
}

function IssueCard({ flag }: { flag: Flag }) {
  const r = useRoster();
  const { state } = r;
  // Suggest the cleanest, cheapest replacement for assignment-level problems
  const fix = useMemo(() => {
    if (!flag.shiftId || (flag.severity !== "critical" && flag.severity !== "high")) return null;
    if (flag.code === "unfilled") {
      const best = rankCandidates(state, flag.shiftId)[0];
      return best && (best.worst === null || best.worst === "low") ? { kind: "fill" as const, c: best } : null;
    }
    if (!flag.staffId) return null;
    const best = rankCandidates(state, flag.shiftId, flag.staffId)[0];
    return best && (best.worst === null || best.worst === "low") ? { kind: "swap" as const, c: best } : null;
  }, [flag, state]);

  const person = flag.staffId ? state.staff.find((s) => s.id === flag.staffId) : undefined;

  return (
    <FlagCard flag={flag}>
      {fix && (
        <button
          className="rg-btn rg-btn-sm rg-btn-ok"
          onClick={() => r.assign(flag.shiftId!, fix.c.staff.id, fix.kind === "swap" ? { replacing: flag.staffId } : {})}
        >
          <Icon name={fix.kind === "swap" ? "swap" : "plus"} size={13} />
          {fix.kind === "swap" ? "Swap for" : "Fill with"} {fix.c.staff.name.split(" ")[0]} ({signedMoney(fix.c.costDelta)})
        </button>
      )}
      {flag.shiftId && (
        <button className="rg-btn rg-btn-sm" onClick={() => r.setDrawer({ kind: "shift", id: flag.shiftId! })}>
          Open shift
        </button>
      )}
      {person && !flag.shiftId && (
        <button className="rg-btn rg-btn-sm" onClick={() => r.setDrawer({ kind: "person", id: person.id })}>
          Open {person.name.split(" ")[0]}&apos;s week
        </button>
      )}
    </FlagCard>
  );
}
