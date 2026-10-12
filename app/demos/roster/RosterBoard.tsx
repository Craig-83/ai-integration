"use client";

import { useMemo, useState, type DragEvent } from "react";
import { evaluateCandidate, RANK_LABEL, shiftHours, worstSeverity } from "@/lib/roster/engine";
import { DAY_SHORT, formatDate, formatTime, publicHoliday, shiftDate } from "@/lib/roster/dates";
import { STUDENT_FORTNIGHT_CAP, TYPE_LABEL } from "@/lib/roster/award";
import type { DayIndex, RosterState, Severity, Shift, Staff } from "@/lib/roster/types";
import { useRoster } from "./store";
import { Avatar, Icon, initials, money, useNarrow } from "./ui";

type DropSev = Severity | "ok";
/** How a drop would land on a shift: its severity, and who it would swap out if the shift is full. */
type DropState = { sev: DropSev; replacing?: string };

// The dragged person travels in the drag data itself, so a drop still works
// even if React state was reset mid-drag.
const DRAG_TYPE = "application/x-roster-staff";
type DragPayload = { staffId: string; from?: string };

function startDrag(e: DragEvent, payload: DragPayload) {
  e.dataTransfer.setData(DRAG_TYPE, JSON.stringify(payload));
  e.dataTransfer.setData("text/plain", payload.staffId);
  e.dataTransfer.effectAllowed = "move";
}

function isRosterDrag(e: DragEvent) {
  return Array.from(e.dataTransfer.types).includes(DRAG_TYPE);
}

function readDrag(e: DragEvent): DragPayload | null {
  try {
    const raw = e.dataTransfer.getData(DRAG_TYPE);
    return raw ? (JSON.parse(raw) as DragPayload) : null;
  } catch {
    return null;
  }
}

const DROP_TAG: Record<DropSev, { text: string; bg: string }> = {
  ok: { text: "Clear", bg: "var(--rg-ok)" },
  low: { text: "Clear", bg: "var(--rg-ok)" },
  medium: { text: "Warning", bg: "var(--rg-medium)" },
  high: { text: "High risk", bg: "var(--rg-high)" },
  critical: { text: "Breach", bg: "var(--rg-critical)" },
};
const SEV_SCORE: Record<DropSev, number> = { ok: 0, low: 1, medium: 2, high: 3, critical: 4 };

export function requirementChips(state: RosterState, tenantId: string): string[] {
  const t = state.tenants.find((x) => x.id === tenantId)!;
  const out = t.requirements.map((r) =>
    r.kind === "agsva" ? RANK_LABEL[r.rank] : r.kind === "police" ? "Police" : r.kind === "wwc" ? "WWC" : "Induction",
  );
  if (t.escort?.allowed) out.push("Escort OK");
  return out;
}

export function RosterBoard() {
  const narrow = useNarrow();
  return narrow ? <DayView /> : <WeekBoard />;
}

/** Phones: one day at a time, tenants stacked, every shift full width. */
function DayView() {
  const { state, analysis } = useRoster();
  const [day, setDay] = useState<DayIndex>(0);
  const dayCost = (d: number) => state.shifts.filter((s) => s.day === d).reduce((a, s) => a + (analysis.shiftCost[s.id] ?? 0), 0);
  const daySev = (d: number) => worstSeverity(state.shifts.filter((s) => s.day === d).flatMap((s) => analysis.byShift[s.id] ?? []));
  const date = shiftDate(state.weekStart, day);
  const ph = publicHoliday(date);
  return (
    <div className="rg-dayview">
      <div className="rg-daypicker" role="tablist" aria-label="Day">
        {DAY_SHORT.map((d, i) => {
          const sev = daySev(i);
          return (
            <button key={d} role="tab" aria-selected={day === i} className="rg-daychip" onClick={() => setDay(i as DayIndex)}>
              <span className="rg-daychip-d">{d}</span>
              <span className="rg-daychip-n">{formatDate(shiftDate(state.weekStart, i as DayIndex)).split(" ")[0]}</span>
              {sev && (sev === "critical" || sev === "high") && <span className="rg-dot" style={{ background: sev === "critical" ? "var(--rg-critical)" : "var(--rg-high)" }} />}
            </button>
          );
        })}
      </div>
      <div className="rg-dayhead">
        <div>
          <b>{formatDate(date, true)}</b>
          {ph && <span className="rg-ph" style={{ marginLeft: 8, marginTop: 0 }}>{ph}</span>}
        </div>
        <span className="num">{money(dayCost(day))}</span>
      </div>
      {state.tenants.map((t) => {
        const shifts = state.shifts.filter((s) => s.tenantId === t.id && s.day === day).sort((a, b) => a.start - b.start);
        if (shifts.length === 0) return null;
        return (
          <section key={t.id} className="rg-daygroup">
            <div className="rg-rowhead-name">
              <span className="rg-dot" style={{ background: `hsl(${t.hue} 55% 45%)`, width: 9, height: 9 }} />
              {t.short}
              <span style={{ color: "var(--rg-muted)", fontWeight: 500, fontSize: 12 }}>{t.floors}</span>
            </div>
            <div className="rg-reqs">
              {requirementChips(state, t.id).map((c) => (
                <span key={c} className="rg-chip">
                  {c}
                </span>
              ))}
            </div>
            <div className="rg-daygroup-shifts">
              {shifts.map((sh) => (
                <ShiftCard key={sh.id} sh={sh} hue={t.hue} />
              ))}
            </div>
          </section>
        );
      })}
      <p className="rg-dayview-hint">Tap a shift to see who can take it, what it costs, and what it would break.</p>
    </div>
  );
}

function WeekBoard() {
  const r = useRoster();
  const { state, analysis, drag } = r;
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<"all" | "students" | "cleared" | "spare">("all");
  const [addAt, setAddAt] = useState<{ tenantId: string; day: DayIndex } | null>(null);

  // While dragging, score every shift for the person being dragged
  const preview = useMemo(() => {
    if (!drag) return null;
    const base: RosterState = drag.from
      ? { ...state, assignments: { ...state.assignments, [drag.from]: (state.assignments[drag.from] ?? []).filter((id) => id !== drag.staffId) } }
      : state;
    const out: Record<string, DropState> = {};
    for (const sh of state.shifts) {
      const ids = base.assignments[sh.id] ?? [];
      if (ids.includes(drag.staffId)) continue;
      if (ids.length >= sh.slots) {
        // Full shift: dropping here swaps out whoever gives the best result
        let best: { sev: DropSev; cost: number; replacing: string } | null = null;
        for (const id of ids) {
          const c = evaluateCandidate(base, sh.id, drag.staffId, id);
          const sev: DropSev = c.worst ?? "ok";
          if (!best || SEV_SCORE[sev] < SEV_SCORE[best.sev] || (sev === best.sev && c.costDelta < best.cost))
            best = { sev, cost: c.costDelta, replacing: id };
        }
        if (best) out[sh.id] = { sev: best.sev, replacing: best.replacing };
        continue;
      }
      out[sh.id] = { sev: evaluateCandidate(base, sh.id, drag.staffId).worst ?? "ok" };
    }
    return out;
  }, [drag, state]);

  const people = state.staff
    .filter((s) => s.name.toLowerCase().includes(query.toLowerCase()))
    .filter((s) => {
      if (filter === "students") return s.visa.type === "student" || s.visa.type === "whm";
      if (filter === "cleared") return s.credentials.some((c) => c.kind === "agsva" && (!c.expires || c.expires >= state.weekStart));
      if (filter === "spare") return (analysis.weeks[s.id]?.hours ?? 0) < (s.type === "FT" ? 38 : s.agreedHours ?? 20);
      return true;
    });

  const dayCost = (d: number) =>
    state.shifts.filter((s) => s.day === d).reduce((a, s) => a + (analysis.shiftCost[s.id] ?? 0), 0);

  return (
    <div className="rg-board-wrap">
      <aside className="rg-rail" aria-label="Staff">
        <div className="rg-rail-head">
          <div className="rg-rail-title">
            <span>Staff</span>
            <span>{state.staff.length}</span>
          </div>
          <input className="rg-search" placeholder="Search staff" value={query} onChange={(e) => setQuery(e.target.value)} />
          <div className="rg-filters">
            {(
              [
                ["all", "All"],
                ["spare", "Has hours"],
                ["students", "Visa limits"],
                ["cleared", "Cleared"],
              ] as const
            ).map(([k, l]) => (
              <button key={k} className="rg-filter" aria-pressed={filter === k} onClick={() => setFilter(k)}>
                {l}
              </button>
            ))}
          </div>
        </div>
        <div className="rg-rail-list">
          {people.map((s) => (
            <PersonRow key={s.id} s={s} />
          ))}
        </div>
        <div className="rg-rail-hint">Drag anyone onto a shift. Green means clear, red means breach.</div>
      </aside>

      <div className="rg-board">
        <div className="rg-grid" role="grid">
          <div className="rg-colhead" style={{ left: 0, zIndex: 4, position: "sticky" }}>
            <div style={{ fontSize: 11, color: "var(--rg-muted)", textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: 700 }}>
              Tenant
            </div>
          </div>
          {DAY_SHORT.map((d, i) => {
            const date = shiftDate(state.weekStart, i as DayIndex);
            const ph = publicHoliday(date);
            return (
              <div key={d} className="rg-colhead">
                <div className="rg-colhead-day">
                  {d}
                  <span className="rg-colhead-date">{formatDate(date)}</span>
                </div>
                <div className="rg-colhead-cost num">{money(dayCost(i))}</div>
                {ph && <span className="rg-ph" title="Public holiday penalty rates apply">{ph}</span>}
              </div>
            );
          })}

          {state.tenants.map((t) => (
            <Row key={t.id} tenantId={t.id} preview={preview} onAdd={(day) => setAddAt({ tenantId: t.id, day })} />
          ))}
        </div>
        <div className="rg-legend">
          <span>
            <span className="rg-avatar sm" style={{ background: "#1f3a68", width: 14, height: 14 }} /> Full-time
          </span>
          <span>
            <span className="rg-avatar sm" style={{ background: "#3d7a5f", width: 14, height: 14 }} /> Part-time
          </span>
          <span>
            <span className="rg-avatar sm" style={{ background: "#7a5aa6", width: 14, height: 14 }} /> Casual
          </span>
          <span style={{ marginLeft: "auto" }}>Click a shift for best matches and costs. Drag a person between shifts to move them. ⌘Z undoes anything.</span>
        </div>
      </div>
      {addAt && <AddShiftModal at={addAt} onClose={() => setAddAt(null)} />}
    </div>
  );
}

function PersonRow({ s }: { s: Staff }) {
  const { analysis, setDrag, drag, setDrawer, state } = useRoster();
  const w = analysis.weeks[s.id];
  const worst = worstSeverity(analysis.byStaff[s.id] ?? []);
  const visa =
    s.visa.type === "student"
      ? `Student ${w?.fortnightHours?.toFixed(0) ?? s.visa.prevWeekHours}/${STUDENT_FORTNIGHT_CAP}h`
      : s.visa.type === "whm"
        ? "Working holiday"
        : s.visa.type === "graduate"
          ? "Graduate visa"
          : null;
  const cleared = s.credentials.find((c) => c.kind === "agsva" && (!c.expires || c.expires >= state.weekStart));
  return (
    <div
      className={`rg-person ${drag?.staffId === s.id && !drag.from ? "dragging" : ""}`}
      draggable
      onDragStart={(e) => {
        startDrag(e, { staffId: s.id });
        // Rendering the drop preview inside dragstart can make Chrome abort the drag
        window.setTimeout(() => setDrag({ staffId: s.id }), 0);
      }}
      onDragEnd={() => setDrag(null)}
      onClick={() => setDrawer({ kind: "person", id: s.id })}
      title="Drag onto a shift, or click for details"
    >
      <Avatar staff={s} flag={worst === "critical" || worst === "high" ? worst : null} />
      <div style={{ minWidth: 0 }}>
        <div className="rg-person-name">{s.name}</div>
        <div className="rg-person-meta">
          {TYPE_LABEL[s.type]} L{s.level}
          {visa ? ` · ${visa}` : ""}
          {cleared ? ` · ${RANK_LABEL[cleared.rank!]}` : ""}
        </div>
      </div>
      <div className="rg-person-hours num">{w?.hours ? `${w.hours.toFixed(1)}h` : <span style={{ color: "var(--rg-faint)" }}>0h</span>}</div>
    </div>
  );
}

function Row({ tenantId, preview, onAdd }: { tenantId: string; preview: Record<string, DropState> | null; onAdd: (d: DayIndex) => void }) {
  const { state, setDrawer } = useRoster();
  const t = state.tenants.find((x) => x.id === tenantId)!;
  return (
    <>
      <div className="rg-rowhead" onClick={() => setDrawer({ kind: "tenant", id: t.id })}>
        <div className="rg-rowhead-name">
          <span className="rg-dot" style={{ background: `hsl(${t.hue} 55% 45%)`, width: 9, height: 9 }} />
          {t.short}
        </div>
        <div className="rg-rowhead-meta">{t.floors}</div>
        <div className="rg-reqs">
          {requirementChips(state, t.id).map((c) => (
            <span key={c} className="rg-chip">
              {c}
            </span>
          ))}
        </div>
      </div>
      {DAY_SHORT.map((_, i) => {
        const day = i as DayIndex;
        const shifts = state.shifts.filter((s) => s.tenantId === t.id && s.day === day).sort((a, b) => a.start - b.start);
        const ph = publicHoliday(shiftDate(state.weekStart, day));
        return (
          <div key={i} className={`rg-cell ${ph ? "ph" : ""}`}>
            {shifts.length > 0 && (
              <div className="rg-cell-shifts">
                {shifts.map((sh) => (
                  <ShiftCard key={sh.id} sh={sh} hue={t.hue} drop={preview?.[sh.id]} />
                ))}
              </div>
            )}
            {shifts.length === 0 && <div className="rg-cell-empty">{ph && t.id !== "common" && t.id !== "clinic" ? "Closed" : "No clean"}</div>}
            <button className="rg-cell-add" onClick={() => onAdd(day)} aria-label={`Add a shift for ${t.short} on ${DAY_SHORT[day]}`}>
              + shift
            </button>
          </div>
        );
      })}
    </>
  );
}

function ShiftCard({ sh, hue, drop }: { sh: Shift; hue: number; drop?: DropState }) {
  const r = useRoster();
  const { state, analysis, drawer, drag } = r;
  const [over, setOver] = useState(false);
  const [overAvatar, setOverAvatar] = useState<string | null>(null);
  const ids = state.assignments[sh.id] ?? [];
  const flags = analysis.byShift[sh.id] ?? [];
  const worst = worstSeverity(flags);
  const selected = drawer?.kind === "shift" && drawer.id === sh.id;
  const cost = analysis.shiftCost[sh.id] ?? 0;

  const staffFlag = (id: string) =>
    worstSeverity((analysis.byStaff[id] ?? []).filter((f) => f.shiftId === sh.id || !f.shiftId));

  const onDrop = (e: DragEvent, replacing?: string) => {
    e.preventDefault();
    e.stopPropagation();
    setOver(false);
    setOverAvatar(null);
    const payload = readDrag(e) ?? drag;
    r.setDrag(null);
    if (!payload) return;
    const { staffId, from } = payload;
    if (from === sh.id && !replacing) return;
    const swapOut = replacing ?? (ids.filter((id) => id !== staffId).length >= sh.slots ? drop?.replacing ?? ids[0] : undefined);
    r.assign(sh.id, staffId, { replacing: swapOut, from });
  };

  const cls = [
    "rg-shift",
    worst && !drop ? `sev-${worst}` : "",
    selected ? "selected" : "",
    sh.chargeable ? "chargeable" : "",
    drop ? `drop-${drop.sev}` : "",
    over ? "drop-over" : "",
    r.pulse === sh.id ? "rg-pulse" : "",
  ].join(" ");

  return (
    <div
      role="button"
      tabIndex={0}
      className={cls}
      style={{ ["--hue" as string]: `hsl(${hue} 55% 45%)` }}
      onClick={() => r.setDrawer({ kind: "shift", id: sh.id })}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          r.setDrawer({ kind: "shift", id: sh.id });
        }
      }}
      onDragOver={(e) => {
        if (!isRosterDrag(e)) return;
        e.preventDefault();
        e.dataTransfer.dropEffect = "move";
        setOver(true);
      }}
      onDragEnter={(e) => {
        if (isRosterDrag(e)) e.preventDefault();
      }}
      onDragLeave={() => setOver(false)}
      onDrop={(e) => onDrop(e)}
    >
      <div className="rg-shift-time">
        <span>
          {formatTime(sh.start)}–{formatTime(sh.end)}
        </span>
        {!sh.chargeable && <span className="num" style={{ color: "var(--rg-muted)", fontWeight: 500 }}>{cost ? money(cost) : ""}</span>}
      </div>
      <div className="rg-shift-label">
        {sh.label} · {shiftHours(sh)}h
      </div>
      <div className="rg-shift-slots">
        {ids.map((id) => {
          const s = state.staff.find((x) => x.id === id);
          if (!s) return null;
          return (
            <span
              key={id}
              draggable
              onDragStart={(e) => {
                e.stopPropagation();
                startDrag(e, { staffId: id, from: sh.id });
                window.setTimeout(() => r.setDrag({ staffId: id, from: sh.id }), 0);
              }}
              onDragEnd={() => r.setDrag(null)}
              onDragOver={(e) => {
                if (!isRosterDrag(e) || drag?.staffId === id) return;
                e.preventDefault();
                e.dataTransfer.dropEffect = "move";
                e.stopPropagation();
                setOverAvatar(id);
              }}
              onDragEnter={(e) => {
                if (isRosterDrag(e)) e.preventDefault();
              }}
              onDragLeave={() => setOverAvatar(null)}
              onDrop={(e) => onDrop(e, id)}
              style={{ display: "inline-flex", borderRadius: "50%" }}
              className={overAvatar === id || (over && !overAvatar && drop?.replacing === id) ? "rg-avatar-drop" : ""}
            >
              <Avatar staff={s} size="sm" flag={staffFlag(id)} title={`${s.name}${overAvatar === id ? " (drop to swap)" : ""}`} />
            </span>
          );
        })}
        {Array.from({ length: Math.max(0, sh.slots - ids.length) }).map((_, i) => (
          <span key={`e${i}`} className="rg-slot-empty">
            +
          </span>
        ))}
      </div>
      {drop && (
        <span className="rg-drop-tag" style={{ background: DROP_TAG[drop.sev].bg }}>
          {drop.replacing ? `Swap ${initials(state.staff.find((x) => x.id === drop.replacing)?.name ?? "")} · ` : ""}
          {DROP_TAG[drop.sev].text}
        </span>
      )}
    </div>
  );
}

function AddShiftModal({ at, onClose }: { at: { tenantId: string; day: DayIndex }; onClose: () => void }) {
  const r = useRoster();
  const { state } = r;
  const t = state.tenants.find((x) => x.id === at.tenantId)!;
  const [start, setStart] = useState("18:00");
  const [end, setEnd] = useState("22:00");
  const [slots, setSlots] = useState(1);
  const [chargeable, setChargeable] = useState(true);
  const toMin = (v: string) => {
    const [h, m] = v.split(":").map(Number);
    return h * 60 + m;
  };
  const valid = toMin(end) > toMin(start);
  const save = () => {
    const id = `${at.tenantId}-${at.day}-${start.replace(":", "")}-${Date.now().toString(36)}`;
    const sh: Shift = {
      id,
      tenantId: at.tenantId,
      day: at.day,
      start: toMin(start),
      end: toMin(end),
      slots,
      label: chargeable ? "Extra clean (client request)" : "Extra clean",
      chargeable,
    };
    r.commit(
      { ...state, shifts: [...state.shifts, sh], assignments: { ...state.assignments, [id]: [] } },
      { title: `Added a shift to ${t.short}`, sub: chargeable ? "Marked as a chargeable variation." : "Counts against the contract hours.", undo: true },
    );
    onClose();
    r.setDrawer({ kind: "shift", id });
  };
  return (
    <div className="rg-modal-wrap" onClick={onClose}>
      <div className="rg-modal" onClick={(e) => e.stopPropagation()} role="dialog" aria-label="Add shift">
        <div style={{ fontSize: 17, fontWeight: 700 }}>Add a shift</div>
        <div style={{ color: "var(--rg-muted)", fontSize: 13 }}>
          {t.name}, {DAY_SHORT[at.day]} {formatDate(shiftDate(state.weekStart, at.day))}
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
          <label className="rg-field">
            Start
            <input type="time" value={start} onChange={(e) => setStart(e.target.value)} />
          </label>
          <label className="rg-field">
            Finish
            <input type="time" value={end} onChange={(e) => setEnd(e.target.value)} />
          </label>
          <label className="rg-field">
            Cleaners
            <input type="number" min={1} max={6} value={slots} onChange={(e) => setSlots(Math.max(1, Math.min(6, Number(e.target.value) || 1)))} />
          </label>
        </div>
        <label className="rg-field" style={{ flexDirection: "row", alignItems: "center", gap: 10, color: "var(--rg-ink)", fontSize: 13.5 }}>
          <button type="button" role="switch" aria-checked={chargeable} className="rg-switch" onClick={() => setChargeable(!chargeable)} />
          <span>
            <b>Client requested this</b>
            <br />
            <span style={{ color: "var(--rg-muted)", fontWeight: 400 }}>Chargeable variation, billed outside the contract</span>
          </span>
        </label>
        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 18 }}>
          <button className="rg-btn" onClick={onClose}>
            Cancel
          </button>
          <button className="rg-btn rg-btn-gold" onClick={save} disabled={!valid}>
            <Icon name="plus" size={14} /> Add shift
          </button>
        </div>
      </div>
    </div>
  );
}
