"use client";

import { useMemo, useState } from "react";
import {
  kindLabel,
  RETENTION_OPTIONS,
  toCsv,
  whoWasOnSite,
  withinRetention,
  type HistoryEntry,
  type HistoryKind,
} from "@/lib/roster/history";
import { DAY_LONG, DAY_SHORT, formatDate, formatRange, shiftDate } from "@/lib/roster/dates";
import type { DayIndex } from "@/lib/roster/types";
import { useRoster } from "./store";
import { Icon } from "./ui";

type Filter = "all" | "changes" | "incident" | "induction" | "setting";
const FILTERS: { id: Filter; label: string; kinds: HistoryKind[] }[] = [
  { id: "all", label: "Everything", kinds: [] },
  { id: "changes", label: "Roster changes", kinds: ["change", "auto", "fix", "undo", "scenario", "publish"] },
  { id: "incident", label: "Incidents", kinds: ["incident"] },
  { id: "induction", label: "Inductions", kinds: ["induction"] },
  { id: "setting", label: "Settings", kinds: ["setting"] },
];

const KIND_TONE: Partial<Record<HistoryKind, string>> = {
  incident: "var(--rg-critical)",
  fix: "var(--rg-ok)",
  auto: "var(--rg-ok)",
  undo: "var(--rg-muted)",
  induction: "var(--rg-low)",
};

function when(iso: string) {
  const d = new Date(iso);
  return d.toLocaleString("en-AU", { hour: "numeric", minute: "2-digit", hour12: true, timeZone: "Australia/Melbourne" });
}
function dayKey(iso: string) {
  return new Date(iso).toLocaleDateString("en-AU", { weekday: "short", day: "numeric", month: "short", year: "numeric", timeZone: "Australia/Melbourne" });
}

export function HistoryView() {
  const r = useRoster();
  const { state } = r;
  const [filter, setFilter] = useState<Filter>("all");
  const [q, setQ] = useState("");
  const [incident, setIncident] = useState(false);

  const kept = useMemo(() => withinRetention(r.history, r.retentionMonths, state.weekStart), [r.history, r.retentionMonths, state.weekStart]);
  const hidden = r.history.length - kept.length;
  const kinds = FILTERS.find((f) => f.id === filter)!.kinds;
  const shown = kept
    .filter((e) => kinds.length === 0 || kinds.includes(e.kind))
    .filter((e) => {
      if (!q.trim()) return true;
      const hay = `${e.summary} ${e.detail ?? ""} ${e.actor} ${e.onSite?.map((o) => o.name).join(" ") ?? ""}`.toLowerCase();
      return hay.includes(q.trim().toLowerCase());
    })
    .sort((a, b) => b.at.localeCompare(a.at));

  const groups: { day: string; items: HistoryEntry[] }[] = [];
  for (const e of shown) {
    const k = dayKey(e.at);
    if (groups[groups.length - 1]?.day !== k) groups.push({ day: k, items: [] });
    groups[groups.length - 1].items.push(e);
  }

  const exportCsv = () => {
    try {
      const blob = new Blob([toCsv(shown)], { type: "text/csv" });
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = `roster-history-${state.weekStart}.csv`;
      a.click();
      URL.revokeObjectURL(a.href);
      r.toast({ title: `Exported ${shown.length} history entries`, sub: "CSV ready for an incident report or audit.", severity: "ok" });
    } catch {
      r.toast({ title: "Export isn't available in this view", severity: "medium" });
    }
  };

  return (
    <div className="rg-view">
      <div className="rg-view-head">
        <div>
          <div className="rg-h1">History & incidents</div>
          <div className="rg-lede">
            Every change to the roster, who made it, and what it did. When something goes wrong on site, this is where you find who was there and whether they were cleared to be.
          </div>
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button className="rg-btn" onClick={exportCsv}>
            Export CSV
          </button>
          <button className="rg-btn rg-btn-gold" onClick={() => setIncident(true)}>
            <Icon name="alert" size={15} /> Log an incident
          </button>
        </div>
      </div>

      <WhoWasOnSite />

      <div className="rg-history-controls">
        <input className="rg-search" style={{ marginTop: 0, maxWidth: 280 }} placeholder="Search people, tenants, notes" aria-label="Search history" value={q} onChange={(e) => setQ(e.target.value)} />
        <div className="rg-filters" style={{ marginTop: 0 }}>
          {FILTERS.map((f) => (
            <button key={f.id} className="rg-filter" aria-pressed={filter === f.id} onClick={() => setFilter(f.id)}>
              {f.label}
            </button>
          ))}
        </div>
        <label className="rg-retention">
          Keep history for
          <select value={r.retentionMonths} onChange={(e) => r.setRetention(Number(e.target.value))}>
            {RETENTION_OPTIONS.map((o) => (
              <option key={o.months} value={o.months}>
                {o.label}
              </option>
            ))}
          </select>
        </label>
      </div>
      <div className="rg-retention-note">
        {r.retentionMonths < 84
          ? `Fair Work requires time and wages records to be kept for 7 years. ${hidden} older ${hidden === 1 ? "entry is" : "entries are"} outside this window.`
          : "Kept for 7 years, matching the Fair Work requirement for time and wages records. Each client chooses its own window."}
      </div>

      {groups.length === 0 && <div className="rg-card" style={{ color: "var(--rg-muted)" }}>Nothing matches. Try a different filter or search.</div>}
      <ol className="rg-timeline">
        {groups.map((g) => (
          <li key={g.day}>
            <div className="rg-timeline-day">{g.day}</div>
            <ol>
              {g.items.map((e) => (
                <li key={e.id} className={`rg-tl-item ${e.kind}`}>
                  <span className="rg-tl-dot" style={{ background: KIND_TONE[e.kind] ?? "var(--rg-ink)" }} aria-hidden="true" />
                  <div className="rg-tl-main">
                    <div className="rg-tl-top">
                      <span className="rg-tl-time num">{when(e.at)}</span>
                      <span className="rg-chip">{kindLabel(e.kind)}</span>
                      {e.severity && (
                        <span className="rg-chip" style={{ background: "var(--rg-critical-bg)", color: "var(--rg-critical)" }}>
                          {e.severity === "notifiable" ? "Notifiable" : e.severity === "major" ? "Major" : "Minor"}
                        </span>
                      )}
                    </div>
                    <div className="rg-tl-summary">{e.summary}</div>
                    {e.detail && <div className="rg-tl-detail">{e.detail}</div>}
                    {e.shiftLabel && <div className="rg-tl-detail">{e.shiftLabel}</div>}
                    {e.onSite && e.onSite.length > 0 && (
                      <div className="rg-tl-onsite">
                        <b>On site:</b>
                        {e.onSite.map((o) => (
                          <div key={o.staffId} style={{ color: o.ok ? "var(--rg-ink)" : "var(--rg-critical)" }}>
                            <Icon name={o.ok ? "check" : "x"} size={13} /> {o.name}: {o.checks}
                          </div>
                        ))}
                      </div>
                    )}
                    {e.after && (
                      <div className="rg-tl-after num">
                        After: {e.after.critical} critical, {e.after.high} high, ${Math.round(e.after.cost).toLocaleString()} this week
                      </div>
                    )}
                    <div className="rg-tl-actor">by {e.actor}</div>
                  </div>
                </li>
              ))}
            </ol>
          </li>
        ))}
      </ol>
      {incident && <IncidentModal onClose={() => setIncident(false)} />}
    </div>
  );
}

function WhoWasOnSite() {
  const { state } = useRoster();
  const [day, setDay] = useState<DayIndex>(3);
  const [tenantId, setTenantId] = useState("ccco");
  const shifts = state.shifts.filter((s) => s.day === day && s.tenantId === tenantId).sort((a, b) => a.start - b.start);
  return (
    <div className="rg-card rg-onsite">
      <div className="rg-onsite-head">
        <div>
          <div className="rg-row-name" style={{ fontSize: 15 }}>
            Who was on site?
          </div>
          <div className="rg-row-meta">Pick a day and tenant. Every person rostered, and whether their checks were current that day.</div>
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <select aria-label="Day" value={day} onChange={(e) => setDay(Number(e.target.value) as DayIndex)}>
            {DAY_SHORT.map((d, i) => (
              <option key={d} value={i}>
                {DAY_LONG[i]} {formatDate(shiftDate(state.weekStart, i as DayIndex))}
              </option>
            ))}
          </select>
          <select aria-label="Tenant" value={tenantId} onChange={(e) => setTenantId(e.target.value)}>
            {state.tenants.map((t) => (
              <option key={t.id} value={t.id}>
                {t.short}
              </option>
            ))}
          </select>
        </div>
      </div>
      {shifts.length === 0 ? (
        <div style={{ color: "var(--rg-muted)", marginTop: 10 }}>No cleaning scheduled for that tenant that day.</div>
      ) : (
        shifts.map((sh) => {
          const people = whoWasOnSite(state, sh.id);
          return (
            <div key={sh.id} className="rg-onsite-shift">
              <div className="rg-row-meta" style={{ fontWeight: 600, color: "var(--rg-ink)" }}>
                {formatRange(sh.start, sh.end)} · {sh.label}
              </div>
              {people.length === 0 && <div className="rg-row-meta">Nobody rostered.</div>}
              {people.map((p) => (
                <div key={p.staffId} className="rg-onsite-person" style={{ color: p.ok ? "var(--rg-ink)" : "var(--rg-critical)" }}>
                  <b style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                    <Icon name={p.ok ? "check" : "x"} size={13} /> {p.name}
                  </b>
                  <span>{p.checks}</span>
                </div>
              ))}
            </div>
          );
        })
      )}
    </div>
  );
}

const INCIDENT_TYPES = ["Security or access", "Property damage", "Injury or near miss", "Client complaint", "Missed clean"];

function IncidentModal({ onClose }: { onClose: () => void }) {
  const r = useRoster();
  const { state } = r;
  const [shiftId, setShiftId] = useState(state.shifts.find((s) => s.tenantId === "ccco" && s.day === 3)?.id ?? state.shifts[0].id);
  const [type, setType] = useState(INCIDENT_TYPES[0]);
  const [severity, setSeverity] = useState<"minor" | "major" | "notifiable">("minor");
  const [note, setNote] = useState("");
  const sorted = [...state.shifts].sort((a, b) => a.day - b.day || a.start - b.start);
  const people = whoWasOnSite(state, shiftId);
  return (
    <div className="rg-modal-wrap" onClick={onClose}>
      <div className="rg-modal" onClick={(e) => e.stopPropagation()} role="dialog" aria-label="Log an incident" style={{ width: "min(520px, 94vw)" }}>
        <div style={{ fontSize: 17, fontWeight: 700, display: "flex", gap: 8, alignItems: "center" }}>
          <Icon name="alert" size={18} /> Log an incident
        </div>
        <div style={{ color: "var(--rg-muted)", fontSize: 13 }}>The record captures who was rostered and their checks at the time, so nobody has to reconstruct it later.</div>
        <label className="rg-field">
          Shift
          <select value={shiftId} onChange={(e) => setShiftId(e.target.value)}>
            {sorted.map((s) => {
              const t = state.tenants.find((x) => x.id === s.tenantId);
              return (
                <option key={s.id} value={s.id}>
                  {DAY_SHORT[s.day]} {formatRange(s.start, s.end)} · {t?.short} · {s.label}
                </option>
              );
            })}
          </select>
        </label>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          <label className="rg-field">
            Type
            <select value={type} onChange={(e) => setType(e.target.value)}>
              {INCIDENT_TYPES.map((t) => (
                <option key={t}>{t}</option>
              ))}
            </select>
          </label>
          <label className="rg-field">
            Severity
            <select value={severity} onChange={(e) => setSeverity(e.target.value as typeof severity)}>
              <option value="minor">Minor</option>
              <option value="major">Major</option>
              <option value="notifiable">Notifiable (WorkSafe)</option>
            </select>
          </label>
        </div>
        <label className="rg-field">
          What happened
          <textarea rows={3} value={note} onChange={(e) => setNote(e.target.value)} placeholder="e.g. Tenant reported the server room door propped open at 9:30pm" />
        </label>
        <div className="rg-onsite-preview">
          <b>Will be recorded as on site:</b>
          {people.length === 0 ? (
            <div>Nobody rostered on this shift.</div>
          ) : (
            people.map((p) => (
              <div key={p.staffId} style={{ color: p.ok ? "var(--rg-ink)" : "var(--rg-critical)" }}>
                <Icon name={p.ok ? "check" : "x"} size={13} /> {p.name}: {p.checks}
              </div>
            ))
          )}
        </div>
        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 16 }}>
          <button className="rg-btn" onClick={onClose}>
            Cancel
          </button>
          <button
            className="rg-btn rg-btn-gold"
            disabled={!note.trim()}
            onClick={() => {
              r.logIncident({ shiftId, type, severity, note: note.trim() });
              onClose();
            }}
          >
            Save incident
          </button>
        </div>
      </div>
    </div>
  );
}
