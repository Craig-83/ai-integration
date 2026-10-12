/**
 * Multi-week view: a traffic light for every day across the weeks around
 * the one being rostered, so a manager can glance and know whether the
 * coming weeks are covered.
 *
 * The current week is the live roster. Later weeks are rostered with the
 * same engine against the same templates, with realistic events applied
 * (leave, expiring credentials, visa limits). The last week is not
 * rostered yet. Earlier weeks are completed.
 */
import { analyse, autoRoster, shiftHours, type Analysis } from "./engine";
import { addDays, publicHoliday, shiftDate } from "./dates";
import type { DayIndex, RosterState, Severity } from "./types";

export type Light = "green" | "amber" | "red" | "grey";
export type WeekKind = "past" | "current" | "planned" | "unrostered";

export interface DayStatus {
  date: string;
  light: Light;
  filled: number;
  slots: number;
  issues: string[];
  holiday?: string;
}

export interface WeekSummary {
  weekStart: string;
  kind: WeekKind;
  light: Light;
  headline: string;
  filled: number;
  slots: number;
  hours: number;
  cost: number;
  alloc: number;
  counts: Record<Severity, number>;
  days: DayStatus[];
  notes: string[];
}

function lightFor(sevs: Severity[], unfilled: number): Light {
  if (unfilled > 0 || sevs.includes("critical") || sevs.includes("high")) return "red";
  if (sevs.includes("medium")) return "amber";
  return "green";
}

export function summariseWeek(state: RosterState, a: Analysis, kind: WeekKind, notes: string[] = []): WeekSummary {
  const days: DayStatus[] = [];
  for (let d = 0; d < 7; d++) {
    const date = shiftDate(state.weekStart, d as DayIndex);
    const shifts = state.shifts.filter((s) => s.day === d);
    let filled = 0;
    let slots = 0;
    for (const s of shifts) {
      slots += s.slots;
      filled += Math.min(s.slots, state.assignments[s.id]?.length ?? 0);
    }
    const flags = shifts.flatMap((s) => a.byShift[s.id] ?? []);
    const staffOnDay = new Set(shifts.flatMap((s) => state.assignments[s.id] ?? []));
    const weekFlags = a.flags.filter((f) => !f.shiftId && f.staffId && staffOnDay.has(f.staffId));
    const all = [...flags, ...weekFlags];
    const light = kind === "unrostered" ? "grey" : lightFor(all.map((f) => f.severity), slots - filled);
    const issues = Array.from(
      new Set(all.filter((f) => f.severity === "critical" || f.severity === "high").map((f) => f.title)),
    ).slice(0, 4);
    days.push({ date, light, filled, slots, issues, holiday: publicHoliday(date) });
  }
  const t = a.totals;
  const worst: Light = days.some((d) => d.light === "red")
    ? "red"
    : days.some((d) => d.light === "amber")
      ? "amber"
      : kind === "unrostered"
        ? "grey"
        : "green";
  const gaps = t.slots - t.filled;
  const serious = t.counts.critical + t.counts.high;
  let headline: string;
  if (kind === "unrostered") headline = "Not rostered yet";
  else if (gaps > 0 && serious > gaps) headline = `${gaps} open ${gaps === 1 ? "shift" : "shifts"}, ${serious - gaps} compliance ${serious - gaps === 1 ? "issue" : "issues"}`;
  else if (gaps > 0) headline = `${gaps} open ${gaps === 1 ? "shift" : "shifts"}`;
  else if (serious > 0) headline = `${serious} compliance ${serious === 1 ? "issue" : "issues"}`;
  else if (t.contractCost > t.allocCost) headline = "Covered, over budget";
  else if (worst === "amber") headline = "Covered, with warnings";
  else headline = "Covered";
  return {
    weekStart: state.weekStart,
    kind,
    light: kind === "unrostered" ? "grey" : worst,
    headline,
    filled: kind === "unrostered" ? 0 : t.filled,
    slots: t.slots,
    hours: state.shifts.reduce((s, sh) => s + sh.slots * shiftHours(sh), 0),
    cost: t.contractCost,
    alloc: t.allocCost,
    counts: t.counts,
    days,
    notes,
  };
}

/** Shift the roster to another week; student hours carry over as the previous week. */
function moveTo(state: RosterState, weekStart: string, prevHours: Record<string, number>): RosterState {
  return {
    ...state,
    weekStart,
    assignments: {},
    staff: state.staff.map((s) =>
      s.visa.type === "student" ? { ...s, visa: { ...s.visa, prevWeekHours: prevHours[s.id] ?? 0 } } : s,
    ),
  };
}

function onLeave(state: RosterState, ids: string[], days: number[] = [0, 1, 2, 3, 4, 5, 6]): RosterState {
  return {
    ...state,
    staff: state.staff.map((s) =>
      ids.includes(s.id) ? { ...s, availability: s.availability.map((v, i) => (days.includes(i) ? null : v)) } : s,
    ),
  };
}

const hoursFrom = (a: Analysis) => Object.fromEntries(Object.entries(a.weeks).map(([id, w]) => [id, w.hours]));

/**
 * Weeks after the current one. Events are fixed so the demo tells the same
 * story every time: week 2 is clean, week 3 loses two NV1 holders to leave,
 * week 4 hits a visa limit and some leave, week 5 is still a draft.
 */
export const PLAN_EVENTS: { notes: string[]; apply: (s: RosterState) => RosterState }[] = [
  { notes: [], apply: (s) => s },
  {
    notes: ["Aisha Rahman and Daniel Whitfield (both NV1) on annual leave", "Cyber Office needs NV1 cover every night"],
    apply: (s) => onLeave(s, ["aisha", "daniel"]),
  },
  {
    notes: ["Emma Larsson reaches her 6-month working holiday limit on 25 Nov, so she is rostered off from that day", "Tran Nguyen on leave Thu and Fri"],
    apply: (s) => onLeave(s, ["tran"], [3, 4]),
  },
];

/**
 * Roster one week ahead. Call with i = 0, 1, 2... passing the previous
 * week's student hours along; i = PLAN_EVENTS.length returns the draft week.
 * Split up so callers can yield to the browser between weeks.
 */
export function planWeek(
  current: RosterState,
  i: number,
  prevHours: Record<string, number>,
): { week: WeekSummary; hours: Record<string, number> } {
  const weekStart = addDays(current.weekStart, 7 * (i + 1));
  if (i >= PLAN_EVENTS.length) {
    const draft = moveTo(current, weekStart, prevHours);
    return { week: summariseWeek(draft, analyse(draft), "unrostered", ["Roster due Wed 25 Nov"]), hours: prevHours };
  }
  const base = PLAN_EVENTS[i].apply(moveTo(current, weekStart, prevHours));
  const rostered = autoRoster(base, { keepExisting: false });
  const a = analyse(rostered);
  return { week: summariseWeek(rostered, a, "planned", PLAN_EVENTS[i].notes), hours: hoursFrom(a) };
}

export function planAhead(current: RosterState, currentAnalysis: Analysis): WeekSummary[] {
  const out: WeekSummary[] = [];
  let prev = hoursFrom(currentAnalysis);
  for (let i = 0; i <= PLAN_EVENTS.length; i++) {
    const r = planWeek(current, i, prev);
    out.push(r.week);
    prev = r.hours;
  }
  return out;
}

/** The completed week before the current one, rebuilt cleanly as a record. */
export function lastWeek(current: RosterState): WeekSummary {
  const start = addDays(current.weekStart, -7);
  const s = autoRoster({ ...current, weekStart: start, assignments: {} }, { keepExisting: false });
  const a = analyse(s);
  const sum = summariseWeek(s, a, "past", ["1 incident logged (Southbank Mutual, Wed)"]);
  return { ...sum, headline: "Completed" };
}
