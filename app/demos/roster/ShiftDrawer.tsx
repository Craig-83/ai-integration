"use client";

import { useMemo, useState } from "react";
import { onCostMultiplier, rankCandidates, shiftHours, type Candidate } from "@/lib/roster/engine";
import { DAY_LONG, formatDate, formatRange, publicHoliday, shiftDate } from "@/lib/roster/dates";
import { STUDENT_FORTNIGHT_CAP, TYPE_LABEL } from "@/lib/roster/award";
import type { Staff } from "@/lib/roster/types";
import { useRoster } from "./store";
import { Avatar, Icon, MiniFlag, money, SevBadge, signedMoney } from "./ui";
import { requirementChips } from "./RosterBoard";

export function visaChip(s: Staff, fortnight?: number) {
  if (s.visa.type === "student") return `Student visa ${fortnight?.toFixed(0) ?? s.visa.prevWeekHours}/${STUDENT_FORTNIGHT_CAP}h fortnight`;
  if (s.visa.type === "whm") return "Working holiday visa";
  if (s.visa.type === "graduate") return "Graduate visa";
  return null;
}

export function ShiftDrawer({ id, replacing: asked }: { id: string; replacing?: string }) {
  const r = useRoster();
  const { state, analysis } = r;
  const sh = state.shifts.find((s) => s.id === id);
  // A full shift with someone in breach opens straight onto their replacements
  const ids0 = sh ? state.assignments[sh.id] ?? [] : [];
  const replacing =
    asked ??
    (sh && ids0.length >= sh.slots
      ? ids0.find((sid) =>
          (analysis.byStaff[sid] ?? []).some((f) => (f.shiftId === sh.id || !f.shiftId) && (f.severity === "critical" || f.severity === "high")),
        )
      : undefined);
  const [showAll, setShowAll] = useState(false);
  const ranked = useMemo(() => (sh ? rankCandidates(state, sh.id, replacing) : []), [state, sh, replacing]);
  if (!sh) return null;

  const tenant = state.tenants.find((t) => t.id === sh.tenantId)!;
  const setSlots = (n: number) => {
    const hrs = shiftHours(sh);
    r.commit(
      { ...state, shifts: state.shifts.map((x) => (x.id === sh.id ? { ...x, slots: n } : x)) },
      {
        title: `${tenant.short}, ${DAY_LONG[sh.day]}: ${n} ${n === 1 ? "cleaner" : "cleaners"} needed`,
        sub:
          n > sh.slots
            ? `Adds ${hrs} labour hours${sh.chargeable ? " to the client's bill." : " to the contract. Pick someone from the matches below."}`
            : ids.length > n
              ? `${ids.length - n} more rostered than needed now. Remove someone, or keep them as overstaffing.`
              : `Saves ${hrs} labour hours.`,
        undo: true,
      },
    );
  };
  const date = shiftDate(state.weekStart, sh.day);
  const ph = publicHoliday(date);
  const ids = state.assignments[sh.id] ?? [];
  const oc = onCostMultiplier(state);
  const shiftFlags = (analysis.byShift[sh.id] ?? []).filter((f) => !f.staffId);
  const full = ids.length >= sh.slots && !replacing;
  const clean = ranked.filter((c) => c.worst === null || c.worst === "low");
  const flagged = ranked.filter((c) => !(c.worst === null || c.worst === "low"));
  const replacingStaff = replacing ? state.staff.find((s) => s.id === replacing) : undefined;

  return (
    <aside className="rg-drawer" aria-label="Shift details">
      <div className="rg-drawer-head" style={{ borderTop: `4px solid hsl(${tenant.hue} 55% 45%)` }}>
        <button className="rg-btn rg-btn-ghost rg-icon-btn rg-close" onClick={() => r.setDrawer(null)} aria-label="Close">
          <Icon name="x" />
        </button>
        <div className="rg-drawer-title">{tenant.name}</div>
        <div className="rg-drawer-sub">
          {sh.label} · {DAY_LONG[sh.day]} {formatDate(date)} · {formatRange(sh.start, sh.end)} ({shiftHours(sh)}h)
        </div>
        <div className="rg-reqs" style={{ marginTop: 8 }}>
          {ph && <span className="rg-ph" style={{ marginTop: 0 }}>{ph}</span>}
          {requirementChips(state, tenant.id).map((c) => (
            <span key={c} className="rg-chip">
              {c}
            </span>
          ))}
          {sh.chargeable && (
            <span className="rg-chip" style={{ background: "var(--rg-ok-bg)", color: "var(--rg-ok)" }}>
              Chargeable variation
            </span>
          )}
        </div>
        {tenant.notes && <div style={{ fontSize: 12.5, color: "var(--rg-muted)", marginTop: 8 }}>{tenant.notes}</div>}
      </div>

      <div className="rg-drawer-body">
        <div className="rg-section rg-headcount">
          <div>
            <div className="rg-row-name">Cleaners needed</div>
            <div className="rg-row-meta">
              {sh.slots * shiftHours(sh)} labour hours{sh.chargeable ? ", billed to the client" : " against the contract"}
            </div>
          </div>
          <div className="rg-stepper" role="group" aria-label="Cleaners needed">
            <button
              className="rg-btn rg-btn-sm rg-icon-btn"
              aria-label="One fewer cleaner"
              disabled={sh.slots <= 1}
              onClick={() => setSlots(sh.slots - 1)}
            >
              −
            </button>
            <span className="num" aria-live="polite">{sh.slots}</span>
            <button
              className="rg-btn rg-btn-sm rg-icon-btn"
              aria-label="One more cleaner"
              disabled={sh.slots >= 8}
              onClick={() => setSlots(sh.slots + 1)}
            >
              +
            </button>
          </div>
        </div>

        {shiftFlags.length > 0 && (
          <div className="rg-section">
            {shiftFlags.map((f) => (
              <div key={f.id} style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 6, fontSize: 13 }}>
                <SevBadge severity={f.severity} /> {f.title}
              </div>
            ))}
          </div>
        )}

        <div className="rg-section">
          <div className="rg-section-title">
            <span>
              On this shift · {ids.length}/{sh.slots}
            </span>
            <span className="num" style={{ textTransform: "none", letterSpacing: 0 }}>
              {money(analysis.shiftCost[sh.id] ?? 0)} incl. on-costs
            </span>
          </div>
          {ids.length === 0 && <div style={{ color: "var(--rg-muted)", fontSize: 13 }}>Nobody yet. Pick from the matches below.</div>}
          {ids.map((sid) => {
            const s = state.staff.find((x) => x.id === sid)!;
            const line = analysis.weeks[sid]?.lines.find((l) => l.shiftId === sh.id);
            const flags = (analysis.byStaff[sid] ?? []).filter((f) => f.shiftId === sh.id || !f.shiftId);
            const v = visaChip(s, analysis.weeks[sid]?.fortnightHours);
            return (
              <div key={sid} className="rg-row" style={{ alignItems: "flex-start", background: replacing === sid ? "var(--rg-medium-bg)" : undefined }}>
                <Avatar staff={s} />
                <div className="rg-row-main">
                  <div className="rg-row-name">
                    <button className="rg-btn-ghost" style={{ border: 0, background: "none", padding: 0, fontWeight: 600 }} onClick={() => r.setDrawer({ kind: "person", id: sid })}>
                      {s.name}
                    </button>
                  </div>
                  <div className="rg-row-meta">
                    {TYPE_LABEL[s.type]} L{s.level}
                    {v ? ` · ${v}` : ""}
                  </div>
                  {line && (
                    <div className="rg-row-meta" style={{ marginTop: 3 }}>
                      {line.basis}
                      {line.otHours > 0 && <span style={{ color: "var(--rg-high)" }}> · {line.otHours}h overtime ({line.otReason})</span>}
                    </div>
                  )}
                  {flags.map((f) => (
                    <MiniFlag key={f.id} flag={f} />
                  ))}
                  <div style={{ display: "flex", gap: 6, marginTop: 8 }}>
                    <button className="rg-btn rg-btn-sm" onClick={() => r.setDrawer({ kind: "shift", id: sh.id, replacing: replacing === sid ? undefined : sid })}>
                      <Icon name="swap" size={13} /> {replacing === sid ? "Cancel swap" : "Swap"}
                    </button>
                    <button className="rg-btn rg-btn-sm rg-btn-ghost" onClick={() => r.unassign(sh.id, sid)}>
                      Remove
                    </button>
                  </div>
                </div>
                <div className="rg-cost num">{line ? money(line.wages * oc) : ""}</div>
              </div>
            );
          })}
        </div>

        <div className="rg-section">
          <div className="rg-section-title">
            <span>{replacingStaff ? `Swap ${replacingStaff.name.split(" ")[0]} for` : full ? "Shift is full" : "Best matches"}</span>
            <span style={{ textTransform: "none", letterSpacing: 0, fontWeight: 500 }}>{replacingStaff ? "change in weekly cost" : "added cost"}</span>
          </div>
          {full ? (
            <div style={{ color: "var(--rg-muted)", fontSize: 13 }}>Use Swap on someone above to see who could replace them, and what it saves.</div>
          ) : (
            <>
              {clean.slice(0, showAll ? undefined : 6).map((c) => (
                <CandidateRow key={c.staff.id} c={c} shiftId={sh.id} replacing={replacing} />
              ))}
              {clean.length === 0 && (
                <div style={{ color: "var(--rg-high)", fontSize: 13, marginBottom: 8 }}>Nobody can take this shift without an issue. The least-bad options are below.</div>
              )}
              {(showAll || clean.length === 0) &&
                flagged.map((c) => <CandidateRow key={c.staff.id} c={c} shiftId={sh.id} replacing={replacing} />)}
              {!showAll && (clean.length > 6 || flagged.length > 0) && clean.length > 0 && (
                <button className="rg-btn rg-btn-sm rg-btn-ghost" style={{ marginTop: 8 }} onClick={() => setShowAll(true)}>
                  Show everyone ({flagged.length} with issues)
                </button>
              )}
            </>
          )}
          <p style={{ fontSize: 11.5, color: "var(--rg-faint)", marginTop: 12 }}>
            Ranked by compliance first, then by cost to the business: award rates, loadings, penalties and overtime, plus super, payroll tax and WorkCover.
          </p>
        </div>

        {sh.chargeable && (
          <div className="rg-section">
            <button
              className="rg-btn rg-btn-sm"
              onClick={() => {
                const { [sh.id]: _gone, ...rest } = state.assignments;
                void _gone;
                r.commit({ ...state, shifts: state.shifts.filter((s) => s.id !== sh.id), assignments: rest }, { title: "Shift deleted", undo: true });
                r.setDrawer(null);
              }}
            >
              <Icon name="trash" size={13} /> Delete this extra shift
            </button>
          </div>
        )}
      </div>
    </aside>
  );
}

function CandidateRow({ c, shiftId, replacing }: { c: Candidate; shiftId: string; replacing?: string }) {
  const r = useRoster();
  const { analysis } = r;
  const s = c.staff;
  const v = visaChip(s, analysis.weeks[s.id]?.fortnightHours);
  const serious = c.worst === "critical" || c.worst === "high";
  return (
    <div className="rg-row" style={{ alignItems: "flex-start", opacity: c.worst === "critical" ? 0.85 : 1 }}>
      <Avatar staff={s} />
      <div className="rg-row-main">
        <div className="rg-row-name">
          {s.name}
          {c.worst && c.worst !== "low" && <SevBadge severity={c.worst} />}
        </div>
        <div className="rg-row-meta">
          {TYPE_LABEL[s.type]} L{s.level} · {(analysis.weeks[s.id]?.hours ?? 0).toFixed(1)}h → {c.weekHours.toFixed(1)}h this week
          {v ? ` · ${v}` : ""}
        </div>
        {c.flags.slice(0, 3).map((f) => (
          <MiniFlag key={f.id} flag={f} />
        ))}
      </div>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 6 }}>
        <span className={`rg-cost num ${c.costDelta < 0 ? "down" : "up"}`}>{signedMoney(c.costDelta)}</span>
        <button
          className={`rg-btn rg-btn-sm ${serious ? "" : "rg-btn-ok"}`}
          onClick={() => {
            r.assign(shiftId, s.id, { replacing });
            if (replacing) r.setDrawer({ kind: "shift", id: shiftId });
          }}
        >
          {replacing ? "Swap in" : "Assign"}
        </button>
      </div>
    </div>
  );
}
