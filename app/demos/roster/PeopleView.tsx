"use client";

import { useState } from "react";
import { onCostMultiplier, RANK_LABEL, worstSeverity, credentialStatus } from "@/lib/roster/engine";
import { STUDENT_FORTNIGHT_CAP, TYPE_LABEL } from "@/lib/roster/award";
import { formatDate } from "@/lib/roster/dates";
import { useRoster } from "./store";
import { Avatar, Bar, money, SevBadge } from "./ui";

export function PeopleView() {
  const r = useRoster();
  const { state, analysis } = r;
  const oc = onCostMultiplier(state);
  const [sort, setSort] = useState<"name" | "hours" | "issues">("issues");
  const sevScore = (id: string) => {
    const w = worstSeverity(analysis.byStaff[id] ?? []);
    return w ? { low: 1, medium: 2, high: 3, critical: 4 }[w] : 0;
  };
  const rows = [...state.staff].sort((a, b) =>
    sort === "name"
      ? a.name.localeCompare(b.name)
      : sort === "hours"
        ? (analysis.weeks[b.id]?.hours ?? 0) - (analysis.weeks[a.id]?.hours ?? 0)
        : sevScore(b.id) - sevScore(a.id) || a.name.localeCompare(b.name),
  );

  return (
    <div className="rg-view">
      <div className="rg-view-head">
        <div>
          <div className="rg-h1">People</div>
          <div className="rg-lede">Employment type, award level, visa limits and checks for everyone on the site. Click anyone to see exactly how their pay is calculated.</div>
        </div>
        <div className="rg-filters">
          {(["issues", "hours", "name"] as const).map((k) => (
            <button key={k} className="rg-filter" aria-pressed={sort === k} onClick={() => setSort(k)}>
              Sort by {k}
            </button>
          ))}
        </div>
      </div>
      <table className="rg-table">
        <thead>
          <tr>
            <th>Name</th>
            <th>Employment</th>
            <th>Work rights</th>
            <th>Hours this week</th>
            <th style={{ textAlign: "right" }}>Cost</th>
            <th>Checks</th>
            <th>Issues</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((s) => {
            const w = analysis.weeks[s.id];
            const flags = analysis.byStaff[s.id] ?? [];
            const worst = worstSeverity(flags);
            const cap = s.type === "FT" ? 38 : s.agreedHours ?? 38;
            const clearance = s.credentials.find((c) => c.kind === "agsva");
            const police = credentialStatus(s, (c) => c.kind === "police", state.weekStart).status;
            const wwc = credentialStatus(s, (c) => c.kind === "wwc", state.weekStart).status;
            const chip = (label: string, st: string) => (
              <span
                className="rg-chip"
                style={
                  st === "ok"
                    ? { background: "var(--rg-ok-bg)", color: "var(--rg-ok)" }
                    : st === "expired"
                      ? { background: "var(--rg-critical-bg)", color: "var(--rg-critical)", textDecoration: "line-through" }
                      : st === "expiring"
                        ? { background: "var(--rg-medium-bg)", color: "var(--rg-medium)" }
                        : undefined
                }
              >
                {label}
              </span>
            );
            return (
              <tr key={s.id} onClick={() => r.setDrawer({ kind: "person", id: s.id })}>
                <td>
                  <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
                    <Avatar staff={s} />
                    <div>
                      <div style={{ fontWeight: 600 }}>{s.name}</div>
                      {s.role && <div style={{ fontSize: 11.5, color: "var(--rg-muted)" }}>{s.role}</div>}
                    </div>
                  </div>
                </td>
                <td>
                  {TYPE_LABEL[s.type]} · L{s.level}
                  {s.agreedHours ? <div style={{ fontSize: 11.5, color: "var(--rg-muted)" }}>{s.agreedHours}h agreed</div> : null}
                </td>
                <td>
                  {s.visa.type === "student" ? (
                    <div className="rg-gauge">
                      <div style={{ fontSize: 12 }}>
                        Student <span className="num">{w?.fortnightHours?.toFixed(0)}/{STUDENT_FORTNIGHT_CAP}h</span>
                      </div>
                      <Bar value={w?.fortnightHours ?? 0} max={STUDENT_FORTNIGHT_CAP} />
                    </div>
                  ) : s.visa.type === "whm" ? (
                    <div style={{ fontSize: 12 }}>
                      Working holiday
                      <div style={{ color: "var(--rg-muted)", fontSize: 11.5 }}>on site since {formatDate(s.visa.whmSiteStart!)}</div>
                    </div>
                  ) : (
                    <span style={{ fontSize: 12.5, color: "var(--rg-muted)" }}>{s.visa.type === "graduate" ? "Graduate visa (unrestricted)" : s.visa.type === "pr" ? "Permanent resident" : "Citizen"}</span>
                  )}
                </td>
                <td>
                  <div className="num" style={{ fontSize: 13 }}>
                    {(w?.hours ?? 0).toFixed(1)}h {w?.otHours ? <span style={{ color: "var(--rg-high)" }}>({w.otHours.toFixed(1)} OT)</span> : null}
                  </div>
                  <div className="rg-gauge">
                    <Bar value={w?.hours ?? 0} max={cap} color={w?.otHours ? "var(--rg-high)" : "var(--rg-ok)"} />
                  </div>
                </td>
                <td className="num" style={{ textAlign: "right" }}>
                  {money((w?.wages ?? 0) * oc)}
                </td>
                <td>
                  <div style={{ display: "flex", gap: 3, flexWrap: "wrap", maxWidth: 220 }}>
                    {clearance && chip(RANK_LABEL[clearance.rank!], credentialStatus(s, (c) => c.kind === "agsva", state.weekStart).status)}
                    {police !== "missing" && chip("Police", police)}
                    {wwc !== "missing" && chip("WWC", wwc)}
                  </div>
                </td>
                <td>{worst ? <SevBadge severity={worst} /> : <span style={{ color: "var(--rg-ok)", fontSize: 12.5, fontWeight: 600 }}>Clear</span>}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
