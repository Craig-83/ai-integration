"use client";

import { clearanceRankOn, credentialStatus, RANK_LABEL, shiftHours } from "@/lib/roster/engine";
import type { RosterState, Staff, Tenant } from "@/lib/roster/types";
import { useRoster } from "./store";
import { Avatar, Icon, money } from "./ui";
import { requirementChips } from "./RosterBoard";

type Elig = { status: "eligible" | "escort" | "no"; reasons: string[] };

export function eligibility(state: RosterState, s: Staff, t: Tenant): Elig {
  const date = state.weekStart;
  const reasons: string[] = [];
  let escort = false;
  const site = credentialStatus(s, (c) => c.kind === "induction" && c.scope === "site", date).status;
  if (site === "missing" || site === "expired") reasons.push("no site induction");
  for (const req of t.requirements) {
    if (req.kind === "agsva") {
      const rank = clearanceRankOn(s, date);
      if (rank < req.rank) {
        if (t.escort?.allowed && rank >= t.escort.escorteeMinRank) escort = true;
        else reasons.push(`needs ${RANK_LABEL[req.rank]}`);
      }
    } else if (req.kind === "induction") {
      const st = credentialStatus(s, (c) => c.kind === "induction" && c.scope === req.scope, date).status;
      if (st === "missing" || st === "expired") reasons.push("no tenant induction");
    } else {
      const st = credentialStatus(s, (c) => c.kind === req.kind, date).status;
      if (st === "missing" || st === "expired") reasons.push(req.kind === "police" ? "no current police check" : "no WWC");
    }
  }
  return { status: reasons.length ? "no" : escort ? "escort" : "eligible", reasons };
}

export function SitesView() {
  const r = useRoster();
  const { state, analysis } = r;
  return (
    <div className="rg-view">
      <div className="rg-view-head">
        <div>
          <div className="rg-h1">Tenants & access rules</div>
          <div className="rg-lede">
            Every tenant sets its own rules. Federal floors need clearances, the bank wants its own induction, the childcare centre needs a Working with Children Check. The roster applies all of them to every shift.
          </div>
        </div>
      </div>
      <div className="rg-tenants">
        {state.tenants.map((t) => {
          const shifts = state.shifts.filter((s) => s.tenantId === t.id);
          const hours = shifts.reduce((a, s) => a + s.slots * shiftHours(s), 0);
          const cost = shifts.reduce((a, s) => a + (analysis.shiftCost[s.id] ?? 0), 0);
          const el = state.staff.map((s) => eligibility(state, s, t));
          const ok = el.filter((e) => e.status === "eligible").length;
          const esc = el.filter((e) => e.status === "escort").length;
          const issues = shifts.flatMap((s) => analysis.byShift[s.id] ?? []).filter((f) => f.severity === "critical" || f.severity === "high").length;
          return (
            <button key={t.id} className="rg-card" style={{ textAlign: "left", borderTop: `4px solid hsl(${t.hue} 55% 45%)`, cursor: "pointer", display: "flex", flexDirection: "column", justifyContent: "flex-start" }} onClick={() => r.setDrawer({ kind: "tenant", id: t.id })}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 15 }}>{t.name}</div>
                  <div style={{ color: "var(--rg-muted)", fontSize: 12.5 }}>
                    {t.sector} · {t.floors}
                  </div>
                </div>
                {issues > 0 && (
                  <span className="rg-chip" style={{ background: "var(--rg-critical-bg)", color: "var(--rg-critical)", alignSelf: "flex-start" }}>
                    {issues} issue{issues === 1 ? "" : "s"}
                  </span>
                )}
              </div>
              <div className="rg-reqs" style={{ marginTop: 10 }}>
                {requirementChips(state, t.id).map((c) => (
                  <span key={c} className="rg-chip">
                    {c}
                  </span>
                ))}
                {t.requirements.length === 0 && <span className="rg-chip">Site induction only</span>}
              </div>
              <div style={{ fontSize: 12.5, color: "var(--rg-muted)", marginTop: 8 }}>{t.window}</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginTop: 12 }}>
                <div className="rg-stat">
                  <b className="num">{ok}</b>
                  <span>can work unescorted{esc ? ` (+${esc} escorted)` : ""}</span>
                </div>
                <div className="rg-stat">
                  <b className="num">{hours}h</b>
                  <span>scheduled this week</span>
                </div>
                <div className="rg-stat">
                  <b className="num">{money(cost)}</b>
                  <span>labour this week</span>
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function TenantDrawer({ id }: { id: string }) {
  const r = useRoster();
  const { state } = r;
  const t = state.tenants.find((x) => x.id === id)!;
  const groups = { eligible: [] as Staff[], escort: [] as Staff[], no: [] as { s: Staff; e: Elig }[] };
  for (const s of state.staff) {
    const e = eligibility(state, s, t);
    if (e.status === "no") groups.no.push({ s, e });
    else groups[e.status].push(s);
  }
  return (
    <aside className="rg-drawer" aria-label={t.name}>
      <div className="rg-drawer-head" style={{ borderTop: `4px solid hsl(${t.hue} 55% 45%)` }}>
        <button className="rg-btn rg-btn-ghost rg-icon-btn rg-close" onClick={() => r.setDrawer(null)} aria-label="Close">
          <Icon name="x" />
        </button>
        <div className="rg-drawer-title">{t.name}</div>
        <div className="rg-drawer-sub">
          {t.sector} · {t.floors}
        </div>
        <div className="rg-reqs" style={{ marginTop: 8 }}>
          {requirementChips(state, t.id).map((c) => (
            <span key={c} className="rg-chip">
              {c}
            </span>
          ))}
        </div>
        {t.notes && <div style={{ fontSize: 12.5, color: "var(--rg-muted)", marginTop: 8 }}>{t.notes}</div>}
      </div>
      <div className="rg-drawer-body">
        <div className="rg-section">
          <div className="rg-section-title">Cleared to work here · {groups.eligible.length}</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {groups.eligible.map((s) => (
              <button key={s.id} className="rg-chip" style={{ border: 0, padding: "3px 9px 3px 3px", gap: 6 }} onClick={() => r.setDrawer({ kind: "person", id: s.id })}>
                <Avatar staff={s} size="sm" /> {s.name}
              </button>
            ))}
          </div>
        </div>
        {groups.escort.length > 0 && (
          <div className="rg-section">
            <div className="rg-section-title">Only with an escort · {groups.escort.length}</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {groups.escort.map((s) => (
                <button key={s.id} className="rg-chip" style={{ border: 0, padding: "3px 9px 3px 3px", gap: 6, background: "var(--rg-medium-bg)" }} onClick={() => r.setDrawer({ kind: "person", id: s.id })}>
                  <Avatar staff={s} size="sm" /> {s.name}
                </button>
              ))}
            </div>
          </div>
        )}
        <div className="rg-section">
          <div className="rg-section-title">Not eligible · {groups.no.length}</div>
          {groups.no.map(({ s, e }) => (
            <div key={s.id} className="rg-row" style={{ padding: "6px 10px" }}>
              <Avatar staff={s} size="sm" />
              <div className="rg-row-main">
                <div className="rg-row-name" style={{ fontSize: 13 }}>{s.name}</div>
              </div>
              <span style={{ fontSize: 12, color: "var(--rg-muted)" }}>{e.reasons.join(", ")}</span>
            </div>
          ))}
        </div>
      </div>
    </aside>
  );
}
