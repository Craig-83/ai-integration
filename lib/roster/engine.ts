/**
 * The rules engine. Pure functions over RosterState:
 *   costStaffWeek()  award interpretation for one person's week
 *   analyse()        every flag, every cost, roster totals
 *   rankCandidates() who could fill a slot, what it costs, what it breaks
 *
 * Nothing is ever blocked. Every rule produces a flag with a severity, and
 * the UI decides how loudly to show it.
 */
import {
  BASE_HOURLY,
  LIMITS,
  ORDINARY,
  OVERTIME,
  STUDENT_FORTNIGHT_CAP,
  TYPE_LABEL,
  WHM_MONTHS,
} from "./award";
import { DAY_SHORT, daysBetween, formatDate, formatRange, publicHoliday, shiftDate } from "./dates";
import type {
  ClearanceRank,
  Credential,
  Flag,
  RosterState,
  Severity,
  Shift,
  Staff,
  Tenant,
} from "./types";

export const SEVERITY_ORDER: Severity[] = ["critical", "high", "medium", "low"];
export const SEVERITY_RANK: Record<Severity, number> = { low: 1, medium: 2, high: 3, critical: 4 };
export const SEVERITY_LABEL: Record<Severity, string> = {
  critical: "Critical",
  high: "High",
  medium: "Medium",
  low: "Watch",
};

export const RANK_LABEL: Record<ClearanceRank, string> = { 1: "Baseline", 2: "NV1", 3: "NV2" };
export const EXPIRY_WARNING_DAYS = 14;

// ─── helpers ──────────────────────────────────────────────

export function onCostMultiplier(state: RosterState): number {
  const s = state.settings;
  return 1 + (s.superPct + s.payrollTaxPct + s.workcoverPct) / 100;
}

export function shiftHours(sh: Shift): number {
  return (sh.end - sh.start) / 60;
}

export function weeklyAllocation(state: RosterState) {
  return {
    hours: state.contract.annualHours / 52,
    cost: state.contract.annualLabourBudget / 52,
  };
}

type CredStatus = "ok" | "expiring" | "expired" | "missing";

/** Best matching credential and its status on a given date. */
export function credentialStatus(
  staff: Staff,
  match: (c: Credential) => boolean,
  date: string,
): { status: CredStatus; cred?: Credential } {
  const found = staff.credentials.filter(match);
  if (found.length === 0) return { status: "missing" };
  const valid = found.filter((c) => c.issued <= date && (!c.expires || c.expires >= date));
  if (valid.length === 0) {
    const latest = [...found].sort((a, b) => (b.expires ?? "").localeCompare(a.expires ?? ""))[0];
    return { status: "expired", cred: latest };
  }
  const best = [...valid].sort((a, b) => (b.expires ?? "9999").localeCompare(a.expires ?? "9999"))[0];
  if (best.expires && daysBetween(date, best.expires) <= EXPIRY_WARNING_DAYS) {
    return { status: "expiring", cred: best };
  }
  return { status: "ok", cred: best };
}

export function clearanceRankOn(staff: Staff, date: string): 0 | ClearanceRank {
  let best: 0 | ClearanceRank = 0;
  for (const c of staff.credentials) {
    if (c.kind !== "agsva" || !c.rank) continue;
    if (c.issued <= date && (!c.expires || c.expires >= date) && c.rank > best) best = c.rank;
  }
  return best;
}

export function credentialLabel(c: Credential, tenants: Tenant[]): string {
  switch (c.kind) {
    case "agsva":
      return `${RANK_LABEL[c.rank ?? 1]} clearance`;
    case "police":
      return "Police check";
    case "wwc":
      return "Working with Children Check";
    case "induction":
      return c.scope === "site"
        ? "Site induction"
        : `${tenants.find((t) => t.id === c.scope)?.short ?? c.scope} induction`;
  }
}

function inductionLabel(scope: string, tenants: Tenant[]) {
  return scope === "site" ? "site induction" : `${tenants.find((t) => t.id === scope)?.short ?? scope} induction`;
}

function staffShifts(state: RosterState, staffId: string): Shift[] {
  return state.shifts
    .filter((sh) => state.assignments[sh.id]?.includes(staffId))
    .sort((a, b) => a.day - b.day || a.start - b.start);
}

function whmLimitDate(staff: Staff): string | undefined {
  if (staff.visa.type !== "whm" || !staff.visa.whmSiteStart) return;
  const [y, m, d] = staff.visa.whmSiteStart.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1 + WHM_MONTHS, d));
  return dt.toISOString().slice(0, 10);
}

// ─── award costing ────────────────────────────────────────

export interface PayLine {
  shiftId: string;
  hours: number;
  ordinaryHours: number;
  otHours: number;
  wages: number;
  /** Extra paid because hours fell into overtime, vs paying them as ordinary */
  otPremium: number;
  basis: string;
  otReason?: string;
}

export interface StaffWeek {
  staffId: string;
  hours: number;
  wages: number;
  otHours: number;
  otPremium: number;
  days: number;
  lines: PayLine[];
  fortnightHours?: number;
  shortBreaks: string[]; // shift ids that started inside the 8-hour break
}

export function dayType(state: RosterState, sh: Shift) {
  const date = shiftDate(state.weekStart, sh.day);
  const ph = publicHoliday(date);
  if (ph) return { key: "publicHoliday" as const, label: ph };
  if (sh.day === 5) return { key: "saturday" as const, label: "Saturday" };
  if (sh.day === 6) return { key: "sunday" as const, label: "Sunday" };
  if (sh.start < 360 || sh.end > 1080) return { key: "weekdayShift" as const, label: "early/evening shift" };
  return { key: "weekday" as const, label: "weekday" };
}

export function costStaffWeek(state: RosterState, staff: Staff, shifts = staffShifts(state, staff.id)): StaffWeek {
  const base = BASE_HOURLY[staff.level];
  const t = staff.type;
  const dayHours = [0, 0, 0, 0, 0, 0, 0];
  const dayOt = [0, 0, 0, 0, 0, 0, 0];
  const daysWorked: number[] = [];
  let weekHours = 0;
  let lastEndAbs: number | null = null;
  const lines: PayLine[] = [];
  const shortBreaks: string[] = [];

  for (const sh of shifts) {
    const h = shiftHours(sh);
    const dt = dayType(state, sh);
    if (!daysWorked.includes(sh.day)) daysWorked.push(sh.day);
    const extraDay = daysWorked.length > LIMITS.maxOrdinaryDays[t];
    const absStart = sh.day * 1440 + sh.start;
    const shortBreak =
      lastEndAbs !== null &&
      absStart > lastEndAbs &&
      absStart - lastEndAbs < LIMITS.minBreakHours * 60 &&
      // back-to-back shifts on the same day are one continuous engagement
      Math.floor(lastEndAbs / 1440) !== sh.day;
    if (shortBreak) shortBreaks.push(sh.id);

    let ordinary = 0;
    let otReason: string | undefined;
    if (extraDay) otReason = `${daysWorked.length}th day worked this week`;
    else if (shortBreak) otReason = `less than ${LIMITS.minBreakHours} hours off since last shift`;
    else {
      ordinary = Math.max(
        0,
        Math.min(h, LIMITS.weeklyOrdinary - weekHours, LIMITS.dailyOrdinary[t] - dayHours[sh.day]),
      );
      if (ordinary < h) {
        otReason =
          LIMITS.weeklyOrdinary - weekHours < LIMITS.dailyOrdinary[t] - dayHours[sh.day]
            ? `over ${LIMITS.weeklyOrdinary} hours this week`
            : `over ${LIMITS.dailyOrdinary[t]} hours this day`;
      }
    }
    const ot = h - ordinary;
    const ordMult = ORDINARY[dt.key][t];
    let otCost = 0;
    if (ot > 0) {
      if (dt.key === "publicHoliday") otCost = ot * base * OVERTIME.publicHoliday[t];
      else if (dt.key === "sunday") otCost = ot * base * OVERTIME.sunday[t];
      else {
        const first = Math.min(ot, Math.max(0, 2 - dayOt[sh.day]));
        otCost = first * base * OVERTIME.first2[t] + (ot - first) * base * OVERTIME.after2[t];
      }
      dayOt[sh.day] += ot;
    }
    const wages = ordinary * base * ordMult + otCost;
    lines.push({
      shiftId: sh.id,
      hours: h,
      ordinaryHours: ordinary,
      otHours: ot,
      wages,
      otPremium: Math.max(0, otCost - ot * base * ordMult),
      basis: `${TYPE_LABEL[t]} L${staff.level}, ${dt.label}: ${Math.round(ordMult * 100)}% of $${base.toFixed(2)}`,
      otReason,
    });
    weekHours += h;
    dayHours[sh.day] += h;
    lastEndAbs = sh.day * 1440 + sh.end;
  }

  const sum = (f: (l: PayLine) => number) => lines.reduce((a, l) => a + f(l), 0);
  return {
    staffId: staff.id,
    hours: weekHours,
    wages: sum((l) => l.wages),
    otHours: sum((l) => l.otHours),
    otPremium: sum((l) => l.otPremium),
    days: daysWorked.length,
    lines,
    fortnightHours: staff.visa.type === "student" ? (staff.visa.prevWeekHours ?? 0) + weekHours : undefined,
    shortBreaks,
  };
}

// ─── flags ────────────────────────────────────────────────

function where(state: RosterState, sh: Shift): string {
  const tenant = state.tenants.find((t) => t.id === sh.tenantId);
  return `${tenant?.short ?? sh.tenantId}, ${DAY_SHORT[sh.day]} ${formatRange(sh.start, sh.end)}`;
}

/** Flags raised by one person working one shift. */
export function assignmentFlags(state: RosterState, staff: Staff, sh: Shift): Flag[] {
  const flags: Flag[] = [];
  const tenant = state.tenants.find((t) => t.id === sh.tenantId)!;
  const date = shiftDate(state.weekStart, sh.day);
  const at = where(state, sh);
  const first = staff.name.trim().split(/\s+/)[0];
  const add = (severity: Severity, code: string, title: string, detail: string) =>
    flags.push({ id: `${code}:${staff.id}:${sh.id}`, severity, code, title, detail, staffId: staff.id, shiftId: sh.id });

  const expiringNote = (c: Credential | undefined, what: string) => {
    if (c?.expires)
      add("low", "expiring", `${first}'s ${what} expires ${formatDate(c.expires)}`, `Still valid for ${at}, but renew it soon or ${first} drops off this tenant's eligible list.`);
  };

  // Building-wide site induction
  const site = credentialStatus(staff, (c) => c.kind === "induction" && c.scope === "site", date);
  if (site.status === "missing" || site.status === "expired")
    add("high", "site-induction", `${first} has no current site induction`, `Every cleaner needs the building induction before working at ${at}. Record it in Inductions once done.`);
  else if (site.status === "expiring") expiringNote(site.cred, "site induction");

  for (const req of tenant.requirements) {
    if (req.kind === "agsva") {
      const res = credentialStatus(staff, (c) => c.kind === "agsva" && (c.rank ?? 0) >= req.rank, date);
      if (res.status === "ok") continue;
      if (res.status === "expiring") {
        expiringNote(res.cred, `${RANK_LABEL[req.rank]} clearance`);
        continue;
      }
      const ownRank = clearanceRankOn(staff, date);
      const escorts = (state.assignments[sh.id] ?? [])
        .filter((id) => id !== staff.id)
        .map((id) => state.staff.find((s) => s.id === id)!)
        .filter((s) => s && clearanceRankOn(s, date) >= req.rank);
      const lapsed = res.status === "expired" ? ` (lapsed ${formatDate(res.cred!.expires!)})` : "";
      if (tenant.escort?.allowed && ownRank >= tenant.escort.escorteeMinRank && escorts.length > 0) {
        add("medium", "escorted", `${first} must be escorted on ${tenant.short}`, `${tenant.short} needs ${RANK_LABEL[req.rank]}. ${first} holds ${ownRank ? RANK_LABEL[ownRank as ClearanceRank] : "no clearance"}${lapsed}, so ${escorts[0].name.split(" ")[0]} must stay with them the whole shift.`);
      } else {
        add("critical", "clearance", `${first} is not cleared for ${tenant.short}`, `${tenant.short} requires ${RANK_LABEL[req.rank]} clearance${tenant.escort?.allowed ? " or an escort by a cleared colleague" : ""}. ${first} holds ${ownRank ? RANK_LABEL[ownRank as ClearanceRank] : "none"}${lapsed}.`);
      }
    } else if (req.kind === "police" || req.kind === "wwc") {
      const name = req.kind === "police" ? "police check" : "Working with Children Check";
      const res = credentialStatus(staff, (c) => c.kind === req.kind, date);
      if (res.status === "missing")
        add("critical", req.kind, `${first} has no ${name}`, `${tenant.short} requires a current ${name} for every cleaner on ${at}.`);
      else if (res.status === "expired")
        add("critical", req.kind, `${first}'s ${name} has expired`, `It lapsed on ${formatDate(res.cred!.expires!)}. ${tenant.short} requires a current one.`);
      else if (res.status === "expiring") expiringNote(res.cred, name);
    } else if (req.kind === "induction") {
      const label = inductionLabel(req.scope, state.tenants);
      const res = credentialStatus(staff, (c) => c.kind === "induction" && c.scope === req.scope, date);
      if (res.status === "missing")
        add("high", "induction", `${first} hasn't done the ${label}`, `${tenant.short} only accepts cleaners who have completed its induction. Book it, then record it in Inductions.`);
      else if (res.status === "expired")
        add("high", "induction", `${first}'s ${label} is out of date`, `It expired ${formatDate(res.cred!.expires!)}. ${tenant.short} needs a refresher before ${first} goes back on.`);
      else if (res.status === "expiring") expiringNote(res.cred, label);
    }
  }

  // Double booking
  for (const other of state.shifts) {
    if (other.id === sh.id || other.day !== sh.day) continue;
    if (!state.assignments[other.id]?.includes(staff.id)) continue;
    if (other.start < sh.end && sh.start < other.end)
      add("critical", "overlap", `${first} is double-booked`, `${at} overlaps ${where(state, other)}.`);
  }

  // Availability
  const avail = staff.availability[sh.day];
  if (!avail || sh.start < avail[0] || sh.end > avail[1])
    add("high", "availability", `${first} isn't available then`, avail ? `${first} is available ${DAY_SHORT[sh.day]} ${formatRange(avail[0], avail[1])} only.` : `${first} has said they can't work ${DAY_SHORT[sh.day]}s.`);

  // Minimum engagement
  if (staff.type !== "FT" && shiftHours(sh) < LIMITS.minEngagementHours)
    add("medium", "min-engagement", `Short shift for a ${TYPE_LABEL[staff.type].toLowerCase()}`, `The award's minimum engagement at a 5,000+ sqm site is ${LIMITS.minEngagementHours} hours, so ${first} must be paid for ${LIMITS.minEngagementHours} regardless.`);

  return flags;
}

/** Flags about one person's whole week (visa caps, overtime, breaks). */
export function staffWeekFlags(state: RosterState, staff: Staff, week: StaffWeek, shifts: Shift[]): Flag[] {
  const flags: Flag[] = [];
  if (shifts.length === 0) return flags;
  const first = staff.name.trim().split(/\s+/)[0];
  const oc = onCostMultiplier(state);

  if (staff.visa.type === "student" && state.settings.courseInSession && week.fortnightHours !== undefined) {
    const f = week.fortnightHours;
    if (f > STUDENT_FORTNIGHT_CAP)
      flags.push({
        id: `visa-cap:${staff.id}`,
        severity: "critical",
        code: "visa-cap",
        title: `${first} would breach their student visa`,
        detail: `${f.toFixed(1)} hours this fortnight (${staff.visa.prevWeekHours ?? 0} last week + ${week.hours.toFixed(1)} this week). Condition 8105 caps work at ${STUDENT_FORTNIGHT_CAP} hours per Monday-start fortnight while the course is in session. Over by ${(f - STUDENT_FORTNIGHT_CAP).toFixed(1)} h.`,
        staffId: staff.id,
      });
    else if (f > STUDENT_FORTNIGHT_CAP - 6)
      flags.push({
        id: `visa-near:${staff.id}`,
        severity: "low",
        code: "visa-near",
        title: `${first} is close to the student visa cap`,
        detail: `${f.toFixed(1)} of ${STUDENT_FORTNIGHT_CAP} hours used this fortnight. Only ${(STUDENT_FORTNIGHT_CAP - f).toFixed(1)} h left.`,
        staffId: staff.id,
      });
  }

  const limit = whmLimitDate(staff);
  if (limit) {
    const lastShiftDate = shiftDate(state.weekStart, shifts[shifts.length - 1].day);
    if (lastShiftDate >= limit)
      flags.push({
        id: `whm:${staff.id}`,
        severity: "critical",
        code: "whm",
        title: `${first} has hit the 6-month working holiday limit`,
        detail: `Visa condition 8547: ${first} started on this site ${formatDate(staff.visa.whmSiteStart!, true)} and reached 6 months on ${formatDate(limit, true)}. They can't keep working for this client without Home Affairs permission.`,
        staffId: staff.id,
      });
    else if (daysBetween(lastShiftDate, limit) <= 28)
      flags.push({
        id: `whm-near:${staff.id}`,
        severity: "low",
        code: "whm-near",
        title: `${first}'s 6-month working holiday limit is ${formatDate(limit)}`,
        detail: `Condition 8547. Plan a replacement at this site before ${formatDate(limit, true)}.`,
        staffId: staff.id,
      });
  }

  if (week.otHours > 0) {
    const reasons = Array.from(new Set(week.lines.filter((l) => l.otReason).map((l) => l.otReason!)));
    flags.push({
      id: `overtime:${staff.id}`,
      severity: "medium",
      code: "overtime",
      title: `${first} goes into overtime: ${week.otHours.toFixed(1)} h`,
      detail: `Triggered by: ${reasons.join("; ")}. That costs $${Math.round(week.otPremium * oc).toLocaleString()} more than the same hours at ordinary rates, and it isn't recoverable from the client.`,
      staffId: staff.id,
      dollars: week.otPremium * oc,
    });
  }

  for (const id of week.shortBreaks) {
    const sh = state.shifts.find((s) => s.id === id)!;
    flags.push({
      id: `rest:${staff.id}:${id}`,
      severity: "high",
      code: "rest",
      title: `${first} gets less than ${LIMITS.minBreakHours} hours off`,
      detail: `${where(state, sh)} starts too soon after their previous shift. Fatigue risk, and the whole shift is paid at overtime rates.`,
      staffId: staff.id,
      shiftId: id,
    });
  }

  if (staff.type === "PT" && staff.agreedHours && week.hours > staff.agreedHours + 0.01 && week.otHours === 0)
    flags.push({
      id: `pt-hours:${staff.id}`,
      severity: "low",
      code: "pt-hours",
      title: `${first} is above their agreed ${staff.agreedHours} ${staff.agreedHours === 1 ? "hour" : "hours"}`,
      detail: `Rostered ${week.hours.toFixed(1)} h. Fine at ordinary rates, but confirm ${first} has agreed to the extra hours in writing.`,
      staffId: staff.id,
    });

  return flags;
}

export function flagsForStaff(state: RosterState, staff: Staff): { week: StaffWeek; flags: Flag[] } {
  const shifts = staffShifts(state, staff.id);
  const week = costStaffWeek(state, staff, shifts);
  const flags = [
    ...shifts.flatMap((sh) => assignmentFlags(state, staff, sh)),
    ...staffWeekFlags(state, staff, week, shifts),
  ];
  return { week, flags };
}

// ─── whole-roster analysis ───────────────────────────────

export interface Totals {
  hours: number;
  contractHours: number;
  chargeableHours: number;
  cost: number;
  contractCost: number;
  chargeableCost: number;
  avoidable: number;
  allocHours: number;
  allocCost: number;
  filled: number;
  slots: number;
  counts: Record<Severity, number>;
}

export interface Analysis {
  weeks: Record<string, StaffWeek>;
  flags: Flag[];
  byShift: Record<string, Flag[]>;
  byStaff: Record<string, Flag[]>;
  shiftCost: Record<string, number>;
  totals: Totals;
}

export function analyse(state: RosterState): Analysis {
  const oc = onCostMultiplier(state);
  const weeks: Record<string, StaffWeek> = {};
  const flags: Flag[] = [];
  const shiftCost: Record<string, number> = {};

  for (const s of state.staff) {
    const r = flagsForStaff(state, s);
    weeks[s.id] = r.week;
    flags.push(...r.flags);
    for (const l of r.week.lines) shiftCost[l.shiftId] = (shiftCost[l.shiftId] ?? 0) + l.wages * oc;
  }

  let filled = 0;
  let slots = 0;
  let hours = 0;
  let chargeableHours = 0;
  let chargeableCost = 0;
  for (const sh of state.shifts) {
    const n = state.assignments[sh.id]?.length ?? 0;
    slots += sh.slots;
    filled += Math.min(n, sh.slots);
    hours += n * shiftHours(sh);
    if (sh.chargeable) {
      chargeableHours += n * shiftHours(sh);
      chargeableCost += shiftCost[sh.id] ?? 0;
    }
    if (n > sh.slots)
      flags.push({
        id: `overstaffed:${sh.id}`,
        severity: "medium",
        code: "overstaffed",
        title: `${n - sh.slots} more ${n - sh.slots === 1 ? "cleaner" : "cleaners"} than needed: ${state.tenants.find((t) => t.id === sh.tenantId)?.short}`,
        detail: `${where(state, sh)} is scoped for ${sh.slots}. The extra labour isn't in the contract and can't be charged unless the client asked for it.`,
        shiftId: sh.id,
        dollars: ((shiftCost[sh.id] ?? 0) / n) * (n - sh.slots),
      });
    if (n < sh.slots)
      flags.push({
        id: `unfilled:${sh.id}`,
        severity: "high",
        code: "unfilled",
        title: `${sh.slots - n} unfilled ${sh.slots - n === 1 ? "slot" : "slots"}: ${state.tenants.find((t) => t.id === sh.tenantId)?.short}`,
        detail: `${where(state, sh)} needs ${sh.slots} ${sh.slots === 1 ? "cleaner" : "cleaners"}. An unfilled shift is a missed clean the client will notice.`,
        shiftId: sh.id,
      });
  }

  const cost = Object.values(shiftCost).reduce((a, b) => a + b, 0);
  const alloc = weeklyAllocation(state);
  const contractCost = cost - chargeableCost;
  const contractHours = hours - chargeableHours;
  if (contractCost > alloc.cost)
    flags.push({
      id: "budget",
      severity: "high",
      code: "budget",
      title: `Over the weekly labour budget by $${Math.round(contractCost - alloc.cost).toLocaleString()}`,
      detail: `The contract allows $${Math.round(alloc.cost).toLocaleString()} a week (annual budget ÷ 52). Unless the client approved extra work, this comes straight out of margin.`,
      dollars: contractCost - alloc.cost,
    });
  else if (contractHours > alloc.hours + 0.01)
    flags.push({
      id: "hours",
      severity: "medium",
      code: "hours",
      title: `${(contractHours - alloc.hours).toFixed(1)} h over the contracted weekly hours`,
      detail: `The contract includes ${alloc.hours.toFixed(0)} labour hours a week. Within budget for now, but it eats into the annual allowance.`,
    });

  const byShift: Record<string, Flag[]> = {};
  const byStaff: Record<string, Flag[]> = {};
  for (const f of flags) {
    if (f.shiftId) (byShift[f.shiftId] ??= []).push(f);
    if (f.staffId) (byStaff[f.staffId] ??= []).push(f);
  }
  flags.sort((a, b) => SEVERITY_RANK[b.severity] - SEVERITY_RANK[a.severity]);

  const counts = { critical: 0, high: 0, medium: 0, low: 0 } as Record<Severity, number>;
  for (const f of flags) counts[f.severity]++;

  const avoidable = flags.filter((f) => f.code === "overtime" || f.code === "overstaffed").reduce((a, f) => a + (f.dollars ?? 0), 0);

  return {
    weeks,
    flags,
    byShift,
    byStaff,
    shiftCost,
    totals: {
      hours,
      contractHours,
      chargeableHours,
      cost,
      contractCost,
      chargeableCost,
      avoidable,
      allocHours: alloc.hours,
      allocCost: alloc.cost,
      filled,
      slots,
      counts,
    },
  };
}

export function worstSeverity(flags: Flag[]): Severity | null {
  let w: Severity | null = null;
  for (const f of flags) if (!w || SEVERITY_RANK[f.severity] > SEVERITY_RANK[w]) w = f.severity;
  return w;
}

// ─── candidates ───────────────────────────────────────────

export interface Candidate {
  staff: Staff;
  /** Flags this assignment would introduce */
  flags: Flag[];
  worst: Severity | null;
  costDelta: number;
  weekHours: number;
}

function withAssignment(state: RosterState, shiftId: string, staffId: string, replacing?: string): RosterState {
  const cur = state.assignments[shiftId] ?? [];
  const next = replacing ? cur.map((id) => (id === replacing ? staffId : id)) : [...cur, staffId];
  return { ...state, assignments: { ...state.assignments, [shiftId]: next } };
}

function newFlags(before: Flag[], after: Flag[]): Flag[] {
  const prev = new Map(before.map((f) => [f.id, f]));
  return after.filter((f) => {
    const p = prev.get(f.id);
    if (!p) return true;
    return (f.dollars ?? 0) > (p.dollars ?? 0) + 0.5;
  });
}

/** What happens if one person takes (or swaps into) one shift. */
export function evaluateCandidate(state: RosterState, shiftId: string, staffId: string, replacing?: string): Candidate {
  const oc = onCostMultiplier(state);
  const assigned = state.assignments[shiftId] ?? [];
  const staff = state.staff.find((s) => s.id === staffId)!;
  const next = withAssignment(state, shiftId, staffId, replacing);
  const run = (st: RosterState, s: Staff) => {
    const r = flagsForStaff(st, s);
    return { flags: r.flags, cost: r.week.wages * oc, hours: r.week.hours };
  };
  const before = run(state, staff);
  const after = run(next, staff);
  let flags = newFlags(before.flags, after.flags);
  let costDelta = after.cost - before.cost;
  for (const id of assigned) {
    if (id === staffId) continue;
    const o = state.staff.find((s) => s.id === id)!;
    if (id === replacing) {
      costDelta += run(next, o).cost - run(state, o).cost;
      continue;
    }
    flags = flags.concat(newFlags(run(state, o).flags, run(next, o).flags));
  }
  return { staff, flags, worst: worstSeverity(flags), costDelta, weekHours: after.hours };
}

const severityScore = (c: Candidate) => (c.worst ? SEVERITY_RANK[c.worst] : 0);

export function rankCandidates(state: RosterState, shiftId: string, replacing?: string): Candidate[] {
  const assigned = state.assignments[shiftId] ?? [];
  return state.staff
    .filter((s) => !assigned.includes(s.id))
    .map((s) => evaluateCandidate(state, shiftId, s.id, replacing))
    .sort(
      (a, b) =>
        severityScore(a) - severityScore(b) ||
        a.costDelta - b.costDelta ||
        a.weekHours - b.weekHours ||
        a.staff.name.localeCompare(b.staff.name),
    );
}

// ─── auto-roster ──────────────────────────────────────────

const ACCEPTABLE: (Severity | null)[] = [null, "low", "medium"];

export function autoRoster(state: RosterState, opts: { keepExisting: boolean }): RosterState {
  let next: RosterState = {
    ...state,
    assignments: opts.keepExisting ? { ...state.assignments } : {},
  };
  const empty: RosterState = { ...state, assignments: {} };
  // Hardest-to-fill shifts first: fewest people who could take them cleanly
  const scarcity = new Map(
    state.shifts.map((sh) => [
      sh.id,
      rankCandidates(empty, sh.id).filter((c) => c.worst === null || c.worst === "low").length,
    ]),
  );
  const order = [...state.shifts].sort(
    (a, b) => scarcity.get(a.id)! - scarcity.get(b.id)! || a.day - b.day || a.start - b.start,
  );
  for (const sh of order) {
    while ((next.assignments[sh.id]?.length ?? 0) < sh.slots) {
      const pick = rankCandidates(next, sh.id).find((c) => ACCEPTABLE.includes(c.worst));
      if (!pick) break;
      next = withAssignment(next, sh.id, pick.staff.id);
    }
  }
  return next;
}


/**
 * Remove every assignment behind a critical or high flag, then refill the
 * gaps. Leaves everything that was already fine exactly where it was.
 */
export function fixAll(state: RosterState): RosterState {
  let next: RosterState = { ...state, assignments: { ...state.assignments } };
  const unassign = (shiftId: string, staffId: string) => {
    next = {
      ...next,
      assignments: { ...next.assignments, [shiftId]: (next.assignments[shiftId] ?? []).filter((id) => id !== staffId) },
    };
  };
  for (let guard = 0; guard < 200; guard++) {
    const bad = analyse(next).flags.find(
      (f) => (f.severity === "critical" || f.severity === "high") && f.staffId && f.code !== "unfilled",
    );
    if (!bad) break;
    if (bad.shiftId) unassign(bad.shiftId, bad.staffId!);
    else {
      // Week-level breach (visa cap, 6-month limit): drop their most expensive shift
      const week = analyse(next).weeks[bad.staffId!];
      const worst = [...week.lines].sort((a, b) => b.wages - a.wages)[0];
      if (!worst) break;
      unassign(worst.shiftId, bad.staffId!);
    }
  }
  // Over-full shifts (from manual edits) lose their extra people
  for (const sh of next.shifts) {
    const ids = next.assignments[sh.id] ?? [];
    if (ids.length > sh.slots) next.assignments[sh.id] = ids.slice(0, sh.slots);
  }
  const repaired = autoRoster(next, { keepExisting: true });
  // Greedy refills can paint themselves into a corner. If a clean rebuild
  // does strictly better, prefer it.
  const score = (st: RosterState) => {
    const a = analyse(st);
    return a.totals.counts.critical * 1e6 + a.totals.counts.high * 1e4 + a.totals.contractCost / 100;
  };
  const rebuilt = autoRoster(next, { keepExisting: false });
  return score(rebuilt) < score(repaired) ? rebuilt : repaired;
}
