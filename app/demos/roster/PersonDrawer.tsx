"use client";

import { useState } from "react";
import { credentialLabel, credentialStatus, onCostMultiplier, RANK_LABEL } from "@/lib/roster/engine";
import { DAY_SHORT, formatDate, formatRange, formatTime } from "@/lib/roster/dates";
import { BASE_HOURLY, STUDENT_FORTNIGHT_CAP, TYPE_LABEL } from "@/lib/roster/award";
import { useRoster } from "./store";
import { Avatar, Bar, FlagCard, Icon, money } from "./ui";
import { visaChip } from "./ShiftDrawer";
import { RecordInductionModal } from "./InductionsView";

const STATUS_STYLE = {
  ok: { bg: "var(--rg-ok-bg)", c: "var(--rg-ok)", t: "Current" },
  expiring: { bg: "var(--rg-medium-bg)", c: "var(--rg-medium)", t: "Expiring" },
  expired: { bg: "var(--rg-critical-bg)", c: "var(--rg-critical)", t: "Expired" },
  missing: { bg: "transparent", c: "var(--rg-faint)", t: "Missing" },
};

export function PersonDrawer({ id }: { id: string }) {
  const r = useRoster();
  const { state, analysis } = r;
  const s = state.staff.find((x) => x.id === id)!;
  const w = analysis.weeks[id];
  const flags = analysis.byStaff[id] ?? [];
  const oc = onCostMultiplier(state);
  const [recording, setRecording] = useState(false);
  const v = visaChip(s, w?.fortnightHours);

  return (
    <aside className="rg-drawer" aria-label={`${s.name} details`}>
      <div className="rg-drawer-head">
        <button className="rg-btn rg-btn-ghost rg-icon-btn rg-close" onClick={() => r.setDrawer(null)} aria-label="Close">
          <Icon name="x" />
        </button>
        <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
          <Avatar staff={s} size="lg" />
          <div>
            <div className="rg-drawer-title">{s.name}</div>
            <div className="rg-drawer-sub">
              {s.role ? `${s.role} · ` : ""}
              {TYPE_LABEL[s.type]} · Level {s.level} · ${BASE_HOURLY[s.level].toFixed(2)}/h base
              {s.agreedHours ? ` · ${s.agreedHours}h agreed` : ""}
            </div>
          </div>
        </div>
        {v && (
          <div style={{ marginTop: 10 }}>
            <span className="rg-chip">{v}</span>
            {s.visa.type === "student" && w && (
              <div style={{ marginTop: 6 }}>
                <Bar value={w.fortnightHours ?? 0} max={STUDENT_FORTNIGHT_CAP} />
                <div style={{ fontSize: 11.5, color: "var(--rg-muted)", marginTop: 4 }}>
                  {s.visa.prevWeekHours}h last week (all employers) + {w.hours.toFixed(1)}h this week.{" "}
                  {state.settings.courseInSession ? "Course in session: 48h cap applies." : "Course break: no cap."}
                </div>
              </div>
            )}
            {s.visa.type === "whm" && (
              <div style={{ fontSize: 11.5, color: "var(--rg-muted)", marginTop: 4 }}>First worked on this site {formatDate(s.visa.whmSiteStart!, true)}. Condition 8547 allows 6 months per employer.</div>
            )}
          </div>
        )}
      </div>
      <div className="rg-drawer-body">
        {flags.length > 0 && (
          <div className="rg-section">
            <div className="rg-section-title">Issues</div>
            {flags.map((f) => (
              <FlagCard key={f.id} flag={f}>
                {f.shiftId && (
                  <button className="rg-btn rg-btn-sm" onClick={() => r.setDrawer({ kind: "shift", id: f.shiftId! })}>
                    Open shift
                  </button>
                )}
              </FlagCard>
            ))}
          </div>
        )}

        <div className="rg-section">
          <div className="rg-section-title">
            <span>This week · {w?.hours.toFixed(1) ?? 0}h</span>
            <span className="num" style={{ textTransform: "none", letterSpacing: 0 }}>{money((w?.wages ?? 0) * oc)} incl. on-costs</span>
          </div>
          {!w || w.lines.length === 0 ? (
            <div style={{ fontSize: 13, color: "var(--rg-muted)" }}>Not rostered this week.</div>
          ) : (
            <table className="rg-table" style={{ fontSize: 12.5 }}>
              <tbody>
                {w.lines.map((l) => {
                  const sh = state.shifts.find((x) => x.id === l.shiftId)!;
                  const t = state.tenants.find((x) => x.id === sh.tenantId)!;
                  return (
                    <tr key={l.shiftId} onClick={() => r.setDrawer({ kind: "shift", id: sh.id })}>
                      <td style={{ whiteSpace: "nowrap" }}>
                        <b>{DAY_SHORT[sh.day]}</b> {formatTime(sh.start)}
                      </td>
                      <td>
                        {t.short}
                        <div style={{ color: "var(--rg-muted)", fontSize: 11.5 }}>
                          {l.basis}
                          {l.otHours > 0 && <span style={{ color: "var(--rg-high)" }}> · {l.otHours}h OT: {l.otReason}</span>}
                        </div>
                      </td>
                      <td className="num" style={{ textAlign: "right", whiteSpace: "nowrap" }}>
                        {money(l.wages, true)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
          <div style={{ fontSize: 11.5, color: "var(--rg-faint)", marginTop: 6 }}>Wages shown before on-costs. Every rate traces back to the award clause it came from.</div>
        </div>

        <div className="rg-section">
          <div className="rg-section-title">Availability</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 4 }}>
            {s.availability.map((a, i) => (
              <div key={i} style={{ textAlign: "center", padding: "6px 2px", borderRadius: 7, background: a ? "var(--rg-ok-bg)" : "rgba(20,26,46,0.04)", fontSize: 11 }}>
                <b>{DAY_SHORT[i]}</b>
                <div style={{ color: a ? "var(--rg-ok)" : "var(--rg-faint)", marginTop: 2 }}>{a ? formatRange(a[0], a[1]).replace(" to ", "–") : "Off"}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="rg-section">
          <div className="rg-section-title">
            <span>Clearances, checks & inductions</span>
            <button className="rg-btn rg-btn-sm" onClick={() => setRecording(true)}>
              <Icon name="plus" size={13} /> Record induction
            </button>
          </div>
          {s.credentials.length === 0 && <div style={{ fontSize: 13, color: "var(--rg-muted)" }}>Nothing on file.</div>}
          {[...s.credentials]
            .sort((a, b) => a.kind.localeCompare(b.kind))
            .map((c) => {
              const st = credentialStatus({ ...s, credentials: [c] }, () => true, state.weekStart).status;
              const style = STATUS_STYLE[st];
              return (
                <div key={c.id} className="rg-row">
                  <div className="rg-row-main">
                    <div className="rg-row-name">{c.kind === "agsva" ? `${RANK_LABEL[c.rank!]} security clearance` : credentialLabel(c, state.tenants)}</div>
                    <div className="rg-row-meta">
                      Issued {formatDate(c.issued, true)}
                      {c.expires ? ` · ${st === "expired" ? "expired" : "expires"} ${formatDate(c.expires, true)}` : ""}
                      {c.inductedBy ? ` · by ${c.inductedBy}` : ""}
                      {c.note ? ` · ${c.note}` : ""}
                    </div>
                  </div>
                  <span className="rg-chip" style={{ background: style.bg, color: style.c }}>
                    {style.t}
                  </span>
                </div>
              );
            })}
        </div>
      </div>
      {recording && <RecordInductionModal staffId={s.id} onClose={() => setRecording(false)} />}
    </aside>
  );
}
